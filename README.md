# Credit Intelligence — Unitel Angola Credit Scoring POC

Interactive front-end Proof of Concept for an equipment EMI **proxy credit rating, credit limit, and approval portal** tailored for Angola's prepaid telecom & mobile money landscape.

> **Disclaimer:** All subscriber data, proxy credit scores, credit limits, equipment prices, EMI rates, SMS messages, and emails in this portal are **simulated for demonstration purposes only**. It is **not** a regulated credit bureau score and has no integration with live Unitel, BNA, or AGT systems.

---

## Key Concepts Implemented

- **Role-Driven Workspace (`Analyst` | `Approver` | `Admin`)**:
  - **Choose your role** first screen with `localStorage` persistence and instant top-bar switcher.
  - Role-tailored sidebars, dashboards, landing pages (`Approver` lands on `Approval Queue`), and access guardrails.
- **6-Step Equipment EMI Application Flow**:
  1. **Customer Details**: Manual entry for brand-new subscribers (`+244 9XX XXX XXX` & 14-char BI validation) or `"Find existing customer"` pre-fill.
  2. **Transaction Volume**: `Low volume` (Basic: 25,000 AOA daily / 70,000 AOA max balance) vs `High volume` (Enhanced KYC: 300,000 AOA daily / 18,000,000 AOA max balance) with live limit validation and unbanked subscriber helper text.
  3. **Equipment & Price**: Catalog filtered by volume tier and Admin-set price ceilings (with custom item support).
  4. **EMI Plan**: Term, APR, down payment, monthly EMI, and total payable filtered by volume tier.
  5. **Database & Sources**: Automatic lookup by mobile number across 300 subscribers (with manual entry fallback for brand-new customers, neutral `has_bank_account` toggle, and `"Fill sample data"` quick loader).
  6. **Review & Submit**: Data completeness check, proxy score & EMI affordability summary, and submission to the Approver queue with full Audit Log capture.
- **Proxy Credit Score (Demo) — 300 to 900**:
  - **Telecom behavior (45%)**, **Identity & KYC (25%)**, **Mobile money (20%)**, **Tax standing (10%)**.
  - Thin-file re-normalization for Basic/low-activity or missing wallets (no penalty), neutral `has_bank_account` and tax `none` rules, hard caps (`<= 600` unverified BI, `<= 550` unpaid airtime loan), and `-5` pt suspended NIF deduction.

---

## Quick Start

```bash
npm install
npm test
npm run build
npm run dev
```

Open `http://localhost:5173`. When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are omitted, the portal automatically runs against the 300-subscriber local mock dataset persisted in `localStorage`.

---

## Optional: Connecting Supabase Postgres & Real Email Dispatch

1. Copy `.env.example` to `.env` and configure:
   - Supabase keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
   - Email provider credentials (`EMAIL_PROVIDER=resend`, `EMAIL_API_KEY=re_...`, `EMAIL_FROM="Unitel Credit <credit@unitel.ao>"`, `APP_BASE_URL=http://localhost:5173`)
2. Run SQL migrations in order:
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_workflow_emi_audit.sql`
   - `supabase/migrations/003_email_notifications.sql`
3. Deploy the Edge Function (or test locally with Supabase CLI):
   ```bash
   supabase functions deploy send-notification
   ```
4. When credentials are not configured, the app runs in **Demo Mode**:
   - Outgoing notifications are logged as `Not sent (demo mode)`.
   - The Admin dashboard displays an informational "Email is in demo mode" banner.
   - All application submissions, approver reviews, decisions, and audit trails continue functioning seamlessly.

---

## Acceptance Test Verification

1. **New Application Email Validation**:
   - As **Analyst**, open **New Application**. Step 1 requires `Your email (for notifications)` and validates valid email format.
   - Enter your email address (e.g. `analyst@test.com`), complete steps 1–6, and submit.
2. **Email 1 (Submitted) Delivery**:
   - A notification record is created for each active approver in the list with status `sent` (or `demo` if credentials are missing).
   - Contains application reference, customer details, volume tier, equipment price, EMI plan, proxy score, and direct queue link.
3. **Approver Decision Dialog & Email 2 (Approved)**:
   - Switch role to **Approver**: the new application appears in the Approval Queue.
   - Click **✓ Approve**: a confirmation dialog confirms that *"An email will be sent to analyst@test.com"*.
   - Confirm with a reason: an email goes strictly to the analyst submitter containing the decision, approver reason, and approved credit limit.
4. **Rejection Outcome**:
   - Submit another application and reject it with a reason: the rejection email is dispatched to the submitting analyst.
5. **Admin Notification Settings**:
   - Switch to **Admin > Notification Templates**:
   - Edit template text, view the live preview with sample customer data, and send a test email to your own address.
   - Deactivate an approver and confirm subsequent submissions route only to active approver addresses.
   - Toggle *"Also email the customer"* to test optional customer copying.
6. **Resilience & Retry**:
   - If email transport fails, application actions still succeed, saving notifications with status `failed` and the recorded error.
   - Admin can click **Retry** in the Notifications Log to retry failed items without duplicate sends.
7. **Audit Log Verification**:
   - Every notification event (creation, send, failure, retry) is recorded with timestamps, roles, and inputs in the **Audit Log**.

