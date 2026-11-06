// v20 Skill trees v2. 4 shared trees (Combat, Scavenger, Survivor, Command) + 1 tree per class.
// * Skill points: 1 per level + 1 bonus every 5 levels. Shared trees spend these.
// * Class points: 1 per 2 levels. EACH class tree gets the full class-point pool and keeps its ranks, so switching class
//   brings back that class's tree as you left it (like jobs). Only your current class's tree is active.
// * Tiers: a node unlocks once you've put enough points into THAT tree (shared 0/4/8/12, class 0/3/6). Tier 4 = capstone.
// * Old ranks (power, vitality, guard, precision, keen, haul, explorer, lucky, endurance, evasive, fortify, builder) keep their ids.
// New effect keys and where they act: marchSpd (% faster marches), load (% more march load), trainSpd (% faster training),
// troopPow (% troop power), towerPow (% tower power), income (% tile income), healCost (% cheaper heals), upkeep (% cheaper building upkeep).
const SK2={tierPts:[0,4,8,12],clsTierPts:[0,3,6,9],bonusEvery:5,respecPerLevel:50};
const SKN=(id,name,tier,max,fx,desc)=>({id,name,tier,max,fx,desc});
const SHARED_TREES={
  combat:{name:'Combat',icon:'⚔️',nodes:[
    SKN('power','Power',1,5,{atk:3},'+3 Attack per rank'),SKN('vitality','Vitality',1,5,{hp:15},'+15 Health per rank'),
    SKN('guard','Guard',2,5,{def:2},'+2 Defense per rank'),SKN('precision','Precision',2,5,{crit:2},'+2% Critical per rank'),
    SKN('ironhide','Ironhide',3,3,{def:4,hp:20},'+4 Defense, +20 Health per rank'),SKN('killer','Killer Instinct',3,3,{atk:6,crit:2},'+6 Attack, +2% Critical per rank'),
    SKN('warborn','Warborn',4,1,{atk:10,def:10,hp:50},'Capstone: +10 Attack, +10 Defense, +50 Health')]},
  scavenger:{name:'Scavenger',icon:'🔦',nodes:[
    SKN('keen','Keen Eye',1,5,{lootq:4},'+4% better gear drops per rank'),SKN('haul','Big Haul',1,5,{resb:8},'+8% resources from fights per rank'),
    SKN('explorer','Explorer',2,5,{explore:20},'+20% landmark & quest rewards per rank'),SKN('lucky','Lucky Find',2,5,{luck:2},'+2 Luck per rank'),
    SKN('packmule','Pack Mule',3,3,{load:10},'+10% march load per rank'),SKN('landlord','Landlord',3,5,{income:3},'+3% tile income per rank'),
    SKN('kingpin','Kingpin',4,1,{income:10,resb:10},'Capstone: +10% tile income, +10% fight resources')]},
  survivor:{name:'Survivor',icon:'🛡️',nodes:[
    SKN('endurance','Endurance',1,5,{regen:1},'Heal +1 HP faster per rank'),SKN('evasive','Evasive',1,5,{agi:2},'+2 Agility per rank'),
    SKN('fortify','Fortify',2,5,{outcost:5},'-5% outpost cost per rank'),SKN('builder','Builder',2,5,{buildt:6},'-6% Stronghold upgrade time per rank'),
    SKN('quartermaster','Quartermaster',3,4,{upkeep:5},'-5% building upkeep per rank'),SKN('medic','Field Medic',3,5,{healCost:8},'-8% troop heal cost per rank'),
    SKN('bastion','Bastion',4,1,{towerPow:15,upkeep:10},'Capstone: +15% tower power, -10% building upkeep')]},
  command:{name:'Command',icon:'🎖️',nodes:[
    SKN('drill','Drill Sergeant',1,5,{trainSpd:5},'+5% faster troop training per rank'),SKN('marcher','Forced March',1,5,{marchSpd:4},'+4% faster marches per rank'),
    SKN('discipline','Discipline',2,5,{troopPow:3},'+3% troop power per rank'),SKN('supply','Supply Train',2,3,{load:8},'+8% march load per rank'),
    SKN('warden','Warden',3,4,{towerPow:5},'+5% tower power per rank'),SKN('rally','Rally Cry',3,3,{troopPow:2,marchSpd:2},'+2% troop power, +2% march speed per rank'),
    SKN('general','General',4,1,{troopPow:10,trainSpd:10},'Capstone: +10% troop power, +10% faster training')]},
};
const CLASS_TREES={
  scout:{name:'Scout tree',icon:'🔭',nodes:[
    SKN('s_fleet','Fleet Foot',1,5,{marchSpd:4},'+4% faster marches per rank'),SKN('s_eagle','Eagle Eye',1,5,{agi:2},'+2 Agility per rank'),
    SKN('s_trail','Trailblazer',2,3,{explore:10},'+10% landmark & quest rewards per rank'),SKN('s_forage','Forager',2,3,{lootq:6},'+6% better gear drops per rank'),
    SKN('s_ghost','Ghost',3,3,{crit:3,agi:3},'+3% Critical, +3 Agility per rank'),SKN('s_far','Far Sight',4,1,{marchSpd:15,lootq:10},'Capstone: +15% faster marches, +10% better drops')]},
  engineer:{name:'Engineer tree',icon:'🔧',nodes:[
    SKN('e_mason','Mason',1,5,{buildt:5},'-5% Stronghold upgrade time per rank'),SKN('e_sapper','Sapper',1,5,{towerPow:4},'+4% tower power per rank'),
    SKN('e_thrift','Thrifty',2,4,{upkeep:5},'-5% building upkeep per rank'),SKN('e_outfit','Outfitter',2,3,{outcost:8},'-8% outpost cost per rank'),
    SKN('e_rebar','Rebar Skin',3,3,{def:4,hp:20},'+4 Defense, +20 Health per rank'),SKN('e_arch','Architect',4,1,{towerPow:15,buildt:15},'Capstone: +15% tower power, -15% upgrade time')]},
  raider:{name:'Raider tree',icon:'⚔️',nodes:[
    SKN('r_blood','Bloodlust',1,5,{atk:3},'+3 Attack per rank'),SKN('r_plunder','Plunder',1,5,{resb:8},'+8% resources from fights per rank'),
    SKN('r_warband','Warband',2,5,{troopPow:4},'+4% troop power per rank'),SKN('r_drill','Drillmaster',2,3,{trainSpd:6},'+6% faster training per rank'),
    SKN('r_butcher','Butcher',3,3,{crit:3,atk:4},'+3% Critical, +4 Attack per rank'),SKN('r_lord','Warlord',4,1,{troopPow:10,resb:15},'Capstone: +10% troop power, +15% fight resources')]},
};
const ALL_NODES={};for(const T of [...Object.values(SHARED_TREES),...Object.values(CLASS_TREES)])for(const n of T.nodes){ALL_NODES[n.id]=n;}
for(const [tid,T] of Object.entries(SHARED_TREES))T.nodes.forEach(n=>n.tree=tid);for(const [cid,T] of Object.entries(CLASS_TREES))T.nodes.forEach(n=>{n.tree='cls_'+cid;n.cls=cid;});
// rebuild SKILLS (same shape the old skillFx reads): shared trees always, plus the CURRENT class tree only
function syncSkills(){for(const k in SKILLS)delete SKILLS[k];
  for(const [tid,T] of Object.entries(SHARED_TREES))SKILLS[tid]={name:T.name,icon:T.icon,list:Object.fromEntries(T.nodes.map(n=>[n.id,{name:n.name,desc:n.desc,fx:n.fx}]))};
  const c=P&&P.cls&&P.cls.id;if(c&&CLASS_TREES[c]){const T=CLASS_TREES[c];SKILLS['cls_'+c]={name:T.name,icon:T.icon,list:Object.fromEntries(T.nodes.map(n=>[n.id,{name:n.name,desc:n.desc,fx:n.fx}]))};}}
// points
function skillPtsTotal(){return Math.max(0,(P.lvl||1)-1)+Math.floor((P.lvl||1)/SK2.bonusEvery);}
function skillPtsSpent(){let s=0;for(const [id,r] of Object.entries(P.skills||{})){const n=ALL_NODES[id];if(n&&!n.cls)s+=r;else if(!n)s+=r;}return s;}
function classPtsTotal(){return Math.floor((P.lvl||1)/2);}
function classPtsSpent(cid){let s=0;for(const [id,r] of Object.entries(P.skills||{})){const n=ALL_NODES[id];if(n&&n.cls===cid)s+=r;}return s;}
function syncSP(){P.skills=P.skills||{};for(const id of Object.keys(P.skills))if(!ALL_NODES[id])delete P.skills[id]; // unknown old ids are refunded
  P.sp=Math.max(0,skillPtsTotal()-skillPtsSpent());}
function treePts(tree){return Object.entries(P.skills||{}).reduce((a,[id,r])=>a+(ALL_NODES[id]&&ALL_NODES[id].tree===tree?r:0),0);}
function nodeLock(n){const pts=treePts(n.tree),need=(n.cls?SK2.clsTierPts:SK2.tierPts)[n.tier-1];return pts<need?`Needs ${need} points in this tree (${pts})`:null;}
spendSkill=function(id){const n=ALL_NODES[id];if(!n)return;P.skills=P.skills||{};const r=P.skills[id]||0;if(r>=n.max)return toast('Maxed');const lk=nodeLock(n);if(lk)return toast('🔒 '+lk);
  if(n.cls){if(!P.cls||P.cls.id!==n.cls)return toast('Switch to this class to train its tree');if(classPtsSpent(n.cls)>=classPtsTotal())return toast('No class points: 1 every 2 levels');}
  else{syncSP();if(!(P.sp>0))return toast('No skill points: level up to earn more');}
  P.skills[id]=r+1;syncSP();save();toast(`${n.name} ${r+1}/${n.max}`);};
respecCost=function(){return SK2.respecPerLevel*P.lvl;};
respecSkills=function(){const c={scrap:respecCost()};if(!canPay(c))return toast(`Need ${c.scrap} 🔩 to reset skills`);pay(c);
  const cid=P.cls&&P.cls.id;for(const id of Object.keys(P.skills||{})){const n=ALL_NODES[id];if(!n||!n.cls||n.cls===cid)delete P.skills[id];}syncSP();save();toast('🌳 Skills reset');};
// level up: the bonus point every 5 levels
const _sk2_addXP=addXP;addXP=function(){const L=P.lvl;const r=_sk2_addXP.apply(this,arguments);if(P.lvl!==L){syncSP();if(Math.floor(P.lvl/SK2.bonusEvery)>Math.floor(L/SK2.bonusEvery))toast(`🌳 Bonus skill point (every ${SK2.bonusEvery} levels)`);}return r;};
// class change swaps the class tree
const _sk2_tick=classTick;classTick=function(){const was=P.cls&&P.cls.id;const r=_sk2_tick.apply(this,arguments);if((P.cls&&P.cls.id)!==was)syncSkills();return r;};
const _sk2_pick=pickClass;pickClass=function(){const r=_sk2_pick.apply(this,arguments);syncSkills();try{UI.render();}catch(e){}return r;};
try{syncSkills();syncSP();save();}catch(e){console.warn('skills2 init',e);}
const _sk2_adopt=adoptProfile;adoptProfile=function(){const r=_sk2_adopt.apply(this,arguments);try{syncSkills();syncSP();}catch(e){}return r;};

// ---- hooks for the new effect keys
const sk2pct=k=>skillFx(k)/100;
const _sk2_md=marchDur;marchDur=function(){const d=_sk2_md.apply(this,arguments);return Math.round(d/(1+sk2pct('marchSpd')));};
if(typeof marchLoad==='function'){const _sk2_ml=marchLoad;marchLoad=function(n){return Math.round(_sk2_ml(n)*(1+sk2pct('load')));};}
if(typeof trainMs==='function'){const _sk2_tm=trainMs;trainMs=function(n){return _sk2_tm(n)/(1+sk2pct('trainSpd'));};}
if(typeof TROOP!=='undefined'){const d=Object.getOwnPropertyDescriptor(TROOP,'powerPer');if(d&&d.get){const g=d.get;Object.defineProperty(TROOP,'powerPer',{configurable:true,get(){return g()*(1+sk2pct('troopPow'));}});}}
const _sk2_tp=towerPower;towerPower=function(t){return Math.round(_sk2_tp(t)*(1+sk2pct('towerPow')));};
if(typeof grossIncome==='function'){const _sk2_gi=grossIncome;grossIncome=function(){const g=_sk2_gi.apply(this,arguments),m=1+sk2pct('income');if(m!==1)for(const k in g)g[k]=Math.round(g[k]*m);return g;};}
if(typeof healCost==='function'){const _sk2_hc=healCost;healCost=function(n){const c=_sk2_hc(n),m=Math.max(0.2,1-sk2pct('healCost'));for(const k in c)c[k]=Math.ceil(c[k]*m);return c;};}
if(typeof upkeepParts==='function'){const _sk2_up=upkeepParts;upkeepParts=function(){const out=_sk2_up.apply(this,arguments),m=Math.max(0.3,1-sk2pct('upkeep'));if(m===1)return out;
  return out.map(p=>({...p,cost:Object.fromEntries(Object.entries(p.cost||{}).map(([k,v])=>[k,Math.ceil(v*m)]))}));};}

// ---- Hero › Skills tab
function treeHTML(tid,T,isCls){const pts=treePts(isCls?'cls_'+tid:tid),tiers=isCls?SK2.clsTierPts:SK2.tierPts;let h=`<div class="tree"><h3>${T.icon} ${T.name} <small>${pts} pts</small></h3>`;
  for(let t=1;t<=4;t++){const ns=T.nodes.filter(n=>n.tier===t);if(!ns.length)continue;const need=tiers[t-1],open=pts>=need;
    h+=`<div class="tier ${open?'open':'locked'}"><div class="tierlab">${t===4?'★ Capstone':'Tier '+t}${need?` · ${need} pts`:''}</div>`;
    for(const n of ns){const r=(P.skills||{})[n.id]||0,can=open&&r<n.max&&(isCls?(P.cls&&P.cls.id===tid&&classPtsSpent(tid)<classPtsTotal()):P.sp>0);
      h+=`<div class="node ${r?'has':''} ${t===4?'cap':''}"><div class="grow"><b>${n.name}</b> <span class="pips">${'●'.repeat(r)}${'○'.repeat(n.max-r)}</span><small>${n.desc}</small></div><button ${can?'':'disabled'} onclick="spendSkill('${n.id}');UI.render()">+</button></div>`;}
    h+='</div>';}return h+'</div>';}
HOOK.render(function(){try{if(this.tab!=='player'||this.sub.player!=='skills')return;syncSP();const b=$('#sheetBody');const seg=b.querySelector('.seg');
  const c=P.cls&&P.cls.id,cp=c?classPtsTotal()-classPtsSpent(c):0;
  const html=`<div class="skillhead"><div><b>${P.sp}</b> skill point${P.sp===1?'':'s'}<small>1 per level + 1 bonus every ${SK2.bonusEvery} levels</small></div>${c?`<div><b>${cp}</b> ${CLASSES.list[c].icon} class point${cp===1?'':'s'}<small>1 every 2 levels · each class tree keeps its own</small></div>`:'<div><small>Pick a class (Hero › Class) to open a class tree</small></div>'}</div>
    <div class="trees">${c?treeHTML(c,CLASS_TREES[c],true):''}${Object.entries(SHARED_TREES).map(([id,T])=>treeHTML(id,T,false)).join('')}</div>
    <button style="width:100%;margin-top:8px" onclick="UI.ask('Reset skills','Reset your shared trees${c?' and your '+CLASSES.list[c].name+' tree':''} for ${respecCost()} scrap? Points come back.','Reset').then(ok=>{if(ok){respecSkills();UI.render();}})">Reset skills (${respecCost()} 🔩)</button>`;
  b.innerHTML='';if(seg)b.append(seg);b.insertAdjacentHTML('beforeend',html);}catch(e){console.warn('skills tab',e);}});
