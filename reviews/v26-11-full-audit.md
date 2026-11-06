# ddd-v26-11 audit

Date of this run: 5 Nov 2026, evening Pacific. No deploy, no merge, no cloud write. The QA-Test browser tab was not opened. Nothing in this run signed into Firebase or read a production document.

The page under test was `http://127.0.0.1:8766/?local`. `?local` forces `LocalNet` (`js/net.js`). The harness aborted any request whose URL contained `firestore.googleapis`, `identitytoolkit`, `securetoken`, `firebaseinstallations`, or `firebaseio.com`. Result: `PRODUCTION_HITS 0`, `PAGE_ERRORS []`. That localhost page is not a `pv-` team. `js/preview.js` adds `pv-` only when the hostname contains `--`. Live and test hosting both name Firebase project `dead-zone-drive` in `firebase-config.js`. A localhost page without `?local` would use that project and live team names. This run did not do that.

A stub that throws from `NET.srvNow` counts app calls. It is not a Firestore transport error and it does not explain the 7:44 PM PT console line `Listen stream … transport errored`.

## Executed checks

| Suite | Passing checks this run | Failed |
| --- | ---: | ---: |
| `tests/audit/local-execute.js` (real page, local mode) | 23 | 0 |
| `tests/unit/v26i-sync-claim.js` | 83 | 0 |
| `tests/unit/v26i-retry-budget.js` | 20 | 0 |
| `tests/unit/v26i-van.js` | 15 | 0 |
| `tests/unit/v26e-sync.js` | 6 | 0 |
| `tests/unit/v26e-heal.js` | 5 | 0 |
| `tests/unit/v26f-drives.js` | 3 | 0 |
| `tests/unit/v26f-pipes.js` | 5 | 0 |
| `tests/audit/rules-and-zones.js` (rules file vs client paths) | 4 | 0 |

164 checks, 0 failures. The browser script is the one that called the real `fight26`, `trainTroops`, `troopTick`, `shState`, `zoneHexes`, `actDedupe`, `planClaimRoute`, `marchTick`, `netKick`, and `returnMarch`.

## Proven

### Critical: a due march used to retry the clock every second

Reproduced on the real functions, with `NET.srvNow` throwing a local stub (not a listen-stream error).

Before this change, `marchTick` runs every 1 second (`js/march.js`) and `resolveMarch` called `NET.srvNow` on every tick while a march was due. `srvNow` writes `teams/{team}/clock/{uid}` and reads it back. The catch called `netState(false)`. The 15 second timer then called `netKick`, which runs `disableNetwork` and `enableNetwork` on every tick while the chip is off. A one-minute model of that schedule is 60 clock writes and 5 network restarts, and it is only a model of those timers. The old functions were not re-executed in the browser after the edit.

After the change, the same minute on the real page did:

| Call | Count in 60 simulated seconds |
| --- | ---: |
| `NET.srvNow` | 3 |
| `disableNetwork` | 2 |
| `enableNetwork` | 2 |
| `updMarch` | 0 |
| loot `addRes` | 0 |

The chip text became `● RECONNECTING…`. Two overlapping `netKick` calls did 1 `disableNetwork` and 1 `srvNow`. A successful return paid 7 scrap once (`updMarch` once for that call). A second return did not pay again.

What changed, and only this:

- One clock probe at a time (`clockProbe`).
- After a failure the next try waits 15s, then 30s, then 60s (`netBackoffMs`). Success clears the wait.
- While the chip is off, the 1 second march tick does not start another probe. The 15 second `netKick` is the retry, and it also waits out the backoff.
- `disableNetwork` does not run twice in parallel.

Reviewed against the alternatives:

| | This change | Only slow the 1s tick, leave `disableNetwork` every 15s | Do nothing because the loop is old |
| --- | --- | --- | --- |
| Clock writes while a march is due and the probe throws | 3 in 60s on the real page | still about 4 a minute, plus the march if it keeps its own probe | about 60 a minute |
| Listen restart | 2 in 60s, and never two at once | 4 a minute, each one drops every listener | 4 a minute |
| Duplicate loot or troops | not observed (0 while failing, 1 when the return worked) | unchanged guards | unchanged guards |
| Breakage | a failed clock waits up to 60s before the next try. Tabbing back still calls `netKick`. A successful probe clears the wait immediately | marches still resolve, but every failure keeps tearing the listeners down | no new risk, the loop stays |
| Balance / cost | no formula change | no formula change | no change |

Rollback of this piece alone is restoring `js/march.js` and setting `sw.js` cache name back to `ddd-v26-11`. That does not remove the save merge. Rolling the whole overlay back to v26-10 also removes the claim-route fix, the van count, and the save merge.

The save merge stays in `js/sync26.js` and is a different diff. A higher revision fills resources only when the local balance is still all zeros and this device has not journaled a refill or spend. A training queue, a stronghold timer, and a real drive stay. That was executed in `tests/unit/v26i-sync-claim.js`, not against QA-Test's cloud document.

### High, from the committed rules file, not from the live console

`tests/audit/rules-and-zones.js` compared client paths with `firestore.rules`. These client paths are not matched: `clock`, `marches`, `meta/horde`, `meta/map`. Rules v2 denies unmatched paths. If the rules published in the Firebase console are this file, every clock probe and every march write is permission-denied, the chip goes to RECONNECTING, and the backoff above is what retries it. This run did not read the console, so it is not proven that the published rules are this file. Player docs reject `lat` / `lng` / `pos` / `location`. A save write requires the signed-in uid. Any signed-in player can read any save in the team (restore-code read). The bank can be withdrawn by any member. Those are in the file.

### Executed and holding

- Combat: `fight26` on an empty level-1 stronghold holds 1,000 and falls to 2,000. The same input repeated byte for byte. `hitDamage` adds critical as a flat percent and sets `crit:false` (`js/progress.js`). No roll in that function.
- Claim route: `0_0` to `4_0` lists 4 hexes, then lists 0 once those ids are owned. The broader route, defender, and daily-cap cases are the 83 sync checks.
- Training: T1 cost is food, water, and scrap (`js/troops2.js`). Paying exactly that cost queues one batch of 1,000. A second call with an empty purse does not queue another. `troopTick` adds those 1,000 to home once.
- Stronghold: a `building` timer already in the past becomes `up` once. A second `shState` does not run it again.
- Zones: `zoneHexes` for the zone of `0_0` returns 61 ids. The title is stable across two calls. Crow + well is one of the generated names (`ZONE.pre` / `ZONE.suf` in `js/zones.js`). 49 of 61 with 12 marked is what that screen shows when 12 hexes are not allied. This run did not open the live crew map, so it did not check that particular zone's 12.
- Activity: two daily-reset lines for the same name collapse. `kind:chat` and `kind:gl25` are removed from the feed (`js/v25d.js`).
- Van position math: 15 checks in `tests/unit/v26i-van.js`. No map tap in the browser this run.

## Static risk (read, not executed)

| Item | Where | Risk | Why it was not changed |
| --- | --- | --- | --- |
| Four listeners on `activity` (feed, chat, cap, battle log) | `js/net.js`, `js/v25d.js`, `js/v26a.js`, `js/v25b.js` | extra reads, not a 1 second loop | merging them is a refactor |
| `gear` drops use `Math.random` | `js/game.js` `rollGear` | loot gear is not deterministic; the fight is | out of scope |
| Member heartbeat every 4 minutes | `js/game.js` | steady write, not a storm | unchanged |
| `syncNow` about every 20s plus on focus | `js/v26i.js` | a few save reads a minute | not the clock loop |
| Same-origin fetch failure falls back to the cache | `sw.js` | an old file can stick if the cache name does not change | cache name is now `ddd-v26-11b` |
| First class pick and crew chat are free; pipeline Cancel spends nothing until Confirm | `js/classes.js`, `js/v25d.js`, `js/v26g.js` | code says so | not clicked this run |
| `ensureStartSh26` places a stronghold when GPS state is `weak` | `js/v26c.js` | a 122 km accuracy reading can still count as ready | not executed; needs a GPS fixture and was not given one |
| Bank and save reads are any signed-in teammate | `firestore.rules` | a teammate who knows a uid can read that save | not changed; published rules were not read |

## Not covered

- The published Firebase rules, quotas, and Auth users. Not opened.
- Jacob's red chip. No video in this run. Not identified as the preview banner.
- Why the 7:44 PM PT listen stream closed, and the Mail.ru 504. Those were on the other network path. This harness did not replay them.
- QA-Test's cloud document, the 3,000 grant as stored, and the open tab's 2574 / 2864 / 2864 / 3000 / 2992. That tab was not touched. A refresh was not run.
- A full defended march resolve through `runFight` inside `resolveMarch` (the claim planner was executed; the fight-on-arrival body was not driven end to end).
- Pipeline map tap, van paint on a real route, GPS claim, drive recap on a moving fix, horde step, chat send, login PIN, and device-wake in a hidden tab.
- Live `ddd-v19-3b`. Not requested and not opened.

No area above is "all good" just because it was not failing in the files that were read.

## Pack (not deployed)

Cache name in `sw.js`: `ddd-v26-11b`. The previous test host cache is `ddd-v26-11`. A failed fetch of the new worker cannot satisfy itself from the old cache name, because the new worker only reads `ddd-v26-11b`. The old worker, until it is replaced, still serves `ddd-v26-11`.

Overlay file: `/opt/cursor/artifacts/ddd-v26-11-test-overlay.tar.gz`

SHA256 `291e5653f8dd3db8c188b7f1076522c48e8c913bddd6410a4e577bdf5745c5cf`

`ddd-v26-11-SHA256SUMS.txt` matches that tar. Not deployed. Live target stays `ddd-v19-3b`.

## Browser checks for a person, after someone chooses to deploy

Do these on `https://dead-zone-drive--test-edax914d.web.app`, not on localhost.

1. The team in the chip is `pv-rathdrum-crew`. Network paths contain `teams/pv-rathdrum-crew/`. None contain `teams/rathdrum-crew/`.
2. DevTools shows `sw.js` with `ddd-v26-11b`. If it still says `ddd-v26-11`, the new pack is not what the tab is running.
3. Leave the existing QA-Test tab alone until that worker is confirmed. Then one refresh. Expect the spent balance and the 1,000-troop countdown to remain, and no new drive distance. Then Player → Save. A save number that did not move means the cloud copy was not updated.
4. With no march on the road, a console listen warning should leave the chip on TEST for a minute. This audit did not prove that warning flips the chip.
5. Send one short march on a test account that is not QA-Test. On a healthy link it should leave and return once. Scrap or troops from that return should not double if the tab is jiggled.
6. Pope's existing drive distance and hexes should still be there after a refresh.
7. Do not open the live host as part of this check.
