// v20 Zones (alliance vs AI). v26: 4 rings = 61 hexes (was 19), fortify 24 h. Named neighborhoods that tile the whole map, derived from the hex grid itself, so
// every phone sees the same zones with nothing stored. State comes from the shared territory:
//   Neutral · Contested (crew holds some) · Fortifying (crew holds all; 24 h from the last hex taken) · FORTIFIED (wall up, bonus on)
//   · Horde zone (gangs hold all). Raider forts inside a zone must be taken to complete it.
// Fortified bonus: +50% income from your hexes in that zone, +10% power for towers inside. Losing any hex cracks the wall.
const ZONE={n:4,fortifyH:24,yieldBonus:0.5,towerBonus:0.10,listKm:12,
  pre:['Ash','Rust','Bone','Cinder','Grave','Hollow','Iron','Black','Salt','Thorn','Gloom','Ember','Mire','Crow','Wither','Dust','Red','Rot','Lantern','Widow'],
  suf:['field','water','hollow','reach','barrow','gate','ridge','fen','moor','yard','crossing','vale','mark','well','heath','end','row','wood','flats','hill']};
const _zu=[2*ZONE.n+1,-ZONE.n],_zv=[ZONE.n,ZONE.n+1],_zdet=_zu[0]*_zv[1]-_zu[1]*_zv[0];
function zoneAB(q,r){const a=(q*_zv[1]-r*_zv[0])/_zdet,b=(_zu[0]*r-_zu[1]*q)/_zdet,fa=Math.floor(a),fb=Math.floor(b);
  for(let i=-1;i<=2;i++)for(let j=-1;j<=2;j++){const A=fa+i,B=fb+j,cq=A*_zu[0]+B*_zv[0],cr=A*_zu[1]+B*_zv[1];if((Math.abs(q-cq)+Math.abs(q+r-cq-cr)+Math.abs(r-cr))/2<=ZONE.n)return[A,B];}return[fa,fb];}
function zoneIdOf(hex){const [q,r]=idQR(hex),[A,B]=zoneAB(q,r);return'Z'+A+'_'+B;}
function zoneCenter(zid){const [A,B]=zid.slice(1).split('_').map(Number);return[A*_zu[0]+B*_zv[0],A*_zu[1]+B*_zv[1]];}
function zoneHexes(zid){const [q,r]=zoneCenter(zid);return hexRing(q,r,ZONE.n).map(x=>x.id);}
function zoneName(zid){const rnd=seedRand('zone:'+zid),p=ZONE.pre[Math.floor(rnd()*ZONE.pre.length)],s=ZONE.suf[Math.floor(rnd()*ZONE.suf.length)];return p+s;}
function zoneTitle(zid){const n=zoneName(zid);return n.charAt(0).toUpperCase()+n.slice(1);}
var _zc={};setInterval(()=>{_zc={};},5000);
function claimT(id){const o=G.terr&&G.terr[id];return(o&&o.t)||(P.tiles[id]&&P.tiles[id].t)||0;}
function zoneState(zid){const c=_zc[zid];if(c)return c;const hs=zoneHexes(zid),gi=fxIndex();let crew=0,horde=0,forts=0,mine=0,last=0;const missing=[];
  for(const h of hs){if(allied(h)){crew++;if(P.tiles[h])mine++;last=Math.max(last,claimT(h));}else{missing.push(h);if(gi[h])horde++;}if(enemyAt(h)&&!W().enemyTaken[h])forts++;}
  const total=hs.length;let st='neutral',fortLeft=0;
  if(crew===total){fortLeft=Math.max(0,last+ZONE.fortifyH*3600e3-Date.now());st=fortLeft>0?'fortifying':'fortified';}
  else if(horde===total)st='horde';else if(crew>0||horde>0)st='contested';
  return _zc[zid]={id:zid,name:zoneTitle(zid),total,crew,horde,mine,forts,missing,st,fortLeft,pct:Math.round(100*crew/total)};}
function zonesNear(km){if(!G.pos)return[];const me=hexAt(...G.pos),ids=new Set(),R=Math.ceil(km*1000/(HEX_R*Math.sqrt(3)));
  // zones with crew or horde hexes, plus every zone within ~2 km of you
  for(const h of Object.keys(P.tiles||{}))ids.add(zoneIdOf(h));for(const [h,o] of Object.entries(G.terr||{}))if(o&&!o.released&&hexDist(me.id,h)<=R)ids.add(zoneIdOf(h));
  for(const h of Object.keys(fxIndex()))if(hexDist(me.id,h)<=R)ids.add(zoneIdOf(h));hexRing(me.q,me.r,8).forEach(x=>ids.add(zoneIdOf(x.id)));
  return[...ids].map(zoneState);}
function zoneFortified(hex){return zoneState(zoneIdOf(hex)).st==='fortified';}
function crewZones(){return zonesNear(ZONE.listKm).filter(z=>z.st==='fortified'||z.st==='fortifying');}
// ---- bonuses
const _zn_gi=grossIncome;grossIncome=function(){const g=_zn_gi.apply(this,arguments);try{for(const id of Object.keys(P.tiles||{})){if(!zoneFortified(id))continue;const t=tileInfo(id);if(t.res)g[t.res]+=Math.round(t.yield*ZONE.yieldBonus);}}catch(e){}return g;};
const _zn_tp=towerPower;towerPower=function(t){const p=_zn_tp.apply(this,arguments);try{const id=Object.keys(W().towers||{}).find(k=>W().towers[k]===t);if(id&&zoneFortified(id))return Math.round(p*(1+ZONE.towerBonus));}catch(e){}return p;};
// ---- map
const ZSTYLE={neutral:{color:'#8a7350',weight:1.5,opacity:.32,dashArray:'6 8'},contested:{color:'#e6c46a',weight:3,opacity:.8,dashArray:'10 6'},
  fortifying:{color:'#e6c46a',weight:4,opacity:.9,dashArray:'14 6'},fortified:{color:'#ffd36a',weight:6,opacity:.95},horde:{color:'#d0412f',weight:5,opacity:.9}};
const _zEdgeCache=new Map();
function zoneEdges(zid){if(_zEdgeCache.has(zid))return _zEdgeCache.get(zid);if(_zEdgeCache.size>3000)_zEdgeCache.clear();const segs=[];_zEdgeCache.set(zid,segs);for(const h of zoneHexes(zid)){const [q,r]=idQR(h),c=hexCenter(q,r),poly=hexPoly(q,r);
  for(let i=0;i<6;i++){const a=poly[i],b=poly[(i+1)%6],m=[(a[0]+b[0])/2,(a[1]+b[1])/2],nb=hexAt(2*m[0]-c[0],2*m[1]-c[1]).id;if(zoneIdOf(nb)!==zid)segs.push([a,b]);}}return segs;}
function drawZones(){if(typeof map==='undefined'||!P.world)return;if(!G.layers.zones)G.layers.zones=L.layerGroup().addTo(map);const g=G.layers.zones;g.clearLayers();
  const z=map.getZoom();if(z<12||G.layers.zonesOff)return;const b=map.getBounds(),ids=new Set(),sw=hexAt(b.getSouth(),b.getWest()),ne=hexAt(b.getNorth(),b.getEast()),nw=hexAt(b.getNorth(),b.getWest()),se=hexAt(b.getSouth(),b.getEast());
  const qs=[sw.q,ne.q,nw.q,se.q],rs=[sw.r,ne.r,nw.r,se.r];for(let q=Math.min(...qs)-2;q<=Math.max(...qs)+2;q+=2)for(let r=Math.min(...rs)-2;r<=Math.max(...rs)+2;r+=2)ids.add(zoneIdOf(q+'_'+r));
  if(ids.size>900)return;
  for(const zid of ids){const s=zoneState(zid),st=ZSTYLE[s.st];if(s.st==='neutral'&&z<14)continue;L.polyline(zoneEdges(zid),{...st,interactive:false,lineCap:'round'}).addTo(g);
    if(s.st==='fortified')L.polyline(zoneEdges(zid),{color:'#2a1d0a',weight:2,opacity:.8,interactive:false}).addTo(g);
    if(z>=13&&(s.st!=='neutral'||z>=15)){const [q,r]=zoneCenter(zid),tag=s.st==='neutral'?'':s.st==='fortified'?'🛡️ FORTIFIED':s.st==='fortifying'?`⏳ ${fmtDur(s.fortLeft).replace(/ \d+s$/,'')}`:s.st==='horde'?'☠️ HORDE':`${s.crew}/${s.total}`;
      L.marker(hexCenter(q,r),{icon:L.divIcon({className:'lodm',html:`<div class="zlabel z-${s.st}" style="font-size:${z>=16?15:z>=15?13:11}px">${s.name.toUpperCase()}${tag?`<small>${tag}</small>`:''}</div>`,iconSize:[0,0]}),interactive:false,zIndexOffset:300}).addTo(g);}}}
HOOK.draw(function(){try{drawZones();}catch(e){console.warn('zones',e);}});
setTimeout(()=>{try{map.on('moveend',()=>{clearTimeout(G._zT);G._zT=setTimeout(drawZones,150);});}catch(e){}},0);
setInterval(()=>{try{if(document.visibilityState==='visible')drawZones();}catch(e){}},60e3);
// ---- hex card line
HOOK.tile(function(id){try{if(G.markMode)return;const box=document.querySelector('#modalBody .ibtns');if(!box)return;const s=zoneState(zoneIdOf(id));
  box.insertAdjacentHTML('beforebegin',`<div class="row zrow z-${s.st}"><div class="grow"><b>🏳️ ${s.name}</b><small>${zoneLine(s)}</small></div><button onclick="UI.closeModal();zoneOpen('${s.id}')">Zone</button></div>`);}catch(e){}return;});
function zoneLine(s){return s.st==='fortified'?`Fortified · +${ZONE.yieldBonus*100}% income here, +${ZONE.towerBonus*100}% tower power`:s.st==='fortifying'?`All ${s.total} held · wall rises in ${fmtDur(s.fortLeft).replace(/ \d+s$/,'')}`
  :s.st==='horde'?`Held by the horde (${s.horde}/${s.total})`:s.st==='contested'?`Crew ${s.crew}/${s.total}${s.horde?` · horde ${s.horde}`:''}${s.forts?` · 🏴 ${s.forts} fort`:''}`:`Unclaimed · take all ${s.total} hexes to fortify it`;}
function zoneOpen(zid){const s=zoneState(zid),[q,r]=zoneCenter(zid);
  UI.info({title:`🏳️ ${s.name}`,sub:zoneLine(s),body:`<div class="zbar"><i style="width:${s.pct}%"></i>${s.horde?`<b style="width:${Math.round(100*s.horde/s.total)}%"></b>`:''}</div>
    <p class="tiny">Crew ${s.crew} · horde ${s.horde} · open ${s.total-s.crew-s.horde}${s.mine?` · ${s.mine} yours`:''}. Hold all ${s.total} hexes for ${ZONE.fortifyH} h to raise the wall: +${ZONE.yieldBonus*100}% income from your hexes inside and +${ZONE.towerBonus*100}% tower power. Losing any hex cracks it.</p>`,
    buttons:[['🗺️ Show',()=>{UI.closeModal();map.setView(hexCenter(q,r),15);}],...(s.missing.length?[['🎯 Mark the missing hexes',()=>{UI.closeModal();zoneMarkMissing(zid);}]]:[]),['Close',()=>UI.closeModal()]]});}
function zoneMarkMissing(zid){const s=zoneState(zid);if(!s.missing.length)return toast('Nothing missing');NET.addMarker({hex:s.missing[0],hexes:s.missing.slice(0,MARK2.maxArea),type:'area',note:`Take ${s.name} (${s.missing.length} left)`,who:'',by:P.name,uid:P.uid,t:Date.now(),exp:MARK2.never,done:false});
  allianceLog(`🏳️ ${P.name} called the crew to take ${s.name} (${s.missing.length} hexes left)`);toast(`⬡ Marked ${s.missing.length} hexes for the crew`);}
// ---- Alliance › Zones
UI.SUBS.alliance.splice(1,0,['zones','🏳️ Zones']);
HOOK.render(function(){try{if(this.tab!=='alliance'||this.sub.alliance!=='zones')return;const b=$('#sheetBody');
  const order={fortified:0,fortifying:1,contested:2,horde:3,neutral:4};const zs=zonesNear(ZONE.listKm).filter(z=>z.st!=='neutral').sort((a,b)=>(order[a.st]-order[b.st])||(b.pct-a.pct));
  const n=k=>zs.filter(z=>z.st===k).length;
  if(typeof zonesPanel22==='function'){zonesPanel22(b,zs);return;}b.insertAdjacentHTML('beforeend',`<h2>🏳️ Zones</h2><div class="stats"><div><b>${n('fortified')}</b><small>Fortified</small></div><div><b>${n('fortifying')}</b><small>Fortifying</small></div><div><b>${n('contested')}</b><small>Contested</small></div><div><b>${n('horde')}</b><small>Horde</small></div></div>
    <p class="tiny">Each zone is ${3*ZONE.n*(ZONE.n+1)+1} hexes. Hold all of them for ${ZONE.fortifyH} h and the wall goes up: +${ZONE.yieldBonus*100}% income from your hexes inside, +${ZONE.towerBonus*100}% tower power. The horde takes zones too.</p>
    ${zs.map(z=>`<div class="row zrow z-${z.st}"><div class="grow"><b>${z.name}</b><div class="zbar"><i style="width:${z.pct}%"></i>${z.horde?`<b style="width:${Math.round(100*z.horde/z.total)}%"></b>`:''}</div><small>${zoneLine(z)}</small></div><button onclick="zoneOpen('${z.id}')">Open</button></div>`).join('')||'<p class="tiny">No zones touched yet. Claim hexes and the zones around you show up here.</p>'}`);}catch(e){console.warn('zones tab',e);}});
// ---- status strip: zone count; notice when a wall goes up or cracks (this phone only)
G.zPrev=null;setInterval(()=>{try{if(!P.world||!G.pos)return;const now={};crewZones().forEach(z=>now[z.id]=z.st);if(G.zPrev){for(const [id,st] of Object.entries(now))if(st==='fortified'&&G.zPrev[id]!=='fortified')toast(`🛡️ ${zoneTitle(id)} is FORTIFIED: wall up, bonus on`);
  for(const id of Object.keys(G.zPrev))if(!now[id])toast(`⚠️ ${zoneTitle(id)}'s wall cracked: a hex was lost`);}G.zPrev=now;}catch(e){}},30e3);
const _zn_ss=typeof gpsChip==='function'?gpsChip:null;
gpsChip=function(){if(_zn_ss)_zn_ss();try{const st=document.getElementById('status');if(!st||!P.world)return;let el=document.getElementById('zonechip');if(!el||el.parentNode!==st){el=document.createElement('span');el.id='zonechip';el.onclick=()=>{UI.open('alliance');UI.sub.alliance='zones';UI.render();};st.appendChild(el);}
  const zs=crewZones(),f=zs.filter(z=>z.st==='fortified').length;el.textContent=`🏳️ ${f} fortified${zs.length>f?' · '+(zs.length-f)+' rising':''}`;}catch(e){}};
