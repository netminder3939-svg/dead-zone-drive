// Stage 2b: the horde claims territory like GPS players. Gang squads walk out from their HQ/outposts one hex at a time
// along a contiguous path, claiming as they go, toward a scored target. Defense always runs first inside your rings.
// Simulated by elapsed time on app open (seeded, so the same history every time). Plus alliance view: route threads,
// roster, map layer toggles.
const HB=()=>BAL.horde;
function gangBases(f){return[f.home,...Object.keys(f.outposts||{})].filter(id=>f.tiles[id]);}
function nearestBase(f,id){return gangBases(f).sort((a,b)=>hexDist(a,id)-hexDist(b,id))[0]||f.home;}
function ensureSquads(f,fid,t){f.outposts=f.outposts||{};f.squads=f.squads||[];const n=Math.min(HB().squadsMax,HB().squadsBase+(f.tier||0));
  while(f.squads.length<n)f.squads.push({id:fid+'-'+f.squads.length+'-'+(f.tier||0),pos:f.home,path:[],target:null,why:'',moved:0,restUntil:t+f.squads.length*3*3600e3,woundUntil:0,trail:[]});}
function passable(id,fid){const o=G.terr[id],gi=fxIndex()[id];return !(enemyAt(id)&&!W().enemyTaken[id])&&!(gi&&gi!==fid)&&!(o&&!o.ai&&!o.released&&o.uid&&o.uid!==P.uid);}
function activeDefs(id){return defendersFor(id).filter(d=>{const o=structOf(d);return o&&o.state==='up';});}
// FIX (Stage 2b): defense power is the FULL power of every standing defender covering the hex. Before, condition (hpPct)
// scaled power and every won defense permanently cut condition, so after 2-3 attacks the Stronghold quietly fell below
// raid power, was destroyed, and from then on every hex was taken with "no defense".
function defPower(defs){return defs.reduce((a,d)=>a+d.power,0);}
function squadPower(f,s,t){return Math.round(factionAttack(f)*(t<(s.woundUntil||0)?HB().woundMult:1));}
function planSortie(f,fid,s,rnd,t){const H=HB(),gi=fxIndex(),start=gi[s.pos]===fid?s.pos:nearestBase(f,s.pos);s.pos=start;
  const cap=BAL.factions.maxTiles+BAL.factions.maxTilesPerTier*(f.tier||0),full=Object.keys(f.tiles).length>=cap,sp=squadPower(f,s,t);
  const prev={[start]:null},dist={[start]:0},q=[start];let best=null;
  while(q.length){const id=q.shift(),d=dist[id];if(d>=H.searchRadius)continue;const[a,b]=idQR(id);
    for(const x of hexRing(a,b,1)){if(x.id===id||x.id in prev||!passable(x.id,fid))continue;prev[x.id]=id;dist[x.id]=d+1;q.push(x.id);
      if(gi[x.id]===fid)continue;let sc=-H.wDist*(d+1),why='';const ti=tileInfo(x.id);
      if(ti.res){sc+=H.wRich*ti.yield;why=`rich ${RESN2[ti.res]} tile`;}
      const [qa,ra]=idQR(x.id),nb=hexRing(qa,ra,1).filter(n=>n.id!==x.id);
      if(P.tiles[x.id]){const defs=activeDefs(x.id),dp=defPower(defs);
        if(!defs.length){sc+=H.wUndefended;why=why||'undefended edge';if(nb.some(n=>P.tiles[n.id]&&activeDefs(n.id).length)){sc+=H.wGap;why='gap between your rings';}}
        else if(dp<sp){sc+=H.wBeatable;why='weakly defended hex';}else sc+=H.wStrong;
        if(nb.some(n=>gi[n.id]))sc+=H.wContested;}
      else{if(full)continue;sc+=H.wNeutral;why=why||'open ground';if(nb.some(n=>P.tiles[n.id])){sc+=H.wContested;why=why==='open ground'?'contested ground':why;}}
      sc+=rnd()*0.5;if(!best||sc>best[1])best=[x.id,sc,why];}}
  if(!best){s.target=null;s.path=[];return;}
  const path=[];for(let c=best[0];c&&c!==start;c=prev[c])path.unshift(c);s.target=best[0];s.why=best[2];s.path=path.slice(0,H.maxPath);}
function endSortie(f,fid,s,rnd,t,ev){const H=HB(),B=gangBases(f);
  if(f.tiles[s.pos]&&Object.keys(f.outposts).length<H.outpostsBase+(f.tier||0)&&B.every(b=>hexDist(b,s.pos)>=H.outpostEvery)){f.outposts[s.pos]=t;ev.outposts.push([fdef(fid).name,s.pos]);}
  s.moved=0;s.restUntil=t+(H.restHours+rnd()*H.restJitter)*3600e3;planSortie(f,fid,s,rnd,t);} // next target is picked now => visible warning while they rest
function squadReplay(defs,dp,sp,gname){const f=raidReplay(defs,dp,sp);[f.startB[0],f.B[0]].forEach(u=>{if(u)u.name=`${gname} squad (power ${sp})`;});return f;}
function squadStep(f,fid,s,k,t,ev){const H=HB(),d=fdef(fid),rnd=seedRand(P.uid+':sq:'+s.id+':'+k);
  if(t<s.restUntil)return;if(!s.path.length){planSortie(f,fid,s,rnd,t);if(!s.path.length){s.restUntil=t+H.restHours*3600e3;return;}}
  const next=s.path[0],gi=fxIndex();
  if(!passable(next,fid)){s.path=[];return;}
  const fx=FX(),day=pacificDate(t);fx.takes[day]=fx.takes[day]||0;
  if(gi[next]!==fid){
    if(P.tiles[next]){if(fx.takes[day]>=BAL.factions.maxTakesPerDay){endSortie(f,fid,s,rnd,t,ev);return;}
      const defs=activeDefs(next),sp=squadPower(f,s,t);
      if(defs.length){const dp=defPower(defs),rep=squadReplay(defs,dp,sp,d.name),fr={tile:next,f:rep,dp,destroyed:[]};ev.fights.push(fr);
        if(dp>=sp){ev.held.push(next);defs.forEach(x=>{const o=structOf(x);if(o)o.hpPct=Math.max(.3,(o.hpPct??1)-0.1);});addRes(BAL.ai.winLoot);
          s.woundUntil=t+H.woundHours*3600e3;s.path=[];s.pos=nearestBase(f,s.pos);s.moved=0;s.restUntil=t+H.retreatHours*3600e3;s.trail=[];planSortie(f,fid,s,rnd,t);ev.power=Math.max(ev.power||0,sp);return;}
        const wreck=sp>=dp*H.destroyRatio;defs.forEach(x=>{const o=structOf(x);if(wreck){destroy(x);fr.destroyed.push(structName(x));ev.destroyed.push(structName(x));}else if(o)o.hpPct=H.damageOnLoss;});}
      else ev.fights.push({tile:next,f:null});
      delete P.tiles[next];W().raider[next]=t;fx.takes[day]++;NET.claimHex(next,{by:d.name,ai:true,color:d.color,t});const op=(W().outposts||{})[next];if(op)op.state='down';
      ev.took.push(next);ev.power=Math.max(ev.power||0,sp);}
    else{const cap=BAL.factions.maxTiles+BAL.factions.maxTilesPerTier*(f.tier||0);if(Object.keys(f.tiles).length>=cap){endSortie(f,fid,s,rnd,t,ev);return;}ev.grew[d.name]=(ev.grew[d.name]||0)+1;}
    f.tiles[next]=t;fxDirty();}
  s.pos=next;s.path.shift();s.moved++;s.trail.push(next);if(s.trail.length>12)s.trail.shift();
  if(!s.path.length||s.moved>=H.sortieHexes)endSortie(f,fid,s,rnd,t,ev);}
function hordeStep(k,ev){const B=BAL.factions,fx=FX(),t=k*HB().stepMin*60e3;
  B.list.forEach((d,fi)=>{let f=fx.f[d.id];
    if(!f){spawnFaction(fi,0,t);f=fx.f[d.id];if(f)ensureSquads(f,d.id,t);return;}
    if(f.routedUntil){if(t>=f.routedUntil){spawnFaction(fi,(f.tier||0)+1,t);const g=fx.f[d.id];if(g)ensureSquads(g,d.id,t);ev.back.push(d.name);}return;}
    ensureSquads(f,d.id,t);f.squads.forEach(s=>squadStep(f,d.id,s,k,t,ev));});}
function newEv(){return{grew:{},took:[],held:[],fights:[],outposts:[],back:[],destroyed:[]};}
function hordeReport(ev,when){const grew=Object.entries(ev.grew),parts=[];
  if(grew.length)parts.push(grew.map(([n,c])=>`${n} +${c} hex${c>1?'es':''}`).join(', '));
  if(ev.held.length)parts.push(`🛡️ your defenses beat ${ev.held.length} squad${ev.held.length>1?'s':''}`);
  if(ev.took.length)parts.push(`🚩 lost ${ev.took.length} hex${ev.took.length>1?'es':''}`);
  if(ev.outposts.length)parts.push(`🏚️ ${ev.outposts.map(x=>x[0]).join(', ')} built an outpost`);if(ev.back.length)parts.push(`${ev.back.join(', ')} came back stronger`);
  if(!parts.length)return null;const txt='☠️ Horde: '+parts.join(' · ');
  if(ev.fights.length||ev.took.length){const w=W();w.reports.unshift({t:when,text:txt,win:!ev.took.length,detail:{power:ev.power||0,lost:ev.took,held:ev.held,destroyed:ev.destroyed},fights:ev.fights});
    w.reports.forEach((r,i)=>{if(i>=5)delete r.fights;});w.reports=w.reports.slice(0,80);w.unseen=[when,...(w.unseen||[])].slice(0,5);allianceLog(`${P.name}: ${txt}`);}
  else report(txt,true);return{txt,parts};}
factionCatchUp=function(quiet){if(!P.world||!P.uid)return;const B=BAL.factions,fx=FX(),step=HB().stepMin*60e3,now=Date.now();
  if(!fx.start){if(Object.keys(P.tiles).length<B.startTiles)return;fx.anchor=fxAnchor();if(!fx.anchor)return;fx.start=now;fx.last=Math.floor(now/step);fx.v=2;
    const ev=newEv();hordeStep(fx.last,ev);report('☠️ Three raider gangs have set up camp a couple of km away. Their squads will walk out and claim ground toward you.',false);save();drawWorld();return;}
  if(fx.v!==2){fx.v=2;fx.last=Math.floor(now/step);} // Stage 2 saves used 4-hour ticks: switch to squad steps from now
  const from=Math.max(fx.last+1,Math.floor((now-B.maxCatchUpDays*864e5)/step)),to=Math.floor(now/step);if(to<from)return;
  const ev=newEv();for(let k=from;k<=to;k++)hordeStep(k,ev);fx.last=to;Object.keys(fx.takes).sort().slice(0,-3).forEach(d=>delete fx.takes[d]);
  const r=hordeReport(ev,now);
  if(r){if(ev.fights.some(x=>x.f))setTimeout(()=>UI.attackAlert(W().reports[0]),quiet?0:900);
    else if(!quiet||ev.took.length)UI.notice(`<b>${to-from>6?'While you were away':'Horde activity'}</b><br><small>${r.parts.join('<br>')}</small>`,ev.took.length?[['🗺️ Show',()=>flashTiles(ev.took)]]:[]);}
  save();drawWorld();UI.hud();};
// Old random raids are gone: the AI-attack demo now sends the nearest squad straight at you, step by step.
catchUpAI=function(){const w=W();w.lastAi=Date.now();try{factionCatchUp();outpostTick();}catch(e){console.error(e);}};
aiAttack=function(){return hordeDemo();};
function hordeDemo(){if(!P.world)return null;const fx=FX();if(!fx.start){if(Object.keys(P.tiles).length<BAL.factions.startTiles){toast(`Gangs appear at ${BAL.factions.startTiles} hexes`);return null;}factionCatchUp(true);}
  const now=Date.now(),step=HB().stepMin*60e3,k0=Math.floor(now/step),anchor=fx.anchor;let pick=null;
  for(const [fid,f] of Object.entries(fx.f)){if(f.routedUntil)continue;ensureSquads(f,fid,now);for(const s of f.squads){const dd=hexDist(s.pos,anchor);if(!pick||dd<pick[2])pick=[fid,s,dd];}}
  if(!pick)return null;const [fid,s]=pick,f=fx.f[fid];
  // demo: walk the squad toward your land through gang ground first (contiguous), then let it pick a target as usual
  // demo: aim the squad at your land (scoring limited to your hexes, wider search), then walk it step by step
  const H=BAL.horde,keep={...H};Object.assign(H,{searchRadius:30,maxPath:40,sortieHexes:40,wNeutral:-1e6,wRich:0});
  s.restUntil=0;s.woundUntil=0;s.moved=0;s.path=[];const ev=newEv();let k=k0;
  const FB=BAL.factions,keepT=FB.maxTakesPerDay;FB.maxTakesPerDay=99;
  try{planSortie(f,fid,s,seedRand('demo'+now),now);
  for(let i=0;i<45&&!ev.took.length&&!ev.held.length;i++){if(i&&s.restUntil>now){s.restUntil=0;s.moved=0;}squadStep(f,fid,s,k++,now,ev);}}finally{Object.assign(H,keep);FB.maxTakesPerDay=keepT;}
  if(!ev.took.length&&!ev.held.length)toast('No squad could reach your land yet');
  const r=hordeReport(ev,now);save();drawWorld();UI.hud();return r?{power:ev.power||0,held:ev.held,lost:ev.took,destroyed:ev.destroyed}:{power:0,held:[],lost:[],destroyed:[]};}

// ---------- drawing: gang squads, trails, targets, gang outposts; ally route threads ----------
G.lay=Object.assign({mine:true,allies:true,enemy:true},JSON.parse(localStorage.getItem('wl_layers')||'{}'));
function layerToggle(k){G.lay[k]=!G.lay[k];localStorage.setItem('wl_layers',JSON.stringify(G.lay));drawWorld();UI.layers(true);}
UI.layers=function(keep){let el=$('#laypop');if(el&&!keep){el.remove();return;}if(!el){el=document.createElement('div');el.id='laypop';document.body.appendChild(el);}
  el.innerHTML=[['mine','🟦 Mine'],['allies','🧵 Allies'],['enemy','🟥 Enemy']].map(([k,n])=>`<button class="${G.lay[k]?'on':''}" onclick="layerToggle('${k}')">${n}</button>`).join('');};
function threadSegs(entries){const segs=[];let cur=[];entries.sort((a,b)=>a[1]-b[1]).forEach(([id,t],i)=>{const p=entries[i-1];
  if(p&&hexDist(p[0],id)<=2&&t-p[1]<45*60e3)cur.push(id);else{if(cur.length>1)segs.push(cur);cur=[id];}});if(cur.length>1)segs.push(cur);return segs;}
const _drawH=drawWorld;drawWorld=function(){_drawH();if(typeof map==='undefined'||!P.world)return;if(!G.layers.horde)G.layers.horde=L.layerGroup().addTo(map);const g=G.layers.horde;g.clearLayers();
  const z=map.getZoom();if(z<13)return;const c=map.getCenter(),h=hexAt(c.lat,c.lng),n=z>=16?8:z>=15?12:16,near=id=>hexDist(id,h.id)<=n+2;
  // route threads: allies (their claimed hexes in claim order) and mine
  const by={};if(G.lay.allies)for(const [id,o] of Object.entries(G.terr)){if(!o||o.ai||o.released||!o.uid||o.uid===P.uid||!near(id))continue;(by[o.uid]=by[o.uid]||{c:o.color||'#4ad7ff',e:[]}).e.push([id,o.t||0]);}
  if(G.lay.mine)by._me={c:P.color,e:Object.entries(P.tiles).filter(([id,v])=>!v.area&&near(id)).map(([id,v])=>[id,v.t||0])};
  Object.values(by).forEach(u=>threadSegs(u.e).forEach(seg=>L.polyline(seg.map(id=>hexCenter(...idQR(id))),{color:u.c,weight:3,opacity:.75,dashArray:'1 6',lineCap:'round',interactive:false}).addTo(g)));
  if(!G.lay.enemy)return;
  const fx=P.world.fx;if(!fx||!fx.f)return;
  for(const [fid,f] of Object.entries(fx.f)){const d=fdef(fid);
    Object.keys(f.outposts||{}).forEach(id=>{if(isVis(id)&&near(id))L.marker(hexCenter(...idQR(id)),{icon:L.divIcon({className:'lodm',html:`<div class="ico fx fxop" style="color:${d.color}"><span>🏚️</span><b class="nm">${d.name} outpost</b></div>`,iconSize:[0,0]}),zIndexOffset:340}).on('click',()=>UI.infoFaction(id)).addTo(g);});
    (f.squads||[]).forEach(s=>{const tr=s.trail.filter(isVis);if(tr.length>1)L.polyline(tr.map(id=>hexCenter(...idQR(id))),{color:d.color,weight:4,opacity:.85,dashArray:'6 6',interactive:false}).addTo(g);
      const resting=Date.now()<s.restUntil;
      if(isVis(s.pos))L.marker(hexCenter(...idQR(s.pos)),{icon:L.divIcon({className:'lodm',html:`<div class="ico squad" style="color:${d.color}"><span>${d.icon}</span><b class="nm">${d.name} squad${resting?' · resting':''}</b></div>`,iconSize:[0,0]}),zIndexOffset:600}).on('click',()=>UI.infoSquad(fid,s.id)).addTo(g);
      if(s.target&&isVis(s.target))L.marker(hexCenter(...idQR(s.target)),{icon:L.divIcon({className:'lodm',html:`<div class="ico target" style="color:${d.color}"><span>⚠️</span><b class="nm">${d.name} target</b></div>`,iconSize:[0,0]}),zIndexOffset:620}).on('click',()=>UI.infoSquad(fid,s.id)).addTo(g);});}};
UI.infoSquad=function(fid,sid){const f=FX().f[fid],s=f&&(f.squads||[]).find(x=>x.id===sid);if(!s)return;const d=fdef(fid),now=Date.now(),sp=squadPower(f,s,now),tdefs=s.target&&P.tiles[s.target]?activeDefs(s.target):[],dp=defPower(tdefs);
  this.info({title:`${d.icon} ${d.name} squad`,sub:Date.now()<s.restUntil?`Resting · heads out in ${fmtDur(s.restUntil-now)}`:`On the move · ${s.path.length} hex${s.path.length===1?'':'es'} to go`,art:imgTag('raider.svg'),diff:[`POWER ${sp}`,d.color],
    body:`<div class="row"><div class="grow">Target: <b>${s.target?s.why||'ground':'none yet'}</b>${s.target?`<small>${s.path.length} hexes away · they claim one hex every ${HB().stepMin} min while moving</small>`:''}</div></div>`+
      (s.target&&P.tiles[s.target]?`<div class="row ${dp>=sp?'':'warn'}"><div class="grow">${tdefs.length?`Your defense there: <b>${dp}</b> vs squad <b>${sp}</b> → ${dp>=sp?'🛡️ they will be beaten back':'🚩 they would win'}`:'⚠️ No tower, outpost or Stronghold covers this hex: it will fall without a fight.'}<small>Build a tower or outpost in range, or fund Fortified Walls, to stop them.</small></div></div>`:'')+
      (now<(s.woundUntil||0)?'<div class="row"><div class="grow">🩹 Wounded after losing a fight (−40% power for a day)</div></div>':''),
    buttons:s.target?[['🗺️ Show target',()=>{UI.closeModal();map.setView(hexCenter(...idQR(s.target)),16);}]]:[]});};

// ---------- alliance roster (km, tiles held, resources earned, donations, last active) ----------
const _addRes=addRes;addRes=function(o,mult=1,boost=false){const sum=()=>Object.values(P.res).reduce((a,b)=>a+(b||0),0),b=sum();_addRes(o,mult,boost);const g=sum()-b;if(g>0){P.contrib.earned=(P.contrib.earned||0)+g;}};
const _ms=memberSummary;memberSummary=function(){return{..._ms(),tiles:Object.keys(P.tiles||{}).length};};
UI.SUBS.alliance.splice(2,0,['roster','📋 Roster']);
const _renderH=UI.render;UI.render=function(){_renderH.call(this);if(this.tab!=='alliance'||this.sub.alliance!=='roster')return;const A=G.al||{members:{}},M=Object.entries(A.members||{});
  const held=uid=>Object.values(G.terr).filter(o=>o&&o.uid===uid&&!o.released).length;
  const rows=M.map(([uid,m])=>{const c=m.contrib||{},me=m.me;return{name:m.name+(me?' (you)':''),color:m.color,km:(c.km||0),tiles:me?Object.keys(P.tiles).length:(m.tiles??held(uid)),earned:me?(P.contrib.earned||c.earned||0):(c.earned||0),don:c.deposited||0,last:m.lastActive};}).sort((a,b)=>b.tiles-a.tiles);
  $('#sheetBody').insertAdjacentHTML('beforeend',`<h2>📋 Roster</h2><p class="tiny">Activity and contributions only. No locations. Tap 🗂️ on the map (Allies layer) to see teammates' route threads (claimed hexes, not GPS).</p>
    <table class="log2 roster"><tr><th>Member</th><th>km</th><th>Tiles</th><th>Earned</th><th>Gave</th><th>Active</th></tr>${rows.map(r=>`<tr><td><i class="cdot" style="background:${r.color}"></i>${r.name}</td><td>${r.km.toFixed(1)}</td><td>${r.tiles}</td><td>${r.earned}</td><td>${r.don}</td><td>${ago(r.last)}</td></tr>`).join('')}</table>`);};
document.addEventListener('DOMContentLoaded',()=>{const b=document.createElement('button');b.id='btnLayers';b.className='fab';b.title='Map layers';b.textContent='🗂️';b.onclick=()=>UI.layers();document.body.appendChild(b);});
