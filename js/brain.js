// v20 Horde brain v2. Every outing a squad picks an INTENT (seeded, so every phone agrees) and shows it, so the crew can read
// and counter it. Builds on the gang strategies (Rush / Siege / Supply raid).
//   ✂️ Cut      go sit on a hex of a crew pipeline route (prefers the longest line)        — 40% when one is in reach
//   🔨 Crack    hit a fortified / fortifying crew zone to crack its wall                    — 35%
//   🚫 Deny     grab a hex in a zone the crew is close to finishing (70%+)                  — 35%
//   🪤 Ambush   wait on a planned route or an active march line                             — 25%
//   📣 Offensive (every 3 days, announced 24 h ahead): all squads go for one crew zone at +25% power for 24 h.
//      Hold 80%+ of that zone through it and every member can claim a big reward (XP, resources, a Rare+ piece).
const BRAIN={chance:{cut:.40,crack:.35,deny:.35,ambush:.25},denyAt:.70,offEveryDays:3,offWarnH:24,offLenH:24,offPower:1.25,offHoldPct:.80,
  offReward:{xp:300,res:{scrap:150,food:80,water:80,fuel:40,parts:30}},
  icons:{cut:['✂️','Cut a pipeline'],crack:['🔨','Crack a zone wall'],deny:['🚫','Deny a zone'],ambush:['🪤','Ambush a route'],offensive:['📣','Offensive'],raid:['⚔️','Raid']}};
function bfsTo(start,fid,want){const H=HB(),prev={[start]:null},dist={[start]:0},q=[start];while(q.length){const id=q.shift();if(dist[id]>=H.searchRadius)continue;const [a,b]=idQR(id);
  for(const n of hexRing(a,b,1)){if(n.id in dist||!passable(n.id,fid))continue;dist[n.id]=dist[id]+1;prev[n.id]=id;if(want(n.id)){const path=[];for(let c=n.id;c&&c!==start;c=prev[c])path.unshift(c);return{hex:n.id,path:path.slice(0,H.maxPath)};}q.push(n.id);}}return null;}
// what the crew has that the horde can go after
function brainTargets(){const pipeHex=new Set(),routeHex=new Set(),crack=new Set(),deny=new Set();let longest=null;
  try{for(const p of crewPipes()){if(!p.route||p.st==='pin')continue;if(!longest||p.route.length>longest.route.length)longest=p;p.route.slice(1,-1).forEach(h=>pipeHex.add(h));}}catch(e){}
  try{for(const m of teamPlans())(m.plan&&m.plan.route||[]).forEach(h=>routeHex.add(h));for(const m of Object.values(G.marches||{}))if(m&&m.state==='out'&&m.from&&m.to)marchTrack(m.from,m.to).forEach(h=>routeHex.add(h));}catch(e){}
  try{for(const z of zonesNear(ZONE.listKm)){if(z.st==='fortified'||z.st==='fortifying')zoneHexes(z.id).forEach(h=>crack.add(h));else if(z.st==='contested'&&z.crew/z.total>=BRAIN.denyAt)zoneHexes(z.id).forEach(h=>deny.add(h));}}catch(e){}
  return{pipeHex,routeHex,crack,deny,longest};}
// ---- offensives (stored in the shared horde doc so every phone agrees)
function offCycle(t){return Math.floor((t||Date.now())/(BRAIN.offEveryDays*864e5));}
function offensive(){const fx=FX();if(!fx||!fx.start)return null;const c=offCycle(),o=fx.off;if(o&&o.cycle===c)return o;
  // pick the crew's best zone (fortified > fortifying > most-held contested), seeded among the top 3
  let zs=[];try{const order={fortified:0,fortifying:1,contested:2};zs=zonesNear(ZONE.listKm).filter(z=>order[z.st]!=null&&z.crew>=6).sort((a,b)=>(order[a.st]-order[b.st])||(b.crew-a.crew)).slice(0,3);}catch(e){}
  if(!zs.length)return null;const rnd=seedRand(hordeSeed()+':off:'+c),z=zs[Math.floor(rnd()*zs.length)],start=c*BRAIN.offEveryDays*864e5;
  fx.off={cycle:c,zid:z.id,name:z.name,warnT:Math.max(Date.now(),start),strikeT:Math.max(Date.now(),start)+BRAIN.offWarnH*3600e3};fx.off.endT=fx.off.strikeT+BRAIN.offLenH*3600e3;
  try{publishHorde();}catch(e){}try{allianceLog(`📣 The horde is massing: an offensive on ${z.name} strikes in ${BRAIN.offWarnH} h. Fortify it!`);}catch(e){}return fx.off;}
function offLive(t){const o=offensive();t=t||Date.now();return o&&t>=o.strikeT&&t<o.endT?o:null;}
// ---- intent on every new outing
const _br_plan=planSortie;planSortie=function(f,fid,s,rnd,t){_br_plan.apply(this,arguments);try{s.intent='raid';const start=s.pos,T=brainTargets(),o=offLive(t);
    const go=(k,res,why)=>{if(!res)return false;s.intent=k;s.target=res.hex;s.path=res.path;s.why=why;return true;};
    if(o){const zh=new Set(zoneHexes(o.zid));if(go('offensive',bfsTo(start,fid,h=>zh.has(h)&&!f.tiles[h]),`offensive on ${o.name}`))return;}
    if(T.pipeHex.size&&rnd()<BRAIN.chance.cut){const lh=new Set((T.longest&&T.longest.route)||[]);if(go('cut',bfsTo(start,fid,h=>lh.has(h)&&T.pipeHex.has(h))||bfsTo(start,fid,h=>T.pipeHex.has(h)),'cut the supply line'))return;}
    if(T.crack.size&&rnd()<BRAIN.chance.crack&&go('crack',bfsTo(start,fid,h=>T.crack.has(h)&&allied(h)),'crack the zone wall'))return;
    if(T.deny.size&&rnd()<BRAIN.chance.deny&&go('deny',bfsTo(start,fid,h=>T.deny.has(h)&&!allied(h)&&!f.tiles[h])||bfsTo(start,fid,h=>T.deny.has(h)&&allied(h)),'deny the zone you almost have'))return;
    if(T.routeHex.size&&rnd()<BRAIN.chance.ambush&&go('ambush',bfsTo(start,fid,h=>T.routeHex.has(h)),'ambush on your route'))return;
  }catch(e){console.warn('brain',e);}};
const _br_sp=squadPower;squadPower=function(f,s,t){const p=_br_sp.apply(this,arguments);try{if(s&&s.intent==='offensive'&&offLive(t))return Math.round(p*BRAIN.offPower);}catch(e){}return p;};
// ---- readable: intent on intel, squad card and map
function intentTag(s){const k=(s&&s.intent)||'raid',I=BRAIN.icons[k]||BRAIN.icons.raid;return`${I[0]} ${I[1]}`;}
const _br_intel=hordeIntel;hordeIntel=function(){const list=_br_intel();try{return list.map(x=>{const f=FX().f[x.fid],s=f&&(f.squads||[]).find(q=>q.id===x.sid);return{...x,intent:(s&&s.intent)||'raid'};});}catch(e){return list;}};
const _br_isq=UI.infoSquad;UI.infoSquad=function(fid,sid){_br_isq.apply(this,arguments);try{const f=FX().f[fid],s=f&&(f.squads||[]).find(x=>x.id===sid),box=document.querySelector('#modalBody .ibtns');if(!s||!box||document.querySelector('#modalBody .intentrow'))return;
  box.insertAdjacentHTML('beforebegin',`<div class="row intentrow"><div class="grow"><b>${intentTag(s)}</b><small>${m2esc(s.why||'')}${s.target?' · heading for '+hexName(s.target):''}${s.intent==='offensive'?' · +25% power':''}</small></div></div>`);}catch(e){}};
function drawIntents(){if(typeof map==='undefined'||!P.world||!FX().f)return;if(!G.layers.intent)G.layers.intent=L.layerGroup().addTo(map);const g=G.layers.intent;g.clearLayers();if(map.getZoom()<13)return;
  for(const [fid,f] of Object.entries(FX().f)){for(const s of (f&&f.squads)||[]){if(!s||!s.pos||!s.intent||s.intent==='raid'||!(isVis(s.pos)||(s.target&&isVis(s.target))))continue;const I=BRAIN.icons[s.intent];
    L.marker(hexCenter(...idQR(s.pos)),{icon:L.divIcon({className:'lodm',html:`<div class="intent i-${s.intent}">${I[0]}</div>`,iconSize:[0,0]}),interactive:false,zIndexOffset:700}).addTo(g);
    if(s.target&&isVis(s.target)){const [tq,tr]=idQR(s.target),tc=hexCenter(tq,tr),own=allied(s.target); /* v23: target = red outline + arrow + label, never a fill, so the real owner color stays visible */
      L.polygon(hexPoly(tq,tr),{color:'#ff3b2f',weight:3,opacity:.95,fill:false,dashArray:'4 6',interactive:false}).addTo(g);
      if(s.pos!==s.target)L.polyline([hexCenter(...idQR(s.pos)),tc],{color:'#ff3b2f',weight:2.5,opacity:.85,dashArray:'2 7',interactive:false}).addTo(g);
      L.marker(tc,{icon:L.divIcon({className:'lodm',html:`<div class="htgt23">🎯 Horde target${own?' · your hex':''}<small>${I[0]} ${I[1]}</small></div>`,iconSize:[0,0]}),interactive:false,zIndexOffset:690}).addTo(g);}}}}
HOOK.draw(function(){try{drawIntents();}catch(e){}});
// ---- offensive banner, outcome and reward
function offHeld(o){const z=zoneState(o.zid);return z.crew/z.total>=BRAIN.offHoldPct;}
function offBanner(){let e=document.getElementById('offBanner');const o=offensive(),now=Date.now();const show=o&&now<o.endT+6*3600e3;if(!show){e&&e.remove();return;}
  if(!e){e=document.createElement('button');e.id='offBanner';document.body.appendChild(e);}
  const z=zoneState(o.zid),phase=now<o.strikeT?'warn':now<o.endT?'live':'over';e.className='off-'+phase;
  e.innerHTML=phase==='warn'?`📣 Horde offensive on <b>${o.name}</b> in ${fmtDur(o.strikeT-now).replace(/ \d+s$/,'')} · crew ${z.crew}/${z.total}`
    :phase==='live'?`📣 OFFENSIVE on <b>${o.name}</b> · ${fmtDur(o.endT-now).replace(/ \d+s$/,'')} left · hold ${Math.ceil(BRAIN.offHoldPct*z.total)}+ (now ${z.crew})`
    :offHeld(o)?`🏆 ${o.name} HELD against the offensive · ${(P.offClaimed||{})[o.cycle]?'reward claimed':'tap to claim your reward'}`:`💀 ${o.name} fell to the offensive`;
  e.onclick=()=>{if(phase==='over'&&offHeld(o))return claimOffReward(o);UI.closeModal&&UI.closeModal();zoneOpen(o.zid);};}
function claimOffReward(o){P.offClaimed=P.offClaimed||{};if(P.offClaimed[o.cycle])return toast('Already claimed');P.offClaimed[o.cycle]=1;const R=BRAIN.offReward;addXP(R.xp);addRes(R.res);
  const g=rollGear(P.lvl+3,2);P.inv.push(g);save();toast(`🏆 Offensive held! +${R.xp} XP, supplies and ${g.name}`);try{allianceLog(`🏆 ${P.name} claimed the reward for holding ${o.name}`);}catch(e){}offBanner();}
setInterval(()=>{try{if(P&&P.world)offBanner();}catch(e){}},5000);
// during an offensive, resting squads (not wounded) mobilize at once
const _br_step=squadStep;squadStep=function(f,fid,s,k,t,ev){try{if(s&&offLive(t)&&t<(s.restUntil||0)&&t>=(s.woundUntil||0)&&s.intent!=='offensive'){s.restUntil=t;s.path=[];}}catch(e){}return _br_step.apply(this,arguments);};
