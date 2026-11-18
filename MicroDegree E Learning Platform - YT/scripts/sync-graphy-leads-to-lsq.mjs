// Manual fallback for app/api/cron/sync-leads-to-lsq -  the scheduled job (daily, via
// .github/workflows/sync-leads-to-lsq.yml) is the normal way this runs. Use this script only if you
// want to trigger a push by hand (e.g. you suspect the scheduled run failed and don't want to wait
// for the next one). Same eligibility rule as the route: a lead is only pushed once its
// graphy_created_at is both on/after ARRIVAL_FLOOR and at least ARRIVAL_DELAY_DAYS days old, has a
// phone number, and hasn't already been synced. Safe to re-run any time.
//
//   node --env-file=.env.local scripts/sync-graphy-leads-to-lsq.mjs
//
// Needs LEADSQUARED_ACCESS_KEY / LEADSQUARED_SECRET_KEY / LEADSQUARED_API_HOST and the Supabase
// service-role key.
//
// Identity is decided by PHONE NUMBER, not email -  see app/api/cron/sync-leads-to-lsq/route.ts's
// file header for the full reasoning (confirmed via LeadSquared's RetrieveLeadByPhoneNumber, which
// checks both the Phone and Mobile fields of every existing lead). Keep this file's logic in sync
// with that route -  no shared module between a Next.js route and a plain Node script.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LSQ_ACCESS_KEY = process.env.LEADSQUARED_ACCESS_KEY;
const LSQ_SECRET_KEY = process.env.LEADSQUARED_SECRET_KEY;
const LSQ_API_HOST = process.env.LEADSQUARED_API_HOST;

if (!SUPABASE_URL || !SERVICE_ROLE || !LSQ_ACCESS_KEY || !LSQ_SECRET_KEY || !LSQ_API_HOST) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / LEADSQUARED_ACCESS_KEY / LEADSQUARED_SECRET_KEY / LEADSQUARED_API_HOST");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

const ARRIVAL_FLOOR = "2026-08-28T00:00:00.000Z"; // leads before this are never sent, per the business ask
const ARRIVAL_DELAY_DAYS = 7;

// Confirmed against the real lead schema (fetched via Leads.Get) on 2026-09-16. Deliberately excludes
// "Lead Source" (left untouched, per the owner's explicit request) -  only "Recent Lead Source" is set.
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
function recentLeadSource(membershipPlan) {
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

// Our phone numbers are stored E.164 (+91XXXXXXXXXX); LeadSquared's phone fields want the bare
// 10-digit number, no country code, per an explicit ask.
function stripIndiaCountryCode(phone) {
  return phone.replace(/^\+91[-\s]?/, "");
}

function lsqAuthParams() {
  return `accessKey=${encodeURIComponent(LSQ_ACCESS_KEY)}&secretKey=${encodeURIComponent(LSQ_SECRET_KEY)}`;
}

// LeadSquared enforces 15 API calls per 5 seconds per account -  see the route's file header for
// the 2026-09-28 incident this guards against. One retry after the 5s window resets recovers a
// transient 429 instead of failing a real lead.
async function lsqRequest(url, init) {
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

// Checks BOTH Phone and Mobile across every existing lead. Returns the matching lead's
// ProspectID (the only reliable key -  some real leads have no EmailAddress at all), or null if
// this number has never been seen before.
async function findExistingLeadId(phone) {
  const url = `https://${LSQ_API_HOST}/v2/LeadManagement.svc/RetrieveLeadByPhoneNumber?${lsqAuthParams()}&phone=${encodeURIComponent(phone)}`;
  const res = await lsqRequest(url);
  if (!res.ok) return { ...res, prospectId: null };
  try {
    const matches = JSON.parse(res.text);
    return { ...res, prospectId: matches[0]?.ProspectID ?? null };
  } catch {
    return { ok: false, status: res.status, text: `unparseable response: ${res.text.slice(0, 200)}`, prospectId: null };
  }
}

async function captureLead(fields) {
  const url = `https://${LSQ_API_HOST}/v2/LeadManagement.svc/Lead.Capture?${lsqAuthParams()}`;
  const body = Object.entries(fields).map(([Attribute, Value]) => ({ Attribute, Value }));
  return lsqRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Updates a lead directly by ProspectID -  works even when the lead has no EmailAddress on file.
// Only ever sends Recent Lead Source.
async function updateLeadSourceById(prospectId, source) {
  const url = `https://${LSQ_API_HOST}/v2/LeadManagement.svc/Lead.Update?${lsqAuthParams()}&leadId=${encodeURIComponent(prospectId)}`;
  const body = [{ Attribute: CUSTOM_FIELD.recentLeadSource, Value: source }];
  return lsqRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function pushLead(row) {
  const source = recentLeadSource(row.membership_plan);
  const phone = row.phone ? stripIndiaCountryCode(row.phone) : null;

  if (phone) {
    const lookup = await findExistingLeadId(phone);
    if (!lookup.ok) {
      return { ok: false, status: lookup.status, text: lookup.text, matched: "existing" };
    }
    if (lookup.prospectId) {
      const result = await updateLeadSourceById(lookup.prospectId, source);
      return { ...result, matched: "existing" };
    }
  }

  const fields = {
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

  // A malformed number is rejected by LeadSquared on every attempt, which would wedge this lead -
  // and the whole job - forever. Create the lead by email without the bad phone instead of failing.
  if (first.text.includes("Invalid Phone format")) {
    delete fields.Phone;
    delete fields.Mobile;
    first = await captureLead(fields);
    if (first.ok) return { ...first, matched: "new" };
  }

  if (first.text.includes("MXDuplicateEntryException") && phone) {
    const recheck = await findExistingLeadId(phone);
    if (recheck.prospectId) {
      const result = await updateLeadSourceById(recheck.prospectId, source);
      return { ...result, matched: "existing" };
    }
  }

  return { ...first, matched: "new" };
}

async function fetchEligibleLeads(cutoff) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const { data, error } = await db
      .from("graphy_leads")
      .select("email,name,phone,work_experience,membership_plan,courses_enrolled")
      .is("lsq_synced_at", null)
      .not("graphy_created_at", "is", null)
      .gte("graphy_created_at", ARRIVAL_FLOOR)
      .lte("graphy_created_at", cutoff)
      .not("phone", "is", null) // per the business ask: leads with no phone number never get sent
      .neq("phone", "")
      .order("graphy_created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  const cutoff = new Date(Date.now() - ARRIVAL_DELAY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const leads = await fetchEligibleLeads(cutoff);
  console.log(`${leads.length} lead(s) eligible (arrived ${ARRIVAL_FLOOR.slice(0, 10)}..${cutoff.slice(0, 10)}, not yet synced). Pushing...\n`);

  let matchedExisting = 0;
  let createdNew = 0;
  let failed = 0;
  for (const row of leads) {
    const result = await pushLead(row);
    if (result.ok) {
      const { error } = await db.from("graphy_leads").update({ lsq_synced_at: new Date().toISOString() }).eq("email", row.email);
      if (error) {
        failed++;
        console.error(`PUSHED but failed to mark synced ${row.email}: ${error.message}`);
      } else if (result.matched === "existing") {
        matchedExisting++;
      } else {
        createdNew++;
      }
    } else {
      failed++;
      console.error(`FAILED ${row.email}: ${result.status} ${result.text}`);
    }
  }

  console.log(`\nDone. matchedExisting=${matchedExisting} createdNew=${createdNew} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
