# Images — exact copies of what the live section uses

The current section renders **text-only cards** for Google and LinkedIn reviews
(no per-card photo). The only images are:

- `certificates/` — the 6 certificate screenshots that scroll between the
  LinkedIn cards. Live copies of `public/images/linkedin_ss/linkedin-cert-1..6.webp`.
  Described in `../content/certificates.md`.
- `reviews.webp` — the faint background image behind the whole section. Live copy
  of `public/images/sec_background/reviews.webp`.

## To change things

- **Swap a certificate:** replace the file in `certificates/` (any format — PNG
  fine, Claude converts to `.webp`) and update its line in
  `../content/certificates.md`.
- **Add a certificate:** drop a new file in `certificates/`, add an entry in
  `../content/certificates.md`.
- **Change the background:** replace `reviews.webp`.
- **Want photos on the review cards too?** Add an `avatars/` folder here, drop
  named files in, and say so in the spec — Claude will extend the card layout.

Naming: `firstname-lastname-course.png` (e.g. `archana-bs-devops-cert.png`).
