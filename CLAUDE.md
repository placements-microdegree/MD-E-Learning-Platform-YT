# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server (Next.js 16, Turbopack)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next/core-web-vitals`)
- `npm run sync:graphy` — full pull from the Graphy public API (`api.ongraphy.com/public/v1`, auth `?mid=&key=`) into the `graphy_*` tables: learners, transactions, products, and derived memberships/enrollments. Idempotent; run anytime to reconcile what the webhooks caught (`scripts/sync-graphy.mjs`)
- `npm run import:graphy-learners <csv>` — CSV backfill for the learner fields the API omits (segment, UTM, referral code, credits) from a "Learners Report" export (`scripts/import-graphy-learners.mjs`)
- `npm run import:graphy-memberships <free|paid> "<Plan Name>" <csv>` — CSV backfill from a membership member-list export (`scripts/import-graphy-memberships.mjs`)

No test suite is configured.

## Architecture

This is the MicroDegree marketing site: a single long-scroll landing page (`app/page.tsx`) built from
section components in `components/`, plus a Supabase-backed auth layer whose only purpose is to single-sign-on
learners into Graphy (the third-party LMS that actually hosts courses).

**Content vs. presentation**: copy/data for the landing sections lives in `data/content.ts` (plans, testimonials,
trust stats, nav/social links); components import from there rather than hardcoding text. Each section component
has a co-located `*.module.css` file. `components/Reveal.tsx` is a shared scroll-in-view wrapper (IntersectionObserver)
used to animate sections.

**Auth → Graphy SSO handoff**: the site's only backend job is turning a Supabase session into a signed Graphy SSO
token. The flow is:
1. User authenticates via Supabase (`components/LoginForm.tsx` — password or Google OAuth).
2. Google OAuth lands on `app/auth/callback/route.ts`, which exchanges the `code` for a Supabase session, then
   redirects to `/api/graphy-sso`.
3. `app/api/graphy-sso/route.ts` is the single funnel every CTA on the page routes through
   (`?next=dashboard|checkout|free|refer`). If there's no session it bounces to `/login`; otherwise it signs an
   HS256 JWT (`lib/graphySso.ts`) keyed on `GRAPHY_API_KEY` and redirects into Graphy with `?ssoToken=`.
4. If Graphy itself bounced the user to `/login` (session expired mid-course), it passes back `returnurl`;
   `isTrustedGraphyReturnUrl` only honors that if its host matches the Graphy dashboard host, since it's an
   attacker-influenceable query param.
5. `app/logout/route.ts` is registered as Graphy's own "Log Out URL" so a Graphy logout also ends the Supabase
   session here.

`proxy.ts` (not `middleware.ts` — see the Next.js version note above) refreshes the Supabase auth cookie on every
request via `@supabase/ssr`.

**Supabase clients** (`lib/supabase/`) — three distinct clients, don't cross their streams:
- `server.ts` — cookie-scoped, respects RLS, used in Server Components/Route Handlers for the current user.
- `client.ts` — browser client for Client Components.
- `admin.ts` — service-role, bypasses RLS entirely. Only for trusted server-initiated writes with no user session
  to scope to (the Graphy webhook receiver, the CSV backfill script). Never import from a Client Component.

**Graphy data mirror** — the `graphy_*` tables are a service-role-only copy of Graphy's own records, kept for
an external analytics project (decoupled from `profiles`/`auth.users`: most learners never create a Supabase
account, so everything is keyed by email). Two write paths, same tables:
- **Webhooks** (`app/api/webhooks/graphy/route.ts`, `lib/graphyWebhook.ts`) — the real-time layer. Register one
  Graphy webhook per event group, each pointing at `?secret=…&type=learner|enrollment|transaction|progress|certificate`
  (plus `&status=initiated|success` for transactions); the route dispatches on `type` rather than trusting the
  payload to self-identify. Auth is the `?secret=` query param (`timingSafeEqual`) since Graphy's config has no
  signing option. Field extraction is defensive/best-effort — only the learner-profile shape is fully confirmed;
  every delivery is logged raw to `graphy_webhook_events` regardless of mapping success, as audit trail and as
  sample data to correct the extractors against. The route only 401s on a bad secret (Graphy auto-disables a
  webhook after 5 failed deliveries — so rotate `GRAPHY_WEBHOOK_SECRET` by updating Netlify first, waiting for the
  deploy, *then* Graphy); every other failure returns 200 and records the error on the audit row.
- **API sync** (`npm run sync:graphy`, `scripts/sync-graphy.mjs`) — full pull from `api.ongraphy.com/public/v1`
  (`/learners`, `/transactions`, `/products`; memberships & enrollments derived from transaction `items[]`).
  Idempotent full backfill / reconcile. The CSV import scripts cover the few learner fields the API omits.

**Refunds are not reconciled automatically (known gap, to be implemented later).** Graphy has no refund
webhook — none is registered and none has ever been received — and the success-transaction payload carries no
status field, so `route.ts` records every transaction webhook as `status="success"`. `npm run sync:graphy`
maps Graphy's `status:"refund"` transactions straight through (so `graphy_transactions` rows flip
`success`→`refund`), but it only (re)writes `graphy_memberships` from `success` transactions, so a learner
whose only Paid Plan record is a refund keeps a stale active membership row. Until this is built out, after a
refund in Graphy: run `sync:graphy`, then manually delete/downgrade the affected `graphy_memberships` rows.
The dashboard "All customers" membership list (real status + expiry) is not in the public API — only a CSV
export via `npm run import:graphy-memberships` carries it. The owner will implement refund handling later or
ask for the change (a `?type=transaction&status=refund` webhook branch + sync downgrading memberships).

Tables: `graphy_learners` (identity + CSV-only fields like segment/UTM/referral), `graphy_transactions` (every
payment, Init has no id so it just logs), `graphy_memberships` (plan tier per learner — Free/Paid), `graphy_enrollments`
(per-course access, keyed on `learner_email,course_name`), `graphy_products` (course catalogue), `graphy_course_progress`,
`graphy_certificates`, `graphy_webhook_events` (audit log).

**`payment_mode`** (`online` | `manual` | `free` | NULL) on `graphy_transactions` and `graphy_memberships` is derived
by a BEFORE INSERT/UPDATE trigger from `raw_payload` (`manualTransaction=true` → manual; a gateway `TXNID` → online;
tier free / amount 0 → free), so webhook, sync and CSV paths all get it with no app code. Webhook deliveries don't carry
`TXNID`/`manualTransaction`, so paid rows from the webhook stay NULL until the next `npm run sync:graphy`.

**Promo codes**: `promo_code`, `promo_discount`, `amount_before_promo` on `graphy_transactions` are derived by a
BEFORE INSERT/UPDATE trigger (`trg_set_graphy_promo`) from `raw_payload` (`promocode` from sync, `"Promo Code"` from
webhooks; codes upper-cased). `initiated` checkouts carry the code too — filter `status='success'` for who actually paid.
Webhooks only carry the code, so `promo_discount`/`amount_before_promo` fill in on the next `npm run sync:graphy`.
`RAJATH100` is the owner's own test code (two real learners used it by mistake — ignore it in dashboards).

**Database** (`supabase/schema.sql`, run manually in the Supabase SQL editor — no migration tooling): `profiles`
mirrors `auth.users` via an `on_auth_user_created` trigger, RLS-scoped so users can only see/update their own row.
All `graphy_*` tables are service-role-only (RLS enabled with zero policies).

**Env vars**: all required env vars are declared in `lib/env.ts` as lazy getters (`requireEnv`, throws if missing)
with comments explaining what each one drives; `.env.example` documents the same set. Notably `NEXT_PUBLIC_SITE_URL`
must be the canonical domain — Netlify also serves every deploy at a per-deploy `*.netlify.app` permalink, and
auth redirects must never resolve to that.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context — root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
