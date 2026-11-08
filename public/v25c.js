// v25c (TEST) Crew home map. A member whose real GPS is far (> HOME25.farKm) from the crew's home region plays on the SAME
// shared map, same team, on the web: pick a free start hex near the crew, build a Stronghold there, then claim / march /
// reinforce with taps (marches, no walking claims). No pipelines for far members. Real drives where they live still earn
// resources in Drive mode. Not a separate game mode. Coming back inside 40 km takes two accurate
// real fixes before the saved flag turns off, so one bad point cannot flap it. The handoff does not
// count the gap between the crew-map dot and the real fix as distance or a string of claims.
const HOME25={farKm:50,nearKm:40,startMaxKm:8,minGap:2,perKm:{scrap:20,food:6,water:6,fuel:8},presets:{'rathdrum-crew':{lat:47.8135,lng:-116.8968,name:'Rathdrum'}}};
window.HOME25=HOME25;
function team25(){try{return NET.team||localStorage.getItem('wl_team')||'';}catch(e){return'';}}
function home25(){if(G.home25)return G.home25;try{if(location.hostname.includes('--')||/localhost/.test(location.hostname)){const d=localStorage.getItem('wl_home25');if(d)return G.home25=JSON.parse(d);}}catch(e){}const p=HOME25.presets[team25()];if(p)return p;
  // otherwise: the crew's oldest nearby Stronghold (first non-far member with one)
  for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(m.far25||!Array.isArray(m.defs))continue;const s=m.defs.find(d=>d&&d.k==='sh'&&d.hex);if(s){const c=hexCenter(...idQR(s.hex));return{lat:c[0],lng:c[1],name:'crew home'};}}
  if(!P.far25&&W().sh&&W().sh.hex){const c=hexCenter(...idQR(W().sh.hex));return{lat:c[0],lng:c[1],name:'crew home'};}return null;}
window.home25=home25;
function isFar(){return !!(P.far25&&P.far25.on);}window.isFar25=isFar;
function farFrom(lat,lng){const h=home25();return h?distM(lat,lng,h.lat,h.lng)/1000>HOME25.farKm:false;}
function kmFromHome(lat,lng){const h=home25();return h?distM(lat,lng,h.lat,h.lng)/1000:0;}
// A simulated dot or a weak fix must not turn the crew map off. state "ok" is a real fix at 60 m or better.
function realOk25(){const d=G.dev||{},g=G.gps;if(d.walk||d.drive||d.tp||d.hold)return false;return !!(g&&g.state==='ok'&&g.acc!=null&&g.acc<=60);}
// One accurate fix inside nearKm only arms. A second, newer fix confirms. The counter stays in memory, so a drive does not save on every point.
function armNear25(){const t=G.gps&&G.gps.t||0,a=G._near25;if(a&&t&&a.t&&t!==a.t)return true;if(!a)G._near25={t:t,at:Date.now()};return false;}
function clearNear25(){G._near25=null;}
// Local save once. Cloud upload stays on the lease: this does not call cloudSave, and it does not force a revision.
function leaveFar25(){if(!isFar())return false;P.far25.on=false;G.pick25=false;clearNear25();save();try{pushMember();}catch(e){}try{banner25();}catch(e){}
  const h=home25();try{toast(`🛰️ You're back near ${h?h.name:'home'}. The map follows your GPS again.`);}catch(e){}return true;}
// The dot was sitting on the crew map. Put it on the real fix without adding the gap to walked distance.
function placeReal25(lat,lng){G.jump=true;if(G.pos)G.pos=[lat,lng];if(G.gps)G.gps.recenter=true;return _sp25.call(this,lat,lng);}
// ---------- position: real GPS stays private; the game position sits on your home-map hex ----------
G.real25=null;
const _sp25=setPos;setPos=function(lat,lng){try{
  if(!isFar()&&farFrom(lat,lng)&&P.name){clearNear25();const h=home25();if(h){P.far25={on:true,anchor:null,since:Date.now()};save();try{pushMember();}catch(e){}try{banner25();}catch(e){}toast(`🛰️ You're far from the crew. You'll play on the crew home map: ${h.name}`);}}
  if(isFar()&&!farFrom(lat,lng)){
    const dev=(G.dev&&(G.dev.walk||G.dev.drive||G.dev.tp||G.dev.hold));
    if(dev){clearNear25();return _sp25.apply(this,arguments);} // dev tools move the dot; they do not end the real-GPS mode
    if(!realOk25()){clearNear25();return;} // weak or missing accuracy: keep the crew map, do not claim from a poor fix
    if(kmFromHome(lat,lng)>HOME25.nearKm){clearNear25();return _sp25.apply(this,arguments);} // 40–50 km: follow the drive, mode stays on
    if(!armNear25())return; // first good fix inside 40 km: wait for another before writing
    if(leaveFar25())return placeReal25.call(this,lat,lng);return;}
  if(isFar()&&farFrom(lat,lng)){clearNear25();realFix(lat,lng);const a=anchor25();if(a){const c=hexCenter(...idQR(a));if(!G.pos||hexAt(...G.pos).id!==a){G.jump=true;return _sp25.call(this,c[0],c[1]);}return;}
    const h=home25();if(!G.pos||distM(G.pos[0],G.pos[1],h.lat,h.lng)>20000){G.jump=true;_sp25.call(this,h.lat,h.lng);}startPick25();return;}}catch(e){console.warn('home25 pos',e);}
  return _sp25.apply(this,arguments);};
// A still phone can drop the next point in the drift filter, before setPos. That point still has to cancel a pending return when it is weak or outside 40 km.
const _gpsFix25=gpsFix;gpsFix=function(fix){try{const c=fix&&fix.coords;if(c&&isFar()&&G._near25){const acc=Math.round(c.accuracy||9999);if(acc>60||kmFromHome(c.latitude,c.longitude)>HOME25.nearKm)clearNear25();}}catch(e){}
  return _gpsFix25.apply(this,arguments);};
function anchor25(){const s=W().sh;if(s&&s.hex&&s.state!=='down')return s.hex;return P.far25&&P.far25.anchor||null;}
window.anchor25=anchor25;
// far members never walk-claim (their GPS is elsewhere); they claim with marches like everyone on the web
const _cp25=claimPath;claimPath=function(prev,cur){if(isFar())return 0;return _cp25.apply(this,arguments);};
// ---------- real drives at home earn resources ----------
function realFix(lat,lng){const r=G.real25;G.real25=[lat,lng];if(!r)return;const d=distM(r[0],r[1],lat,lng);if(d<5||d>3000)return;P.stats.meters+=d;
  if(G.drive&&G.drive.on){G.drive.far25=(G.drive.far25||0)+d;P.farM25=(P.farM25||0)+d;const km=Math.floor(G.drive.far25/1000),paid=G.drive.farPaid25||0;
    if(km>paid){const n=km-paid;G.drive.farPaid25=km;const L={};for(const [k,v] of Object.entries(HOME25.perKm))L[k]=v*n;addRes(L);save();toast(`🚗 ${n} km driven at home: ${Object.entries(L).map(([k,v])=>'+'+v+RES[k]).join(' ')}`);}}}
window.realFix25=realFix;
const _dh25=driveHud;driveHud=function(){_dh25.apply(this,arguments);try{if(!isFar()||!(G.drive&&G.drive.on))return;const el=document.getElementById('drivehud');if(!el||el.querySelector('.far25'))return;
  const km=((G.drive.far25||0)/1000).toFixed(1);el.insertAdjacentHTML('afterbegin',`<div class="far25">🛰️ Driving where you live: <b>${km} km</b> · every km pays ${Object.entries(HOME25.perKm).map(([k,v])=>'+'+v+RES[k]).join(' ')}<small>Hexes and pipelines stay on the crew home map.</small></div>`);}catch(e){}};
// ---------- start hex picker ----------
function startOk(id){const h=home25();if(!h)return'No crew home yet';const c=hexCenter(...idQR(id));if(distM(c[0],c[1],h.lat,h.lng)/1000>HOME25.startMaxKm)return`Too far from the crew (keep within ${HOME25.startMaxKm} km of ${h.name})`;
  const o=G.terr[id];if(o&&!o.released&&(o.ai||(o.uid&&!isMe(o.uid))))return o.ai?'The horde holds that hex':'That hex belongs to a teammate';
  if(typeof factionAt==='function'&&factionAt(id))return'The horde holds that hex';
  if(typeof allyBldNear==='function'&&allyBldNear(id,HOME25.minGap-1))return"Too close to a teammate's building (keep 2 hexes away)";
  for(const [hx,t] of Object.entries(G.terr||{}))if(t&&t.uid&&!isMe(t.uid)&&!t.ai&&!t.released&&hx===id)return'Taken';return null;}
function autoStart(){const h=home25();if(!h)return null;const c=hexAt(h.lat,h.lng),[q,r]=idQR(c.id);let best=null;
  for(let ring=3;ring<=14&&!best;ring++){for(const x of hexRing(q,r,ring)){if(hexDist(x.id,c.id)!==ring)continue;if(!startOk(x.id)){const nearCrew=Object.entries(G.terr||{}).some(([hx,t])=>t&&t.uid&&!t.ai&&hexDist(hx,x.id)<=3);if(nearCrew||ring>=6){best=x.id;break;}}}}return best;}
window.autoStart25=autoStart;
function startPick25(){if(!isFar()||anchor25()||G.pick25)return;G.pick25=true;const h=home25();
  setTimeout(()=>{try{map.setView([h.lat,h.lng],15);}catch(e){}UI.modal(`<h2>🛰️ Join the crew home map</h2><p>You're far from <b>${h.name}</b>, so you play on the crew's shared home map from here. Same crew, same map.</p>
   <div class="r24"><span>1</span><b>Tap a free hex near the crew to start (not on anyone's hex, 2+ away from their buildings)</b></div><div class="r24"><span>2</span><b>Build your Stronghold there, then claim and fight with marches</b></div>
   <div class="r24"><span>🚗</span><b>Drive mode where you live still earns resources</b></div><div class="r24"><span>⛓️</span><b>Pipelines need you in ${h.name}, so they're off for you</b></div>
   <div class="btns24"><button class="red24" onclick="pickAuto25()">📍 Pick a good hex for me</button><button class="ghost24" onclick="UI.closeModal()">I'll tap one</button></div>`);},600);}
window.startPick25=startPick25;
window.pickAuto25=function(){const id=autoStart();if(!id)return toast('No free hex found near the crew');try{map.setView(hexCenter(...idQR(id)),16);}catch(e){}confirmStart(id);};
function confirmStart(id){const why=startOk(id);if(why)return toast('🚫 '+why);UI.modal(`<h2>📍 Start here?</h2><p>${hexName(id)} on the crew home map.</p><div class="btns24"><button class="red24" onclick="startHere25('${id}')">✅ Start here</button><button class="ghost24" onclick="UI.closeModal()">Pick another</button></div>`);}
window.startHere25=function(id){const why=startOk(id);if(why)return toast('🚫 '+why);P.far25={...(P.far25||{on:true}),on:true,anchor:id};G.pick25=false;claimTile(id);explore([id]);save();try{pushMember();}catch(e){}
  const c=hexCenter(...idQR(id));G.jump=true;_sp25(c[0],c[1]);try{map.setView(c,16);drawWorld();}catch(e){}UI.closeModal();allianceLog(`🛰️ ${P.name} joined the crew home map`);
  setTimeout(()=>{try{UI.build();}catch(e){toast('Open 🏗️ Build to place your Stronghold');}},400);};
const _it25c=UI.infoTile;UI.infoTile=function(id){if(G.pick25&&isFar()&&!anchor25())return confirmStart(id);return _it25c.apply(this,arguments);};
// ---------- no pipelines for far members ----------
const _cbp25=canBuildPipe;canBuildPipe=function(site){if(isFar())return`Far-away members can't build pipelines: they need someone driving in ${(home25()||{}).name||'the home region'}. Drive mode where you live still earns resources.`;return _cbp25.apply(this,arguments);};
HOOK.render(function(){try{if(!isFar())return;const b=document.querySelector('#sheetBody');if(!b||b.querySelector('.farnote25'))return;if(!/pipeline/i.test(b.textContent))return;b.insertAdjacentHTML('afterbegin',`<p class="farnote25">🛰️ You play on the crew home map from far away, so you can't build pipelines. Teammates in ${(home25()||{}).name||'the home region'} can, and your drives at home still earn resources.</p>`);}catch(e){}});
// ---------- banner + roster tag ----------
function banner25(){let el=document.getElementById('far25');if(!isFar()){if(el)el.remove();return;}const h=home25();if(!el){el=document.createElement('div');el.id='far25';document.body.appendChild(el);}
  el.innerHTML=`🛰️ Playing on crew home map: <b>${h?h.name:'crew home'}</b><small>${anchor25()?'Tap hexes to march · drives at home earn resources':'Pick a free start hex near the crew'}</small>`;}
// A parked phone may get a second watch tick that the drift filter does not pass to setPos. That newer timestamp confirms the same still fix.
function confirmDwell25(){try{if(!isFar()||!G._near25||!realOk25())return;const g=G.gps,a=G._near25;if(!g.t||g.t===a.t||Date.now()-g.t>8000)return;if(!P.lastPos||kmFromHome(P.lastPos[0],P.lastPos[1])>HOME25.nearKm){clearNear25();return;}
  if(leaveFar25())placeReal25(P.lastPos[0],P.lastPos[1]);}catch(e){}}
setInterval(()=>{try{banner25();confirmDwell25();}catch(e){}},1500);
HOOK.member(function(o){try{if(isFar())o.far25=1;}catch(e){}return o;});
HOOK.render(function(){try{if(this.tab!=='alliance'||this.sub.alliance!=='members')return;const M=(G.al&&G.al.members)||{};document.querySelectorAll('#sheetBody .row').forEach(r=>{const t=r.textContent;for(const m of Object.values(M))if(m.far25&&m.name&&t.includes(m.name)&&!r.querySelector('.ftag25')){const b=r.querySelector('b');b&&b.insertAdjacentHTML('afterend',' <span class="ftag25">🛰️ remote</span>');}});}catch(e){}});
// dev / test: simulate a far player (test site only)
if(location.hostname.includes('--')||/localhost/.test(location.hostname))window.devFar25=function(lat,lng){G.dev=G.dev||{};setPos(lat||37.6872,lng||-97.3301);};
