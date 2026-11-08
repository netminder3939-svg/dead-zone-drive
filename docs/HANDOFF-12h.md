# Dead Zone Drive: build 12h handoff (Nov 8, 2026)

**For: Grok (deploy) and Pope.** 12h = 12g + a combat balance pass, approved by Pope Nov 8. **Not deployed.** Cache name `ddd-v26-12h`.
Frontend only: **no rules change, no data migration.** Deploy 12g first (or deploy 12h straight to TEST in place of 12g; it includes all of 12g).

Changed: `v26a.js`, `game.js`, `index.html`, `sw.js`; new `bal14.js` (loads after `sync13.js`). Review diff: `12g-to-12h-frontend.diff`. Hashes: `ddd-v26-12h-SHA256SUMS.txt`.

## What changed

| Change | Before → after (horde troops needed to win) |
|---|---|
| **Bug: Barracks tier now counts in fights.** The card promised "power ×1.4 … ×3.2", but the fight ignored tier while T5 troops cost 3.8× more. Each troop's ATK and HP now scale by tier. Teammates' tiers are shared in the member doc (`g26.t`). | 2,000 troops at a Lv1 tower: T1 2,889 · T5 2,889 → **8,304** |
| **Towers and outposts are real defenses.** They have their own HP pool, and each level adds +40% HP. | Empty outpost 49 → **231**; empty Lv1 tower 67 → **396**; Lv5 94 → **902**; Lv10 → **1,612**. Stronghold Lv1 is unchanged at 1,061. |
| **The horde grows with the team.** A clan's troop cap and growth follow the team's **average** army (troops × tier power), up to 10×. It's never below the old 10,000 cap. The average is used, not the strongest player, so one big army can't make raids crush newer teammates. Members publish `p14`. | A team averaging 30k T1-equivalent troops: raids of ~3,000 → ~9,000 |
| **Engineers stay the tank and are now the best defenders.** They still take the hits first (Pope's call): ATK 0.5 → 0.8, HP +10% → +25%. | 2,000 troops at a Lv1 tower: 2,263 → **3,352**, top of all classes |
| **Casters and Strategists defend about 15% better.** Caster HP +45%; Strategist HP +30% and ATK +15%. | Caster 1,806 → 2,428; Strategist 1,776 → 2,414 |
| Raids without a map location are skipped when drawing (they previously stopped the raid layer from drawing) | n/a |

The class text on the class cards now shows the new numbers.

## Week-3 picture (team average ~20k T1-equivalent troops, normal raids ~6,000, every bonus stacked ~12,000)
- Stronghold Lv5 with 15k T3 troops at home holds against 43,000: safe.
- A lone tower Lv5 with 2k T3 holds against ~6,000: at risk, so reinforce it.
- The same tower with 3 teammates of mixed classes holds against ~19,500: reinforcing pays off.
- A new teammate's Lv1 tower with 1k troops holds against ~1,650. Their 48 h grace period still protects them at the start.

## Tests (all PASS on 12h)
- `tests/s6-balance.js`: tower, class, tier and horde-scaling numbers checked inside the running game.
- `tests/s7-lategame.js`: the week-3 numbers above.
- `tests/s8-tier.js`: Barracks Lv1 vs Lv9 now give different fight results.
- Regressions: s0, s1, s2, s4, s5 (troop accounting, 0 missing).
- Two-device saves A–F pass. Lint is clean.

## Deploy
Same as 12g, frontend step only: `npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json` from `public/`. LIVE untouched.
**Rollback:** redeploy 12g. The two new member fields (`g26.t`, `p14`) are ignored by older builds.
