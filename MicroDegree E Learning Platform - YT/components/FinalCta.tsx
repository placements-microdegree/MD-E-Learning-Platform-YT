import styles from "./FinalCta.module.css";
import Reveal from "./Reveal";

export default function FinalCta({
  ctaLabel = "Enroll@399",
  enrollHref,
}: {
  ctaLabel?: string;
  enrollHref: string;
}) {
  return (
    <section id="enroll" data-screen-label="Final CTA" className={styles.section}>
      <Reveal className={styles.banner}>
        <div className={styles.dotOverlay} />
        {/* <div className={styles.watermark}>ಈಗ</div> */}
        <h2 className={styles.heading}>Your Career Won&apos;t Wait</h2>
        <p className={styles.lede}><b>ನಾವು ನಿಮ್ಮೊಂದಿಗೆ ಇದ್ದೇವೆ. ಬನ್ನಿ, ನಿಮ್ಮ Career Transform ಮಾಡೋಣ.</b></p>
        <a href={enrollHref} className={styles.cta}>
          {ctaLabel}
        </a>
      </Reveal>
    </section>
  );
}
