import type {
  AuditLogEntry,
  EditableNotificationTemplate,
  NotificationRecord,
  Role,
} from '../scoring/types';
import { interpolate } from '../scoring/notifications';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export interface EmailDispatchResult {
  status: 'sent' | 'demo' | 'failed';
  errorMessage?: string;
  sentAt?: string;
}

/**
 * Checks if real email service is configured.
 * Front-end does not store secret keys; it checks if server edge function/mock is enabled.
 */
export function isEmailConfigured(): boolean {
  // Check if explicit demo override is active or if Supabase functions are available
  const isDemo = import.meta.env.VITE_EMAIL_DEMO_MODE === 'true';
  if (isDemo) return false;
  // If Vite env specifies a provider or Supabase is connected with real keys
  const hasEndpoint = Boolean(import.meta.env.VITE_EMAIL_API_ENDPOINT);
  return isSupabaseConfigured || hasEndpoint;
}

/**
 * Dispatch a notification safely. Never throws or halts execution.
 */
export async function dispatchEmail(
  record: NotificationRecord
): Promise<EmailDispatchResult> {
  const now = new Date().toISOString();

  // Validate recipient
  if (!record.recipient_email || !record.recipient_email.trim()) {
    return {
      status: 'failed',
      errorMessage: 'Recipient email address is missing or invalid',
    };
  }

  // If not configured, run in Demo Mode
  if (!isEmailConfigured()) {
    return {
      status: 'demo',
      sentAt: now,
    };
  }

  try {
    // 1. Try Supabase Edge Function if Supabase is configured
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          to: record.recipient_email,
          subject: record.subject,
          text: record.body,
          html: record.body.replace(/\n/g, '<br/>'),
          application_id: record.application_id,
          event_type: record.event_type,
        },
      });

      if (error) {
        return {
          status: 'failed',
          errorMessage: error.message || 'Supabase Edge function dispatch failed',
        };
      }

      if (data?.mode === 'demo') {
        return {
          status: 'demo',
          sentAt: now,
        };
      }

      return {
        status: 'sent',
        sentAt: now,
      };
    }

    // 2. Try generic endpoint if specified
    const customEndpoint = import.meta.env.VITE_EMAIL_API_ENDPOINT;
    if (customEndpoint) {
      const resp = await fetch(customEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: record.recipient_email,
          subject: record.subject,
          text: record.body,
          application_id: record.application_id,
          event_type: record.event_type,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return {
          status: 'failed',
          errorMessage: `HTTP ${resp.status}: ${errText || 'Sending failed'}`,
        };
      }

      return {
        status: 'sent',
        sentAt: now,
      };
    }

    // Fallback to Demo Mode
    return {
      status: 'demo',
      sentAt: now,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'failed',
      errorMessage: msg || 'Unexpected email transport error',
    };
  }
}

/**
 * Dispatch a batch of notification drafts, respecting deduplication and non-blocking safety.
 */
export async function sendNotificationBatch(
  drafts: NotificationRecord[],
  existingNotifications: NotificationRecord[],
  actingRole: Role = 'analyst'
): Promise<{
  updatedNotifications: NotificationRecord[];
  auditEntries: AuditLogEntry[];
}> {
  const updatedNotifications: NotificationRecord[] = [];
  const auditEntries: AuditLogEntry[] = [];

  for (const draft of drafts) {
    // Deduplication check: Do not re-send if an email for this (app, event, recipient) was already sent
    const alreadySent = existingNotifications.some(
      (n) =>
        n.application_id === draft.application_id &&
        n.event_type === draft.event_type &&
        n.recipient_email?.toLowerCase() === draft.recipient_email?.toLowerCase() &&
        n.status === 'sent'
    );

    if (alreadySent) {
      // Reuse existing or skip duplicate dispatch
      continue;
    }

    const result = await dispatchEmail(draft);
    const sentRecord: NotificationRecord = {
      ...draft,
      status: result.status,
      error_message: result.errorMessage,
      sent_at: result.sentAt,
    };

    updatedNotifications.push(sentRecord);

    // Audit log entry for notification
    const auditStatusLabel =
      result.status === 'sent'
        ? 'Email Sent'
        : result.status === 'demo'
          ? 'Email Demo Recorded'
          : 'Email Dispatch Failed';

    auditEntries.push({
      id: `audit-notif-${sentRecord.id}-${Date.now()}`,
      application_id: sentRecord.application_id,
      step_name: `Notification: ${draft.event_type ?? 'alert'} (${sentRecord.recipient_role ?? 'recipient'})`,
      inputs_snapshot: {
        recipient_email: sentRecord.recipient_email,
        recipient_role: sentRecord.recipient_role,
        event_type: sentRecord.event_type,
        status: sentRecord.status,
        subject: sentRecord.subject,
      },
      score_config_version: 1,
      decision: auditStatusLabel,
      decision_reason:
        result.status === 'failed'
          ? `Failed to send: ${result.errorMessage}`
          : result.status === 'demo'
            ? 'Not sent (demo mode)'
            : `Delivered to ${sentRecord.recipient_email}`,
      role: actingRole,
      timestamp: sentRecord.created_at,
    });
  }

  return { updatedNotifications, auditEntries };
}

/**
 * Retry sending a failed notification.
 */
export async function retryNotification(
  targetId: string,
  currentNotifications: NotificationRecord[],
  actingRole: Role = 'admin'
): Promise<{
  updatedNotification: NotificationRecord;
  auditEntry: AuditLogEntry;
} | null> {
  const target = currentNotifications.find((n) => n.id === targetId);
  if (!target) return null;

  // Never duplicate if already sent
  if (target.status === 'sent') {
    return null;
  }

  const result = await dispatchEmail(target);
  const updated: NotificationRecord = {
    ...target,
    status: result.status,
    error_message: result.errorMessage,
    sent_at: result.sentAt,
  };

  const auditEntry: AuditLogEntry = {
    id: `audit-retry-${updated.id}-${Date.now()}`,
    application_id: updated.application_id,
    step_name: `Notification Retry: ${updated.event_type ?? 'email'}`,
    inputs_snapshot: {
      notification_id: updated.id,
      recipient_email: updated.recipient_email,
      attempted_status: updated.status,
    },
    score_config_version: 1,
    decision: updated.status === 'sent' ? 'Retry Succeeded' : 'Retry Failed',
    decision_reason:
      updated.status === 'failed'
        ? `Retry failed: ${updated.error_message}`
        : updated.status === 'demo'
          ? 'Retry completed in demo mode'
          : `Delivered to ${updated.recipient_email}`,
    role: actingRole,
    timestamp: new Date().toISOString(),
  };

  return { updatedNotification: updated, auditEntry };
}

/**
 * Send a test email from Admin preview to a designated address.
 */
export async function sendTestNotification(
  toEmail: string,
  template: EditableNotificationTemplate,
  sampleVars: Record<string, string>
): Promise<EmailDispatchResult> {
  const renderedSubject = interpolate(template.subject, sampleVars);
  const renderedBody = interpolate(template.body_text, sampleVars);

  const testRecord: NotificationRecord = {
    id: `test-email-${Date.now()}`,
    application_id: sampleVars.reference || 'CR-TEST',
    customer_name: sampleVars.customer_name || 'Test User',
    mobile_no: sampleVars.mobile_no || '+244 923 000 000',
    channel: 'email',
    event_type: 'test',
    recipient_email: toEmail,
    recipient_role: 'admin',
    subject: `[TEST] ${renderedSubject}`,
    body: renderedBody,
    status: 'queued',
    created_at: new Date().toISOString(),
  };

  return dispatchEmail(testRecord);
}
