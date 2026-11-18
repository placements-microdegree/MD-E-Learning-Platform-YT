import { timingSafeEqual } from "crypto";
import { after, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  classifyMembership,
  detectEventKind,
  extractCertificate,
  extractEnrollment,
  extractLearnerData,
  extractProgress,
  extractTransaction,
  type EventKind,
} from "@/lib/graphyWebhook";

type AdminClient = ReturnType<typeof createAdminClient>;

// Some webhook admin UIs ping the URL on save to check reachability -  respond 200 defensively.
export async function GET() {
  return NextResponse.json({ ok: true });
}

function isAuthorized(request: Request): boolean {
  const { searchParams } = new URL(request.url);
  const provided = searchParams.get("secret") ?? "";
  const expected = env.graphyWebhookSecret;

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Keeps `graphy_learners` populated from ANY event that mentions a learner, not just
 * "New Learner Created"/"Learner Profile Updated" -  an enrollment or transaction payload usually
 * carries email (+ name) too, and we don't want to lose that just because the learner's own
 * profile event never arrived or arrived to a since-deleted URL. Only fields actually present are
 * written, so this never clobbers richer data already on the row (see lib/graphyWebhook.ts -
 * undefined keys are dropped, not sent as null).
 */
async function upsertLearnerStub(
  admin: AdminClient,
  eventType: string,
  fields: Record<string, unknown>,
): Promise<{ id: number | null; error: string | null }> {
  if (!fields.email) return { id: null, error: "no email to key the learner stub on" };

  const { data, error } = await admin
    .from("graphy_learners")
    .upsert({ ...fields, last_synced_at: new Date().toISOString(), last_event_type: eventType }, { onConflict: "email" })
    .select("id")
    .single();

  return { id: data?.id ?? null, error: error?.message ?? null };
}

async function handleLearner(admin: AdminClient, eventType: string, payload: unknown) {
  const learner = extractLearnerData(payload);
  if (!learner) return { matchedLearnerId: null, error: "could not extract email from payload" };

  // Legacy path: also patch the Supabase-auth-scoped `profiles` row when one exists, so anything
  // still reading profiles.mobile_number/work_experience (pre-dating this table) keeps working.
  // Independent of the stub upsert, so run both at once (Graphy times out slow deliveries).
  const [{ id, error }] = await Promise.all([
    upsertLearnerStub(admin, eventType, {
      email: learner.email,
      graphy_learner_id: learner.graphyLearnerId,
      name: learner.name,
      role: learner.role,
      mobile_number: learner.mobileNumber,
      work_experience: learner.workExperience,
      source: learner.source,
      utm_source: learner.utmSource,
      segment: learner.segment,
      lead_status: learner.leadStatus,
      referral_code: learner.referralCode,
      referral_code_used: learner.referralCodeUsed,
      credits: learner.credits,
      telegram_name: learner.telegramName,
      marketing_consent: learner.marketingConsent,
      marketing_consent_at: learner.marketingConsent ? new Date().toISOString() : undefined,
      graphy_created_at: learner.graphyCreatedAt,
      graphy_last_login_at: learner.graphyLastLoginAt,
      raw_payload: payload,
    }),
    admin
      .from("profiles")
      .update({
        mobile_number: learner.mobileNumber ?? undefined,
        work_experience: learner.workExperience ?? undefined,
        graphy_synced_at: new Date().toISOString(),
        profile_source: "graphy_webhook",
      })
      .eq("email", learner.email),
  ]);

  return { matchedLearnerId: id, error };
}

async function handleEnrollment(admin: AdminClient, eventType: string, payload: unknown) {
  const enrollment = extractEnrollment(payload);
  if (!enrollment) return { matchedLearnerId: null, error: "could not extract learner email from payload" };

  const { id: learnerId } = await upsertLearnerStub(admin, eventType, {
    email: enrollment.learnerEmail,
    name: enrollment.learnerName,
  });

  const { error } = await admin.from("graphy_enrollments").upsert(
    {
      learner_email: enrollment.learnerEmail,
      graphy_enrollment_id: enrollment.graphyEnrollmentId,
      course_id: enrollment.courseId,
      course_name: enrollment.courseName,
      product_id: enrollment.productId,
      amount: enrollment.amount,
      currency: enrollment.currency,
      enrolled_at: enrollment.enrolledAt ?? new Date().toISOString(),
      raw_payload: payload,
    },
    { onConflict: "learner_email,course_name" },
  );

  return { matchedLearnerId: learnerId, error: error?.message ?? null };
}

async function handleTransaction(admin: AdminClient, eventType: string, payload: unknown, status: "initiated" | "success") {
  const transaction = extractTransaction(payload, status);
  if (!transaction) return { matchedLearnerId: null, error: "payload did not parse as an object at all" };

  // Graphy sends the plan name in "Items[].title" on Success but in "Course Name" on Init -  fold
  // them together so product_name is populated on the transaction row either way.
  const productName = transaction.productName ?? (transaction.courseName && /\bplan\b/i.test(transaction.courseName) ? transaction.courseName : undefined);

  const row: Record<string, unknown> = {
    graphy_transaction_id: transaction.transactionId,
    learner_email: transaction.learnerEmail,
    course_id: transaction.courseId,
    course_name: transaction.courseName,
    product_id: transaction.productId,
    product_name: productName,
    amount: transaction.amount,
    currency: transaction.currency,
    status,
    initiated_at: status === "initiated" ? (transaction.occurredAt ?? new Date().toISOString()) : undefined,
    completed_at: status === "success" ? (transaction.occurredAt ?? new Date().toISOString()) : undefined,
    raw_payload: payload,
    updated_at: new Date().toISOString(),
  };

  // Init Transaction confirmed to carry no id at all -  can't correlate it to a later Success
  // delivery, so just log it as its own row (funnel/drop-off signal) instead of upserting.
  // Success always has an Order Id, so that one upserts in place (retried deliveries dedupe).
  // The learner row must exist first: graphy_transactions / graphy_memberships FK on learner_email.
  const stub = transaction.learnerEmail
    ? await upsertLearnerStub(admin, eventType, { email: transaction.learnerEmail, name: transaction.learnerName })
    : { id: null, error: null };
  const txnPromise = transaction.transactionId
    ? admin.from("graphy_transactions").upsert(row, { onConflict: "graphy_transaction_id" })
    : admin.from("graphy_transactions").insert(row);

  // If a *completed* purchase is a membership plan (not a standalone course), record which tier the
  // learner is now on. Course purchases return null here and are left to graphy_enrollments.
  let membershipPromise: PromiseLike<{ error: { message: string } | null }> | null = null;
  if (status === "success" && transaction.learnerEmail) {
    const membership = classifyMembership(
      { productId: transaction.productId, productName: transaction.productName, courseId: transaction.courseId, courseName: transaction.courseName },
      env.graphyMembershipIds,
    );
    if (membership) {
      membershipPromise = admin.from("graphy_memberships").upsert(
        {
          learner_email: transaction.learnerEmail,
          plan_name: membership.planName,
          plan_tier: membership.planTier,
          plan_id: membership.planId,
          amount: transaction.amount,
          currency: transaction.currency,
          joined_at: transaction.occurredAt ?? new Date().toISOString(),
          source: "graphy_webhook",
          raw_payload: payload,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "learner_email,plan_name" },
      );
    }
  }

  // Once the learner exists the two remaining writes are independent, so run them concurrently.
  const [{ error }, membershipResult] = await Promise.all([txnPromise, membershipPromise ?? Promise.resolve({ error: null })]);

  return { matchedLearnerId: stub.id, error: error?.message ?? membershipResult.error?.message ?? null };
}

async function handleProgress(admin: AdminClient, eventType: string, payload: unknown) {
  const progress = extractProgress(payload);
  if (!progress) return { matchedLearnerId: null, error: "could not extract learner email from payload" };

  const { id: learnerId } = await upsertLearnerStub(admin, eventType, {
    email: progress.learnerEmail,
    name: progress.learnerName,
  });

  const { error } = await admin.from("graphy_course_progress").upsert(
    {
      learner_email: progress.learnerEmail,
      course_id: progress.courseId,
      item_id: progress.itemId ?? null,
      event_type: eventType,
      progress_percent: progress.progressPercent,
      completed_at: progress.completedAt ?? new Date().toISOString(),
      raw_payload: payload,
    },
    { onConflict: "learner_email,course_id,item_id,event_type" },
  );

  return { matchedLearnerId: learnerId, error: error?.message ?? null };
}

async function handleCertificate(admin: AdminClient, eventType: string, payload: unknown) {
  const certificate = extractCertificate(payload);
  if (!certificate) return { matchedLearnerId: null, error: "could not extract learner email from payload" };

  const { id: learnerId } = await upsertLearnerStub(admin, eventType, {
    email: certificate.learnerEmail,
    name: certificate.learnerName,
  });

  const { error } = await admin.from("graphy_certificates").insert({
    learner_email: certificate.learnerEmail,
    course_id: certificate.courseId,
    certificate_id: certificate.certificateId,
    downloaded_at: certificate.downloadedAt ?? new Date().toISOString(),
    raw_payload: payload,
  });

  return { matchedLearnerId: learnerId, error: error?.message ?? null };
}

// Receives every Graphy webhook delivery we've subscribed to. Register a SEPARATE webhook URL per
// event group in Graphy's dashboard (?secret=...&type=learner|enrollment|transaction|progress|
// certificate), each with only that group's checkboxes ticked -  this sidesteps needing Graphy's
// payload to self-identify its event type, which is unconfirmed. `type=transaction` additionally
// needs `&status=initiated` on the "Init Transaction" webhook and `&status=success` on "Success
// Transaction" / "Success Transaction V2" (register both events on ONE webhook with status=success
// if Graphy lets you, since they should produce the same shape -  drop whichever one turns out to
// be a duplicate once you see real deliveries). If `type` is omitted, we fall back to guessing from
// the payload shape (see detectEventKind) -  logged either way, so nothing is silently dropped.
//
// Every delivery is logged raw to graphy_webhook_events regardless of whether mapping succeeds, both
// as an audit trail and as the source of real samples to correct lib/graphyWebhook.ts against.
// Graphy auto-disables a webhook after 5 failed deliveries, so this route only ever 401s on a bad
// secret; anything else still returns 200 and records the error on the audit row instead.
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type") as EventKind | null;
  const statusParam = searchParams.get("status") as "initiated" | "success" | null;

  const admin = createAdminClient();
  const rawBody = await request.text();

  // Reply first, process after: from Netlify every Supabase call costs ~1s, and Graphy treats a slow
  // reply as a failed delivery ("Exception when calling hook URL") and disables the hook after 5.
  // Anything lost if the post-response work is dropped is recoverable with `npm run sync:graphy`.
  after(() => processDelivery(admin, rawBody, typeParam, statusParam));

  return NextResponse.json({ ok: true });
}

async function processDelivery(
  admin: AdminClient,
  rawBody: string,
  typeParam: EventKind | null,
  statusParam: "initiated" | "success" | null,
) {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    await admin.from("graphy_webhook_events").insert({
      payload: { raw: rawBody },
      processed: false,
      error: "invalid JSON body",
    });
    return;
  }

  const explicitEventName =
    typeof (payload as Record<string, unknown>)?.event === "string" ? ((payload as Record<string, unknown>).event as string) : undefined;

  const kind: EventKind | null = typeParam ?? detectEventKind(payload);
  const eventType = explicitEventName ?? kind ?? "unknown";

  // Audit insert runs alongside the handler (not before it) to keep the response fast.
  const auditPromise = admin.from("graphy_webhook_events").insert({ event_type: eventType, payload }).select("id").single();

  let result: { matchedLearnerId: number | null; error: string | null };
  try {
    result = await dispatch();
  } catch (e) {
    result = { matchedLearnerId: null, error: `unhandled: ${e instanceof Error ? e.message : String(e)}` };
  }
  const { data: auditRow } = await auditPromise;

  function dispatch(): Promise<{ matchedLearnerId: number | null; error: string | null }> {
    switch (kind) {
      case "learner":
        return handleLearner(admin, eventType, payload);
      case "enrollment":
        return handleEnrollment(admin, eventType, payload);
      case "transaction":
        return handleTransaction(admin, eventType, payload, statusParam ?? "success");
      case "progress":
        return handleProgress(admin, eventType, payload);
      case "certificate":
        return handleCertificate(admin, eventType, payload);
      default:
        return Promise.resolve({ matchedLearnerId: null, error: "could not determine event kind -  register this webhook with an explicit ?type= param" });
    }
  }

  if (auditRow?.id) {
    await admin
      .from("graphy_webhook_events")
      .update({
        processed: !result.error,
        matched_learner_id: result.matchedLearnerId,
        error: result.error,
      })
      .eq("id", auditRow.id);
  }
}
