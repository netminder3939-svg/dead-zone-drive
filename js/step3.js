// UI Step 3 (test build, with Stage 8 troops): 2 regular + 4 support march slots; left-side march cards for every troop group out.
const SLOTS={reg:2,sup:4};BAL.march.maxActive=SLOTS.reg+SLOTS.sup;
function isSupportM(m){return ['patrol','escort','guard','reinforce','defend'].includes(m.kind)||(m.kind!=='intercept'&&typeof friendlyHex==='function'&&friendlyHex(m.to)&&!m.kind?.startsWith('fight'));}
function stationGroups(){try{return Object.entries(stationed()).map(([h,s])=>({h,n:s.n,at:s.at}));}catch(e){return[];}}
function poolUse(){const ms=myMarches().map(([,m])=>m);const sup=ms.filter(isSupportM).length+stationGroups().length;return{reg:ms.length-ms.filter(isSupportM).length,sup};}
const _cm3=canMarch;canMarch=function(id){const r=_cm3.apply(this,arguments);if(r)return r;const u=poolUse(),sup=friendlyHex(id);
  if(sup&&u.sup>=SLOTS.sup)return`${SLOTS.sup}/${SLOTS.sup} support out · recall one`;
  if(!sup&&u.reg>=SLOTS.reg){const nx=Math.min(...myMarches().map(([,m])=>m).filter(m=>!isSupportM(m)).map(m=>m.startT+2*m.dur-Date.now()));return`${SLOTS.reg}/${SLOTS.reg} marches out · next free ${fmtDur(nx)}`;}return null;};
// march cards
const ICON3={patrol:'🛡',escort:'🚚',intercept:'⚔',fort:'⚔',claim:'🚩'};
function mcardsDraw(){let box=document.getElementById('mcards');if(!box){box=document.createElement('div');box.id='mcards';document.body.appendChild(box);}
  const now=Date.now(),ms=myMarches(),reg=[],sup=[];
  for(const [id,m] of ms){const back=now>m.startT+m.dur,eta=back?m.startT+2*m.dur-now:m.startT+m.dur-now;const n=(TP().away||{})[id]||0;
    const c={id,to:m.to,ico:back?'↩':(ICON3[m.kind]||'⚔'),tr:n,txt:back?'Home':hexName(m.to),t:fmtDur(Math.max(0,eta))};(isSupportM(m)?sup:reg).push(c);}
  for(const g of stationGroups())sup.push({to:g.h,ico:'🛡',tr:g.n,txt:hexName(g.h),t:now<g.at?fmtDur(g.at-now):'∞'});
  const card=c=>`<div class="mcard" data-to="${c.to}"><b>${c.ico}</b><span class="mt">${c.txt}</span>${c.tr?`<em>🪖${kfmt?kfmt(c.tr):c.tr}</em>`:''}<i>${c.t}</i></div>`;
  let h=reg.map(card).join('');
  if(sup.length===1)h+=card(sup[0]);else if(sup.length>1)h+=G.supOpen?sup.map(c=>card(c).replace('mcard','mcard slim')).join('')+`<div class="mcard slim mclose">▾</div>`:`<div class="mcard msup"><b>🛡</b><span class="mt">Support ${sup.length}/${SLOTS.sup}</span><em>🪖${sup.reduce((a,c)=>a+(c.tr||0),0)}</em><i>${sup.map(c=>c.t).sort()[0]}</i></div>`;
  box.innerHTML=h;box.classList.toggle('drive',!!(G.drive&&G.drive.on));}
document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('#mcards .mcard');if(!c)return;
  if(c.classList.contains('msup')){G.supOpen=true;clearTimeout(G._supT);G._supT=setTimeout(()=>{G.supOpen=false;mcardsDraw();},8000);return mcardsDraw();}
  if(c.classList.contains('mclose')){G.supOpen=false;return mcardsDraw();}
  const to=c.dataset.to;if(to)try{map.setView(hexCenter(...idQR(to)),Math.max(map.getZoom(),16),{animate:true});flashTiles([to]);}catch(err){}});
setInterval(()=>{try{if(P&&P.world)mcardsDraw();}catch(e){}},1000);
