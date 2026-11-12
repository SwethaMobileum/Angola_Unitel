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

## Optional: Connecting Supabase Postgres

1. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
2. Run both SQL migrations in order:
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_workflow_emi_audit.sql`
3. Seed all 300 subscribers, equipment catalog, EMI plans, templates, applications, and audit logs:

```bash
npm run seed
```
