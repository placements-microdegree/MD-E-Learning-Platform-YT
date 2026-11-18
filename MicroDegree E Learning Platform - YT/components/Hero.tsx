import styles from "./Hero.module.css";
import HeroOrbit from "./HeroOrbit";
import { heroStats } from "@/data/content";
import { asset } from "@/lib/assetPath";

// Background images live in /public and are set here (not in CSS) so the basePath
// prefix is applied when the app is served under microdegree.work/learning.
const heroBg: React.CSSProperties = {
  "--hero-bg": `url(${asset("/images/sec_background/hero.webp")})`,
  "--hero-bg-mobile": `url(${asset("/images/sec_background/hero_mbl.webp")})`,
} as React.CSSProperties;

export default function Hero({
  ctaLabel = "Enroll@399",
  enrollHref,
}: {
  ctaLabel?: string;
  enrollHref: string;
}) {
  return (
    <section id="top" data-screen-label="Hero" className={styles.section}>
      {/*
        The backdrop below is a CSS background-image (set via the --hero-bg custom
        property), so the browser can't discover it until the stylesheet is parsed
        and the element is laid out — late enough to gate LCP. Preload it here.
        Art-directed: the desktop/mobile split matches the media query in
        Hero.module.css, and only the matching one is fetched.
      */}
      <link
        rel="preload"
        as="image"
        href={asset("/images/sec_background/hero.webp")}
        media="(min-width: 820px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={asset("/images/sec_background/hero_mbl.webp")}
        media="(max-width: 819px)"
        fetchPriority="high"
      />
      <div className={styles.bgImage} style={heroBg} />
      <div className={styles.dotGrid} />
      <div className={styles.orbOne} />
      <div className={styles.orbTwo} />
      {/* <div className={styles.watermark}>ಕನ್ನಡ</div> */}

      <div className={styles.grid}>
        <div className={styles.copy}>
          {/* <div className={styles.badge}>
            <span className={styles.badgeDot} />
            cloud · devops · gen ai
          </div> */}
          <h1 className={styles.h1}>
            <span className={styles.h1Primary}>
              # Learn Tech 10X <br className={styles.mobileBreak} />
              Faster in Kannada
            </span>
            <br />
            <span className={styles.h1Gradient}>
              Become a Global <br className={styles.mobileBreak} />
              Tech Talent
            </span>
          </h1>
          <p className={styles.lede}>
            Practise Cloud, DevOps, Kubernetes, Agentic AI, GenAI & many more through self paced courses designed
            for IT professional.
          </p>
          <div className={styles.actions}>
            <a href={enrollHref} className={styles.ctaPrimary}>
              {ctaLabel}
            </a>
            <a href="#courses" className={styles.ctaSecondary}>
              Explore Skills
            </a>
          </div>
          {/* <div className={styles.stats}>
            {heroStats.map((s) => (
              <div key={s.label}>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div> */}
        </div>

        <div className={styles.artFrame}>
          <HeroOrbit />
        </div>
      </div>
    </section>
  );
}
