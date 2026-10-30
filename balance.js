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
    attackChance:0.14,        // ...each with a 14% chance => about 3 attacks a week
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
