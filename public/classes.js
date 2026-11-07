// v20 Classes (Pope, Nov 3): 3 classes on top of the skill trees. First pick is instant and free.
// Switching takes 24 h and you KEEP your old class until the switch finishes (no classless gap). Unlimited switches, no resource cost.
// Every bonus is fixed math (no dice). Numbers live in CLASSES so they can be tuned in one place.
const CLASSES={
  switchHours:24,
  list:{
    scout:{name:'Scout',icon:'🔭',tag:'Eyes of the crew',
      fx:{agi:4,explore:25},                    // flat Agility, +25% landmark & quest rewards (same keys as skills)
      revealRing:1,                              // moving reveals the 6 hexes around you, not only your own
      marchSpeed:0.20,                           // marches arrive 20% sooner
      lines:['Moving reveals the ring of hexes around you','Marches are 20% faster','+4 Agility','+25% landmark & quest rewards']},
    engineer:{name:'Engineer',icon:'🔧',tag:'Builds it, keeps it running',
      fx:{def:4,buildt:25,outcost:15},          // flat Defense, -25% Stronghold upgrade time, -15% outpost cost
      barracksTime:0.25,                         // Barracks upgrades 25% faster
      upkeep:0.25,                               // -25% daily building upkeep
      lines:['Stronghold upgrades 25% faster','Barracks upgrades 25% faster','-25% daily building upkeep','-15% outpost cost','+4 Defense']},
    raider:{name:'Raider',icon:'⚔️',tag:'Hits hard, carries more home',
      fx:{atk:5,crit:5,resb:20,lootq:6},        // flat Attack and Critical, +20% fight resources, better gear drops
      load:0.25,                                 // marches carry 25% more
      lines:['+5 Attack, +5% Critical','+20% resources from fights','Better gear drop chance','Marches carry 25% more loot']},
  }};
function myClass(){const c=P.cls;return c&&c.id?CLASSES.list[c.id]:null;}
function classTick(){const c=P.cls;if(c&&c.next&&Date.now()>=c.nextT){const was=c.id;c.id=c.next;c.next=null;c.nextT=0;save();
  const k=CLASSES.list[c.id];toast(`${k.icon} You are now a ${k.name}`);try{report(`${k.icon} Class switch done: ${was?CLASSES.list[was].name+' → ':''}${k.name}`,true);}catch(e){}
  if(UI.tab==='player')UI.render();}}
setInterval(()=>{try{if(P&&P.name)classTick();}catch(e){}},30e3);
function pickClass(id){P.cls=P.cls||{};const c=P.cls;
  if(!c.id){c.id=id;save();toast(`${CLASSES.list[id].icon} You are a ${CLASSES.list[id].name}`);try{pushMember();}catch(e){}return UI.render();}
  if(id===c.id){c.next=null;c.nextT=0;save();toast('Switch cancelled');return UI.render();}
  c.next=id;c.nextT=Date.now()+CLASSES.switchHours*3600e3;save();toast(`⏳ Switching to ${CLASSES.list[id].name} in ${CLASSES.switchHours}h. You keep ${CLASSES.list[c.id].name} until then.`);UI.render();}

// ---- effects
const _cls_skillFx=skillFx;skillFx=function(k){const c=myClass();return _cls_skillFx(k)+((c&&c.fx[k])||0);};
const _cls_explore=explore;explore=function(ids){const c=myClass(),r=c&&c.revealRing;if(!r)return _cls_explore(ids);const keep=BAL.fog.pathRings;BAL.fog.pathRings=Math.max(keep,r);try{return _cls_explore(ids);}finally{BAL.fog.pathRings=keep;}};
const _cls_marchDur=marchDur;marchDur=function(){const d=_cls_marchDur.apply(this,arguments),c=myClass();return c&&c.marchSpeed?Math.round(d*(1-c.marchSpeed)):d;};
if(typeof marchLoad==='function'){const _cls_load=marchLoad;marchLoad=function(n){const v=_cls_load(n),c=myClass();return c&&c.load?Math.round(v*(1+c.load)):v;};}
if(typeof TROOP!=='undefined'){const _cls_bh=TROOP.barracks.hours;TROOP.barracks.hours=l=>{const c=myClass();return _cls_bh(l)*(1-((c&&c.barracksTime)||0));};}
if(typeof upkeepParts==='function'){const _cls_up=upkeepParts;upkeepParts=function(){const out=_cls_up.apply(this,arguments),c=myClass();if(!c||!c.upkeep)return out;
  return out.map(p=>({...p,cost:Object.fromEntries(Object.entries(p.cost||{}).map(([k,v])=>[k,Math.ceil(v*(1-c.upkeep))]))}));};}
HOOK.member(function(m){try{if(P.cls&&P.cls.id)m.cls=P.cls.id;}catch(e){}return m;});

// ---- Hero › Class tab
UI.SUBS.player.splice(1,0,['class','🎖️ Class']);
HOOK.render(function(){try{if(this.tab!=='player'||this.sub.player!=='class')return;const b=$('#sheetBody');if(!b)return;
  const c=P.cls||{},cur=c.id&&CLASSES.list[c.id],nx=c.next&&CLASSES.list[c.next];
  const head=cur?`<p>You are a <b>${cur.icon} ${cur.name}</b>${nx?` · switching to <b>${nx.icon} ${nx.name}</b> in <b>${fmtDur(c.nextT-Date.now())}</b> (you keep ${cur.name} until then)`:''}.</p>`
    :`<p><b>Pick your class.</b> The first pick is instant and free. Later switches take ${CLASSES.switchHours}h and you keep your old class until the switch is done.</p>`;
  const cards=Object.entries(CLASSES.list).map(([id,k])=>{const on=c.id===id,pend=c.next===id;
    const btn=on?(c.next?`<button class="btn-sec" onclick="pickClass('${id}')">Stay ${k.name}</button>`:'<button disabled>Current</button>')
      :pend?'<button disabled>Switching…</button>':`<button class="btn-primary" onclick="pickClass('${id}')">${c.id?`Switch (${CLASSES.switchHours}h)`:'Choose'}</button>`;
    return`<div class="card clscard${on?' on':''}"><h3>${k.icon} ${k.name}</h3><p class="tiny">${k.tag}</p><ul>${k.lines.map(l=>`<li>${l}</li>`).join('')}</ul>${btn}</div>`;}).join('');
  b.insertAdjacentHTML('beforeend',`<h2>🎖️ Class</h2>${head}<div class="clsgrid">${cards}</div><p class="tiny">Skill trees still apply on top of your class.</p>`);}catch(e){console.warn('class tab',e);}});
