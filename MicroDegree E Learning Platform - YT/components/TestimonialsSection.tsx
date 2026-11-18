import Image from "next/image";
import styles from "./TestimonialsSection.module.css";
import introStyles from "./SectionIntro.module.css";
import Reveal from "./Reveal";
import { googleReviewLoop, linkedinReviews, linkedinCertScreenshots, type Review } from "@/data/content";
import { asset } from "@/lib/assetPath";
import { GoogleIcon } from "./icons/ReviewIcons";
import { LinkedinIcon } from "./icons/SocialIcons";

const sourceIcons = { google: GoogleIcon, linkedin: LinkedinIcon };

// Set here (not in CSS) so the basePath prefix applies under microdegree.work/learning.
const bgStyle = { "--section-bg": `url(${asset("/images/sec_background/reviews.webp")})` } as React.CSSProperties;

function ReviewCard({ review }: { review: Review }) {
  const SourceIcon = sourceIcons[review.source];
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div>
          <div className={styles.name}>{review.name}</div>
          {review.stars && <div className={styles.stars}>{"★".repeat(review.stars)}</div>}
        </div>
        <span className={styles.sourceIcon}>
          <SourceIcon className={styles.sourceIconSvg} />
        </span>
      </div>
      <p className={styles.text}>{review.text}</p>
    </div>
  );
}

function ReviewRow({ items, seconds, reverse }: { items: Review[]; seconds: number; reverse?: boolean }) {
  return (
    <div className={styles.trackWrap}>
      <div
        className={styles.track}
        style={{ animationDuration: `${seconds}s`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        {items.map((r, i) => (
          <ReviewCard key={`${r.name}-${i}`} review={r} />
        ))}
      </div>
    </div>
  );
}

type LinkedinRowItem =
  | { kind: "review"; review: Review }
  | { kind: "screenshot"; src: string; alt: string };

// One review, one certificate screenshot, alternating - 6 reviews and 5 screenshots
// interleave evenly with a review on both ends.
function buildLinkedinRow(): LinkedinRowItem[] {
  const single: LinkedinRowItem[] = [];
  linkedinReviews.forEach((review, i) => {
    single.push({ kind: "review", review });
    const shot = linkedinCertScreenshots[i];
    if (shot) single.push({ kind: "screenshot", src: shot.src, alt: shot.alt });
  });
  return [...single, ...single];
}

function LinkedinReviewRow({ seconds, reverse }: { seconds: number; reverse?: boolean }) {
  const items = buildLinkedinRow();
  return (
    <div className={styles.trackWrap}>
      <div
        className={styles.track}
        style={{ animationDuration: `${seconds}s`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        {items.map((item, i) =>
          item.kind === "review" ? (
            <ReviewCard key={`review-${item.review.name}-${i}`} review={item.review} />
          ) : (
            <div key={`shot-${item.src}-${i}`} className={styles.screenshotCard}>
              <div className={styles.screenshotFrame}>
                <Image src={item.src} alt={item.alt} fill sizes="340px" className={styles.screenshotImage} />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function TestimonialsSection({ marqueeSeconds = 45 }: { marqueeSeconds?: number }) {
  return (
    <section id="testimonials" data-screen-label="Testimonials" className={styles.section}>
      <div className={styles.bgImage} style={bgStyle} />
      <Reveal className={styles.header}>
        <div className={introStyles.eyebrow}>05 / reviews</div>
        <h2 className={introStyles.heading}>Learners, in their words</h2>
      </Reveal>
      <ReviewRow items={googleReviewLoop} seconds={marqueeSeconds} />
      <LinkedinReviewRow seconds={marqueeSeconds} reverse />
    </section>
  );
}
