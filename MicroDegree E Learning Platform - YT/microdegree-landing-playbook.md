# MicroDegree Landing-Site Playbook

> **What this file is.** A reference hand-off describing how the `microdegree.work/learning`
> marketing site (Next.js) is built, written for the Claude Code instance working in a
> **separate Astro repo** that will host per-track ad landing pages (`/clouddevops`, `/genai`, …).
>
> **Scope: frontend only.** The auth layer (Supabase session → Graphy SSO) and the `graphy_*`
> analytics data mirror from the original repo are deliberately **out of scope** — the Astro
> ad-landing project doesn't need them. CTAs here are just links to external Graphy URLs.
>
> This is architecture and conventions, not an implementation spec. The repo owner will drive
> the actual build. Read this, then wait for instructions.

---

## 1. What the original site is

A single marketing site for MicroDegree (Cloud / DevOps / GenAI courses taught in Kannada).
It is one **long-scroll landing page** assembled from ~15 independent section components, plus a
few legal/login sub-pages. The same page component is reused for URL variants:

| Route | What renders | How it differs |
|---|---|---|
| `/` | Full landing page (Free + Premium plans) | `variant="default"` |
| `/premium` | Paid-only cut for Meta ad traffic, `noindex` | `variant="premium"` → Courses section shows one plan |

The entire divergence between variants is **one prop** threaded from the route into a shared
`LandingPage` component. This is the pattern the Astro project generalises: instead of
`default | premium`, you'll have one landing page per track (`clouddevops`, `genai`, …), each a
route that renders a shared page shell with a track key.

---

## 2. The core idea: content / presentation split

**Copy and data never live in components.** They live in one module, `data/content.ts`, exported
as typed constants and builder functions. Components import from there and only decide layout.

```
data/content.ts        ← all text, prices, nav links, testimonials, FAQ, curriculum, stats
components/*.tsx        ← layout + styling only; import their strings from data/content.ts
components/*.module.css ← one co-located stylesheet per component
```

Example shape from `data/content.ts`:

```ts
export const faqs = [
  { q: "Will I receive a certificate?", a: "Yes, with the Premium plan. …" },
  …
];

export const audiences = [
  { tag: "01", title: "IT professionals", body: "Upskill for your next role in Cloud, DevOps or GenAI" },
  …
];

// Builders take runtime values (CTA label, checkout URL) and return the data structure:
export function buildPlans(ctaLabel: string, checkoutUrl: string, freeCourseUrl: string): Plan[] { … }
```

**Why it matters for the Astro project:** each track landing page is "the same page with
different words." If content is centralised and keyed by track, a new landing page is a new
data entry, not a new set of components. Aim for:

```
src/content/tracks/clouddevops.ts   (or .json / .md frontmatter / Astro content collection)
src/content/tracks/genai.ts
src/content/shared.ts                (nav, footer, social, trust logos — identical everywhere)
```

Each track file supplies: hero headline/sub, curriculum modules, pricing, testimonials to
feature, FAQ, CTA URLs. The shared file supplies everything that's the same on every page.

---

## 3. Section components

Each visual band of the page is its own component with a co-located CSS module:

```
components/Hero.tsx              + Hero.module.css
components/TrustSection.tsx      + TrustSection.module.css
components/CoursesSection.tsx    + CoursesSection.module.css
components/WhyMicroDegreeSection.tsx …
components/AudienceSection.tsx
components/CareersSection.tsx
components/TestimonialsSection.tsx
components/CertificateSection.tsx
components/FaqSection.tsx
components/ReferralSection.tsx
components/FinalCta.tsx
components/Navbar.tsx
components/Footer.tsx
components/StickyMobileCta.tsx
```

Conventions:

- **Props are the seam for anything that changes between pages/variants.** A section takes
  `ctaLabel`, `checkoutHref`, `premiumOnly`, etc. as props; it does not read global state or
  decide variant logic itself. Example — `CoursesSection` receives `premiumOnly` and filters
  the plan list; it doesn't know what `/premium` is.
- **Each section renders one `<section>` with a stable `id`** (`#courses`, `#faq`, …) so the
  navbar can anchor-scroll to it.
- **Shared helpers, not duplication:**
  - `components/SectionIntro.tsx` — the eyebrow + `<h2>` + subtitle block every section opens
    with. Takes `index`, `label`, `title`, `subtitle`.
  - `components/Reveal.tsx` — a scroll-into-view wrapper (`IntersectionObserver`, unobserves
    after first reveal, optional `delay` for stagger). Wrap anything that should animate in.

**Astro mapping:** these become `.astro` components (`src/components/Hero.astro` + scoped
`<style>` blocks, which Astro scopes automatically — no `.module.css` needed). `Reveal` becomes
either a tiny client-side script (`<script>` with an IntersectionObserver over
`[data-reveal]`) or a `client:visible` island — prefer the plain script; it's an ad landing
page and JS weight matters. `SectionIntro` is a straight port.

---

## 4. The shared page shell

`components/LandingPage.tsx` is the whole page in one file: it imports every section, defines
the CTA URLs and labels once at the top, and threads them down as props. The route files are
one line each:

```tsx
// app/page.tsx
export default function Home() { return <LandingPage variant="default" />; }

// app/premium/page.tsx
export default function PremiumLandingPage() { return <LandingPage variant="premium" />; }
```

`LandingPage` itself:

```tsx
export type LandingVariant = "default" | "premium";

export default function LandingPage({ variant = "default" }: { variant?: LandingVariant }) {
  const premiumOnly = variant === "premium";
  return (
    <div>
      <Navbar ctaLabel={LOGIN_LABEL} enrollHref={DASHBOARD_HREF} referHref={REFERRAL_HREF} />
      <Hero ctaLabel={ENROLL_CTA_LABEL} enrollHref={CHECKOUT_HREF} />
      <TrustSection />
      <CoursesSection checkoutHref={CHECKOUT_HREF} freeCourseHref={FREE_COURSE_HREF} premiumOnly={premiumOnly} />
      … every other section …
      <Footer />
    </div>
  );
}
```

The in-repo comment spells out the intended growth path, and it's exactly what the Astro
project needs from day one:

> When the managers later want genuinely different copy per URL, add variant-keyed overrides
> in `data/content.ts` (e.g. `content.premium?.hero ?? content.hero`) — only for the sections
> that actually differ; the rest keeps falling through to the shared copy.

**Astro mapping.** Build one layout that takes the track's content object and renders the
sections:

```
src/layouts/TrackLanding.astro   ← imports all sections, takes `track` content as a prop
src/pages/clouddevops.astro      ← import clouddevops content; <TrackLanding track={content} />
src/pages/genai.astro            ← same, genai content
```

or a single dynamic route `src/pages/[track].astro` with `getStaticPaths()` iterating an Astro
content collection — cleaner once there are more than ~3 tracks. Sections read fields off the
one `track` object; a section falls back to shared defaults when the track doesn't override
(`track.hero ?? shared.hero`).

---

## 5. Sub-path hosting + canonical URLs (important, easy to get wrong)

The original app ships to **two deployments from one codebase**:

- `microdegree.in` — served at domain root.
- `microdegree.work/learning` — reverse-proxied under a `/learning` sub-path.

Three env vars drive the difference (all `NEXT_PUBLIC_*`, inlined at build):

| Var | Root deploy | Sub-path deploy | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_BASE_PATH` | *(blank)* | `/learning` | Next.js `basePath`; prefixes routes/assets |
| `NEXT_PUBLIC_SITE_URL` | `https://microdegree.in` | `https://www.microdegree.work/learning` | canonical serving origin for auth redirects |
| `NEXT_PUBLIC_CANONICAL_ORIGIN` | `https://www.microdegree.work/learning` | same | `rel=canonical` target — **both** deploys point here so SEO signal consolidates on one URL |

Supporting helpers:

- `lib/assetPath.ts` — `asset(path)` prefixes `BASE_PATH` onto root-absolute URLs. Needed
  because `next/link` applies `basePath` automatically but **plain `<a href>`, `<img src>`,
  `next/image` src, CSS `url()` backgrounds, and `window.location` do not**. Every raw asset
  reference in `data/content.ts` is wrapped in `asset(...)`.
- `lib/seo.ts` — `CANONICAL_ORIGIN` constant + `canonical(path)` → absolute canonical URL.
  `app/layout.tsx` sets `metadataBase` and `alternates.canonical` from it.

**Astro mapping.** Astro has this built in: set `base` and `site` in `astro.config.mjs`
(`site` feeds `Astro.site` and canonical/sitemap; `base` feeds `import.meta.env.BASE_URL`).
Use `@astrojs/sitemap` and set `<link rel="canonical">` per page in the layout `<head>`.
If the ad pages live at their own domain root, most of this collapses to just setting `site`
correctly — but **decide the canonical strategy before building**, because retrofitting
canonical tags across many ad pages is tedious. Ad landing pages are also usually `noindex`
(see `/premium`'s `robots: { index: false }`) so they don't compete with the main site.

---

## 6. Design tokens

`app/globals.css` defines the palette and font stacks as CSS custom properties on `:root`;
every component stylesheet references `var(--color-violet)` etc. rather than hardcoding hex.

```css
:root {
  --color-ink: #17121f;
  --color-violet: #4b1be0;
  --color-pink: #fa1055;
  --gradient-brand: linear-gradient(120deg, #4b1be0, #fa1055);
  --font-heading: …; --font-body: …; --font-kannada: …;
}
```

Fonts are loaded via `next/font/google` in the layout (Plus Jakarta Sans / DM Sans / DM Mono /
Noto Sans Kannada) and exposed as `--font-*` variables.

**Astro mapping.** Same `:root` token block in a global stylesheet imported once by the layout.
Load fonts with `@fontsource/*` packages or self-hosted `@font-face` (better for ad-landing
performance and Core Web Vitals than a runtime Google Fonts request). Keep the exact same token
names and hex values so the two sites stay visually identical.

---

## 7. Analytics

`components/Analytics.tsx` picks a GA4 measurement ID by `window.location.hostname` (one
property per domain), lazy-loads `gtag.js`, and sends nothing on unknown hosts (localhost,
preview URLs). 

**Astro mapping.** One small `<script>` in the layout, or `@astrojs/partytown` to keep the tag
off the main thread. Ad pages typically also need the Meta pixel / Google Ads conversion tag —
gate those the same way (only fire on the real production host).

---

## 8. Conventions worth keeping

- **No hardcoded copy in markup.** If you're typing a sentence into a component, it belongs in
  a content file.
- **Props over globals for variation.** A section component should be reusable on any page by
  passing different props; it should never branch on "which page am I on."
- **One stylesheet per component, scoped.** (Astro scopes `<style>` automatically.)
- **Stable section `id`s** for anchor navigation.
- **Every asset URL goes through the base-path/site helper**, never a bare string, if there's
  any chance of sub-path hosting.
- **Shared vs. per-track content are separate files.** Changing the footer once updates every
  landing page.
- **Ad pages are `noindex`** and have their own canonical strategy decided up front.

---

## 9. Original repo layout (for reference)

```
app/
  layout.tsx           root layout: fonts, <head> metadata, canonical, Analytics
  page.tsx             "/"  → <LandingPage variant="default" />
  premium/page.tsx     "/premium" → <LandingPage variant="premium" />, noindex
  privacy|terms/       static legal pages
  globals.css          design tokens
components/
  LandingPage.tsx      the shared page shell — imports every section, defines CTA URLs
  <Section>.tsx + <Section>.module.css   one pair per band of the page
  SectionIntro.tsx     shared eyebrow/title/subtitle
  Reveal.tsx           shared scroll-in animation wrapper
  icons/               inline SVG icon sets
data/
  content.ts           ALL copy/data + buildPlans() builder
lib/
  assetPath.ts         asset() — base-path prefixing
  seo.ts               canonical() + CANONICAL_ORIGIN
next.config.mjs        basePath wiring, image formats
```

The Astro equivalent, roughly:

```
astro.config.mjs               site + base, @astrojs/sitemap
src/layouts/TrackLanding.astro  shared shell (sections in order)
src/pages/[track].astro         or one file per track
src/components/*.astro          section components, scoped <style>
src/components/SectionIntro.astro
src/content/                    Astro content collection: one entry per track + shared.ts
src/styles/global.css           design tokens (same names/values as original)
src/scripts/reveal.ts           IntersectionObserver reveal
```
