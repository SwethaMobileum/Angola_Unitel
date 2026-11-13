import { formatAoa } from './decision';
import type {
  ApplicationRecord,
  ApproverRecipient,
  EditableNotificationTemplate,
  NotificationRecord,
  NotificationTrigger,
  Role,
  ScoringConfig,
} from './types';

const DEFAULT_ORIGIN =
  typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:5173';

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

export function buildTemplateVars(
  application: ApplicationRecord,
  extra: {
    decision?: string;
    reason?: string;
    decided_by?: string;
    decided_at?: string;
    link?: string;
    suggestion?: string;
  } = {}
): Record<string, string> {
  const suggestionLabel =
    application.decision === 'auto_approve'
      ? 'Auto-approve candidate'
      : application.decision === 'manual_review'
        ? 'Manual review required'
        : 'Decline candidate';

  return {
    reference: application.id,
    application_id: application.id,
    customer_name: application.customer_name,
    mobile_no: application.mobile_no,
    volume_tier: application.volume_tier === 'high' ? 'High Volume (KYC)' : 'Low Volume (Basic)',
    equipment: application.product,
    product: application.product,
    price: formatAoa(application.product_price_aoa),
    product_price: formatAoa(application.product_price_aoa),
    monthly_emi: formatAoa(application.monthly_emi_aoa),
    emi_term: String(application.emi_term_months),
    score: String(application.score),
    band: application.band,
    confidence: application.confidence,
    credit_limit: formatAoa(application.credit_limit_aoa),
    suggestion: extra.suggestion ?? suggestionLabel,
    decision: extra.decision ?? application.decision,
    reason: extra.reason ?? application.decision_reason ?? '',
    decided_by: extra.decided_by ?? application.decided_by_role ?? 'Credit Approver',
    decided_at: extra.decided_at ?? new Date().toLocaleString(),
    submitted_by_name: application.submitted_by_name || 'Loan Officer',
    submitted_by_email: application.submitted_by_email || 'analyst@unitel-demo.ao',
    submitted_at: new Date(application.created_at).toLocaleString(),
    link: extra.link || `${DEFAULT_ORIGIN}?appId=${application.id}`,
  };
}

export function renderEmailContent(
  template: EditableNotificationTemplate,
  vars: Record<string, string>
): { subject: string; body_text: string; body_html: string } {
  return {
    subject: interpolate(template.subject, vars),
    body_text: interpolate(template.body_text, vars),
    body_html: interpolate(template.body_html, vars),
  };
}

export function buildApplicationSubmittedEmails(
  application: ApplicationRecord,
  approvers: ApproverRecipient[],
  template: EditableNotificationTemplate,
  appBaseUrl: string = DEFAULT_ORIGIN
): NotificationRecord[] {
  const activeApprovers = approvers.filter((a) => a.active);
  const now = new Date().toISOString();
  const link = `${appBaseUrl.replace(/\/$/, '')}?appId=${application.id}&view=approval-queue`;
  const vars = buildTemplateVars(application, { link });
  const rendered = renderEmailContent(template, vars);

  if (activeApprovers.length === 0) {
    return [
      {
        id: `notif-${application.id}-sub-no-recipients-${Date.now()}`,
        application_id: application.id,
        customer_name: application.customer_name,
        mobile_no: application.mobile_no,
        channel: 'email',
        event_type: 'submitted',
        recipient_email: '',
        recipient_role: 'approver',
        subject: rendered.subject,
        body: rendered.body_text,
        status: 'failed',
        error_message: 'No active approvers configured in Admin notifications',
        created_at: now,
      },
    ];
  }

  return activeApprovers.map((approver, index) => ({
    id: `notif-${application.id}-sub-${approver.id}-${Date.now()}-${index}`,
    application_id: application.id,
    customer_name: application.customer_name,
    mobile_no: application.mobile_no,
    channel: 'email',
    event_type: 'submitted',
    recipient_email: approver.email,
    recipient_role: 'approver',
    subject: rendered.subject,
    body: rendered.body_text,
    status: 'queued',
    created_at: now,
  }));
}

export function buildDecisionEmails(
  application: ApplicationRecord,
  decisionStatus: 'approved' | 'rejected' | 'more_info_requested',
  reason: string,
  decidedByRole: Role,
  decidedByName: string,
  template: EditableNotificationTemplate,
  notifyCustomer: boolean = false,
  appBaseUrl: string = DEFAULT_ORIGIN
): NotificationRecord[] {
  const now = new Date().toISOString();
  const link = `${appBaseUrl.replace(/\/$/, '')}?appId=${application.id}`;
  const event_type =
    decisionStatus === 'approved'
      ? 'approved'
      : decisionStatus === 'rejected'
        ? 'rejected'
        : 'more_info';

  const vars = buildTemplateVars(application, {
    decision: decisionStatus === 'approved' ? 'Approved' : decisionStatus === 'rejected' ? 'Rejected' : 'More Info Requested',
    reason,
    decided_by: `${decidedByName || 'Credit Approver'} (${decidedByRole.toUpperCase()})`,
    decided_at: new Date(now).toLocaleString(),
    link,
  });

  const rendered = renderEmailContent(template, vars);
  const records: NotificationRecord[] = [];

  // Primary recipient: Submitting Analyst (must only go to submitted_by_email)
  if (application.submitted_by_email) {
    records.push({
      id: `notif-${application.id}-dec-submitter-${Date.now()}`,
      application_id: application.id,
      customer_name: application.customer_name,
      mobile_no: application.mobile_no,
      channel: 'email',
      event_type,
      recipient_email: application.submitted_by_email,
      recipient_role: 'analyst',
      subject: rendered.subject,
      body: rendered.body_text,
      status: 'queued',
      created_at: now,
    });
  }

  // Optional recipient: Customer (ONLY if notifyCustomer is true and customer_email is present)
  if (notifyCustomer && application.customer_email) {
    records.push({
      id: `notif-${application.id}-dec-customer-${Date.now()}`,
      application_id: application.id,
      customer_name: application.customer_name,
      mobile_no: application.mobile_no,
      channel: 'email',
      event_type,
      recipient_email: application.customer_email,
      recipient_role: 'customer',
      subject: rendered.subject,
      body: rendered.body_text,
      status: 'queued',
      created_at: now,
    });
  }

  return records;
}

// Backward compatibility with previous version
export function buildNotificationDrafts(
  application: ApplicationRecord,
  trigger: NotificationTrigger,
  config: ScoringConfig,
  timestamp: string = new Date().toISOString()
): NotificationRecord[] {
  const tpl = config.templates[trigger] ?? config.templates.manual_review;
  const vars: Record<string, string> = {
    application_id: application.id,
    customer_name: application.customer_name,
    mobile_no: application.mobile_no,
    product: application.product,
    product_price: formatAoa(application.product_price_aoa),
    monthly_emi: formatAoa(application.monthly_emi_aoa),
    emi_term: String(application.emi_term_months),
    score: String(application.score),
    band: application.band,
    confidence: application.confidence,
    credit_limit: formatAoa(application.credit_limit_aoa),
    decision_reason: application.decision_reason,
  };

  return [
    {
      id: `notif-${application.id}-${trigger}-sms-${Math.random().toString(36).slice(2, 7)}`,
      application_id: application.id,
      customer_name: application.customer_name,
      mobile_no: application.mobile_no,
      channel: 'sms',
      template: trigger,
      body: interpolate(tpl.sms, vars),
      status: 'simulated_sent',
      created_at: timestamp,
    },
    {
      id: `notif-${application.id}-${trigger}-email-${Math.random().toString(36).slice(2, 7)}`,
      application_id: application.id,
      customer_name: application.customer_name,
      mobile_no: application.mobile_no,
      channel: 'email',
      template: trigger,
      subject: interpolate(tpl.emailSubject, vars),
      body: interpolate(tpl.emailBody, vars),
      status: 'simulated_sent',
      created_at: timestamp,
    },
  ];
}
