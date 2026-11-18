// Campaign attribution carried from our landing pages into Graphy.
//
// A shared link like microdegree.in/?utm_source=abc (or microdegree.work/learning?utm_source=abc)
// is captured by proxy.ts into a first-party cookie, so it survives navigation and a later click
// on any CTA. app/api/graphy-sso then forwards it onto the Graphy checkout/course URL, where
// Graphy records it as the learner's "UTM Source".

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmParams = Partial<Record<UtmKey, string>>;

export const UTM_COOKIE = "md_utm";
export const UTM_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, last-touch

const SAFE_VALUE = /^[\w.\-~ %+:@/]{1,100}$/;

/** Picks the utm_* params out of a query string, dropping anything empty or oddly shaped. */
export function extractUtm(searchParams: URLSearchParams): UtmParams {
  const found: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = searchParams.get(key)?.trim();
    if (value && SAFE_VALUE.test(value)) found[key] = value;
  }
  return found;
}

export function serializeUtmCookie(utm: UtmParams): string {
  // Next percent-encodes cookie values itself, so don't encode here.
  return JSON.stringify(utm);
}

export function parseUtmCookie(raw: string | undefined): UtmParams {
  if (!raw) return {};
  try {
    // Tolerate raw JSON as well as one or two layers of percent-encoding (older cookies).
    let text = raw;
    for (let i = 0; i < 2 && !text.trimStart().startsWith("{"); i++) text = decodeURIComponent(text);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const params = new URLSearchParams();
    for (const key of UTM_KEYS) {
      if (typeof parsed[key] === "string") params.set(key, parsed[key] as string);
    }
    return extractUtm(params);
  } catch {
    return {};
  }
}

/** Sets (overrides) the campaign's utm_* on an outbound URL. Never throws. */
export function applyUtm(url: string, utm: UtmParams): string {
  try {
    const target = new URL(url);
    for (const key of UTM_KEYS) {
      const value = utm[key];
      if (value) target.searchParams.set(key, value);
    }
    return target.toString();
  } catch {
    return url;
  }
}
