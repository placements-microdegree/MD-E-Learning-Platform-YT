# Reviews section — scrolling Google + LinkedIn reviews

## What we want

One section on the main landing page (`components/LandingPage.tsx`) with **two
auto-scrolling marquee rows**:

- **Row 1 — Google reviews.** Cards scrolling left, Google "G" icon per card,
  5-star row, reviewer name, review text. Card links to the Google review.
- **Row 2 — LinkedIn reviews.** Cards scrolling the opposite direction,
  LinkedIn icon per card, reviewer name, post text, optionally interleaved with
  certificate screenshot cards. Card links to the LinkedIn post.

Rows pause on hover. Mobile: same rows, cards ~82vw wide.

## This already exists — decide first

`components/TestimonialsSection.tsx` + `TestimonialsSection.module.css` already
build exactly this, wired into `LandingPage.tsx` as `<TestimonialsSection />`
and fed from `data/content.ts` (`googleReviews`, `linkedinReviews`,
`linkedinCertScreenshots`). Screenshots live in `public/images/linkedin_ss/`.

**`current-code/` in this folder is an exact copy of the live section** — the
component, its CSS module, `SectionIntro.module.css`, and both icon files. Read
those to see precisely how it works. The live content is already filled into
`content/*.md` and the live images into `images/`.

**Pick one when you hand this to Claude:**

- **A — Just refresh the content.** Replace the arrays in `data/content.ts`
  with the reviews in `content/` here and swap in the new screenshots. No new
  component. Fastest.
- **B — New standalone section** (e.g. you want a different look, or this to sit
  somewhere else on the page). Build `components/ReviewsSection.tsx` +
  `.module.css`, add data exports to `data/content.ts`, drop it into
  `LandingPage.tsx`. Keep `TestimonialsSection` or delete it.

Default to **A** unless the design notes below say otherwise.

## Content

`content/*.md` are pre-filled with the **exact reviews live on the site now**.
Edit them, add entries, or replace the lists:

- `content/google-reviews.md`    — name, stars, link, text
- `content/linkedin-reviews.md`  — name, link, text (no stars)
- `content/certificates.md`      — the cert images between the LinkedIn cards
  (file in `images/certificates/` → whose cert + which course)

Text can be truncated with `…` — cards clamp to 5 lines.

## Images

`images/` holds the **exact images the live section uses**:

- `images/certificates/` — the 6 cert screenshots (`linkedin-cert-1..6.webp`)
  that scroll between the LinkedIn cards → `public/images/linkedin_ss/`
- `images/reviews.webp`  — the faint section background → `public/images/sec_background/`

The review cards themselves are text-only (no photo). To change a cert, replace
its file (PNG fine — Claude converts to `.webp`) and update `content/certificates.md`.
See `images/README.md`.

## Design notes (edit me)

<!-- Anything specific: heading copy, eyebrow number, section order on the page,
colors, whether to interleave cert screenshots, scroll speed, etc. Leave blank
to match the current TestimonialsSection. -->

- Heading: _(default: "Learners, in their words")_
- Eyebrow: _(default: "05 / reviews")_
- Position on page: _(default: after CareersSection, before CertificateSection)_
- Interleave LinkedIn cert screenshots: _(default: yes)_

## How Claude wires it in (reference)

**Option A:**
1. Edit `data/content.ts` — replace `googleReviews`, `linkedinReviews`,
   `linkedinCertScreenshots` with the new content. Keep the `Review` type shape:
   `{ name, text, stars?, source, href }`.
2. Convert `images/**` to `.webp`. Google shots → `public/images/reviews/`,
   certificate images (`images/certificates/`, listed in
   `content/certificates.md`) → `public/images/linkedin_ss/`, referenced from
   the `linkedinCertScreenshots` array via `asset("/images/linkedin_ss/...")`.
3. Nothing else — `TestimonialsSection` already renders on `/` and `/premium`.

**Option B:**
1. `components/ReviewsSection.tsx` + `ReviewsSection.module.css` (co-located CSS
   module, like every other section). Reuse the marquee pattern from
   `TestimonialsSection.module.css` (`@keyframes md-marquee`, `.track`,
   `.trackWrap`, hover-pause).
2. Wrap the header in `<Reveal>`; use `SectionIntro.module.css` for the
   eyebrow/heading classes.
3. Add data exports to `data/content.ts`.
4. Import into `components/LandingPage.tsx` and place the `<ReviewsSection />`
   element in the section list.
5. Give the `<section>` an `id` and `data-screen-label` like the others.

## Done when

- Both rows scroll smoothly, opposite directions, pause on hover.
- Renders correctly on mobile (no horizontal page scroll — the marquee clips).
- `npm run lint` and `npm run build` pass.
- All review links open the correct Google / LinkedIn page.
