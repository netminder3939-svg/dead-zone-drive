# Dead Zone Drive: build 12i handoff (Nov 8, 2026)

**For: Grok (deploy) and Pope.** 12i = 12h + "play anywhere, together", ranks and bank approval, regional loading, and miles. Approved by Pope Nov 8. **Not deployed.** Cache name `ddd-v26-12i`.
**This build has a rules change** (`rules/preview-auth-rules-12i.rules`). Run `tests/rules-12i.test.mjs` on the emulator before publishing.

New files: `rank15.js`, `base15.js`, `front15.js` and `terr15.js` (they load after `bal14.js`). Small edits to:
- `v25c.js`, `v26d.js`, `bal14.js`
- `net.js`, `world.js`, `wipe11.js`
- `sync13.js`, `index.html`, `sw.js`

Review diff: `12h-to-12i-frontend.diff`. Hashes: `ddd-v26-12i-SHA256SUMS.txt`. Rules diff: `12g-to-12i-rules.diff`.

## What changed

### 1. Drives no longer cut off at 50 km (bug)
The game switched anyone more than 50 km from Rathdrum into remote mode. That snapped the map back to their Stronghold and stopped claims, and nothing ever switched it back. It's removed. Players who were stuck get moved to "operate from Stronghold" once, and can tap 📍 to return to GPS.

### 2. Ranks, clan titles, Alliance HQ (`meta/hq`, rules-enforced)
- The first member to tap **Claim leadership** (Alliance › 🏛️ HQ) becomes 👑 Leader.
- **Leader:** ranks, titles, HQ, hand-over.
- **⭐ Officers:** titles and HQ.
- **Members:** nothing.
- An officer can take over a leader who has been inactive for 14+ days.
- Clan titles (24 characters, cleaned of markup) show on the crew list, the HQ tab and the person card.
- The HQ is a hex picked on the map by the leader or an officer. No coordinates are stored. The map shows it with a 5 mi circle and a **Jump** button.

### 3. Bank withdrawals need approval (rules-enforced)
- Leader and officers withdraw directly.
- A member's Withdraw becomes a **request**. The leader or an officer approves or denies it.
- The member's phone then collects it in one transaction: the bank drops by exactly that amount and the request becomes `paid`. No double payout is possible.
- Research spends the bank, so it's leader/officer only.
- Until someone claims leadership, the bank works as before.

### 4. Bases, operating base, portal (`base15.js`)
- **Rule:** you claim and connect pipelines only where you physically are. Everywhere else you use marches.
- **Stronghold near HQ:** "🏰 Pick a spot" within 5 mi of the HQ.
  - Your old Stronghold spot becomes your **🏡 Home Outpost**, so drives, pipelines and resources keep working there.
  - Moving again is allowed after 7 days.
- **🏡 Home Outpost** (1 per player): built where you stand, by GPS. Pipelines can start from it while you're near it.
- **🚩 Forward Outposts** (2 per player): placed remotely from a teammate's card, within 6 mi of a teammate's land. They guard like normal outposts. Normal outposts keep their own limit.
- **Each base has its own troops.** The Stronghold has home troops; an outpost has the troops stationed on it.
  - Marches leave from the base you operate from, with that base's troops, and come home to it.
- **🌀 Portal** between your bases:
  - 20 min + 10 min per 100 km (≈ 60 mi), max 3 h. Idaho to Kansas hits the 3 h cap.
  - No return penalty.
  - Troops in the portal can't fight but still count toward your army size.
- **Operating base** (side rail on the map: 📍 / 🏰 / 🏡 / 🚩 / ⚙︎):
  - 📍 = GPS, the default. Drive mode always switches to it.
  - Choosing a base puts the map and your actions on it, and turns walking claims off.
  - **Per device:** the computer can operate from the Stronghold while the phone stays on GPS. (`op15` isn't synced.)

### 5. Regional horde fronts (`front15.js`)
- Bases within 15 mi of each other form a front.
- The main front is centred on the HQ. Before, it flipped to whichever phone's Stronghold ran the horde last.
- A base more than 15 mi from every front opens a new front:
  - its own three clans, named "<gang> · <player>'s area"
  - a 48 h rest before they move
  - horde scaling based on the players who have bases there
- Max 6 extra fronts. A front with no base for 7 days closes.
- Everything stays in the one shared horde doc.

### 6. Territory loaded by region (stays on the free plan)
- Every hex doc now carries `rg` (a region cell of about 17 × 15 mi) and `al` (alliance id, for a future shared world).
- Each phone listens only to the cells around:
  - its GPS position
  - its bases
  - the HQ
  - where the map is looking
- There's one listener per cell, so panning never re-reads cells it already has.
- **Migration:** until `meta/terrv` = 2, phones load everything (the old way) and stamp `rg`/`al` on docs missing them. A new rule allows a write that only adds those two fields. Once none are left, a phone sets v2 and everyone switches.
- Measured on the stand-in backend: after Kay claimed 300 hexes in Kansas, the Idaho phone still read **0** of them. It loads them only when the map is moved to Kansas.

### 7. Tiles pay within 10 mi of a base
Owned tiles never fade unless captured. Tiles more than 10 mi from all of your bases pay nothing each day. The tile card and the Base tab say so, and building an outpost nearby turns income back on.

### 8. Miles
All distances in the interface show in mi and ft, including drive stats and pins.

### 9. Save engine hardening (`sync13.js`)
An immediate save (`cloudSave(true)`, which several older features call) skipped the newer-copy check. A device that hadn't yet seen a newer save could have overwritten it. I couldn't trigger an actual loss in tests, but the check now always runs. Only "Keep this copy" in a conflict overrides, and it does that by adopting the server revision first.

## Tests (all PASS on 12i)
**Single device:**
- `s9-bases.js` (20 checks): 50 km fix, ranks, HQ, move Stronghold, cooldown, operating base, portal times and arrival, outpost marches, returns, drive→GPS, outpost limits, supply, miles, bank request→approve→collect, HQ tab.
- `s9b-outpost-march.js`: a full march round trip from a Home Outpost.
- `s10-fronts.js`: a Kansas front opens, clans camp near Kansas, 48 h rest, per-front scaling, the front closes.
- Regressions: s0, s1, s2, s4, s5 (0 troops missing), s6–s8 (12h balance).

**Two devices (stand-in Firebase):**
- `s13` A–F save tests: all pass.
- `s15-idaho-kansas.js` (14 checks): region stamps, migration to v2, region isolation, ranks and HQ seen by both, titles, bank approval across two players with no double payout, Forward Outpost and portal, Kansas front.
- `s16`: operating base is per device.
- `s17`: a stale immediate save.

**Rules:** `tests/rules-12i.test.mjs` (33 cases). **Not run here** (no emulator download in this environment). Grok, please run it.

## Deploy (TEST only)
1. Emulator: run `tests/rules-12i.test.mjs` plus your existing 12d/12g suites against `rules/preview-auth-rules-12i.rules`.
2. Frontend: `npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json` from `public/`.
3. Rules: fresh fetch, diff (`12g-to-12i-rules.diff`), dry run, then publish.
4. LIVE untouched.
5. Pope, once it's on TEST:
   - Claim leadership.
   - Place the HQ.
   - Test with a second account: a bank request, a title, a Forward Outpost, a portal.

**Rollback:** redeploy 12h and republish the 12g rules.
- New fields: `rg`/`al` on hexes, `p14` and `g26.t` on members, `op15` and `portal15` in saves. Older builds ignore all of them.
- New docs (`meta/hq`, `meta/terrv`, `bankReq/*`) can stay.
- With 12g rules the bank is open again.

## QA pass (Nov 8, after the first 12i commit)
A crawler opened every tab and sub-tab, tapped every safe button and map card on phone (iPhone 13 / SE, Pixel 7) and desktop sizes: **0 script errors**. Fixed:
- **Phone top bar** (from 12d): the "Log out" text button ran off the right edge and squeezed the resources into a 31 px column covering the status chips. Phones now show a ⏻ icon, resources wrap onto their own rows, and the status line, chips, Marches panel and base rail sit under wherever the top bar ends (small phones included).
- **Long toasts** were one line and ran off both sides; they wrap now.
- **Base rail** reached the 🚗 Drive button on normal phones. It's now one button showing where you play from, and it opens sideways.
- **Map picking** (HQ, Stronghold spot, Forward Outpost) had no visible cue and stayed armed for 3 minutes. It now shows a bar with Cancel.
- **GPS accuracy** now shows in ft/mi too.
- **Regional fronts bug:** float rounding (the horde step is 2/3 min) could make a brand-new front skip its first step, so its clans never spawned. Tolerance added; 8/8 runs pass.
Tools: `tests/qa/` (crawl, phone layout fit, rail, unit text scan).
