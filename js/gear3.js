// v20 Gear v3: stats that make sense, item level, upgrades, perks, 6 sets (3 class sets), and a real paper-doll survivor.
//
// HOW STATS WORK (shown to players in the Gear tab):
//  * Every item has an item level (iLvl = the level of what dropped it) and a rarity.
//  * Its stat BUDGET = (6 + 1 x iLvl) x rarity (Common 1, Uncommon 1.25, Rare 1.6, Epic 2.1, Legendary 2.8) x upgrade (+6% per +1, max +10).
//  * Points cost: 1 ATK = 1 DEF = 4 HP = 1 point; 1 CRIT = 1 AGI = 1.5 points; 1 LUCK = 1.2 points.
//  * Each item name has a fixed MIX of that budget (Pipe Wrench = 85% ATK / 15% DEF). Two items of the same iLvl and rarity
//    are always worth the same; they just lean differently. No hidden dice after the drop.
//  * Epic and Legendary items also roll one PERK (bigger loot, faster builds, ...). Legendary perks are doubled.
//  * Sets (head, chest, legs, boots): 2 pieces and 4 pieces give % bonuses that keep mattering at every level.
// Numbers live in GEAR3. Art: assets/gear/README.md.
const GEAR3={budgetBase:6,budgetPerLvl:1,upPct:0.06,maxUp:10,cost:{atk:1,def:1,hp:0.25,crit:1.5,agi:1.5,luck:1.2},
  perks:[{k:'resb',v:8,t:'+{v}% resources from fights'},{k:'lootq',v:4,t:'+{v}% better gear drops'},{k:'explore',v:10,t:'+{v}% landmark & quest rewards'},
         {k:'regen',v:1,t:'+{v} HP regen'},{k:'buildt',v:6,t:'-{v}% Stronghold upgrade time'},{k:'outcost',v:6,t:'-{v}% outpost cost'}],
  setChance:0.25}; // chance a head/chest/legs/boots drop comes from a set base when its slot rolls
const STAT_K=['atk','def','hp','crit','agi','luck'];
// ---- item bases: slot + mix (shares of the budget) + optional set + art id (assets/gear/<slot>/<art>.png)
const GEAR3_BASES=[
  // weapons: main stat ATK
  ['weapon','Pipe Wrench',{atk:.85,def:.15}],['weapon','Nail Bat',{atk:.75,crit:.25}],['weapon','Scrap Crossbow',{atk:.65,crit:.35}],
  ['weapon','Rebar Spear',{atk:.7,agi:.3}],['weapon','Machete',{atk:.8,agi:.2}],['weapon','Riot Shield & Baton',{atk:.5,def:.5}],
  // trinkets: utility
  ['trinket','Lucky Bottlecap',{crit:.6,luck:.4}],['trinket','Geiger Charm',{hp:.6,crit:.4}],['trinket','Dog Tags',{atk:.5,def:.5}],
  ['trinket','Rabbit Foot',{luck:1}],['trinket','Old Compass',{agi:.5,luck:.5}],
  // armor: free pieces
  ['head','Welding Mask',{def:.6,crit:.4}],['chest','Tire Vest',{def:.5,hp:.5}],['legs','Patched Jeans',{def:.5,agi:.5}],['boots','Work Boots',{def:.6,hp:.4}],
  // sets (4 armor slots each)
  ['head','Hubcap Helm',{def:.7,hp:.3},'road'],['chest','Road-Sign Plate',{def:.8,hp:.2},'road'],['legs','Tire Greaves',{def:.6,hp:.4},'road'],['boots','Tread Boots',{def:1},'road'],
  ['head','Gas Mask',{hp:.7,def:.3},'hazmat'],['chest','Hazmat Coat',{hp:.7,def:.3},'hazmat'],['legs','Hazmat Pants',{hp:.8,def:.2},'hazmat'],['boots','Rubber Boots',{hp:1},'hazmat'],
  ['head','Runner Cap',{agi:.5,crit:.5},'runner'],['chest','Runner Jacket',{def:.4,agi:.6},'runner'],['legs','Track Pants',{agi:1},'runner'],['boots','Runner Sneakers',{agi:.8,luck:.2},'runner'],
  ['head','Scout Goggles',{agi:.5,luck:.5},'pathfinder'],['chest','Long Duster',{def:.4,agi:.3,luck:.3},'pathfinder'],['legs','Cargo Pants',{agi:.5,luck:.5},'pathfinder'],['boots','Trail Boots',{agi:.7,luck:.3},'pathfinder'],
  ['head','Hard Hat',{def:.8,hp:.2},'foreman'],['chest','Work Vest',{def:.6,hp:.4},'foreman'],['legs','Knee-Pad Carhartts',{def:.5,hp:.5},'foreman'],['boots','Steel-Toe Boots',{def:.7,hp:.3},'foreman'],
  ['head','Skull Helm',{atk:.4,def:.6},'warlord'],['chest','Spiked Plate',{atk:.4,def:.6},'warlord'],['legs','Chain Kilt',{atk:.3,def:.7},'warlord'],['boots','Stomper Boots',{atk:.3,def:.7},'warlord'],
].map(([slot,name,mix,set])=>({slot,name,mix,set:set||null,art:name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}));
const G3_BY_NAME=Object.fromEntries(GEAR3_BASES.map(b=>[b.name,b]));
const G3_LEGACY={'Sprint Shoes':'Runner Sneakers','Rabbit Foot':'Rabbit Foot'}; // old trinket "shoes" become boots
// ---- sets: % bonuses (+fx for class sets). b2 / b4 stack.
Object.assign(GEAR_SETS,{
  road:  {name:'Road Warrior',color:'#d6a03a',p2:{def:8},       p4:{def:10,hp:10}, f2:{},f4:{},for:'Defense'},
  hazmat:{name:'Hazmat',      color:'#8fd14f',p2:{hp:10},       p4:{hp:15},f2:{},f4:{regen:2},for:'Survival'},
  runner:{name:'Runner',      color:'#4ad7ff',p2:{agi:10},      p4:{agi:10,crit:10},f2:{},f4:{},for:'Speed'},
  pathfinder:{name:'Pathfinder',color:'#7fc8a9',p2:{},p4:{agi:8},f2:{explore:15},f4:{lootq:6,explore:10},for:'🔭 Scout'},
  foreman:{name:'Foreman',color:'#e0b050',p2:{def:5},p4:{},f2:{buildt:10},f4:{buildt:10,outcost:15},for:'🔧 Engineer'},
  warlord:{name:'Warlord',color:'#c8473a',p2:{atk:8},p4:{atk:5},f2:{},f4:{resb:15,crit:5},for:'⚔️ Raider'},
});
for(const S of Object.values(GEAR_SETS)){S.b2={};S.b4={};S.pieces=GEAR3_BASES.filter(b=>b.set&&GEAR_SETS[b.set]===S).map(b=>b.name);}
for(const k in SET_BY_NAME)delete SET_BY_NAME[k];GEAR3_BASES.forEach(b=>{if(b.set)SET_BY_NAME[b.name]=b.set;});
function rarMult(r){return RARITY[r].mult;}
function g3Budget(g){return(GEAR3.budgetBase+GEAR3.budgetPerLvl*(g.iLvl||1))*rarMult(g.rarity||0)*(1+GEAR3.upPct*(g.up||0));}
function g3Apply(g){const b=G3_BY_NAME[g.name];if(!b)return g;const B=g3Budget(g);STAT_K.forEach(k=>delete g[k]);
  for(const [k,share] of Object.entries(b.mix)){const v=Math.round(B*share/GEAR3.cost[k]);if(v)g[k]=v;}g.slot=b.slot;g.art=b.art;g.v3=1;if(b.set)g.set=b.set;else delete g.set;return g;}
function g3Score(g){return Math.round(g3Budget(g));}
function g3Perk(r){const pk=GEAR3.perks[Math.floor(Math.random()*GEAR3.perks.length)];return{k:pk.k,v:pk.v*(r>=4?2:1)};}
function perkText(p){const d=GEAR3.perks.find(x=>x.k===p.k);return d?d.t.replace('{v}',p.v):'';}
// ---- drops: iLvl = what dropped it; rarity same luck curve as before; set pieces on armor slots
rollGear=function(lvl,minR=0){let ri=minR;const x=Math.random()/(1+(stats().luck+skillFx('lootq'))/40);if(x<.35)ri++;if(x<.12)ri++;if(x<.04)ri++;if(x<.01)ri++;ri=Math.min(4,ri);
  const slots=GEAR_SLOTS,slot=slots[Math.floor(Math.random()*slots.length)];let pool=GEAR3_BASES.filter(b=>b.slot===slot);
  if(['head','chest','legs','boots'].includes(slot)){const sets=pool.filter(b=>b.set),free=pool.filter(b=>!b.set);const pickSet=Math.random()<GEAR3.setChance+ri*0.08,c=pickSet?sets:free;if(c.length)pool=c;}
  const b=pool[Math.floor(Math.random()*pool.length)];const g={id:'g'+Date.now()+Math.random().toString(36).slice(2,6),name:b.name,slot:b.slot,rarity:ri,iLvl:Math.max(1,Math.round(lvl||1)),up:0};
  if(ri>=3)g.perk=g3Perk(ri);return g3Apply(g);};
// ---- migration: old items get an iLvl (your current level) and v3 stats. Nothing is deleted.
function migrateGear3(o){o=o||P;if(!o||!o.inv)return;let n=0;o.inv.forEach(g=>{if(g.v3)return;if(G3_LEGACY[g.name]&&!G3_BY_NAME[g.name])g.name=G3_LEGACY[g.name];if(g.name==='Sprint Shoes')g.name='Runner Sneakers';
  if(!G3_BY_NAME[g.name])return;g.iLvl=g.iLvl||Math.max(1,o.lvl||1);g.up=g.up||0;if((g.rarity||0)>=3&&!g.perk)g.perk=g3Perk(g.rarity);g3Apply(g);n++;});
  if(o.equip)for(const [sl,id] of Object.entries(o.equip)){const g=o.inv.find(x=>x.id===id);if(!g||g.slot!==sl)delete o.equip[sl];}return n;}
try{if(migrateGear3())save();}catch(e){console.warn('gear3 migrate',e);}
const _g3_adopt=adoptProfile;adoptProfile=function(o,why){try{migrateGear3(o);}catch(e){}return _g3_adopt(o,why);};
// ---- upgrades: scrap + parts, +6% budget per step, up to +10
function upCost(g){const u=(g.up||0)+1,m=rarMult(g.rarity);return{scrap:Math.round(20*u*(1+(g.iLvl||1)/5)*m),parts:Math.round(u*(g.rarity+1))};}
function upgradeGear(id){const g=P.inv.find(x=>x.id===id);if(!g)return;if((g.up||0)>=GEAR3.maxUp)return toast('Already +'+GEAR3.maxUp);const c=upCost(g);if(!canPay(c))return toast('Not enough scrap or parts');
  pay(c);g.up=(g.up||0)+1;g3Apply(g);try{ledgerAdd&&ledgerAdd('build',`Upgraded ${g.name} to +${g.up}`,Object.fromEntries(Object.entries(c).map(([k,v])=>[k,-v])));}catch(e){}save();toast(`⬆️ ${g.name} +${g.up}`);UI.render();}
// salvage scales with iLvl, rarity and upgrades (gives back ~40% of upgrade spend)
UI.salvage=function(id){const g=P.inv.find(x=>x.id===id);if(!g)return;if(Object.values(P.equip).includes(id))return toast('Take it off first');let spent={scrap:0,parts:0};for(let u=0;u<(g.up||0);u++){const c=upCost({...g,up:u});spent.scrap+=c.scrap;spent.parts+=c.parts;}
  const r={scrap:Math.round(5*(g.rarity+1)*(1+(g.iLvl||1)/10)+spent.scrap*.4),parts:(g.rarity>=2?g.rarity*2:0)+Math.round(spent.parts*.4)};P.inv=P.inv.filter(x=>x.id!==id);addRes(r);save();toast(`🔩 Salvaged: +${r.scrap}🔩${r.parts?' +'+r.parts+'⚙️':''}`);this.render();};
// ---- effects: set % bonuses, set fx and gear perks
function setPct(){const out={},fx={},parts=[];for(const [id,n] of Object.entries(setCounts())){const S=GEAR_SETS[id];if(!S)continue;
  if(n>=2){for(const k in S.p2)out[k]=(out[k]||0)+S.p2[k];for(const k in S.f2)fx[k]=(fx[k]||0)+S.f2[k];parts.push(S.name+' (2)');}
  if(n>=4){for(const k in S.p4)out[k]=(out[k]||0)+S.p4[k];for(const k in S.f4)fx[k]=(fx[k]||0)+S.f4[k];parts.push(S.name+' (4)');}}return{pct:out,fx,parts};}
function perkFx(){const o={};equippedGear().forEach(([,g])=>{if(g&&g.perk)o[g.perk.k]=(o[g.perk.k]||0)+g.perk.v;});return o;}
const _g3_skillFx=skillFx;skillFx=function(k){let v=_g3_skillFx(k);try{if(typeof P!=='undefined'&&P&&P.inv){const s=setPct();v+=(s.fx[k]||0)+(perkFx()[k]||0);}}catch(e){}return v;};
const _g3_stats=stats;stats=function(){const s=_g3_stats.apply(this,arguments);try{
    if(typeof rl==='function'&&rl('medics'))s.hp=Math.round(s.hp*(1+rfx('medics')/100)); // fix: gear2 replaced stats() and dropped the Field Medics research
    const p=setPct().pct;for(const k in p)if(s[k]!=null)s[k]=Math.round(s[k]*(1+p[k]/100));}catch(e){}return s;};
gearLine=function(g){const R=RARITY[g.rarity];return`<span class="rar" style="color:${R.color}">${g.name}${g.up?' +'+g.up:''}</span> <small style="display:inline">${R.name} · iLvl ${g.iLvl||1} · ${STAT_K.filter(k=>g[k]).map(k=>'+'+g[k]+' '+k.toUpperCase()).join(' ')}${g.perk?` · ✨ ${perkText(g.perk)}`:''}</small>`;}
function gearScore(){return equippedGear().reduce((a,[,g])=>a+(g?g3Score(g):0),0);}

// ---- the survivor: one fixed pose, 512 x 768. Placeholder gear shapes fit the body; the artist's PNGs replace them 1:1.
let GEAR_ART={};fetch('assets/gear/manifest.json').then(r=>r.ok?r.json():{}).then(j=>{GEAR_ART=j||{};if(UI.tab==='player')UI.render();}).catch(()=>{});
const DOLL3_ORDER=['legs','boots','chest','trinket','head','weapon'];
const SKIN='#b98f6e',SKIN2='#9c7457',UNDER='#3b3833',UNDER2='#2c2a26';
function bodySVG(){if(GEAR_ART.body&&GEAR_ART.body.png)return`<image href="assets/gear/body.png" x="0" y="0" width="512" height="768"/>`;
  return`<g class="body">
  <ellipse cx="256" cy="748" rx="150" ry="14" fill="#000" opacity=".35"/>
  <path d="M207 452 L200 700 Q200 712 214 712 L246 712 L252 470 Z" fill="${SKIN2}"/><path d="M305 452 L312 700 Q312 712 298 712 L266 712 L260 470 Z" fill="${SKIN2}"/>
  <path d="M196 694 h54 v28 q0 10 -10 10 h-50 q-14 0 -10 -14 z" fill="#4a3a2c"/><path d="M262 694 h54 l12 24 q4 14 -10 14 h-50 q-6 0 -6 -10 z" fill="#4a3a2c"/>
  <path d="M174 214 Q150 222 146 260 L130 410 Q128 428 142 432 L156 432 L176 300 Z" fill="${SKIN}"/><path d="M338 214 Q362 222 366 260 L382 410 Q384 428 370 432 L356 432 L336 300 Z" fill="${SKIN}"/>
  <circle cx="146" cy="440" r="17" fill="${SKIN}"/><circle cx="366" cy="440" r="17" fill="${SKIN}"/>
  <path d="M236 176 h40 v34 h-40 z" fill="${SKIN2}"/>
  <path d="M180 210 Q256 190 332 210 L322 330 Q316 410 310 450 L202 450 Q196 410 190 330 Z" fill="${UNDER}"/>
  <path d="M200 440 L312 440 L316 520 L262 524 L256 500 L250 524 L196 520 Z" fill="${UNDER2}"/>
  <ellipse cx="256" cy="122" rx="44" ry="54" fill="${SKIN}"/><path d="M212 112 Q214 64 256 62 Q298 64 300 112 Q290 84 256 84 Q222 84 212 112 Z" fill="#3a2b20"/>
  <ellipse cx="240" cy="126" rx="5" ry="4" fill="#222"/><ellipse cx="272" cy="126" rx="5" ry="4" fill="#222"/><path d="M244 152 q12 6 24 0" stroke="#5a3f30" stroke-width="3" fill="none"/>
  </g>`;}
function shade(hex,f){const n=parseInt(hex.slice(1),16),c=[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(f>1?v+(255-v)*(f-1):v*f))));return'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');}
function g3Piece(sl,g){if(!g)return'';const art=GEAR_ART[g.art];if(art&&art.png)return`<image class="layer" data-slot="${sl}" href="assets/gear/${sl}/${g.art}.png" x="0" y="0" width="512" height="768"/>`;
  const tone={head:1.12,chest:1,legs:.78,boots:.6,weapon:.9,trinket:1.2}[sl]||1,c=shade(RARITY[g.rarity].color,tone),d='#15120e',sh=`fill="${c}" stroke="${d}" stroke-width="4" stroke-linejoin="round"`,tint=`fill="#000" opacity=".18"`;
  const S={
   head:`<path d="M206 118 Q206 52 256 50 Q306 52 306 118 L318 124 Q256 136 194 124 Z" ${sh}/><path d="M212 104 Q256 92 300 104" stroke="${d}" stroke-width="4" fill="none"/>`,
   chest:`<path d="M172 212 Q256 186 340 212 L360 300 L338 306 L326 280 L320 440 L192 440 L186 280 L174 306 L152 300 Z" ${sh}/><path d="M256 204 L256 440" stroke="${d}" stroke-width="3"/><path d="M192 400 L320 400 L320 440 L192 440 Z" ${tint}/>`,
   legs:`<path d="M196 436 L316 436 L320 520 L310 690 L264 690 L256 520 L248 690 L202 690 L192 520 Z" ${sh}/><path d="M256 470 L256 520" stroke="${d}" stroke-width="3"/><path d="M204 600 h40 v18 h-40z M268 600 h40 v18 h-40z" ${tint}/>`,
   boots:`<path d="M194 650 h58 v72 q0 12 -12 12 h-54 q-16 0 -12 -16 l8 -20 z" ${sh}/><path d="M260 650 h58 l14 50 q6 22 -12 22 h-54 q-6 0 -6 -10 z" ${sh}/><path d="M188 718 h64 M260 718 h70" stroke="${d}" stroke-width="5"/>`,
   weapon:`<g transform="rotate(16 366 440)"><rect x="358" y="300" width="16" height="178" rx="5" fill="#5a4632" stroke="${d}" stroke-width="4"/><path d="M348 306 h36 l-4 -120 l-14 -26 l-14 26 z" ${sh}/><rect x="342" y="300" width="48" height="12" rx="3" fill="#3a3029" stroke="${d}" stroke-width="3"/></g><circle cx="366" cy="440" r="17" fill="${SKIN}"/>`,
   trinket:`<path d="M232 206 Q256 236 280 206" stroke="#c9b27a" stroke-width="3" fill="none"/><circle cx="256" cy="242" r="13" ${sh}/>`};
  return`<g class="layer" data-slot="${sl}" data-art="${g.art}">${S[sl]||''}</g>`;}
dollSVG=function(){const eq=Object.fromEntries(equippedGear());
  return`<svg class="doll doll3" viewBox="0 0 512 768" xmlns="http://www.w3.org/2000/svg" aria-label="Your survivor">${bodySVG()}${DOLL3_ORDER.map(sl=>g3Piece(sl,eq[sl])).join('')}</svg>`;};

// ---- Gear tab
gearTabHTML=function(){migrateGear();migrateGear3();const eq=equippedGear(),sc=setCounts(),s=stats(),sp=setPct();
  const slot=([sl,g])=>`<button class="gslot ${g?'full':''} ${UI.gearSlot===sl?'sel':''}" onclick="UI.gearSlot=UI.gearSlot==='${sl}'?null:'${sl}';UI.render()" style="${g?'border-color:'+RARITY[g.rarity].color:''}"><span class="gi">${SLOT_ICON[sl]}</span><b>${sl}</b><small>${g?g.name+(g.up?' +'+g.up:''):'empty'}</small>${g?`<small>iLvl ${g.iLvl} · ⚡${g3Score(g)}</small>`:''}${gearSet(g)?`<i class="gsetdot" style="background:${GEAR_SETS[gearSet(g)].color}"></i>`:''}</button>`;
  const pl=o=>Object.entries(o).map(([k,v])=>`+${v}% ${k.toUpperCase()}`).join(' ');
  const fl=o=>Object.entries(o).map(([k,v])=>{const d=GEAR3.perks.find(x=>x.k===k);return d?d.t.replace('{v}',v):k==='regen'?`+${v} HP regen`:`+${v} ${k}`;}).join(' · ');
  const sets=Object.entries(GEAR_SETS).map(([id,S])=>{const n=sc[id]||0;return`<div class="row gset ${n?'':'dim'}"><i class="cdot" style="background:${S.color}"></i><div class="grow"><b>${S.name}</b> <small style="display:inline">${n}/4 · ${S.for}</small>
    <small class="${n>=2?'on':'off'}">2: ${[pl(S.p2),fl(S.f2)].filter(Boolean).join(' · ')} ${n>=2?'✅':''}</small><small class="${n>=4?'on':'off'}">4: ${[pl(S.p4),fl(S.f4)].filter(Boolean).join(' · ')} ${n>=4?'✅':''}</small></div></div>`;}).join('');
  const row=(g,eqd)=>{const c=upCost(g),max=(g.up||0)>=GEAR3.maxUp;return`<div class="row"><div class="grow">${gearLine(g)}<small>⚡ ${g3Score(g)}${gearSet(g)?' · Set: '+GEAR_SETS[gearSet(g)].name:''}</small></div>
    ${eqd?`<button onclick="UI.unequip('${g.slot}')">Take off</button>`:`<button onclick="UI.equip('${g.id}')">Equip</button>`}
    <button ${max?'disabled':''} onclick="upgradeGear('${g.id}')" title="${max?'Max':''}">${max?'Max':`⬆️ +${(g.up||0)+1}<br><small>${c.scrap}🔩 ${c.parts}⚙️</small>`}</button>${eqd?'':`<button class="salv" onclick="UI.salvage('${g.id}')">Salvage</button>`}</div>`;};
  const pick=UI.gearSlot||null,cur=pick&&P.inv.find(x=>x.id===P.equip[pick]);
  const list=pick?P.inv.filter(g=>g.slot===pick&&P.equip[pick]!==g.id):P.inv.filter(g=>!Object.values(P.equip).includes(g.id));
  list.sort((a,b)=>g3Score(b)-g3Score(a));
  return`<div class="gearwrap"><div class="gcol">${eq.slice(0,3).map(slot).join('')}</div><div class="dollbox">${dollSVG()}</div><div class="gcol">${eq.slice(3).map(slot).join('')}</div></div>
   <div class="row gtot" onclick="UI.statBreak()" style="cursor:pointer"><div class="grow"><b>⚔️ ${s.atk} · 🛡️ ${s.def} · ❤️ ${s.hp} · 💥 ${s.crit} · 💨 ${s.agi} · 🍀 ${s.luck}</b><small>Gear score ⚡${gearScore()} · tap for the full stat breakdown</small></div><span>›</span></div>
   ${pick?`<h3>${SLOT_ICON[pick]} ${pick}</h3>${cur?row(cur,true):''}`:`<p class="tiny">Tap a slot to filter. ⚡ = item power (same ⚡ = same worth, different lean).</p>`}
   ${list.length?`<h3>🎒 ${pick?'Spare '+pick:'Spare gear'} (${list.length})</h3>${list.map(g=>row(g,false)).join('')}`:`<p class="tiny">No spare ${pick||'gear'} yet. Beat mutants, raiders and bosses to find some.</p>`}
   <h3>🧩 Sets</h3>${sets}
   <details class="more"><summary>ⓘ How gear works</summary><p class="tiny">Every item has an item level (the level of whatever dropped it) and a rarity. Together they set its power ⚡. Each item name splits that power its own way (a Pipe Wrench is mostly Attack, a Gas Mask mostly Health). Upgrade with scrap and parts (+6% per level, up to +10); salvaging returns 40% of what you spent. Epic and Legendary items carry a ✨ perk. Wear 2 or 4 pieces of a set (head, chest, legs, boots) for % bonuses; class sets help that class most.</p></details>`;};
// stat breakdown that always adds up: anything not itemised (set %, research, buffs) is shown as one line
UI.statBreak=function(){const L=P.lvl,SL=strongholdLevel(),K=STAT_K;const add=(a,o)=>{K.forEach(k=>a[k]=(a[k]||0)+(o[k]||0));return a;};
  const rows=[['Level '+L,{atk:8+L*2,def:2+L,hp:100+L*10,crit:5,agi:3+Math.floor(L/2),luck:3+Math.floor(L/3)}],['Skills & class',Object.fromEntries(K.map(k=>[k,skillFx(k)]))],['Stronghold Lv'+SL,{def:SL*2,hp:SL*10}]];
  equippedGear().forEach(([sl,g])=>{if(g)rows.push([SLOT_ICON[sl]+' '+g.name+(g.up?' +'+g.up:''),Object.fromEntries(K.map(k=>[k,g[k]||0]))]);});
  const sum=rows.reduce((a,[,o])=>add(a,o),{}),tot=stats(),rest=Object.fromEntries(K.map(k=>[k,tot[k]-sum[k]]));if(K.some(k=>rest[k]))rows.push(['Sets %, research, buffs',rest]);
  const cell=v=>v?`<td>${v>0?'+':''}${v}</td>`:'<td style="opacity:.35">·</td>';
  this.modal(`<h2>📊 Stat breakdown</h2><table class="statbrk" style="width:100%;font-size:13px;text-align:right"><tr><th style="text-align:left">From</th>${K.map(k=>`<th>${k.toUpperCase()}</th>`).join('')}</tr>${rows.map(([n,o])=>`<tr><td style="text-align:left">${n}</td>${K.map(k=>cell(o[k]||0)).join('')}</tr>`).join('')}<tr class="tot" style="font-weight:700"><td style="text-align:left">Total</td>${K.map(k=>`<td data-k="${k}">${tot[k]}</td>`).join('')}</tr></table><button onclick="UI.closeModal()" style="width:100%;margin-top:10px">Close</button>`);};
// Hero › Stats avatar: bigger, with gear score
HOOK.render(function(){try{if(this.tab==='player'&&(this.sub.player||'stats')==='stats'){const n=$('#sheetBody .avatarbox .avname small');if(n&&!n.dataset.gs){n.dataset.gs=1;n.textContent+=` · ⚡ ${gearScore()}${P.cls&&P.cls.id?' · '+CLASSES.list[P.cls.id].icon+' '+CLASSES.list[P.cls.id].name:''}`;}}}catch(e){}});
