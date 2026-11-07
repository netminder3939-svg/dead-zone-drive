// Playtest #1 fixes (test server).
// 1) Wheel zoom: one notch = 0.5 level at most, small trackpad nudges add up in 0.25 steps. Never more than 0.5 per event.
(function(){try{map.scrollWheelZoom.disable();map.options.zoomSnap=0.25;let acc=0,busy=0;
  map.getContainer().addEventListener('wheel',e=>{e.preventDefault();let d=e.deltaY*(e.deltaMode===1?40:e.deltaMode===2?400:1);
    let step=0;if(Math.abs(d)>=40){step=-Math.sign(d)*0.5;acc=0;}else{acc+=d;if(Math.abs(acc)>=60){step=-Math.sign(acc)*0.25;acc=0;}}
    if(!step)return;const now=Date.now();if(now<busy)return;busy=now+90;
    const z=Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),Math.round((map.getZoom()+step)*4)/4));if(z!==map.getZoom())map.setZoomAround(map.mouseEventToContainerPoint(e),z,{animate:false});},{passive:false});}catch(e){console.warn('wheel',e);}})();
// 2) Landmarks are public places: always on the map (dimmed under fog) and in Nearby within 1.5 km.
drawLandmarks=function(){const g=G.layers.lm;g.clearLayers();(G.landmarks||[]).forEach(l=>{const K=LANDMARK_KINDS[l.kind];if(!K)return;const fog=P.world&&!isVis(hexAt(l.lat,l.lng).id),boss=lairBoss(l),v=P.badges[l.id];
  L.marker([l.lat,l.lng],{icon:L.divIcon({className:'mk lodm',html:`<div class="ico lm${v?' visited':''}${boss&&!raidFor(l.id)?' lair':''}${fog?' lmfog':''}" ${fog?'style="opacity:.6"':''}><span>${K.icon}</span><b class="nm">${l.name}</b></div>`,iconSize:[0,0]})}).on('click',()=>UI.infoLandmark(l)).addTo(g);});};
const _near6=UI.nearest;UI.nearest=function(){const iv=isVis,lm=new Set((G.landmarks||[]).filter(l=>G.pos&&distM(...G.pos,l.lat,l.lng)<1500).map(l=>hexAt(l.lat,l.lng).id));isVis=id=>lm.has(id)||iv(id);try{return _near6.apply(this,arguments);}finally{isVis=iv;}};
(document.readyState==='complete'?f=>f():f=>window.addEventListener('load',f))(()=>setTimeout(()=>{try{if(G.landmarks&&G.landmarks.length)drawLandmarks();}catch(e){}},1500));
// 4) Previews: dev button that drops a weak mutant next to you, so a fight (and the battle card auto-close) is one tap away.
function devMob(){if(!G.pos)return;const me=hexAt(...G.pos),[a,b]=hexCenter(me.q,me.r),lat=a+(G.pos[0]-a)*.3+.00035,lng=b+(G.pos[1]-b)*.3;const ids=Object.keys(MONSTERS).filter(k=>!MONSTERS[k].boss&&!MONSTERS[k].fort).sort((x,y)=>MONSTERS[x].lvl-MONSTERS[y].lvl);
  const mid=ids[0],lvl=1,key='dev-'+Date.now();G.monList=G.monList||[];G.monList.push({mid,lvl,key,lat,lng});P.cooldownUntil=0;
  L.marker([lat,lng],{icon:L.divIcon({className:'mk lodm',html:`<div class="ico mon devmob"><img src="${monImg(mid)}" onerror="this.onerror=null;this.src='assets/monsters/${mid}.svg'"><b class="lv">Lv${lvl}</b></div>`,iconSize:[0,0]})}).on('click',()=>UI.infoMon(mid,lvl,key,lat,lng)).addTo(G.layers.mons);
  map.setView([lat,lng],Math.max(map.getZoom(),17),{animate:false});UI.infoMon(mid,lvl,key,lat,lng);toast('👾 Test mutant dropped next to you');}
(function(){try{if(!location.hostname.includes('--'))return;const bar=document.getElementById('devbar');if(!bar||bar.querySelector('[data-dev="mob"]'))return;const bt=document.createElement('button');bt.dataset.dev='mob';bt.textContent='👾 Test fight';bt.onclick=()=>{G.dev.any=true;devMob();};bar.insertBefore(bt,bar.firstChild);}catch(e){}})();
// 5) Stat breakdown lists running buffs as their own source row.
const _sb6=UI.statBreak;UI.statBreak=function(){_sb6.apply(this,arguments);try{if(typeof buffsActive!=='function')return;const act=buffsActive();if(!act.length)return;const keep=P.buffs.active;P.buffs.active={};const base=stats();P.buffs.active=keep;const now=stats(),K=['atk','def','hp','crit','agi','luck'];
  const tb=document.querySelector('#modalBody table.statbrk'),rows=tb&&tb.querySelectorAll('tr');if(!rows)return;const last=rows[rows.length-1];
  last.insertAdjacentHTML('beforebegin',`<tr class="buffrow"><td style="text-align:left">✨ ${act.map(id=>BUFF.list[id].name).join(' + ')}</td>${K.map(k=>{const d=(now[k]||0)-(base[k]||0);return d?`<td>+${d}</td>`:'<td style="opacity:.35">·</td>';}).join('')}</tr>`);}catch(e){console.warn('statbuff',e);}};
// A claim the server refuses (e.g. a new teammate spawning on a hex an ally already holds) is no longer an uncaught error:
// the hex is simply not yours, so drop it locally and redraw.
if(typeof FirebaseNet!=='undefined'){const _ch6=FirebaseNet.prototype.claimHex;FirebaseNet.prototype.claimHex=function(id,data){return _ch6.call(this,id,data).catch(e=>{console.warn('claim refused',id,e&&e.code);
  try{if(data&&data.uid&&data.uid===P.uid&&P.tiles[id]){delete P.tiles[id];save();drawWorld();UI.hud();}}catch(x){}});};}
