# 12i integrated — review for the release executor

This commit sits on `5187e61` (`ddd-v26-12h-integrated-2`). It does not change Claude's 12i commit `4c274b8` or the 12h commit `11153a2`. Cache name: `ddd-v26-12i-integrated`. Visible label: `12i-integrated`.

Nothing here was published. No rules deploy, no account write, no LIVE migration, no hosting deploy.

The previous zip `/opt/cursor/artifacts/5187e61-12h-integrated-2.zip` is unchanged. SHA256 `1bfcc65b0be601cc2ba20e2da2bdecae95e141af0f780f00b0638a7ea3c1c181`.

## What changed on purpose

Automatic 50 km remote mode is gone. A real GPS fix, including one 107 km away, moves the dot and does not turn on the crew-home banner. It also does not add walked distance when the step is longer than 2 km, and a speed jump does not claim the landing hex.

`op15` is the operating base. It is in the per-device local set in `sync13.js`, so it is not synced. `s16` showed the computer on the Stronghold and the phone still on GPS while scrap synced.

A saved `far25` flag is retired once by `migrate15`. If that flag was on and a Stronghold exists, `op15` becomes `sh` for that device. The flag is deleted and `mig15` is set. Boot does not leave the banner up. Choosing GPS again follows the real fix. Reapplying the flag with no fresh home proof can show the banner; two accurate home fixes clear it and do not upload the long gap. The 31.8 m added in that test is the short GPS step after the flag is already off, not the 107 km gap.

Operating from a base projects the dot onto that base with `G.jump`. `claimPath` returns 0 while the device is not on GPS. A portal moves troops between bases. It does not call `setPos`, so it adds no walked distance and no claim. Travel time is 20 minutes plus 10 minutes per 100 km, capped at 3 hours. `s15` measured the Idaho-to-Kansas portal at 3 hours.

## Claims and forts

A fresh accurate GPS crossing still claims an ordinary tile: own and alliance tiles stay, an unreinforced enemy tile is taken, a fort or horde building is not captured by driving. A garrison that has not arrived does not block the claim. An empty garrison does not block it. A horde squad standing on the hex does. A tile that is only inside a tower ring is still claimed. A stale sample, jitter, a duplicate sample, and a teleport do not claim.

Overlapping fort arrivals share one gate per fort hex, taken before the fight and released after it. Two marches against the same fort paid the existing capture once (scrap +204, one gear drop). The march with no troops stopped on the fort and did not take it. The same march id still does not pay twice.

## Territory writes (not run on LIVE)

These writes happen only when a signed-in Firebase client is running. `?local` on 127.0.0.1 does not open a cloud project. The proof below is the in-memory fake at `127.0.0.1:8790`.

`terr15.js` does all of the following:

1. Every `NET.claimHex` payload gains `rg` (about a 0.25° by 0.35° cell) and `al` (the team id).
2. The client reads `teams/{team}/meta/terrv`.
3. While `v` is missing or below 2, it listens to the whole `territory` collection.
4. `stamp15` merge-writes `{rg, al}` onto docs that have no `rg`, at most 400 per pass.
5. When that pass has no failures and nothing remains, it writes `meta/terrv` `{v:2, t:serverTimestamp, by:uid}` and switches to one listener per cell (`where rg == cell`).

`s15` on the fake server finished with 328 territory docs, every one carrying `rg` and `al`, and `meta/terrv.v == 2`. Idaho then stopped reading Kansas until the map looked at Kansas. That fake database was reset afterward by `s16`. No production project was contacted.

Other writes exercised on that same fake server, because the player used the new screens: `meta/hq` (leader, roles, titles, HQ), `bankReq` (one request, status `paid`, amount 40), `meta/alliance` bank ending at scrap 460 with `payReq` set, plus the existing player, save, explored, activity, and bankLog writes. `op15` stayed off the cloud document.

`migrate15` only calls the existing local `save()`. It does not write territory or `terrv`. A device that owns the save lease can upload that profile through the normal save path. The follower test wrote no revision.

## Rules, LIVE impact, backward compatibility

| File | SHA256 |
| --- | --- |
| `rules/preview-auth-rules-12g.rules` (matches the published hash the user confirmed) | `dbc26937ef58ff981d251601b3c4b2e9aeadd6811a308c2f23d183955850393a` |
| `rules/preview-auth-rules-12i.rules` (not published) | `9a1d6e5c1c6eb019d5edaad419ae4479ede8310ea2feb87581e912f0340f0499` |

Local emulator only (`127.0.0.1:8098`, demo project, jar `cloud-firestore-emulator-v1.19.8.jar`). The 12i file passed its 33 cases plus: no-auth cannot read a player; the owner can store `g26.t` 1.4 and integer `p14`; top-level lat/lng is denied; another account cannot write the player doc; `terrv` cannot be created at any version other than 2. The 12g file still lets any member withdraw, and it denies `meta/terrv` and `meta/hq` (`No matching allow statements`).

Publishing the 12i rules would apply to every team, preview and live. Until `meta/hq` exists, the bank stays open, same as today. The first leadership claim creates `meta/hq`. After that, a member cannot drop the bank directly; an officer can; a member can collect an approved request once. Old clients that still withdraw directly start failing at that moment. Research spends go through the same bank rule, so they become leader/officer writes once `meta/hq` exists.

Publishing the frontend onto the current 12g rules does not complete the migration. `meta/terrv` and `meta/hq` creates are denied. A stamp that only adds `rg` and `al` to someone else's hex is denied. A player's own new claim may include `rg` and `al`, because the 12g claim rule does not forbid extra fields. `stamp15` counts failures and does not write `terrv` unless the batch is clean, so region mode does not turn on.

If both the 12i client and the 12i rules are later deployed, the first signed-in 12i client on a team will read the whole territory collection, merge-write `rg`/`al` across existing docs, and write `meta/terrv` v2. That is a real LIVE migration. It was not run.

Backward compatibility after that point: old clients ignore `rg`, `al`, `g26.t`, `p14`, and `portal15`. They do not read `terrv`, so they keep full-collection listeners. 12i clients stamp their own new claims. An old client that claims after v2 does not add `rg`. Region listeners will not see that hex. Nothing in this build keeps scanning for unstamped docs once v2 is set. Mixed-version play after v2 can hide those claims from 12i phones until a 12i client rewrites the doc.

Preview hosts (hostname contains `--`) prefix team codes with `pv-`. The live hostname does not. Localhost does not. Wipe still requires both a `pv-` team and a preview host, and the collection list now includes `bankReq`. No protected account was reset.

## Forward outposts and the construction-march idea

Forward outposts are in this build. They are not an accidental drop, and they are not the queued construction march.

A player can place up to 2, from a teammate's card, within 6 miles of that teammate's land. Placement uses the existing outpost cost and hold timer, then the building guards like an outpost. Troops get there by portal. Marches can leave from that base. Walking there does not claim unless the phone is actually on GPS. `s15` placed one next to Pope's Stronghold and portaled 500 troops.

A construction march would send troops to a site and build on arrival. That is not implemented. No march in this commit constructs a building.

## Left as they were

In-person range gates that this commit does not remove: a mutant fight still wants about 120 m unless the phone is already on a friendly hex; the on-foot faction Attack still wants about 300 m (a march can already fight that hex); a landmark badge still wants about 90 m. Forts and strongholds no longer require standing there.

`s8-tier.js` still omits `gear.tp`. It is not the tier proof. `qa-gates` is: march HP at tier 1.4 is 350, one scale, and `fight26` row HP scales by 1.4.

Horde scale still averages the live army plus every other member with `p14 > 0`, including an offline record. A missing or zero `p14` does not dilute. The player's own published `p14` is not added twice. The average stays high after someone stops playing. That behavior is unchanged.

## Tests recorded this run

Local page `http://127.0.0.1:8767/?local` unless noted. Raw logs are in the frontend zip under `logs/`.

- `preview-guard`, `drive-claim`, `home-still`, `return25`, `fort-march`, `qa-gates`, `march-one`: all pass
- `s15` fake Firebase `127.0.0.1:8790`: region stamps, terrv v2, region isolation, ranks, one bank payout, forward outpost, Kansas front. Page errors empty
- `s16`: operating base stays on the device that set it
- `s17`: a stale phone's forced save does not overwrite the newer computer save (scrap stays 600)
- Rules emulator: all pass, including the 12g comparison

Phone acceptance on a hosted build is not done. Shared-backend TEST is not authorized by this commit.
