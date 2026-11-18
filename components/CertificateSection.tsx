import Image from "next/image";
import styles from "./CertificateSection.module.css";
import introStyles from "./SectionIntro.module.css";
import Reveal from "./Reveal";
import { certPoints, CERTIFICATE_IMAGE } from "@/data/content";

export default function CertificateSection({ enrollHref }: { enrollHref: string }) {
  return (
    <section id="certificate" data-screen-label="Certificate" className={styles.section}>
      <div className={styles.container}>
        <Reveal>
          <div className={styles.artOuter}>
            <div className={styles.artInner}>
              <Image
                src={CERTIFICATE_IMAGE}
                alt="MicroDegree certificate preview"
                fill
                sizes="(max-width: 819px) 100vw, 560px"
                className={styles.artMedia}
              />
            </div>
          </div>
        </Reveal>
        <Reveal delay={120} className={styles.copy}>
          <div className={introStyles.eyebrow}>06 / certification</div>
          <h2 className={introStyles.heading}>A certificate that carries weight</h2>
          <p className={styles.lede}>
            Finish the program and receive a professional MicroDegree Certificate -  verified, shareable and built
            for recruiters.
          </p>
          {/* <div className={styles.points}>
            {certPoints.map((p) => (
              <div key={p} className={styles.point}>
                <span className={styles.pointDot} />
                {p}
              </div>
            ))}
          </div> */}
          <a href={enrollHref} className={styles.cta}>
            Get Certified
          </a>
        </Reveal>
      </div>
    </section>
  );
}
