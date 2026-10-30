// Core game: state, map, GPS, spawns, landmarks, battle, raids, territory, quests.
const G={pos:null,lastPos:null,dev:{walk:false,tp:false},mates:{},raids:{},terr:{},landmarks:[],layers:{}};
const P_DEFAULT=()=>({name:'',color:'#4ad7ff',lvl:1,xp:0,hp:100,res:{scrap:20,food:10,water:10,fuel:0,parts:0},
  inv:[],equip:{},sp:0,skills:{},stronghold:{level:1},contrib:{kills:0,badges:0,raids:0,hexes:0,deposited:0,withdrawn:0,km:0},cards:{},badges:{},killed:{},raidLoot:{},quests:null,stats:{kills:0,meters:0},uid:null});
let P=Object.assign(P_DEFAULT(),JSON.parse(localStorage.getItem('wl_p')||'{}'));P.contrib=Object.assign(P_DEFAULT().contrib,P.contrib);
const save=()=>localStorage.setItem('wl_p',JSON.stringify(P));
const $=s=>document.querySelector(s);
function toast(t){const d=document.createElement('div');d.textContent=t;$('#toast').appendChild(d);setTimeout(()=>d.remove(),3600);}

// ---------- stats ----------
function addRes(o,mult=1,boost=false){if(boost)mult*=1+skillFx('resb')/100;for(const k in o){const v=Math.round(o[k]*mult);P.res[k]=(P.res[k]||0)+v;if(k==='scrap')questProg('scrap',v);}}
function canPay(c){return Object.entries(c).every(([k,v])=>(P.res[k]||0)>=v);}
function pay(c){for(const k in c)P.res[k]-=c[k];}
function rollGear(lvl,minR=0){const b=GEAR_BASES[Math.floor(Math.random()*GEAR_BASES.length)];
  let ri=minR;const x=Math.random()/(1+(stats().luck+skillFx('lootq'))/40);if(x<.35)ri++;if(x<.12)ri++;if(x<.04)ri++;if(x<.01)ri++;ri=Math.min(4,ri);
  const R=RARITY[ri],sc=R.mult*(1+lvl*.12),g={id:'g'+Date.now()+Math.random().toString(36).slice(2,6),name:b.name,slot:b.slot,rarity:ri};
  for(const k of['atk','def','hp','crit','agi','luck'])if(b[k])g[k]=Math.round(b[k]*sc);return g;}

// ---------- quests ----------
function ensureQuests(){if(P.quests&&P.quests.date===today())return;const rnd=seedRand(today()+P.name);
  const pool=[...QUEST_POOL].sort(()=>rnd()-.5).slice(0,3);P.quests={date:today(),list:pool.map(q=>({...q,prog:0,done:false,claimed:false}))};save();}
function questProg(type,n=1){if(!P.quests)return;P.quests.list.forEach(q=>{if(q.type===type&&!q.done){q.prog=Math.min(q.goal,q.prog+n);if(q.prog>=q.goal){q.done=true;toast('📜 Quest done: '+q.text);UI.badge('player',true);}}});save();}

// ---------- map ----------
const map=L.map('map',{zoomControl:false,attributionControl:true}).setView([47.8135,-116.8968],16);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,maxNativeZoom:16,attribution:'Esri, OSM'}).addTo(map);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,maxNativeZoom:16,opacity:.7}).addTo(map);
['hex','terr','mons','lm','mates','raids'].forEach(k=>G.layers[k]=L.layerGroup().addTo(map));
const meMarker=L.marker([0,0],{icon:L.divIcon({className:'',html:'<div class="me-dot"></div>',iconSize:[18,18]}),zIndexOffset:1000});
const reachCircle=L.circle([0,0],{radius:120,color:'#4ad7ff',weight:1,opacity:.4,fillOpacity:.04,interactive:false});

function drawHexes(){const g=G.layers.hex;g.clearLayers();if(map.getZoom()<14)return;
  const c=map.getCenter(),h=hexAt(c.lat,c.lng),n=map.getZoom()>=16?7:12;
  hexRing(h.q,h.r,n).forEach(x=>{if(G.terr[x.id])return;L.polygon(hexPoly(x.q,x.r),{color:'#d6a03a',weight:.8,opacity:.38,fill:false,interactive:false}).addTo(g);});}
function drawTerritory(){const g=G.layers.terr;g.clearLayers();
  Object.entries(G.terr).forEach(([id,t])=>{const [q,r]=id.split('_').map(Number);
    L.polygon(hexPoly(q,r),{color:t.color||'#d6a03a',weight:t.core?2:1,opacity:.8,fillOpacity:t.core?.32:.16,interactive:!!t.core})
      .bindPopup(`<b>${t.tower?'🗼 Watchtower':t.core?'⛺ Outpost':'Team land'}</b><br>by ${t.by}`).addTo(g);
    if(t.core)L.marker(hexCenter(q,r),{icon:L.divIcon({className:'mk',html:t.tower?'🗼':'⛺',iconSize:[30,30]}),interactive:false}).addTo(g);});
  drawHexes();}
map.on('moveend',drawHexes);
map.on('click',e=>{if(G.dev.tp){setPos(e.latlng.lat,e.latlng.lng);}});

function dayNight(){const h=new Date().getHours()+new Date().getMinutes()/60;let a=0,c='10,20,60';
  if(h<5.5||h>=21)a=.38;else if(h<7)a=.38*(7-h)/1.5;else if(h>=19)a=.38*(h-19)/2;if(h>=17&&h<20){c='60,25,10';a=Math.max(a,.12);}
  $('#tint').style.background=`rgba(${c},${a})`;G.night=h<6||h>=21;}
setInterval(dayNight,60e3);dayNight();

// ---------- position ----------
function setPos(lat,lng){
  if(G.pos){const d=distM(G.pos[0],G.pos[1],lat,lng);if(d<2000){P.stats.meters+=d;P.contrib.km+=d/1000;questProg('meters',Math.round(d));}}
  const first=!G.pos;G.pos=[lat,lng];meMarker.setLatLng(G.pos).addTo(map);reachCircle.setLatLng(G.pos).addTo(map);
  if(first)map.setView(G.pos,16);
  NET.setCenter(lat,lng);
  if(!G.lmCenter||distM(lat,lng,...G.lmCenter)>1500)loadLandmarks(lat,lng);
  spawnMonsters();checkLandmarks();UI.claimBtn();save();
}
function startGPS(){
  if(!navigator.geolocation){toast('No GPS — use 🧪 dev tools');setPos(47.8135,-116.8968);return;}
  navigator.geolocation.watchPosition(p=>{if(!G.dev.walk&&!G.dev.tp)setPos(p.coords.latitude,p.coords.longitude);},
    e=>{toast('GPS off — dev mode at Rathdrum');if(!G.pos)setPos(47.8135,-116.8968);},{enableHighAccuracy:true,maximumAge:5000});
  setTimeout(()=>{if(!G.pos)setPos(47.8135,-116.8968);},6000);
}
setInterval(()=>{if(G.dev.walk&&G.pos){G.walkA=(G.walkA||0)+(Math.random()-.5)*.6;
  setPos(G.pos[0]+0.00012*Math.cos(G.walkA),G.pos[1]+0.00016*Math.sin(G.walkA));map.panTo(G.pos,{animate:true});}},1500);

// ---------- mutant spawns (deterministic per hex per 10 min, so everyone sees the same ones) ----------
function biomeAt(lat,lng){let b='any',best=250;G.landmarks.forEach(l=>{const d=distM(lat,lng,l.lat,l.lng);if(d<best){best=d;b=LANDMARK_KINDS[l.kind].biome;}});return b;}
function spawnMonsters(){if(!G.pos)return;const g=G.layers.mons;g.clearLayers();const win=Math.floor(Date.now()/600e3);
  const h=hexAt(...G.pos),ids=Object.keys(MONSTERS).filter(k=>!MONSTERS[k].boss);
  hexRing(h.q,h.r,4).forEach(x=>{const key=x.id+'@'+win,rnd=seedRand(key);if(rnd()>(G.night?.42:.3)||P.killed[key])return;
    const c=hexCenter(x.q,x.r),lat=c[0]+(rnd()-.5)*.0008,lng=c[1]+(rnd()-.5)*.0011,bio=biomeAt(lat,lng);
    let pool=ids.filter(k=>MONSTERS[k].biome===bio||MONSTERS[k].biome==='any');const mid=pool[Math.floor(rnd()*pool.length)];
    const lvl=Math.max(1,MONSTERS[mid].lvl+Math.floor(P.lvl*.7)+(G.night?1:0));
    L.marker([lat,lng],{icon:L.divIcon({className:'mk',html:`<img src="${monImg(mid)}" onerror="this.src='${mid}.svg'">`,iconSize:[44,44]})})
      .on('click',()=>{const d=distM(...G.pos,lat,lng);if(d>120&&!G.dev.any)return toast(`Too far (${Math.round(d)} m) — get within 120 m`);startBattle(mid,lvl,key);}).addTo(g);});}
setInterval(spawnMonsters,60e3);
let MANIFEST={monsters:{}};fetch('manifest.json').then(r=>r.json()).then(m=>{MANIFEST=m;spawnMonsters();}).catch(()=>{});
function monImg(id){return `${id}.${MANIFEST.monsters[id]?.png?'png':'svg'}`;}

// ---------- landmarks from OpenStreetMap (Overpass, free) ----------
async function loadLandmarks(lat,lng){G.lmCenter=[lat,lng];const ck='wl_lm_'+lat.toFixed(2)+'_'+lng.toFixed(2);
  let list=JSON.parse(localStorage.getItem(ck)||'null');
  if(!list){const q=`[out:json][timeout:20];(nwr(around:2500,${lat},${lng})[leisure=park][name];nwr(around:2500,${lat},${lng})[amenity~"^(school|place_of_worship|townhall|fuel)$"];nwr(around:2500,${lat},${lng})[man_made=water_tower];nwr(around:2500,${lat},${lng})[shop=mall];nwr(around:2500,${lat},${lng})[natural=water][name];);out center 120;`;
    try{const j=await overpass(q);
      list=j.elements.map(e=>{const t=e.tags||{},k=t.leisure==='park'?'park':t.man_made==='water_tower'?'water_tower':t.shop==='mall'?'mall':t.natural==='water'?'water':t.amenity;
        return{id:e.type[0]+e.id,kind:k,name:t.name||LANDMARK_KINDS[k]?.label,lat:e.lat??e.center?.lat,lng:e.lon??e.center?.lon};}).filter(l=>l.lat&&LANDMARK_KINDS[l.kind]);
      localStorage.setItem(ck,JSON.stringify(list));}
    catch(e){list=fakeLandmarks(lat,lng);toast('Map data offline: using practice landmarks');}}
  G.landmarks=list;drawLandmarks();spawnMonsters();}
async function overpass(q){
  for(const u of['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter']){
    try{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),12000);
      const r=await fetch(u,{method:'POST',body:'data='+encodeURIComponent(q),signal:ac.signal});clearTimeout(t);
      if(r.ok){const j=await r.json();if(j.elements?.length)return j;}}catch(e){}}
  throw new Error('overpass down');}
function fakeLandmarks(lat,lng){const r=seedRand(lat.toFixed(2)+lng.toFixed(2)),ks=Object.keys(LANDMARK_KINDS);
  return Array.from({length:14},(_,i)=>{const k=ks[i%ks.length];return{id:'f'+i,kind:k,name:LANDMARK_KINDS[k].label+' #'+(i+1),lat:lat+(r()-.5)*.03,lng:lng+(r()-.5)*.045};});}
function lairBoss(l){const r=seedRand(l.id+today());if(r()>.22)return null;return['boss_tank','boss_queen','boss_warden'][Math.floor(r()*3)];}
function drawLandmarks(){const g=G.layers.lm;g.clearLayers();
  G.landmarks.forEach(l=>{const K=LANDMARK_KINDS[l.kind],boss=lairBoss(l),v=P.badges[l.id];
    L.marker([l.lat,l.lng],{icon:L.divIcon({className:'mk mk-lm'+(v?' visited':'')+(boss&&!raidFor(l.id)?' lair':''),html:K.icon,iconSize:[34,34]})})
      .bindPopup(`<b>${l.name}</b><br>${K.label}${boss?'<br>☠️ Something big lurks here…':''}${v?'<br>🏅 Badge earned':''}`).addTo(g);});}
function raidFor(lid){return Object.values(G.raids).find(r=>r.lmId===lid&&r.day===today());}
function checkLandmarks(){G.landmarks.forEach(l=>{const d=distM(...G.pos,l.lat,l.lng);if(d>90)return;
  if(!P.badges[l.id]){P.badges[l.id]={name:l.name,kind:l.kind,t:Date.now()};questProg('visits');addXP(Math.round(30*(1+skillFx('explore')/100)));addRes({scrap:5,water:3},1+skillFx('explore')/100);P.contrib.badges++;allianceLog(`${P.name} earned the ${l.name} badge`);toast('🏅 Badge: '+l.name);drawLandmarks();save();}
  const b=lairBoss(l);if(b&&!raidFor(l.id)){const id='r_'+l.id+'_'+today();
    NET.createRaid({id,bossId:b,lmId:l.id,day:today(),lat:l.lat,lng:l.lng,place:l.name,hp:MONSTERS[b].hp,maxHp:MONSTERS[b].hp,
      endsAt:Date.now()+30*60e3,finder:P.name,participants:{},done:false});toast('☠️ BOSS FOUND! Raid started for the crew');allianceLog(`☠️ ${P.name} found ${MONSTERS[b].name} at ${l.name}`);}});}

// ---------- battle (auto) ----------
function startBattle(mid,lvl,key){const M=MONSTERS[mid],sc=1+(lvl-M.lvl)*.15,foe={hp:Math.round(M.hp*sc),atk:Math.round(M.atk*sc),def:Math.round(M.def*sc),crit:5};
  if(P.hp<10)return toast('Too hurt — rest a bit (HP regenerates)');
  UI.battle(M,mid,lvl,foe,key);}
function battleWin(mid,lvl,key){P.killed[key]=1;P.stats.kills++;questProg('kills');addXP(15+lvl*5);
  const M=MONSTERS[mid];addRes(M.drops,1+lvl*.1+(towerBonus()),true);P.contrib.kills++;P.cards[mid]=(P.cards[mid]||0)+1;
  let loot=null;if(Math.random()<.3+(stats().luck+skillFx('lootq'))/100){loot=rollGear(lvl);P.inv.push(loot);}save();spawnMonsters();return loot;}
function towerBonus(){return Object.values(G.terr).filter(t=>t.tower).length?0.1:0;}
setInterval(()=>{const m=stats().hp;if(P.hp<m){P.hp=Math.min(m,P.hp+2+skillFx('regen'));UI.hud();}},10e3);

// ---------- territory ----------
function claimHere(){if(!G.pos)return;const h=hexAt(...G.pos);if(G.terr[h.id]?.core)return toast('Already an outpost here');
  const c=Object.fromEntries(Object.entries(BUILD.outpost.cost).map(([k,v])=>[k,Math.round(v*(1-Math.min(.5,skillFx('outcost')/100)))]));if(!canPay(c))return toast('Need '+Object.entries(c).map(([k,v])=>v+RES[k]).join(' '));
  pay(c);const data={by:P.name,color:P.color,t:Date.now()};
  hexRing(h.q,h.r,1).forEach(x=>{if(!G.terr[x.id])NET.claimHex(x.id,{...data,core:false});});
  NET.claimHex(h.id,{...data,core:true});questProg('claims');addXP(40);P.contrib.hexes+=7;allianceLog(`⛺ ${P.name} built an outpost (+7 hexes)`);toast('⛺ Outpost built — hex claimed for the team');save();UI.hud();}
function buildTower(id){const t=G.terr[id];const c=BUILD.tower.cost;if(!canPay(c))return toast('Need '+Object.entries(c).map(([k,v])=>v+RES[k]).join(' '));
  pay(c);NET.claimHex(id,{...t,tower:true});toast('🗼 Watchtower built: +10% loot for everyone');save();UI.hud();}

// ---------- raids ----------
function drawRaids(){const g=G.layers.raids;g.clearLayers();
  Object.values(G.raids).forEach(r=>{if(r.done||Date.now()>r.endsAt)return;
    L.marker([r.lat,r.lng],{icon:L.divIcon({className:'mk mk-boss',html:`<img src="${monImg(r.bossId)}" onerror="this.src='${r.bossId}.svg'">`,iconSize:[60,60]}),zIndexOffset:500})
      .on('click',()=>UI.raid(r.id)).addTo(g);});drawLandmarks();}
async function raidHit(id){const r=G.raids[id];if(!r||r.done)return null;const s=stats(),B=MONSTERS[r.bossId];
  let tot=0,crits=0;for(let i=0;i<3;i++){const x=simulateRound(s,B);tot+=x.dmg;if(x.crit)crits++;}
  await NET.hitRaid(id,P.uid,P.name,tot);if(!P.raidLoot[id+'_j']){P.raidLoot[id+'_j']=1;questProg('raids');P.contrib.raids++;allianceLog(`${P.name} joined the raid on ${B.name}`);}save();return{tot,crits};}
function raidClaim(id){const r=G.raids[id];if(!r||!r.won||P.raidLoot[id])return;const me=r.participants[P.uid];if(!me)return;
  P.raidLoot[id]=1;const total=Object.values(r.participants).reduce((a,p)=>a+p.dmg,0),share=Math.max(.15,me.dmg/total);
  addRes(MONSTERS[r.bossId].drops,share*Object.keys(r.participants).length*.6);const g=rollGear(P.lvl+3,2);P.inv.push(g);
  P.cards[r.bossId]=(P.cards[r.bossId]||0)+1;addXP(150);save();return g;}

// ---------- boot ----------
const NET=makeNet();
async function boot(){
  ensureQuests();P.uid=await NET.init(P);save();
  $('#mode').textContent=NET.mode==='local'?'● LOCAL DEMO (offline)':'● LIVE · team '+NET.team;
  NET.onTerritory(t=>{G.terr=t;drawTerritory();UI.claimBtn();});
  NET.onRaids(r=>{G.raids=r;drawRaids();UI.raidBanner();UI.refreshRaid();});
  // Privacy: teammates' GPS positions are never shared or shown. Only roster stats + last active.
  NET.onAlliance(a=>{G.al=a;if(UI.tab==='alliance')UI.render();});pushMember();setInterval(pushMember,60e3);
  shTick();
  UI.hud();startGPS();
}

function memberSummary(){return{name:P.name,color:P.color,lvl:P.lvl,stronghold:strongholdLevel(),contrib:P.contrib};}
function pushMember(){NET.updateMember&&NET.updateMember(memberSummary());}
function allianceLog(text){try{if(typeof NET==='undefined')return;NET.activity&&NET.activity(text);}catch(e){}}
async function bankTx(res,amt){amt=Math.floor(Math.abs(amt));if(!amt)return;
  const dep=G.bankMode!=='withdraw';if(dep&&(P.res[res]||0)<amt)return toast('You only have '+(P.res[res]||0)+' '+RES[res]);
  try{const bal=await NET.bankTx(P.uid,P.name,res,dep?amt:-amt);
    P.res[res]+=dep?-amt:amt;P.contrib[dep?'deposited':'withdrawn']+=amt;save();pushMember();toast(`${dep?'Deposited':'Withdrew'} ${amt} ${RES[res]} · bank now ${bal}`);}
  catch(e){toast(e.message||'Bank error');}UI.hud();UI.render();}
