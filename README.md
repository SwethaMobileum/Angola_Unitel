# Unitel Credit Intelligence — Angola Telecom Credit Scoring & Financing Platform

A production-grade web application for telecom proxy credit scoring and device financing designed for **Unitel** in Angola.

> **Core Scoring Principle**: In Angola, where over 50% of adults are financially excluded from traditional banking, customers transact through diverse channels (cash, scratch cards, USSD codes, mobile wallet apps, formal commercial banks, and local trade). Each customer segment is scored on its own tailored parameter mix. **A missing parameter, unbanked status, or lack of mobile wallet footprint is NEVER counted as a penalty.**

---

## 1. Key Architectural Pillars

- **Two Distinct Portals**:
  - **Applicant Portal (`/applicant/*`)**: Built for store agents and applicants. Features a sticky 6-step progress bar workflow, pre-filled registry data with source chips, equipment financing catalog, and instant store pickup order confirmation.
  - **Approver Portal (`/approver/*`)**: Built for credit officers and risk administrators. Includes portfolio analytics dashboard, 7-row paged applications queue, application review page with auto-written 4-line executive summaries, and real-time **Instant Credit Check**.
- **Points-Table Scoring Engine v2 (`src/lib/scoring.ts`)**:
  - 26 parameters across 6 blocks: **P** (Identity), **T** (Telecom), **W** (Wallet), **B** (Bank), **X** (Alternative), **A** (Assets bonus).
  - Every active segment strictly obeys the **$P+T+W+B+X = 94$ base points invariant** (with up to $+6$ asset bonus points, totaling 100 max points).
  - Formula: $\text{Score} = \text{round}(300 + \text{TotalPoints} \times 6) \in [300, 900]$.
  - Thin-file and unbanked applicants are not penalized: missing parameters are omitted from both earned points and possible points.
- **Simulated Real-Time Data Layer (`src/lib/dataSources.ts`)**:
  - Simulates 6 live registries queried by unique MSISDN: Unitel Telecom CDR, Unitel Money Core, Bank Gateway (EMIS), Vehicle Registry (DNVT), Land Title Registry, and Public Utilities (ENDE/EPAL).
  - Pre-fills identity, segment questions, and parameter values labeled with verified source chips (`From Unitel`, `From Bank`, etc.).
- **Live Transactional Email Gateway (`src/lib/supabaseSync.ts`)**:
  - Integrated with **Brevo REST API** (over HTTPS Port 443) delivering live branded decision and submission emails to any recipient worldwide.
  - Three branded templates: **1. Submitted (To Approver)**, **2. Approved (To Applicant with 'Proceed to buy' action)**, and **3. Rejected (To Applicant with next steps)**.
- **Admin Configuration Panel (`/approver/points-panel`)**:
  - Interactive points table editor with instant **Live Test Card** recalculation.
  - Segment weights editor with live $P+T+W+B+X = 94$ invariant validation (saving is blocked if any segment $\ne 94$).
  - Data sources registry monitor with "Connect new source" modal.
  - Global `wallet_enabled` feature switch with automatic points redistribution.

---

## 2. Corporate Brand & Color Tokens

| Token | Hex Value | Primary Purpose |
|---|---|---|
| `orange` | `#F26B1D` | Unitel brand accent, icons, progress indicator, highlights |
| `orange-btn` | `#D14F00` (hover `#B84400`) | Primary action buttons with white text (AA contrast compliant) |
| `yellow` | `#FFB703` | Highlights, gradient end, badge accents |
| `ink` | `#1F2430` | Collapsible sidebar, top headers, main text |
| `teal` | `#14808A` | Info indicators, secondary metrics, data source chips |
| `green` | `#22A06B` | Completed progress steps, approval notices, verified checks |
| `red` | `#C8372D` | Rejections, regulatory hard stops, validation errors |
| `cream` | `#FFF7EC` | Warm page background gradient |
| `peach` | `#FFE8D1` | Soft cards, selected rows, warm borders |
| `card` | `#FFFFFF` | Elevated cards with warm drop shadow |

---

## 3. Five Active Segments in Angola

1. **S1 (Button phone, cash-only)**: Largest national demographic (~35%). Scored 100% on telecom habits ($P=14, T=80$).
2. **S3 (Smartphone, unbanked, wallet app)**: Rapidly growing youth/urban base. Scored on telecom and wallet turnover ($P=12, T=40, W=42$).
3. **S5 (Banked, branch & ATM card)**: Formal banked segment (~36%). Scored on telecom, bank balance, and card velocity ($P=12, T=25, B=50, X=7$).
4. **S7 (Salaried formal worker)**: Predictable monthly payroll deposit. Highest credit limits up to 1,000,000 Kz ($P=10, T=20, W=10, B=48, X=6$).
5. **S8 (Self-employed informal trader)**: Market vendors and moto-taxi operators. Scored on daily merchant QR receipts and turnover velocity ($P=10, T=30, W=34, B=12, X=8$).

*(Segments S2, S4, S6, S9, S10 are preserved in database definitions with `is_active: false` for future phase activation).*

---

## 4. Quick Start & Setup

### Prerequisites
- Node.js 18.0 or higher
- npm

### 1. Installation & Local Server
```bash
# Clone the repository
git clone https://github.com/SwethaMobileum/Angola_Unitel.git
cd Angola_Unitel

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Application will be available at `http://localhost:5173`.

### 2. Run Test Suite
```bash
# Execute Vitest test suite (14/14 tests passing)
npx vitest run
```

### 3. Production Build
```bash
npm run build
```

---

## 5. End-to-End 3-Minute Demo Walkthrough Script

Use this script to present the application to executive stakeholders in 3 minutes:

```
[Step 1: Landing Page (0:00 - 0:15)]
1. Open http://localhost:5173.
2. Observe the clean dual-portal landing page with the two portals:
   - Applicant Portal (Store Agent / Customer flow)
   - Approver Portal (Risk Underwriter & Admin analytics)

[Step 2: Applicant Flow & Data Check (0:15 - 0:45)]
3. Click "Applicant Portal". The 6-step progress bar appears at the top ("1 of 6 done").
4. Click the quick-preset chip "Matthew Silva" (+244 923 000 101).
5. Click "Check data sources". Watch the animation check 6 registries (Telecom, Wallet, Bank, Assets...).
   Notice the green checkmarks: Age 18+ Passed, ID-SIM Match Verified.

[Step 3: Segment & Details (0:45 - 1:15)]
6. Click "Next: Segment". The 4 Yes/No tiles are pre-filled automatically:
   - Salary paid in: No
   - Customer payments: No
   - Bank account: No
   - Smartphone wallet: YES -> Pre-selects S3 Smartphone Wallet User.
   - Point out the "Use wallet data? Yes/No" toggle.
7. Click "Next: Parameters". Parameters are pre-filled from registries with source chips
   ("From Unitel", "From Bank (demo)") and live points earned badges (e.g. "+10 pts").

[Step 4: Assets, Income & Evaluation (1:15 - 1:45)]
8. Click "Next: Assets & Income". Note that the Two-wheeler asset bonus (+1 pt) is pre-filled from DNVT.
9. Click "Next: Evaluation". Observe the animated score gauge:
   - Score: ~678 / 900 (Acceptable Band, within 650-700 target range).
   - "High Data Coverage" badge.
   - Horizontal points bars per block (Telecom 34.2 of 40, Wallet 36.8 of 42).
   - Top 3 positive credit drivers and "Missing data did not lower the score" guarantee.

[Step 5: Equipment Financing & Submission (1:45 - 2:05)]
10. Click "Apply for equipment loan".
11. View equipment catalog filtered by approved limit. Select "Samsung Galaxy A15 4G".
12. Pick the 6-month EMI plan. Note the green "Affordable: 11.8% of spend (< 30% cap)".
13. Click "Submit application for approval". Confirm modal appears with auto-summary and transactional email preview. Click "Confirm & Submit".

[Step 6: Approver Review & Adjudication (2:05 - 2:35)]
14. Click "Switch to Approver Portal" in the sidebar.
15. Navigate to "Applications Queue". Click on Matthew Silva's row.
16. The Review Page opens:
    - Top: Auto-written 4-line executive summary.
    - Left: Identity, segment, and block points breakdown with source chips.
    - Right: Policy compliance checklist and Action Card.
17. Click "Approve application". Brevo transactional email dispatches instantly to the customer's inbox.

[Step 7: Store Pickup & Instant Credit Check (2:35 - 3:00)]
18. Return to "Applicant Portal" -> "My applications".
19. Matthew Silva's application now shows an approved green banner. Click "Proceed to buy".
20. Order confirmation modal displays store collection details ("Collect at Unitel Luanda Store"). Click "Confirm Store Pickup" -> status updates to "Purchased".
21. Switch back to Approver Portal -> Click "Instant Credit Check".
22. Click preset chip "Pedro Santos" (+244 923 000 104). The 6 sources query immediately and calculate Pedro's score (809/900, S7 Salaried Worker, 750,000 Kz limit).
23. In Admin -> "Points Panel", click any parameter and tap [+] on a rule. Watch the Live Test Card recalculate score and block bars in real-time before saving.
```

---

## 6. Security, Compliance & Data Privacy

- **Data Privacy**: All Bilhete de Identidade (BI) and national IDs are masked in public tables and audit logs (`0048*****MS31`).
- **Sample Data Notice**: All customer names, national IDs, and financial metrics in this demo environment are synthetic sample records.
- **Regulatory Affordability Cap**: Implements Banco Nacional de Angola (BNA) credit risk limits, guaranteeing monthly EMI never exceeds 30% of verified income or telecom spend proxy.
- **Append-Only Audit Ledger**: State transitions, policy overrides, and configuration versions are logged with actor attribution and timestamps.

---

&copy; 2026 Unitel Angola S.A. &bull; Credit & Device Financing Division.
