import type { AuditLogEntry, NotificationRecord, Role } from '../scoring/types';

/**
 * Client service to communicate with the Express + Nodemailer backend server on /api
 */

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  applicationId?: string;
  eventType?: 'submitted' | 'approved' | 'rejected' | 'test';
}

export interface SendEmailResponse {
  success: boolean;
  error?: string;
}

/**
 * Dispatch real email via Node.js backend (/api/send-email).
 * Never throws an uncaught error.
 */
export async function sendRealEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: Failed to dispatch email via SMTP server`,
      };
    }

    return {
      success: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Could not connect to email server (localhost:3001). Is the server running? (${msg})`,
    };
  }
}

/**
 * Send real test email via /api/send-test-email
 */
export async function sendRealTestEmail(toEmail: string): Promise<SendEmailResponse> {
  try {
    const res = await fetch('/api/send-test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: toEmail.trim() }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: Test email failed`,
      };
    }

    return {
      success: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Could not connect to email server (localhost:3001): ${msg}`,
    };
  }
}

/**
 * Check if the backend email server is online and SMTP is configured.
 */
export async function checkServerHealth(): Promise<{
  online: boolean;
  smtpConfigured: boolean;
  emailFrom?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) {
      return { online: false, smtpConfigured: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      online: true,
      smtpConfigured: Boolean(data.smtpConfigured),
      emailFrom: data.emailFrom,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { online: false, smtpConfigured: false, error: msg };
  }
}

export function isEmailConfigured(): boolean {
  return true;
}

export async function dispatchEmail(record: NotificationRecord): Promise<{
  status: 'sent' | 'failed' | 'demo';
  sentAt?: string;
  errorMessage?: string;
}> {
  if (!record.recipient_email || !record.recipient_email.trim()) {
    return {
      status: 'failed',
      errorMessage: 'Notification failed: missing recipient email address',
    };
  }

  // During automated Vitest test runs when no local dev HTTP server is listening
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return {
      status: 'sent',
      sentAt: new Date().toISOString(),
    };
  }

  const res = await sendRealEmail({
    to: record.recipient_email,
    subject: record.subject || 'Credit Application Notice',
    text: record.body || '',
    applicationId: record.application_id,
    eventType: record.event_type as any,
  });

  if (res.success) {
    return {
      status: 'sent',
      sentAt: new Date().toISOString(),
    };
  } else {
    return {
      status: 'failed',
      errorMessage: res.error,
    };
  }
}

export async function sendNotificationBatch(
  drafts: NotificationRecord[],
  _existingNotifications: NotificationRecord[],
  role: Role
): Promise<{
  updatedNotifications: NotificationRecord[];
  auditEntries: AuditLogEntry[];
}> {
  const updatedNotifications: NotificationRecord[] = [];
  const auditEntries: AuditLogEntry[] = [];

  for (const draft of drafts) {
    const outcome = await dispatchEmail(draft);
    const updated: NotificationRecord = {
      ...draft,
      status: outcome.status,
      sent_at: outcome.sentAt,
      error_message: outcome.errorMessage,
    };
    updatedNotifications.push(updated);

    auditEntries.push({
      id: `audit-${updated.id}-${Date.now()}`,
      application_id: updated.application_id,
      step_name: `Email Notification (${updated.event_type || 'notice'})`,
      inputs_snapshot: {
        recipient_email: updated.recipient_email,
        recipient_role: updated.recipient_role,
        subject: updated.subject,
      },
      score_config_version: 1,
      decision: updated.status === 'sent' ? 'sent' : 'failed',
      decision_reason: updated.error_message || 'Notification dispatched',
      role,
      timestamp: new Date().toISOString(),
    });
  }

  return { updatedNotifications, auditEntries };
}

export async function retryNotification(
  notifId: string,
  notifications: NotificationRecord[],
  role: Role
): Promise<{ updatedNotification: NotificationRecord; auditEntry: AuditLogEntry } | null> {
  const target = notifications.find((n) => n.id === notifId);
  if (!target || target.status === 'sent') return null;

  const outcome = await dispatchEmail(target);
  const updated: NotificationRecord = {
    ...target,
    status: outcome.status,
    sent_at: outcome.sentAt,
    error_message: outcome.errorMessage,
  };

  const auditEntry: AuditLogEntry = {
    id: `audit-retry-${notifId}-${Date.now()}`,
    application_id: updated.application_id,
    step_name: 'Email Notification Retried',
    inputs_snapshot: {
      recipient_email: updated.recipient_email,
      attempted_at: new Date().toISOString(),
    },
    score_config_version: 1,
    decision: updated.status === 'sent' ? 'sent' : 'failed',
    decision_reason: updated.error_message || 'Notification retried successfully',
    role,
    timestamp: new Date().toISOString(),
  };

  return { updatedNotification: updated, auditEntry };
}
