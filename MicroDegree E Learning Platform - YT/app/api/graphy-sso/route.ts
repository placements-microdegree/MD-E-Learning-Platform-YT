import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { UTM_COOKIE, applyUtm, extractUtm, parseUtmCookie } from "@/lib/utm";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { BASE_PATH } from "@/lib/assetPath";
import { appendSourceTagIfAbsent, appendSsoToken, isTrustedGraphyReturnUrl, signGraphySsoToken } from "@/lib/graphySso";

const DESTINATIONS = {
  dashboard: () => env.graphyDashboardUrl,
  checkout: () => env.graphyCourseCheckoutUrl,
  free: () => env.graphyFreeCourseUrl,
  refer: () => env.graphyReferralUrl,
  // /e-learning page: same funnel, its own Graphy links.
  "e-learning-checkout": () => env.graphyELearningCheckoutUrl,
  "e-learning-free": () => env.graphyELearningFreeCourseUrl,
  // /tech-courses page (organic traffic).
  "organic-checkout": () => env.graphyOrganicCheckoutUrl,
  "organic-free": () => env.graphyOrganicFreeCourseUrl,
} as const;

type Destination = keyof typeof DESTINATIONS;

function isDestination(value: string): value is Destination {
  return value in DESTINATIONS;
}

/** Run an env getter (they throw when the var is missing) without letting it bubble a 500. */
function safeEnv(fn: () => string): string | null {
  try {
    return fn() || null;
  } catch {
    return null;
  }
}

// This app is deployed twice under two marketing domains (microdegree.in, and this same repo
// again proxied at microdegree.work/learning) that funnel into the SAME Graphy account -  tag
// which one sent the visitor so it's distinguishable once the data is back in Supabase.
function siteSourceTag(hostname: string): string {
  const host = hostname.toLowerCase();
  if (host.includes("microdegree.work")) {
    // Each sub-path deployment (/learning, /e-learning, ...) gets its own tag, derived from basePath.
    const slug = BASE_PATH.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    return slug ? `microdegree_work_${slug}` : "microdegree_work";
  }
  if (host.includes("microdegree.in")) return "microdegree_in";
  return host || "unknown";
}

/** Redirect to the first candidate that is a valid absolute URL; never throws. */
function toRedirect(candidates: Array<string | null | undefined>): NextResponse {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return NextResponse.redirect(new URL(candidate).toString());
    } catch {
      // not an absolute URL — try the next candidate
    }
  }
  // Absolute last resort: a relative Location, which browsers resolve fine.
  return new NextResponse(null, { status: 302, headers: { Location: "/" } });
}

// Handoff into Graphy.
//
// Auth is handled entirely on Graphy for now — our own /login is NOT used in any user-facing flow:
//   - anonymous visitors go straight to the Graphy destination (checkout / free enrolment / their
//     courses / referral). Graphy prompts its own login or signup wherever it needs one, and it
//     creates the learner's account during checkout — so a buyer is never asked to log in twice.
//   - `returnurl` (Graphy bounced someone here mid-course) → send them straight back to that Graphy
//     page, but only when it really points at our Graphy host (the param is attacker-influenceable).
//   - if a Supabase session somehow exists (legacy, or a future re-enable of our own auth) we still
//     sign an SSO token so that visitor lands in Graphy already logged in.
//
// Every branch returns a redirect. Nothing here is allowed to surface a 500 to someone mid-click.
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const siteHome = safeEnv(() => env.siteUrl) ?? origin;

  const nextParam = requestUrl.searchParams.get("next") ?? "dashboard";
  const next: Destination = isDestination(nextParam) ? nextParam : "dashboard";
  const returnUrlParam = requestUrl.searchParams.get("returnurl");

  // Where this visitor is headed on Graphy, whatever their auth state.
  const graphyTarget = safeEnv(() => DESTINATIONS[next]());
  const graphyDashboardUrl = safeEnv(() => env.graphyDashboardUrl);
  const trustedReturnUrl =
    returnUrlParam && graphyDashboardUrl && isTrustedGraphyReturnUrl(returnUrlParam, graphyDashboardUrl)
      ? returnUrlParam
      : null;

  // Tag with which of our domains this request came in on (not the return-url bounce -  that's
  // Graphy sending someone back mid-course, not a fresh acquisition worth re-tagging).
  const siteTag = siteSourceTag(requestUrl.hostname);

  // A real campaign tag (?utm_source=abc on the link, or the md_utm cookie proxy.ts stored when
  // they landed) beats the generic site tag and is forwarded to Graphy as the learner's UTM Source.
  const campaignUtm = {
    ...parseUtmCookie((await cookies()).get(UTM_COOKIE)?.value),
    ...extractUtm(requestUrl.searchParams),
  };
  const tag = (url: string) =>
    campaignUtm.utm_source ? applyUtm(url, campaignUtm) : appendSourceTagIfAbsent(url, siteTag);
  const taggedGraphyTarget = graphyTarget ? tag(graphyTarget) : graphyTarget;
  const taggedGraphyDashboardUrl = graphyDashboardUrl ? tag(graphyDashboardUrl) : graphyDashboardUrl;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Normal case now: no Supabase session → straight to Graphy, never our /login.
    if (!user?.email) {
      return toRedirect([trustedReturnUrl, taggedGraphyTarget, siteHome]);
    }

    // Legacy / future: a Supabase session exists — SSO them in so they skip Graphy's login too.
    const token = signGraphySsoToken(
      {
        email: user.email,
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined),
      },
      env.graphyApiKey,
    );

    const destinationUrl = trustedReturnUrl ?? taggedGraphyTarget ?? taggedGraphyDashboardUrl;
    if (!destinationUrl) {
      return toRedirect([siteHome]);
    }

    let finalUrl = destinationUrl;
    try {
      finalUrl = appendSsoToken(destinationUrl, token);
    } catch {
      // appendSsoToken does new URL(destinationUrl) — if the configured URL is malformed, send them
      // there bare rather than 500. Graphy handles a tokenless hit as a logged-out user.
    }

    return toRedirect([finalUrl, destinationUrl, siteHome]);
  } catch {
    // Supabase client / cookie parsing / signing blew up — still get the visitor to Graphy.
    return toRedirect([trustedReturnUrl, taggedGraphyTarget, siteHome]);
  }
}
