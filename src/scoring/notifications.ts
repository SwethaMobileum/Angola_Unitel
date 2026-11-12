import { formatAoa } from './decision';
import type {
  ApplicationRecord,
  NotificationRecord,
  NotificationTrigger,
  ScoringConfig,
} from './types';

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

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
