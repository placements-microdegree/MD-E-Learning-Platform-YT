// Full pull from the Graphy public API (https://api.ongraphy.com/public/v1) into Supabase -  a
// complete backfill / periodic reconcile so the DB is a clean copy of Graphy regardless of what the
// webhooks caught. Idempotent (everything upserts). The webhooks remain the real-time layer on top.
//
//   node --env-file=.env.local scripts/sync-graphy.mjs
//
// Needs GRAPHY_MERCHANT_ID + GRAPHY_API_KEY (Graphy -> Settings -> Integration API) and the Supabase
// service-role key. The API exposes /products, /learners, /transactions; enrollments and memberships
// are derived from the transaction items (there are no dedicated endpoints for them).
import { createClient } from "@supabase/supabase-js";

const API = "https://api.ongraphy.com/public/v1";
const MID = process.env.GRAPHY_MERCHANT_ID;
const KEY = process.env.GRAPHY_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Membership product ids, parsed out of the checkout links (same logic as lib/env.ts).
const membershipId = (url) => url?.match(/membership\/([a-z0-9]+)/i)?.[1];
const PLAN_IDS = {
  [membershipId(process.env.GRAPHY_FREE_COURSE_URL) ?? "__none_free"]: "free",
  [membershipId(process.env.GRAPHY_COURSE_CHECKOUT_URL) ?? "__none_paid"]: "paid",
  [membershipId(process.env.GRAPHY_E_LEARNING_FREE_COURSE_URL) ?? "__none_free_e"]: "free",
  [membershipId(process.env.GRAPHY_E_LEARNING_CHECKOUT_URL) ?? "__none_paid_e"]: "paid",
  [membershipId(process.env.GRAPHY_ORGANIC_FREE_COURSE_URL) ?? "__none_free_o"]: "free",
  [membershipId(process.env.GRAPHY_ORGANIC_CHECKOUT_URL) ?? "__none_paid_o"]: "paid",
};

// Memberships added later (Free Plus, Free Resources, Premium Resources/Plus) have no env link, so
// fall back to the title, same rule as membershipTierFromName in lib/graphyWebhook.ts.
//   free: Free Plan, Free Plus, Free Resources    paid: Paid Plan, Premium Resources, Premium Plus
const tierFromName = (title = "") => {
  const organic = title.trim().match(/^organic\s+(free|paid)\b/i); // Organic Free / Organic Paid
  if (organic) return organic[1].toLowerCase() === "free" ? "free" : "paid";
  const m = title.trim().match(/^(free|paid|premium)\b.*\b(plan|plus|resources)\b/i);
  return m ? (m[1].toLowerCase() === "free" ? "free" : "paid") : undefined;
};
const planTier = (item) => PLAN_IDS[item.id] ?? tierFromName(item.title);

if (!MID || !KEY || !SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing GRAPHY_MERCHANT_ID / GRAPHY_API_KEY / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });

const iso = (v) => {
  if (!v) return undefined;
  const d = new Date(typeof v === "object" && v.$date ? v.$date : v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/** Last-write-wins de-dupe on a key -  Postgres upsert rejects the same conflict key twice in one call. */
const dedupe = (rows, keyFn) => {
  const m = new Map();
  for (const r of rows) m.set(keyFn(r), r);
  return [...m.values()];
};

async function apiPage(resource, skip, limit = 100) {
  const res = await fetch(`${API}/${resource}?mid=${MID}&key=${KEY}&limit=${limit}&skip=${skip}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`${resource} skip=${skip}: HTTP ${res.status} ${text}`);
  const body = JSON.parse(text);
  // Graphy returns HTTP 200 with an {error} body for bad credentials/params - res.ok alone won't catch it.
  if (body.error) throw new Error(`${resource} skip=${skip}: ${body.error.message ?? JSON.stringify(body.error)}`);
  return body;
}

/** Pull every page of a list endpoint. */
async function apiAll(resource) {
  const first = await apiPage(resource, 0);
  const total = first.total ?? first.data?.length ?? 0;
  const rows = [...(first.data ?? [])];
  const limit = first.limit || 100;
  for (let skip = limit; skip < total; skip += limit) {
    const page = await apiPage(resource, skip, limit);
    rows.push(...(page.data ?? []));
  }
  return rows;
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return { count: 0, error: null };
  // chunk to keep request bodies sane
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await db.from(table).upsert(chunk, onConflict ? { onConflict } : undefined);
    if (error) return { count: i, error: error.message };
  }
  return { count: rows.length, error: null };
}

async function syncProducts() {
  const products = await apiAll("products");
  const rows = products.map((p) =>
    clean({
      id: p.id,
      title: p.title,
      price: p.price,
      discounted_price: p["discounted price"],
      instructor: p.instructor,
      language: p.language,
      category: Array.isArray(p.category) ? p.category : undefined,
      tags: Array.isArray(p.tags) ? p.tags : undefined,
      graphy_created_at: iso(p["created date"]),
      graphy_modified_at: iso(p["modified date"]),
      synced_at: new Date().toISOString(),
      raw_payload: p,
    }),
  );
  const r = await upsert("graphy_products", rows, "id");
  console.log(`products:      ${r.count}${r.error ? "  ERROR: " + r.error : ""}`);
}

async function syncLearners() {
  const learners = await apiAll("learners");
  const rows = learners
    .filter((l) => l.email)
    .map((l) =>
      clean({
        email: String(l.email).toLowerCase(),
        graphy_learner_id: l.id,
        name: l.name,
        mobile_number: l.mobile || l.Mobile,
        work_experience: l["Work Experience"],
        state: l.state,
        active: typeof l.active === "boolean" ? l.active : undefined,
        graphy_created_at: iso(l["created date"]),
        graphy_last_login_at: iso(l["last login"]),
        last_synced_at: new Date().toISOString(),
        last_event_type: "graphy_api_sync",
        // deliberately NOT writing raw_payload here -  keep the richer webhook/CSV payload intact
      }),
    );
  const r = await upsert("graphy_learners", dedupe(rows, (x) => x.email), "email");
  console.log(`learners:      ${r.count} of ${learners.length}${r.error ? "  ERROR: " + r.error : ""}`);
}

async function syncTransactions() {
  const txns = await apiAll("transactions");
  // oldest first, so last-write-wins de-dupe keeps the latest state (e.g. a later refund over its success)
  txns.sort((a, b) => new Date(a.createdDate) - new Date(b.createdDate));

  // emails that had a plan refunded -  mark their membership refunded instead of active
  const refundedPlans = new Set();
  for (const t of txns) {
    if (t.status !== "refund") continue;
    for (const it of t.items ?? []) if (planTier(it)) refundedPlans.add(`${String(t.userEmail).toLowerCase()}::${it.id}`);
  }

  const txRows = [];
  const enrollRows = [];
  const memberRows = [];

  for (const t of txns) {
    const email = t.userEmail ? String(t.userEmail).toLowerCase() : undefined;
    const first = (t.items ?? [])[0] ?? {};
    const orderId = t.ORDERID && t.ORDERID !== "NA" ? t.ORDERID : t._id;
    const when = iso(t.createdDate);
    const isPlan = !!planTier(first);

    txRows.push(
      clean({
        graphy_transaction_id: orderId,
        learner_email: email,
        course_id: isPlan ? undefined : first.id,
        course_name: isPlan ? undefined : first.title,
        product_id: first.id,
        product_name: first.title,
        amount: typeof t.TXNAMOUNT === "number" ? t.TXNAMOUNT : undefined,
        currency: t.currencyCode,
        status: t.status,
        gateway_txn_id: t.TXNID && t.TXNID !== "NA" ? t.TXNID : undefined,
        channel: t.channel,
        place_of_supply: t.placeOfSupply,
        initiated_at: t.status === "initiated" ? when : undefined,
        completed_at: t.status === "success" ? when : undefined,
        raw_payload: t,
        updated_at: new Date().toISOString(),
      }),
    );

    if (t.status !== "success" || !email) continue;

    for (const it of t.items ?? []) {
      if (planTier(it)) {
        memberRows.push(
          clean({
            learner_email: email,
            plan_name: it.title,
            plan_tier: planTier(it),
            plan_id: it.id,
            amount: typeof t.TXNAMOUNT === "number" ? t.TXNAMOUNT : undefined,
            currency: t.currencyCode,
            status: refundedPlans.has(`${email}::${it.id}`) ? "refunded" : "active",
            joined_at: when,
            source: "graphy_api_sync",
            raw_payload: t,
            synced_at: new Date().toISOString(),
          }),
        );
      } else {
        enrollRows.push(
          clean({
            learner_email: email,
            course_id: it.id,
            course_name: it.title,
            product_id: it.id,
            enrolled_at: when,
            raw_payload: t,
          }),
        );
      }
    }
  }

  // Every learner_email referenced below must exist in graphy_learners first (FK). /learners can
  // lag a fresh buyer, so upsert stubs for every referenced email before the child rows.
  const stubEmails = [
    ...new Set([...txRows.map((r) => r.learner_email), ...enrollRows.map((r) => r.learner_email), ...memberRows.map((r) => r.learner_email)].filter(Boolean)),
  ];
  await upsert(
    "graphy_learners",
    stubEmails.map((email) => ({ email, last_synced_at: new Date().toISOString(), last_event_type: "graphy_api_sync" })),
    "email",
  );

  const tx = await upsert("graphy_transactions", dedupe(txRows, (r) => r.graphy_transaction_id), "graphy_transaction_id");
  console.log(`transactions:  ${tx.count} of ${txns.length}${tx.error ? "  ERROR: " + tx.error : ""}`);

  const en = await upsert("graphy_enrollments", dedupe(enrollRows, (r) => `${r.learner_email}::${r.course_name}`), "learner_email,course_name");
  console.log(`enrollments:   ${en.count}${en.error ? "  ERROR: " + en.error : ""}`);

  const mem = await upsert("graphy_memberships", dedupe(memberRows, (r) => `${r.learner_email}::${r.plan_name}`), "learner_email,plan_name");
  console.log(`memberships:   ${mem.count}${mem.error ? "  ERROR: " + mem.error : ""}`);
}

async function main() {
  console.log("Syncing from Graphy API...\n");
  await syncProducts();
  await syncLearners();
  await syncTransactions();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
