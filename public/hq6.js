// hq6 (R6) The Alliance HQ becomes a real building, the bank becomes the Alliance Vault, and officers are capped at 2.
//  HQ: one per alliance, built by the leader or an officer from the Vault on the HQ spot (12i marker). It protects
//  2 rings at Lv1, 3 at Lv5, 4 at Lv10, and its area counts in the spacing rule like any building. It defends with its own
//  wall and fire (the Stronghold's 12h numbers at the HQ's level) plus any troops members station on its hex.
//  Upgrades (leader/officers, from the Vault, take time) add wall HP and fire, cut portal time 5% a level (up to 25%)
//  and raise the Vault's capacity.
//  If the Horde takes the HQ hex: the HQ stops defending, the Vault locks for 24 h, the Horde takes 10% of every
//  resource in it (that clan banks it), and the HQ must be repaired for 40% of its build cost. Nobody's own resources
//  or troops are touched. The fall is recorded in the shared Horde record, so every phone agrees; the first leader or
//  officer phone online applies the Vault loss and lock in one transaction (the security rules enforce the lock).
//  Vault: the "Hoard" is now the Alliance Vault. Capacity per resource = 5,000 + 3,000 per HQ level. A full Vault
//  refuses new deposits but never removes anything already in it.
(function(){
  const HQ6={cost:{scrap:1500,food:300,water:300,fuel:200,parts:150},upMult:1.5,upHPerLvl:2,maxLvl:10,portalCut:.05,portalCutMax:.25,
    vaultBase:5000,vaultPerLvl:3000,lockH:24,takePct:.10,repairPct:.40,officers:2};
  window.HQ6=HQ6;
  const now=()=>Date.now();
  const H=()=>G.hq15||{};const bld=()=>H().bld||null;const hex6=()=>(H().hq&&H().hq.hex)||null;
  function lvl6(){const b=bld();if(!b||!b.built)return 0;return Math.min(HQ6.maxLvl,(b.lvl||1)+(b.upEnd&&now()>=b.upEnd?1:0));}
  function rings6(L){L=L||lvl6();return L>=10?4:L>=5?3:2;}
  function fall6(){try{const f=FX().hqFall5;const b=bld();if(!f||!b||!b.built)return null;if(f.hex!==hex6())return null;if((b.repT||0)>f.t)return null;return f;}catch(e){return null;}}
  function up6(){const b=bld();return !!(b&&b.built)&&!fall6();}
  function lockUntil6(){const b=bld()||{},f=fall6();return Math.max(b.lockUntil||0,f?f.t+HQ6.lockH*3600e3:0);}
  const locked6=()=>lockUntil6()>now();
  function vaultCap6(){return HQ6.vaultBase+HQ6.vaultPerLvl*lvl6();}
  function upCost6(L){const m=Math.pow(HQ6.upMult,L),o={};for(const k in HQ6.cost)o[k]=Math.round(HQ6.cost[k]*m);return o;}
  function repairCost6(){const o={};for(const k in HQ6.cost)o[k]=Math.round(HQ6.cost[k]*HQ6.repairPct*Math.pow(HQ6.upMult,Math.max(0,lvl6()-1)));return o;}
  Object.assign(window,{hqLvl6:lvl6,hqRings6:rings6,hqFall6:fall6,hqUp6:up6,vaultLocked6:locked6,vaultLockUntil6:lockUntil6,vaultCap6,hqUpCost6:upCost6,hqRepairCost6:repairCost6});
  window.hqPortalCut6=()=>up6()?Math.min(HQ6.portalCutMax,HQ6.portalCut*lvl6()):0;
  // ---------- the HQ as a building in fights (the Stronghold's numbers at the HQ's level)
  C26.bld.hq={...C26.bld.sh};
  const _in=innate26;innate26=function(b){if(b&&b.kind==='hq'){const s=(window.SH26D||{hp:3500,hpPerLvl:.4});return Math.round(s.hp*(1+s.hpPerLvl*(Math.max(1,b.lvl||1)-1)));}return _in.apply(this,arguments);};window.innate26=innate26;
  const hqPower6=()=>{try{return BAL.stronghold.basePower+lvl6()*BAL.stronghold.powerPerLevel*1.5;}catch(e){return 200;}};
  const _df=defendersFor;defendersFor=function(id){const out=_df.apply(this,arguments);try{const h=hex6();if(h&&up6()&&hexDist(h,id)<=rings6())out.push({kind:'hq',id:h,power:hqPower6()});}catch(e){}return out;};window.defendersFor=defendersFor;
  const _so=structOf;structOf=function(d){if(d&&d.kind==='hq')return up6()?{state:'up',hpPct:1,level:lvl6()}:{state:'down'};return _so.apply(this,arguments);};window.structOf=structOf;
  const _b26=bld26;bld26=function(defs){const h=(defs||[]).find(d=>d.kind==='hq');if(h&&up6())return{kind:'hq',lvl:lvl6(),pct:1};return _b26.apply(this,arguments);};window.bld26=bld26;
  // the HQ never "falls" from a lost garrison fight (only from the Horde taking its hex), so destroy() leaves it alone
  const _ds=destroy;destroy=function(d){if(d&&d.kind==='hq')return;return _ds.apply(this,arguments);};window.destroy=destroy;
  // troops stationed on the HQ hex (yours and teammates') fight with it, like a Stronghold's garrison
  const _sd=defSides25;defSides25=function(defs){const s=_sd.apply(this,arguments);try{const d=(defs||[]).find(x=>x.kind==='hq');if(d&&s&&Array.isArray(s.guards)){const seen=new Set(s.guards.map(g=>g.key)),T=()=>TROOP.powerPer;
      const add=g=>{if(!seen.has(g.key)&&g.pow>0){seen.add(g.key);s.guards.push(g);}};const k=stationedAt(d.id);if(k>0)add({key:'me:'+d.id,uid:P.uid,hex:d.id,n:k,pow:k*T()});
      for(const g of allyGarAt(d.id))add({key:'al:'+g.uid+':'+g.hex,uid:g.uid,hex:g.hex,n:g.n,pow:g.power||g.n*T()});}}catch(e){}return s;};window.defSides25=defSides25;
  // ---------- the HQ area counts in the spacing rule (space4.others4 lists it with a 2-ring footprint; protection can grow past that)
  function hqSpaceWhy6(h){const need=(o,r)=>2+r+(o?S4.enemyGap:S4.allyGap);
    for(const o of others4()){if(o.k==='ahq')continue;if(hexDist(h,o.hex)<need(o.enemy,o.r))return o.enemy?`Too close to ${o.who}'s base.`:`Too close to ${o.who}'s ${o.k==='sh'?'Stronghold':o.k==='tower'?'tower':'outpost'} area.`;}
    try{for(const d of ownDefStructs())if(d&&d.hex&&hexDist(h,d.hex)<need(false,+d.r||0))return'Too close to your own building area.';}catch(e){}return null;}
  window.hqSpaceWhy6=hqSpaceWhy6;
  // ---------- the Horde takes the HQ hex: recorded in the shared Horde record
  const _hs=hordeStep;hordeStep=function(k,ev){const r=_hs.apply(this,arguments);try{const h=hex6(),b=bld();if(h&&b&&b.built&&!fall6()){const fx=FX(),t=k*HB().stepMin*60e3;
      for(const [fid,f] of Object.entries(fx.f||{}))if(f&&f.tiles&&f.tiles[h]&&f.tiles[h]>(b.repT||b.t||0)){fx.hqFall5={hex:h,t:Math.max(t,f.tiles[h]),fid,id:h+':'+f.tiles[h]};fxDirty();
        const nm=((typeof fdef==='function'&&fdef(String(fid).split('~')[0]))||{}).name||'Horde';try{allianceLog(`🏛️🔥 The ${nm} took the alliance HQ. The Vault is locked for ${HQ6.lockH} h.`);}catch(e){}break;}}}catch(e){console.warn('hq6 step',e);}return r;};window.hordeStep=hordeStep;
  // the first leader/officer phone online applies the Vault loss and the lock (once per fall)
  let applying=false;
  async function applyFall6(){const f=fall6();if(!f||applying||!isOfficer15())return;if(NET.mode==='firebase'&&!NET.uid)return;applying=true;
    try{const fs=NET.fs;if(NET.mode!=='firebase'){const a=NET._al();if(a.fall5===f.id)return;const take={};for(const k in a.bank){take[k]=Math.floor((a.bank[k]||0)*HQ6.takePct);a.bank[k]-=take[k];}a.fall5=f.id;NET._alSave();bankHorde(f,take);return;}
      const aRef=fs.doc(NET.db,...NET.base,'meta','alliance'),hRef=fs.doc(NET.db,...NET.base,'meta','hq');let take=null;
      await fs.runTransaction(NET.db,async tx=>{const a=await tx.get(aRef),hd=await tx.get(hRef);const ad=a.exists()?a.data():{};if(ad.fall5===f.id){take=null;return;}
        const bank={...(ad.bank||{})};take={};for(const k of Object.keys(bank)){take[k]=Math.floor((bank[k]||0)*HQ6.takePct);bank[k]-=take[k];}
        tx.set(aRef,{bank,fall5:f.id},{merge:true});const cur=hd.exists()?hd.data():{};tx.set(hRef,{...cur,bld:{...(cur.bld||{}),lockUntil:f.t+HQ6.lockH*3600e3,fallT:f.t}});});
      if(take)bankHorde(f,take);}
    catch(e){console.warn('hq6 fall',e);}finally{applying=false;}}
  function bankHorde(f,take){try{const c=FX().f[f.fid];if(c){const b=bankOf(c);b.res+=Object.values(take).reduce((a,b)=>a+b,0);fxDirty();publishHorde();}
      const n=Object.entries(take).filter(([,v])=>v>0).map(([k,v])=>`${v} ${RES[k]}`).join(' ');if(n)allianceLog(`🏛️ The Horde carried off 10% of the Vault: ${n}`);}catch(e){}}
  window.applyFall6=applyFall6;setInterval(()=>{try{applyFall6();}catch(e){}},5000);
  // ---------- build, upgrade, repair (leader/officers, paid from the Vault in one transaction)
  async function vaultTx6(cost,mut,label){if(!isOfficer15())return toast('🚫 Only the leader or officers can do that');if(locked6())return toast(`🔒 The Vault is locked for ${fmtDur(lockUntil6()-now())}`);
    const short=k=>`The Vault needs ${cost[k]} ${RES[k]}`;
    try{if(NET.mode!=='firebase'){const a=NET._al();for(const k in cost)if((a.bank[k]||0)<cost[k])throw new Error(short(k));for(const k in cost)a.bank[k]-=cost[k];NET._alSave();await hqTx15(cur=>{if(!cur)throw new Error('Claim leadership first');return mut(cur);});}
      else{const fs=NET.fs,aRef=fs.doc(NET.db,...NET.base,'meta','alliance'),hRef=fs.doc(NET.db,...NET.base,'meta','hq');
        await fs.runTransaction(NET.db,async tx=>{const a=await tx.get(aRef),hd=await tx.get(hRef);if(!hd.exists())throw new Error('Claim leadership first');const bank={...((a.exists()&&a.data().bank)||{})};
          for(const k in cost)if((bank[k]||0)<cost[k])throw new Error(short(k));for(const k in cost)bank[k]-=cost[k];tx.set(aRef,{bank},{merge:true});tx.set(hRef,mut(JSON.parse(JSON.stringify(hd.data()))));});}
      toast(label);try{allianceLog(`🏛️ ${P.name}: ${label.replace(/^\S+ /,'')}`);UI.render();drawHq15&&drawHq15();}catch(e){}}
    catch(e){toast('🚫 '+((e&&e.message)||e));}}
  window.buildHq6=function(){const h=hex6();if(!h)return toast('🚫 Place the HQ spot first (HQ › Place HQ)');if(bld()&&bld().built)return toast('The HQ is already built');
    const why=hqSpaceWhy6(h);if(why)return toast('🚫 '+why+' Move the HQ spot first.');
    if(typeof factionAt==='function'&&factionAt(h))return toast('🚫 Raiders hold that hex');
    return vaultTx6(HQ6.cost,cur=>({...cur,bld:{built:true,lvl:1,t:now(),by:P.uid}}),'🏛️ HQ built').then(()=>{try{if(!P.tiles[h]&&!(G.terr[h]&&G.terr[h].uid&&!G.terr[h].ai))claimTile(h);}catch(e){}});};
  window.upgradeHq6=function(){const b=bld();if(!b||!b.built)return toast('Build the HQ first');if(fall6())return toast('Repair the HQ first');if(b.upEnd&&now()<b.upEnd)return toast(`Already upgrading: ${fmtDur(b.upEnd-now())}`);
    const L=lvl6();if(L>=HQ6.maxLvl)return toast('The HQ is at max level');const c=upCost6(L);
    return vaultTx6(c,cur=>{const cb=cur.bld||{};const base=Math.min(HQ6.maxLvl,(cb.lvl||1)+(cb.upEnd&&now()>=cb.upEnd?1:0));return{...cur,bld:{...cb,lvl:base,upEnd:now()+HQ6.upHPerLvl*base*3600e3}};},`🏛️ HQ upgrading to Lv${L+1}`);};
  window.repairHq6=function(){const f=fall6();if(!f)return toast('The HQ is fine');if(typeof factionAt==='function'&&factionAt(hex6()))return toast('🚫 Take the HQ hex back from the Horde first');
    return vaultTx6(repairCost6(),cur=>({...cur,bld:{...(cur.bld||{}),repT:now()}}),'🏛️ HQ repaired');};
  // ---------- portal time is cut in base15.portalMs15 (reads hqPortalCut6)
  // ---------- Vault: capacity, lock, name
  const bal6=res=>{try{return NET.mode==='firebase'?((G.al&&G.al.bank||{})[res]||0):(NET._al().bank[res]||0);}catch(e){return 0;}};
  const _btx=NET.bankTx.bind(NET);NET.bankTx=async function(uid,name,res,amt){
    if(amt>0){const bal=bal6(res),cap=vaultCap6();if(bal+amt>cap){const room=Math.max(0,cap-bal);throw new Error(room?`The Vault holds ${cap.toLocaleString()} ${RES[res]}: only ${room.toLocaleString()} more fits. Upgrade the HQ for more room.`:`The Vault is full of ${RES[res]} (${cap.toLocaleString()}). Upgrade the HQ for more room.`);}}
    else if(amt<0&&locked6())throw new Error(`🔒 The Vault is locked for ${fmtDur(lockUntil6()-now())} after the HQ fell`);
    return _btx(uid,name,res,amt);};
  // the daily 25% auto-share: what doesn't fit in a full Vault stays with the player
  if(NET.bankMulti){const _bm=NET.bankMulti.bind(NET);NET.bankMulti=async function(uid,name,obj,kind){const cap=vaultCap6(),send={},back={};
      for(const [k,v] of Object.entries(obj||{})){const room=Math.max(0,cap-bal6(k)),n=Math.min(v||0,room);send[k]=n;if((v||0)>n)back[k]=v-n;}
      if(Object.keys(back).length){try{addRes(back);save();toast(`🏦 The Vault is full: ${Object.entries(back).map(([k,v])=>v+' '+RES[k]).join(' ')} stayed with you`);}catch(e){}}
      if(Object.values(send).some(v=>v>0))return _bm(uid,name,send,kind);};}
  // decideReq15 (approve) and collect15 wait while the Vault is locked (rank15.js)
  // the HQ can't be moved once it is built (it's a building now)
  try{const _sh=window.setHq15;window.setHq15=function(){if(bld()&&bld().built)return toast('🚫 The HQ is built here. It can\'t be moved.');return _sh.apply(this,arguments);};}catch(e){}
  try{AT26.hoard.n='🏦 Vault';UI.SUBS.alliance=Object.entries(AT26).map(([k,v])=>[k,v.n]);}catch(e){}
  // ---------- officers: at most 2 (rank15.setRank15 refuses a 3rd; the security rules cap roles at 3 entries)
  // ---------- HQ tab: the building, the Vault, recent attacks
  const n6=v=>Math.round(+v||0).toLocaleString();const cst=o=>Object.entries(o).filter(([,v])=>v>0).map(([k,v])=>`${n6(v)} ${RES[k]}`).join(' ');
  function hqCard6(){const h=hex6(),b=bld(),L=lvl6(),off=isOfficer15(),f=fall6(),bank=(G.al&&G.al.bank)||{};let x=`<div class="hq6"><h3>🏛️ HQ building</h3>`;
    if(!h)x+=`<p class="tiny">Place the HQ spot first, then build it here from the Vault.</p>`;
    else if(!b||!b.built){x+=`<p>Not built yet. Cost from the Vault: <b>${cst(HQ6.cost)}</b>.</p><p class="tiny">Protects 2 rings around ${hexName(h)}, defends with its own wall and fire, cuts portal time and grows the Vault.</p>${off?`<div class="btns24"><button class="red24" onclick="buildHq6()">🏛️ Build the HQ</button></div>`:'<p class="tiny">The leader or an officer builds it.</p>'}`;}
    else{const hp=innate26({kind:'hq',lvl:L}),fire=Math.round(C26.bld.hq.fire*(1+C26.lvlFire*(L-1))),walls=Math.round(100*Math.min(C26.maxWalls,C26.bld.hq.walls+C26.lvlWalls*(L-1)));
      const gar=(()=>{try{return stationedAt(h)+((typeof allyGarAt==='function'?allyGarAt(h):[])||[]).reduce((a,g)=>a+((g.power||0)/((typeof basePower3==='function'?basePower3():TROOP.powerPer)||1)),0);}catch(e){return 0;}})();
      x+=f?`<div class="row hq6f"><div class="grow"><b>🔥 Fallen</b><small>The Horde took the HQ hex. The Vault is locked${locked6()?' for '+fmtDur(lockUntil6()-now()):''}. Take the hex back, then repair once the lock ends: ${cst(repairCost6())}.</small></div>${off?'<button onclick="repairHq6()">🔧 Repair</button>':''}</div>`:'';
      x+=`<div class="hg5"><div><b>Lv${L}</b><small>level</small></div><div><b>${n6(hp)}</b><small>wall HP</small></div><div><b>${n6(fire)}</b><small>fire a round</small></div><div><b>${walls}%</b><small>walls block</small></div><div><b>${rings6(L)} rings</b><small>protected</small></div><div><b>−${Math.round(100*window.hqPortalCut6())}%</b><small>portal time</small></div></div>`;
      x+=`<div class="r24"><span>Troops stationed on the HQ</span><b>${n6(gar)}</b></div>`;
      if(b.upEnd&&now()<b.upEnd)x+=`<div class="r24"><span>Upgrading to Lv${L+1}</span><b>${fmtDur(b.upEnd-now())}</b></div>`;
      else if(L<HQ6.maxLvl&&!f){const nx=L+1;x+=`<div class="row"><div class="grow"><b>Next: Lv${nx}</b><small>${cst(upCost6(L))} from the Vault · ${HQ6.upHPerLvl*L} h · wall HP ${n6(innate26({kind:'hq',lvl:nx}))}, Vault +${n6(HQ6.vaultPerLvl)} each${rings6(nx)>rings6(L)?`, ${rings6(nx)} rings`:''}${HQ6.portalCut*nx<=HQ6.portalCutMax?`, portal −${Math.round(100*HQ6.portalCut*nx)}%`:''}</small></div>${off?'<button onclick="upgradeHq6()">⬆️ Upgrade</button>':''}</div>`;}}
    x+=`<h3>🏦 Alliance Vault</h3><div class="hg5">${Object.keys(RES).map(k=>`<div><b>${n6(bank[k]||0)}</b><small>${RES[k]} / ${n6(vaultCap6())}</small></div>`).join('')}</div>`;
    const pend=Object.values(G.bankReq15||{}).filter(r=>r.status==='pending').length;x+=`<div class="r24"><span>Pending requests</span><b>${pend}</b></div>${locked6()?`<div class="r24"><span>🔒 Locked</span><b>${fmtDur(lockUntil6()-now())}</b></div>`:''}<p class="tiny">A full Vault refuses new deposits; nothing already in it is ever removed. <a href="#" onclick="UI.sub.alliance='hoard';UI.render();return false">Open the Vault</a></p>`;
    const rec=(P.fr25||[]).slice(0,5);x+=`<h3>⚔️ Recent attacks on alliance land</h3>${rec.map(r=>`<div class="r24"><span>${r.win?'🛡️ Held':'💀 Lost'} ${hexName(r.hex||'')}${r.ally?' (you helped)':''}</span><b>${when(r.t)}</b></div>`).join('')||'<p class="tiny">None yet.</p>'}`;
    const M=(G.al&&G.al.members)||{};const rk=u=>(H().roles||{})[u]||'member';const rows=Object.entries(M).sort((a,c)=>({leader:0,officer:1,member:2}[rk(a[0])]-{leader:0,officer:1,member:2}[rk(c[0])]));
    x+=`<h3>👥 Crew</h3>`+rows.map(([u,m])=>`<div class="r24"><span>${rk(u)==='leader'?'👑':rk(u)==='officer'?'⭐':'·'} ${esc15(isMe(u)?P.name+' (you)':m.name||'Teammate')}${(H().titles||{})[u]?' · '+esc15(H().titles[u]):''}</span><b>🪖 ${n6(isMe(u)?(window.myArmy14?myArmy14():0):m.p14||0)} · ${ago(isMe(u)?Date.now():m.lastActive)}</b></div>`).join('');
    if(typeof myRank15==='function'&&myRank15()==='leader')x+=`<p class="tiny"><a href="#" onclick="UI.sub.alliance='horde5';UI.render();return false">☠️ Horde dashboard</a></p>`;
    return x+`</div>`;}
  window.hqCard6=hqCard6;
  HOOK.render(function(){try{if(this.tab!=='alliance'||this.sub.alliance!=='hq')return;const b=$('#sheetBody');if(!b||b.querySelector('.hq6'))return;const sec=b.querySelector('.p-hq')||b;const h2=sec.querySelector('h2');
      (h2||sec).insertAdjacentHTML(h2?'afterend':'afterbegin',hqCard6());}catch(e){console.warn('hq6 tab',e);}});
  const _rr6=UI.render;UI.render=function(){const o=_rr6.apply(this,arguments);vcap6.call(UI);return o;};function vcap6(){try{if(this.tab!=='alliance'||this.sub.alliance!=='hoard')return;const b=$('#sheetBody');if(!b||b.querySelector('.vcap6'))return;const h2=[...b.querySelectorAll('h2')].find(x=>/Vault/.test(x.textContent));if(!h2)return;
      h2.insertAdjacentHTML('afterend',`<p class="tiny vcap6">📦 Holds up to <b>${n6(vaultCap6())}</b> of each resource${lvl6()?` (HQ Lv${lvl6()})`:' (build the HQ for more room)'}. A full Vault refuses new deposits; nothing in it is ever removed.${locked6()?` <b>🔒 Locked for ${fmtDur(lockUntil6()-now())}</b>: the HQ fell.`:''}</p>`);}catch(e){}}
  setInterval(()=>{try{if(UI.tab==='alliance'&&UI.sub.alliance==='hq'&&$('#modal').classList.contains('hidden')){const c=document.querySelector('.hq6');if(c){const t=document.createElement('div');t.innerHTML=hqCard6();c.replaceWith(t.firstElementChild);}}}catch(e){}},5000);
  // ---------- map: the built HQ shows its level (or 🔥) and the rings it protects
  const _dh=window.drawHq15;window.drawHq15=function(){const r=_dh.apply(this,arguments);try{const h=hex6(),b=bld();const g=G.layers&&G.layers.hq15;if(!g||!h||!b||!b.built)return r;
      const [q,rr]=idQR(h),c=hexCenter(q,rr),e=hexRing(q,rr,rings6()).find(x=>hexDist(x.id,h)===rings6());const ec=hexCenter(...idQR(e.id));const rad=distM(c[0],c[1],ec[0],ec[1])+(typeof HEX_R==='number'?HEX_R*.8:60);
      const f=fall6();L.circle(c,{radius:rad,color:f?'#ff3b2f':'#ffd24a',weight:2,opacity:.8,fillOpacity:.04,interactive:false}).addTo(g);
      g.eachLayer(l=>{const el=l.getElement&&l.getElement();const bb=el&&el.querySelector('.hq15ico b');if(bb&&!bb.dataset.h6){bb.dataset.h6=1;bb.textContent+=f?' 🔥':` Lv${lvl6()}`;}});}catch(e){}return r;};
  const st=document.createElement('style');
  st.textContent=`.hq6{margin:6px 0 12px}.hq6 .hg5{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0}.hq6 .hg5 div{background:#1d1710;border-radius:8px;padding:6px;text-align:center}
  .hq6 .hg5 b{display:block;font-size:14px}.hq6 .hg5 small{font-size:10px;opacity:.75}.hq6f{border-left:3px solid #ff3b2f}.hq6 a{color:#ffb84d}`;
  document.head.appendChild(st);
})();
