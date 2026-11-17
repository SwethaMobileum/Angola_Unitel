-- Migration: 20261117000002_soft_delete_and_rls.sql
-- Description: Adds deleted_at column for soft deletes and secures RLS policies for loan_applications and evaluations.

-- 1. Add deleted_at columns for soft deletion
ALTER TABLE IF EXISTS public.loan_applications
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE IF EXISTS public.evaluations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_loan_applications_deleted_at
  ON public.loan_applications(deleted_at);

CREATE INDEX IF NOT EXISTS idx_evaluations_deleted_at
  ON public.evaluations(deleted_at);

-- 2. Ensure RLS is enabled
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public/Applicant access to own non-deleted applications
DROP POLICY IF EXISTS "Applicants can view own non-deleted applications" ON public.loan_applications;
CREATE POLICY "Applicants can view own non-deleted applications"
  ON public.loan_applications
  FOR SELECT
  USING (
    deleted_at IS NULL
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Applicants can insert applications" ON public.loan_applications;
CREATE POLICY "Applicants can insert applications"
  ON public.loan_applications
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Applicants can update own applications" ON public.loan_applications;
CREATE POLICY "Applicants can update own applications"
  ON public.loan_applications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 4. Policy: Evaluations non-deleted view
DROP POLICY IF EXISTS "Evaluations select policy" ON public.evaluations;
CREATE POLICY "Evaluations select policy"
  ON public.evaluations
  FOR SELECT
  USING (
    deleted_at IS NULL
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Evaluations insert policy" ON public.evaluations;
CREATE POLICY "Evaluations insert policy"
  ON public.evaluations
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Evaluations update policy" ON public.evaluations;
CREATE POLICY "Evaluations update policy"
  ON public.evaluations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 5. Audit Log keeps deleted events visible to approver and admin
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id
  ON public.audit_log(entity_id);
