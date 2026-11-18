// One-off backfill: loads a membership member-list CSV exported from Graphy (Memberships -> open a
// plan -> Members -> Export) into graphy_memberships, so the ~51 learners who joined a plan before
// the transaction webhook existed aren't missing their plan tier. Safe to re-run (upserts on
// learner_email + plan_name). Run once per plan:
//
//   node --env-file=.env.local scripts/import-graphy-memberships.mjs free "Free Plan" path/to/free-members.csv
//   node --env-file=.env.local scripts/import-graphy-memberships.mjs paid "Paid Plan" path/to/paid-members.csv
//
// The export's exact columns aren't known ahead of time, so the script fuzzy-matches headers and
// prints which ones it picked -  eyeball that before trusting the run.
import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Graphy exports dates as "DD/MM/YY HH:mm" (IST) or sometimes "DD/MM/YYYY". Returns a UTC ISO string. */
function parseGraphyDate(value) {
  const t = value?.trim();
  if (!t) return undefined;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!m) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  const [, dd, mm, yyRaw, hh = "0", min = "0"] = m;
  const yy = yyRaw.length === 2 ? 2000 + Number(yyRaw) : Number(yyRaw);
  const d = new Date(Date.UTC(yy, Number(mm) - 1, Number(dd), Number(hh), Number(min)) - IST_OFFSET_MS);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** First header whose normalized form contains any of the given needles. */
function findColumn(headers, needles) {
  for (const h of headers) {
    const norm = h.toLowerCase().replace(/[\s_-]/g, "");
    if (needles.some((n) => norm.includes(n))) return h;
  }
  return undefined;
}

function str(v) {
  const t = v?.trim();
  return t || undefined;
}
function num(v) {
  const t = v?.replace?.(/[^0-9.-]/g, "").trim?.() ?? v;
  return t && !Number.isNaN(Number(t)) ? Number(t) : undefined;
}

async function main() {
  const [tier, planName, csvPath] = process.argv.slice(2);
  if (!tier || !planName || !csvPath) {
    console.error('Usage: node scripts/import-graphy-memberships.mjs <free|paid> "<Plan Name>" <path-to-csv>');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows = parse(await readFile(csvPath, "utf-8"), { columns: true, skip_empty_lines: true, trim: true });
  if (!rows.length) {
    console.error("CSV has no data rows.");
    process.exit(1);
  }

  const headers = Object.keys(rows[0]);
  const col = {
    email: findColumn(headers, ["email"]),
    name: findColumn(headers, ["name"]),
    joined: findColumn(headers, ["joined", "enrolled", "createdon", "startdate", "purchasedate"]),
    expires: findColumn(headers, ["expire", "validtill", "enddate", "validity"]),
    amount: findColumn(headers, ["amount", "price", "paid"]),
    status: findColumn(headers, ["status", "state"]),
  };
  console.log("Matched columns:", col);
  if (!col.email) {
    console.error("Could not find an email column in the CSV headers:", headers);
    process.exit(1);
  }

  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    const email = row[col.email]?.trim().toLowerCase();
    if (!email) continue;

    // graphy_memberships.learner_email references graphy_learners(email) -  make sure the learner
    // row exists first (harmless no-op update of last_synced_at if it already does).
    await supabase.from("graphy_learners").upsert(
      { email, name: col.name ? str(row[col.name]) : undefined, last_synced_at: new Date().toISOString(), last_event_type: "membership_csv_backfill" },
      { onConflict: "email" },
    );

    const { error } = await supabase.from("graphy_memberships").upsert(
      {
        learner_email: email,
        plan_name: planName,
        plan_tier: tier,
        amount: col.amount ? num(row[col.amount]) : undefined,
        status: col.status ? str(row[col.status]) : undefined,
        joined_at: col.joined ? parseGraphyDate(row[col.joined]) : undefined,
        expires_at: col.expires ? parseGraphyDate(row[col.expires]) : undefined,
        source: "graphy_csv_backfill",
        raw_payload: row,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "learner_email,plan_name" },
    );

    if (error) {
      console.error(`Error on ${email}:`, error.message);
      failed++;
    } else {
      ok++;
    }
  }

  console.log(`\nDone. "${planName}" (${tier}) -  upserted: ${ok}, failed: ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
