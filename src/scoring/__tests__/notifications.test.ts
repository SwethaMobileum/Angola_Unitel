import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EMAIL_TEMPLATES,
  buildApplicationSubmittedEmails,
  buildDecisionEmails,
  interpolate,
} from '../index';
import type { ApplicationRecord, ApproverRecipient } from '../types';

const mockApp: ApplicationRecord = {
  id: 'CR-TEST-99',
  customer_id: 'cust-1',
  customer_name: 'Tomas Silva',
  mobile_no: '+244 923 100 001',
  volume_tier: 'low',
  product: 'Unitel Smart 4G',
  product_price_aoa: 140_000,
  emi_term_months: 12,
  emi_rate_pct: 12,
  down_payment_aoa: 14_000,
  monthly_emi_aoa: 14_000,
  total_payable_aoa: 168_000,
  emi_affordable: true,
  max_monthly_emi_aoa: 30_000,
  status: 'pending_review',
  score: 680,
  band: 'Good',
  confidence: 'High',
  credit_limit_aoa: 300_000,
  decision: 'auto_approve',
  decision_reason: 'Stable telecom history with consistent topups',
  submitted_by_name: 'Analyst Maria',
  submitted_by_email: 'maria.analyst@unitel-demo.ao',
  customer_email: 'customer.tomas@example.ao',
  created_at: '2026-11-13T10:00:00.000Z',
};

describe('Email Notification Layer', () => {
  it('interpolates template placeholders accurately', () => {
    const template = 'Hello {{customer_name}}, your loan {{reference}} is for {{product}}.';
    const vars = {
      customer_name: 'Tomas',
      reference: 'CR-TEST-99',
      product: 'Phone',
    };
    expect(interpolate(template, vars)).toBe('Hello Tomas, your loan CR-TEST-99 is for Phone.');
  });

  it('builds Email 1 (application submitted) to all active approvers with required details', () => {
    const approvers: ApproverRecipient[] = [
      { id: 'appr-1', name: 'Approver 1', email: 'approver1@unitel-demo.ao', active: true },
      { id: 'appr-2', name: 'Approver 2', email: 'approver2@unitel-demo.ao', active: true },
      { id: 'appr-3', name: 'Approver Inactive', email: 'inactive@unitel-demo.ao', active: false },
    ];

    const emails = buildApplicationSubmittedEmails(
      mockApp,
      approvers,
      DEFAULT_EMAIL_TEMPLATES.submitted,
      'http://localhost:5173'
    );

    // Only active approvers receive email
    expect(emails).toHaveLength(2);
    expect(emails.map((e) => e.recipient_email)).toEqual([
      'approver1@unitel-demo.ao',
      'approver2@unitel-demo.ao',
    ]);

    const first = emails[0];
    expect(first.subject).toContain('CR-TEST-99');
    expect(first.body).toContain('CR-TEST-99');
    expect(first.body).toContain('Tomas Silva');
    expect(first.body).toContain('+244 923 100 001');
    expect(first.body).toContain('Low Volume');
    expect(first.body).toContain('Unitel Smart 4G');
    expect(first.body).toContain('680');
    expect(first.body).toContain('Good');
    expect(first.body).toContain('High');
    expect(first.body).toContain('http://localhost:5173?appId=CR-TEST-99');
  });

  it('records failed notification with clear message when no active approvers exist', () => {
    const inactiveOnly: ApproverRecipient[] = [
      { id: 'appr-1', name: 'Approver 1', email: 'approver1@unitel-demo.ao', active: false },
    ];

    const emails = buildApplicationSubmittedEmails(
      mockApp,
      inactiveOnly,
      DEFAULT_EMAIL_TEMPLATES.submitted
    );

    expect(emails).toHaveLength(1);
    expect(emails[0].status).toBe('failed');
    expect(emails[0].error_message).toContain('No active approvers');
  });

  it('builds Email 2 for Approved to Analyst submitter with decision, reason and credit limit', () => {
    const emails = buildDecisionEmails(
      mockApp,
      'approved',
      'Verified telecom tenure and income stability',
      'approver',
      'Approver Silva',
      DEFAULT_EMAIL_TEMPLATES.approved,
      false, // notifyCustomer off
      'http://localhost:5173'
    );

    // Only sent to submitted_by_email
    expect(emails).toHaveLength(1);
    const email = emails[0];
    expect(email.recipient_email).toBe('maria.analyst@unitel-demo.ao');
    expect(email.subject).toContain('CR-TEST-99 was approved');
    expect(email.body).toContain('Tomas Silva');
    expect(email.body).toContain('APPROVED');
    expect(email.body).toContain('Verified telecom tenure');
    expect(email.body).toContain('300,000 AOA'); // credit limit
    expect(email.body).toContain('Approver Silva');
    expect(email.body).toContain('http://localhost:5173?appId=CR-TEST-99');
  });

  it('builds Email 2 for Rejected with approver reason', () => {
    const emails = buildDecisionEmails(
      mockApp,
      'rejected',
      'Excessive airtime loan defaults',
      'approver',
      'Approver Silva',
      DEFAULT_EMAIL_TEMPLATES.rejected,
      false
    );

    expect(emails).toHaveLength(1);
    const email = emails[0];
    expect(email.recipient_email).toBe('maria.analyst@unitel-demo.ao');
    expect(email.subject).toContain('CR-TEST-99 was rejected');
    expect(email.body).toContain('REJECTED');
    expect(email.body).toContain('Excessive airtime loan defaults');
  });

  it('copies customer on decision email only when notifyCustomer toggle is active', () => {
    const withCustomer = buildDecisionEmails(
      mockApp,
      'approved',
      'Good to go',
      'approver',
      'Approver Silva',
      DEFAULT_EMAIL_TEMPLATES.approved,
      true // notifyCustomer active
    );

    expect(withCustomer).toHaveLength(2);
    expect(withCustomer.map((e) => e.recipient_email)).toEqual([
      'maria.analyst@unitel-demo.ao',
      'customer.tomas@example.ao',
    ]);

    const withoutCustomer = buildDecisionEmails(
      mockApp,
      'approved',
      'Good to go',
      'approver',
      'Approver Silva',
      DEFAULT_EMAIL_TEMPLATES.approved,
      false // notifyCustomer inactive
    );
    expect(withoutCustomer).toHaveLength(1);
    expect(withoutCustomer[0].recipient_email).toBe('maria.analyst@unitel-demo.ao');
  });
});
