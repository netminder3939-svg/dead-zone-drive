// Static game data: monsters, gear, quests, landmark types. Edit freely.
const RARITY = [
  {id:'common',name:'Common',color:'#9aa4a8',mult:1},
  {id:'uncommon',name:'Uncommon',color:'#5fd068',mult:1.25},
  {id:'rare',name:'Rare',color:'#4aa3ff',mult:1.6},
  {id:'epic',name:'Epic',color:'#c070ff',mult:2.1},
  {id:'legendary',name:'Legendary',color:'#ffb43c',mult:2.8},
];
// Monster ids match <id>.png (see manifest.json)
const MONSTERS = {
  rad_rat:     {name:'Rad Rat',        hp:30, atk:5,  def:1, lvl:1, biome:'any',   drops:{scrap:3,food:2}},
  scrap_crawler:{name:'Scrap Crawler', hp:45, atk:7,  def:3, lvl:2, biome:'urban', drops:{scrap:6,parts:1}},
  bog_leech:   {name:'Bog Leech',      hp:40, atk:8,  def:2, lvl:2, biome:'water', drops:{water:5,food:1}},
  feral_hound: {name:'Feral Hound',    hp:55, atk:10, def:3, lvl:3, biome:'park',  drops:{food:5,scrap:2}},
  glow_moth:   {name:'Glow Moth',      hp:35, atk:12, def:1, lvl:3, biome:'any',   drops:{fuel:2,water:2}},
  ghoul:       {name:'Wasteland Ghoul',hp:80, atk:12, def:5, lvl:4, biome:'urban', drops:{scrap:6,food:3,parts:1}},
  enemy_fort:  {name:'Raider Stronghold',hp:800,atk:30,def:12,lvl:5,fort:true,drops:{}},
  // bosses
  boss_tank:   {name:'Rust Behemoth',  hp:2400,atk:28,def:10,lvl:10,boss:true, drops:{scrap:60,parts:12,fuel:10}},
  boss_queen:  {name:'Hive Queen',     hp:2000,atk:34,def:8, lvl:10,boss:true, drops:{food:50,water:40,parts:8}},
  boss_warden: {name:'The Warden',     hp:3000,atk:24,def:14,lvl:12,boss:true, drops:{scrap:80,fuel:20,parts:15}},
};
const GEAR_BASES = [
  {slot:'weapon',name:'Pipe Wrench',atk:6},{slot:'weapon',name:'Nail Bat',atk:8,crit:3},
  {slot:'weapon',name:'Scrap Crossbow',atk:10,crit:6},{slot:'weapon',name:'Rebar Spear',atk:9,crit:4},
  {slot:'armor',name:'Tire Vest',def:5,hp:15},{slot:'armor',name:'Road-Sign Plate',def:8,hp:10},
  {slot:'armor',name:'Hazmat Coat',def:4,hp:30},{slot:'armor',name:'Runner Jacket',def:3,agi:4},
  {slot:'trinket',name:'Lucky Bottlecap',crit:6},{slot:'trinket',name:'Geiger Charm',hp:20,crit:2},
  {slot:'trinket',name:'Dog Tags',atk:3,def:3},{slot:'trinket',name:'Rabbit Foot',luck:5},{slot:'trinket',name:'Sprint Shoes',agi:5},
];
const RES = {scrap:'🔩',food:'🥫',water:'💧',fuel:'⛽',parts:'⚙️'};
// OSM tag -> landmark kind
const LANDMARK_KINDS = {
  park:{icon:'🌲',label:'Overgrown Park',biome:'park'},
  school:{icon:'🏫',label:'Abandoned School',biome:'urban'},
  place_of_worship:{icon:'⛪',label:'Silent Chapel',biome:'urban'},
  water_tower:{icon:'🗼',label:'Water Tower',biome:'water'},
  mall:{icon:'🏬',label:'Dead Mall',biome:'urban'},
  water:{icon:'🌊',label:'Toxic Shore',biome:'water'},
  fuel:{icon:'⛽',label:'Gas Station Ruins',biome:'urban'},
  townhall:{icon:'🏛️',label:'Old Town Hall',biome:'urban'},
};
const QUEST_POOL = [
  {id:'kill5',text:'Defeat 5 mutants',type:'kills',goal:5,reward:{scrap:20}},
  {id:'kill10',text:'Defeat 10 mutants',type:'kills',goal:10,reward:{parts:3}},
  {id:'visit1',text:'Visit a landmark',type:'visits',goal:1,reward:{water:15}},
  {id:'visit3',text:'Visit 3 landmarks',type:'visits',goal:3,reward:{fuel:8}},
  {id:'claim1',text:'Claim a hex for the team',type:'claims',goal:1,reward:{food:15}},
  {id:'raid1',text:'Join a raid',type:'raids',goal:1,reward:{parts:4}},
  {id:'walk',text:'Travel 1 km',type:'meters',goal:1000,reward:{scrap:25}},
  {id:'scrap50',text:'Collect 50 scrap',type:'scrap',goal:50,reward:{fuel:5}},
];
const BUILD = {
  outpost:{name:'Outpost',cost:{scrap:30,food:10,water:10},desc:'Claims hex + 1 ring around it'},
  tower:{name:'Watchtower',cost:{scrap:60,parts:6,fuel:5},desc:'Reveals mutants in a wider radius, +10% team loot'},
};
