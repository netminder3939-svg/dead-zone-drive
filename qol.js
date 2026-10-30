// Stage 1d: tower rings by level, loss notices, inbox, reset countdown, upkeep warning, nearest list,
// drive mode + wake lock, haptics, placement preview, inventory sort/filter, leaderboards, markers, relocation, PWA.
function towerRadius(t){return towerRadiusAt((t&&t.level)||1);}
function towerRadiusAt(l){return BAL.tower.radius+Math.floor((l-1)/BAL.tower.levelsPerRing);}

// ---------- notification banner (non-blocking) ----------
UI.notice=function(html,btns=[]){const n=$('#notice');this._ncb=btns.map(b=>b[1]);
  n.innerHTML=`<div class="ntext">${html}</div>${btns.map((b,i)=>`<button onclick="UI._ncb[${i}]();$('#notice').classList.add('hidden')">${b[0]}</button>`).join('')}<button class="nx" onclick="$('#notice').classList.add('hidden')">✕</button>`;
  n.classList.remove('hidden');clearTimeout(this._nt);this._nt=setTimeout(()=>n.classList.add('hidden'),15000);};
function nearPlaceName(ids){if(!ids.length)return'your territory';const [lat,lng]=hexCenter(...idQR(ids[0]));let best=null,bd=3000;
  (G.landmarks||[]).forEach(l=>{const d=distM(lat,lng,l.lat,l.lng);if(d<bd){bd=d;best=l.name;}});return best||'your territory';}
// Undefended losses => simple notice. Defended fights => the full alert + replay.
const _attackAlert=UI.attackAlert.bind(UI);
UI.attackAlert=function(rep){if(!rep)return;const d=rep.detail||{},fights=(rep.fights||[]).filter(x=>x.f);
  if(!fights.length){W().unseen=(W().unseen||[]).filter(t=>t!==rep.t);save();
    const lost=d.lost||[];if(!lost.length)return;
    this.notice(`🚩 <b>${lost.length} tile${lost.length>1?'s':''} lost</b> near ${nearPlaceName(lost)}<br><small>Raiders took unprotected land. Build towers to guard it.</small>`,[['🗺️ View on map',()=>flashTiles(lost)]]);return;}
  _attackAlert(rep);};

// ---------- inbox ----------
function inboxUnread(){const w=W();return w.reports.filter(r=>r.t>(P.inboxSeen||0)).length;}
UI.inbox=function(){const w=W();P.inboxSeen=Date.now();save();UI.hud();this._ibx=w.reports.slice(0,40);
  this.modal(`<h2>🔔 Inbox</h2><p class="tiny">Everything that happened while you were away.</p>${this._ibx.map((r,i)=>`<div class="row"><div class="grow"><small>${when(r.t)}</small>${r.text}</div>
    ${(r.fights||[]).some(x=>x.f)?`<button onclick="playFights(UI._ibx[${i}],0)">▶️</button>`:''}${r.detail&&(r.detail.lost||[]).concat(r.detail.held||[]).length?`<button onclick="UI.closeModal();flashTiles(UI._ibx[${i}].detail.lost.concat(UI._ibx[${i}].detail.held))">🗺️</button>`:''}</div>`).join('')||'<p class="tiny">Nothing yet.</p>'}
    <button style="width:100%" onclick="UI.closeModal()">Close</button>`);};

// ---------- reset countdown + upkeep warning (status strip) ----------
function msToReset(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:BAL.reset.timeZone,hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return(86400-(+p.hour*3600+ +p.minute*60+ +p.second))*1000;}
function upkeepShort(){if(!P.world)return[];const e=expectedIncome();return Object.keys(RES).filter(k=>(P.res[k]||0)+e[k]<0);}
function statusStrip(){const el=$('#status');if(!el||!P.world)return;const inc=Object.values(expectedIncome()).reduce((a,b)=>a+b,0),sh=upkeepShort(),un=inboxUnread();
  el.innerHTML=`<span>🌅 Reset in <b>${fmtDur(msToReset()).replace(/ \d+s$/,'')}</b> · <b class="pos">${inc>=0?'+':''}${inc}</b></span>${sh.length?`<span class="warnchip" onclick="UI.open('base');UI.sub.base='terr';UI.render()">⚠️ Upkeep short: ${sh.map(k=>RES[k]).join('')}</span>`:''}`;
  const b=$('#btnInbox');if(b)b.dataset.n=un||'';}
setInterval(statusStrip,1000);

// ---------- nearest things ----------
UI.nearest=function(){if(!G.pos)return;const out=[],me=G.pos,add=(icon,name,sub,lat,lng,fn)=>out.push({icon,name,sub,d:distM(...me,lat,lng),lat,lng,fn});
  (G.monList||[]).forEach(m=>add('👾',MONSTERS[m.mid].name,'Lv'+m.lvl,m.lat,m.lng,()=>UI.infoMon(m.mid,m.lvl,m.key,m.lat,m.lng)));
  (G.landmarks||[]).filter(l=>isVis(hexAt(l.lat,l.lng).id)).forEach(l=>add(LANDMARK_KINDS[l.kind].icon,l.name,P.badges[l.id]?'badge ✓':'new badge',l.lat,l.lng,()=>UI.infoLandmark(l)));
  nearbyEnemies().filter(e=>isVis(e.id)).forEach(e=>{const [a,b]=hexCenter(...idQR(e.id));add('🏴','Raider Stronghold','Lv'+enemyStats(e).L,a,b,()=>UI.infoFort(e.id));});
  Object.values(G.raids).filter(r=>!r.done&&Date.now()<r.endsAt).forEach(r=>add('☠️',MONSTERS[r.bossId].name+' raid',mins(r.endsAt)+' left',r.lat,r.lng,()=>UI.infoRaid(r.id)));
  const h=hexAt(...me);hexRing(h.q,h.r,6).forEach(x=>{const t=tileInfo(x.id);if(t.res&&t.tier!=='common'&&!P.tiles[x.id]&&isVis(x.id)){const [a,b]=hexCenter(x.q,x.r);add(RES[t.res],`${t.tier} ${RESN2[t.res]} tile`,'+'+t.yield+'/day',a,b,()=>UI.infoTile(x.id));}});
  out.sort((a,b)=>a.d-b.d);this._near=out.slice(0,25);
  this.modal(`<h2>📍 Nearby</h2>${this._near.map((x,i)=>`<div class="row" onclick="const n=UI._near[${i}];UI.closeModal();map.setView([n.lat,n.lng],17);setTimeout(n.fn,300)"><span class="big-ico">${x.icon}</span><div class="grow"><b>${x.name}</b><small>${x.sub}</small></div><b>${x.d<1000?Math.round(x.d)+' m':(x.d/1000).toFixed(1)+' km'}</b></div>`).join('')||'<p class="tiny">Nothing revealed nearby yet. Explore!</p>'}<button style="width:100%" onclick="UI.closeModal()">Close</button>`);};

// ---------- haptics ----------
function buzz(p){try{navigator.vibrate&&navigator.vibrate(p);}catch(e){}}

// ---------- drive mode + wake lock ----------
G.drive={on:false,claimed:0,start:0,km:0};let _wake=null;
async function wakeOn(){try{if('wakeLock' in navigator){_wake=await navigator.wakeLock.request('screen');return true;}}catch(e){}return false;}
function wakeOff(){try{_wake&&_wake.release();}catch(e){}_wake=null;}
document.addEventListener('visibilitychange',()=>{if(G.drive.on&&document.visibilityState==='visible')wakeOn();});
async function toggleDrive(){G.drive.on=!G.drive.on;document.body.classList.toggle('drive',G.drive.on);UI.close();
  if(G.drive.on){G.drive.claimed=0;G.drive.start=Date.now();G.drive.km0=P.stats.meters;const ok=await wakeOn();toast(ok?'🚗 Drive mode: screen stays awake':'🚗 Drive mode (keep-awake not supported here)');if(G.pos)map.setView(G.pos,16);}
  else{wakeOff();toast(`Drive done: +${G.drive.claimed} hexes`);}driveHud();}
function driveHud(){const el=$('#drivehud');if(!el)return;if(!G.drive.on){el.classList.add('hidden');return;}el.classList.remove('hidden');
  const km=((P.stats.meters-(G.drive.km0||0))/1000).toFixed(1),min=Math.max(1,(Date.now()-G.drive.start)/60e3);
  el.innerHTML=`<div class="dstats"><div><b>${G.drive.claimed}</b><small>hexes claimed</small></div><div><b>${km}</b><small>km</small></div><div><b>${Object.keys(P.tiles).length}</b><small>total held</small></div></div><button class="big" onclick="toggleDrive()">■ End drive</button>`;}
setInterval(()=>{if(G.drive.on){driveHud();if(G.pos)map.panTo(G.pos,{animate:true});}},2000);

// ---------- placement preview ----------
G.preview=L.layerGroup();
function showPreview(id){G.preview.clearLayers().addTo(map);const ll=hexCenter(...idQR(id)),ring=k=>k*HEX_R*Math.sqrt(3)+HEX_R*.9;
  [[BAL.tower.radius,'#2a8fd6','Tower Lv1 ring'],[shRadius(),'#d6a03a','Stronghold ring']].forEach(([r,c])=>L.circle(ll,{radius:ring(r),color:c,weight:2,dashArray:'3 6',fillColor:c,fillOpacity:.08,interactive:false}).addTo(G.preview));
  const [q,r]=idQR(id);hexRing(q,r,BAL.tower.radius).forEach(x=>L.polygon(hexPoly(x.q,x.r),{color:'#2a8fd6',weight:1,fillColor:'#2a8fd6',fillOpacity:.18,interactive:false}).addTo(G.preview));}
const _closeModal=UI.closeModal.bind(UI);UI.closeModal=function(){G.preview.clearLayers();_closeModal();};
const _build=UI.build.bind(UI);UI.build=function(){_build();if(G.pos){showPreview(hexAt(...G.pos).id);map.setView(G.pos,16);
  $('#modalBody').insertAdjacentHTML('afterbegin','<p class="tiny prevnote">Preview: blue = tower ring (Lv1), gold = stronghold ring. Rings grow with upgrades.</p>');$('#modal').classList.add('peek');}};

// ---------- tactical markers (shared) ----------
G.markers={};
function drawMarkers(){if(!G.layers.mark)G.layers.mark=L.layerGroup().addTo(map);const g=G.layers.mark;g.clearLayers();
  Object.entries(G.markers).forEach(([id,m])=>{if(m.exp<Date.now())return;const T=BAL.markers.types[m.type]||['📍','Marker'],[lat,lng]=hexCenter(...idQR(m.hex));
    L.marker([lat,lng],{icon:L.divIcon({className:'lodm',html:`<div class="ico mark"><span>${T[0]}</span><b class="lv">${T[1]}</b></div>`,iconSize:[0,0]}),zIndexOffset:600}).on('click',()=>UI.infoMarker(id)).addTo(g);});}
UI.markPick=function(hex){this.info({title:'📌 Place a marker',sub:'Hex '+hex+' · visible to your alliance for '+BAL.markers.expireDays+' days',
  body:`<input id="mknote" class="fullin" placeholder="Note (optional)" maxlength="80">`,buttons:Object.entries(BAL.markers.types).map(([k,[i,n]])=>[i+' '+n,()=>{NET.addMarker({hex,type:k,note:($('#mknote').value||'').trim(),by:P.name,uid:P.uid,t:Date.now(),exp:Date.now()+BAL.markers.expireDays*864e5});allianceLog(`📌 ${P.name} marked a ${n}`);UI.closeModal();toast('Marker placed');}])});};
UI.infoMarker=function(id){const m=G.markers[id],T=BAL.markers.types[m.type];this.info({title:T[0]+' '+T[1],sub:`by ${m.by} · expires in ${fmtDur(m.exp-Date.now())}`,body:m.note?`<div class="row">${m.note}</div>`:'',buttons:[['🗑️ Remove',()=>{NET.delMarker(id);UI.closeModal();}]]});};

// ---------- stronghold relocation ----------
function relocateStronghold(){const w=W(),s=w.sh,id=hexAt(...G.pos).id,S=BAL.stronghold;if(!s||s.state!=='up')return toast('Stronghold must be standing');
  if(!P.tiles[id])return toast('Stand on a hex you own');if(id===s.hex)return toast('Already here');
  const cd=(s.relocAt||0)+S.relocateCooldownDays*864e5-Date.now();if(cd>0)return toast('Relocation cooldown: '+fmtDur(cd));
  if(!canPay(S.relocateCost))return toast('Not enough resources');pay(S.relocateCost);const dropped=releaseAreaHexes(id);s.hex=id;s.relocAt=Date.now();save();shClaimArea();drawWorld();allianceLog(`🚚 ${P.name} relocated their Stronghold`);toast(`🚚 Stronghold moved (level kept)${dropped?` · ${dropped} old area hexes released`:''}`);}
// Stage 1g fix: hexes you only got from the old Stronghold ring (never driven) are released when it moves.
function releaseAreaHexes(newHex){const[q,r]=idQR(newHex),keep=new Set(hexRing(q,r,shRadius()).map(x=>x.id));let n=0;
  for(const id of Object.keys(P.tiles))if(P.tiles[id].area&&!keep.has(id)){delete P.tiles[id];NET.claimHex(id,{by:'',released:true,t:Date.now()});n++;}return n;}

// ---------- PWA ----------
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{});
