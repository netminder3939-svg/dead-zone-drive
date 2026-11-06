// fix8 (test server): march fights auto-run at once and close themselves; pop-up fight cards auto-battle after 30 s; no fight card stays open forever.
const FIGHT_WAIT=30,FIGHT_RX=/fight(Mutant|Fort|Faction)|raidAttack/;
// (removed in v26 cleanup) fight cards used to auto-battle / auto-close after 30 s. Tap = card first, it stays until you act or close it.
const _replay8=UI.replay;UI.replay=function(o){_replay8.apply(this,arguments);try{const body=$('#modalBody'),tag='q'+Date.now();body.dataset.qtag=tag;
  if(/^🚩 March/.test(o.title||'')){const a=$('#rauto');if(a)a.click();}
  else setTimeout(()=>{if(body.dataset.qtag===tag&&$('#rauto')&&!$('#modal').classList.contains('hidden'))$('#rauto').click();},FIGHT_WAIT*1000);
  }catch(e){console.warn('replay8',e);}};

// fix8b: March report pop-up + clear "what and where" toasts for map loot.
const resLine8=o=>Object.entries(o||{}).filter(([,v])=>v>0).map(([k,v])=>`+${v}${RES[k]||k}`).join(' ');
function marchGo(h){UI.closeModal();try{const [q,r]=idQR(h);map.setView(hexCenter(q,r),Math.max(map.getZoom(),16),{animate:false});flashTiles([h]);}catch(e){}}
const row8=(ico,txt,h)=>`<div class="row mrow"><div class="grow">${ico} ${txt}</div>${h?`<button class="mgo" onclick="marchGo('${h}')">🗺️ Show on map</button>`:''}</div>`;
function showMarchReport(o){const go=()=>{if(!$('#modal').classList.contains('hidden'))return setTimeout(go,700);G.lastMarchReport=o;
  UI.info({title:'🚩 March report',sub:o.sub,body:`<div class="marchrep">${o.rows.join('')||'<p class="tiny">Nothing new this time.</p>'}</div>`,buttons:[]});$('#modalBody').classList.add('mreport');};go();}
function lmNear(ids){const s=new Set();ids.forEach(h=>{const [q,r]=idQR(h);hexRing(q,r,1).forEach(x=>s.add(x.id));});return (G.landmarks||[]).filter(l=>s.has(hexAt(l.lat,l.lng).id));}
const _resolve8=resolveMarch;resolveMarch=async function(id,m){const was=!!(P.marchDone||{})[id];await _resolve8.apply(this,arguments);try{if(was||!(P.marchDone||{})[id])return;
  const rows=[],cl=m.claimed||[];
  if(m.result)rows.push(row8(m.win?'⚔️':'💀',m.result,m.to));
  if(m.loot&&Object.keys(m.loot).length)rows.push(row8('📦',`Loot on the way home: <b>${resLine8(m.loot)}</b>`,m.to));
  cl.forEach(h=>rows.push(row8('🚩',`Claimed ${hexName(h)}`,h)));
  lmNear(cl).forEach(l=>rows.push(row8('🏛️',`Uncovered ${s4esc?s4esc(l.name):l.name}`,hexAt(l.lat,l.lng).id)));
  showMarchReport({sub:`March to ${hexName(m.to)} · ${cl.length} hex${cl.length===1?'':'es'} claimed`,rows});}catch(e){console.warn('mreport',e);}};
const _return8=returnMarch;returnMarch=async function(id,m){const s0={...P.res},was=!!(P.marchPaid||{})[id];await _return8.apply(this,arguments);try{if(was||!(P.marchPaid||{})[id])return;
  const g={};for(const k in P.res){const d=(P.res[k]||0)-(s0[k]||0);if(d>0)g[k]=d;}if(!Object.keys(g).length)return;
  showMarchReport({sub:`March home from ${hexName(m.to)}`,rows:Object.entries(g).map(([k,v])=>row8(RES[k]||k,`<b>+${v}</b> ${k}`,m.to))});}catch(e){console.warn('mreturn',e);}};
// map loot toasts
function lootSrc8(label,fn){return function(){const s0={...P.res},here=G.pos?hexName(hexAt(...G.pos).id):'';const r=fn.apply(this,arguments);try{const g={};for(const k in P.res){const d=(P.res[k]||0)-(s0[k]||0);if(d>0)g[k]=d;}
  if(Object.keys(g).length){const t=`💰 ${resLine8(g)} from ${typeof label==='function'?label.apply(this,arguments):label}${here?' at '+here:''}`;G.lastLootToast=t;setTimeout(()=>toast(t),50);}}catch(e){}return r;};}
battleWin=lootSrc8((mid,lvl)=>`Lv${lvl} ${(MONSTERS[mid]||{}).name||'mutant'}`,battleWin);
checkLandmarks=lootSrc8('a landmark badge',checkLandmarks);
if(typeof fightFaction==='function')fightFaction=lootSrc8('the gang fight',fightFaction);

// fix8c: bigger test hexes. A save made on another grid size drops its hexes, structures, route/pins and local horde map (level, gear, resources kept).
const _initGrid=NET.init.bind(NET);NET.init=async function(p){const uid=await _initGrid(p);try{gridMigrate();}catch(e){console.warn('grid',e);}return uid;};
function gridMigrate(){if(!P||!(P.world||P.tiles))return false;const was=P.gridR||98;if(was===HEX_R){P.gridR=HEX_R;return false;}
  const n=Object.keys(P.tiles||{}).length;P.tiles={};const w=W();w.raider={};w.fx={start:null,last:null,anchor:null,f:{},takes:{}};w.outposts={};w.towers={};w.sh=null;w.enemyTaken={};
  if(P.plan)P.plan={pins:[],route:[],targets:[]};P.gridR=HEX_R;try{fxDirty();}catch(e){}save();try{cloudSave&&cloudSave(true);}catch(e){}try{pushMember();}catch(e){}
  if(n)report(`🗺️ Bigger hexes on the test map (${Math.round(HEX_R*Math.sqrt(3))} m across). Your ${n} old hexes and buildings were cleared; level, gear and resources are kept.`,true);return true;}
// teammates still on the old grid: hide their old-grid buildings/plans until their phone migrates
const _ms8=memberSummary;memberSummary=function(){return{..._ms8(),gridR:HEX_R};};
const _onAl8=NET.onAlliance.bind(NET);NET.onAlliance=function(cb){return _onAl8(a=>{try{for(const m of Object.values((a&&a.members)||{}))if(!m.me&&(m.gridR||98)!==HEX_R){m.defs=[];delete m.plan;m.oldGrid=true;}}catch(e){}cb(a);});};

// fix8d: interception only when the horde is physically there: a visible squad whose current hex (or the hex it is stepping into right now) is on the march track. No path/trail interception. Newbie protection kept.
function squadHereNow(s,now){const at=[s.pos];if(!(s.restUntil>now)&&s.path&&s.path.length)at.push(s.path[0]);return at.filter(Boolean);}
interceptor=function(m){if(marchesDone()<NEWBIE_MARCHES&&!(m&&m.kind==='intercept'))return null;const fx=P.world&&P.world.fx;if(!fx||!fx.f)return null;const tr=new Set(marchTrack(m.from,m.to)),now=Date.now();
  for(const [fid,f] of Object.entries(fx.f).sort()){if(f.routedUntil)continue;for(const s of f.squads||[]){if(!s||!s.pos||!isVis(s.pos))continue;const hit=squadHereNow(s,now).find(id=>tr.has(id));if(hit)return{fid,f,s,hex:hit};}}return null;};
