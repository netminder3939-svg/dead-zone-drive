// hero62 (R6.2) Hero screen redesign, presentation only (HERO-GEAR-SCREEN-SPEC v2).
//  * Every Hero (player) sub-tab opens full screen with a wasteland header (✕ closes) and a metal tab strip.
//    The tab strip is still the one .seg in UI.SUBS.player order, so the red dots (news8/fix13) and flavor lines keep working.
//  * Gear: the survivor in the middle is a pre-drawn figure. A set's figure shows ONLY when head, chest, legs and boots are
//    all from that one set (same rule as the 4-piece bonus) and its art is switched on in the manifest; anything else shows
//    the hooded base. Weapon, trinket, rarity and upgrades never change the figure.
//  * Slot boxes and the item card use the cut icons (assets/gear/icons). Missing icon -> the slot emoji.
//  * Nothing here changes stats, data, saves, Firestore, rules or auth. It only reads stats(), setCounts(), g3Score(),
//    upCost() and calls the existing UI.equip / UI.unequip / upgradeGear / UI.salvage / UI.statBreak.
(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const AVATAR_SLOTS=['head','chest','legs','boots'];
  const SLOT_NAME={head:'Head',chest:'Chest',legs:'Legs',boots:'Boots',weapon:'Weapon',trinket:'Trinket'};
  const STAT_ICON={atk:'⚔️',def:'🛡️',hp:'❤️',crit:'💥',agi:'💨',luck:'🍀'},STAT_NAME={atk:'Attack',def:'Defense',hp:'Health',crit:'Crit',agi:'Agility',luck:'Luck'};
  // ---------- the avatar rule
  // eqMap: {slot: gear} (defaults to what is equipped now). Returns a set id or 'base'.
  function heroAvatar(eqMap){const eq=eqMap||Object.fromEntries(equippedGear());const sets=AVATAR_SLOTS.map(sl=>gearSet(eq[sl]));
    const s=sets[0];return(s&&sets.every(x=>x===s))?s:'base';}
  function avatarEntry(id){const A=GEAR_ART.avatars||{},a=A[id];return a&&a.png?a:(A.base&&A.base.png?A.base:null);}
  // which figure is actually shown (a set whose art is off shows base)
  function shownAvatar(eqMap){const id=heroAvatar(eqMap),A=GEAR_ART.avatars||{};return A[id]&&A[id].png?id:'base';}
  window.heroAvatar=heroAvatar;window.avatarEntry=avatarEntry;window.shownAvatar=shownAvatar;
  const _oldDollSVG=dollSVG;window._oldDollSVG=_oldDollSVG;
  dollSVG=function(){const id=heroAvatar(),a=avatarEntry(id);
    if(!a)return _oldDollSVG(); // manifest missing -> the R6.1 SVG survivor
    const A=GEAR_ART.avatars||{},shown=a===A[id]?id:'base',base=A.base||{};
    const alt='Your survivor'+(shown!=='base'&&GEAR_SETS[shown]?' in the '+GEAR_SETS[shown].name+' outfit':'');
    const fb=a.fallback||'',fb2=(base.png&&base.img)||'';
    return`<img class="doll avatar" data-av="${shown}" src="${esc(a.img)}" alt="${esc(alt)}" data-fb="${esc(fb)}" data-fb2="${esc(fb2===a.img?(base.fallback||''):fb2)}" onerror="hzAvErr(this)">`;};
  window.dollSVG=dollSVG;
  // avatar errors: its own PNG, then the base figure, then the base PNG, then the old SVG survivor
  window.hzAvErr=function(img){const steps=['fb','fb2'];for(const k of steps){const v=img.dataset[k];if(v){img.dataset[k]='';img.src=v;return;}}
    const base=(GEAR_ART.avatars||{}).base||{};if(base.fallback&&img.dataset.fb3!=='1'&&img.src.indexOf(base.fallback)<0){img.dataset.fb3='1';img.src=base.fallback;return;}
    img.onerror=null;const t=document.createElement('span');t.innerHTML=_oldDollSVG();const s=t.firstElementChild;if(s)img.replaceWith(s);};
  // ---------- icons
  function iconOf(g){const a=g&&GEAR_ART[g.art];return a&&a.icon?a:null;}
  function iconHTML(g,sl){const a=iconOf(g);if(!a)return`<span class="hz-emo" aria-hidden="true">${SLOT_ICON[sl||g.slot]}</span>`;
    return`<img src="${esc(a.icon)}" alt="" loading="lazy" data-fb="${esc(a.iconFallback||'')}" data-emo="${SLOT_ICON[sl||g.slot]}" onerror="hzIcErr(this)">`;}
  window.hzIcErr=function(img){const v=img.dataset.fb;if(v){img.dataset.fb='';img.src=v;return;}img.onerror=null;const s=document.createElement('span');s.className='hz-emo';s.setAttribute('aria-hidden','true');s.textContent=img.dataset.emo||'';img.replaceWith(s);};
  // ---------- small helpers (same text as gear3's Sets list)
  const pl=o=>Object.entries(o||{}).map(([k,v])=>`+${v}% ${k.toUpperCase()}`).join(' ');
  const fl=o=>Object.entries(o||{}).map(([k,v])=>{const d=GEAR3.perks.find(x=>x.k===k);return d?d.t.replace('{v}',v):k==='regen'?`+${v} HP regen`:`+${v} ${k}`;}).join(' · ');
  const bonusTxt=(S,n)=>[pl(S['p'+n]),fl(S['f'+n])].filter(Boolean).join(', ');
  const statsOf=g=>STAT_K.filter(k=>g[k]).map(k=>`<span>${STAT_ICON[k]} +${g[k]} ${k.toUpperCase()}</span>`).join('');
  const spares=sl=>P.inv.filter(g=>g.slot===sl&&!Object.values(P.equip).includes(g.id)).sort((a,b)=>g3Score(b)-g3Score(a));
  function clsLine(){try{const c=typeof myClass==='function'?myClass():null;return c?`${c.icon} ${c.name}`:'';}catch(e){return'';}}
  // ---------- Gear tab
  function slotBtn([sl,g]){const sel=UI.gearSlot===sl,set=gearSet(g),R=g&&RARITY[g.rarity];
    if(!g)return`<button class="hz-slot empty${sel?' sel':''}" data-slot="${sl}" aria-pressed="${sel}" aria-label="${SLOT_NAME[sl]}: empty" onclick="hzPick('${sl}')"><span class="ghost" aria-hidden="true">${SLOT_ICON[sl]}</span><b>${SLOT_NAME[sl].toUpperCase()}</b><small>empty</small></button>`;
    const up=g.up||0,max=up>=GEAR3.maxUp;
    const lab=`${SLOT_NAME[sl]}: ${g.name}${up?' +'+up:''}, ${R.name}${set?', '+GEAR_SETS[set].name+' set':''}. Tap to manage.`;
    return`<button class="hz-slot${sel?' sel':''}" data-slot="${sl}" style="--rc:${R.color}" aria-pressed="${sel}" aria-label="${esc(lab)}" onclick="hzPick('${sl}')">${set?`<i class="set" style="background:${GEAR_SETS[set].color}" aria-hidden="true"></i>`:''}${up?`<span class="up">${max?'MAX':'+'+up}</span>`:''}${iconHTML(g,sl)}<b>${SLOT_NAME[sl].toUpperCase()}</b><small>${esc(g.name)}</small></button>`;}
  window.hzPick=function(sl){UI.gearSlot=UI.gearSlot===sl?null:sl;UI.render();};
  window.hzTo=function(id){const e=document.getElementById(id);if(e)e.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
  window.hzSwap=function(sl){UI.gearSlot=sl;UI.render();setTimeout(()=>hzTo('hzSpare'),30);};
  function setChip(sc){const best=Object.entries(sc).sort((a,b)=>b[1]-a[1])[0];
    if(!best)return`<button class="hz-setchip plate" onclick="hzTo('hzSets')"><i style="background:#5a4e3c"></i><span>No set bonus<small>wear 2 of a set</small></span></button>`;
    const [id,n]=best,S=GEAR_SETS[id];const p=k=>`${k}${n>=k?' ✓':':'} ${bonusTxt(S,k)}`;
    return`<button class="hz-setchip plate" onclick="hzTo('hzSets')" aria-label="${esc(S.name)} set ${n} of 4. Tap for sets."><i style="background:${S.color}"></i><span>${esc(S.name)} ${n}/4<small>${p(2)} · ${p(4)}</small></span></button>`;}
  function card(){const sl=UI.gearSlot,eq=Object.fromEntries(equippedGear());
    if(!sl){const n=P.inv.filter(g=>!Object.values(P.equip).includes(g.id)).length;
      return`<div class="hz-card"><div class="cicon"><span class="hz-emo">🎒</span></div><div><div class="ch">YOUR GEAR</div><div class="cm">⚡ ${gearScore()} gear score · ${Object.keys(setCounts()).length?'set bonus active':'no set bonus yet'}</div>
        <div class="cset">Tap a slot to see the item, upgrade it or swap it.<br>🎒 ${n} spare item${n===1?'':'s'} in your pack</div></div></div>`;}
    const g=eq[sl],sp=spares(sl);
    if(!g){const best=sp[0];if(!best)return`<div class="hz-card"><div class="cicon"><span class="hz-emo">${SLOT_ICON[sl]}</span></div><div><div class="ch">${SLOT_NAME[sl].toUpperCase()}</div><div class="cm">empty</div><div class="cset">No spare ${sl} yet. Beat mutants, raiders and bosses to find some.</div></div></div>`;
      const R=RARITY[best.rarity],set=gearSet(best);
      return`<div class="hz-card"><div class="cicon" style="--rc:${R.color}">${iconHTML(best,sl)}</div><div><div class="ch">${esc(best.name)}${best.up?` <span class="u">+${best.up}</span>`:''}</div>
        <div class="cm"><b class="hz-rar" style="--rcol:${R.color}">${R.name}</b> · ${SLOT_NAME[sl]} · iLvl ${best.iLvl||1} · ⚡ ${g3Score(best)} · best spare</div><div class="cs">${statsOf(best)}</div>${best.perk?`<div class="cset">✨ ${esc(perkText(best.perk))}</div>`:''}${set?`<div class="cset">Set: <b>${esc(GEAR_SETS[set].name)}</b></div>`:''}</div>
        <div class="crow"><button class="cb tox" onclick="UI.equip('${best.id}')">EQUIP</button><button class="cb" onclick="hzSwap('${sl}')">ALL SPARES ›<small>${sp.length} spare</small></button></div></div>`;}
    const R=RARITY[g.rarity],set=gearSet(g),up=g.up||0,max=up>=GEAR3.maxUp,c=upCost(g),n=set?(setCounts()[set]||0):0;
    return`<div class="hz-card"><div class="cicon" style="--rc:${R.color}">${iconHTML(g,sl)}</div><div><div class="ch">${esc(g.name)}${up?` <span class="u">+${up}</span>`:''}</div>
      <div class="cm"><b class="hz-rar" style="--rcol:${R.color}">${R.name}</b> · ${SLOT_NAME[sl]} · iLvl ${g.iLvl||1} · ⚡ ${g3Score(g)}</div><div class="cs">${statsOf(g)}</div>
      ${g.perk?`<div class="cset">✨ ${esc(perkText(g.perk))}</div>`:''}
      <div class="cset">${set?`Set: <b>${esc(GEAR_SETS[set].name)}</b> (${esc(GEAR_SETS[set].for)}) · <span class="${n>=2?'ok':''}">${n}/4${n>=4?' active':n>=2?' (2-piece active)':''}</span><br>`:''}${sp.length} spare ${sl} item${sp.length===1?'':'s'} in your pack</div></div>
      <div class="crow"><button class="cb" onclick="UI.unequip('${sl}')">TAKE OFF</button>
      <button class="cb tox" ${max?'disabled':''} onclick="upgradeGear('${g.id}')">${max?'MAX<small>fully upgraded</small>':`⬆️ UPGRADE +${up+1}<small>${c.scrap} 🔩 · ${c.parts} ⚙️</small>`}</button>
      <button class="cb" onclick="hzSwap('${sl}')">SWAP ›<small>${sp.length?sp.length+' spare':'none yet'}</small></button></div></div>`;}
  // a spare row: the old row plus the compare line (stat deltas vs what is equipped, ⚡ ±, set count / look changes)
  function compare(g){const eq=Object.fromEntries(equippedGear()),cur=eq[g.slot];const d=STAT_K.map(k=>[k,(g[k]||0)-((cur&&cur[k])||0)]).filter(([,v])=>v);
    const ds=g3Score(g)-(cur?g3Score(cur):0);const bits=d.map(([k,v])=>`<span class="${v>0?'pos':'neg'}">${v>0?'+':'−'}${Math.abs(v)} ${k.toUpperCase()}</span>`);
    bits.push(`<span class="${ds>=0?'pos':'neg'}">⚡ ${ds>=0?'+':'−'}${Math.abs(ds)}</span>`);
    const after={...eq,[g.slot]:g},notes=[];const s0=gearSet(cur),s1=gearSet(g);
    if(s0!==s1){const cnt=m=>{const o={};AVATAR_SLOTS.forEach(sl=>{const s=gearSet(m[sl]);if(s)o[s]=(o[s]||0)+1;});return o;};const b=cnt(eq),a=cnt(after);
      if(s1)notes.push(`${GEAR_SETS[s1].name} ${b[s1]||0}→${a[s1]||0}/4`);if(s0)notes.push(`${GEAR_SETS[s0].name} ${b[s0]||0}→${a[s0]||0}/4`);}
    const l0=shownAvatar(eq),l1=shownAvatar(after);if(l0!==l1)notes.push(`changes look to ${l1==='base'?'the base survivor':GEAR_SETS[l1].name}`);
    return`<small class="hz-cmp">${cur?'vs '+esc(cur.name)+': ':'new slot: '}${bits.join(' ')}${notes.length?` · <b>${esc(notes.join(' · '))}</b>`:''}</small>`;}
  function spareRow(g){const c=upCost(g),max=(g.up||0)>=GEAR3.maxUp;
    return`<div class="row hz-row"><div class="hz-ri" style="--rc:${RARITY[g.rarity].color}">${iconHTML(g,g.slot)}</div><div class="grow">${gearLine(g)}<small>⚡ ${g3Score(g)}${gearSet(g)?' · Set: '+esc(GEAR_SETS[gearSet(g)].name):''}</small>${compare(g)}</div>
      <button onclick="UI.equip('${g.id}')">Equip</button><button ${max?'disabled':''} onclick="upgradeGear('${g.id}')">${max?'Max':`⬆️ +${(g.up||0)+1}<br><small>${c.scrap}🔩 ${c.parts}⚙️</small>`}</button><button class="salv" onclick="UI.salvage('${g.id}')">Salvage</button></div>`;}
  let lastAv=null;
  gearTabHTML=function(){migrateGear();migrateGear3();const eq=equippedGear(),sc=setCounts(),s=stats();
    const shown=shownAvatar(),fade=lastAv&&lastAv!==shown;lastAv=shown;
    const look=shown!=='base'?`${clsLine()?clsLine()+' · ':''}${esc(GEAR_SETS[shown].name)} look`:`${clsLine()?clsLine()+' · ':''}Complete a set to change your look`;
    const cells=STAT_K.map(k=>`<button class="hz-st" onclick="UI.statBreak()" aria-label="${STAT_NAME[k]} ${s[k]}"><span>${k.toUpperCase()}</span><i aria-hidden="true">${STAT_ICON[k]}</i><b>${s[k]}</b></button>`).join('');
    const pick=UI.gearSlot||null;const list=(pick?P.inv.filter(g=>g.slot===pick&&P.equip[pick]!==g.id):P.inv.filter(g=>!Object.values(P.equip).includes(g.id))).sort((a,b)=>g3Score(b)-g3Score(a));
    const setsHTML=Object.entries(GEAR_SETS).map(([id,S])=>{const n=sc[id]||0;return`<div class="row gset ${n?'':'dim'}"><i class="cdot" style="background:${S.color}"></i><div class="grow"><b>${esc(S.name)}</b> <small style="display:inline">${n}/4 · ${esc(S.for)}</small>
      <small class="${n>=2?'on':'off'}">2: ${bonusTxt(S,2).replace(/, /g,' · ')} ${n>=2?'✅':''}</small><small class="${n>=4?'on':'off'}">4: ${bonusTxt(S,4).replace(/, /g,' · ')} ${n>=4?'✅':''}</small>${(GEAR_ART.avatars||{})[id]&&!(GEAR_ART.avatars[id].png)?'<small class="off">Outfit figure coming soon</small>':''}</div></div>`;}).join('');
    return`<div class="hz-gear">
     <div class="hz-stage plate rusty"><div class="hz-col">${eq.slice(0,3).map(slotBtn).join('')}</div>
      <div class="hz-doll"><div class="glow"></div><div class="hz-fig${fade?' hz-fade':''}">${dollSVG()}</div><div class="hz-name">${esc(P.name||'Survivor')}<small>${look}</small></div><div class="hz-gs" title="Gear score">⚡ ${gearScore()}</div></div>
      <div class="hz-col">${eq.slice(3).map(slotBtn).join('')}</div></div>
     <div class="hz-stats plate rusty rivets">${cells}</div>
     <div class="hz-actions"><button class="hz-btn plate tox" onclick="UI.statBreak()">VIEW FULL STATS ›</button>${setChip(sc)}</div>
     ${card()}
     <div id="hzSpare" class="hz-more">${list.length?`<h3>▾ ${pick?'Spare '+pick:'Spare gear'} (${list.length})</h3>${list.map(spareRow).join('')}`:`<p class="tiny">▾ No spare ${pick||'gear'} yet. Beat mutants, raiders and bosses to find some.</p>`}</div>
     <h3 id="hzSets">🧩 Sets</h3>${setsHTML}
     <details class="more"><summary>ⓘ How gear works</summary><p class="tiny">Every item has an item level (the level of whatever dropped it) and a rarity. Together they set its power ⚡. Each item name splits that power its own way (a Pipe Wrench is mostly Attack, a Gas Mask mostly Health). Upgrade with scrap and parts (+6% per level, up to +10); salvaging returns 40% of what you spent. Epic and Legendary items carry a ✨ perk. Wear 2 or 4 pieces of a set (head, chest, legs, boots) for % bonuses; class sets help that class most. Wear all 4 pieces of one set and your survivor wears that outfit.</p></details></div>`;};
  window.gearTabHTML=gearTabHTML;
  // ---------- the full-screen Hero shell (every player sub-tab)
  const sheet=document.getElementById('sheet');
  function shellOff(){if(!sheet)return;const b=document.getElementById('sheetBody');if(b&&b.dataset.hzsub)delete b.dataset.hzsub;
    // only touch the class list when something is set: classList.remove always records a mutation, which would re-fire the observer forever
    if(sheet.classList.contains('hero-full'))sheet.classList.remove('hero-full');if(document.body.classList.contains('hero-open'))document.body.classList.remove('hero-open');}
  if(sheet)new MutationObserver(()=>{if(sheet.classList.contains('hidden')&&sheet.classList.contains('hero-full'))shellOff();}).observe(sheet,{attributes:true,attributeFilter:['class']});
  function shell(b){const subs=UI.SUBS.player,sub=UI.sub.player||subs[0][0],cur=subs.find(x=>x[0]===sub)||subs[0];
    const strip=s=>String(s).replace(/^[^\p{L}\p{N}]+/u,'').trim();
    if(!sheet.classList.contains('hero-full'))sheet.classList.add('hero-full');if(!document.body.classList.contains('hero-open'))document.body.classList.add('hero-open');b.dataset.hzsub=sub;
    const seg=b.querySelector(':scope > .seg')||b.querySelector('.seg');
    if(seg&&!seg.classList.contains('hz-tabs')){seg.classList.add('hz-tabs');seg.setAttribute('role','tablist');seg.setAttribute('aria-label','Hero');
      seg.querySelectorAll(':scope > button').forEach((btn,i)=>{const k=(subs[i]||[])[0],lab=(subs[i]||[])[1]||'';const m=String(lab).match(/^([^\p{L}\p{N}]+)\s*(.*)$/u);
        const tn=[...btn.childNodes].find(n=>n.nodeType===3);if(tn)tn.remove();
        btn.insertAdjacentHTML('afterbegin',`<i aria-hidden="true">${m?m[1].trim():''}</i><span>${esc((m?m[2]:lab)||k)}</span>`);btn.classList.add('plate','rivets');
        if(k===sub){btn.setAttribute('aria-current','page');}else btn.removeAttribute('aria-current');});
      const on=seg.querySelector('button[aria-current]');if(on)requestAnimationFrame(()=>{try{const L=on.offsetLeft-seg.clientWidth/2+on.offsetWidth/2;seg.scrollLeft=Math.max(0,L);}catch(e){}});}
    if(!b.querySelector(':scope > .hz-hdr')){const h=document.createElement('div');h.className='hz-hdr plate rusty rivets';
      h.innerHTML=`<div class="emb" aria-hidden="true">☢️</div><div class="ttl"><b>DEAD ZONE DRIVE</b><small>${esc(strip(cur[1]).toUpperCase())}</small></div><div class="lvl">LEVEL<b>${P.lvl}</b></div><button class="hz-x" aria-label="Close Hero" onclick="UI.close()">✕</button>`;
      b.prepend(h);}}
  const _rr=UI.render;UI.render=function(){const r=_rr.apply(this,arguments);try{const b=document.getElementById('sheetBody');if(this.tab==='player'&&b)shell(b);else shellOff();}catch(e){console.warn('hero62',e);}return r;};
  // close also drops the shell (UI.close hides #sheet; the observer covers any other path that hides it)
  const _cl=UI.close;UI.close=function(){shellOff();return _cl.apply(this,arguments);};
  // preload the other figures once the screen is idle, so swapping a set doesn't flash
  let pre=false;const idle=window.requestIdleCallback||(f=>setTimeout(f,1200));
  function preload(){if(pre||!GEAR_ART.avatars)return;pre=true;idle(()=>{try{Object.values(GEAR_ART.avatars).forEach(a=>{if(a&&a.png&&a.img){const i=new Image();i.decoding='async';i.src=a.img;}});}catch(e){}});}
  const _rr2=UI.render;UI.render=function(){const r=_rr2.apply(this,arguments);try{if(this.tab==='player'&&(this.sub.player==='gear'||this.sub.player==='stats'))preload();}catch(e){}return r;};
})();
