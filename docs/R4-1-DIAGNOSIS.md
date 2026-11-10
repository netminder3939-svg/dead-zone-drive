# R4 (24f9001) map flicker: diagnosis (read-only, Nov 9 2026, PST)

No deploy, no hosting/rules/DB change, no push, no login. Repo checkout: /workspace/r4-test-release-20261109/repo (detached 24f9001, clean).
Of the 6 files R4 changed, only **public/map4.js** touches map markers. space4.js only adds placement checks, the
overlap card and the green pick outline (drawn only while picking). The bal14/base15/index/sw changes are labels and
load order. eaf9450 (R3) had no map4, so every marker drew stacked, and sh26's zIndexOffset 620 kept the Stronghold
art above the ally flag (300) and the ally label (610).

## Root cause 1: other players' Strongholds disappear and come back (confidence: high, reproduced)
A teammate's Stronghold hex carries 3 markers from 3 layers:
- `G.layers.sh26`: the big Stronghold art (v26c.js:87-95), redrawn on every drawWorld through HOOK.draw (hooks.js:13).
- `G.layers.allyDefs`: a small 🏰 label (nits.js:3-7, zoom ≥14), redrawn on every drawWorld. nits.js:8 also forces drawWorld every 4 s when any member's defs change.
- `G.layers.allyFlags`: a flag "🏰 Name" (march.js:329-331), cleared and redrawn on its **own 5 s timer**, outside drawWorld.

map4.js keeps only the top marker per hex:
- map4.js:14: `building:4, alliance:4` is a **tie** between sh26 and the two ally layers.
- map4.js:35: `arr.sort((a,b)=>PRI4[a.c]-PRI4[b.c])` has no tie-break, so the order falls back to `map.eachLayer`. That order is Leaflet's `_layers` (keyed by stamp id, ascending), which means the **oldest marker wins**.
- map4.js:36 hides the rest with `data-h4="1"` (`display:none!important`, map4.js:68).

The result is a winner that keeps changing:
- After drawWorld, the flag is oldest, so it shows and the Stronghold art is hidden.
- After the 5 s flag redraw, the allyDefs label is oldest, so the label shows and the art is still hidden.
- At zoom 12-13 (no allyDefs), the art and the flag swap every few seconds.
- On top of that, freshly drawn flags paint un-tidied for up to 0.9 s, because drawAllyFlags doesn't trigger tidy4 and HOOK.draw only does `setTimeout(tidy4,0)` (map4.js:65). Each redraw flashes.

Also on the list: `march:3` beats `building:4`. A march or truck crossing an ally Stronghold hex hides that Stronghold while it's there.

Repro (repro/, headless Chrome, synthetic markers, real leaflet.js + map4.js, no backend): `node run.js map4.js`. The visible
marker on Grace's hex alternates `flag-Grace` / `allydef-Grace`. `sh26-Grace` never shows at z15 (orig.out).

## Root cause 2: the "little van" (pipeline 🚚, van26) and moving markers glitch (confidence: high for the 🚚; medium that this is the icon Jacob means)
- van26.js:84/93-121 clears and recreates the truck marker **every 1 s** at a new position. map4 groups it by hex (category march).
- The badge signature includes the top marker's lat/lng to 6 decimals (map4.js:37), so the "count" badge is **destroyed and rebuilt every tick** (6 rebuilds in 5 ticks in the repro).
- Each new truck element paints before tidy4 hides or unhides it. Hex membership changes as it crosses hexes, so it and the pipe and resource marker under it blink in and out.
- March flags (`G._flags`, setLatLng moves) get the same treatment.

## Root cause 3: zoomed-out (zoom 12) merging changes when you pan (confidence: high, reproduced)
map4.js:32 keys 56 px cells on `map.latLngToContainerPoint`, which is relative to the screen. Every pan shifts the cell
borders, so nearby Strongholds merge and split, and one hides behind a count as you drag. In the repro, panning by
10 px steps flips between "Grace+Bob separate" and "merged, Bob hidden".

## Also found: your own position dot is hidden (confidence: high, reproduced)
`meMarker` (game.js:33/48) is added straight to the map, not to `G.layers`, so map4.js:26 marks it `'other'` (PRI 8, the
lowest). Whenever you stand on a hex with any other marker (your own Stronghold, a resource, a flag), your dot is hidden
(repro: `own dot visible: none`). While driving, it blinks as you enter and leave hexes. If the "van" Jacob means is his
own position marker, this is the cause.

## Minor
- tidy4 runs every 0.9 s, plus on every draw and moveend. Each run walks every layer and calls hexAt per marker. That's acceptable but adds churn on phones.
- space4's drawPick4 (700 ms) is a no-op unless a pick is active. Not a cause.

## Proposed fix (proposed.patch, public/map4.js only; `git apply --check` passes on 24f9001; not committed)
1. Fixed order: `alliance:4.5`, and a tie-break on the layer name instead of marker age.
2. On a hex that has an sh26 Stronghold, hide the allyFlags/allyDefs markers as duplicates, uncounted. The Stronghold art always shows.
3. Moving layers (march, mv23, ret25, van26) still obey the filter chips but never take part in grouping. They don't hide, and nothing hides them.
4. Markers outside `G.layers` (your dot) are left alone, and stale data-h4/top4 is cleared.
5. Zoomed-out cells use `map.project(ll,z)` (world pixels, stable under pan).
6. Badge signature without lat/lng. If only the position changed, `setLatLng` instead of a rebuild.
7. tidy4 runs synchronously in HOOK.draw, and drawAllyFlags is wrapped to tidy right after its 5 s redraw, so nothing paints un-tidied.

With the patch, the repro shows sh26-Grace visible in every phase, a stable zoom-12 merge while panning, the own dot visible, and 0 badge rebuilds (fixed.out).
Ship as R4.1: bump the sw.js cache and the bal14 label, then add the map4.js hash. TEST only.

## Uncertain
- Synthetic repro, not the live game or real data. The 3-layer stacking and the draw order are from the code (index.html script order: nits.js before hooks.js; HOOK.draw runs after the nits allyDefs draw).
- "Little van": the pipeline 🚚 is the only van icon on the map. The player dot is a blue circle. Both are covered.
- Design choice for Claude/Jacob: should a passing march ever hide a Stronghold? The patch says no (moving things are excluded from grouping).
- The screenshot file wasn't on the box (path missing), so I couldn't check it.
