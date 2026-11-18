import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import { canonicalAtDomainRoot, socialMeta } from "@/lib/seo";

// Exact copy of the home page (microdegree.work/e-learning) whose checkout/free CTAs go to a
// different Graphy plan (GRAPHY_E_LEARNING_* env vars). Indexed, with its own canonical.
const TITLE = "MicroDegree E-Learning — Cloud, DevOps & GenAI in ಕನ್ನಡ";
const DESCRIPTION =
  "MicroDegree is an online e-learning platform for self-paced Cloud, DevOps, Kubernetes, Agentic AI and GenAI courses in Kannada with live mentors and real projects.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: canonicalAtDomainRoot("/e-learning") },
  ...socialMeta({ title: TITLE, description: DESCRIPTION, path: "/e-learning", url: canonicalAtDomainRoot("/e-learning") }),
};

export default function ELearningLandingPage() {
  return <LandingPage variant="e-learning" />;
}
