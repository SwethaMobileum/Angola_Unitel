# Unitel Credit Intelligence — Angola Telecom Credit Scoring Web App (POC)

A production-grade internal web application for telecom proxy credit scoring and device financing designed for **Unitel** in Angola.

> **Core Scoring Principle**: Customers hold and move money in diverse ways (physical cash, scratch cards, USSD codes, mobile wallet apps, formal commercial banks, and local agents). Each customer segment gets its own tailored parameter mix. **A missing parameter, unbanked status, or lack of mobile wallet footprint is NEVER counted as a penalty.**

---

## 1. Key Features

- **10 Behavioral Customer Segments (S1–S10)**: Tailored weighting across 6 blocks (`P`, `T`, `W`, `B`, `X`, `A`). Every segment's base blocks strictly satisfy the **$P+T+W+B+X = 94$ base points invariant**.
- **Optional Mobile Money Module**: Block W (Wallet) can be toggled off globally (Admin feature flag) or per evaluation without breaking scoring. Points dynamically redistribute to active operational channels.
- **Priority Decision Tree**: 9-question priority chain (*"first YES wins"*, defaulting to S1 if all are NO).
- **Additive Asset Bonus**: Physical asset ownership (House $+2$, Land Title $+1$, Motorbike $+1$, Car $+2$, up to $+6$ bonus points). "No" and "Skip" add 0 points and never reduce the score.
- **3-Cap Credit Limit Derivation**: The final approved financing limit is governed by the lowest of Score-Band Baseline, Income Band Ceiling, and Starter Tenure Caps.
- **Equipment Financing & Affordability Validator**: Device catalog filtered by credit limit; 3–12 month EMI plans with strict enforcement of the **30% monthly income affordability cap** (green compliant / red over-cap badge).
- **Two-Step Approval Queue**: Dedicated Approver workflow with proxy score inspection, policy overlay alerts, and mandatory decision justification notes.
- **Immutable Audit Trail**: Append-only compliance ledger powered by PostgreSQL triggers capturing all state transitions, input snapshots, score versions, and approver reasons.

---

## 2. Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 18, TypeScript (Strict Mode), Vite 5 |
| **Styling & Tokens** | Tailwind CSS (Navy `#1F3A5F`, Orange `#E8772E`, Surface `#FFFFFF`, Border `#D5DDE6`) |
| **State & Routing** | React Router v6, TanStack Query v5 |
| **Forms & Validation** | React Hook Form, Zod |
| **Visualizations** | Recharts (Score Bar Chart, Segment Portfolio Donut), Custom SVG Score Gauge |
| **Backend & Storage** | Supabase (PostgreSQL 15, Row Level Security, Custom Enums, Audit Triggers) |
| **Testing** | Vitest (100% test pass on scoring engine and redistribution invariants) |
| **Copy & i18n** | Centralized English dictionary in `src/copy/en.ts` for Portuguese localization |

---

## 3. Quick Start & Setup

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn

### 1. Installation
```bash
# Clone the repository and navigate into the workspace
git clone <repo-url>
cd Angola_Unitel

# Install dependencies
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Provide your Supabase URL and Anon Key (optional for local mock mode; the app runs seamlessly offline with pre-seeded data):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
RESEND_API_KEY=your-optional-resend-api-key
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Run Unit Tests (Vitest)
```bash
npm test
```
Executes all 7 mandatory tests covering the 94-point invariant, S1 benchmark, S3 wallet ON/OFF redistribution, non-punitive missing blocks, asset bonus invariance, overlay rules, and 30% EMI affordability.

### 5. Production Build
```bash
npm run build
```

---

## 4. Supabase Database Setup & Migrations

If deploying to a live Supabase project:
1. Navigate to the SQL Editor in your Supabase dashboard.
2. Execute the schema migration in [supabase/migrations/20261116000001_initial_schema.sql](supabase/migrations/20261116000001_initial_schema.sql):
   - Custom enums: `app_role`, `param_role`, `input_type`.
   - 24 relational tables with full foreign keys and check constraints.
   - Row Level Security (RLS) policies for Analyst, Approver, and Admin roles.
   - Audit triggers: `fn_audit_evaluation()`, `fn_audit_loan_application()`, `fn_audit_approval()`.
3. Execute the seed script in [supabase/seed.sql](supabase/seed.sql) to populate blocks, segments, weights, parameters, bands, equipment, and benchmark customer personas.

---

## 5. Demo User Roles & Credentials

The application includes an instant **Role Switcher** in the top navigation bar to test all personas:

| Role | Demo User | Permissions & Responsibilities |
|---|---|---|
| **Analyst** | `Tomas Silva` (`tomas.silva@unitel.ao`) | Creates subscriber evaluations, runs segment decision tree, inputs proxy parameters, originates equipment loan applications, and receives status notification alerts. |
| **Approver** | `Dra. Maria Mendes` (`maria.mendes@unitel.ao`) | Reviews submitted applications in the Approval Queue, inspects score breakdowns and debt service ratios, and approves or rejects with mandatory justification notes. |
| **Admin** | `Eng. Carlos Neto` (`carlos.neto@unitel.ao`) | Full administrative access: adjusts segment weights with real-time 94-point invariant validation, publishes config versions, toggles feature flags (`wallet_enabled`), and manages the equipment catalog. |

---

## 6. Step-by-Step Demo Script (The 3 Benchmark Personas)

Use this script to demonstrate the system during internal and customer presentations:

### Persona 1: João Manuel Baptista (Segment S1 — Button phone, cash-only)
- **Profile**: Rural/peri-urban subscriber with a basic 2G/3G feature phone. Transacts purely in physical cash and buys scratch card airtime from street vendors. Unbanked with no mobile wallet.
- **Evaluation Flow**:
  1. Open **New Evaluation** &rarr; Click the **João (S1)** preset button.
  2. **Step 1 (Customer)**: Age 41 (legal), ID matches SIM, SIM tenure is 30 months ($> 12\text{m}$).
  3. **Step 2 (Find Segment)**: Answers NO to all 9 questions &rarr; Defaults to **S1 (Button phone, cash-only)**. Primary block is Telecom (80 pts).
  4. **Step 3 (Parameters)**: Topups in 11 of 12 months, stable ARPU, 100% airtime loan repayment history. Unbanked and wallet fields are not applicable and skipped without penalty.
  5. **Step 4 (Assets)**: Owns residential house (+2 pts bonus).
  6. **Step 5 (Income)**: Band 2 (Low / Min Wage: 50,000–100,000 Kz).
  7. **Step 6 (Results)**: Proxy Score $\approx 620$ (*Acceptable*). Credit limit capped at **50,000 Kz** (Starter limit policy).
- **Financing & Approval**:
  - Originate financing for **Unitel Feature Phone 2G/3G (18,000 Kz)** over 6 months &rarr; Monthly EMI: **3,000 Kz/mo** ($3\%$ of monthly income $\ll 30\%$ cap).
  - Switch role to **Approver** &rarr; Open **Approvals** &rarr; Click **Approve Application** with reason: *"Long 30-month subscriber loyalty, consistent top-ups, and highly affordable 3,000 Kz EMI."*

---

### Persona 2: Esperança Teresa Domingos (Segment S3 — Smartphone, unbanked, wallet app)
- **Profile**: Urban youth in Luanda with an Android smartphone. Unbanked, but transacts actively on Unitel Money via QR codes, peer-to-peer sends, and mobile data bundles.
- **Evaluation Flow**:
  1. Open **New Evaluation** &rarr; Click the **Esperança (S3)** preset button.
  2. **Step 1 (Customer)**: Age 28, ID matches SIM, 20 months SIM tenure.
  3. **Step 2 (Find Segment)**: Answers NO to Q1–Q5, YES to Q6 (*"Uses a wallet app on a smartphone?"*) &rarr; Resolves immediately to **S3 (Smartphone, unbanked, wallet app)**.
  4. **Step 3 (Parameters)**: Regular wallet inflows, 22 active days/mo, 8 P2P transfers/mo, 80,000 Kz merchant QR receipts, 4 data bundles/mo.
  5. **Step 4 (Assets)**: Owns motorbike (+1 pt bonus).
  6. **Step 5 (Income)**: Band 3 (Lower-middle: 100,000–250,000 Kz).
  7. **Step 6 (Results)**: Proxy Score $\approx 685$ (*Acceptable*). Credit limit: **150,000 Kz** (Standard limit).
- **Wallet OFF Demonstration (Key POC Requirement)**:
  - Toggle **Wallet Data? &rarr; Unavailable**.
  - Block W (42 pts) is deactivated. Its 42 points dynamically move to Telecom (T: 40 &rarr; 82 pts).
  - Total base points remain invariant at $82 + 12 = 94$ pts. Total score remains within bounds ($\le 100$), confidence adjusts to Medium, and the customer is evaluated fairly using their telecom data.

---

### Persona 3: Dr. Paulo Henrique Afonso (Segment S7 — Salaried formal worker)
- **Profile**: Luanda physician in civil service. Verifiable monthly payroll direct deposit in Banco BAI, 5-year SIM tenure, active on Multicaixa Express.
- **Evaluation Flow**:
  1. Open **New Evaluation** &rarr; Click the **Dr. Paulo (S7)** preset button.
  2. **Step 1 (Customer)**: Age 47, 60 months tenure.
  3. **Step 2 (Find Segment)**: Answers NO to Q1, YES to Q2 (*"Is a salary paid in regularly?"*) &rarr; Resolves immediately to **S7 (Salaried formal worker)**. Primary block is Bank (48 pts).
  4. **Step 3 (Parameters)**: 12 months regular payroll credits, salary $> 500\text{k Kz}$, spotless bank credit history, clear CIRC bureau standing, active AGT tax NIF and INSS social security.
  5. **Step 4 (Assets)**: Owns house (+2), land title (+1), car (+2) &rarr; $+5$ bonus points.
  6. **Step 5 (Income)**: Band 5 (Upper: 500,000–1,000,000 Kz), stated income 750,000 Kz.
  7. **Step 6 (Results)**: Proxy Score $\approx 790$ (*Good/Very Good*). Highest credit limit: **1,000,000 Kz**.
- **Financing & Approval**:
  - Financed for **Lenovo Tab M10 Tablet (210,000 Kz)** over 12 months &rarr; Monthly EMI: **17,500 Kz/mo** ($2.3\%$ debt burden, well within 30% cap). Express approver approval.

---

## 7. Scoring Formulas & Engine Architecture

```
1. Parameter Strength:
   strength = lookupBand(param, inputVal) ∈ [0.0, 1.0]

2. Block Strength:
   strength_b = Σ(strength_i * weight_i) / Σ(weight_i)

3. Dynamic Point Redistribution:
   If block b has no data:
     effectivePoints_target += basePoints_b
     effectivePoints_b = 0
   Invariant: Σ effectivePoints = 94

4. Physical Asset Bonus:
   bonus = min(6, house(+2) + land_title(+1) + two_wheeler(+1) + car(+2))

5. Final Credit Score:
   totalPoints = min(100, Σ(effectivePoints_b * strength_b) + bonus)
   Score = round(300 + (totalPoints / 100) * 600) ∈ [300, 900]

6. Affordability Cap:
   monthlyEmi = price / termMonths
   isOverCap = (monthlyEmi / monthlyIncome) > 30%
```

---

## 8. License & Confidentiality

Internal Proof of Concept developed for **Unitel Angola**. Contains proprietary scoring weights and risk modeling structures. All subscriber identities and phone records are synthetic sample data.
