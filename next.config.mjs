/** @type {import('next').NextConfig} */

// When this app is served under a sub-path of another domain (microdegree.work/learning),
// the hosting deployment sets NEXT_PUBLIC_BASE_PATH=/learning. Left unset (the microdegree.in
// deployment and local dev), the app serves from the root exactly as before.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  images: {
    // Serve AVIF first (≈20-30% smaller than WebP), fall back to WebP, then the
    // original. Every next/image on the site picks this up; the CSS-background
    // hero image in Hero.tsx is the one exception (not routed through /_next/image).
    formats: ["image/avif", "image/webp"],
    // Next 16 requires an explicit allowlist. 75 is the default; 65 is used for
    // large decorative images (e.g. the Karnataka map in HeroOrbit).
    qualities: [65, 75],
  },
  // /upskill serves the performance team's static landing page (public/upskill/index.html).
  async rewrites() {
    return [
      { source: "/upskill", destination: "/upskill/index.html" },
      { source: "/upskill/", destination: "/upskill/index.html" },
      // /tech-courses: static organic landing page (public/tech-courses/index.html); same pattern as /upskill.
      { source: "/tech-courses", destination: "/tech-courses/index.html" },
      { source: "/tech-courses/", destination: "/tech-courses/index.html" },
    ];
  },
  ...(basePath
    ? {
        basePath,
        // Behind the microdegree.work Netlify proxy, a trailing-slash redirect from
        // this app would send the browser to the raw origin host. Serve both forms 200
        // instead and let rel=canonical dedupe.
        skipTrailingSlashRedirect: true,
      }
    : {}),
};

export default nextConfig;
