# Dead Zone Drive: R1 handoff (Nov 9, 2026)

**For Grok (deploy) and Pope.** R1 = 9745fd7 (R0, live on TEST and LIVE) + the first fixes from the playtest design.
Branch `build-r1`. Cache `ddd-v26-12i-integrated-6-r1`, HUD label `12i-integrated-6-r1`. **Frontend only. No rules change.**
TEST first. LIVE only when Pope says so after playing it.

Changed files (12): `bal14.js` (label), `card1.js` (new), `fight.js`, `index.html`, `net.js`, `rank15.js`, `reports1.js` (new),
`style.css`, `sw.js`, `v25b.js`, `v26a.js`, `v26b.js`. Diff: `docs/R0-to-R1-frontend.diff`. Hashes: `docs/R1-SHA256SUMS.txt`.

## What changed
1. **Titles / ranks / bank requests use the signed-in account id** (`rank15.js`). They used the character id (`P.uid`).
   A character imported into an email account can carry an older id, and the 12i rules check `request.auth.uid`, so
   Claim leadership, titles and ranks were refused. Errors now say what happened instead of failing quietly.
2. **`?local` only on TEST and localhost** (`net.js`). On the live address it is ignored.
3. **One card manager** (`card1.js`, loaded last):
   - Closing always hides the card first, then runs the older cleanup steps; one failing step can't keep it open.
   - Fight cards close with Back/Esc.
   - A march result or raid alert the game opens by itself while another card is open (or within 2 s of closing one)
     waits in a queue. A bar shows "📬 N waiting", and tapping it opens the next. Nothing is dropped.
   - `fight.js`: a fight's playback only touches its own card, never a newer one.
4. **Full report for every fight** (`reports1.js`):
   - Defense fights store their breakdown when the fight is applied. It used to be attached by a 700 ms timer that only
     caught the last fight on this phone within 15 s (removed from `v26a.js`).
   - Fights you start (marches, forts, monsters) write a report from the fight itself: your troops sent/lost/left with
     tier and class, your hero's ATK/DEF/HP, each enemy unit's ATK/DEF/HP, and a why line. It is recorded even while
     the card waits in the queue or during catch-up.
5. **Reports page**: tabs All / Attacks / Defense / Horde / Alliance / Drives / Marches; ✕ deletes one, Select deletes
   several, Clear deletes the tab (tap twice). Every report card has a Delete button. Keeps the newest 60 of each kind
   (was 20/30) and clears reports older than 14 days. A save with full lists measured about 120 KB (rule limit 900 KB).
6. **March list arrow** (from 8b01cde, only the march list part): tuck/expand with an arrow, remembered per device,
   marches keep running.

**Known limit:** when your troops help on a teammate's hex, your report shows your troops, losses, the result and the enemy
power, but not the full breakdown. The note between phones is capped at 190 characters by the rules. The hex owner's
report has the full breakdown.

## Tests (all on R1)
- New: `tests/r1-cards.js` (each card type closes with one tap, 50 times each; Back closes fights; no playback onto a newer card;
  queue + bar), `tests/r1-reports.js` (back-to-back defense reports, march/monster reports, tabs, delete/select/clear, 60 + 14 days),
  `tests/r1-oldsave.js` (a save from 9745fd7 loads with nothing lost), `tests/two-device/t-titles-ui.js` (titles through the
  real UI on two phones, including a character id that differs from the account id), `tests/qa/` (crawl).
- Existing, same as on 9745fd7: s9 (20), s9b, s10, s15 (14), s16, s17, s13 A–F, drive-claim, home-still, import-own,
  phone-front, qa-gates, stamp15, fort-march (22), march-one (21), bank-credit, bank-guards, preview-guard, h12-gaps, march-panel.
- bank-once (2 FAIL) and return25 (2 FAIL) fail the same way on 9745fd7; not caused by R1.
- preview-runtime needs your HTTPS preview proxy; not run here.
- Crawl: phone, iPhone SE, Pixel, desktop, 0 script errors (same one pre-existing wide SVG on Base › Fort as 9745fd7).
- Live address check: no dev tools, `?local` ignored, range check on.

## Deploy (TEST)
1. Pull `build-r1`, compare hashes with `docs/R1-SHA256SUMS.txt`.
2. `npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json` from `public/`.
3. No rules step. LIVE untouched.
4. Pope on TEST: HUD shows `12i-integrated-6-r1`. Try a title on someone, open Reports, delete a report, tuck the march list.

**Rollback:** redeploy 9745fd7. New save fields (`rp1`) are ignored by older builds.
