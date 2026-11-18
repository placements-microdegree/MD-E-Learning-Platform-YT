import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/seo";

// microdegree.in is being retired from search in favor of microdegree.work/learning, which
// lib/seo.ts's CANONICAL_ORIGIN and every page's alternates.canonical already point at.
// This file is only reachable at the domain root (basePath is unset on the .in deployment,
// so it serves at microdegree.in/robots.txt) -  the .work/learning deployment sits under a
// reverse-proxied sub-path and does not own microdegree.work's root robots.txt, so it can only
// advertise its own sitemap here, not control crawling for the whole domain.
const isRetiredInDomain = (process.env.NEXT_PUBLIC_SITE_URL || "").includes("microdegree.in");

export default function robots(): MetadataRoute.Robots {
  if (isRetiredInDomain) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
  };
}
