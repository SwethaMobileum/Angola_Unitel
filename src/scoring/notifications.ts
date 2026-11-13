import { formatAoa } from './decision';
import type {
  ApplicationRecord,
  ApproverRecipient,
  EditableNotificationTemplate,
  NotificationRecord,
  Role,
} from './types';

const DEFAULT_ORIGIN =
  typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:5173';

/**
 * Email 1: New Application Submitted -> Sent to Approvers from Admin list
 */
export function buildApproverEmail(
  app: ApplicationRecord,
  appBaseUrl: string = DEFAULT_ORIGIN
): { subject: string; text: string; html: string } {
  const queueLink = `${appBaseUrl.replace(/\/$/, '')}?appId=${app.id}&view=approval-queue`;
  const subject = `New credit application ${app.id} awaiting your approval`;

  const text = `New credit application ${app.id} awaiting your approval.

Application Reference: ${app.id}
Applicant: ${app.submitted_by_name || 'Loan Officer'} (${app.submitted_by_email || 'No email provided'})
Submission Date: ${new Date(app.created_at).toLocaleString()}

Customer: ${app.customer_name} (${app.mobile_no})
Equipment: ${app.product}
Price: ${formatAoa(app.product_price_aoa)}
EMI Plan: ${app.emi_term_months} months • ${formatAoa(app.monthly_emi_aoa)}/month

Proxy Score (demo): ${app.score} (${app.band} | Confidence: ${app.confidence})
Suggested Decision: ${app.decision}

Open in Approval Queue:
${queueLink}`;

  const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; color: #1F2933; line-height: 1.5;">
  <div style="background-color: #C84C00; color: #ffffff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">Unitel Credit Intelligence</h2>
    <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.95;">New Application Awaiting Approval</p>
  </div>
  <div style="padding: 20px; border: 1px solid #E3E6EB; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
    <p>Application <strong>${app.id}</strong> has been submitted by <strong>${app.submitted_by_name || 'Loan Officer'}</strong> (${app.submitted_by_email || 'No email provided'}).</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #52606D;">Customer:</td><td style="padding: 8px; font-weight: bold;">${app.customer_name} (${app.mobile_no})</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #52606D;">Equipment:</td><td style="padding: 8px;">${app.product} (${formatAoa(app.product_price_aoa)})</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #52606D;">EMI Plan:</td><td style="padding: 8px;">${app.emi_term_months} months @ ${formatAoa(app.monthly_emi_aoa)}/mo</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #52606D;">Proxy Score:</td><td style="padding: 8px; font-weight: bold;">${app.score} (${app.band}) • Confidence: ${app.confidence}</td></tr>
    </table>
    <div style="margin-top: 24px; text-align: center;">
      <a href="${queueLink}" style="background-color: #FF7A00; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Open in Approval Queue</a>
    </div>
  </div>
</div>`;

  return { subject, text, html };
}

/**
 * Email 2: Decision (Approved or Rejected) -> Sent strictly to applicant's "Your email"
 */
export function buildDecisionEmail(
  app: ApplicationRecord,
  status: 'approved' | 'rejected' | 'more_info_requested',
  reason: string,
  appBaseUrl: string = DEFAULT_ORIGIN
): { subject: string; text: string; html: string } {
  const isApproved = status === 'approved';
  const detailLink = `${appBaseUrl.replace(/\/$/, '')}?appId=${app.id}`;
  const statusLabel = isApproved ? 'approved' : status === 'rejected' ? 'rejected' : 'more info requested';
  const subject = `Your credit application ${app.id} was ${statusLabel}`;

  const text = `Dear ${app.submitted_by_name || 'Applicant'},

Your credit application ${app.id} for customer ${app.customer_name} was ${status.toUpperCase().replace(/_/g, ' ')}.

Decision: ${status.toUpperCase().replace(/_/g, ' ')}
Reason: ${reason}
${isApproved ? `Approved Credit Limit: ${formatAoa(app.credit_limit_aoa)}` : ''}

Equipment: ${app.product} (${formatAoa(app.product_price_aoa)})
EMI Plan: ${app.emi_term_months} months • ${formatAoa(app.monthly_emi_aoa)}/month

View application details:
${detailLink}`;

  const headerColor = isApproved ? '#10B981' : status === 'rejected' ? '#EF4444' : '#F59E0B';
  const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; color: #1F2933; line-height: 1.5;">
  <div style="background-color: ${headerColor}; color: #ffffff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">Unitel Credit Intelligence</h2>
    <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.95;">Application Decision: ${status.toUpperCase().replace(/_/g, ' ')}</p>
  </div>
  <div style="padding: 20px; border: 1px solid #E3E6EB; border-top: none; border-radius: 0 0 8px 8px; background-color: #ffffff;">
    <p>Dear ${app.submitted_by_name || 'Applicant'},</p>
    <p>Your credit application <strong>${app.id}</strong> for customer <strong>${app.customer_name}</strong> was <strong style="color: ${headerColor};">${status.toUpperCase().replace(/_/g, ' ')}</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #52606D;">Decision:</td><td style="padding: 8px; font-weight: bold; color: ${headerColor};">${status.toUpperCase().replace(/_/g, ' ')}</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #52606D;">Reason:</td><td style="padding: 8px; font-style: italic;">${reason}</td></tr>
      ${isApproved ? `<tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #52606D;">Approved Credit Limit:</td><td style="padding: 8px; font-weight: bold;">${formatAoa(app.credit_limit_aoa)}</td></tr>` : ''}
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #52606D;">Equipment:</td><td style="padding: 8px;">${app.product} (${formatAoa(app.product_price_aoa)})</td></tr>
      <tr style="border-bottom: 1px solid #E3E6EB;"><td style="padding: 8px; color: #52606D;">EMI Plan:</td><td style="padding: 8px;">${app.emi_term_months} months @ ${formatAoa(app.monthly_emi_aoa)}/mo</td></tr>
    </table>
    <div style="margin-top: 24px; text-align: center;">
      <a href="${detailLink}" style="background-color: #FF7A00; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Application</a>
    </div>
  </div>
</div>`;

  return { subject, text, html };
}

// Keep interpolate for string substitution helper
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

// Clean notification record builder for the simplified Notifications Log
export function createNotificationRecord(
  applicationId: string,
  recipientEmail: string,
  subject: string,
  status: 'sent' | 'failed',
  errorMessage?: string
): NotificationRecord {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    application_id: applicationId,
    customer_name: '',
    mobile_no: '',
    channel: 'email',
    recipient_email: recipientEmail,
    subject,
    body: subject,
    status,
    error_message: errorMessage,
    created_at: new Date().toISOString(),
    sent_at: status === 'sent' ? new Date().toISOString() : undefined,
  };
}

export function buildNotificationDrafts(
  app: ApplicationRecord,
  trigger: any,
  _config?: any,
  createdAt: string = new Date().toISOString()
): NotificationRecord[] {
  const isApproved = trigger === 'auto_approve' || app.status === 'approved';
  const isRejected = trigger === 'decline' || app.status === 'rejected';

  let subject = `Credit Application ${app.id} Update`;
  if (isApproved) {
    subject = `Your credit application ${app.id} was approved`;
  } else if (isRejected) {
    subject = `Your credit application ${app.id} was rejected`;
  } else {
    subject = `New credit application ${app.id} awaiting your approval`;
  }

  const emailRecord: NotificationRecord = {
    id: `notif-${app.id}-${trigger}-email-${Math.random().toString(36).slice(2, 6)}`,
    application_id: app.id,
    customer_name: app.customer_name,
    mobile_no: app.mobile_no,
    channel: 'email',
    template: trigger,
    recipient_email:
      isApproved || isRejected
        ? app.submitted_by_email || 'analyst@unitel-demo.ao'
        : 'approver@unitel-demo.ao',
    subject,
    body: subject,
    status: 'sent',
    created_at: createdAt,
    sent_at: createdAt,
  };

  const smsRecord: NotificationRecord = {
    id: `notif-${app.id}-${trigger}-sms-${Math.random().toString(36).slice(2, 6)}`,
    application_id: app.id,
    customer_name: app.customer_name,
    mobile_no: app.mobile_no,
    channel: 'sms',
    template: trigger,
    recipient_email: '',
    subject: `SMS: ${subject}`,
    body: `Unitel: Application ${app.id} status is ${app.status}.`,
    status: 'sent',
    created_at: createdAt,
    sent_at: createdAt,
  };

  return [emailRecord, smsRecord];
}

export function buildApplicationSubmittedEmails(
  app: ApplicationRecord,
  approvers: ApproverRecipient[],
  template?: EditableNotificationTemplate,
  appBaseUrl: string = DEFAULT_ORIGIN
): NotificationRecord[] {
  const activeApprovers = approvers.filter((a) => a.active);

  if (activeApprovers.length === 0) {
    return [
      {
        id: `notif-${Date.now()}-failed`,
        application_id: app.id,
        customer_name: app.customer_name,
        mobile_no: app.mobile_no,
        channel: 'email',
        event_type: 'submitted',
        recipient_email: '',
        recipient_role: 'approver',
        subject: `New credit application ${app.id} awaiting your approval`,
        body: 'Failed: No active approvers configured in Admin list.',
        status: 'failed',
        error_message: 'No active approvers configured in Admin list',
        created_at: new Date().toISOString(),
      },
    ];
  }

  const queueLink = `${appBaseUrl.replace(/\/$/, '')}?appId=${app.id}&view=approval-queue`;
  const vars: Record<string, string> = {
    reference: app.id,
    submitted_by_name: app.submitted_by_name || 'Loan Officer',
    submitted_by_email: app.submitted_by_email || 'No email provided',
    submitted_at: new Date(app.created_at).toLocaleString(),
    customer_name: app.customer_name,
    mobile_no: app.mobile_no,
    volume_tier: app.volume_tier === 'high' ? 'High Volume' : 'Low Volume',
    volume_level: app.volume_tier === 'high' ? 'High Volume' : 'Low Volume',
    equipment: app.product,
    price: formatAoa(app.product_price_aoa),
    emi_term: String(app.emi_term_months),
    monthly_emi: formatAoa(app.monthly_emi_aoa),
    score: String(app.score),
    band: app.band,
    confidence: app.confidence,
    system_suggestion:
      app.decision === 'auto_approve'
        ? 'Auto-Approve Candidate'
        : app.decision === 'decline'
          ? 'Decline Candidate'
          : 'Manual Review',
    suggestion:
      app.decision === 'auto_approve'
        ? 'Auto-Approve Candidate'
        : app.decision === 'decline'
          ? 'Decline Candidate'
          : 'Manual Review',
    link: queueLink,
  };

  const subjectTemplate =
    template?.subject || `New credit application {{reference}} awaiting your approval`;
  const bodyTemplate =
    template?.body_text ||
    `New credit application {{reference}} awaiting your approval.\nCustomer: {{customer_name}} ({{mobile_no}})\nVolume: {{volume_level}}\nEquipment: {{equipment}} ({{price}})\nScore: {{score}} ({{band}} | Confidence: {{confidence}})\nLink: {{link}}`;

  const subject = interpolate(subjectTemplate, vars);
  const body = interpolate(bodyTemplate, vars);

  return activeApprovers.map((approver) => ({
    id: `notif-${app.id}-${approver.id}-${Date.now()}`,
    application_id: app.id,
    customer_name: app.customer_name,
    mobile_no: app.mobile_no,
    channel: 'email',
    event_type: 'submitted',
    recipient_email: approver.email,
    recipient_role: 'approver',
    subject,
    body,
    status: 'queued',
    created_at: new Date().toISOString(),
  }));
}

export function buildDecisionEmails(
  app: ApplicationRecord,
  status: 'approved' | 'rejected' | 'more_info_requested',
  reason: string,
  _decidedByRole: Role = 'approver',
  approverName: string = 'Credit Approver',
  template?: EditableNotificationTemplate,
  notifyCustomer: boolean = false,
  appBaseUrl: string = DEFAULT_ORIGIN
): NotificationRecord[] {
  const detailLink = `${appBaseUrl.replace(/\/$/, '')}?appId=${app.id}`;
  const now = new Date().toISOString();

  const vars: Record<string, string> = {
    reference: app.id,
    submitted_by_name: app.submitted_by_name || 'Loan Officer',
    customer_name: app.customer_name,
    mobile_no: app.mobile_no,
    decision: status.toUpperCase(),
    reason: reason || 'Policy decision criteria applied',
    credit_limit: formatAoa(app.credit_limit_aoa),
    equipment: app.product,
    price: formatAoa(app.product_price_aoa),
    emi_term: String(app.emi_term_months),
    monthly_emi: formatAoa(app.monthly_emi_aoa),
    decided_by: approverName,
    decided_at: new Date(now).toLocaleString(),
    link: detailLink,
  };

  const defaultSubject =
    status === 'approved'
      ? `Your credit application {{reference}} was approved`
      : status === 'rejected'
        ? `Your credit application {{reference}} was rejected`
        : `More information requested for credit application {{reference}}`;

  const defaultBody =
    status === 'approved'
      ? `Dear {{submitted_by_name}},\nCredit application {{reference}} for customer {{customer_name}} ({{mobile_no}}) has been APPROVED.\nCredit Limit: {{credit_limit}}\nEquipment: {{equipment}} ({{price}})\nApprover Reason: {{reason}}\nDecided By: {{decided_by}} on {{decided_at}}\nView Application:\n{{link}}`
      : `Dear {{submitted_by_name}},\nCredit application {{reference}} for customer {{customer_name}} ({{mobile_no}}) was REJECTED.\nEquipment: {{equipment}} ({{price}})\nApprover Reason: {{reason}}\nDecided By: {{decided_by}} on {{decided_at}}\nView Application:\n{{link}}`;

  const subject = interpolate(template?.subject || defaultSubject, vars);
  const body = interpolate(template?.body_text || defaultBody, vars);

  const records: NotificationRecord[] = [];

  if (app.submitted_by_email) {
    records.push({
      id: `notif-${app.id}-submitter-${Date.now()}`,
      application_id: app.id,
      customer_name: app.customer_name,
      mobile_no: app.mobile_no,
      channel: 'email',
      event_type:
        status === 'approved'
          ? 'approved'
          : status === 'rejected'
            ? 'rejected'
            : 'more_info',
      recipient_email: app.submitted_by_email,
      recipient_role: 'analyst',
      subject,
      body,
      status: 'queued',
      created_at: now,
    });
  }

  if (notifyCustomer && app.customer_email) {
    records.push({
      id: `notif-${app.id}-customer-${Date.now()}`,
      application_id: app.id,
      customer_name: app.customer_name,
      mobile_no: app.mobile_no,
      channel: 'email',
      event_type:
        status === 'approved'
          ? 'approved'
          : status === 'rejected'
            ? 'rejected'
            : 'more_info',
      recipient_email: app.customer_email,
      recipient_role: 'customer',
      subject,
      body,
      status: 'queued',
      created_at: now,
    });
  }

  return records;
}
