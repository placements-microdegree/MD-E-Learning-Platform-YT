// Field extraction for every Graphy webhook event we consume. Field names here are best-effort:
// only the "Learner Profile Updated" shape below is confirmed against a real delivery (flat
// top-level object, capitalized keys like "Email", "Work Experience"). Every other event's field
// names are guesses from Graphy's docs/naming conventions and are deliberately looked up under
// several candidate spellings (firstString/firstNumber/firstTimestamp) so a wrong guess degrades to
// "field missing" rather than a thrown error. Once real deliveries land in graphy_webhook_events,
// correct the candidate lists here against the real payloads -  same workflow as the original
// learner-only version of this file.

export type EventKind = "learner" | "enrollment" | "transaction" | "progress" | "certificate";

export type ExtractedLearner = {
  email: string;
  graphyLearnerId?: string;
  name?: string;
  role?: string;
  mobileNumber?: string;
  workExperience?: string;
  source?: string;
  utmSource?: string;
  segment?: string;
  leadStatus?: string;
  referralCode?: string;
  referralCodeUsed?: string;
  credits?: number;
  telegramName?: string;
  marketingConsent?: boolean;
  graphyCreatedAt?: string;
  graphyLastLoginAt?: string;
};

export type ExtractedEnrollment = {
  learnerEmail: string;
  learnerName?: string;
  graphyEnrollmentId?: string;
  courseId?: string;
  courseName?: string;
  productId?: string;
  amount?: number;
  currency?: string;
  enrolledAt?: string;
};

export type ExtractedTransaction = {
  /** Absent for "Init Transaction" -  confirmed real deliveries carry no id at that stage, only
   * "Success Transaction V2" does (as "Order Id"). Caller decides insert-vs-upsert based on this. */
  transactionId?: string;
  learnerEmail?: string;
  learnerName?: string;
  courseId?: string;
  courseName?: string;
  productId?: string;
  productName?: string;
  amount?: number;
  currency?: string;
  status: "initiated" | "success";
  occurredAt?: string;
};

export type ExtractedProgress = {
  learnerEmail: string;
  learnerName?: string;
  courseId?: string;
  itemId?: string;
  progressPercent?: number;
  completedAt?: string;
};

export type ExtractedCertificate = {
  learnerEmail: string;
  learnerName?: string;
  courseId?: string;
  certificateId?: string;
  downloadedAt?: string;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

/** Confirmed real payload sends amounts as "₹0.0" (currency symbol baked in) -  strip anything that isn't a digit/dot/minus before parsing. */
function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    if (cleaned && !Number.isNaN(Number(cleaned))) return Number(cleaned);
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (/^(true|yes|1)$/i.test(value)) return true;
    if (/^(false|no|0)$/i.test(value)) return false;
  }
  return undefined;
}

/** Graphy timestamps could be epoch ms, epoch seconds, or an ISO/locale date string -  try all three. */
function asTimestamp(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") {
    // Confirmed real payload sends "Timestamp": 0 as a placeholder (free transactions), not a real
    // epoch -  treat non-positive as "no timestamp" rather than resolving to 1970-01-01.
    if (value <= 0) return undefined;
    const ms = value < 1e12 ? value * 1000 : value; // looks like seconds vs ms
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

/** Case/whitespace-insensitive key lookup across a flat-ish record. */
function normalize(record: Record<string, unknown>): Map<string, unknown> {
  return new Map(Object.entries(record).map(([key, value]) => [key.toLowerCase().replace(/[\s_-]/g, ""), value]));
}

function firstRaw(record: Record<string, unknown> | undefined, keys: string[]): unknown {
  if (!record) return undefined;
  const normalized = normalize(record);
  for (const key of keys) {
    const found = normalized.get(key.toLowerCase().replace(/[\s_-]/g, ""));
    if (found !== undefined && found !== null && found !== "") return found;
  }
  return undefined;
}

const firstString = (record: Record<string, unknown> | undefined, keys: string[]) => asString(firstRaw(record, keys));
const firstNumber = (record: Record<string, unknown> | undefined, keys: string[]) => asNumber(firstRaw(record, keys));
const firstBoolean = (record: Record<string, unknown> | undefined, keys: string[]) => asBoolean(firstRaw(record, keys));
const firstTimestamp = (record: Record<string, unknown> | undefined, keys: string[]) => asTimestamp(firstRaw(record, keys));

/** Unwrap the common nesting shapes Graphy might use ({data:{...}}, {learner:{...}}, flat). */
function unwrap(payload: unknown): Record<string, unknown> | undefined {
  const root = asRecord(payload);
  if (!root) return undefined;
  return asRecord(root.data) ?? asRecord(root.learner) ?? root;
}

function customFields(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!data) return undefined;
  return asRecord(data.customFields) ?? asRecord(data.customFieldsData) ?? asRecord(data.additionalFields);
}

const EMAIL_KEYS = ["email", "learnerEmail", "userEmail"];
const NAME_KEYS = ["name", "learnerName", "fullName", "userName"];
// Confirmed real payloads: enrollment/init-transaction carry "Course Name" + "Course Link" (a URL
// ending .../description/<id>--<slug>, no separate id field); success-transaction instead carries
// an "Items": [{ id, title }] array (the purchased membership/plan) or, on some init deliveries,
// a plain descriptive string like "membership: Free Plan". COURSE_ID_KEYS/COURSE_NAME_KEYS are kept
// as a fallback for any shape that *does* send a flat field.
const COURSE_ID_KEYS = ["courseId", "courseld", "itemId"];
const COURSE_NAME_KEYS = ["courseName", "title"];
const AMOUNT_KEYS = ["amount", "price", "totalAmount", "transactionAmount"];
const CURRENCY_KEYS = ["currency", "currencyCode"];

/** Pulls the id segment out of a Graphy course link: `.../description/<id>--<slug>` -> `<id>`. */
function courseIdFromLink(link: string | undefined): string | undefined {
  if (!link) return undefined;
  const lastSegment = link.split("/").pop();
  if (!lastSegment) return undefined;
  const [id] = lastSegment.split("--");
  return id?.trim() || undefined;
}

/** Course-level identity: prefers a flat field, falls back to parsing "Course Link". */
function resolveCourse(data: Record<string, unknown> | undefined): { courseId?: string; courseName?: string } {
  const courseId = firstString(data, COURSE_ID_KEYS) ?? courseIdFromLink(firstString(data, ["courseLink"]));
  const courseName = firstString(data, COURSE_NAME_KEYS);
  return { courseId, courseName };
}

/** Membership/plan-level identity: Items[0] on Success Transaction, or a "membership: X" string on some Init deliveries. */
function resolveProduct(data: Record<string, unknown> | undefined): { productId?: string; productName?: string } {
  const itemsRaw = firstRaw(data, ["items"]);
  if (Array.isArray(itemsRaw) && itemsRaw.length > 0) {
    const first = asRecord(itemsRaw[0]);
    return { productId: asString(first?.id), productName: asString(first?.title) };
  }
  if (typeof itemsRaw === "string") {
    const match = itemsRaw.match(/membership:\s*(.+)/i);
    if (match) return { productName: match[1].trim() };
  }
  return { productId: firstString(data, ["productId", "packageId"]) };
}

export function extractLearnerData(payload: unknown): ExtractedLearner | null {
  const data = unwrap(payload);
  if (!data) return null;
  const fields = customFields(data);

  const email = firstString(data, EMAIL_KEYS);
  if (!email) return null;

  const pick = (keys: string[]) => firstString(data, keys) ?? firstString(fields, keys);

  return {
    email: email.toLowerCase(),
    graphyLearnerId: pick(["learnerId", "id", "userId"]),
    name: pick(NAME_KEYS),
    role: pick(["role"]),
    mobileNumber: pick(["mobile", "mobileNumber", "phone", "phoneNumber"]),
    workExperience: pick(["workExperience", "work_experience", "experience"]),
    source: pick(["source"]),
    utmSource: pick(["utmSource", "utm_source"]),
    segment: pick(["segment"]),
    leadStatus: pick(["leadStatus", "lead_status"]),
    referralCode: pick(["referCode", "referralCode"]),
    referralCodeUsed: pick(["referralCodeUsed", "referral_code_used"]),
    credits: firstNumber(data, ["credits"]) ?? firstNumber(fields, ["credits"]),
    telegramName: pick(["telegramName", "telegram_name"]),
    marketingConsent: firstBoolean(data, ["marketingConsent", "consent"]) ?? firstBoolean(fields, ["marketingConsent", "consent"]),
    graphyCreatedAt: firstTimestamp(data, ["createdOn", "createdAt", "signupDate", "createdDate"]),
    graphyLastLoginAt: firstTimestamp(data, ["lastLogin", "lastLoginAt"]),
  };
}

export function extractEnrollment(payload: unknown): ExtractedEnrollment | null {
  const data = unwrap(payload);
  if (!data) return null;
  const email = firstString(data, EMAIL_KEYS);
  if (!email) return null;

  const { courseId, courseName } = resolveCourse(data);

  return {
    learnerEmail: email.toLowerCase(),
    learnerName: firstString(data, NAME_KEYS),
    graphyEnrollmentId: firstString(data, ["enrollmentId", "id", "assignedThroughId"]),
    courseId,
    courseName,
    productId: firstString(data, ["productId", "packageId"]),
    amount: firstNumber(data, AMOUNT_KEYS),
    currency: firstString(data, CURRENCY_KEYS),
    enrolledAt: firstTimestamp(data, ["enrolledAt", "enrollmentDate", "createdAt", "date"]),
  };
}

/**
 * `status` must be passed in by the caller -  it comes from which webhook fired (Init vs Success),
 * not the payload. Never returns null just because a transaction id is missing: confirmed real
 * "Init Transaction" deliveries carry no id at all, only learner + course/product info -  the
 * caller (route.ts) decides insert-vs-upsert based on whether transactionId came back set.
 */
export function extractTransaction(payload: unknown, status: "initiated" | "success"): ExtractedTransaction | null {
  const data = unwrap(payload);
  if (!data) return null;

  const { courseId, courseName } = resolveCourse(data);
  const { productId, productName } = resolveProduct(data);

  return {
    transactionId: firstString(data, ["transactionId", "txnId", "orderId"]),
    learnerEmail: firstString(data, EMAIL_KEYS)?.toLowerCase(),
    learnerName: firstString(data, NAME_KEYS),
    courseId,
    courseName,
    productId,
    productName,
    amount: firstNumber(data, AMOUNT_KEYS),
    currency: firstString(data, CURRENCY_KEYS),
    status,
    occurredAt: firstTimestamp(data, ["transactionDate", "createdAt", "date", "timestamp"]),
  };
}

export function extractProgress(payload: unknown): ExtractedProgress | null {
  const data = unwrap(payload);
  if (!data) return null;
  const email = firstString(data, EMAIL_KEYS);
  if (!email) return null;

  return {
    learnerEmail: email.toLowerCase(),
    learnerName: firstString(data, NAME_KEYS),
    courseId: firstString(data, ["courseId", "courseld"]),
    itemId: firstString(data, ["itemId", "lessonId", "moduleId"]),
    progressPercent: firstNumber(data, ["progress", "progressPercent", "percentComplete"]),
    completedAt: firstTimestamp(data, ["completedAt", "completionDate", "date", "createdAt"]),
  };
}

export function extractCertificate(payload: unknown): ExtractedCertificate | null {
  const data = unwrap(payload);
  if (!data) return null;
  const email = firstString(data, EMAIL_KEYS);
  if (!email) return null;

  return {
    learnerEmail: email.toLowerCase(),
    learnerName: firstString(data, NAME_KEYS),
    courseId: firstString(data, COURSE_ID_KEYS),
    certificateId: firstString(data, ["certificateId", "certId"]),
    downloadedAt: firstTimestamp(data, ["downloadedAt", "date", "createdAt"]),
  };
}

/**
 * Decides whether a (successful) transaction is a membership/plan purchase rather than a standalone
 * course, and which tier. Prefers matching the purchased id against the known membership ids (parsed
 * from the checkout links), falls back to a "... Plan" name match. Returns null for course purchases.
 */
export function classifyMembership(
  input: { productId?: string; productName?: string; courseId?: string; courseName?: string },
  knownIds: { free: string[]; paid: string[] },
): { planName: string; planTier: "free" | "paid"; planId?: string } | null {
  const ids = [input.productId, input.courseId].filter(Boolean) as string[];
  const name = input.productName ?? input.courseName;

  const freeId = knownIds.free.find((id) => ids.includes(id));
  if (freeId) return { planName: name ?? "Free Plan", planTier: "free", planId: freeId };
  const paidId = knownIds.paid.find((id) => ids.includes(id));
  if (paidId) return { planName: name ?? "Paid Plan", planTier: "paid", planId: paidId };

  const tier = name ? membershipTierFromName(name) : undefined;
  if (name && tier) return { planName: name, planTier: tier, planId: input.productId ?? input.courseId };
  return null;
}

/**
 * Name-based tier rule for memberships with no env-configured id. Known plans:
 *   free: Free Plan, Free Plus, Free Resources    paid: Paid Plan, Premium Resources, Premium Plus
 *   organic: Organic Free (free), Organic Paid (paid)
 * Anchored on a Free/Paid/Premium prefix so a course that merely contains "plus" isn't misread.
 * Keep in sync with planTier in scripts/sync-graphy.mjs.
 */
export function membershipTierFromName(name: string): "free" | "paid" | undefined {
  const organic = name.trim().match(/^organic\s+(free|paid)\b/i); // Organic Free / Organic Paid
  if (organic) return organic[1].toLowerCase() === "free" ? "free" : "paid";
  const m = name.trim().match(/^(free|paid|premium)\b.*\b(plan|plus|resources)\b/i);
  if (!m) return undefined;
  return m[1].toLowerCase() === "free" ? "free" : "paid";
}

/**
 * Best-effort fallback for when a delivery doesn't arrive with an explicit `?type=` query param
 * (see route.ts -  registering one webhook URL per event group in Graphy sidesteps needing this at
 * all). Tries an explicit event-name field first, then falls back to guessing from which fields
 * are present. Update this once real multi-event payloads are captured.
 */
export function detectEventKind(payload: unknown): EventKind | null {
  const data = unwrap(payload);
  if (!data) return null;

  const explicit = firstString(data, ["event", "eventName", "eventType", "type"])?.toLowerCase();
  if (explicit) {
    if (explicit.includes("transaction")) return "transaction";
    if (explicit.includes("enroll")) return "enrollment";
    if (explicit.includes("certificate")) return "certificate";
    if (explicit.includes("progress") || explicit.includes("completion") || explicit.includes("completed")) return "progress";
    if (explicit.includes("learner") || explicit.includes("profile")) return "learner";
  }

  if (firstRaw(data, ["transactionId", "txnId", "orderId"]) !== undefined) return "transaction";
  if (firstRaw(data, ["certificateId", "certId"]) !== undefined) return "certificate";
  if (firstRaw(data, ["itemId", "lessonId", "progress", "progressPercent"]) !== undefined) return "progress";
  if (firstRaw(data, ["courseId", "productId", "packageId"]) !== undefined) return "enrollment";
  if (firstRaw(data, EMAIL_KEYS) !== undefined) return "learner";
  return null;
}
