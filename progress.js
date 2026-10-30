// Stage 1 progression: 6 stats, 3 skill trees, Stronghold with offline real-time timers.
const SKILLS={
  combat:{name:'Combat',icon:'⚔️',list:{
    power:{name:'Power',desc:'+3 Attack per rank',fx:{atk:3}},
    vitality:{name:'Vitality',desc:'+15 Health per rank',fx:{hp:15}},
    guard:{name:'Guard',desc:'+2 Defense per rank',fx:{def:2}},
    precision:{name:'Precision',desc:'+2% Critical per rank',fx:{crit:2}}}},
  scavenger:{name:'Scavenger',icon:'🔦',list:{
    keen:{name:'Keen Eye',desc:'+4% chance of gear drops, better rarity',fx:{lootq:4}},
    haul:{name:'Big Haul',desc:'+8% resources from fights',fx:{resb:8}},
    explorer:{name:'Explorer',desc:'+20% landmark & quest rewards',fx:{explore:20}},
    lucky:{name:'Lucky Find',desc:'+2 Luck per rank',fx:{luck:2}}}},
  survivor:{name:'Survivor',icon:'🛡️',list:{
    endurance:{name:'Endurance',desc:'Heal +1 HP faster per rank',fx:{regen:1}},
    evasive:{name:'Evasive',desc:'+2 Agility per rank',fx:{agi:2}},
    fortify:{name:'Fortify',desc:'-5% outpost cost per rank',fx:{outcost:5}},
    builder:{name:'Builder',desc:'-6% Stronghold upgrade time per rank',fx:{buildt:6}}}},
};
const SKILL_MAX=5;
const STAT_INFO={atk:['⚔️','Attack'],def:['🛡️','Defense'],hp:['❤️','Health'],crit:['💥','Critical %'],agi:['💨','Agility'],luck:['🍀','Luck']};
function skillFx(k){let v=0;for(const t in SKILLS)for(const s in SKILLS[t].list){const r=(P.skills||{})[s]||0,f=SKILLS[t].list[s].fx[k];if(f)v+=f*r;}return v;}
function stats(){const L=P.lvl,SL=strongholdLevel();
  let s={atk:8+L*2,def:2+L,hp:100+L*10,crit:5,agi:3+Math.floor(L/2),luck:3+Math.floor(L/3)};
  for(const k in s)s[k]+=skillFx(k);
  s.def+=SL*2;s.hp+=SL*10;
  Object.values(P.equip).forEach(id=>{const g=P.inv.find(x=>x.id===id);if(g)for(const k in s)s[k]+=g[k]||0;});return s;}
// Agility: dodge chance + chance of a bonus strike. Luck: better loot. Crit: double-ish hits.
function simulateRound(me,foe){
  if(Math.random()*100<Math.min(35,(foe.agi||0)*1.2))return{dmg:0,crit:false,dodge:true};
  const crit=Math.random()*100<me.crit;let raw=me.atk*(0.85+Math.random()*.3)*(crit?1.8:1);
  let dmg=Math.max(1,Math.round(raw-foe.def*.6));
  if(Math.random()*100<(me.agi||0)*.8)dmg=Math.round(dmg*1.5);
  return{dmg,crit};}
function addXP(n){P.xp+=n;while(P.xp>=P.lvl*100){P.xp-=P.lvl*100;P.lvl++;P.sp=(P.sp||0)+1;P.hp=stats().hp;toast('⬆️ Level '+P.lvl+'! +1 skill point');UI.badge('player',true);allianceLog(`${P.name} reached level ${P.lvl}`);}}
function spendSkill(id){if(!(P.sp>0))return toast('No skill points: level up to earn more');P.skills=P.skills||{};
  if((P.skills[id]||0)>=SKILL_MAX)return toast('Maxed');P.skills[id]=(P.skills[id]||0)+1;P.sp--;save();toast('Skill learned');}
function respecSkills(){const c={scrap:50};if(!canPay(c))return toast('Need 50 🔩 to reset skills');pay(c);
  P.sp=(P.sp||0)+Object.values(P.skills||{}).reduce((a,b)=>a+b,0);P.skills={};save();}

// ----- Stronghold (one exterior, levels 1-10). Timers are timestamps, so they keep running offline.
const SH_MAX=10;
function shCost(l){return{scrap:Math.round(40*l**1.6),food:Math.round(15*l**1.4),water:Math.round(15*l**1.4),fuel:l>=3?Math.round(5*l**1.3):0,parts:l>=4?Math.round(2*l**1.5):0};}
function shTime(l){return Math.round((l===1?2:l*l*5)*60e3*(1-Math.min(.5,skillFx('buildt')/100)));} // ms
function strongholdLevel(){const S=P.stronghold||{level:1};return S.level||1;}
function shTick(){const S=P.stronghold;if(S&&S.upEnd&&Date.now()>=S.upEnd){S.level++;S.upEnd=null;save();toast('🏰 Stronghold reached level '+S.level+'!');
  allianceLog(`${P.name}'s Stronghold reached level ${S.level}`);if(UI.tab)UI.render();}}
function shUpgrade(){P.stronghold=P.stronghold||{level:1};const S=P.stronghold;if(S.upEnd)return toast('Already upgrading');if(S.level>=SH_MAX)return toast('Max level');
  const c=Object.fromEntries(Object.entries(shCost(S.level)).filter(([,v])=>v));if(!canPay(c))return toast('Not enough resources');
  pay(c);S.upStart=Date.now();S.upEnd=Date.now()+shTime(S.level);save();toast('🏗️ Upgrade started');}
setInterval(shTick,1000);
function fmtDur(ms){ms=Math.max(0,ms);const s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h}h ${m}m`:m?`${m}m ${s%60}s`:`${s}s`;}

// Simple SVG fortress that grows with level: wider walls, more towers, taller keep, spikes, flags, lights.
function strongholdSVG(l){
  const W=320,H=220,g=190,c='#6b6355',d='#4a443b',hi='#8a8070',acc='#d6a03a';let s='';
  const keepW=40+l*6,keepH=40+l*9,kx=W/2-keepW/2;
  // ground + rubble
  s+=`<rect x="0" y="${g}" width="${W}" height="${H-g}" fill="#2a2620"/>`;
  // outer wall (lvl 3+)
  if(l>=3){const ww=120+l*16,wh=24+l*3;s+=`<rect x="${W/2-ww/2}" y="${g-wh}" width="${ww}" height="${wh}" fill="${d}" stroke="#222"/>`;
    for(let x=W/2-ww/2;x<W/2+ww/2-6;x+=14)s+=`<rect x="${x}" y="${g-wh-7}" width="8" height="8" fill="${d}"/>`;
    s+=`<rect x="${W/2-14}" y="${g-24}" width="28" height="24" rx="12" fill="#1a1714"/>`;}
  // towers
  const nt=l>=2?Math.min(6,2+Math.floor((l-2)/2)*2):0;
  for(let i=0;i<nt;i++){const side=i%2?1:-1,k=Math.floor(i/2),tx=W/2+side*(keepW/2+18+k*34)-11,th=50+l*6-k*12;
    s+=`<rect x="${tx}" y="${g-th}" width="22" height="${th}" fill="${c}" stroke="#222"/><rect x="${tx-3}" y="${g-th-6}" width="28" height="7" fill="${hi}"/>`;
    if(l>=5)s+=`<rect x="${tx+8}" y="${g-th+14}" width="6" height="8" fill="${acc}" opacity=".8"/>`;}
  // keep
  s+=`<rect x="${kx}" y="${g-keepH}" width="${keepW}" height="${keepH}" fill="${c}" stroke="#222"/>`;
  for(let x=kx;x<kx+keepW-4;x+=10)s+=`<rect x="${x}" y="${g-keepH-6}" width="6" height="7" fill="${c}"/>`;
  s+=`<rect x="${W/2-8}" y="${g-22}" width="16" height="22" fill="#1a1714"/>`;
  if(l>=4)for(let r=0;r<Math.min(3,l-3);r++)s+=`<rect x="${W/2-4}" y="${g-keepH+12+r*18}" width="8" height="10" fill="${acc}" opacity=".85"/>`;
  // scrap plating / patches
  for(let i=0;i<l;i++)s+=`<rect x="${kx+5+(i*13)%(keepW-14)}" y="${g-keepH+20+(i*17)%(keepH-40>0?keepH-40:10)}" width="9" height="6" fill="#7a5a3a" opacity=".7"/>`;
  // spikes (lvl 6+)
  if(l>=6)for(let x=20;x<W-20;x+=16)s+=`<path d="M${x} ${g} l5 -${8+l} l5 ${8+l}z" fill="#555"/>`;
  // flag
  const fy=g-keepH-6;s+=`<line x1="${W/2}" y1="${fy}" x2="${W/2}" y2="${fy-26-l}" stroke="#aaa" stroke-width="2"/><path d="M${W/2} ${fy-26-l} l${18+l} 6 l-${18+l} 6z" fill="${P.color||acc}"/>`;
  // searchlight (lvl 8+)
  if(l>=8)s+=`<path d="M${W/2} ${fy-10} L40 10 L90 6Z" fill="#ffeeaa" opacity=".12"/>`;
  if(l>=10)s+=`<circle cx="${W/2}" cy="${g-keepH/2}" r="${keepW}" fill="${acc}" opacity=".06"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" class="fort" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1f24"/><stop offset="1" stop-color="#3a2e22"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sky)"/>${s}</svg>`;}
