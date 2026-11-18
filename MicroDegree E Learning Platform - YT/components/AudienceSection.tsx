import styles from "./AudienceSection.module.css";
import SectionIntro from "./SectionIntro";
import Reveal from "./Reveal";
import { audiences } from "@/data/content";
import { asset } from "@/lib/assetPath";
import { GraduationCapIcon, LaptopCodeIcon, BriefcaseIcon } from "./icons/AudienceIcons";

const icons = [BriefcaseIcon, GraduationCapIcon, LaptopCodeIcon];

// Set here (not in CSS) so the basePath prefix applies under microdegree.work/learning.
const bgStyle = { "--section-bg": `url(${asset("/images/sec_background/audience.webp")})` } as React.CSSProperties;

export default function AudienceSection() {
  return (
    <section data-screen-label="Who is this for" className={styles.section}>
      <div className={styles.bgImage} style={bgStyle} />
      {/* <div className={styles.watermark}>ಕಲಿಕೆ</div> */}
      <div className={styles.container}>
        <SectionIntro index="04" label="audience" title="Who should join" />
        <div className={styles.grid}>
          {audiences.map((a, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={a.title} delay={i * 100}>
                <div className={styles.card}>
                  <div className={styles.topRow}>
                    <span className={styles.glyph}>
                      <Icon className={styles.glyphIcon} />
                    </span>
                    <span className={styles.tag}>{a.tag}</span>
                  </div>
                  <div className={styles.title}>{a.title}</div>
                  <p className={styles.body}>{a.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
