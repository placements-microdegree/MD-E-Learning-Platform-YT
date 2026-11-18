# MicroDegree Landing Platform — Project Overview

## In one line

The public marketing website for **MicroDegree** (Kannada-first Cloud / DevOps / GenAI upskilling), plus the small backend that sends visitors into the third-party LMS (**Graphy**) where the courses actually live, and records every learner and payment in a database for analytics and sales follow-up.

## What is MicroDegree?

MicroDegree is an Indian ed-tech startup (Bengaluru) that teaches job-ready tech skills **in Kannada**: AWS, Azure, DevOps, DevSecOps, Linux, Networking, Kubernetes (CKA) and Generative AI. It reports 1 lakh+ learners and 90K+ YouTube subscribers, won the Government of Karnataka Elevate Startup award (2020), and is backed by Somaiya Vidyavihar and 100x.VC. Courses are self-paced recorded sessions, with a certificate included.

Two plans are sold:

| Plan | Price | What it is |
|---|---|---|
| Free Plan | ₹0 | 10 course cards, 75+ beginner video lessons |
| Premium Plan | ₹399 | The full paid catalogue, interview prep material, certificate |

## What does this repo do?

It is **not** the LMS. Course videos, payments and certificates are handled by Graphy. This repo does three jobs around it.

1. **Marketing / conversion site.** A single long-scroll landing page (served at `microdegree.in` and under `microdegree.work/learning`) built to turn visitors, mostly from Meta/Instagram ads, YouTube and referrals, into free sign-ups and paid enrolments.
2. **Hand-off to Graphy.** Every "Enroll" / "Start Free" / "Log In" button goes through one funnel route that sends the user to the right Graphy page. It carries campaign attribution (UTM) along, so Graphy records where each learner came from.
3. **Data mirror and sales pipeline.** Graphy's learners, transactions, memberships, enrolments, progress and certificates are copied into Supabase (Postgres). From there, qualified leads are pushed into **LeadSquared** (CRM) and a Google Sheet, so the team can analyse the funnel and follow up.

## Problems it solves

- **Graphy's own storefront is a poor landing page.** The site gives full control over copy, design, SEO, speed and ad-specific page variants (`/` and `/premium`).
- **Attribution gets lost.** UTM parameters from ad links are stored in a first-party cookie for 30 days and forwarded to Graphy, so each learner's source is recorded.
- **Graphy data is hard to analyse.** Graphy offers limited reporting and no warehouse access. Webhooks, a scheduled API sync and CSV imports mirror everything into Supabase, keyed by email, because most learners never create an account on this site.
- **Sales follow-up is manual.** Sign-ups from Graphy flow into a `graphy_leads` table. Leads are pushed to LeadSquared 7 days after sign-up, matched by phone number to avoid duplicates, and mirrored to a Google Sheet.
- **Sessions can drift.** Logging out of Graphy also ends the Supabase session here, via a registered logout URL.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack), **React 18**, **TypeScript 5.5** |
| Styling | Plain CSS Modules (one `*.module.css` per section) and `globals.css`, with custom SVG icon components |
| Backend | Next.js Route Handlers (`app/api/*`, `app/auth/*`, `app/logout`) and `proxy.ts` (Next 16's replacement for `middleware.ts`) |
| Database / Auth | **Supabase** (Postgres, Auth, RLS) via `@supabase/ssr` and `@supabase/supabase-js` |
| SSO | Hand-signed **HS256 JWT** (`lib/graphySso.ts`) to log users into Graphy |
| Hosting | **Netlify** |
| Automation | **GitHub Actions** (scheduled syncs), Node 22 scripts |
| Integrations | **Graphy** (LMS, public API and webhooks), **LeadSquared** (CRM), **Google Analytics 4**, Google Apps Script and Sheets, Google OAuth |
| Tooling | ESLint 9 (`eslint-config-next`), `csv-parse` for backfill scripts |

There is no test suite and no UI component library.

## Architecture

```
                 Visitor (ad / YouTube / referral, ?utm_*)
                              │
                              ▼
        ┌──────────────────────────────────────────┐
        │  Next.js site (Netlify)                  │
        │  /  and  /premium  → LandingPage         │
        │  proxy.ts: refresh Supabase cookie,      │
        │            capture UTM → md_utm cookie   │
        └───────────────┬──────────────────────────┘
                        │ every CTA
                        ▼
              /api/graphy-sso?next=dashboard|checkout|free|refer
                        │  signs JWT (if logged in) + forwards UTM
                        ▼
                 Graphy (LMS: courses, payments, certificates)
                        │
        webhooks ───────┤──────── public API (every 3 h)
                        ▼
        /api/webhooks/graphy        scripts/sync-graphy.mjs
                        └──────────┬──────────┘
                                   ▼
                    Supabase  graphy_* tables (service-role only)
                                   │ trigger-maintained
                                   ▼
                            graphy_leads
                     ┌─────────────┴──────────────┐
                     ▼                            ▼
      Google Sheet (Apps Script webhook)   LeadSquared CRM
                                      (daily cron, 7 days after signup)
```

### 1. Landing page

- `app/page.tsx` and `app/premium/page.tsx` both render `components/LandingPage.tsx`, selected by a `variant` prop.
- `/premium` is a paid-only, `noindex` cut for Meta ad traffic. It shows only the ₹399 plan.
- Sections, in order: Navbar, Hero (with orbit animation), Trust, Courses and Plans, Why MicroDegree, Audience, Careers, Testimonials, Certificate, FAQ, Referral, Final CTA, Footer, and a sticky mobile CTA.
- All copy, plans, curricula, testimonials and links live in `data/content.ts`, so edits happen in one place. `components/Reveal.tsx` handles scroll-in animation.
- Also included: SEO helpers (`lib/seo.ts`, `robots.ts`, `sitemap.ts`), Terms and Privacy pages, and GA4 (`Analytics.tsx`).
- Anonymous first-party visitor tracking (`VisitorTracker.tsx`, `lib/visitorTracker.ts`) records page views and CTA/WhatsApp clicks into a separate Supabase project. Team members can opt out with `?md_notrack=1`.

### 2. Auth and Graphy SSO

- Login is by Supabase password or Google OAuth (`components/LoginForm.tsx`, `app/auth/callback`).
- `app/api/graphy-sso/route.ts` is the single funnel for all CTAs. With no session it sends the user to `/login`. Otherwise it signs a JWT and redirects to Graphy.
- Graphy's `returnurl` is accepted only if its host matches the Graphy dashboard host, which prevents open redirects.
- Current product decision: the site's own `/login` is out of the user-facing flow. The navbar shows "Log In" straight to Graphy, and enrol buttons go directly to Graphy checkout. The SSO code is kept in place.

### 3. Graphy data mirror (Supabase)

- **Webhooks** (`app/api/webhooks/graphy/route.ts`, `lib/graphyWebhook.ts`) give real-time updates. There is one webhook per event type (`learner`, `enrollment`, `transaction`, `progress`, `certificate`), authenticated with a `?secret=` query param compared via `timingSafeEqual`. Every delivery is logged raw to `graphy_webhook_events`, and the route returns 200 on non-auth failures so Graphy doesn't auto-disable the hook.
- **API sync** (`npm run sync:graphy`, run every 3 hours by `.github/workflows/sync-graphy.yml`) is an idempotent full pull that reconciles anything the webhooks missed and derives memberships and enrolments.
- **CSV imports** backfill the fields Graphy's API omits (segment, UTM, referral code, credits, membership status and expiry).
- **Tables:** `graphy_learners`, `graphy_transactions`, `graphy_memberships`, `graphy_enrollments`, `graphy_products`, `graphy_course_progress`, `graphy_certificates`, `graphy_webhook_events`, `graphy_leads`. All are RLS-enabled with no policies, so they are readable only with the service role.
- A database trigger derives `payment_mode` (`online`, `manual` or `free`) from the raw payload.

### 4. Lead pipeline

- `graphy_leads` is kept current by triggers on the other `graphy_*` tables.
- **Google Sheet mirror:** a Supabase Database Webhook calls a Google Apps Script (`scripts/graphy-leads-sheet.gs`) that upserts rows by email.
- **LeadSquared push:** `.github/workflows/sync-leads-to-lsq.yml` runs daily at 08:30 IST and calls `app/api/cron/sync-leads-to-lsq`. A lead is sent only if it has a phone number, signed up on or after 28 Aug 2026, and is at least 7 days old. Identity is matched by phone number, and existing leads only get their "Recent Lead Source" updated. A manual fallback script is `npm run sync:graphy-leads-to-lsq`.

## Repository layout

```
app/              Routes: landing pages, login, legal, SSO, webhooks, cron, auth callback
components/       Landing sections (+ .module.css), icons, tracking/analytics components
data/content.ts   All landing-page copy, plans and curricula
lib/              env, Graphy SSO + webhook logic, Supabase clients, UTM, SEO, tracker
proxy.ts          Auth cookie refresh + UTM capture on every request
scripts/          Graphy sync, CSV importers, LeadSquared fallback, Apps Script
supabase/         schema.sql (run manually in the SQL editor; no migration tool)
.github/workflows Scheduled Graphy sync and LeadSquared sync
docs/, CLAUDE.md  Contributor and AI-agent guidance
microdegree-landing-playbook.md  Hand-off doc for the separate Astro ad-landing repo
SSS/, ss/         Reference screenshots and learner onboarding PDFs
```

## Running it

```bash
npm install
cp .env.example .env.local      # fill in Supabase, Graphy, LeadSquared values
npm run dev                     # http://localhost:3000
npm run build && npm run start  # production
npm run lint
```

Operational scripts: `npm run sync:graphy`, `npm run import:graphy-learners <csv>`, `npm run import:graphy-memberships <free|paid> "<Plan>" <csv>`, `npm run sync:graphy-leads-to-lsq`.

Required environment variables are declared as lazy getters in `lib/env.ts`, with comments, and listed in `.env.example`. `NEXT_PUBLIC_SITE_URL` must be the canonical domain, never a `*.netlify.app` permalink.

## Known gaps

- **Refunds are not reconciled automatically.** Graphy has no refund webhook. `sync:graphy` flips transactions to `refund` but leaves stale `graphy_memberships` rows, which need manual cleanup.
- **Webhook fragility.** Graphy disables a webhook after 5 failed deliveries and leaves no trace on our side. The scheduled sync is the safety net.
- **No automated tests.**
- Webhook field extraction is best-effort, because only the learner payload shape is fully confirmed.

## Related projects

- A separate **Astro** repo hosts per-track ad landing pages (`/clouddevops`, `/genai`). `microdegree-landing-playbook.md` is the hand-off for it.
- The main MicroDegree site and Resources app share the same visitor-tracking tables and keys.
