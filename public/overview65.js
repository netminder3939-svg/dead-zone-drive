// overview65 (R6.5 part B) The map zooms out to 10 so the whole 10 mi pay range fits on a phone.
//  13 and up: unchanged. 10-12 ("overview"): no hexes, grid, resources, monsters, landmarks, pipelines or march lines.
//  Only the pay-range area (when 📦 Pay range is on), your bases and HQ as small pins, allies' Strongholds and your own dot.
//  Entering overview takes the hex layers off the map once; leaving puts them back once and redraws once (no rebuild storms).
//  Map taps in overview never open a hex card, claim or march. Pickers jump to 13 first. Presentation only.
(function(){
  const OVZ=13,KEEP=new Set(['pay64','ov65']);
  const OV={on:false,off:[],pinKey:''};window.OV65=OV;
  const isOv=()=>map.getZoom()<OVZ;
  const g=G.layers.ov65=L.layerGroup();
  const ctr=id=>hexCenter(...idQR(id));
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // ---- pins (rebuilt only when what they show changes)
  function pinList(){const out=[],w=W(),s=w.sh;
    if(s&&s.hex)out.push({k:'sh',hex:s.hex,lv:strongholdLevel(),st:s.state,mine:1});
    for(const [id,o] of Object.entries(w.outposts||{}))if(o.state!=='down')out.push({k:'op',hex:id,kind:o.kind||'',st:o.state});
    try{const h=hqHex15&&hqHex15();if(h)out.push({k:'hq',hex:h,fall:!!(window.hqFall6&&hqFall6())});}catch(e){}
    for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||m.me||!Array.isArray(m.defs))continue;for(const d of m.defs)if(d&&d.k==='sh'&&typeof d.hex==='string')out.push({k:'ally',hex:d.hex,lv:d.lv||d.level||m.shL||1,uid,name:m.name||'Ally'});}
    return out;}
  function pinHTML(p){let art='',emo='';
    if(p.k==='sh'||p.k==='ally'){art=window.shArt65?shArt65(p.lv,'pin65',{emo:'🏰'}):'';emo='🏰';}
    else if(p.k==='op'){art=window.opArt65?opArt65(p.kind,'pin65',{emo:p.kind==='home'?'🏡':p.kind==='fwd'?'🚩':'⛺'}):'';emo=p.kind==='home'?'🏡':p.kind==='fwd'?'🚩':'⛺';}
    else{art=window.hqArt65?hqArt65('pin65',{emo:'🏛️'}):'';emo='🏛️';}
    const col=p.k==='ally'?((who24(p.uid)||{}).color||'#4ad7ff'):p.k==='sh'?(P.color||'#ffc94a'):p.k==='hq'?'#ffd24a':'#5fd068';
    return`<div class="pin65w k-${p.k}${p.st==='down'||p.fall?' gone':''}${p.st==='building'||p.st==='capturing'?' bld':''}" style="--pc:${esc(col)}">${art||`<span>${emo}</span>`}</div>`;}
  function drawPins(force){if(!OV.on)return;const L_=pinList(),key=JSON.stringify(L_)+'|'+Object.keys(window.PLACES||{}).length;if(!force&&key===OV.pinKey)return;OV.pinKey=key;g.clearLayers();
    for(const p of L_){const m=L.marker(ctr(p.hex),{icon:L.divIcon({className:'ov65',html:pinHTML(p),iconSize:[30,30],iconAnchor:[15,26]}),zIndexOffset:p.k==='sh'?900:700,keyboard:true,title:p.k==='ally'?`${p.name}'s Stronghold`:p.k==='sh'?'Your Stronghold':p.k==='hq'?'Alliance HQ':'Outpost'});
      m.on('click',e=>{L.DomEvent.stop(e);OV.mapTap=false;try{if(p.k==='sh')UI.infoStruct('sh');else if(p.k==='op')UI.infoOutpost(p.hex);else if(p.k==='hq')UI.hq15();else UI.infoTile(p.hex);}catch(e){console.warn('pin65',e);}});m.addTo(g);}}
  window.drawPins65=drawPins;
  // ---- the chip: unpaid hexes summary
  function chip(){let el=document.getElementById('ov65chip');const n=OV.on&&!document.getElementById('sup64bar')&&typeof supplyCount15==='function'?supplyCount15().off:0;
    if(!n){if(el)el.remove();return;}if(!el){el=document.createElement('div');el.id='ov65chip';document.body.appendChild(el);}
    const t=`📦 ${n} hex${n===1?'':'es'} outside pay range — zoom in to see`;if(el.textContent!==t)el.textContent=t;}
  // ---- enter / leave
  function enter(){OV.on=true;document.body.classList.add('ov65on');OV.off=[];
    for(const [k,lay] of Object.entries(G.layers)){if(KEEP.has(k)||!lay||!map.hasLayer(lay))continue;map.removeLayer(lay);OV.off.push(k);}
    try{if(G.preview&&map.hasLayer(G.preview)){map.removeLayer(G.preview);OV.off.push('#preview');}}catch(e){}
    if(!map.hasLayer(g))g.addTo(map);drawPins(true);ovStyle(true);chip();
    try{if(!localStorage.getItem('wl_ov65hint')){localStorage.setItem('wl_ov65hint','1');toast('🔭 Zoomed out: zoom in to see hexes.');}}catch(e){}}
  function leave(){OV.on=false;document.body.classList.remove('ov65on');if(map.hasLayer(g))map.removeLayer(g);g.clearLayers();OV.pinKey='';
    for(const k of OV.off){const lay=k==='#preview'?G.preview:G.layers[k];if(lay&&!map.hasLayer(lay))lay.addTo(map);}OV.off=[];ovStyle(false);chip();
    try{drawWorld();}catch(e){}try{drawLandmarks&&drawLandmarks();}catch(e){}}
  function sync(){const want=isOv();if(want&&!OV.on)enter();else if(!want&&OV.on)leave();}
  // pay range reads as a clear area in overview (outline solid and brighter, light fill); normal look at 13+
  function ovStyle(on){try{const u=window.U64&&U64().payU;if(!u)return;Object.assign(u.o,on?{fillA:.12,lineA:.9,w:2.5,dash:null}:{fillA:.05,lineA:.6,w:1.5,dash:[6,6]});u.redraw&&u.redraw();}catch(e){}}
  // a layer group created while in overview (first draw of some module) is taken off too
  HOOK.draw(function(){if(!OV.on)return;for(const [k,lay] of Object.entries(G.layers)){if(KEEP.has(k)||!lay||!map.hasLayer(lay))continue;map.removeLayer(lay);if(!OV.off.includes(k))OV.off.push(k);}drawPins(false);chip();});
  setInterval(()=>{if(OV.on){drawPins(false);chip();}},3000);
  // ---- taps: no hex cards from the map in overview
  // only a tap on the map itself is ignored (Leaflet fires preclick just before the click handlers); cards opened from code still open
  map.on('preclick',()=>{if(OV.on){OV.mapTap=true;setTimeout(()=>{OV.mapTap=false;},0);}});
  const _it=UI.infoTile;UI.infoTile=function(id){if(OV.on&&OV.mapTap)return;return _it.apply(this,arguments);};
  // ---- pickers jump to 13 first
  const _pk=window.pick15;if(_pk)window.pick15=function(kind){if(isOv()){const a=arguments;map.once('zoomend',()=>setTimeout(()=>_pk.apply(window,a),50));map.setView(map.getCenter(),OVZ,{animate:true});return;}return _pk.apply(this,arguments);};
  const _sf=window.startFree4;if(_sf)window.startFree4=function(){if(isOv()){const a=arguments;map.once('zoomend',()=>setTimeout(()=>_sf.apply(window,a),50));map.setView(map.getCenter(),OVZ,{animate:true});return;}return _sf.apply(this,arguments);};
  // ---- go
  map.setMinZoom(10);
  map.on('zoomend',sync);
  // the base drawWorld skips hexes in overview (world.js asks OV65.on)
  const st=document.createElement('style');
  st.textContent=`.ov65{background:none;border:0}.pin65w{width:30px;height:30px;display:flex;align-items:flex-end;justify-content:center;filter:drop-shadow(0 0 4px var(--pc)) drop-shadow(0 2px 2px #000c)}
  .pin65w img.pin65{height:26px;width:auto;max-width:30px;display:block}.pin65w span{font-size:20px;line-height:24px}.pin65w.k-ally img.pin65{height:22px}
  .pin65w.gone{filter:grayscale(1) brightness(.6)}.pin65w.bld{opacity:.6}
  #ov65chip{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 78px);z-index:860;background:#241c10f0;border:1px solid #6b5212;color:#ffd98a;border-radius:14px;padding:5px 12px;font-size:12px;max-width:calc(100vw - 130px);text-align:center;line-height:1.3;box-shadow:0 2px 8px #000a;pointer-events:none}`;
  document.head.appendChild(st);
  sync();
})();
