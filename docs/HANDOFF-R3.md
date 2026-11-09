# Dead Zone Drive: R3 handoff (Nov 9, 2026)

**For Grok (deploy) and Pope.** R3 = R2 (`build-r2` 6ea8686, on TEST) + real troop tiers. Branch `build-r3`.
Cache `ddd-v26-12i-integrated-6-r3`, HUD label `12i-integrated-6-r3`. **Frontend only. No rules change.**
TEST first; LIVE stays on 9745fd7.

Changed files (7): `tiers3.js` (new), `tiers3ui.js` (new), `v26a.js`, `combat2.js`, `index.html`, `bal14.js` (label), `sw.js`.
Diff: `docs/R2-to-R3-frontend.diff`. Hashes: `docs/R3-SHA256SUMS.txt`.

## What changed
1. **Every troop has a tier** (`tiers3.js`). The army is counted per tier (for example 1,500 T1 + 500 T2) in every place
   troops live: home, wounded, each guard post/outpost, each march, the portal, returning troops, training and healing.
   - The old plain troop counts stay the truth for how many troops you have. The tier breakdown sits next to each count
     and follows the troops when a count moves. It never changes a count, so it can't lose troops.
   - Marches, guard posts, pipeline guards and the portal send your **strongest tiers first**.
   - Losses, wounded and healing come out of the troops that were there, in proportion.
   - **Old saves:** every existing troop becomes the tier your Barracks gives today, so nobody gains or loses power.
2. **Training at a tier.** Barracks Lv3 unlocks T2, Lv5 T3, Lv7 T4, Lv9 T5 (same as before). A picker lets you train any
   unlocked tier; lower tiers are cheaper. A Barracks level-up no longer upgrades everyone for free.
3. **Upgrading troops.** Barracks › Upgrade moves troops at home up one tier. It costs the difference in training cost
   and takes training time; the troops leave home while upgrading.
4. **Fights use each place's own tier power:** home garrison, each guard post, each march (the exact troops sent), and
   pipeline guards. Teammates still see your army's average tier.
5. **Horde troop counts no longer shrink as your tier rises.** They used to be divided by your tier's power while your
   troops also got the tier bonus, so you got it twice. At T1 nothing changes; at T2+ Horde squads now count their real
   size.
6. **Screens** (`tiers3ui.js`):
   - Barracks › "Your army by tier", the tier picker, upgrades, and a T1–T5 table (ATK, HP, cost per 100; locked tiers
     show which Barracks level unlocks them).
   - "Next level unlocks" on the Barracks (next tier, march size, training speed), the Stronghold (troop cap, Barracks
     level, outposts) and tower cards (wall HP, fire, walls).
   - The march size picker shows which tiers go.

## Tests (all on R3)
- New:
  - `r3-tiers.js` (13 checks): conversion, training tier, strongest first, proportional losses/wounded, healing,
    upgrade cost, totals always match, per-place fight power, Horde count independent of tier, adopted save, march
    round trip.
  - `r3-ui.js` (8 checks).
- R1/R2: `r2-view` 7, `r2-xp` 6, `r2-equal` (10,000 fights), `r1-cards` 14, `r1-reports` 11, `r1-oldsave`, `t-titles-ui` 10.
- Existing: s5 (same numbers, 0 troops missing), s9 20, s9b, s10 8, s13 12, s15 14, s16, s17, fort-march 22,
  march-one 21, drive-claim, home-still (label updated), qa-gates, import-own, phone-front, stamp15, march-panel,
  bank-credit, bank-guards, preview-guard, h12-gaps.
- bank-once and return25 fail on 9745fd7 the same way.
- Crawl: phone, SE, Pixel, desktop, 0 script errors (same pre-existing wide SVG on Base › Fort).
- Cost: a tier lookup takes about 0.02 ms with 30 troop places.

## Deploy (TEST)
Pull `build-r3`, compare hashes, then from `public/`:
`npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json`.
No rules step. LIVE untouched.

**Rollback:** redeploy `build-r2` (6ea8686). Older builds ignore the new save fields (`troops.c3`, `tier3`, `up3`) and
treat every troop as the Barracks tier again.
