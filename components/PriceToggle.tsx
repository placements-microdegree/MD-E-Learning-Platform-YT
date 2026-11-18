"use client";

import styles from "./CoursesSection.module.css";

export default function PriceToggle({
  options,
  accent,
  selected,
  onSelect,
}: {
  options: { label: string; price: string; originalPrice?: string; discount?: string; priceUnit: string }[];
  accent: string;
  selected: number;
  onSelect: (index: number) => void;
}) {
  const current = options[selected];

  return (
    <div className={styles.priceRow}>
      {current.originalPrice ? <span className={styles.originalPrice}>{current.originalPrice}</span> : null}
      <span className={styles.priceValue} style={{ color: accent }}>
        {current.price}
      </span>
      {current.discount ? (
        <span className={styles.discountChip} style={{ background: accent }}>
          {current.discount}
        </span>
      ) : null}
      <span className={styles.priceUnit}>{current.priceUnit}</span>
      <div className={styles.priceToggle} role="tablist" aria-label="Billing period">
        {options.map((opt, i) => {
          const isActive = i === selected;
          return (
            <button
              key={opt.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={styles.priceToggleBtn}
              style={isActive ? { background: accent, borderColor: accent, color: "#FFFFFF" } : undefined}
              onClick={() => onSelect(i)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
