// ===== Phase 2: six gear slots, sets (2 + 4 piece, fixed numbers), paper-doll avatar (Player tab only), stat breakdown =====
const GEAR_SLOTS=['head','chest','legs','boots','weapon','trinket'];
const SLOT_ICON={head:'⛑️',chest:'🦺',legs:'👖',boots:'🥾',weapon:'🗡️',trinket:'🧿'};
// Sets: bonuses stack (4-piece adds on top of 2-piece). No randomness anywhere.
const GEAR_SETS={
  road:  {name:'Road Warrior',color:'#d6a03a',b2:{def:3},          b4:{def:5,hp:25},   pieces:['Hubcap Helm','Road-Sign Plate','Tire Greaves','Tread Boots']},
  hazmat:{name:'Hazmat',      color:'#8fd14f',b2:{hp:20},          b4:{hp:30,def:3},   pieces:['Gas Mask','Hazmat Coat','Hazmat Pants','Rubber Boots']},
  runner:{name:'Runner',      color:'#4ad7ff',b2:{agi:3},          b4:{agi:4,crit:4},  pieces:['Runner Cap','Runner Jacket','Track Pants','Runner Sneakers']},
};
const SET_BY_NAME={};for(const [id,s] of Object.entries(GEAR_SETS))s.pieces.forEach(n=>SET_BY_NAME[n]=id);
// New bases for the new slots (existing bases unchanged; old 'armor' bases now drop as 'chest')
GEAR_BASES.forEach(b=>{if(b.slot==='armor')b.slot='chest';});
GEAR_BASES.push(
  {slot:'head',name:'Hubcap Helm',def:3,hp:8},{slot:'head',name:'Gas Mask',hp:15},{slot:'head',name:'Runner Cap',agi:2,crit:2},
  {slot:'legs',name:'Tire Greaves',def:4,hp:6},{slot:'legs',name:'Hazmat Pants',hp:18,def:1},{slot:'legs',name:'Track Pants',agi:3},
  {slot:'boots',name:'Tread Boots',def:3},{slot:'boots',name:'Rubber Boots',hp:12},{slot:'boots',name:'Runner Sneakers',agi:3,luck:1});
function gearSet(g){return g&&(g.set||SET_BY_NAME[g.name])||null;}
// Safe, idempotent migration: 'armor' becomes 'chest'. Nothing is deleted; unknown slots are left alone.
function migrateGear(o){o=o||P;if(!o||!o.inv)return 0;let n=0;o.equip=o.equip||{};
  o.inv.forEach(g=>{if(g.slot==='armor'){g.slot='chest';n++;}});
  if(o.equip.armor){if(!o.equip.chest)o.equip.chest=o.equip.armor;delete o.equip.armor;n++;}
  for(const [sl,id] of Object.entries(o.equip)){const g=o.inv.find(x=>x.id===id);if(!g||g.slot!==sl)delete o.equip[sl];}
  o.gearV=2;return n;}
function equippedGear(){return GEAR_SLOTS.map(sl=>[sl,P.inv.find(x=>x.id===P.equip[sl])||null]);}
function setCounts(){const c={};equippedGear().forEach(([,g])=>{const s=gearSet(g);if(s)c[s]=(c[s]||0)+1;});return c;}
function setBonus(){const out={},parts=[];for(const [id,n] of Object.entries(setCounts())){const S=GEAR_SETS[id];if(n>=2){for(const k in S.b2)out[k]=(out[k]||0)+S.b2[k];parts.push([S.name+' (2)',S.b2]);}
  if(n>=4){for(const k in S.b4)out[k]=(out[k]||0)+S.b4[k];parts.push([S.name+' (4)',S.b4]);}}return{total:out,parts};}
// stats(): v19 math + set bonus. Only the six slots count.
stats=function(){const L=P.lvl,SL=strongholdLevel();let s={atk:8+L*2,def:2+L,hp:100+L*10,crit:5,agi:3+Math.floor(L/2),luck:3+Math.floor(L/3)};
  for(const k in s)s[k]+=skillFx(k);s.def+=SL*2;s.hp+=SL*10;
  equippedGear().forEach(([,g])=>{if(g)for(const k in s)s[k]+=g[k]||0;});const b=setBonus().total;for(const k in b)s[k]+=b[k];return s;};
// Equip: a gear item goes to its own slot.
UI.equip=function(id){const g=P.inv.find(x=>x.id===id);if(!g)return;migrateGear();P.equip[g.slot]=id;P.hp=Math.min(P.hp,stats().hp);save();this.render();};
UI.unequip=function(sl){delete P.equip[sl];P.hp=Math.min(P.hp,stats().hp);save();this.render();};
// ---- paper doll: one fixed pose and size; layers drawn in a fixed order. Placeholder shapes until the artist's PNGs arrive (assets/gear/<slot>/<name>.png, 512x768). ----
const DOLL_ORDER=['legs','boots','chest','weapon','head','trinket'];
function dollLayer(sl,g){const c=g?RARITY[g.rarity].color:'none',st=g?'#111':'none',o=g?1:0;
  const L={legs:`<path d="M98 205h20l-2 70h-20zM122 205h20l2 70h-20z" fill="${c}" stroke="${st}" opacity="${o}"/>`,
    boots:`<path d="M92 272h24v16h-30zM124 272h24l6 16h-30z" fill="${c}" stroke="${st}" opacity="${o}"/>`,
    chest:`<path d="M92 120h56l6 88h-68z" fill="${c}" stroke="${st}" opacity="${o}"/>`,
    weapon:`<path d="M158 150l26-60 6 3-24 62z" fill="${c}" stroke="${st}" opacity="${o}"/>`,
    head:`<path d="M100 70a20 20 0 0 1 40 0v8h-40z" fill="${c}" stroke="${st}" opacity="${o}"/>`,
    trinket:`<circle cx="120" cy="132" r="6" fill="${c}" stroke="${st}" opacity="${o}"/>`};
  return`<g class="layer" data-slot="${sl}" data-item="${g?g.name.replace(/"/g,''):''}">${L[sl]}</g>`;}
function dollSVG(){const eq=Object.fromEntries(equippedGear());
  return`<svg class="doll" viewBox="0 0 240 300" width="240" height="300" xmlns="http://www.w3.org/2000/svg" aria-label="Your survivor">
  <g class="base"><circle cx="120" cy="78" r="18" fill="#c9a27e"/><rect x="104" y="96" width="32" height="10" fill="#c9a27e"/><path d="M94 112h52l4 96h-60z" fill="#5d5346"/>
  <path d="M90 116l-14 70h10l12-60zM150 116l14 70h-10l-12-60z" fill="#c9a27e"/><path d="M98 206h20v70h-20zM122 206h20v70h-20z" fill="#4a443b"/></g>
  ${DOLL_ORDER.map(sl=>dollLayer(sl,eq[sl])).join('')}</svg>`;}
function statsLine(o){return['atk','def','hp','crit','agi','luck'].filter(k=>o[k]).map(k=>'+'+o[k]+' '+k.toUpperCase()).join(' ');}
function gearTabHTML(){migrateGear();const eq=equippedGear(),sc=setCounts(),sb=setBonus(),s=stats();
  const slot=([sl,g])=>`<button class="gslot ${g?'full':''}" data-slot="${sl}" onclick="UI.gearSlot='${sl}';UI.render()" style="${g?'border-color:'+RARITY[g.rarity].color:''}"><span class="gi">${SLOT_ICON[sl]}</span><b>${sl}</b><small>${g?g.name:'empty'}</small>${gearSet(g)?`<i class="gsetdot" style="background:${GEAR_SETS[gearSet(g)].color}"></i>`:''}</button>`;
  const sets=Object.entries(GEAR_SETS).map(([id,S])=>{const n=sc[id]||0;if(!n)return'';return`<div class="row gset"><i class="cdot" style="background:${S.color}"></i><div class="grow"><b>${S.name}</b> <small style="display:inline">${n}/4 pieces</small>
    <small class="${n>=2?'on':'off'}">2 pieces: ${statsLine(S.b2)} ${n>=2?'✅':''}</small><small class="${n>=4?'on':'off'}">4 pieces: ${statsLine(S.b4)} ${n>=4?'✅':''}</small></div></div>`;}).join('');
  const pick=UI.gearSlot||null,cand=pick?P.inv.filter(g=>g.slot===pick&&P.equip[pick]!==g.id).sort((a,b)=>b.rarity-a.rarity):[];
  const cur=pick&&P.inv.find(x=>x.id===P.equip[pick]);
  return`<div class="gearwrap"><div class="gcol">${eq.slice(0,3).map(slot).join('')}</div><div class="dollbox">${dollSVG()}</div><div class="gcol">${eq.slice(3).map(slot).join('')}</div></div>
   <div class="row gtot" onclick="UI.statBreak()" style="cursor:pointer"><div class="grow"><b>⚔️ ${s.atk} · 🛡️ ${s.def} · ❤️ ${s.hp} · 💥 ${s.crit} · 💨 ${s.agi} · 🍀 ${s.luck}</b><small>Tap for the full stat breakdown</small></div><span>›</span></div>
   ${pick?`<h3>${SLOT_ICON[pick]} ${pick}</h3>${cur?`<div class="row"><div class="grow">${gearLine(cur)}${gearSet(cur)?`<small>Set: ${GEAR_SETS[gearSet(cur)].name}</small>`:''}</div><button onclick="UI.unequip('${pick}')">Take off</button></div>`:''}
     ${cand.map(g=>`<div class="row"><div class="grow">${gearLine(g)}${gearSet(g)?`<small>Set: ${GEAR_SETS[gearSet(g)].name}</small>`:''}</div><button onclick="UI.equip('${g.id}')">Equip</button><button class="salv" onclick="UI.salvage('${g.id}')">Salvage</button></div>`).join('')||`<p class="tiny">No spare ${pick} gear yet. Beat mutants to find some.</p>`}`
    :(()=>{const sp=P.inv.filter(g=>!Object.values(P.equip).includes(g.id)).sort((a,b)=>b.rarity-a.rarity);return '<p class="tiny">Tap a slot to swap gear.</p>'+(sp.length?`<h3>🎒 Spare gear (${sp.length})</h3>`+sp.map(g=>`<div class="row"><div class="grow">${gearLine(g)}<small>${SLOT_ICON[g.slot]||''} ${g.slot}${gearSet(g)?' · Set: '+GEAR_SETS[gearSet(g)].name:''}</small></div><button onclick="UI.equip('${g.id}')">Equip</button><button class="salv" onclick="UI.salvage('${g.id}')">Salvage</button></div>`).join(''):'');})()}
   ${sets?`<h3>🧩 Set bonuses</h3>${sets}`:''}
   <details class="more"><summary>ⓘ How sets work</summary><p class="tiny">Wear 2 pieces of the same set for its 2-piece bonus, and all 4 (head, chest, legs, boots) to add the 4-piece bonus on top. Bonuses are fixed numbers, no luck.</p></details>`;}
// Stat breakdown: level, skills, stronghold, each of the six slots, set bonuses, total (always equals stats()).
UI.statBreak=function(){const L=P.lvl,SL=strongholdLevel(),K=['atk','def','hp','crit','agi','luck'];
  const rows=[['Level '+L,{atk:8+L*2,def:2+L,hp:100+L*10,crit:5,agi:3+Math.floor(L/2),luck:3+Math.floor(L/3)}],['Skills',Object.fromEntries(K.map(k=>[k,skillFx(k)]))],['Stronghold Lv'+SL,{def:SL*2,hp:SL*10}]];
  equippedGear().forEach(([sl,g])=>{if(g)rows.push([SLOT_ICON[sl]+' '+g.name,Object.fromEntries(K.map(k=>[k,g[k]||0]))]);});setBonus().parts.forEach(([n,b])=>rows.push(['🧩 '+n,b]));
  const tot=stats(),cell=v=>v?`<td>+${v}</td>`:'<td style="opacity:.35">·</td>';
  this.modal(`<h2>📊 Stat breakdown</h2><table class="statbrk" style="width:100%;font-size:13px;text-align:right"><tr><th style="text-align:left">From</th>${K.map(k=>`<th>${k.toUpperCase()}</th>`).join('')}</tr>${rows.map(([n,o])=>`<tr><td style="text-align:left">${n}</td>${K.map(k=>cell(o[k]||0)).join('')}</tr>`).join('')}<tr class="tot" style="font-weight:700"><td style="text-align:left">Total</td>${K.map(k=>`<td data-k="${k}">${tot[k]}</td>`).join('')}</tr></table><button onclick="UI.closeModal()" style="width:100%;margin-top:10px">Close</button>`);};
// Migrate at load, and whenever a cloud save is adopted.
try{migrateGear();save();}catch(e){}
const _adoptG2=adoptProfile;adoptProfile=function(o,why){try{migrateGear(o);}catch(e){}return _adoptG2(o,why);};
// Phase 2: still avatar (paper-doll, placeholder layers) at the top of Player > Stats. Player tab only, never on the map.
const _renderDoll=UI.render;UI.render=function(){const r=_renderDoll.apply(this,arguments);try{if(this.tab==='player'&&(this.sub.player||'stats')==='stats'){const b=$('#sheetBody');if(b&&!b.querySelector('.avatarbox')){const seg=b.querySelector('.seg');const d=document.createElement('div');d.className='avatarbox';d.innerHTML=`<div class="dollbox">${dollSVG()}</div><div class="avname"><b>${P.name||''}</b><small>Lv ${P.lvl}</small></div>`;if(seg)seg.after(d);else b.prepend(d);}}}catch(e){console.warn('avatar',e);}return r;};

// Phase 2 dev: 🎒 gives 2 pieces of the SAME set in different slots, so equipping both shows the 2-piece set bonus.
setTimeout(()=>{const b=document.querySelector('#devbar button[data-dev="gear"]');if(!b)return;b.onclick=()=>{const ids=Object.keys(GEAR_SETS),sid=ids[(P.inv.length)%ids.length],want=GEAR_SETS[sid].pieces,got=[];
  for(let i=0;i<4000&&got.length<2;i++){const g=rollGear(P.lvl||1,1);if(want.includes(g.name)&&!got.some(x=>x.slot===g.slot)){g.set=sid;got.push(g);}}
  if(got.length<2)return toast('Could not make test gear');P.inv.push(...got);migrateGear();save();toast(`🎒 Added ${got.map(g=>g.name).join(' + ')} (${GEAR_SETS[sid].name} set). Player › Gear`);if(UI.tab)UI.render();};},50);
