# v26 progress (TEST only, never live)
Backup: /workspace/zz-backups/p2-before-v26-20261104-2233
Plan: js/v26a.js (pipeline fix + garrison combat + 5 classes) · js/v26b.js (reports home, event router, drive recap, troop cap, bug drive-over) · js/v26c.js (clean cards, alliance tabs 10->5, horde markers, stronghold look) · zones.js n=4 · cleanup stages · regress · shots-v26
## Log
- 22:33 backup done
- 23:40 wrote js/v26a (garrison combat, 5 classes, pipeline guard fix, reconcile, capture reports), v26b (notify26 router, Reports home, no-timer popups, drive recap + own-hex pay + bug drive-over, troop cap), v26c (clean cards, tabs 10->5, person card, horde markers, Stronghold look, class picker); zones n=4 (61 hexes, 24h fortify); css v26 block; sw ddd-v26-1
- local: tests/run.js all PASS after zn.js made robust to same-document nav; new tests/scenarios/v26.js 25/25 PASS; shots in /workspace/wasteland-game/shots-v26
- cleanup stage 1: deleted p2-js-backup-* x6 + css backup inside project (full copy in zz-backups); removed dead driveHud wrapper in march.js
- 00:20 cleanup stage 2: removed fix5 6 s auto-close + fix8 30 s auto-battle/120 s close (Jacob: popups stay). regress v26 run1 71/75 (card text in hidden <small>, ally sub line) -> fixed. daily-reset check now counts payReset calls (flake fixed). sw ddd-v26-2

- resume: verified v26a/b/c + zones n=4 + css + index tags wired; fixed zone text 19→61; kit8 no starter resources; P_DEFAULT res=0; ensureStartSh26 (Stronghold yes); sw ddd-v26-3
- cleanup stages 3–4 (fold wrapper chains / delete inject patches) parked — high risk, features already clean via overlays; stage 1–2 done
- pipe unlock: drive-past unlocks site, build online (no pin), cap 1 per resource type
- deployed ddd-v26-3 to TEST only https://dead-zone-drive--test-edax914d.web.app (live still ddd-v19-3b)
- regress 74/75 on pv-zz-v26reg3 (teleport dayDelta flake from auto-SH claiming ring-1; helper hardened after)
- WIPED team pv-rathdrum-crew only (backup zz-backups/pv-rathdrum-crew-pre-v26-wipe-2026-11-05T07-47-08.json). Live rathdrum-crew untouched (4 players remain).
- Fresh start verified: Stronghold up, resources 0, kit gear yes, pipeCap=5 (1/type), zones n=4, 5 classes, sw ddd-v26-3. Shots 11-13 in shots-v26/

- 23:57 ddd-v26-4 TEST: fixed dual Stronghold + dual Members after wipe signup
  Root cause: (1) ensureStartSh26 placed SH on Rathdrum GPS-fallback (~70m) before real GPS, then real GPS created a second player/SH; (2) old world.js SH marker still drew under new sh26 marker; (3) people26 appended a second people list on Crew tab.
  Fix: wait for real GPS / relocate starter SH once; window.SH26 suppresses old marker; people26 replaces members rows. Cleaned 3x jpope fallback docs, kept pope @ -165_405. Live untouched.
  Verify: DupCheck26 throwaway — SH not placed on fallback, one SH after GPS, oldSh=0 newSh<=1. Shots 14-15 in shots-v26/.
- verify PASS: fallback places nothing; real GPS places one SH; old marker gone (oldSh=0 newSh=1); Crew lists each player once. Live still ddd-v19-3b.
- 07:20 v26-5 start; backup zz-backups/p2-before-v26-5-20261105-0720
- 07:26 wrote js/v26d.js (SH fire450/HP3500 +40%/lvl, sack not destroy, wipe-epoch horde guard, 48h grace, bank 500 + 30% squads, heal26), v26a innate26 hook, css; v26 scenario PASS
- 07:40 deployed ddd-v26-5 TEST only (channel test); live untouched. 08:01 redeploy with heal26b fix.
- regress (gtest/regress.js, +5 v26-5 checks, bank regen 2500->1600, weak-clan test 500->50) on pv-zz-v26reg5b: 80/80 PASS. Local tests: 17/19, pp+zn fail identically on the pre-v26-5 backup (pre-existing).
- horde pv-rathdrum-crew: backup zz-backups/pv-rathdrum-crew-horde-pre-v26-5-2026-11-051600.json. By 07:47 a v26-5 client (pope 7qg8) had already dropped the pre-wipe horde and spawned a fresh one (start 07:47, banks 500, anchor -165_405 = pope SH, squads idle). Did NOT delete meta/horde again (would be a no-op).
- restore: heal26b on pope's phone (after refresh) reclaims -167_405, -167_406 (Ash Choir, prevUid pope) and sets SH back up if down. Not yet observed.
- shots: shots-v26/16-v26-5-stronghold-card-protected.png, 17-v26-5-stronghold-card-closeup.png

- 2026-11-05 13:23 PT ddd-v26-6 TEST: dual-device sync wiped Jacob (lvl4→2, badges/dr26/pipeUnlock gone; tiles kept). Root: acctSync last-write-wins across alias saves. Fix: js/v26e.js progress-score sync + merge + mid-drive clear + clamp negative drive recap; heal26c restores Lv4 + 9 badges from activity + pipe unlocks on owned hexes. Cloud PATCH blocked by rules (client heal on refresh). Live untouched (still ddd-v19-3b). Shots 18-19 in shots-v26/.

- 2026-11-05 13:33 PT ddd-v26-7 TEST: v26-6 heal NEVER RAN — js/v26e.js had a syntax error (extra } in cloudSave wrap), PAGEERR Unexpected token catch, heal26c undefined. Fixed syntax; heal now reapplies until Lv4 + 9 badges verified; pipe unlock retries. Browser sim PASS. Cloud still lvl2 until Jacob refreshes (rules block anonymous PATCH). Live untouched ddd-v19-3b. Shots 20-21.

- 2026-11-05 13:37 PT ddd-v26-8 TEST: pipe unlocks were ON phone (6) but Pipelines UI hid any unlock not in sitesNear(); computer alias still empty; build also blocked by 0 parts (need 15). Fix: v26c list reconstructs from pipeUnlock26; v26f unlocks from LM_STATIC+tiles+badge kinds, grants +15 parts once, seeds restored dr26 summary from meters. Sim PASS. Live untouched. Shots 22-23.

- 2026-11-05 ~2:00 PM PT ddd-v26-9 TEST: chat-only · pipeline build preview+confirm · sparse material-rich zones (~5 km lattice) · pipe-guard van with troop count visible to whole crew
  - Chat: AT26.chat.parts=['chat']; Activity stays Crew › Around the fire + longer Activity under Crew
  - Pipeline: Tap Build → ghost marchTrack (local) + crew/open/horde dots → Confirm charges & online / Cancel free
  - Zones: density only (still 61 hex / 24h / +50%·+10%); ZONE.step≈20 on test (~5 km); plain hexes = normal claims; soft-reset toast (zoneSparse26)
  - Pipe reinforce: auto-escort; hide stuck hex badge; 🚚 + troop count rides the van; member pipes sync guardN so every crew phone sees it
  - Files: js/v26g.js · zones.js (var _zc) · css pipevan26 · sw ddd-v26-9 · tests/scenarios/v26g.js
  - Live untouched (still ddd-v19-3b)
  - deployed TEST https://dead-zone-drive--test-edax914d.web.app (version 303614555a2e1f7a). Live still ddd-v19-3b. Local v26g scenario PASS.

- 2026-11-05 ~2:05 PM PT ddd-v26-10 TEST: tap escort van → info card (who / troops / class / walls+damage). No fight.
  - js/v26h.js pipeVanCard26 + richer guardUid/Name/Cls sync; v26g van marker interactive
  - Shot: shots-v26/28-v26-10-van-card.png. Live untouched.
