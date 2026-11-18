import styles from "./ReferralSection.module.css";
import Reveal from "./Reveal";

export default function ReferralSection({ referHref }: { referHref: string }) {
  return (
    <section id="refer" data-screen-label="Refer & Earn" className={styles.section}>
      <div className={styles.container}>
        <Reveal className={styles.banner}>
          <div className={styles.dotOverlay} />
          <div className={styles.eyebrow}>08 / refer &amp; earn</div>
          <h2 className={styles.heading}>Know someone who&apos;d love this? Refer &amp; earn.</h2>
          <p className={styles.lede}>
            Share MicroDegree with your friends -  for every referral who enrolls, you earn rewards from US.
          </p>
          <a href={referHref} className={styles.cta}>
            Refer &amp; Earn
          </a>
        </Reveal>
      </div>
    </section>
  );
}
