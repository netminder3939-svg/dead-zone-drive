// v12: SHARED HORDE + MARCH.
// Shared horde: one Firestore doc per alliance (meta/horde) holds the gang state. Every phone simulates from the same
// team seed; whichever phone is furthest ahead publishes, everyone else adopts it. 1 doc listener = ~1 read per update.
// March: send a frozen copy of your fighter to any hex. Server-clock timers (serverTimestamp start, arrival=start+dur).
// Every phone draws flags from {from,to,startT,dur}: no positions are streamed.
BAL.march={secPerHex:40,minSec:120,maxSec:3*3600,maxActive:2,neutralLoot:{scrap:4},interceptLoot:{scrap:10,parts:1}};
const MARCH_M_PER_HEX=()=>HEX_R*Math.sqrt(3); // all distance math comes from the single HEX_R constant in hex.js

// ---------- net layer (added to both nets, net.js untouched) ----------
Object.assign(LocalNet.prototype,{
  onHorde(f){this._hcb=f;const x=localStorage.getItem('wl_horde_'+(this.team||'local'));if(x)f(JSON.parse(x));},
  async pushHorde(fx){localStorage.setItem('wl_horde_'+(this.team||'local'),JSON.stringify({last:fx.last,fx:JSON.stringify(fx)}));return null;},
  _ml(){return JSON.parse(localStorage.getItem('wl_marches')||'{}');},_ms(o){localStorage.setItem('wl_marches',JSON.stringify(o));(this._mcb||[]).forEach(f=>f(o));},
  onMarches(f){(this._mcb=this._mcb||[]).push(f);f(this._ml());},
  async addMarch(m){const o=this._ml(),id='m'+Date.now();o[id]={...m,startT:Date.now()};this._ms(o);return id;},
  async updMarch(id,d){const o=this._ml();if(!o[id])return;Object.assign(o[id],d);if(d.state==='done')delete o[id];this._ms(o);},
  async srvNow(){return Date.now();},
  async escortMarch(id,uid,e){const o=this._ml();if(!o[id])return;o[id].escorts={...(o[id].escorts||{}),[uid]:e};this._ms(o);}});
Object.assign(FirebaseNet.prototype,{
  onHorde(f){const fs=this.fs;fs.onSnapshot(fs.doc(this.db,...this.base,'meta','horde'),d=>{if(d.exists())f(d.data());});},
  async pushHorde(fx){const fs=this.fs,ref=fs.doc(this.db,...this.base,'meta','horde');let newer=null;
    await fs.runTransaction(this.db,async tx=>{const d=await tx.get(ref);if(d.exists()&&(d.data().last||0)>=fx.last){newer=d.data();return;}
      tx.set(ref,{last:fx.last,fx:JSON.stringify(fx),by:this.uid,t:fs.serverTimestamp()});});return newer;},
  onMarches(f){const fs=this.fs;fs.onSnapshot(fs.query(this.col('marches'),fs.where('state','in',['out','arrived'])),s=>{const o={};
    s.forEach(d=>{const v=d.data();o[d.id]={...v,startT:v.startT&&v.startT.toMillis?v.startT.toMillis():(v.localT||Date.now())};});f(o);});},
  async addMarch(m){const fs=this.fs,ref=await fs.addDoc(this.col('marches'),{...m,startT:fs.serverTimestamp()});return ref.id;},
  async updMarch(id,d){return this.fs.updateDoc(this.fs.doc(this.col('marches'),id),d);},
  // honest server clock: write a serverTimestamp and read it back (1 write + 1 read, only when a timer finishes)
  async srvNow(){const fs=this.fs,ref=fs.doc(this.col('clock'),this.uid);await fs.setDoc(ref,{t:fs.serverTimestamp()});const d=await fs.getDoc(ref);return d.data().t.toMillis();},
  async escortMarch(id,uid,e){return this.fs.updateDoc(this.fs.doc(this.col('marches'),id),{['escorts.'+uid]:e});}});

// ---------- shared horde ----------
const HS={remoteLast:-1,t:null};
function adoptHorde(doc){if(!doc||!P.world)return;HS.remoteLast=Math.max(HS.remoteLast,doc.last||0);const fx=FX();if((doc.last||0)<=(fx.last||-1))return;
  try{const r=JSON.parse(doc.fx);r.takes=fx.takes||{};P.world.fx=r;fxDirty();save();drawWorld();}catch(e){console.error(e);}}
function publishHorde(){clearTimeout(HS.t);HS.t=setTimeout(async()=>{const fx=FX();if(!fx.start||fx.last<=HS.remoteLast)return;
  // v20 guard: a phone with its clock set ahead would publish a far-future tick, and the rules then refuse every other phone's update forever.
  try{if(G.srvOff==null){const srv=await withTO(NET.srvNow());G.srvOff=srv-Date.now();}const step=BAL.horde.stepMin*60e3;if(fx.last*step>Date.now()+G.srvOff+10*60e3){console.warn('horde publish skipped: device clock ahead of server');return;}}catch(e){return;}
  try{const {takes,...pub}=fx;const newer=await NET.pushHorde(pub);if(newer)adoptHorde(newer);else HS.remoteLast=fx.last;}catch(e){console.warn('horde publish',e);}},2500);}
const _fcu=factionCatchUp;factionCatchUp=function(q){_fcu(q);publishHorde();};

// ---------- march math ----------
const nowS=()=>Date.now()+(G.srvOff||0);
// v20 fix: honest speed. The old Math.min(maxSec,...) clamp made far marches FASTER per hex (any distance = 3 h),
// and path claims turned that into hundreds of free hexes. Now time = hexes x secPerHex, and canMarch refuses targets past maxHexes.
BAL.march.maxHexes=Math.floor(BAL.march.maxSec/BAL.march.secPerHex);
function marchDur(from,to){const M=BAL.march;return Math.round(Math.max(M.minSec,hexDist(from,to)*M.secPerHex))*1000;}
function marchTrack(from,to){const n=Math.max(1,hexDist(from,to)),a=hexCenter(...idQR(from)),b=hexCenter(...idQR(to)),ids=[];
  for(let i=0;i<=n;i++){const t=i/n,id=hexAt(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t).id;if(ids[ids.length-1]!==id)ids.push(id);}return ids;}
function frozenMe(){const u=playerUnit();return{name:P.name,color:P.color,hp:stats().hp,max:stats().hp,atk:u.atk,def:u.def,agi:u.agi,crit:u.crit};}
function unitPower(u){return Math.round(u.atk*2+u.def+u.max/10);}
function marchUnits(m){return[{...m.unit,me:m.uid===P.uid},...Object.values(m.escorts||{}).map(e=>e.unit)].map(u=>mkUnit({...u,hp:u.max,emoji:'🚩'}));}
function myMarches(){return Object.entries(G.marches||{}).filter(([,m])=>m.uid===P.uid);}
function marchPhase(m,t=nowS()){const a=m.startT+m.dur,b=a+m.dur;return t<a?['out',(t-m.startT)/m.dur]:t<b?['back',(t-a)/m.dur]:['home',1];}
// first horde squad whose trail or planned path crosses the march track (deterministic, no rolls)
function interceptor(m){const fx=P.world&&P.world.fx;if(!fx||!fx.f)return null;const tr=new Set(marchTrack(m.from,m.to));
  for(const [fid,f] of Object.entries(fx.f).sort()){if(f.routedUntil)continue;for(const s of f.squads||[]){const hit=[s.pos,...(s.trail||[]),...(s.path||[])].find(id=>tr.has(id));
    if(hit)return{fid,f,s,hex:hit};}}return null;}
function bandUnit(name,p){const A=BAL.ai;return mkUnit({name:`${name} (power ${p})`,img:'assets/monsters/raider.svg',hp:Math.max(1,p*A.hpPerPower),atk:Math.max(1,p*A.atkPerPower),def:0,crit:0,agi:0});}
function marchTarget(id){if(enemyAt(id)&&!W().enemyTaken[id])return{kind:'fort',units:[],loot:{}};const x=factionAt(id);if(x)return{kind:'faction',units:factionUnits(id),loot:BAL.factions.retakeLoot};
  const o=G.terr[id];if(W().raider[id]||(o&&o.ai))return{kind:'raider',units:[bandUnit('Raider holdout',raidPower(Object.keys(P.tiles).length))],loot:BAL.ai.winLoot};
  return{kind:'open',units:[],loot:BAL.march.neutralLoot};}
function friendlyHex(id){const o=G.terr[id];return !!(P.tiles[id]||(o&&!o.ai&&!o.released&&o.uid));}
// v19.2: a wandering horde mob (map mutant) sitting on a hex, if not already killed
function mobAt(id){return (G.monList||[]).find(m=>m.key.split('@')[0]===id&&!P.killed[m.key])||null;}
// v19.1: squad sitting on a hex (deterministic, from the shared horde)
function squadAt(id){const fx=P.world&&P.world.fx;if(!fx||!fx.f)return null;for(const [fid,f] of Object.entries(fx.f).sort()){if(f.routedUntil)continue;for(const s of f.squads||[])if(s.pos===id)return{fid,sid:s.id};}return null;}
function canMarch(id){const fr=friendlyHex(id); // v19.1: own / ally hexes can be targeted (fight a squad there; empty = patrol, no claim)
  if(enemyAt(id)&&!W().enemyTaken[id])return'Enemy fort: attack it in person';if(myMarches().length>=BAL.march.maxActive)return`Max ${BAL.march.maxActive} marches at a time`;
  if(!fr&&claimsToday().n>=BAL.tiles.dailyClaimCap)return`Daily claim limit reached (${BAL.tiles.dailyClaimCap})`;if(!G.pos)return'Waiting for GPS';const d=hexDist(marchFrom(),id);if(d>BAL.march.maxHexes)return`Too far: ${d} hexes (max ${BAL.march.maxHexes})`;return null;}
function findSquad(fid,sid){const f=(FX().f||{})[fid];if(!f||f.routedUntil)return null;const s=(f.squads||[]).find(x=>x.id===sid);return s?{f,s}:null;}
function marchFrom(){const h=hexAt(...G.pos).id;return h;}

// ---------- send / escort / resolve ----------
async function sendMarch(to,opt){opt=opt||{};if(!opt.kind&&friendlyHex(to)){const sq=squadAt(to);const mb=sq?null:mobAt(to);opt=sq?{kind:'intercept',fid:sq.fid,sid:sq.sid}:mb?{kind:'mob',mid:mb.mid,lvl:mb.lvl,key:mb.key}:{kind:'patrol'};}const why=(opt.kind==='intercept'||opt.kind==='mob')?(myMarches().length>=BAL.march.maxActive?`Max ${BAL.march.maxActive} marches at a time`:!G.pos?'Waiting for GPS':null):canMarch(to);if(why)return toast('🚫 '+why);const from=marchFrom(),dur=marchDur(from,to),unit=frozenMe();
  if(!opt.kind)claimsToday().n++;save();const localT=Date.now();
  const id=await NET.addMarch({uid:P.uid,name:P.name,color:P.color,flag:P.flag||null,from,to,dur,unit,power:unitPower(unit),escorts:{},state:'out',localT,...(opt.kind==='intercept'?{kind:'intercept',fid:opt.fid,sid:opt.sid}:opt.kind==='patrol'?{kind:'patrol'}:opt.kind==='mob'?{kind:'mob',mid:opt.mid,lvl:opt.lvl,key:opt.key}:{})});
  UI.closeModal();toast(`🚩 March sent · arrives in ${fmtDur(dur)}`);G._mSent=G._mSent||{};G._mSent[id]=localT;showMarch({from,to});}
async function escortMarch(id){const m=G.marches[id];if(!m||m.uid===P.uid||marchPhase(m)[0]!=='out')return;const u=frozenMe();
  await NET.escortMarch(id,P.uid,{name:P.name,unit:u,power:unitPower(u)});allianceLog(`🛡️ ${P.name} escorted ${poss(m.name)} march`);UI.closeModal();toast('🛡️ Escort joined: your power is added');}
const withTO=(pr,ms=8000)=>Promise.race([pr,new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),ms))]);
// One clock probe at a time. After a failure the next try waits 15s, then 30s, then 60s.
// A listen-stream warning does not enter this path. A failed probe must not run again
// on the next 1s march tick, and two callers must not write the clock twice.
function netBackoffMs(fails){return Math.min(60000,15000*(2**Math.max(0,(fails|0)-1)));}
function armNetFail(e){if(e&&e._netArmed)return e;if(e)try{e._netArmed=1;}catch(x){}
  G._netFail=(G._netFail||0)+1;G._netNext=Date.now()+netBackoffMs(G._netFail);netState(false);return e;}
let _probe=null,_recover=null;
function clockProbe(){
  if(G._netNext&&Date.now()<G._netNext){const e=new Error('backoff');e.backoff=1;e._netArmed=1;return Promise.reject(e);}
  if(_probe)return _probe;
  _probe=(async()=>{try{const t=await withTO(NET.srvNow(),8000);G.srvOff=t-Date.now();G._netFail=0;G._netNext=0;netState(true);return t;}
    catch(e){throw armNetFail(e);}finally{_probe=null;}})();
  return _probe;
}
async function resolveMarch(id,m){if(G.netOk===false)return;if(G._netNext&&Date.now()<G._netNext)return;if(G._mBusy[id])return;G._mBusy[id]=1;try{
  let srv;try{srv=await clockProbe();}catch(e){if(e&&e.backoff)return;throw e;}if(srv<m.startT+m.dur)return; // honest server clock check
  const units=marchUnits(m),ic=interceptor(m),out={state:'arrived'};let f;
  if(ic){const sp=squadPower(ic.f,ic.s,srv),d=fdef(ic.fid);f=runFight(marchUnits(m),[bandUnit(d.name+' squad',sp)]);
    out.intercept={gang:d.name,hex:ic.hex,power:sp,win:f.win};if(!f.win){out.win=false;out.loot={};out.result=`☠️ Intercepted by the ${d.name} near ${hexName(ic.hex)}. March lost.`;}}
  let apply=()=>{if(m.kind!=='intercept'&&m.kind!=='patrol'&&m.kind!=='mob'){const cd=claimsToday();cd.n=Math.max(0,cd.n-1);}}; // B12: lost on the way -> give back the reserved claim
  if(out.win!==false&&m.kind==='intercept'){const tg=findSquad(m.fid,m.sid);
    if(!tg){out.win=true;out.loot={};out.result='The squad was gone when your march arrived (routed or back at base).';}
    else{const sp=squadPower(tg.f,tg.s,srv),d=fdef(m.fid);f=runFight(marchUnits(m),[bandUnit(d.name+' squad',sp)]);out.win=f.win;out.kind='intercept';out.loot=f.win?{...BAL.march.interceptLoot}:{};
      out.result=f.win?`⚔️ Caught the ${d.name} squad near ${hexName(tg.s.pos)} and beat it. It retreats wounded to its base and rests.<br><b>Squad beaten, but the hex is still the horde's.</b> Beating a squad on the move never takes land: attack or claim the hex to take it.`:`💀 The ${d.name} squad (power ${sp}) beat your march.`;
      if(f.win)apply=()=>{const H=HB();tg.s.woundUntil=srv+H.woundHours*3600e3;tg.s.path=[];tg.s.trail=[];tg.s.pos=nearestBase(tg.f,tg.s.pos);tg.s.moved=0;tg.s.restUntil=srv+H.retreatHours*3600e3;save();publishHorde();drawWorld();};}}
  else if(out.win!==false&&m.kind==='mob'){const M=MONSTERS[m.mid];out.kind='mob';out.claimed=[];apply=()=>{};
    if(!M||(m.uid===P.uid&&P.killed[m.key])){out.win=true;out.loot={};out.result=`The ${M?M.name:'mutant'} was already gone when your march reached ${hexName(m.to)}.`;}
    else{f=runFight(marchUnits(m),mutantUnits(m.mid,m.lvl));out.win=f.win;out.loot={};out.result=f.win?`⚔️ Your march beat the Lv${m.lvl} ${M.name} on ${hexName(m.to)}. No claim, nothing used.`:`💀 The Lv${m.lvl} ${M.name} beat your march on ${hexName(m.to)}.`;
      if(f.win&&m.uid===P.uid)apply=()=>{const g=battleWin(m.mid,m.lvl,m.key);if(g)out.result+=` Gear: ${g.name}.`;};}}
  else if(out.win!==false&&m.kind==='patrol'){out.win=true;out.kind='patrol';out.loot={};out.claimed=[];out.result=`🛡️ Patrol reached ${hexName(m.to)}: nothing to fight there. No claim, nothing used.`;apply=()=>{};}
  else if(out.win!==false){
    // v16 (J1): every hex on the path, in order. Own/ally hexes are skipped; defenders fight first; stop at the first loss or when the 40/day cap runs out.
    // v26-11: exact hex line, and skip only real ownership. A guarded pipeline is not "already ours".
    const path=(typeof claimRoute26==='function'?claimRoute26(m.from,m.to):marchTrack(m.from,m.to)).slice(1),got=[],loot={};let lost=null,capHit=false,last=null;const cap=BAL.tiles.dailyClaimCap,cd=claimsToday();let room=cap-cd.n+1; // +1 = the claim reserved at send
    for(const hx of path){if(typeof claimSkip26==='function'?claimSkip26(hx):allied(hx))continue;if(room<=0){capHit=true;break;}const tg=marchTarget(hx);if(tg.kind==='fort')continue;let f2=null;if(tg.units.length){f2=runFight(marchUnits(m),tg.units);last=f2;}
      if(f2&&!f2.win){lost=hx;break;}got.push(hx);room--;for(const[k,v] of Object.entries(tg.loot||{}))loot[k]=(loot[k]||0)+v;}
    f=last||f;out.win=!lost;out.kind='path';out.claimed=got;if(ic&&out.win)for(const[k,v] of Object.entries(BAL.march.interceptLoot))loot[k]=(loot[k]||0)+v;out.loot=got.length||ic?loot:{};
    if(lost&&got.length)out.win=true; // partial success keeps the hexes it took and its loot
    out.result=(ic?`⚔️ Fought off the ${fdef(ic.fid).name} on the way. `:'')+(got.length?`🚩 Claimed ${pl(got.length,'hex','hexes')} along the path.`:'')+(lost?` 💀 Stopped by defenders at ${hexName(lost)}.`:'')+(capHit?` 🚫 Daily claim limit reached (${cap}).`:'')+(!got.length&&!lost&&!capHit?'Nothing new to claim on this path.':'');
    apply=()=>{for(const hx of got){const x=factionAt(hx);if(x){delete x.f.tiles[hx];if(x.f.outposts)delete x.f.outposts[hx];fxDirty();}claimTile(hx);}cd.n=Math.max(0,cd.n-1); /* release the slot reserved at send; claimTile counted each hex */if(got.some(h=>true))publishHorde();};}
  P.marchDone=P.marchDone||{};if(!P.marchDone[id]){P.marchDone[id]=1;apply();save();} // v17 B2: apply locally FIRST (once), then write
  await withTO(NET.updMarch(id,out));Object.assign(m,out);save();drawWorld();drawMarches();
  marchNote(out.kind==='intercept'?out.result:out.win?out.result:`💀 March lost: ${out.result}`,out.win);
  if(ic)UI.raidAlert(`Raiders intercepted ${poss(m.name)} march!`,ic.hex);
  if(f)UI.replay({title:`🚩 March to ${hexName(m.to)}`,sub:out.result,f,good:out.win,result:out.result+(out.win&&Object.keys(out.loot).length?`<br>Loot banks when the march gets home (${fmtDur(m.startT+2*m.dur-srv)}).`:''),buttons:[['Continue',()=>UI.closeModal(),'big']]});
  }catch(e){console.warn('march',e);armNetFail(e);if(!G._mErrT||Date.now()-G._mErrT>30000){G._mErrT=Date.now();toast('📡 March arrived but the server isn\'t reachable yet. Retrying…');}}finally{delete G._mBusy[id];}}
async function returnMarch(id,m){if(G.netOk===false)return;if(G._netNext&&Date.now()<G._netNext)return;if(G._mBusy[id])return;G._mBusy[id]=1;try{let srv;try{srv=await clockProbe();}catch(e){if(e&&e.backoff)return;throw e;}if(srv<m.startT+2*m.dur)return;
  P.marchPaid=P.marchPaid||{};if(m.win&&m.loot&&Object.keys(m.loot).length&&!P.marchPaid[id]){P.marchPaid[id]=1;const s0=typeof txSnap==='function'?txSnap():null;addRes(m.loot,1,true);if(s0)txAdd('march',`🚩 March loot (${hexName(m.to)})`,txDelta(s0));marchNote('🏠 March home: '+Object.entries(m.loot).map(([k,v])=>v+RES[k]).join(' '));}
  await withTO(NET.updMarch(id,{state:'done'}));m.state='done';delete G.marches[id];if(G.followMarch===id)G.followMarch=null;drawMarches();save();UI.hud();}catch(e){console.warn(e);armNetFail(e);}finally{delete G._mBusy[id];}}
G._mBusy={};
function marchTick(){const t=nowS();for(const [id,m] of myMarches()){if(m.state==='out'&&t>=m.startT+m.dur)resolveMarch(id,m);else if(m.state==='arrived'&&t>=m.startT+2*m.dur)returnMarch(id,m);}drawMarchFlags();}

// ---------- drawing (v15: game-style banner flag, pill timer, outlined animated track, target ring) ----------
function flagSVG(c){return`<svg width="40" height="44" viewBox="0 0 40 44"><rect x="6" y="3" width="3.5" height="39" rx="1.5" fill="#2a2118" stroke="#000" stroke-width="1"/><circle cx="7.7" cy="3.5" r="3" fill="#ffd24a" stroke="#000" stroke-width="1"/><path d="M9.5 6 L36 6 L30 14 L36 22 L9.5 22 Z" fill="${c}" stroke="#111" stroke-width="2" stroke-linejoin="round"/><path d="M9.5 6 L36 6 L33 10 L9.5 10 Z" fill="#fff" opacity=".25"/><ellipse cx="8" cy="42" rx="6" ry="1.8" fill="#000" opacity=".45"/></svg>`;}
function drawMarches(){if(typeof map==='undefined')return;if(!G.layers.march)G.layers.march=L.layerGroup().addTo(map);const g=G.layers.march;g.clearLayers();G._flags={};
  for(const [id,m] of Object.entries(G.marches||{})){if(m.state==='done'||(m.state==='arrived'&&m.win===false)||marchPhase(m)[0]==='home')continue; /* v19.2: never animate a march whose time is up */const a=hexCenter(...idQR(m.from)),b=hexCenter(...idQR(m.to)),c=((G.al&&G.al.members||{})[m.uid]||{}).color||m.color||allianceColor(); /* v19: member color */
    L.polyline([a,b],{color:'#120d08',weight:10,opacity:.55,lineCap:'round',interactive:false}).addTo(g);
    L.polyline([a,b],{color:c,weight:5,opacity:1,dashArray:'12 10',lineCap:'round',className:'mtrack',interactive:false}).addTo(g);
    L.circle(b,{radius:HEX_R*0.75,color:c,weight:4,opacity:.95,fillColor:c,fillOpacity:.18,dashArray:'6 6',className:'mring',interactive:false}).addTo(g);
    L.circleMarker(b,{radius:5,color:'#111',weight:2,fillColor:c,fillOpacity:1,interactive:false}).addTo(g);
    const n=Object.keys(m.escorts||{}).length;
    G._flags[id]=L.marker(a,{icon:L.divIcon({className:'mflagw',html:`<div class="mflag2"><div class="mbadge">${m.troops?`<b class="mtr">⚔ ${m.troops.toLocaleString()}</b> · `:''}<span class="mt">--:--</span>${n?`<i>🛡️${n}</i>`:''}${m.uid!==P.uid?`<i class="mwho" style="color:${c}">${m.name}</i>`:''}</div>${flagSVG(c,m.flag)}</div>`,iconSize:[44,74],iconAnchor:[8,72]}),zIndexOffset:900})
      .on('click',()=>{G.followMarch=G.followMarch===id?null:id;toast(G.followMarch?'📍 Following march (drag map to stop)':'Stopped following');if(G.followMarch)map.panTo(G._flags[id].getLatLng());UI.infoMarch(id);}).addTo(g);}
  drawMarchFlags();}
if(typeof map!=='undefined')map.on('dragstart',()=>{G.followMarch=null;});
function drawMarchFlags(){for(const [id,mk] of Object.entries(G._flags||{})){const m=G.marches[id];if(!m||marchPhase(m)[0]==='home'){drawMarches();return;} /* v19.2: line, flag and HUD all follow the same clock */const [ph,p]=marchPhase(m),a=hexCenter(...idQR(m.from)),b=hexCenter(...idQR(m.to));
  const t=ph==='out'?p:ph==='back'?1-p:0,ll=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];mk.setLatLng(ll);if(G.followMarch===id)map.panTo(ll,{animate:false});
  const el=mk.getElement&&mk.getElement(),lb=el&&el.querySelector('.mt');if(lb){const now=nowS(),mmss=ms=>{const x=Math.max(0,Math.ceil(ms/1000));return Math.floor(x/60)+':'+String(x%60).padStart(2,'0');};
    lb.textContent=now<m.startT+m.dur?'⏱ '+mmss(m.startT+m.dur-now):now<m.startT+2*m.dur?(m.state==='out'?'Returning…':'Returning '+mmss(m.startT+2*m.dur-now)):'Home';}}}
// keep a new march in view, clear of the HUD (top bar + right-side buttons)
function showMarch(m){try{const a=hexCenter(...idQR(m.from)),b=hexCenter(...idQR(m.to)),bd=map.getBounds().pad(-0.15);if(bd.contains(a)&&bd.contains(b))return; /* both ends already on screen: leave the map alone */map.fitBounds([a,b],{paddingTopLeft:[30,190],paddingBottomRight:[100,150],maxZoom:map.getZoom()});}catch(e){}} // never zooms in
UI.infoMarch=function(id){const m=G.marches[id];if(!m)return;const [ph]=marchPhase(m),t=nowS(),mine=m.uid===P.uid,tot=m.power+Object.values(m.escorts||{}).reduce((a,e)=>a+e.power,0);
  this.info({title:`🚩 ${poss(m.name)} march`,sub:ph==='out'?`Arrives in ${fmtDur(m.startT+m.dur-t)}`:ph==='back'?`Heading home · ${fmtDur(m.startT+2*m.dur-t)}`:'Home',diff:[`POWER ${tot}`,m.color],
    body:`<div class="row"><div class="grow">Target: ${hexName(m.to)}<small>${Object.values(m.escorts||{}).map(e=>'🛡️ '+e.name).join(' · ')||'No escorts yet'}</small>${m.result?`<small>${m.result}</small>`:''}</div></div>`,
    buttons:!mine&&ph==='out'&&!(m.escorts||{})[P.uid]?[['🛡️ Escort (add my power)',()=>escortMarch(id),'fight']]:[]});};
UI.raidAlert=function(msg,hex){const d=document.createElement('div');d.className='raidalert';d.innerHTML=`<b>⚠️ RAID ALERT</b><span>${msg}</span>`;d.onclick=()=>d.remove();document.body.appendChild(d);setTimeout(()=>d.remove(),6000);
  if(hex&&typeof map!=='undefined'){const c=L.circle(hexCenter(...idQR(hex)),{radius:HEX_R*2,color:'#ff2a2a',weight:4,fillOpacity:.25,className:'raidpulse'}).addTo(map);setTimeout(()=>c.remove(),8000);}};

// ---------- tile menu: March option ----------
const _infoTileM=UI.infoTile;UI.infoTile=function(id){_infoTileM.call(this,id);if(!G.pos)return;addMarchBtn(id);};
const _infoFacM=UI.infoFaction;UI.infoFaction=function(id){_infoFacM.call(this,id);addMarchBtn(id);};
// v19.2: a mob's Fight card offers March when the mob sits on your own or an ally's hex
const _infoMonM=UI.infoMon;UI.infoMon=function(mid,lvl,key,lat,lng){_infoMonM.apply(this,arguments);try{const id=key.split('@')[0];if(G.pos&&friendlyHex(id))addMarchBtn(id);}catch(e){}};
function addMarchBtn(id){const box=document.querySelector('#modalBody .ibtns');if(!box)return;const why=canMarch(id),from=marchFrom(),dur=marchDur(from,id),tg=marchTarget(id);
  const mb=friendlyHex(id)&&!squadAt(id)?mobAt(id):null,p=mb?predict(()=>marchUnits({unit:frozenMe(),escorts:{}}),()=>mutantUnits(mb.mid,mb.lvl)):tg.units.length?predict(()=>marchUnits({unit:frozenMe(),escorts:{}}),()=>marchTarget(id).units):null;
  const b=document.createElement('button');b.className='fight';b.id='btnMarch';b.disabled=!!why;
  b.innerHTML=`🚩 March · ${fmtDur(dur)} there, ${fmtDur(dur)} back${why?`<br><small>${why}</small>`:`<br><small>${friendlyHex(id)?(squadAt(id)?'Fight the squad there · no claim':mb?`Fight the Lv${mb.lvl} ${MONSTERS[mb.mid].name} there · no claim`:'Patrol your own hex · no fight, no claim'):tg.kind==='open'?'Claim this open ground':'Fight on arrival'}${p?(p.win?' · ✅ likely win':' · ❌ likely loss'):''}${friendlyHex(id)?'':' · '+pathTxt(from,id)}</small>`}`;
  oneTap(b,()=>sendMarch(id));box.prepend(b);}

// ---------- boot hooks ----------
// v14 FIX: returning players' page registers the ORIGINAL boot() on DOMContentLoaded before this file loads, so a boot
// wrapper never ran for them (no flags/tracks, no shared horde). Hook NET.onRaids instead: boot() always calls it after login.
let _marchOn=false;function marchInit(){if(_marchOn)return;_marchOn=true;try{uidCheck();watchMapMeta();if(NET.mode==='firebase'){const b=document.querySelector('#devbar [data-dev="daily"]');if(b)b.remove();}syncOwned();}catch(e){console.warn(e);}NET.onHorde&&NET.onHorde(adoptHorde);
  NET.onMarches(o=>{for(const [id,m] of Object.entries(o)){const s=(G._mSent||{})[id];if(s&&m.startT&&m.uid===P.uid)G.srvOff=m.startT-s;}G.marches=o;drawMarches();marchTick();});
  setInterval(marchTick,1000);}
const _onRaidsM=NET.onRaids.bind(NET);NET.onRaids=function(f){const r=_onRaidsM(x=>{f(x);try{raidEndCheck(x);}catch(e){console.warn(e);}});try{marchInit();}catch(e){console.error(e);}return r;};

// v13: shared territory reconcile. The team's territory collection is the single source of truth (already one listener,
// only changed docs are read). If raiders captured one of MY hexes on any phone, my save drops it here.
function reconcileTerr(){if(!P.tiles||!P.world)return;syncOwned();const lost=[];for(const id of Object.keys(P.tiles)){const o=G.terr[id];
  if(o&&o.ai&&(o.t||0)>=(P.tiles[id].t||0)){delete P.tiles[id];W().raider[id]=o.t||Date.now();lost.push(id);}}
  if(!lost.length)return;save();report(`🚩 Raiders took ${lost.length} of your hex${lost.length>1?'es':''} while a teammate's phone ran the horde`,false);UI.hud&&UI.hud();}
const _onTerr=NET.onTerritory.bind(NET);NET.onTerritory=function(f){return _onTerr(t=>{f(t);try{reconcileTerr();}catch(e){console.warn(e);}});};

// v15: every march outcome = toast + notification inbox entry
function marchNote(txt,good){toast(txt);try{report(txt,!!good);}catch(e){}UI.hud&&UI.hud();}
// v15: connection status. iOS Safari often leaves the Firestore stream dead after the app is backgrounded; we detect it
// (browser offline event or a failed server-clock probe), show RECONNECTING, and kick the connection when the app returns.
function netState(ok){G.netOk=ok;const el=$('#mode');if(!el||NET.mode!=='firebase')return;el.textContent=ok?'● LIVE · team '+NET.team:'● RECONNECTING… · team '+NET.team;el.classList.toggle('netbad',!ok);}
async function netKick(){if(NET.mode!=='firebase'||!NET.fs)return;if(_recover||_probe)return _recover||_probe;if(G._netNext&&Date.now()<G._netNext)return;
  _recover=(async()=>{try{await NET.fs.disableNetwork(NET.db);await NET.fs.enableNetwork(NET.db);}catch(e){}try{await clockProbe();marchTick();}catch(e){}})();
  try{return await _recover;}finally{_recover=null;}}
window.addEventListener('online',()=>netKick());window.addEventListener('offline',()=>netState(false));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){G._mBusy={};netKick();}});
window.addEventListener('pageshow',e=>{if(e.persisted)netKick();});
setInterval(()=>{if(NET.mode==='firebase'&&G.netOk===false)netKick();},15000);

// v15: team map reset. An admin bumps teams/{team}/meta/map.epoch; on load each phone whose save is from an older
// epoch drops its claimed hexes + local raider/horde map state, and keeps everything else (level, gear, resources, base).
function applyMapEpoch(ep){if(!ep||!P.world&&!P.tiles)return false;const lk='wl_mapEpoch_'+(NET.team||'');const done=Math.max(P.mapEpoch||0,+(localStorage.getItem(lk)||0));if(done>=ep){P.mapEpoch=Math.max(P.mapEpoch||0,ep);return false;}localStorage.setItem(lk,ep);
  const n=Object.keys(P.tiles||{}).length;P.tiles={};const w=W();w.raider={};w.fx={start:null,last:null,anchor:null,f:{},takes:{}};w.outposts={};w.enemyTaken=w.enemyTaken||{};
  P.mapEpoch=ep;try{fxDirty();}catch(e){}save();try{cloudSave&&cloudSave(true);}catch(e){}
  if(n)report(`🗺️ The alliance map was reset. Your level, gear, resources and base are kept (${n} old hexes cleared).`,true);return true;}
Object.assign(LocalNet.prototype,{async mapEpoch(){return +(localStorage.getItem('wl_mapEpoch')||0);}});
Object.assign(FirebaseNet.prototype,{async mapEpoch(){const fs=this.fs;try{const d=await fs.getDoc(fs.doc(this.db,...this.base,'meta','map'));return d.exists()?(d.data().epoch||0):0;}catch(e){return 0;}}});
const _initME=NET.init.bind(NET);NET.init=async function(p){const uid=await _initME(p);try{const ep=await NET.mapEpoch();applyMapEpoch(ep);}catch(e){console.warn(e);}return uid;};

// v16 (D4): any row whose cost shows a red (short) amount gets a greyed button and a "Need N more" line.
function markShort(root){if(!root)return;const icon2k=Object.fromEntries(Object.entries(RES).map(([k,v])=>[v,k]));
  root.querySelectorAll('.row').forEach(row=>{if(row.closest('.rsec'))return;const sh=[...row.querySelectorAll('span.short')];const nx=row.nextElementSibling,btn=row.querySelector('button')||(nx&&nx.tagName==='BUTTON'?nx:null);if(!sh.length||!btn||row.querySelector('.need'))return;
    const need=sh.map(s=>{const m=/(\d+)\s*(.+)/.exec(s.textContent.trim());if(!m)return'';const k=icon2k[m[2].trim()];const miss=+m[1]-((k&&P.res[k])||0);return miss>0?`${miss} ${m[2].trim()}`:'';}).filter(Boolean);
    if(!need.length)return;btn.classList.add('cant');const g=row.querySelector('.grow')||row;g.insertAdjacentHTML('beforeend',`<span class="need">Need ${need.join(' + ')} more</span>`);});}
const _buildS=UI.build;UI.build=function(){_buildS.call(this);markShort($('#modalBody'));};
const _renderS=UI.render;UI.render=function(){_renderS.call(this);markShort($('#sheetBody'));const b=$('#sheetBody');if(b)b.querySelectorAll('button.big').forEach(x=>{const p=x.previousElementSibling;if(p&&p.querySelector&&p.querySelector('.need'))x.classList.add('cant');});};

// v16 (D8): when a raid you fought in ends, say how it went (once per raid).
function raidEndCheck(rs){P.raidSeenEnd=P.raidSeenEnd||{};for(const r of Object.values(rs||{})){const me=(r.participants||{})[P.uid];const over=r.done||nowS()>r.endsAt;
  if(!me||!over||P.raidSeenEnd[r.id])continue;P.raidSeenEnd[r.id]=1;const B=MONSTERS[r.bossId]||{name:'Boss'};
  const txt=r.won?`💀 Raid won: ${B.name} is down. You dealt ${me.dmg} damage. Open the raid to claim your loot.`:`⌛ Raid over: ${B.name} escaped. You dealt ${me.dmg} damage. No loot this time.`;
  report(txt,!!r.won);UI.notice?UI.notice(`<b>${r.won?'Raid won!':'Raid ended'}</b><br><small>${txt}</small>`,r.won?[['🎁 Claim loot',()=>UI.raid(r.id)]]:[]):toast(txt);save();}}
// v16 (D2/D11): raid card spells out the knock-out cost, and the fight button is locked while you recover.
const _raidUI=UI.raid;UI.raid=function(id){_raidUI.call(this,id);const b=$('#rhit');if(!b)return;const F=BAL.fight,cost=Math.min(F.lossScrapMax,Math.floor((P.res.scrap||0)*F.lossScrapPct));
  b.insertAdjacentHTML('beforebegin',`<p class="tiny">⚠️ If the boss knocks you out you drop <b>${cost} 🔩</b> (10% of your scrap, max ${F.lossScrapMax}) and rest ${F.lossCooldownMin} min before fighting again.</p>`);
  const cd=cooldownLeft();if(cd>0&&!(G.raids[id]||{}).done){b.disabled=true;b.textContent=`😵 Knocked out · fight again in ${fmtDur(cd)}`;setTimeout(()=>{if(this.raidOpen===id&&$('#rhit'))UI.raid(id);},Math.min(cd,5000)+200);}};

// v16 (J1): how many path hexes this march would claim, against today's cap.
function pathTxt(from,to){const track=typeof claimRoute26==='function'?claimRoute26(from,to):marchTrack(from,to);const path=track.slice(1).filter(h=>!(typeof claimSkip26==='function'?claimSkip26(h):allied(h))&&marchTarget(h).kind!=='fort') /* v19.1 / v26-11: same rule as the resolve, so the card matches the inbox */,left=BAL.tiles.dailyClaimCap-claimsToday().n,n=Math.min(path.length,left);
  return `claims up to ${pl(n,'hex','hexes')} along the path (every hex you don't hold yet)${path.length>left?` (cap: ${left} left today)`:''}`;}
// v16: Intercept a horde squad: a march aimed at the squad, fought (fixed math) wherever the squad is when you arrive.
const _infoSquadI=UI.infoSquad;UI.infoSquad=function(fid,sid){_infoSquadI.call(this,fid,sid);const t=findSquad(fid,sid);const box=document.querySelector('#modalBody .ibtns');if(!t||!box||!G.pos)return;
  const sp=squadPower(t.f,t.s,nowS()),p=predict(()=>marchUnits({unit:frozenMe(),escorts:{}}),()=>[bandUnit('Squad',sp)]),meet=interceptHex(t.s),dur=marchDur(marchFrom(),meet);
  const b=document.createElement('button');b.className='fight';b.id='btnIntercept';b.innerHTML=`🚩 Intercept (march) · ${fmtDur(dur)}<br><small>Squad power ${sp} · ${p.win?'✅ likely win':'❌ likely loss'} · meets it ${meet===t.s.pos?'where it stands':'on its path'}: ${hexName(meet)}</small>`;
  oneTap(b,()=>sendMarch(interceptHex(t.s),{kind:'intercept',fid,sid}));box.prepend(b);};
// v19.2: where the squad will be when the march arrives (squads step 1 hex every stepMin while out; resting squads stay put)
function interceptHex(s){const ms=HB().stepMin*60e3,now=nowS();let pos=s.pos;for(let i=0;i<3;i++){const dur=marchDur(marchFrom(),pos),start=Math.max(now,s.restUntil||0),steps=Math.max(0,Math.floor((now+dur)/ms)-Math.floor(start/ms));const np=steps&&s.path&&s.path.length?s.path[Math.min(steps,s.path.length)-1]:s.pos;if(np===pos)break;pos=np;}return pos;}

// v16 (J2): raid card shows who joined (fought) and who is waiting (opened the raid in the last 10 min, not fought yet).
Object.assign(LocalNet.prototype,{watchRaid(id,uid,name){const r=this.raids[id];if(!r)return;r.watch={...(r.watch||{}),[uid]:{name,t:Date.now()}};this._save();this._emit('raids',this.raids);}});
Object.assign(FirebaseNet.prototype,{watchRaid(id,uid,name){return this.fs.updateDoc(this.fs.doc(this.col('raids'),id),{['watch.'+uid]:{name,t:Date.now()}}).catch(()=>{});}});
function raidWhoHTML(r){const ps=r.participants||{},now=Date.now(),joined=Object.values(ps).map(p=>p.name),wait=Object.entries(r.watch||{}).filter(([u,w])=>!ps[u]&&now-w.t<10*60e3).map(([,w])=>w.name);
  return`<div class="row" id="rwho"><div class="grow">👥 <b>Joined (${joined.length})</b>: ${joined.join(', ')||'nobody yet'}<small>👀 Waiting (${wait.length}): ${wait.join(', ')||'nobody'}</small></div></div>`;}
const _raidJ2=UI.raid;UI.raid=function(id){_raidJ2.call(this,id);const r=G.raids[id];if(!r)return;G._watched=G._watched||{};if(!G._watched[id]&&!(r.participants||{})[P.uid]&&NET.watchRaid){G._watched[id]=1;NET.watchRaid(id,P.uid,P.name);}
  const b=$('#rhit');if(b&&!$('#rwho'))b.insertAdjacentHTML('beforebegin',raidWhoHTML(r));};
const _refreshJ2=UI.refreshRaid;UI.refreshRaid=function(){_refreshJ2.call(this);const r=G.raids[this.raidOpen],el=$('#rwho');if(r&&el)el.outerHTML=raidWhoHTML(r);};
// v16 (J4): tile card names the owner with their color (no locations shared, only who holds the hex).
const _infoTileJ4=UI.infoTile;UI.infoTile=function(id){_infoTileJ4.call(this,id);const o=G.terr[id],body=$('#modalBody');if(!body)return;const grow=body.querySelector('.row .grow');if(!grow)return;
  let who='';if(P.tiles[id])who=`<i class="cdot" style="background:${P.color}"></i> You`;else if(o&&!o.ai&&!o.released&&o.uid){const m=(G.al&&G.al.members||{})[o.uid]||{};who=`<i class="cdot" style="background:${m.color||o.color}"></i> ${m.name||o.by} (ally)`;}else if(o&&o.ai)who=`<i class="cdot" style="background:${o.color||'#e0573a'}"></i> ${o.by} (raiders)`;
  if(who&&o&&o.ai&&!P.tiles[id])grow.insertAdjacentHTML('beforeend',`<small class="owner">Held by ${who}</small>`);};

// v17: the shared territory is the source of truth for what I own. Every hex the team map says is mine is put back
// into my save (never dropped here), so Territory, income and the top bar always match the orange hexes on the map.
function syncOwned(){if(!P.uid||!P.tiles||!G.terr)return 0;let n=0;for(const [id,o] of Object.entries(G.terr)){if(!o||o.ai||o.released||!isMe(o.uid))continue;
  if(!P.tiles[id]){P.tiles[id]={t:o.t||Date.now()};n++;}}if(n){save();try{UI.hud&&UI.hud();if(UI.tab==='base')UI.render();}catch(e){}console.log('syncOwned restored',n);}return n;}

// v17: team FULL reset. Admin sets teams/{team}/meta/map.fullEpoch. A phone whose marker is older wipes its local save
// (keeps only the team code), overwrites its own cloud save with {"wiped":true} so it can't come back, and restarts at onboarding.
// Runs BEFORE the cloud-save check so an old save is never re-adopted or re-uploaded.
async function fullResetCheck(){if(NET.mode!=='firebase'||!NET.fs)return false;let fe=0,me=0;try{const d=await NET.fs.getDoc(NET.fs.doc(NET.db,...NET.base,'meta','map'));fe=d.exists()?(d.data().fullEpoch||0):0;me=d.exists()?(d.data().epoch||0):0;G.srvFullEpoch=fe;G.srvMapEpoch=me;}catch(e){return false;}
  const lk='wl_fullEpoch_'+NET.team,done=Math.max(+(localStorage.getItem(lk)||0),P.fullEpoch||0);if(!fe||done>=fe){P.fullEpoch=Math.max(P.fullEpoch||0,fe);return false;}
  const hasOld=(P._rev||0)>0||(P.lvl||1)>1||(P.xp||0)>0||Object.keys(P.tiles||{}).length>3||(P.contrib&&P.contrib.hexes>3);
  if(!hasOld){localStorage.setItem(lk,fe);localStorage.setItem('wl_mapEpoch_'+NET.team,me);P.fullEpoch=fe;P.mapEpoch=Math.max(P.mapEpoch||0,me);save();return false;} // brand-new player: nothing to wipe
  window.__wiping=true;const team=localStorage.getItem('wl_team');
  try{await Promise.race([NET.saveProfile(NET.uid,{data:'{"wiped":true}',rev:0,savedAt:0,fe}),new Promise(r=>setTimeout(r,5000))]);}catch(e){}
  try{localStorage.clear();if(team)localStorage.setItem('wl_team',team);localStorage.setItem(lk,fe);localStorage.setItem('wl_mapEpoch_'+NET.team,me);localStorage.setItem('wl_fullreset_note','1');}catch(e){}
  location.reload();await new Promise(()=>{});return true;}
const _cloudCheckF=cloudCheck;cloudCheck=async function(uid){if(await fullResetCheck())return;return _cloudCheckF(uid);};
// v19: retry the reset check if the first read fails (slow phone network)
const _frc1=fullResetCheck;fullResetCheck=async function(){for(let i=0;i<3;i++){const before=G.srvFullEpoch;const r=await _frc1();if(r||G.srvFullEpoch!==undefined)return r;await new Promise(r=>setTimeout(r,1500));}return false;};
// first boot after a full reset: mark the new save as already past both resets, and say what happened
document.addEventListener('DOMContentLoaded',()=>{if(localStorage.getItem('wl_fullreset_note')){setTimeout(()=>{try{toast('♻️ The alliance was reset for a fresh start. Pick your name to begin.');}catch(e){}},800);localStorage.removeItem('wl_fullreset_note');}});

// v17 B2: if a march shows as arrived (its write committed after a timeout) but its claims never ran here, run them now, once.
function marchCatchUp(){P.marchDone=P.marchDone||{};for(const [id,m] of myMarches()){if(m.state!=='arrived'||P.marchDone[id]||!Array.isArray(m.claimed))continue;P.marchDone[id]=1;
  const cd=claimsToday();for(const hx of m.claimed){if(!P.tiles[hx]){const x=factionAt(hx);if(x){delete x.f.tiles[hx];fxDirty();}claimTile(hx);}}cd.n=Math.max(0,cd.n-1);save();drawWorld();}}
const _tickB2=marchTick;marchTick=function(){try{marchCatchUp();}catch(e){}return _tickB2();};
// v17 B1/B3: a cloud save never shrinks my tile list: merge old + cloud + team map; and pre-wipe saves are refused.
const _adoptB3=adoptProfile;adoptProfile=function(o,why){const keep={...(P.tiles||{})};_adoptB3(o,why);if(!(G.srvMapEpoch>(o.mapEpoch||0)))P.tiles={...keep,...(P.tiles||{})};syncOwned();save();};
const _pvB3=profileValid;profileValid=function(o){return _pvB3(o)&&(o.fullEpoch||0)>=(G.srvFullEpoch||0);};
// v17 B1: tell the player if this browser has a different login than before (their old hexes belong to the old code).
function uidCheck(){if(!P.uid)return;const k='wl_lastUid_'+(NET.team||''),old=localStorage.getItem(k);localStorage.setItem(k,P.uid);
  if(old&&old!==P.uid)setTimeout(()=>UI.notice&&UI.notice(`<b>New login on this browser</b><br><small>Hexes from your old login are listed under it. To get your old progress back, go to Player → Save and enter your old restore code:<br><b style="word-break:break-all">${old}</b></small>`,[]),1500);}
// v17 B4: watch meta/map live; a new reset makes every open phone reload (and apply it) instead of re-uploading old state.
function watchMapMeta(){if(NET.mode!=='firebase'||!NET.fs||G._mapWatch)return;G._mapWatch=1;NET.fs.onSnapshot(NET.fs.doc(NET.db,...NET.base,'meta','map'),d=>{if(!d.exists())return;const x=d.data();
  const doneF=Math.max(+(localStorage.getItem('wl_fullEpoch_'+NET.team)||0),P.fullEpoch||0),doneM=Math.max(+(localStorage.getItem('wl_mapEpoch_'+NET.team)||0),P.mapEpoch||0);
  // v19: compare with what THIS phone has applied (not just what it last saw), so a missed check at boot is caught here
  if((x.fullEpoch||0)>doneF){G.srvFullEpoch=x.fullEpoch;fullResetCheck();return;}
  if(((x.fullEpoch||0)>(G.srvFullEpoch||0)||(x.epoch||0)>(G.srvMapEpoch||0)||(x.epoch||0)>doneM)&&G._mapSeen){window.__wiping=true;location.reload();return;}G.srvFullEpoch=Math.max(G.srvFullEpoch||0,x.fullEpoch||0);G.srvMapEpoch=Math.max(G.srvMapEpoch||0,x.epoch||0);G._mapSeen=1;});}
// v17 B7: daily reset pays once per player per day across devices: the day is recorded on my players doc and checked first.
const _runResetsB7=runResets;runResets=async function(){const w=W(),today=pacificDate();if(w.lastReset===today)return _runResetsB7();
  if(NET.mode==='firebase'&&NET.fs&&w.lastReset){try{const d=await withTO(NET.fs.getDoc(NET.fs.doc(NET.col('players'),NET.uid)),5000);if(d.exists()&&d.data().lastReset===today){w.lastReset=today;save();return;}}catch(e){return;}}
  const r=await _runResetsB7();if(w.lastReset===today)try{pushMember();}catch(e){}return r;};
const _msB7=memberSummary;memberSummary=function(){return{..._msB7(),lastReset:(P.world&&P.world.lastReset)||null};};
// v19: every member gets their own colour. If someone else already uses mine, the one with the "larger" uid moves to the first free colour.
function colorDedupe(){const M=(G.al&&G.al.members)||{};if(!P.uid||!P.name)return;const others=Object.entries(M).filter(([u,m])=>u!==P.uid&&m&&m.color);
  const clash=others.some(([u,m])=>m.color===P.color&&u<P.uid);if(!clash)return;const used=new Set(others.map(([,m])=>m.color));const free=COLORS.find(c=>!used.has(c));if(!free)return;
  P.color=free;save();try{pushMember();}catch(e){}try{toast('🎨 A teammate already had your color, so yours changed');}catch(e){}try{drawWorld();}catch(e){}}
setInterval(()=>{try{colorDedupe();}catch(e){}},5000);
// v19: tidy build card (Stronghold / Tower / Outpost). One cost row; each resource red if short, tap = have/need; Build greyed until affordable. UI only.
function buildTidy(root){if(!root)return;const icon2k=Object.fromEntries(Object.entries(RES).map(([k,v])=>[v,k]));
  root.querySelectorAll('.need').forEach(n=>n.remove());
  root.querySelectorAll('.row').forEach(row=>{if(row.closest('.rsec'))return; /* research is paid from the bank */ const nx=row.nextElementSibling,btn=row.querySelector('button')||(nx&&nx.tagName==='BUTTON'?nx:null);if(!btn)return;let short=false,any=false;
    row.querySelectorAll('.grow span').forEach(s=>{const m=/^(\d+)\s*(.+)$/.exec(s.textContent.trim());if(!m)return;const k=icon2k[m[2].trim()];if(!k)return;any=true;
      const need=+m[1],have=Math.floor(P.res[k]||0),lack=have<need;if(lack)short=true;s.classList.add('bcost');s.classList.toggle('short',lack);s.style.color=lack?'#ff5a4a':'';s.style.cursor='pointer';
      s.onclick=e=>{e.stopPropagation();toast(`${m[2].trim()} ${have}/${need}`);};});
    if(any&&short){btn.disabled=true;btn.classList.add('cant');}});}
const _buildT=UI.build;UI.build=function(){_buildT.call(this);buildTidy($('#modalBody'));};
// v19 declutter (UI only): action + key stat first, long help text behind a tap, no repeated "Need" lines, same spacing everywhere.
function declutter(root,isCard){if(!root)return;
  root.querySelectorAll('p.tiny').forEach(p=>{if(p.closest('details')||p.textContent.trim().length<70)return;const d=document.createElement('details');d.className='more';d.innerHTML='<summary>ⓘ More info</summary>';p.replaceWith(d);d.appendChild(p);});
  const fw=root.querySelector('.fortwrap'),up=[...root.querySelectorAll('button.big')].pop();if(fw&&up&&fw.compareDocumentPosition(up)&Node.DOCUMENT_POSITION_FOLLOWING){up.after(fw);fw.classList.add('small');}
  if(isCard){const c=root.querySelector('.icard'),h=c&&c.querySelector('.ihead'),b=c&&c.querySelector('.ibtns');const k=h&&h.nextElementSibling;if(k&&b&&k.classList.contains('row')&&k.nextElementSibling!==b)k.after(b); /* header, key stat, then actions */}}
const _renderD=UI.render;UI.render=function(){_renderD.apply(this,arguments);const b=$('#sheetBody');buildTidy(b);if(b)b.querySelectorAll('button.big').forEach(x=>{const p=x.previousElementSibling;if(p&&p.querySelector&&p.querySelector('.bcost.short'))x.classList.add('cant');});declutter(b);};
const _infoD=UI.info;UI.info=function(o){_infoD.call(this,o);declutter($('#modalBody'),true);};
// v19: "held" can never be more than "claimed all-time" (tiles that arrive from the team map / another device count too)
function contribFloor(){P.contrib=P.contrib||{};const held=Object.keys(P.tiles||{}).length;if((P.contrib.hexes||0)<held)P.contrib.hexes=held;}
const _syncC=syncOwned;syncOwned=function(){const r=_syncC.apply(this,arguments);contribFloor();return r;};
const _msC=memberSummary;memberSummary=function(){contribFloor();return _msC();};

// v19: each ally's flag (member color + name) at their stronghold hex, or their latest claimed hex if they have no base. Never a GPS position.
const _msF=memberSummary;memberSummary=function(){const o=_msF();const sh=P.world&&P.world.sh;o.base=sh&&sh.state!=='down'?sh.hex:null;return o;};
function allyFlagHexes(){const M=(G.al&&G.al.members)||{},last={};for(const [id,o] of Object.entries(G.terr||{})){if(!o||o.ai||o.released||!o.uid||isMe(o.uid))continue;const t=+o.t||0;if(!last[o.uid]||t>last[o.uid].t)last[o.uid]={id,t};}
  const out=[];for(const [uid,m] of Object.entries(M)){if(isMe(uid)||!m)continue;const hex=m.base||(last[uid]&&last[uid].id);if(hex)out.push({uid,name:m.name||'Ally',color:m.color||'#ccc',hex,base:!!m.base});}return out;}
function drawAllyFlags(){if(typeof map==='undefined')return;if(!G.layers.allyFlags)G.layers.allyFlags=L.layerGroup().addTo(map);const g=G.layers.allyFlags;g.clearLayers();
  for(const f of allyFlagHexes()){L.marker(hexCenter(...idQR(f.hex)),{icon:L.divIcon({className:'lodm allyflag',html:`<div class="aflag" style="--c:${f.color}"><span class="pole"></span><span class="cloth" style="background:${f.color}"></span><b>${f.base?'🏰 ':''}${String(f.name).replace(/[<>&]/g,'')}</b></div>`,iconSize:[0,0]}),zIndexOffset:300,interactive:false}).addTo(g);}}
setInterval(()=>{try{drawAllyFlags();}catch(e){}},5000);setTimeout(()=>{try{drawAllyFlags();}catch(e){}},3000);
// v19.1: drive HUD counters update the moment a hex is claimed (was only on its timer)
const _claimPathH=claimPath;claimPath=function(){const r=_claimPathH.apply(this,arguments);try{if(G.drive&&G.drive.on&&typeof driveHud==='function')driveHud();if(typeof statusStrip==='function')statusStrip();}catch(e){}return r;};
// v26 cleanup: the v19.1 driveHud counter wrapper lived here; drive2.js replaces driveHud wholesale and re-adds the same counter (v21), so this copy never ran. Removed.
// v19.1 (dev only): 🎒 gives this player 2 spare gear pieces so equip / swap / salvage can be tested.
(function(){const b=document.querySelector('#devbar button[data-dev="gear"]');if(!b)return;setTimeout(()=>{b.onclick=()=>{P.inv=P.inv||[];for(let i=0;i<2;i++)P.inv.push(rollGear(P.lvl||1,1));save();toast('🎒 2 spare gear pieces added to your bag');if(UI.tab)UI.render();};},0);})();
// v19.2: when gear raises max HP, current HP goes up by the same amount (and never above max when it drops).
(document.readyState==='complete'?f=>f():f=>window.addEventListener('load',f))(()=>{for(const k of ['equip','unequip']){const f=UI[k];if(typeof f!=='function'||f._hp)continue;UI[k]=function(){const m0=stats().hp;const r=f.apply(this,arguments);const m1=stats().hp;if(m1>m0){P.hp=Math.min(m1,(P.hp||0)+(m1-m0));save();if(UI.tab)UI.render();}else P.hp=Math.min(P.hp,m1);return r;};UI[k]._hp=1;}}); /* v19.3: wrap after every script has loaded (a 0ms timer could fire before gear2.js) */
/* v19.3: March buttons fire on the first tap (pointerup as well as click, like the sheet close button), once, with a "Sending" state */
function oneTap(b,fn){let busy=false;const go=async e=>{if(e){e.preventDefault();e.stopPropagation();}if(busy||b.disabled)return;busy=true;const h=b.innerHTML;b.classList.add('sending');b.innerHTML='🚩 Sending…';try{await fn();}catch(err){console.warn(err);}finally{busy=false;if(document.body.contains(b)){b.innerHTML=h;b.classList.remove('sending');}}};b.addEventListener('pointerup',go);b.onclick=go;}
/* v19.3: wheel / touch scrolling inside a sheet or card never reaches the map */
['#sheet','#modal'].forEach(s=>{const el=document.querySelector(s);if(!el)return;try{L.DomEvent.disableScrollPropagation(el);}catch(e){}el.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});el.addEventListener('touchmove',e=>e.stopPropagation(),{passive:true});});
