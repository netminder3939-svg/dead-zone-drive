# Dead Zone Drive: build 12e audit and fixes (Nov 7, 2026)

12e is 12d plus one new file (`fix13.js`) and small edits to `index.html`, `sw.js`, `v26e.js` and `v26f.js`. It is **not deployed**. Cache name: `ddd-v26-12e`. Base: the exact 12d tree from the handoff zip.

## Fixed and tested

Every fix was reproduced on unmodified 12d first, then checked on 12e. Tests ran in headless Chromium on `?local` with all Google/Firebase traffic blocked. Scripts are in `tests/`.

### 1. Plan tab notification never clears
- **Cause:** a teammate's mark files a news item under Plan › `stub`. Plan's render (shell2, then step6) replaces the whole render chain, so news8's "mark as seen" step never runs on Plan. Nothing checked whether the mark still existed.
- **12d result:** the dot stays after you open Plan, and it stays after the mark is deleted.
- **12e result:** opening Plan clears it. A deleted, finished or expired mark removes its alert by itself within 5 s. For the first 90 s after load, mark alerts are kept until the marker list has arrived.

### 2. Alliance "raid boss is up" is stuck and its link is dead
- **Cause:** the raid alert is filed under `crew`. The v26c Alliance regroup renders the old part names (`over`, `members`, `roster`), so `crew` never matches and the alert can't be cleared. Nothing checked whether the raid was still live. Each grouped part also printed its own copy of the line.
- **12d result:** after the boss escapes, the alert stays and shows twice. Its link only reopens the same tab.
- **12e result:** the alert disappears when no raid is live. While a raid is up, its link opens that raid. One line only, and old items are mapped onto the 5 current Alliance tabs.
- Any other news item now expires after 3 days, so nothing can sit there forever.

### 3. Pipeline guard troops not coming home (the main leak)
- **Cause A:** `guardLine` re-picks the "most exposed" hex every time you add guards. If the horde has moved, the new troops go to a new hex and the pipe forgets the first group. That group sits out of the fight, isn't shown on the pipe card, can't be recalled from it, and never returns.
- **12d result:** guard with 1,000, then add 1,000 after the horde moves. The pipe card shows 1,000, and Recall brings back 1,000. The other **1,000 are stranded**.
- **Cause B:** removing a pipeline never recalled its guards.
- **12d result:** removing a guarded line left **2,000 stranded**.
- **12e:** extra guards join the existing group. Removing a line sends its guards home. A sweeper walks any group still on a hex the crew no longer holds back home, as a visible Returning march with a report. It never acts in the first 3 minutes, and only after two checks 5 minutes apart.
- **Cause C:** march troops whose march finished on the other device, or whose march doc vanished, stayed "away" forever. 12e brings them home after 10 minutes missing, with a report.
- **By design, now visible:** a guard group that loses a fight is wiped (fight26 is to the death). 60% come back **wounded** (hospital), 40% die. Wounded with no free bed die at 1% per hour, and 12d did that **silently**. 12e posts a Reports line at most every 6 h saying how many died waiting for a bed. That drain may explain part of what you saw, so it's worth a balance decision (see below).

### 4. Pope profile repair still running
`v26e`/`v26f` repaired your character after the Nov 5 wipe. On every load, and every 8 to 10 s, they still:
- set any character whose name contains "pope" to Lv4 with 9 badges
- unlocked pipeline sites near owned land **without a drive**

That bypasses "pipelines only by driving" and breaks 12d's no-grants rule. A brand-new "Pope" started at Lv4. Turned off in 12e. **Nothing already granted is removed.**

### 5. Names with markup
Player names went raw into march flags, the activity feed and raid cards, so `<` or `&` broke layout for the whole crew. 12e strips `< > & " ' \`` from your own name and caps it at 24 characters.

### 6. Rules (Grok's preflight flag, confirmed)
- In 12d, the preview save **read** checked the owner but not the password provider, so an anonymous session could read its own old preview save. That contradicts REVIEW.md.
- `rules/preview-auth-rules-12e.rules` adds the password check to read. It also uses `pv-.*` everywhere, matching the wipe rule; 12d used `^pv-.+`, which skipped a bare `pv-` team. Diff: `rules/12d-to-12e.diff`.
- **This was not tested on the rules emulator.** Run the 12d emulator suite against it before publishing.

## Found, not changed (next passes)

| Area | Finding | Suggestion |
|---|---|---|
| Firestore cost (Spark: 50k reads/day) | 4 separate listeners on `activity` (limits 60, 60, 80, 150), so each app open reads ~350 docs, and each new activity doc costs 4 reads per open device. `players` is listened twice. `territory` and `explored` are whole-collection listens that grow with the map. | One shared activity listener fanned out in code; one players listener. Probably the biggest win before more testers join. |
| Load / battery | 87 `setInterval` timers, many at 1 to 3 s. Several redraw map layers every 2 s even when nothing changed. | One central tick with dirty flags; pause while the tab is hidden. |
| Architecture | 80 scripts load in order, each wrapping or replacing the last (`UI.render` is wrapped ~30 times). Several files *replace* an earlier function and silently drop earlier wrappers: v25b `squadReplay` drops troops2's, v26c drops sub-tab logic. Two private copies of the heal code ignored a global override. | Before the big updates: fold v23 to v26 into real modules (render, combat, troops, news). That makes "complete VIP build" achievable instead of patch-on-patch. |
| Robustness | A marker with a bad hex throws inside Leaflet and stops that draw pass. | Validate marker hex before drawing. |
| Leftover | `refreshRaid` checks a `raids` tab that no longer exists. | Cosmetic. |

## Balance decisions for you
1. Losing guards are wiped 100% (60% wounded / 40% dead). Do you want a retreat at, say, 20%, like v25's rout rule had?
2. Overflow wounded die 1%/hr. Keep it, or let them wait without dying?

## Deploy (TEST only, after review)
- Frontend first: `npx -y firebase-tools@latest hosting:channel:deploy test --project dead-zone-drive --no-authorized-domains --json` from the unpacked `public/`. This is Grok's corrected command; the README's `--only hosting` doesn't apply to channel deploys.
- Rules second, using Grok's gate: fresh fetch, diff, dry run.
- Same Auth setup as 12d: enable Email/Password and keep Anonymous. No SMS.
- **Rollback:** redeploy 12d or 12c. 12e adds no data fields; `P.news` items are only remapped or pruned.
- **Not done:** phone/computer session on the TEST host, rules emulator run.
