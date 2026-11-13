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

`npm run dev` concurrently starts:
- **Express + Nodemailer Backend** on `http://localhost:3001`
- **Vite Client** on `http://localhost:5173` (automatically proxying `/api` requests to port 3001)

Open `http://localhost:5173`. When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are omitted, the portal automatically runs against the 300-subscriber local mock dataset persisted in `localStorage`.

---

## Configuring Real Email Sending (SMTP)

Real emails are dispatched via the built-in Node.js / Express backend server using Nodemailer.

1. Open `.env` in the project root (created from `.env.example`).
2. Fill in your SMTP credentials:
   ```ini
   PORT=3001
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-google-app-password
   EMAIL_FROM="Unitel Credit Intelligence <your-email@gmail.com>"
   APP_BASE_URL=http://localhost:5173
   ```
   > **Tip for Gmail:** Use a 16-character [Google App Password](https://myaccount.google.com/apppasswords) (generate under Google Account > Security > 2-Step Verification > App Passwords).

3. Start or restart `npm run dev`. The terminal will verify SMTP credentials on startup:
   ```
   [SMTP CONNECTED] Verified connection to smtp.gmail.com:587
   [EMAIL SERVER] Express + Nodemailer server running on http://localhost:3001
   ```
4. Test delivery immediately from **Admin > Approver Email > Send Test Email**.

---

## The Clean & Simple Flow

1. **Admin > Approver Email**:
   - Add/manage approver email addresses (Name, Email, Save).
   - Shows active approver recipients, live SMTP server connection status, and a "Send test email" button.

2. **Analyst > New Application**:
   - Fill the 6-step form.
   - Requires **"Your email (for notifications)"** (and "Your name"). Validated and auto-saved.
   - On **Submit**: Approver(s) set in Admin immediately receive a real email:
     `"New credit application CR-XXXX awaiting your approval"` with equipment, price, EMI plan, score, and link.
   - Analyst sees a clean confirmation screen:
     `Waiting for approval — An email was sent to {approver email}` with options to *"View My Applications"* or *"Create another"*.

3. **Approver > Approval Queue**:
   - Approver clicks **Approve** or **Reject** (mandatory reason required).
   - Applicant (`submitted_by_email`) immediately receives a real email:
     `"Your credit application CR-XXXX was approved"` (with credit limit, reason, and link) or `"was rejected"`.
   - Approver sees a clean confirmation screen:
     `Decision saved. An email was sent to {applicant email}` with a button to return to the queue.

4. **Notifications Log**:
   - Simple, clean table showing Date & Time, Recipient, Subject, and Status (`SENT` / `FAILED`).
   - If SMTP is not yet configured or credentials fail, the real error message is shown clearly on screen and in logs without interrupting or rolling back the loan application.

---

## Tidy Role Navigation

- **Analyst**: Dashboard, New Application, My Applications.
- **Approver**: Approval Queue, All Applications.
- **Admin**: Dashboard, All Applications, Approver Email, Scoring Rules.
   - Admin can click **Retry** in the Notifications Log to retry failed items without duplicate sends.
7. **Audit Log Verification**:
   - Every notification event (creation, send, failure, retry) is recorded with timestamps, roles, and inputs in the **Audit Log**.

