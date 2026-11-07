// v20 Troops, full spec part 1 (Pope picked the full TROOPS-SPEC, Nov 3). Builds on stage8.js (home / training / marching /
// stationed / returning). Adds: tiers from Barracks level, food+water+scrap cost, wounded + hospital + healing,
// win/loss wounded split, overflow wounded slowly die (1%/hr, approved Nov 1), per-march troop cap, nightly food upkeep with a
// Hungry state (never kills troops), and the horde scaling with your home troop power.
// Deviations from the spec text (economy check, tune in TR2): training cost is per 100 troops, not per troop. At spec cost
// (1 food per troop) 1,000 troops would eat about a week of a 500-hex crew's food. Troop cap stays on Stronghold level (stage8).
const TR2={
  tierPower:[1,1.4,1.9,2.5,3.2],            // per-troop power by tier (T1..T5); tier = ceil(Barracks level / 2)
  costPer100:{food:4,water:4,scrap:5},      // T1 cost per 100 troops; x1.4 per tier above T1
  tierCostMult:1.4,
  woundWin:0.85, woundLoss:0.60,            // share of casualties that come home wounded (rest are dead)
  hospitalPct:0.20,                         // beds = 20% of the troop cap
  healCostPct:0.40, healHoursPer1k:1, freeHealPerDay:200,
  overflowDiePerHour:0,                     // 12f: wounded with no bed wait for one (was 1%/hr deaths)
  marchCapBase:2000, marchCapPerBarracks:1000,
  upkeepPerTroops:200,                      // 1 food per 200 troops each night (after structures)
  hungryAtk:0.10,                           // Hungry: marches -10% ATK, training paused, until the next reset
  hordeTroopShare:0.5,                      // gang strength + 50% of your home troop power
};
const _tr2_basePower=TROOP.powerPer;
function troopTier(){return Math.min(5,Math.max(1,Math.ceil(barracks().level/2)));}
Object.defineProperty(TROOP,'powerPer',{configurable:true,get(){return _tr2_basePower*TR2.tierPower[troopTier()-1];}});
function T2(){const t=TP();t.wounded=t.wounded||0;t.healing=t.healing||[];t.healFree=t.healFree||{day:'',n:0};return t;}
function hospitalBeds(){return Math.round(troopCap()*TR2.hospitalPct);}
function troopsHealing(){return T2().healing.reduce((a,q)=>a+q.n,0);}
function troopTotal(){const t=T2();return t.home+troopsAway()+troopsQueued()+t.wounded+troopsHealing();}
function marchTroopCap(){return TR2.marchCapBase+TR2.marchCapPerBarracks*barracks().level;}
function isHungry(){return !!W().hungry;}

// ---- cost + cap
trainCost=function(n){const m=Math.pow(TR2.tierCostMult,troopTier()-1),o={};for(const [k,v] of Object.entries(TR2.costPer100))o[k]=Math.ceil(n/100*v*m);return o;};
const _tr2_room=troopRoom;troopRoom=function(){const t=T2();return Math.max(0,_tr2_room()-t.wounded-troopsHealing());};
const _tr2_train=trainTroops;trainTroops=function(n){if(isHungry())return toast('🍞 Your troops are Hungry: training is paused until the next reset');return _tr2_train.apply(this,arguments);};

// ---- power: tier + Hungry
const _tr2_unit=troopUnit;troopUnit=function(n){const u=_tr2_unit(n);u.name=`🪖 ${n.toLocaleString()} T${troopTier()} troops`;if(isHungry())u.atk=Math.round(u.atk*(1-TR2.hungryAtk));return u;};

// ---- per-march cap
const _tr2_add=NET.addMarch.bind(NET);NET.addMarch=async function(d){if(G.troopSend>marchTroopCap())G.troopSend=marchTroopCap();return _tr2_add(d);};
const _tr2_amb=addMarchBtn;addMarchBtn=function(id){_tr2_amb.apply(this,arguments);try{const row=document.querySelector('#modalBody .troopsel');if(!row)return;const cap=marchTroopCap();
  const fix=()=>{row.querySelectorAll('button[data-n]').forEach(b=>{if(+b.dataset.n>cap){b.dataset.n=cap;b.textContent=`Max ${cap.toLocaleString()}`;}});
    const s=row.querySelector('small');if(s&&!s.dataset.cap){s.dataset.cap=1;s.insertAdjacentHTML('beforeend',` · max ${cap.toLocaleString()} per march${isHungry()?' · 🍞 Hungry −10% ATK':''}`);}};
  fix();new MutationObserver(()=>{if(!row.querySelector('small[data-cap]'))fix();}).observe(row,{childList:true});}catch(e){console.warn('troop cap',e);}};

// ---- casualties: split into wounded and dead
function woundSplit(lost,won){const w=Math.round(lost*(won?TR2.woundWin:TR2.woundLoss));return{wounded:w,dead:lost-w};}
function addWounded(n){if(n>0){T2().wounded+=n;}}
const _tr2_res=resolveMarch;resolveMarch=async function(id,m){const before=(TP().away||{})[id];const r=await _tr2_res.apply(this,arguments);
  try{P.woundDone=P.woundDone||{};if(before!=null&&m&&m.troopsLost>0&&!P.woundDone[id]){P.woundDone[id]=1;const s=woundSplit(m.troopsLost,m.win!==false);addWounded(s.wounded);m.troopsWounded=s.wounded;m.troopsDead=s.dead;save();
    report(`🩹 March to ${hexName(m.to)}: ${s.wounded.toLocaleString()} wounded, ${s.dead.toLocaleString()} dead`,s.dead===0);}}catch(e){console.warn('wounds',e);}return r;};
// defense fights (home troops + stationed troops): stage8 removes the losses; we bring the wounded share back
function _tr2_sum(){const t=TP();return t.home+Object.values(stationed()).reduce((a,s)=>a+s.n,0);}
const _tr2_sr=squadReplay;squadReplay=function(defs,dp,sp,g){const b=_tr2_sum();const f=_tr2_sr.apply(this,arguments);try{const lost=b-_tr2_sum();if(lost>0){const s=woundSplit(lost,dp>=sp);addWounded(s.wounded);save();
  report(`🩹 Defense: ${s.wounded.toLocaleString()} troops wounded, ${s.dead.toLocaleString()} dead`,s.dead===0);}}catch(e){}return f;};

// ---- hospital: free daily heals, paid heals, overflow decay
function healCost(n){const c=trainCost(n),o={};for(const k in c)o[k]=Math.ceil(c[k]*TR2.healCostPct);return o;}
function healMs(n){return n/1000*TR2.healHoursPer1k*3600e3;}
function queueHeal(n){const t=T2();n=Math.min(n,t.wounded);if(n<=0)return 0;t.wounded-=n;const start=Math.max(Date.now(),...t.healing.map(q=>q.end));t.healing.push({n,end:start+healMs(n)});return n;}
function healTroops(n){const t=T2();n=Math.min(n,t.wounded);if(n<=0)return toast('No wounded troops');const c=healCost(n);if(!canPay(c))return toast('Not enough supplies to heal');pay(c);queueHeal(n);save();toast(`💊 Healing ${n.toLocaleString()} troops`);UI.render();}
function hospitalTick(){const t=T2(),now=Date.now();let done=0;
  t.healing=t.healing.filter(q=>{if(q.end<=now){t.home+=q.n;done+=q.n;return false;}return true;});
  const day=pacificDate();if(t.healFree.day!==day){t.healFree={day,n:0};}
  const free=Math.min(t.wounded,TR2.freeHealPerDay-t.healFree.n);if(free>0){queueHeal(free);t.healFree.n+=free;}
  // overflow: wounded beyond free beds lose 1%/hr (computed from the last tick, so it works offline too)
  const last=t.overT||now,hrs=(now-last)/3600e3;t.overT=now;const over=Math.max(0,t.wounded-Math.max(0,hospitalBeds()-troopsHealing()));
  if(over>0&&hrs>0){const died=Math.min(over,Math.floor(over*(1-Math.pow(1-TR2.overflowDiePerHour,hrs))));if(died>0){t.wounded-=died;t.overDied=(t.overDied||0)+died;}}
  if(done>0){report(`💊 ${done.toLocaleString()} troops healed and back home`,true);}if(done||free>0)save();}
setInterval(()=>{try{if(P&&P.world)hospitalTick();}catch(e){}},15e3);

// ---- nightly food upkeep, after structures. Never deletes troops: short = Hungry until the next reset.
function troopUpkeep(){return{food:Math.ceil(troopTotal()/TR2.upkeepPerTroops)};}
if(typeof payUpkeep5==='function'){const _tr2_pay=payUpkeep5;payUpkeep5=function(){const off=_tr2_pay.apply(this,arguments);try{const c=troopUpkeep(),w=W();
  if(c.food>0){if(canPay(c)){pay(c);w.hungry=false;}else{w.hungry=true;report(`🍞 Not enough food for your troops (${c.food}🥫). They are Hungry until the next reset: −10% march ATK, training paused.`,false);}}else w.hungry=false;}catch(e){console.warn('troop upkeep',e);}return off;};}
if(typeof towerUpkeep==='function'){const _tr2_tu=towerUpkeep;towerUpkeep=function(){const u=_tr2_tu.apply(this,arguments);try{u.food=(u.food||0)+troopUpkeep().food;}catch(e){}return u;};}

// ---- horde answers your army
const _tr2_land=landStr;landStr=function(){return _tr2_land()+Math.round(TR2.hordeTroopShare*TP().home*TROOP.powerPer);};

// ---- Barracks tab: tier, hospital, upkeep (added under the stage8 sections)
HOOK.render(function(){try{if(this.tab!=='base'||this.sub.base!=='barracks')return;hospitalTick();const b=$('#sheetBody'),t=T2(),beds=hospitalBeds(),heal=troopsHealing(),over=Math.max(0,t.wounded-Math.max(0,beds-heal));
  const lv=b.querySelector('h2 .lv');if(lv&&!lv.dataset.t){lv.dataset.t=1;lv.textContent+=` · T${troopTier()}`;}
  b.querySelectorAll('p.tiny').forEach(p=>{if(/Train troops from scrap/.test(p.textContent))p.innerHTML=`Train <b>T${troopTier()}</b> troops (power ×${TR2.tierPower[troopTier()-1]} each; every 2 Barracks levels = next tier, and all your troops move up). They defend your Stronghold, towers and outposts and can join marches (max <b>${marchTroopCap().toLocaleString()}</b> per march). Upkeep: 1🥫 per ${TR2.upkeepPerTroops} troops each night.`;});
  const n=Math.min(t.wounded,Math.max(0,beds-heal)),hc=healCost(n);
  b.insertAdjacentHTML('beforeend',`<h2>🩹 Hospital</h2>
   <div class="row"><div class="grow"><b>${t.wounded.toLocaleString()}</b> wounded · <b>${heal.toLocaleString()}</b> healing<small>Beds ${Math.min(beds,t.wounded+heal).toLocaleString()} / ${beds.toLocaleString()} (20% of your troop cap) · first ${TR2.freeHealPerDay} heal free each day</small></div></div>
   ${t.healing.map(q=>`<div class="row tq"><div class="grow">💊 ${q.n.toLocaleString()} healing<small>home in ${fmtDur(Math.max(0,q.end-Date.now()))}</small></div></div>`).join('')}
   ${over?`<div class="row warn">⚠️ ${over.toLocaleString()} wounded are waiting for a bed. 200 heal free each day, or pay to heal them now.</div>`:''}
   ${n?`<div class="row"><div class="grow">Heal ${n.toLocaleString()}<small>${tcost(hc)} · ${fmtDur(healMs(n))}</small></div><button class="fight" onclick="healTroops(${n})">Heal</button></div>`:''}
   <h2>🍞 Food</h2><div class="row"><div class="grow">Tonight's troop upkeep: <b>${troopUpkeep().food}🥫</b><small>${isHungry()?'🍞 HUNGRY now: −10% march ATK, training paused until the next reset':'Paid after buildings at the daily reset. If short, troops go Hungry (nobody dies).'}</small></div></div>`);}catch(e){console.warn('hospital tab',e);}});
// resource bar: red cross when anyone is wounded
const _tr2_hud=UI.hud;UI.hud=function(){_tr2_hud.apply(this,arguments);try{const c=$('#troopchip'),w=T2().wounded+troopsHealing();if(c&&w&&!c.querySelector('.wnd'))c.insertAdjacentHTML('beforeend',` <em class="wnd">🩹${kfmt(w)}</em>`);if(c&&isHungry()&&!c.querySelector('.hgr'))c.insertAdjacentHTML('beforeend',' <em class="hgr">🍞</em>');}catch(e){}};
