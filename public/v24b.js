// v24b Shared map/UI components (approved mockups v4 11-16). EVERY place that shows a player, march or building uses these:
//   flag24(f,w)        player flag (8 presets, iron pole, gold finial, weathered cloth)
//   av24(uid,size)     avatar ring (photo or initial, ring in the player's colour)
//   mk24(o)            unified march marker: flag + avatar ring + troops + ETA, accent by march type
//   gar24(list)        reinforced badge: total troops + avatars of who sent them
//   hold24(uid)        Stronghold / territory name plate with flag
const FL24={
 ember:['Ember Crown','#8a1a12','#ffb43a','chev','👑'], rust:['Rust Raven','#5a2a14','#d9884a','bend','🦅'],
 iron:['Iron Wolf','#2a3036','#c9a24a','quart','🐺'],  ash:['Ash Skull','#1a1614','#e8dcc0','saltire','☠️'],
 toxic:['Glow Viper','#14301e','#7aff6a','fess','🐍'],  dune:['Dune Riders','#7a5a2a','#2a1a0c','pale','🌵'],
 storm:['Stormcell','#142a4a','#6ab8ff','chev','⚡'],   blood:['Blood Gear','#4a0a10','#c9a24a','border','⚙️']};
const ACC24={attack:['#ff5a2a','ATTACK','⚔'],claim:['#ffc94a','CLAIM','🚩'],reinforce:['#6ab8ff','REINFORCE','🛡'],guard:['#3ae0c8','GUARD','🗼'],escort:['#b26aff','ESCORT','🚚'],return:['#9aa8b8','RETURNING','↩'],horde:['#e0283a','HORDE','☠']};
let _fl24=0;
function flagNorm(f,col){f=f||{};const p=FL24[f.p]?f.p:'ember',d=FL24[p];return{p,c1:f.c||d[1],c2:d[2],pat:d[3],e:f.e||d[4]};}
function flag24(f,w,col){const x=flagNorm(f,col),id='f24_'+(++_fl24),h=Math.round(w*0.92),c2=x.c2;
  const P_={chev:`<path d="M0 0 L22 15 L44 0 L44 12 L22 27 L0 12Z" fill="${c2}"/>`,bend:`<path d="M0 0 L12 0 L44 26 L44 34 L36 34 L0 8Z" fill="${c2}"/>`,quart:`<rect width="22" height="17" fill="${c2}"/><rect x="22" y="17" width="22" height="17" fill="${c2}"/>`,
    saltire:`<path d="M0 0 L6 0 L44 30 L44 34 L38 34 L0 4Z M44 0 L38 0 L0 30 L0 34 L6 34 L44 4Z" fill="${c2}" opacity=".85"/>`,fess:`<rect y="12" width="44" height="10" fill="${c2}"/>`,pale:`<rect x="16" width="12" height="34" fill="${c2}"/>`,border:`<rect x="2" y="2" width="40" height="30" fill="none" stroke="${c2}" stroke-width="4"/>`}[x.pat];
  const fly='M0 0 L44 0 L41 6 L44 12 L40 19 L44 26 L41 34 L0 34 Z';
  return`<svg class="flag24" width="${w}" height="${h}" viewBox="0 0 52 48" style="overflow:visible"><defs><clipPath id="c${id}"><path d="${fly}"/></clipPath><linearGradient id="s${id}" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".35" stop-color="#fff" stop-opacity=".12"/><stop offset=".7" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/></linearGradient></defs>
   <rect x="1" y="1" width="4" height="47" rx="1.5" fill="#3a3430" stroke="#000"/><circle cx="3" cy="2" r="3.4" fill="#ffd24a" stroke="#000"/><g transform="translate(6,4)"><g clip-path="url(#c${id})"><rect width="44" height="34" fill="${x.c1}"/>${P_}<rect width="44" height="34" fill="url(#s${id})"/></g>
   <path d="${fly}" fill="none" stroke="#0a0806" stroke-width="2" stroke-linejoin="round"/><text x="20" y="23" text-anchor="middle" font-size="15">${x.e}</text></g></svg>`;}
flagSVG=function(c,f){return flag24(f||{},44,c);};
function who24(uid){if(!uid||isMe(uid))return{name:P.name,color:P.color||'#ffc94a',avatar:P.avatar,flag:P.flag,me:true};const m=((G.al&&G.al.members)||{})[uid];return m?{name:m.name,color:m.color||'#4ad7ff',avatar:m.avatar,flag:m.flag}:{name:'Teammate',color:'#9aa8b8'};}
const esc24=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function avHTML(w,s){const ok=w.avatar&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(w.avatar);return`<span class="av24" style="--s:${s}px;--c:${esc24(w.color)}">${ok?`<img src="${w.avatar}" alt="">`:`<b>${esc24((w.name||'?').trim().charAt(0).toUpperCase())}</b>`}</span>`;}
function av24(uid,s){return avHTML(who24(uid),s||32);}
function kf24(n){n=Math.round(n||0);return n>=10000?(n/1000).toFixed(n>=100000?0:1)+'k':n.toLocaleString();}
// o:{type,uid,troops,eta,name,crest,flag}
function mk24(o){const a=ACC24[o.type]||ACC24.attack,w=o.type==='horde'?{name:o.name}:who24(o.uid);
  const av=o.type==='horde'?`<span class="av24 crest" style="--s:44px;--c:${a[0]}"><b>${o.crest||'☠️'}</b></span>`:avHTML({...w,color:a[0]},44);
  const fl=o.type==='horde'?flag24({p:'ash'},40):flag24(o.flag||w.flag,40,w.color);
  const nm=o.type==='horde'?`<em>${esc24(o.name||'Horde')}</em>`:(!w.me?`<em style="color:${esc24(w.color)}">${esc24(w.name)}</em>`:'');
  return`<div class="mk24 t-${o.type}" style="--a:${a[0]}"><div class="fl">${fl}</div><div class="pl">${av}<div class="tx"><span class="ty">${a[1]}</span>${nm}<b><u>${a[2]}</u>${kf24(o.troops)}</b><i class="mt">${o.eta?'⏱ '+o.eta:''}</i></div></div><div class="stem"></div></div>`;}
function gar24(list){const tot=list.reduce((s,x)=>s+x.n,0),u=[...new Set(list.map(x=>x.uid))];
  return`<div class="gar24">${u.slice(0,3).map(x=>av24(x,22)).join('')}<b>🛡 ${kf24(tot)}</b>${u.length>1?`<small>${u.length} players</small>`:''}</div>`;}
function hold24(uid,kind){const w=who24(uid);return`<div class="hold24">${flag24(w.flag,22,w.color)}<span>${esc24(w.me?P.name:w.name)}'s ${kind||'Hold'}</span></div>`;}
window.flag24=flag24;window.av24=av24;window.mk24=mk24;window.gar24=gar24;window.hold24=hold24;window.FL24=FL24;window.who24=who24;
// --- march type from a march doc
function mtype24(m){const ph=marchPhase(m)[0];if(ph==='back'||m.state==='back')return'return';if(m.kind==='escort')return'escort';if(m.kind==='patrol')return'guard';if(m.kind==='intercept'||m.kind==='mob')return'attack';
  try{if((typeof fxIndex==='function'&&fxIndex()[m.to])||(typeof factionAt==='function'&&factionAt(m.to))||(G.terr[m.to]&&G.terr[m.to].ai)||(typeof enemyAt==='function'&&enemyAt(m.to))||(W().raider||{})[m.to])return'attack';}catch(e){}return'claim';}
function mticon(m){const mm=Math.ceil(Math.max(0,m)/1000);return Math.floor(mm/60)+':'+String(mm%60).padStart(2,'0');}
// player marches: swap the old flag badge for the unified marker; keep the live clock
const _dm24=drawMarches;drawMarches=function(){_dm24.apply(this,arguments);try{for(const [id,mk] of Object.entries(G._flags||{})){const m=G.marches[id];if(!m)continue;const t=mtype24(m);
  mk.setIcon(L.divIcon({className:'lodm mkw24',html:mk24({type:t,uid:m.uid,troops:m.troops||(m.unit&&m.unit.n)||0,flag:m.flag}),iconSize:[0,0]}));mk._t24=t;}}catch(e){console.warn("mk24",e);}drawMarchFlags();declutter24();};
const _dmf24=drawMarchFlags;drawMarchFlags=function(){_dmf24.apply(this,arguments);try{for(const [id,mk] of Object.entries(G._flags||{})){const m=G.marches[id];if(!m)continue;const t=mtype24(m);if(t!==mk._t24){mk._t24=t;mk.setIcon(L.divIcon({className:'lodm mkw24',html:mk24({type:t,uid:m.uid,troops:m.troops||0,flag:m.flag}),iconSize:[0,0]}));}
  const el=mk.getElement&&mk.getElement(),lb=el&&el.querySelector('.mt');if(lb)lb.textContent=lb.textContent.replace(/^Returning\s*/,'⏱ ').replace('Returning…','⏱ …');}}catch(e){}};
// --- reinforced hexes/buildings: whole-hex steel-blue wall + tint + inner ring, badge with who sent troops (every player sees it)
window.GAR24=true;
window.drawGar=function(){if(typeof map==='undefined'||!P.world)return;if(!G.layers.gar23)G.layers.gar23=L.layerGroup().addTo(map);const g=G.layers.gar23;g.clearLayers();if(map.getZoom()<13)return;const now=Date.now(),hx={};
  try{for(const [h,s] of Object.entries(stationed()))if(s.n>0&&(!s.at||s.at<=now))(hx[h]=hx[h]||[]).push({uid:P.uid,n:s.n});}catch(e){}
  try{for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||m.me||!Array.isArray(m.gar))continue;for(const x of m.gar)if(x&&x.hex&&x.n>0)(hx[x.hex]=hx[x.hex]||[]).push({uid,n:x.n|0});}}catch(e){}
  for(const [h,list] of Object.entries(hx)){const [qq,rr]=idQR(h),poly=hexPoly(qq,rr),c=hexCenter(qq,rr);
    L.polygon(poly,{color:'#000',weight:9,opacity:.55,fill:false,interactive:false}).addTo(g);
    L.polygon(poly,{color:'#6ab8ff',weight:4,opacity:1,fillColor:'#6ab8ff',fillOpacity:.16,interactive:false,className:'gar24hex'}).addTo(g);
    L.polygon(poly.map(p=>[c[0]+(p[0]-c[0])*.82,c[1]+(p[1]-c[1])*.82]),{color:'#bfe2ff',weight:1.5,dashArray:'3 5',fill:false,interactive:false}).addTo(g);
    const bld=typeof bldAt==='function'&&bldAt(h);
    L.marker(c,{icon:L.divIcon({className:'lodm gb24'+(bld?' under':''),html:gar24(list),iconSize:[0,0]}),interactive:false,zIndexOffset:700}).addTo(g);}};
// --- recalled / stationing troops: unified marker (reinforce out, return home)
window.drawMoves=function(){if(typeof map==='undefined')return;if(!G.layers.mv23)G.layers.mv23=L.layerGroup().addTo(map);const g=G.layers.mv23;g.clearLayers();
  for(const m of moves()){const t=m.kind==='back'?'return':'reinforce',c=ACC24[t][0],p=[m.a[0]+(m.b[0]-m.a[0])*m.f,m.a[1]+(m.b[1]-m.a[1])*m.f];
    L.polyline([m.a,m.b],{color:'#120d08',weight:10,opacity:.55,interactive:false,lineCap:'round'}).addTo(g);L.polyline([m.a,m.b],{color:c,weight:5,dashArray:t==='return'?'4 8':'12 9',interactive:false,className:'mtrack',lineCap:'round'}).addTo(g);
    L.marker(p,{icon:L.divIcon({className:'lodm mkw24',html:mk24({type:t,uid:P.uid,troops:m.n,eta:mticon(m.eta)}),iconSize:[0,0]}),interactive:false,zIndexOffset:950}).addTo(g);}};
// --- HUD avatar uses the shared avatar
window.hudAvatar=function(){const w=document.querySelector('#hud .who');if(!w)return;let a=document.querySelector('#hudav23');if(!a){a=document.createElement('span');a.id='hudav23';w.prepend(a);}a.innerHTML=av24(P.uid,30);};
// --- profile: shared avatar + 8 flag presets (cloth colour + emblem optional)
window.flagSet=(k,v)=>{const f={...(P.flag&&P.flag.p?P.flag:{p:'ember'})};if(v===''||v==null)delete f[k];else f[k]=v;if(k==='p'){delete f.c;delete f.e;}P.flag=f;save();try{pushMember();}catch(e){}UI.profile();};
const _prof24b=UI.profile;UI.profile=function(){_prof24b.apply(this,arguments);try{const mb=document.querySelector('#modalBody');if(!mb)return;const f=P.flag&&P.flag.p?P.flag:{p:'ember'};
  const lab=mb.querySelector('.av23');if(lab){const img=lab.querySelector('img,span');if(img)img.outerHTML=av24(P.uid,84);lab.classList.add('av24w');}
  const h=[...mb.querySelectorAll('h3')].find(x=>/March flag/.test(x.textContent));if(!h)return;let n=h.nextElementSibling;while(n&&n.tagName!=='H3'){const x=n;n=n.nextElementSibling;x.remove();}
  const cols=['','#8a1a12','#5a2a14','#2a3036','#1a1614','#14301e','#7a5a2a','#142a4a','#4a0a10'],emb=['','👑','🦅','🐺','☠️','🐍','🌵','⚡','⚙️','🔥','🛡️','💀'];
  h.insertAdjacentHTML('afterend',`<div class="flagprev24">${flag24(f,96)}<b>${FL24[f.p][0]}</b></div><div class="fp24">${Object.entries(FL24).map(([k,v])=>`<button class="${f.p===k?'on':''}" onclick="flagSet('p','${k}')">${flag24({p:k},40)}<small>${v[0]}</small></button>`).join('')}</div>
    <small>Cloth colour</small><div class="sw23">${cols.map(c=>`<b style="background:${c||FL24[f.p][1]}" class="${(f.c||'')===c?'on':''}" onclick="flagSet('c','${c}')">${c?'':'⟲'}</b>`).join('')}</div>
    <small>Emblem</small><div class="sw23 emb">${emb.map(e=>`<b class="${(f.e||'')===e?'on':''}" onclick="flagSet('e','${e}')">${e||'⟲'}</b>`).join('')}</div><p class="tiny">Your flag rides on every march you send and on your Stronghold label.</p>`);}catch(e){console.warn('prof24',e);}};
// --- building stats card (mockup 15)
bldCard=function(hex){const b=bldAt(hex);if(!b)return'';const o=b.o,lv=b.k==='sh'?strongholdLevel():b.k==='tower'?(o.level||1):0,
  r=b.own?(b.k==='sh'?shRadius():b.k==='tower'?towerRadius(o):BAL.outpost.radius):(o.r||1),
  pw=b.own?(b.k==='sh'?Math.round(BAL.stronghold.basePower+strongholdLevel()*BAL.stronghold.powerPerLevel):b.k==='tower'?towerPower(o):outpostPower()):o.power,
  mine=(stationed()[hex]||{}),allies=(typeof allyGarAt==='function'?allyGarAt(hex):[]),tot=(mine.n||0)+allies.reduce((a,g)=>a+g.n,0),cap=typeof hexGarCap==='function'?hexGarCap(hex):0;
  const ouid=b.own?P.uid:(Object.entries((G.al&&G.al.members)||{}).find(([u,m])=>m.name===b.owner)||[])[0];
  const nm={sh:'STRONGHOLD',tower:'WATCHTOWER',op:'OUTPOST'}[b.k]||'STRUCTURE',ic={sh:'🏰',tower:'🗼',op:'⛺'}[b.k]||'🛡️',hp=b.own&&o.hpPct!=null?Math.round(100*o.hpPct):b.own&&o.state==='down'?0:100;
  const up=b.own&&b.k==='tower'&&typeof towerUpCost==='function'&&lv<BAL.tower.maxLevel?Object.entries(towerUpCost(o)).map(([k,v])=>RES[k]+' '+v).join(' · '):b.own&&b.k==='sh'?'Base › Fort':'—';
  const upk=b.k==='tower'?(Object.values(BAL.tower.upkeep||{}).some(v=>v)?Object.entries(BAL.tower.upkeep).map(([k,v])=>v+RES[k]).join(' ')+'/day':'free'):'none';
  const home=TP().home,u=typeof poolUse==='function'?poolUse():{sup:0},full=u.sup>=SLOTS.sup&&!mine.n,room=cap?Math.max(0,cap-tot):home,max=Math.min(home,room),opts=[500,1000,5000].filter(x=>x<max);if(max>0)opts.push(max);
  const row=(a,v)=>`<div class="r24"><span>${a}</span><b>${v}</b></div>`,w=who24(ouid);
  const gl=[...(mine.n?[{uid:P.uid,n:mine.n,arr:mine.at>Date.now()?mine.at:0}]:[]),...allies.map(g=>({uid:g.uid||(Object.entries((G.al&&G.al.members)||{}).find(([u2,m])=>m.name===g.owner)||[])[0],n:g.n,name:g.owner}))];
  return`<div class="bld23 bld24"><div class="bh24"><div class="bi24">${ic}</div><div><h3>${nm}${lv?' · LV'+lv:''}</h3><div class="own24">${av24(ouid,24)}<b style="color:${esc24(w.color)}">${esc24(b.owner)}${b.own?' (you)':''}</b>${flag24(w.flag,24,w.color)}</div></div></div>
   <div class="sec24">CONDITION</div><div class="hp24"><i style="width:${hp}%"></i></div><small class="tiny">${hp}%</small>
   <div class="sec24">DEFENSE</div>${row('Defense power',`<span class="gold">${pw}</span>`)}${row('Range',`${r} ring${r>1?'s':''} · protects ${hexRing(0,0,r).length} hexes`)}${row('Fights','first, before reinforcements')}
   <div class="sec24">REINFORCEMENTS · ${kf24(tot)}${cap?' / '+kf24(cap):''}</div>${gl.map(g=>`<div class="gr24">${av24(g.uid,26)}<b style="color:${esc24(who24(g.uid).color)}">${esc24(isMe(g.uid)?'You':(g.name||who24(g.uid).name))}</b><span>🪖 ${kf24(g.n)}${g.arr?' · arriving '+fmtDur(g.arr-Date.now()):''}</span></div>`).join('')||'<p class="tiny">None yet.</p>'}
   <div class="sec24">ECONOMY</div>${row('Upkeep',upk)}${row(lv?'Upgrade to Lv'+(lv+1):'Upgrade',up)}
   <div class="btns24">${home&&!full&&max>0?opts.map(x=>`<button class="red24" onclick="stationTroops('${hex}',${x});UI.closeModal()">🛡 ${x===max?'Reinforce all '+kf24(x):'+'+kf24(x)}</button>`).join(''):`<span class="tiny">${full?'All support slots in use.':!home?'No troops at home.':'Garrison full.'}</span>`}${mine.n?`<button class="ghost24" onclick="recallStation('${hex}');UI.closeModal()">↩ Recall mine</button>`:''}</div>
   <p class="tiny">Uses 1 support slot (${u.sup}/${SLOTS.sup} in use). Reinforcements fight after the building's own defense.</p></div>`;};
setTimeout(()=>{try{const f=()=>document.body.classList.toggle('zl14',map.getZoom()<15);map.on('zoomend',f);f();}catch(e){}},0);
// teammates' structures open the tile card: add the same building stats card there
const _it24=UI.infoTile;UI.infoTile=function(id){const r=_it24.apply(this,arguments);try{const b=bldAt(id);const mb=document.querySelector('#modalBody');if(b&&!b.own&&mb&&!mb.querySelector('.bld23')){const box=mb.querySelector('.ibtns');const h=bldCard(id);box?box.insertAdjacentHTML('beforebegin',h):mb.insertAdjacentHTML('beforeend',h);}}catch(e){}return r;};

// declutter: markers that would overlap stack upward like cards (no marker hides another's text)
function declutter24(){try{if(typeof map==='undefined')return;const ms=[];const add=mk=>{const el=mk&&mk.getElement&&mk.getElement();if(el&&el.querySelector('.mk24'))ms.push({el:el.querySelector('.mk24'),p:map.latLngToContainerPoint(mk.getLatLng())});};
  Object.values(G._flags||{}).forEach(add);['mv23','sqmove'].forEach(k=>{const g=G.layers&&G.layers[k];g&&g.eachLayer(add);});
  ms.sort((a,b)=>a.p.y-b.p.y||a.p.x-b.p.x);const placed=[];for(const m of ms){let dy=0;for(let k=0;k<8;k++){const y=m.p.y-dy;if(!placed.some(o=>Math.abs(o.x-m.p.x)<170&&Math.abs(o.y-y)<64))break;dy+=66;}m.el.style.marginTop=(-dy)+'px';placed.push({x:m.p.x,y:m.p.y-dy});}}catch(e){}}
window.declutter24=declutter24;setInterval(declutter24,500);setTimeout(()=>{try{map.on('zoomend moveend',declutter24);}catch(e){}},0);
