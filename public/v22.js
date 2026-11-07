// v22 (v3 mockup gaps): minimap, zones panel + leaderboard, pipeline setup card, bug fights need a march unless you stand
// on the hex, palisade rings (merged outlines + corner posts), phone Drive header + Route complete card. Visual/UX only;
// fight math untouched (deterministic).
window.RING22=true;
(function(){const q=s=>document.querySelector(s),web=()=>innerWidth>=1100,esc=s=>typeof m2esc==='function'?m2esc(s):s;
// ---------- minimap (web)
let mm=null,box=null;function minimap(){if(true){ /* v23: minimap removed (Jacob: clutter) */if(q('#mini22'))q('#mini22').style.display='none';return;}
  let d=q('#mini22');if(!d){d=document.createElement('div');d.id='mini22';d.innerHTML='<b>MINIMAP</b><div id="mini22m"></div>';document.body.appendChild(d);
    mm=L.map('mini22m',{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false});
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:18}).addTo(mm);
    mm.on('click',e=>map.panTo(e.latlng));G._miniTerr=L.layerGroup().addTo(mm);}
  d.style.display='';const z=Math.max(9,map.getZoom()-4);mm.setView(map.getCenter(),z,{animate:false});
  if(box)box.setBounds(map.getBounds());else box=L.rectangle(map.getBounds(),{color:'#ffd36a',weight:2,fill:false,interactive:false}).addTo(mm);
  try{const g=G._miniTerr;g.clearLayers();const seen=new Set();for(const [h,o] of Object.entries(G.terr||{})){if(!o||o.released)continue;const c=o.ai?'#c8372a':(o.color||'#e6c46a');if(seen.size>1500)break;seen.add(h);L.circleMarker(hexCenter(...idQR(h)),{radius:2,stroke:false,fillColor:c,fillOpacity:.9,interactive:false}).addTo(g);}
    for(const h of Object.keys(fxIndex()))L.circleMarker(hexCenter(...idQR(h)),{radius:2,stroke:false,fillColor:'#c8372a',fillOpacity:.9,interactive:false}).addTo(g);}catch(e){}}
setTimeout(()=>{try{minimap();map.on('moveend zoomend',()=>{clearTimeout(G._mmT);G._mmT=setTimeout(minimap,120);});addEventListener('resize',minimap);}catch(e){console.warn('minimap',e);}},1200);
// ---------- zones panel + leaderboard (mockup 04)
G.zTab=G.zTab||'list';
function zoneRes(zid){const c={};try{for(const h of zoneHexes(zid)){const t=tileInfo(h);if(t.res)c[t.res]=(c[t.res]||0)+1;}}catch(e){}const k=Object.keys(c).sort((a,b)=>c[b]-c[a])[0];return k?RES[k]:'';}
function zoneJump(zid){const [qq,rr]=zoneCenter(zid);if(web()===false)UI.close();map.setView(hexCenter(qq,rr),15,{animate:true});}
window.zoneJump=zoneJump;window.zTab22=t=>{G.zTab=t;UI.render();};
window.zonesPanel22=function(b,zs){const al=(G.al&&G.al.name)||'Your crew';
  const own=z=>z.st==='fortified'||z.st==='fortifying'?al:z.st==='horde'?'🧟 Horde':z.st==='contested'?'Contested':'Free';
  const card=z=>`<div class="zc22 z-${z.st}"><div class="grow"><b>${esc(z.name).toUpperCase()}</b><small>${esc(own(z))} · ${zoneRes(z.id)} · ${z.st==='fortified'?'🛡️ wall up':z.st==='fortifying'?'⏳ '+fmtDur(z.fortLeft).replace(/ \d+s$/,''):z.st==='contested'?(z.crew>=z.horde?'You lead':'Horde leads'):z.st==='horde'?'Held by the horde':'Open'}</small></div><b class="pct">${z.pct}%</b><button class="pin22" title="Show on map" onclick="zoneJump('${z.id}')">📍</button><button class="open22" onclick="zoneOpen('${z.id}')">›</button></div>`;
  const tabs=`<div class="ztabs22">${[['list','Map list'],['lb','Leaderboard'],['obj','Objectives']].map(([k,l])=>`<button class="${G.zTab===k?'on':''}" onclick="zTab22('${k}')">${l}</button>`).join('')}</div>`;
  let body='';
  if(G.zTab==='list')body=zs.map(card).join('')||'<p class="tiny">No zones touched yet. Claim hexes and the zones around you show up here.</p>';
  else if(G.zTab==='lb'){const all=zonesNear(ZONE.listKm),crewZ=all.filter(z=>z.st==='fortified').length,hordeZ=all.filter(z=>z.st==='horde').length;
    const crewH=Object.values(G.terr||{}).filter(o=>o&&!o.ai&&!o.released).length,hordeH=Object.keys(fxIndex()).length;
    const rows=[[al,crewZ,crewH,'#ffd36a'],['🧟 The Horde',hordeZ,hordeH,'#ff6b55']].sort((a,b)=>b[1]-a[1]||b[2]-a[2]);
    const mem={};for(const o of Object.values(G.terr||{})){if(!o||o.ai||o.released||!o.uid)continue;const k=isMe(o.uid)?P.uid:o.uid;mem[k]=(mem[k]||0)+1;}const names=(G.al&&G.al.members)||{};
    const ms=Object.entries(mem).sort((a,b)=>b[1]-a[1]).slice(0,10);
    body=`<h3 class="lb22h">SEASON LEADERBOARD</h3>${rows.map((r,i)=>`<div class="lb22"><b style="color:${r[3]}">${i+1}. ${esc(r[0])}</b><span>${r[1]} zone${r[1]===1?'':'s'} · ${r[2]} hexes</span></div>`).join('')}
      <h3 class="lb22h">CREW · HEXES HELD</h3>${ms.map(([u,n],i)=>`<div class="lb22">${av24(u,28)}<b>${i+1}. ${esc(u===P.uid?P.name:(names[u]&&names[u].name)||'Teammate')}</b><span>${n} hexes</span></div>`).join('')||'<p class="tiny">No hexes yet.</p>'}
      <p class="tiny">Ranks by fortified zones, then hexes. Other alliances aren't shown yet: each team plays in its own world for now.</p>`;}
  else body=`<div class="lb22"><b>🛡️ Fortify a zone</b><span>Hold all ${3*ZONE.n*(ZONE.n+1)+1} hexes for ${ZONE.fortifyH} h</span></div><div class="lb22"><b>💰 Bonus</b><span>+${ZONE.yieldBonus*100}% income · +${ZONE.towerBonus*100}% towers</span></div><div class="lb22"><b>☠️ Watch out</b><span>Lose one hex and the wall cracks</span></div>`;
  b.insertAdjacentHTML('beforeend',`<div class="z22"><h2>🏴 ZONES</h2>${tabs}${body}</div>`);};
// ---------- pipeline setup card (mockup 06)
window.pipeSetup=function(id){const s=sitesNear().find(x=>x.id===id);if(!s)return;const why=canBuildPipe(s),o=pipeOrigin();
  const route=o?marchTrack(o,s.hex).slice(0,PIPE.maxRoute):[],km=o?distM(...hexCenter(...idQR(o)),s.lat,s.lng)/1000:0,used=pipes().filter(p=>pipeState(p)!=='expired').length;
  const row=(a,b)=>`<div class="ps22r"><span>${a}</span><b>${b}</b></div>`;
  UI.info({title:`⛓️ New pipeline · ${esc(s.name)}`,sub:`${RES[s.res]} site · ${km.toFixed(1)} km from your Stronghold`,
    body:`<div class="ps22"><div class="steps22"><span class="ok">1 Pick site ✓</span><span class="now">2 Drop pin</span><span>3 Drive there</span><span>4 Online</span></div>
      ${row('Route',`${Math.max(0,route.length-1)} hexes · follows roads`)}${row('Boost when online',`+${PIPE.perHour[s.res]}${RES[s.res]}/hr + ${PIPE.tileBoost*100}% ${RES[s.res]} on your hexes`)}${row('Truck',`1 trip / ${PIPE.truckH} h`)}${row('Cost',Object.entries(PIPE.cost).map(([k,v])=>v+RES[k]).join(' '))}${row('Upkeep',`${PIPE.upkeep.parts}⚙️ / day`)}${row('Pin expires',`${PIPE.pinH} h if not driven`)}${row('Slots',`${used} / ${pipeCap()} used`)}
      <div class="step3_22"><b>📱 STEP 3: DRIVE IT FOR REAL</b><br>Open Dead Zone Drive on your phone and tap DRIVE. Get within ${PIPE.pinM} m of the pin and the line switches on. No tapping while driving.</div>${why?`<p class="tiny">🔒 ${esc(why)}</p>`:''}</div>`,
    buttons:[['📍 Confirm pin',()=>buildPipe(id),'fight',!!why],['Cancel',()=>UI.closeModal()]]});
  try{if(route.length){G._pv22&&map.removeLayer(G._pv22);G._pv22=L.polyline(route.map(h=>hexCenter(...idQR(h))),{color:'#ffd36a',weight:4,dashArray:'3 8',interactive:false}).addTo(map);setTimeout(()=>{try{map.removeLayer(G._pv22);}catch(e){}},20000);}}catch(e){}};
HOOK.render(function(){try{if(this.tab!=='base'||this.sub.base!=='pipes')return;document.querySelectorAll('#sheetBody button[onclick^="buildPipe("]').forEach(b=>{b.setAttribute('onclick',b.getAttribute('onclick').replace('buildPipe(','pipeSetup('));b.textContent='Set up';});}catch(e){}});
// ---------- bug fights: march required unless you stand on the hex (mockup 09)
const _im22=UI.infoMon;UI.infoMon=function(mid,lvl,key,lat,lng){_im22.apply(this,arguments);try{const id=key.split('@')[0];if(!G.pos)return;const here=hexAt(...G.pos).id===id;if(here)return;
  const btns=[...document.querySelectorAll('#modalBody .ibtns button')],f=btns.find(b=>/⚔️ Fight/.test(b.textContent)&&b.id!=='btnMarch');
  if(f){f.disabled=true;f.textContent='⚔️ Fight (stand on this hex)';}
  if(!q('#btnMarch')){const why=canMarch(id),d=marchDur(marchFrom(),id),b=document.createElement('button');b.className='fight';b.id='btnMarch';b.disabled=!!why;b.innerHTML=`🚩 March to fight · ${fmtDur(d)} there${why?`<br><small>${esc(why)}</small>`:''}`;
    b.onclick=async()=>{await sendMarch(id,{kind:'mob',mid,lvl,key});UI.closeModal();};q('#modalBody .ibtns').prepend(b);}
  q('#modalBody .ibtns').insertAdjacentHTML('beforebegin','<p class="tiny mreq22">🚩 Send a march to fight this bug, or stand on its hex to fight it yourself. Same result either way: fights are fixed math, no luck.</p>');}catch(e){console.warn('mon22',e);}};
// ---------- palisade rings: merged outline of every Stronghold / tower / outpost ring + posts at corners (mockup 08)
function ringSet(){const set=new Map(),w=P.world||{};const add=(hex,R,k)=>{const [qq,rr]=idQR(hex);for(const x of hexRing(qq,rr,R)){if(!set.has(x.id)||k==='t')set.set(x.id,k);}};
  if(w.sh&&w.sh.state!=='down')add(w.sh.hex,shRadius(),'t');for(const [id,t] of Object.entries(w.towers||{}))if(t.state!=='down')add(id,towerRadius(t),'t');
  for(const [id,o] of Object.entries(w.outposts||{}))if(o.state==='up')add(id,(BAL.outpost&&BAL.outpost.radius)||1,'o');return set;}
function drawRings(){if(typeof map==='undefined'||!P.world)return;if(!G.layers.rings22)G.layers.rings22=L.layerGroup().addTo(map);const g=G.layers.rings22;g.clearLayers();if(map.getZoom()<14)return;
  const set=ringSet(),segs={t:[],o:[]},posts=new Map();
  for(const [h,k] of set){const [qq,rr]=idQR(h),c=hexCenter(qq,rr),poly=hexPoly(qq,rr);for(let i=0;i<6;i++){const a=poly[i],b2=poly[(i+1)%6],m=[(a[0]+b2[0])/2,(a[1]+b2[1])/2],nb=hexAt(2*m[0]-c[0],2*m[1]-c[1]).id;
    if(!set.has(nb)){segs[k].push([a,b2]);for(const v of [a,b2])posts.set(v[0].toFixed(6)+','+v[1].toFixed(6),v);}}}
  for(const h of set.keys()){const [qq,rr]=idQR(h);L.polygon(hexPoly(qq,rr),{stroke:false,fillColor:'#e6c46a',fillOpacity:.07,interactive:false}).addTo(g);} /* v23: light tint on every protected hex */
  for(const [k,ss] of Object.entries(segs)){if(!ss.length)continue;const wt=k==='t'?5:3;L.polyline(ss,{color:'#140e06',weight:wt+4,opacity:.9,interactive:false,lineCap:'butt'}).addTo(g);
    L.polyline(ss,{color:'#c9a24a',weight:wt,opacity:.95,interactive:false,lineCap:'butt'}).addTo(g);L.polyline(ss,{color:'#4a3410',weight:wt,dashArray:'2 4',interactive:false,lineCap:'butt'}).addTo(g);}
  if(map.getZoom()>=15&&posts.size<600)for(const v of posts.values())L.marker(v,{icon:L.divIcon({className:'post22',html:'',iconSize:[8,8]}),interactive:false}).addTo(g);}
window.drawRings22=drawRings;HOOK.draw(function(){try{drawRings();}catch(e){console.warn('rings22',e);}});setTimeout(()=>{try{drawRings();map.on('zoomend',drawRings);}catch(e){}},1500);
// ---------- phone Drive header + Route complete card + calmer status chips
function driveHdr(){let h=q('#drivehdr22');const on=!!(G.drive&&G.drive.on);document.body.classList.toggle('driving22',on);if(!on){h&&h.remove();return;}
  if(!h){h=document.createElement('div');h.id='drivehdr22';document.body.appendChild(h);}const live=!!G.pos;h.innerHTML=`<b>🚗 DRIVE MODE</b><span class="${live?'ok':'bad'}">● GPS ${live?'live':'weak'}</span>`;}
setInterval(driveHdr,1000);
const _inf22=UI.info;UI.info=function(o){const r=_inf22.apply(this,arguments);try{const m=q('#modal');m&&m.classList.toggle('route22',!!(o&&/Route complete/.test(o.title||'')));}catch(e){}return r;};
})();
