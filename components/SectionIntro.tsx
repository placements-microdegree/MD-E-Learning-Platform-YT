import styles from "./SectionIntro.module.css";
import Reveal from "./Reveal";

export default function SectionIntro({
  index,
  label,
  title,
  subtitle,
}: {
  index: string;
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Reveal className={styles.wrap}>
      <div className={styles.eyebrow}>
        {index} / {label}
      </div>
      <h2 className={styles.heading}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </Reveal>
  );
}
