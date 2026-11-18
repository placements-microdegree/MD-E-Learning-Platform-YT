import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import { socialMeta } from "@/lib/seo";

// Paid-course-only cut of the home page, built for Meta ad traffic (microdegree.in/premium).
// Same sections, same content source as "/" — only the Courses section differs (Premium plan
// only). noindex so it never competes with the home page in search; the ads link straight here.
const TITLE = "MicroDegree Premium — Cloud, DevOps & GenAI in ಕನ್ನಡ @ ₹399";
const DESCRIPTION =
  "The full MicroDegree Premium track — Cloud, DevOps, Kubernetes and Generative AI, taught in Kannada, with a shareable certificate. 2 months access for ₹399.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: true },
  // Ads link to the serving origin (microdegree.in/premium), so og:url uses it, not the canonical .work origin.
  ...socialMeta({
    title: TITLE,
    description: DESCRIPTION,
    path: "/premium",
    origin: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ""),
  }),
};

export default function PremiumLandingPage() {
  return <LandingPage variant="premium" />;
}
