"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./CoursesSection.module.css";
// import PriceToggle from "./PriceToggle"; // Billing-period toggle — parked for a later launch.
import { trackIcons } from "./icons/TrackIcons";
import type { Plan } from "@/data/content";

export default function PlanCard({ plan: p, wide = false }: { plan: Plan; wide?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div
      className={`${styles.planOuter} ${wide ? styles.wide : ""}`}
      style={{ background: p.shell, boxShadow: p.shadow }}
    >
      <div className={styles.planInner}>
        <div className={styles.planBadges}>
          {p.offer ? <span className={styles.offerBadge}>{p.offer}</span> : null}
          <span className={styles.planBadge} style={{ background: p.badgeBg, color: p.badgeColor }}>
            {p.badge}
          </span>
        </div>
        {/* .planMain / .planAside are plain blocks in the normal card; the wide variant
            (/premium, desktop only) lays them out as two columns — see CoursesSection.module.css */}
        <div className={styles.planMain}>
        <div className={styles.planHead}>
          <div className={styles.planName}>
            <div className={styles.planTitle}>{p.name}</div>
            <p className={styles.planBlurb}>{p.blurb}</p>
          </div>
          <div className={styles.planCount}>
            <div className={styles.planCountValue} style={{ color: p.accent }}>
              {p.count}
            </div>
            <div className={styles.planCountLabel}>courses</div>
          </div>
        </div>

        {/* Billing-period toggle parked for later — single price for the 2-month launch offer.
        {p.priceOptions ? (
          <PriceToggle options={p.priceOptions} accent={p.accent} selected={selected} onSelect={setSelected} />
        ) : ( ... )} */}
        <div className={styles.priceRow}>
          {p.originalPrice ? <span className={styles.originalPrice}>{p.originalPrice}</span> : null}
          <span className={styles.priceValue} style={{ color: p.accent }}>
            {p.price}
          </span>
          {p.discount ? (
            <span className={styles.discountChip} style={{ background: p.accent }}>
              {p.discount}
            </span>
          ) : null}
          <span className={styles.priceUnit}>{p.priceUnit}</span>
        </div>

        <div className={styles.levelBadge} style={{ color: p.accent }}>
          {p.level}
        </div>

        <div className={styles.highlights}>
          {p.highlights.map((h, i) => (
            <span key={h} className={styles.highlightChip}>
              <span className={styles.highlightDot} style={{ background: p.accent }} />
              {/* Icon badge only shows in the wide (/premium) card; hidden by CSS elsewhere. */}
              <span className={styles.highlightIcon} style={{ color: p.accent }} aria-hidden="true">
                {highlightIcons[i % highlightIcons.length]}
              </span>
              {h}
            </span>
          ))}
        </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.planAside}>
        <div className={styles.tracksHead}>
          <span className={styles.tracksLabel} style={{ color: p.accent }}>
            Tracks included
          </span>
          <button type="button" className={styles.curriculumBtn} style={{ color: p.accent, borderColor: p.accent }} onClick={() => setOpen(true)}>
            See full curriculum
          </button>
        </div>

        <div className={styles.tracks}>
          {p.tracks.map((t) => {
            const Icon = trackIcons[t.icon];
            return (
              <span
                key={t.label}
                className={`${styles.trackChip} ${t.locked ? styles.trackLocked : ""}`}
                aria-label={t.locked ? `${t.label} (not included)` : undefined}
              >
                <Icon className={styles.trackIcon} />
                {t.label}
                {t.locked ? <CrossIcon className={styles.trackX} /> : null}
              </span>
            );
          })}
        </div>

        <div className={styles.certRow} data-included={p.certificateIncluded}>
          {p.certificateIncluded ? (
            <CheckIcon className={styles.certIcon} style={{ color: p.accent }} />
          ) : (
            <CrossIcon className={styles.certIcon} />
          )}
          {p.certificateIncluded ? "Shareable certificate provided" : "No shareable certificate"}
        </div>
        </div>

        <a href={p.href} className={styles.ctaWrap}>
          <span
            className={styles.ctaButton}
            style={{ background: p.btnBg, border: p.btnBorder, color: p.btnColor, boxShadow: p.btnShadow }}
          >
            {p.cta}
          </span>
        </a>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
        <div className={styles.modalBackdrop} onClick={() => setOpen(false)} role="presentation">
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={`${p.name} curriculum`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHead} style={{ background: p.headerBg }}>
              <div>
                <div className={styles.modalTitle}>{p.name} — full curriculum</div>
                <div className={styles.modalSub}>
                  {p.count} courses · {p.tracks.filter((t) => !t.locked).length} tracks
                </div>
              </div>
              <button type="button" className={styles.modalClose} aria-label="Close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {p.curriculum.map((c) => {
                const meta = p.tracks.find((t) => t.label === c.track);
                const Icon = meta ? trackIcons[meta.icon] : null;
                return (
                  <div key={c.track} className={styles.curTrack}>
                    <div className={styles.curTrackHead} style={{ color: p.accent }}>
                      {Icon ? <Icon className={styles.trackIcon} /> : null}
                      {c.track}
                      <span className={styles.curCount}>{c.topics.length} topics</span>
                    </div>
                    <div className={styles.curTopics}>
                      {c.topics.map((topic, i) => (
                        <span key={`${topic}-${i}`} className={styles.curTopic}>
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <a href={p.href} className={styles.modalCta}>
              <span
                className={styles.ctaButton}
                style={{ background: p.btnBg, border: p.btnBorder, color: p.btnColor, boxShadow: p.btnShadow }}
              >
                {p.cta}
              </span>
            </a>
          </div>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const highlightIcons = [
  <svg key="book" {...iconProps}><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" /><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" /></svg>,
  <svg key="play" {...iconProps}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" /></svg>,
  <svg key="rec" {...iconProps}><path d="M7 5v14l12-7L7 5Z" fill="currentColor" /></svg>,
  <svg key="gear" {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>,
  <svg key="people" {...iconProps}><circle cx="9" cy="8" r="3.2" fill="currentColor" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0Z" fill="currentColor" /><circle cx="17" cy="9" r="2.5" fill="currentColor" /><path d="M17 14.5a5 5 0 0 1 4.5 5.5H18" fill="currentColor" /></svg>,
  <svg key="bars" {...iconProps}><path d="M6 20v-8M12 20V5M18 20v-12" strokeWidth="3.5" /></svg>,
];

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path
        d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
