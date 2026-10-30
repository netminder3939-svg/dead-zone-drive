// Territory world: resource tiles, GPS path claiming, daily income + alliance auto-share,
// stronghold & towers on the map, AI raider attacks (simulated from timestamps), enemy strongholds.
// All numbers live in balance.js.
const W=()=>{P.tiles=P.tiles||{};const w=P.world=P.world||{};const d={lastReset:null,lastAi:null,sh:null,towers:{},raider:{},enemyTaken:{},reports:[]};for(const k in d)if(!(k in w))w[k]=d[k];return w;};
const hexDist=(a,b)=>{const [q1,r1]=a.split('_').map(Number),[q2,r2]=b.split('_').map(Number),dq=q1-q2,dr=r1-r2;return(Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;};
const idQR=id=>id.split('_').map(Number);
const pacificDate=(t=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:BAL.reset.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const RESN2={scrap:'Scrap',food:'Food',water:'Water',fuel:'Fuel',parts:'Parts'};

// ---------- resource tiles ----------
const _tileCache={};
function tileInfo(id){if(_tileCache[id])return _tileCache[id];const T=BAL.tiles,r=seedRand('tile:'+id);let out={id,res:null};
  if(r()>=T.emptyChance){let x=r()*Object.values(T.resWeights).reduce((a,b)=>a+b,0);for(const [k,w] of Object.entries(T.resWeights)){if((x-=w)<0){out.res=k;break;}}
    const y=r();out.tier=y<T.tierChance.epic?'epic':y<T.tierChance.epic+T.tierChance.rare?'rare':'common';
    out.yield=Math.max(1,Math.round(T.dailyYield[out.tier]*T.resMult[out.res]));}
  return _tileCache[id]=out;}
function grossIncome(){const inc={scrap:0,food:0,water:0,fuel:0,parts:0};for(const id in P.tiles){const t=tileInfo(id);if(t.res)inc[t.res]+=t.yield;}return inc;}
function towerUpkeep(){const u={scrap:0,food:0,water:0,fuel:0,parts:0},n=Object.values(W().towers).filter(t=>t.state!=='down').length;for(const k in BAL.tower.upkeep)u[k]+=BAL.tower.upkeep[k]*n;return u;}
// What you'll personally net at the next reset (after the 25% alliance share and tower upkeep)
function expectedIncome(){const g=grossIncome(),u=towerUpkeep(),o={};for(const k in g){const share=Math.round(g[k]*BAL.reset.allianceShare);o[k]=g[k]-share-u[k];}return o;}

// ---------- claiming by GPS path ----------
function claimPath(prev,cur){const T=BAL.tiles,ids=new Set([hexAt(...cur).id]);
  if(prev){const d=distM(...prev,...cur);if(d<=T.maxGapM){const n=Math.ceil(d/T.pathStepM);for(let i=0;i<=n;i++){const f=i/n;ids.add(hexAt(prev[0]+(cur[0]-prev[0])*f,prev[1]+(cur[1]-prev[1])*f).id);}}}
  const fresh=[...ids].filter(id=>!P.tiles[id]);if(!fresh.length)return 0;
  fresh.forEach(claimTile);addXP(fresh.length*T.claimXP);questProg('claims',fresh.length);
  const rich=fresh.map(tileInfo).filter(t=>t.res);toast(`🚩 +${fresh.length} hex${fresh.length>1?'es':''}`+(rich.length?` (${rich.map(t=>RES[t.res]).join('')})`:''));
  save();drawWorld();UI.hud();return fresh.length;}
function claimTile(id){W();const t=Date.now();P.tiles[id]={t};delete P.world.raider[id];P.contrib.hexes++;
  NET.claimHex(id,{by:P.name,uid:P.uid,color:P.color,t});}

// ---------- daily reset ----------
async function runResets(){const w=W(),today=pacificDate();if(!w.lastReset){w.lastReset=today;save();return;}
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
function shState(){const s=W().sh;if(s&&s.state==='building'&&Date.now()>=s.buildEnd){s.state='up';report('🏰 Your Stronghold is finished',true);allianceLog(`🏰 ${P.name} finished a Stronghold`);save();}return s;}
function towerTick(){let ch=false;Object.entries(W().towers).forEach(([id,t])=>{if(t.state==='building'&&Date.now()>=t.buildEnd){t.state='up';t.online=true;ch=true;report('🗼 Tower finished at '+id,true);}});if(ch){save();drawWorld();}}
setInterval(()=>{if(P.world){shState();towerTick();}},2000);
function shCostNow(){const s=W().sh,m=s&&s.everBuilt?BAL.stronghold.rebuildMult:1;return Object.fromEntries(Object.entries(BAL.stronghold.cost).map(([k,v])=>[k,Math.round(v*m)]));}
function towerMax(){const s=W().sh;return s&&s.state!=='down'?BAL.tower.maxBase+strongholdLevel()*BAL.tower.maxPerStrongholdLevel:0;}
function placeStronghold(id){const w=W(),s=w.sh;if(!P.tiles[id])return toast('Stand on a hex you own')||'notowned';if(s&&s.state!=='down')return toast('You already have a Stronghold')||'have';
  const c=shCostNow();if(!canPay(c))return toast('Not enough resources')||'poor';pay(c);const re=s&&s.everBuilt;
  w.sh={hex:id,state:'building',buildEnd:Date.now()+(re?BAL.stronghold.rebuildHours:BAL.stronghold.buildHours)*3600e3,everBuilt:true};
  allianceLog(`🏰 ${P.name} started ${re?'rebuilding':'building'} a Stronghold`);save();drawWorld();toast(re?'Rebuilding Stronghold':'Stronghold construction started');}
function placeTower(id){const w=W();if(!P.tiles[id])return toast('Stand on a hex you own');if(w.towers[id]&&w.towers[id].state!=='down')return toast('Tower already here');
  const live=Object.values(w.towers).filter(t=>t.state!=='down').length;if(live>=towerMax())return toast(towerMax()?`Max ${towerMax()} towers. Upgrade your Stronghold`:'Build a Stronghold first');
  if(!canPay(BAL.tower.cost))return toast('Not enough resources');pay(BAL.tower.cost);
  w.towers[id]={state:'building',buildEnd:Date.now()+BAL.tower.buildHours*3600e3,online:true};save();drawWorld();toast('🗼 Tower construction started');}
function devFinishBuilds(){const w=W();if(w.sh&&w.sh.state==='building')w.sh.buildEnd=0;Object.values(w.towers).forEach(t=>{if(t.state==='building')t.buildEnd=0;});shState();towerTick();save();drawWorld();}

// ---------- AI raider attacks ----------
function report(text,win){W().reports.unshift({t:Date.now(),text,win});W().reports=W().reports.slice(0,80);}
function defendersFor(id){const w=W(),out=[];const s=w.sh;
  if(s&&s.state==='up'&&hexDist(s.hex,id)<=BAL.stronghold.radius){const st=stats();out.push({kind:'sh',id:s.hex,power:BAL.stronghold.basePower+strongholdLevel()*BAL.stronghold.powerPerLevel+Math.round((st.atk+st.def)/2)});}
  Object.entries(w.towers).forEach(([tid,t])=>{if(t.state==='up'&&t.online!==false&&hexDist(tid,id)<=BAL.tower.radius)out.push({kind:'tower',id:tid,power:BAL.tower.power});});return out;}
function aiAttack(rnd,forcedPower,when=Date.now()){const A=BAL.ai,ids=Object.keys(P.tiles).sort();if(!ids.length)return null;
  const power=forcedPower??Math.round(A.basePower+P.lvl*A.powerPerLevel+ids.length*A.powerPerTile*(0.7+rnd()*0.6));
  const n=Math.min(ids.length,A.targetsMin+Math.floor(rnd()*(A.targetsMax-A.targetsMin+1)));const targets=[];
  while(targets.length<n){const id=ids[Math.floor(rnd()*ids.length)];if(!targets.includes(id))targets.push(id);}
  // prefer defended tiles first so a test can see a defense battle
  const res={power,lost:[],held:[],destroyed:[]};
  targets.forEach(id=>{const defs=defendersFor(id);
    if(!defs.length){loseTile(id);res.lost.push(id);return;}
    const dp=defs.reduce((a,d)=>a+d.power,0),winP=dp/(dp+power);
    if(rnd()<winP){res.held.push(id);addRes(BAL.ai.winLoot);}
    else{loseTile(id);res.lost.push(id);defs.forEach(d=>{if(rnd()<A.structureLossChance){destroy(d);res.destroyed.push(d.kind==='sh'?'Stronghold':'Tower');}});}});
  const txt=`⚔️ Raiders attacked (power ${power}): ${res.held.length} held, ${res.lost.length} lost`+(res.destroyed.length?`, destroyed: ${res.destroyed.join(', ')}`:'');
  W().reports.unshift({t:when,text:txt,win:res.lost.length===0,detail:res});allianceLog(`${P.name}: ${txt}`);save();drawWorld();UI.hud();return res;}
function loseTile(id){delete P.tiles[id];W().raider[id]=Date.now();NET.claimHex(id,{by:'Raiders',ai:true,color:'#e0573a',t:Date.now()});}
function destroy(d){const w=W();if(d.kind==='sh'){w.sh.state='down';allianceLog(`💥 ${P.name}'s Stronghold was destroyed by raiders`);}else if(w.towers[d.id])w.towers[d.id].state='down';}
function catchUpAI(){const w=W(),A=BAL.ai,win=A.windowHours*3600e3,now=Date.now();
  if(!w.lastAi){w.lastAi=now;save();return;}
  let from=Math.max(Math.floor(w.lastAi/win)+1,Math.floor((now-A.maxCatchUpDays*864e5)/win)),to=Math.floor(now/win);
  for(let k=from;k<=to;k++){if(Object.keys(P.tiles).length<A.minTiles)continue;const rnd=seedRand(P.uid+':ai:'+k);if(rnd()<A.attackChance)aiAttack(rnd,undefined,k*win);}
  w.lastAi=now;save();}

// ---------- enemy AI strongholds ----------
function enemyAt(id){const r=seedRand('enemy:'+id);if(r()>=BAL.enemy.chancePerHex)return null;return{id,level:1+Math.floor(r()*4)};}
function enemyStats(e){const E=BAL.enemy,L=e.level+Math.floor(P.lvl/4);return{L,hp:E.hpBase+E.hpPerLevel*L,atk:E.atkBase+E.atkPerLevel*L,def:E.defBase+E.defPerLevel*L,crit:8,agi:4};}
function nearbyEnemies(){if(!G.pos)return[];const h=hexAt(...G.pos);return hexRing(h.q,h.r,BAL.enemy.scanRings).map(x=>enemyAt(x.id)).filter(e=>e&&!W().enemyTaken[e.id]&&!P.tiles[e.id]);}
function attackEnemy(id){const e=enemyAt(id);if(!e)return;const [lat,lng]=hexCenter(...idQR(id)),d=distM(...G.pos,lat,lng);
  if(d>BAL.enemy.attackRangeM&&!G.dev.any)return toast(`Get within ${BAL.enemy.attackRangeM} m to attack (${Math.round(d)} m)`);
  if(P.hp<stats().hp*.5)return toast('Heal up to at least half HP first');const s=enemyStats(e);
  UI.battle({name:'Raider Stronghold',drops:{}},'enemy_fort',s.L,{hp:s.hp,atk:s.atk,def:s.def,crit:s.crit,agi:s.agi},'fort:'+id);}
function captureEnemy(id){const e=enemyAt(id),s=enemyStats(e),w=W();w.enemyTaken[id]=Date.now();
  const [q,r]=idQR(id),got=hexRing(q,r,BAL.enemy.claimRings).map(x=>x.id).filter(x=>!P.tiles[x]);got.forEach(claimTile);
  const loot=Object.fromEntries(Object.entries(BAL.enemy.loot).map(([k,v])=>[k,Math.round(v*(1+s.L*BAL.enemy.lootPerLevel))]));addRes(loot);
  const g=rollGear(P.lvl+s.L,2);P.inv.push(g);addXP(120+s.L*40);
  const txt=`🏴 ${P.name} captured a Raider Stronghold (+${got.length} hexes)`;report(txt,true);allianceLog(txt);save();drawWorld();return{loot,gear:g,hexes:got.length};}

// ---------- drawing ----------
const tileRenderer=L.canvas({padding:.3});
function drawWorld(){const g=G.layers.hex;g.clearLayers();G.layers.terr.clearLayers();if(!P.world)W();const z=map.getZoom();if(z<13)return;
  const c=map.getCenter(),h=hexAt(c.lat,c.lng),n=z>=16?8:z>=15?12:16,icons=z>=15;
  hexRing(h.q,h.r,n).forEach(x=>{const id=x.id,mine=P.tiles[id],other=G.terr[id],raider=!mine&&(P.world.raider[id]||other?.ai),t=tileInfo(id);
    let st={color:'#d6a03a',weight:.7,opacity:.3,fill:false};
    if(mine)st={color:P.color,weight:1.4,opacity:.9,fillColor:P.color,fillOpacity:.22};
    else if(raider)st={color:'#e0573a',weight:1.2,opacity:.8,fillColor:'#e0573a',fillOpacity:.18};
    else if(other&&other.uid!==P.uid)st={color:other.color||'#888',weight:1,opacity:.7,fillColor:other.color,fillOpacity:.14};
    else if(t.res)st={color:BAL.tiles.tierColor[t.tier],weight:t.tier==='common'?.7:1.3,opacity:t.tier==='common'?.35:.7,fillColor:BAL.tiles.tierColor[t.tier],fillOpacity:t.tier==='epic'?.12:.05};
    L.polygon(hexPoly(x.q,x.r),{...st,renderer:tileRenderer,interactive:false}).addTo(g);
    if(icons&&t.res)L.marker(hexCenter(x.q,x.r),{icon:L.divIcon({className:'rt rt-'+t.tier+(mine?' own':''),html:RES[t.res],iconSize:[22,22]}),interactive:false}).addTo(g);});
  // structures with range
  const s=P.world.sh,ring=k=>k*HEX_R*Math.sqrt(3)+HEX_R*.9;
  if(s){const ll=hexCenter(...idQR(s.hex)),down=s.state==='down';
    L.circle(ll,{radius:ring(BAL.stronghold.radius),color:down?'#777':'#d6a03a',weight:2,dashArray:'6 6',fillOpacity:.04,interactive:false}).addTo(G.layers.terr);
    L.marker(ll,{icon:L.divIcon({className:'struct'+(down?' down':''),html:`🏰<b>${down?'RUINS':s.state==='building'?'⏳':'Lv'+strongholdLevel()}</b>`,iconSize:[44,44]}),zIndexOffset:400}).on('click',()=>UI.open('base')).addTo(G.layers.terr);}
  Object.entries(P.world.towers).forEach(([id,t])=>{if(t.state==='down')return;const ll=hexCenter(...idQR(id));
    L.circle(ll,{radius:ring(BAL.tower.radius),color:t.online===false?'#777':'#4ad7ff',weight:1.5,dashArray:'4 5',fillOpacity:.05,interactive:false}).addTo(G.layers.terr);
    L.marker(ll,{icon:L.divIcon({className:'struct small',html:`🗼${t.state==='building'?'<b>⏳</b>':''}`,iconSize:[34,34]}),zIndexOffset:300}).addTo(G.layers.terr);});
  nearbyEnemies().forEach(e=>{const ll=hexCenter(...idQR(e.id));
    L.marker(ll,{icon:L.divIcon({className:'struct enemy',html:`<img src="${monImg('enemy_fort')}"><b>Lv${enemyStats(e).L}</b>`,iconSize:[52,52]}),zIndexOffset:450}).on('click',()=>attackEnemy(e.id)).addTo(G.layers.terr);});}
