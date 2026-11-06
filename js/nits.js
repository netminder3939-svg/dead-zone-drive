// Nit patch (preview): ally structure labels on the map, battle-report empty state, ?awaytest=1 banner for testers.
// Teammates' standing structures (from their member doc `defs`) get a map label that survives reloads.
const _drawNits=drawWorld;drawWorld=function(){_drawNits();try{if(typeof map==='undefined'||!P.world)return;if(!G.layers.allyDefs)G.layers.allyDefs=L.layerGroup().addTo(map);const g=G.layers.allyDefs;g.clearLayers();if(map.getZoom()<14)return;
  const nm={sh:'Stronghold',tower:'Tower',op:'Outpost'},ic={sh:'🏰',tower:'🗼',op:'⛺'},mem=(G.al&&G.al.members)||{};
  for(const [uid,m] of Object.entries(mem)){if(isMe(uid)||m.me||!Array.isArray(m.defs))continue;
    m.defs.slice(0,40).forEach(d=>{if(!d||typeof d.hex!=='string'||!/^-?\d+_-?\d+$/.test(d.hex))return;
      L.marker(hexCenter(...idQR(d.hex)),{icon:L.divIcon({className:'lodm',html:`<div class="ico allydef" style="color:${s4esc(m.color||'#4ad7ff')}"><span>${ic[d.k]||'🛡️'}</span>${d.k==='sh'&&typeof hold24==='function'?hold24(uid,'Stronghold'):`<b class="nm lab24" style="--a:${s4esc(m.color||'#4ad7ff')}">${typeof av24==='function'?av24(uid,18):''}${poss(s4esc(m.name||'Ally'))} ${nm[d.k]||'structure'}</b>`}</div>`,iconSize:[0,0]}),zIndexOffset:610}).on('click',()=>UI.infoTile(d.hex)).addTo(g);});}}catch(e){console.warn('ally labels',e);}};
let _nitSig='';setInterval(()=>{try{const s=JSON.stringify(Object.entries((G.al&&G.al.members)||{}).map(([u,m])=>[u,m.defs||null]));if(s!==_nitSig){_nitSig=s;if(typeof map!=='undefined'&&P.world)drawWorld();}}catch(e){}},4000);
// Battle Reports: say so when no fight has happened yet (other reports can still be listed)
const _renderNits=UI.render;UI.render=function(){_renderNits.apply(this,arguments);try{if(this.tab!=='base'||this.sub.base!=='reports')return;const b=$('#sheetBody'),h=b&&b.querySelector('h2');const fights=(W().reports||[]).filter(r=>r.fights||r.detail||r.win===false).length;
  if(h&&!fights&&!b.querySelector('.noFights'))h.insertAdjacentHTML('afterend','<p class="tiny noFights">No battles yet. When raiders test your border or a march comes home bloodied, the story lands here.</p>');}catch(e){}};
// Previews only: ?awaytest=1 replays the last 12 horde steps as if you'd been away, so testers can see the banner on demand.
(document.readyState==='complete'?f=>f():f=>window.addEventListener('load',f))(()=>setTimeout(()=>{try{if(!location.hostname.includes('--')||!/[?&]awaytest=1\b/.test(location.search))return;
  const fx=P.world&&P.world.fx;let shown=false;const nt=UI.notice,aa=UI.attackAlert;UI.notice=function(){shown=true;return nt.apply(this,arguments);};UI.attackAlert=function(){shown=true;return aa.apply(this,arguments);};
  if(fx&&fx.start){fx.last=Math.max(0,(fx.last||0)-12);factionCatchUp(false);}UI.notice=nt;setTimeout(()=>{UI.attackAlert=aa;},1500);
  if(!shown)UI.notice(`<b>While you were away</b><br><small>(Preview test) The raiders kept to their camps. Nothing was lost.</small>`,[]);
  history.replaceState(null,'',location.pathname);}catch(e){console.warn('awaytest',e);}},6000));
