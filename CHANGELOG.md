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

