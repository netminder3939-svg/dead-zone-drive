// tiers3ui (R3) Troop tiers on screen: Barracks › your army by tier, train at a tier, upgrade troops, a T1–T5 stats table,
//  and "Next level unlocks" on the Barracks, the Stronghold and towers. March sizes show which tiers go.
(function(){
  const q=s=>document.querySelector(s);
  const n0=v=>Math.round(+v||0).toLocaleString();
  const tp=t=>TR2.tierPower[t-1]||1;
  const RES3=o=>typeof tcost==='function'?tcost(o):Object.entries(o).map(([k,v])=>v+(RES[k]||k)).join(' ');
  const unlockLvl=t=>2*t-1; // Barracks level that unlocks tier t (tier = level / 2, rounded up)
  function perTroop3(t){const type=(typeof myType26==='function'?myType26():'raider'),T=C26.types[type]||C26.types.raider,c=C26.cls[type]||{};
    return{atk:T.atk*tp(t)*(1+(c.atk||0)),hp:T.hp*tp(t)*(1+(c.hp||0)),type};}
  window.perTroop3=perTroop3;
  function armyRows3(){reconcile3();const t=TP(),c=t.c3||{},rows=[];const S=o=>{let s=0;for(const k in o||{})s+=o[k];return s;};
    const add=(label,comp)=>{if(S(comp)>0)rows.push([label,comp]);};
    add('🏠 Home',c.home);const st={};for(const h in c.s||{})for(const k in c.s[h])st[k]=(st[k]||0)+c.s[h][k];add('🛡️ Guards and outposts',st);
    const aw={};for(const id in c.a||{})for(const k in c.a[id])aw[k]=(aw[k]||0)+c.a[id][k];(t.returning||[]).forEach(o=>{for(const k in o.c3||{})aw[k]=(aw[k]||0)+o.c3[k];});for(const id in c.p||{})for(const k in c.p[id])aw[k]=(aw[k]||0)+c.p[id][k];add('🚩 Marching, returning, portal',aw);
    const wd={...(c.w||{})};(t.healing||[]).forEach(o=>{for(const k in o.c3||{})wd[k]=(wd[k]||0)+o.c3[k];});add('🩹 Wounded and healing',wd);
    return rows;}
  HOOK.render(function(){try{if(this.tab!=='base'||this.sub.base!=='barracks')return;const b=q('#sheetBody');if(!b||b.querySelector('.t3'))return;const mx=maxTier3(),B=barracks(),home=compOf3('home');
    // intro: troops keep their tier now
    b.querySelectorAll('p.tiny').forEach(p=>{if(/every 2 Barracks levels|Train troops from scrap/.test(p.textContent))p.innerHTML=`Troops have tiers. Each tier hits harder and has more health. Barracks Lv3 unlocks <b>T2</b>, Lv5 <b>T3</b>, Lv7 <b>T4</b>, Lv9 <b>T5</b>. Troops keep the tier they were trained at; upgrade them below. Marches and guards send your strongest troops first (max <b>${n0(marchTroopCap())}</b> per march).`;});
    const lv=b.querySelector('h2 .lv');if(lv)lv.textContent=`Lv${B.level} · up to T${mx}`;
    // queue rows say what they are
    const rows=b.querySelectorAll('.row.tq .grow');TP().queue.forEach((x,i)=>{const el=rows[i];if(!el)return;const first=el.firstChild;if(first&&first.nodeType===3)first.textContent=x.up3!=null?`⬆️ ${n0(x.n)} T${x.up3} → T${x.tier3}`:`⏳ ${n0(x.n)} T${x.tier3||mx} troops`;});
    // train at a tier: a picker beside the Train button
    const tb=q('#btnTrain');if(tb&&mx>1){const sel=`<select id="t3sel" aria-label="Train tier">${Array.from({length:mx},(_,i)=>i+1).reverse().map(t=>`<option value="${t}" ${t===trainTier3()?'selected':''}>T${t}</option>`).join('')}</select>`;
      tb.insertAdjacentHTML('beforebegin',sel);q('#t3sel').onchange=e=>{G._t3train=+e.target.value;UI.render();};
      const sm=tb.parentElement.querySelector('.grow small');if(sm&&!sm.dataset.t3){sm.dataset.t3=1;sm.insertAdjacentText('afterbegin',`T${trainTier3()} · `);}}
    // next Barracks level
    const up=q('#btnBarUp');if(up){const sm=up.parentElement.querySelector('.grow small');if(sm&&!sm.dataset.t3){sm.dataset.t3=1;const nl=B.level+1,nt=Math.ceil(nl/2);
      sm.insertAdjacentHTML('beforeend',`<br>Next level unlocks: ${nt>mx?`<b>T${nt} troops</b> · `:''}march size +${n0(TR2.marchCapPerBarracks)} · training ${Math.round(100*(1+0.25*(nl-1))/(1+0.25*(nl-2))-100)}% faster`);}}
    let h=`<div class="t3"><h2>🎖️ Your army by tier</h2>`;
    const ar=armyRows3();h+=ar.map(([l,c])=>`<div class="row"><div class="grow"><b>${l}</b><small>${mixText3(c)}</small></div></div>`).join('')||'<p class="tiny">No troops yet.</p>';
    // upgrades
    const ups=[];for(let t=1;t<mx;t++){const have=home[t]||0;if(have>0)ups.push(t);}
    if(ups.length){h+=`<h3>⬆️ Upgrade troops at home</h3>`;
      h+=ups.map(t=>{const have=home[t],n=Math.min(have,1000),c=upCost3(n,t);return`<div class="row"><div class="grow"><b>T${t} → T${t+1}</b> · ${n0(have)} at home<small>Pay the difference in training cost · takes training time · they leave home while upgrading</small>
        <div class="t3up"><input type="number" min="1" max="${have}" value="${n}" id="t3n${t}" inputmode="numeric"><span id="t3c${t}">${RES3(c)} · ${fmtDur(trainMs(n))}</span></div></div><button onclick="upgradeTroops3(${t},+document.getElementById('t3n${t}').value)">Upgrade</button></div>`;}).join('');}
    else if(mx>1)h+=`<p class="tiny">Upgrade: all troops at home are already T${mx}, the best your Barracks allows.</p>`;
    // stats table
    const pt=[1,2,3,4,5].map(t=>({t,...perTroop3(t),cost:trainCost(100,t),open:t<=mx}));
    h+=`<h3>📊 Troop tiers (${((CLASSES.list[pt[0].type]||{}).name)||pt[0].type} troops)</h3><div class="t3tbl"><table><thead><tr><th>Tier</th><th>ATK</th><th>HP</th><th>Train 100</th><th>Unlock</th></tr></thead><tbody>${pt.map(x=>`<tr class="${x.open?'':'lock'}"><td><b>T${x.t}</b> ×${tp(x.t)}</td><td>${x.atk.toFixed(2)}</td><td>${x.hp.toFixed(2)}</td><td>${RES3(x.cost)}</td><td>${x.open?'✓':'Barracks Lv'+unlockLvl(x.t)}</td></tr>`).join('')}</tbody></table></div>
      <p class="tiny">Per troop. Same march speed, upkeep and training time for every tier. Your class bonus is included; gear and perks add on top in a fight.</p></div>`;
    b.insertAdjacentHTML('beforeend',h);
    for(const t of ups){const i=document.getElementById('t3n'+t);if(i)i.oninput=()=>{const n=Math.max(1,Math.min(+i.max,Math.floor(+i.value||0)));document.getElementById('t3c'+t).textContent=`${RES3(upCost3(n,t))} · ${fmtDur(trainMs(n))}`;};}
  }catch(e){console.warn('tiers3ui',e);}});
  // Stronghold: what the next level unlocks
  HOOK.render(function(){try{if(this.tab!=='base'||this.sub.base!=='fort')return;const b=q('#sheetBody');if(!b||b.querySelector('.t3sh'))return;const h3=[...b.querySelectorAll('h3')].find(x=>/^Next: Lv/.test(x.textContent));if(!h3)return;
    const S=P.stronghold||{level:1},L=S.level;const cap0=troopCap(),op0=outpostCap();S.level=L+1;let cap1=cap0,op1=op0;try{cap1=troopCap();op1=outpostCap();}finally{S.level=L;}
    const bmax=Math.min(TROOP.barracks.maxLevel,L+2),bt=Math.ceil(bmax/2),now=Math.ceil(Math.min(TROOP.barracks.maxLevel,L+1)/2);
    const li=[`troop cap ${n0(cap0)} → <b>${n0(cap1)}</b>`,`Barracks can reach Lv${bmax}${bt>now?` (unlocks <b>T${bt}</b>)`:''}`];if(op1>op0)li.push(`outposts ${op0} → <b>${op1}</b>`);li.push('+2 🛡️ Defense · +10 ❤️ Health');
    const row=h3.nextElementSibling;(row||h3).insertAdjacentHTML('afterend',`<div class="t3sh"><b>Next level unlocks</b><ul>${li.map(x=>`<li>${x}</li>`).join('')}</ul></div>`);}catch(e){console.warn('tiers3ui sh',e);}});
  // Towers: what the next level gives
  try{const _it=UI.infoTile;UI.infoTile=function(id){const r=_it.apply(this,arguments);try{const t=W().towers&&W().towers[id];const mb=q('#modalBody');if(!t||!mb||mb.querySelector('.t3tw'))return r;
      const L=t.level||t.lvl||1,cur={kind:'tower',lvl:L},nx={kind:'tower',lvl:L+1};const f=l=>Math.round(C26.bld.tower.fire*(1+C26.lvlFire*(l-1)));
      const html=`<div class="t3tw t3sh"><b>Next level (Lv${L+1}) gives</b><ul><li>wall HP ${n0(innate26(cur))} → <b>${n0(innate26(nx))}</b></li><li>fire ${n0(f(L))} → <b>${n0(f(L+1))}</b> a round</li><li>walls block ${Math.round(100*Math.min(C26.maxWalls,C26.bld.tower.walls+C26.lvlWalls*(L-1)))}% → <b>${Math.round(100*Math.min(C26.maxWalls,C26.bld.tower.walls+C26.lvlWalls*L))}%</b></li></ul></div>`;
      const a=mb.querySelector('.ibtns');a?a.insertAdjacentHTML('beforebegin',html):mb.insertAdjacentHTML('beforeend',html);}catch(e){}return r;};}catch(e){}
  // March size picker: say which tiers go
  setInterval(()=>{try{const mb=q('#modalBody');if(!mb||q('#modal').classList.contains('hidden'))return;const rng=mb.querySelector('input[type=range]');if(!rng)return;const n=Math.round(+rng.value||G.troopSend||0);
      let el=mb.querySelector('.t3mix');if(!el){el=document.createElement('div');el.className='t3mix tiny';rng.insertAdjacentElement('afterend',el);}
      if(el.dataset.n==String(n))return;el.dataset.n=String(n);const from=typeof marchFrom==='function'?marchFrom():null,sh=typeof shHex15==='function'?shHex15():null;const src=(!from||from===sh)?compOf3('home'):compOf3('s:'+from);
      el.textContent=n>0?`Sends: ${mixText3(takeStrong3({...src},n))} (strongest first)`:'';}catch(e){}},400);
  const st=document.createElement('style');
  st.textContent=`.t3tbl{overflow-x:auto}.t3tbl table{width:100%;border-collapse:collapse;font-size:12px}.t3tbl th,.t3tbl td{padding:5px 4px;border-bottom:1px solid #2a2219;text-align:left;white-space:nowrap}.t3tbl tr.lock{opacity:.45}
  .t3up{display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap}.t3up input{width:90px;padding:6px;border-radius:8px;border:1px solid #444;background:#151515;color:#eee}.t3up span{font-size:12px;opacity:.85}
  #t3sel{margin-right:6px;padding:6px;border-radius:8px;background:#151515;color:#eee;border:1px solid #444}.t3sh{margin:6px 0 8px;font-size:13px}.t3sh ul{margin:4px 0 0 18px;padding:0}.t3mix{margin:2px 0 6px;opacity:.85}`;
  document.head.appendChild(st);
})();
