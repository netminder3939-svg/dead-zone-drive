// v23 playtest fixes (Jacob, ddd-v22-1): raid bar dismiss + Alliance dot, Layers close, TEST-ONLY drive simulator,
// bigger plan marks, profile card + avatar + march flag, recall/station march lines + cards, reinforced-hex markers,
// tower/outpost explainers, pipeline route labels. Fight math untouched.
(function(){const q=s=>document.querySelector(s),esc=s=>typeof m2esc==='function'?m2esc(s):String(s);
const PREVIEW=location.hostname.includes('--')||location.search.includes('local');
try{delete P.fightView;}catch(e){}
// ---------- 1 raid bar: X to hide; Alliance tab keeps a red dot while any raid is live
G._rdism=G._rdism||{};
const liveRaids=()=>Object.values(G.raids||{}).filter(r=>!r.done&&Date.now()<r.endsAt);
const _rb=UI.raidBanner;UI.raidBanner=function(){_rb.apply(this,arguments);try{const el=q('#raidBanner'),live=liveRaids();
  el.querySelectorAll('.rbrow').forEach(row=>{if(row.querySelector('.rbx'))return;const id=(row.querySelector('button[onclick^="UI.raid("]')?.getAttribute('onclick')||'').match(/'([^']+)'/);if(!id)return;
    if(G._rdism[id[1]]){row.remove();return;}const x=document.createElement('button');x.className='rbx';x.textContent='✕';x.title='Hide (raid stays in Alliance)';x.onclick=e=>{e.stopPropagation();G._rdism[id[1]]=1;UI.raidBanner();};row.appendChild(x);});
  if(!el.querySelector('.rbrow'))el.classList.add('hidden');
  const t=q('#tabs [data-tab=alliance]');if(t)t.classList.toggle('raiddot',live.length>0);}catch(e){}};
// ---------- 2 Layers: close X + tap outside
const _ly=UI.layers;UI.layers=function(keep){_ly.apply(this,arguments);try{const el=q('#laypop');if(!el)return;if(!el.querySelector('.lyx')){const x=document.createElement('button');x.className='lyx';x.textContent='✕';x.onclick=e=>{e.stopPropagation();el.remove();};el.prepend(x);}}catch(e){}};
document.addEventListener('pointerdown',e=>{const el=q('#laypop');if(!el)return;if(el.contains(e.target)||e.target.closest('#btnLayers,#plLayers'))return;el.remove();},true);
// ---------- 3 TEST ONLY: drive simulator (D-pad + tap map = drive there). Never on live.
if(PREVIEW){let pad=null,dir=null,dest=null;const SPD=0.00030; // ~33 m per tick (~120 km/h feel at 1 tick/s)
  const show=()=>{const on=!!(G.drive&&G.drive.on);if(!on){pad&&pad.remove();pad=null;dir=null;dest=null;return;}
    if(pad)return;pad=document.createElement('div');pad.id='dsim23';pad.innerHTML=`<small>🧪 TEST drive sim</small><div class="g">${[['↖',-1,-1],['↑',1,0],['↗',1,1],['←',0,-1],['■',0,0],['→',0,1],['↙',-1,-1.001],['↓',-1,0],['↘',-1,1]].map(([t,a,b])=>`<button data-a="${a}" data-b="${b}">${t}</button>`).join('')}</div><small>or tap the map to drive there</small>`;
    document.body.appendChild(pad);pad.querySelectorAll('button').forEach(b=>b.onclick=e=>{e.stopPropagation();const a=+b.dataset.a,c=Math.round(+b.dataset.b);dest=null;dir=(a||c)?[a,c]:null;toast(dir?'🚗 Driving '+b.textContent:'🚗 Stopped');});};
  setInterval(()=>{try{show();if(!pad||!G.pos)return;let dl=0,dg=0;
    if(dest){const dy=dest[0]-G.pos[0],dx=(dest[1]-G.pos[1])*Math.cos(G.pos[0]*Math.PI/180),d=Math.hypot(dy,dx);if(d<SPD){G.dev.hold=true;setPos(dest[0],dest[1]);dest=null;try{pipeDriveCheck();}catch(e){}return;}dl=SPD*dy/d;dg=SPD*dx/d/Math.cos(G.pos[0]*Math.PI/180);}
    else if(dir){const n=Math.hypot(dir[0],dir[1]);dl=SPD*dir[0]/n;dg=SPD*dir[1]/n/Math.cos(G.pos[0]*Math.PI/180);}else return;
    G.dev.hold=true;setPos(G.pos[0]+dl,G.pos[1]+dg);map.panTo(G.pos,{animate:true});try{pipeDriveCheck();}catch(e){}}catch(e){}},1000);
  setTimeout(()=>{try{map.on('click',e=>{if(G.drive&&G.drive.on&&pad){dest=[e.latlng.lat,e.latlng.lng];dir=null;toast('🚗 Driving there');}});}catch(e){}},0);}
// ---------- 4 plan marks: bigger, scale with zoom, sit above resource icons
const mz=()=>{try{const z=map.getZoom();document.documentElement.style.setProperty('--mz',z>=17?1.7:z>=16?1.45:z>=15?1.2:1);}catch(e){}};
setTimeout(()=>{try{mz();map.on('zoomend',mz);}catch(e){}},0);
const _dm=drawMarkers;drawMarkers=function(){_dm.apply(this,arguments);try{const g=G.layers.mark,z=map.getZoom(),k=z>=17?2:z>=16?1.7:z>=15?1.35:1;g.eachLayer(l=>{if(l instanceof L.Polygon){l.setStyle({weight:3.5*k,fillOpacity:Math.max(l.options.fillOpacity,.24),dashArray:null});}else if(l instanceof L.Polyline){l.setStyle({weight:8*k});}else if(l.setZIndexOffset)l.setZIndexOffset(2000);});}catch(e){}};
// ---------- 7 profile card (tap your name): avatar, stats, march flag, achievements
const FLAGS={shapes:{swallow:'M9.5 6 L36 6 L30 14 L36 22 L9.5 22 Z',square:'M9.5 6 L36 6 L36 22 L9.5 22 Z',pennant:'M9.5 6 L38 14 L9.5 22 Z',banner:'M9.5 6 L34 6 L34 26 L22 21 L9.5 26 Z'},emb:['','☠️','🔥','⚙️','🐺','🦅','⚡','🛡️','👑','🌵','🐍','💀']};
const _fs=flagSVG;flagSVG=function(c,f){if(!f)return _fs(c);const sh=FLAGS.shapes[f.s]||FLAGS.shapes.swallow,col=f.c||c;
  return`<svg width="40" height="44" viewBox="0 0 40 44"><rect x="6" y="3" width="3.5" height="39" rx="1.5" fill="#2a2118" stroke="#000" stroke-width="1"/><circle cx="7.7" cy="3.5" r="3" fill="#ffd24a" stroke="#000" stroke-width="1"/><path d="${sh}" fill="${col}" stroke="#111" stroke-width="2" stroke-linejoin="round"/>${f.c2?`<path d="M9.5 12 L33 12 L33 16 L9.5 16 Z" fill="${f.c2}" opacity=".9"/>`:''}${f.e?`<text x="21" y="18.5" font-size="10" text-anchor="middle">${f.e}</text>`:''}<ellipse cx="8" cy="42" rx="6" ry="1.8" fill="#000" opacity=".45"/></svg>`;};
HOOK.member(function(o){try{if(P.avatar)o.avatar=P.avatar;if(P.flag)o.flag=P.flag;}catch(e){}return o;});
function resizeAvatar(file){return new Promise((res,rej)=>{const img=new Image(),u=URL.createObjectURL(file);img.onload=()=>{const S=96,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d'),m=Math.min(img.width,img.height);
  x.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,S,S);URL.revokeObjectURL(u);let d=c.toDataURL('image/jpeg',.75);if(d.length>14000)d=c.toDataURL('image/jpeg',.5);res(d);};img.onerror=rej;img.src=u;});}
window.avatarPick=async inp=>{const f=inp.files&&inp.files[0];if(!f)return;try{P.avatar=await resizeAvatar(f);save();try{pushMember();}catch(e){}window.hudAvatar();UI.profile();toast('🖼️ Avatar saved');}catch(e){toast('Could not read that image');}};
window.flagSet=(k,v)=>{P.flag={s:'swallow',c:'',c2:'',e:'',...(P.flag||{}),[k]:v};save();try{pushMember();}catch(e){}UI.profile();};
function hudAvatar(){const w=q('#hud .who');if(!w)return;let a=q('#hudav23');if(!a){a=document.createElement('span');a.id='hudav23';w.prepend(a);}a.innerHTML=P.avatar?`<img src="${P.avatar}">`:'🧑‍🚀';}
UI.profile=function(){const st=P.stats||{},cls=(()=>{try{const c=myClass();return c?(c.icon||'')+' '+c.name:'';}catch(e){return'';}})(),f=P.flag||{},col=P.color||'#e6c46a';let ach='';try{ach=Object.entries((P.ach&&P.ach.got)||{}).filter(([,v])=>v).map(([k,v])=>`<span class="ach23">🏅 ${esc(k.replace(/[:_].*$/,''))} ${typeof v==='number'?'★'.repeat(Math.min(3,v)):''}</span>`).join('');}catch(e){}
  const colors=['#e6c46a','#d0412f','#4aa3ff','#8fd14f','#b86ad8','#ff8a3a','#e8e8e8','#2bd4c4'];
  this.info({title:`${esc(P.name)}`,sub:`Level ${P.lvl}${cls?' · '+esc(cls):''} · ${Object.keys(P.tiles||{}).length} hexes`,
    art:`<label class="av23" title="Change avatar">${P.avatar?`<img src="${P.avatar}">`:'<span>🧑‍🚀</span>'}<input type="file" accept="image/*" onchange="avatarPick(this)" hidden><b>📷</b></label>`,
    body:`<div class="stats"><div><b>${st.kills||0}</b><small>Mutants</small></div><div><b>${((st.meters||0)/1000).toFixed(1)}</b><small>km</small></div><div><b>${Object.keys(P.badges||{}).length}</b><small>Badges</small></div><div><b>${(P.contrib&&P.contrib.raids)||0}</b><small>Raids</small></div></div>
      <h3>🚩 March flag</h3><div class="flagprev23">${flagSVG(col,{s:f.s||'swallow',c:f.c,c2:f.c2,e:f.e})}</div>
      <div class="seg">${Object.keys(FLAGS.shapes).map(s=>`<button class="${(f.s||'swallow')===s?'on':''}" onclick="flagSet('s','${s}')">${s}</button>`).join('')}</div>
      <small>Color</small><div class="sw23">${['',...colors].map(c=>`<b style="background:${c||col}" class="${(f.c||'')===c?'on':''}" onclick="flagSet('c','${c}')">${c?'':'⟲'}</b>`).join('')}</div>
      <small>Stripe</small><div class="sw23">${['',...colors].map(c=>`<b style="background:${c||'#2a2118'}" class="${(f.c2||'')===c?'on':''}" onclick="flagSet('c2','${c}')">${c?'':'✕'}</b>`).join('')}</div>
      <small>Emblem</small><div class="sw23 emb">${FLAGS.emb.map(e=>`<b class="${(f.e||'')===e?'on':''}" onclick="flagSet('e','${e}')">${e||'✕'}</b>`).join('')}</div>
      <h3>🏅 Achievements</h3><div>${ach||'<p class="tiny">None yet.</p>'}</div><p class="tiny">Avatar is shrunk to 96×96 on your device before saving, so it stays tiny. Your crew sees it.</p>`,buttons:[]});};
setTimeout(()=>{try{window.hudAvatar();const w=q('#hud .who');w.style.cursor='pointer';w.addEventListener('click',e=>{e.stopPropagation();UI.profile();});}catch(e){}},800);
// ---------- 8 pipeline: label both ends of every line (🏰 Stronghold → 📍 site) and say so in the card
const _dp=drawPipes;drawPipes=function(){_dp.apply(this,arguments);try{const g=G.layers.pipes;if(!g||map.getZoom()<13)return;for(const p of crewPipes()){if(!p.route||p.route.length<2)continue;const a=hexCenter(...idQR(p.route[0]));
  L.marker(a,{icon:L.divIcon({className:'lodm',html:'<div class="pend23">🏰 line start</div>',iconSize:[0,0]}),interactive:false,zIndexOffset:650}).addTo(g);}}catch(e){}};
const _ps=window.pipeSetup;window.pipeSetup=function(id){_ps(id);try{const r=q('#modalBody .ps22');r&&r.insertAdjacentHTML('afterbegin','<p class="tiny">The line always runs from <b>🏰 your Stronghold</b> to <b>📍 the site</b> (dotted gold on the map). Where you are standing does not matter. You only have to drive to the 📍 pin.</p>');}catch(e){}};
// ---------- 9 intercept result: offer to take the hex
const _rp=UI.replay;UI.replay=function(o){const r=_rp.apply(this,arguments);try{if(o&&/hex is still the horde/.test(o.sub||o.result||'')){const m=(o.result||o.sub).match(/near ([^.]+?) and beat/);
  const box=q('#modalBody .ibtns')||q('#modalBody');const h=G._lastIcept;if(box&&h&&!q('#takeHex23')){const b=document.createElement('button');b.id='takeHex23';b.className='fight';b.textContent='⚔️ Attack / claim that hex';b.onclick=()=>{UI.closeModal();UI.infoTile(h);};box.prepend(b);}}}catch(e){}return r;};
const _fsq=typeof findSquad==='function'?findSquad:null;if(_fsq){findSquad=function(){const r=_fsq.apply(this,arguments);try{if(r&&r.s&&r.s.pos)G._lastIcept=r.s.pos;}catch(e){}return r;};}
// ---------- 10 towers / outposts / stronghold explainers
function defText(kind){const T=BAL.tower,O=BAL.outpost,S=BAL.stronghold;
  if(kind==='tower'){let mine='';try{const ts=Object.values(W().towers||{});if(ts.length)mine=`<b>Your towers:</b> ${ts.map(t=>`Lv${t.level||1}: ${towerRadius(t)} ring${towerRadius(t)>1?'s':''} = ${hexRing(0,0,towerRadius(t)).length} hexes, power ${towerPower(t)}`).join(' · ')}. The hexes it protects are tinted gold inside the wall on the map.<br>`;}catch(e){}return`<div class="explain23">${mine}<b>🗼 What a tower does</b><br>Defends every hex in its ring: its own hex plus ${T.radius} ring around it at Lv1-2 (7 hexes), 2 rings at Lv3-4 (19), 3 rings at Lv5 (37). When the horde or raiders try to take a hex inside the ring, the defenses fight first: the power of every Stronghold, tower and outpost covering that hex is added up (teammates' count too). If it beats the attack, the hex holds. Fixed math, no luck.<br>Power ${T.power} at Lv1, +${T.powerPerLevel*100}% per level (Lv5 = ${Math.round(T.power*(1+T.powerPerLevel*4))}). +10% inside a fortified zone. Max towers = 1 + Stronghold level. Upkeep: free right now.</div>`;}
  if(kind==='op')return`<div class="explain23"><b>⛺ What an outpost does</b><br>A cheap forward camp. It claims its hex + the 6 around it (7 hexes) once you hold it for ${O.holdMin} min, then defends those 7 hexes with power ${O.power} + ${O.powerPerShLevel} per Stronghold level (yours now: ${outpostPower()}). Weaker and smaller than a tower, but it grabs land far from home. Max outposts: ${O.capBase} + 1 per ${O.capPerShLevels} Stronghold levels.</div>`;
  return`<div class="explain23"><b>🏰 What the Stronghold does</b><br>Your home. Defends ${S.radius} rings (19 hexes) at Lv1-3, 3 rings (37) at Lv4-6, 4 (61) at Lv7-9. Power ${S.basePower} + ${S.powerPerLevel} per level + half your hero's ATK+DEF. Higher levels allow more towers, outposts and pipelines.</div>`;}
const _inf=UI.info;UI.info=function(o){try{if(o&&typeof o.title==='string'&&!o._x23){const t=o.title;const k=/Outpost/.test(t)?'op':/Tower|🗼/.test(t)&&!/Water Tower/.test(t)?'tower':/Stronghold|🏰/.test(t)?'sh':null;if(k)o={...o,_x23:1,body:(o.body||'')+defText(k)};}}catch(e){}return _inf.call(this,o);};
HOOK.render(function(){try{if(this.tab!=='base'||(this.sub.base||'fort')!=='fort')return;const b=q('#sheetBody');b&&b.insertAdjacentHTML('beforeend',`<h3>📖 How defenses work</h3>${defText('sh')}${defText('tower')}${defText('op')}`);}catch(e){}});
// ---------- 11 troop moves on the map: stationing out + returning home (line, moving 🪖, card)
function homeHex(){try{return pipeOrigin()||marchFrom();}catch(e){return null;}}
function moves(){const now=Date.now(),out=[];try{const t=TP();for(const r of t.returning||[]){if(r.at<=now)continue;const st=r.st||now-1000,a=r.fromLL||(r.from?hexCenter(...idQR(r.from)):null),h=homeHex();if(!a||!h)continue;out.push({kind:'back',n:r.n,a,b:hexCenter(...idQR(h)),f:Math.min(1,(now-st)/Math.max(1,r.at-st)),eta:r.at-now,dest:'Home',to:h});}
  for(const [h,s] of Object.entries(stationed())){if(!s.at||s.at<=now||!s.from)continue;const st=s.st||now-1000;out.push({kind:'out',n:s.n,a:hexCenter(...idQR(s.from)),b:hexCenter(...idQR(h)),f:Math.min(1,(now-st)/Math.max(1,s.at-st)),eta:s.at-now,dest:hexName(h),to:h});}}catch(e){}return out;}
function drawMoves(){if(typeof map==='undefined')return;if(!G.layers.mv23)G.layers.mv23=L.layerGroup().addTo(map);const g=G.layers.mv23;g.clearLayers();
  for(const m of moves()){const c=m.kind==='back'?'#9fd0ff':(P.color||'#e6c46a'),p=[m.a[0]+(m.b[0]-m.a[0])*m.f,m.a[1]+(m.b[1]-m.a[1])*m.f];
    L.polyline([m.a,m.b],{color:'#120d08',weight:9,opacity:.5,interactive:false,lineCap:'round'}).addTo(g);L.polyline([m.a,m.b],{color:c,weight:4,dashArray:'10 8',interactive:false,className:'mtrack'}).addTo(g);
    L.marker(p,{icon:L.divIcon({className:'lodm',html:`<div class="mv23">${m.kind==='back'?'↩️':'🛡️'} 🪖${m.n}<i>${fmtDur(m.eta)}</i></div>`,iconSize:[0,0]}),interactive:false,zIndexOffset:950}).addTo(g);}}
setInterval(()=>{try{if(P&&P.world)window.drawMoves();}catch(e){}},1000);
const _mc=mcardsDraw;mcardsDraw=function(){_mc.apply(this,arguments);try{const box=q('#mcards');const ms=moves().filter(m=>m.kind==='back');if(!ms.length)return;box.classList.remove('quiet');
  box.insertAdjacentHTML('beforeend',ms.map(m=>`<div class="mcard v21 sup" data-to="${m.to}"><div class="l1"><b>↩️ RETURNING</b><em>🪖 ${m.n}</em></div><div class="l2">→ Home · <i>${fmtDur(m.eta)}</i></div><div class="pb"><s style="width:${Math.round(m.f*100)}%"></s></div></div>`).join(''));}catch(e){}};
// ---------- 12 reinforced hexes: shield outline + tint + troop badge, for every teammate's garrison (synced in member docs)
function drawGar(){if(typeof map==='undefined'||!P.world)return;if(!G.layers.gar23)G.layers.gar23=L.layerGroup().addTo(map);const g=G.layers.gar23;g.clearLayers();if(map.getZoom()<13)return;const now=Date.now(),hx={};
  try{for(const [h,s] of Object.entries(stationed()))if(s.n>0&&(!s.at||s.at<=now))hx[h]=(hx[h]||0)+s.n;}catch(e){}
  try{for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||m.me||!Array.isArray(m.gar))continue;for(const x of m.gar)if(x&&x.hex&&x.n>0)hx[x.hex]=(hx[x.hex]||0)+(x.n|0);}}catch(e){}
  for(const [h,n] of Object.entries(hx)){const [qq,rr]=idQR(h);L.polygon(hexPoly(qq,rr),{color:'#7fd3ff',weight:4,opacity:.95,fillColor:'#7fd3ff',fillOpacity:.14,dashArray:'2 6',lineCap:'round',interactive:false}).addTo(g);
    L.marker(hexCenter(qq,rr),{icon:L.divIcon({className:'lodm',html:`<div class="gar23">🛡️ ${typeof kfmt==='function'?kfmt(n):n}</div>`,iconSize:[0,0]}),interactive:false,zIndexOffset:700}).addTo(g);}}
HOOK.draw(function(){try{window.drawGar();}catch(e){}});setInterval(()=>{try{window.drawGar();}catch(e){}},15000);setTimeout(()=>window.drawGar(),2000);
// ---------- horde target vs owner: tile card always says who owns the hex; a horde target is labeled separately
const _it23=UI.infoTile;UI.infoTile=function(id){const r=_it23.apply(this,arguments);try{const mb=q('#modalBody');if(!mb||mb.querySelector('.owner23'))return r;const o=G.terr&&G.terr[id],x=typeof factionAt==='function'?factionAt(id):null;
  const fort=typeof enemyAt==='function'&&enemyAt(id)&&!(W().enemyTaken&&W().enemyTaken[id]);
  const own=fort?['Raider Stronghold','#ff6b55']:P.tiles&&P.tiles[id]?['You','#4ad7ff']:x?[`Horde (${fdef(x.fid||x.id||'').name||'gang'})`,'#ff6b55']:o&&!o.released&&!o.ai?[o.by||'Ally',o.color||'#e6c46a']:o&&o.ai?['Raiders','#ff6b55']:['Nobody (free)','#bbb'];
  let tgt=0;try{for(const f of Object.values(FX().f||{}))for(const s of (f&&f.squads)||[])if(s&&s.target===id)tgt++;}catch(e){}
  const html=`<div class="owner23" style="border:1px solid ${own[1]};color:${own[1]}">Owner: ${esc(own[0])}</div>${tgt?`<div class="owner23" style="border:1px dashed #ff3b2f;color:#ffb3a8">🎯 Horde target: ${tgt} squad${tgt>1?'s are':' is'} planning to hit this hex. It is not theirs yet.</div>`:''}`;
  const anchor=mb.querySelector('.ibtns');anchor?anchor.insertAdjacentHTML('beforebegin',html):mb.insertAdjacentHTML('beforeend',html);}catch(e){}return r;};
// ---------- balance v23 (fixed math, no luck)
// (a) solo hero only vs lone bugs on your hex; horde hexes need a march. (b) every solo fight costs at least 15% max HP (regen 2 HP/10 s).
// (c) troops scale a march: more troops = smaller % lost (bigger troop unit soaks the same hits) + more loot (x1 + troops/2000, max x3), still capped by carry load.
const BAL23={soloMinHpPct:0.15,lootPer:2000,lootMax:3};window.BAL23=BAL23;
function lootMult(n){return Math.min(BAL23.lootMax,1+(n||0)/BAL23.lootPer);}window.lootMult=lootMult;
const _fm23=fightMutant;fightMutant=function(){const before=P.hp,mx=stats().hp;const r=_fm23.apply(this,arguments);try{if(P.hp<before||P.hp>=before){const cap=Math.max(1,before-Math.ceil(mx*BAL23.soloMinHpPct));if(P.hp>cap){P.hp=cap;save();UI.hud&&UI.hud();}}}catch(e){}return r;};
const _if23=UI.infoFaction;UI.infoFaction=function(id){_if23.apply(this,arguments);try{const b=[...document.querySelectorAll('#modalBody .ibtns button')].find(x=>/⚔️ Attack/.test(x.textContent)&&x.id!=='btnMarch');if(b){b.disabled=true;b.textContent='⚔️ Solo attack: no (send a march)';}
  const box=document.querySelector('#modalBody .ibtns');box&&box.insertAdjacentHTML('beforebegin','<p class="tiny mreq22">🚩 Horde hexes are taken by marches only. Win the march and the hex is yours. More troops = fewer lost and more loot.</p>');}catch(e){}};
const _rm23=returnMarch;returnMarch=async function(id,m){try{if(m&&m.loot&&m.troops>0&&!m._lm23){const k=lootMult(m.troops);for(const x in m.loot)m.loot[x]=Math.round(m.loot[x]*k);m._lm23=1;}}catch(e){}return _rm23.apply(this,arguments);};
document.addEventListener('click',e=>{if(!e.target.closest||!e.target.closest('#modalBody .troopsel button'))return;setTimeout(pred23,30);},true);
function pred23(){try{const btn=document.getElementById('btnMarch');const row=document.querySelector('#modalBody .troopsel')||btn;if(!btn)return;const id=G._m23to;if(!id)return;const n=G.troopSend||0,tg=marchTarget(id),mb=friendlyHex(id)&&!squadAt(id)?mobAt(id):null;
  const enemy=mb?()=>mutantUnits(mb.mid,mb.lvl):tg.units.length?()=>marchTarget(id).units:null;const el=enemy&&n?expectedLoss(n,enemy):null;const base=tg.loot||{},cap=marchLoad(n),k=lootMult(n);let loot=Object.entries(base).map(([r,v])=>[r,Math.round(v*k)]);const tot=loot.reduce((a,[,v])=>a+v,0);if(tot>cap)loot=loot.map(([r,v])=>[r,Math.floor(v*cap/tot)]);
  let p=document.getElementById('pred23');if(!p){p=document.createElement('div');p.id='pred23';p.className='pred23';row.after(p);}
  p.innerHTML=`<b>Predicted (fixed math):</b> ${enemy?(el?`${el.win?'✅ win':'💀 lose'} · ~${el.lost.toLocaleString()} troops lost (${n?Math.round(100*el.lost/n):0}%)`:'hero + escorts only'):'no defenders'} · loot ${loot.length?loot.map(([r,v])=>v+RES[r]).join(' '):'none'} (x${k.toFixed(2)})`;}catch(e){}}
const _amb23=addMarchBtn;addMarchBtn=function(id){G._m23to=id;const r=_amb23.apply(this,arguments);setTimeout(pred23,50);return r;};
window.drawGar=drawGar;window.drawMoves=drawMoves;window.hudAvatar=hudAvatar;window.moves=moves;
})();
