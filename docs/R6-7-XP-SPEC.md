# R6.7 — Horde and defense XP, shown on reports

Approved by Jacob Pope, Nov 12, 2026 (Pacific). Build this, and only this. Do not include the held R6.6 work (landmark card, outpost art, demolish, HQ move). Those stay on hold.

Hosting only. TEST only. Do not deploy LIVE. Do not change Firestore rules, the database, or auth. Do not post to Discord. When it is ready, stop and hand it back for TEST verify.

Build on branch `build-r6-5` at commit `360b495a78a39e5cbeee3f6c6c0d4914d0796caa`. Deploy label `12i-integrated-6-r6-7`. Service-worker cache `ddd-v26-12i-integrated-6-r6-7`.

## What Jacob wants

He is not getting meaningful XP from defending his land or attacking the Horde, and he wants the XP earned shown on reports.

Horde fights and defending land are the main way you level, bigger than little monsters. About 8–10 Horde or defense wins to gain a level, at every level. Every fight report shows "XP earned" with the number, including losses.

## What is already in the game (R2, still on TEST in R6.5)

`public/xp2.js` already awards XP for some defense and march fights, and `public/reports1.js` already has an "XP earned" line. Two things are wrong:

1. **The amounts are tiny.** A defense win is about 80 XP and a Horde attack about 40–80, almost no matter how big the fight is, because kills count as 1 XP per 250 basic troops. At level 10 you need 3,162 XP to level (`xpNeed(L) = round(100 * L^1.5)`), so the bar barely moves. Little monsters (`15 + 5 × level`) feel like the only source. Replace this payout. Do not keep `XP2.base`, `XP2.mult`, `XP2.perTroops`, or the +20 owner bonus.

2. **Some Horde fights never get this XP.** `runFight` only records `f.xp2` when `G._xp2` is set, and `G._xp2` is only set inside `resolveMarch`. Walking up to fight a Horde hex (`fightFaction` in `stage2.js`) or a raider Stronghold (`fightFort` in `fight.js`) awards nothing through xp2. `fightFaction` still has the old flat `addXP(BAL.factions.retakeXP)` (25) on a hex retake and `addXP(BAL.factions.homeXP)` (250) when a clan home falls. Remove those two `addXP` calls so they are not stacked on the new payout. Keep the loot, the hex claims, and the routed-clan behavior.

LIVE does not have `xp2.js` at all. Do not deploy there.

## Locked payout

Leave `xpNeed` alone. A typical win is one-ninth of the XP needed for the player's current level:

```
typical = xpNeed(P.lvl) / 9
sizeFactor = clamp(enemyTroops / myTroops, 0.5, 2)
xpWin  = max(1, round(typical * sizeFactor))
xpLoss = max(1, round(xpWin * 0.25))
```

`clamp(x, 0.5, 2)` means `Math.min(2, Math.max(0.5, x))`.

Worked examples (equal fight, sizeFactor 1):

| Level | XP to next level | Typical win | Loss (25%) |
|------:|-----------------:|------------:|-----------:|
| 1     | 100              | 11          | 3          |
| 5     | 1,118            | 124         | 31         |
| 10    | 3,162            | 351         | 88         |
| 15    | 5,809            | 645         | 161        |
| 20    | 8,944            | 994         | 249        |

Nine typical wins at level 10 are 3,159 XP, just shy of 3,162, so it takes 9 or 10. A fight against a Horde group twice your size pays double (703 at level 10). A fight against a group half your size pays half (176). One fight never levels you by itself.

### Troop counts

- `enemyTroops` is the Horde (or raider) troop count in that fight, using the same count already on the fight result (`r.r26.att.n` on a defense, the enemy army-row total on a march or walk-up fight). Use troops, not old "power" points.
- `myTroops` is the player's troops in that fight: troops sent on the march, or that player's defending / helping troops (home garrison + that player's stationed guards). Do not count the hero as troops. Do not count teammates' troops as yours.
- If `myTroops` is 0 (a hero-only assault), use 1 so you do not divide by zero. Against any real Horde group that will usually cap at 2×.
- If `enemyTroops` is 0, treat sizeFactor as 0.5 (the floor). Still award at least 1 XP if a real fight ran.

### Who gets XP

Defending and attacking the Horde pay the same formula. That includes:

- Defending one of your hexes against the Horde (`apply25`)
- Defending a pipeline (`reconcile26` / pipe fights)
- Your troops helping on a teammate's hex (`applyGl25`) — if you had troops in the fight, you get your own full payout, not a split share
- A march that fights a Horde squad, intercepts one, or fights a raider holdout
- Walking up to fight a Horde hex or clan home (`fightFaction`)
- Walking up to fight a raider Stronghold (`fightFort`)

A loss still runs the same size math, then pays 25%.

Each player who had troops in the fight gets their own payout computed from *their* `myTroops`. The land owner does not get a bonus for owning the hex, and gets nothing if they had no troops in the fight.

No fight means no XP: an unguarded hex the Horde walks into (`none:true` / `capReport26`) does not award XP and does not show an XP line.

Little monsters stay exactly as they are (`15 + 5 × level` via `battleWin` and the existing mutant path). Do not run the new Horde formula on them, on a march or off one. Do not change quest, badge, claim-hex, or operation XP.

Do not award XP from `predict()` or any other simulated `runFight`. Only real fights that the player actually fought.

Do not award the same fight twice (for example both in `runFight` and again in `resolveMarch`'s `finally`, or both the new formula and the old `homeXP` / `retakeXP`).

## Reports

Every real fight report must show the XP earned:

- The Reports list subtitle: `· +N XP`
- The report detail card: a clear **XP earned** row with `+N`
- The end-of-fight summary, when there is one (combat2 already has a slot for `f.xp2`)

Wins and losses both show the number. Do not hide the line when the amount is small. Use the same number that was actually granted through `addXP`.

Attach the XP to the report in the same write that creates the report (`f.xp2` on duel/march reports, `xp1` on defense `fr25` rows, set before or as the row is pushed). Do not rely on the current "find a march report from the last 120 seconds that has no xp" lookup; that is fragile and misses walk-up fights.

No XP line on non-fight rows (drives, unguarded walk-ins, outpost captures with no battle).

## What a level still gives

Unchanged. `addXP` in `progress.js` already levels the player, shows the toast, grants +1 skill point, and `xp2.js` already applies +3% hero HP/ATK/DEF and +100 march size per level. Leave that in place. Do not change `xpNeed`.

## Implementation notes

Prefer fixing and replacing the payout inside `public/xp2.js`, and making `public/reports1.js` always show the number. Touch other files only as needed (remove the two flat `addXP` calls in `stage2.js`; set a real-fight context so `fightFort` and `fightFaction` award once; bump `public/sw.js`).

A clean shape:

- One function, e.g. `xpOf2(enemyTroops, myTroops, win)`, that returns the integer payout from the locked formula.
- One `give2` that calls `addXP` and returns the amount granted.
- Compute and store `f.xp2` (or `row.xp1`) on every real non-monster fight, including walk-up fights, not only when `G._xp2` is set.
- Call `give2` exactly once per player per fight, in a path that does not run for `predict()`.
- Write that same amount onto the report in the same turn.

Keep the existing "is this a monster?" check so little-monster fights do not go through the Horde formula. Horde squads, raider holdouts, and forts already use names like `(power N)` or `u.fort`; do not regress that.

## Tests

Update `tests/r2-xp.js` (and reports tests if they assert the old 80-XP-style numbers). Add coverage for the locked examples and the new paths:

1. Defense win, equal troops, level 10: +351 XP, report list and card show "+351" / "XP earned".
2. Defense loss, same setup: +88 XP, shown on the report.
3. Horde march win, enemy twice the player's troops, level 10: +703 XP, on the march report and the fight summary.
4. Horde march win, enemy half the player's troops, level 10: +176 XP.
5. `fightFaction` retake win awards the new formula once (not +25 on top), and the report shows it.
6. `fightFort` win awards the new formula and the report shows it.
7. Ally helper with troops gets a full payout from their own troop count; a land owner with 0 troops in the fight gets 0.
8. Unguarded walk-in: no XP, no XP line.
9. A little-monster win still gives `15 + 5 × level` only, not the Horde formula.
10. `predict()` / a simulated `runFight` does not change `P.xp`.
11. Level-up bonuses unchanged: +100 march size per level, +3% hero stats per level.
12. Nine typical sizeFactor-1 wins at level 10 grant 3,159 XP (do not overshoot into a double-level from one fight).

Existing R2 tests that expect `(40 + beaten*0.02/5)*1.5 + 20` must be rewritten to the new formula or they will fail.

## Out of scope

- The held R6.6 card / demolish / HQ-move work
- Changing `xpNeed`, monster XP, or non-combat XP
- LIVE deploy, Firestore rules, Discord
- Alliance-redesign work

## Hand-back

Branch from `360b495`, implement, run the tests above, bump the cache name, and stop. Hand back the commit, the changed-file list with SHA-256 hashes, and the cache name, for TEST-only verify. Do not deploy.
