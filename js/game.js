// Core game: state, map, GPS, spawns, landmarks, battle, raids, territory, quests.
const G={allyExp:new Set(),pos:null,lastPos:null,dev:{walk:false,tp:false},mates:{},raids:{},terr:{},landmarks:[],layers:{}};
const P_DEFAULT=()=>({name:'',color:'#4ad7ff',lvl:1,xp:0,hp:100,res:{scrap:0,food:0,water:0,fuel:0,parts:0},
  inv:[],equip:{},sp:0,skills:{},stronghold:{level:1},contrib:{kills:0,badges:0,raids:0,hexes:0,deposited:0,withdrawn:0,km:0},cards:{},badges:{},killed:{},raidLoot:{},quests:null,stats:{kills:0,meters:0},uid:null});
let P=Object.assign(P_DEFAULT(),JSON.parse(localStorage.getItem('wl_p')||'{}'));P.contrib=Object.assign(P_DEFAULT().contrib,P.contrib);
const save=()=>{if(!window.__wiping)localStorage.setItem('wl_p',JSON.stringify(P));};
const $=s=>document.querySelector(s);
function toast(t){const T=$('#toast');if([...T.children].some(c=>c.textContent===t))return; // v19: no duplicate toasts
  while(T.children.length>=3)T.firstChild.remove();const d=document.createElement('div');d.textContent=t;T.appendChild(d);setTimeout(()=>d.remove(),3600);}

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
// v19: minZoom 13 = no zooming out past where fog + hexes draw right
const map=L.map('map',{zoomControl:false,attributionControl:true,minZoom:13,maxZoom:19,wheelPxPerZoomLevel:180,wheelDebounceTime:60,zoomSnap:0.5,zoomDelta:0.5}).setView([47.8135,-116.8968],16);
// Free Esri World Street Map basemap (no key). A CSS filter gives it a dusty wasteland look while keeping streets readable.
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,maxNativeZoom:18,keepBuffer:4,attribution:'Tiles © Esri, OpenStreetMap'}).addTo(map);
function setLod(){const z=map.getZoom(),c=map.getContainer();c.classList.remove('lod-far','lod-mid','lod-near','lod-close');c.classList.add(z<=14?'lod-far':z===15?'lod-mid':z===16?'lod-near':'lod-close');}
map.on('zoomend',setLod);setLod();
['hex','terr','mons','lm','mates','raids'].forEach(k=>G.layers[k]=L.layerGroup().addTo(map));
const meMarker=L.marker([0,0],{icon:L.divIcon({className:'',html:'<div class="me-dot"></div>',iconSize:[18,18]}),zIndexOffset:1000});
const reachCircle=L.circle([0,0],{radius:120,color:'#4ad7ff',weight:1,opacity:.4,fillOpacity:.04,interactive:false});

map.on('moveend',()=>drawWorld());
map.on('click',e=>{if(G.dev.walk&&!G.dev.tp){G.walkTo=[e.latlng.lat,e.latlng.lng];toast('🚶 Walking there');return;} /* v19 dev: tap = walk there */ if(G.dev.tp){G.jump=true;setPos(e.latlng.lat,e.latlng.lng);}else if(P.world)UI.infoTile(hexAt(e.latlng.lat,e.latlng.lng).id);});

function dayNight(){const h=new Date().getHours()+new Date().getMinutes()/60;let a=0,c='10,20,60';
  if(h<5.5||h>=21)a=.16;else if(h<7)a=.16*(7-h)/1.5;else if(h>=19)a=.16*(h-19)/2;if(h>=17&&h<20){c='120,60,20';a=Math.max(a,.07);}
  $('#tint').style.background=`rgba(${c},${a})`;G.night=h<6||h>=21;document.body.classList.toggle('night',G.night);}
setInterval(dayNight,60e3);dayNight();

// ---------- position ----------
function setPos(lat,lng){
  if(G.pos){const d=distM(G.pos[0],G.pos[1],lat,lng);if(d<2000){P.stats.meters+=d;P.contrib.km+=d/1000;questProg('meters',Math.round(d));}}
  const prev=G.jump?null:G.pos;G.jump=false;const first=!G.pos;G.pos=[lat,lng];meMarker.setLatLng(G.pos).addTo(map);reachCircle.setLatLng(G.pos).addTo(map);
  if(first||G.gps&&G.gps.recenter){map.setView(G.pos,16);if(G.gps)G.gps.recenter=false;}
  NET.setCenter(lat,lng);
  if(!G.lmCenter||distM(lat,lng,...G.lmCenter)>1500)loadLandmarks(lat,lng);
  spawnMonsters();checkLandmarks();if(P.world&&(!G.gpsWeak||G.dev.walk||G.dev.drive||G.dev.tp||G.dev.hold))claimPath(prev,G.pos);UI.claimBtn();save();
}
// v20 GPS rewrite. Before: any error or a slow first fix (>6 s, normal on a cold start) teleported you to Rathdrum and the map
// stayed there; no accuracy filter, so a ±500 m wifi guess claimed the wrong hex; iOS stops the watch when the app is hidden
// and nothing restarted it. Now: accuracy-gated claims, jump/glitch filter, watchdog + restart on return, a GPS status chip,
// last known spot instead of Rathdrum (Rathdrum fallback only on dev/preview builds).
const GPS={claimAcc:60,showAcc:1500,minMoveM:6,maxSpeedMs:70,staleMs:30000,devHost:/--|localhost|127\.0\.0\.1/.test(location.hostname)||/[?&]local\b/.test(location.search)};
G.gps={state:'waiting',acc:null,t:0,watch:null,errs:0};
function gpsFix(p){const c=p.coords,acc=Math.round(c.accuracy||9999),now=Date.now();G.gps.t=now;G.gps.acc=acc;G.gps.errs=0;
  if(G.dev.walk||G.dev.drive||G.dev.tp||G.dev.hold){G.gps.state='dev';return gpsChip();}
  if(G.gps.fallback&&acc<=GPS.showAcc){G.gps.fallback=false;G.jump=true;G.gps.recenter=true;G.gps.forceNext=true;toast('📡 Found you');}
  if(acc>GPS.showAcc){G.gps.state='weak';return gpsChip();}            // useless fix: ignore it completely
  G.gpsWeak=acc>GPS.claimAcc;G.gps.state=G.gpsWeak?'weak':'ok';
  if(G.pos){const d=distM(G.pos[0],G.pos[1],c.latitude,c.longitude),dt=Math.max(1,(now-(G.gps.lastMove||now))/1000);
    if(d<Math.max(GPS.minMoveM,Math.min(acc,30)/2)&&!G.gps.forceNext){return gpsChip();}   // GPS drift while standing still
    if(d/dt>GPS.maxSpeedMs&&d>300)G.jump=true;}                                        // glitch / teleport: move, but no path claims
  G.gps.forceNext=false;G.gps.lastMove=now;P.lastPos=[c.latitude,c.longitude];setPos(c.latitude,c.longitude);gpsChip();}
function gpsErr(e){G.gps.errs++;if(e&&e.code===1){G.gps.state='denied';gpsChip();if(!G.gps.toldDenied){G.gps.toldDenied=1;toast('📡 Location is blocked. Allow location for this site in your browser settings, then reload.');}}
  else{G.gps.state=G.pos?'weak':'waiting';gpsChip();if(G.gps.errs>=3)gpsRestart();}
  gpsFallback();}
function gpsFallback(){if(G.pos)return;G.gps.fallback=true;if(P.lastPos){G.jump=true;G.gpsWeak=true;setPos(...P.lastPos);return;}
  if(GPS.devHost){G.jump=true;setPos(47.8135,-116.8968);toast('📡 No GPS yet: dev spot at Rathdrum');}}
function gpsRestart(){try{if(G.gps.watch!=null)navigator.geolocation.clearWatch(G.gps.watch);}catch(e){}G.gps.errs=0;
  G.gps.watch=navigator.geolocation.watchPosition(gpsFix,gpsErr,{enableHighAccuracy:true,maximumAge:3000,timeout:20000});
  try{navigator.geolocation.getCurrentPosition(p=>{G.gps.forceNext=true;gpsFix(p);},()=>{},{enableHighAccuracy:true,maximumAge:10000,timeout:15000});}catch(e){}}
function gpsChip(){let el=document.getElementById('gpschip');const st=document.getElementById('status');if(!st)return;if(!el||el.parentNode!==st){el=document.createElement('span');el.id='gpschip';st.prepend(el);el.onclick=gpsHelp;}
  const g=G.gps,age=g.t?Date.now()-g.t:0,stale=g.state==='ok'&&age>GPS.staleMs;
  const [cls,txt]=g.state==='dev'?['ok','🧪 Dev position']:g.state==='denied'?['bad','📡 Location blocked · tap']:g.state==='waiting'?['warn','📡 Finding you…']:stale?['warn','📡 GPS paused · tap']
    :g.state==='weak'?['warn',`📡 Weak GPS ±${g.acc}m · not claiming`]:['ok',`📡 GPS ±${g.acc}m`];
  el.dataset.s=cls;el.textContent=txt;}
function gpsHelp(){UI.ask('📡 GPS',G.gps.state==='denied'?'Location is blocked for this site. iPhone: Settings › Privacy › Location Services › Safari Websites › While Using. Android Chrome: tap the lock icon in the address bar › Permissions › Location › Allow. Then reload.'
  :`Accuracy ±${G.gps.acc??'?'} m. Hexes are only claimed when accuracy is ${GPS.claimAcc} m or better. Tips: step outside or near a window, turn on Wi-Fi (it helps the phone place you), keep the game open on screen.`,'Retry GPS').then(ok=>{if(ok){gpsRestart();toast('📡 Restarting GPS');}});}
function startGPS(){
  if(!navigator.geolocation){G.gps.state='denied';gpsChip();toast('No GPS on this device');gpsFallback();return;}
  gpsRestart();
  setTimeout(()=>{if(!G.pos)gpsFallback();},12000);                     // show the map at your last spot while the first fix comes in
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')gpsRestart();}); // iOS kills the watch in the background
  setInterval(()=>{gpsChip();if(document.visibilityState==='visible'&&G.gps.state!=='denied'&&G.gps.state!=='dev'&&Date.now()-G.gps.t>GPS.staleMs)gpsRestart();},5000); // watchdog
}
// Dev: simulated walk (~15 m steps) or drive (~150 m steps, tests filling hexes between GPS points)
setInterval(()=>{const m=G.dev.drive?10:G.dev.walk?1:0;if(m&&G.pos){G.walkA=(G.walkA||0)+(Math.random()-.5)*(G.dev.drive?.25:.6);
  if(G.dev.walk&&G.walkTo){const dy=(G.walkTo[0]-G.pos[0])/0.00012,dx=(G.walkTo[1]-G.pos[1])/0.00016;if(Math.hypot(dx,dy)<=1){setPos(...G.walkTo);G.walkTo=null;map.panTo(G.pos,{animate:true});return;}G.walkA=Math.atan2(dx,dy);}
  setPos(G.pos[0]+0.00012*m*Math.cos(G.walkA),G.pos[1]+0.00016*m*Math.sin(G.walkA));map.panTo(G.pos,{animate:true});}},1500);

// ---------- mutant spawns (deterministic per hex per 10 min, so everyone sees the same ones) ----------
function biomeAt(lat,lng){let b='any',best=250;G.landmarks.forEach(l=>{const d=distM(lat,lng,l.lat,l.lng);if(d<best){best=d;b=LANDMARK_KINDS[l.kind].biome;}});return b;}
function spawnMonsters(){if(!G.pos)return;const g=G.layers.mons;g.clearLayers();G.monList=[];const win=Math.floor(Date.now()/600e3);
  const h=hexAt(...G.pos),ids=Object.keys(MONSTERS).filter(k=>!MONSTERS[k].boss&&!MONSTERS[k].fort);
  hexRing(h.q,h.r,BAL.spawn.rings).forEach(x=>{if(!isVis(x.id))return;const key=x.id+'@'+win,rnd=seedRand(key);if(rnd()>(G.night?BAL.spawn.nightChance:BAL.spawn.dayChance)||P.killed[key])return;
    const c=hexCenter(x.q,x.r),lat=c[0]+(rnd()-.5)*.0008,lng=c[1]+(rnd()-.5)*.0011,bio=biomeAt(lat,lng);
    let pool=ids.filter(k=>MONSTERS[k].biome===bio||MONSTERS[k].biome==='any');const mid=pool[Math.floor(rnd()*pool.length)];
    const lvl=Math.max(1,MONSTERS[mid].lvl+Math.floor(P.lvl*BAL.progress.mutantLevelPerPlayerLevel)+(G.night?1:0));
    G.monList.push({mid,lvl,key,lat,lng});
    L.marker([lat,lng],{icon:L.divIcon({className:'mk lodm',html:`<div class="ico mon"><img src="${monImg(mid)}" onerror="this.onerror=null;this.src='assets/monsters/${mid}.svg'"><b class="lv">Lv${lvl}</b></div>`,iconSize:[0,0]})})
      .on('click',()=>UI.infoMon(mid,lvl,key,lat,lng)).addTo(g);});}
setInterval(spawnMonsters,60e3);
let MANIFEST={monsters:{}};fetch('assets/monsters/manifest.json').then(r=>r.json()).then(m=>{MANIFEST=m;spawnMonsters();}).catch(()=>{});
function bossMapImg(id){return MANIFEST.monsters[id]?.emblem?`assets/monsters/${id}_emblem.png`:monImg(id);}
function monImg(id){return `assets/monsters/${id}.${MANIFEST.monsters[id]?.png?'png':'svg'}`;}

// ---------- landmarks from OpenStreetMap (Overpass, free) ----------
async function loadLandmarks(lat,lng){G.lmCenter=[lat,lng];const ck='wl_lm2_'+lat.toFixed(2)+'_'+lng.toFixed(2);
  let list=JSON.parse(localStorage.getItem(ck)||'null');
  if(!list){const q=`[out:json][timeout:20];(nwr(around:2500,${lat},${lng})[leisure=park][name];nwr(around:2500,${lat},${lng})[amenity~"^(school|place_of_worship|townhall|fuel)$"];nwr(around:2500,${lat},${lng})[man_made=water_tower];nwr(around:2500,${lat},${lng})[shop~"^(mall|supermarket)$"];nwr(around:2500,${lat},${lng})[natural=water][name];);out center 120;`;
    try{const j=await overpass(q);
      list=j.elements.map(e=>{const t=e.tags||{},k=t.leisure==='park'?'park':t.man_made==='water_tower'?'water_tower':t.shop==='mall'?'mall':t.shop==='supermarket'?'grocery':t.natural==='water'?'water':t.amenity;
        return{id:e.type[0]+e.id,kind:k,name:t.name||LANDMARK_KINDS[k]?.label,lat:e.lat??e.center?.lat,lng:e.lon??e.center?.lon};}).filter(l=>l.lat&&LANDMARK_KINDS[l.kind]);
      localStorage.setItem(ck,JSON.stringify(list));}
    catch(e){list=fakeLandmarks(lat,lng);if(!G._lmWarn&&!sessionStorage.getItem('wl_lmWarn')){G._lmWarn=1;sessionStorage.setItem('wl_lmWarn','1');console.info('landmarks: using practice set for now');}setTimeout(()=>{if(G.lmCenter&&G.lmCenter[0]===lat)loadLandmarks(lat,lng);},15*60e3);}}
  G.landmarks=list;drawLandmarks();spawnMonsters();}
async function overpass(q){
  // v16: GET = CORS "simple request" (no preflight); several public mirrors, first that answers wins.
  for(const u of['https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter']){
    try{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),10000);
      const r=await fetch(u+'?data='+encodeURIComponent(q),{signal:ac.signal});clearTimeout(t);
      if(r.ok){const j=await r.json();if(j.elements?.length)return j;}}catch(e){}}
  throw new Error('overpass down');}
function fakeLandmarks(lat,lng){const r=seedRand(lat.toFixed(2)+lng.toFixed(2)),ks=Object.keys(LANDMARK_KINDS);
  return Array.from({length:14},(_,i)=>{const k=ks[i%ks.length];return{id:'f'+i,kind:k,name:LANDMARK_KINDS[k].label+' #'+(i+1),lat:lat+(r()-.5)*.03,lng:lng+(r()-.5)*.045};});}
function lairBoss(l){const r=seedRand(l.id+today());if(r()>.22)return null;return['boss_crystal','boss_queen','boss_warden'][Math.floor(r()*3)];}
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
function startBattle(mid,lvl,key){const M=MONSTERS[mid],sc=1+(lvl-M.lvl)*BAL.progress.mutantScalePerLevel,foe={hp:Math.round(M.hp*sc),atk:Math.round(M.atk*sc),def:Math.round(M.def*sc),crit:5};
  if(P.hp<10)return toast('Too hurt — rest a bit (HP regenerates)');
  UI.battle(M,mid,lvl,foe,key);}
function battleWin(mid,lvl,key){if(key.startsWith('fort:'))return{fort:captureEnemy(key.slice(5))};P.killed[key]=1;P.stats.kills++;questProg('kills');addXP(15+lvl*5);
  const M=MONSTERS[mid];addRes(M.drops,1+lvl*.1+(towerBonus()),true);P.contrib.kills++;P.cards[mid]=(P.cards[mid]||0)+1;
  let loot=null;if(Math.random()<Math.min(1,((P.gearDrops||0)<2?1:.4)+(stats().luck+skillFx('lootq'))/100)){loot=rollGear(lvl);P.inv.push(loot);P.gearDrops=(P.gearDrops||0)+1;}save();spawnMonsters();return loot;}
function towerBonus(){return P.world&&Object.values(P.world.towers).some(t=>t.state==='up')?0.1:0;}
setInterval(()=>{const m=stats().hp;if(P.hp<m){P.hp=Math.min(m,P.hp+2+skillFx('regen'));UI.hud();}},10e3);

// ---------- raids ----------
function drawRaids(){const g=G.layers.raids;g.clearLayers();
  Object.values(G.raids).forEach(r=>{if(r.done||Date.now()>r.endsAt)return;
    L.marker([r.lat,r.lng],{icon:L.divIcon({className:'mk mk-boss',html:`<div class="ico boss${MANIFEST.monsters[r.bossId]?.emblem?' emb':''}"><img src="${bossMapImg(r.bossId)}" onerror="this.onerror=null;this.src='assets/monsters/${r.bossId}.svg'"><b class="lv">RAID</b></div>`,iconSize:[0,0]}),zIndexOffset:500})
      .on('click',()=>UI.infoRaid(r.id)).addTo(g);});drawLandmarks();}
async function raidHit(id){const r=G.raids[id];if(!r||r.done)return null;const s=stats(),B=MONSTERS[r.bossId];
  let tot=0,crits=0;for(let i=0;i<3;i++){const x=simulateRound(s,B);tot+=x.dmg;if(x.crit)crits++;}
  const fk='wl_raidf_'+id;let fightId='';try{fightId=localStorage.getItem(fk)||'';if(!fightId){fightId=(P.uid||'me')+':'+Date.now();localStorage.setItem(fk,fightId);}}catch(e){fightId=(P.uid||'me')+':'+Date.now();}
  let res=null;try{res=await NET.hitRaid(id,P.uid,P.name,tot,null,null,0,0,fightId);}catch(e){res={complete:false};}
  const plan=typeof settleRaidBlow==='function'?settleRaidBlow({complete:res&&res.complete,fightId:fightId,settled:P._raidSettled,alreadyJoined:!!(P.raidLoot&&P.raidLoot[id+'_j']),ko:false}):{apply:!!(res&&res.complete),join:true,charge:false};
  if(!plan.apply)return{tot:tot,crits:crits,landed:false};
  P._raidSettled=P._raidSettled||{};P._raidSettled[fightId]=1;try{localStorage.removeItem(fk);}catch(e){}
  if(plan.join){P.raidLoot[id+'_j']=1;questProg('raids');P.contrib.raids++;allianceLog(`${P.name} joined the raid on ${B.name}`);}save();return{tot,crits,landed:true};}
function raidClaim(id){const r=G.raids[id];if(!r||!r.won||P.raidLoot[id])return;const me=r.participants[P.uid];if(!me)return;
  P.raidLoot[id]=1;const total=Object.values(r.participants).reduce((a,p)=>a+p.dmg,0),share=Math.max(.15,me.dmg/total);
  addRes(MONSTERS[r.bossId].drops,share*Object.keys(r.participants).length*.6);const g=rollGear(P.lvl+3,2);P.inv.push(g);
  P.cards[r.bossId]=(P.cards[r.bossId]||0)+1;addXP(150);save();return g;}

// ---------- boot ----------
const NET=makeNet();
async function boot(){
  try{if(P.name){UI.hud();drawWorld();}}catch(e){} // v19: show the saved map/HUD at once instead of a blank screen while the network loads
  ensureQuests();P.uid=await NET.init(P);save();
  $('#mode').textContent=NET.mode==='local'?'● LOCAL DEMO (offline)':'● LIVE · team '+NET.team;
  NET.onMarkers&&NET.onMarkers(m=>{G.markers=m;drawMarkers();});W();NET.onExplored&&NET.onExplored(ids=>{ids.forEach(i=>G.allyExp.add(i));clearTimeout(G._fogT);G._fogT=setTimeout(()=>{drawWorld();drawLandmarks();spawnMonsters();},400);});NET.onTerritory(t=>{G.terr=Object.fromEntries(Object.entries(t).filter(([,v])=>v&&!v.released));drawWorld();UI.claimBtn();});
  NET.onRaids(r=>{G.raids=r;drawRaids();UI.raidBanner();UI.refreshRaid();});
  // Privacy: teammates' GPS positions are never shared or shown. Only roster stats + last active.
  NET.onAlliance(a=>{G.al=a;if(UI.tab==='alliance'||(UI.tab==='base'&&(UI.sub.base||'fort')==='fort'))UI.render();});pushMember();setInterval(pushMember,4*60e3); /* v20 quota: was every 60 s */
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
