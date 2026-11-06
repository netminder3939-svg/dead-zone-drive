// v21 web look (matches v3 mockups 01-10). Visual only: top bar zone count + pipelines + reset, left march/troop panel
// (2 regular + 4 support slots, every group out gets a card), Zones + Map rail buttons, legend, zone walls, iron-rail
// pipelines, palisade tower rings, readable street labels. Map color filter, claimed glow, icons and fonts are untouched.
(function(){
const q=s=>document.querySelector(s),web=()=>innerWidth>=1100;
// ---- rail: Map (closes panel) + Zones
try{const tabs=q('#tabs');const mp=q('[data-tab=map]');if(mp){mp.classList.remove('navhide');mp.classList.add('v21map');tabs.prepend(mp);mp.onclick=e=>{e.stopPropagation();UI.close();};}
  if(!q('[data-tab=zones21]')){const z=document.createElement('button');z.dataset.tab='zones21';z.className='v21only';z.innerHTML='🏴<span>Zones</span>';const pl=q('[data-tab=plan]');(pl||q('[data-tab=base]')).after(z);
    z.onclick=e=>{e.stopPropagation();UI.sub.alliance='zones';UI.open('alliance');};}}catch(e){}
// ---- top bar
function zoneCounts(){let crew=0,horde=0,cont=0;try{for(const z of zonesNear(ZONE.listKm)){if(z.st==='fortified'||z.st==='fortifying')crew++;else if(z.st==='horde')horde++;else if(z.st==='contested')cont++;}}catch(e){}return{crew,horde,cont};}
function topbar(){const hud=q('#hud');if(!hud||!P||!P.world)return;let z=q('#zone21'),r=q('#right21');
  if(!z){z=document.createElement('button');z.id='zone21';z.className='chip';z.onclick=()=>{UI.sub.alliance='zones';UI.open('alliance');};hud.insertBefore(z,q('#btnInbox'));}
  if(!r){r=document.createElement('div');r.id='right21';hud.insertBefore(r,q('#btnInbox'));}
  const c=zoneCounts(),al=(G.al&&G.al.name)||'Crew';
  z.innerHTML=`🏴 Zones: <b class="zc">${m2esc?m2esc(al):al} ${c.crew}</b> · <b class="zh">Horde ${c.horde}</b> · <b class="zf">Contested ${c.cont}</b>`;
  let on=0,all=0;try{all=pipes().length;on=pipes().filter(p=>pipeState(p)==='online').length;}catch(e){}let cap=3;try{cap=pipeCap();}catch(e){}
  r.innerHTML=`<span class="chip">⛓️ ${on}/${cap} pipelines</span><span class="chip">⏳ Reset ${fmtDur(msToReset()).replace(/ \d+s$/,'')}</span>`;}
// ---- left march / troop panel
const KIND={intercept:['⚔️','ATTACK'],fort:['⚔️','ATTACK'],mob:['⚔️','FIGHT'],patrol:['🛡️','GUARD'],guard:['🛡️','GUARD'],escort:['🚚','ESCORT'],reinforce:['🛡️','REINFORCE'],defend:['🛡️','DEFEND']};
mcardsDraw=function(){let box=q('#mcards');if(!box){box=document.createElement('div');box.id='mcards';document.body.appendChild(box);}
  const now=Date.now(),reg=[],sup=[];
  for(const [id,m] of myMarches()){const back=now>m.startT+m.dur,eta=back?m.startT+2*m.dur-now:m.startT+m.dur-now,pr=back?(now-m.startT-m.dur)/m.dur:(now-m.startT)/m.dur;
    let n=0;try{n=(TP().away||{})[id]||0;}catch(e){}const k=KIND[m.kind]||(isSupportM(m)?['🛡️','SUPPORT']:['🚩','CLAIM']);
    (isSupportM(m)?sup:reg).push({to:m.to,ico:back?'↩️':k[0],lab:back?'RETURNING':k[1],n,dest:back?'Stronghold':hexName(m.to),t:fmtDur(Math.max(0,eta)),pr:Math.min(1,Math.max(0,pr))});}
  try{for(const g of stationGroups())sup.push({to:g.h,ico:'🛡️',lab:'STATIONED',n:g.n,dest:hexName(g.h),t:now<g.at?fmtDur(g.at-now):'holding',pr:1});}catch(e){}
  const kf=x=>typeof kfmt==='function'?kfmt(x):x;
  const card=(c,cls)=>`<div class="mcard v21 ${cls||''}" data-to="${c.to}"><div class="l1"><b>${c.ico} ${c.lab}</b><em>🪖 ${kf(c.n||0)}</em></div><div class="l2">→ ${c.dest} · <i>${c.t}</i></div><div class="pb"><s style="width:${Math.round(c.pr*100)}%"></s></div></div>`;
  const empty=t=>`<div class="mcard v21 empty"><div class="l2">${t}</div></div>`;
  let h=`<div class="mhead">MARCHES · regular ${reg.length}/${SLOTS.reg} · support ${sup.length}/${SLOTS.sup}</div>`;
  h+=reg.map(c=>card(c)).join('')+(reg.length<SLOTS.reg?empty(`⚔️ ${SLOTS.reg-reg.length} regular slot${SLOTS.reg-reg.length>1?'s':''} free · attack / claim`):'');
  h+=sup.map(c=>card(c,'sup')).join('')+(sup.length<SLOTS.sup?empty(`🛡️ ${SLOTS.sup-sup.length} support slot${SLOTS.sup-sup.length>1?'s':''} free · guard / escort / reinforce`):'');
  box.innerHTML=h;box.classList.add('v21');box.classList.toggle('drive',!!(G.drive&&G.drive.on));box.classList.toggle('quiet',!web()&&!reg.length&&!sup.length);};
// ---- legend
function legend(){if(q('#legend21'))return;const d=document.createElement('div');d.id='legend21';d.innerHTML=`<b>LEGEND</b><div><i class="lg wall"></i>Zone wall (captured)<i class="lg front"></i>Front line</div><div><i class="lg zb"></i>Zone border<i class="lg march"></i>March<i class="lg pipe"></i>Pipeline</div>`;document.body.appendChild(d);}
// ---- readable street labels: label-only overlay above the (locked, filtered) base map
setTimeout(()=>{try{if(G._lbl21)return;map.createPane('lbl21');const pn=map.getPane('lbl21');pn.style.zIndex=450;pn.style.pointerEvents='none';
  G._lbl21=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',{pane:'lbl21',maxZoom:19,maxNativeZoom:16,minZoom:13,opacity:.95,interactive:false}).addTo(map);}catch(e){console.warn('labels',e);}},0);
// ---- zone walls (thick crenellated gold / red), front line (gold dashed), border (thin dashed)
try{ZSTYLE.fortified={color:'#e9b949',weight:8,opacity:1};ZSTYLE.horde={color:'#c8372a',weight:7,opacity:.95};ZSTYLE.contested={color:'#f0c450',weight:4,opacity:.95,dashArray:'12 7'};ZSTYLE.fortifying={color:'#f0c450',weight:5,opacity:.95,dashArray:'16 5'};ZSTYLE.neutral={color:'#a08860',weight:1.6,opacity:.45,dashArray:'6 8'};
  const _dz=drawZones;drawZones=function(){_dz.apply(this,arguments);try{const g=G.layers.zones;if(!g)return;const add=[];g.eachLayer(l=>{if(!(l instanceof L.Polyline))return;const o=l.options;
    if((o.color==='#e9b949'||o.color==='#c8372a')&&o.weight>=7){add.push([l.getLatLngs(),o.color]);}});
    for(const [ll,c] of add){L.polyline(ll,{color:'#1a1208',weight:12,opacity:.9,interactive:false,lineCap:'butt'}).addTo(g).bringToBack();L.polyline(ll,{color:c==='#e9b949'?'#5a3d0e':'#3a0d08',weight:3,opacity:.95,dashArray:'5 7',interactive:false,lineCap:'butt'}).addTo(g);}
    g.eachLayer(l=>{if(l.options&&l.options.color==='#2a1d0a'&&l.options.weight===2)g.removeLayer(l);});}catch(e){}};}catch(e){}
// ---- pipeline style A: iron double rail with ties + truck
try{const _dp=drawPipes;drawPipes=function(){_dp.apply(this,arguments);try{const g=G.layers.pipes;if(!g)return;const keep=[];g.eachLayer(l=>{if(l instanceof L.Polyline&&!(l instanceof L.Polygon))keep.push(l);});
  const seen=new Set();for(const l of keep){const ll=l.getLatLngs(),key=JSON.stringify(ll[0])+ll.length;const o=l.options;if(o.weight===5){if(seen.has(key))continue;seen.add(key);const op=o.opacity,col=o.color,pin=o.dashArray;
      L.polyline(ll,{color:'#0e0b07',weight:13,opacity:.9*op,interactive:false,lineCap:'round'}).addTo(g);L.polyline(ll,{color:'#9c8a66',weight:10,opacity:op,interactive:false,lineCap:'round',dashArray:pin||null}).addTo(g);
      L.polyline(ll,{color:'#1d1710',weight:5,opacity:op,interactive:false}).addTo(g);L.polyline(ll,{color:col,weight:11,opacity:.85*op,interactive:false,dashArray:'2 16',lineCap:'butt'}).addTo(g);}
    g.removeLayer(l);}
  g.eachLayer(l=>{if(l instanceof L.Marker)l.setZIndexOffset((l.options.zIndexOffset||0)+1);});}catch(e){console.warn('pipe21',e);}};}catch(e){}
// ---- tick
const tick=()=>{try{topbar();legend();document.body.classList.add('v21');}catch(e){}};setInterval(tick,2000);setTimeout(tick,500);
setTimeout(()=>{try{drawZones();drawPipes();}catch(e){}},1500);
})();
