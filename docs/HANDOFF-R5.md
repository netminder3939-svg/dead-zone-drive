# Dead Zone Drive: R5 handoff (Nov 9, 2026)

**For Grok (deploy) and Pope.** R5 = R4.1 (`build-r4-1` 70ebb4b, on TEST) + a Horde that lives off its land, a map that
shows only what it's really doing, and a leader-only Horde dashboard. Branch `build-r5`.
Cache `ddd-v26-12i-integrated-6-r5`, HUD label `12i-integrated-6-r5`. **Frontend only. No rules change.**
TEST first; LIVE stays on 9745fd7.

Changed files (5): `horde5.js` (new), `fix9.js` (moving squads show troops), `index.html`, `bal14.js` (label), `sw.js`.
Diff: `docs/R4-1-to-R5-frontend.diff`. Hashes: `docs/R5-SHA256SUMS.txt`.

## What changed
1. **Economy from land only.** Before, every clan earned resources every hour even with no land and turned them into
   troops; strong alliances multiplied that by up to 10. Now:
   - **Income:** each hex a clan holds earns 3 an hour, and rich resource hexes earn more. No land, no income.
   - **Troop cap and training:** a Horde Stronghold level (1–10) sets the troop cap (1,000 per level + 200 per
     outpost) and training speed (20 an hour per level). Training costs 1 resource per troop.
   - **Upkeep:** troops eat every hour. A clan that can't feed them loses 2% an hour.
   - **Building:** a clan spends 400 × level to level its Stronghold once its army is at least half its cap.
   - **Difficulty:** stronger alliances face a more efficient Horde (income and training up to 3×), never free income.
2. **Goals.** A clan only heads for players' land when its army is at least 40% of its cap. Until then it expands and
   gathers. Its current goal shows on the dashboard.
3. **Wiped out means gone.** A clan with no land loses its name, troops and resources. 7 days later a new small clan
   of that gang (Lv1 Stronghold, 500 troops) can appear farther out as "Rust Dogs II", "III" and so on.
4. **Existing clans (first load):** troops above the new cap leave. Old clans start at Stronghold level 1 + their old
   tier. A clan with 20,000 troops and no tier drops to 1,000, and the dashboard says why.
5. **Map:**
   - No resting squads, no planned targets, and no "Horde target: planning to hit this hex" note on tile cards.
   - A squad on the move shows its **troops** (it showed power before), with an arrival timer.
   - The player hex it's heading for flashes red with troop count and time.
   - Horde land and buildings stay.
6. **Dashboard** (Alliance › ☠️ Horde, only for the alliance leader). One card per clan: hexes, resources, income per
   hour, troops and cap, troops marching now, Stronghold level and outposts, current goal, squads, and the last 20
   actions (claimed hexes, trained troops, level-ups, beaten by your defenses, took a hex, wiped out).
7. **Fix for an R3 mistake:** R3 made Horde squads count more troops when your own troops were above T1. They're
   counted at base power again, so they're the same at every tier you have.

All of this runs inside the shared Horde record from timestamps, the same way on every phone.

## Tests (all on R5)
- New: `r5-horde.js` (10 checks):
  - no land = no growth over 48 h, and hungry troops leave
  - 30 hexes grows to its cap
  - a 20,000-troop clan is cut to 1,000
  - weak clans don't target players
  - a wiped clan is gone 7 days, then "II" arrives small
  - squad power is the same at every tier
  - no resting squads or targets on the map, and the attack hex shows troops
  - the dashboard is leader only
- R1–R4.1 tests: `r4-map` 5, `r4-1-flicker` 5, `r3-*`, `r2-*` (10,000-fight equality), `r1-*`, `t-titles-ui`, `t-space4`.
- Existing: s5 (same numbers, 0 missing), s9 20, s9b, s10 8, s13 12, s15 14 (Kansas front), s16, s17, fort-march 22,
  march-one 21, drive-claim, home-still (label -r5), qa-gates, import-own, phone-front, stamp15, march-panel,
  bank-credit, bank-guards, preview-guard, h12-gaps.
  - phone-front: its source-text check for the 1 s front slack no longer applies because hordeStep is wrapped once
    more. The two spawn checks (on time and 0.5 s early) still pass.
- bank-once and return25 fail on 9745fd7 the same way.
- Crawl: 0 script errors. Old save loads with nothing lost.

## Deploy (TEST)
Pull `build-r5`, compare hashes, then from `public/`:
`npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json`.
No rules step. LIVE untouched.

**Rollback:** redeploy `build-r4-1` (70ebb4b). The Horde record keeps the new fields (`lvl5`, `m5`, `log5`, `gen5`,
`goal5`); older builds ignore them and go back to the old economy.
