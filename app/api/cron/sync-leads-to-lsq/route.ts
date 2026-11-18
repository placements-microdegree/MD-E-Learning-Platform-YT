import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// Scheduled (NOT real-time) push of public.graphy_leads rows into LeadSquared. Triggered by
// .github/workflows/sync-leads-to-lsq.yml on a daily cron -  this replaced an earlier design that
// pushed on every Supabase Database Webhook INSERT/UPDATE, per an explicit business requirement:
// a lead must NOT show up in LeadSquared the moment they sign up on Graphy, only ARRIVAL_DELAY_DAYS
// days after their graphy_created_at. Leads that signed up before ARRIVAL_FLOOR are permanently
// excluded -  never backfilled, not just delayed. Leads with no phone number at all are never sent,
// per a separate explicit ask.
//
// Identity is decided by PHONE NUMBER, not email -  explicit business requirement. Before ever
// creating or updating anything, every push first calls LeadSquared's RetrieveLeadByPhoneNumber
// (https://apidocs.leadsquared.com/get-lead-by-phone/), which checks BOTH the Phone and Mobile
// fields of every existing lead (confirmed by live testing against this account on 2026-09-23,
// not just the docs -  a number stored only in another lead's Mobile field, with Phone null, was
// found correctly). Two outcomes:
//   - A match is found -> that lead already represents this person, however they first entered
//     LeadSquared (an ad form under a different email, a call-center entry with no email at all,
//     a prior Graphy sync, whatever). We ONLY update its Recent Lead Source -  nothing else on
//     that lead is touched, per an explicit ask. Updated via Lead.Update?leadId=<ProspectID>
//     (https://apidocs.leadsquared.com/update-a-lead/), NOT the email-keyed Lead.Capture -  found
//     the hard way on 2026-09-25: several real (some already "Customer (Closed)") leads matched by
//     phone/mobile have NO EmailAddress on file at all, so an email-keyed update silently can't
//     find them, falls through to "create new," which then fails with a duplicate-phone error
//     every single time (same 4 leads retried 48 times in one workflow run, remaining stuck at 4
//     forever, until this fix). ProspectID always exists once a lead is found, so it's the only
//     reliable key here.
//   - No match -> this phone number has never been seen anywhere in LeadSquared. We create/update
//     a lead under the graphy email itself, with Phone, Mobile (both, so a future lookup finds it
//     via either column), name, work experience, course, and Recent Lead Source all populated.
// Either way graphy_leads.lsq_synced_at gets set once handled, so this row is never reprocessed -
// regardless of which LeadSquared lead actually ended up owning the update.
//
// No separate backfill step exists or is needed: the very first scheduled run already catches
// everyone eligible, and every run after that picks up whoever newly crossed the day-7 line.
// lsq_synced_at is what makes this safe to run repeatedly -  it's only set after a CONFIRMED
// successful LeadSquared response, so a failed push (or an entire failed run) just gets retried
// automatically on the next scheduled run. Nothing is ever silently lost, only delayed further.
//
// Processes at most BATCH_LIMIT leads per call and reports how many are still eligible
// ("remaining"), so the calling workflow can loop until the queue is fully drained without any
// single request risking a serverless function timeout on a large backlog.
//
// Keep everything below in sync with scripts/sync-graphy-leads-to-lsq.mjs (the manual fallback
// version of this same job -  no shared module between a Next.js route and a plain script).

const ARRIVAL_FLOOR = "2026-08-28T00:00:00.000Z"; // leads before this are never sent, per the business ask
const ARRIVAL_DELAY_DAYS = 7;
const BATCH_LIMIT = 15; // each lead costs up to 2 LeadSquared calls (search + capture); keep this modest

// Leads are pushed sequentially (~2 LeadSquared round trips each), so a full batch can outlast the
// host's function timeout (Netlify's default is 10s) and surface as a 504 "Inactivity Timeout" in
// the workflow (2026-10-06). Stop starting new leads after this budget; unprocessed ones are simply
// picked up by the next call. Leaves headroom for the lead in flight and the remaining-count query.
const TIME_BUDGET_MS = 5000;

const CUSTOM_FIELD = {
  recentLeadSource: "mx_Recent_Lead_Source",
  workExperience: "mx_Work_Experience",
  course: "mx_Course",
};

// "Graphy - Leads" + tier + source suffix, per the business ask:
//   Free Plan -> "- F"   Free Plus -> "- F - YT"   Free Resources -> "- F - RS"
//   Paid Plan -> "- P"   Premium Plus -> "- P - YT"   Premium Resources -> "- P - RS"
//   Organic Free -> "- F - Organic"   Organic Paid -> "- P - Organic"
// No plan yet (no graphy_memberships row) gets the bare value. membershipPlan is the comma-joined
// plan_name list, so a learner on several plans is resolved by precedence: Paid beats Free (the
// current, more specific state), then within a tier the source tag wins (Organic > YT > RS > plain) so the
// attribution isn't lost. Keep in sync with scripts/sync-graphy-leads-to-lsq.mjs.
function recentLeadSource(membershipPlan: string | null): string {
  let best = { rank: 0, label: "Graphy - Leads" };
  for (const name of (membershipPlan ?? "").toLowerCase().split(",")) {
    const paid = name.includes("paid") || name.includes("premium");
    if (!paid && !name.includes("free")) continue;
    const tag = name.includes("organic") ? "Organic" : name.includes("plus") ? "YT" : name.includes("resources") ? "RS" : "";
    const rank = (paid ? 10 : 0) + (tag === "Organic" ? 4 : tag === "YT" ? 3 : tag === "RS" ? 2 : 1);
    if (rank > best.rank) best = { rank, label: `Graphy - Leads - ${paid ? "P" : "F"}${tag ? ` - ${tag}` : ""}` };
  }
  return best.label;
}

function isAuthorized(request: Request): boolean {
  const { searchParams } = new URL(request.url);
  const provided = searchParams.get("secret") ?? "";
  const expected = env.leadSquaredSyncSecret;

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

type GraphyLeadRow = {
  email: string;
  name: string | null;
  phone: string | null;
  work_experience: string | null;
  membership_plan: string | null;
  courses_enrolled: string | null;
};

// Our phone numbers are stored E.164 (+91XXXXXXXXXX); LeadSquared's phone fields want the bare
// 10-digit number, no country code, per an explicit ask.
function stripIndiaCountryCode(phone: string): string {
  return phone.replace(/^\+91[-\s]?/, "");
}

function lsqAuthParams(): string {
  return `accessKey=${encodeURIComponent(env.leadSquaredAccessKey)}&secretKey=${encodeURIComponent(env.leadSquaredSecretKey)}`;
}

// LeadSquared enforces 15 API calls per 5 seconds per account. A batch of BATCH_LIMIT leads can
// cost up to 2 calls each (search + capture/update), and the calling workflow loops this route
// with no gap between invocations -  so a burst can trip MXAPIRateLimitExceededException even
// though every individual request is well-formed (confirmed 2026-09-28: 2 real leads failed
// outright on a single 429 mid-batch). One retry after the 5s window resets recovers it instead
// of failing a real lead for a transient limit.
async function lsqRequest(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await fetch(url, init);
  if (res.status !== 429) {
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  }
  const retryAfterHeader = Number(res.headers.get("retry-after"));
  const waitMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader * 1000 : 5000;
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  const retryRes = await fetch(url, init);
  const text = await retryRes.text();
  return { ok: retryRes.ok, status: retryRes.status, text };
}

// Checks BOTH Phone and Mobile across every existing lead (see file header). Returns the matching
// lead's ProspectID (the only reliable key -  some real leads have no EmailAddress at all), or null
// if this number has never been seen before.
async function findExistingLeadId(phone: string): Promise<{ ok: boolean; status: number; text: string; prospectId: string | null }> {
  const url = `https://${env.leadSquaredApiHost}/v2/LeadManagement.svc/RetrieveLeadByPhoneNumber?${lsqAuthParams()}&phone=${encodeURIComponent(phone)}`;
  const res = await lsqRequest(url);
  if (!res.ok) return { ...res, prospectId: null };
  try {
    const matches = JSON.parse(res.text) as Array<{ ProspectID?: string }>;
    return { ...res, prospectId: matches[0]?.ProspectID ?? null };
  } catch {
    return { ok: false, status: res.status, text: `unparseable response: ${res.text.slice(0, 200)}`, prospectId: null };
  }
}

async function captureLead(fields: Record<string, string>): Promise<{ ok: boolean; status: number; text: string }> {
  const url = `https://${env.leadSquaredApiHost}/v2/LeadManagement.svc/Lead.Capture?${lsqAuthParams()}`;
  const body = Object.entries(fields).map(([Attribute, Value]) => ({ Attribute, Value }));
  return lsqRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Updates a lead directly by ProspectID -  works even when the lead has no EmailAddress on file
// (see file header for why that matters here). Only ever sends Recent Lead Source.
async function updateLeadSourceById(prospectId: string, source: string): Promise<{ ok: boolean; status: number; text: string }> {
  const url = `https://${env.leadSquaredApiHost}/v2/LeadManagement.svc/Lead.Update?${lsqAuthParams()}&leadId=${encodeURIComponent(prospectId)}`;
  const body = [{ Attribute: CUSTOM_FIELD.recentLeadSource, Value: source }];
  return lsqRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

type PushOutcome = { ok: boolean; status: number; text: string; matched: "existing" | "new" };

async function pushLead(row: GraphyLeadRow): Promise<PushOutcome> {
  const source = recentLeadSource(row.membership_plan);
  const phone = row.phone ? stripIndiaCountryCode(row.phone) : null;

  if (phone) {
    const lookup = await findExistingLeadId(phone);
    if (!lookup.ok) {
      return { ok: false, status: lookup.status, text: lookup.text, matched: "existing" };
    }
    if (lookup.prospectId) {
      // Already a lead somewhere in LeadSquared under this phone/mobile number -  touch ONLY
      // Recent Lead Source, nothing else, regardless of whether it even has an email on file.
      const result = await updateLeadSourceById(lookup.prospectId, source);
      return { ...result, matched: "existing" };
    }
  }

  // Genuinely new phone number (or no phone, though eligibility already excludes that case) -
  // create/update under the graphy email itself, with everything we have.
  const fields: Record<string, string> = {
    EmailAddress: row.email,
    [CUSTOM_FIELD.recentLeadSource]: source,
  };
  if (row.name) fields.FirstName = row.name;
  if (phone) {
    fields.Phone = phone;
    fields.Mobile = phone;
  }
  if (row.work_experience) fields[CUSTOM_FIELD.workExperience] = row.work_experience;
  const course = row.courses_enrolled || row.membership_plan;
  if (course) fields[CUSTOM_FIELD.course] = course;

  let first = await captureLead(fields);
  if (first.ok) return { ...first, matched: "new" };

  // A malformed number (e.g. a landline or a stray digit count) is rejected by LeadSquared on every
  // attempt, which would wedge this lead -  and the whole job -  forever. Create the lead by email
  // without the bad phone instead of failing.
  if (first.text.includes("Invalid Phone format")) {
    delete fields.Phone;
    delete fields.Mobile;
    first = await captureLead(fields);
    if (first.ok) return { ...first, matched: "new" };
  }

  // Rare race: the number got taken by someone else between our search and this write. Re-search
  // once more and fall back to the "existing" path rather than fail outright.
  if (first.text.includes("MXDuplicateEntryException") && phone) {
    const recheck = await findExistingLeadId(phone);
    if (recheck.prospectId) {
      const result = await updateLeadSourceById(recheck.prospectId, source);
      return { ...result, matched: "existing" };
    }
  }

  return { ...first, matched: "new" };
}

// Applies the shared "eligible for LeadSquared" filters to whatever .select() the caller already
// chose -  kept as one function so the fetch and the remaining-count check can never drift apart.
function withEligibilityFilters<T extends { is: Function; not: Function; gte: Function; lte: Function; neq: Function }>(
  query: T,
  cutoff: string,
): T {
  return query
    .is("lsq_synced_at", null)
    .not("graphy_created_at", "is", null)
    .gte("graphy_created_at", ARRIVAL_FLOOR)
    .lte("graphy_created_at", cutoff)
    .not("phone", "is", null) // per the business ask: leads with no phone number never get sent
    .neq("phone", "");
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const cutoff = new Date(Date.now() - ARRIVAL_DELAY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();

  const { data: rows, error } = await withEligibilityFilters(
    admin.from("graphy_leads").select("email,name,phone,work_experience,membership_plan,courses_enrolled"),
    cutoff,
  )
    .order("graphy_created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let matchedExisting = 0;
  let createdNew = 0;
  const failedEmails: string[] = [];

  let processed = 0;
  for (const row of rows ?? []) {
    // Stop starting new leads once the budget is spent; the rest stay unsynced and the workflow's
    // next call picks them up (remaining > 0, and it shrinks every call so no "no progress" trip).
    if (processed > 0 && Date.now() - startedAt > TIME_BUDGET_MS) break;
    processed++;
    const result = await pushLead(row as GraphyLeadRow);
    if (result.ok) {
      await admin.from("graphy_leads").update({ lsq_synced_at: new Date().toISOString() }).eq("email", row.email);
      if (result.matched === "existing") matchedExisting++;
      else createdNew++;
    } else {
      failedEmails.push(`${row.email}: ${result.status} ${result.text.slice(0, 200)}`);
      console.error("LeadSquared push failed", row.email, result.status, result.text);
    }
  }

  const { count: remaining } = await withEligibilityFilters(
    admin.from("graphy_leads").select("email", { count: "exact", head: true }),
    cutoff,
  );

  return NextResponse.json({
    processedThisCall: processed,
    ok: matchedExisting + createdNew,
    matchedExisting, // updated an already-existing LeadSquared lead's Recent Lead Source only
    createdNew, // created/updated a lead under the graphy email with full fields
    failed: failedEmails.length,
    remaining: remaining ?? 0,
    failedEmails,
  });
}

// Lets you (or a monitoring dashboard) sanity-check the route is deployed and reachable with a
// plain GET -  doesn't process anything, no secret required.
export async function GET() {
  return NextResponse.json({ ok: true });
}
