import styles from "./StickyMobileCta.module.css";

export default function StickyMobileCta({
  ctaLabel,
  enrollHref,
}: {
  ctaLabel: string;
  enrollHref: string;
}) {
  return (
    <div className={styles.bar}>
      <a href={enrollHref} className={styles.cta}>
        {ctaLabel}
      </a>
    </div>
  );
}
