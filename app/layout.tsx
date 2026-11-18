import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Sans, DM_Mono, Noto_Sans_Kannada } from "next/font/google";
import { asset } from "@/lib/assetPath";
import { CANONICAL_ORIGIN, OG_IMAGE, canonical, socialMeta } from "@/lib/seo";
import { socialLinks } from "@/data/content";
import Analytics from "@/components/Analytics";
import VisitorTracker from "@/components/VisitorTracker";
import "./globals.css";

const SITE_TITLE = "MicroDegree | Cloud, DevOps, Kubernetes & GenAI Courses in Kannada";
const SITE_DESCRIPTION =
  "MicroDegree is an online e-learning platform for self-paced Cloud, DevOps, Kubernetes, Agentic AI and GenAI courses in Kannada with live mentors and real projects.";
const LOGO_IMAGE = canonical("/images/MicroDegree-Incubator-Logo.png");

// Organization + WebSite structured data so Google has an unambiguous entity to attach to
// brand searches ("microdegree", "microdegree courses") and can build a Knowledge Panel.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": `${CANONICAL_ORIGIN}/#organization`,
      name: "MicroDegree",
      url: CANONICAL_ORIGIN,
      logo: LOGO_IMAGE,
      sameAs: socialLinks.map((link) => link.href),
    },
    {
      "@type": "WebSite",
      "@id": `${CANONICAL_ORIGIN}/#website`,
      url: CANONICAL_ORIGIN,
      name: "MicroDegree",
      inLanguage: "en-IN",
      publisher: { "@id": `${CANONICAL_ORIGIN}/#organization` },
    },
  ],
};

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const notoSansKannada = Noto_Sans_Kannada({
  subsets: ["kannada"],
  weight: ["400", "600", "700"],
  variable: "--font-kannada",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  applicationName: "MicroDegree",
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    "MicroDegree",
    "MicroDegree courses",
    "e learning platform",
    "online courses in Kannada",
    "Cloud courses",
    "DevOps courses",
    "Kubernetes courses",
    "Generative AI courses",
    "GenAI courses",
    "learn tech in Kannada",
  ],
  authors: [{ name: "MicroDegree", url: CANONICAL_ORIGIN }],
  creator: "MicroDegree",
  publisher: "MicroDegree",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    // Absolute so the "/learning" sub-path isn't stripped when resolved against metadataBase.
    canonical: canonical("/"),
  },
  icons: {
    icon: asset("/images/favicon.ico"),
    apple: asset("/images/roundlogo.webp"),
  },
  ...socialMeta({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/" }),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${dmSans.variable} ${dmMono.variable} ${notoSansKannada.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        {children}
        <Analytics />
        <VisitorTracker />
      </body>
    </html>
  );
}
