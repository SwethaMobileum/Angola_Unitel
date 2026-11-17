import { useEffect } from 'react';
import { LoanApplication, Evaluation, NotificationRecord, AuditLogEntry } from '../types';

const STORAGE_KEY_APPLICATIONS = 'unitel_credit_applications_v2';
const STORAGE_KEY_APPROVALS = 'unitel_credit_approvals_v2';
const STORAGE_KEY_NOTIFICATIONS = 'unitel_credit_notifications_v2';
const STORAGE_KEY_AUDIT_LOG = 'unitel_credit_audit_log_v2';
const STORAGE_KEY_EVALUATIONS = 'unitel_credit_evaluations_v2';

let eventSourceInstance: EventSource | null = null;
let isInitialized = false;

/**
 * Determine the shared API base URL.
 * Defaults to current origin, or http://localhost:5173 if running on another host/port.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:5173';
  return '';
}

/**
 * Save incoming synchronized database state into localStorage and notify React components
 */
function applySynchronizedState(data: any) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    if (data.allApps && Array.isArray(data.allApps)) {
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(data.allApps));
    }
    if (data.allApprovals && Array.isArray(data.allApprovals)) {
      localStorage.setItem(STORAGE_KEY_APPROVALS, JSON.stringify(data.allApprovals));
    }
    if (data.allEvaluations && Array.isArray(data.allEvaluations)) {
      localStorage.setItem(STORAGE_KEY_EVALUATIONS, JSON.stringify(data.allEvaluations));
    }
    if (data.allNotifications && Array.isArray(data.allNotifications)) {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(data.allNotifications));
    }
    if (data.allAuditLogs && Array.isArray(data.allAuditLogs)) {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(data.allAuditLogs));
    }

    // Broadcast browser-wide custom event so active views re-render instantly
    window.dispatchEvent(new CustomEvent('unitel-db-updated', { detail: data }));
  } catch (err) {
    console.warn('[SyncClient] Error applying sync state:', err);
  }
}

/**
 * Initialize the real-time SSE listener and fetch initial state from shared DB
 */
export function initSyncClient(): void {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  // 1. Initial State Hydration from Shared DB
  fetch(`${getApiBaseUrl()}/api/db/all`)
    .then((res) => {
      if (res.ok) return res.json();
      throw new Error(`DB fetch returned status ${res.status}`);
    })
    .then((db) => {
      applySynchronizedState({
        allApps: db.applications,
        allApprovals: db.approvals,
        allEvaluations: db.evaluations,
        allNotifications: db.notifications,
        allAuditLogs: db.auditLogs,
      });
    })
    .catch((err) => {
      console.warn('[SyncClient] Initial DB hydration note:', err.message);
    });

  // 2. Connect to Server-Sent Events (SSE) stream for instant live updates
  const connectSSE = () => {
    try {
      if (eventSourceInstance) {
        eventSourceInstance.close();
      }

      eventSourceInstance = new EventSource(`${getApiBaseUrl()}/api/db/events`);

      eventSourceInstance.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'CONNECTED') {
            return;
          }
          applySynchronizedState(data);
        } catch (err) {
          console.warn('[SyncClient] SSE parse error:', err);
        }
      };

      eventSourceInstance.onerror = () => {
        // Automatically retry after 3 seconds if disconnected
        if (eventSourceInstance) {
          eventSourceInstance.close();
          eventSourceInstance = null;
        }
        setTimeout(connectSSE, 3000);
      };
    } catch (err) {
      console.warn('[SyncClient] EventSource init error:', err);
    }
  };

  connectSSE();
}

/**
 * React hook to listen for real-time shared database updates across both localhost portals
 */
export function useSyncDatabase(onUpdate: () => void): void {
  useEffect(() => {
    initSyncClient();

    const handler = () => {
      onUpdate();
    };

    window.addEventListener('unitel-db-updated', handler);
    return () => {
      window.removeEventListener('unitel-db-updated', handler);
    };
  }, [onUpdate]);
}

/**
 * Asynchronous sync API calling the shared backend
 */
export const syncApi = {
  /**
   * Save an application and broadcast to both portals & Supabase
   */
  async createApplication(app: LoanApplication): Promise<void> {
    try {
      await fetch(`${getApiBaseUrl()}/api/db/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(app),
      });
    } catch (err) {
      console.warn('[SyncApi] createApplication backend dispatch note:', err);
    }
  },

  /**
   * Update an existing application (status change, purchased, etc.)
   */
  async updateApplication(id: string, updates: Partial<LoanApplication>): Promise<void> {
    try {
      await fetch(`${getApiBaseUrl()}/api/db/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('[SyncApi] updateApplication backend dispatch note:', err);
    }
  },

  /**
   * Process approval or rejection decision and sync to both portals
   */
  async submitDecision(params: {
    applicationId: string;
    decision: 'approved' | 'rejected';
    reason: string;
    approverName?: string;
    applicantEmail?: string;
  }): Promise<void> {
    try {
      await fetch(`${getApiBaseUrl()}/api/db/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    } catch (err) {
      console.warn('[SyncApi] submitDecision backend dispatch note:', err);
    }
  },

  /**
   * Save an evaluation record
   */
  async saveEvaluation(evaluation: Evaluation): Promise<void> {
    try {
      await fetch(`${getApiBaseUrl()}/api/db/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evaluation),
      });
    } catch (err) {
      console.warn('[SyncApi] saveEvaluation backend dispatch note:', err);
    }
  },

  /**
   * Add a notification
   */
  async addNotification(notif: NotificationRecord): Promise<void> {
    try {
      await fetch(`${getApiBaseUrl()}/api/db/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notif),
      });
    } catch (err) {
      console.warn('[SyncApi] addNotification backend dispatch note:', err);
    }
  },

  /**
   * Add an audit log entry
   */
  async addAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      await fetch(`${getApiBaseUrl()}/api/db/audit-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch (err) {
      console.warn('[SyncApi] addAuditLog backend dispatch note:', err);
    }
  },
};
