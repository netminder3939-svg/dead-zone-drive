# Game Plan: friends-and-family GPS wasteland game

**Title:** Dead Zone Drive

## The pitch
The world ended and mutants took over the Inland Northwest. You and your crew walk or drive around with the game open, fight mutants, scavenge scrap, and take back territory one hex at a time. When someone finds a boss, the whole crew can raid it from anywhere. PvE only, so it stays chill.

## Core loop
1. **Open the map.** Mutants spawn in the hexes around you, and more show up at night.
2. **Tap a mutant within 120 m.** It's an auto-battle, so your gear stats decide the fight.
3. **Collect loot:** resources, a mutant card, and sometimes gear.
4. **Visit landmarks** to earn badges. Some landmarks hide a **boss lair**.
5. **Find a boss.** It shows up on everyone's map and anyone can join the raid.
6. **Spend resources** on outposts and towers to grow team territory.
7. **Do daily quests** for bonus rewards.

## Systems
| System | How it works |
|---|---|
| Map | Clean dark map, ~170 m hexes, day/night tint by local time |
| Landmarks | Real places from OpenStreetMap: parks, schools, churches, water towers, malls, gas stations, lakes, town halls |
| Mutants | 6 regular types, picked by area: parks get hounds, water gets leeches, towns get crawlers and ghouls. Everyone sees the same spawns, which refresh every 10 min. |
| Combat | Auto-battle. Stats are ATK, DEF, HP and Crit %. No twitch skills needed. |
| Gear | Weapon, Armor and Trinket slots. 5 rarities: Common → Legendary. You can salvage spares for scrap. |
| Resources | 🔩 Scrap · 🥫 Food · 💧 Water · ⛽ Fuel · ⚙️ Parts |
| Territory | An **Outpost** claims your hex plus the ring around it. A **Watchtower** gives +10% loot to the team. Co-op only. |
| Raids | About 22% of landmarks hide a boss each day. The finder starts a 30-min raid. Anyone joins remotely, damage is pooled, and loot is split by damage with a guaranteed Rare+ item. |
| Quests | 3 random dailies: kills, landmarks, claims, raids, distance, scrap |
| Collecting | Mutant cards (with counts), landmark badges, and gear rarities |

## Art list for the artist
Files go in `assets/monsters/`. In `manifest.json`, set `"png": true` for that id. That's all the artist has to do.
- **Monsters and bosses:** PNG, **512×512**, transparent background, facing left or the front, with a little padding around the edges. The game adds the bob, glow, and hit-shake.
  - Regular: `rad_rat`, `scrap_crawler`, `bog_leech`, `feral_hound`, `glow_moth`, `ghoul`
  - Bosses: `boss_tank` (Rust Behemoth), `boss_queen` (Hive Queen), `boss_warden` (The Warden)
- **Later (v0.3+):** gear icons at 128×128 PNG, landmark icons at 96×96 (8 types), an app icon at 512×512, and a title logo.
- Style tip: bold outlines and readable silhouettes. They're shown small on the map (44–60 px).

## Stage 1 (built): character, Stronghold, alliance
- **Stats:** Attack, Defense, Health, Critical, Agility and Luck all count in auto-battle.
  - Agility gives a chance to dodge and a chance to land a 1.5× strike.
  - Critical is the chance of a 1.8× hit.
  - Luck means more and rarer gear.
- **Skill trees:** Combat (Power, Vitality, Guard, Precision), Scavenger (Keen Eye, Big Haul, Explorer, Lucky Find) and Survivor (Endurance, Evasive, Fortify, Builder). You get 1 point per level, each skill goes up to 5, and a reset costs 50 scrap.
- **Gear:** Weapon, Armor and Trinket slots, Common to Legendary. Salvaging gives Scrap, and Rare and better also gives Parts.
- **Inventory:** the 5 personal resources in one simple list, plus items and the collection.
- **Stronghold:** one fortress picture that gets bigger and stronger over 10 levels. Upgrades cost resources and run on real-time timers (2 min for level 2, up to about 7 h near the top) that keep going while the app is closed. Each level gives +2 Defense and +10 Health. There's no interior and no extra buildings.
- **Alliance:** Overview, Members (roster and contributions, never locations), Resources (open Alliance Bank with no limits and a full log) and Activity feed.
- **Main menu:** Map · Base · Player · Alliance · Inventory.

## Territory update (Stage 1b, built)
- **Claim by moving:** with the app open, every hex you walk or drive across becomes yours. (Changed in 1e: only the hex you are standing in is claimed; no fill-in.) Tiles stay yours until raiders take them.
- **Resource tiles:** each hex is fixed by its id, so everyone sees the same map. About 55% are empty. The rest hold one resource (Scrap, Food, Water, Fuel or Parts) at Common (gray), Rare (gold) or Epic (purple, about 4%).
- **Daily income at midnight Pacific:** each owned tile pays out. 25% automatically goes to the Alliance Bank, logged as "auto-share." The top bar shows your expected gain in green next to each resource. If you miss days, up to 7 are paid when you next open the app.
- **Stronghold on the map:** placed on a hex you own. It's expensive and takes a 6-hour build, and it defends 2 rings of hexes. If raiders destroy it, rebuilding costs 40% and takes 2 hours.
- **Towers:** cost resources plus daily upkeep, and defend 1 ring. The limit is 1 + Stronghold level. A tower goes offline if its upkeep can't be paid.
- **AI raiders:** about 3 attacks a week, worked out from timestamps when you open the app (only once you hold 10+ hexes). An undefended tile is lost. A defended tile triggers an auto-battle, and if the defense loses, the towers or Stronghold involved can be destroyed. Results go to Base → Reports and the alliance activity feed.
- **Enemy Raider Strongholds:** fixed spots on the map. They're hard auto-battles, and taking one gives its hex and the ring around it, plus loot and gear.
- **All the numbers** are in `js/balance.js`.

## Stage 1c (built): readable map, info cards, real fights, fog
- **Tap = info, never a fight.** Every map object opens a card first with its level, your odds (Easy, Fair, Even, Hard or Deadly, from 150 simulated fights against your current HP and gear), rewards, and buttons: Fight, Scout, Close, or Upgrade, Repair and Patch for your own buildings.
- **Real fights:** turn by turn with HP bars on both sides, damage numbers, crits and dodges. You can lose. A loss costs 10% of your carried Scrap (25 at most), drops you to 25% HP, and starts a 2-minute recovery.
- **Raider attacks:** a full-screen alert when you open the app, a battle replay (raiders vs your Stronghold and towers with HP bars), a result showing tiles held or lost and buildings destroyed, and a "View on map" button that flashes the tiles. Buildings now track damage (condition %).
- **Raids:** each member gets their own HP bar and damage total, and you can be knocked out.
- **Map:** a bright, free Esri street map with a dusty filter, a softer hex look, a game-style top bar and buttons, and subtle day and night.
- **Zoom detail:** zoomed out you see small icons. Zooming in adds level badges, then tower and fortress drawings with HP bars, names and defense ranges.
- **Fog of war:** unexplored hexes stay hazy and hide tiles, mutants, forts and landmarks. (Changed in 1e: only hexes you stand in are revealed.) Alliance members' explored hexes and territory are shared.

## ✅ Requirements checklist (everything Jacob asked for)
**Done** = works now in demo mode. **Partial** = some of it works, with the gap noted. **Not yet** = planned for a later stage.

| Feature | Status | Notes |
|---|---|---|
| Hex map (~170 m hexes) | Done | Hex grid over a bright street map |
| Real landmarks as lairs | Partial | Parks, schools, churches, water towers and malls come from OpenStreetMap. Practice landmarks are used when that free service is down. |
| Day / night | Done | Subtle tint. Slightly more mutants at night. |
| PvE bosses at landmarks | Done | About 22% of landmarks hide a boss each day |
| Remote raids anyone can join | Done | Shared boss HP, a timer, each member's HP bar, loot split by damage |
| Daily quests | Done | 3 a day, with a claim button |
| Gear and weapons (5 rarities) | Done | Weapon, Armor and Trinket slots. Salvage gives Scrap and Parts. |
| Monster cards / trophies | Done | Collection tab |
| Base resources | Done | Scrap, Food, Water, Fuel, Parts |
| Landmark badges | Done | Visit within 90 m |
| Monster art slots for the artist | Done | Drop PNGs into the monster art folder and flip `png:true` in `manifest.json` |
| Stats (ATK, DEF, HP, Crit, Agility, Luck) | Done | All of them affect fights |
| Skill trees (Combat, Scavenger, Survivor) | Done | 1 point per level, reset costs 50 Scrap |
| Stronghold (one exterior, levels, offline timers) | Done | The drawing grows with each level |
| Stronghold placed on the map | Done | Expensive, 6-hour build |
| Stronghold collects tile resources in its area | Done | Auto-claims and pays every resource tile in its ring. The ring grows with Stronghold level. |
| Buildings can fall, cheaper rebuild | Done | Rebuild costs 40%. Towers repair at 50%. |
| Stronghold relocation | Done | Costs resources, 7-day cooldown, keeps its level |
| Towers with upkeep and a defense ring | Done | Upgrades raise power and ring size (+1 ring every 2 levels) |
| Upkeep warning | Done | Status strip warns when tomorrow's upkeep can't be paid |
| Territory resource tiles (Common, Rare, Epic) | Done | The same for everyone, based on the hex id |
| GPS claiming (walk or drive) | Done | Claims only the single hex you are standing in, with a haptic buzz |
| Tiles stay yours until taken | Done | |
| Daily reset income at midnight Pacific, green +gain | Done | Countdown in the status strip. Missed days catch up (max 7). |
| 25% alliance auto-share | Done | Logged as auto-share |
| AI raids a few times a week | Done | Unprotected tiles are lost with only a notice. Protected tiles get a battle and replay. |
| Enemy AI strongholds | Done | Hard fights. Capturing one gives hexes and loot. |
| Info card before every fight | Done | Win odds, Scout, rewards |
| HP bars and fights you can lose | Done | Small penalty: some Scrap, low HP, 2-minute recovery |
| Raid alert, replay and map flash | Done | Plus an inbox |
| Level-of-detail zoom | Done | |
| Game look, readable in sunlight | Done | Esri street map with a wasteland filter |
| Fog of war, shared with the alliance | Done | Reveals only the hex you're in, plus the rings of your standing towers and Stronghold |
| Alliance bank (open, logged) | Done | |
| Alliance roster and activity feed | Done | |
| Leaderboards | Partial | All-time boards only. Weekly MVP needs cloud history. |
| Tactical markers | Done | 5 types, shared, expire after 3 days |
| Co-op territory | Partial | Everyone's tiles appear on the shared map. Joint alliance outposts come in Stage 2. |
| Alliance research and projects | Not yet | Stage 2 |
| Alliance operations tab | Not yet | Stage 2 |
| AI factions (Raiders, Authority, Scavengers) owning territory | Partial | Raider attacks and forts exist. Faction expansion comes in Stage 2. |
| Cloud saves / account recovery | Not yet | Stage 2. Progress is saved on each phone for now. |
| Live Firebase multiplayer | Partial | Code and rules are written, but untested until the Firebase project exists |
| Server-side anti-cheat and authoritative timers | Not yet | Stage 3 |
| Discord / push alerts | Not yet | Stage 3 |
| Home-screen app (PWA) | Done | Manifest, icon, offline fallback |

## Stage 1e tuning (Oct 30)
- **Fewer mutants:** the chance a nearby hex has a mutant went from 30% to 9% by day and from 42% to 13% at night. That's about a third as many: roughly 5–6 on screen instead of about 18 in the 61 hexes around you. Bosses and lairs are unchanged. Tune it with `BAL.spawn` in balance.js.
- **One hex at a time:** moving claims and reveals only the hex you're in. There's no fill-in between GPS readings and no neighbor reveals. Your standing towers and Stronghold still reveal their own rings (`BAL.fog.structuresReveal`).

## Stage 1f: Stronghold area income (Oct 30)
- A standing Stronghold automatically claims every hex in its ring, and their resource tiles pay at each daily reset. Tiles you already owned are only counted once. Hexes with an uncaptured enemy fort are skipped.
- **Ring size grows with level** (`BAL.stronghold.levelsPerRing = 3`):
  - Levels 1–3: 2 rings (19 hexes)
  - Levels 4–6: 3 rings (37 hexes)
  - Levels 7–9: 4 rings (61 hexes)
  - Level 10: 5 rings (91 hexes)
- The Stronghold card shows hexes in the ring, how many are resource tiles, and the daily gain per resource in green (after the 25% alliance share), plus the level where the next ring unlocks.
- The ring is also the Stronghold's defense area. Its hexes are visible through the existing structure-reveal rule (`BAL.fog.structuresReveal`); nothing else was revealed.
- You can switch it off with `BAL.stronghold.areaIncome = false`.

## Stage 1g: Fair math, no luck in fights, slower pacing (Oct 30)
- **Every fight is decided by math, not dice.** Same HP, stats and gear always give the same result.
  - Damage per hit = (Attack × (1 + Critical%) − 0.6 × enemy Defense), then the enemy's Agility shaves off up to 25%. Minimum 1.
  - Turn order: higher Agility goes first; ties go to the attacker. Each fighter hits the living enemy with the lowest HP.
  - Info cards show the exact predicted result (WIN/LOSS, number of turns, HP you end with, or enemy HP left), from the same function the Fight button runs.
- **Raider attacks are a power check.** Raid power = 40 + 10 × your level + 0.4 × your tiles (tiles count up to 600). If the total power of the defenders covering the hex (Stronghold + towers, scaled by condition) is at least the raid power, the hex is held. If defense is under 60% of raid power, the defenders are destroyed; otherwise they are left at 20% condition. The replay shows the two powers fighting and always matches the result.
- Which tiles get attacked and when, loot and spawns are still random (seeded).
- **Balance changes:**
  - Tile income halved: 2 / 5 / 12 per day (common / rare / epic). Claiming gives 1 XP. Max 40 new hexes claimed per day (more are still revealed).
  - Level-up needs 100 × level^1.5 XP (Lv2 283, Lv5 1,118, Lv10 3,162).
  - Stronghold upgrades cost about 4× more (scrap 160 × L^1.7, food/water 60 × L^1.4, fuel 20 × L^1.3 from Lv3, parts 4 × L^1.6 from Lv2).
  - Mutants: level = type level + your level; stats grow 20% per level.
  - Enemy forts: HP 140 + 75/level, attack 12 + 5/level, defense 6 + 3/level; fort level = base 1–4 + your level ÷ 4. Lowest fort is first beatable around player level 5; top forts around level 14–15.
  - Stronghold base power 50 (+30 per level, + your stats). Tower power 70 (+50% per level).
  - Bosses have 3× HP (Behemoth 7,200, Queen 6,000, Warden 9,000).
  - Tower upkeep 3 food, 3 water, 1 fuel per day. Skill reset costs 50 scrap × level.
  - **Relocation fix:** hexes that only came from the Stronghold ring are now marked; when the Stronghold moves, the old ring's hexes you never drove over are released. Driving over a ring hex makes it permanently yours. Relocation costs 250 scrap, 60 fuel, 60 parts. (Ring hexes claimed before this update aren't marked, so they stay.)
- Balance simulator (not shipped): `sim/sim.js`, results in `sim/report.txt`.

## Stage 2: AI factions, outposts, research, operations, cloud saves (Oct 30)
- [x] **Raider factions** (Rust Dogs, Ash Choir, Iron Vultures): home bases about 1.5–2.2 km from your land; they appear once you hold 10 hexes.
  - Every 4 hours (worked out when you open the app, up to 7 days back, seeded so it's the same every time) each faction may grab a neutral hex next to its land, leaning toward you (~2 hexes/day each, max 30 hexes + 10 per tier).
  - Where their land touches yours they test one edge hex: their attack power vs your defense there (Stronghold, towers, outposts covering it). Higher attack takes it; otherwise you hold. At most 2 of your hexes per day across all factions.
  - Strength = (30 + 7 × your level + 6 × extra alliance members + 1 per day active, max 30) × 1.15 per tier.
  - Their hexes can't be claimed by driving. Tap one (within 300 m) to see the exact predicted fight, then attack to retake it. Interior hexes are tougher (+10% per faction neighbor, up to 3).
  - **HQ siege:** a home base fight is tough, but damage sticks between attacks (heals 25%/day). Beat it to rout the faction: all its hexes go free and it comes back in 5 days, farther out and one tier stronger.
  - Only hexes revealed from the fog are shown. "While you were away" banner + Inbox report summarize what happened.
  - Base ▸ ☠️ Factions tab shows each faction's size, attack power and whether its HQ has been spotted.
- [x] **Outposts:** build from 🏗️ on any hex you stand in that isn't a faction hex. 1-hour capture hold (fails if the hex is lost during it), then it claims + guards its 7-hex ring (power 60 + 8 per Stronghold level). Limit 2 + 1 per 2 Stronghold levels. Base ▸ ⛺ Outposts tab.
- [x] **Alliance Research** (Alliance ▸ 🔬): spends the bank (cost × (level+1)^1.6, max Lv5): Supply Lines +5% tile income, Fortified Walls +8% structure power, Field Medics +4% max HP, Radio Jammers −6% faction attack, Salvage Crews +8% fight resources. Shared by everyone. The bank has no limits.
- [x] **Operations** (Alliance ▸ 🎖️): 3 crew missions per week (Mon–Sun Pacific), goals scale with member count; each member claims the reward once (+150 XP).
- [x] **Cloud saves** (Player ▸ ☁️): with live Firebase, the profile saves to `teams/{team}/saves/{uid}` every 2 min and when you leave the app. Loads a newer cloud save on open (old phone copy kept as backup, "Undo" button). Never overwrites a newer cloud save. Damaged saves are ignored. A restore code moves a save to a new phone. Demo mode keeps using localStorage. No GPS is stored.
- [x] AI raider attack chance lowered to 10% per 8 h window (factions add the pressure now).
- [x] Fixed: live-Firebase boss raid hits crashed (a variable name clash in `hitRaid`).
- [ ] Deploy `firestore.rules` again in the Firebase console (new `saves` rule, research bank log entries, bank-less alliance doc updates).

## Stage 2b: The horde claims land like players (Oct 30)
- [x] **No more random raids.** The old "raiders hit 1–3 random tiles anywhere" system is switched off (`BAL.ai` unused). The ⚔️ AI attack demo now sends the nearest gang squad walking toward your land, hex by hex, and shows the result.
- [x] **Squads:** each gang fields 1 squad (+1 per tier, max 3). A squad leaves its HQ or a gang outpost, moves 1 hex every 20 min, claims each hex it enters, and rests 9–13 h after 6 hexes (~2 outings a day). Every hex they take is next to their own land (tested: 59 gang hexes after a 3-day catch-up, all connected). Same seed, same history.
- [x] **Targets:** squads score nearby hexes: rich tiles, your undefended edges, gaps between your tower rings, hexes they can beat, contested ground, minus distance. Strong defenses are avoided. The next target is picked when they start resting, so a ⚠️ target marker shows hours ahead when that hex is revealed. Tap a squad or target: power, target reason, and whether your defense there will hold.
- [x] **Gang outposts** (🏚️) are built where a squad stops 5+ hexes from its bases (1 + tier per gang). Squads launch from them. Their garrison is 1.5× tougher; retaking the hex removes the outpost.
- [x] **Defense always runs first.** Inside your Stronghold area, a tower ring or an outpost ring, the squad must beat the combined full defense power (deterministic, defense wins ties), with replay + alert. A beaten squad is wounded (−40% power for 24 h) and retreats for 14 h. Squads that win take the hex; defenders drop to 30% condition, and are only destroyed if the squad has 2× their power. Uncovered hexes fall without a fight (max 2 of your hexes a day across all gangs).
- [x] **Defense bug fixed:** defense power used to be scaled by condition, and every *won* defense permanently cut condition. After 2–3 attacks the Stronghold dropped under raid power, lost, got destroyed, and from then on every hex was "lost with no defense". Condition is now visual only. Test: 6 attacks in a row on a Stronghold-area hex, all held, Stronghold still standing.
- [x] **Alliance view:** route threads (each member's claimed hexes joined in claim order as a dotted colored thread, no GPS), Alliance ▸ 📋 Roster (km, tiles held, resources earned, donations, last active), and a 🗂️ map layer button (Mine / Allies / Enemy).

## Stage 2c: Transaction log (Oct 30)
- [x] **Inventory ▸ 📒 Log:** every resource change gets its own line with a category: fights, builds, donations, losses, rewards. All automatic income (daily payout after tower upkeep and the 25% alliance share) is grouped into **one line per day**, e.g. "Daily income · +42 Scrap, +18 Food, +20 Water". Filter chips: All / Income / Combat. Keeps the last 150 entries.
- [x] **Alliance ▸ Resources log:** the bank's automatic 25% shares are grouped into one "Daily share" line per member per day.
- [ ] **Supply lines: in design (not built).** Idea under discussion: lay lines hex by hex from the Stronghold to outposts / remote areas, income only flows while the line is unbroken, the horde targets lines, towers protect them, upgrades raise throughput.

## Stage 2d: Live Firebase on by default (Oct 30)
- [x] `firebase-config.js` now has the real project (dead-zone-drive), so the site runs LIVE by default. `?local` in the address still opens the offline demo.
- [x] Alliance = team code. Invite links: `...?team=CODE` fills the code in for a new player. Alliance ▸ Overview has a 📨 Invite button (share sheet or copy).
- [x] Tested live from two separate browsers: sign-in, same alliance, shared territory, feed, bank, research, operations, cloud save + restore code, horde, boss raid, markers. No permission errors. Published rules match `firestore.rules`.

### How to play with your buddy
1. Open the game: https://netminder3939-svg.github.io/dead-zone-drive/
2. Type your name. In "Team code" type a name for your alliance (e.g. `smith-crew`) and tap Enter the Wastes. That code IS your alliance.
3. Go to Alliance ▸ Overview and tap 📨 Invite. Send the link to your buddy (text, email, anything).
4. Your buddy opens the link, types their name (the team code is already filled in) and taps Enter the Wastes.
5. Done: you now share the map, bank, feed, research and missions. (No link? They can just type the same team code.)

## Stages
- **Stage 1: Character, Stronghold and alliance (done, v0.2).** Everything above runs free on Firebase Spark, and there's also a local demo mode.
- **Stage 2: Outposts, territory and AI factions (done, see above).**
  - Real outposts with capacity set by Stronghold level, upgrade timers, and defense.
  - Hex states: unclaimed, alliance, AI, contested.
  - Tactical map markers.
  - AI factions (Raiders, Authority, Scavengers) that hold real hexes and outposts. Since there's still no server, the AI world is "caught up" whenever someone opens the app: it rolls forward the expansions and attacks since the last visit using fixed random seeds, so everyone sees the same result.
  - Alliance Operations and Research tabs, plus cloud saves for profiles.
- **Stage 3: Always-on world and fair play.**
  - A small always-on server (Cloud Functions or similar, which may need the paid Blaze plan, though usually pennies at this size) runs the AI factions, timers, and battle math, so results can't be faked.
  - Anti-cheat: GPS speed and jump checks, and checks on actions for impossible values.
  - Optional push alerts and Discord raid alerts.

## Old roadmap (v0.1 notes)
- **v0.1 (this build):** map, hexes, GPS, mutants, auto-battle, gear/equip, resources, badges, outposts/towers, boss discovery, remote raids, daily quests, local demo mode, Firebase-ready.
- **v0.2:** Firebase live for the crew, save profiles in the cloud (so a new phone keeps progress), crew list, raid alerts in Discord.
- **v0.3:** real art in, gear crafting from parts, base upgrades (more ring size, storage), more mutants per area.
- **v0.4:** weekly world boss, team achievements, seasonal events (Halloween mutants), leaderboards inside the crew.
- **v1.0:** polish, sounds, tutorial, optional push alerts, and balance from a month of real play.

## Stage 2e: Auto-fight, damage meter, Crystal Knight test boss
- **Auto-fight everywhere** (monsters, forts, raider garrisons, defense replays, boss raids). Fight screen opens paused: ▶️ Auto fight plays it round by round, ⏭️ Skip to result jumps to the end. No more repeated Attack taps.
- **Fully deterministic.** No dodge/crit rolls; leftover DODGE/CRIT labels removed. Turn order = agility, target = lowest-HP foe, damage = `hitDamage()`.
- **HP bars** for every member on both sides.
- **Damage meter** (live + on result): per member damage dealt, damage per round, damage taken, healing, DPS share %, sorted. Raids also show a team meter (total dmg, share %, fights, taken) saved on the raid doc.
- **Boss raids:** one tap = one full automatic fight (you vs boss until someone drops or 40-round cap). The raid screen predicts exactly how much damage your next fight deals.
- **Skill trees / class paths hook:** `UNIT_MODS` (global list) and `unit.mods` (per member) in fight.js. Each is `fn(unit) -> {atk,def,hp,agi,crit,heal}` flat bonuses, applied in `mkUnit()` before every fight and prediction. A `heal` stat already works: a healer heals the lowest ally under 60% HP instead of attacking. Future paths (Tank / Striker / Medic) only need to push modifiers.
- **Crystal Knight** (`boss_crystal`): full transparent art on the raid screen, round emblem on the map. `?testboss` spawns it one hex east of you (tap = info card first, then Join raid).
