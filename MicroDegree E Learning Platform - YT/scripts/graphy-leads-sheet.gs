// Google Apps Script — bound to the "Graphy Leads" Google Sheet.
//
// Keeps the sheet as a live mirror of the public.graphy_leads table (see supabase/schema.sql):
//   - doPost() receives the Supabase Database Webhook fired on every INSERT/UPDATE/DELETE to
//     graphy_leads and upserts/deletes the matching row, keyed by email. This is what makes the
//     sheet update itself the moment a lead changes in the DB — no daily/scheduled sync involved.
//   - syncAllFromSupabase() does a full pull. Run it once up front to backfill everything that
//     already existed before the webhook was wired up, and any time after (via the sheet's
//     "Graphy" menu) as a manual safety net — the same reconcile role scripts/sync-graphy.mjs
//     plays for the other graphy_* tables.
//
// SETUP (one-time, done outside this repo — this file is just what you paste in):
//   1. Run the "graphy_leads" section of supabase/schema.sql in the Supabase SQL editor. It
//      creates the table plus triggers that keep it in sync with graphy_learners/memberships/
//      enrollments/transactions — you never write to graphy_leads directly.
//   2. Create a Google Sheet (any name — e.g. "Graphy Leads").
//   3. Extensions -> Apps Script. Delete the boilerplate, paste this whole file in.
//   4. Project Settings (gear icon, left sidebar) -> Script Properties -> Add script property,
//      three times:
//        WEBHOOK_SECRET             a long random string, e.g. from `openssl rand -hex 24`
//        SUPABASE_URL               https://<your-project-ref>.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY  Supabase dashboard -> Settings -> API -> service_role key
//      Never paste these into the code itself — Script Properties keeps them out of anything
//      you might later copy, screenshot, or commit.
//   5. Change SHEET_NAME below if your tab isn't literally named "Sheet1".
//   6. Run the `setupHeaderRow` function once (function picker dropdown at the top -> pick it ->
//      Run). First run prompts you to authorize the script — approve it (it only touches this
//      sheet and calls your own Supabase project).
//   7. Run `syncAllFromSupabase` once to pull in every lead that already exists today.
//   8. Deploy -> New deployment -> type "Web app" -> Execute as "Me" -> Who has access "Anyone" ->
//      Deploy. Copy the Web app URL (ends in /exec) — you'll need it for the Supabase webhook.
//
// Then in Supabase: Dashboard -> Database -> Webhooks -> Create a new webhook
//   Table:   public.graphy_leads
//   Events:  Insert, Update, Delete
//   Type:    HTTP Request, method POST
//   URL:     <the /exec URL from step 8>?secret=<the WEBHOOK_SECRET you set in step 4>
//   (Apps Script web apps can't read custom HTTP headers, which is why the secret rides
//   in the query string instead of a header.)

var SHEET_NAME = 'Sheet1';

// Order here = column order in the sheet. Must match public.graphy_leads' columns.
var COLUMNS = [
  'email',
  'name',
  'phone',
  'work_experience',
  'role',
  'membership_plan',
  'courses_enrolled',
  'course_count',
  'graphy_created_at',
  'graphy_last_login_at',
  'last_synced_at',
  'total_paid',
  'row_updated_at'
];

function doPost(e) {
  var secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  if (!e || !e.parameter || !secret || e.parameter.secret !== secret) {
    return ContentService.createTextOutput('unauthorized').setMimeType(ContentService.MimeType.TEXT);
  }

  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput('bad json').setMimeType(ContentService.MimeType.TEXT);
  }

  // Apps Script doesn't serialize concurrent doPost calls on its own — two webhook
  // deliveries landing close together (Supabase retries a delivery, or two source-table
  // changes for the same learner fire moments apart) can otherwise both read "row not
  // found" before either has written, and both append -> duplicate rows for one email.
  // The lock forces them to run one at a time.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000); // doPost itself has a hard ~30s execution limit
  } catch (err) {
    return ContentService.createTextOutput('locked, Supabase will retry').setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    // Supabase Database Webhook payload shape: { type, table, schema, record, old_record }
    if (body && body.type === 'DELETE') {
      var oldRow = body.old_record;
      if (oldRow && oldRow.email) deleteRow(sheet, oldRow.email);
      return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
    }

    var row = body && body.record;
    if (!row || !row.email) {
      return ContentService.createTextOutput('no record').setMimeType(ContentService.MimeType.TEXT);
    }

    upsertRow(sheet, row);
    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}

function findRowByEmail(sheet, email) {
  var emailCol = COLUMNS.indexOf('email') + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  var target = String(email).trim().toLowerCase();
  var emails = sheet.getRange(2, emailCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).trim().toLowerCase() === target) return i + 2; // +2: 1-indexed, plus header row
  }
  return -1;
}

function upsertRow(sheet, row) {
  var targetRow = findRowByEmail(sheet, row.email);
  var values = COLUMNS.map(function (key) {
    var v = row[key];
    return v === undefined || v === null ? '' : v;
  });

  if (targetRow === -1) {
    sheet.appendRow(values);
  } else {
    sheet.getRange(targetRow, 1, 1, values.length).setValues([values]);
  }
}

function deleteRow(sheet, email) {
  var targetRow = findRowByEmail(sheet, email);
  if (targetRow !== -1) sheet.deleteRow(targetRow);
}

// Full pull from public.graphy_leads, replacing everything below the header row.
// Run this by hand once up front (setup step 7), and any time after via the "Graphy" sheet
// menu if you ever suspect a webhook delivery was missed.
function syncAllFromSupabase() {
  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('SUPABASE_URL');
  var key = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Project Settings -> Script Properties first.');
  }

  var select = COLUMNS.join(',');
  var pageSize = 1000;
  var allRows = [];
  var offset = 0;

  while (true) {
    var response = UrlFetchApp.fetch(
      url + '/rest/v1/graphy_leads?select=' + select + '&order=email.asc',
      {
        method: 'get',
        headers: {
          apikey: key,
          Authorization: 'Bearer ' + key,
          Range: offset + '-' + (offset + pageSize - 1)
        },
        muteHttpExceptions: true
      }
    );

    if (response.getResponseCode() >= 300) {
      throw new Error('Supabase fetch failed: ' + response.getResponseCode() + ' ' + response.getContentText());
    }

    var page = JSON.parse(response.getContentText());
    allRows = allRows.concat(page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).clearContent();
  }
  if (allRows.length === 0) return;

  var values = allRows.map(function (row) {
    return COLUMNS.map(function (key) {
      var v = row[key];
      return v === undefined || v === null ? '' : v;
    });
  });
  sheet.getRange(2, 1, values.length, COLUMNS.length).setValues(values);
}

// Run this once by hand after pasting the script in, to write the header row.
function setupHeaderRow() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
}

// Adds a "Graphy" menu with a manual resync button, so you don't need the function picker
// if you ever want to force a full refresh.
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Graphy')
    .addItem('Resync all from Supabase', 'syncAllFromSupabase')
    .addToUi();
}
