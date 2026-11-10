# Dead Zone Drive: R6.2 handoff (Nov 9, 2026)

**For Grok (deploy) and Pope.** R6.2 = R6.1 (`build-r6-1` 3bcbf17) + the Hero and Gear screen redesign from
`HERO-GEAR-SCREEN-SPEC.md` v2 (pre-drawn avatars). Branch `build-r6-2`.
Cache `ddd-v26-12i-integrated-6-r6-2`, HUD label `12i-integrated-6-r6-2`.
**Presentation only:** hosting files, no rules, no Firestore, no auth, no data or stat changes. TEST only; LIVE stays on
9745fd7.

Changed / new files:
- New: `hero62.js` (loaded last), `hero62.css`, 39 icons + 6 avatars (WebP + PNG fallback) under `assets/gear/`.
- `assets/gear/manifest.json` = the kit's `manifest.proposed.json`: every existing key kept, plus `icon` paths and the
  `avatars` block. Road is `png:false`.
- `index.html` (script + stylesheet), `bal14.js` (label), `sw.js` (cache), `tests/home-still.js` (label).
- No other game file is edited. `hero62.js` wraps `UI.render` / `UI.close`, and replaces `dollSVG` / `gearTabHTML` by
  name (the old SVG survivor is kept as the last fallback).

Diff: `docs/R6-1-to-R6-2.diff` (code only, art omitted). Hashes: `docs/R6-2-SHA256SUMS.txt` (every new or changed
hosted file, art included).

## What the player sees
- **Hero opens full screen** from the nav, the name plate or news links:
  - A wasteland header with ☢️, the tab name, LEVEL and a 44 px ✕.
  - A metal tab strip in today's order (Stats, Class, Skills, Gear, Quests, Save, Buffs, Achievements). The active tab
    glows and scrolls into view, and the red dots still show.
  - The bottom nav is hidden while Hero is open.
  - ✕, Escape and the back button close it and bring back the map and nav.
- **Gear:**
  - The survivor stands in the middle, with head, chest and legs to the left and boots, weapon and trinket to the right.
  - Below: a stat bar (tap for the full breakdown), VIEW FULL STATS and the set chip, then the parchment card for the
    tapped slot (Take off, Upgrade with its exact cost, Swap).
  - Then the spare list, Sets and How gear works.
- **The figure** changes to a set's outfit only when head, chest, legs and boots are all from that one set. Anything else
  shows the hooded base survivor.
  - Road Warrior shows base until the artist's `road.png` arrives. To switch it on: drop `road.png` + `road.webp` in
    `assets/gear/avatars/` and set `"road":{"png":true,...}` in the manifest. No code change.
- **Spare rows** compare against what's worn: stat deltas, ⚡ ±, set count changes, and "changes look to …".
- **Small polish:**
  - A 150 ms fade when the outfit changes (off under reduced motion).
  - The other outfits preload once the screen is idle.
  - Desktop content is capped at 560 px and centered.

## Spec decisions I made
- On the Gear screen only, the theme's flavor line is hidden so the stage sits right under the tabs as in the mockup.
  The other Hero tabs keep theirs. Without this the card buttons didn't fit on a 430x932 phone.
- Rarity names on the parchment card are the rarity color darkened, so they're readable on the light background. The
  name is always written out too.
- Avatar fallback chain: the set's WebP, then its PNG, then base WebP, then base PNG, then the R6.1 SVG survivor.
  Missing icon: its PNG, then the slot emoji.

## Bug caught in testing
My first version could freeze the page when Hero closed. A class change re-fired its own watcher forever. Fixed: it
only touches the class list when something is set. The full test now runs in 30 s, where it used to hang.

## Tests (all on R6.2)
- New `tests/r6-2-hero.js`: 36 checks covering the spec's acceptance list.
  - Shell and close paths, and tab order.
  - Every avatar case: none, basics, 3+1, 4/4 for each set, boots off, Road Warrior off and on, and upgrades, rarity,
    weapon and trinket not changing it.
  - Fallbacks, all 39 icons loading, slot looks, and stat bar = `stats()` = the breakdown Total.
  - Card actions: Upgrade spends exactly `upCost`, plus Swap, Take off, best-spare Equip and the no-spare text.
  - Compare notes, reload persistence, salvage still blocked, the Stats-tab figure, and every Hero tab in the shell.
  - Screen sizes 360x640, 375x667, 390x844, 393x852, 430x932 and 1280x800: figure never cropped, no side scroll, card
    position as specced, ≤ 560 px on desktop.
  - Gear HTML builds in ≤ 8 ms.
- Earlier suites all pass on R6.2.
  - home-still (label -r6-2) 25, r1-cards 14, r1-reports 11, r1-oldsave 3, fort-march 22, march-one 21, drive-claim 15,
    r2-view 7, r2-xp 6, r3-tiers 13, r3-ui 8, r4-map 5, r4-1-flicker 5, r5-horde 10, r6-hq 22, s5 (same numbers),
    s9 20, s10 8, march-panel 8, h12-gaps 5, qa-gates 10, phone-front 9, import-own 2.
  - Crawl phone + desktop: 39 screens each, 0 script errors, only the old base/fort SVG note.
    - `tests/qa/crawl.js` now ignores items inside a sideways-scrolling strip that itself fits the screen.
    - Before that change it flagged the Hero tabs that sit off to the right of the strip, which is how the strip is
      meant to scroll.

## Deploy (TEST only)
Pull `build-r6-2`, compare hashes, then from `public/`:
`npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json`.
LIVE untouched. No rules step.

**Rollback:** redeploy `build-r6-1` (3bcbf17).
