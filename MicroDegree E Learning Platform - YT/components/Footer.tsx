import Image from "next/image";
import Link from "next/link";
import styles from "./Footer.module.css";
import Reveal from "./Reveal";
import { socialLinks } from "@/data/content";
import { asset } from "@/lib/assetPath";
import { InstagramIcon, YoutubeIcon, LinkedinIcon, XIcon, FacebookIcon } from "./icons/SocialIcons";

const socialIcons = {
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
  x: XIcon,
  facebook: FacebookIcon,
};

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <Reveal className={styles.grid}>
        <div>
          <span className={styles.logoPill}>
            <Image
              src={asset("/images/NewMicroDegree-RIIDL-Logo.f91e4da6cca73c99835c.webp")}
              alt="MicroDegree"
              width={460}
              height={83}
              className={styles.logoImg}
            />
          </span>
          <p className={styles.blurb}>Kannada-first tech education for cloud, DevOps and AI careers.</p>
          <a
            href="https://api.whatsapp.com/send?phone=918660238620&text=Hello%2C%20I%20have%20a%20question%20regarding%20Courses%2FCertification%2FOthers"
            className={styles.whatsapp}
          >
            Chat on WhatsApp
          </a>
        </div>

        <div>
          <div className={styles.colLabel}>contact</div>
          <div className={styles.contactLinks}>
            <a href="tel:08047109999">0804-710-9999</a>
            <a href="mailto:hello@microdegree.work">hello@microdegree.work</a>
          </div>
          <div className={styles.socialRow}>
            {socialLinks.map((s) => {
              const Icon = socialIcons[s.platform as keyof typeof socialIcons];
              return (
                <a
                  key={s.platform}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className={styles.socialIcon}
                >
                  <Icon className={styles.socialIconGlyph} />
                </a>
              );
            })}
          </div>
        </div>

        <div>
          <div className={styles.colLabel}>mangaluru</div>
          <p className={styles.address}>
            K-tech Innovation Hub, 3rd Floor,
            <br />
            Plama Building, Bejai,
            <br />
            Mangaluru, Karnataka 575004
          </p>
        </div>

        <div>
          <div className={styles.colLabel}>bengaluru</div>
          <p className={styles.address}>
            Sri Guruprasad Vasavi Classic, 3rd Floor,
            <br />
            10th Main Road, 4th Block, Jayanagar,
            <br />
            Bengaluru, Karnataka 560011
          </p>
        </div>
      </Reveal>

      <div className={styles.bottomBar}>
        <span>© 2026 MicroDegree</span>
        <span className={styles.legalLinks}>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Use</Link>
        </span>
        <span>ಕರ್ನಾಟಕದಲ್ಲಿ ನಿರ್ಮಿಸಲಾಗಿದೆ</span>
      </div>
    </footer>
  );
}
