import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../data/shared_db.json');

// In-memory cache of shared DB
let dbData = {
  applications: [],
  approvals: [],
  evaluations: [],
  notifications: [],
  auditLogs: [],
  lastUpdated: new Date().toISOString(),
};

// Set of active SSE client responses
const activeClients = new Set();

function loadDbFromDisk() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      dbData = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[SharedDB] Error reading DB from disk:', err.message);
  }
}

function saveDbToDisk() {
  try {
    dbData.lastUpdated = new Date().toISOString();
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[SharedDB] Error saving DB to disk:', err.message);
  }
}

// Watch disk for external modifications (cross-process sync)
let watchDebounce = null;
if (fs.existsSync(DB_PATH)) {
  const watcher = fs.watch(DB_PATH, () => {
    if (watchDebounce) clearTimeout(watchDebounce);
    watchDebounce = setTimeout(() => {
      loadDbFromDisk();
      broadcast('SYNC_RELOAD', null, {
        allApps: dbData.applications,
        allApprovals: dbData.approvals,
        allEvaluations: dbData.evaluations,
        allNotifications: dbData.notifications,
        allAuditLogs: dbData.auditLogs,
      });
    }, 100);
  });
  if (watcher && typeof watcher.unref === 'function') {
    watcher.unref();
  }
}

// Initial load
loadDbFromDisk();

/**
 * Broadcast an event to all connected browser SSE clients
 */
export function broadcast(type, payload, extra = {}) {
  const message = `data: ${JSON.stringify({
    type,
    payload,
    ...extra,
    timestamp: Date.now(),
  })}\n\n`;

  for (const client of activeClients) {
    try {
      client.write(message);
    } catch {
      activeClients.delete(client);
    }
  }
}

/**
 * Helper to sync updates to Supabase PostgreSQL cloud table if configured
 */
async function syncToSupabaseDirect(table, record, env) {
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes('placeholder')) return;

  try {
    await fetch(`${url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(record),
    });
  } catch (err) {
    console.warn(`[SupabaseSync] Direct sync warning (${table}):`, err.message);
  }
}

/**
 * Creates the Connect/Vite middleware for the shared database and real-time SSE stream
 */
export function createSharedDbMiddleware(env) {
  return (req, res, next) => {
    // Enable CORS for cross-port requests between 5173, 5174, and local callers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, *');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }

    const url = req.url.split('?')[0];

    // 1. SSE Real-Time Event Stream
    if (url === '/api/db/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientCount: activeClients.size + 1 })}\n\n`);

      activeClients.add(res);

      req.on('close', () => {
        activeClients.delete(res);
      });
      return;
    }

    // 2. Health & Status
    if (url === '/api/db/health') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(
        JSON.stringify({
          status: 'ok',
          activeClients: activeClients.size,
          applicationCount: dbData.applications.length,
          evaluationCount: dbData.evaluations.length,
          lastUpdated: dbData.lastUpdated,
        })
      );
    }

    // 3. GET /api/db/all -> returns all synchronized datasets
    if (req.method === 'GET' && url === '/api/db/all') {
      loadDbFromDisk();
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(dbData));
    }

    // 4. GET /api/db/applications
    if (req.method === 'GET' && url === '/api/db/applications') {
      loadDbFromDisk();
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(dbData.applications));
    }

    // Read POST / PATCH body helper
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const parsedBody = body ? JSON.parse(body) : {};

        // 5. POST /api/db/applications -> create new application
        if (req.method === 'POST' && url === '/api/db/applications') {
          loadDbFromDisk();
          const newApp = parsedBody;
          dbData.applications = [newApp, ...dbData.applications.filter((a) => a.id !== newApp.id)];
          saveDbToDisk();

          // Sync to Supabase
          syncToSupabaseDirect('loan_applications', {
            id: newApp.id,
            evaluation_id: newApp.evaluation_id,
            equipment_id: newApp.equipment_id,
            price_kz: newApp.price_kz,
            term_months: newApp.term_months,
            rate_pct: newApp.rate_pct,
            monthly_emi_kz: newApp.monthly_emi_kz,
            emi_share_pct: newApp.emi_share_pct,
            status: newApp.status,
            submitted_by: newApp.submitted_by,
            submitted_at: newApp.submitted_at,
          }, env);

          broadcast('APPLICATION_CREATED', newApp, { allApps: dbData.applications });

          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, application: newApp }));
        }

        // 6. PATCH /api/db/applications/:id -> update status (e.g. purchased or approved)
        if (req.method === 'PATCH' && url.startsWith('/api/db/applications/')) {
          const id = url.replace('/api/db/applications/', '');
          loadDbFromDisk();
          const index = dbData.applications.findIndex((a) => a.id === id);
          if (index >= 0) {
            dbData.applications[index] = { ...dbData.applications[index], ...parsedBody };
            saveDbToDisk();

            const updatedApp = dbData.applications[index];
            syncToSupabaseDirect('loan_applications', {
              id: updatedApp.id,
              status: updatedApp.status,
              purchased_at: updatedApp.purchased_at,
            }, env);

            broadcast('APPLICATION_UPDATED', updatedApp, { allApps: dbData.applications });

            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, application: updatedApp }));
          } else {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: 'Application not found' }));
          }
        }

        // 7. POST /api/db/decision -> process approval or rejection
        if (req.method === 'POST' && url === '/api/db/decision') {
          const { applicationId, decision, reason, approverName, applicantEmail } = parsedBody;
          loadDbFromDisk();

          const appIndex = dbData.applications.findIndex((a) => a.id === applicationId);
          let targetApp = null;
          if (appIndex >= 0) {
            dbData.applications[appIndex].status = decision;
            targetApp = dbData.applications[appIndex];
          }

          const newApproval = {
            id: `appr-${Date.now()}`,
            application_id: applicationId,
            approver_id: '00000000-0000-0000-0000-000000000002',
            decision,
            reason,
            decided_at: new Date().toISOString(),
          };
          dbData.approvals.unshift(newApproval);

          const newNotif = {
            id: `notif-${Date.now()}`,
            application_id: applicationId,
            to_email: applicantEmail || 'bhargownarravula777@gmail.com',
            kind: decision === 'approved' ? 'approval_notice' : 'rejection_notice',
            subject: `Application ${decision.toUpperCase()}: Reference ${applicationId.slice(-6).toUpperCase()}`,
            body: `Application for ${targetApp?.equipment?.name || 'Equipment'} has been ${decision} by ${approverName || 'Approver'}. Reason: ${reason}`,
            status: 'sent',
            created_at: new Date().toISOString(),
          };
          dbData.notifications.unshift(newNotif);

          const newAudit = {
            id: Date.now(),
            at: new Date().toISOString(),
            actor_name: approverName || 'Approver',
            action: `decision_${decision}`,
            entity: 'approvals',
            entity_id: newApproval.id,
            details: { applicationId, decision, reason },
          };
          dbData.auditLogs.unshift(newAudit);

          saveDbToDisk();

          // Sync approval to Supabase
          syncToSupabaseDirect('approvals', {
            id: newApproval.id,
            application_id: newApproval.application_id,
            approver_id: newApproval.approver_id,
            decision: newApproval.decision,
            reason: newApproval.reason,
            decided_at: newApproval.decided_at,
          }, env);

          broadcast('APPROVAL_DECIDED', { applicationId, decision, reason }, {
            allApps: dbData.applications,
            allApprovals: dbData.approvals,
            allNotifications: dbData.notifications,
            allAuditLogs: dbData.auditLogs,
          });

          res.setHeader('Content-Type', 'application/json');
          return res.end(
            JSON.stringify({
              success: true,
              application: targetApp,
              approval: newApproval,
              notification: newNotif,
              auditLog: newAudit,
            })
          );
        }

        // 8. POST /api/db/evaluations
        if (req.method === 'POST' && url === '/api/db/evaluations') {
          const evalRecord = parsedBody;
          loadDbFromDisk();
          const existingIdx = dbData.evaluations.findIndex((e) => e.id === evalRecord.id);
          if (existingIdx >= 0) {
            dbData.evaluations[existingIdx] = evalRecord;
          } else {
            dbData.evaluations.unshift(evalRecord);
          }
          saveDbToDisk();

          broadcast('EVALUATION_SAVED', evalRecord, { allEvaluations: dbData.evaluations });

          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, evaluation: evalRecord }));
        }

        // 9. POST /api/db/notifications
        if (req.method === 'POST' && url === '/api/db/notifications') {
          const notif = parsedBody;
          loadDbFromDisk();
          dbData.notifications.unshift(notif);
          saveDbToDisk();

          broadcast('NOTIFICATION_ADDED', notif, { allNotifications: dbData.notifications });

          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, notification: notif }));
        }

        // 10. POST /api/db/audit-log
        if (req.method === 'POST' && url === '/api/db/audit-log') {
          const audit = parsedBody;
          loadDbFromDisk();
          dbData.auditLogs.unshift(audit);
          saveDbToDisk();

          broadcast('AUDIT_ADDED', audit, { allAuditLogs: dbData.auditLogs });

          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: true, auditLog: audit }));
        }

        // Not handled by DB middleware, pass to next middleware
        next();
      } catch (err) {
        console.error('[SharedDB] Error handling request:', err);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  };
}
