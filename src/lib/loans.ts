import {
  LoanApplication,
  Approval,
  NotificationRecord,
  AuditLogEntry,
} from '../types';
import { DEFAULT_EQUIPMENT } from '../data/seedData';
import { getStoredEvaluations } from './evaluations';
import { dispatchTransactionalEmail, generateLoanEmailHtml } from './supabaseSync';
import { syncApi } from './syncClient';

const STORAGE_KEY_APPLICATIONS = 'unitel_credit_applications_v2';
const STORAGE_KEY_APPROVALS = 'unitel_credit_approvals_v2';
const STORAGE_KEY_NOTIFICATIONS = 'unitel_credit_notifications_v2';
const STORAGE_KEY_AUDIT_LOG = 'unitel_credit_audit_log_v2';

// Seed Initial Applications, Approvals, Notifications, and Audit Entries
export function createSeedLoanData() {
  const evals = getStoredEvaluations();
  const eqFeaturePhone = DEFAULT_EQUIPMENT[0]; // 18,000 Kz
  const eqUnitelSmart = DEFAULT_EQUIPMENT[1];  // 45,000 Kz
  const eqSolarKit = DEFAULT_EQUIPMENT[2];     // 65,000 Kz
  const eqPocketWifi = DEFAULT_EQUIPMENT[3];   // 35,000 Kz
  const eqSamsungA05 = DEFAULT_EQUIPMENT[4];   // 85,000 Kz
  const eqRedmi13C = DEFAULT_EQUIPMENT[5];     // 120,000 Kz
  const eqSamsungA15 = DEFAULT_EQUIPMENT[6];   // 165,000 Kz
  const eqLenovoTab = DEFAULT_EQUIPMENT[7];    // 210,000 Kz

  // App 1: S1 João Baptista (18,000 Kz, 6m, Approved)
  const app1: LoanApplication = {
    id: 'app-seed-001',
    evaluation_id: evals[0]?.id || 'eval-seed-001',
    equipment_id: eqFeaturePhone.id,
    price_kz: eqFeaturePhone.price_kz,
    term_months: 6,
    rate_pct: 0,
    monthly_emi_kz: Math.round(eqFeaturePhone.price_kz / 6), // 3,000 Kz
    emi_share_pct: 3.0,
    status: 'approved',
    submitted_by: '00000000-0000-0000-0000-000000000001',
    submitted_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    evaluation: evals[0],
    equipment: eqFeaturePhone,
  };

  const approval1: Approval = {
    id: 'appr-seed-001',
    application_id: 'app-seed-001',
    approver_id: '00000000-0000-0000-0000-000000000002',
    decision: 'approved',
    reason: 'Affordable starter loan within 50,000 Kz cap. Long 36m tenure and consistent topups.',
    decided_at: new Date(Date.now() - 2.8 * 86400000).toISOString(),
  };

  // App 2: S3 Esperança Domingos (Samsung A05 85,000 Kz, 6m, Submitted / Pending Review)
  const app2: LoanApplication = {
    id: 'app-seed-002',
    evaluation_id: evals[1]?.id || 'eval-seed-002',
    equipment_id: eqSamsungA05.id,
    price_kz: eqSamsungA05.price_kz,
    term_months: 6,
    rate_pct: 0,
    monthly_emi_kz: Math.round(eqSamsungA05.price_kz / 6), // 14,167 Kz
    emi_share_pct: 8.1,
    status: 'submitted',
    submitted_by: '00000000-0000-0000-0000-000000000001',
    submitted_at: new Date(Date.now() - 1.5 * 86400000).toISOString(),
    evaluation: evals[1],
    equipment: eqSamsungA05,
  };

  // App 3: S7 Dr. Paulo Afonso (Lenovo Tab 210,000 Kz, 12m, Approved)
  const app3: LoanApplication = {
    id: 'app-seed-003',
    evaluation_id: evals[2]?.id || 'eval-seed-003',
    equipment_id: eqLenovoTab.id,
    price_kz: eqLenovoTab.price_kz,
    term_months: 12,
    rate_pct: 0,
    monthly_emi_kz: Math.round(eqLenovoTab.price_kz / 12), // 17,500 Kz
    emi_share_pct: 2.3,
    status: 'approved',
    submitted_by: '00000000-0000-0000-0000-000000000001',
    submitted_at: new Date(Date.now() - 0.8 * 86400000).toISOString(),
    evaluation: evals[2],
    equipment: eqLenovoTab,
  };

  const approval3: Approval = {
    id: 'appr-seed-003',
    application_id: 'app-seed-003',
    approver_id: '00000000-0000-0000-0000-000000000002',
    decision: 'approved',
    reason: 'Formal government payroll direct deposit verified in Banco BAI. High credit score (790).',
    decided_at: new Date(Date.now() - 0.5 * 86400000).toISOString(),
  };

  // App 4: Mateus Kiala (Redmi 13C 120,000 Kz, Rejected - SIM swap hold & thin file)
  const app4: LoanApplication = {
    id: 'app-seed-004',
    evaluation_id: evals[3]?.id || 'eval-seed-004',
    equipment_id: eqRedmi13C.id,
    price_kz: eqRedmi13C.price_kz,
    term_months: 6,
    rate_pct: 0,
    monthly_emi_kz: Math.round(eqRedmi13C.price_kz / 6), // 20,000 Kz
    emi_share_pct: 35.0,
    status: 'rejected',
    submitted_by: '00000000-0000-0000-0000-000000000001',
    submitted_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    evaluation: evals[3],
    equipment: eqRedmi13C,
  };

  const approval4: Approval = {
    id: 'appr-seed-004',
    application_id: 'app-seed-004',
    approver_id: '00000000-0000-0000-0000-000000000002',
    decision: 'rejected',
    reason: 'Underwriting hold: SIM card replaced 12 days ago. Minimum 30-day seasoning required.',
    decided_at: new Date(Date.now() - 3.9 * 86400000).toISOString(),
  };

  // App 5: S8 Rosa Maria Bernardo (Samsung A15 165,000 Kz, Rejected - EMI Cap Exceeded)
  const app5: LoanApplication = {
    id: 'app-seed-005',
    evaluation_id: evals[4]?.id || 'eval-seed-005',
    equipment_id: eqSamsungA15.id,
    price_kz: eqSamsungA15.price_kz,
    term_months: 6,
    rate_pct: 0,
    monthly_emi_kz: Math.round(eqSamsungA15.price_kz / 6), // 27,500 Kz
    emi_share_pct: 36.6,
    status: 'rejected',
    submitted_by: '00000000-0000-0000-0000-000000000001',
    submitted_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    evaluation: evals[4],
    equipment: eqSamsungA15,
  };

  const approval5: Approval = {
    id: 'appr-seed-005',
    application_id: 'app-seed-005',
    approver_id: '00000000-0000-0000-0000-000000000002',
    decision: 'rejected',
    reason: 'Monthly EMI (27,500 Kz) exceeds regulatory 30% debt-service cap for income band 2.',
    decided_at: new Date(Date.now() - 4.8 * 86400000).toISOString(),
  };

  // App 6: S5 Alberto Sebastião (Solar Kit 65,000 Kz, 6m, Submitted / Queue)
  const app6: LoanApplication = {
    id: 'app-seed-006',
    evaluation_id: evals[5]?.id || 'eval-seed-006',
    equipment_id: eqSolarKit.id,
    price_kz: eqSolarKit.price_kz,
    term_months: 6,
    rate_pct: 0,
    monthly_emi_kz: Math.round(eqSolarKit.price_kz / 6), // 10,833 Kz
    emi_share_pct: 6.2,
    status: 'submitted',
    submitted_by: '00000000-0000-0000-0000-000000000001',
    submitted_at: new Date(Date.now() - 1.2 * 86400000).toISOString(),
    evaluation: evals[5],
    equipment: eqSolarKit,
  };

  // App 7: S6 Teresa de Jesus Neto (Pocket Wi-Fi 35,000 Kz, 6m, Saved / Draft)
  const app7: LoanApplication = {
    id: 'app-seed-007',
    evaluation_id: evals[6]?.id || 'eval-seed-007',
    equipment_id: eqPocketWifi.id,
    price_kz: eqPocketWifi.price_kz,
    term_months: 6,
    rate_pct: 0,
    monthly_emi_kz: Math.round(eqPocketWifi.price_kz / 6), // 5,833 Kz
    emi_share_pct: 3.3,
    status: 'saved',
    submitted_by: '00000000-0000-0000-0000-000000000001',
    submitted_at: new Date(Date.now() - 0.5 * 86400000).toISOString(),
    evaluation: evals[6],
    equipment: eqPocketWifi,
  };

  // App 8: S2 Manuel António da Silva (Unitel Smart 45,000 Kz, 6m, Purchased)
  const app8: LoanApplication = {
    id: 'app-seed-008',
    evaluation_id: evals[7]?.id || 'eval-seed-008',
    equipment_id: eqUnitelSmart.id,
    price_kz: eqUnitelSmart.price_kz,
    term_months: 6,
    rate_pct: 0,
    monthly_emi_kz: Math.round(eqUnitelSmart.price_kz / 6), // 7,500 Kz
    emi_share_pct: 7.5,
    status: 'purchased',
    submitted_by: '00000000-0000-0000-0000-000000000001',
    submitted_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    purchased_at: new Date(Date.now() - 5.5 * 86400000).toISOString(),
    evaluation: evals[7],
    equipment: eqUnitelSmart,
  };

  const approval8: Approval = {
    id: 'appr-seed-008',
    application_id: 'app-seed-008',
    approver_id: '00000000-0000-0000-0000-000000000002',
    decision: 'approved',
    reason: 'Verified USSD wallet activity and 46-month telecom tenure. Approved for collection.',
    decided_at: new Date(Date.now() - 5.8 * 86400000).toISOString(),
  };

  // Seed Notifications
  const notifs: NotificationRecord[] = [
    {
      id: 'notif-001',
      application_id: 'app-seed-001',
      to_email: 'maria.mendes@unitel.ao',
      kind: 'submission_notice',
      subject: 'New Loan Application Submitted (CR-001) - João Manuel Baptista',
      body: 'Application for Unitel Feature Phone (18,000 Kz) submitted by Tomas Silva (Applicant). Proxy score: 620 (Acceptable).',
      status: 'logged',
      created_at: app1.submitted_at,
    },
    {
      id: 'notif-002',
      application_id: 'app-seed-001',
      to_email: 'tomas.silva@unitel.ao',
      kind: 'approval_notice',
      subject: 'Loan Application Approved (CR-001) - João Manuel Baptista',
      body: 'Dra. Maria Mendes approved application CR-001 for 18,000 Kz over 6 months (EMI: 3,000 Kz/mo).',
      status: 'logged',
      created_at: approval1.decided_at,
    },
    {
      id: 'notif-003',
      application_id: 'app-seed-002',
      to_email: 'maria.mendes@unitel.ao',
      kind: 'submission_notice',
      subject: 'New Loan Application Awaiting Approval (CR-002) - Esperança Teresa Domingos',
      body: 'Application for Samsung Galaxy A05 (85,000 Kz) submitted by Tomas Silva. Proxy score: 685 (Acceptable).',
      status: 'logged',
      created_at: app2.submitted_at,
    },
    {
      id: 'notif-004',
      application_id: 'app-seed-003',
      to_email: 'tomas.silva@unitel.ao',
      kind: 'approval_notice',
      subject: 'Loan Application Approved (CR-003) - Dr. Paulo Henrique Afonso',
      body: 'Dra. Maria Mendes approved application CR-003 for Lenovo Tab M10 (210,000 Kz).',
      status: 'logged',
      created_at: approval3.decided_at,
    },
  ];

  // Seed Audit Log
  const auditLogs: AuditLogEntry[] = [
    {
      id: 1,
      at: new Date(Date.now() - 3.1 * 86400000).toISOString(),
      actor_name: 'Tomas Silva (Applicant)',
      action: 'create_evaluation',
      entity: 'evaluations',
      entity_id: 'eval-seed-001',
      details: { customer: 'João Manuel Baptista', segment: 'S1', score: 620, confidence: 'medium' },
    },
    {
      id: 2,
      at: app1.submitted_at,
      actor_name: 'Tomas Silva (Applicant)',
      action: 'submit_loan_application',
      entity: 'loan_applications',
      entity_id: 'app-seed-001',
      details: { equipment: 'Unitel Feature Phone', price_kz: 18000, term_months: 6, monthly_emi: 3000 },
    },
    {
      id: 3,
      at: approval1.decided_at,
      actor_name: 'Dra. Maria Mendes (Approver)',
      action: 'decision_approved',
      entity: 'approvals',
      entity_id: 'appr-seed-001',
      details: { application_id: 'app-seed-001', reason: approval1.reason },
    },
    {
      id: 4,
      at: new Date(Date.now() - 2 * 86400000).toISOString(),
      actor_name: 'Tomas Silva (Applicant)',
      action: 'create_evaluation',
      entity: 'evaluations',
      entity_id: 'eval-seed-002',
      details: { customer: 'Esperança Teresa Domingos', segment: 'S3', score: 685, confidence: 'high' },
    },
    {
      id: 5,
      at: app2.submitted_at,
      actor_name: 'Tomas Silva (Applicant)',
      action: 'submit_loan_application',
      entity: 'loan_applications',
      entity_id: 'app-seed-002',
      details: { equipment: 'Samsung Galaxy A05', price_kz: 85000, term_months: 6, monthly_emi: 14167 },
    },
    {
      id: 6,
      at: new Date(Date.now() - 1 * 86400000).toISOString(),
      actor_name: 'Tomas Silva (Applicant)',
      action: 'create_evaluation',
      entity: 'evaluations',
      entity_id: 'eval-seed-003',
      details: { customer: 'Dr. Paulo Henrique Afonso', segment: 'S7', score: 790, confidence: 'high' },
    },
    {
      id: 7,
      at: app3.submitted_at,
      actor_name: 'Tomas Silva (Applicant)',
      action: 'submit_loan_application',
      entity: 'loan_applications',
      entity_id: 'app-seed-003',
      details: { equipment: 'Lenovo Tab M10', price_kz: 210000, term_months: 12, monthly_emi: 17500 },
    },
    {
      id: 8,
      at: approval3.decided_at,
      actor_name: 'Dra. Maria Mendes (Approver)',
      action: 'decision_approved',
      entity: 'approvals',
      entity_id: 'appr-seed-003',
      details: { application_id: 'app-seed-003', reason: approval3.reason },
    },
  ];

  return {
    applications: [app1, app2, app3, app4, app5, app6, app7, app8],
    approvals: [approval1, approval3, approval4, approval5, approval8],
    notifications: notifs,
    auditLogs: auditLogs,
  };
}

export function getStoredApplications(): LoanApplication[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createSeedLoanData().applications;
    }
    const raw = localStorage.getItem(STORAGE_KEY_APPLICATIONS);
    if (!raw) {
      const seed = createSeedLoanData();
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(seed.applications));
      localStorage.setItem(STORAGE_KEY_APPROVALS, JSON.stringify(seed.approvals));
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(seed.notifications));
      localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(seed.auditLogs));
      return seed.applications;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 8) {
      const seed = createSeedLoanData();
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(seed.applications));
      localStorage.setItem(STORAGE_KEY_APPROVALS, JSON.stringify(seed.approvals));
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(seed.notifications));
      localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(seed.auditLogs));
      return seed.applications;
    }
    return parsed;
  } catch {
    return createSeedLoanData().applications;
  }
}

export function saveApplication(app: LoanApplication, analystEmail: string = 'bhargownarravula777@gmail.com'): void {
  const current = getStoredApplications();
  current.unshift(app);
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(current));
  }

  // Cross-port sync to shared DB and Supabase
  syncApi.createApplication(app);

  const recipient = analystEmail && analystEmail.includes('@')
    ? analystEmail
    : (app.evaluation?.customer?.email || 'bhargownarravula777@gmail.com');

  // Generate Branded HTML Email
  const emailHtml = generateLoanEmailHtml({
    kind: 'submission_notice',
    customerName: app.evaluation?.customer?.full_name || 'Subscriber',
    applicationId: app.id,
    equipmentName: app.equipment?.name || 'Equipment',
    priceKz: app.price_kz,
    monthlyEmiKz: app.monthly_emi_kz,
    termMonths: app.term_months,
    score: app.evaluation?.results?.score,
    scoreBand: app.evaluation?.results?.band_label,
    actorName: `Tomas Silva (${recipient})`,
  });

  // Attempt live email dispatch (Gmail SMTP or local fallback)
  dispatchTransactionalEmail({
    to: recipient,
    subject: `New Credit Application Submitted (${app.id.slice(-6).toUpperCase()}) - ${app.evaluation?.customer?.full_name}`,
    html: emailHtml,
    kind: 'submission_notice',
    applicationId: app.id,
  }).then((res) => {
    // Trigger Notification to Approver & Applicant
    addNotification({
      id: `notif-${Date.now()}`,
      application_id: app.id,
      to_email: recipient,
      kind: 'submission_notice',
      subject: `New Credit Application Submitted (${app.id.slice(-6).toUpperCase()}) - ${app.evaluation?.customer?.full_name}`,
      body: `Application for ${app.equipment?.name} (${app.price_kz.toLocaleString()} Kz) submitted. Monthly EMI: ${app.monthly_emi_kz.toLocaleString()} Kz (${app.emi_share_pct}% share). Status: Pending Approver Review. Notification dispatched to ${recipient}.`,
      html_body: emailHtml,
      status: (res.mode === 'live_gmail' || res.mode === 'live_resend' || res.mode === 'live_brevo') && res.success ? 'sent' : 'logged',
      created_at: new Date().toISOString(),
    });
  });

  // Write to Audit Log
  addAuditLogEntry({
    id: Date.now(),
    at: new Date().toISOString(),
    actor_name: 'Tomas Silva (Analyst)',
    action: 'submit_loan_application',
    entity: 'loan_applications',
    entity_id: app.id,
    details: {
      equipment: app.equipment?.name,
      price_kz: app.price_kz,
      term_months: app.term_months,
      monthly_emi_kz: app.monthly_emi_kz,
      recipient_email: recipient,
    },
  });
}

export function updateApplicationStatus(id: string, status: LoanApplication['status'], extra?: Partial<LoanApplication>): void {
  const current = getStoredApplications();
  const index = current.findIndex(a => a.id === id);
  if (index >= 0) {
    current[index] = { ...current[index], status, ...extra };
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(current));
    }
    syncApi.updateApplication(id, { status, ...extra });
  }
}

export function getStoredApprovals(): Approval[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createSeedLoanData().approvals;
    }
    const raw = localStorage.getItem(STORAGE_KEY_APPROVALS);
    if (!raw) return createSeedLoanData().approvals;
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function processApprovalDecision(
  applicationId: string,
  decision: 'approved' | 'rejected',
  reason: string,
  approverName: string = 'Dra. Maria Mendes (Approver)',
  applicantEmail: string = 'bhargownarravula777@gmail.com'
): void {
  // 1. Update Application status
  const apps = getStoredApplications();
  const appIndex = apps.findIndex((a) => a.id === applicationId);
  if (appIndex >= 0) {
    apps[appIndex].status = decision;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(apps));
    }
  }

  // 2. Save Approval record
  const approvals = getStoredApprovals();
  const newApproval: Approval = {
    id: `appr-${Date.now()}`,
    application_id: applicationId,
    approver_id: '00000000-0000-0000-0000-000000000002',
    decision,
    reason,
    decided_at: new Date().toISOString(),
  };
  approvals.unshift(newApproval);
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(STORAGE_KEY_APPROVALS, JSON.stringify(approvals));
  }

  // Cross-port sync to shared DB, real-time SSE broadcast and Supabase
  syncApi.submitDecision({
    applicationId,
    decision,
    reason,
    approverName,
    applicantEmail,
  });

  // 3. Generate Decision Email HTML
  const targetApp = apps[appIndex];
  const recipient = applicantEmail && applicantEmail.includes('@')
    ? applicantEmail
    : (targetApp?.evaluation?.customer?.email || 'bhargownarravula777@gmail.com');

  const emailHtml = generateLoanEmailHtml({
    kind: decision === 'approved' ? 'approval_notice' : 'rejection_notice',
    customerName: targetApp?.evaluation?.customer?.full_name || 'Subscriber',
    applicationId: applicationId,
    equipmentName: targetApp?.equipment?.name || 'Equipment',
    priceKz: targetApp?.price_kz || 0,
    monthlyEmiKz: targetApp?.monthly_emi_kz,
    termMonths: targetApp?.term_months,
    score: targetApp?.evaluation?.results?.score,
    scoreBand: targetApp?.evaluation?.results?.band_label,
    reason,
    actorName: approverName,
  });

  // Attempt live email dispatch
  dispatchTransactionalEmail({
    to: recipient,
    subject: `Application ${decision.toUpperCase()}: Reference ${applicationId.slice(-6).toUpperCase()}`,
    html: emailHtml,
    kind: decision === 'approved' ? 'approval_notice' : 'rejection_notice',
    applicationId,
  }).then((res) => {
    // Log Notification to Applicant
    addNotification({
      id: `notif-${Date.now()}`,
      application_id: applicationId,
      to_email: recipient,
      kind: decision === 'approved' ? 'approval_notice' : 'rejection_notice',
      subject: `Application ${decision.toUpperCase()}: Reference ${applicationId.slice(-6).toUpperCase()}`,
      body: `Your loan application for ${targetApp?.equipment?.name || 'Equipment'} has been ${decision} by ${approverName}. Note: ${reason}`,
      html_body: emailHtml,
      status: (res.mode === 'live_gmail' || res.mode === 'live_resend' || res.mode === 'live_brevo') && res.success ? 'sent' : 'logged',
      created_at: new Date().toISOString(),
    });
  });

  // 4. Record in Audit Log
  addAuditLogEntry({
    id: Date.now(),
    at: new Date().toISOString(),
    actor_name: approverName,
    action: `decision_${decision}`,
    entity: 'approvals',
    entity_id: newApproval.id,
    details: {
      application_id: applicationId,
      decision,
      reason,
    },
  });
}

export function getStoredNotifications(): NotificationRecord[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createSeedLoanData().notifications;
    }
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (!raw) return createSeedLoanData().notifications;
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addNotification(record: NotificationRecord): void {
  try {
    const current = getStoredNotifications();
    current.unshift(record);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(current));
    }
  } catch (err) {
    console.warn('Failed to save notification', err);
  }
}

export function getStoredAuditLogs(): AuditLogEntry[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createSeedLoanData().auditLogs;
    }
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOG);
    if (!raw) return createSeedLoanData().auditLogs;
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addAuditLogEntry(entry: AuditLogEntry): void {
  try {
    const current = getStoredAuditLogs();
    current.unshift(entry);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(current));
    }
  } catch (err) {
    console.warn('Failed to save audit log', err);
  }
}
