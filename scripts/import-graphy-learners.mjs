// One-off backfill: loads a "Learners Report" CSV exported from Graphy's admin dashboard
// (Learners -> Export) into graphy_learners -  the same table/shape the live webhook receiver
// (app/api/webhooks/graphy) writes to -  so historical learners who signed up before the webhooks
// existed aren't missing from the analytics data. Safe to re-run: everything upserts on email.
//
//   node --env-file=.env.local scripts/import-graphy-learners.mjs path/to/graphy-export.csv
//
// Column names confirmed against a real "Learners Report" export:
// Created On,Last Login,Name,Email,Role,Mobile,Work Experience,Source,Refer Code,UTM Source,Segment,Lead Status,User Notes,Referral Code Used,Credits,Telegram Name
import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

const COLUMNS = {
  createdOn: "Created On",
  lastLogin: "Last Login",
  name: "Name",
  email: "Email",
  role: "Role",
  mobileNumber: "Mobile",
  workExperience: "Work Experience",
  source: "Source",
  referralCode: "Refer Code",
  utmSource: "UTM Source",
  segment: "Segment",
  leadStatus: "Lead Status",
  referralCodeUsed: "Referral Code Used",
  credits: "Credits",
  telegramName: "Telegram Name",
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Graphy exports "DD/MM/YY HH:mm" in IST -  parse it as such and convert to a proper UTC ISO string. */
function parseGraphyDate(value) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const [, dd, mm, yy, hh, min] = match;
  const utcMs = Date.UTC(2000 + Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(min)) - IST_OFFSET_MS;
  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function str(value) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function num(value) {
  const trimmed = value?.trim();
  if (!trimmed || Number.isNaN(Number(trimmed))) return undefined;
  return Number(trimmed);
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: node scripts/import-graphy-learners.mjs <path-to-csv>");
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

  const csvContent = await readFile(csvPath, "utf-8");
  const rows = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

  let upserted = 0;
  let failed = 0;
  const failedEmails = [];

  for (const row of rows) {
    const email = row[COLUMNS.email]?.trim().toLowerCase();
    if (!email) continue;

    const learner = {
      email,
      name: str(row[COLUMNS.name]),
      role: str(row[COLUMNS.role]),
      mobile_number: str(row[COLUMNS.mobileNumber]),
      work_experience: str(row[COLUMNS.workExperience]),
      source: str(row[COLUMNS.source]),
      utm_source: str(row[COLUMNS.utmSource]),
      segment: str(row[COLUMNS.segment]),
      lead_status: str(row[COLUMNS.leadStatus]),
      referral_code: str(row[COLUMNS.referralCode]),
      referral_code_used: str(row[COLUMNS.referralCodeUsed]),
      credits: num(row[COLUMNS.credits]),
      telegram_name: str(row[COLUMNS.telegramName]),
      graphy_created_at: parseGraphyDate(row[COLUMNS.createdOn]),
      graphy_last_login_at: parseGraphyDate(row[COLUMNS.lastLogin]),
      last_synced_at: new Date().toISOString(),
      last_event_type: "csv_backfill",
      raw_payload: row,
    };

    const { error } = await supabase.from("graphy_learners").upsert(learner, { onConflict: "email" });

    if (error) {
      console.error(`Error upserting ${email}:`, error.message);
      failed++;
      failedEmails.push(email);
      continue;
    }
    upserted++;

    // Legacy bonus: also patch the Supabase-auth-scoped `profiles` row when one exists (same
    // best-effort, silently-no-ops-if-missing behavior as the webhook route).
    await supabase
      .from("profiles")
      .update({
        mobile_number: learner.mobile_number,
        work_experience: learner.work_experience,
        graphy_synced_at: new Date().toISOString(),
        profile_source: "graphy_csv_backfill",
      })
      .eq("email", email);
  }

  console.log(`\nDone. Upserted into graphy_learners: ${upserted}. Failed: ${failed}.`);
  if (failedEmails.length) {
    console.log("Failed emails (see errors above):");
    console.log(failedEmails.join("\n"));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
