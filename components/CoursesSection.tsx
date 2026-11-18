import styles from "./CoursesSection.module.css";
import SectionIntro from "./SectionIntro";
import Reveal from "./Reveal";
import PlanCard from "./PlanCard";
import { buildPlans } from "@/data/content";

export default function CoursesSection({
  ctaLabel = "Enroll Now",
  checkoutHref,
  freeCourseHref,
  premiumOnly = false,
}: {
  ctaLabel?: string;
  checkoutHref: string;
  freeCourseHref: string;
  // Paid-course-only landing variant (/premium): drop the Free plan card and show
  // just the Premium (₹399) plan. See components/LandingPage.tsx.
  premiumOnly?: boolean;
}) {
  const plans = buildPlans(ctaLabel, checkoutHref, freeCourseHref).filter(
    (p) => !premiumOnly || p.name === "Premium Plan",
  );

  return (
    <section id="courses" data-screen-label="Courses" className={styles.section}>
      {/* <div className={styles.watermark}>ಕಲಿಯಿರಿ</div> */}
      <div className={styles.container}>
        <SectionIntro
          index="01"
          label="programs"
          title="Learn what matters"
          subtitle={
            premiumOnly
              ? "One Premium track -  every skill explained in Kannada."
              : "Two tracks, one teaching style -  everything explained in Kannada."
          }
        />

        <div className={`${styles.grid} ${premiumOnly ? styles.gridSingle : ""}`}>
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 100}>
              <PlanCard plan={p} wide={premiumOnly} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
