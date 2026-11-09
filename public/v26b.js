// v26b (TEST) One home for results + event routing + drive recap + troop cap + drive-over bugs. Design: reviews/v26-ux-deep-dive.md §3-8.
//  Event routing (one table, notify26): fight you watch -> popup that stays until Close · fight while away -> tap-toast + Reports
//  march done -> tap-toast + Reports · drive ends -> Drive Recap popup + Reports › Drives · horde takes undefended hex -> toast + Reports
//  badges / XP / supply drops -> toast only · logins + lore -> Activity log only.
const n26=v=>Math.round(v||0).toLocaleString();
const resTxt26=o=>Object.entries(o||{}).filter(([,v])=>v>0).map(([k,v])=>'+'+n26(v)+RES[k]).join(' ')||'–';
// ---------- tap-toast (stays 8 s, tap opens the report) ----------
function toast26(text,fn){const T=$('#toast');if(!T)return;while(T.children.length>=3)T.firstChild.remove();const d=document.createElement('div');d.className='tap26';d.textContent=text+'  ›';
  d.onclick=e=>{e.stopPropagation();d.remove();try{fn&&fn();}catch(er){}};T.appendChild(d);setTimeout(()=>d.remove(),8000);}
window.toast26=toast26;
function notify26(kind,row){try{UI.hud&&UI.hud();}catch(e){}
  if(kind==='fight'||kind==='cap'){const t=row.title||(row.none?`☠️ ${row.gang||'Horde'} took ${hexName(row.hex)} · nobody guarding`:`${row.win?'🛡️ Held':'💀 Lost'} ${hexName(row.hex||'')} vs ${row.gang||'Horde'}`);
    const open=()=>UI.report26('f',row);if(kind==='fight'&&row.watch&&$('#modal').classList.contains('hidden'))return open();return toast26(t,open);}
  if(kind==='march')return toast26(`🚩 ${row.sub||'March done'}`,()=>UI.report26('m',row));
  if(kind==='drive')return UI.report26('d',row);}
window.notify26=notify26;
// v25 report() for fights also wrote the inbox line; give the newest fight row a tap-toast instead of a plain toast
setInterval(()=>{try{const top=(P.fr25||[])[0];if(top&&!top._n26&&Date.now()-top.t<20e3){top._n26=1;if(!top.none&&!top.title)notify26('fight',top);}}catch(e){}},1000);
// ---------- fight popups stay until closed ----------
const _rp26=UI.replay;UI.replay=function(o){_rp26.apply(this,arguments);try{const b=$('#modalBody');b.dataset.rtag='keep26';b.dataset.qtag='keep26';const rc=$('#rclose');rc&&rc.remove();}catch(e){}};
const _inf26=UI.info;UI.info=function(o){_inf26.apply(this,arguments);try{clearInterval(UI._fc8);const c=$('#fcount');c&&c.remove();$('#modalBody').dataset.ftag='keep26';}catch(e){}};
// ---------- march results -> Reports + tap-toast (no surprise popup) ----------
showMarchReport=function(o){try{const row={t:Date.now(),sub:o.sub||'March done',rows:o.rows||[]};P.mr26=[row,...(P.mr26||[])].slice(0,60);save();notify26('march',row);}catch(e){console.warn('mr26',e);}};
// ---------- Reports home ----------
function fightTitle26(r){if(r.title)return r.title;if(r.none)return`☠️ ${r.gang||'Horde'} took ${hexName(r.hex)}`;return`${r.win?'🛡️ Held':'💀 Lost'} · ${hexName(r.hex||'')}`;}
function fightSub26(r){if(r.none)return'nobody guarding';const me=(r.me||[]).reduce((a,m)=>a+(m.lost||0),0);return`${r.gang||'Horde'}${r.r26?' · '+n26(r.r26.att.n)+' troops':''} · you lost ${n26(me)}${r.ally?' · you reinforced':''}`;}
function reportItems26(){const o=[];(P.fr25||[]).forEach(r=>o.push({k:'f',t:r.t,ico:r.none?'☠️':r.win?'🛡️':'⚔️',title:fightTitle26(r),sub:fightSub26(r),r}));
  (P.dr26||[]).forEach(r=>o.push({k:'d',t:r.t,ico:'🚗',title:'Drive recap · '+r.km+' km',sub:`+${r.newHex} hexes · ${resTxt26(r.total)}`,r}));
  (P.mr26||[]).forEach(r=>o.push({k:'m',t:r.t,ico:'🚩',title:String(r.sub||'March').replace(/<[^>]+>/g,'').slice(0,60),sub:(r.rows||[]).length+' line'+((r.rows||[]).length===1?'':'s'),r}));
  return o.sort((a,b)=>b.t-a.t);}
window.reportItems26=reportItems26;
function reportsHTML26(f){f=f||UI._rf26||'all';const L=reportItems26(),seen=P.rp26Seen||0,cnt=k=>L.filter(x=>k==='all'||x.k===k).length;UI._ri26=L;
  const tabs=[['all','All'],['f','⚔️ Fights'],['d','🚗 Drives'],['m','🚩 Marches']].map(([k,n])=>`<button class="${f===k?'on':''}" onclick="UI._rf26='${k}';UI.reports26()">${n} ${cnt(k)}</button>`).join('');
  const rows=L.map((x,i)=>[x,i]).filter(([x])=>f==='all'||x.k===f).slice(0,40).map(([x,i])=>`<div class="rp26 ${x.t>seen?'new':''}" onclick="UI.reportAt26(${i})"><span class="ri">${x.ico}</span><div class="grow"><b>${x.title}</b><small>${esc24(x.sub)} · ${when(x.t)}</small></div><span class="chev">›</span></div>`).join('');
  return`<div class="rps26"><div class="seg rpf26">${tabs}</div>${rows||'<p class="tiny">Nothing here yet. Fights, drives and marches land here and stay.</p>'}<p class="tiny">Logins, stories and badge toasts are in <a href="#" onclick="UI.actlog26();return false">📒 Activity log</a>.</p></div>`;}
UI.reports26=function(){P.rp26Seen=Date.now();save();this.modal(`<div class="ibxhead"><h2>📬 Reports</h2><button class="ibxx" onclick="UI.closeModal()">✖ Close</button></div>${reportsHTML26()}`);$('#modal').classList.add('rpm26');try{UI.hud();}catch(e){}};
UI.reportAt26=function(i){const x=(UI._ri26||[])[i];if(x)UI.report26(x.k,x.r);};
UI.inbox=function(){UI.reports26();};
UI.actlog26=function(){const r=W().reports.slice(0,60);this.modal(`<h2>📒 Activity log</h2>${r.map(x=>`<div class="act ${x.win?'':'bad'}"><small>${when(x.t)}</small> ${x.text}</div>`).join('')||'<p class="tiny">Nothing yet.</p>'}<div class="btns26"><button onclick="UI.reports26()">📬 Reports</button><button onclick="UI.closeModal()">Close</button></div>`);};
inboxUnread=function(){const s=P.rp26Seen||0;return reportItems26().filter(x=>x.t>s).length;};
// one Reports sub-tab in Base (same screen as the bell)
HOOK.render(function(){try{if(this.tab!=='base'||this.sub.base!=='reports')return;const b=$('#sheetBody');if(!b)return;const nav=b.querySelector('.seg');b.innerHTML='';if(nav)b.appendChild(nav);
  b.insertAdjacentHTML('beforeend',`<h2>📬 Reports</h2>${reportsHTML26()}`);P.rp26Seen=Date.now();}catch(e){console.warn('rp26',e);}});
try{const r=UI.SUBS.base.find(x=>x[0]==='reports');if(r)r[1]='📬 Reports';}catch(e){}
// ---------- one report popup (fight / drive / march) ----------
function playerRow26(p,r){const t=C26.types[p.type]||{},c=CLASSES.list[p.type]||{};return`<div class="pl26"><span>${t.ico||'🪖'}</span><div class="grow"><b>${esc24(p.name)}</b> · ${c.name||p.type} · ${n26(p.n)}<small>${p.key==='home'?'home garrison':''}</small></div><b>${n26(p.dmg)}⚔</b><b>${n26(p.hp)}❤</b></div>`;}
function fightHTML26(r){const x=r.r26;const head=`<div class="fh26 ${r.win?'w':'l'}"><h2>${fightTitle26(r)}</h2><small>${esc24(r.gang||'Horde')} · ${hexName(r.hex||'')} · ${new Date(r.t).toLocaleString()}</small></div>`;
  if(r.none)return head+`<div class="why26"><b>WHY</b><p>${r.why||'Nobody was guarding this hex, so the horde walked in. No fight was run.'}</p></div><div class="btns26"><button onclick="UI.closeModal();marchGo('${r.hex}')">🗺️ Show on map</button><button onclick="UI.reports26()">📬 All reports</button><button onclick="UI.closeModal()">Close</button></div>`;
  if(!x)return head+(typeof frHTML==='function'?frHTML(r):'')+`<div class="btns26"><button onclick="UI.reports26()">📬 All reports</button><button onclick="UI.closeModal()">Close</button></div>`;
  const pk=Object.entries(x.perks||{}).filter(([,v])=>v>0).map(([k,v])=>k.charAt(0).toUpperCase()+k.slice(1)+' '+Math.round(v*100)+'%').join(', ');
  const b=x.bld?`<div class="pl26"><span>${{sh:'🏰',tower:'🗼',op:'⛺',pipe:'⛓️'}[x.bld.kind]||'🏚'}</span><div class="grow"><b>${{sh:'Stronghold',tower:'Watchtower',op:'Outpost',pipe:'Pipeline line'}[x.bld.kind]} Lv${x.bld.lvl||1}</b><small>walls block ${Math.round(x.walls*100)}% · fire ${n26(x.fire)}</small></div><b>${n26(x.fire)}⚔</b><b></b></div>`:'';
  return head+`<div class="big26"><div><b>${n26(x.D)}</b><small>our dmg/turn</small></div><div><b>${n26(x.A)}</b><small>their dmg/turn</small></div><div><b>${x.tWe} vs ${x.tThey}</b><small>turns to break</small></div></div>
   <div class="sec26">DEFENDERS${x.nTypes>=3?` · mix bonus +${Math.round(x.mix*100)}% HP`:''}</div>${b}${x.players.map(p=>playerRow26(p,r)).join('')||'<p class="tiny">No troops inside.</p>'}${pk?`<p class="tiny">Perks on: ${pk}</p>`:''}
   <div class="sec26">ATTACKERS</div><div class="pl26"><span>🪓</span><div class="grow"><b>${esc24(x.att.name)}</b> · ${n26(x.att.n)} troops</div><b>${n26(x.A)}⚔</b><b>${n26(x.E)}❤</b></div>
   <div class="why26"><b>WHY ${r.win?'WE HELD':'WE LOST'}</b><p>${x.why}</p></div>
   <div class="sec26">LOSSES (ENGINEERS FIRST)</div>${x.players.map(p=>`<div class="r24"><span>${esc24(p.name)}</span><b>−${n26(p.lost)} → ${n26(p.left)} ${r.win?'stay inside':'lost'}</b></div>`).join('')}<div class="r24"><span>${esc24(x.att.name)}</span><b>−${n26(x.att.lost)}${x.att.left?' → '+n26(x.att.left)+' take it':' (wiped)'}</b></div>
   <div class="btns26"><button onclick="UI.closeModal();marchGo('${r.hex}')">🗺️ Map</button><button onclick="UI.reports26()">📬 All reports</button><button onclick="UI.closeModal()">Close</button></div>`;}
window.fightHTML26=fightHTML26;
function driveHTML26(r){const S=r.src||{};const line=(ico,t,o)=>resTxt26(o)!=='–'?`<div class="r24"><span>${ico} ${t}</span><b>${resTxt26(o)}</b></div>`:'';
  return`<h2>🚗 Drive Recap</h2><small>${new Date(r.t0).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}–${new Date(r.t).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})} · ${fmtDur(r.t-r.t0).replace(/ \d+s$/,'')}</small>
   <div class="big26"><div><b>${r.km}</b><small>km</small></div><div><b>+${r.newHex}</b><small>new hexes</small></div><div><b>${r.own}</b><small>own hexes passed</small></div></div>
   <div class="sec26">COLLECTED</div>${line('🔩','From new hexes',S.new)}${line('🥫','Passing your resource hexes ('+(r.ownPaid||0)+')',S.own)}${line('⛓️','Pipeline pins',S.pin)}${line('🐛','Bugs run over ('+(r.bugs||[]).length+')',S.bug)}
   <div class="r24 tot26"><span>TOTAL</span><b>${resTxt26(r.total)}</b></div>
   ${(r.bugs||[]).length?`<div class="sec26">FIGHTS ON THE WAY</div>${r.bugs.map(b=>`<div class="r24"><span>🐛 ${esc24(b.name)} Lv${b.lvl}</span><b>${b.win?'won':'lost'}</b></div>`).join('')}`:''}
   ${resTxt26(r.other)!=='–'?`<div class="sec26">NOT COUNTED AS DRIVE LOOT</div><div class="r24"><span>🏅 Badges, rewards, other</span><b>${resTxt26(r.other)}</b></div>`:''}
   <div class="btns26"><button class="btn-primary" onclick="UI.closeModal()">Done</button><button onclick="UI.reports26()">📬 All reports</button></div><p class="tiny">Saved in 📬 Reports › Drives.</p>`;}
function marchHTML26(r){return`<h2>🚩 March report</h2><small>${esc24(String(r.sub||'').replace(/<[^>]+>/g,''))} · ${when(r.t)}</small><div class="marchrep">${(r.rows||[]).join('')||'<p class="tiny">Nothing new this time.</p>'}</div><div class="btns26"><button onclick="UI.reports26()">📬 All reports</button><button onclick="UI.closeModal()">Close</button></div>`;}
UI.report26=function(k,r){this.modal(k==='f'?fightHTML26(r):k==='d'?driveHTML26(r):marchHTML26(r));$('#modal').classList.add('rpm26');};
// ---------- drive recap + correct pickup accounting ----------
function src26(name,fn){const r0={...P.res};let out;try{out=fn();}finally{if(G.drive&&G.drive.on&&G.drive.s26){const S=G.drive.s26.src;S[name]=S[name]||{};for(const k in RES){const d=(P.res[k]||0)-(r0[k]||0);if(d>0)S[name][k]=(S[name][k]||0)+d;}}}return out;}
window.src26=src26;
const _ct26=claimTile;claimTile=function(){return src26('new',()=>_ct26.apply(this,arguments));};
const _pdc26=pipeDriveCheck;pipeDriveCheck=function(){return src26('pin',()=>_pdc26.apply(this,arguments));};
const _td26=toggleDrive;toggleDrive=async function(){const wasOn=G.drive.on;const s=wasOn?G.drive.s26:null;const held0=Object.keys(P.tiles||{}).length;
  const r=await _td26.apply(this,arguments);
  try{if(G.drive.on){G.drive.s26={t0:Date.now(),km0:P.stats.meters,res0:{...P.res},tiles0:held0,src:{},own:new Set(),ownPaid:0,bugs:[]};}
    else if(s){const now=Date.now(),tot={},oth={};for(const k in RES){const d=(P.res[k]||0)-(s.res0[k]||0);let at=0;for(const src of Object.values(s.src))at+=src[k]||0;if(at>0)tot[k]=at;if(d-at>0)oth[k]=d-at;}
      const rec={t:now,t0:s.t0,km:((P.stats.meters-s.km0)/1000).toFixed(1),newHex:Math.max(G.drive.claimed||0,Object.keys(P.tiles).length-s.tiles0),own:s.own.size,ownPaid:s.ownPaid,src:s.src,total:tot,other:oth,bugs:s.bugs};
      P.dr26=[rec,...(P.dr26||[])].slice(0,60);save();G.drive.s26=null;notify26('drive',rec);}}catch(e){console.warn('dr26',e);}return r;};
// HUD: "Picked up" only counts real drive sources (badge rewards no longer show as drive loot)
const _dh26=driveHud;driveHud=function(){_dh26.apply(this,arguments);try{const el=$('#drivehud'),s=G.drive&&G.drive.s26;if(!el||!s)return;const g=el.querySelector('.dgot');const tot={};for(const src of Object.values(s.src))for(const k in src)tot[k]=(tot[k]||0)+src[k];
  const h=Object.keys(tot).length?`<div class="dgot">Picked up: ${resTxt26(tot)}${s.bugs.length?` · 🐛 ${s.bugs.length}`:''}</div>`:'';if(g)g.outerHTML=h;else if(h){const st=el.querySelector('.dstats');st&&st.insertAdjacentHTML('afterend',h);}}catch(e){}};
// passing your own resource hex during a drive pays that hex's nightly amount once per day; the next reset pays the rest (same total)
function dp26(){const d=pacificDate();P.dp26=P.dp26||{ids:{},pre:{}};if(P.dp26.day!==d){P.dp26.ids={};P.dp26.day=d;}return P.dp26;}
function driveOver26(){if(!G.drive||!G.drive.on||!G.drive.s26||!G.pos)return;const h=hexAt(...G.pos).id;if(!P.tiles[h])return;const s=G.drive.s26;s.own.add(h);const t=tileInfo(h),D=dp26();if(!t.res||D.ids[h])return;
  const amt=t.yield,share=Math.round(amt*BAL.reset.allianceShare),mine=amt-share;D.ids[h]=amt;D.pre[t.res]=(D.pre[t.res]||0)+amt;s.ownPaid++;
  src26('own',()=>addRes({[t.res]:mine}));save();}
const _sp26=setPos;setPos=function(){const r=_sp26.apply(this,arguments);try{driveOver26();bugsOver26();}catch(e){console.warn('dv26',e);}return r;};
const _pr26=payReset;payReset=async function(){const pre={...((P.dp26&&P.dp26.pre)||{})};G._pre26=pre;try{return await _pr26.apply(this,arguments);}finally{G._pre26=null;if(P.dp26)P.dp26.pre={};
  try{const sh={};let st=0;for(const k in pre){sh[k]=Math.round(pre[k]*BAL.reset.allianceShare);st+=sh[k];}if(st>0)await NET.bankMulti(P.uid,P.name,sh,'auto-share');}catch(e){}save();}};
const _gi26b=grossIncome;grossIncome=function(){const g=_gi26b.apply(this,arguments);try{const pre=G._pre26;if(pre){for(const k in pre)g[k]=Math.max(0,(g[k]||0)-pre[k]);G._pre26=null;}}catch(e){}return g;};
// ---------- driving over a small lone bug fights it (tap still opens the card first) ----------
function bugsOver26(){if(!G.drive||!G.drive.on||!G.drive.s26||!G.pos)return;const s=G.drive.s26;
  for(const m of (G.monList||[])){const M=MONSTERS[m.mid];if(!M||M.boss||M.fort||P.killed[m.key]||s.bugs.some(b=>b.key===m.key))continue;
    if(distM(G.pos[0],G.pos[1],m.lat,m.lng)>70)continue;const hx=hexAt(m.lat,m.lng).id;if(fxIndex()[hx])continue; // not on horde hexes
    if((G.monList||[]).some(o=>o!==m&&!P.killed[o.key]&&hexAt(o.lat,o.lng).id===hx))continue; // lone bugs only
    if(cooldownLeft()||P.hp<stats().hp*0.5){s.bugs.push({key:m.key,name:M.name,lvl:m.lvl,win:false,skip:true});continue;}
    const keep=UI.replay;let res=null;UI.replay=function(o){res=o;};try{src26('bug',()=>fightMutant(m.mid,m.lvl,m.key));}finally{UI.replay=keep;}
    s.bugs.push({key:m.key,name:M.name,lvl:m.lvl,win:!!(res&&res.good)});try{spawnMonsters();}catch(e){}}
  s.bugs=s.bugs.filter(b=>!b.skip||true);}
window.bugsOver26=bugsOver26;
// ---------- troop cap: bar + next level + upgrade button + toast when you hit it ----------
function capAt26(L){return Math.round(TROOP.capLv1*Math.pow(TROOP.capMax/TROOP.capLv1,(L-1)/9)/100)*100;}
function capNext26(){const L=Math.max(1,Math.min(10,mtLevel())),cur=troopCap();return{L,cur,nx:L<10?capAt26(L+1):null};}
function capBar26(){const t=TP(),c=capNext26(),used=t.home+troopsAway()+troopsQueued(),full=troopRoom()<=0,pct=Math.min(100,used/c.cur*100);
  return`<div class="cap26 ${full?'full':''}"><div class="caph"><b>🪖 ${full?'Troops full':'Troops'}: ${n26(used)} / ${n26(c.cur)}</b></div><div class="prog"><i style="width:${pct}%"></i></div>
   <small>Raise the cap by upgrading your 🏰 Stronghold.${c.nx?` Lv${c.L+1} → ${n26(c.nx)}`:''} · Lv10 → ${n26(TROOP.capMax)}</small>${c.nx?`<button class="btn-primary" onclick="UI.sub.base='fort';UI.render()">🏰 Upgrade Stronghold to Lv${c.L+1}</button>`:''}</div>`;}
window.capBar26=capBar26;
HOOK.render(function(){try{if(this.tab!=='base'||this.sub.base!=='barracks')return;const b=$('#sheetBody');if(!b||b.querySelector('.cap26'))return;const h=b.querySelector('h2');(h||b.firstChild).insertAdjacentHTML('afterend',capBar26());}catch(e){}});
const _tt26=trainTroops;trainTroops=function(n){if(troopRoom()<=0&&!isHungry()){const c=capNext26();return toast26(`🪖 Troops full (${n26(c.cur)}). Upgrade 🏰 Stronghold to train more`,()=>{UI.sub.base='fort';UI.open('base');});}
  const r=_tt26.apply(this,arguments);try{if(troopRoom()<=0&&!G._capT26){G._capT26=1;const c=capNext26();toast26(`🪖 Troops full (${n26(c.cur)}). Upgrade 🏰 Stronghold to train more`,()=>{UI.sub.base='fort';UI.open('base');});}}catch(e){}return r;};
