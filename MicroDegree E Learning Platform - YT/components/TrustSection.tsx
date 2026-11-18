import Image from "next/image";
import styles from "./TrustSection.module.css";
import SectionIntro from "./SectionIntro";
import Reveal from "./Reveal";
import { trust, trustHighlights } from "@/data/content";
import { asset } from "@/lib/assetPath";

// Set here (not in CSS) so the basePath prefix applies under microdegree.work/learning.
const bgStyle = { "--section-bg": `url(${asset("/images/sec_background/programs.webp")})` } as React.CSSProperties;

export default function TrustSection() {
  return (
    <section data-screen-label="Trust" className={styles.section}>
      <div className={styles.bgImage} style={bgStyle} />
      {/* <div className={styles.watermark}>ನಂಬಿಕೆ</div> */}
      <div className={styles.container}>
        <SectionIntro
          index="02"
          label="proof"
          title="Trusted by Kannadiga IT Professionals & Tech Enthusiasts"
          subtitle="7 years of Kannada-first tech education – all of it in public."
        />

        <div className={styles.highlightGrid}>
          {trustHighlights.map((h, i) => (
            <Reveal key={`${h.value}-${h.label}`} delay={i * 80}>
              <div className={styles.highlightCard}>
                <span className={styles.highlightGlyph}>
                  <Image
                    src={h.logo}
                    alt={h.value}
                    fill
                    sizes="148px"
                    className={styles.highlightGlyphImage}
                  />
                </span>
                <div>
                  <div className={styles.highlightValue}>{h.value}</div>
                  <div className={styles.highlightLabel}>{h.label}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <div className={styles.grid}>
          {trust.map((t, i) => (
            <Reveal key={t.title} delay={(i % 3) * 90}>
              <div className={styles.card}>
                <div className={styles.imageSlot}>
                  <Image
                    src={t.image}
                    alt={t.title}
                    fill
                    sizes="(max-width: 819px) 100vw, 33vw"
                    className={styles.imageSlotMedia}
                  />
                  <div className={styles.imageOverlay}>
                    <div className={styles.imageText}>
                      <p className={styles.imageHeading}>{t.heading}</p>
                      <p className={styles.imageCaption}>{t.caption}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
