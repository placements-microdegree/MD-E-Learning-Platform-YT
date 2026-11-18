import type { MetadataRoute } from "next";
import { canonical, canonicalAtDomainRoot } from "@/lib/seo";

// Every URL here is canonical()-ed so the sitemap always advertises microdegree.work/learning
// addresses, even when this file is generated from the microdegree.in deployment.
// /premium is deliberately excluded -  it's noindex (see app/premium/page.tsx).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: canonical("/"), changeFrequency: "weekly", priority: 1 },
    { url: canonicalAtDomainRoot("/e-learning"), changeFrequency: "weekly", priority: 0.9 },
    { url: canonicalAtDomainRoot("/tech-courses"), changeFrequency: "weekly", priority: 0.9 },
    { url: canonical("/terms"), changeFrequency: "yearly", priority: 0.3 },
    { url: canonical("/privacy"), changeFrequency: "yearly", priority: 0.3 },
  ];
}
