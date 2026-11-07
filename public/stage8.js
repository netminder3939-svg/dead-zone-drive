// Stage 8 (test server): troops + Barracks + load weight. Deterministic math, starting numbers (tunable).
// Barracks trains troops from scrap (~1 scrap per 10). Batches take real hours (~1k per 2h at Lv1; upgrades = faster + bigger batches).
// Main tower level sets the troop cap (~5k at Lv1 to ~100k at Lv10). No troop upkeep. Troops defend STRUCTURES only. Troops away on a march don't defend.
// Marches can take a chosen troop count; bigger = slower and carries more (load weight). Fight math decides losses; the march card shows expected losses first.
const TROOP={perScrap:10,batchBase:1000,hoursPer1k:2,powerPer:1/50,capLv1:5000,capMax:100000,
  barracks:{maxLevel:10,cost:l=>({scrap:Math.round(120*l*l),parts:Math.round(8*l*l)}),hours:l=>l<=1?0.5:l*l*0.5},
  load:{base:40,perTroop:0.05},slow:n=>1+0.12*Math.log10(Math.max(1,n/100))*(n>=100?1:0)};
const tcost=c=>Object.entries(c).filter(([,v])=>v).map(([k,v])=>`<span class="${(P.res[k]||0)<v?"short":""}">${v.toLocaleString()}${RES[k]}</span>`).join(" ");
function TP(){P.troops=P.troops||{home:0,queue:[],away:{}};const t=P.troops;t.queue=t.queue||[];t.away=t.away||{};return t;}
function barracks(){const w=W();w.barracks=w.barracks||{level:1};return w.barracks;}
function troopCap(){const L=Math.max(1,Math.min(10,mtLevel()));return Math.round(TROOP.capLv1*Math.pow(TROOP.capMax/TROOP.capLv1,(L-1)/9)/100)*100;}
function troopsAway(){return Object.values(TP().away).reduce((a,b)=>a+(b||0),0);}
function troopsQueued(){return TP().queue.reduce((a,q)=>a+q.n,0);}
function troopRoom(){return Math.max(0,troopCap()-TP().home-troopsAway()-troopsQueued());}
function batchMax(){return TROOP.batchBase*barracks().level;}
function trainMs(n){return n/1000*TROOP.hoursPer1k*3600e3/(1+0.25*(barracks().level-1));}
function trainCost(n){return{scrap:Math.ceil(n/TROOP.perScrap)};}
function trainTroops(n){n=Math.floor(Math.min(n,batchMax(),troopRoom()));if(n<=0)return toast(troopRoom()?'Nothing to train':'🪖 Troop cap reached: level up the Stronghold');const c=trainCost(n);if(!canPay(c))return toast('Not enough supplies to train');pay(c);
  const t=TP(),start=Math.max(Date.now(),...t.queue.map(q=>q.end));t.queue.push({n,end:start+trainMs(n)});save();toast(`🪖 Training ${n.toLocaleString()} troops`);UI.render&&UI.tab&&UI.render();}
function troopTick(){const t=TP(),now=Date.now();let done=0;t.queue=t.queue.filter(q=>{if(q.end<=now){t.home+=q.n;done+=q.n;return false;}return true;});
  const b=barracks();if(b.upEnd&&now>=b.upEnd){b.level++;b.upEnd=null;done=done||-1;try{newsAdd('base','barracks',`🪖 Barracks Lv${b.level} done`,'base:barracks:up');}catch(e){}}
  if(done>0){try{newsAdd('base','barracks',`🪖 ${done.toLocaleString()} troops trained`,'base:barracks:t');}catch(e){}report(`🪖 ${done.toLocaleString()} troops finished training`,true);}if(done)save();}
setInterval(()=>{try{if(P&&P.world)troopTick();}catch(e){}},5000);
function upgradeBarracks(){const b=barracks(),c=TROOP.barracks.cost(b.level);if(b.upEnd)return toast('Already upgrading');if(b.level>=Math.min(TROOP.barracks.maxLevel,mtLevel()+1))return toast(`🔒 Barracks Lv${b.level+1} needs Stronghold Lv${b.level}`);if(!canPay(c))return toast('Not enough resources');pay(c);b.upEnd=Date.now()+TROOP.barracks.hours(b.level)*3600e3;save();UI.render();}
// ---- march: pick troops, slower + more load with more troops, troop unit fights, losses from the fight
function troopUnit(n){const u=bandUnit(`🪖 ${n.toLocaleString()} troops`,Math.max(1,Math.round(n*TROOP.powerPer)));u.troop=n;u.img='assets/monsters/raider.svg';return u;}
function marchLoad(n){return Math.round(TROOP.load.base+TROOP.load.perTroop*(n||0));}
G.troopSend=0;
const _mDur8=marchDur;marchDur=function(from,to,n){const d=_mDur8(from,to);const k=n??G.troopSend??0;return Math.round(d*TROOP.slow(k));};
const _mUnits8=marchUnits;marchUnits=function(m){const u=_mUnits8.apply(this,arguments);if(m&&m.troops>0)u.push(troopUnit(m.troops));return u;};
// troop losses: the troop unit's HP left after the fight (min across all fights in one resolve)
G._tl=null;const _rf8=runFight;runFight=function(A,B){const f=_rf8.apply(this,arguments);try{const i=(f.startA||[]).findIndex(u=>u.troop);if(i>=0){const u=f.A[i],frac=Math.max(0,u.hp)/Math.max(1,u.max);G._tl=G._tl==null?frac:Math.min(G._tl,frac);}}catch(e){}return f;};
function expectedLoss(n,enemy){if(!n||!enemy)return 0;G._tl=null;const f=_rf8([...marchUnits({unit:frozenMe(),escorts:{}}),troopUnit(n)],enemy());const i=f.startA.findIndex(u=>u.troop);const fr=i>=0?Math.max(0,f.A[i].hp)/f.A[i].max:1;G._tl=null;return{lost:Math.round(n*(1-fr)),win:f.win};}
const _addM8=NET.addMarch.bind(NET);NET.addMarch=async function(d){const n=Math.min(G.troopSend||0,TP().home);if(n>0){d.troops=n;d.dur=marchDur(d.from,d.to,n);}d.load=marchLoad(n);const id=await _addM8(d);if(n>0&&id){TP().home-=n;TP().away[id]=n;save();}G.troopSend=0;return id;};
const _res8s=resolveMarch;resolveMarch=async function(id,m){G._tl=null;const was=!!(P.marchDone||{})[id];const r=await _res8s.apply(this,arguments);try{if(!was&&(P.marchDone||{})[id]&&m.troops>0&&TP().away[id]!=null){const left=Math.round(m.troops*(G._tl==null?1:G._tl));const lost=TP().away[id]-left;TP().away[id]=left;m.troopsLost=lost;
    if(lost>0)report(`🪖 Lost ${lost.toLocaleString()} troops on the march to ${hexName(m.to)}`,false);save();}}catch(e){}G._tl=null;return r;};
const _ret8s=returnMarch;returnMarch=async function(id,m){try{if(m&&m.loot){const cap=m.load??marchLoad(m.troops||0);let tot=Object.values(m.loot).reduce((a,b)=>a+b,0);if(tot>cap){const k=cap/tot;for(const x in m.loot)m.loot[x]=Math.floor(m.loot[x]*k);m.loadCapped=true;}}}catch(e){}
  const r=await _ret8s.apply(this,arguments);try{if(m&&m.state==='done'&&TP().away[id]!=null){TP().home+=TP().away[id];delete TP().away[id];save();}}catch(e){}return r;};
// march card: troop picker with load, speed and expected losses
const _amb8=addMarchBtn;addMarchBtn=function(id){_amb8.apply(this,arguments);try{const btn=$('#btnMarch');if(!btn||btn.disabled)return;const home=TP().home,tg=marchTarget(id);const mb=friendlyHex(id)&&!squadAt(id)?mobAt(id):null;
  const enemy=mb?()=>mutantUnits(mb.mid,mb.lvl):tg.units.length?()=>marchTarget(id).units:null;const opts=[0,1000,10000,100000].filter(x=>x<=home);if(home&&!opts.includes(home))opts.push(home);
  const row=document.createElement('div');row.className='row troopsel';row.style.width='100%';
  const draw=()=>{const n=G.troopSend||0,el=expectedLoss(n,enemy);row.innerHTML=`<div class="grow"><b>🪖 Troops</b> <small>${home.toLocaleString()} at home · load ${marchLoad(n)} res · ${n?`x${TROOP.slow(n).toFixed(2)} slower`:'normal speed'}${n&&enemy?` · expected losses ~${el.lost.toLocaleString()}`:''}</small><div class="seg">${opts.map(x=>`<button class="${x===n?'on':''}" data-n="${x}">${x===home&&x?'All '+x.toLocaleString():x?x.toLocaleString():'None'}</button>`).join('')}</div></div>`;
    row.querySelectorAll('button').forEach(b=>b.onclick=e=>{e.stopPropagation();G.troopSend=+b.dataset.n;draw();const d=marchDur(marchFrom(),id);btn.firstChild.textContent=`🚩 March · ${fmtDur(d)} there, ${fmtDur(d)} back`;});};
  G.troopSend=0;draw();btn.after(row);}catch(e){console.warn('troopsel',e);}};
// defense: troops at home add to STRUCTURE defense only; they take losses when a structure is hit
const _dp8=defPower;defPower=function(defs){const b=_dp8.apply(this,arguments);if(!defs||!defs.length||!defs.some(d=>['sh','tower','op'].includes(d.kind)))return b;return b+Math.round(TP().home*TROOP.powerPer);};
const _sr8=squadReplay;squadReplay=function(defs,dp,sp,g){const f=_sr8.apply(this,arguments);try{const h=TP().home;if(h>0&&defs.some(d=>['sh','tower','op'].includes(d.kind))){const lost=Math.round(h*(dp>=sp?Math.min(.5,sp/dp*.3):1));TP().home=h-lost;if(lost)report(`🪖 ${lost.toLocaleString()} troops fell defending ${hexName(defs[0].id||defs[0].hex||'')}`,false);}}catch(e){}return f;};
// Base › Barracks tab
UI.SUBS.base.push(['barracks','🪖 Barracks']);
const _render8s=UI.render;UI.render=function(){_render8s.apply(this,arguments);try{if(this.tab!=='base'||this.sub.base!=='barracks')return;troopTick();const b=$('#sheetBody');const t=TP(),B=barracks(),cap=troopCap(),c=TROOP.barracks.cost(B.level),bm=Math.min(batchMax(),troopRoom());
  let h=`<h2>🪖 Barracks <small class="lv">Lv${B.level}</small></h2><p class="tiny">Train troops from scrap (1🔩 per ${TROOP.perScrap}). They defend your Stronghold, towers and outposts (not plain hexes) and can join marches. No upkeep.</p>
  <div class="row"><div class="grow"><b>${t.home.toLocaleString()}</b> at home · <b>${troopsAway().toLocaleString()}</b> on marches · <b>${troopsQueued().toLocaleString()}</b> training<small>Cap ${cap.toLocaleString()} (Stronghold Lv${mtLevel()}) · batch up to ${batchMax().toLocaleString()} · ~${fmtDur(trainMs(1000))} per 1,000</small></div></div>`;
  h+=t.queue.map((q,i)=>`<div class="row tq"><div class="grow">⏳ ${q.n.toLocaleString()} troops<small>ready in ${fmtDur(Math.max(0,q.end-Date.now()))}</small></div></div>`).join('');
  h+=`<div class="row"><div class="grow">Train a batch of <b>${bm.toLocaleString()}</b><small>${tcost(trainCost(bm))} · ${fmtDur(trainMs(bm))}</small></div><button class="fight" id="btnTrain" ${bm<=0?'disabled':''} onclick="trainTroops(${bm})">Train</button></div>`;
  h+=B.level<TROOP.barracks.maxLevel?`<div class="row"><div class="grow">⬆️ Barracks Lv${B.level+1}<small>${B.upEnd?'⏳ '+fmtDur(B.upEnd-Date.now()):tcost(c)+' · '+fmtDur(TROOP.barracks.hours(B.level)*3600e3)} · faster training, bigger batches</small></div><button id="btnBarUp" ${B.upEnd?'disabled':''} onclick="upgradeBarracks()">Upgrade</button></div>`:'';
  h+=`<p class="tiny">Marches: pick how many troops go. More troops = more power and a bigger load (${TROOP.load.base} + ${TROOP.load.perTroop} per troop), but a slower march. The march card shows expected losses first.</p>`;
  b.innerHTML=this.subnav('base')+h;}catch(e){console.warn('barracks',e);}};
// troop count in the resource bar: home, +training, marching; tap opens Base › Barracks
const kfmt=n=>n>=10000?Math.round(n/1000)+'k':n>=1000?(n/1000).toFixed(1).replace(/\.0$/,'')+'k':String(n);
const _hud8=UI.hud;UI.hud=function(){_hud8.apply(this,arguments);try{const r=$('#res');if(!r||!P.world)return;const t=TP(),q=troopsQueued(),a=troopsAway();
  r.insertAdjacentHTML('beforeend',`<span id="troopchip" title="Troops: ${t.home} home, ${q} training, ${a} marching">🪖 ${kfmt(t.home)}${q?` <em class="inc">+${kfmt(q)}</em>`:''}${a?` <em class="away">🚩${kfmt(a)}</em>`:''}</span>`);
  $('#troopchip').onclick=()=>{UI.open('base');UI.sub.base='barracks';UI.render();};}catch(e){}};
setInterval(()=>{try{UI.hud();}catch(e){}},5000);

// ---- stationed troops: send troops to defend a tile or tower; they stay until recalled. Where-are-my-troops list.
function stationed(){const t=TP();t.stationed=t.stationed||{};t.returning=t.returning||[];return t.stationed;}
function stationedAt(h){const s=stationed()[h];return s&&Date.now()>=s.at?s.n:0;}
function stationTroops(h,n){n=Math.min(n,TP().home);if(n<=0)return toast('No troops at home');const from=marchFrom(),d=marchDur(from,h,n);const s=stationed();const cur=s[h];TP().home-=n;s[h]={n:(cur?cur.n:0)+n,at:Math.max(Date.now()+d,cur?cur.at:0),from,st:Date.now()};save();toast(`🛡️ ${n.toLocaleString()} troops heading to ${hexName(h)} · ${fmtDur(d)}`);drawWorld();UI.tab&&UI.render();}
function recallStation(h){const s=stationed()[h];if(!s)return;const d=marchDur(s.from||marchFrom(),h,s.n);TP().returning.push({n:s.n,at:Date.now()+d,from:h,st:Date.now()});delete stationed()[h];save();toast(`↩️ ${s.n.toLocaleString()} troops coming home · ${fmtDur(d)}`);drawWorld();UI.tab&&UI.render();}
function marchIdOf(m){return m&&(m.id||Object.keys(G.marches||{}).find(k=>G.marches[k]===m));}
function recallMarchTroops(id){const t=TP(),n=t.away[id],m=G.marches[id];if(!n)return;const back=m?Math.min(Date.now()-m.startT,m.dur):0;t.returning.push({n,at:Date.now()+Math.max(0,back),from:m&&m.to,st:Date.now(),fromLL:m?(()=>{const a=hexCenter(...idQR(m.from)),b=hexCenter(...idQR(m.to)),f=Math.max(0,Math.min(1,(Date.now()-m.startT)/m.dur));return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];})():null});delete t.away[id];(t.recalled=t.recalled||{})[id]=1;save();toast(`↩️ ${n.toLocaleString()} troops leave the march and head home · ${fmtDur(back)}`);UI.tab&&UI.render();}
const _tt8b=troopTick;troopTick=function(){_tt8b.apply(this,arguments);const t=TP();stationed();let back=0;t.returning=t.returning.filter(r=>{if(r.at<=Date.now()){t.home+=r.n;back+=r.n;return false;}return true;});if(back){save();toast(`🏠 ${back.toLocaleString()} troops are home`);}};
const _mu8b=marchUnits;marchUnits=function(m){const u=_mu8b.apply(this,arguments);const id=marchIdOf(m);if(id&&(TP().recalled||{})[id])return u.filter(x=>!x.troop);return u;};
// defense: stationed troops add to the spot they guard (tile or structure)
const _ad8=activeDefs;activeDefs=function(id){const d=_ad8.apply(this,arguments);const n=stationedAt(id);if(n>0&&!d.some(x=>x.kind==='troops'))d.push({kind:'troops',id,power:Math.round(n*TROOP.powerPer)});
  for(const x of d.slice()){if(x.kind!=='troops'&&x.id&&x.id!==id){const k=stationedAt(x.id);if(k>0)x.power+=Math.round(k*TROOP.powerPer);}}return d;};
const _so8=structOf;structOf=function(d){if(d&&d.kind==='troops')return{state:'up',hpPct:1,troops:true};return _so8.apply(this,arguments);};
const _sn8=structName;structName=function(d){if(d&&d.kind==='troops')return`${stationedAt(d.id).toLocaleString()} stationed troops`;return _sn8.apply(this,arguments);};
const _ds8=destroy;destroy=function(d){if(d&&d.kind==='troops'){delete stationed()[d.id];return;}return _ds8.apply(this,arguments);};
const _du8=defenderUnit;defenderUnit=function(d){if(d&&d.kind==='troops')return troopUnit(stationedAt(d.id)||1);return _du8.apply(this,arguments);};
const _sr8b=squadReplay;squadReplay=function(defs,dp,sp,g){const f=_sr8b.apply(this,arguments);try{for(const d of defs){const hx=d.id;const s=stationed()[hx];if(!s||Date.now()<s.at)continue;const lost=Math.round(s.n*(dp>=sp?Math.min(.5,sp/dp*.3):1));s.n-=lost;if(s.n<=0)delete stationed()[hx];if(lost)report(`🪖 ${lost.toLocaleString()} stationed troops fell at ${hexName(hx)}`,false);}}catch(e){}return f;};
// hex card: station troops on own tiles / structures
const _it8=UI.infoTile;UI.infoTile=function(id){_it8.apply(this,arguments);try{if(!P.tiles[id]&&!W().towers[id]&&!(W().sh&&W().sh.hex===id))return;const box=$('#modalBody .ibtns');if(!box)return;const home=TP().home,here=stationed()[id];
  const row=document.createElement('div');row.className='row stationrow';row.style.width='100%';const opts=[1000,10000,100000].filter(x=>x<home);if(home)opts.push(home);
  row.innerHTML=`<div class="grow"><b>🛡️ Troops guarding here: ${here?here.n.toLocaleString()+(Date.now()<here.at?' (arriving '+fmtDur(here.at-Date.now())+')':''):'none'}</b><small>${home.toLocaleString()} at home · they stay until recalled</small><div class="seg">${opts.map(x=>`<button class="stn" data-n="${x}">${x===home?'All '+x.toLocaleString():'+'+x.toLocaleString()}</button>`).join('')}${here?'<button class="stnrecall">↩️ Recall</button>':''}</div></div>`;
  row.querySelectorAll('.stn').forEach(b=>oneTap(b,()=>{stationTroops(id,+b.dataset.n);UI.closeModal();}));const rc=row.querySelector('.stnrecall');if(rc)oneTap(rc,()=>{recallStation(id);UI.closeModal();});box.before(row);}catch(e){console.warn('station',e);}};
// map: shield marker where troops are stationed
const _dw8b=drawWorld;drawWorld=function(){_dw8b.apply(this,arguments);try{if(!map||!G.layers.terr)return;for(const [h,s] of Object.entries(window.GAR24?{}:stationed())){L.marker(hexCenter(...idQR(h)),{icon:L.divIcon({className:'lodm',html:`<div class="ico stationm"><b>🛡️${kfmt(s.n)}${Date.now()<s.at?'⏳':''}</b></div>`,iconSize:[0,0]}),zIndexOffset:610,interactive:false}).addTo(G.layers.terr);}}catch(e){}};
// Barracks: where are my troops
function troopGo(h){UI.close&&UI.close();UI.closeModal();try{map.setView(hexCenter(...idQR(h)),Math.max(map.getZoom(),16),{animate:false});flashTiles([h]);}catch(e){}}
const _render8b=UI.render;UI.render=function(){_render8b.apply(this,arguments);try{if(this.tab!=='base'||this.sub.base!=='barracks')return;const b=$('#sheetBody');const t=TP();let h=`<h2>📍 Where are my troops</h2><div class="row"><div class="grow">🏠 At home<small>defending your Stronghold, towers and outposts</small></div><b>${t.home.toLocaleString()}</b></div>`;
  for(const [id,n] of Object.entries(t.away)){const m=G.marches[id];const back=m?m.startT+2*m.dur:0;h+=`<div class="row wt"><div class="grow">🚩 ${n.toLocaleString()} on a march${m?' to '+hexName(m.to):''}<small>${m?(Date.now()<m.startT+m.dur?'arrives '+fmtDur(m.startT+m.dur-Date.now())+' · ':'')+'back in '+fmtDur(Math.max(0,back-Date.now())):'on the way'}</small></div>${m?`<button onclick="troopGo('${m.to}')">🗺️ Show</button>`:''}<button onclick="recallMarchTroops('${id}')">↩️ Recall</button></div>`;}
  for(const [hx,s] of Object.entries(stationed()))h+=`<div class="row wt"><div class="grow">🛡️ ${s.n.toLocaleString()} guarding ${hexName(hx)}<small>${Date.now()<s.at?'arriving in '+fmtDur(s.at-Date.now()):'on guard until recalled'}</small></div><button onclick="troopGo('${hx}')">🗺️ Show</button><button onclick="recallStation('${hx}')">↩️ Recall</button></div>`;
  for(const r of t.returning)h+=`<div class="row wt"><div class="grow">↩️ ${r.n.toLocaleString()} heading home<small>home in ${fmtDur(Math.max(0,r.at-Date.now()))}</small></div>${r.from?`<button onclick="troopGo('${r.from}')">🗺️ Show</button>`:''}</div>`;
  b.insertAdjacentHTML('beforeend',h);}catch(e){console.warn('where',e);}};
// resource bar: count stationed + returning as "away"
const _ta8=troopsAway;troopsAway=function(){return _ta8()+Object.values(stationed()).reduce((a,s)=>a+s.n,0)+TP().returning.reduce((a,r)=>a+r.n,0);};
