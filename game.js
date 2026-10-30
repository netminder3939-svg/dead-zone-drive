// Core game: state, map, GPS, spawns, landmarks, battle, raids, territory, quests.
const G={allyExp:new Set(),pos:null,lastPos:null,dev:{walk:false,tp:false},mates:{},raids:{},terr:{},landmarks:[],layers:{}};
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
// Free Esri World Street Map basemap (no key). A CSS filter gives it a dusty wasteland look while keeping streets readable.
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri, OpenStreetMap'}).addTo(map);
function setLod(){const z=map.getZoom(),c=map.getContainer();c.classList.remove('lod-far','lod-mid','lod-near','lod-close');c.classList.add(z<=14?'lod-far':z===15?'lod-mid':z===16?'lod-near':'lod-close');}
map.on('zoomend',setLod);setLod();
['hex','terr','mons','lm','mates','raids'].forEach(k=>G.layers[k]=L.layerGroup().addTo(map));
const meMarker=L.marker([0,0],{icon:L.divIcon({className:'',html:'<div class="me-dot"></div>',iconSize:[18,18]}),zIndexOffset:1000});
const reachCircle=L.circle([0,0],{radius:120,color:'#4ad7ff',weight:1,opacity:.4,fillOpacity:.04,interactive:false});

map.on('moveend',()=>drawWorld());
map.on('click',e=>{if(G.dev.tp){G.jump=true;setPos(e.latlng.lat,e.latlng.lng);}else if(P.world)UI.infoTile(hexAt(e.latlng.lat,e.latlng.lng).id);});

function dayNight(){const h=new Date().getHours()+new Date().getMinutes()/60;let a=0,c='10,20,60';
  if(h<5.5||h>=21)a=.16;else if(h<7)a=.16*(7-h)/1.5;else if(h>=19)a=.16*(h-19)/2;if(h>=17&&h<20){c='120,60,20';a=Math.max(a,.07);}
  $('#tint').style.background=`rgba(${c},${a})`;G.night=h<6||h>=21;document.body.classList.toggle('night',G.night);}
setInterval(dayNight,60e3);dayNight();

// ---------- position ----------
function setPos(lat,lng){
  if(G.pos){const d=distM(G.pos[0],G.pos[1],lat,lng);if(d<2000){P.stats.meters+=d;P.contrib.km+=d/1000;questProg('meters',Math.round(d));}}
  const prev=G.jump?null:G.pos;G.jump=false;const first=!G.pos;G.pos=[lat,lng];meMarker.setLatLng(G.pos).addTo(map);reachCircle.setLatLng(G.pos).addTo(map);
  if(first)map.setView(G.pos,16);
  NET.setCenter(lat,lng);
  if(!G.lmCenter||distM(lat,lng,...G.lmCenter)>1500)loadLandmarks(lat,lng);
  spawnMonsters();checkLandmarks();if(P.world)claimPath(prev,G.pos);UI.claimBtn();save();
}
function startGPS(){
  if(!navigator.geolocation){toast('No GPS — use 🧪 dev tools');setPos(47.8135,-116.8968);return;}
  navigator.geolocation.watchPosition(p=>{if(!G.dev.walk&&!G.dev.drive&&!G.dev.tp)setPos(p.coords.latitude,p.coords.longitude);},
    e=>{toast('GPS off — dev mode at Rathdrum');if(!G.pos)setPos(47.8135,-116.8968);},{enableHighAccuracy:true,maximumAge:5000});
  setTimeout(()=>{if(!G.pos)setPos(47.8135,-116.8968);},6000);
}
// Dev: simulated walk (~15 m steps) or drive (~150 m steps, tests filling hexes between GPS points)
setInterval(()=>{const m=G.dev.drive?10:G.dev.walk?1:0;if(m&&G.pos){G.walkA=(G.walkA||0)+(Math.random()-.5)*(G.dev.drive?.25:.6);
  setPos(G.pos[0]+0.00012*m*Math.cos(G.walkA),G.pos[1]+0.00016*m*Math.sin(G.walkA));map.panTo(G.pos,{animate:true});}},1500);

// ---------- mutant spawns (deterministic per hex per 10 min, so everyone sees the same ones) ----------
function biomeAt(lat,lng){let b='any',best=250;G.landmarks.forEach(l=>{const d=distM(lat,lng,l.lat,l.lng);if(d<best){best=d;b=LANDMARK_KINDS[l.kind].biome;}});return b;}
function spawnMonsters(){if(!G.pos)return;const g=G.layers.mons;g.clearLayers();const win=Math.floor(Date.now()/600e3);
  const h=hexAt(...G.pos),ids=Object.keys(MONSTERS).filter(k=>!MONSTERS[k].boss&&!MONSTERS[k].fort);
  hexRing(h.q,h.r,4).forEach(x=>{if(!isVis(x.id))return;const key=x.id+'@'+win,rnd=seedRand(key);if(rnd()>(G.night?.42:.3)||P.killed[key])return;
    const c=hexCenter(x.q,x.r),lat=c[0]+(rnd()-.5)*.0008,lng=c[1]+(rnd()-.5)*.0011,bio=biomeAt(lat,lng);
    let pool=ids.filter(k=>MONSTERS[k].biome===bio||MONSTERS[k].biome==='any');const mid=pool[Math.floor(rnd()*pool.length)];
    const lvl=Math.max(1,MONSTERS[mid].lvl+Math.floor(P.lvl*.7)+(G.night?1:0));
    L.marker([lat,lng],{icon:L.divIcon({className:'mk lodm',html:`<div class="ico mon"><img src="${monImg(mid)}" onerror="this.src='${mid}.svg'"><b class="lv">Lv${lvl}</b></div>`,iconSize:[0,0]})})
      .on('click',()=>UI.infoMon(mid,lvl,key,lat,lng)).addTo(g);});}
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
  G.landmarks.forEach(l=>{if(P.world&&!isVis(hexAt(l.lat,l.lng).id))return;const K=LANDMARK_KINDS[l.kind],boss=lairBoss(l),v=P.badges[l.id];
    L.marker([l.lat,l.lng],{icon:L.divIcon({className:'mk lodm',html:`<div class="ico lm${v?' visited':''}${boss&&!raidFor(l.id)?' lair':''}"><span>${K.icon}</span><b class="nm">${l.name}</b></div>`,iconSize:[0,0]})})
      .on('click',()=>UI.infoLandmark(l)).addTo(g);});}
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
function battleWin(mid,lvl,key){if(key.startsWith('fort:'))return{fort:captureEnemy(key.slice(5))};P.killed[key]=1;P.stats.kills++;questProg('kills');addXP(15+lvl*5);
  const M=MONSTERS[mid];addRes(M.drops,1+lvl*.1+(towerBonus()),true);P.contrib.kills++;P.cards[mid]=(P.cards[mid]||0)+1;
  let loot=null;if(Math.random()<.3+(stats().luck+skillFx('lootq'))/100){loot=rollGear(lvl);P.inv.push(loot);}save();spawnMonsters();return loot;}
function towerBonus(){return P.world&&Object.values(P.world.towers).some(t=>t.state==='up')?0.1:0;}
setInterval(()=>{const m=stats().hp;if(P.hp<m){P.hp=Math.min(m,P.hp+2+skillFx('regen'));UI.hud();}},10e3);

// ---------- raids ----------
function drawRaids(){const g=G.layers.raids;g.clearLayers();
  Object.values(G.raids).forEach(r=>{if(r.done||Date.now()>r.endsAt)return;
    L.marker([r.lat,r.lng],{icon:L.divIcon({className:'mk mk-boss',html:`<div class="ico boss"><img src="${monImg(r.bossId)}" onerror="this.src='${r.bossId}.svg'"><b class="lv">RAID</b></div>`,iconSize:[0,0]}),zIndexOffset:500})
      .on('click',()=>UI.infoRaid(r.id)).addTo(g);});drawLandmarks();}
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
  W();NET.onExplored&&NET.onExplored(ids=>{ids.forEach(i=>G.allyExp.add(i));clearTimeout(G._fogT);G._fogT=setTimeout(()=>{drawWorld();drawLandmarks();spawnMonsters();},400);});NET.onTerritory(t=>{G.terr=t;drawWorld();UI.claimBtn();});
  NET.onRaids(r=>{G.raids=r;drawRaids();UI.raidBanner();UI.refreshRaid();});
  // Privacy: teammates' GPS positions are never shared or shown. Only roster stats + last active.
  NET.onAlliance(a=>{G.al=a;if(UI.tab==='alliance')UI.render();});pushMember();setInterval(pushMember,60e3);
  shTick();await runResets();catchUpAI();drawWorld();const un=(W().unseen||[]);if(un.length){const rep=W().reports.find(x=>x.t===un[0]);setTimeout(()=>UI.attackAlert(rep),800);}setInterval(()=>runResets(),60e3);
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
