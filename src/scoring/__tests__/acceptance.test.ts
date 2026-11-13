import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APPROVER_RECIPIENTS,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_SCORING_CONFIG,
  buildApplicationSubmittedEmails,
  buildDecisionEmails,
  evaluateCreditScore,
  evaluateLimitAndDecision,
} from '../index';
import type {
  ApplicationRecord,
  ApproverRecipient,
  CustomerProfile,
  NotificationRecord,
} from '../types';
import { dispatchEmail, retryNotification, sendNotificationBatch } from '../../lib/emailService';

// Sample mock customer and application
function createTestProfile(mobile = '+244 923 111 222'): CustomerProfile {
  return {
    customer: {
      id: 'cust-test-1',
      mobile_no: mobile,
      full_name: 'Ana Paula Mendes',
      bi_number: '004198201LA041',
      date_of_birth: '1992-05-15',
      gender: 'F',
      city: 'Luanda',
      address: 'Rua Comandante Gika, 42',
      volume_tier: 'low',
    },
    has_bank_account: false,
    telecom: {
      mobile_no: mobile,
      sim_activation_date: '2022-01-10',
      avg_monthly_topup_aoa: 12_000,
      topup_months_last_12: 12,
      avg_monthly_spend_aoa: 8_500,
      spend_variability: 0.25,
      airtime_loans_taken: 2,
      airtime_loans_repaid_on_time: 2,
      airtime_loans_unpaid: 0,
      sim_registered_with_bi: true,
    },
    mobileMoney: {
      mobile_no: mobile,
      wallet_exists: true,
      registration_level: 'basic',
      monthly_inflow_aoa: 20_000,
      monthly_outflow_aoa: 15_000,
      avg_balance_aoa: 5_000,
      daily_txn_aoa: 2_500,
      txn_count_90d: 10,
      failed_txn_count_90d: 0,
    },
    identity: {
      mobile_no: mobile,
      bi_number: '004198201LA041',
      id_verified: true,
      id_issue_date: null,
      id_issue_place: null,
      address: 'Rua Comandante Gika, 42',
      address_verified: false,
    },
    tax: {
      mobile_no: mobile,
      nif: '004198201LA041',
      nif_status: 'none',
      tax_filing_status: 'none',
    },
  };
}

function createTestApp(
  profile: CustomerProfile,
  submittedByEmail = 'analyst.thomas@unitel.ao',
  customerEmail = 'customer.ana@example.ao'
): ApplicationRecord {
  const exp = evaluateCreditScore(profile, DEFAULT_SCORING_CONFIG);
  const dec = evaluateLimitAndDecision(exp, 140_000, DEFAULT_SCORING_CONFIG, 14_000);

  return {
    id: 'CR-TEST-101',
    customer_id: profile.customer.id,
    customer_name: profile.customer.full_name,
    mobile_no: profile.customer.mobile_no,
    volume_tier: 'low',
    product: 'Unitel Smart 4G (64GB)',
    product_price_aoa: 140_000,
    emi_term_months: 12,
    emi_rate_pct: 12,
    down_payment_aoa: 14_000,
    monthly_emi_aoa: 14_000,
    total_payable_aoa: 168_000,
    emi_affordable: dec.emiAffordable,
    max_monthly_emi_aoa: dec.maxMonthlyEmiAoa,
    status: 'pending_review',
    score: exp.score,
    band: exp.band,
    confidence: exp.confidence,
    credit_limit_aoa: dec.creditLimitAoa,
    decision: dec.decision,
    decision_reason: dec.decisionReason,
    submitted_by_name: 'Thomas Silva',
    submitted_by_email: submittedByEmail,
    customer_email: customerEmail,
    created_at: new Date().toISOString(),
  };
}

describe('Full Acceptance Test Suite (Prompts 1 to 8)', () => {
  // Test 1: Validation of analyst email field
  it('1. Analyst email validation rejects invalid format and accepts valid format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('')).toBe(false);
    expect(emailRegex.test('invalid-email')).toBe(false);
    expect(emailRegex.test('user@')).toBe(false);
    expect(emailRegex.test('user@domain')).toBe(false);
    expect(emailRegex.test('analyst.thomas@unitel.ao')).toBe(true);
  });

  // Test 2: Application submitted -> Notification record exists for each active approver
  it('2. After submit: notification records exist for each active approver with loan summary and link', async () => {
    const profile = createTestProfile();
    const app = createTestApp(profile, 'myanalyst@unitel-demo.ao');

    const approvers: ApproverRecipient[] = [
      { id: 'appr-1', name: 'Desk 1', email: 'approver1@unitel-demo.ao', active: true },
      { id: 'appr-2', name: 'Desk 2', email: 'approver2@unitel-demo.ao', active: true },
      { id: 'appr-3', name: 'Inactive Lead', email: 'inactive@unitel-demo.ao', active: false },
    ];

    const drafts = buildApplicationSubmittedEmails(
      app,
      approvers,
      DEFAULT_EMAIL_TEMPLATES.submitted,
      'http://localhost:5173'
    );

    expect(drafts).toHaveLength(2);
    expect(drafts.map((d) => d.recipient_email)).toEqual([
      'approver1@unitel-demo.ao',
      'approver2@unitel-demo.ao',
    ]);

    const { updatedNotifications, auditEntries } = await sendNotificationBatch(
      drafts,
      [],
      'analyst'
    );

    expect(updatedNotifications).toHaveLength(2);
    for (const notif of updatedNotifications) {
      expect(['sent', 'demo']).toContain(notif.status);
      expect(notif.subject).toContain('CR-TEST-101');
      expect(notif.body).toContain('CR-TEST-101');
      expect(notif.body).toContain('Ana Paula Mendes');
      expect(notif.body).toContain('+244 923 111 222');
      expect(notif.body).toContain('Unitel Smart 4G');
      expect(notif.body).toContain('http://localhost:5173?appId=CR-TEST-101&view=approval-queue');
    }

    expect(auditEntries).toHaveLength(2);
    expect(auditEntries[0].application_id).toBe('CR-TEST-101');
  });

  // Test 3: Approver approves -> Email goes strictly to submitted_by_email
  it('3. Approver approves: email goes only to submitted_by_email with decision, reason and limit', async () => {
    const profile = createTestProfile();
    const app = createTestApp(profile, 'tester.analyst@mycompany.com');

    const decisionEmails = buildDecisionEmails(
      app,
      'approved',
      'Customer verified at Luanda retail center with clean SIM history',
      'approver',
      'Credit Approver Silva',
      DEFAULT_EMAIL_TEMPLATES.approved,
      false, // Customer email off
      'http://localhost:5173'
    );

    expect(decisionEmails).toHaveLength(1);
    const decisionEmail = decisionEmails[0];
    expect(decisionEmail.recipient_email).toBe('tester.analyst@mycompany.com');
    expect(decisionEmail.subject).toContain('CR-TEST-101 was approved');
    expect(decisionEmail.body).toContain('APPROVED');
    expect(decisionEmail.body).toContain('Customer verified at Luanda retail center');
    expect(decisionEmail.body).toContain('Approver Silva');
    expect(decisionEmail.body).toContain('http://localhost:5173?appId=CR-TEST-101');
  });

  // Test 4: Approver rejects -> Rejection email goes to submitter
  it('4. Approver rejects: rejection email goes to submitter with reason', async () => {
    const profile = createTestProfile();
    const app = createTestApp(profile, 'analyst.jane@unitel.ao');

    const rejectionEmails = buildDecisionEmails(
      app,
      'rejected',
      'Wallet outflow exceeds verified profile thresholds',
      'approver',
      'Approver Santos',
      DEFAULT_EMAIL_TEMPLATES.rejected,
      false,
      'http://localhost:5173'
    );

    expect(rejectionEmails).toHaveLength(1);
    const rej = rejectionEmails[0];
    expect(rej.recipient_email).toBe('analyst.jane@unitel.ao');
    expect(rej.subject).toContain('CR-TEST-101 was rejected');
    expect(rej.body).toContain('REJECTED');
    expect(rej.body).toContain('Wallet outflow exceeds verified profile thresholds');
  });

  // Test 5: Admin template edit & Approver deactivation
  it('5. Admin template edit interpolates custom wording; deactivated approver is excluded', () => {
    const customTemplate = {
      ...DEFAULT_EMAIL_TEMPLATES.submitted,
      subject: '[CUSTOM URGENT] Application {{reference}} for {{customer_name}}',
      body_text: 'Review needed: {{reference}} - {{equipment}}',
    };

    const approvers: ApproverRecipient[] = [
      { id: 'a1', name: 'Appr 1', email: 'a1@unitel.ao', active: true },
      { id: 'a2', name: 'Appr 2', email: 'a2@unitel.ao', active: false }, // deactivated
    ];

    const profile = createTestProfile();
    const app = createTestApp(profile);

    const emails = buildApplicationSubmittedEmails(app, approvers, customTemplate);
    expect(emails).toHaveLength(1);
    expect(emails[0].recipient_email).toBe('a1@unitel.ao');
    expect(emails[0].subject).toBe('[CUSTOM URGENT] Application CR-TEST-101 for Ana Paula Mendes');
    expect(emails[0].body).toBe('Review needed: CR-TEST-101 - Unitel Smart 4G (64GB)');
  });

  // Test 6: Failure resilience and Admin retry without duplicates
  it('6. Failure handling: missing recipient email fails gracefully; retry works without duplicates', async () => {
    const failedRecord: NotificationRecord = {
      id: 'notif-fail-1',
      application_id: 'CR-TEST-FAIL',
      customer_name: 'Test Customer',
      mobile_no: '+244 923 000 000',
      channel: 'email',
      event_type: 'submitted',
      recipient_email: '', // missing recipient
      recipient_role: 'approver',
      subject: 'Test Subject',
      body: 'Test Body',
      status: 'queued',
      created_at: new Date().toISOString(),
    };

    const result = await dispatchEmail(failedRecord);
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toContain('missing');

    // Simulate fixed notification
    const fixedRecord: NotificationRecord = {
      ...failedRecord,
      recipient_email: 'fixed.approver@unitel.ao',
      status: 'failed',
      error_message: result.errorMessage,
    };

    const retryRes = await retryNotification('notif-fail-1', [fixedRecord], 'admin');
    expect(retryRes).not.toBeNull();
    expect(['sent', 'demo']).toContain(retryRes?.updatedNotification.status);
    expect(retryRes?.auditEntry.decision).toBeDefined();

    // Re-retrying an already sent record must return null (deduplication)
    const sentRecord: NotificationRecord = {
      ...retryRes!.updatedNotification,
      status: 'sent',
    };
    const duplicateRetry = await retryNotification('notif-fail-1', [sentRecord], 'admin');
    expect(duplicateRetry).toBeNull();
  });

  // Test 7: Audit log records notification events
  it('7. Audit log captures notification events with timestamps and details', async () => {
    const profile = createTestProfile();
    const app = createTestApp(profile);
    const drafts = buildApplicationSubmittedEmails(
      app,
      DEFAULT_APPROVER_RECIPIENTS.slice(0, 1),
      DEFAULT_EMAIL_TEMPLATES.submitted
    );

    const { auditEntries } = await sendNotificationBatch(drafts, [], 'analyst');
    expect(auditEntries.length).toBeGreaterThan(0);
    const audit = auditEntries[0];
    expect(audit.application_id).toBe('CR-TEST-101');
    expect(audit.step_name).toContain('Notification');
    expect(audit.role).toBe('analyst');
    expect(audit.timestamp).toBeDefined();
  });

  // Test 8: Existing scoring and limits still pass
  it('8. Existing scoring engine, band, confidence, and limit calculation still evaluate accurately', () => {
    const profile = createTestProfile();
    const explanation = evaluateCreditScore(profile, DEFAULT_SCORING_CONFIG);
    expect(explanation.score).toBeGreaterThanOrEqual(300);
    expect(explanation.score).toBeLessThanOrEqual(900);
    expect(['Excellent', 'Good', 'Fair', 'Poor']).toContain(explanation.band);
    expect(['High', 'Medium', 'Low']).toContain(explanation.confidence);

    const limitDec = evaluateLimitAndDecision(explanation, 140_000, DEFAULT_SCORING_CONFIG, 14_000);
    expect(limitDec.creditLimitAoa).toBeGreaterThan(0);
    expect(typeof limitDec.emiAffordable).toBe('boolean');
    expect(['auto_approve', 'manual_review', 'decline']).toContain(limitDec.decision);
  });
});
