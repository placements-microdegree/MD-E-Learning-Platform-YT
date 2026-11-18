-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor).
-- Records every signup (password or Google) alongside Supabase's own auth.users table.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  provider text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-populate profiles whenever Supabase Auth creates a user (password signup or Google OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_app_meta_data ->> 'provider'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Learner data pulled in from Graphy's own onboarding (mobile number, work experience),
-- synced via webhook (app/api/webhooks/graphy) or one-off CSV backfill (scripts/import-graphy-learners.mjs).
alter table public.profiles add column if not exists mobile_number text;
alter table public.profiles add column if not exists work_experience text;
alter table public.profiles add column if not exists graphy_synced_at timestamptz;
alter table public.profiles add column if not exists profile_source text; -- 'graphy_webhook' | 'graphy_csv_backfill'

-- Audit trail for inbound Graphy webhook deliveries. Payload shape is unverified until a real
-- delivery is captured, so every delivery is logged here (raw, unmapped) regardless of whether
-- field-mapping succeeded -  this is how we get a real sample payload to correct lib/graphyWebhook.ts.
create table if not exists public.graphy_webhook_events (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  event_type text,
  payload jsonb not null,
  matched_profile_id uuid references public.profiles (id),
  processed boolean not null default false,
  error text
);

-- Only the service-role client (used by the webhook route) may touch this table -  no policies,
-- so RLS default-denies everything else, same posture as profiles but with zero exceptions.
alter table public.graphy_webhook_events enable row level security;

-- ============================================================================
-- Graphy data mirror (app/api/webhooks/graphy) -  feeds the external analytics project.
--
-- Deliberately decoupled from `profiles`: most learners never create a Supabase account
-- (see docs/CLAUDE.md, checkout-first flow -  buyers go straight to Graphy checkout), so keying
-- these off auth.users would silently drop most of Graphy's data, same as the old
-- `profiles`-only sync did. Instead `graphy_learners` is its own identity table keyed by
-- email and upserted from EVERY event that mentions a learner, not just profile events -
-- join to `profiles.email` when you need the Supabase side too.
-- ============================================================================

create table if not exists public.graphy_learners (
  id bigint generated always as identity primary key,
  graphy_learner_id text unique, -- Graphy's own learner id, once a payload confirms the field name
  email text not null unique,
  name text,
  role text,
  mobile_number text,
  work_experience text,
  source text,
  utm_source text,
  segment text,
  lead_status text,
  referral_code text,
  referral_code_used text,
  credits numeric,
  telegram_name text,
  marketing_consent boolean,
  marketing_consent_at timestamptz,
  graphy_created_at timestamptz,
  graphy_last_login_at timestamptz,
  state text, -- e.g. "Karnataka (29)" -  from the Graphy API /learners feed
  active boolean,
  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_event_type text,
  raw_payload jsonb -- most recent raw payload seen for this learner, for debugging/back-mapping
);
alter table public.graphy_learners enable row level security; -- service-role only, no policies
alter table public.graphy_learners add column if not exists state text;
alter table public.graphy_learners add column if not exists active boolean;

create table if not exists public.graphy_enrollments (
  id bigint generated always as identity primary key,
  graphy_enrollment_id text,
  learner_email text not null references public.graphy_learners (email) on delete cascade,
  course_id text,
  course_name text,
  product_id text,
  amount numeric,
  currency text,
  enrolled_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  -- Keyed on course_name, not course_id: the webhook's "Course Link" gives an inconsistent id
  -- (sometimes a real id, sometimes a slug), while course_name ("AWS Full Course") is identical
  -- between the webhook and the Graphy API sync, so both write to the same row.
  unique (learner_email, course_name)
);
alter table public.graphy_enrollments enable row level security;

-- Retrofit: older databases created this table with unique(learner_email, course_id).
alter table public.graphy_enrollments drop constraint if exists graphy_enrollments_learner_email_course_id_key;
alter table public.graphy_enrollments drop constraint if exists graphy_enrollments_learner_email_course_name_key;
alter table public.graphy_enrollments add constraint graphy_enrollments_learner_email_course_name_key unique (learner_email, course_name);

create table if not exists public.graphy_transactions (
  id bigint generated always as identity primary key,
  -- Nullable: confirmed from real deliveries that "Init Transaction" carries no order/transaction id
  -- at all (only "Success Transaction V2" does, as "Order Id") -  a plain unique constraint still
  -- dedupes real ids fine since Postgres never treats two NULLs as conflicting.
  graphy_transaction_id text unique,
  learner_email text references public.graphy_learners (email) on delete set null,
  course_id text,
  course_name text,
  product_id text,
  product_name text, -- the membership/plan name, e.g. "Free Plan" / "Paid Plan" (from Items[].title)
  amount numeric,
  currency text,
  status text not null, -- 'initiated' | 'success'
  initiated_at timestamptz,
  completed_at timestamptz,
  raw_payload jsonb,
  updated_at timestamptz not null default now()
);
alter table public.graphy_transactions enable row level security;

-- Retrofit for a database where graphy_transactions already existed before this fix (safe to
-- re-run: drop not null / add column if not exists are both no-ops once applied).
alter table public.graphy_transactions alter column graphy_transaction_id drop not null;
alter table public.graphy_transactions add column if not exists course_name text;
alter table public.graphy_transactions add column if not exists product_name text;
alter table public.graphy_transactions add column if not exists channel text; -- 'web' / 'android' / ...
alter table public.graphy_transactions add column if not exists gateway_txn_id text; -- Graphy "TXNID" (payment gateway ref), distinct from ORDERID
alter table public.graphy_transactions add column if not exists place_of_supply text; -- e.g. "Karnataka (29)"

-- Course catalogue mirror (Graphy API /products) -  reference data for the analytics project, and
-- what graphy_enrollments.course_id / graphy_transactions.product_id point at.
create table if not exists public.graphy_products (
  id text primary key, -- Graphy's own product id
  title text,
  price numeric,
  discounted_price numeric,
  instructor text,
  language text,
  category text[],
  tags text[],
  graphy_created_at timestamptz,
  graphy_modified_at timestamptz,
  synced_at timestamptz not null default now(),
  raw_payload jsonb
);
alter table public.graphy_products enable row level security;

create table if not exists public.graphy_course_progress (
  id bigint generated always as identity primary key,
  learner_email text references public.graphy_learners (email) on delete set null,
  course_id text,
  item_id text, -- null for course-level completion, set for item-level events
  event_type text not null, -- 'course_completed' | 'item_completed' | 'course_progress'
  progress_percent numeric,
  completed_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (learner_email, course_id, item_id, event_type)
);
alter table public.graphy_course_progress enable row level security;

-- Which membership/plan a learner is on ("Free Plan" / "Paid Plan"). Distinct from
-- graphy_transactions (the payment events) and graphy_enrollments (per-course access): this is the
-- subscription tier. Fed by the Success Transaction webhook (when the purchased item is a plan, not
-- a standalone course) and by the one-off member-list backfill (scripts/import-graphy-memberships).
create table if not exists public.graphy_memberships (
  id bigint generated always as identity primary key,
  learner_email text not null references public.graphy_learners (email) on delete cascade,
  plan_name text not null, -- "Free Plan" / "Paid Plan" (Graphy's own label, may change over time)
  plan_tier text, -- 'free' | 'paid'
  plan_id text, -- Graphy membership id when known
  amount numeric,
  currency text,
  status text, -- from the member-list export (e.g. 'active'); the webhook leaves this null
  joined_at timestamptz,
  expires_at timestamptz,
  source text not null, -- 'graphy_webhook' | 'graphy_csv_backfill'
  raw_payload jsonb,
  synced_at timestamptz not null default now(),
  unique (learner_email, plan_name) -- re-deliveries / re-runs upsert in place
);
alter table public.graphy_memberships enable row level security;

create table if not exists public.graphy_certificates (
  id bigint generated always as identity primary key,
  learner_email text references public.graphy_learners (email) on delete set null,
  course_id text,
  certificate_id text,
  downloaded_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);
alter table public.graphy_certificates enable row level security;

-- Point the audit trail at the new identity table too (matched_profile_id stays for the
-- legacy profiles-only lookup).
alter table public.graphy_webhook_events add column if not exists matched_learner_id bigint references public.graphy_learners (id);

-- ============================================================================
-- graphy_leads: one denormalized row per learner, kept live by the triggers below
-- and mirrored into the "Graphy Leads" Google Sheet in real time via a Supabase
-- Database Webhook -> scripts/graphy-leads-sheet.gs (no daily/cron sync involved).
-- Every column except lsq_synced_at is fully derived from graphy_learners /
-- graphy_memberships / graphy_enrollments / graphy_transactions -  never write those
-- directly. lsq_synced_at is the one exception: it's owned by the LeadSquared sync
-- (app/api/cron/sync-leads-to-lsq, scheduled via .github/workflows/sync-leads-to-lsq.yml)
-- and untouched by refresh_graphy_lead below, so recomputing a row never clobbers it.
-- ============================================================================

create table if not exists public.graphy_leads (
  email text primary key references public.graphy_learners (email) on delete cascade,
  name text,
  phone text,
  work_experience text,
  role text,
  membership_plan text, -- comma-joined plan_name(s) from graphy_memberships
  courses_enrolled text, -- comma-joined course_name(s) from graphy_enrollments
  course_count integer not null default 0,
  graphy_created_at timestamptz,
  graphy_last_login_at timestamptz,
  last_synced_at timestamptz,
  total_paid numeric not null default 0, -- sum of graphy_transactions.amount where status = 'success'
  row_updated_at timestamptz not null default now()
);
alter table public.graphy_leads enable row level security; -- service-role only, no policies

-- Null until the LeadSquared sync successfully pushes this lead (set only on a confirmed 2xx from
-- LeadSquared, never speculatively) -  lets the sync pick up exactly where it left off and never
-- double-send. NOT touched by refresh_graphy_lead's upsert (see comment above), so recomputing this
-- row for an unrelated reason (a new enrollment, say) never resets it back to null.
alter table public.graphy_leads add column if not exists lsq_synced_at timestamptz;

-- Recomputes one learner's graphy_leads row from scratch. Called by the trigger functions
-- below whenever any source table changes for that learner_email.
create or replace function public.refresh_graphy_lead(p_email text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.graphy_learners where email = p_email) then
    delete from public.graphy_leads where email = p_email;
    return;
  end if;

  insert into public.graphy_leads (
    email, name, phone, work_experience, role, membership_plan,
    courses_enrolled, course_count, graphy_created_at, graphy_last_login_at,
    last_synced_at, total_paid, row_updated_at
  )
  select
    l.email,
    l.name,
    l.mobile_number,
    l.work_experience,
    l.role,
    (select string_agg(distinct m.plan_name, ', ' order by m.plan_name)
       from public.graphy_memberships m where m.learner_email = l.email),
    (select string_agg(e.course_name, ', ' order by e.course_name)
       from public.graphy_enrollments e where e.learner_email = l.email),
    (select count(*) from public.graphy_enrollments e where e.learner_email = l.email),
    l.graphy_created_at,
    l.graphy_last_login_at,
    l.last_synced_at,
    coalesce((select sum(t.amount) from public.graphy_transactions t
                where t.learner_email = l.email and t.status = 'success'), 0),
    now()
  from public.graphy_learners l
  where l.email = p_email
  on conflict (email) do update set
    name = excluded.name,
    phone = excluded.phone,
    work_experience = excluded.work_experience,
    role = excluded.role,
    membership_plan = excluded.membership_plan,
    courses_enrolled = excluded.courses_enrolled,
    course_count = excluded.course_count,
    graphy_created_at = excluded.graphy_created_at,
    graphy_last_login_at = excluded.graphy_last_login_at,
    last_synced_at = excluded.last_synced_at,
    total_paid = excluded.total_paid,
    row_updated_at = now();
end;
$$;

create or replace function public.trg_refresh_graphy_lead_from_learners()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_graphy_lead(old.email);
    return old;
  end if;
  perform public.refresh_graphy_lead(new.email);
  return new;
end;
$$;

drop trigger if exists graphy_learners_refresh_lead on public.graphy_learners;
create trigger graphy_learners_refresh_lead
  after insert or update or delete on public.graphy_learners
  for each row execute procedure public.trg_refresh_graphy_lead_from_learners();

create or replace function public.trg_refresh_graphy_lead_from_child()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_graphy_lead(old.learner_email);
    return old;
  end if;
  perform public.refresh_graphy_lead(new.learner_email);
  return new;
end;
$$;

drop trigger if exists graphy_memberships_refresh_lead on public.graphy_memberships;
create trigger graphy_memberships_refresh_lead
  after insert or update or delete on public.graphy_memberships
  for each row execute procedure public.trg_refresh_graphy_lead_from_child();

drop trigger if exists graphy_enrollments_refresh_lead on public.graphy_enrollments;
create trigger graphy_enrollments_refresh_lead
  after insert or update or delete on public.graphy_enrollments
  for each row execute procedure public.trg_refresh_graphy_lead_from_child();

drop trigger if exists graphy_transactions_refresh_lead on public.graphy_transactions;
create trigger graphy_transactions_refresh_lead
  after insert or update or delete on public.graphy_transactions
  for each row execute procedure public.trg_refresh_graphy_lead_from_child();

-- Backfill: recompute every existing learner's lead row. Safe to re-run any time.
do $$
declare r record;
begin
  for r in select email from public.graphy_learners loop
    perform public.refresh_graphy_lead(r.email);
  end loop;
end $$;


-- ============================================================================
-- payment_mode: how a payment was made -  'online' (Razorpay/gateway), 'manual' (an admin recorded
-- it by hand in Graphy: cash / bank transfer / direct UPI), 'free' (₹0 plan/course). NULL = unknown
-- or not a payment (e.g. an 'initiated' checkout, or a webhook delivery that doesn't carry the
-- signal yet -  the next `npm run sync:graphy` fills it in).
-- Derived from the stored Graphy transaction JSON (raw_payload), by a BEFORE trigger, so every write
-- path (webhook, sync script, CSV import) gets it with no app-code changes. Safe to re-run.
-- ============================================================================
alter table public.graphy_transactions add column if not exists payment_mode text;
alter table public.graphy_memberships add column if not exists payment_mode text;

alter table public.graphy_transactions drop constraint if exists graphy_transactions_payment_mode_check;
alter table public.graphy_transactions add constraint graphy_transactions_payment_mode_check
  check (payment_mode in ('online', 'manual', 'free'));
alter table public.graphy_memberships drop constraint if exists graphy_memberships_payment_mode_check;
alter table public.graphy_memberships add constraint graphy_memberships_payment_mode_check
  check (payment_mode in ('online', 'manual', 'free'));

create or replace function public.graphy_derive_payment_mode(p jsonb, p_status text, p_amount numeric, p_tier text)
returns text language sql immutable as $$
  select case
    when p_status = 'initiated' then null
    when p->>'manualTransaction' = 'true' then 'manual'
    when coalesce(p->>'TXNID', 'NA') not in ('NA', '') then 'online'  -- gateway ref, e.g. pay_XXXX
    when p_tier = 'free' or p_amount = 0 then 'free'
    else null
  end
$$;

create or replace function public.trg_set_graphy_payment_mode()
returns trigger language plpgsql as $$
declare derived text;
begin
  if tg_table_name = 'graphy_memberships' then
    derived := public.graphy_derive_payment_mode(new.raw_payload, new.status, new.amount, new.plan_tier);
  else
    derived := public.graphy_derive_payment_mode(new.raw_payload, new.status, new.amount, null);
  end if;
  -- never blank out a mode we already know because a thinner payload (webhook) arrived later
  new.payment_mode := coalesce(derived, new.payment_mode);
  return new;
end;
$$;

drop trigger if exists graphy_transactions_set_payment_mode on public.graphy_transactions;
create trigger graphy_transactions_set_payment_mode
  before insert or update on public.graphy_transactions
  for each row execute procedure public.trg_set_graphy_payment_mode();

drop trigger if exists graphy_memberships_set_payment_mode on public.graphy_memberships;
create trigger graphy_memberships_set_payment_mode
  before insert or update on public.graphy_memberships
  for each row execute procedure public.trg_set_graphy_payment_mode();

-- Backfill existing rows (the update itself runs the trigger above).
update public.graphy_transactions set payment_mode = payment_mode where payment_mode is null;
update public.graphy_memberships set payment_mode = payment_mode where payment_mode is null;


-- ============================================================================
-- Promo codes: the code a learner applied at Graphy checkout, so we can track which codes
-- convert. Graphy sends it as "Promo Code" on transaction webhooks and as promocode (+ promoDiscount,
-- totalWOPromo) in the API/sync payload. Derived from raw_payload by a BEFORE trigger, so webhook,
-- sync and CSV paths all get it with no app-code changes. 'initiated' checkouts carry it too -
-- filter status = 'success' for who actually paid. Safe to re-run.
-- ============================================================================
alter table public.graphy_transactions add column if not exists promo_code text;
alter table public.graphy_transactions add column if not exists promo_discount numeric;      -- rupees taken off
alter table public.graphy_transactions add column if not exists amount_before_promo numeric; -- price before the code

create or replace function public.graphy_num(v text)
returns numeric language sql immutable as $$
  select case when v ~ '^\s*-?\d+(\.\d+)?\s*$' then v::numeric else null end
$$;

create or replace function public.trg_set_graphy_promo()
returns trigger language plpgsql as $$
declare
  code text;
  disc numeric;
  wo numeric;
begin
  code := upper(nullif(btrim(coalesce(new.raw_payload->>'promocode', new.raw_payload->>'Promo Code', '')), ''));
  disc := public.graphy_num(new.raw_payload->>'promoDiscount');
  wo   := public.graphy_num(new.raw_payload->>'totalWOPromo');
  -- never blank out values we already know because a thinner payload (webhook) arrived later
  new.promo_code := coalesce(code, new.promo_code);
  new.promo_discount := coalesce(disc, new.promo_discount);
  new.amount_before_promo := coalesce(wo, new.amount_before_promo);
  return new;
end;
$$;

drop trigger if exists graphy_transactions_set_promo on public.graphy_transactions;
create trigger graphy_transactions_set_promo
  before insert or update on public.graphy_transactions
  for each row execute procedure public.trg_set_graphy_promo();

create index if not exists graphy_transactions_promo_code_idx
  on public.graphy_transactions (promo_code) where promo_code is not null;

-- Backfill existing rows (the update itself runs the trigger above).
update public.graphy_transactions set promo_code = promo_code
  where promo_code is null and (raw_payload ? 'promocode' or raw_payload ? 'Promo Code');
