// build66 (R6.6, Jacob's FIXES.md §3 and §4): demolish your own buildings, and move a built Alliance HQ.
//  Demolish: every player-built structure except the Stronghold and the Alliance HQ (watchtowers, outposts of every kind,
//   pipelines). Instant after a confirm that lists the refund: 50% of what was paid to build and upgrade, floored per resource.
//   The record is removed (no ruins), the slot and the cap are freed, your hexes stay yours. Your troops there march home
//   through sendHome25. Teammates' troops are sent home by their own phone (sweeper below), never by a write to their doc.
//  Move HQ: leader or officers, a built HQ only, paid from the Alliance Vault through vaultTx6 (same as build / upgrade /
//   repair), no cooldown. Only the `hq` key changes; `bld` is left exactly as it is, so the level, an upgrade in progress,
//   a fall and the Vault lock all stay. Same picker (pick15('hq')) and same placement checks (hqSpaceWhy6, not a Horde hex).
(function(){
  const now=()=>Date.now();
  const n66=v=>Math.round(+v||0).toLocaleString();
  const resLine=o=>{const L=Object.entries(o||{}).filter(([,v])=>v>0).map(([k,v])=>`${n66(v)} ${RES[k]}`);return L.length?L.join(' · '):'nothing (it rounds down to 0)';};
  const add=(a,b)=>{for(const k in b||{})a[k]=(a[k]||0)+(+b[k]||0);return a;};
  function refundHalf66(paid){const o={};for(const k of Object.keys(paid||{})){const n=Math.floor((paid[k]||0)*0.5);if(n>0)o[k]=n;}return o;}
  window.refundHalf66=refundHalf66;

  // ---------- what was paid
  // watchtower: Lv1 build cost + every upgrade paid (towerUpCost going from L to L+1). Repairs and patches are not counted.
  function towerPaid66(t){const lv=Math.max(1,(t&&t.level)||1),paid=add({},BAL.tower.cost);for(let L=1;L<lv;L++)add(paid,towerUpCost({level:L}));return paid;}
  // outposts: what was actually paid when it was placed (recorded from R6.6 on); older ones are worked out from outpostCost() now
  function outpostPaid66(o){return o&&o.paid66?{...o.paid66}:outpostCost();}
  const recPaid=(fnName)=>{try{const f=window[fnName];if(typeof f!=='function')return;const w=function(id){const c=outpostCost(),before=(W().outposts||{})[id],r=f.apply(this,arguments);
      try{const o=(W().outposts||{})[id];if(o&&o!==before)o.paid66=c;}catch(e){}return r;};window[fnName]=w;if(fnName==='placeOutpost')placeOutpost=w;}catch(e){}};
  recPaid('placeOutpost');recPaid('placeSpecial15');
  window.towerPaid66=towerPaid66;window.outpostPaid66=outpostPaid66;

  // ---------- one demolish for every kind
  function what66(hex){const w=W();const t=(w.towers||{})[hex],o=(w.outposts||{})[hex];
    if(t)return{k:'tower',name:'Watchtower',lvl:t.level||1,paid:towerPaid66(t)};
    if(o){const nm=o.kind==='home'?'Home Outpost':o.kind==='fwd'?'Forward Outpost':'Outpost';return{k:'op',name:nm,paid:outpostPaid66(o),o};}
    return null;}
  function troopsHome66(hex,why){try{const s=stationed()[hex];if(s&&s.n>0)sendHome25(hex,s.n,why);else if(s)delete stationed()[hex];}catch(e){console.warn('build66 home',e);}}
  function finish66(txt,refund){try{if(window.supplyBust64)supplyBust64();}catch(e){}save();try{pushMember();}catch(e){}try{drawWorld();}catch(e){}
    try{UI.closeModal();}catch(e){}try{UI.tab&&UI.render();}catch(e){}toast(`🧨 ${txt} demolished · refund ${resLine(refund)}`);}
  async function demolish66(hex){const x=what66(hex);if(!x)return toast('Nothing of yours to demolish here');
    const refund=refundHalf66(x.paid);
    const what=x.k==='tower'?`your Lv${x.lvl} Watchtower`:`your ${x.name}${x.o&&x.o.state==='capturing'?' (still capturing: its hexes will not be claimed)':''}`;
    const ok=await UI.ask(`Demolish ${x.name}?`,`Demolish ${what} at ${hexName(hex)}?\n\nRefund (50% of build + upgrades): ${resLine(refund)}\n\nYour hexes stay yours, but nothing guards them from here${x.k==='op'?' and some may fall out of pay range':''}. Your troops here march home. This can't be undone.`,'Demolish');
    if(!ok)return;const y=what66(hex);if(!y||y.k!==x.k)return toast('It is already gone');
    if(P.op15===hex){try{setOp15('gps');}catch(e){P.op15='gps';}}
    troopsHome66(hex,'building demolished');
    const w=W();if(x.k==='tower')delete w.towers[hex];else delete w.outposts[hex];
    addRes(refund);
    try{allianceLog(`🧨 ${P.name} demolished their ${x.name} at ${hexName(hex)}`);}catch(e){}
    finish66(x.name,refund);}
  window.demolish66=demolish66;
  async function demolishPipe66(id){const p=pipes().find(q=>q.id===id);if(!p||p.own===false)return;const refund=refundHalf66(PIPE.cost);
    const ok=await UI.ask('Demolish pipeline?',`Demolish the ${p.name} pipeline?\n\nRefund (50% of the build cost): ${resLine(refund)}\n\nThe ${p.res} slot is free again right away. Guards on the line march home. This can't be undone.`,'Demolish');
    if(!ok)return;if(!pipes().some(q=>q.id===id))return toast('It is already gone');
    removePipe(id);addRes(refund);try{allianceLog(`🧨 ${P.name} demolished the ${p.name} pipeline`);}catch(e){}save();try{UI.closeModal();}catch(e){}toast(`🧨 Pipeline demolished · refund ${resLine(refund)}`);}
  window.demolishPipe66=demolishPipe66;
  // one Demolish per card: the card's own button wins over the copy on the building stats box
  const dbtn=hex=>`<button class="fight dm66b" onclick="demolish66('${hex}')">🧨 Demolish</button>`;
  window.dmBtn66=dbtn;
  const _info=UI.info;UI.info=function(){const r=_info.apply(this,arguments);try{const L=[...document.querySelectorAll('#modalBody .dm66b')];if(L.length>1){const keep=L.find(b=>b.closest('.ibtns'))||L[0];L.forEach(b=>{if(b!==keep)b.remove();});}}catch(e){}return r;};

  // ---------- Move a built Alliance HQ
  // PROPOSED — Jacob to confirm: 25% of HQ6.cost, floored per resource, not scaled by level.
  HQ6.moveCost=Object.fromEntries(Object.entries(HQ6.cost).map(([k,v])=>[k,Math.floor(v*0.25)])); // = 375 scrap, 75 food, 75 water, 50 fuel, 37 parts
  HQ6.moveProposed=true;
  const H=()=>G.hq15||{},bld=()=>H().bld||null,hex6=()=>(H().hq&&H().hq.hex)||null,built=()=>!!(bld()&&bld().built);
  window.hqBuilt66=built;
  function moveWhy66(id){if(!isOfficer15())return'Only the leader or officers can move the HQ';if(id===hex6())return'The HQ is already here';
    if(typeof factionAt==='function'&&factionAt(id))return'Raiders hold that hex';const w=hqSpaceWhy6(id);if(w)return w;
    if(window.vaultLocked6&&vaultLocked6())return`The Vault is locked for ${fmtDur(vaultLockUntil6()-now())}`;return null;}
  window.moveWhy66=moveWhy66;
  async function moveBuiltHq6(id,name){const why=moveWhy66(id);if(why)return toast('🚫 '+why);const old=hex6(),nm=(String(name||'').replace(/[<>]/g,'').trim().slice(0,24))||(H().hq&&H().hq.name)||'HQ';
    const label='🏛️ HQ moved to '+hexName(id);let ok=false;const t0=window.toast;
    window.toast=function(m){if(m===label)ok=true;return t0.apply(this,arguments);};toast=window.toast;
    try{await vaultTx6(HQ6.moveCost,cur=>({...cur,hq:{hex:id,name:nm,by:P.uid,byName:P.name,t:now()}}),label);} // `bld` and every other key ride along unchanged
    finally{window.toast=t0;toast=t0;}
    if(!ok)return false;G.pick15=null;
    try{if(old&&stationed()[old])troopsHome66(old,'HQ moved');}catch(e){}
    try{if(!P.tiles[id]&&!(G.terr[id]&&G.terr[id].uid&&!G.terr[id].ai))claimTile(id);}catch(e){}
    try{UI.closeModal();drawHq15();drawWorld();}catch(e){}return true;}
  window.moveBuiltHq6=moveBuiltHq6;
  // setHq15 stays free for the unbuilt spot; a built HQ goes through the paid move (this replaces the R6 "can't be moved" block)
  const _set=window.setHq15;window.setHq15=function(id,name){if(built())return moveBuiltHq6(id,name);return _set.apply(this,arguments);};
  // the picker's confirm for a built HQ: checks first (nothing is paid when a hex is refused), then the cost
  const _it=UI.infoTile;UI.infoTile=function(id){if(G.pick15==='hq'&&built()&&!(G.pick15At&&now()-G.pick15At>180e3)){const why=moveWhy66(id);if(why){toast('🚫 '+why);return;}
      const h=H().hq||{},esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));const L=window.hqLvl6?hqLvl6():1,st=(()=>{try{return stationedAt(h.hex)||0;}catch(e){return 0;}})();
      return UI.modal(`<h2>🏛️ Move the HQ here?</h2><p>${hexName(id)}. The HQ building moves with everything on it.</p>
        <div class="dm66"><div class="r24"><span>Cost from the Vault <span class="prop66">PROPOSED — Jacob to confirm</span></span><b>${resLine(HQ6.moveCost)}</b></div>
        <div class="r24"><span>Level</span><b>Lv${L} kept${bld().upEnd&&now()<bld().upEnd?' · upgrade continues':''}</b></div>
        <div class="r24"><span>Troops on the old HQ hex</span><b>${st?n66(st)+' of yours march home':'march home'}</b></div></div>
        <p class="tiny">Teammates' Strongholds stay where they are. Anyone more than ${(window.B15&&B15.hqMi)||5} mi away can use Play next to the crew to move theirs.</p>
        <input id="hq15name" maxlength="24" placeholder="HQ name" value="${esc(h.name)}"><div class="btns24"><button class="red24" onclick="setHq15('${id}',$('#hq15name').value)">✅ Move HQ</button><button class="ghost24" onclick="G.pick15=null;UI.closeModal()">Cancel</button></div>`);}
    return _it.apply(this,arguments);};

  // ---------- your troops on a teammate's building or the HQ that is no longer there (hosting-only sweeper, your own phone)
  //  Remembers which friendly building each of your garrisons sits on. When the HQ has moved, or a teammate's building has
  //  been gone from their member summary for 5+ minutes, your troops there march home. Bare hexes are never touched.
  function sweep66(){try{if(!P.world||!G.al||!G.al.members)return;const t=TP(),mem=t.bld66=t.bld66||{},S=stationed(),hq=hex6(),T=now();let ch=false;
    for(const [h,s] of Object.entries(S)){if(!s||!(s.n>0)||P.tiles[h]||(s.at&&T<s.at))continue;
      const b=typeof bldAt==='function'?bldAt(h):null;
      if(b&&!b.own){mem[h]={k:'b',owner:b.owner,t:T};delete mem[h].gone;ch=true;continue;}
      if(hq&&h===hq){mem[h]={k:'hq',t:T};ch=true;continue;}
      const m=mem[h];if(!m)continue;
      if(m.k==='hq'){if(G.hq15&&G.hq15.hq&&hq&&hq!==h){delete mem[h];ch=true;sendHome25(h,s.n,'HQ moved');}continue;}
      if(!m.gone){m.gone=T;ch=true;continue;}
      if(T-m.gone>=5*60e3){delete mem[h];ch=true;sendHome25(h,s.n,'building demolished');}}
    for(const h of Object.keys(mem))if(!S[h]){delete mem[h];ch=true;}
    if(ch)save();}catch(e){console.warn('build66 sweep',e);}}
  window.sweep66=sweep66;setInterval(sweep66,30e3);setTimeout(sweep66,8000);
})();
