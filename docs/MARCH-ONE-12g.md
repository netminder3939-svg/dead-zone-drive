# One march control (12g-home, not deployed)

Built on `b2a9327`. Not deployed. No Firebase, Auth, rules, or account writes. The return-home GPS fix is unchanged.

## What

Opening a hostile hex built the march controls twice. The faction card adds a March button and a troop picker, then the hex card added them again. That is why the phone showed two troop rows and two orange March buttons with different times.

`addMarchBtn` now leaves the card alone when that button is already there. The picker is one slider plus a number field, from 0 up to the smaller of troops at home and the march cap. The preview under it (power, load, time, wounded, dead, verdict) is the same fight math as before, for the selected count. One March button uses that count. Intercept stays its own button on a squad. Guard stays its own row. A missing GPS position shows a disabled March or Intercept that says "Waiting for GPS" and does not throw.

The hero-only "Predicted" block is not shown on a card that already has the troop preview, so the old solo win/loss line is not a second outcome. The disabled "Solo attack: no" note can still sit under More. It is not a second way to send troops.

## Pros

One count, one preview, one send. The slider works with touch, mouse, and keyboard, and the number can be typed. Caps, slots, range, ownership, rewards, and the lease are the same functions as before.

## Cons

The old None / Min to win / Half / Max buttons are gone. Those counts are still reachable on the slider. A fight you cannot win starts at 0 and says so.

## Risk

A second call that used to add a different march on the same card no longer does. Intercept and guard are separate controls, so they still appear. Sending 0 from the slider stays 0 instead of jumping to the old default of 1,000.

## Balance and cost

No change to fight math, loot, claims, or troop caps. The edit is the march button, the troop picker, the card layout that keeps that picker on the card, and a little CSS.

## Simpler alternative

Only stop the second build and keep the four buttons. That removes the duplicate but not the "2 of everything" feeling Jacob asked to replace with a scroll.
