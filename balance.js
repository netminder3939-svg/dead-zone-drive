// ============================================================================
//  BALANCE: every tweakable number for territory, income, defenses and AI.
//  This is a slow, long-play game. Change numbers here; nothing else needs editing.
// ============================================================================
const BAL={
  // ---- Resource tiles (generated from the hex id, so everyone sees the same map)
  tiles:{
    emptyChance:0.55,                                        // 55% of hexes hold nothing
    resWeights:{scrap:30,food:22,water:22,fuel:14,parts:12}, // which resource a non-empty tile holds
    tierChance:{common:0.78,rare:0.18,epic:0.04},            // Epic is rarest
    dailyYield:{common:2,rare:5,epic:12},          // base amount paid per tile at each daily reset
    resMult:{scrap:1,food:1,water:1,fuel:0.7,parts:0.5},     // rarer resources pay less
    tierColor:{common:'#9aa4a8',rare:'#ffb43c',epic:'#d070ff'},
    claimXP:1,                                               // XP per newly claimed hex
    dailyClaimCap:40,                                        // max new hexes claimed per day (more are still revealed)
  },
  // ---- Daily reset (midnight Pacific)
  reset:{timeZone:'America/Los_Angeles',allianceShare:0.25,maxMissedDays:7},
  // ---- Stronghold placed on the map (must be on a hex you own)
  stronghold:{
    cost:{scrap:500,food:200,water:200,fuel:80,parts:40},
    rebuildMult:0.4,              // rebuilding a fallen stronghold costs 40% of first build
    buildHours:6, rebuildHours:2, // real-time build timers (keep running offline)
    radius:2,                     // defends hexes within 2 rings (~19 hexes)
    basePower:50, powerPerLevel:30,
  },
  // ---- Towers
  tower:{
    cost:{scrap:150,fuel:20,parts:12},
    upkeep:{food:3,water:3,fuel:1},   // paid daily at reset; unpaid towers go offline that day
    radius:1,                          // defends its hex + the 6 around it
    power:70,
    maxBase:1, maxPerStrongholdLevel:1,// max towers = 1 + stronghold level (0 without a stronghold)
    buildHours:1,
  },
  // ---- AI raider attacks (simulated from timestamps when the app opens)
  ai:{
    windowHours:8,            // the week is split into 8h windows...
    attackChance:0.10,        // ...each with a 10% chance => about 2 attacks a week (factions add pressure in Stage 2)
    minTiles:10,              // grace: no attacks until you own this many tiles
    targetsMin:1, targetsMax:3,
    basePower:40, powerPerLevel:10, powerPerTile:0.4, maxTilesCounted:600, // raid power = base + level*10 + min(tiles,600)*0.4 (no randomness)
    destroyBelow:0.6,         // when defense loses: structures are destroyed only if defense < 60% of raid power, else badly damaged
        maxCatchUpDays:14,
    winLoot:{scrap:15,parts:2},
  },
  // ---- Enemy AI strongholds (fixed spots on the map, hard fights)
  enemy:{
    chancePerHex:0.006,       // about 1 per ~170 hexes
    scanRings:9,
    hpBase:140, hpPerLevel:75, atkBase:12, atkPerLevel:5, defBase:6, defPerLevel:3,
    attackRangeM:300,
    claimRings:1,             // capturing gives the hex + 6 around it
    loot:{scrap:120,food:40,water:40,fuel:25,parts:15}, lootPerLevel:0.35,
  },
};
// Fog: moving reveals ONLY the hex you're in (0 = no neighbors). Standing towers/stronghold reveal their ring.
BAL.fog={pathRings:0,aroundPlayer:0,structuresReveal:true,opacity:0.62};
// Mutant spawns: chance a visible hex near you holds a mutant (was 0.30 day / 0.42 night).
BAL.spawn={dayChance:0.09,nightChance:0.13,rings:4};
// ---- Fights, penalties, structures (Stage 1c)
BAL.fight={maxRounds:40,lossCooldownMin:2,lossScrapPct:0.10,lossScrapMax:25,lossHpPct:0.25,scoutSims:150};
BAL.enemy.guards=2; BAL.enemy.guardMult=0.3;
BAL.tower.maxLevel=5; BAL.tower.powerPerLevel=0.5; BAL.tower.repairMult=0.5;
BAL.ai.hpPerPower=3; BAL.ai.atkPerPower=0.3; BAL.ai.unitPower=50;
// ---- Stage 1d
BAL.tower.levelsPerRing=2;          // tower ring grows +1 every 2 levels (Lv1-2: 1 ring, Lv3-4: 2, Lv5: 3)
BAL.stronghold.relocateCost={scrap:250,fuel:60,parts:60}; BAL.stronghold.relocateCooldownDays=7;
BAL.markers={types:{target:['🎯','Target Zone'],outpost:['⛺','Outpost Site'],enemy:['⚠️','Contested / Enemy Zone'],hub:['📦','Resource Gathering Hub'],waypoint:['📍','Waypoint']},expireDays:3};
// ---- Stage 1f: Stronghold area income. Ring = radius + 1 per N stronghold levels.
BAL.stronghold.levelsPerRing=3;   // Lv1-3: 2 rings (19 hexes), Lv4-6: 3 (37), Lv7-9: 4 (61), Lv10: 5 (91)
BAL.stronghold.areaIncome=true;   // standing Stronghold auto-claims + collects every resource tile in its ring

// ---- Stage 1g: deterministic combat + slower progression
// Damage per hit = max(1, round( (atk*(1+crit/100) - def*0.6) * (1 - min(25,foe.agi)/100) ))
// Turn order: higher agility acts first; ties go to the attacker. Each unit hits the living foe with the lowest HP.
BAL.combat={defFactor:0.6,critAsDamage:true,agiReduceCap:25};
BAL.progress={xpBase:100,xpExp:1.5,mutantLevelPerPlayerLevel:1.0,mutantScalePerLevel:0.2,fortLevelDiv:4,respecPerLevel:50};

// ---- Stage 2: AI factions, outposts, alliance research + operations, cloud saves
// Factions: raider gangs with home bases a couple of km from your territory. Every few hours (simulated on app open)
// each may claim a neutral hex next to its land, preferring hexes toward you. Where their land touches yours they may
// try to take one of your edge hexes: their attack power vs your defense power there (Stronghold/towers/outposts covering it).
// Their hexes can't be claimed by driving: fight the garrison (deterministic) to retake. Beat the home base to rout them.
BAL.factions={
  list:[{id:'dogs',name:'Rust Dogs',color:'#d6542a',icon:'🐕'},{id:'choir',name:'Ash Choir',color:'#9b6bd6',icon:'🕯️'},{id:'vultures',name:'Iron Vultures',color:'#3aa6a0',icon:'🦅'}],
  startTiles:10,              // factions appear once you own this many hexes
  homeDist:[9,13],            // home base distance in hexes (~1.5-2.2 km) from your Stronghold / first hex
  startRing:1,                // home + ring 1 = 7 starting hexes
  tickHours:4, maxCatchUpDays:7,
  expandChance:0.35, expandPerTick:1, // ~2 new hexes per faction per day
  contestChance:0.25, maxTakesPerDay:2, // at most 2 of your hexes per day across all factions
  maxTiles:30, maxTilesPerTier:10,
  // strength = (base + perLevel*yourLevel + perMember*(alliance members-1) + perDay*min(30,days active)) * tierMult^tier
  base:30, perLevel:7, perMember:6, perDay:1, tierMult:1.15,
  garrison:{hp:2.4,atk:0.24,def:0.07,agi:3,perAdjacent:0.1}, // interior hexes (more faction neighbors) are tougher
  home:{mult:2.2,guards:1,guardMult:0.4,regenPerDay:0.25},
  attackRangeM:300, retakeXP:25, retakeLoot:{scrap:12,food:4}, homeXP:250, homeLoot:{scrap:150,food:60,water:60,fuel:30,parts:20},
  respawnDays:5,              // a routed faction returns this many days later, farther out and one tier stronger
};
// Outposts: small structures. Capture takes a 1-hour hold, then they claim + guard a 1-ring area.
BAL.outpost={cost:{scrap:200,food:60,water:60,fuel:30,parts:15},holdMin:60,radius:1,power:60,powerPerShLevel:8,capBase:2,capPerShLevels:2};
// Alliance research: paid from the bank, shared by the whole alliance. cost = base * (level+1)^1.6
BAL.research={max:5,base:{scrap:300,food:120,water:120,fuel:60,parts:40},exp:1.6,list:{
  logistics:{name:'Supply Lines',icon:'🚚',desc:'+5% tile income per level',per:5},
  walls:{name:'Fortified Walls',icon:'🧱',desc:'+8% Stronghold, tower and outpost power per level',per:8},
  medics:{name:'Field Medics',icon:'🩺',desc:'+4% max health per level',per:4},
  jammers:{name:'Radio Jammers',icon:'📡',desc:'-6% faction attack power per level',per:6},
  salvage:{name:'Salvage Crews',icon:'🧰',desc:'+8% resources from fights per level',per:8}}};
// Operations: 3 alliance missions per week (Mon-Sun, Pacific), goals scale with member count.
BAL.ops={pick:3,pool:[
  {k:'claims',text:'Claim {n} hexes as a crew',per:60,reward:{scrap:120,food:60,water:60}},
  {k:'kills',text:'Defeat {n} mutants',per:12,reward:{scrap:80,parts:15}},
  {k:'retakes',text:'Retake {n} hexes from factions',per:4,reward:{scrap:100,fuel:30,parts:10}},
  {k:'outposts',text:'Finish {n} outposts',per:1,reward:{scrap:150,parts:20}},
  {k:'visits',text:'Earn {n} landmark badges',per:2,reward:{food:80,water:80}},
  {k:'raids',text:'Join {n} boss raids',per:1,reward:{scrap:120,fuel:30}}],xp:150};
BAL.cloud={autosaveSec:120};

// ---- Stage 2b: the horde moves like players. No more random raids on arbitrary tiles (BAL.ai is unused now).
// Each gang fields squads that walk out from their HQ / gang outposts one hex at a time (contiguous path), claiming as they go.
// Before a squad can take a hex inside your Stronghold area, a tower ring or an outpost ring, it must beat the combined
// defense power there (deterministic, defense wins ties). Losing squads are wounded and retreat.
BAL.horde={
  stepMin:20,               // a squad moves 1 hex (~170 m) every 20 min while out (walking pace with stops)
  sortieHexes:6,            // hexes per outing, then it rests
  restHours:9, restJitter:4, // rest 9-13 h between outings => ~2 outings a day
  squadsBase:1, squadsMax:3, // squads per gang = 1 + tier (max 3)
  searchRadius:9, maxPath:16,
  // target scoring: rich tiles, undefended edges, gaps between your rings, contested ground; minus distance
  wRich:0.6, wNeutral:1, wUndefended:6, wGap:3, wBeatable:4, wStrong:-8, wContested:2, wDist:0.45,
  outpostEvery:5, outpostsBase:1, outpostGuard:1.5, // a gang builds an outpost when a squad stops 5+ hexes from its bases
  woundMult:0.6, woundHours:24, retreatHours:14,
  destroyRatio:2,           // a structure is only destroyed if the squad's power is at least 2x the defense
  damageOnLoss:0.3,         // otherwise defenders that lose drop to 30% condition (visual only, power is unaffected)
};
