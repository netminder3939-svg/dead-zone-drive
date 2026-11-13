# R6.6 — landmark card fix, outpost art on the cards, demolish, move a built Alliance HQ

- Branch `build-r6-6`, one commit on top of R6.7 (`build-r6-7`, 9c77199). The R6.7 XP work is kept as-is underneath.
- Visible label `12i-integrated-6-r6-6`. Service-worker cache `ddd-v26-12i-integrated-6-r6-7-6` (both releases in the name).
- Hosting only, TEST only. No rules files, no Firestore, auth or Cloud Functions changes. LIVE stays on 9745fd7.
- Spec: `docs/R6-6-FIXES.md` (as sent). New file: `public/build66.js`.

## 1) Landmark Supply site row
- `v26c.js`: the Build button keeps its own label (`Build 120🔩 15⚙️`, or `🔒 Drive past to unlock`). When the site is blocked, the button is only disabled; the reason appears once, in the small text.
- `style.css`: `.row.pipesite` is now a full-width wrapping row, with a shrinkable `.grow` and button (rules from §1B).
- At 390px the row is 322px wide and the text column 302px (it was 0px). There is no toast, and the landmark drawing is unchanged.

## 2) Kit art on the cards (Jacob's files only; nothing drawn or generated)
- **Outpost detail card** (`UI.infoOutpost`):
  - The large image is `opArt65`: fire shrine for Home, war banner for Forward and plain outposts.
  - The title is the plain name ("Forward Outpost").
  - The emoji appears only if the image fails to load.
- **Outpost top row** (`base15`): the small drawing plus the plain name.
- **Teal `.bi24` box** on the building stats card (`v25b` `bldCard`):
  - Stronghold, watchtower and outpost thumbnails use `shArt65`, `towerArt65` and `opArt65`, with the emoji as fallback.
  - The CSS keeps the drawing at 44px.
- **Tile card title** (`cleanCard26`): "Watchtower Lv4" with no 🗼. The Stronghold and Outpost titles are the same, plain text.
- **Capture result cards** (`supply64`, done while I was there): the same `opArt65` art.
- **Kept as text:** the small "⛺ Outpost" label in the Defense power breakdown is a text label, not an art slot.

## 3) Demolish (`build66.js`)
- **What can be demolished:**
  - Your own watchtowers, Home, Forward and plain outposts (including one that is still capturing), and your pipelines.
  - Never the Stronghold, the Alliance HQ, or a teammate's building. Those cards have no Demolish button.
- **Refund:** 50% of the build cost plus upgrades paid, rounded down per resource.
  - Tower: `BAL.tower.cost` plus `towerUpCost` for each level reached. A Lv1 tower refunds 75🔩 10⛽ 6⚙️; Lv4 refunds 435🔩 58⛽ 35⚙️.
  - Outpost: what was actually paid. This is recorded as `paid66` on the outpost when it is placed, from now on. Outposts built before this release use `outpostCost()` at the time of demolish; if a Fortify rank changed since the build, that figure can differ.
  - Pipeline: `PIPE.cost`, which refunds 60🔩 7⚙️.
- **Confirm:** uses the existing `UI.ask`. It shows the refund with the usual resource icons and the consequences: hexes stay yours, some may leave pay range, and troops go home.
- **Button:** "🧨 Demolish" in the danger style. There is exactly one per card.
  - It appears on the outpost card, the watchtower card and its stats box.
  - On the pipeline card it replaces the old "🗑️ Remove", which refunded nothing.
- **What happens on confirm:**
  1. If you were operating from that outpost, you go back to GPS.
  2. Your troops there go home through `sendHome25(hex, n, 'building demolished')`.
  3. The record is deleted (no ruins), so the slot and cap free up.
  4. The refund is added with `addRes`.
  5. An `allianceLog` entry is written.
  6. `supplyBust64`, `save`, `pushMember` and `drawWorld` run.
- **Pipeline:** goes through `removePipe`, so the existing `fix13` hook still sends the guards home. The resource slot frees immediately.
- **Hexes:** they stay yours. Nothing is released.
- **Troops in motion:**
  - Portal arrivals and marches returning to a demolished outpost already fall back to the home pool (`addPool15`). Nothing new was needed.
  - A capture in progress claims nothing.
- **Teammates' troops:** I never write to their docs. A sweeper running on each player's own phone remembers which friendly building each of their garrisons sits on.
  - If that building has been missing from the owner's summary for 5+ minutes, those troops go home ("building demolished").
  - If the alliance HQ moved, the troops on the old hex go home right away ("HQ moved").
  - Your own hexes and bare hexes are never touched.
  - **Edge case:** a teammate's tower that goes *offline* for unpaid upkeep also drops out of their summary, so after 5 minutes your troops there would come home too. Tell me if that should be handled differently.

## 4) Move a built Alliance HQ
- **Who and where:** leader and officers only. Alliance › HQ now shows "🏛️ Move HQ (tap the map)" when the HQ is built, with a cost line. There is no Demolish there.
- **Picker:** reuses `pick15('hq')`.
  - On tap it runs `hqSpaceWhy6`, the not-a-Horde-hex check, the Vault-lock check and the not-the-same-hex check.
  - A refused hex only gets a toast. Nothing is paid.
- **Confirm modal:** shows the Vault cost **(PROPOSED — Jacob to confirm)**, "Lv N kept" (and "upgrade continues" if one is running), and how many of your troops on the old hex will march home. The name field is kept.
- **Payment:** `vaultTx6(HQ6.moveCost, cur => ({...cur, hq:{hex,name,by,byName,t}}))`.
  - Only the `hq` key changes. `bld`, `roles`, `leader` and `titles` are copied through unchanged, which is the shape the 12i officer `hasOnly(['hq','titles'])` rule allows.
  - `HQ6.moveCost` is 375🔩 75🥫 75💧 50⛽ 37⚙️, i.e. 25% of the build cost, floored. **PROPOSED — Jacob to confirm.** To change it, change only `HQ6.moveCost`.
  - No cooldown.
- **After the move:** your troops on the old hex go home ("HQ moved"). The new hex is claimed only when `buildHq6` would claim it (never a teammate's hex). Nobody's Stronghold is moved.
- **What still works the same:**
  - An unbuilt HQ spot is still a free move through `setHq15`.
  - A member sees no Move button and is refused.
  - A Vault that is short or locked is refused, and nothing changes.
- **Rules:** I did not touch rules. In local mode the write goes through. If TEST refuses the move write with permission-denied, stop and send it to Jacob.

## Bug found and fixed on the way (please note)
`stage4.js` declares a top-level `const S4` (plan pins) that hides space4's `window.S4`. Because of that, `hqSpaceWhy6` read `S4.allyGap` as undefined, compared against NaN, and **never refused a hex**. That has been true since R6 for building the HQ as well. It now reads `window.S4`, falling back to gaps of 1 and 2. Placing or building an HQ right next to buildings is now refused, as R6 intended.

## Also in this branch
- `tests/h.js` accepts `VW`/`VH` for the viewport (the default is still 430×900).

## Tests
- **`tests/r6-6-fixes.js`, 390×844, 41 checks:**
  - §1: full width, Build label, reason once, no toast, an unblocked site is enabled, art kept.
  - §2: Home, Forward and plain outposts show the right drawing in the big image and teal box with a plain title. Tower and Stronghold have no emoji titles. One Demolish per card; none on the Stronghold.
  - §3: Lv4 and Lv1 tower refunds; cancel changes nothing; troops go on a Returning march; the slot is freed; outposts refund 50%, return you to GPS, redraw the pay range and keep the hex; a capturing outpost records what was paid and claims nothing; a pipeline refunds 50% and frees its slot; a teammate's card has no Demolish.
  - §4: the cost is 375/75/75/50/37; Move appears with no Demolish; a blocked hex has no debit; the confirm text is right; cancel changes nothing; after the move the new hex is set, `bld` is byte-identical and the exact cost is debited; troops march home; no Stronghold moves; a short Vault and a locked Vault are refused; a member is refused; an unbuilt spot is still free; the sweeper sends troops home.
- **Regression, all pass (two timing flakes passed on a serial re-run):**
  - `r6-7-xp` 24, `s11-supply`, `s11b`, `s11c`, `s11d`, `s9-bases`, `s9b`, `s10-fronts`.
  - `r6-2-van-move-check`, `r6-3-map`, `home-still`, `r6-2-hero`, `r6-hq`, `r5-horde`, `drive-claim`, `fort-march`, `march-one`, `march-panel`, `h12-gaps`.
  - `r1-cards`, `r1-reports`, `r1-oldsave`, `r2-view`, `r2-xp`, `r3-ui`, `r3-tiers`, `qa-gates`, `phone-front`, `import-own`, `stamp15`, `r6-5-places`, `r6-5-overview`.
- **Crawl**, phone and desktop: 39 screens each, 0 errors, 0 issues.

## TEST verify checklist
1. Open Dead Mall #5 with a scrap line already built. The row should be full width and the button should read "Build 120🔩 15⚙️" (disabled).
2. Open a Forward Outpost and a Home Outpost from the map. You should see the war banner or fire shrine in the header, the big image and the teal box.
3. Demolish a Lv1 tower. Check the refund in your resources and that the troops are returning.
4. As leader or officer, move the built HQ. The Vault should drop by 375/75/75/50/37 and the level should stay the same. **If TEST answers permission-denied, stop and tell Jacob. Do not publish rules.**

## Deploy (TEST only)
1. Pull `build-r6-6`.
2. Compare `docs/R6-6-SHA256SUMS.txt` (every hosted file changed since R6.7, plus `build66.js`).
3. From `public/`, run `npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json`.
4. LIVE untouched. No rules step.

**Rollback:** redeploy `build-r6-7` (9c77199) for R6.7 only, or `build-r6-5` (360b495) to drop both.
