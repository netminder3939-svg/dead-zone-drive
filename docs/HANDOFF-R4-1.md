# Dead Zone Drive: R4.1 handoff (Nov 9, 2026)

**For Claude and Pope.** R4.1 = R4 (`build-r4` 24f9001) + a fix to the R4 map tidy (`map4.js`). Branch `build-r4-1`.
Cache `ddd-v26-12i-integrated-6-r4-1`, HUD label `12i-integrated-6-r4-1`. **Frontend only. No rules change.** TEST only;
LIVE stays on 9745fd7. Approved by Jacob ("Fix it", Nov 9 5:24 PM PST).

Changed files: `map4.js`, `bal14.js` (label), `sw.js` (cache). Diff: `docs/R4-to-R4-1-frontend.diff`. Hashes:
`docs/R4-1-SHA256SUMS.txt`. Full diagnosis: `docs/R4-1-DIAGNOSIS.md`.

## What was wrong on R4 (all in map4.js)
1. **Teammates' Strongholds vanished and came back.** A teammate's Stronghold hex has 3 markers: the Stronghold art
   (`sh26`), a small 🏰 label (`allyDefs`, nits.js) and a flag (`allyFlags`, march.js, its own 5 s timer). Buildings
   and alliance markers had the same priority and no tie-break, so the **oldest marker** won the hex. Each redraw
   changed which was oldest, so the art was hidden most of the time and the winner flipped every few seconds. New flags
   also painted for up to 0.9 s before the tidy ran.
2. **The pipeline truck 🚚 and marches blinked.** They're redrawn or moved every second. map4 grouped them by hex and
   rebuilt the count badge every tick, because its signature included the exact position.
3. **Zoom 12 merging changed while panning.** Cells were keyed on the screen position, not the map position.
4. **Your own position dot was hidden** on any hex with another marker. It isn't in `G.layers`, so it ranked last.

## What R4.1 does
- Fixed order: Buildings over Alliance, with a tie-break on the layer name instead of marker age.
- On a hex showing a teammate's Stronghold, their flag and 🏰 label are duplicates. They're tucked away and not counted.
- **Marches, returns and the pipeline truck are never grouped** (accepted design: marches never hide Strongholds).
  They still obey the 🚩 Marches filter.
- Markers outside the map layers (your own dot) are left alone.
- Zoomed-out cells use map pixels, so they're stable while panning.
- A badge that only moved slides instead of being rebuilt.
- The tidy runs in the same tick as every redraw and right after the flag timer.

## Tests (local, ?local offline, backend blocked)
- New `tests/r4-1-flicker.js` (5 checks): ALL PASS on R4.1; the same test on R4 fails 4 (Stronghold 0/16 visible, flag
  shown, own dot hidden, 5 badge rebuilds).
- `tests/r4-map.js` updated for the march rule (badge 3, march visible): ALL PASS.
- `home-still.js` (now takes the URL as an argument, label r4-1), `march-panel`, `r3-ui`, `r3-tiers`, `qa-gates`, `phone-front`: ALL PASS.
- Synthetic Leaflet repro (outside the repo): Stronghold visible in every phase, no badge rebuilds.

## Rollback
TEST back to R4: `npx -y firebase-tools@latest hosting:clone dead-zone-drive:1d7cf387cbf2c877 dead-zone-drive:test --project dead-zone-drive`
