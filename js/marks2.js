// v20 Map marking v2: crew orders and notes on the shared map. Built on the existing shared `markers` collection, so it needs
// NO Firestore rules change (create = your own uid + a hex; anyone in the crew may delete). Marks never expire (Nov 1 decision).
// Kinds: icon marks (attack, defend, rally, scout, build, danger, resources, note), ARROWS (from one hex to another: a move or
// attack order) and AREAS (a group of hexes: "hold this", "clear this"). Every mark can carry a note, who it's for, and a
// done state. Marking done = remove + re-add with done:true (allowed by the current rules).
const MARK2={never:8.64e15,noteLen:80,maxArea:40,
  types:{attack:['⚔️','Attack','#e0533a'],defend:['🛡️','Defend','#4a9be0'],rally:['🚩','Rally point','#e6c46a'],scout:['👁️','Scout','#8fd06b'],
    build:['🏗️','Build here','#c08a4a'],danger:['⚠️','Danger','#ff8a3a'],loot:['📦','Resources','#c9b27a'],note:['💬','Note','#d8cfb8'],
    arrow:['➡️','Arrow (move / attack)','#e0533a'],area:['⬡','Area','#e6c46a']},
  legacy:{target:'attack',outpost:'build',enemy:'danger',hub:'loot',waypoint:'rally'},
  orders:['attack','defend','rally','scout','build','arrow','area']};
function m2type(m){return MARK2.types[m.type]?m.type:(MARK2.legacy[m.type]||'note');}
function m2T(m){return MARK2.types[m2type(m)];}
function m2esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function m2live(m){return m&&typeof m.hex==='string'&&(m.exp||0)>Date.now()&&m.type!=='pipedrive';} // pipedrive = a system signal (pipes2.js), not a map mark
function memberNames(){const out=[];for(const [uid,m] of Object.entries((G.al&&G.al.members)||{}))if(m&&m.name)out.push(m.me||uid===P.uid?P.name:m.name);if(!out.includes(P.name))out.unshift(P.name);return [...new Set(out)];}

// ---------- placing ----------
G.markMode=null;G.markDraft=null; // markMode = type id while placing; draft = {from} for arrows, {hexes:[]} for areas
function startMark(type){G.markMode=type;G.markDraft=type==='area'?{hexes:[]}:{};UI.closeModal&&UI.closeModal();UI.close&&UI.close();markBanner();
  toast(type==='arrow'?'➡️ Tap the START hex, then the END hex':type==='area'?'⬡ Tap hexes to add them, then ✓ Done':`${MARK2.types[type][0]} Tap a hex to place it`);}
function stopMark(){G.markMode=null;G.markDraft=null;markBanner();drawMarkers();}
function markBanner(){let e=document.getElementById('markBanner');if(!G.markMode){e&&e.remove();return;}
  if(!e){e=document.createElement('div');e.id='markBanner';document.body.appendChild(e);}
  const T=MARK2.types[G.markMode],d=G.markDraft||{};
  const txt=G.markMode==='arrow'?(d.from?`➡️ Now tap the END hex`:`➡️ Tap the START hex`):G.markMode==='area'?`⬡ Area · ${(d.hexes||[]).length} hexes · tap to add/remove`:`${T[0]} Tap a hex for “${T[1]}”`;
  e.innerHTML=`<span>${txt}</span>${G.markMode==='area'&&(d.hexes||[]).length?'<button id="mbDone" class="btn-primary">✓ Done</button>':''}<button id="mbCancel" class="btn-ghost">Cancel</button>`;
  const dn=document.getElementById('mbDone');if(dn)dn.onclick=()=>markDetails({hex:d.hexes[0],hexes:d.hexes.slice()});document.getElementById('mbCancel').onclick=stopMark;}
function markTap(id){const t=G.markMode,d=G.markDraft;if(t==='arrow'){if(!d.from){d.from=id;markBanner();drawMarkers();return;}if(id===d.from)return toast('Pick a different END hex');return markDetails({hex:d.from,to:id});}
  if(t==='area'){const i=d.hexes.indexOf(id);if(i>=0)d.hexes.splice(i,1);else if(d.hexes.length<MARK2.maxArea)d.hexes.push(id);else toast(`Max ${MARK2.maxArea} hexes`);markBanner();drawMarkers();return;}
  markDetails({hex:id});}
function markDetails(base){const t=G.markMode,T=MARK2.types[t],who=memberNames();
  UI.info({title:`${T[0]} ${T[1]}`,sub:hexName(base.hex)+(base.to?' → '+hexName(base.to):'')+(base.hexes?` · ${base.hexes.length} hexes`:'')+' · the whole crew sees it',
    body:`<input id="m2note" class="fullin" maxlength="${MARK2.noteLen}" placeholder="${MARK2.orders.includes(t)?'Order, e.g. Hit at 6pm with 3k troops':'Note'}">
      ${MARK2.orders.includes(t)?`<label class="tiny">For <select id="m2who"><option value="">Everyone</option>${who.map(n=>`<option>${m2esc(n)}</option>`).join('')}</select></label>`:''}`,
    buttons:[['📌 Place',()=>{const note=(($('#m2note')||{}).value||'').trim().slice(0,MARK2.noteLen),w=(($('#m2who')||{}).value||'');
      const doc={...base,type:t,note,who:w,by:P.name,uid:P.uid,t:Date.now(),exp:MARK2.never,done:false};NET.addMarker(doc);
      allianceLog(`📌 ${P.name}: ${T[1]} at ${hexName(base.hex)}${w?' (for '+w+')':''}${note?' · '+note.slice(0,60):''}`);UI.closeModal();toast(`${T[0]} Placed for the crew`);stopMark();}],
      ['Cancel',()=>{UI.closeModal();stopMark();}]]});}
const _m2_it=UI.infoTile;UI.infoTile=function(id){if(G.markMode)return markTap(id);return _m2_it.apply(this,arguments);};
// a mark on the hex card: show crew marks here + "Mark" shortcut
HOOK.tile(function(id){try{if(G.markMode)return;const box=document.querySelector('#modalBody .ibtns');if(!box)return;
  const here=Object.entries(G.markers||{}).filter(([,m])=>m2live(m)&&(m.hex===id||m.to===id||(Array.isArray(m.hexes)&&m.hexes.includes(id))));
  if(here.length)box.insertAdjacentHTML('beforebegin',`<div class="row m2here"><div class="grow"><b>📌 Crew marks here</b>${here.map(([mid,m])=>`<small><a href="#" onclick="UI.closeModal();UI.infoMarker('${mid}');return false">${m2T(m)[0]} ${m2esc(m2T(m)[1])}${m.note?': '+m2esc(m.note):''}</a> · ${m2esc(m.by||'?')}${m.done?' · ✅ done':''}</small>`).join('')}</div></div>`);
  const b=document.createElement('button');b.className='btn-sec m2markb';b.textContent='📌 Mark';oneTap(b,()=>{UI.closeModal();markPicker(id);});box.appendChild(b);}catch(e){console.warn('mark card',e);}return;});
function markPicker(hex){UI.info({title:'📌 Mark the map',sub:hex?hexName(hex):'Pick what to mark, then tap the map',
  body:`<div class="m2grid">${Object.entries(MARK2.types).map(([k,[i,n,c]])=>`<button class="m2pick" style="border-color:${c}" onclick="m2pick('${k}','${hex||''}')"><span>${i}</span><small>${n}</small></button>`).join('')}</div>`,buttons:[['Cancel',()=>UI.closeModal()]]});}
function m2pick(k,hex){UI.closeModal();if(hex&&k!=='arrow'&&k!=='area'){G.markMode=k;G.markDraft={};return markDetails({hex});}startMark(k);if(hex&&k==='arrow'){G.markDraft.from=hex;markBanner();drawMarkers();}if(hex&&k==='area'){G.markDraft.hexes=[hex];markBanner();drawMarkers();}}

// ---------- drawing ----------
function m2poly(h){const [q,r]=idQR(h);return hexPoly(q,r);}
drawMarkers=function(){if(typeof map==='undefined')return;if(!G.layers.mark)G.layers.mark=L.layerGroup().addTo(map);const g=G.layers.mark;g.clearLayers();
  const done=m=>m.done?' m2done':'';
  for(const [id,m] of Object.entries(G.markers||{})){if(!m2live(m))continue;const k=m2type(m),T=MARK2.types[k],col=T[2];
    try{if(k==='area'&&Array.isArray(m.hexes)){m.hexes.slice(0,MARK2.maxArea).forEach(h=>L.polygon(m2poly(h),{color:col,weight:2,opacity:m.done?.35:.9,fillColor:col,fillOpacity:m.done?.06:.16,dashArray:'6 6',interactive:true}).on('click',()=>UI.infoMarker(id)).addTo(g));
        L.marker(hexCenter(...idQR(m.hexes[0])),{icon:L.divIcon({className:'lodm',html:`<div class="ico m2${done(m)}" style="--mc:${col}"><span>⬡</span><b class="nm">${m2esc((m.note||'Area').slice(0,22))}</b></div>`,iconSize:[0,0]}),zIndexOffset:620}).on('click',()=>UI.infoMarker(id)).addTo(g);continue;}
      if(k==='arrow'&&typeof m.to==='string'){const a=hexCenter(...idQR(m.hex)),b=hexCenter(...idQR(m.to));L.polyline([a,b],{color:col,weight:6,opacity:m.done?.35:.95,dashArray:m.done?'4 10':null,lineCap:'round',className:'m2arrow'}).on('click',()=>UI.infoMarker(id)).addTo(g);
        const pa=map.latLngToLayerPoint(a),pb=map.latLngToLayerPoint(b),ang=Math.atan2(pb.y-pa.y,pb.x-pa.x)*180/Math.PI;
        L.marker(b,{icon:L.divIcon({className:'lodm',html:`<div class="m2head${done(m)}" style="--mc:${col};transform:translate(-50%,-50%) rotate(${ang}deg)">▶</div>`,iconSize:[0,0]}),zIndexOffset:625}).on('click',()=>UI.infoMarker(id)).addTo(g);
        if(m.note)L.marker([(a[0]+b[0])/2,(a[1]+b[1])/2],{icon:L.divIcon({className:'lodm',html:`<div class="m2lab${done(m)}" style="--mc:${col}">${m2esc(m.note.slice(0,24))}</div>`,iconSize:[0,0]}),zIndexOffset:624}).on('click',()=>UI.infoMarker(id)).addTo(g);continue;}
      L.marker(hexCenter(...idQR(m.hex)),{icon:L.divIcon({className:'lodm',html:`<div class="ico m2${done(m)}" style="--mc:${col}"><span>${T[0]}</span><b class="nm">${m2esc((m.note||T[1]).slice(0,22))}${m.who?' → '+m2esc(m.who):''}</b></div>`,iconSize:[0,0]}),zIndexOffset:630}).on('click',()=>UI.infoMarker(id)).addTo(g);}catch(e){}}
  // draft preview while placing
  const d=G.markDraft;if(G.markMode&&d){const col=MARK2.types[G.markMode][2];if(d.from)L.polygon(m2poly(d.from),{color:col,weight:3,fillOpacity:.3,interactive:false}).addTo(g);(d.hexes||[]).forEach(h=>L.polygon(m2poly(h),{color:col,weight:3,fillColor:col,fillOpacity:.3,interactive:false}).addTo(g));}};
setTimeout(()=>{try{map.on('zoomend',()=>drawMarkers());}catch(e){}},0);
// ---------- mark card ----------
UI.infoMarker=function(id){const m=G.markers[id];if(!m)return;const T=m2T(m),k=m2type(m),age=fmtDur(Date.now()-(m.t||Date.now())).replace(/ \d+s$/,'');
  const re=patch=>{const {...doc}=m;Object.assign(doc,patch);NET.delMarker(id);NET.addMarker({...doc,uid:P.uid});UI.closeModal();};
  const btns=[];if(MARK2.orders.includes(k))btns.push(m.done?['↺ Reopen',()=>re({done:false,doneBy:''})]:['✅ Mark done',()=>{re({done:true,doneBy:P.name});allianceLog(`✅ ${P.name} completed: ${T[1]} at ${hexName(m.hex)}`);}]);
  btns.push(['🗺️ Show',()=>{UI.closeModal();map.setView(hexCenter(...idQR(m.to||m.hex)),Math.max(map.getZoom(),16));}]);
  if(k!=='area')btns.push(['🚩 Act here',()=>{UI.closeModal();_m2_it2.call(UI,m.to||m.hex);}]);
  btns.push(['🗑️ Remove',()=>UI.ask('Remove mark','Remove this mark for the whole crew?','Remove').then(ok=>{if(ok){NET.delMarker(id);UI.closeModal();}})]);
  this.info({title:`${T[0]} ${T[1]}${m.done?' · ✅ done':''}`,sub:`${m2esc(m.by||'?')} · ${age} ago${m.who?' · for '+m2esc(m.who):''}${m.doneBy?' · done by '+m2esc(m.doneBy):''}`,
    body:`${m.note?`<div class="row">${m2esc(m.note)}</div>`:''}<p class="tiny">${hexName(m.hex)}${m.to?' → '+hexName(m.to):''}${Array.isArray(m.hexes)?` · ${m.hexes.length} hexes`:''}</p>`,buttons:btns});};
UI.markPick=function(hex){markPicker(hex);}; // old entry points open the new picker

// ---------- Plan tab: orders board ----------
G.m2filter='open';
HOOK.render(function(){try{if(this.tab!=='plan')return;const b=$('#sheetBody');if(!b)return;
  const all=Object.entries(G.markers||{}).filter(([,m])=>m2live(m)).sort((a,b)=>(a[1].done-b[1].done)||((b[1].t||0)-(a[1].t||0)));
  const F={open:([,m])=>!m.done&&MARK2.orders.includes(m2type(m)),forme:([,m])=>!m.done&&(m.who===P.name),mine:([,m])=>m.uid===P.uid||m.by===P.name,all:()=>true};
  const list=all.filter(F[G.m2filter]||F.all),here=G.pos?hexAt(...G.pos).id:null;
  const chip=(k,l)=>`<button class="${G.m2filter===k?'on':''}" onclick="G.m2filter='${k}';UI.render()">${l}</button>`;
  const anchor=b.querySelector('.planbar')||null;(anchor||b).insertAdjacentHTML(anchor?'afterend':'beforeend',`<h2>📋 Orders & marks</h2><div class="row"><button class="btn-primary" style="flex:1" onclick="markPicker()">📌 Mark the map</button></div>
   <div class="seg">${chip('open','Open orders')}${chip('forme','For me')}${chip('mine','Mine')}${chip('all','All')}</div>
   ${list.map(([id,m])=>{const T=m2T(m);return`<div class="row m2row${m.done?' m2done':''}"><span class="m2ic" style="color:${T[2]}">${T[0]}</span><div class="grow"><b>${m2esc(T[1])}${m.who?' → '+m2esc(m.who):''}</b><small>${m.note?m2esc(m.note)+' · ':''}${m2esc(m.by||'?')} · ${hexName(m.hex)}${here?' · '+hexDist(here,m.hex)+' hexes':''}${m.done?' · ✅':''}</small></div><button onclick="UI.infoMarker('${id}')">Open</button></div>`;}).join('')||'<p class="tiny">Nothing here yet. Mark attack targets, rally points, areas to hold and arrows for moves. The whole crew sees them.</p>'}`);}catch(e){console.warn('orders board',e);}});
// ---------- heads-up when a teammate marks something for you or the crew ----------
G.m2seen=null;
setInterval(()=>{try{const ids=Object.keys(G.markers||{});if(G.m2seen===null){G.m2seen=new Set(ids);return;}
  for(const id of ids){if(G.m2seen.has(id))continue;G.m2seen.add(id);const m=G.markers[id];if(!m2live(m)||m.uid===P.uid||m.done)continue;const k=m2type(m);if(!MARK2.orders.includes(k))continue;
    if(!m.who||m.who===P.name){const T=m2T(m);toast(`${T[0]} ${m2esc(m.by)}: ${T[1]}${m.who?' for you':''}${m.note?' · '+m2esc(m.note.slice(0,40)):''}`);try{newsAdd('plan','stub',`${T[0]} ${m.by}: ${T[1]} at ${hexName(m.hex)}`,'mark:'+id);}catch(e){}try{UI.badge('plan',true);}catch(e){}}}}catch(e){}},3000);
