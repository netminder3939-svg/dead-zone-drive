// UI Step 6 (test build): Plan tab holds all planning (pins, route, targets, board) + a route builder; tile cards no longer carry plan buttons.
G.planMode=null; // 'route' | 'pin' while building
const _r6=UI.render;UI.render=function(){if(this.tab!=='plan')return _r6.apply(this,arguments);
  // borrow the Alliance › Plans page, then put it under the Plan tab
  const sub=this.sub.alliance;this.tab='alliance';this.sub.alliance='plans';try{_r6.apply(this,arguments);}catch(e){console.warn(e);}this.tab='plan';this.sub.alliance=sub;
  const b=$('#sheetBody');b.querySelector('.seg')?.remove();b.querySelector('.newsline')?.remove();const n=myPlan().route.length;
  b.insertAdjacentHTML('afterbegin',`<h2>🧭 Plan</h2><div class="row planbar"><button class="${G.planMode==='route'?'btn-primary':'btn-sec'}" id="pmRoute">${G.planMode==='route'?'✓ Done building':'➕ Build route'}</button><button class="${G.planMode==='pin'?'btn-primary':'btn-sec'}" id="pmPin">${G.planMode==='pin'?'✓ Done pinning':'📍 Pin hexes'}</button><button class="${G.planMode==='target'?'btn-primary':'btn-sec'}" id="pmTg">${G.planMode==='target'?'✓ Done':'🎯 Mark targets'}</button>${n?'<button class="btn-ghost" id="pmClr">🧹 Clear route</button>':''}</div>
  <p class="tiny">${G.planMode?'Tap hexes on the map: tap again to remove. ':''}Route ${n} stop${n===1?'':'s'}.</p>
  <div class="row"><button class="btn-sec" id="plCenter">◎ Recenter</button><button class="btn-sec" id="plNear">📍 Nearby</button><button class="btn-sec" id="plBuild">🏗️ Build here</button><button class="btn-sec" id="plLayers">🗂️ Layers</button></div>`);
  const cl=id=>()=>{UI.close();document.getElementById(id).click();};$('#plCenter').onclick=cl('btnCenter');$('#plNear').onclick=cl('btnNear');$('#plBuild').onclick=cl('btnClaim');$('#plLayers').onclick=cl('btnLayers');
  const mode=k=>()=>{G.planMode=G.planMode===k?null:k;if(G.planMode){UI.close();toast(k==='route'?'🧭 Tap hexes to add route stops':'📍 Tap hexes to pin them');}else UI.render();planBanner();};
  $('#pmRoute').onclick=mode('route');$('#pmPin').onclick=mode('pin');$('#pmTg').onclick=mode('target');const c=$('#pmClr');if(c)c.onclick=()=>{routeClear();UI.render();};};
UI.SUBS.alliance=UI.SUBS.alliance.filter(x=>x[0]!=='plans');
// builder: tile taps edit the plan instead of opening a card
const _it6=UI.infoTile;UI.infoTile=function(id){if(G.planMode==='route'){const p=myPlan();p.route.includes(id)?routeDel(id):routeAdd(id);return;}
  if(G.planMode==='target'){targetAdd(id,'');return;}if(G.planMode==='pin'){myPlan().pins.some(x=>x.hex===id)?delPin(id):addPin(id,'');return;}return _it6.apply(this,arguments);};
function planBanner(){let e=document.getElementById('planBanner');if(!G.planMode){e&&e.remove();return;}if(!e){e=document.createElement('button');e.id='planBanner';document.body.appendChild(e);e.onclick=()=>{G.planMode=null;planBanner();UI.open('plan');};}
  e.textContent=G.planMode==='target'?'🎯 Marking targets · tap hexes · ✓ Done':G.planMode==='route'?'🧭 Building route · tap hexes · ✓ Done':'📍 Pinning · tap hexes · ✓ Done';}
