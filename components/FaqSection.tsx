"use client";

import { useState } from "react";
import styles from "./FaqSection.module.css";
import introStyles from "./SectionIntro.module.css";
import Reveal from "./Reveal";
import { faqs } from "@/data/content";
import { asset } from "@/lib/assetPath";

// Set here (not in CSS) so the basePath prefix applies under microdegree.work/learning.
const bgStyle = { "--section-bg": `url(${asset("/images/sec_background/faq.webp")})` } as React.CSSProperties;

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" data-screen-label="FAQ" className={styles.section}>
      <div className={styles.bgImage} style={bgStyle} />
      <div className={styles.container}>
        <Reveal>
          <div className={introStyles.eyebrow}>07 / faq</div>
          <h2 className={introStyles.heading}>Questions, answered</h2>
        </Reveal>
        <div className={styles.list}>
          {faqs.map((f, i) => {
            const open = openIndex === i;
            return (
              <Reveal key={f.q} delay={i * 50}>
                <div className={styles.item}>
                  <button
                    type="button"
                    className={styles.question}
                    aria-expanded={open}
                    onClick={() => setOpenIndex((cur) => (cur === i ? null : i))}
                  >
                    {f.q}
                    <span className={styles.sign}>{open ? "–" : "+"}</span>
                  </button>
                  {open && <p className={styles.answer}>{f.a}</p>}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
