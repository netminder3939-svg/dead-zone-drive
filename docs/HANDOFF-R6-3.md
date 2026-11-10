# Dead Zone Drive: R6.3 handoff (Nov 10, 2026)

**For Grok (deploy) and Pope.** R6.3 = R6.2.1 (`build-r6-2-1` 8875fc7) with the crowded-hex grouping taken out.
Branch `build-r6-3`. Cache `ddd-v26-12i-integrated-6-r6-3`, HUD label `12i-integrated-6-r6-3`.
Hosting only: no rules, Firestore, auth, data or stat changes. TEST only; LIVE stays on 9745fd7.

## What changed
Pope's call: the crowded-hex grouping still flickered after two fixes, so it comes out while a different approach is
designed. That's the one-marker-per-hex hiding, the number badges, the "On this hex" list and the zoomed-out merging.
- **Every map marker draws on its own again,** as before R4. Nothing is hidden for being on a busy hex, so nothing can
  blink.
- **Kept:** the 🧭 map filters (including your R6.2.1 desktop placement). They still hide whole kinds of markers
  (never Threats) and remember the choice.
- Your R6.2.1 van/truck work in `pipes.js`, `van26.js` and `v26g.js` is untouched. `tidy4`'s truck exception is gone
  with the grouping, since nothing is grouped any more.

Files:
- `public/map4.js`: filters only.
- `public/bal14.js` and `public/sw.js`: label and cache.
- `tests/home-still.js`: label.
- New `tests/r6-3-map.js`.
- `tests/r4-map.js` and `tests/r4-1-flicker.js` removed: they tested the grouping.

## Tests
- `r6-3-map` 5/5:
  - All 4 markers on a crowded hex show, with no badge and no list.
  - Tapping a marker opens its own action.
  - 20 redraws with nothing toggling.
  - Filters hide monsters and pins but never threats, and the choice is remembered.
  - Zoomed out, nothing merges.
- `r6-2-van-flash`: pipeline truck hidden 0 frames, 0 toggles.
- All pass: `r6-2-van-move-check` 7, `home-still` 25, `s9` 20, `drive-claim` 15, `fort-march` 22.
- Also pass: `r6-2-hero` 36, `r6-hq` 22, `r5-horde` 10, `march-one` 21.
- Crawl phone + desktop: 39 screens each, 0 script errors (only the old base/fort SVG note).

## Deploy (TEST only)
Pull `build-r6-3`, then from `public/`:
`npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json`.

**Rollback:** redeploy `build-r6-2-1` (8875fc7).
