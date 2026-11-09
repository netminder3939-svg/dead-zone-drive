# Dead Zone Drive: R2 handoff (Nov 9, 2026)

**For Grok (deploy) and Pope.** R2 = R1 (`build-r1` c7ce23f, on TEST) + one combat system, the new battle view and XP for
every fight. Branch `build-r2`. Cache `ddd-v26-12i-integrated-6-r2`, HUD label `12i-integrated-6-r2`.
**Frontend only. No rules change.** TEST first; LIVE stays on 9745fd7.

Changed files (8): `combat2.js` (new, loads right after fight.js), `combat2b.js` (new), `xp2.js` (new), `reports1.js`,
`progress.js` (level-up message), `index.html`, `bal14.js` (label), `sw.js`.
Diff: `docs/R1-to-R2-frontend.diff`. Hashes: `docs/R2-SHA256SUMS.txt`. Calibration output: `docs/R2-calibration.json`.

## What changed
1. **One army combat system** (`combat2.js`). It is the 12h army formula (`fight26`), generalized so both sides can have
   troop squads, a hero and a building.
   - `fight26` itself now runs on it. On 10,000 random fights the result is identical to the 12h formula
     (`tests/r2-equal.js`), so the defense balance Pope approved is unchanged.
   - Every troop fight uses it: Horde attacks on your land, pipeline guards, and every march fight (Horde squads,
     raider holdouts, forts, mutants on a march). A hero alone vs a monster keeps the duel.
   - Marches used the old duel engine. Old enemy units are converted to the same troop scale, and the factors are
     calibrated (`tests/r2-calibrate.js`) so the troops you need to win stay where they were:
     - **Forts:** 94% of samples within 15%.
     - **Horde squads:** median 1.02. Small squads at high hero levels are easier now, because the hero counts for
       more in small fights.
     - **Mutants on a march:** median 1.31 with a wide spread, but these fights are rare.
2. **Lines and losses.** Each side forms squads by class, front line first: Engineers, Strategists, Raiders, Scouts,
   Casters. Damage hits the building first, then Engineers, then the rest evenly (the 12h rule). The hero leads from
   behind, and enemies only reach him once his troops are gone. Troops coming home = troops left, with the hero's
   health no longer counted in.
3. **Battle view.** Your side is on the left in your color, the enemy on the right in red.
   - Each squad is a row whose count shrinks every round, ending on the exact result.
   - The hero card sits behind his line. Defenses show the building's walls and fire.
   - Skip, plus a saved "Always skip battle animations" option.
   - A defense you watch is now the same fight that decided it. It used to replay a different engine.
4. **XP for every fight** (`xp2.js`). A win = (base + 1 per 5 power of enemy troops beaten) × multiplier, and a loss
   gives 25%.
   - Base and multiplier: capture-a-hex march 25 ×1, Horde/fort fight you start 40 ×1, defend a hex 40 ×1.5,
     defend a pipeline 40 ×1.5. Small monsters keep 15 + 5 × level.
   - In a shared defense, each player's XP covers their share of the defenders, and the hex owner gets +20 when the
     land holds.
   - Change from the design table: it said "1 XP per 5 troops", but Horde squads field tens of thousands of troops,
     which would have given a full level per fight. Beaten troops now count as power instead: 1 XP per 5 power, which
     is 1 per 250 T1 troops.
   - XP shows on the battle result and in reports.
5. **Levels** give, on top of the skill point: hero +3% HP/ATK/DEF per level and march size +100 per level. The
   level-up message lists them.
6. **Reports**: army fights store each squad, the rounds and the XP. Every fight report has a "Details: round by round"
   section.

## Balance notes for Pope
- When you march on a Horde squad, it fights as about 0.56 of the troops it counts as when it attacks you. That keeps
  marching as easy as it was. Making attack and defense match exactly would double the troops needed to clear squads.
- The 12h formula has no attrition: a side deals the same damage every round until it breaks. The rounds you watch show
  that formula's exact result, spread over 3–8 rounds.
- Horde troop counts get smaller as your troop tier rises (this predates R2). R3 (troop tiers) should fix it.

## Tests (all on R2)
- New:
  - `r2-equal.js`: 10,000 fights equal.
  - `r2-calibrate.js`: march difficulty.
  - `r2-view.js`: 7 checks. March and defense views, exact counts, Always skip, solo duel unchanged, troops home = left.
  - `r2-xp.js`: 6 checks. Defense win and loss, march XP and report, level rewards.
- R1 tests: `r1-cards` 14, `r1-reports` 11, `r1-oldsave`, `t-titles-ui` 10.
- Existing:
  - s9 20, s9b, s10 8, s5 (same numbers as before, 0 troops missing), s13 12, s15 14, s16, s17.
  - fort-march 22, march-one 21, drive-claim, home-still (label check updated to -r2), import-own, phone-front,
    qa-gates, stamp15, march-panel, bank-credit, bank-guards, preview-guard, h12-gaps.
  - bank-once and return25 fail on 9745fd7 the same way.
- Crawl: phone, SE, Pixel, desktop, 0 script errors (same pre-existing wide SVG on Base › Fort).
- Old save from 9745fd7 loads on R2 with nothing lost.

## Deploy (TEST)
Pull `build-r2`, compare hashes, then from `public/`:
`npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json`.
No rules step. LIVE untouched. **Rollback:** redeploy `build-r1` (c7ce23f). Older builds ignore the new save fields
(`fightSkip2`, `xp1`, `rows2`).
