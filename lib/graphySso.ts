import { createHmac } from "crypto";

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type GraphySsoPayload = {
  email: string;
  name?: string;
  "course-ids"?: string[];
};

/** Signs the JWT Graphy's SSO expects (HS256, keyed on the Third Party SSO secret). */
export function signGraphySsoToken(payload: GraphySsoPayload, secret: string, expiresInSeconds = 300): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    }),
  );

  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${header}.${body}.${signature}`;
}

/** Appends ssoToken to a Graphy URL without disturbing its existing query params (e.g. callback_url). */
export function appendSsoToken(url: string, token: string): string {
  const target = new URL(url);
  target.searchParams.set("ssoToken", token);
  return target.toString();
}

/**
 * Tags an outbound Graphy URL with which of our own marketing domains sent this visitor
 * (microdegree.in vs microdegree.work/learning), so it round-trips back through Graphy's own
 * "UTM Source" learner field and lands in graphy_learners.utm_source via the webhook. Never
 * overwrites a utm_source the destination URL already carries (e.g. a real ad-campaign tag baked
 * into GRAPHY_COURSE_CHECKOUT_URL), and never throws -  a malformed URL is returned unchanged.
 */
export function appendSourceTagIfAbsent(url: string, source: string): string {
  try {
    const target = new URL(url);
    if (!target.searchParams.has("utm_source")) {
      target.searchParams.set("utm_source", source);
    }
    return target.toString();
  } catch {
    return url;
  }
}

/**
 * Graphy's `returnurl` is attacker-influenceable (it arrives as a query param on our own login page),
 * so only trust it when it points back at the Graphy domain we actually issue SSO tokens for - 
 * otherwise a crafted link could get a live token redirected off Graphy entirely.
 */
export function isTrustedGraphyReturnUrl(candidate: string, graphyReferenceUrl: string): boolean {
  try {
    return new URL(candidate).host === new URL(graphyReferenceUrl).host;
  } catch {
    return false;
  }
}
