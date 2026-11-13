# Dead Zone Drive R6.6 — Claude-ready fixes spec

For: Claude (implementer). Prepared Tue Nov 10, 2026, updated 5:16 PM Pacific (America/Los_Angeles) with Jacob’s Move Alliance HQ answers.

**Build on branch `build-r6-5` at commit `360b495a78a39e5cbeee3f6c6c0d4914d0796caa` (the R6.5 TEST host).** Do not rebase onto anything else. Line numbers below were taken from that tree in `/workspace/r6-5-test-release-20261110/repo`. Find the same functions by name if a later typo-fix shifts them.

**Release name: R6.6. Hosting only. TEST only. Deploy label `12i-integrated-6-r6-6`.** Do not deploy to LIVE. No Firestore rules, database, or auth changes in this drop. §4’s verdict is that a built-HQ move should not need a rules change if the write stays on existing paths (details there). If a TEST write is permission-denied, stop and flag it for Jacob’s separate OK — do not publish rules. If you change code, put it on a branch on top of `360b495`.

Jacob’s art rule still stands: use the kit files exactly as drawn. Never redraw or generate anything. Emoji is only the fallback when the manifest/art helper returns empty.

This spec has four product pieces:

1. Fix the landmark “Supply site” card that collapses into a one-word-wide column (and the overlapping “already have a scrap pipeline” message).
2. Put Jacob’s R6.5 outpost art on the outpost detail card (and clear leftover emoji on other building cards where kit art already exists).
3. Demolish player-built structures (not the Stronghold, not the Alliance HQ).
4. Move a **built** Alliance HQ, with Jacob’s answers applied. Cost amount is proposed and still needs his confirm before you treat it as final.

Jacob’s original phone shots were described as Dead Mall #5 (wild one-word list + overlapping scrap-pipeline message) and the Forward Outpost detail card (tent emoji instead of his art). A 390px headless reproduction against TEST `3d849d060be403ba` (same commit) confirmed both; shots and measurements are under `/workspace/share/r6-5-1-fixes/`.

---

## 0. Constraints (do not break)

- Presentation + existing player/world save paths only (`save()`, `pushMember()`, existing `hqTx15` / `removePipe` / `sendHome25` / `supplyBust64`). No new collections, no new member-doc fields unless a field already exists and is the natural place to store a timestamp.
- R6.4.1 `space4.js` typo fix stays in place (`if(kk===key4)return;key4=kk;` on its own line).
- Features must be polished, not patched in: the supply-site row should look like a normal full-width card row; demolish should use the existing confirm (`UI.ask`) and the existing danger button look (`.red24` / `button.fight`).
- Do not post to Discord.

---

## 1. Landmark card: “wild list” / one-word-wide Supply site row

### What Jacob saw

Opening a supply landmark (Dead Mall #5) shows the “Supply site · scrap · Unlocked · build from your Stronghold…” block as a one-word-wide column, with “You already have a scrap pipeline (1 per resource type)” sitting on top of it like a toast.

### Root cause (confirmed at 390px)

This is one layout bug, not a toast bug.

1. `pipes.js` `UI.infoLandmark` wrapper (lines 65–67) inserts a flex row before `.ibtns`:

```html
<div class="row pipesite">
  <div class="grow">…title and <small> copy…</div>
  <button class="btn-primary">Build …</button>
</div>
```

`.row` is `display:flex` and `.row .grow` is `flex:1; min-width:0` (`style.css` lines 31–32). `min-width:0` is what lets the text column shrink to nothing.

2. `v26c.js` lines 166–171 then rewrite that row. When the site is unlocked but `canBuildPipe(s)` returns a reason, it does **two** things with the same string:

- Puts `🔒 ${why}` in the `<small>` (correct).
- Also sets **the button’s label** to the full `why` string:

```js
btn.disabled=!!why;
btn.textContent=unlocked?(why||`Build ${…}`):'🔒 Drive past to unlock';
```

For a second scrap mall when a scrap line already exists, `canBuildPipe` (`v26c.js:147`) returns:

`You already have a scrap pipeline (1 per resource type)`

3. The disabled button keeps the default `min-width:auto` (min-content of that long label). At a 390px phone width the measured row was **322px**; the button was **292×57**; **`.grow` width was 0px** and its text stacked into a ~628px-tall one-word column. The long disabled button visually overlaps that column and reads as a toast. It is not `#toast` (`z-index:900`, under `#modal` at `950`).

Measured (TEST, 390×844, in-memory Rathdrum, two unlocked malls, scrap pipeline already on the other mall): `/workspace/share/r6-5-1-fixes/repro-390.json` and `screenshots/phone-390-landmark-dead-mall-5.png`.

`buildPipe` (`v26c.js:156`) would also `toast(why)` if the button were clicked while enabled; keep the button disabled when blocked, and do not also toast a reason that is already on the card.

### Fix

**A. Stop stuffing `why` into the button label.** In `v26c.js` around line 171, keep the Build (or “Drive past to unlock”) label; only use `why` to disable the button and to fill the `<small>` lock line that is already there.

```js
  const btn=box.querySelector('button.btn-primary');
  if(btn&&!mine){
    btn.disabled=!!why;
    btn.textContent=unlocked?`Build ${Object.entries(PIPE.cost).map(([k,v])=>v+RES[k]).join(' ')}`:'🔒 Drive past to unlock';
  }
```

When `mine` is set, the existing “Line” button is fine.

**B. Make `.row.pipesite` survive a narrow flex context**, even if a future long label comes back. Add CSS (in `places65.js`’s injected stylesheet, or a small rule next to the other card CSS in `style.css` — one place, not both):

```css
.row.pipesite{width:100%;min-width:0;box-sizing:border-box;flex-wrap:wrap;align-items:flex-start;}
.row.pipesite > .grow{flex:1 1 12rem;min-width:0;}
.row.pipesite > button{flex:1 1 8rem;min-width:0;max-width:100%;white-space:normal;text-align:center;}
```

The row must be a full-width block under the visit/badge row, never a squeezed flex sibling of the header. Do not put it inside `.ihead` / `.cch26`.

**C. Polish:** the reason stays once, in the `<small>` under the title, not repeated as the button caption. A blocked Build button stays visually a Build button (disabled), not a sentence.

### Acceptance

At 390px width, open an unlocked supply landmark of a resource the player already has a pipeline for:

- The Supply site box is full card width. Title and body wrap as normal sentences, not one word per line.
- The Build button is disabled and still says `Build …` (the cost), not the why sentence.
- The lock reason appears once in the small text.
- No toast with the same sentence appears over the card.
- A site with no cap conflict still shows an enabled Build button and can open the existing pipeline flow.
- Landmark art in `.iart` (already wired in `fight.js:89` via `lmArt65`) stays visible; the tall collapsed column must not push the art off the card.

---

## 2. Outpost (and other) detail cards: leftover emoji where kit art exists

### What Jacob saw

The Outpost detail card uses the ⛺ tent emoji in the header row, the large image, and the teal icon box. It should use his R6.5 outpost art: fire shrine for Home, war banner for Forward and any other outpost (`MAPPING.md` / spec §3 and §5).

### Root cause (confirmed at 390px)

R6.5 put the art on the **map marker** and the **Base › Outposts / Your bases list rows** (`stage2.js:135`, `stage2.js:206`, `base15.js:198`). The **detail card** was never switched. `UI.infoOutpost` (`stage2.js:122–124`) still hard-codes the tent:

```js
this.info({title:`${oi} ${on}`, sub:`…`, art:'<span class="bigemo">⛺</span>', …});
```

`opKind64` (`stage2.js:104–105`) supplies the leading header emoji (`🏡` / `🚩` / `⛺`). The large `.iart` slot is always the tent, even for a Forward Outpost (repro: title `🚩 Forward Outpost`, `.iart` innerHTML `<span class="bigemo">⛺</span>`, no `<img>`, while `placeArt('outpost','fwd')` correctly resolves to `assets/places/landmark/landmark-war-banner.webp`). Shot: `screenshots/phone-390-outpost-fwd.png`.

The teal 56×56 box is `.bi24` (`style.css:510`, `border:2px solid #3ae0c8`). It comes from the live `bldCard` in `v25b.js:200–214`, injected by the `UI.info` wrapper in `v23d.js:23–24` when the card is opened from a map-marker click (`G._lastLL` set within 1500 ms). The icon is a plain emoji:

```js
ic={sh:'🏰',tower:'🗼',op:'⛺'}[b.k]||'🛡️'
// …
<div class="bi24">${ic}</div>
```

`opArt65` already exists in `places65.js:26` and is the right helper (Home → fire shrine, fwd/other → war banner, emoji only as `onerror` fallback). Use the kit files. Do not generate or redraw.

### Other cards (audit)

| Card | Large / header art | Leftover emoji to clear |
|---|---|---|
| Outpost (`UI.infoOutpost`) | Still ⛺ in `.iart`. **This is the bug.** | Title prefix `oi`; `.iart` tent; `.bi24` tent |
| Watchtower (`UI.infoStruct('tower')`) | Kit art is already in the clean-card header (`.cca26`). | `cleanCard26` `bTitle` for `kind==='tile'` prefixes `🗼` (`v26c.js:18`). Visible at 390px: art + 🗼 beside “WATCHTOWER LV4” (`screenshots/phone-390-watchtower-card.png`) |
| Stronghold (`UI.infoStruct('sh')`) | Kit art already in `.cca26`. Title “Shot's Stronghold” has no castle emoji when opened as `'sh'`. | If a Stronghold hex goes through `cleanCard26('tile')`, `bTitle` would become `🏰 Stronghold LvN`. Use a plain-text title whenever the header already shows the drawing. `.bi24` would still be 🏰 on a marker-click stats card |
| Landmark (`UI.infoLandmark`) | Already uses `lmArt65` (`fight.js:89`). | None in the art slot. Keep as-is |
| Alliance HQ (`hqCard6`, `hq6.js:102`) | Already uses `hqArt65('hqcard65')`. | The `🏛️ HQ building` heading is a text label next to the citadel drawing, not a missing art slot. Leave it unless you are already touching that heading; do not invent a new HQ card |
| Base › Outposts rows, map markers, overview pins | Already use `opArt65` / thumbs | Out of scope. Do not restyle the map |

Capture-result cards in `supply64.js` (`art:'<span class="bigemo">⛺</span>'` etc.) are result popups, not the detail card. If you touch them in the same pass, give them the same `opArt65` treatment; do not block the detail-card fix on that.

### Fix

**A. `UI.infoOutpost` (`stage2.js:122–124`).** Same pattern as `UI.infoStruct` / `UI.infoLandmark`:

```js
const art=(window.opArt65&&opArt65(o.kind||'other','op65 card65',{emo:oi,cls:'bigemo'}))||`<span class="bigemo">${oi}</span>`;
this.info({title:on, sub:`${hexName(id)} · ${st}`, art, body:…, buttons:…});
```

Title is the kind name only (`Home Outpost` / `Forward Outpost` / `Outpost`), no leading emoji, matching how the Stronghold card titles the name without 🏰. `base15.js:214` still prepends its troops/portal row; leave that behavior, but if it prints `baseLabel15(id)` (which still has 🏡/🚩/⛺), prefer the same plain name or a 36px `thumb65(opArt65(…))` plus the words — do not leave a lone tent as the “picture.”

**B. Live `bldCard` (`v25b.js:200–214`, the function that actually runs).** Put kit art in `.bi24`, emoji only as fallback:

```js
const kind=b.k, lv=…;
const artHtml=kind==='sh'?(window.thumb65&&window.shArt65&&thumb65(shArt65(lv)))
  :kind==='tower'?(window.thumb65&&window.towerArt65&&thumb65(towerArt65(lv||1)))
  :kind==='op'?(window.thumb65&&window.opArt65&&thumb65(opArt65((o&&o.kind)||'other')))
  :'';
const ic=artHtml||({sh:'🏰',tower:'🗼',op:'⛺'}[kind]||'🛡️');
```

Add CSS so the teal box shows the drawing, not a clipped scrap:

```css
.bi24 img.p65,.bi24 img.th65{width:44px;height:44px;object-fit:contain;margin:0;}
```

**C. `cleanCard26` titles (`v26c.js:18`).** When a building is on a tile card, drop the emoji from `bTitle` (the header already copies `.iart` into `.cca26`):

```js
bTitle=`${{sh:'Stronghold',tower:'Watchtower',op:'Outpost'}[b.k]||'Building'} Lv${lv}`;
```

`infoOutpost` is not run through `cleanCard26` today; do not have to wrap it. If you do, the art in `.iart` must already be the kit image so `.cca26` inherits it.

Use `opArt65` / `shArt65` / `towerArt65` / `lmArt65` / `hqArt65` only. No new files, no generated stand-ins.

### Acceptance

At 390px, open a Home Outpost, a Forward Outpost, and a regular Outpost (no `kind`) from the map marker and from Base › Outposts › Show:

- Header / large image / teal `.bi24` (when the stats card is present) all show the correct kit drawing: fire shrine for Home, war banner for Forward and other. No ⛺ in those slots.
- Broken/missing art still falls back to the old emoji via `pErr65` / the `||` tent span.
- Watchtower card: dark (Lv3–5) or wood (Lv1–2) drawing in the header; no 🗼 prefixed on the title.
- Stronghold card: keep the castle art already there; no new 🏰 in the title.
- Landmark card art unchanged and still visible after the §1 layout fix.
- Byte-identical to the kit; no redrawn/generated images.

---

## 3. Demolish buildings

Jacob’s answers: every player-built structure **except the Stronghold and the Alliance HQ** can be demolished. Instant, after a confirm dialog that shows the refund. Refund is **50% of the total build cost, including upgrade costs paid, rounded down per resource**. Stationed troops return home automatically, using the existing recall/return mechanics. The HQ cannot be demolished; it can be moved — see §4, and do not invent the move rules.

### What can be demolished

| Structure | Data path | Build / upgrade cost to refund | Notes |
|---|---|---|---|
| Watchtower | `W().towers[hex]` | `BAL.tower.cost` for Lv1, plus each paid upgrade. `towerUpCost(t)` (`fight.js:121`) is `round(cost * level * 0.8)` when going from `level` to `level+1`. A LvN tower has paid `cost + Σ_{L=1}^{N-1} round(cost * L * 0.8)` | Instant upgrades today (`upgradeTower`, `fight.js:124`). If `state==='building'` (first build, cost already paid), refund 50% of the build cost and cancel construction |
| Regular / Home / Forward Outpost | `W().outposts[hex]` | `outpostCost()` (`stage2.js:96`, used by `placeOutpost` and `placeSpecial15`). Home and Forward use the same cost. The Fortify skill can discount it | Refund 50% of what was **paid**. If the paid amount was not stored, recompute with `outpostCost()` and note the edge case if the skill rank changed since the build. Prefer recording `paid` at build time going forward, without a migration requirement for this release |
| Landmark supply pipeline | `P.pipes` / `removePipe` (`pipes.js:27`) | `PIPE.cost` (`pipes.js:8`, `{scrap:120,parts:15}`). No upgrades | There is already a **Remove** button that refunds nothing (`pipes.js:64`). Replace it with Demolish + the 50% confirm. `fix13.js:110–112` already sends pipe guards home on `removePipe` — keep that |

**Do not demolish:**

- The player Stronghold (`W().sh`). No Demolish button on `UI.infoStruct('sh')` or Base › Stronghold. Relocate / `moveSh15` stay as they are.
- The Alliance HQ (`G.hq15.bld`). Shared alliance building, paid from the Vault, stored on `teams/{team}/meta/hq`. See §4 for moving it.
- Pins/markers, research, zone fortify — not buildings.
- Teammates’ structures. Only the owner (or, for a pipeline, `p.own!==false`).

Combat `destroy()` (`world.js:153`) sets `state:'down'` (ruins, can rebuild). Demolish is a player choice: **remove the record entirely** so the slot and cap are freed and no ruins marker stays on the map.

### Refund

```js
function refundHalf(paid){
  const o={};
  for(const k of Object.keys(paid)){const n=Math.floor((paid[k]||0)*0.5);if(n>0)o[k]=n;}
  return o;
}
```

Pay it back with the existing `addRes` (or equivalent) on confirm, then `save()`. Do not refund patch/repair/upkeep, only build + upgrades actually paid. If every resource rounds to 0, the dialog still says so and demolish is allowed.

Worked example, default tower costs `{scrap:150,fuel:20,parts:12}`:

- Lv1 paid = that cost. Refund `{scrap:75,fuel:10,parts:6}`.
- Lv2 paid = cost + `round(cost*1*0.8)`. Refund half of that, per resource, floored.

### Confirm dialog and button

Use existing `UI.ask(title, text, action)` (`kit1.js:15–17`). Title e.g. `Demolish Forward Outpost?`. Body must list each refunded resource (with the same `RES` icons the rest of the game uses) and a one-line consequence (hexes stay yours; they may fall out of pay range; troops march home). Confirm button label `Demolish`. Style the card button with the existing danger look (`.red24` or `button.fight`), never as a quiet ghost button.

**Where the button lives** (own structures only):

- Outpost detail card (`UI.infoOutpost` / `.ibtns` or the `.btns24` row): **Demolish**, after the existing portal / operate actions, not in the primary reinforce slot.
- Watchtower card (`UI.infoStruct('tower')` button list, and the `.btns24` on `bldCard` when it is yours): **Demolish**.
- Pipeline card (`pipeCard`, `pipes.js:62–64`): replace `🗑️ Remove` (“The build cost is not refunded.”) with **Demolish** and the refund confirm. The landmark “Line” button can keep opening that card; no need for a second demolish on the landmark row.
- Optional but nice: matching danger control on Base › Outposts / Base › Pipelines / Territory tower rows. Same confirm, same function.

No Demolish on the Stronghold card, Base › Stronghold, or the HQ card.

### Troops, return home

Use the existing mechanics; do not invent a new travel type.

- Owner troops stationed on the building hex, including an outpost’s own pool (`poolOf15` / `stationed()[hex]`, `base15.js:30–33`): `sendHome25(hex, n, 'building demolished')` (`v25b.js:102–106`), which already builds a grey Returning march and toasts. If `sendHome25` is missing, `recallStation` is the older wrapper onto the same path.
- Pipeline guards: keep the `removePipe` hook in `fix13.js` that calls `sendHome25`.
- If the player is operating from the outpost being demolished (`P.op15 === hex`), switch them back with existing `setOp15('gps')` or `'sh'` before the record is deleted.
- Marches that *left* that outpost (`TP().awayBase15`): leave them running; when they come home, the existing `returnMarch` / `recallMarchTroops` wrappers in `base15.js` already fall back if the base is gone — verify and, if they would drop troops, send those troops to the Stronghold / `TP().home`.
- Portal in flight *to* the demolished outpost (`portal15`): on arrival, drop the troops at the Stronghold (or current home pool), not on a missing base. Use the existing portal completion path; do not add a new Firestore doc.
- **Allied** troops on the hex: do **not** write another player’s member doc (that would be a rules question). Your client cannot `sendHome25` for them. On your demolish, `allianceLog` that the building is gone. Add a **hosting-only** client sweeper: when a player loads and they still have `gar` / `stationed()` on a hex whose friendly building they were reinforcing has disappeared, call `sendHome25` locally with why `building demolished`. Do not auto-recall troops that were stationed on a bare hex the player still owns on purpose.

### Hexes, pay range, caps, marches

- **Ownership:** claimed hexes stay yours (`P.tiles` unchanged). Do not auto-unclaim and do not call `NET.claimHex(…, {released:true})` unless Jacob later asks to give the land back. (That release path already exists in `qol.js:88–89` for Stronghold relocate of `.area` hexes only.)
- **Defense:** the demolished building’s ring no longer defends. Hexes outside every remaining ring can be taken by raiders with no fight (existing copy on the structure card).
- **Pay range:** outposts (and the Stronghold) are supply centres (`myBases15` / `inSupply15`, 10 mi, `T15.supplyMi`). After an outpost is removed, call `supplyBust64()` (and `checkBases` will also notice). Hexes that were only inside that outpost’s 10 mi circle become unpaid but stay yours — same copy as today’s “Not paying” card. Watchtowers are not pay-range centres; demolishing one does not change who pays at midnight.
- **Pipeline cap:** one line per resource type (`v26c.js:142–147`). Demolishing a scrap line frees the scrap slot immediately (`removePipe` already drops it from `P.pipes`).
- **Build caps:** `outpostsLive()` / tower cap ignore missing records. Deleting the record frees a slot.
- **Home Outpost side effects:** drives / `pipeOrigin` can use the Home Outpost when you are physically near it (`base15.js:139`). After it is gone, origin falls back to the Stronghold. Existing pipelines stay; they are not auto-rerouted.
- **In-progress capture** (`outpost.state==='capturing'`): allowed. Refund 50% of the paid cost, delete the outpost, do **not** claim the 7-hex ring, cancel the hold.
- **Marches targeting the hex:** marches are hex-to-hex (`marchTarget` in `march.js`), not “attack this building” objects. An incoming march continues and arrives at the now-empty hex (no building defense). A reinforce march may station on the still-owned hex. Do not silently cancel other players’ marches (that is a marches-collection write; only do it if an existing owner-side recall already would). Log/toast for the owner if they had a march tied to that base.

### Save / sync (hosting-only)

After confirm: update the in-memory world (`delete` the tower/outpost, or `removePipe`), refund, send troops home, `supplyBust64()`, `save()`, `pushMember()` (existing `memberSummary` already republishes `defs` via `ownDefStructs` in `ally.js:9`), `drawWorld()`, close the card, toast the refund. That is enough for teammates to stop seeing the building. No new Firestore fields required for demolish itself.

Do not change published or preview rules. If you discover a write that the current TEST rules refuse, stop and flag it for Jacob.

### Acceptance tests (demolish)

- No Demolish button on the Stronghold card or the HQ card / HQ tab.
- Watchtower Lv1 and Lv4: confirm lists the correct 50% (floored) of build+upgrades; after confirm the tower is gone, the slot is free, refund is in the player’s resources, stationed troops are on a Returning march.
- Home, Forward, and regular outposts: same, plus pay-range: a hex that was only in that outpost’s 10 mi circle is unpaid after, still owned; `supplyBust64` redraws the gold area.
- Capturing outpost: demolish mid-hold refunds 50%, claims nothing, no outpost marker.
- Pipeline: Demolish replaces Remove; 50% of `PIPE.cost` returns; that resource type can be built again; guards march home; upkeep no longer charged for it.
- Operating from an outpost that you demolish returns you to GPS or the Stronghold.
- Ally structure cards have no Demolish.
- Cancel on `UI.ask` changes nothing.
- Still no LIVE deploy, no rules file edits, no auth changes.

---

## 4. Move Alliance HQ

Jacob’s answers (Tue Nov 10, 2026): a **built** HQ can be moved by the **leader or officers**; it **costs resources from the alliance pool** (the Alliance Vault); **no cooldown**; troops stationed at the HQ **return home automatically** via existing `sendHome25`. Reuse `pick15('hq')` + `setHq15` and the **existing placement constraints**. The HQ **keeps its level** when moved. The HQ still cannot be demolished (§3).

An unbuilt HQ *spot* can already be moved, for free, by a leader or officer. Leave that path alone. This section is the built-building move.

### Cost — PROPOSED, Jacob to confirm

Paid from the **Alliance Vault** (`meta/alliance` bank), not from the mover’s personal resources, using the same `vaultTx6` transaction already used for HQ build / upgrade / repair (`hq6.js:65–72`).

**PROPOSED — Jacob to confirm:** 25% of the HQ build cost (`HQ6.cost` in `hq6.js:14`), rounded down per resource, **not** scaled by level (the building is intact and keeps its upgrades):

| Resource | Build (`HQ6.cost`) | This move (25%, floored) | Lv1 repair (40%) for comparison |
|---|---:|---:|---:|
| scrap | 1500 | **375** | 600 |
| food | 300 | **75** | 120 |
| water | 300 | **75** | 120 |
| fuel | 200 | **50** | 80 |
| parts | 150 | **37** | 60 |

```js
// PROPOSED — Jacob to confirm
HQ6.moveCost = {scrap:375, food:75, water:75, fuel:50, parts:37};
// = each resource floored at 25% of HQ6.cost; not multiplied by upMult / level
```

Why 25%, flat: cheaper than a repair (40% of build, and repair scales with level) because nothing is broken and the level is kept; not free like dragging the unbuilt spot; paid from the Vault like every other HQ building action. Put the cost in the confirm dialog with the same `RES` icons as the rest of the game, and keep the words **PROPOSED — Jacob to confirm** in the spec and in any handoff copy until he signs the number. If he picks a different figure, change only `HQ6.moveCost` (or the 25% helper) — not the flow.

If the Vault cannot cover every resource, refuse the move (`vaultTx6` already throws “The Vault needs …”). If the Vault is locked after a fall (`locked6()` / `lockUntil`), refuse the move the same way upgrades are refused. Deposits still work; this is a debit, so the lock applies.

### Who, when, and what is kept

- **Who:** `isOfficer15()` — leader or officer. Members see no Move button and `setHq15` / the move helper still no-ops with the existing “Only the leader or officers…” toast.
- **No cooldown.** No new timestamp field is required. Do not copy the Stronghold’s 7-day `movedAt15` / `relocateCooldownDays`.
- **Level kept.** Do not increment, reset, or rewrite `bld`. Leave `bld` byte-identical: `lvl`, `upEnd` (a mid-upgrade continues), `t`, `by`, `repT`, `lockUntil`, `fallT`, `built`. The protection rings (2 / 3 / 4 by level, `rings6`) follow the building to the new hex automatically because `hex6()` / `drawHq15` / `defendersFor` already read `H().hq.hex`.
- **Name** can stay or be edited in the existing name field on the confirm modal.

### Reuse the existing picker and constraints

1. Show **Move HQ (tap the map)** on Alliance › HQ / `hqCard6` for a leader or officer even when `bld.built` is set. Today `base15.js:189` hides it once built — lift that hide. Do not put a Demolish control next to it.
2. Reuse `pick15('hq')` (`base15.js:168`) and the pick-bar copy already used for the unbuilt spot.
3. On hex tap, reuse the existing confirm modal shape (`base15.js:171`), with added lines for: Vault cost (the proposed figure), “the HQ keeps its level”, “troops stationed here will march home”, and the placement why if any.
4. **Lift the hard block** in `hq6.js:96–97` (`The HQ is built here. It can't be moved.`) and route a *built* confirm through a paid move helper instead of the free `setHq15`. Keep `setHq15` free and unchanged for the unbuilt-spot case.
5. **Existing placement constraints to run on the new hex before debiting the Vault:**
   - `hqSpaceWhy6(id)` (`hq6.js:44–47`) — no overlap with Strongholds, towers, outposts, or enemy bases (the same spacing rule used when the HQ is first built).
   - Not a horde/raider hex (`factionAt`), same as `buildHq6` (`hq6.js:76`).
   - Do not invent a new map-edge or “must stay near the crew” radius for the HQ itself. The **5-mile rule (`B15.hqMi`)** stays a constraint on **player Strongholds around the HQ**, not on where the HQ may be placed (`nearHq15` / `startOk15`). If a move puts someone’s Stronghold more than 5 mi from the new spot, do **not** auto-move them. The existing Alliance › HQ row “Play next to the crew” / `pick15('sh')` (`base15.js:187`) already appears in that situation; they use the existing Stronghold move.
6. After a successful write: `allianceLog`, toast, `drawHq15()`, close the picker, claim the new hex only when the existing `buildHq6` would (`claimTile` if unowned and not an ally’s — do not take a teammate’s hex).

### Troops

On a successful built move, troops stationed on the **old** HQ hex return home automatically with existing `sendHome25(oldHex, n, 'HQ moved')` (`v25b.js:102–106`). Do not invent a new travel type.

- The mover’s own stationed troops: `sendHome25` immediately after the write lands.
- **Allied** troops on that hex: do **not** write another player’s member doc. Use the same hosting-only client sweeper as §3: when a player loads and they still have `gar` / `stationed()` on the old HQ hex and the alliance HQ is no longer there, `sendHome25` locally with why `HQ moved`.
- Portal in flight to the old hex: on arrival, drop troops at the player’s Stronghold / home pool, same as §3’s demolished-outpost portal rule. Do not add a new Firestore doc.

### Firestore rules verdict — no change in this release

**Verdict: no Firestore rules change is required** for this write shape, on the unpublished **12i or R6 preview** rules the current HQ / Vault client is written against.

Exact write:

- `teams/{team}/meta/hq`: change **only** the existing `hq` object (`hex`, `name`, `by`, `byName`, `t`). Leave `bld`, `roles`, `leader`, and `titles` untouched. That is how the level is kept, and it matters for officers: 12i preview rules allow an officer to update `meta/hq` only when `affectedKeys` is a subset of `['hq', 'titles']` (`rules/preview-auth-rules-12i.rules`, `match /meta/hq`). Writing `bld` would be refused for officers on 12i (R6 preview also allows `bld`, but do not rely on that). Leaders can already update the doc more freely. `lockKept()` in the unpublished R6 preview is satisfied as long as `bld.lockUntil` is not shortened — which is automatic if you never touch `bld`.
- `teams/{team}/meta/alliance`: debit `bank` for `HQ6.moveCost` in the same pattern as `vaultTx6`. 12i and R6 preview both allow a leader or officer (`isBoss()`) to lower the bank. R6 preview also refuses a debit while the Vault is locked (`notLocked()`); the client must honour `locked6()` either way.

Use `vaultTx6` (or an equivalent two-document transaction): one debit of the Vault, one `hq` update, no new collections, no new fields. Unbuilt-spot `setHq15` already writes `hq` via `hqTx15` (`rank15.js:51–55`).

**Do not edit or publish any rules file in this release.** The repo’s recorded *published* snapshot (`rules/published-firestore-rules-as-recorded.rules`) is older (no `meta/hq`); LIVE has not been given these preview rules as part of R6.5. This drop stays hosting-only on TEST.

If a TEST move is **permission-denied**, stop and tell Jacob — that would need his **separate OK** before any rules publish. Do not silently ship a rules patch.

### Implementation notes (hosting only)

- Suggested helper, e.g. `moveBuiltHq6(id, name)`, called from the built-HQ confirm button. It: checks `isOfficer15`, `bld().built`, `!locked6()`, `hqSpaceWhy6`, `factionAt`; then `vaultTx6(HQ6.moveCost, cur => ({...cur, hq:{hex:id,name,by:P.uid,byName:P.name,t:Date.now()}}), '🏛️ HQ moved')` — the spread must keep `cur.bld` unchanged; then `sendHome25` on the previous hex; `drawHq15`; optional `claimTile` as above.
- Confirm dialog lists the proposed Vault cost and says the level is kept.
- Mid-upgrade (`bld.upEnd` in the future) continues at the new hex.
- A fallen HQ may be moved if the Vault is not locked and the new hex passes placement (do not invent an extra fallen-only rule). Repair, if still needed, stays the existing `repairHq6` on the building, not on the old hex.
- Members cannot move it. The Stronghold still cannot be demolished; the HQ still cannot be demolished.

### Acceptance tests (Move Alliance HQ)

- Unbuilt spot: leader/officer can still Place / Move the spot for **free** (no Vault debit). Members cannot.
- Built HQ: Alliance › HQ shows **Move HQ (tap the map)** for leader and officer, not for a member, and never shows Demolish.
- `pick15('hq')` opens the existing picker; a blocked hex (spacing / horde) toasts the existing why and does not debit the Vault.
- Confirm lists the proposed cost (375 scrap, 75 food, 75 water, 50 fuel, 37 parts, still labelled proposed until Jacob confirms). Cancel changes nothing.
- On confirm with a full Vault: `meta/hq.hq.hex` is the new hex; `bld.lvl` (and `upEnd` if upgrading) is unchanged; Vault is debited exactly that cost; protection rings redraw on the new hex; the old hex is no longer the HQ.
- The mover’s troops stationed on the old hex are on a Returning march via `sendHome25`.
- Vault short of any one resource: move refused, HQ stays, bank unchanged.
- Vault locked after a fall: move refused, same as an upgrade.
- A Stronghold that is now more than 5 mi from the new HQ is not auto-moved; the existing “Play next to the crew” / Stronghold picker still works.
- Officer path does not write `bld` (12i `hasOnly` friendly).
- No rules file in the diff. No LIVE deploy. No Discord post.

---

## 5. Suggested test plan for the whole drop

Reuse the existing headless/Playwright harness (`/workspace/r6-5-test-release-20261110/testlogs/shot-r65.js` pattern): `?local&team=rathdrum-crew`, Firebase/identity aborted, in-memory Rathdrum only, **viewport 390×844**, no `save()` / `pushMember` to the cloud, no LIVE, no rules deploy.

1. Landmark cap conflict at 390px — §1 acceptance.
2. Home / Forward / regular outpost cards + watchtower + stronghold + landmark art audit — §2 acceptance.
3. Demolish cases in §3 acceptance, still in-memory (or a disposable TEST account if you must hit `save()`, never LIVE).
4. Move Alliance HQ cases in §4 acceptance. For the Vault debit, a disposable TEST alliance is fine; never LIVE, and no rules publish. If `hqTx15` / `vaultTx6` returns permission-denied, stop and report it — do not patch rules.
5. Re-run the R6.5 places / overview / supply suites that are cheap to run; at least `r6-5-places` and a 390px screenshot pass.

When this is ready for TEST, stop and hand the branch to Jacob / the usual verifier. Label `12i-integrated-6-r6-6`. Do not deploy, push rules, or post to Discord from this work.
