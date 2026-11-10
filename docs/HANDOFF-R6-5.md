# Dead Zone Drive: R6.5 handoff (Nov 10, 2026)

**For Grok (deploy) and Pope.** R6.5 = R6.4.1 (`build-r6-4-1` 0052e99) + `STRONGHOLD-LANDMARKS-SCREEN-SPEC.md` v2 (FINAL).
Part A is Jacob's drawn buildings, landmarks, badges and logo. Part B is map zoom-out to 10 with an overview at 10–12.
- Branch `build-r6-5`.
- Cache `ddd-v26-12i-integrated-6-r6-5`, HUD label `12i-integrated-6-r6-5`.
- **Hosting only:** no rules, Firestore, auth or data changes. No new fields in `P`/`W()`.
- TEST only. LIVE stays on 9745fd7.

## Part A: Jacob's art (as drawn, never redrawn)
- **Art files:** all 64 cuts from the kit sit in `public/assets/places/<group>/` (WebP + PNG, plus `@2x` where it
  exists). The kit's SHA-256 list matched every file: 253 of 253.
- **What goes where** is in `assets/places/manifest.json`, the kit's proposed manifest. I added only `x2:false` to
  the two drawings that have no `@2x` file (the D keep and the logo). A later remap is a JSON edit.
- **Base › 🏰 Stronghold:**
  - Your castle by tier: D keep at Lv1-3, A walled keep at Lv4-6, B skull-gate castle at Lv7-10.
  - It sits on a Hero-style stage (dark glow, ruined skyline, iron frame, rivets) with a 3-chip tier strip
    ("Your Stronghold grows at Lv4 and Lv7").
  - The march panel still moves it under 🔨 Raise and shrinks it.
  - 🔬 Alliance Research has the tome.
- **Map, at zoom 16+ (near/close)** (far/mid zoom keeps the emoji):
  - Stronghold markers (yours and allies', by their level); building ones are faded.
  - Towers: wooden at Lv1-2, dark at Lv3-5; offline or down are gray.
  - Outposts: 🏡 Home = fire shrine, 🚩 Forward and plain = war banner; capturing is faded, lost is gray.
  - HQ citadel (` LvN` / 🔥 still appended; fallen = gray with a red glow).
  - Faction homes: the C fort with the faction's colour as a glow.
  - The 9 landmark kinds (school, mall, shore, town hall and grocery use Jacob's approved stand-ins). Visited glows
    gold, a lair glows red, fog fades them.
- **Cards and lists:**
  - The Stronghold, tower and landmark cards show the drawing.
  - Territory rows, the Outposts list, Your bases, 📍 Nearby and Collection › Landmark Badges get 36 px thumbnails.
  - The HQ card has the citadel, and the Vault line has the iron chest.
  - Leader and Officer chips get the crown and winged star, with the text kept.
- **Branding:**
  - The logo is on onboarding and on the sign-in overlay; if it can't load, the text title shows.
  - Favicon and apple-touch icon are new.
  - `manifest.webmanifest` now has 2 "any" + 2 "maskable" icons, so Android no longer crops the corners.
  - Honest note from the spec: `icon-512` is the 167 px drawn tile scaled about 2.9x, so it's soft on big launchers.
- **Fallbacks** (each one tested):
  - Manifest missing: the game looks exactly like R6.4.1.
  - A WebP missing: its PNG loads.
  - Both missing: the SVG or emoji, as before.
- **Not changed:** `strongholdSVG` / `towerSVG` stay (combat units still use them), and so does `enemy_fort.png`.
  Spare drawings sit unused in the folder.

## Part B: zoom out to 10
- `minZoom` is now 10 (set in the new `overview65.js`; the comment in `game.js` says so). Max zoom stays 18 (set by
  `fix5.js`).
- **10–12 is the overview:**
  - No hexes, grid, resources, monsters, landmarks, pipelines or march lines. Their layer groups come off the map
    once on entering and go back once on leaving, followed by a single redraw.
  - Shown: the gold pay range (a solid outline with a light fill in overview, still honouring `wl_f4.payOn`); small
    pins for your Stronghold, outposts and HQ, plus allies' Strongholds, using Jacob's art at about 24 px with emoji
    fallbacks; and your dot.
  - A chip reads "📦 N hexes outside pay range — zoom in to see".
  - A one-time hint is saved under the new key `wl_ov65hint`. No other key changed.
- **13 and up:** unchanged from R6.4.1.
- **Map taps in overview** open nothing and claim nothing. **A pin tap** opens that base's own card.
- **Pickers** (Forward, Stronghold/HQ site, free move) animate to 13 first, then open.
- **Fixed: GPS snapping the zoom.** `game.js setPos` used to snap to zoom 16 when GPS re-found you, even while zoomed
  out. In overview it now keeps your zoom.
- **R6.4 cases rechecked now that zoom 10–12 exists:**
  - "📍 Show them" now lands at zoom 13+ instead of 11, so you see the unpaid hexes rather than the overview.
  - Outpost outlines at 11-12 are replaced by the overview pins.

## Spec vs. build
- **Still-map probe, 10–12:** 0 added / 0 removed over 4 s.
- **Still-map probe, 13: not 0.** Every few seconds the territory refresh redraws the hexes. The R6.4.1 build does
  exactly the same, measured side by side with the same setup (`[[281,115],[0,0],[23,23]]` on both), so it isn't
  new.
- **Base tab render:** 2 ms.

## Tests
- **New**, all passing:
  - `tests/r6-5-places.js`, 22 checks:
    - Stronghold tiers at Lv 1/3/4/6/7/10, the tier strip and alt text.
    - The castle is never cropped or stretched at 360x640 / 375x667 / 390x844 / 430x932 / 1280x800, small mode
      included. Raise and Research are intact. Base tab render takes 2 ms.
    - Map markers for you and an ally; towers by level, with offline shown gray. Home and Forward outposts, with
      capturing shown faded. Emoji when zoomed out.
    - Tower and Stronghold cards, plus Territory, Outposts and Your-bases thumbnails with decorative `alt=""`.
    - HQ marker and card, with ` LvN` kept, and the Vault chest. Faction home with the colour glow.
    - All 9 landmark kinds, the visited glow, the card, Nearby and Collection.
    - Leader and Officer chips; the logo; favicon, apple and maskable icons all loading.
    - Fallbacks with the files really removed from the server: WebP → PNG, both → SVG, manifest renamed → the
      R6.4.1 look, logo removed → text title.
  - `tests/r6-5-overview.js`, 13 checks:
    - minZoom 10, and the 20 mi range fits a 360 px phone at 10.
    - At 10–12: no hexes or markers, the gold range, 3 pins and the chip. 13 restores everything.
    - 12↔13 ten times with no leftovers. Still-map probe at 10/11/12: 0 added, 0 removed.
    - Map taps do nothing; a pin tap opens its card. The picker jumps to 13. A GPS recenter keeps the zoom.
    - Pay range off shows pins only. The hint shows once, under its own key. Show-them lands at 13+.
- **Bug caught in testing:** my first version also blocked hex cards opened *from code* while zoomed out, which broke
  2 `fort-march` checks. Now only a real tap on the map is ignored (Leaflet's `preclick`), and `fort-march` passes
  22/22.
- **Regression, all pass:**
  - `s11-supply` 14, `s11b-payrange` 10, `s11c-fwd-picker` 7, `s11d-outpost-result` 12, `s9-bases` 20,
    `s9b-outpost-march`, `s10-fronts` 8.
  - `r6-2-van-move-check` 7, `r6-3-map` 5, `home-still` 25, `r6-2-hero` 36, `r6-hq` 22, `r5-horde` 10,
    `drive-claim` 15, `fort-march` 22, `march-one` 21, `march-panel` 8, `h12-gaps` 5.
  - `r1-cards` 14, `r1-reports` 11, `r1-oldsave` 3, `r2-view` 7, `r2-xp` 6, `r3-ui` 8, `r3-tiers` 13, `qa-gates` 10,
    `phone-front` 9, `import-own` 2, `stamp15`.
  - `s5`: identical numbers.
  - `r6-2-van-flash`: truck and escort hidden 0 frames, 0 toggles.
- **Crawl** phone + desktop: 39 screens each, 0 script errors, **0 issues**. The old base/fort SVG note is gone now
  that the castle is a drawing.

## Deploy (TEST only)
Pull `build-r6-5`, compare `docs/R6-5-SHA256SUMS.txt` (every changed or new hosted file, art and icons included),
then from `public/`:
`npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json`.
LIVE untouched. No rules step.

**Rollback:** redeploy `build-r6-4-1` (0052e99).
