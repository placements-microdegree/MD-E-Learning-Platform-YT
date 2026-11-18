"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./Navbar.module.css";
import { navLinks } from "@/data/content";
import { asset } from "@/lib/assetPath";

export default function Navbar({
  ctaLabel = "Enroll Now",
  enrollHref,
  referHref,
  showLoginCta = true,
}: {
  ctaLabel?: string;
  enrollHref: string;
  referHref: string;
  showLoginCta?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        <a href="#top" className={styles.brand}>
          <Image
            src={asset("/images/NewMicroDegree-RIIDL-Logo.f91e4da6cca73c99835c.webp")}
            alt="MicroDegree"
            width={460}
            height={83}
            className={styles.logo}
            preload
          />
        </a>

        <div className={styles.desktopLinks}>
          {/* {navLinks.map((l) => (
            <a key={l.href} href={l.href} className={styles.link}>
              {l.label}
            </a>
          ))}
          <a href={referHref} className={styles.link}>
            Refer &amp; Earn
          </a> */}
          {showLoginCta && (
            <a href={enrollHref} className={styles.ctaDesktop}>
              {ctaLabel}
            </a>
          )}
        </div>

        <div className={styles.mobileBar}>
          <button
            type="button"
            aria-label="Menu"
            className={styles.burger}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              {l.label}
            </a>
          ))}
          <a href={referHref} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
            Refer &amp; Earn
          </a>
          {showLoginCta && (
            <a href={enrollHref} className={styles.mobileCta} onClick={() => setMenuOpen(false)}>
              {ctaLabel}
            </a>
          )}
        </div>
      )}
    </nav>
  );
}
