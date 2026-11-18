import styles from "./WhyMicroDegreeSection.module.css";
import SectionIntro from "./SectionIntro";
import Reveal from "./Reveal";
import { whyMicroDegree } from "@/data/content";
import { ZapIcon, WrenchIcon, GlobeIcon } from "./icons/WhyIcons";
import { BriefcaseIcon } from "./icons/AudienceIcons";

const icons = [ZapIcon, WrenchIcon, BriefcaseIcon, GlobeIcon];

export default function WhyMicroDegreeSection() {
  return (
    <section data-screen-label="Why MicroDegree" className={styles.section}>
      {/* <div className={styles.watermark}>ಏಕೆ</div> */}
      <div className={styles.container}>
        <SectionIntro index="03" label="why us" title="Why MicroDegree" />
        <div className={styles.grid}>
          {whyMicroDegree.map((title, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={title} delay={i * 80}>
                <div className={styles.card}>
                  <span className={styles.glyph}>
                    <Icon className={styles.glyphIcon} />
                  </span>
                  <div className={styles.title}>{title}</div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
