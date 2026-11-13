# R6.7 — Horde and defense XP, shown on reports

- Branch `build-r6-7`: 63a036d on top of `360b495` (R6.5), plus a one-line follow-up that bumps the visible HUD label (63a036d still showed r6-5 in the HUD; the cache name was right).
- Label `12i-integrated-6-r6-7`. Service-worker cache `ddd-v26-12i-integrated-6-r6-7`.
- Hosting only. No changes to rules, Firestore, auth or Cloud Functions.
- TEST only. LIVE stays on 9745fd7.
- Spec: `docs/R6-7-XP-SPEC.md` (Jacob's XP-SPEC.md, copied as sent).

## Payout (locked, in `public/xp2.js`)
```
typical    = xpNeed(P.lvl) / 9
sizeFactor = clamp(enemyTroops / myTroops, 0.5, 2)
win        = max(1, round(typical * sizeFactor))
loss       = max(1, round(win * 0.25))
```
- At level 10: equal fight 351, twice your size 703, half your size 176, equal loss 88.
- The old `XP2.base`, `XP2.mult`, `XP2.perTroops` and the +20 owner bonus are gone.
- `xpNeed`, monster XP (15 + 5 × monster level), claim, quest and badge XP are unchanged.
- The level bonuses are unchanged: +3% hero stats and +100 march size per level.

## Where it pays
Every case below pays once per player, and the amount is written onto the report in the same save.

- **Defense of your hex** (`apply25`):
  - myTroops = your home garrison plus your own stationed guards in the fight.
  - enemyTroops = `r26.att.n`.
  - Written to `xp1` on the new `fr25` row.
  - An owner with 0 troops in the fight gets 0.
- **Ally help** (`applyGl25`):
  - myTroops = your reinforcements on the hex.
  - enemyTroops = the note's enemy power ÷ `TROOP.powerPer`.
  - You get your own full payout, not a split share.
- **Pipeline guard** (`reconcile26`): your guards against `r26.att.n`.
- **March** (`resolveMarch`):
  - Each Horde fight counts: intercept, path defenders, holdouts and forts.
  - Its payout uses the enemy army-row total and your own troop rows.
  - `f.xp2` is the running march total, so the fight handed to the replay and the report carries exactly what the march grants.
  - The total is granted once, when the march first resolves.
- **Walk-up fights** (`fightFaction`, `fightFort`):
  - The new `fightXP2(f,A0,B0)` runs right after the real fight and before `UI.replay`.
  - Hero-only means myTroops = 1, so these normally pay 2×.
  - The flat `addXP(retakeXP)` and `addXP(homeXP)` are removed. Loot, hex claims and routing are kept.
- **Not paid**:
  - `predict()` is wrapped so a forecast never pays, even while a march is resolving.
  - A bare `runFight` pays nothing.
  - Little monsters keep the existing "is this a monster?" check.
  - Unguarded walk-ins (`none:true`) get no XP and no XP line.

## Reports
- **List subtitle:** `· +N XP` on duel and march rows (`r.xp`) and on defense, ally and pipe rows (`xp1`). Losses are included.
- **Detail card:** "XP earned +N".
- **End-of-fight summary:**
  - Troop fights (combat2) already printed `+N XP`.
  - Hero walk-ups now get an "XP earned +N" line under the result. It is added after reports1 records the report, so it is not doubled there.
- **Raid alert:** each fight row shows `· +N XP`.
- The old 120-second "find the march report" lookup is removed.

## Calls I made (Jacob confirmed 1 and 3 on Nov 12)
1. **Walk-up enemy count.** The hero duel engine has no troop rows. A unit with no troop count (Stronghold, clan garrison or boss) counts as its HP in basic raider troops (`C26.types.raider.hp`). The same applies to "custom" rows in a troop fight. In practice, walk-ups and hero-only assaults land on the 2× cap, as the spec expected.
2. **Fort capture bonus kept.** `captureEnemy` still adds its `120 + 40 × fort level` capture bonus on top of the fight payout. The spec only names `retakeXP` and `homeXP` for removal. **Confirmed by Jacob: keep the extra XP for taking raider buildings.**
3. **Owner rows with 0 troops** show "+0 XP" on the list and card. The spec says every real fight report shows the number, and the owner gets 0. **Confirmed by Jacob.**
4. **Hexes claimed on a march** still give their normal claim XP, separately. In the march test that was 703 fight XP + 60 claim XP.

## Tests
- `tests/r6-7-xp.js`: 24 checks, covering all 12 acceptance items plus the locked table and size clamp.
  - Defense win +351 on the list and card.
  - Defense loss +176 when outnumbered 30×, and +88 at equal troops.
  - March vs a 4× squad: 703. March vs a 0.3× squad: 176.
  - The march grants once, equal to the report and the replay.
  - The troop summary prints "+351 XP".
  - `fightFaction` +703 with nothing flat on top.
  - `fightFort` +703 on the report and summary, with the capture bonus unchanged.
  - Ally helper +703 from their own 400 troops vs 800. An owner with 0 troops gets 0.
  - Walk-in: no XP and no line.
  - Monster still 30 (Lv3). `predict` and a bare `runFight` pay 0.
  - Level bonuses unchanged.
  - 9 wins at L10 = 3,159, still level 10. The 10th levels up.
- `tests/r2-xp.js` rewritten to the new formula (6 checks).
- **Regression, all pass:**
  - `s11-supply` 14, `s11b` 10, `s11c` 7, `s11d` 12, `s9-bases` 20, `s9b`, `s10-fronts` 8.
  - `r6-2-van-move-check` 7, `r6-3-map` 5, `home-still` 25, `r6-2-hero` 36, `r6-hq` 22, `r5-horde` 10, `drive-claim` 15, `fort-march` 22, `march-one` 21, `march-panel` 8, `h12-gaps` 5.
  - `r1-cards` 14, `r1-reports` 11, `r1-oldsave` 3, `r2-view` 7, `r3-ui` 8, `r3-tiers` 13, `qa-gates` 10, `phone-front` 9, `import-own` 2, `stamp15` 7.
  - `r6-5-places` 22, `r6-5-overview` 13.
- **Crawl**, phone and desktop: 39 screens each, 0 errors, 0 issues.

## TEST verify checklist
1. At level 10, defend a hex with about as many troops as the raid. The report should show about +351 XP, and the bar should move about 1/9.
2. Walk up to a Horde hex and win. The result should say "XP earned +N", and there should be no "+25 XP" text.
3. Send a march into a Horde squad. The XP on the march report should equal the XP the bar gained, apart from any normal per-hex claim XP.
4. Lose a defense. It should show a small number, not nothing.

## Deploy (TEST only)
1. Pull `build-r6-7`.
2. Compare `docs/R6-7-SHA256SUMS.txt`.
3. From `public/`, run `npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json`.
4. LIVE untouched. No rules step.

**Rollback:** redeploy `build-r6-5` (360b495).
