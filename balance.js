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
    dailyYield:{common:4,rare:10,epic:25},          // base amount paid per tile at each daily reset
    resMult:{scrap:1,food:1,water:1,fuel:0.7,parts:0.5},     // rarer resources pay less
    tierColor:{common:'#9aa4a8',rare:'#ffb43c',epic:'#d070ff'},
    claimXP:2,                                               // XP per newly claimed hex
  },
  // ---- Daily reset (midnight Pacific)
  reset:{timeZone:'America/Los_Angeles',allianceShare:0.25,maxMissedDays:7},
  // ---- Stronghold placed on the map (must be on a hex you own)
  stronghold:{
    cost:{scrap:500,food:200,water:200,fuel:80,parts:40},
    rebuildMult:0.4,              // rebuilding a fallen stronghold costs 40% of first build
    buildHours:6, rebuildHours:2, // real-time build timers (keep running offline)
    radius:2,                     // defends hexes within 2 rings (~19 hexes)
    basePower:80, powerPerLevel:30,
  },
  // ---- Towers
  tower:{
    cost:{scrap:150,fuel:20,parts:12},
    upkeep:{food:5,water:5,fuel:2},   // paid daily at reset; unpaid towers go offline that day
    radius:1,                          // defends its hex + the 6 around it
    power:45,
    maxBase:1, maxPerStrongholdLevel:1,// max towers = 1 + stronghold level (0 without a stronghold)
    buildHours:1,
  },
  // ---- AI raider attacks (simulated from timestamps when the app opens)
  ai:{
    windowHours:8,            // the week is split into 8h windows...
    attackChance:0.14,        // ...each with a 14% chance => about 3 attacks a week
    minTiles:10,              // grace: no attacks until you own this many tiles
    targetsMin:1, targetsMax:3,
    basePower:40, powerPerLevel:6, powerPerTile:0.25,
    structureLossChance:0.6,  // when defense loses, each defending tower/stronghold may be destroyed
    maxCatchUpDays:14,
    winLoot:{scrap:15,parts:2},
  },
  // ---- Enemy AI strongholds (fixed spots on the map, hard fights)
  enemy:{
    chancePerHex:0.006,       // about 1 per ~170 hexes
    scanRings:9,
    hpBase:450, hpPerLevel:160, atkBase:22, atkPerLevel:6, defBase:10, defPerLevel:3,
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
BAL.stronghold.relocateCost={scrap:250,fuel:60,parts:20}; BAL.stronghold.relocateCooldownDays=7;
BAL.markers={types:{target:['🎯','Target Zone'],outpost:['⛺','Outpost Site'],enemy:['⚠️','Contested / Enemy Zone'],hub:['📦','Resource Gathering Hub'],waypoint:['📍','Waypoint']},expireDays:3};
