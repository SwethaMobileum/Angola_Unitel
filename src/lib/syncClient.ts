import { useEffect } from 'react';
import { LoanApplication, Evaluation, NotificationRecord, AuditLogEntry } from '../types';
import { fetchAllFromSupabase, syncAllLocalDataToSupabase } from './supabaseSync';

const STORAGE_KEY_APPLICATIONS = 'unitel_credit_applications_v2';
const STORAGE_KEY_APPROVALS = 'unitel_credit_approvals_v2';
const STORAGE_KEY_NOTIFICATIONS = 'unitel_credit_notifications_v2';
const STORAGE_KEY_AUDIT_LOG = 'unitel_credit_audit_log_v2';
const STORAGE_KEY_EVALUATIONS = 'unitel_credit_evaluations_v2';

let eventSourceInstance: EventSource | null = null;
let isInitialized = false;

/**
 * Merge two lists by record id without losing locally created records
 */
function mergeById<T extends { id: any }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<any, T>();
  // Existing local items first (preserves local records)
  for (const item of existing) {
    if (item && item.id !== undefined) {
      map.set(item.id, item);
    }
  }
  // Incoming items update existing or add new ones
  for (const item of incoming) {
    if (item && item.id !== undefined) {
      const prev = map.get(item.id);
      if (prev) {
        map.set(item.id, { ...prev, ...item });
      } else {
        map.set(item.id, item);
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Determine the shared API base URL.
 * Defaults to current origin, or http://localhost:5173 if running on another host/port.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:5173';
  return '';
}

/**
 * Non-destructively merge incoming synchronized database state into localStorage and notify React components
 */
function applySynchronizedState(data: any) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    if (data.allApps && Array.isArray(data.allApps)) {
      const rawCurrent = localStorage.getItem(STORAGE_KEY_APPLICATIONS);
      const currentList = rawCurrent ? JSON.parse(rawCurrent) : [];
      const merged = mergeById(currentList, data.allApps);
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(merged));
    }
    if (data.allApprovals && Array.isArray(data.allApprovals)) {
      const rawCurrent = localStorage.getItem(STORAGE_KEY_APPROVALS);
      const currentList = rawCurrent ? JSON.parse(rawCurrent) : [];
      const merged = mergeById(currentList, data.allApprovals);
      localStorage.setItem(STORAGE_KEY_APPROVALS, JSON.stringify(merged));
    }
    if (data.allEvaluations && Array.isArray(data.allEvaluations)) {
      const rawCurrent = localStorage.getItem(STORAGE_KEY_EVALUATIONS);
      const currentList = rawCurrent ? JSON.parse(rawCurrent) : [];
      const merged = mergeById(currentList, data.allEvaluations);
      localStorage.setItem(STORAGE_KEY_EVALUATIONS, JSON.stringify(merged));
    }
    if (data.allNotifications && Array.isArray(data.allNotifications)) {
      const rawCurrent = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      const currentList = rawCurrent ? JSON.parse(rawCurrent) : [];
      const merged = mergeById(currentList, data.allNotifications);
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(merged));
    }
    if (data.allAuditLogs && Array.isArray(data.allAuditLogs)) {
      const rawCurrent = localStorage.getItem(STORAGE_KEY_AUDIT_LOG);
      const currentList = rawCurrent ? JSON.parse(rawCurrent) : [];
      const merged = mergeById(currentList, data.allAuditLogs);
      localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(merged));
    }

    // Broadcast browser-wide custom event so active views re-render instantly
    window.dispatchEvent(new CustomEvent('unitel-db-updated', { detail: data }));
  } catch (err) {
    console.warn('[SyncClient] Error applying sync state:', err);
  }
}

/**
 * Initialize the real-time Supabase hydration and SSE listener
 */
export function initSyncClient(): void {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  // 1. Initial State Hydration from Supabase Cloud (Single Source of Truth)
  fetchAllFromSupabase()
    .then((cloudData) => {
      if (cloudData) {
        applySynchronizedState({
          allApps: cloudData.applications,
          allApprovals: cloudData.approvals,
          allEvaluations: cloudData.evaluations,
          allNotifications: cloudData.notifications,
          allAuditLogs: cloudData.auditLogs,
        });
      }
      // Also push any local data not yet in Supabase
      syncAllLocalDataToSupabase();
    })
    .catch((err) => {
      console.warn('[SyncClient] Supabase hydration notice:', err.message);
    });

  // 2. Secondary: Hydration from Local Vite dev server (if on localhost)
  const isLocalHost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocalHost) {
    fetch(`${getApiBaseUrl()}/api/db/all`)
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          return res.json();
        }
        throw new Error(`DB fetch returned non-json: ${contentType}`);
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
      .catch(() => {
        // Normal in static or offline environments
      });

    // 3. Connect to Server-Sent Events (SSE) stream for instant live updates between local ports
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
          if (eventSourceInstance) {
            eventSourceInstance.close();
            eventSourceInstance = null;
          }
          setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.warn('[SyncClient] EventSource init error:', err);
      }
    };

    connectSSE();
  }
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
