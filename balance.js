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
    pathStepM:40,                                            // when GPS jumps (driving), sample the path every N meters
    maxGapM:3000,                                            // bigger GPS jumps than this are treated as glitches (no fill)
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
