// reports1 (R1) Every fight writes a full report the moment it is decided, and Reports gets tabs plus delete.
//  Defense fights (the army formula): the full breakdown is stored with the report when the fight is applied. It used to
//  be attached by a timer that only caught the last fight run on this phone in the last 15 s.
//  Fights you start (marches, forts, monsters): a report is written from the fight itself (your hero and troops, the
//  enemy, troops lost) even while the result waits in the card queue or the game catches up after being closed.
//  Lists keep the newest 60 of each kind; reports older than 14 days clear themselves. Delete one, select several,
//  or clear a whole tab (tap twice).
//  Loaded after card1.js so a fight is recorded before its card is queued.
(function(){
  const CAP1=60,DAYS1=14;
  const n1=v=>Math.round(+v||0).toLocaleString();
  const esc1=s=>typeof esc24==='function'?esc24(s):String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const strip1=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  // ---------- defense fights: keep the army-formula breakdown with the report
  function c26(x){if(!x)return null;try{return JSON.parse(JSON.stringify({D:x.D,A:x.A,E:x.E,walls:x.walls,fire:x.fire,tWe:x.tWe,tThey:x.tThey,mix:x.mix,nTypes:x.nTypes,why:x.why,perks:x.perks,
      bld:x.bld?{kind:x.bld.kind,lvl:x.bld.lvl}:null,players:(x.players||[]).map(p=>({key:p.key,uid:p.uid,name:p.name,type:p.type,n:p.n,lost:p.lost,left:p.left,dmg:p.dmg,hp:p.hp})),
      att:x.att?{name:x.att.name,n:x.att.n,lost:x.att.lost,left:x.att.left}:null,
      rounds:x.b2&&typeof timeline2==='function'?timeline2(x.b2).map(t=>({k:t.k,dealt:t.dmgDef,taken:t.dmgAtt})):null}));}catch(e){return null;}}
  try{const _ap=apply25;apply25=function(defs,s,r){const before=(P.fr25||[])[0];const out=_ap.apply(this,arguments);
      try{const top=(P.fr25||[])[0];if(top&&top!==before&&!top.r26&&r&&r.r26){top.r26=c26(r.r26);save();}}catch(e){console.warn('reports1 r26',e);}return out;};
    window.apply25=apply25;}catch(e){console.warn('reports1: apply25 missing',e);}
  // ---------- fights you start: record from the fight itself
  const CTX1={kind:null};
  try{const _fm=fightMutant;fightMutant=function(){CTX1.kind='monster';try{return _fm.apply(this,arguments);}finally{CTX1.kind=null;}};window.fightMutant=fightMutant;}catch(e){}
  try{const _ff=fightFort;fightFort=function(id){CTX1.kind='fort';CTX1.hex=id;try{return _ff.apply(this,arguments);}finally{CTX1.kind=null;CTX1.hex=null;}};window.fightFort=fightFort;}catch(e){}
  function hordeNames1(){try{return BAL.factions.list.map(d=>String(d.name||'').split(' · ')[0]).filter(Boolean);}catch(e){return [];}}
  function duelRecord(o){const f=o&&o.f;if(!f||!f.startA)return null;
    const mid=G._marchId,m=mid&&G.marches?G.marches[mid]:null;
    const kind=CTX1.kind||(m?'march':'fight');
    const hero0=f.startA.find(u=>u.me)||f.startA.find(u=>!u.troop)||null /* a march's first unit is its owner's hero */,hero1=hero0?f.A.find(u=>u.uid===hero0.uid):null;
    const band0=f.startA.find(u=>u.troop),band1=band0?f.A.find(u=>u.uid===band0.uid):null;
    let troops=null;if(band0){const n=+band0.troop||0,frac=band1?Math.max(0,band1.hp)/Math.max(1,band1.max||band0.max||1):0,left=Math.round(n*frac);
      troops={sent:n,lost:n-left,left,tier:typeof troopTier==='function'?troopTier():1,cls:(typeof myType26==='function'?myType26():'')};}
    const foes=f.startB.map(u=>{const e=f.B.find(x=>x.uid===u.uid)||u;return{name:strip1(u.name),hp0:u.hp,hp1:Math.max(0,e.hp),max:u.max||u.hp,atk:u.atk,def:u.def||0};});
    const hn=hordeNames1(),horde=foes.some(x=>/raider|horde|squad/i.test(x.name)||hn.some(h=>x.name.includes(h)));
    const hex=(m&&m.to)||CTX1.hex||null;
    const lostHp=foes.reduce((a,x)=>a+(x.hp0-x.hp1),0),maxHp=foes.reduce((a,x)=>a+x.hp0,0)||1;
    let why='';
    if(o.good){why=troops&&troops.sent?`Your side dealt ${n1(lostHp)} damage and finished them in ${roundsOf(f)} rounds. You lost ${n1(troops.lost)} of ${n1(troops.sent)} troops.`:`You beat them in ${roundsOf(f)} rounds with ${n1(hero1?hero1.hp:0)} HP left.`;}
    else{why=`They had more staying power: you took off ${Math.round(100*lostHp/maxHp)}% of their health before your side fell.`+(troops&&troops.sent?` You lost ${n1(troops.lost)} of ${n1(troops.sent)} troops.`:'');}
    if(f.army2&&f.army2.r){const R=f.army2.r,us=f.army2.us==='att'?R.att:R.def,th=f.army2.us==='att'?R.def:R.att;
      const sent=us.rows.reduce((a,x)=>a+x.n,0),lost=us.rows.reduce((a,x)=>a+x.lost,0);
      troops=sent?{sent,lost,left:sent-lost,tier:typeof troopTier==='function'?troopTier():1,cls:(us.rows[0]||{}).type||''}:null;
      const beaten=th.rows.reduce((a,x)=>a+(x.custom?0:x.lost),0);
      why=o.good?`Your side hit for ${n1(f.army2.us==='att'?R.DA:R.DD)} a round and took ${n1(f.army2.us==='att'?R.DD:R.DA)}. They broke first.${beaten?` They lost ${n1(beaten)} troops.`:''}`
        :`They hit for ${n1(f.army2.us==='att'?R.DD:R.DA)} a round and took ${n1(f.army2.us==='att'?R.DA:R.DD)}. Your side broke first, so the attack failed.`;
      CTX1.rows2={us:us.rows.map(x=>({type:x.type,name:x.name,n:x.n,lost:x.lost})),them:th.rows.map(x=>({name:x.name,n:x.custom?null:x.n,lost:x.custom?null:x.lost})),
        rounds:(f.army2.tl||[]).map(t=>({k:t.k,dealt:f.army2.us==='att'?t.dmgAtt:t.dmgDef,taken:f.army2.us==='att'?t.dmgDef:t.dmgAtt}))};}
    else CTX1.rows2=null;
    return{rows2:CTX1.rows2,xp:f.xp2||0,id:'d'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),t:Date.now(),src:'duel',kind,cat:'attack',horde,win:!!o.good,hex,
      title:strip1(o.title).slice(0,70),result:strip1(o.result||o.sub).slice(0,400),why,
      us:{name:P.name,hero:hero0?{hp0:hero0.hp,hp1:Math.max(0,hero1?hero1.hp:0),max:hero0.max||hero0.hp,atk:hero0.atk,def:hero0.def||0}:null,troops},
      them:{units:foes.slice(0,8),hpLost:lostHp,hpMax:maxHp},rounds:roundsOf(f)};}
  function roundsOf(f){return Math.max(0,...(f.events||[]).map(e=>e.r||0));}
  const _rp1=UI.replay;
  UI.replay=function(o){try{if(o&&o.f&&!o._rec1){o._rec1=1;const r=duelRecord(o);if(r){P.rp1=[r,...(P.rp1||[])].slice(0,CAP1);save();}}}catch(e){console.warn('reports1 duel',e);}
    return _rp1.apply(this,arguments);};
  // ---------- one list for Reports: category per row
  function catOf(x){if(x.k==='o')return['bases'];if(x.k==='d')return['drive'];if(x.k==='m')return['march'];
    if(x.k==='a'){const c=[x.r.kind==='monster'?'attack':'attack'];if(x.r.horde)c.push('horde');return c;}
    const r=x.r,c=[];if(r.ally)c.push('alliance');else c.push('defense');c.push('horde');return c;}
  const _items=reportItems26;
  reportItems26=function(){const L=_items.apply(this,arguments);
    (P.rp1||[]).forEach(r=>L.push({k:'a',t:r.t,ico:r.kind==='monster'?'🐀':r.win?'⚔️':'💀',title:(r.win?'Won':'Lost')+' · '+(r.title||'Fight'),
      sub:((r.us&&r.us.troops&&r.us.troops.sent)?`you lost ${n1(r.us.troops.lost)} of ${n1(r.us.troops.sent)} troops`:(r.us&&r.us.hero?`hero ${n1(r.us.hero.hp1)}/${n1(r.us.hero.max)} HP`:''))+(r.xp?` · +${n1(r.xp)} XP`:''),r}));
    (P.op64||[]).forEach(r=>{const ico=r.kind==='home'?'🏡':r.kind==='fwd'?'🚩':'⛺';const kn=r.kind==='home'?'Home Outpost':r.kind==='fwd'?'Forward Outpost':'Outpost';
      L.push({k:'o',t:r.t,ico,title:r.ok?`${kn} up · ${hexName(r.hex)}`:`${kn} capture failed · ${hexName(r.hex)}`,
        sub:r.ok?[`claimed ${r.claimed}`,...(r.skipped||[]).map(s=>`skipped ${s.n} (${s.why==='teammate'?'teammate':s.why==='fort'?'raider fort':s.why==='locked'?'not signed in':'raiders'})`),`${r.keeps} hexes paying`].join(' · '):'the hex was taken during the hold',r});});
    L.forEach(x=>{if(x.k==='f'&&x.r&&!x.r.none&&typeof x.r.xp1==='number')x.sub=(x.sub||'')+` · +${n1(x.r.xp1)} XP`;});
    L.forEach(x=>{x.cats=catOf(x);});return L.sort((a,b)=>b.t-a.t);};
  window.reportItems26=reportItems26;
  // ---------- delete, select, clear
  const LISTS1={f:'fr25',d:'dr26',m:'mr26',a:'rp1',o:'op64'};
  function del1(items){const by={};items.forEach(x=>{(by[x.k]=by[x.k]||new Set()).add(x.r);});
    for(const [k,set] of Object.entries(by)){const key=LISTS1[k];if(!key)continue;P[key]=(P[key]||[]).filter(r=>!set.has(r));}save();}
  window.reportDel1=del1;
  UI._sel1=null;UI._rf1=UI._rf1||'all';
  const TABS1=[['all','All'],['attack','⚔️ Attacks'],['defense','🛡️ Defense'],['horde','☠️ Horde'],['alliance','🤝 Alliance'],['drive','🚗 Drives'],['march','🚩 Marches'],['bases','⛺ Outposts']];
  function shown1(L,f){return L.map((x,i)=>[x,i]).filter(([x])=>f==='all'||(x.cats||[]).includes(f));}
  reportsHTML26=function(){const f=UI._rf1||'all',L=reportItems26(),seen=P.rp26Seen||0;UI._ri26=L;const sel=UI._sel1;
    const cnt=k=>shown1(L,k).length;
    const tabs=TABS1.map(([k,n])=>`<button class="${f===k?'on':''}" onclick="UI._rf1='${k}';UI._sel1=null;UI.reports26()">${n} ${cnt(k)}</button>`).join('');
    const S=shown1(L,f).slice(0,CAP1*4);
    const rows=S.map(([x,i])=>`<div class="rp26 ${x.t>seen?'new':''} ${sel&&sel.has(i)?'sel1':''}" onclick="${sel?`reportPick1(${i})`:`UI.reportAt26(${i})`}">${sel?`<span class="ck1">${sel.has(i)?'☑️':'⬜'}</span>`:''}<span class="ri">${x.ico}</span><div class="grow"><b>${esc1(strip1(x.title))}</b><small>${esc1(x.sub||'')} · ${when(x.t)}</small></div>${sel?'':`<button class="rx1" title="Delete this report" onclick="event.stopPropagation();reportDelAt1(${i})">✕</button>`}</div>`).join('');
    const ctl=S.length?(sel?`<div class="rpc1"><button onclick="reportPickAll1()">${sel.size===S.length?'Select none':'Select all'}</button><button class="bad1" ${sel.size?'':'disabled'} onclick="reportDelSel1()">🗑️ Delete ${sel.size}</button><button onclick="UI._sel1=null;UI.reports26()">Done</button></div>`
      :`<div class="rpc1"><button onclick="UI._sel1=new Set();UI.reports26()">☑️ Select</button><button class="bad1" onclick="reportClear1()">🧹 Clear ${f==='all'?'all':'this tab'}</button></div>`):'';
    return`<div class="rps26"><div class="seg rpf26 rpf1">${tabs}</div>${ctl}${rows||'<p class="tiny">Nothing here yet. Fights, drives, marches and outposts land here and stay for 14 days.</p>'}<p class="tiny">Logins, stories and badge toasts are in <a href="#" onclick="UI.actlog26();return false">📒 Activity log</a>.</p></div>`;};
  window.reportsHTML26=reportsHTML26;
  const refresh1=()=>{try{if(UI.tab==='base'&&UI.sub.base==='reports'&&$('#sheet')&&!$('#sheet').classList.contains('hidden')&&$('#modal').classList.contains('hidden'))UI.render();else UI.reports26();}catch(e){UI.reports26();}};
  window.reportDelAt1=function(i){const x=(UI._ri26||[])[i];if(!x)return;del1([x]);toast('🗑️ Report deleted');refresh1();};
  window.reportPick1=function(i){const s=UI._sel1;if(!s)return;s.has(i)?s.delete(i):s.add(i);refresh1();};
  window.reportPickAll1=function(){const s=UI._sel1;if(!s)return;const S=shown1(UI._ri26||[],UI._rf1||'all');if(s.size===S.length)s.clear();else S.forEach(([,i])=>s.add(i));refresh1();};
  window.reportDelSel1=function(){const s=UI._sel1;if(!s||!s.size)return;const L=UI._ri26||[];del1([...s].map(i=>L[i]).filter(Boolean));toast(`🗑️ ${s.size} report${s.size>1?'s':''} deleted`);UI._sel1=null;refresh1();};
  window.reportClear1=function(){const f=UI._rf1||'all',S=shown1(UI._ri26||[],f);if(!S.length)return;
    const k='_clr1_'+f;if(!(G[k]&&Date.now()-G[k]<6000)){G[k]=Date.now();toast(`Tap Clear again to delete ${S.length} report${S.length>1?'s':''}`);return;}delete G[k];
    del1(S.map(([x])=>x));toast(`🧹 ${S.length} report${S.length>1?'s':''} cleared`);refresh1();};
  // ---------- report popups: the new kind + a Delete button on every report
  function bar1(p,lbl){const w=Math.max(0,Math.min(100,Math.round(100*p)));return`<div class="zbar"><i style="width:${w}%"></i></div><small>${lbl}</small>`;}
  function duelHTML1(r){const u=r.us||{},T=u.troops,H=u.hero,them=r.them||{};
    const head=`<div class="fh26 ${r.win?'w':'l'}"><h2>${r.win?'🏆 Won':'💀 Lost'} · ${esc1(r.title||'Fight')}</h2><small>${r.hex?esc1(hexName(r.hex))+' · ':''}${new Date(r.t).toLocaleString()} · ${r.rounds||0} rounds</small></div>`;
    const R2=r.rows2;
    const ours=R2?`<div class="sec26">YOUR SIDE</div>`+R2.us.map(x=>`<div class="pl26"><span>${((C26.types[x.type]||{}).ico)||'🪖'}</span><div class="grow"><b>${n1(x.n)} ${esc1(((CLASSES.list[x.type]||{}).name)||x.type)} T${(T&&T.tier)||1}</b><small>lost ${n1(x.lost)} · ${n1(x.n-x.lost)} left</small></div><b>−${n1(x.lost)}</b></div>`).join('')
      +(H?`<div class="pl26"><span>🧍</span><div class="grow"><b>${esc1(u.name||'Your hero')}</b><small>led from behind · ATK ${n1(H.atk)} · DEF ${n1(H.def)} · HP ${n1(H.hp0)} → ${n1(H.hp1)} of ${n1(H.max)}</small></div></div>`:''):null;
    const theirs2=R2?`<div class="sec26">ENEMY</div>`+R2.them.map(x=>`<div class="pl26"><span>🪓</span><div class="grow"><b>${esc1(x.name)}</b><small>${x.n!=null?`${n1(x.n)} troops · lost ${n1(x.lost)}`:'beast / building'}</small></div>${x.n!=null?`<b>−${n1(x.lost)}</b>`:''}</div>`).join(''):null;
    const ours_old=`<div class="sec26">YOUR SIDE</div>`+(T&&T.sent?`<div class="pl26"><span>🪖</span><div class="grow"><b>${n1(T.sent)} T${T.tier||1} troops</b><small>${T.cls?esc1(((CLASSES.list[T.cls]||{}).name)||T.cls)+' · ':''}lost ${n1(T.lost)} · ${n1(T.left)} left</small></div><b>−${n1(T.lost)}</b></div>`:'')
      +(H?`<div class="pl26"><span>🧍</span><div class="grow"><b>${esc1(u.name||'Your hero')}</b><small>ATK ${n1(H.atk)} · DEF ${n1(H.def)} · HP ${n1(H.hp0)} → ${n1(H.hp1)} of ${n1(H.max)}</small></div><b>${n1(H.hp1)}❤</b></div>`:'');
    const theirs=`<div class="sec26">ENEMY</div>`+(them.units||[]).map(x=>`<div class="pl26"><span>🪓</span><div class="grow"><b>${esc1(x.name)}</b><small>ATK ${n1(x.atk)} · DEF ${n1(x.def)} · HP ${n1(x.hp0)} → ${n1(x.hp1)}</small></div><b>${x.hp1>0?n1(x.hp1)+'❤':'down'}</b></div>`).join('')
      +bar1(them.hpLost/(them.hpMax||1),`You took off ${Math.round(100*(them.hpLost||0)/(them.hpMax||1))}% of their health`);
    const xpLine=r.xp?`<div class="r24"><span>XP earned</span><b>+${n1(r.xp)}</b></div>`:'';
    return head+(ours||ours_old)+(theirs2||theirs)+xpLine+details1(R2&&R2.rounds)+`<div class="why26"><b>${r.win?'WHY WE WON':'WHY WE LOST'}</b><p>${esc1(r.why||'')}</p>${r.result&&r.result!==r.why?`<p class="tiny">${esc1(r.result)}</p>`:''}</div>`
      +`<div class="btns26">${r.hex?`<button onclick="UI.closeModal();marchGo('${r.hex}')">🗺️ Map</button>`:''}<button onclick="UI.reports26()">📬 All reports</button><button onclick="UI.closeModal()">Close</button></div>`;}
  window.duelHTML1=duelHTML1;
  function details1(rounds){if(!rounds||!rounds.length)return'';return`<details class="det1"><summary>Details: round by round</summary>${rounds.map(x=>`<div class="r24"><span>Round ${x.k}</span><b>dealt ${n1(x.dealt)} · took ${n1(x.taken)}</b></div>`).join('')}</details>`;}
  window.details1=details1;
  const _rep26=UI.report26;
  UI.report26=function(k,r){if(k==='o'){if(typeof opCard64==='function')opCard64([r]);return;}if(k==='a'){this.modal(duelHTML1(r));$('#modal').classList.add('rpm26');}else _rep26.apply(this,arguments);
    try{if(k==='f'){const b=$('#modalBody .btns26');const extra=(!r.none&&typeof r.xp1==='number'?`<div class="r24"><span>XP earned</span><b>+${n1(r.xp1)}</b></div>`:'')+details1(r.r26&&r.r26.rounds);if(b&&extra)b.insertAdjacentHTML('beforebegin',extra);}}catch(e){}
    try{const b=$('#modalBody .btns26')||$('#modalBody');if(b&&!b.querySelector('.rdel1')){const d=document.createElement('button');d.className='rdel1';d.textContent='🗑️ Delete';
      d.onclick=()=>{const x=(reportItems26()||[]).find(y=>y.r===r);if(x)del1([x]);toast('🗑️ Report deleted');UI.reports26();};b.appendChild(d);}}catch(e){}};
  // ---------- 14 days, newest 60 per list
  function prune1(){try{const cut=Date.now()-DAYS1*864e5;let ch=false;
    for(const key of Object.values(LISTS1)){const a=P[key];if(!Array.isArray(a))continue;const b=a.filter(r=>r&&(r.t||0)>=cut).slice(0,CAP1);if(b.length!==a.length){P[key]=b;ch=true;}}
    if(ch)save();}catch(e){console.warn('reports1 prune',e);}}
  window.prune1=prune1;
  setTimeout(prune1,4000);setInterval(prune1,3600e3);
  const st=document.createElement('style');
  st.textContent=`.rpf1{display:flex;flex-wrap:wrap;gap:4px}.rpf1 button{flex:1 1 auto;min-width:0;padding:6px 8px;font-size:12px;white-space:nowrap}
  .rpc1{display:flex;gap:6px;margin:6px 0;flex-wrap:wrap}.rpc1 button{flex:1 1 auto;min-width:90px}.rpc1 .bad1,.rdel1{border-color:#7a2a22!important;color:#ffb3a8!important}
  .rp26 .grow{flex:1 1 auto;min-width:0}.rp26 .rx1{flex:0 0 auto;width:34px;height:34px;padding:0;border-radius:17px;margin-left:6px;opacity:.75}.rp26.sel1{outline:2px solid #c9a24a}.ck1{margin-right:6px}.det1{margin:8px 0}.det1 summary{cursor:pointer;font-weight:700;font-size:13px}`;
  document.head.appendChild(st);
})();
