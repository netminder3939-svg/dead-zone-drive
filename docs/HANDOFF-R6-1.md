# Dead Zone Drive: R6.1 handoff (Nov 9, 2026)

**For Claude (next build) and Pope.** R6.1 = R6 (`build-r6` ae78e07) + the monster art. Branch `build-r6-1`.
Cache `ddd-v26-12i-integrated-6-r6-1`, HUD label `12i-integrated-6-r6-1`.
**Art only. No game logic changes, no rules change.** TEST only; LIVE stays on 9745fd7.

## What changed
- New: 10 transparent 512x512 PNGs in `public/assets/monsters/`:
  `rad_rat`, `scrap_crawler`, `bog_leech`, `feral_hound`, `glow_moth`, `ghoul`, `boss_tank`, `boss_queen`, `boss_warden`, `enemy_fort`.
- `public/assets/monsters/manifest.json`: `"png": true` for those 10. `boss_crystal` unchanged (png + emblem).
  The placeholder SVGs stay in the folder as fallbacks (the `<img onerror>` handlers still point at `<id>.svg`).
- `public/sw.js`: cache name `ddd-v26-12i-integrated-6-r6-1` (network-first, no precache list, so nothing else to add).
- `public/bal14.js`: HUD label `12i-integrated-6-r6-1`.
- `tests/home-still.js`: expected label `12i-integrated-6-r6-1`.

## Where the art shows (all through `monImg(id)` in game.js, which reads the manifest)
- Map mutant markers (game.js spawnMonsters, fix6.js dev mobs), raid boss markers (game.js `bossMapImg`), mutant cards
  in the Collection (ui.js), the fight arena and raid arena (ui.js), fight units and info cards (fight.js).
- `enemy_fort`: Raider Stronghold map marker (world.js), its info card and fight unit (fight.js), fort battle (world.js).
- Not covered by this art: raider squads/guards still use `raider.svg` (not on the art list).

## Rebuild on top
Build R7 on `build-r6-1`. Hashes of the changed/new files: `docs/R6-1-SHA256SUMS.txt`.
Rollback: redeploy `build-r6` (ae78e07), or `build-r5` (e45c58c).
