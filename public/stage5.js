// Stage 5 (preview): the Stronghold is the MAIN TOWER, the key gate.
// Its level unlocks building tiers (tower level cap, tower count) and buff slots (used by Stage 6). No class tiers.
// Main-tower upgrades are slow and expensive. Buildings cost upkeep at the daily reset; unpaid ones go offline for the day.
// Per-player state only (local save); the shared member doc is unchanged.
const MT={
  tiers:[ // from main-tower level: highest tower level you may build to, buff slots
    {at:1, name:'Tier I',  towerLvl:3,  buffs:1},
    {at:4, name:'Tier II', towerLvl:5,  buffs:2},
    {at:7, name:'Tier III',towerLvl:7,  buffs:3},
    {at:10,name:'Tier IV', towerLvl:10, buffs:3}],
  costMult:1.6,                                   // main-tower upgrades cost 60% more than before
  hours:l=>l===1?1:Math.round(l*l*1.5),           // Lv1→2 1h … Lv9→10 ~5 days (real time, runs offline)
  upkeep:{
    main:l=>({scrap:4*l,food:2*l}),               // main tower, per level
    tower:l=>({food:3+l,water:3+l,fuel:1+Math.floor(l/3)}), // grows with tower level
    outpost:{food:2,water:2,fuel:1}}};
function mtLevel(){return strongholdLevel();}
function mtTier(l=mtLevel()){let t=MT.tiers[0];for(const x of MT.tiers)if(l>=x.at)t=x;return t;}
function mtNext(l=mtLevel()){return MT.tiers.find(x=>x.at>l)||null;}
function towerLvlCap(){return mtTier().towerLvl;}
function buffSlots(){return mtTier().buffs;}
// slow, expensive main-tower upgrades
const _shCost5=shCost;shCost=function(l){return Object.fromEntries(Object.entries(_shCost5(l)).map(([k,v])=>[k,Math.round(v*MT.costMult)]));};
shTime=function(l){return Math.round(MT.hours(l)*3600e3*(1-Math.min(.5,skillFx('buildt')/100)));};
// building tiers: towers can't outgrow the main tower
const _upTower5=upgradeTower;upgradeTower=function(id){const t=W().towers[id];if(t&&(t.level||1)>=towerLvlCap()){const n=mtNext();return toast(n?`🔒 Tower Lv${towerLvlCap()+1} needs Stronghold Lv${n.at}`:'Tower is at max level');}return _upTower5(id);};
// upkeep
function addTo(o,c){for(const k in c)o[k]=(o[k]||0)+c[k];return o;}
function upkeepParts(){const w=W(),out=[];out.push({k:'main',id:'main',name:`Stronghold Lv${mtLevel()}`,cost:MT.upkeep.main(mtLevel())});
  Object.entries(w.towers||{}).forEach(([id,t])=>{if(t.state!=='down')out.push({k:'tower',id,name:`Tower Lv${t.level||1}`,cost:MT.upkeep.tower(t.level||1)});});
  Object.entries(w.outposts||{}).forEach(([id,o])=>{if(o.state==='up')out.push({k:'op',id,name:'Outpost',cost:{...MT.upkeep.outpost}});});return out;}
towerUpkeep=function(){const u={scrap:0,food:0,water:0,fuel:0,parts:0};upkeepParts().forEach(p=>addTo(u,p.cost));return u;};
// daily reset: pay main tower first, then towers, then outposts. Unpaid ones go offline until the next reset.
function payUpkeep5(){const w=W(),off=[];for(const p of upkeepParts()){const ok=canPay(p.cost);if(ok)pay(p.cost);
    if(p.k==='main'){w.mtOffline=!ok;if(!ok)off.push(p.name+' (upgrades paused)');}
    else if(p.k==='tower'){w.towers[p.id].online=ok;if(!ok)off.push(p.name);}
    else{w.outposts[p.id].online=ok;if(!ok)off.push(p.name);}}
  if(off.length)report(`🕯️ Upkeep short: ${off.join(', ')} went dark until the next reset`,false);return off;}
// replace the old tower-only upkeep inside payReset (BAL.tower.upkeep is zeroed for this build so the old loop is a no-op)
BAL.tower.upkeep={food:0,water:0,fuel:0};
const _payReset5=payReset;payReset=async function(label){await _payReset5(label);payUpkeep5();save();};
// unpaid main tower: upgrade clock stops for the day
setInterval(()=>{try{const S=P.stronghold;if(S&&S.upEnd&&P.world&&W().mtOffline){S.upEnd+=1000;S.upStart=(S.upStart||Date.now())+1000;}}catch(e){}},1000);
// unpaid outposts don't defend
const _defFor5=defendersFor;defendersFor=function(id){return _defFor5(id).filter(d=>!(d.kind==='op'&&((W().outposts||{})[d.id]||{}).online===false));};
// Base › Stronghold: what the main tower unlocks + daily upkeep
const _render5=UI.render;UI.render=function(){_render5.apply(this,arguments);try{if(this.tab!=='base'||this.sub.base!=='fort')return;const b=$('#sheetBody');if(!b)return;const L=mtLevel(),T=mtTier(),N=mtNext(),u=towerUpkeep(),w=W();
  const fmt=c=>Object.entries(c).filter(([,v])=>v).map(([k,v])=>v+RES[k]).join(' ')||'nothing';
  let h=`<h3 class="mtgate">🔓 What Stronghold Lv${L} unlocks · ${T.name}</h3><p class="tiny">One building: your Stronghold <i>is</i> the main tower. Its level (the card above) sets how far every other building can grow. Where you place it on the map only decides what it guards.</p>
  <table class="log2 mttable"><tr><th>Stronghold</th><th>Tier</th><th>Tower max</th><th>Buff slots</th></tr>${MT.tiers.map(x=>`<tr class="${x===T?'pos':''}"><td>Lv${x.at}+</td><td>${x.name}</td><td>Lv${x.towerLvl}</td><td>${x.buffs}</td></tr>`).join('')}</table>
  <div class="row"><div class="grow">Now: towers up to <b>Lv${T.towerLvl}</b> (max ${towerMax()} towers) · <b>${T.buffs}</b> buff slot${T.buffs>1?'s':''}<small>${N?`Next unlock at Stronghold Lv${N.at}: towers to Lv${N.towerLvl}${N.buffs>T.buffs?`, ${N.buffs} buff slots`:''}`:'Everything unlocked.'}</small>${L<SH_MAX?`<small>Next upgrade (Lv${L+1}) takes ${MT.hours(L)}h and costs ${fmt(shCost(L))}.</small>`:''}</div></div>
  <h3 class="mtupkeep">🕯️ Daily upkeep · ${fmt(u)}</h3><p class="tiny upkorder">Paid at the midnight reset, always in this order: <b>1. Stronghold → 2. Towers → 3. Outposts</b>. Whatever you can't pay goes dark until the next reset:<br>🏰 Stronghold dark = its upgrade timer pauses<br>🗼 Tower dark = it stops defending its hexes<br>⛺ Outpost dark = it stops defending its area${w.mtOffline?'<br><b>⚠️ Your Stronghold is dark right now: its upgrade is paused.</b>':''}</p>
  ${upkeepParts().map((p,i)=>`<div class="row"><div class="grow">${i+1}. ${p.k==='main'?'🏰':p.k==='tower'?'🗼':'⛺'} ${p.name}<small>${fmt(p.cost)}/day · if unpaid: ${p.k==='main'?'upgrade pauses':'stops defending'}${(p.k==='tower'&&W().towers[p.id].online===false)||(p.k==='op'&&(W().outposts[p.id]||{}).online===false)?' · <b>dark now</b>':''}</small></div></div>`).join('')}`;
  const fl=b.querySelector('.flavor')||b.querySelector('.seg');if(fl)fl.insertAdjacentHTML('afterend',h);else b.insertAdjacentHTML('afterbegin',h);}catch(e){console.warn('mt',e);}};
