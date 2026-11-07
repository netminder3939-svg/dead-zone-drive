// v25b (TEST) Defense + reinforce rework (approved review v25, Jacob's decisions):
//  * fight25: alternating deterministic fight. Building hits first, attacker hits back, reinforcing troops hit, attacker hits back, repeat.
//    Damage on reinforcers splits evenly across contributors (weakest dies first and leaves). A side leaves at 20% of its start.
//    Round limit = F25.rounds (one constant). Defenders win if nobody broke by the limit. No luck anywhere.
//  * Every reinforcer gets a fight report + loot share + reputation. Beaten/routed/recalled troops march home visibly (grey Returning) for everyone.
//  * Reinforced march: helpers send real troops (+N on the marker, per-player breakdown card). No lone shield / POWER pill.
//  * Building cards: own combined defense breakdown only. No hold/fall predictions anywhere.
//  * Horde marches: hidden in fog, troop count shown on revealed hexes. Watchtowers warn 1 ring beyond range. Scouting reveals clan banks.
//  * Pipeline guard covers the whole route (one group), can ride with the truck (Escorting).
//  * Left panel uses real states.
const F25={rounds:6,rout:0.2,bHP:3,gHP:40,hit:0.5,hpPerPow:10,lootShare:0.5,repWin:5,repHold:3};
window.F25=F25;
function homeHex25(){try{return (typeof pipeOrigin==="function"&&pipeOrigin())||marchFrom();}catch(e){return null;}}
window.homeHex25=homeHex25;
const TPOW=()=>TROOP.powerPer; // troops -> power (1/50)
// ---------- the fight ----------
// bPow: building power (0 = none), bPct: building condition 0..1, guards: [{key,pow}], aPow: attacker power
function fight25(bPow,bPct,guards,aPow){const R=F25,u=R.hpPerPow;bPct=bPct==null?1:bPct;
  let bh=bPow>0?bPow*R.bHP*u/10*bPct:0;const b0=bh;let a=aPow*u;const a0=a;
  const G2=guards.filter(g=>g.pow>0).map(g=>({key:g.key,uid:g.uid,s:g.pow*R.gHP,h:g.pow*R.gHP,out:null}));const g0=G2.reduce((s,g)=>s+g.s,0);
  const alive=()=>G2.filter(g=>g.h>0&&!g.out),gsum=()=>alive().reduce((s,g)=>s+g.h,0);
  const rounds=[];let end=null,bFell=false,gRout=false;
  const hitGuards=d=>{let left=d;for(let k=0;k<8&&left>0.0001;k++){const al=alive();if(!al.length)break;const per=left/al.length;left=0;
      for(const g of al.sort((x,y)=>x.h-y.h)){if(g.h<=per){left+=per-g.h;g.h=0;g.out='dead';}else g.h-=per;}}
    if(g0>0&&gsum()<=R.rout*g0&&alive().length){gRout=true;alive().forEach(g=>g.out='routed');}};
  for(let r=1;r<=R.rounds&&!end;r++){const row={r,b:0,ab:0,g:0,ag:0};
    if(bh>0){row.b=bPow*R.hit;a-=row.b;if(a<=R.rout*a0){end='rout';rounds.push(row);break;}
      row.ab=a/u*R.hit;bh-=row.ab;if(bh<=0){bh=0;bFell=true;}}
    if(alive().length){const gh=gsum()/R.gHP*R.hit;row.g=gh;a-=gh;if(a<=R.rout*a0){end='rout';rounds.push(row);break;}
      row.ag=a/u*R.hit;hitGuards(row.ag);}
    rounds.push(row);if(bh<=0&&!alive().length){end='broke';break;}}
  const win=end!=='broke';
  return{win,end:end||'limit',rounds:rounds.map(x=>({r:x.r,b:Math.round(x.b),ab:Math.round(x.ab),g:Math.round(x.g),ag:Math.round(x.ag)})),
    bFell,bPct:b0?bh/b0*bPct:bPct,aLeft:Math.max(0,a/a0),aPow,bPow,
    guards:G2.map(g=>({key:g.key,uid:g.uid,frac:g.s?Math.max(0,g.h)/g.s:1,out:g.out||(gRout?'routed':null),pow:Math.round(g.s/R.gHP)}))};}
window.fight25=fight25;
// ---------- who defends a hex ----------
// defs from activeDefs(): buildings (sh/tower/op), 'troops' (my stationed), 'allygar' (allies). Home troops guard the Stronghold area.
function defSides25(defs){let bPow=0,bPct=1;const guards=[],seen=new Set();const add=g=>{if(!seen.has(g.key)&&g.pow>0){seen.add(g.key);guards.push(g);}};
  for(const d of defs){if(['sh','tower','op'].includes(d.kind)){const k=stationedAt(d.id);bPow+=Math.max(0,d.power-(k>0?Math.round(k*TPOW()):0)); // stage8 folded troops into the building; split them back out
      const o=structOf(d);if(o&&o.hpPct!=null)bPct=Math.min(bPct,o.hpPct);
      if(k>0)add({key:'me:'+d.id,uid:P.uid,hex:d.id,n:k,pow:k*TPOW()});
      try{for(const g of allyGarAt(d.id))add({key:'al:'+g.uid+':'+g.hex,uid:g.uid,hex:g.hex,n:g.n,pow:g.power||g.n*TPOW()});}catch(e){}}
    else if(d.kind==='troops'){const hx=d.hex||d.id,n=stationedAt(hx);if(n>0)add({key:'me:'+hx,uid:P.uid,hex:hx,n,pow:d.power||n*TPOW()});}
    else if(d.kind==='allygar')add({key:'al:'+d.uid+':'+d.hex,uid:d.uid,hex:d.hex,n:d.n,pow:d.power||d.n*TPOW()});
    else bPow+=d.power||0;}
  const h=TP().home;if(h>0&&defs.some(d=>d.kind==='sh'))add({key:'home',uid:P.uid,hex:null,n:h,pow:h*TPOW()});
  return{bPow:Math.round(bPow),bPct,guards};}
window.defSides25=defSides25;
// ---------- defense fight (horde squad vs your hex) ----------
G._f25=null;
squadReplay=function(defs,dp,sp,gname){const s=defSides25(defs),r=fight25(s.bPow,s.bPct,s.guards,sp);G._f25=r;
  const f=raidReplay(defs,dp,sp);f.win=r.win;[f.startB&&f.startB[0],f.B&&f.B[0]].forEach(u=>{if(u)u.name=`${gname} squad (power ${sp})`;});
  try{apply25(defs,s,r,gname,sp);}catch(e){console.warn('f25 apply',e);}return f;};
function hexOfDefs(defs){const d=defs.find(x=>x.hex)||defs[0];return(d&&(d.hex||d.id))||'';}
function apply25(defs,s,r,gname,sp){const hx=G._f25hex||hexOfDefs(defs),now=Date.now(),loot=r.win?{...(BAL.ai.winLoot||{})}:{};
  const totPow=s.guards.reduce((a,g)=>a+g.pow,0)+s.bPow||1;
  const rep={t:now,hex:hx,gang:gname,sp,win:r.win,end:r.end,bPow:s.bPow,bFell:r.bFell,rounds:r.rounds,me:[]};
  for(const g of s.guards){const o=r.guards.find(x=>x.key===g.key);if(!o)continue;const left=Math.round(g.n*o.frac),lost=g.n-left;
    if(g.key==='home'){TP().home=Math.max(0,TP().home-lost);if(lost){const w=woundSplit(lost,r.win);addWounded(w.wounded);}rep.me.push({who:'Home garrison',n:g.n,lost});continue;}
    if(g.key.startsWith('me:')){const st=stationed()[g.hex];if(!st)continue;st.n=Math.max(0,st.n-lost);if(lost){const w=woundSplit(lost,r.win);addWounded(w.wounded);}
      rep.me.push({who:'Your guards',n:g.n,lost,out:o.out});
      if(st.n<=0||o.out||(r.bFell&&!r.win))sendHome25(g.hex,st.n,o.out||'beaten');continue;}
    rep.me.push({who:(who24(g.uid).name||'Teammate')+"'s reinforcements",n:g.n,lost,out:o.out});
    // ally: leave an exact note in the shared horde doc; their phone applies it (loot share + rep + return march)
    const note={t:now,hex:g.hex,uid:g.uid,frac:+o.frac.toFixed(4),out:o.out||(r.bFell&&!r.win?'beaten':null),won:r.win,gang:gname,sp,share:+(g.pow/totPow).toFixed(3),rounds:r.rounds,bPow:s.bPow};
    const fx=FX();fx.gl25=(fx.gl25||[]).concat([note]).slice(-40);
    try{postGl25(note);}catch(e){}}
  if(r.win){for(const k in loot)loot[k]=Math.round(loot[k]);P.rep25=(P.rep25||0)+F25.repHold;}
  P.fr25=[rep,...(P.fr25||[])].slice(0,20);
  report(`🛡️ ${r.win?'Held':'Lost'} ${hexName(hx)} vs ${gname} (power ${sp}) in ${r.rounds.length} round${r.rounds.length>1?'s':''}${r.bFell?' · building fell':''}. Tap Reports › Fight reports.`,r.win);save();}
// the horde step decides "held" with dp>=sp and "wrecked" with sp>=dp*destroyRatio. During a step, defPower returns a number
// that makes both checks follow the fight25 result (win / lose / building fell). Same inputs -> same answer on every phone.
const _sq25=squadStep;squadStep=function(){G._inStep25=1;try{return _sq25.apply(this,arguments);}finally{G._inStep25=0;}};
const _spw25=squadPower;squadPower=function(){const p=_spw25.apply(this,arguments);G._lastSp25=p;return p;};
const _dpw25=defPower;defPower=function(defs){const b=_dpw25.apply(this,arguments);if(!G._inStep25||!defs||!defs.length||!(G._lastSp25>0))return b;try{const sp=G._lastSp25,s=defSides25(defs),r=fight25(s.bPow,s.bPct,s.guards,sp),ratio=HB().destroyRatio||1.5;
  return r.win?sp:r.bFell?Math.floor(sp/ratio):Math.max(0,Math.min(sp-1,Math.floor(sp/ratio)+1));}catch(e){return b;}};
// ally notes -> my troops
function postGl25(note){if(!note||!note.uid)return;
  const payload=JSON.stringify({for:note.uid,hex:note.hex,frac:note.frac,out:note.out||null,won:!!note.won,gang:String(note.gang||'').slice(0,24),sp:note.sp|0,share:note.share||0,bPow:note.bPow|0}).slice(0,190);
  const doc={kind:'gl25',text:payload,uid:NET.uid||P.uid,name:(P.name||'').slice(0,24)};
  if(NET.mode!=='firebase'){G._gl25q=(G._gl25q||[]).concat([{...JSON.parse(payload),t:note.t||Date.now(),uid:note.uid}]);return;}
  try{NET.fs.addDoc(NET.fs.collection(NET.db,...NET.base,'activity'),{...doc,t:NET.fs.serverTimestamp()});}catch(e){console.warn('gl25 post',e);}}
function listenGl25(){if(G._glL)return;G._glL=1;if(NET.mode!=='firebase'){setInterval(()=>{const q=G._gl25q||[];if(!q.length)return;G._gl25q=[];const fx=FX();fx.gl25=(fx.gl25||[]).concat(q).slice(-40);applyGl25();},1000);return;}
  if(!NET.fs||!NET.db||!NET.base){G._glL=0;return;}
  NET.actFeed(80,s=>{const fx=FX();let add=[];s.forEach(d=>{const x=d.data();if(x.kind!=='gl25')return;let p={};try{p=JSON.parse(x.text||'{}');}catch(e){return;}
    const t=x.t&&x.t.toMillis?x.t.toMillis():Date.now();if(!p.for||!p.hex)return;add.push({t,hex:p.hex,uid:p.for,frac:+p.frac||1,out:p.out||null,won:!!p.won,gang:p.gang,sp:p.sp|0,share:+p.share||0,rounds:[],bPow:p.bPow|0});});
    if(add.length){const seen=new Set((fx.gl25||[]).map(e=>e.t+':'+e.uid+':'+e.hex));const neu=add.filter(e=>!seen.has(e.t+':'+e.uid+':'+e.hex));if(neu.length){fx.gl25=(fx.gl25||[]).concat(neu).slice(-40);applyGl25();}}},e=>console.warn('gl25',e));}
setInterval(()=>{try{listenGl25();}catch(e){}},2000);
function applyGl25(){const t=TP();if(t.gl25Seen==null){t.gl25Seen=0;}const notes=(FX().gl25||[]).filter(e=>isMe(e.uid)&&e.t>t.gl25Seen);if(!notes.length)return;
  for(const e of notes){t.gl25Seen=Math.max(t.gl25Seen,e.t);const s=stationed()[e.hex];if(!s||s.n<=0)continue;const n0=s.n,left=Math.round(n0*e.frac),lost=n0-left;s.n=left;
    if(lost){const w=woundSplit(lost,e.won);addWounded(w.wounded);}
    let lootTxt='';if(e.won){const L={};for(const [k,v] of Object.entries(BAL.ai.winLoot||{}))L[k]=Math.max(1,Math.round(v*F25.lootShare*Math.max(.2,e.share||0)));addRes(L);P.rep25=(P.rep25||0)+F25.repWin;lootTxt=' · loot '+Object.entries(L).map(([k,v])=>'+'+v+RES[k]).join(' ')+` · +${F25.repWin} rep`;}
    P.fr25=[{t:e.t,hex:e.hex,gang:e.gang,sp:e.sp,win:e.won,bPow:e.bPow,rounds:e.rounds||[],ally:true,me:[{who:'Your reinforcements',n:n0,lost,out:e.out}]},...(P.fr25||[])].slice(0,20);
    report(`🛡️ Your ${n0.toLocaleString()} reinforcements at ${hexName(e.hex)} ${e.won?'helped hold':'were beaten'} vs ${e.gang}: ${lost.toLocaleString()} lost${lootTxt}`,e.won);
    if(left<=0||e.out)sendHome25(e.hex,left,e.out||'beaten');}
  save();try{pushMember();}catch(e){}}
setInterval(()=>{try{if(P&&P.world)applyGl25();}catch(e){}},3e3);
// the old loss hooks are bypassed by the new squadReplay; stop the old ally-note path from double counting
try{applyGarLosses=function(){};}catch(e){}
// ---------- troops going home (beaten, routed, recalled): grey Returning march, visible to all ----------
function sendHome25(hex,n,why){const s=stationed()[hex];if(s)delete stationed()[hex];if(n>0){const home=homeHex25();const d=home?marchDur(hex,home,n):60e3;
    TP().returning.push({n,at:Date.now()+d,from:hex,st:Date.now(),why:why||'recalled'});toast(`↩️ ${n.toLocaleString()} troops leaving ${hexName(hex)} (${why||'recalled'}) · home in ${fmtDur(d)}`);}
  save();try{pushMember();drawWorld();}catch(e){}}
window.sendHome25=sendHome25;
recallStation=function(h){const s=stationed()[h];if(!s)return;sendHome25(h,s.n,'recalled');UI.tab&&UI.render();};
HOOK.member(function(o){try{const now=Date.now(),h=homeHex25();o.ret25=(TP().returning||[]).filter(r=>r.at>now&&r.from).slice(0,8).map(r=>({f:r.from,h,n:r.n,st:r.st||now,at:r.at}));o.rep25=P.rep25||0;}catch(e){}return o;});
function drawAllyReturns(){if(typeof map==='undefined'||!P.world)return;if(!G.layers.ret25)G.layers.ret25=L.layerGroup().addTo(map);const g=G.layers.ret25;g.clearLayers();const now=Date.now();
  for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||m.me||!Array.isArray(m.ret25))continue;
    for(const r of m.ret25){if(!r||r.at<=now||!r.f||!r.h)continue;const a=hexCenter(...idQR(r.f)),b=hexCenter(...idQR(r.h)),f=Math.min(1,(now-r.st)/Math.max(1,r.at-r.st)),p=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
      L.polyline([a,b],{color:'#120d08',weight:10,opacity:.55,interactive:false,lineCap:'round'}).addTo(g);L.polyline([a,b],{color:ACC24.return[0],weight:5,dashArray:'4 8',interactive:false,lineCap:'round'}).addTo(g);
      L.marker(p,{icon:L.divIcon({className:'lodm mkw24',html:mk24({type:'return',uid,troops:r.n,eta:mticon(r.at-now)}),iconSize:[0,0]}),interactive:false,zIndexOffset:940}).addTo(g);}}}
setInterval(()=>{try{drawAllyReturns();}catch(e){}},2000);
// ---------- marches commit real troops ----------
function defaultSend25(){const t=TP(),cap=typeof marchTroopCap==='function'?marchTroopCap():t.home;return Math.max(0,Math.min(t.home,cap,G.troopDefault25||1000));}
const _send25=sendMarch;sendMarch=async function(to,opt){if(!(G.troopSend>0)){if(TP().home<=0)return toast('🚫 No troops at home. Train troops in Base › Barracks, or wait for marches to return.');G.troopSend=defaultSend25();}
  return _send25.apply(this,arguments);};
// troop picker always starts on a real number (not 0)
const _amb25=addMarchBtn;addMarchBtn=function(id){_amb25.apply(this,arguments);try{if(!(G.troopSend>0)&&TP().home>0){const row=document.querySelector('#modalBody .troopsel');const b=row&&[...row.querySelectorAll('button[data-n]')].filter(x=>+x.dataset.n>0)[0];if(b)b.click();else G.troopSend=defaultSend25();}
  if(TP().home<=0){const btn=document.getElementById('btnMarch');if(btn){btn.disabled=true;btn.insertAdjacentHTML('afterend','<p class="tiny warn25">🪖 No troops at home. Train some in Base › Barracks first.</p>');}}}catch(e){}};
// ---------- reinforce a teammate's march with real troops ----------
escortMarch=async function(id,n){const m=G.marches[id];if(!m||m.uid===P.uid||marchPhase(m)[0]!=='out')return;const home=TP().home;
  if(n==null){return UI.modal(`<h2>🛡 Join ${esc24(m.name)}'s march</h2><p class="tiny">Your troops march with theirs, fight in the same battle, share the loot and come home with the march.</p>
    ${home>0?`<div class="seg">${[...new Set([100,500,1000,home].filter(x=>x>0&&x<=home))].map(x=>`<button class="red24" onclick="escortMarch('${id}',${x})">🪖 ${x===home?'All '+kf24(x):'+'+kf24(x)}</button>`).join('')}</div>`:'<p class="warn25">🪖 No troops at home. Train some in Base › Barracks first.</p>'}<button onclick="UI.closeModal()">Cancel</button>`);}
  n=Math.min(n|0,home);if(n<=0)return toast('🚫 No troops at home to send');const u=frozenMe();
  await NET.escortMarch(id,P.uid,{name:P.name,color:P.color||'',unit:u,power:unitPower(u)+Math.round(n*TPOW()),troops:n});
  TP().home-=n;TP().esc25=TP().esc25||{};TP().esc25[id]={n,to:m.to,from:m.from,st:Date.now(),end:m.startT+2*m.dur};save();try{pushMember();}catch(e){}
  allianceLog(`🛡️ ${P.name} reinforced ${poss(m.name)} march with ${n.toLocaleString()} troops`);UI.closeModal();toast(`🛡 ${n.toLocaleString()} troops joined ${poss(m.name)} march`);};
const _mu25=marchUnits;marchUnits=function(m){const u=_mu25.apply(this,arguments);try{for(const e of Object.values((m&&m.escorts)||{}))if(e&&e.troops>0)u.push(troopUnit(e.troops));}catch(e){}return u;};
// leader writes the troop-left fraction on arrival so helpers know their survivors
const _upd25=NET.updMarch.bind(NET);NET.updMarch=function(id,d){try{if(d&&d.state==='arrived'&&G._tl!=null)d.tl25=+G._tl.toFixed(4);if(d&&d.state==='arrived'&&d.win==null&&G._tlWin!=null)d.win=G._tlWin;}catch(e){}return _upd25(id,d);};
function settleEscorts(){const t=TP(),E=t.esc25||{};let ch=false;const now=Date.now();
  for(const [id,e] of Object.entries(E)){const m=G.marches[id];
    if(m&&(m.state==='arrived'||m.state==='done')&&!e.done){const fr=m.tl25!=null?m.tl25:(m.win===false?0:1),left=Math.round(e.n*fr),lost=e.n-left;e.done=1;ch=true;
      if(lost){const w=woundSplit(lost,m.win!==false);addWounded(w.wounded);}
      let lootTxt='';if(m.win!==false&&m.loot){const L={};const tot=(m.troops||0)+Object.values(m.escorts||{}).reduce((a,x)=>a+(x.troops||0),0)||1;for(const [k,v] of Object.entries(m.loot))L[k]=Math.round(v*F25.lootShare*e.n/tot);if(Object.values(L).some(v=>v>0)){addRes(L);lootTxt=' · loot '+Object.entries(L).filter(([,v])=>v>0).map(([k,v])=>'+'+v+RES[k]).join(' ');}P.rep25=(P.rep25||0)+F25.repWin;lootTxt+=` · +${F25.repWin} rep`;}
      P.fr25=[{t:now,hex:m.to,gang:poss(m.name)+' march',win:m.win!==false,march:true,rounds:[],me:[{who:'Your troops in '+poss(m.name)+' march',n:e.n,lost}]},...(P.fr25||[])].slice(0,20);
      report(`🛡️ You reinforced ${poss(m.name)} march to ${hexName(m.to)}: ${m.win===false?'lost':'won'} · ${lost.toLocaleString()} of your ${e.n.toLocaleString()} lost${lootTxt}`,m.win!==false);
      const back=Math.max(60e3,(m.startT+2*m.dur)-now);if(left>0)t.returning.push({n:left,at:now+back,from:m.to,st:now,why:'march home'});e.left=left;}
    if((!m&&now>e.end+10*60e3)||(e.done&&now>e.end)){if(!e.done&&e.n>0){t.home+=e.n;report(`🪖 ${e.n.toLocaleString()} troops back from ${hexName(e.to)}`,true);}delete E[id];ch=true;}}
  if(ch){save();try{pushMember();}catch(e){}}}
setInterval(()=>{try{if(P&&P.world)settleEscorts();}catch(e){}},4000);
// ---------- unified marker with helpers ----------
function mtroops(m){return m.troops||0;}
function helpers(m){return Object.entries(m.escorts||{}).filter(([,e])=>e).map(([uid,e])=>({uid,name:e.name,n:e.troops||0,pow:e.power||0}));}
function mk25(m,t){const hs=helpers(m),plus=hs.reduce((a,h)=>a+h.n,0);let h=mk24({type:t,uid:m.uid,troops:mtroops(m),flag:m.flag});
  if(hs.length){h=h.replace(/(<b><u>[^<]*<\/u>[^<]*)<\/b>/,`$1 <span class="plus25">+${kf24(plus)}</span></b>`).replace('<div class="stem">',`<div class="hl25">${hs.slice(0,3).map(x=>av24(x.uid,22)).join('')}</div><div class="stem">`);}return h;}
const _dm25=drawMarches;drawMarches=function(){_dm25.apply(this,arguments);try{for(const [id,mk] of Object.entries(G._flags||{})){const m=G.marches[id];if(!m)continue;const t=mtype24(m);
  mk.setIcon(L.divIcon({className:'lodm mkw24',html:mk25(m,t),iconSize:[0,0]}));mk._t24=t;mk._h25=helpers(m).length;}}catch(e){}};
setInterval(()=>{try{for(const [id,mk] of Object.entries(G._flags||{})){const m=G.marches[id];if(!m)continue;const t=mtype24(m),hl=helpers(m).length;if(t!==mk._t24||hl!==mk._h25){mk._t24=t;mk._h25=hl;mk.setIcon(L.divIcon({className:'lodm mkw24',html:mk25(m,t),iconSize:[0,0]}));}}}catch(e){}},1500);
UI.infoMarch=function(id){const m=G.marches[id];if(!m)return;const [ph]=marchPhase(m),t=nowS(),mine=isMe(m.uid),hs=helpers(m),tp=TPOW();
  const lead={uid:m.uid,name:m.name,n:mtroops(m),pow:Math.round((m.power||0)+mtroops(m)*tp)};const rows=[lead,...hs.map(h=>({...h,pow:Math.round((h.pow||0))}))];
  const totN=rows.reduce((a,r)=>a+r.n,0),totP=rows.reduce((a,r)=>a+r.pow,0),ty=mtype24(m),st=ph==='back'?'RETURNING':ty==='attack'?'ATTACKING':ty==='claim'?'MARCHING':ty==='guard'?'DEFENDING':ty==='escort'?'ESCORTING':'MARCHING';
  const mineE=(m.escorts||{})[P.uid]||Object.entries(m.escorts||{}).find(([u])=>isMe(u));
  UI.modal(`<div class="mc25"><div class="mh25">${av24(m.uid,46)}<div><h2>${ACC24[ty][2]} ${ACC24[ty][1]} MARCH</h2><small>${esc24(m.name)} → ${hexName(m.to)} · ${ph==='out'?'arrives '+fmtDur(m.startT+m.dur-t):ph==='back'?'home in '+fmtDur(m.startT+2*m.dur-t):'done'}</small></div>${st25(st)}</div>
   <div class="sec24">WHO IS IN THIS MARCH</div>${rows.map((r,i)=>`<div class="gr25">${av24(r.uid,28)}<b style="color:${esc24(who24(r.uid).color)}">${esc24(isMe(r.uid)?'You':r.name)}${i===0?' (leader)':''}</b><span class="dim">${i===0?'own troops':'reinforcing'}</span><b>🪖 ${kf24(r.n)}</b><b class="gold">⚡${r.pow}</b></div>`).join('')}
   <div class="tot25"><b>TOTAL</b><b>🪖 ${kf24(totN)} · <span class="gold">⚡ ${totP}</span></b></div>${m.result?`<p class="tiny">${m.result}</p>`:''}
   <div class="btns24">${!mine&&ph==='out'&&!mineE?`<button class="red24" onclick="escortMarch('${id}')">🛡 Join with troops</button>`:''}<button class="ghost24" onclick="UI.closeModal()">Close</button></div></div>`);};
function st25(s){return`<span class="st25 s-${s.toLowerCase()}">${s}</span>`;}window.st25=st25;
// ---------- left panel: real states ----------
mcardsDraw=function(){const q=s=>document.querySelector(s);let box=q('#mcards');if(!box){box=document.createElement('div');box.id='mcards';document.body.appendChild(box);}
  const now=Date.now(),reg=[],sup=[];
  for(const [id,m] of myMarches()){const back=now>m.startT+m.dur,eta=back?m.startT+2*m.dur-now:m.startT+m.dur-now,pr=back?(now-m.startT-m.dur)/m.dur:(now-m.startT)/m.dur;
    const n=(TP().away||{})[id]||m.troops||0,ty=mtype24(m),hs=helpers(m),plus=hs.reduce((a,h)=>a+h.n,0);
    const st=back?'RETURNING':ty==='attack'?(eta<5000?'ATTACKING':'MARCHING'):ty==='guard'?'DEFENDING':ty==='escort'?'ESCORTING':'MARCHING';
    const what=ty==='attack'?'⚔ Attack':ty==='claim'?'🚩 Claim':ty==='guard'?'🛡 Patrol':ty==='escort'?'🚚 Escort':'🚩 March';
    (isSupportM(m)?sup:reg).push({to:m.to,st,title:`${what} · ${back?'home':hexName(m.to)}`,n:kf24(n)+(plus?` +${kf24(plus)}`:''),sub:back?`home in ${fmtDur(Math.max(0,eta))}`:`arrives in ${fmtDur(Math.max(0,eta))}${hs.length?' · '+hs.length+' helping':''}`,pr});}
  for(const [id,e] of Object.entries(TP().esc25||{})){if(e.done)continue;const m=G.marches[id];if(!m)continue;sup.push({to:m.to,st:'REINFORCING',title:`🛡 ${poss(m.name)} march`,n:kf24(e.n),sub:`with their march · arrives ${fmtDur(Math.max(0,m.startT+m.dur-now))}`,pr:Math.min(1,(now-m.startT)/m.dur)});}
  try{const pg=pipeGuards25();for(const g of stationGroups()){const pp=pg[g.h];const moving=now<g.at;
    sup.push({to:g.h,st:moving?'MARCHING':pp?(pp.esc?'ESCORTING':'DEFENDING'):'DEFENDING',title:pp?`⛓️ ${pp.esc?'Escorting truck':'Guarding pipeline'} · ${esc24(pp.name)}`:`${bldAt(g.h)?({sh:'🏰',tower:'🗼',op:'⛺'}[bldAt(g.h).k]||'🛡'):'🛡'} ${hexName(g.h)}${bldAt(g.h)&&!bldAt(g.h).own?' ('+esc24(bldAt(g.h).owner)+')':''}`,n:kf24(g.n),sub:moving?`arrives in ${fmtDur(g.at-now)} · then defends`:pp?`covers all ${pp.len} route hexes`:'on guard · fights alongside the building',pr:moving?Math.min(1,1-(g.at-now)/Math.max(1,g.at-((stationed()[g.h]||{}).st||now))):1});}}catch(e){}
  try{for(const r of TP().returning||[]){if(r.at<=now)continue;sup.push({to:homeHex25(),st:'RETURNING',title:`↩ from ${r.from?hexName(r.from):'the field'}`,n:kf24(r.n),sub:`${r.why&&r.why!=='recalled'?r.why+' · ':''}home in ${fmtDur(r.at-now)}`,pr:Math.min(1,(now-(r.st||now))/Math.max(1,r.at-(r.st||now)))});}}catch(e){}
  try{const qd=(TP().queue||[]).filter(x=>x.end>now);if(qd.length){const n=qd.reduce((a,x)=>a+x.n,0),end=Math.max(...qd.map(x=>x.end));sup.push({to:homeHex25(),st:'TRAINING',title:'🏋 Barracks',n:kf24(n),sub:`ready in ${fmtDur(end-now)}`,pr:.5,nos:1});}}catch(e){}
  const supUsed=sup.filter(c=>!c.nos&&c.st!=='RETURNING').length;
  const card=c=>`<div class="mcard v21 v25 st-${c.st.toLowerCase()}" data-to="${c.to||''}"><div class="l1">${st25(c.st)}<em>🪖 ${c.n}</em></div><div class="l2"><b>${c.title}</b></div><div class="pb"><s style="width:${Math.round(Math.max(0,Math.min(1,c.pr))*100)}%"></s></div><div class="l3">${c.sub}</div></div>`;
  const empty=t=>`<div class="mcard v21 empty"><div class="l2">${t}</div></div>`;
  let h=`<div class="mhead">MARCHES · regular ${reg.length}/${SLOTS.reg} · support ${supUsed}/${SLOTS.sup}</div>`;
  h+=reg.map(card).join('')+(reg.length<SLOTS.reg?empty(`⚔️ ${SLOTS.reg-reg.length} regular slot${SLOTS.reg-reg.length>1?'s':''} free · attack / claim`):'');
  h+=`<div class="mhead sub">SUPPORT</div>`+sup.map(card).join('')+(supUsed<SLOTS.sup?empty(`🛡️ ${SLOTS.sup-supUsed} support slot${SLOTS.sup-supUsed>1?'s':''} free · reinforce / guard / escort`):'');
  box.innerHTML=h;box.classList.add('v21');box.classList.toggle('drive',!!(G.drive&&G.drive.on));box.classList.toggle('quiet',innerWidth<1100&&!reg.length&&!sup.length);
  box.querySelectorAll('.mcard[data-to]').forEach(el=>el.onclick=()=>{const h2=el.dataset.to;if(h2){try{map.setView(hexCenter(...idQR(h2)),Math.max(map.getZoom(),15));}catch(e){}}});};
// ---------- building card (mockup v5 02): own combined defense breakdown only, no predictions ----------
bldCard=function(hex){const b=bldAt(hex);if(!b)return'';const o=b.o,tp=TPOW(),lv=b.k==='sh'?strongholdLevel():b.k==='tower'?(o.level||1):0,
  r=b.own?(b.k==='sh'?shRadius():b.k==='tower'?towerRadius(o):BAL.outpost.radius):(o.r||1),
  bp=b.own?(b.k==='sh'?Math.round(BAL.stronghold.basePower+strongholdLevel()*BAL.stronghold.powerPerLevel):b.k==='tower'?towerPower(o):outpostPower()):(o.power||0),
  mine=(stationed()[hex]||{}),allies=(typeof allyGarAt==='function'?allyGarAt(hex):[]),tot=(mine.n||0)+allies.reduce((a,g)=>a+g.n,0),cap=typeof hexGarCap==='function'?hexGarCap(hex):0;
  const ouid=b.own?P.uid:(Object.entries((G.al&&G.al.members)||{}).find(([u,m])=>m.name===b.owner)||[])[0];
  const nm={sh:'STRONGHOLD',tower:'WATCHTOWER',op:'OUTPOST'}[b.k]||'STRUCTURE',ic={sh:'🏰',tower:'🗼',op:'⛺'}[b.k]||'🛡️',hpP=b.own&&o.hpPct!=null?o.hpPct:b.own&&o.state==='down'?0:1;
  const up=b.own&&b.k==='tower'&&typeof towerUpCost==='function'&&lv<BAL.tower.maxLevel?Object.entries(towerUpCost(o)).map(([k,v])=>RES[k]+' '+v).join(' · '):b.own&&b.k==='sh'?'Base › Stronghold':'—';
  const home=TP().home,u=typeof poolUse==='function'?poolUse():{sup:0},full=u.sup>=SLOTS.sup&&!mine.n,room=cap?Math.max(0,cap-tot):home,max=Math.min(home,room),opts=[500,1000,5000].filter(x=>x<max);if(max>0)opts.push(max);
  const row=(a,v)=>`<div class="r24"><span>${a}</span><b>${v}</b></div>`,w=who24(ouid);
  const parts=[[ic+' '+({sh:'Stronghold',tower:'Watchtower',op:'Outpost'}[b.k]||'Building'),bp,'#3ae0c8',null]];
  if(mine.n>0)parts.push([`You · 🪖 ${kf24(mine.n)}${mine.at>Date.now()?' (arriving '+fmtDur(mine.at-Date.now())+')':''}`,Math.round(mine.n*tp),P.color||'#ffc94a',P.uid]);
  for(const g of allies){const gu=g.uid||(Object.entries((G.al&&G.al.members)||{}).find(([u2,m])=>m.name===g.owner)||[])[0];parts.push([`${esc24(g.owner)} · 🪖 ${kf24(g.n)}`,g.power||Math.round(g.n*tp),who24(gu).color,gu]);}
  if(b.k==='sh'&&b.own&&home>0)parts.push([`Home garrison · 🪖 ${kf24(home)}`,Math.round(home*tp),'#c9a24a',null]);
  const sum=parts.reduce((a,p)=>a+p[1],0),mx=Math.max(1,...parts.map(p=>p[1]));
  return`<div class="bld23 bld24 bld25"><div class="bh24"><div class="bi24">${ic}</div><div><h3>${nm}${lv?' · LV'+lv:''}</h3><div class="own24">${av24(ouid,24)}<b style="color:${esc24(w.color)}">${esc24(b.owner)}${b.own?' (you)':''}</b>${flag24(w.flag,24,w.color)}</div></div></div>
   ${row('Owner',esc24(b.owner)+(b.own?' (you)':''))}
   <div class="sec24">Defense power</div>${parts.map(p=>`<div class="pw25"><span>${p[3]?av24(p[3],18)+' ':''}${p[0]}</span><div class="hp25"><i style="width:${Math.round(p[1]/mx*100)}%;background:${esc24(p[2])}"></i></div><b>${p[1]}</b></div>`).join('')}
   <div class="tot25"><b>COMBINED</b><b class="gold">⚡ ${sum}</b></div>
   ${row('Building HP',`${Math.round(bp*F25.bHP*hpP)} / ${bp*F25.bHP} (${Math.round(hpP*100)}%)`)}${row('Guards',`🪖 ${kf24(tot+(b.k==='sh'&&b.own?home:0))}${cap?' · room for '+kf24(Math.max(0,cap-tot)):''}`)}
   ${row('Range',`${r} ring${r>1?'s':''} · protects ${hexRing(0,0,r).length} hexes${b.k==='tower'?' · early warning 1 ring further':''}`)}${row('Fight order',`building hits, attacker hits back, troops hit, attacker hits back · up to ${F25.rounds} rounds`)}
   <div class="sec24">Reinforcements</div><div class="sec24">ECONOMY</div>${row('Upkeep',b.k==='tower'?(Object.values(BAL.tower.upkeep||{}).some(v=>v)?Object.entries(BAL.tower.upkeep).map(([k,v])=>v+RES[k]).join(' ')+'/day':'free'):'none')}${row('Upgrade cost',up)}${lv?row('Upgrade to Lv'+(lv+1),up):''}
   <div class="btns24">${home>0&&!full&&max>0?opts.map(x=>`<button class="red24" onclick="stationTroops('${hex}',${x});UI.closeModal()">🛡 ${x===max?'Reinforce all '+kf24(x):'+'+kf24(x)}</button>`).join(''):`<span class="tiny warn25">${full?'All support slots in use.':home<=0?'🪖 No troops at home. Train some in Base › Barracks to reinforce.':'Garrison full.'}</span>`}${mine.n?`<button class="ghost24" onclick="recallStation('${hex}');UI.closeModal()">↩ Recall mine</button>`:''}</div>
   <p class="tiny">Uses 1 support slot (${u.sup}/${SLOTS.sup} in use). Troops trade hits with the attacker turn by turn. Beaten troops march home, and you can recall yours any time.</p></div>`;};
// no predictions: strip "likely holds/lost" from the squad card, march previews and risky prompts
const _isq25=UI.infoSquad;UI.infoSquad=function(fid,sid){_isq25.apply(this,arguments);try{document.querySelectorAll('#modalBody .row').forEach(r=>{if(/likely (holds|lost)/.test(r.textContent)){const f=FX().f[fid],s=f&&(f.squads||[]).find(x=>x.id===sid);r.classList.remove('warn');r.querySelector('.grow').innerHTML=`🗺️ Their target is ${s&&s.target?hexName(s.target):'not picked'}.<small>Check the building there to see your combined defense. Fights are worked out turn by turn when they arrive.</small>`;}});
  const d=document.querySelector('#modalBody .diff');const f=FX().f[fid],s=f&&(f.squads||[]).find(x=>x.id===sid);if(d&&s&&isVis(s.pos))d.textContent='🪖 '+kf24(Math.round(squadPower(f,s,Date.now())/TPOW()))+' troops';}catch(e){}};
G.troopRisk=null;try{Object.defineProperty(G,'troopRisk',{get(){return null;},set(){},configurable:true});}catch(e){}
const _stripLikely25=()=>{try{document.querySelectorAll('#btnMarch,#btnIntercept,#modalBody small,#modalBody .row').forEach(el=>{if(/likely (win|loss|holds|lost)/i.test(el.textContent||'')){el.innerHTML=el.innerHTML.replace(/\s*[·•]?\s*[✅❌]?\s*likely (win|loss|holds|lost)/gi,'').replace(/Predicted:[^<]*/gi,'Outcome is worked out when the fight starts');}});}catch(e){}};
const _ambL25=addMarchBtn;addMarchBtn=function(){const r=_ambL25.apply(this,arguments);_stripLikely25();return r;};
const _isqL25=UI.infoSquad;UI.infoSquad=function(){_isqL25.apply(this,arguments);_stripLikely25();};

// ---------- horde marches: troops on revealed hexes, hidden in fog ----------
const _ds25=drawSquadMoves;drawSquadMoves=function(){_ds25.apply(this,arguments);try{const g=G.layers.sqmove;if(!g)return;g.eachLayer(l=>{const el=l.getElement&&l.getElement();const b=el&&el.querySelector('.mk24 .tx b');if(b&&!b.dataset.t25){b.dataset.t25=1;const n=parseInt(b.textContent.replace(/[^\d]/g,''))||0;b.lastChild&&(b.lastChild.textContent=kf24(Math.round(n/TPOW())));}});}catch(e){}};
// ---------- watchtower early warning: marches one ring beyond range ----------
G._ew25={};
function earlyWarn(){if(!P.world||!P.world.fx)return;const w=W(),out=[];for(const [tid,t] of Object.entries(w.towers||{})){if(t.state!=='up')continue;const r=towerRadius(t)+1;
    for(const [fid,f] of Object.entries(P.world.fx.f||{}))for(const s of f.squads||[]){if(!s.pos||!s.path||!s.path.length||Date.now()<s.restUntil)continue;const d=hexDist(tid,s.pos);
      if(d===r||d===r-1&&false){out.push({tid,fid,s,d});const k=tid+':'+s.id+':'+s.pos;if(!G._ew25[k]){G._ew25[k]=1;const fd=fdef(fid);toast(`🗼 Watchtower spotted ${fd.name} (🪖 ${kf24(Math.round(squadPower(f,s,Date.now())/TPOW()))}) one ring outside its range`);}}}}
  G.ew25=out;}
setInterval(()=>{try{earlyWarn();}catch(e){}},5000);
// make the squad visible in that warning ring even if fog never cleared there
const _iv25=isVis;isVis=function(id){if(_iv25.apply(this,arguments))return true;try{if(G.ew25&&G.ew25.some(x=>x.s.pos===id))return true;}catch(e){}return false;};
function drawWarnRings(){if(typeof map==='undefined'||!P.world)return;if(!G.layers.ew25)G.layers.ew25=L.layerGroup().addTo(map);const g=G.layers.ew25;g.clearLayers();if(map.getZoom()<14)return;
  for(const [tid,t] of Object.entries(W().towers||{})){if(t.state!=='up')continue;const r=towerRadius(t)+1,[q,rr]=idQR(tid);
    for(const x of hexRing(q,rr,r)){if(hexDist(tid,x.id)!==r)continue;L.polygon(hexPoly(x.q,x.r),{color:'#ffb43a',weight:1.2,opacity:.45,dashArray:'2 6',fill:false,interactive:false}).addTo(g);}}}
HOOK.draw(function(){try{drawWarnRings();}catch(e){}});
// ---------- scouting reveals clan banks ----------
const _cr25=clanRows;clanRows=function(fid){const f=(FX().f||{})[fid];const seen=f&&f.home&&_iv25(f.home);const h=_cr25.apply(this,arguments);if(seen)return h;
  return h.replace(/<b>🪖 [\d,]+<\/b>/,'<b>🪖 ???</b>').replace(/<b>📦 [\d,]+<\/b>/,'<b>📦 ???</b>')+'<p class="tiny">🔭 Scout their base (reveal the hex) to see their troop bank.</p>';};
const _dc25=drawClans;drawClans=function(){_dc25.apply(this,arguments);try{const g=G.layers.clan23;g&&g.eachLayer(l=>{const el=l.getElement&&l.getElement(),d=el&&el.querySelector('.clantag23');if(!d)return;const ll=l.getLatLng(),h=hexAt(ll.lat,ll.lng).id;if(!_iv25(h))d.innerHTML=d.innerHTML.replace(/🪖 [\d.,k]+/,'🪖 ???');});}catch(e){}};
// ---------- truce hint ----------
const _tb25=truceBtns;truceBtns=function(fid){const h=_tb25.apply(this,arguments);try{if(clanState(fid).treaty)return h;}catch(e){}return h+'<p class="tiny hint25">💡 Strong clans turn truces down. Weaken them first: beat their squads or take their hexes until they are regrouping or under 3,000 troops.</p>';};
// ---------- pipeline guard: one group guards the whole route ----------
function pipeGuards25(){const o={};try{for(const p of pipes()){const g=p.guard25;if(g&&stationed()[g.hex])o[g.hex]={id:p.id,name:p.name,len:(p.route||[]).length,esc:!!g.esc,route:p.route||[]};}}catch(e){}return o;}
window.pipeGuards25=pipeGuards25;
guardLine=function(id,n,esc){const p=pipes().find(x=>x.id===id);if(!p)return;const h=exposedHex(p)||(p.route||[])[Math.floor((p.route||[]).length/2)];if(!h)return toast('This pipeline has no route yet');
  if(TP().home<=0)return toast('🪖 No troops at home. Train some in Base › Barracks first.');p.guard25={hex:h,esc:!!esc};save();stationTroops(h,n);try{pushMember();}catch(e){}UI.closeModal&&UI.closeModal();};
window.pipeEscort25=function(id){const p=pipes().find(x=>x.id===id);if(!p||!p.guard25)return;p.guard25.esc=!p.guard25.esc;save();try{pushMember();}catch(e){}toast(p.guard25.esc?'🚚 Guards now ride with the truck':'🛡 Guards hold the line');UI.closeModal&&UI.closeModal();};
lineGuards=function(p){const g=p.guard25&&stationed()[p.guard25.hex];return g?g.n:0;};
HOOK.member(function(o){try{if(Array.isArray(o.gar)){const pg=pipeGuards25();o.gar=o.gar.map(g=>pg[g.hex]?{...g,pipe:pg[g.hex].id,route:pg[g.hex].route.slice(0,40)}:g);}}catch(e){}return o;});
// every hex on a guarded route gets the guard group as a defender (mine + teammates')
const _ad25=activeDefs;activeDefs=function(id){const d=_ad25.apply(this,arguments);try{
  for(const [gh,pg] of Object.entries(pipeGuards25())){if(gh===id||!pg.route.includes(id))continue;const n=stationedAt(gh);if(n>0&&!d.some(x=>x.kind==='troops'&&x.id===gh))d.push({kind:'troops',id:gh,hex:gh,power:Math.round(n*TPOW()),pipe:pg.id});}
  for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||m.me||!Array.isArray(m.gar))continue;for(const g of m.gar)if(g&&g.route&&g.hex!==id&&g.route.includes(id)&&g.n>0&&!d.some(x=>x.kind==='allygar'&&x.uid===uid&&x.hex===g.hex))d.push({kind:'allygar',id:`allygar:${uid}:${g.hex}`,hex:g.hex,uid,owner:m.name||'Ally',n:g.n|0,power:Math.max(0,g.p|0)});}}catch(e){}return d;};
const _pc25=pipeCard;pipeCard=function(p){_pc25.apply(this,arguments);try{if(p.own===false)return;const mb=document.querySelector('#modalBody');const row=[...mb.querySelectorAll('.row')].find(r=>/Guards on the line/.test(r.textContent));if(!row)return;
  const g=lineGuards(p),home=TP().home,len=(p.route||[]).length,opts=[...new Set([500,1000,5000,home].filter(x=>x>0&&x<=home))];
  row.querySelector('.grow').innerHTML=`<b>⛓️ Pipeline guard: 🪖 ${kf24(g)}</b><small>${g?`One guard group covers all ${len} route hexes. Any horde raid on this line fights them first, turn by turn. ${p.guard25&&p.guard25.esc?'🚚 Riding with the truck (Escorting).':''}`:`Send one guard group to cover all ${len} hexes of this route. Raids on the line fight them first.`}</small>
   ${home>0?`<div class="seg">${opts.map(x=>`<button onclick="guardLine('${p.id}',${x})">🛡 ${x===home?'All '+kf24(x):'+'+kf24(x)}</button>`).join('')}</div>`:'<small class="warn25">🪖 No troops at home. Train some in Base › Barracks first.</small>'}
   ${g?`<div class="seg"><button onclick="pipeEscort25('${p.id}')">🚚 ${p.guard25&&p.guard25.esc?'Stop escorting':'Escort the truck'}</button><button onclick="recallStation('${p.guard25.hex}');UI.closeModal()">↩ Recall guards</button></div>`:''}`;}catch(e){console.warn('pipe25',e);}};
// ---------- fight reports (Base › Reports) ----------
function frHTML(r){const rows=(r.rounds||[]).map(x=>`<div class="rnd25"><b>R${x.r}</b><span>${x.b?`🏰 Building −${x.b} · `:''}${x.ab?`☠ hits building −${x.ab}`:''}</span><span>${x.g?`🛡 Troops −${x.g} · `:''}${x.ag?`☠ hits troops −${x.ag}`:''}</span></div>`).join('');
  return`<div class="fr25 ${r.win?'w':'l'}"><div class="frh"><b>${r.win?'✅ Held':'💀 Lost'} · ${hexName(r.hex||'')}</b><small>${esc24(r.gang||'Horde')}${r.sp?' · power '+r.sp:''} · ${new Date(r.t).toLocaleString()}${r.ally?' · you reinforced':''}</small></div>
   ${rows?`<div class="sec24">ROUND BY ROUND · hits alternate, building first</div>${rows}`:''}${(r.me||[]).map(m=>`<div class="r24"><span>${esc24(m.who)}</span><b>${kf24(m.n)} → ${kf24(m.n-m.lost)}${m.out?' · '+m.out+', marching home':''}</b></div>`).join('')}${r.bFell?'<p class="tiny">The building fell.</p>':''}</div>`;}
window.frHTML=frHTML;
HOOK.render(function(){try{if(this.tab!=='base'||this.sub.base!=='reports')return;const b=document.querySelector('#sheetBody');if(!b||b.querySelector('.frs25'))return;const L2=(P.fr25||[]).slice(0,8);
  b.insertAdjacentHTML('afterbegin',`<div class="frs25"><h2>⚔️ Fight reports</h2>${L2.map(frHTML).join('')||'<p class="tiny">No defense fights yet.</p>'}</div>`);}catch(e){}});
// rep shows on the profile
const _pf25=UI.profile;UI.profile=function(){_pf25.apply(this,arguments);try{const b=document.querySelector('#modalBody');b&&!b.querySelector('.rep25')&&b.insertAdjacentHTML('afterbegin',`<p class="rep25">🎖️ Reputation <b>${P.rep25||0}</b> <small>earned by reinforcing and holding</small></p>`);}catch(e){}};
