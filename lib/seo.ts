// The origin Google should treat as canonical for this content. Both deployments
// (microdegree.in and microdegree.work/learning) point search engines at the .work
// sub-path so ranking signal consolidates there. Falls back to the serving origin.
export const CANONICAL_ORIGIN = (
  process.env.NEXT_PUBLIC_CANONICAL_ORIGIN ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.microdegree.work/learning"
).replace(/\/$/, "");

/** Absolute canonical URL for a route path (e.g. "/", "/privacy"). */
export function canonical(path: string): string {
  return `${CANONICAL_ORIGIN}${path === "/" ? "/" : path}`;
}

/**
 * Canonical URL for a page that is served at the domain root of the canonical host rather than
 * under this app's basePath (e.g. /e-learning: the main site rewrites microdegree.work/e-learning
 * to this app's /learning/e-learning, but the public URL has no /learning in it).
 */
export function canonicalAtDomainRoot(path: string): string {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  const root = basePath && CANONICAL_ORIGIN.endsWith(basePath) ? CANONICAL_ORIGIN.slice(0, -basePath.length) : CANONICAL_ORIGIN;
  return `${root}${path}`;
}

/** Link-preview (WhatsApp / Facebook / LinkedIn / X) image shared by every page: 1200x630 JPG. */
export const OG_IMAGE = {
  url: canonical("/images/og.jpg"),
  width: 1200,
  height: 630,
  alt: "MicroDegree",
};

/**
 * openGraph + twitter metadata for a page. A page that sets its own `openGraph` replaces the
 * root layout's wholesale, so each page passes its own title/description/url through this.
 * `origin` defaults to the canonical origin; the ad landing pages pass the serving origin so
 * og:url matches the link that was actually shared.
 */
export function socialMeta(opts: { title: string; description: string; path: string; origin?: string; url?: string }) {
  const url = opts.url ?? `${opts.origin ?? CANONICAL_ORIGIN}${opts.path}`;
  return {
    openGraph: {
      type: "website" as const,
      locale: "en_IN",
      siteName: "MicroDegree",
      url,
      title: opts.title,
      description: opts.description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image" as const,
      site: "@micro_degree",
      creator: "@micro_degree",
      title: opts.title,
      description: opts.description,
      images: [OG_IMAGE.url],
    },
  };
}
