MicroDegree ₹399 landing page - hand-off notes
- Open index.html. Keep the assets/ folder next to it (video, images, logo).
- Plain HTML/CSS/JS, no framework or build step. Only external request: Google Fonts (Plus Jakarta Sans).
- Every "Enroll Now" button links to: https://www.microdegree.work/learning/api/graphy-sso?next=checkout
- Countdown: 7 hr 34 min per visitor, restarts from 7:34 when it ends (stored in localStorage key md_offer_t0).
- Open items before go-live: FAQ placement answer contains [CONFIRM WORDING] (search index.html); Privacy/Terms are expected from the main site footer.
- Tip: serve assets/hero.mp4 and images with long cache headers + gzip/brotli for HTML.
