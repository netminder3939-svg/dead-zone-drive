# Dead Zone Drive: R6.4 handoff (Nov 10, 2026)

**For Grok (deploy) and Pope.** R6.4 = R6.3 (`build-r6-3` 39ab3a1) + `SUPPLY-RANGE-OUTPOST-CLARITY-SPEC.md` (approved by
Pope Nov 10). Branch `build-r6-4`. Cache `ddd-v26-12i-integrated-6-r6-4`, HUD label `12i-integrated-6-r6-4`.
**Hosting only:** no Firestore rules, database, auth or Cloud Functions changes. TEST only; LIVE stays on 9745fd7.

## What players get
- **Unpaid hexes are visible.** Your hexes more than 10 mi from your bases get an amber dashed border with a faded fill.
  Their `+N` resource badge becomes 📦. Paying hexes and teammates' hexes are unchanged.
- **📍 Show them** on the Base banner jumps the map to each cluster of unpaid hexes, with a bar:
  `📦 Unpaid · 1 of 3 · 12 hexes · 14 mi from nearest base`, plus ◀ ▶ and Done.
- **Hex card:**
  - An unpaid resource hex leads with `📦 Not paying` / `NN mi from nearest base`, and the explanation sits outside ⓘ More.
  - In a fortified zone it says `📦 Bonus only`, because the +50% zone bonus still pays (zones.js untouched).
- **The daily reset line** adds `· N hexes didn't pay (over 10 mi from a base)`. The Territory table gets a matching
  note.
- **📦 Pay range** is a new 🧭 Layers chip. It's on by default for everyone, including players with saved filters. It
  draws one faint gold area (a union of 10 mi circles around your bases) with a single clean outline.
  - A one-time hint explains it.
  - Turning it off is saved (`wl_f4.payOn:false`).
  - It shows anyway while the Build menu, the Forward picker or the Show-them bar is open.
  - Outposts still in their hold get a separate dotted circle.
- **Forward Outpost picker:**
  - The green hexes now follow the real rules: not raider hexes, not teammates' hexes, not an existing outpost, not
    your Stronghold, within 6 mi of a teammate's land, plus spacing.
  - The 6 mi zone is drawn in green, and picking starts at zoom 13.
  - Tapping a hex previews its 7-hex ring: green = will claim, red dashed with 🚫 = skipped.
  - The card says `Will claim 6 of 7 · skips 1 (Wife's)`, how many unpaid hexes it brings back, and how far it is
    from the teammate's land.
- **Build menu:** the same ring preview, with the map moved so your hex sits above the sheet. The Outpost and Home
  Outpost rows show the claim and revive lines.
- **Capture result:**
  - The `+N` count is fixed: it counts only hexes really claimed.
  - A result card pops up (5 new hexes · holds 6 of 7 · N paying, plus what was skipped and why). If another card is
    open it waits in the card queue as "⛺ Outpost up".
  - Several finishing at once get one combined card. Failures get a card too.
  - Each result lands in 📬 Reports under a new **⛺ Outposts** tab (14-day / 60 cap like the rest).
- **Outpost card and lists:**
  - The card shows `Holds 6 of its 7 hexes · keeps N of your hexes paying`, what's held by whom, and
    `If you lose it, N hexes stop paying`.
  - Base › Outposts shows regular / Home / Forward counts, and each row shows kind, holds and keeps.
  - 🏰 Your bases rows show holds and keeps.
- **Map:** the ⛺ marker label shows OUTPOST / HOME / FORWARD.

## Spec points that don't apply as written: the map can't zoom out past 13
`game.js` creates the map with `minZoom:13`, and nothing lowers it. So:
- §7a (outline thinner at 11-12, none at 10) and §2b's "fit at minimum zoom 11" never happen. The code handles those
  zooms, but the map stops at 13, where the ring and marker always show.
- **At zoom 13 the screen shows about 5 mi, so a 10 mi pay circle's edge is only on screen when you're near it.**
  Deep inside your range, the gold area fills the whole screen at 5% and reads as "everything here pays". That's
  correct, but it's faint.
- **Pope's call** whether to let the map zoom out further.

## Code
- **New `public/supply64.js`** (loaded last):
  - Helpers on `window`: `supplyBust64`, `nearestBaseMi64`, `unpaid64`, `ringPreview64`, `baseStats64`, and the
    union overlay.
  - The Show-them bar, the hex-card post-pass (via `HOOK.tile`), the Territory note, Pay range, the Forward zone,
    the Build preview (one `UI.build` wrap, since the Build menu has no hook), and the result cards.
- **Fixed where they live:**
  - `stage2.js outpostTick`: classifies each ring hex; counts only real claims; `o.cap64`; log line; result
    callback.
  - `base15.js fwdOk15`: full checks in spec order, exported before space4 loads; teammate anchors memoised.
- **Small edits:**
  - `world.js`: unpaid style in the same draw pass, and the reset line.
  - `terr15.js`: cache export, `G.terrV15` bump on territory emit, and the banner button. Its old card note moved to
    supply64.
  - `stage2.js`: outpost card and list text; marker and outline drawn at every zoom ≥ 11; kind labels.
  - `base15.js`: bar copy, confirm card, zoom 13, Your-bases line, placing toast.
  - `card1.js`: an `info64` queue kind (`cardWait1` / `cardBusy1`).
  - `reports1.js`: `op64` list, ⛺ Outposts tab, empty-state text.
  - `map4.js`: the `📦 Pay range` chip and legend, plus `CAT4.pay64='skip'`. `place4()` is untouched.
  - `space4.js`: the green-hex redraw key includes `G.terrV15`, so green hexes update when territory arrives.
    Without this they stayed stale until the map moved.
  - `index.html`, `bal14.js`, `sw.js`.
- **sw.js has no precache list.** It caches network-first at runtime, so there's nothing to add for the new file.
- **Data:**
  - `P.op64` (≤ 60 entries) and `o.cap64` hold hex ids and names only. No lat/lng/pos/location keys.
  - `wl_f4.payOn` / `wl_f4.payHint64` are on the device only.
  - No new Firestore keys or writes.

## Tests
- **New**, all passing:
  - `s11-supply` 14: A1-A4, B1-B3, C1-C3, D1, the Territory note, and no toast when claiming far out.
  - `s11b-payrange` 10: E1, E2, E2b-E2d, E3, E4 (phone and desktop), E6.
  - `s11c-fwd-picker` 7: F1-F5 (F5 in three layouts, one of them half in and half out of the zone), the bar copy, and
    no teammate land.
  - `s11d-outpost-result` 12: G1-G2, H1-H6, card queueing, and I1 at the zooms the map allows (13, 14, 16).
  - Shared setup: `tests/s11-lib.js`.
- **E5:** `r6-2-van-flash` with Pay range on: the pipeline truck was hidden 0 frames with 0 toggles, and the escort
  never toggled.
- **E6 and A4:**
  - The overlay redraws 0 times while idle, and once per `moveend` while panning.
  - `drawWorld` with 2,107 owned hexes at zoom 13 takes the same time as on the R6.3 build (24-36 ms on both;
    run-to-run noise is larger than any difference).
- **Regression, all pass:**
  - `s9-bases` 20, `s9b-outpost-march`, `s10-fronts` 8, `r6-2-van-move-check` 7, `r6-3-map` 5, `home-still` 25.
  - `r6-2-hero` 36, `r6-hq` 22, `r5-horde` 10, `drive-claim` 15, `fort-march` 22, `march-one` 21, `stamp15`,
    `march-panel` 8, `h12-gaps` 5.
  - `r1-cards` 14, `r1-reports` 11, `r1-oldsave` 3, `r2-view` 7, `r2-xp` 6, `r3-ui` 8, `r3-tiers` 13, `qa-gates` 10,
    `phone-front` 9, `import-own` 2.
  - `s5`: identical numbers to R6.3.
- **Crawl** phone + desktop: 39 screens each, 0 script errors (only the old base/fort SVG note).
- **Not run:** `testlogs/layers-check.js` and `proof-markers-*.js` aren't in the repo. E4 covers the same filter
  placement.
- **Screenshots** of the 9 views at 430x900 and 1280x800 are attached to the chat as contact sheets.
  - On desktop the result card shows as "1 waiting: Outpost up" because the Build menu had just closed. That's the
    queue rule working.

## Deploy (TEST only)
Pull `build-r6-4`, compare `docs/R6-4-SHA256SUMS.txt`, then from `public/`:
`npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json`.
LIVE untouched. No rules step.

**Rollback:** redeploy `build-r6-3` (39ab3a1). Old builds ignore `P.op64`, `o.cap64` and the new `wl_f4` keys.
