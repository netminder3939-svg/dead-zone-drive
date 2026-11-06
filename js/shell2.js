// UI redesign Step 2 (test build): Map shell. Name plate -> Profile stub; no right column; nav Base · Plan · Alliance · Hero; Drive mode blocks tile taps.
(function(){
const tabs=document.getElementById('tabs');if(!tabs)return;
const q=s=>tabs.querySelector(s);
q('[data-tab=map]').classList.add('navhide');q('[data-tab=inv]').classList.add('navhide');
const pl=q('[data-tab=player]');if(pl){pl.innerHTML='🛡️<span>Hero</span>';q('[data-tab=alliance]').after(pl);}
const plan=document.createElement('button');plan.dataset.tab='plan';plan.innerHTML='🧭<span>Plan</span>';q('[data-tab=base]').after(plan);
plan.onclick=()=>{if(UI.tab==='plan'){UI.close();return;}UI.open('plan');};
UI.SUBS.plan=[['stub','🧭 Plan']];
const _r2=UI.render;UI.render=function(){if(this.tab!=='plan')return _r2.apply(this,arguments);const b=$('#sheetBody');this.hud();
  const n=(P.plan&&P.plan.route||[]).length;
  b.innerHTML=`<h2>🧭 Plan</h2><p class="tiny">Coming next: marks, routes and targets all move here. For now, the old tools:</p>
  <div class="srow"><span>Route stops</span><b>${n}</b></div>
  <div class="row"><button class="btn-sec" id="plCenter">◎ Recenter on me</button><button class="btn-sec" id="plNear">📍 Nearby</button><button class="btn-sec" id="plBuild">🏗️ Build here</button><button class="btn-sec" id="plLayers">🗂️ Map layers</button></div>`;
  const cl=id=>()=>{UI.close();document.getElementById(id).click();};$('#plCenter').onclick=cl('btnCenter');$('#plNear').onclick=cl('btnNear');$('#plBuild').onclick=cl('btnClaim');$('#plLayers').onclick=cl('btnLayers');};
// name plate -> Profile stub
const who=document.querySelector('#hud .who');if(who){who.classList.add('nameplate');who.onclick=()=>{const s=stats();
  UI.info({title:`${P.name||'Survivor'}`,sub:`Lv${P.lvl} · ${localStorage.getItem('wl_team')||''}`,art:'<span class="bigemo">🛡️</span>',
    body:`<div class="srow"><span>HP</span><b>${Math.round(P.hp)}/${s.hp}</b></div><div class="srow"><span>Attack</span><b>${s.atk}</b></div><div class="srow"><span>Defense</span><b>${s.def}</b></div><div class="srow"><span>Hexes held</span><b>${Object.keys(P.tiles||{}).length}</b></div><p class="tiny">Full profile coming in a later update.</p>`,
    buttons:[['🛡️ Open Hero',()=>{UI.closeModal();UI.open('player');}]]});};}
// resource bar -> Supplies (old Inventory)
const res=document.getElementById('res');if(res)res.addEventListener('click',e=>{if(e.target.closest('#troopchip'))return;UI.open('inv');});
// Drive mode: no tile cards while driving
const _it2=UI.infoTile;UI.infoTile=function(){if(G.drive&&G.drive.on){if(Date.now()-(G._dtT||0)>4000){G._dtT=Date.now();toast('🚗 Drive mode: tile taps are off. Stop driving to open tiles.');}return;}return _it2.apply(this,arguments);};
})();
