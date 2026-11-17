<USER_REQUEST>
# ANTIGRAVITY CHANGE PROMPT (v2): Angola Credit Scoring Demo

This is a **change request for the app we already built** (React + Vite + TypeScript + Tailwind, Supabase). Do **not** rebuild from scratch. Keep the existing project, Supabase connection, Edge Functions and tests, and change them as described. Work in the phases at the end. After each phase, give a short summary and wait for my "continue".

The demo was reviewed by my manager. His feedback is the source of every change below.

---

## 0. The goal in one line

**Make it clean, simple and good-looking, so a new person in IT can open any screen and understand the flow, the catch and what to click, within seconds.**

Rules that apply to every screen:
1. **Few words.** Screen title: 4 words or less. Helper line: 10 words or less. Tooltip: 20 words or less. No paragraphs. No long lines of text.
2. **No long scrolling.** Design for a 1366 x 768 laptop. Each step of a flow should fit on one screen. Use two-column layouts, tabs, accordions and small cards. Long lists scroll inside their own fixed-height card, never the whole page. Tables show 6 to 8 rows with paging.
3. **One main action per screen**, as one clear orange button.
4. **Always show "where am I".** The progress bar (section 3) is always visible in the applicant flow.
5. **Plain English.** Replace jargon. Add a small "i" tooltip where a term is needed.
6. **Not plain white.** Warm, colourful, professional look (section 1).

## 1. Look and feel

The brand colour is **Unitel orange**. Orange alone looks dull and flat, so pair it with yellow, a deep charcoal and a cool teal for contrast.

| Token | Value | Use |
|---|---|---|
| `orange` | `#F26B1D` | brand accent, icons, progress, highlights |
| `orange-btn` | `#D14F00` (hover `#B84400`) | primary buttons with white text (passes contrast) |
| `yellow` | `#FFB703` | highlights, gradient end, badges (use charcoal text on yellow) |
| `ink` | `#1F2430` | sidebar, top bar, main text |
| `teal` | `#14808A` | info, secondary charts, links |
| `green` | `#22A06B` | completed steps, approved, success |
| `red` | `#C8372D` | rejected, errors |
| `cream` | `#FFF7EC` | page background |
| `peach` | `#FFE8D1` | selected rows, soft panels |
| `card` | `#FFFFFF` | cards, with soft warm shadow |

Style:
- Page background: a soft cream to light peach gradient. Each page has a **gradient header strip** (orange to yellow) with the page title in white or ink (check contrast) and a small icon.
- Cards: 16px radius, soft shadow `0 6px 20px rgba(242,107,29,0.10)`, thin warm border.
- Sidebar: dark `ink`, orange active pill with white icon, small logo mark at the top.
- Fonts: Plus Jakarta Sans for headings, Inter for body (use `@fontsource` packages).
- Icons (lucide-react): each segment has its own icon tile (button phone, smartphone, landmark, briefcase, store).
- Block colours (small tags and charts): P slate `#5F6F80`, T teal `#14808A`, W purple `#7B4FA3`, B ink-blue `#2F4B7C`, X amber `#B26A00`, A green `#22A06B`.
- Motion (subtle, 150-300 ms): numbers count up, progress bar fills, score gauge animates, cards lift on hover, a short "pulling data" animation when data sources are checked. Respect `prefers-reduced-motion`.
- Empty, loading and error states use small friendly illustrations (simple inline SVG shapes, no external images).
- Accessibility: text contrast at least AA, visible orange focus ring, keyboard navigation.

## 2. Two portals (like our operator and enterprise portal)

Create a **landing page** with two big cards: **Applicant portal** and **Approver portal**. Each has its own login, menu and routes: `/applicant/*` and `/approver/*`.

Roles (rename in DB and code):
- `analyst` becomes **`applicant`**. The analyst and the applicant are now the same person (one portal).
- `approver` and `admin` both live in the **Approver portal**. Admin sees extra tabs.

**Applicant portal menu:** New application, My applications, Notifications.
- The **first screen is the application flow itself** (the progress bar page), not analytics.
- "My applications" shows status chips: Draft, Saved, Submitted, Approved, Rejected, Purchased.
- When an application is **Approved**, show a green banner and a **Proceed to buy** button. It opens a simple order confirmation (item, EMI plan, "Collect at store") and sets status to Purchased (logged).

**Approver portal menu:** Dashboard, Applications queue, Instant credit check, Notifications, Audit log, and (admin only) Points panel, Segments, Data sources, Settings, Users.
- Analytics (the dashboard with KPIs and charts) lives here.
- Seed one demo user per role: applicant, approver, admin.

## 3. The applicant flow with a progress bar (the main screen)

A sticky progress bar at the top with **6 steps**, like a workflow diagram showing "you are here":

**1 Customer, 2 Segment, 3 Details, 4 Assets and income, 5 Evaluation, 6 Loan**

- Step states: grey (upcoming), orange (current), **green with a check (done)**. The connecting line fills green.
- A step turns green **the moment its required inputs are valid**. Show "3 of 6 done" on the right.
- Completed steps can be clicked to go back. Future steps are locked until the previous one is green.
- The applicant portal home page is this flow (it also works as the starting page for the whole demo).
- First visit: a dismissible "How it works" card with 3 short points: 1 Enter the customer. 2 We fetch data from 6 sources. 3 Get score and limit.

### Step 1: Customer
Fields: full name, mobile number, national ID (BI), date of birth, SIM activation date, email (used for notifications). Mobile number is the **unique customer ID** used to find records.
- Button: **Check data sources**. It runs a short animation ("Telecom... Wallet... Bank... Assets...") and shows ticks per source: found or no record. If records exist, values are pre-filled later with a source label (section 6).
- Eligibility checks: age 18 or more; ID and SIM registration match. Show a clear red message if not eligible.

### Step 2: Segment
Only **4 big yes/no tiles**, one screen, no scrolling. First YES wins, and answers are **pre-filled from the data sources** when records exist. The applicant confirms or changes them.
1. Is a salary paid in regularly (bank or wallet)? -> **S7 Salaried worker**
2. Do you take customer payments (shop, trader, moto-taxi)? -> **S8 Trader or self-employed**
3. Do you have a bank account? -> **S5 Banked (ATM and card)**
4. Do you use a wallet app on a smartphone? -> **S3 Smartphone wallet user** (skipped if wallet is off)
5. None of these -> **S1 Button phone, cash-only**

Show the result as a coloured segment card: icon, name, one line ("Scored mostly on telecom habits"), and which blocks switch on.
Also show one toggle: **Use wallet data? Yes / No** (wallet is optional, see section 8). If No, the wallet block is skipped in the next steps.

### Step 3: Details (the parameters)
The form **changes automatically with the segment**: a button phone hides wallet options; a smartphone segment opens wallet options.
- One tab per block (only blocks used by this segment). Tabs show progress like "Telecom 4/5".
- Parameters sit in a compact two-column grid. Each row: label, a dropdown or small input, a **source chip** (From Unitel, From Bank (demo), You entered), and the **points earned** shown live in small orange text (for example "+7").
- Values that came from a data source are filled and locked, with a small "Edit" link.
- A blank value means "not available". It is never counted as zero.

### Step 4: Assets and income (one screen, two cards)
- Left card, **Assets** (bonus only): four tiles with Yes / No / Skip: House (+2), Land title (+1), Two-wheeler (+1), Car (+2). Footnote in one line: "Assets only add points."
- Right card, **Income band**: six chips (Very low to High, in Kz with a small USD note). If the amount is not in the list, a field **Other amount** lets the applicant type it. Default is "Estimated from telecom spend".
- Asset records can be filled from the vehicle registration office or land registry (demo connectors).

### Step 5: Evaluation (rename from "score and confidence" everywhere)
One screen:
- Left: animated **score gauge** (300-900), the score band label, and a small badge **Data coverage** (High, Medium, Low). Do not use the word "confidence" in headings.
- Middle: **points per block** as horizontal coloured bars ("Telecom 41 of 80").
- Right: **Top 3 reasons** in plain words, and a one-line note if data was missing: "Missing data did not lower the score."
- Buttons: **Save evaluation** (secondary) and **Apply for equipment loan** (primary).

### Step 6: Loan
Three compact blocks on one screen: **Credit limit** (big number, with a small line showing which cap applied), **Equipment** (card grid filtered by the limit, 6 items, paged), and **EMI plan** (term chips 3, 6, 9, 12 months, monthly EMI, green or red check against the 30% cap).
- **Submit** creates the application, sends the email to the approver, and shows a success screen with the **email preview** and a "Track my application" button.

## 4. Approver portal

- **Dashboard:** KPI cards (applications, approved, rejected, average score), score bands chart, customers by segment donut, recent applications. Same data as before with the new look. Keep it to one screen.
- **Applications queue:** compact table with status chips. Click a row to open the **Review page**.
- **Review page:** an **auto-written summary** at the top in 4 short lines (who, segment, score and band, limit and EMI), then block bars, key values with source chips, and flags. Buttons: **Approve** and **Reject** (reason required for reject). The summary is reused in the decision email.
- **Instant credit check** (new, the key demo screen): one search box, "Enter mobile number or ID". The system pulls the customer's records from the 6 data sources, shows ticks appearing source by source, then shows the score, band, limit and block bars in a few seconds. This proves the score is calculated in real time from stored records.
- **Notifications:** list of sent emails with a **Preview** button and a **Send sample email** button. Show the simple email format (see section 10).
- **Audit log:** keep as is, simpler table, filters in one row.

## 5. Only 5 segments, only 6 blocks

The manager asked for **5 segments** so it is easy to see. These are the most important for Angola, chosen from the research (53% of adults financially excluded, 41% self-employed and mostly informal, 36% banked, 72% have a mobile phone, mobile money growing):

| Code | Segment | Why it is needed in Angola |
|---|---|---|
| S1 | Button phone, cash-only | Largest group, telecom-only scoring |
| S3 | Smartphone, unbanked, wallet app | Growing wallet users, shows optional wallet |
| S5 | Banked (ATM and card) | The 36% with a bank account |
| S7 | Salaried worker | Small but the most bankable group |
| S8 | Trader or self-employed | Most common work type, mostly informal |

**Do not delete** the other segments (S2, S4, S6, S9, S10). Add `is_active` to `segments` and set them to false, so we can bring them back later ("if we say five, we can always add"). Hide them from the UI, the finder and the matrix.

Block points per segment (P, T, W, B, X each add to 94, plus asset bonus up to 6, total 100). Keep editable:

| Segment | P | T | W | B | X |
|---|---|---|---|---|---|
| S1 | 14 | 80 | 0 | 0 | 0 |
| S3 | 12 | 40 | 42 | 0 | 0 |
| S5 | 12 | 25 | 0 | 50 | 7 |
| S7 | 10 | 20 | 10 | 48 | 6 |
| S8 | 10 | 30 | 34 | 12 | 8 |

The six blocks stay: **P** Personal and identity, **T** Telecom behaviour, **W** Wallet and mobile money (optional), **B** Bank and formal finance, **X** Other alternative data, **A** Assets and income (assets are separate and bonus only).

The **Segments** explainer page becomes simple, with 4 tabs: **Flow** (6 steps as icons), **Segments** (5 cards), **Blocks** (6 tiles), **Points** (read-only heatmap of the table above). Cards show only: icon, name, one-line story, blocks used, and score logic in one line.

## 6. Data sources (real-time credit check from stored records)

The manager wants it to look real: records already exist in several databases, and the score is calculated from them using one **unique ID**. Data can be collected by the operator itself or come from a **third party**. Build a simulated data layer:

**Tables (seeded, keyed by `customer_ref` = mobile number, plus `national_id`):**
- `src_identity` (block P): SIM registration match, employment status, time in current activity (months)
- `src_telecom` (block T): SIM tenure, top-up months of last 12, monthly top-up Kz, spend stability, active days per month, airtime loan repayment
- `src_wallet` (block W): wallet months active, inflow regularity, average monthly inflow, merchant QR receipts, bill payments, balance stability, wallet loan repayment
- `src_bank` (block B): account age, credits months of last 12, average balance, card and ATM use, loan repayment, returned payments in 12 months
- `src_alt` (block X): utility bills on time, tax standing (NIF), social security record (INSS), business licence
- `src_assets` (block A): house, land title, two-wheeler, car (from registries)
- `data_connectors`: name, owner (`operator` or `third_party`), status (`demo-connected`), records count, last sync

**Edge Function `fetch-customer-data`:** input is mobile number or national ID. It reads all `src_*` tables, merges the values and returns each value with a `source` tag (for example "Unitel Telecom", "Unitel Money", "Bank gateway (demo)", "Vehicle registry (demo)", "You entered"). It also returns the derived yes/no answers used to pre-fill the segment finder. A missing record is returned as "no record", **never as zero**.

**Rules:**
- If a source has no record, the form shows that block's fields as empty and editable, and the applicant can enter values.
- Every value in the UI shows a small source chip.
- Data sources page (admin): connector cards (Unitel Telecom [operator], Unitel Money [operator], Bank gateway [third party, demo], Vehicle registration office [third party, demo], Land registry [third party, demo], Utilities [third party, demo]) with status and record counts, a table editor to add or edit records, and a **Connect new source** button that opens a small "coming soon" panel explaining that a connector can be plugged in later.

**Seed 7 demo customers** (sample data only, all numbers fake). Tune the values so the final scores land in the target ranges:

| Name | Mobile | Segment | Key facts | Target score |
|---|---|---|---|---|
| Matthew Silva | +244 923 000 101 | S3 | Smartphone, wallet app, no bank. SIM 30 months, top-ups 11 of 12, 4,500 Kz a month, stable spend. Wallet 14 months, inflow 10 of 12, average inflow 120,000 Kz, bills paid by wallet, high balance stability. Owns a two-wheeler. | 650-700 |
| Tomas Neto | +244 923 000 102 | S1 | Button phone, cash. SIM 14 months, top-ups 8 of 12, 1,800 Kz a month, some spend swings, airtime loans repaid 80-99%. Informal seller for 18 months. Owns a house. | 560-620 |
| Carlos Mateus | +244 923 000 103 | S5 | Bank, ATM and card weekly. SIM 40 months, top-ups 10 of 12. Account 60 months, credits 10 of 12, average balance 300,000 Kz, no returned payments, utilities mostly on time, NIF regular. Owns house and land title. | 700-760 |
| Pedro Santos | +244 923 000 104 | S7 | Public servant. SIM 60 months, top-ups 12 of 12. Account 84 months, credits 12 of 12, average balance 520,000 Kz, loan repaid well, utilities always, NIF regular, INSS yes. Owns house, land title and car. | 760-820 |
| Isabel Fernandes | +244 923 000 105 | S8 | Shop owner. SIM 36 months, top-ups 12 of 12, 9,000 Kz a month. Wallet inflow 11 of 12, average inflow 250,000 Kz, QR receipts regular, business licence yes, NIF irregular. Bank credits 5 of 12, 1 returned payment. Owns a two-wheeler. | 640-700 |
| Joaquim Baptista | +244 923 000 106 | S5 | Defaults. SIM 7 months. Account 18 months, credits 3 of 12, average balance 40,000 Kz, loan in default, 6 returned payments, NIF none. | 380-480 (manual review) |
| New Customer | +244 923 000 107 | none | **No records anywhere.** Shows manual entry. | n/a |

## 7. Points panel (admin, in the Approver portal)

The manager wants to **configure the scoring in real time**: choose a parameter, set points per option, and see all numbers come from the database and recalculate.

**Switch the scoring model to simple points tables** (replace the old band and 0-to-1 normalisation):
- Each parameter has **options or ranges, each with a number of points** (for example SIM tenure: under 3 months = 0, 3-6 = 2, 6-12 = 4, 12-24 = 7, over 24 = 10).
- **Block score** = (points earned ÷ points possible of the parameters that have data) x the block points for that segment. Parameters with no value are skipped in both parts, so missing data is never a penalty.
- Total = block scores + asset bonus (max 6), capped at 100. Score = 300 + total x 6.
- Asset points stay: house +2, land title +1, two-wheeler +1, car +2.

**Table `point_rules`** (`parameter_key`, `option_key` or `min_value`/`max_value`, `label`, `points`, `config_version_id`). Seed these defaults (all editable):

| Parameter | Rules (points) |
|---|---|
| `id_sim_match` | yes 5 (no = stop) |
| `employment_status` | formal job 5, self-employed 4, other 3 |
| `time_in_activity_months` | under 6 = 1, 6-24 = 3, over 24 = 5 |
| `sim_tenure_months` | under 3 = 0, 3-6 = 2, 6-12 = 4, 12-24 = 7, over 24 = 10 |
| `topup_months_of_12` | 0-3 = 0, 4-6 = 3, 7-9 = 6, 10-12 = 10 |
| `monthly_topup_kz` | under 1,500 = 2, 1,500-3,000 = 5, 3,000-6,000 = 8, over 6,000 = 10 |
| `spend_stability` | stable 10, some swings 5, erratic 1 |
| `active_days_per_month` | under 10 = 2, 10-20 = 6, over 20 = 10 |
| `airtime_loan_repayment` | none = skipped, on time 100% = 10, 80-99% = 7, 50-79% = 3, under 50% = 0 |
| `wallet_months_active` | under 3 = 0, 3-6 = 3, 6-12 = 6, over 12 = 10 |
| `wallet_inflow_months_of_12` | 0-3 = 0, 4-6 = 3, 7-9 = 6, 10-12 = 10 |
| `avg_monthly_inflow_kz` | under 20,000 = 2, 20,000-80,000 = 5, 80,000-200,000 = 8, over 200,000 = 10 |
| `merchant_qr_receipts` | none 0, some 5, regular 10 |
| `bill_payments_via_wallet` | none 0, sometimes 5, regular 10 |
| `wallet_balance_stability` | low 2, medium 6, high 10 |
| `wallet_loan_repayment` | none = skipped, same table as airtime loans |
| `account_age_months` | under 6 = 2, 6-24 = 5, over 24 = 10 |
| `credits_months_of_12` | 0-3 = 0, 4-8 = 5, 9-12 = 10 |
| `avg_balance_kz` | under 92,000 = 2, 92,000-460,000 = 5, over 460,000 = 10 (about USD 100 and USD 500) |
| `card_atm_use` | rare 2, monthly 6, weekly 10 |
| `bank_loan_repayment` | none = skipped, good 10, late 3, default 0 |
| `returned_payments_12m` | 0 = 10, 1-2 = 6, 3-5 = 2, 6 or more = 0 |
| `utility_bills_on_time` | none = skipped, sometimes 4, mostly 7, always 10 |
| `nif_standing` | none = skipped, irregular 3, regular 10 |
| `inss_record` | none = skipped, yes 10 |
| `business_licence` | none = skipped, yes 10 |

**Parameters per segment** (use only these; this keeps each screen short):
- **S1:** P (id_sim_match, employment_status, time_in_activity); T (sim_tenure, topup_months, monthly_topup, spend_stability, active_days, airtime_loan_repayment)
- **S3:** P (same); T (sim_tenure, topup_months, monthly_topup, spend_stability, airtime_loan_repayment); W (wallet_months_active, wallet_inflow_months, avg_monthly_inflow, bill_payments, balance_stability, wallet_loan_repayment)
- **S5:** P (same); T (sim_tenure, topup_months, spend_stability); B (account_age, credits_months, avg_balance, card_atm_use, bank_loan_repayment, returned_payments); X (utility_bills, nif_standing)
- **S7:** P (same, employer as employment_status); T (sim_tenure, topup_months, spend_stability); W optional (wallet_inflow_months, bill_payments); B (account_age, credits_months, avg_balance, bank_loan_repayment, returned_payments); X (utility_bills, nif_standing, inss_record)
- **S8:** P (same); T (sim_tenure, topup_months, monthly_topup, spend_stability, active_days); W optional (avg_monthly_inflow, wallet_inflow_months, merchant_qr_receipts, wallet_loan_repayment); B (credits_months, returned_payments); X (business_licence, nif_standing, utility_bills)

**Points panel screen (one screen, no page scroll):**
- Left: list of the 6 blocks (coloured tags). Middle: parameters of the selected block. Click a parameter to open its rules as a small editable list: label, **points** (number box with plus and minus), live "max points" and "block total possible".
- Right: **Live test card**. Pick a demo customer (for example Matthew). The score gauge and block bars **recalculate instantly as you change a number**, before saving.
- A second tab **Segment weights**: the table of block points per segment, with a check that P+T+W+B+X equals 94 for each (save is blocked otherwise).
- **Save** creates a new config version (audit logged) and applies to all new calculations. **Reset to default** restores the seed.

## 8. Wallet is optional (keep and simplify)

- Global switch in Settings: `wallet_enabled`. When off, the W block is hidden everywhere and the finder skips question 4.
- In Step 2 the applicant toggles **Use wallet data? Yes / No**. If **No**, the wallet fields and tab are skipped, and the wallet block points move proportionally to the segment's other blocks that have data (main block first).
- A missing or skipped block never counts as zero. Show the small badge **Data coverage** lower when a main block is missing.

## 9. Scoring engine updates (`src/lib/scoring.ts`)

- Replace band normalisation with the **points tables** (section 7). Keep a pure function: inputs plus config in, result out, reproducible from stored inputs and the config version.
- Keep: overlay rules (ID mismatch stop, under 18 not eligible, SIM under 6 months starter limit only, SIM swap hold), asset bonus max 6, redistribution of empty blocks, score bands, income-band cap, EMI cap 30% of income or spend, limit = lowest of the three, USD shown as a small note (about 920 Kz per USD).
- Rename "confidence" to **Data coverage** in the UI. Internal logic can stay.
- Update unit tests (Vitest): all 5 active segments' P+T+W+B+X equal 94; seeded customers land in their target ranges; changing a rule's points changes the score; a missing parameter is skipped in both earned and possible points; wallet off redistributes points and never exceeds 100; assets "No" and "Skip" equal no answer; SIM under 6 months caps at starter limit; EMI above 30% shows red.

## 10. Email notifications (keep Supabase Edge Function and Resend)

Short, clean, branded emails (orange header bar, white body, one summary table, one button). Three templates:
1. **Submitted (to approver):** "New loan application: {name}". Body: segment, score, limit, item, EMI, button "Review".
2. **Approved (to applicant):** "Your application is approved". Body: the auto-written summary, item and EMI, button "Proceed to buy".
3. **Rejected (to applicant):** "Application update". Body: short reason, next step.
Max 6 short lines of text each. Add a **Preview** and **Send sample email** button in the Notifications page. If no email key exists, store as `logged`.

## 11. Database changes (new migration, do not drop data)

- Rename role enum value `analyst` to `applicant`. Update RLS and UI.
- Add `segments.is_active`; set S1, S3, S5, S7, S8 true and the others false.
- Add `point_rules`, `src_identity`, `src_telecom`, `src_wallet`, `src_bank`, `src_alt`, `src_assets`, `data_connectors`.
- Add `evaluations.wallet_used boolean` (replaces `wallet_available`), `applications.purchased_at`, and statuses `saved` and `purchased`.
- Update `segment_weights` for the 5 active segments to the table in section 5.
- Update `parameters` and `segment_parameters` for the lists in section 7. Keep old rows inactive.
- Seed the 7 demo customers and the 3 demo users. Mark all as sample data.
- RLS: applicants see only their own applications; approver and admin see all; source tables readable by the Edge Function (service role) and by admin for the Data sources page.
- Keep the audit log insert-only. Log: customer lookup, segment chosen, points rule changes, evaluation, submission, decision, purchase.

## 12. Quality rules

- TypeScript strict. Money stored as integer Kz, shown like "150,000 Kz (about USD 163)".
- Mask national ID in lists and logs.
- Every screen has empty, loading and error states.
- No real customer data. Mark sample data and placeholders ("demo data", "tune with real data") in the Admin screens.
- Final check before finishing: open every screen at 1366 x 768 and confirm there is **no page-level scrolling** in the applicant flow, text is short, and the progress bar turns green step by step.

## 13. Phases (stop after each one and wait for "continue")

1. **Look and structure:** design tokens, gradient headers, new sidebar, landing page with two portals, role rename, copy trimmed to the short-word rules.
2. **Database and seed:** migration, 5 active segments, point rules, source tables, connectors, 7 demo customers, 3 demo users.
3. **Scoring engine v2:** points tables, tests passing, seeded customers in target ranges, `fetch-customer-data` Edge Function.
4. **Applicant portal:** the 6-step progress bar flow, source chips, live points, wallet toggle, evaluation screen, loan step, proceed to buy.
5. **Approver portal:** dashboard, queue, review page with auto-summary, **Instant credit check**.
6. **Admin:** Points panel with live test card, segment weights check, Data sources page, settings.
7. **Emails and polish:** three templates with preview, no-scroll audit, animations, accessibility, README and a 3-minute demo script.

**Demo script to support (3 minutes):** Landing, Applicant portal, enter Matthew Silva, Check data sources (ticks appear), segment is pre-filled as S3, details pre-filled with source chips, assets and income, Evaluation (score about 650-700), Loan, Submit, email preview. Switch to Approver portal, open the queue, show the summary, Approve, email, back to Applicant, Proceed to buy. Then Instant credit check on Pedro Santos, and in Admin change one point value and watch the live test card update.

Start with Phase 1 now.

</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-11-16T18:38:10+05:30.

The user's current state is as follows:
Active Document: c:\Users\bharg\OneDrive\Documents\Angola\Angola_Unitel\.env (LANGUAGE_UNSPECIFIED)
Cursor is on line: 17
</ADDITIONAL_METADATA>