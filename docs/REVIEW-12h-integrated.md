# 12h-integrated

Frontend only. Cache `ddd-v26-12h-integrated-2`. Header label `12h-integrated-2`. This replaces the unreleased `fdb919d` candidate (`ddd-v26-12h-integrated`). Do not publish that older export.

This branch starts at the deployed slider commit `0801df5` (which already contains the return-home commit `b2a9327`) and adds Claude's 12h balance from `11153a2` without changing that commit. It is not the original 12h tree and it does not reuse `ddd-v26-12h`.

## What

- Claude's balance: tower and outpost HP and fire, class defense, horde scale from team-average army, Barracks tier on ATK and HP, `g26.t` and `p14` on the member doc, skip a raid with no lat/lng.
- One troop slider and one March button, including the no-GPS disabled control.
- Crew-home flag still needs two accurate fixes inside 40 km. A still phone can supply those fixes even when the 6 m filter does not call `setPos`. A stale profile cannot turn the flag back on after this session already has a fresh accurate home fix. The follower does not write a save revision to do that.
- A march that can reach an enemy fort fights that fort's real defenders. Loss does not capture the fort. A win applies the existing capture once. Driving onto the fort does not take it. Other hexes in a zone that contains a fort stay claimable.
- A real GPS crossing claims an ordinary unreinforced hex, including an enemy-owned one. Yours and alliance hexes stay put. Active reinforcement means troops already there or a horde squad standing on the hex. Forts and buildings are not treated as empty just because no troops are stationed. See GAME-PLAN.md, "Driving claims".

## Pros

The TEST build can take the balance pass without dropping the slider or the return-home exit. The blue banner can clear while the phone is parked at home, including after adopt, reload, and foreground. The fort card matches the march gate.

## Cons

Two accurate samples are still required, so one bad point does not flap the mode. Until the second sample, a saved flag can stay up. The owner still uploads the cleared flag later through the normal lease, not from this check. `s8-tier.js` calls `fight26` without `gear.tp`, so its loss count does not change between Barracks 1 and 9; `s6-balance.js` is the check that passes tier power into the fight.

## Break risk

Low for the lease. Driving can now take an unreinforced horde or raider hex, so those tiles are easier to retake than before. Forts still require a won fight. The still-GPS check does not call `setPos` for jitter. A cached GPS sample older than 10 seconds, or an older sample than the last one accepted, does not clear the crew-home flag.

## Balance and cost

Same fight numbers as 12h on the local fixture: empty tower breaks at 396, engineer 3352 down to strategist 2414, tier 1 / 1.4 / 3.2 breakpoints 2889 / 3874 / 8304, Barracks 1 vs 9 breakpoints 2928 vs 8424. Those numbers were measured in the browser on this machine, not written to a cloud account. `g26.t` is the decimal tier power (1, 1.4, 1.9, 2.5, 3.2). A missing `g26.t` counts as 1, and values outside 1–3.2 are clamped. `p14` is an integer. The horde scale averages your live army plus every other member record with `p14` above 0. It does not drop offline or stale records, and a new member with no `p14` does not dilute the average. That can keep the scale high after someone stops playing. No redesign is included.

March troop HP at tier 1.4 is 1.4 times tier 1 (1,000 troops → 350 HP), once. `fight26` row HP scales the same way with `gear.tp`. The march path does not also multiply by `gear.tp`, so the tier is not applied twice. `s8-tier.js` still calls `fight26` without `gear.tp`, so it is not the proof.

## Simpler alternative

Ship 12h by itself. That drops the slider, the no-GPS guard, and the return-home exit, which is the regression already measured on `11153a2`.
