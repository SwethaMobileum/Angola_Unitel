# Changelog

## Step 1 — Inspection & Gap Analysis (2026-11-12)
- Audited existing portal (`App.tsx`, `scoring/`, `data/seedGenerator.ts`, `lib/dataService.ts`, `styles/theme.css`, `supabase/`).
- Documented gaps across role-based navigation & landing screen, 6-step volume-tiered application wizard, equipment catalog & EMI plans, database lookup/manual new-customer entry, audit logging, and orange-only design polish.

## Step 2 — Design Tokens, Extended Types, EMI Affordability & Seed Migrations (2026-11-12)
- Updated `src/styles/theme.css` to the bright orange-only palette (`#FFF8F0`..`#5C2800`), white sidebar with orange active item, and orange-only icon status badges (`✓`, `◷`, `✕`).
- Extended `src/scoring/` with `VolumeTier`, `EquipmentItem`, `EmiPlanConfig`, `calculateEmiPlan()`, `emiAffordable`, `has_bank_account` neutral guarantee, and explicit Basic-wallet thin-file notice.
- Added `supabase/migrations/002_workflow_emi_audit.sql`, updated `supabase/seed.ts`, `src/data/seedGenerator.ts`, and `src/lib/dataService.ts`.
- Expanded `src/scoring/__tests__/engine.test.ts` to 11 unit tests.

## Step 3 — Role-Based Navigation, Landing Screen & Applications Views (2026-11-12)
- Added `ChooseRoleScreen.tsx` first screen with three role cards (`Analyst`, `Approver`, `Admin`) and `localStorage` persistence.
- Refactored `App.tsx` with role-specific sidebars, role-specific landing pages (`Approver` lands on `Approval Queue`), `"Viewing as <Role>"` header badge, and `"Not available for this role"` fallback view.
- Added `ApplicationsList.tsx` (search, multi-facet filters, sorting) and `ApplicationDetail.tsx` (What-If simulator with `"Save as new version"`, EMI affordability, timeline, notifications).

## Step 4 — 6-Step New Application Wizard & Volume-Tier Logic (2026-11-12)
- Rebuilt `NewApplication.tsx` with progress tracker, Back/Next navigation, inline validation, and auto-saved draft.
- Added Step 1 customer details (+244 9XX XXX XXX and 14-char BI validation + `"Find existing customer"`), Step 2 Low/High volume cards with Basic vs KYC dynamic fields & wallet limit validation (25k/70k vs 300k/18M AOA), Step 3 volume-filtered equipment catalog & ceilings, Step 4 volume-filtered EMI plans, Step 5 DB lookup + manual fallback + `"Fill sample data"` + neutral bank account flag, and Step 6 review/submit routing to Approver.

## Step 5 — Approver Queue, Admin Governance Pages & Dashboards (2026-11-12)
- Updated `Dashboard.tsx` with Data Confidence (`Low/Medium/High`) chart and Low/High volume counts.
- Updated `ApprovalsQueue.tsx` with inline volume/equipment/EMI/score reasons and mandatory-reason Approve / Reject / Request More Info actions.
- Added `CatalogAndEmiAdmin.tsx`, `NotificationTemplatesView.tsx`, `UsersAndRolesView.tsx`, `AuditLogView.tsx`, `DataToolsView.tsx` (Load sample data, Clear all data, Export CSV), and config version history in `AdminConfig.tsx`.

## Step 6 — Enterprise Neutral SaaS Restyle (2026-11-12)
- Centralized all colors as CSS variables in `src/styles/theme.css` (`--brand-50/500/600/700` + neutral `--bg`, `--surface`, `--border`, `--text`, `--slate-*`).
- Restricted orange to top bar (`--brand-600`, darkened for >= 4.5:1 contrast with white text), sidebar active left bar & highlight (`--brand-500` / `--brand-50`), page/section headings (`--brand-700`), and primary buttons.
- Converted KPI cards, forms, tables, charts, gauges, and icon status badges to neutral slate/gray ramps with zero hard-coded colors in TSX files.

## Step 7 — Email Notifications for Application Submit and Decisions (2026-11-13)
- **New Application Submitter & Customer Email Fields**: Added required `Your email (for notifications)` (`submitted_by_email`) with regex validation and helper text, required `Your name` (`submitted_by_name`), and optional `Customer email` (`customer_email`). Draft auto-saves to localStorage and remembers last typed values. Step 6 displays submitter email and approver notification notice. Result page displays notification dispatch banner with recipient list or demo mode status.
- **Email 1 (Application Submitted)**: Dispatches email to all active approver addresses from the Admin approvers list containing application ref, submitter details, customer name/mobile, volume tier, equipment and price, EMI plan, proxy score, band, confidence, policy suggestion, and an "Open in Approval Queue" direct link.
- **Email 2 (Application Approved / Rejected / More Info)**: Dispatches decision outcome email to `submitted_by_email` containing final decision, mandatory approver reason, credit limit (if approved), decided by role/name, and direct review link. Optionally sends a copy to `customer_email` if the Admin setting is enabled.
- **Approver Decision Confirmation Modal**: Approval Queue and Application Detail screens present a confirmation modal showing `"An email will be sent to {submitted_by_email}"` before the Approver commits.
- **Admin Governance (Admin > Notification Templates)**:
  - Approver notification recipient list editor (add, remove, toggle active) with email format validation. Shows warning banner if 0 active approvers exist.
  - Editable templates for `submitted`, `approved`, `rejected`, and `more_info` with placeholder interpolation (`{{reference}}`, `{{customer_name}}`, `{{equipment}}`, `{{price}}`, `{{emi_term}}`, `{{monthly_emi}}`, `{{score}}`, `{{band}}`, `{{confidence}}`, `{{decision}}`, `{{reason}}`, `{{decided_by}}`, `{{link}}`, `{{submitted_by_name}}`, `{{submitted_by_email}}`).
  - Live preview with sample persona data and "Send test email" button sending strictly to the Admin-entered address.
  - Toggle: "Also email the customer" (default off).
  - "Reset to default" button for instant restoration.
- **Pluggable Sending Layer & Resilient Demo Mode**:
  - Implemented `src/lib/emailService.ts` and `supabase/functions/send-notification/` (Edge Function supporting Resend / SMTP).
  - Secrets kept in server-side environment variables; documented in `.env.example`.
  - Non-blocking execution: email transport failures never block submission or approver decision.
  - Safe Demo Mode fallback (`Not sent (demo mode)`) when email credentials are not set, with Admin status banner.
  - Deduplication prevents re-sending if an email was already delivered. Admin "Retry" button available on failed notifications.
- **Database Schema**: Added `supabase/migrations/003_email_notifications.sql` with migrations for `applications`, `approver_recipients`, `notification_templates`, `notifications`, and `settings`.
- **Testing**: Added Vitest test suite (`src/scoring/__tests__/notifications.test.ts`) covering template interpolation, active approver filtering, decision routing, customer toggle, and error handling. All 17 unit tests pass.


