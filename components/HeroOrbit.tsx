import Image from "next/image";
import styles from "./HeroOrbit.module.css";
import { asset } from "@/lib/assetPath";

// scale corrects for each source logo's baked-in transparent padding so all
// marks read as the same visual size inside their badge (measured from each
// PNG/JPG's actual non-transparent content bounding box).
const ORBIT_TOPICS = [
  { label: "AWS", src: asset("/images/revol_asset/aws.webp"), angle: 0, scale: 1.08 },
  { label: "Azure", src: asset("/images/revol_asset/azure.webp"), angle: 45, scale: 1 },
  { label: "Google Cloud", src: asset("/images/revol_asset/gcp.webp"), angle: 90, scale: 1.18 },
  { label: "Kubernetes", src: asset("/images/revol_asset/kubernetes.webp"), angle: 135, scale: 2 },
  { label: "Docker", src: asset("/images/revol_asset/docker.webp"), angle: 180, scale: 1 },
  { label: "Terraform", src: asset("/images/revol_asset/terraform.webp"), angle: 225, scale: 1 },
  { label: "GitHub", src: asset("/images/revol_asset/github.webp"), angle: 270, scale: 1.05 },
  { label: "Prometheus", src: asset("/images/revol_asset/prometheus.webp"), angle: 315, scale: 1.12 },
];

export default function HeroOrbit() {
  return (
    <div className={styles.stage}>
      <div className={styles.orbitPath} />

      <div className={styles.mapWrap}>
        <Image
          src={asset("/images/Kmap.webp")}
          alt="Map of Karnataka"
          fill
          sizes="(max-width: 819px) 70vw, 360px"
          className={styles.mapImage}
          quality={65}
          preload
        />
      </div>

      <div className={styles.orbitRing}>
        {ORBIT_TOPICS.map((topic) => (
          <div key={topic.label} className={styles.orbitItem} style={{ transform: `rotate(${topic.angle}deg) translateX(var(--orbit-radius))` }}>
            <div
              className={styles.orbitCounter}
              style={{ transform: `translate(-50%, -50%) rotate(${-topic.angle}deg)` }}
            >
              <div className={styles.orbitBadge}>
                <Image
                  src={topic.src}
                  alt={topic.label}
                  fill
                  sizes="60px"
                  className={styles.orbitBadgeImage}
                  style={{ transform: `scale(${topic.scale})` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
