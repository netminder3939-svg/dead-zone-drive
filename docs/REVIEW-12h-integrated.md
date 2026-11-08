# 12h-integrated

Frontend only. Cache `ddd-v26-12h-integrated`. Header label `12h-integrated`.

This branch starts at the deployed slider commit `0801df5` (which already contains the return-home commit `b2a9327`) and adds Claude's 12h balance from `11153a2` without changing that commit. It is not the original 12h tree and it does not reuse `ddd-v26-12h`.

## What

- Claude's balance: tower and outpost HP and fire, class defense, horde scale from team-average army, Barracks tier on ATK and HP, `g26.t` and `p14` on the member doc, skip a raid with no lat/lng.
- One troop slider and one March button, including the no-GPS disabled control.
- Crew-home flag still needs two accurate fixes inside 40 km. A still phone can supply those fixes even when the 6 m filter does not call `setPos`. A stale profile cannot turn the flag back on after this session already has a fresh accurate home fix. The follower does not write a save revision to do that.
- Tapping an enemy-fort hex opens the Raider Stronghold card. A march still cannot capture it. Other hexes in a zone that contains a fort stay claimable.

## Pros

The TEST build can take the balance pass without dropping the slider or the return-home exit. The blue banner can clear while the phone is parked at home, including after adopt, reload, and foreground. The fort card matches the march gate.

## Cons

Two accurate samples are still required, so one bad point does not flap the mode. Until the second sample, a saved flag can stay up. The owner still uploads the cleared flag later through the normal lease, not from this check. `s8-tier.js` calls `fight26` without `gear.tp`, so its loss count does not change between Barracks 1 and 9; `s6-balance.js` is the check that passes tier power into the fight.

## Break risk

Low for claims, pay, and the lease. The still-GPS check does not call `setPos` for jitter, and the return still uses the jump handoff when the real fix is away from the crew-map dot. Fort capture is unchanged: in person, inside the attack range. A zone's fort count is only a label.

## Balance and cost

Same numbers as 12h on the local page: empty tower breaks at 396, engineer 3352 down to strategist 2414, tier 1 / 1.4 / 3.2 breakpoints 2889 / 3874 / 8304, Barracks 1 vs 9 breakpoints 2928 vs 8424, horde scale 1 / 3 / 9.6. No rules change, no migration, no paid service. `g26.t` is the decimal tier power (1, 1.4, 1.9, 2.5, 3.2). `p14` is an integer.

## Simpler alternative

Ship 12h by itself. That drops the slider, the no-GPS guard, and the return-home exit, which is the regression already measured on `11153a2`.
