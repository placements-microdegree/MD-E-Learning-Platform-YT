import Navbar from "@/components/Navbar";
import StickyMobileCta from "@/components/StickyMobileCta";
import Hero from "@/components/Hero";
import TrustSection from "@/components/TrustSection";
import CoursesSection from "@/components/CoursesSection";
import WhyMicroDegreeSection from "@/components/WhyMicroDegreeSection";
import AudienceSection from "@/components/AudienceSection";
import CareersSection from "@/components/CareersSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import CertificateSection from "@/components/CertificateSection";
import FaqSection from "@/components/FaqSection";
import ReferralSection from "@/components/ReferralSection";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";
import { asset } from "@/lib/assetPath";

// Landing-page variants. Both microdegree.in/ and microdegree.in/premium render this same
// component off the same section components and the same data/content.ts — edit a section
// once and every variant picks it up. `variant` is the single seam where they diverge:
//   - "default" — the full page, Free + Premium plans (the home page).
//   - "premium" — a paid-course-only cut for Meta ad traffic; the Courses section shows the
//     Premium (₹399) plan alone. Everything else is identical.
// When the managers later want genuinely different copy per URL, add variant-keyed overrides
// in data/content.ts (e.g. content.premium?.hero ?? content.hero) — only for the sections
// that actually differ; the rest keeps falling through to the shared copy.
//   - "e-learning" — exact copy of the default page (microdegree.work/e-learning) whose
//     checkout/free CTAs go to a different Graphy plan (GRAPHY_E_LEARNING_* env vars).
export type LandingVariant = "default" | "premium" | "e-learning";

const ENROLL_CTA_LABEL = "Enroll Now @ ₹399";
const LOGIN_LABEL = "Log In";
const MARQUEE_SECONDS = 45;

// Every CTA routes through /api/graphy-sso (see app/api/graphy-sso/route.ts). Auth lives entirely
// on Graphy for now: anonymous visitors are sent straight to the Graphy destination and Graphy
// handles its own login/signup — our /login is not in any of these flows.
//   - next=checkout / next=free → Graphy enrolment page (account created there at checkout)
//   - next=dashboard → the learner's Graphy courses (the navbar "Log In" entry point for
//     people who already bought and just want back in)
//   - next=refer → refer & earn
// These land on plain <a href> elements, which don't get basePath applied — prefix them.
const DASHBOARD_HREF = asset("/api/graphy-sso?next=dashboard");
const DEFAULT_CHECKOUT_HREF = asset("/api/graphy-sso?next=checkout");
const DEFAULT_FREE_COURSE_HREF = asset("/api/graphy-sso?next=free");
const E_LEARNING_CHECKOUT_HREF = asset("/api/graphy-sso?next=e-learning-checkout");
const E_LEARNING_FREE_HREF = asset("/api/graphy-sso?next=e-learning-free");
const REFERRAL_HREF = asset("/api/graphy-sso?next=refer");

export default function LandingPage({ variant = "default" }: { variant?: LandingVariant }) {
  const premiumOnly = variant === "premium";
  const CHECKOUT_HREF = variant === "e-learning" ? E_LEARNING_CHECKOUT_HREF : DEFAULT_CHECKOUT_HREF;
  const FREE_COURSE_HREF = variant === "e-learning" ? E_LEARNING_FREE_HREF : DEFAULT_FREE_COURSE_HREF;
  // NEXT_PUBLIC_BASE_PATH is only set on the microdegree.work/learning deployment (see
  // next.config.mjs); on microdegree.in it's unset. Navbar "Log In" is wanted on
  // .work/learning only (manager's call).
  const showLoginCta = Boolean(process.env.NEXT_PUBLIC_BASE_PATH);

  return (
    <div data-md-root="1">
      <Navbar
        ctaLabel={LOGIN_LABEL}
        enrollHref={DASHBOARD_HREF}
        referHref={REFERRAL_HREF}
        showLoginCta={showLoginCta}
      />
      <StickyMobileCta ctaLabel={ENROLL_CTA_LABEL} enrollHref={CHECKOUT_HREF} />
      <Hero ctaLabel={ENROLL_CTA_LABEL} enrollHref={CHECKOUT_HREF} />
      <CoursesSection
        ctaLabel={ENROLL_CTA_LABEL}
        checkoutHref={CHECKOUT_HREF}
        freeCourseHref={FREE_COURSE_HREF}
        premiumOnly={premiumOnly}
      />
      <TrustSection />
      <WhyMicroDegreeSection />
      <AudienceSection />
      <CareersSection />
      <TestimonialsSection marqueeSeconds={MARQUEE_SECONDS} />
      <CertificateSection enrollHref={CHECKOUT_HREF} />
      <FaqSection />
      <ReferralSection referHref={REFERRAL_HREF} />
      <FinalCta ctaLabel={ENROLL_CTA_LABEL} enrollHref={CHECKOUT_HREF} />
      <Footer />
    </div>
  );
}
