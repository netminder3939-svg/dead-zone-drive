# Dead Zone Drive: R4 handoff (Nov 9, 2026)

**For Grok (deploy) and Pope.** R4 = R3 (`build-r3` eaf9450, on TEST) + spacing between bases, the free move, and a
tidier map. Branch `build-r4`. Cache `ddd-v26-12i-integrated-6-r4`, HUD label `12i-integrated-6-r4`.
**Frontend only. No rules change.** TEST first; LIVE stays on 9745fd7.

Changed files: `space4.js` (new), `map4.js` (new), `base15.js` (pick bar label), `index.html`, `bal14.js` (label), `sw.js`.
Diff: `docs/R3-to-R4-frontend.diff`. Hashes: `docs/R4-SHA256SUMS.txt`.

## What changed
1. **One spacing rule for every building that protects hexes** (`space4.js`):
   - **Allies:** areas may touch edges but never share a hex. Two level-1 Strongholds (2 rings each) must be 5 hexes apart.
   - **Enemies:** one free hex between areas. For now that means Horde Strongholds and outposts.
   - **Your own buildings** may overlap (a tower inside your Stronghold area stacks defense).
   - **Where it's checked:** the automatic first Stronghold, which now takes the nearest hex that passes (that's what
     put Pope's wife's base on top of his); Pick a spot near the HQ; towers; outposts; Home and Forward Outposts; moves.
   - While picking on the map, the hexes you can use are outlined in green. A refused hex says why.
   - **Limits:** areas can still grow into each other later when buildings level up. Allies' buildings already defend
     each other's hexes, so that only wastes some area. New buildings now record when they were built (`t4`).
2. **Free move for a Stronghold that overlaps a teammate's area:**
   - A card offers "Pick a new spot" (within 3 mi, highlighted). It's free and keeps tiles, pipelines, towers and troops.
   - For overlaps made before R4, neither building's age is known, so both players are offered it. The one who stays
     taps "Mine stays here" and isn't asked again.
   - The Base › Stronghold page shows the overlap until it's fixed.
3. **Map** (`map4.js`). Every layer still draws its own markers; this tidies them afterwards:
   - On a hex with several markers, only the most important shows, with a number badge. Priority: threat, march,
     building/alliance, resource, monster, pin. A threat badge is red and pulses.
   - Tapping the badge or the marker opens **On this hex**, one row per thing with its own Open button, plus the hex card.
   - **Filters** (🧭, bottom-left above the march arrow): Marches, Resources, Buildings, Alliance, Monsters, Pins.
     Threats can't be hidden. Remembered on each device.
   - Zone names and range rings are left alone.
   - Zoomed out (below zoom 13), nearby markers merge into one with a count, and tapping it zooms in.

## Tests (all on R4)
- New:
  - `two-device/t-space4.js` (8 checks): two players on the same spot get non-overlapping Strongholds, a tower inside
    an ally area is refused while the edge is fine, own overlap is allowed, both phones see a pre-R4 overlap, the
    free move clears it, and the other phone sees it gone.
  - `r4-map.js` (5 checks).
- Everything from R1–R3 still passes: `r3-tiers` 13, `r3-ui` 8, `r2-*`, `r1-*`, `t-titles-ui`.
- Existing: s5 (same numbers), s9 20, s9b, s10 8, s13 12, s15 14, s16, s17, fort-march 22, march-one 21,
  drive-claim, home-still (label -r4), qa-gates, import-own, phone-front, stamp15, march-panel 8, bank-credit,
  bank-guards, preview-guard, h12-gaps.
- bank-once and return25 fail on 9745fd7 the same way.
- Crawl: phone, SE, Pixel, desktop, 0 script errors (same pre-existing wide SVG on Base › Fort).
- Old save loads with nothing lost.

## Deploy (TEST)
Pull `build-r4`, compare hashes, then from `public/`:
`npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json`.
No rules step. LIVE untouched. **Rollback:** redeploy `build-r3` (eaf9450).
