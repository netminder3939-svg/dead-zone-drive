// Territory world: resource tiles, GPS path claiming, daily income + alliance auto-share,
// stronghold & towers on the map, AI raider attacks (simulated from timestamps), enemy strongholds.
// All numbers live in balance.js.
const W=()=>{P.tiles=P.tiles||{};const w=P.world=P.world||{};const d={lastReset:null,lastAi:null,sh:null,towers:{},raider:{},enemyTaken:{},reports:[]};for(const k in d)if(!(k in w))w[k]=d[k];return w;};
const hexDist=(a,b)=>{const [q1,r1]=a.split('_').map(Number),[q2,r2]=b.split('_').map(Number),dq=q1-q2,dr=r1-r2;return(Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;};
const idQR=id=>id.split('_').map(Number);
const pacificDate=(t=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:BAL.reset.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const RESN2={scrap:'Scrap',food:'Food',water:'Water',fuel:'Fuel',parts:'Parts'};

// ---------- fog of war ----------
// Visible = hexes you stood in + allies' explored hexes + any territory + your standing towers/stronghold rings (see BAL.fog).

function isVis(id){if(P.explored&&P.explored[id])return true;if(G.allyExp.has(id)||G.terr[id]||P.tiles[id])return true;
  if(G.pos&&hexDist(hexAt(...G.pos).id,id)<=BAL.fog.aroundPlayer)return true;
  // explicit rule: your standing stronghold/towers reveal their own defense ring
  if(BAL.fog.structuresReveal&&P.world){const s=P.world.sh;if(s&&s.state==='up'&&hexDist(s.hex,id)<=shRadius())return true;
    for(const [tid,t] of Object.entries(P.world.towers))if(t.state==='up'&&hexDist(tid,id)<=towerRadius(t))return true;}
  return false;}
function explore(ids){P.explored=P.explored||{};const fresh=[];ids.forEach(id=>{const [q,r]=idQR(id);hexRing(q,r,BAL.fog.pathRings).forEach(x=>{if(!P.explored[x.id]){P.explored[x.id]=1;fresh.push(x.id);}});});
  if(fresh.length&&NET.shareExplored)NET.shareExplored(fresh);return fresh.length;}
// ---------- Stronghold area (Stage 1f) ----------
function shRadius(){return BAL.stronghold.radius+Math.floor((strongholdLevel()-1)/BAL.stronghold.levelsPerRing);}
function shAreaIds(){const s=P.world&&P.world.sh;if(!s||s.state!=='up')return[];const [q,r]=idQR(s.hex);return hexRing(q,r,shRadius()).map(x=>x.id);}
// Claims every hex in the Stronghold ring so its tiles count toward daily income (owned tiles are never counted twice).
function shClaimArea(){if(!BAL.stronghold.areaIncome)return 0;const ids=shAreaIds().filter(id=>!P.tiles[id]&&!(enemyAt(id)&&!W().enemyTaken[id]));
  ids.forEach(claimTile);if(ids.length){save();if(typeof drawWorld==='function')drawWorld();}return ids.length;}
function shAreaInfo(){const ids=shAreaIds(),inc={scrap:0,food:0,water:0,fuel:0,parts:0};let res=0;
  ids.forEach(id=>{const t=tileInfo(id);if(t.res){res++;inc[t.res]+=t.yield;}});const mine={};for(const k in inc)mine[k]=inc[k]-Math.round(inc[k]*BAL.reset.allianceShare);return{hexes:ids.length,res,gross:inc,mine};}
setInterval(()=>{if(P.world&&shAreaIds().some(id=>!P.tiles[id]))shClaimArea();},5000);
// ---------- resource tiles ----------
const _tileCache={};
function tileInfo(id){if(_tileCache[id])return _tileCache[id];const T=BAL.tiles,r=seedRand('tile:'+id);let out={id,res:null};
  if(r()>=T.emptyChance){let x=r()*Object.values(T.resWeights).reduce((a,b)=>a+b,0);for(const [k,w] of Object.entries(T.resWeights)){if((x-=w)<0){out.res=k;break;}}
    const y=r();out.tier=y<T.tierChance.epic?'epic':y<T.tierChance.epic+T.tierChance.rare?'rare':'common';
    out.yield=Math.max(1,Math.round(T.dailyYield[out.tier]*T.resMult[out.res]));}
  return _tileCache[id]=out;}
function grossIncome(){const inc={scrap:0,food:0,water:0,fuel:0,parts:0},all=new Set(Object.keys(P.tiles));if(BAL.stronghold.areaIncome)shAreaIds().forEach(i=>all.add(i));for(const id of all){const t=tileInfo(id);if(t.res)inc[t.res]+=t.yield;}return inc;}
function towerUpkeep(){const u={scrap:0,food:0,water:0,fuel:0,parts:0},n=Object.values(W().towers).filter(t=>t.state!=='down').length;for(const k in BAL.tower.upkeep)u[k]+=BAL.tower.upkeep[k]*n;return u;}
// What you'll personally net at the next reset (after the 25% alliance share and tower upkeep)
function expectedIncome(){const g=grossIncome(),u=towerUpkeep(),o={};for(const k in g){const share=Math.round(g[k]*BAL.reset.allianceShare);o[k]=g[k]-share-u[k];}return o;}

// ---------- claiming by GPS path ----------
function claimPath(prev,cur){const T=BAL.tiles,ids=new Set([hexAt(...cur).id]);
  // Only the single hex you're standing in is claimed/revealed. No path fill-in, no neighbors.
  if(explore([...ids]))drawWorld();const fresh=[...ids].filter(id=>!P.tiles[id]);if(!fresh.length)return 0;
  fresh.forEach(claimTile);buzz(fresh.length>3?[30,40,30]:30);if(G.drive)G.drive.claimed+=fresh.length;addXP(fresh.length*T.claimXP);questProg('claims',fresh.length);
  const rich=fresh.map(tileInfo).filter(t=>t.res);toast(`🚩 +${fresh.length} hex${fresh.length>1?'es':''}`+(rich.length?` (${rich.map(t=>RES[t.res]).join('')})`:''));
  save();drawWorld();UI.hud();return fresh.length;}
function claimTile(id){W();const t=Date.now();P.tiles[id]={t};delete P.world.raider[id];P.contrib.hexes++;
  NET.claimHex(id,{by:P.name,uid:P.uid,color:P.color,t});}

// ---------- daily reset ----------
async function runResets(){const w=W(),today=pacificDate();shClaimArea();if(!w.lastReset){w.lastReset=today;save();return;}
  let days=Math.round((Date.parse(today)-Date.parse(w.lastReset))/864e5);if(days<=0)return;days=Math.min(days,BAL.reset.maxMissedDays);
  for(let i=0;i<days;i++)await payReset(i===days-1?today:'missed day');w.lastReset=today;save();UI.hud();}
async function payReset(label){const g=grossIncome(),share={},mine={};let tot=0,stot=0;
  for(const k in g){share[k]=Math.round(g[k]*BAL.reset.allianceShare);mine[k]=g[k]-share[k];tot+=g[k];stot+=share[k];}
  addRes(mine);
  // tower upkeep: if you can't pay, the tower goes offline (won't defend) until next reset
  Object.entries(W().towers).forEach(([id,t])=>{if(t.state==='down')return;if(canPay(BAL.tower.upkeep)){pay(BAL.tower.upkeep);t.online=true;}else{t.online=false;report(`🗼 Tower ${id} went offline: not enough upkeep`,false);}});
  if(stot>0){try{await NET.bankMulti(P.uid,P.name,share,'auto-share');}catch(e){}}
  report(`🌅 Daily reset: +${tot-stot} resources to you, ${stot} auto-shared to the alliance bank`,true);save();
  toast(`🌅 Daily income collected (${stot} auto-shared)`);}

// ---------- structures ----------
function shState(){const s=W().sh;if(s&&s.state==='building'&&Date.now()>=s.buildEnd){s.state='up';report('🏰 Your Stronghold is finished',true);setTimeout(shClaimArea,0);allianceLog(`🏰 ${P.name} finished a Stronghold`);save();}return s;}
function towerTick(){let ch=false;Object.entries(W().towers).forEach(([id,t])=>{if(t.state==='building'&&Date.now()>=t.buildEnd){t.state='up';t.online=true;ch=true;report('🗼 Tower finished at '+id,true);}});if(ch){save();drawWorld();}}
setInterval(()=>{if(P.world){shState();towerTick();}},2000);
function shCostNow(){const s=W().sh,m=s&&s.everBuilt?BAL.stronghold.rebuildMult:1;return Object.fromEntries(Object.entries(BAL.stronghold.cost).map(([k,v])=>[k,Math.round(v*m)]));}
function towerMax(){const s=W().sh;return s&&s.state!=='down'?BAL.tower.maxBase+strongholdLevel()*BAL.tower.maxPerStrongholdLevel:0;}
function placeStronghold(id){const w=W(),s=w.sh;if(!P.tiles[id])return toast('Stand on a hex you own')||'notowned';if(s&&s.state!=='down')return toast('You already have a Stronghold')||'have';
  const c=shCostNow();if(!canPay(c))return toast('Not enough resources')||'poor';pay(c);const re=s&&s.everBuilt;
  w.sh={hex:id,hpPct:1,state:'building',buildEnd:Date.now()+(re?BAL.stronghold.rebuildHours:BAL.stronghold.buildHours)*3600e3,everBuilt:true};
  allianceLog(`🏰 ${P.name} started ${re?'rebuilding':'building'} a Stronghold`);save();drawWorld();toast(re?'Rebuilding Stronghold':'Stronghold construction started');}
function placeTower(id){const w=W();if(!P.tiles[id])return toast('Stand on a hex you own');if(w.towers[id]&&w.towers[id].state!=='down')return toast('Tower already here');
  const live=Object.values(w.towers).filter(t=>t.state!=='down').length;if(live>=towerMax())return toast(towerMax()?`Max ${towerMax()} towers. Upgrade your Stronghold`:'Build a Stronghold first');
  if(!canPay(BAL.tower.cost))return toast('Not enough resources');pay(BAL.tower.cost);
  w.towers[id]={level:1,hpPct:1,state:'building',buildEnd:Date.now()+BAL.tower.buildHours*3600e3,online:true};save();drawWorld();toast('🗼 Tower construction started');}
function devFinishBuilds(){const w=W();if(w.sh&&w.sh.state==='building')w.sh.buildEnd=0;Object.values(w.towers).forEach(t=>{if(t.state==='building')t.buildEnd=0;});shState();towerTick();save();drawWorld();}

// ---------- AI raider attacks ----------
function report(text,win){W().reports.unshift({t:Date.now(),text,win});W().reports=W().reports.slice(0,80);}
function defendersFor(id){const w=W(),out=[];const s=w.sh;
  if(s&&s.state==='up'&&hexDist(s.hex,id)<=shRadius()){const st=stats();out.push({kind:'sh',id:s.hex,power:BAL.stronghold.basePower+strongholdLevel()*BAL.stronghold.powerPerLevel+Math.round((st.atk+st.def)/2)});}
  Object.entries(w.towers).forEach(([tid,t])=>{if(t.state==='up'&&t.online!==false&&hexDist(tid,id)<=towerRadius(t))out.push({kind:'tower',id:tid,power:towerPower(t)});});return out;}
// Each attacked tile: undefended = lost; defended = a real turn-based fight (raiders vs your structures), saved for replay.
function aiAttack(rnd,forcedPower,when=Date.now()){const A=BAL.ai,ids=Object.keys(P.tiles).sort();if(!ids.length)return null;
  const power=forcedPower??Math.round(A.basePower+P.lvl*A.powerPerLevel+ids.length*A.powerPerTile*(0.7+rnd()*0.6));
  const n=Math.min(ids.length,A.targetsMin+Math.floor(rnd()*(A.targetsMax-A.targetsMin+1)));const targets=[];let guard=0;
  while(targets.length<n&&guard++<200){const id=ids[Math.floor(rnd()*ids.length)];if(!targets.includes(id))targets.push(id);}
  const res={power,lost:[],held:[],destroyed:[]},fights=[];
  targets.forEach(id=>{const defs=defendersFor(id).filter(d=>{const o=d.kind==='sh'?W().sh:W().towers[d.id];return o&&o.state==='up';});
    if(!defs.length){loseTile(id);res.lost.push(id);fights.push({tile:id,f:null});return;}
    const f=runFight(defs.map(defenderUnit),raiderUnits(power)),fr={tile:id,f,destroyed:[]};
    f.A.forEach(u=>{const d=u.ref,o=d.kind==='sh'?W().sh:W().towers[d.id];if(o)o.hpPct=Math.max(0,u.hp/u.max);});
    if(f.win){res.held.push(id);addRes(BAL.ai.winLoot);}
    else{loseTile(id);res.lost.push(id);defs.forEach(d=>{if(rnd()<A.structureLossChance){destroy(d);const nm=d.kind==='sh'?'Stronghold':'Tower';res.destroyed.push(nm);fr.destroyed.push(nm);}});}
    f.A.forEach(u=>delete u.ref);f.startA.forEach(u=>delete u.ref);fights.push(fr);});
  const txt=`⚔️ Raiders attacked (power ${power}): ${res.held.length} held, ${res.lost.length} lost`+(res.destroyed.length?`, destroyed: ${res.destroyed.join(', ')}`:'');
  const w=W();w.reports.unshift({t:when,text:txt,win:res.lost.length===0,detail:res,fights});
  w.reports.forEach((r,i)=>{if(i>=5)delete r.fights;});w.unseen=[when,...(w.unseen||[])].slice(0,5);
  allianceLog(`${P.name}: ${txt}`);save();drawWorld();UI.hud();return res;}
function loseTile(id){delete P.tiles[id];W().raider[id]=Date.now();NET.claimHex(id,{by:'Raiders',ai:true,color:'#e0573a',t:Date.now()});}
function destroy(d){const w=W();if(d.kind==='sh'){w.sh.state='down';w.sh.hpPct=0;allianceLog(`💥 ${P.name}'s Stronghold was destroyed by raiders`);}else if(w.towers[d.id]){w.towers[d.id].state='down';w.towers[d.id].hpPct=0;}}
function catchUpAI(){const w=W(),A=BAL.ai,win=A.windowHours*3600e3,now=Date.now();
  if(!w.lastAi){w.lastAi=now;save();return;}
  let from=Math.max(Math.floor(w.lastAi/win)+1,Math.floor((now-A.maxCatchUpDays*864e5)/win)),to=Math.floor(now/win);
  for(let k=from;k<=to;k++){if(Object.keys(P.tiles).length<A.minTiles)continue;const rnd=seedRand(P.uid+':ai:'+k);if(rnd()<A.attackChance)aiAttack(rnd,undefined,k*win);}
  w.lastAi=now;save();}

// ---------- enemy AI strongholds ----------
function enemyAt(id){const r=seedRand('enemy:'+id);if(r()>=BAL.enemy.chancePerHex)return null;return{id,level:1+Math.floor(r()*4)};}
function enemyStats(e){const E=BAL.enemy,L=e.level+Math.floor(P.lvl/4);return{L,hp:E.hpBase+E.hpPerLevel*L,atk:E.atkBase+E.atkPerLevel*L,def:E.defBase+E.defPerLevel*L,crit:8,agi:4};}
function nearbyEnemies(){if(!G.pos)return[];const h=hexAt(...G.pos);return hexRing(h.q,h.r,BAL.enemy.scanRings).map(x=>enemyAt(x.id)).filter(e=>e&&!W().enemyTaken[e.id]&&!P.tiles[e.id]);}
function attackEnemy(id){return UI.infoFort(id);}
function _oldAttackEnemy(id){const e=enemyAt(id);if(!e)return;const [lat,lng]=hexCenter(...idQR(id)),d=distM(...G.pos,lat,lng);
  if(d>BAL.enemy.attackRangeM&&!G.dev.any)return toast(`Get within ${BAL.enemy.attackRangeM} m to attack (${Math.round(d)} m)`);
  if(P.hp<stats().hp*.5)return toast('Heal up to at least half HP first');const s=enemyStats(e);
  UI.battle({name:'Raider Stronghold',drops:{}},'enemy_fort',s.L,{hp:s.hp,atk:s.atk,def:s.def,crit:s.crit,agi:s.agi},'fort:'+id);}
function captureEnemy(id){const e=enemyAt(id),s=enemyStats(e),w=W();w.enemyTaken[id]=Date.now();
  const [q,r]=idQR(id),got=hexRing(q,r,BAL.enemy.claimRings).map(x=>x.id).filter(x=>!P.tiles[x]);got.forEach(claimTile);
  const loot=Object.fromEntries(Object.entries(BAL.enemy.loot).map(([k,v])=>[k,Math.round(v*(1+s.L*BAL.enemy.lootPerLevel))]));addRes(loot);
  const g=rollGear(P.lvl+s.L,2);P.inv.push(g);addXP(120+s.L*40);
  const txt=`🏴 ${P.name} captured a Raider Stronghold (+${got.length} hexes)`;report(txt,true);allianceLog(txt);save();drawWorld();return{loot,gear:g,hexes:got.length};}

// ---------- drawing (level of detail: CSS shows more detail as you zoom in) ----------
const tileRenderer=L.canvas({padding:.3});
const hpBar=p=>`<div class="hpb"><i style="width:${Math.round(100*p)}%;background:${p>.6?'#5fd068':p>.3?'#ffd24a':'#ff3b30'}"></i></div>`;
function drawWorld(){const g=G.layers.hex;g.clearLayers();G.layers.terr.clearLayers();if(!P.world)W();const z=map.getZoom();if(z<13)return;
  const c=map.getCenter(),h=hexAt(c.lat,c.lng),n=z>=16?8:z>=15?12:16,icons=z>=15;
  hexRing(h.q,h.r,n).forEach(x=>{const id=x.id,mine=P.tiles[id],other=G.terr[id],raider=!mine&&(P.world.raider[id]||other?.ai),t=tileInfo(id);
    if(!isVis(id)){L.polygon(hexPoly(x.q,x.r),{renderer:tileRenderer,interactive:false,stroke:false,fillColor:'#2b2620',fillOpacity:BAL.fog.opacity}).addTo(g);return;}
    let st={color:'#4a3a26',weight:.8,opacity:.28,fill:false};
    if(mine)st={color:P.color,weight:2,opacity:.85,fillColor:P.color,fillOpacity:.2};
    else if(raider)st={color:'#d63a2a',weight:1.6,opacity:.8,fillColor:'#d63a2a',fillOpacity:.18};
    else if(other&&other.uid!==P.uid)st={color:other.color||'#888',weight:1.2,opacity:.7,fillColor:other.color,fillOpacity:.14};
    else if(t.res&&t.tier!=='common')st={color:BAL.tiles.tierColor[t.tier],weight:1.4,opacity:.7,fillColor:BAL.tiles.tierColor[t.tier],fillOpacity:t.tier==='epic'?.16:.08};
    L.polygon(hexPoly(x.q,x.r),{...st,renderer:tileRenderer,interactive:false}).addTo(g);
    if(icons&&t.res)L.marker(hexCenter(x.q,x.r),{icon:L.divIcon({className:'lodm',html:`<div class="ico rt rt-${t.tier}${mine?' own':''}"><span>${RES[t.res]}</span><b class="lv">+${t.yield}</b></div>`,iconSize:[0,0]}),interactive:false}).addTo(g);});
  const s=P.world.sh,ring=k=>k*HEX_R*Math.sqrt(3)+HEX_R*.9,showRange=z>=15;
  if(s){const ll=hexCenter(...idQR(s.hex)),down=s.state==='down',L_=strongholdLevel();
    if(showRange&&!down)L.circle(ll,{radius:ring(shRadius()),color:'#d6a03a',weight:2,dashArray:'6 6',fillColor:'#d6a03a',fillOpacity:.06,interactive:false}).addTo(G.layers.terr);
    L.marker(ll,{icon:L.divIcon({className:'lodm',html:`<div class="ico st sh${down?' down':''}"><span class="emo">🏰</span><div class="art">${strongholdSVG(L_)}</div><b class="lv">${down?'RUINS':s.state==='building'?'⏳ building':'Lv'+L_}</b>${hpBar(down?0:s.hpPct??1)}<b class="nm">${P.name}'s Stronghold · range ${shRadius()}</b></div>`,iconSize:[0,0]}),zIndexOffset:400}).on('click',()=>UI.infoStruct('sh')).addTo(G.layers.terr);}
  Object.entries(P.world.towers).forEach(([id,t])=>{const ll=hexCenter(...idQR(id)),down=t.state==='down',lv=t.level||1;
    if(showRange&&!down)L.circle(ll,{radius:ring(towerRadius(t)),color:t.online===false?'#777':'#2a8fd6',weight:1.6,dashArray:'4 5',fillColor:'#2a8fd6',fillOpacity:.06,interactive:false}).addTo(G.layers.terr);
    L.marker(ll,{icon:L.divIcon({className:'lodm',html:`<div class="ico st tw${down?' down':''}"><span class="emo">🗼</span><div class="art">${towerSVG(lv)}</div><b class="lv">${down?'RUINS':t.state==='building'?'⏳':'Lv'+lv}</b>${hpBar(down?0:t.hpPct??1)}<b class="nm">Tower · power ${towerPower(t)} · ring ${towerRadius(t)}</b></div>`,iconSize:[0,0]}),zIndexOffset:300}).on('click',()=>UI.infoStruct('tower',id)).addTo(G.layers.terr);});
  nearbyEnemies().filter(e=>isVis(e.id)).forEach(e=>{const ll=hexCenter(...idQR(e.id)),es=enemyStats(e);
    L.marker(ll,{icon:L.divIcon({className:'lodm',html:`<div class="ico st enemy"><span class="emo">🏴</span><div class="art"><img src="${monImg('enemy_fort')}"></div><b class="lv">☠ Lv${es.L}</b>${hpBar(1)}<b class="nm">Raider Stronghold · tap for info</b></div>`,iconSize:[0,0]}),zIndexOffset:450}).on('click',()=>UI.infoFort(e.id)).addTo(G.layers.terr);});}
