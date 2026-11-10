// horde5 (R5) The Horde plays by the same economy as players, the map shows only what it is really doing, and the
//  alliance leader gets a Horde dashboard.
//  Economy (replaces the flat income: each clan used to earn resources every hour even with no land):
//   - income only from land: every hex a clan holds earns per hour, rich resource hexes earn more. No land, no income.
//   - a Horde Stronghold level (1-10) sets the troop cap (1,000 per level + 200 per outpost) and training speed.
//   - training costs 1 resource per troop. Troops eat every hour; a clan that can't feed them loses troops.
//   - a clan spends resources to level up its Stronghold once its army is at least half its cap.
//   - it only goes after players' land when its army is at least 40% of its cap; before that it expands and gathers.
//   - stronger alliances face a more efficient Horde (income and training up to 3x), never free income.
//   - a clan that loses all its land is gone: its name, troops and resources. After 7 days a new, small clan of that
//     gang (Lv1 Stronghold, 500 troops) can appear farther out, named "<gang> II", "III"...
//   - existing clans on first load: troops above their new cap leave, a clan with no land is gone.
//  Everything is computed inside the shared Horde record from timestamps, the same way on every phone.
//  Also fixes an R3 mistake: Horde squad troops were multiplied by your troops' average tier; they are counted at base power.
(function(){
  const H5={resPerHex:3,richBonus:1,capPerLvl:1000,capPerOp:200,trainPerLvlH:20,eatPerTroopH:1/4800,starveLossH:.02,upCost:400,maxLvl:10,
    attackPct:.40,upAtPct:.50,startTroops:500,startRes:300,respawnDays:7,effMax:3,log:20};
  window.H5=H5;
  const now=()=>Date.now();
  function eff5(){try{const s=typeof hordeScale14==='function'?hordeScale14():1;return 1+(H5.effMax-1)*Math.min(1,Math.max(0,(s-1)/9));}catch(e){return 1;}}
  function lvlOf(f){return Math.max(1,Math.min(H5.maxLvl,(f&&f.bank&&f.bank.lvl5)||1));}
  function cap5(f){return H5.capPerLvl*lvlOf(f)+H5.capPerOp*Object.keys((f&&f.outposts)||{}).filter(h=>(f.tiles||{})[h]).length;}
  function incomeH5(f){let s=0;for(const h of Object.keys((f&&f.tiles)||{})){let y=1;try{const ti=tileInfo(h);if(ti&&ti.res)y+=H5.richBonus*(ti.yield||1);}catch(e){}s+=y;}return s*H5.resPerHex*eff5();}
  window.cap5=cap5;window.incomeH5=incomeH5;window.lvl5=lvlOf;window.eff5=eff5;
  function log5(f,k,txt,t){try{f.log5=f.log5||[];const last=f.log5[f.log5.length-1];
      if(last&&last.k===k&&k!=='lvl'&&(t||now())-last.t<6*3600e3){last.n=(last.n||1)+1;last.t=t||now();if(last.base)last.txt=last.base.replace('{n}',last.n);}
      else f.log5.push({k,t:t||now(),txt:txt.replace('{n}','1'),base:txt.includes('{n}')?txt:null,n:1});f.log5=f.log5.slice(-H5.log);}catch(e){}}
  window.log5=log5;
  // ---------- the bank: land income, training, upkeep, building
  const _bank0=bankOf;
  bankOf=function(f){if(!f)return null;const t=now();
    if(!f.bank){f.bank={troops:H5.startTroops,res:H5.startRes,t,log:[],lvl5:1,m5:1};}
    const b=f.bank;b.log=b.log||[];
    if(!b.m5){b.m5=1;b.lvl5=Math.max(1,Math.min(H5.maxLvl,1+(f.tier||0)));const c=cap5(f);if(b.troops>c){const gone=Math.round(b.troops-c);b.troops=c;log5(f,'cut',`${gone.toLocaleString()} troops left: more than its land can support`,t);}}
    const h=Math.max(0,(t-(b.t||t))/3600e3);
    if(h>0){const inc=incomeH5(f),eat=b.troops*H5.eatPerTroopH;b.res+=(inc-eat)*h;
      if(b.res<0){const lost=Math.min(b.troops,b.troops*H5.starveLossH*h);b.troops-=lost;b.res=0;if(lost>=1)log5(f,'starve',`{n}× troops left hungry`,t);}
      const c=cap5(f),room=Math.max(0,c-b.troops),tr=Math.min(b.res,h*H5.trainPerLvlH*lvlOf(f)*eff5(),room);if(tr>0){b.troops+=tr;b.res-=tr;if(tr>=50)log5(f,'train',`trained troops ({n}×)`,t);}
      const L=lvlOf(f),cost=H5.upCost*L;if(L<H5.maxLvl&&b.res>=cost&&b.troops>=H5.upAtPct*c){b.res-=cost;b.lvl5=L+1;log5(f,'lvl',`Stronghold → Lv${L+1}`,t);}
      b.t=t;}
    // regroup after heavy losses (unchanged rule)
    b.log=b.log.filter(x=>t-x.t<HE.winH*3600e3);const com=b.log.filter(x=>x.k==='c').reduce((a,x)=>a+x.n,0),lost=b.log.filter(x=>x.k==='l').reduce((a,x)=>a+x.n,0);
    if(!(b.regroupUntil>t)&&((com>0&&lost/com>HE.lossPct)||b.troops<HE.lowTroops)&&b.troops>0){b.regroupUntil=t+HE.regroupH*3600e3;b.log=[];}
    return b;};
  window.bankOf=bankOf;
  // Horde squads count their real troops (R3 had multiplied them by your average tier)
  factionAttack=function(f){const base=typeof basePower3==='function'?basePower3():TROOP.powerPer;return Math.round(squadTroops26(f)*base*(1-rfx('jammers')/100)*100)/100;};window.factionAttack=factionAttack;
  // ---------- goals: no attacks on players until the army is ready; until then, expand and gather
  const _ps=planSortie;planSortie=function(f,fid,s,rnd,t){_ps.apply(this,arguments);try{const b=f.bank||bankOf(f);
      if(b&&b.troops<H5.attackPct*cap5(f)&&s.path&&s.path.length){const i=s.path.findIndex(h=>allied(h));if(i>=0){s.path=s.path.slice(0,i);if(!s.path.length){s.target=null;}else s.target=s.path[s.path.length-1];s.why=s.path.length?'expanding':'building up';}}
      f.goal5=b&&b.regroupUntil>t?'regroup':b&&b.troops>=H5.attackPct*cap5(f)?'attack':Object.keys(f.tiles||{}).length<12?'expand':'gather';}catch(e){}};window.planSortie=planSortie;
  // ---------- land taken and fights, for the dashboard log
  const _ss=squadStep;squadStep=function(f,fid,s,k,t,ev){const n0=Object.keys(f.tiles||{}).length,h0=ev?ev.held.length:0,tk0=ev?ev.took.length:0;const r=_ss.apply(this,arguments);
    try{const n1=Object.keys(f.tiles||{}).length;if(n1>n0)log5(f,'claim',`claimed {n} hex`,t);if(ev&&ev.held.length>h0)log5(f,'beaten',`beaten by a player's defenses ({n}×)`,t);if(ev&&ev.took.length>tk0)log5(f,'took',`took a player's hex ({n}×)`,t);}catch(e){}return r;};window.squadStep=squadStep;
  // ---------- gone for good, and a new small clan later
  const _hs=hordeStep;hordeStep=function(k,ev){const t=k*HB().stepMin*60e3,fx=FX();
    try{for(const d of BAL.factions.list){const f=fx.f[d.id];if(!f||f.routedUntil)continue;if(!Object.keys(f.tiles||{}).length){
        f.routedUntil=t+H5.respawnDays*864e5;f.squads=[];f.outposts={};f.dead5=(f.dead5||0)+1;f.bank={troops:0,res:0,t,log:[],lvl5:1,m5:1};log5(f,'gone','wiped out: all its land is gone',t);try{fxDirty();}catch(e){}
        try{ev&&ev.back&&0;allianceLog(`☠️ The ${d.name} are wiped out. A new clan may show up in ${H5.respawnDays} days.`);}catch(e){}}}}catch(e){console.warn('horde5 wipe',e);}
    return _hs.apply(this,arguments);};window.hordeStep=hordeStep;
  try{BAL.factions.respawnDays=H5.respawnDays;}catch(e){}
  const _sf=spawnFaction;spawnFaction=function(fi,tier,t){const d=BAL.factions.list[fi],old=d&&FX().f[d.id];const gen=old?(old.gen5||1)+(old.routedUntil?1:0):1;
    const r=_sf.call(this,fi,0,t);try{const f=FX().f[d.id];if(f){f.gen5=gen;f.bank={troops:H5.startTroops,res:H5.startRes,t,log:[],lvl5:1,m5:1};f.log5=[{k:'new',t,txt:gen>1?'a new clan moved in':'arrived',n:1}];}}catch(e){}return r;};window.spawnFaction=spawnFaction;
  const roman=n=>['','','II','III','IV','V','VI','VII','VIII','IX','X'][n]||String(n);
  const _fd=fdef;fdef=function(fid){const d=_fd.apply(this,arguments);try{const f=(FX().f||{})[fid];if(d&&f&&f.gen5>1)return{...d,name:d.name+' '+roman(f.gen5)};}catch(e){}return d;};window.fdef=fdef;
  // ---------- map: only what they are really doing
  const step=()=>((HB().stepMin||10)*60e3);
  const moving=s=>s&&s.path&&s.path.length&&now()>=(s.restUntil||0);
  // the squad layer: no resting squads, no planned targets
  const _dw=drawWorld;drawWorld=function(){const r=_dw.apply(this,arguments);try{const g=G.layers.horde;if(g)g.eachLayer(l=>{const el=l.getElement&&l.getElement();if(el&&(el.querySelector('.ico.target')||/· resting/.test(el.textContent||'')))g.removeLayer(l);});}catch(e){}return r;};window.drawWorld=drawWorld;
  // attacks on the way: the hex they're heading for flashes, with troop count and arrival time (no resting, no plans)
  drawIntents=function(){try{if(typeof map==='undefined'||!P.world||!FX().f)return;if(!G.layers.intent)G.layers.intent=L.layerGroup().addTo(map);const g=G.layers.intent;g.clearLayers();if(map.getZoom()<13)return;
      const T={},ph=now()%step();
      for(const [fid,f] of Object.entries(FX().f)){if(!f||f.routedUntil)continue;for(const s of f.squads||[]){if(!moving(s))continue;const tgt=s.path.find(h=>allied(h));if(!tgt||!isVis(tgt))continue;
        const i=s.path.indexOf(tgt),eta=Math.max(0,(i+1)*step()-ph);(T[tgt]=T[tgt]||[]).push({fid,s,eta,n:squadTroops26(f),name:(fdef(fid)||{}).name||'Horde'});}}
      for(const [h,L2] of Object.entries(T)){const [q,r]=idQR(h),c=hexCenter(q,r),eta=Math.min(...L2.map(x=>x.eta)),n=L2.reduce((a,x)=>a+x.n,0);
        L.polygon(hexPoly(q,r),{color:'#ff3b2f',weight:3,opacity:.95,fill:true,fillOpacity:.18,className:'atk5',interactive:false}).addTo(g);
        L.marker(c,{icon:L.divIcon({className:'lodm',html:`<div class="ht26 r"><span class="hi">⚔️</span><b>${L2.length>1?L2.length+' squads':(L2[0].name.replace(/</g,''))} · ${n.toLocaleString()} troops · ${fmtDur(eta).replace(/ \d+s$/,'')}</b></div>`,iconSize:[0,0]}),zIndexOffset:690}).on('click',()=>{try{UI.infoSquad(L2[0].fid,L2[0].s.id);}catch(e){UI.infoTile(h);}}).addTo(g);}}catch(e){console.warn('horde5 intents',e);}};
  window.drawIntents=drawIntents;
  // moving squads: fix9's marker (it already skips resting squads) now shows troops instead of power (edited in fix9.js)
  // tile cards no longer announce planned targets
  const _it=UI.infoTile;UI.infoTile=function(){const r=_it.apply(this,arguments);try{document.querySelectorAll('#modalBody .owner23').forEach(el=>{if(/Horde target/.test(el.textContent))el.remove();});}catch(e){}return r;};
  // ---------- Alliance › Horde: the leader's dashboard
  const isLeader=()=>{try{return typeof myRank15==='function'&&myRank15()==='leader';}catch(e){return false;}};
  function syncTab5(){try{const has=!!AT26.horde5;if(isLeader()&&!has){AT26.horde5={n:'☠️ Horde',parts:['horde5']};UI.SUBS.alliance=Object.entries(AT26).map(([k,v])=>[k,v.n]);}
      else if(!isLeader()&&has){delete AT26.horde5;UI.SUBS.alliance=Object.entries(AT26).map(([k,v])=>[k,v.n]);if(UI.sub&&UI.sub.alliance==='horde5')UI.sub.alliance=UI.SUBS.alliance[0][0];}}catch(e){}}
  setInterval(syncTab5,2000);setTimeout(syncTab5,800);
  function dashHtml5(){const fx=FX(),rows=[];const ago=t=>{const s=Math.max(0,now()-t);return s<3600e3?Math.round(s/60e3)+'m ago':s<864e5?Math.round(s/3600e3)+'h ago':Math.round(s/864e5)+'d ago';};
    for(const [fid,f] of Object.entries((fx&&fx.f)||{})){if(!f)continue;const d=fdef(fid)||{name:fid,icon:'☠️'};
      if(f.routedUntil){rows.push(`<div class="hd5 gone"><h3>${d.icon||'☠️'} ${d.name}</h3><p class="tiny">Wiped out. A new clan may appear in ${fmtDur(Math.max(0,f.routedUntil-now()))}.</p>${(f.log5||[]).slice(-3).reverse().map(x=>`<div class="r24"><span>${x.txt}</span><b>${ago(x.t)}</b></div>`).join('')}</div>`);continue;}
      const b=bankOf(f),hexes=Object.keys(f.tiles||{}).length,ops=Object.keys(f.outposts||{}).filter(h=>(f.tiles||{})[h]).length;
      const marching=(f.squads||[]).filter(moving).length*squadTroops26(f),resting=(f.squads||[]).filter(s=>!moving(s)).length;
      const goal={attack:'⚔️ attacking players',expand:'🗺️ expanding',gather:'⛏️ gathering',regroup:'⏸️ regrouping'}[f.goal5||'expand'];
      rows.push(`<div class="hd5"><h3>${d.icon||'☠️'} ${d.name}${f.front15?' <small>(regional front)</small>':''}</h3>
        <div class="hg5"><div><b>${hexes}</b><small>hexes</small></div><div><b>${Math.round(b.res).toLocaleString()}</b><small>resources</small></div><div><b>+${Math.round(incomeH5(f)).toLocaleString()}/h</b><small>income</small></div>
        <div><b>${Math.round(b.troops).toLocaleString()}</b><small>troops (cap ${cap5(f).toLocaleString()})</small></div><div><b>${marching.toLocaleString()}</b><small>marching now</small></div><div><b>Lv${lvlOf(f)}</b><small>Stronghold · ${ops} outpost${ops===1?'':'s'}</small></div></div>
        <div class="r24"><span>Goal</span><b>${goal}</b></div><div class="r24"><span>Squads</span><b>${(f.squads||[]).length} (${resting} resting)</b></div>
        <details><summary>${(f.log5||[]).length===1?'Last action':`Last ${Math.min(H5.log,(f.log5||[]).length)} actions`}</summary>${(f.log5||[]).slice().reverse().map(x=>`<div class="r24"><span>${x.txt}</span><b>${ago(x.t)}</b></div>`).join('')||'<p class="tiny">Nothing yet.</p>'}</details></div>`);}
    return`<section class="p-h5"><h2>☠️ Horde dashboard</h2><p class="tiny">Leader only. How each clan is really doing: land, resources, troops, buildings and what it's working on. Efficiency now ×${eff5().toFixed(2)} (scales with your alliance's strength).</p>${rows.join('')||'<p class="tiny">No Horde yet.</p>'}</section>`;}
  window.dashHtml5=dashHtml5;
  HOOK.render(function(){try{if(this.tab!=='alliance'||this.sub.alliance!=='horde5')return;const b=$('#sheetBody');if(!b||b.querySelector('.p-h5'))return;
      if(!isLeader()){b.innerHTML=this.subnav('alliance')+'<p class="tiny">Only the alliance leader can see the Horde dashboard.</p>';return;}b.innerHTML=this.subnav('alliance')+dashHtml5();}catch(e){console.warn('horde5 dash',e);}});
  const st=document.createElement('style');
  st.textContent=`.atk5{animation:atk5 1.1s infinite}@keyframes atk5{50%{fill-opacity:.38;stroke-opacity:.55}}
  .hd5{border:1px solid #3a2f22;border-radius:12px;padding:8px 10px;margin:8px 0;background:#15110c}.hd5.gone{opacity:.65}.hd5 h3{margin:0 0 6px}.hg5{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:6px}
  .hg5 div{background:#1d1710;border-radius:8px;padding:6px;text-align:center}.hg5 b{display:block;font-size:14px}.hg5 small{font-size:10px;opacity:.75}.hd5 details summary{cursor:pointer;font-weight:700;font-size:13px;margin-top:4px}`;
  document.head.appendChild(st);
})();
