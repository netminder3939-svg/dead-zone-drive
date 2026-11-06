// v26c (TEST) Clean cards, alliance tabs 10 -> 5, person card, horde target markers, Stronghold look, class picker (5 classes).
// Card rule: title line, at most 3 key numbers, a row of up to 3 buttons. Everything else (rules text, slots, timings) sits behind "ⓘ More".
const nn26=v=>Math.round(v||0).toLocaleString();
function garrison26(hex){try{const defs=activeDefs(hex);if(!defs.length)return null;const s=defSides25(defs);const players=s.guards.filter(g=>g.pow>0).map(g=>{const w=who26(g.uid);return{key:g.key,uid:g.uid,n:g.n||0,type:w.type,gear:w.gear,name:g.key==='home'?'Home garrison':w.name};});
  return fight26({bld:s.bld||bld26x(defs),players},{n:0});}catch(e){return null;}}
function bld26x(defs){const d=defs.find(x=>['sh','tower','op'].includes(x.kind));return d?{kind:d.kind,lvl:1}:null;}
window.garrison26=garrison26;
function cleanCard26(kind,ctx){const mb=$('#modalBody');if(!mb||mb.querySelector('.cc26')||G.markMode||mb.querySelector('input,textarea,select'))return;const ic=mb.querySelector('.icard');if(!ic)return;
  clearInterval(UI._fc8);mb.querySelectorAll('.fcount').forEach(e=>e.remove());
  const h2=ic.querySelector('h2'),title=h2?h2.innerHTML:'',sub=(ic.querySelector('.ihead .tiny')||{}).textContent||'',art=(ic.querySelector('.iart')||{}).innerHTML||'',chip=mb.querySelector('.tchip');
  let facts=[],extra='',bTitle=null,bSub=null;const btnBox=ic.querySelector('.ibtns')||mb;
  // de-dupe repeated text inside the details
  mb.querySelectorAll('.owner23').forEach(e=>{if(/Owner: You/.test(e.textContent))e.remove();});
  mb.querySelectorAll('.row small').forEach(e=>{if(/This hex is yours/.test(e.textContent))e.remove();});
  mb.querySelectorAll('.mreq22').forEach(e=>e.remove());
  const seenB=new Set();[...btnBox.querySelectorAll('button')].forEach(b=>{const t=b.textContent.trim();if(/^📌 Mark$/.test(t)){if(seenB.has(t))b.remove();seenB.add(t);}});
  if(kind==='tile'){const id=ctx,t=tileInfo(id),mine=!!P.tiles[id],b=typeof bldAt==='function'?bldAt(id):null;
    if(b){const r=garrison26(id),lv=b.k==='sh'?strongholdLevel():b.k==='tower'?(b.o.level||1):1;bTitle=`${{sh:'🏰 Stronghold',tower:'🗼 Watchtower',op:'⛺ Outpost'}[b.k]||'Building'} Lv${lv}`;bSub=`${b.own?P.name+' (you)':esc24(b.owner||'Ally')} · ${hexName(id)}`;
      if(r){facts=[[nn26(r.D)+'⚔','damage'],[nn26(r.H)+'❤','troop HP'],[Math.round(r.walls*100)+'%','walls block']];
        const pk=Object.entries(r.perks).filter(([,v])=>v>0).map(([k])=>k.charAt(0).toUpperCase()+k.slice(1));
        extra=`<div class="sec26">GARRISON · ${r.nTypes} OF 5 TYPES</div>${r.players.map(p=>`<div class="pl26"><span>${(C26.types[p.type]||{}).ico||'🪖'}</span><div class="grow"><b>${esc24(p.name)}</b> · ${(CLASSES.list[p.type]||{}).name||p.type} · ${nn26(p.n)}</div><b>${nn26(p.dmg)}⚔</b></div>`).join('')||'<p class="tiny">No troops inside. The walls and fire still fight.</p>'}
          <p class="tiny">${pk.length?'Perks on: '+pk.join(', ')+'. ':''}${r.nTypes<5?'+1 type = '+(r.nTypes>=2?'mix bonus':'closer to the mix bonus (3+ types)'):''}</p>`;}
      else facts=[['Lv'+lv,'level'],[b.own?'Yours':esc24(b.owner||'Ally'),'owner']];}
    else{const g=(typeof stationedAt==='function'?stationedAt(id):0)+((typeof allyGarAt==='function'?allyGarAt(id):[]).reduce((a,x)=>a+(x.n||0),0));
      const o=G.terr&&G.terr[id];if(!mine&&o&&!o.ai&&o.uid&&!isMe(o.uid))bSub=`Held by ${esc24(o.by||who24(o.uid).name||'Ally')}${t.res?` · Yields ${t.yield}${RES[t.res]} a night for them`:''}`;
      if(t.res)facts.push([`${t.yield}${RES[t.res]}`,mine?`nightly · you keep ${t.yield-Math.round(t.yield*BAL.reset.allianceShare)}`:'nightly']);
      facts.push([g?'🪖 '+nn26(g):'none','guarding']);try{facts.push([zoneTitle(zoneIdOf(id)),'zone']);}catch(e){}}}
  else if(kind==='mon'){const [mid,lvl,key,lat,lng]=ctx,M=MONSTERS[mid]||{};const d=G.pos?distM(G.pos[0],G.pos[1],lat,lng):0;
    facts=[['Lv'+lvl,'level'],[d<1000?Math.round(d)+' m':(d/1000).toFixed(1)+' km','away'],[Object.entries(M.drops||{}).map(([k,v])=>v+RES[k]).join(' ')||'–','drops']];}
  else if(kind==='sh'){const w=W(),s=w.sh;const r=s?garrison26(s.hex):null;if(r)facts=[[nn26(r.D)+'⚔','damage'],[nn26(r.H)+'❤','troop HP'],[Math.round(r.walls*100)+'%','walls block']];}
  // up to 3 buttons on top
  const pri=[...btnBox.querySelectorAll('button')].filter(b=>!b.closest('.seg')&&!b.closest('.troopsel3')&&!/^Close$|^✕/.test(b.textContent.trim())&&!b.closest('.s4btns')&&!b.classList.contains('m2markb'));
  const top=pri.filter(b=>!b.disabled).slice(0,3);if(!top.length&&pri[0])top.push(pri[0]);
  const wrap=document.createElement('div');wrap.className='cc26';
  wrap.innerHTML=`<div class="cch26">${art?`<div class="cca26">${art}</div>`:''}<div class="grow"><h2>${bTitle||title}${chip&&!bTitle?` <span class="ccb26">${chip.textContent}</span>`:''}</h2><small>${bSub||esc24(sub)}</small></div><button class="ccx26" onclick="UI.closeModal()">✕</button></div>
    ${facts.length?`<div class="big26">${facts.slice(0,3).map(([v,l])=>`<div><b>${v}</b><small>${l}</small></div>`).join('')}</div>`:''}${extra}<div class="ccbtn26"></div>`;
  const row=wrap.querySelector('.ccbtn26');top.forEach(b=>{b.classList.add('ccmv26');row.appendChild(b);});
  const det=document.createElement('details');det.className='more26';det.innerHTML='<summary>ⓘ More</summary>';
  [...mb.childNodes].forEach(n=>det.appendChild(n));if(chip)chip.remove();if(h2)h2.closest('.ihead')&&h2.closest('.ihead').remove();
  mb.appendChild(wrap);mb.appendChild(det);mb.classList.add('clean26');
  const trim=()=>{const r=mb.querySelector('.ccbtn26'),d=mb.querySelector('details.more26');if(!r||!d)return;[...r.children].forEach((c,i)=>{if(i>=3||!c.classList.contains('ccmv26'))d.insertBefore(c,d.children[1]||null);});};
  trim();setTimeout(trim,60);setTimeout(trim,400);}
window.cleanCard26=cleanCard26;
const _it26=UI.infoTile;UI.infoTile=function(id){const r=_it26.apply(this,arguments);try{cleanCard26('tile',id);}catch(e){console.warn('cc26',e);}return r;};
const _im26=UI.infoMon;UI.infoMon=function(mid,lvl,key,lat,lng){const r=_im26.apply(this,arguments);try{cleanCard26('mon',[mid,lvl,key,lat,lng]);}catch(e){console.warn('cc26m',e);}return r;};
const _is26=UI.infoStruct;UI.infoStruct=function(kind){const r=_is26.apply(this,arguments);try{cleanCard26(kind==='sh'?'sh':'tile',arguments[1]);}catch(e){}return r;};
// march preview inside More must keep working: when a card's march button is pressed from the top row the troop picker is still in More
// ---------- alliance tabs 10 -> 5 ----------
const AT26={crew:{n:'👥 Crew',parts:['over','members','roster']},chat:{n:'💬 Chat',parts:['chat','act']},zones:{n:'🏳️ Zones',parts:['zones']},goals:{n:'🏆 Goals',parts:['miles','ops','board']},hoard:{n:'📦 Hoard',parts:['bank']}};
UI.SUBS.alliance=Object.entries(AT26).map(([k,v])=>[k,v.n]);
const _rd26=UI.render;UI.render=function(){if(this.tab!=='alliance')return _rd26.apply(this,arguments);if(!AT26[this.sub.alliance])this.sub.alliance='crew';const key=this.sub.alliance,parts=AT26[key].parts;
  if(parts.length===1&&parts[0]===key)return _rd26.apply(this,arguments);
  const out=[];const subs=UI.SUBS.alliance;let nav='';
  try{for(const p of parts){this.sub.alliance=p;UI.SUBS.alliance=[[p,p]];_rd26.apply(this,arguments);const b=$('#sheetBody');if(!b)continue;const sg=b.querySelector(':scope > .seg');if(sg)sg.remove();out.push(`<section class="part26 p-${p}">${b.innerHTML}</section>`);}}
  finally{this.sub.alliance=key;UI.SUBS.alliance=subs;}
  const b=$('#sheetBody');if(!b)return;b.innerHTML=this.subnav('alliance')+out.join('');
  if(key==='chat'){try{chatPaint();}catch(e){}const a=b.querySelector('.p-act h2');if(a)a.textContent='📣 Crew activity';}
  if(key==='crew'){const r=b.querySelector('.p-roster');const m=b.querySelector('.p-members');if(m&&r){r.remove();}try{people26(b);}catch(e){}}};
// ---------- person card ----------
function people26(b){const mem=(G.al&&G.al.members)||{};const list=Object.entries(mem).sort((a,c)=>(c[1].hexes||0)-(a[1].hexes||0));
  const box=b.querySelector('.p-members');if(!box)return;
  // Replace the stock Members rows (was appending → looked like 2 accounts per player)
  const keep=[];const h2=box.querySelector('h2');if(h2)keep.push(h2.outerHTML);
  box.innerHTML=keep.join('')+`<p class="tiny">Tap a name for their card.</p>`+(list.length?list.map(([uid,m])=>`<div class="rp26" onclick="UI.person26('${uid}')"><span class="ri">${typeof av24==='function'?av24(uid,26):'👤'}</span><div class="grow"><b>${esc24(isMe(uid)?P.name+' (you)':m.name||'Teammate')}</b><small>${(CLASSES.list[type26(m.cls)]||{}).name||'No class'} · Lv${m.lvl||'?'} · ${nn26(m.hexes||m.tiles||0)} hexes</small></div><span class="chev">›</span></div>`).join(''):'<p class="tiny">No crew mates yet.</p>');}
UI.person26=function(uid){const m=((G.al&&G.al.members)||{})[uid]||{},me=isMe(uid),w=who26(uid),k=CLASSES.list[w.type]||{};
  const gar=me?Object.entries(stationed()).map(([h,s])=>({hex:h,n:s.n})):(m.gar||[]);const mar=Object.values(G.marches||{}).filter(x=>x.uid===uid);
  this.modal(`<div class="cc26"><div class="cch26"><div class="cca26">${typeof av24==='function'?av24(uid,44):'👤'}</div><div class="grow"><h2>${esc24(me?P.name:m.name||'Teammate')}</h2><small>${k.icon||''} ${k.name||'No class'} · Lv${me?P.lvl:m.lvl||'?'}</small></div><button class="ccx26" onclick="UI.closeModal()">✕</button></div>
   <div class="big26"><div><b>${nn26(me?Object.keys(P.tiles).length:m.hexes||m.tiles||0)}</b><small>hexes</small></div><div><b>${nn26(gar.reduce((a,g)=>a+(g.n||0),0))}</b><small>troops guarding</small></div><div><b>${mar.length}</b><small>marches out</small></div></div>
   ${gar.length?`<div class="sec26">GUARDING</div>${gar.slice(0,6).map(g=>`<div class="r24" onclick="UI.closeModal();marchGo('${g.hex}')"><span>🛡 ${hexName(g.hex)}</span><b>${nn26(g.n)} ›</b></div>`).join('')}`:''}
   ${mar.length?`<div class="sec26">MARCHING</div>${mar.slice(0,6).map(x=>`<div class="r24"><span>🚩 ${hexName(x.to)}</span><b>${nn26(x.troops||0)}</b></div>`).join('')}`:''}</div>`);};
// ---------- horde target markers: one marker per threatened hex ----------
drawIntents=function(){if(typeof map==='undefined'||!P.world||!FX().f)return;if(!G.layers.intent)G.layers.intent=L.layerGroup().addTo(map);const g=G.layers.intent;g.clearLayers();if(map.getZoom()<13)return;
  const T={},now=Date.now(),step=(HB().stepMin||10)*60e3;let pipeHex=new Set();try{for(const p of pipes())(p.route||[]).forEach(h=>pipeHex.add(h));for(const m of Object.values((G.al&&G.al.members)||{}))(m.gar||[]).forEach(x=>(x.route||[]).forEach(h=>pipeHex.add(h)));}catch(e){}
  for(const [fid,f] of Object.entries(FX().f)){for(const s of (f&&f.squads)||[]){if(!s||!s.target||!isVis(s.target))continue;const i=(s.path||[]).indexOf(s.target);const eta=Math.max(0,(s.restUntil||0)-now)+((i>=0?i:(s.path||[]).length)+1)*step;
      (T[s.target]=T[s.target]||[]).push({fid,s,eta,name:(fdef(fid)||{}).name||'Horde'});}}
  for(const [h,L2] of Object.entries(T)){const [q,r]=idQR(h),c=hexCenter(q,r);L.polygon(hexPoly(q,r),{color:'#ff3b2f',weight:2.5,opacity:.9,fill:false,dashArray:'4 6',interactive:false}).addTo(g);
    const b=typeof bldAt==='function'&&bldAt(h),ico=b?'🏰':pipeHex.has(h)?'✂️':'🎯',eta=Math.min(...L2.map(x=>x.eta)),ring=eta<15*60e3?'r':eta<3600e3?'o':'y';
    const lab=L2.length>1?`${L2.length} threats`:`${esc24(L2[0].name)} · ${fmtDur(eta).replace(/ \d+s$/,'')}`;
    L.marker(c,{icon:L.divIcon({className:'lodm',html:`<div class="ht26 ${ring}"><span class="hi">${ico}</span><b>${lab}</b></div>`,iconSize:[0,0]}),zIndexOffset:690}).on('click',()=>{try{UI.infoSquad(L2[0].fid,L2[0].s.id);}catch(e){UI.infoTile(h);}}).addTo(g);}};
// v22 drew a tiny red dot on every horde hex; those are the "weird little circles" -> gone (the hex fill already shows horde land)
try{if(typeof drawHordeDots==='function')drawHordeDots=function(){};}catch(e){}
// ---------- Stronghold look: glowing hex, double wall, crew flag, big name + level plate, HP bar. Tier look at Lv4 and Lv7 ----------
function shHTML26(uid,lv,hp,name){const w=who24(uid),tier=lv>=7?3:lv>=4?2:1;return`<div class="sh26 t${tier}" style="--c:${esc24(w.color||'#ffc94a')}"><div class="shk26">${flag24?flag24(w.flag,26,w.color):''}<span class="kp">🏰</span></div>
  <div class="shn26">${esc24(name)} · LV${lv}</div><div class="shhp26"><i style="width:${Math.round((hp==null?1:hp)*100)}%"></i></div></div>`;}
window.SH26=true;
function drawSh26(){if(typeof map==='undefined'||!P.world)return;if(!G.layers.sh26)G.layers.sh26=L.layerGroup().addTo(map);const g=G.layers.sh26;g.clearLayers();if(map.getZoom()<12)return;
  const add=(hex,uid,lv,hp,name,click)=>{const [q,r]=idQR(hex),c=hexCenter(q,r),col=who24(uid).color||'#ffc94a';
    L.polygon(hexPoly(q,r),{color:'#120d08',weight:9,opacity:.8,fillColor:col,fillOpacity:.38,interactive:false}).addTo(g);L.polygon(hexPoly(q,r),{color:col,weight:4,opacity:1,fill:false,interactive:false}).addTo(g);
    L.circle(c,{radius:HEX_R*1.05,color:col,weight:2,opacity:.85,dashArray:'6 4',fill:false,interactive:false}).addTo(g);
    L.marker(c,{icon:L.divIcon({className:'lodm',html:shHTML26(uid,lv,hp,name),iconSize:[0,0]}),zIndexOffset:620}).on('click',click).addTo(g);};
  const s=P.world.sh;if(s&&s.state!=='down')add(s.hex,P.uid,strongholdLevel(),s.hpPct??1,P.name,()=>UI.infoStruct('sh'));
  const mine=P.world.sh&&P.world.sh.state!=='down'?P.world.sh.hex:null;
  for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||m.me||!Array.isArray(m.defs))continue;for(const d of m.defs)if(d&&d.k==='sh'&&typeof d.hex==='string'&&d.hex!==mine)add(d.hex,uid,d.lv||d.level||m.shL||1,d.hp??1,m.name||'Ally',()=>UI.infoTile(d.hex));}}
HOOK.draw(function(){try{drawSh26();}catch(e){console.warn('sh26',e);}});
setTimeout(()=>{try{drawWorld();}catch(e){}},1500);
// ---------- class picker: 5 classes = 5 troop types ----------
HOOK.render(function(){try{if(this.tab!=='player'||this.sub.player!=='class')return;const b=$('#sheetBody');if(!b||b.querySelector('.cls26'))return;
  b.querySelectorAll('.clscard').forEach(c=>{const id=Object.keys(CLASSES.list).find(k=>c.querySelector('h3')&&c.querySelector('h3').textContent.includes(CLASSES.list[k].name));const t=C26.types[id];if(t)c.querySelector('h3').insertAdjacentHTML('beforeend',` <small class="cls26">${t.ico} ${t.role} · ${t.hp}❤ ${t.atk}⚔</small>`);});
  const g=myGear26(),gs=(g.atk||0)+(g.def||0)+(g.hp||0)/4,bo=Math.min(5,Math.floor(gs/40));
  b.insertAdjacentHTML('beforeend',`<p class="tiny cls26">Your class decides your troop type. Switching takes ${CLASSES.switchHours}h and converts your troops 1:1. Gear score ${Math.round(gs)} → your perk +${bo}% (max +5%).</p>`);}catch(e){}});
// ---------- profile: "Ember Crown" was listed twice ----------
const _pf26=UI.profile;if(_pf26)UI.profile=function(){_pf26.apply(this,arguments);try{const seen=new Set();document.querySelectorAll('#modalBody [title],#modalBody button').forEach(e=>{const t=(e.getAttribute('title')||'');if(!/Crown|Raven|flag/i.test(t))return;if(seen.has(t))e.remove();seen.add(t);});}catch(e){}};
// ---------- v26 fresh start: Stronghold yes, resources zero (Jacob Nov 4) ----------
// v26d: one account = one Stronghold. Never place on the Rathdrum GPS-fallback; when real GPS
// attaches, move the starter Stronghold there (free, once) instead of spawning a second base/character.
function gpsReady26(){try{if(G.dev&&(G.dev.hold||G.dev.walk||G.dev.drive||G.dev.tp))return true;
  if(G.gps&&G.gps.fallback)return false; // still on the 12s preview fallback spot
  if(G.gps&&(G.gps.state==='ok'||G.gps.state==='weak')&&G.gps.t)return true;
  if(G.gps&&G.gps.state==='dev')return true;}catch(e){}return false;}
function relocateStartSh26(id){const s=W().sh;if(!s||s.state==='down'||s.hex===id)return false;
  try{if(typeof releaseAreaHexes==='function')releaseAreaHexes(id);}catch(e){}
  s.hex=id;s.state=s.state||'up';s.hpPct=s.hpPct??1;if(!P.tiles[id]){try{claimTile(id);}catch(e){}}
  try{shClaimArea();}catch(e){}P.startShMoved26=1;P.startSh26=1;save();try{pushMember();drawWorld();}catch(e){}
  toast('🚚 Stronghold moved to where you are (GPS locked in).');return true;}
function startHexFree26(id){try{if(typeof allyOwned==='function'&&allyOwned(id))return false;
  if(typeof allyBldNear==='function'&&allyBldNear(id,1))return false;
  const o=G.terr&&G.terr[id];if(o&&!o.released&&o.uid&&!isMe(o.uid)&&!o.ai)return false;}catch(e){}return true;}
function pickStartHex26(){let id=hexAt(...G.pos).id;if(startHexFree26(id))return id;
  const [q,r]=idQR(id);for(let ring=1;ring<=6;ring++){for(const x of hexRing(q,r,ring)){if(hexDist(x.id,id)===ring&&startHexFree26(x.id))return x.id;}}return id;}
function ensureStartSh26(){try{if(!P||!P.name||!G.pos)return;if(!gpsReady26())return;W();
  const id=pickStartHex26();if(!P.tiles[id]){try{claimTile(id);}catch(e){}}
  const s=W().sh;
  if(s&&s.state!=='down'){ // already have one: if it was parked on the fallback, move it once to real GPS
    if(!P.startShMoved26){const [la,ln]=hexCenter(...idQR(s.hex));if(distM(la,ln,...G.pos)>1500){relocateStartSh26(pickStartHex26());return;}}
    P.startSh26=1;P.startShMoved26=1;save();return;}
  if(P.startSh26)return; // flag set but SH missing — don't create a second character path; rebuild once here
  W().sh={hex:id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold=P.stronghold||{level:1};if(!P.stronghold.level)P.stronghold.level=1;
  P.startSh26=1;P.startShMoved26=1;save();try{shClaimArea();}catch(e){}try{pushMember();}catch(e){}try{drawWorld();}catch(e){}
  toast('🏰 Your Stronghold is up. Resources start at 0 — claim hexes and fight to grow.');}catch(e){console.warn('startSh26',e);}}
window.ensureStartSh26=ensureStartSh26;window.gpsReady26=gpsReady26;window.relocateStartSh26=relocateStartSh26;
setInterval(()=>{try{ensureStartSh26();}catch(e){}},1500);
// ---------- v26 pipelines (Jacob Nov 4): drive past a site to unlock it; build in-game (no pin). Cap = 1 per resource type. ----------
function unlockedSites26(){P.pipeUnlock26=P.pipeUnlock26||{};return P.pipeUnlock26;}
function unlockSite26(site){const U=unlockedSites26();if(!site||U[site.id])return false;U[site.id]={t:Date.now(),res:site.res,name:String(site.name||'').slice(0,40),hex:site.hex,lat:site.lat,lng:site.lng,kind:site.kind};save();
  toast(`⛓️ Unlocked ${site.name} (${RES[site.res]} ${site.res}). Build it in Base › Pipelines.`);try{if(UI.tab==='base'&&UI.sub.base==='pipes')UI.render();}catch(e){}return true;}
window.unlockSite26=unlockSite26;window.unlockedSites26=unlockedSites26;
function sitesDriveUnlock26(){if(!G.drive||!G.drive.on||!G.pos)return;const me=hexAt(...G.pos).id;
  for(const s of sitesNear()){if(unlockedSites26()[s.id])continue;const near=distM(G.pos[0],G.pos[1],s.lat,s.lng)<=Math.max(PIPE.pinM||75,120);
    if(near||s.hex===me)unlockSite26(s);}}
const _spPipe26=setPos;setPos=function(){const r=_spPipe26.apply(this,arguments);try{sitesDriveUnlock26();}catch(e){console.warn('pu26',e);}return r;};
// Cap: only 1 pipeline per resource type (no SH-level / max-3 caps)
pipeCap=function(){return Object.keys(PIPE.perHour||PIPE.sites||{a:1,b:1,c:1,d:1,e:1}).length;};
window.pipeCap=pipeCap;
const _cbp26=canBuildPipe;canBuildPipe=function(site){if(!site)return'Not a supply site';
  if(!unlockedSites26()[site.id])return'Drive past this site first to unlock it';
  if(pipes().some(p=>p.res===site.res&&pipeState(p)!=='expired'))return`You already have a ${site.res} pipeline (1 per resource type)`;
  const o=pipeOrigin();if(!o)return'Place your Stronghold first';
  if(pipes().some(p=>p.site===site.id&&pipeState(p)!=='expired'))return'You already have a line to this site';
  if(!allied(site.hex))return'The crew must hold the site hex first';
  const [a,b]=hexCenter(...idQR(o));if(distM(a,b,site.lat,site.lng)>PIPE.maxKm*1000)return`Too far from your Stronghold (max ${PIPE.maxKm} km)`;
  if(!canPay(PIPE.cost))return'Need '+Object.entries(PIPE.cost).map(([k,v])=>v+RES[k]).join(' ');return null;};
window.canBuildPipe=canBuildPipe;
// Build goes ONLINE immediately — no map pin / drive-to-activate step
buildPipe=function(siteId){let site=sitesNear().find(s=>s.id===siteId);if(!site){const u=unlockedSites26()[siteId];if(u&&u.hex!=null)site={id:siteId,name:u.name,res:u.res,hex:u.hex,lat:u.lat,lng:u.lng,kind:u.kind};}
  const why=canBuildPipe(site);if(why)return toast(why);pay(PIPE.cost);
  const route=marchTrack(pipeOrigin(),site.hex).slice(0,PIPE.maxRoute);
  pipes().push({id:'p'+Date.now(),site:site.id,name:site.name,res:site.res,hex:site.hex,lat:site.lat,lng:site.lng,route,st:'online',onT:Date.now(),lastPay:Date.now(),t:Date.now(),acc:0,total:0});
  save();try{pushMember();}catch(e){}allianceLog(`⛓️ ${P.name} built a ${site.res} pipeline to ${site.name} (+${PIPE.perHour[site.res]}${RES[site.res]}/hr)`);
  UI.closeModal&&UI.closeModal();drawPipes();
  UI.info({title:'⛓️ Pipeline online',sub:site.name,body:`<p>+${PIPE.perHour[site.res]}${RES[site.res]} every hour, plus +${PIPE.tileBoost*100}% ${RES[site.res]} from your own hexes.</p><p class="tiny">1 pipeline per resource type. Keep the route clear: if the horde takes a hex on it, the line is cut until the crew retakes it.</p>`,buttons:[['Done',()=>UI.closeModal()]]});};
window.buildPipe=buildPipe;
// skip the old pin-setup card — go straight to build
window.pipeSetup=function(id){buildPipe(id);};
// landmark + Base › Pipelines copy
const _ilPipe26=UI.infoLandmark;UI.infoLandmark=function(l){_ilPipe26.apply(this,arguments);try{const s=siteOf(l);if(!s)return;const box=$('#modalBody .pipesite');if(!box)return;
  const unlocked=!!unlockedSites26()[s.id],mine=pipes().find(p=>p.site===s.id&&pipeState(p)!=='expired'),why=mine?null:canBuildPipe(s);
  const small=box.querySelector('small');if(small)small.innerHTML=mine?`Your pipeline: ${pipeState(mine)}`
    :unlocked?`Unlocked · build from your Stronghold for +${PIPE.perHour[s.res]}${RES[s.res]}/hr and +${PIPE.tileBoost*100}% ${s.res} from your hexes. Cap: 1 ${s.res} line.${why?`<br>🔒 ${why}`:''}`
    :`Drive past this site to unlock it, then build in Base › Pipelines. Cap: 1 pipeline per resource type.`;
  const btn=box.querySelector('button.btn-primary');if(btn&&!mine){btn.disabled=!!why;btn.textContent=unlocked?(why||`Build ${Object.entries(PIPE.cost).map(([k,v])=>v+RES[k]).join(' ')}`):'🔒 Drive past to unlock';}}catch(e){}};
HOOK.render(function(){try{if(this.tab!=='base'||this.sub.base!=='pipes')return;const b=$('#sheetBody');if(!b)return;
  const h=b.querySelector('h2');if(h){const mine=pipes().filter(p=>pipeState(p)!=='expired');const by={};mine.forEach(p=>by[p.res]=1);h.innerHTML=`⛓️ Pipelines <small class="lv">${Object.keys(by).length} / ${pipeCap()} types</small>`;}
  const tip=b.querySelector('p.tiny');if(tip&&/drive to the pin|Drive mode/i.test(tip.textContent))tip.innerHTML=`Drive past a supply site to <b>unlock</b> it, then build here. No map pin. Online lines pay every hour and boost that resource from your hexes. <b>Cap: 1 pipeline per resource type</b> (fuel, water, food, scrap, parts). Upkeep ${PIPE.upkeep.parts}⚙️/day each. If the horde takes a hex on the route, the line is cut.`;
  // list unlocked-but-not-built sites first
  const U=unlockedSites26(),mine=pipes().filter(p=>pipeState(p)!=='expired');
  // v26-8: show unlocks even when the landmark is not currently in sitesNear() (OSM miss / landmarks not loaded yet)
  const unlocked=[...new Set([...Object.keys(U),...sitesNear().filter(s=>U[s.id]).map(s=>s.id)])]
    .map(id=>{let s=sitesNear().find(x=>x.id===id);if(!s){const u=U[id];if(u&&u.hex!=null)s={id,name:u.name,res:u.res,hex:u.hex,lat:u.lat,lng:u.lng,kind:u.kind};}return s;})
    .filter(s=>s&&!mine.some(p=>p.site===s.id));
  if(unlocked.length&&!b.querySelector('.pu26')){b.insertAdjacentHTML('beforeend',`<h3 class="pu26">Unlocked · ready to build</h3>${unlocked.map(s=>{const why=canBuildPipe(s);return`<div class="row"><span class="pdot" style="background:${PIPE.color[s.res]}"></span><div class="grow"><b>${(LANDMARK_KINDS[s.kind]||{}).icon||'⛓️'} ${m2esc(s.name)}</b><small>${RES[s.res]} +${PIPE.perHour[s.res]}/hr · unlocked${why?' · 🔒 '+why:''}</small></div><button ${why?'disabled':''} onclick="buildPipe('${s.id}')">Build</button></div>`;}).join('')}`);}
  else if(!unlocked.length&&!b.querySelector('.pu26empty')&&Object.keys(U).length){b.insertAdjacentHTML('beforeend',`<p class="tiny pu26empty">Unlocks saved (${Object.keys(U).length}) but none are buildable right now — take the site hex or gather the build cost.</p>`);}
}catch(e){console.warn('pipes26ui',e);}});

try{if(typeof HOME25!=='undefined'&&HOME25.presets){HOME25.presets['pv-rathdrum-crew']=HOME25.presets['rathdrum-crew'];}}catch(e){}
