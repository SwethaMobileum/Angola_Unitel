-- Migration: 003_email_notifications.sql
-- Add email notification fields, approver notification list, templates, and customer email toggle

-- 1. Extend applications table
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS submitted_by_name TEXT,
  ADD COLUMN IF NOT EXISTS submitted_by_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- 2. Create approver_recipients table
CREATE TABLE IF NOT EXISTS approver_recipients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default approvers
INSERT INTO approver_recipients (id, name, email, active)
VALUES
  ('appr-1', 'Unitel Risk Desk (Approver 1)', 'approver1@unitel-demo.ao', true),
  ('appr-2', 'Credit Ops Lead (Approver 2)', 'approver2@unitel-demo.ao', true),
  ('appr-3', 'Senior Approver (Backup)', 'senior.approver@unitel-demo.ao', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  event_type TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Extend notifications table with email delivery tracking
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS recipient_role TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Ensure status supports queued, sent, failed, demo
-- (status column is TEXT in previous schema)

-- 5. Create general settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (key, value)
VALUES ('notifications', '{"notify_customer": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

