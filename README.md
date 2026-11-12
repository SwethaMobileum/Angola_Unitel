# Credit Intelligence — Unitel Angola Credit Scoring POC

Interactive front-end Proof of Concept for an equipment financing **proxy credit rating, credit limit, and approval portal** tailored for Angola's prepaid telecom & mobile money landscape.

> **Disclaimer:** All subscriber data, proxy credit scores, credit limits, SMS messages, and emails in this portal are **simulated for demonstration purposes only**. It is **not** a regulated credit bureau score and has no integration with live Unitel, BNA, or AGT systems.

---

## Key Concepts Implemented

- **Proxy Credit Score (Demo) — 300 to 900**:
  - **Telecom behavior (45%)**: SIM tenure, 12-month top-up regularity, spend stability, airtime loan repayment, usage consistency.
  - **Identity & KYC (25%)**: BI verification, SIM-to-BI match, address verification, Unitel Money KYC tier.
  - **Mobile money — Unitel Money (20%)**: inflow stability, average balance, 90-day transaction activity, failed transaction rate, wallet presence.
  - **Tax standing — AGT / NIF (10%)**: NIF status and filing regularity (`none` receives neutral half-credit, never penalized).
- **Thin-File Handling & Data Confidence**:
  - A **Basic registration** wallet (daily limit up to 25,000 AOA, max balance 70,000 AOA) with near-zero activity is treated as a **thin file**: its points are removed from the denominator and remaining sources are re-normalized.
  - **Fully verified (KYC)** wallets reflect daily limits up to 300,000 AOA and balance up to 18,000,000 AOA.
  - Every score displays **Data Confidence** (`High`: 3–4 meaningful sources, `Medium`: 2 sources, `Low`: 1 source).
- **Hard Caps & Deductions**:
  - Unverified BI caps the final score at **600**.
  - Any unpaid airtime loan caps the final score at **550** (**Poor**).
  - Suspended NIF applies a **5-point** normalized deduction.

---

## Project Structure

- `src/scoring/` — Pure TypeScript scoring, limit/decision, and notification template modules (zero UI or DB dependencies).
- `src/scoring/__tests__/engine.test.ts` — Vitest unit test suite covering personas, thin-file re-normalization, hard caps, and weight updates.
- `src/data/seedGenerator.ts` — Deterministic generator for 300 synthetic Angolan customers (including the 5 demo personas).
- `src/lib/supabaseClient.ts` & `src/lib/dataService.ts` — Supabase persistence with automatic local mock fallback when credentials are omitted.
- `src/components/` — All portal screens (`Dashboard`, `NewApplication`, `Customer360`, `ScoreExplanationView`, `WhatIfPanel`, `ApprovalsQueue`, `NotificationsLog`, `AdminConfig`).
- `src/styles/theme.css` — Plain CSS with the orange palette variables (`--orange-50` through `--orange-900`).
- `supabase/migrations/001_init.sql` & `supabase/seed.ts` — Postgres schema and seeding script.

---

## Quick Start (Local Mock Mode — No Database Required)

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:5173`. When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are unset, the portal automatically loads the 300-customer synthetic dataset into browser memory/`localStorage`.

---

## Optional: Connecting Supabase Postgres

1. Copy `.env.example` to `.env` and fill in your Supabase URL, anon key, and service role key.
2. Run the SQL migration in your Supabase SQL Editor or CLI using `supabase/migrations/001_init.sql`.
3. Seed all 300 customers, initial config, applications, and notifications:

```bash
npm run seed
```

4. Start the app (`npm run dev`). The top banner will show `Storage: Supabase Postgres`.

---

## Demo Walkthrough Script (Acceptance Checklist)

1. **Dashboard → New Application for Thomas Mateus (Car)**:
   - Open **New Application**, choose **Thomas Mateus** and **Compact City Car (5,500,000 AOA)**.
   - Step through **Data Collection** → **Proxy Rating** → **Credit Limit** → **Decision** → **Notifications**.
   - Verify: Score in **Excellent** band (900), **High** confidence, limit **7,500,000 AOA** (above car price), outcome **Auto-approve**, approval SMS & email visible in **Notifications Log**.
2. **Maria Cândida (Thin-File Wallet)**:
   - Inspect **Maria Cândida** in **Customer 360°** (or New Application).
   - Verify: Basic wallet with minimal activity is tagged **Thin File (No Penalty)**, removed from the denominator (80-pt active base), **Medium** confidence, **Good** band.
3. **Live What-If Simulator on Thomas**:
   - In the **What-If Simulator** below Thomas's application, click **Mark 1 Loan Unpaid**.
   - Verify: Score immediately drops and caps at **550**, band becomes **Poor**, decision flips to **Decline**, and regenerated SMS/Email notifications appear.
4. **Admin Config Re-Weighting**:
   - Switch role to **Admin** in the top bar and open **Admin Config**.
   - Change **Telecom Behavior** weight from `45` to `35` and click **Save v2 & Recompute All Scores**.
   - Return to **Dashboard** and verify portfolio average score and distribution chart update immediately.
5. **Unit Tests**:
   - Run `npm test` to verify all scoring rules, thin-file re-normalization, and hard caps pass.

