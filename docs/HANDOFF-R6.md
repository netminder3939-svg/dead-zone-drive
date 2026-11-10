# Dead Zone Drive: R6 handoff (Nov 9, 2026)

**For Grok (deploy) and Pope.** R6 = R5 (`build-r5` e45c58c) + the Alliance HQ as a real building, the Hoard renamed
to the Alliance Vault with a capacity, and at most 2 officers. Branch `build-r6`.
Cache `ddd-v26-12i-integrated-6-r6`, HUD label `12i-integrated-6-r6`.
**Frontend + a rules change.** TEST first; LIVE stays on 9745fd7.

Changed files:
- New: `hq6.js` (loaded right after `horde5.js`).
- `rank15.js`: `bld` kept in the HQ state; a 3rd officer is refused; approving and collecting wait while the Vault is locked.
- `base15.js`: portal time × (1 − HQ cut); the "Move HQ" button is gone once the HQ is built.
- `space4.js`: the HQ's 2-ring footprint counts in the spacing rule.
- Wording "bank" → "Vault": `ui.js`, `game.js`, `net.js`, `world.js`, `stage2.js`, `theme.js`, `rank15.js`.
- `index.html`, `bal14.js` (label), `sw.js`, `tests/home-still.js` (label).
- Rules: `rules/preview-auth-rules-r6.rules` (new), diff `rules/12i-to-r6-rules.diff`.

Diff: `docs/R5-to-R6-frontend.diff`. Hashes: `docs/R6-SHA256SUMS.txt`.

## What changed
1. **The HQ is a building.** The leader or an officer builds it on the HQ spot, paid from the Vault:
   1,500 scrap, 300 food, 300 water, 200 fuel, 150 parts. One per alliance. Once built it can't be moved.
   - **Protects** members' land within 2 rings (3 at Lv5, 4 at Lv10). It defends with its own wall and fire, the
     Stronghold's numbers at the HQ's level (Lv1: 3,500 HP, 450 fire, 30% walls), even with no troops.
   - Troops members station on the HQ hex fight with it.
   - **Spacing:** its 2-ring area counts like any building. Members can't build inside it, and it can't be built on
     top of someone's area. Its protection can grow past 2 rings without pushing anyone out.
2. **Upgrades** (leader/officers, from the Vault): cost × 1.5 per level, take level × 2 hours, up to Lv10.
   Each level adds wall HP and fire, cuts portal time 5% (up to 25%) and adds 3,000 Vault space.
3. **The Alliance Vault** (was the Hoard / Alliance Bank). It holds 5,000 of each resource, plus 3,000 per HQ level.
   - A full Vault refuses deposits.
   - The daily 25% auto-share sends only what fits; the rest stays with the player.
   - **Nothing already in the Vault is ever removed.**
4. **If the Horde takes the HQ hex:**
   - The HQ stops defending.
   - The Vault locks for 24 h: deposits still work, but no withdrawals, approvals, collections or HQ spending.
   - The Horde takes 10% of every resource in the Vault, once. That clan banks it.
   - Repair after the hex is back and the lock is over: 40% of the build cost (× 1.5 per level above 1).
   - Nobody's own resources or troops are touched.
5. **Officers:** at most 2. The leader must demote one before naming another.
6. **HQ tab:**
   - The building: level, wall HP, fire, walls, rings, portal cut, stationed troops, upgrade time.
   - Next level's cost and gains.
   - The Vault with capacity and pending requests.
   - The crew: rank, title, army, last active.
   - Recent attacks.
   - A link to the Horde dashboard for the leader.
   - The map shows the HQ's level and its protected area (red when fallen).

How a fall is applied: every phone sees it in the shared Horde record, so they all agree on it. The first leader or
officer phone online writes the 10% loss and the lock to `meta/alliance` + `meta/hq` in one transaction. A
`fall5` marker makes sure it's charged once.

## Rules change (12i → R6)
- Officers may also change `bld` on `meta/hq` (build, upgrade, repair, lock).
- `meta/hq.roles` can hold at most 3 entries (the leader + 2 officers).
- **Vault lock:** while `meta/hq.bld.lockUntil` is in the future, nothing can leave the Vault, not even for the
  leader, an officer or an approved request. Deposits still work.
- Nobody can shorten a running lock.
- **Not in rules (client-side only):**
  - The Vault capacity. A modified client could overfill it. Nothing is lost by that.
  - The fall itself, the same as all Horde moves (Spark plan, no Cloud Functions).
- `tests/rules-r6.test.mjs` = every 12i rules test unchanged + 14 R6 tests. **I couldn't run the emulator here**
  (its download is blocked), so please run before deploying the rules:
  `firebase emulators:exec --only firestore "npx mocha tests/rules-r6.test.mjs"`

## Tests (all on R6)
- New: `r6-hq.js` (20 checks, local), `two-device/t-hq6.js` (9 checks, two phones on the fake backend).
- Earlier releases all pass on R6:
  - `r5-horde` 10, `r4-map`, `r4-1-flicker` 5, `r3-tiers`, `r3-ui` 8, `r2-equal` (10,000 fights match), `r2-calibrate`,
    `r2-view` 7, `r2-xp` 6, `r1-cards` 14, `r1-reports`, `r1-oldsave` 3, `t-titles-ui` 10, `t-space4` 8.
  - s5 (same numbers as R5, 0 mismatches), s9 20, s9b, s10 8, s13 12, s16, s17, fort-march 22, march-one 21,
    drive-claim 15, stamp15 9, march-panel 8, h12-gaps 5, home-still (label -r6), qa-gates, phone-front, import-own,
    bank-credit, bank-guards, preview-guard.
  - Crawl phone + desktop: 39 screens each, 0 script errors (the one base/fort SVG note is old).
  - `r5-horde`'s old-clan check failed once and passed on re-runs with no change; it depends on the clock, not on R6.
- `bank-once` and `return25` fail on 9745fd7 the same way.

## Deploy (TEST)
1. Frontend: pull `build-r6`, compare hashes, then from `public/`:
   `npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json`.
2. Rules: run the rules tests above on the emulator first. All must pass.
   - **Heads-up:** the rules are per project. TEST and LIVE share one Firestore, so publishing them reaches LIVE too.
   - They are compatible with the LIVE build: LIVE never writes `bld` or a lock. The one difference LIVE would notice
     is that a leader can't name a 3rd officer.
   - **Publish only after Pope says yes.** Steps: fresh fetch, diff (`12i-to-r6-rules.diff`), dry run, then publish.
3. Until the rules are published, R6 on TEST still plays. Two things don't work yet:
   - An officer's build, upgrade or repair is refused by the old rules. The leader's goes through.
   - The Vault lock is only enforced by the app.

LIVE hosting untouched.

**Rollback:** redeploy `build-r5` (e45c58c) and the 12i rules. `meta/hq.bld` and `meta/alliance.fall5` stay but older
builds ignore them. A Vault over 5,000 stays as it is.
