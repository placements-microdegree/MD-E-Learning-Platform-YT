# MicroDegree Learning landing page (Premium Plan, ₹399) — handoff

Design reference. `Main.dc.html` is a design mockup; replicate its markup, inline styles and behaviour in the production page.
View it: serve this folder (`python3 -m http.server`) and open `Main.dc.html`. Internet is needed for fonts and the React/Babel runtime.

## Behaviour to implement
- Top green offer bar: "Get additional ₹100 OFF. Use code MD100", tap goes to checkout. Desktop also shows "Offer ends in hh:mm:ss".
- Page opens directly with the green offer bar (no preview toolbar). Mobile layout follows the real screen width (720px breakpoint).
- Header button (desktop) and bottom sticky bar (mobile): "Claim Offer Now" + "Use code MD100", links to checkout. Bottom bar shows price ₹399 and a live red timer.
- Timer: per-visitor loop of 14h 26m (localStorage key `md_promo_t0`). It is a display timer only.
- The MD100 code (₹100 off) must be created and its validity set in the checkout tool (Graphy). The page does not pass the code to checkout.
- Screens up to 720px wide: heading underline and "Learn directly from industry experts" removed, hero progress bars removed, "Tap your current role" replaced by curriculum.
- Desktop and mobile: "What's covered inside" curriculum (preview list, "See full curriculum" dropdown). Role finder is hidden.
- "200+ course cards" removed everywhere; "250+ video lessons" kept.

## Meta Pixel (ID 187849266414718)
Paste `meta-pixel-snippet.html`: the first part in `<head>`, the second before `</body>`.
Enroll buttons carry `data-track="enroll"` and `data-loc`; the curriculum dropdown has `data-track="curriculum"`.
Events: PageView, InitiateCheckout, EnrollClick, ViewContent. Verify in Meta Test Events.
