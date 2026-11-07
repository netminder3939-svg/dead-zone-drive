// v26g (TEST · ddd-v26-9) Chat=chat only · pipeline build preview · sparse material-rich zones (~5 km) · pipe-guard van.
// Jacob approved Nov 5 2026. Live untouched.
(function(){
try{

// ========== 1) Chat tab = messages only ==========
// Activity stays on Crew › Around the fire, plus the longer Activity list under Crew.
try{
  if(typeof AT26!=='undefined'){
    AT26.chat.parts=['chat'];
    if(!AT26.crew.parts.includes('act')) AT26.crew.parts=['over','members','roster','act'];
  }
}catch(e){console.warn('chat26g',e);}

// ========== 2) Pipeline build preview + confirm ==========
// Tap Build → ghost marchTrack on map (local only) → Confirm pays & goes online / Cancel free.
G.pipePrev26=null;
function clearPipePrev26(){
  G.pipePrev26=null;
  try{if(G.layers&&G.layers.pipePrev)G.layers.pipePrev.clearLayers();}catch(e){}
}
function drawPipePrev26(){
  if(typeof map==='undefined'||!P||!P.world)return;
  if(!G.layers.pipePrev)G.layers.pipePrev=L.layerGroup().addTo(map);
  const g=G.layers.pipePrev;g.clearLayers();
  const pv=G.pipePrev26;if(!pv||!pv.route||pv.route.length<2)return;
  const ll=pv.route.map(h=>hexCenter(...idQR(h)));
  const col=PIPE.color[pv.site.res]||'#ffd36a';
  L.polyline(ll,{color:'#16120d',weight:11,opacity:.45,interactive:false,lineCap:'round',dashArray:'2 10'}).addTo(g);
  L.polyline(ll,{color:col,weight:5,opacity:.9,interactive:false,lineCap:'round',dashArray:'8 10'}).addTo(g);
  try{const o=pipeOrigin();if(o){const [qq,rr]=idQR(o);L.polygon(hexPoly(qq,rr),{color:'#ffd36a',weight:3,opacity:1,fillColor:'#ffd36a',fillOpacity:.22,interactive:false}).addTo(g);}}catch(e){}
  try{const [qq,rr]=idQR(pv.site.hex);L.polygon(hexPoly(qq,rr),{color:col,weight:3,opacity:1,fillColor:col,fillOpacity:.28,interactive:false}).addTo(g);
    L.marker(hexCenter(qq,rr),{icon:L.divIcon({className:'lodm',html:`<div class="pipetag" style="--pc:${col}">📍 ${m2esc(pv.site.name)}</div>`,iconSize:[0,0]}),interactive:false,zIndexOffset:720}).addTo(g);}catch(e){}
  const gi=fxIndex();
  pv.route.forEach(h=>{
    let c='#8a7350';if(typeof allied==='function'&&allied(h))c='#4ad05a';else if(gi[h])c='#ff3b2f';
    L.circleMarker(hexCenter(...idQR(h)),{radius:5,color:'#120d08',weight:1,fillColor:c,fillOpacity:.85,interactive:false}).addTo(g);
  });
}
function routeOwners26(route){
  const gi=fxIndex();let crew=0,open=0,horde=0;
  (route||[]).forEach(h=>{if(typeof allied==='function'&&allied(h))crew++;else if(gi[h])horde++;else open++;});
  return{crew,open,horde};
}
function siteForPipe26(siteId){
  let site=(typeof sitesNear==='function'?sitesNear():[]).find(s=>s.id===siteId);
  if(!site&&typeof unlockedSites26==='function'){const u=unlockedSites26()[siteId];if(u&&u.hex!=null)site={id:siteId,name:u.name,res:u.res,hex:u.hex,lat:u.lat,lng:u.lng,kind:u.kind};}
  return site||null;
}
function pipePreview26(siteId){
  const site=siteForPipe26(siteId);const why=canBuildPipe(site);if(why)return toast(why);
  const o=pipeOrigin();if(!o)return toast('Place your Stronghold first');
  const route=marchTrack(o,site.hex).slice(0,PIPE.maxRoute);
  if(route.length<2)return toast('No route to that site');
  G.pipePrev26={siteId:site.id,site:site,route:route,t:Date.now()};
  drawPipePrev26();
  try{UI.closeModal&&UI.closeModal();}catch(e){}
  try{const ll=route.map(h=>hexCenter(...idQR(h)));map.fitBounds(L.latLngBounds(ll),{padding:[48,48],maxZoom:15});}catch(e){}
  const own=routeOwners26(route);
  const km=distM(...hexCenter(...idQR(o)),site.lat,site.lng)/1000;
  const cost=Object.entries(PIPE.cost).map(([k,v])=>v+RES[k]).join(' ');
  UI.info({title:'⛓️ Preview pipeline',sub:site.name,
    body:`<p>Route: <b>${route.length}</b> hexes · ~${km.toFixed(1)} km from your Stronghold.</p>
      <p class="tiny">Crossing: <span style="color:#4ad05a">● ${own.crew} crew</span> · <span style="color:#c8b890">● ${own.open} open</span> · <span style="color:#ff3b2f">● ${own.horde} horde</span></p>
      <p>Cost on Confirm: <b>${cost}</b>. Cancel is free — nothing is spent until you confirm.</p>
      <p class="tiny">Dotted line on the map is the planned path. Line goes <b>online immediately</b> after Confirm (no pin).</p>`,
    buttons:[
      ['✓ Confirm build',function(){confirmPipe26();},'fight'],
      ['Cancel',function(){clearPipePrev26();UI.closeModal();},'ghost24']
    ]});
}
function confirmPipe26(){
  G._pipeConfirming26=1;
  const pv=G.pipePrev26;if(!pv||!pv.site){G._pipeConfirming26=0;clearPipePrev26();return toast('Preview expired — tap Build again');}
  const site=siteForPipe26(pv.siteId)||pv.site;
  const why=canBuildPipe(site);if(why){G._pipeConfirming26=0;clearPipePrev26();UI.closeModal&&UI.closeModal();return toast(why);}
  // Charge + place ONLY here
  pay(PIPE.cost);
  const route=marchTrack(pipeOrigin(),site.hex).slice(0,PIPE.maxRoute);
  pipes().push({id:'p'+Date.now(),site:site.id,name:site.name,res:site.res,hex:site.hex,lat:site.lat,lng:site.lng,route:route,st:'online',onT:Date.now(),lastPay:Date.now(),t:Date.now(),acc:0,total:0});
  clearPipePrev26();
  save();try{pushMember();}catch(e){}
  try{allianceLog(`⛓️ ${P.name} built a ${site.res} pipeline to ${site.name} (+${PIPE.perHour[site.res]}${RES[site.res]}/hr)`);}catch(e){}
  try{UI.closeModal&&UI.closeModal();}catch(e){}
  try{drawPipes();}catch(e){}
  UI.info({title:'⛓️ Pipeline online',sub:site.name,
    body:`<p>+${PIPE.perHour[site.res]}${RES[site.res]} every hour, plus +${PIPE.tileBoost*100}% ${RES[site.res]} from your own hexes.</p>
      <p class="tiny">1 pipeline per resource type. Keep the route clear: if the horde takes a hex on it, the line is cut until the crew retakes it.</p>`,
    buttons:[['Done',function(){UI.closeModal();}]]});
  G._pipeConfirming26=0;
}
window.pipePreview26=pipePreview26;window.clearPipePrev26=clearPipePrev26;window.confirmPipe26=confirmPipe26;
buildPipe=function(siteId){pipePreview26(siteId);};
window.buildPipe=buildPipe;
window.pipeSetup=function(id){pipePreview26(id);};
HOOK.draw(function(){try{if(G.pipePrev26)drawPipePrev26();}catch(e){}});
// Clear ghost if the preview/confirm card is dismissed without Confirm (✕ / backdrop / Cancel already clears)
try{
  const _cmPrev=UI.closeModal;
  UI.closeModal=function(){
    const r=_cmPrev.apply(this,arguments);
    try{
      if(G.pipePrev26&&!G._pipeConfirming26){
        setTimeout(function(){
          try{
            if(G._pipeConfirming26)return;
            const mb=document.querySelector('#modalBody');
            const open=mb&&/Preview pipeline|Pipeline online/.test(mb.innerText||'');
            if(!open)clearPipePrev26();
          }catch(e){}
        },30);
      }
    }catch(e){}
    return r;
  };
}catch(e){}

// ========== 4) Pipeline reinforce → ride the van (not stuck on a hex) ==========
// Auto-escort on guard; hide static garrison badge on the guard hex; troop count rides the moving 🚚.
try{
  guardLine=function(id,n,esc){
    const p=pipes().find(x=>x.id===id);if(!p)return;
    const route=p.route||[];
    // Prefer an allied hex on the route (SH end, site end, exposed, else first allied)
    let h=null;
    try{h=typeof exposedHex==='function'?exposedHex(p):null;}catch(e){}
    if(!h||(typeof allied==='function'&&!allied(h))){
      const cand=[route[0],route[route.length-1],...route].filter(Boolean);
      h=cand.find(x=>typeof allied==='function'?allied(x):true)||route[Math.floor(route.length/2)]||route[0];
    }
    if(!h)return toast('This pipeline has no route yet');
    if(TP().home<=0)return toast('🪖 No troops at home. Train some in Base › Barracks first.');
    // Always escort so the crew sees troops riding the van
    p.guard25={hex:h,esc:true};save();
    stationTroops(h,n);
    try{pushMember();}catch(e){}
    try{UI.closeModal&&UI.closeModal();}catch(e){}
    try{drawPipes();drawGar&&drawGar();}catch(e){}
    toast('🚚 '+((n||0).toLocaleString?n.toLocaleString():n)+' troops escorting the '+p.name+' pipeline');
  };
  window.guardLine=guardLine;
}catch(e){console.warn('guardLine26g',e);}

// Sync guard troop count + esc onto member pipes so EVERY crew phone sees the van badge
try{
  HOOK.member(function(o){
    try{
      if(Array.isArray(o.pipes)){
        o.pipes=o.pipes.map(function(p){
          const full=pipes().find(x=>x.id===p.id);
          if(!full||!full.guard25)return Object.assign({},p,{guardN:p.guardN||0,esc:!!p.esc});
          const s=stationed()[full.guard25.hex];
          const gn=s&&s.n>0?s.n:0; // include in-transit so the crew sees them right away
          return Object.assign({},p,{guardN:gn,esc:true,guardHex:full.guard25.hex});
        });
      }
      // also tag gar rows with esc so ally drawGar/van path can read them
      if(Array.isArray(o.gar)){
        const pg=typeof pipeGuards25==='function'?pipeGuards25():{};
        o.gar=o.gar.map(function(g){
          if(!g)return g;
          const hit=pg[g.hex];
          if(hit)return Object.assign({},g,{pipe:hit.id,route:(hit.route||[]).slice(0,40),esc:true});
          return g;
        });
      }
    }catch(e){}
    return o;
  });
}catch(e){console.warn('pipeMember26g',e);}

try{
  window.drawGar=function(){
    if(typeof map==='undefined'||!P||!P.world)return;
    if(!G.layers.gar23)G.layers.gar23=L.layerGroup().addTo(map);
    const g=G.layers.gar23;g.clearLayers();if(map.getZoom()<13)return;
    const hide=new Set();
    try{for(const p of pipes()){if(p.guard25&&p.guard25.hex)hide.add(p.guard25.hex);}}catch(e){}
    try{for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||m.me||!Array.isArray(m.gar))continue;for(const x of m.gar)if(x&&(x.pipe||(x.hex&&hide.has(x.hex)))&&x.hex)hide.add(x.hex);}}catch(e){}
    const now=Date.now(),hx={};
    try{for(const [h,s] of Object.entries(stationed()))if(s.n>0&&(!s.at||s.at<=now)&&!hide.has(h))(hx[h]=hx[h]||[]).push({uid:P.uid,n:s.n});}catch(e){}
    try{for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||m.me||!Array.isArray(m.gar))continue;for(const x of m.gar)if(x&&x.hex&&x.n>0&&!hide.has(x.hex)&&!x.pipe)(hx[x.hex]=hx[x.hex]||[]).push({uid,n:x.n|0});}}catch(e){}
    for(const [h,list] of Object.entries(hx)){
      const [qq,rr]=idQR(h),poly=hexPoly(qq,rr),c=hexCenter(qq,rr);
      L.polygon(poly,{color:'#000',weight:9,opacity:.55,fill:false,interactive:false}).addTo(g);
      L.polygon(poly,{color:'#6ab8ff',weight:4,opacity:1,fillColor:'#6ab8ff',fillOpacity:.16,interactive:false,className:'gar24hex'}).addTo(g);
      L.polygon(poly.map(p=>[c[0]+(p[0]-c[0])*.82,c[1]+(p[1]-c[1])*.82]),{color:'#bfe2ff',weight:1.5,dashArray:'3 5',fill:false,interactive:false}).addTo(g);
      const bld=typeof bldAt==='function'&&bldAt(h);
      L.marker(c,{icon:L.divIcon({className:'lodm gb24'+(bld?' under':''),html:gar24(list),iconSize:[0,0]}),interactive:false,zIndexOffset:700}).addTo(g);
    }
  };
}catch(e){console.warn('drawGar26g',e);}

// Enrich the truck with escort troop count; redraw often enough to animate
try{
  const _dp26g=drawPipes;
  drawPipes=function(){
    _dp26g.apply(this,arguments);
    try{
      if(typeof map==='undefined'||!P||!P.world||!G.layers||!G.layers.pipes)return;
      if(map.getZoom()<12)return;
      const g=G.layers.pipes;
      // Add escort badges riding the same truck positions for guarded lines
      for(const p of (typeof crewPipes==='function'?crewPipes():pipes())){
        if(!p||!p.route||p.route.length<2)continue;
        if(pipeState(p)!=='online')continue;
        let n=0,esc=false;
        try{
          if(p.own!==false){
            const gh=p.guard25&&p.guard25.hex;
            const s=gh&&stationed()[gh];
            n=s&&s.n>0?s.n:(gh?stationedAt(gh):0); // show while marching too
            esc=!!(p.guard25&&(p.guard25.esc||n>0));
          } else {
            // Ally / crew view: prefer synced guardN on the pipe doc (visible to everyone)
            if(p.guardN>0){n=p.guardN|0;esc=true;}
            // Fallback: sum member gar rows tagged to this pipe
            if(!(n>0)){
              for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){
                if(isMe(uid)||m.me)continue;
                if(Array.isArray(m.pipes)){
                  const mp=m.pipes.find(x=>x&&x.id===p.id);
                  if(mp&&mp.guardN>0){n=mp.guardN|0;esc=true;}
                }
                if(Array.isArray(m.gar)){
                  for(const x of m.gar)if(x&&x.pipe===p.id&&x.n>0){n+=(x.n|0);esc=true;}
                }
              }
            }
          }
        }catch(e){}
        if(!(n>0))continue;
        const ll=p.route.map(h=>hexCenter(...idQR(h)));
        const f=(Date.now()/(PIPE.truckH*3600e3))%2,u=f<=1?f:2-f,k=u*(ll.length-1),i=Math.min(ll.length-2,Math.floor(k)),t=k-i;
        const pos=[ll[i][0]+(ll[i+1][0]-ll[i][0])*t,ll[i][1]+(ll[i+1][1]-ll[i][1])*t];
        const lab=typeof kf24==='function'?kf24(n):n.toLocaleString();
        L.marker(pos,{icon:L.divIcon({className:'lodm',html:`<div class="pipevan26 tap" title="Who is guarding">${esc?'🚚':'🛡️'} <b>${lab}</b></div>`,iconSize:[0,0]}),interactive:true,keyboard:false,zIndexOffset:760}).on('click',(function(pid){return function(ev){try{if(ev&&ev.originalEvent){L.DomEvent.stopPropagation(ev.originalEvent);}if(typeof pipeVanCard26==='function')pipeVanCard26(pid);else if(typeof pipeCard==='function'){const pp=pipes().find(x=>x.id===pid);pp&&pipeCard(pp);}}catch(e){}};})(p.id)).addTo(g);
      }
    }catch(e){console.warn('pipevan26',e);}
  };
  window.drawPipes=drawPipes;
  // Animate the van ~1/s when any line is guarded
  setInterval(function(){try{
    if(document.visibilityState!=='visible'||!P||!P.world)return;
    const own=pipes().some(p=>{const s=p.guard25&&stationed()[p.guard25.hex];return s&&s.n>0&&pipeState(p)==='online';});
    let ally=false;try{for(const m of Object.values((G.al&&G.al.members)||{})){if(m.me)continue;if(Array.isArray(m.pipes)&&m.pipes.some(x=>x&&x.guardN>0)){ally=true;break;}}}catch(e){}
    if(own||ally)drawPipes();
  }catch(e){}},1200);
}catch(e){console.warn('drawPipes26g',e);}

// When troops are marching out TO a pipe-guard hex, route the move marker along the pipe (reads as joining the van)
try{
  const _mv26g=window.moves;
  window.moves=function(){
    const out=_mv26g.apply(this,arguments)||[];
    try{
      const pg=typeof pipeGuards25==='function'?pipeGuards25():{};
      for(const m of out){
        if(m.kind!=='out'||!m.to||!pg[m.to])continue;
        const route=pg[m.to].route||[];
        if(route.length<2)continue;
        // Progress along the pipeline route instead of a straight home→hex line
        const ll=route.map(h=>hexCenter(...idQR(h)));
        const f=Math.max(0,Math.min(1,m.f||0));
        const k=f*(ll.length-1),i=Math.min(ll.length-2,Math.floor(k)),t=k-i;
        m.a=ll[0];m.b=ll[ll.length-1];
        m._pipePos=[ll[i][0]+(ll[i+1][0]-ll[i][0])*t,ll[i][1]+(ll[i+1][1]-ll[i][1])*t];
        m._pipe=true;m.dest='pipeline';
      }
    }catch(e){}
    return out;
  };
  const _dmv26g=window.drawMoves;
  window.drawMoves=function(){
    if(typeof map==='undefined')return;
    if(!G.layers.mv23)G.layers.mv23=L.layerGroup().addTo(map);
    const g=G.layers.mv23;g.clearLayers();
    const list=window.moves();
    for(const m of list){
      if(m._pipe&&m._pipePos){
        // Draw the pipe as the track and put the troop marker at progress along it
        const pg=pipeGuards25()[m.to];const route=(pg&&pg.route)||[];
        if(route.length>=2){
          const ll=route.map(h=>hexCenter(...idQR(h)));
          L.polyline(ll,{color:'#120d08',weight:10,opacity:.4,interactive:false,lineCap:'round'}).addTo(g);
          L.polyline(ll,{color:'#6ab8ff',weight:5,dashArray:'12 9',interactive:false,className:'mtrack',lineCap:'round'}).addTo(g);
          const html=typeof mk24==='function'?mk24({type:'escort',uid:P.uid,troops:m.n,eta:typeof mticon==='function'?mticon(m.eta):''}):`<div class="mv23">🚚 🪖${m.n}</div>`;
          L.marker(m._pipePos,{icon:L.divIcon({className:'lodm mkw24',html:html,iconSize:[0,0]}),interactive:false,zIndexOffset:950}).addTo(g);
          continue;
        }
      }
      // fallback: original single-segment draw
      const t=m.kind==='back'?'return':'reinforce',c=(ACC24&&ACC24[t]?ACC24[t][0]:'#6ab8ff');
      const p=[m.a[0]+(m.b[0]-m.a[0])*m.f,m.a[1]+(m.b[1]-m.a[1])*m.f];
      L.polyline([m.a,m.b],{color:'#120d08',weight:10,opacity:.55,interactive:false,lineCap:'round'}).addTo(g);
      L.polyline([m.a,m.b],{color:c,weight:5,dashArray:t==='return'?'4 8':'12 9',interactive:false,className:'mtrack',lineCap:'round'}).addTo(g);
      const html=typeof mk24==='function'?mk24({type:t,uid:P.uid,troops:m.n,eta:typeof mticon==='function'?mticon(m.eta):''}):`<div class="mv23">🪖${m.n}</div>`;
      L.marker(p,{icon:L.divIcon({className:'lodm mkw24',html:html,iconSize:[0,0]}),interactive:false,zIndexOffset:950}).addTo(g);
    }
  };
}catch(e){console.warn('moves26g',e);}

// ========== 3) Sparse material-rich contested zones (~5 km lattice) ==========
// Keep 61 hex / 24h / +50%·+10%. Hexes outside any zone = plain claims. Soft-reset toast once.
try{
  ZONE.sparseKm=5;
  ZONE.step=Math.max(2*ZONE.n+1, Math.round(ZONE.sparseKm*1000/(HEX_R*Math.sqrt(3))));
  // ~20 on test (HEX_R=147), ~29 on live-size local (98)

  function seedNear26(q,r){
    const S=ZONE.step;
    const iq=Math.round(q/S),ir=Math.round(r/S);
    let best=null,bd=1e9;
    for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){
      const sq=(iq+di)*S,sr=(ir+dj)*S;
      const d=(Math.abs(q-sq)+Math.abs(q+r-sq-sr)+Math.abs(r-sr))/2;
      if(d<bd){bd=d;best=[sq,sr,d];}
    }
    return best;
  }
  zoneIdOf=function(hex){
    if(hex==null)return null;
    let q,r;try{[q,r]=idQR(hex);}catch(e){return null;}
    const s=seedNear26(q,r);if(!s||s[2]>ZONE.n)return null;
    return 'Z'+s[0]+'_'+s[1];
  };
  zoneCenter=function(zid){
    if(!zid)return[0,0];
    const parts=String(zid).replace(/^Z/,'').split('_').map(Number);
    return[parts[0]||0,parts[1]||0];
  };
  zoneTitle=function(zid){
    if(!zid)return'Plain hex';
    const n=zoneName(zid);return n.charAt(0).toUpperCase()+n.slice(1);
  };
  zoneFortified=function(hex){
    const z=zoneIdOf(hex);if(!z)return false;
    try{return zoneState(z).st==='fortified';}catch(e){return false;}
  };
  zoneHexes=function(zid){
    if(!zid)return[];
    const [q,r]=zoneCenter(zid);return hexRing(q,r,ZONE.n).map(x=>x.id);
  };
  zonesNear=function(km){
    if(!G.pos)return[];
    const me=hexAt(...G.pos),ids=new Set(),R=Math.ceil((km||ZONE.listKm)*1000/(HEX_R*Math.sqrt(3)));
    const add=h=>{const z=zoneIdOf(h);if(z)ids.add(z);};
    try{for(const h of Object.keys(P.tiles||{}))add(h);}catch(e){}
    try{for(const [h,o] of Object.entries(G.terr||{}))if(o&&!o.released&&hexDist(me.id,h)<=R)add(h);}catch(e){}
    try{for(const h of Object.keys(fxIndex()))if(hexDist(me.id,h)<=R)add(h);}catch(e){}
    // nearby seeds (even untouched) so the map/list can discover prizes
    const S=ZONE.step,reach=Math.ceil(R/S)+1;
    const iq0=Math.floor(me.q/S),ir0=Math.floor(me.r/S);
    for(let iq=iq0-reach;iq<=iq0+reach;iq++)for(let ir=ir0-reach;ir<=ir0+reach;ir++){
      const zid='Z'+(iq*S)+'_'+(ir*S);
      const [cq,cr]=zoneCenter(zid);
      if(hexDist(me.id,cq+'_'+cr)<=R+ZONE.n)ids.add(zid);
    }
    return[...ids].filter(Boolean).map(zoneState);
  };
  // Map: only draw real sparse zones in view (not every hex's old tile)
  drawZones=function(){
    if(typeof map==='undefined'||!P||!P.world)return;
    if(!G.layers.zones)G.layers.zones=L.layerGroup().addTo(map);
    const g=G.layers.zones;g.clearLayers();
    const z=map.getZoom();if(z<12||G.layers.zonesOff)return;
    const b=map.getBounds(),S=ZONE.step;
    const sw=hexAt(b.getSouth(),b.getWest()),ne=hexAt(b.getNorth(),b.getEast());
    const q0=Math.floor(Math.min(sw.q,ne.q)/S)-1,q1=Math.ceil(Math.max(sw.q,ne.q)/S)+1;
    const r0=Math.floor(Math.min(sw.r,ne.r)/S)-1,r1=Math.ceil(Math.max(sw.r,ne.r)/S)+1;
    const ids=[];
    for(let iq=q0;iq<=q1;iq++)for(let ir=r0;ir<=r1;ir++)ids.push('Z'+(iq*S)+'_'+(ir*S));
    if(ids.length>400)return;
    for(const zid of ids){
      const s=zoneState(zid),st=ZSTYLE[s.st];
      if(s.st==='neutral'&&z<14)continue;
      L.polyline(zoneEdges(zid),{...st,interactive:false,lineCap:'round'}).addTo(g);
      if(s.st==='fortified')L.polyline(zoneEdges(zid),{color:'#2a1d0a',weight:2,opacity:.8,interactive:false}).addTo(g);
      if(z>=13&&(s.st!=='neutral'||z>=15)){
        const [q,r]=zoneCenter(zid);
        const tag=s.st==='neutral'?'':s.st==='fortified'?'🛡️ FORTIFIED':s.st==='fortifying'?`⏳ ${fmtDur(s.fortLeft).replace(/ \d+s$/,'')}`:s.st==='horde'?'☠️ HORDE':`${s.crew}/${s.total}`;
        L.marker(hexCenter(q,r),{icon:L.divIcon({className:'lodm',html:`<div class="zlabel z-${s.st}" style="font-size:${z>=16?15:z>=15?13:11}px">${s.name.toUpperCase()}${tag?`<small>${tag}</small>`:''}</div>`,iconSize:[0,0]}),interactive:false,zIndexOffset:300}).addTo(g);
      }
    }
  };
  window.zoneIdOf=zoneIdOf;window.zoneCenter=zoneCenter;window.zoneTitle=zoneTitle;
  window.zoneFortified=zoneFortified;window.zoneHexes=zoneHexes;window.zonesNear=zonesNear;window.drawZones=drawZones;
  // Clear edge cache (ids changed shape)
  try{if(typeof _zEdgeCache!=='undefined')_zEdgeCache.clear();}catch(e){}
  try{_zc={};}catch(e){}

  // Tile card: only show zone row when the hex is inside a material-rich zone
  // zones.js HOOK.tile always inserts a row — swap zoneState path via zoneIdOf null + guard
  const _zs26g=zoneState;
  zoneState=function(zid){
    if(!zid)return{id:null,name:'Plain hex',total:0,crew:0,horde:0,mine:0,forts:0,missing:[],st:'none',fortLeft:0,pct:0};
    return _zs26g(zid);
  };
  window.zoneState=zoneState;

  // Soft-reset toast once per account on test
  function zoneSparseToast26(){
    try{
      if(!P||!P.name)return;
      if(P.zoneSparse26)return;
      P.zoneSparse26=Date.now();
      P.zoneSparse26Note={step:ZONE.step,km:ZONE.sparseKm,n:ZONE.n,v:'v26-9'};
      save();
      toast('🏳️ Material-rich zones are farther apart now (~'+ZONE.sparseKm+' km). Old fortify progress on the dense grid was reset — plain hexes stay claimable.');
    }catch(e){}
  }
  setTimeout(zoneSparseToast26,1800);
  setTimeout(zoneSparseToast26,6000);

  // Alliance › Zones copy: short prize list
  HOOK.render(function(){try{
    if(this.tab!=='alliance'||this.sub.alliance!=='zones')return;
    const b=$('#sheetBody');if(!b)return;
    const tip=b.querySelector('.z22 p.tiny, .part26.p-zones p.tiny, p.tiny');
    // Prefer injecting a one-liner under the ZONES header
    const h=b.querySelector('.z22 h2, h2');
    if(h&&!b.querySelector('.zs26tip')){
      h.insertAdjacentHTML('afterend',`<p class="tiny zs26tip">Material-rich prizes only — centers ~${ZONE.sparseKm} km apart (${3*ZONE.n*(ZONE.n+1)+1} hexes each). Everything else is a normal hex claim (no fortify wall). Hold all hexes ${ZONE.fortifyH} h → +${ZONE.yieldBonus*100}% income · +${ZONE.towerBonus*100}% towers.</p>`);
    }
  }catch(e){}});

  // Plain hexes: no zone row on the tile card (silent until you enter a rich zone)
  HOOK.tile(function(id){try{
    if(zoneIdOf(id))return;
    setTimeout(function(){try{document.querySelectorAll('#modalBody .zrow').forEach(function(e){if(/z-none|Plain hex/i.test(e.className+' '+e.textContent))e.remove();});
      // also drop a leftover "zone" fact if cleanCard pushed one for null
    }catch(e){}},0);
  }catch(e){}});
}catch(e){console.error('zones26g',e);}

console.log('v26g ready',{sw:'ddd-v26-9',zoneStep:ZONE.step,sparseKm:ZONE.sparseKm});
}catch(e){console.error('v26g boot',e);}
})();
