// Anonymous first-party visitor tracking (page views, WhatsApp contact clicks and
// sign-up/checkout CTA clicks).
//
// Same logic as the main site's src/utils/tracker.js, the landing project's
// src/lib/visitorTracker.ts and the Resources app's src/lib/visitorTracker.ts. All of
// them write to the same Supabase tables through the public.track_batch() RPC
// (tracking_schema.sql lives in the MAIN-site repo) and share the SAME localStorage keys
// and session shape. This app is served at www.microdegree.work/learning (same origin as
// the main site, so a visitor stays one visitor / one session across both) and at
// microdegree.in (its own origin and host). Keep the four files in step.
//
// IMPORTANT: this app's own Supabase project (NEXT_PUBLIC_SUPABASE_*) is a DIFFERENT
// project from the one that holds the tracking tables. The tracker therefore reads its
// own pair of PUBLIC values: NEXT_PUBLIC_TRACKING_SUPABASE_URL / _ANON_KEY (the main
// project's URL and anon key). If they are not set, tracking silently does nothing.
//
// - Fire-and-forget, every path try/catch'd: tracking can never break a page.
// - Anonymous: random ids, page PATHS only (no query strings), no IP/name/phone.
// - No library: plain fetch to the Supabase REST endpoint.
//
// Opt a browser out (team members):   ?md_notrack=1   (undo: ?md_notrack=0)
// Force-enable on a non-prod host:    localStorage.md_track_force = "1"

import { BASE_PATH } from "@/lib/assetPath";

// NEXT_PUBLIC_* must be referenced literally so Next inlines them into the bundle.
const TRACKING_URL = process.env.NEXT_PUBLIC_TRACKING_SUPABASE_URL;
const TRACKING_ANON_KEY = process.env.NEXT_PUBLIC_TRACKING_SUPABASE_ANON_KEY;

const VISITOR_KEY = "md_vid";
const SESSION_KEY = "md_sess";
const OPT_OUT_KEY = "md_notrack";
const FORCE_KEY = "md_track_force";
// First touch for hosts where the shared utm_* keys (maintained by the main site /
// landing pages on www.microdegree.work) do not exist, e.g. microdegree.in.
const FIRST_TOUCH_KEY = "md_ft";

const SESSION_TTL_MS = 30 * 60 * 1000; // new session after 30 min of inactivity
const FIRST_TOUCH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const FLUSH_DELAY_MS = 5000;
const MAX_BATCH = 40;

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|facebookexternalhit/i;
// Real public hosts only (microdegree.work incl. www/resources, and microdegree.in).
// Per-deploy *.netlify.app permalinks and localhost are ignored.
const PRODUCTION_HOST = /(^|\.)microdegree\.(work|in)$/i;

// API routes are never pages.
const EXCLUDED_PATH_PREFIXES = [`${BASE_PATH}/api`];

type EventType = "page_view" | "whatsapp_click" | "cta_click";

interface TrackOptions {
  element?: string;
  metadata?: Record<string, string>;
  immediate?: boolean;
}

interface QueuedEvent {
  type: EventType;
  path: string;
  element: string;
  metadata: Record<string, string>;
  t: number;
}

interface Session {
  session_id: string;
  visitor_id: string;
  last: number;
  host?: string;
  landing_path: string;
  referrer_host: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  first_touch_source: string;
  first_touch_medium: string;
  first_touch_campaign: string;
  device_type: string;
  browser: string;
  os: string;
  is_returning: boolean;
}

const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable - in-memory ids below */
  }
};

const randomId = (): string => {
  try {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
};

let enabled: boolean | null = null;
let memoryVisitor: string | null = null;
let memorySession: Session | null = null;
let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInstalled = false;
let clickListenerInstalled = false;

const resolveEnabled = (): boolean => {
  if (enabled !== null) return enabled;
  enabled = false;
  try {
    if (typeof window === "undefined" || !TRACKING_URL || !TRACKING_ANON_KEY) return enabled;

    const optOut = new URLSearchParams(location.search).get("md_notrack");
    if (optOut === "1") safeSet(OPT_OUT_KEY, "1");
    if (optOut === "0") safeSet(OPT_OUT_KEY, "0");
    if (safeGet(OPT_OUT_KEY) === "1") return enabled;

    if (navigator.webdriver || BOT_UA.test(navigator.userAgent || "")) return enabled;
    if (!PRODUCTION_HOST.test(location.hostname) && safeGet(FORCE_KEY) !== "1") return enabled;

    enabled = true;
  } catch {
    enabled = false;
  }
  return enabled;
};

const getVisitorId = (): { id: string; isNew: boolean } => {
  let id = safeGet(VISITOR_KEY);
  let isNew = false;
  if (!id) {
    id = memoryVisitor || randomId();
    memoryVisitor = id;
    safeSet(VISITOR_KEY, id);
    isNew = true;
  }
  return { id, isNew };
};

const detectDevice = (): { device_type: string; browser: string; os: string } => {
  const ua = navigator.userAgent || "";
  const device_type = /ipad|tablet/i.test(ua)
    ? "tablet"
    : /mobi|android|iphone|ipod/i.test(ua)
    ? "mobile"
    : "desktop";

  let browser = "Other";
  if (/FBAN|FBAV/i.test(ua)) browser = "Facebook in-app";
  else if (/Instagram/i.test(ua)) browser = "Instagram in-app";
  else if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/Chrome|CriOS/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";

  let os = "Other";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux|X11/i.test(ua)) os = "Linux";

  return { device_type, browser, os };
};

const getReferrerHost = (): string => {
  try {
    if (!document.referrer) return "";
    const host = new URL(document.referrer).hostname.replace(/^www\./i, "");
    const own = location.hostname.replace(/^www\./i, "");
    return host === own ? "" : host;
  } catch {
    return "";
  }
};

// Source of THIS visit, read from the landing URL only.
const readLandingSource = () => {
  const params = new URLSearchParams(location.search);
  let utm_source = params.get("utm_source") || "";
  let utm_medium = params.get("utm_medium") || "";
  const utm_campaign = params.get("utm_campaign") || "";
  const utm_content = params.get("utm_content") || "";

  // Google Ads auto-tagging without utm params: label it instead of "direct".
  if (!utm_source && params.get("gclid")) {
    utm_source = "google";
    utm_medium = utm_medium || "cpc";
  }
  return { utm_source, utm_medium, utm_campaign, utm_content };
};

interface FirstTouch {
  source: string;
  medium: string;
  campaign: string;
}

// The visitor's first ad source inside a 30-day window.
//  1. On www.microdegree.work the main site / landing pages already keep it in the shared
//     utm_* localStorage keys (read-only here: this app must not alter main-site form attribution).
//  2. Otherwise (e.g. microdegree.in) keep our own copy under md_ft, written the first time a
//     visit arrives with a utm_source.
// This app's own md_utm cookie is deliberately NOT used: it is last-touch by design.
const resolveFirstTouch = (visit: { utm_source: string; utm_medium: string; utm_campaign: string }): FirstTouch => {
  const shared = safeGet("utm_source");
  if (shared) {
    return {
      source: shared,
      medium: safeGet("utm_medium") || "",
      campaign: safeGet("utm_campaign") || "",
    };
  }

  try {
    const raw = safeGet(FIRST_TOUCH_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as FirstTouch & { at: number };
      if (stored.source && Date.now() - (stored.at || 0) < FIRST_TOUCH_TTL_MS) {
        return { source: stored.source, medium: stored.medium || "", campaign: stored.campaign || "" };
      }
    }
  } catch {
    /* fall through */
  }

  if (visit.utm_source) {
    const created = { source: visit.utm_source, medium: visit.utm_medium, campaign: visit.utm_campaign };
    safeSet(FIRST_TOUCH_KEY, JSON.stringify({ ...created, at: Date.now() }));
    return created;
  }
  return { source: "", medium: "", campaign: "" };
};

const startSession = (visitorIsNew: boolean): Session => {
  const visit = readLandingSource();
  const firstTouch = resolveFirstTouch(visit);
  return {
    session_id: randomId(),
    visitor_id: "",
    last: Date.now(),
    host: location.hostname,
    landing_path: location.pathname,
    referrer_host: getReferrerHost(),
    ...visit,
    first_touch_source: firstTouch.source,
    first_touch_medium: firstTouch.medium,
    first_touch_campaign: firstTouch.campaign,
    ...detectDevice(),
    is_returning: !visitorIsNew,
  };
};

// Returns the live session, starting a new one after 30 min of inactivity.
const touchSession = (): Session => {
  const visitor = getVisitorId();
  let session: Session | null = null;

  try {
    const raw = safeGet(SESSION_KEY);
    if (raw) session = JSON.parse(raw) as Session;
  } catch {
    session = null;
  }
  if (!session) session = memorySession;

  const expired = !session || !session.session_id || Date.now() - (session.last || 0) > SESSION_TTL_MS;
  const live: Session = expired || !session ? startSession(visitor.isNew) : session;

  live.visitor_id = visitor.id;
  live.last = Date.now();
  memorySession = live;
  safeSet(SESSION_KEY, JSON.stringify(live));
  return live;
};

const sessionPayload = (s: Session) => ({
  session_id: s.session_id,
  visitor_id: s.visitor_id,
  host: s.host || location.hostname,
  landing_path: s.landing_path,
  referrer_host: s.referrer_host,
  utm_source: s.utm_source,
  utm_medium: s.utm_medium,
  utm_campaign: s.utm_campaign,
  utm_content: s.utm_content,
  first_touch_source: s.first_touch_source,
  first_touch_medium: s.first_touch_medium,
  first_touch_campaign: s.first_touch_campaign,
  device_type: s.device_type,
  browser: s.browser,
  os: s.os,
  is_returning: s.is_returning,
});

export function flush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  if (!queue.length) return;

  const batch = queue;
  queue = [];

  try {
    const session = touchSession();
    const now = Date.now();
    const body = JSON.stringify({
      payload: {
        session: sessionPayload(session),
        events: batch.map((e) => ({
          type: e.type,
          host: location.hostname,
          path: e.path,
          element: e.element,
          metadata: e.metadata,
          ago_ms: now - e.t,
        })),
      },
    });

    // keepalive lets the request finish even if the page is navigating away
    // (the CTA links leave straight for Graphy / WhatsApp).
    fetch(`${TRACKING_URL}/rest/v1/rpc/track_batch`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: TRACKING_ANON_KEY as string,
        Authorization: `Bearer ${TRACKING_ANON_KEY}`,
      },
      body,
    }).catch(() => {});
  } catch {
    /* tracking must never break the page */
  }
}

const installFlushListeners = (): void => {
  if (listenersInstalled) return;
  listenersInstalled = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  addEventListener("pagehide", flush);
};

export function trackEvent(type: EventType, options: TrackOptions = {}): void {
  try {
    if (!resolveEnabled()) return;
    if (EXCLUDED_PATH_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) return;
    installFlushListeners();

    touchSession(); // starts the session (captures landing source) on the first event

    queue.push({
      type,
      path: location.pathname,
      element: options.element || "",
      metadata: options.metadata || {},
      t: Date.now(),
    });

    if (options.immediate || queue.length >= MAX_BATCH) flush();
    else if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
  } catch {
    /* ignore */
  }
}

export const trackPageView = (): void => trackEvent("page_view");

// A "contact the business" WhatsApp link carries the business number
// (api.whatsapp.com/send?phone=... or wa.me/<number>). Links without a number
// (share-with-a-friend) must NOT count.
export function isBusinessWhatsappLink(href: string): boolean {
  try {
    const url = new URL(href, location.href);
    if (url.hostname === "api.whatsapp.com") return !!url.searchParams.get("phone");
    if (url.hostname === "wa.me") return /^\/\d{8,15}/.test(url.pathname);
    return false;
  } catch {
    return false;
  }
}

// Sign-up / checkout buttons are plain links to <basePath>/api/graphy-sso?next=<where>.
// Returns the destination keyword (dashboard | checkout | free | refer) or "".
export function graphySsoTarget(href: string): string {
  try {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin || !url.pathname.endsWith("/api/graphy-sso")) return "";
    const next = (url.searchParams.get("next") || "").toLowerCase();
    return /^[a-z_-]{1,20}$/.test(next) ? next : "";
  } catch {
    return "";
  }
}

const onClick = (event: MouseEvent): void => {
  try {
    const target = event.target as Element | null;
    const link = target && target.closest ? (target.closest("a[href]") as HTMLAnchorElement | null) : null;
    if (!link) return;
    const href = link.getAttribute("href") || "";

    if (isBusinessWhatsappLink(href)) {
      const floating = getComputedStyle(link).position === "fixed";
      trackEvent("whatsapp_click", {
        immediate: true,
        element: link.dataset.ctaId || (link.closest("footer") ? "footer_link" : floating ? "floating_button" : "page_button"),
      });
      return;
    }

    const next = graphySsoTarget(href);
    if (next) {
      trackEvent("cta_click", { immediate: true, element: `graphy_${next}`, metadata: { next } });
    }
  } catch {
    /* never interfere with the click */
  }
};

/** Call once from the root layout's client component. */
export function initVisitorTracking(): void {
  try {
    if (typeof window === "undefined" || clickListenerInstalled) return;
    clickListenerInstalled = true;
    document.addEventListener("click", onClick, true);
  } catch {
    /* ignore */
  }
}
