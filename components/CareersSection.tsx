import styles from "./CareersSection.module.css";
import SectionIntro from "./SectionIntro";
import Reveal from "./Reveal";
import { careerFromRoles, careerToTracks } from "@/data/content";
import { CloudIcon, InfinityIcon, SparkleIcon, ArrowRightIcon } from "./icons/CareerIcons";

const trackIcons = [CloudIcon, InfinityIcon, SparkleIcon];

export default function CareersSection() {
  return (
    <section data-screen-label="Careers" className={styles.section}>
      <div className={styles.watermark}>{"</>"}</div>
      <div className={styles.container}>
        <SectionIntro
          index="05"
          label="outcomes"
          title="Career Paths"
          subtitle="Your current role doesn't have to dictate your next high paying one."
        />

        <div className={styles.pathWrap}>
          <div className={styles.fromCol}>
            <div className={styles.colLabel}>Where you start</div>
            <div className={styles.fromList}>
              {careerFromRoles.map((role, i) => (
                <Reveal key={role} delay={i * 60}>
                  <div className={styles.fromChip}>{role}</div>
                </Reveal>
              ))}
            </div>
          </div>

          <div className={styles.funnel} aria-hidden="true">
            <span className={styles.funnelLine} />
            <span className={styles.funnelBadge}>
              <ArrowRightIcon className={styles.funnelIcon} />
            </span>
          </div>

          <div className={styles.toCol}>
            <div className={styles.colLabel}>Where you can go</div>
            {careerToTracks.map((track, i) => {
              const Icon = trackIcons[i];
              return (
                <Reveal key={track.title} delay={i * 100}>
                  <div className={styles.trackCard}>
                    <div className={styles.trackHead}>
                      <span className={styles.trackGlyph}>
                        <Icon className={styles.trackGlyphIcon} />
                      </span>
                      <span className={styles.trackTitle}>{track.title}</span>
                    </div>
                    <div className={styles.trackRoles}>
                      {track.roles.map((r) => (
                        <span key={r} className={styles.trackRole}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
