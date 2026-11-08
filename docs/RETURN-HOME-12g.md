# Return home from the crew map (12g, not deployed)

Built on `7f724ab` (PR 3, branch `build-12g`). One behavior change, in `public/v25c.js`. The service-worker cache name is now `ddd-v26-12g-home` so a later deploy does not keep the old file for offline use. Nothing was deployed. No Firebase, Auth, rules, or live data were touched.

## What

A saved `P.far25.on` flag used to stay on after the phone came back near Rathdrum. The banner, the Base pipeline warning, and the block on walk-claims stayed with it.

The flag still turns on when a real fix is more than 50 km from the crew home. It turns off only after a second accurate fix inside 40 km. Accurate means the GPS chip state is ok, which is 60 m or better, and the dot is not a dev walk, drive, teleport, or hold. One weak fix, one dev fix, or one point in the 40–50 km band does not turn it off and does not save. The counter lives in memory.

On that second fix the game saves once and asks the roster update to run once. It does not call `cloudSave` and it does not force a revision. While email sync is on, the existing lease still decides whether this device may upload, and a stale revision is still rejected.

The handoff puts the real coordinate into the game position before the normal move, and sets the jump flag. The gap between the crew-map dot and the phone is not added to walked distance. Walk-claims stay off until the flag is off. After that, a normal step can claim the hex underfoot again. Far-away drive pay is unchanged: steps from 5 m to 3 km still pay, and a longer step still pays nothing.

## Pros

The phone leaves the crew map by itself when the player is really home. No logout, storage clear, import, or repair. One bad point cannot flap the mode. Resources, gear, troops, and the far-drive rate are left alone.

## Cons

The map stays on the crew hex until the second good fix, which is a few seconds if the watch is updating. The 10 km band between 40 and 50 follows the drive but keeps the banner. A dev tool can still move the dot without ending the mode.

## Risk

A second device that still has the flag in a newer save is not overwritten. If that save arrives after this phone has turned the flag off, the lease adopts it and the flag can come back until two accurate home fixes turn it off again. Turning the flag off does not grant the distance of the jump. The landing hex can be claimed once the sign-in gate is open, which is the same rule as any other step.

## Balance and cost

Enter at 50 km, leave inside 40 km, two fixes. The edit is `v25c.js` plus the cache name. No rules change and no economy change.

## Simpler alternative

A button that turns the flag off. It needs the player to notice, and a tap while still away would put the game on the away map.

## Test

`node tests/return25.js` against the local page (`?local`, no Firebase). All of these passed: a saved flag clears on the second accurate home fix and stays off after reload; home to Bonners Ferry adds no meters, scrap, or tiles and keeps the banner; an 8 km far step pays nothing and two 800 m steps still pay once; ±250 m and a dev hold do not exit; 42 / 39 / 42 / 39 stays remote and the next inside fix exits with the distance unchanged; resume restarts the watch without clearing the mode; a reapplied flag waits for two fixes and does not call `cloudSave`; after the gate is open, a claim of the current hex works again.

Not verified: two signed-in devices on Firebase, a real drive, or the preview host. The lease behavior above is from `sync13.js`, not from a second live account.
