# Dead Zone Drive: build 12g handoff (Nov 7, 2026)

**For: Grok (deploy) and Pope.** 12g = verified 12d tree + 14 changed files (2 of them new). **Not deployed.** Cache name `ddd-v26-12g`.

12g contains everything from 12e/12f (audit fixes) plus a new phone↔computer save engine. Hashes are in `ddd-v26-12g-SHA256SUMS.txt` and in the PR description. The review diff against 12d is `12d-to-12g-frontend.diff`.

## 1. Phone ↔ computer saves: redesigned (`sync13.js`)

### Why 12d still failed
Tested with two real browser sessions, a phone profile and a computer profile, on one email account:
- **12d's email mode still runs the old merge engine.** Every 20 s it compares two whole copies and guesses ("realAhead", "superset", "hold"). With both devices open, which is the normal way to play (phone driving, computer tab open), each device builds on a stale copy.
- **False "Safe to switch".** The phone showed "Safe to switch. Cloud save 1 is on the server" after earning 500 scrap, but save 1 did not have it. The computer signed in to 0 scrap.
- **Pipelines, raid-loot claims, achievements, daily streak and plan routes never reach the other device.** auth12 copies a fixed `KEYS` list on sign-in, and `pipes`, `raidLoot`, `ach`, `daily` and `plan` are not on it.

### New design: one character, one playing device, live follow
- **One save per account:** `teams/{team}/saves/{uid}`, as in 12d. Every open device listens to it live (1 read per change).
- **One device writes at a time:** the "playing" device, recorded in a `lease` field on the save. The others mirror the save within about 2 s and show a bar: "📱 Playing on your phone · synced just now. Tap here or play to switch."
- **Takeover:** a real tap or key on another device makes it the playing device. It is already on the latest copy, so it just writes the next revision. Nothing is merged.
- **Idle hand-over:** a visible device takes over after the playing one has been quiet for 90 s (hidden, asleep or closed).
- **Rule:** every write is a transaction that requires `rev == held rev` and moves to `rev+1`. That is the rule the 12d Firestore rules already enforce, so **no new rules are needed** for this.
- **Offline conflict:** if both changed while one was offline (a drive with no signal), the player chooses which copy to keep. The other copy stays on that device in `localStorage` (`wl_sync13_backup`).
- **Honest status:**
  - "Safe to switch" only after the write is acknowledged.
  - Offline shows "Offline… Do not switch devices yet."
  - Quota errors are reported as quota.
- **Whole-character sync.** Everything except per-device fields: position, notifications, and old sync and repair metadata.
- **Write budget:** taps save within about 2 s. Automatic ticks are batched to at most one write per 20 s, plus a 60 s heartbeat. Measured: 2 save writes per 40 s idle with both devices open.
- The 12d merge engine stands down when sync13 is active (`G.syncHoldUntil`). `cloudSave` routes to sync13.

### Scope
- Active only when signed in with email/password, which today means TEST/preview and localhost (the 12d gate). **Live hostnames are unchanged** and still use anonymous sign-in plus the old engine.
- Turning accounts on for live is a separate decision. It needs:
  - Email/Password enabled in the console.
  - The gate in `auth12.js` `previewHost()`, `net.js` `preview` and `v26i.js` `emailHost()` widened.
  - Each live player signing up once and tapping **Import** on the device whose progress they want kept.
- Recommended: run TEST with Pope plus one teammate for a few days first.

### Test evidence (`tests/two-device/`, fake Firebase backend: in-memory Firestore-like store plus email auth, two Chromium contexts)

| Test | Result |
|---|---|
| A: computer signs in, gets the phone's scrap **and pipeline**, shows "Playing on your phone" | PASS (12d: pipeline missing, scrap 0) |
| B: phone plays, computer follows live | PASS |
| C: tap on computer, computer takes over, phone follows and shows "Playing on your computer" | PASS |
| D: both idle and visible for 40 s: 2 writes, lease never flips, copies identical | PASS |
| E: phone offline drives 2 hexes and 5 km while the computer plays; back online, asks which to keep; "Keep this" puts the drive on the server and the computer | PASS |
| F: computer reload keeps everything | PASS |

The fake backend does not enforce Firestore rules. **Grok:** rerun the 12d emulator two-browser suite on 12g, and also check that the `lease` field passes the 12g preview rules. The rules don't restrict keys; that was checked by reading, not by the emulator.

## 2. Audit fixes (from 12e/12f)

| Fix | Proof |
|---|---|
| Plan tab alert never cleared; Alliance raid alert stuck and shown twice | `tests/s1.js` |
| Pipeline guard troops stranded (top-up re-picked the hex; removing a pipe didn't recall guards); orphan sweeper; stuck march troops | `tests/s2.js` |
| Troop accounting over 40 horde fights: **12d 751 unaccounted, 12g 0** | `tests/s5.js` |
| Balance: losing defenders retreat with 20% (were wiped); wounded without beds wait (were dying 1%/hr) | v26a.js, troops2.js |
| Nov 5 "pope" repair retired: it granted Lv4, 9 badges and pipeline sites without driving | `tests/s4.js` |
| Firestore listeners: activity 4→1, players 2→1, meta/alliance 2→1 | `tests/share.test.js` |
| "🚩 Act here" on map marks was dead (undefined function) | lint |
| Gear upgrade ledger logged under the wrong line | lint |
| Malformed marker crashed the map draw | n/a |
| Player names stripped of markup | n/a |
| Rules: preview save read now needs the password provider; `pv-.*` everywhere | `rules/` |

## 3. Deploy (TEST only, Grok's gates)
1. Frontend: `npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json` from `public/`.
2. Rules second: `rules/preview-auth-rules-12g.rules`, after a fresh fetch, diff and dry run. Run the emulator suite first.
3. Auth: Email/Password on, Anonymous kept, no SMS.
4. Device acceptance on the TEST host, phone plus computer:
   - Sign up on the phone, Import, play.
   - Open the computer and sign in: same character, including pipelines, and a "Playing on your phone" bar.
   - Tap on the computer: it takes over and the phone shows the bar.
   - Airplane mode on the phone, play, and turn it back on.
5. LIVE untouched.

**Rollback:** redeploy 12d or 12c. 12g adds a `lease` field to save docs, which older builds ignore. No other data changes.
