// v20 Pipelines: drive-to-build supply lines (Pope: building one REQUIRES driving).
// 1) A supply site is a real place: gas station ⛽ fuel, water tower 💧 water, grocery 🛒 food, mall 🔩 scrap, town hall ⚙️ parts.
// 2) The crew must hold the site's hex. You plan a pipeline from your Stronghold to the site (max 5 km). A pin drops on the site.
// 3) Turn on Drive mode and drive within 75 m of the pin (72 h to do it). The pipeline goes ONLINE.
// 4) Online: +3/hr of the site's resource (fuel +2/hr) paid straight to you, plus +15% of that resource from your own hexes.
//    Upkeep 5 ⚙️ a day (unpaid = dark until the next reset). If the horde holds any hex on the route, the line is CUT (no flow)
//    until the crew retakes it. Lines live in your member doc (no GPS), so the crew sees them and the horde can go after them.
const PIPE={sites:{fuel:'fuel',water_tower:'water',grocery:'food',mall:'scrap',townhall:'parts'},perHour:{fuel:2,water:3,food:3,scrap:3,parts:3},
  tileBoost:0.15,upkeep:{parts:5},cost:{scrap:120,parts:15},maxKm:5,pinM:75,pinH:72,capBase:1,capPerSh:5,capMax:3,maxRoute:60,truckH:2,
  color:{fuel:'#e8a33a',water:'#4aa3ff',food:'#8fd14f',scrap:'#b8b0a0',parts:'#c9a24a'}};
function pipes(){P.pipes=P.pipes||[];return P.pipes;}
function pipeCap(){return Math.min(PIPE.capMax,PIPE.capBase+Math.floor(strongholdLevel()/PIPE.capPerSh));}
function siteOf(l){return l&&PIPE.sites[l.kind]?{id:l.id,hex:hexAt(l.lat,l.lng).id,res:PIPE.sites[l.kind],name:l.name||LANDMARK_KINDS[l.kind].label,kind:l.kind,lat:l.lat,lng:l.lng}:null;}
function sitesNear(){return(G.landmarks||[]).map(siteOf).filter(Boolean);}
function pipeOrigin(){const s=W().sh;return s&&s.state==='up'?s.hex:null;}
function pipeCut(p){const gi=fxIndex();return(p.route||[]).some(h=>gi[h]);}
function pipeState(p){if(p.st==='pin')return Date.now()>p.pinExp?'expired':'pin';if(p.darkUntil&&Date.now()<p.darkUntil)return'dark';return pipeCut(p)?'cut':'online';}
function canBuildPipe(site){if(!site)return'Not a supply site';const o=pipeOrigin();if(!o)return'Place your Stronghold first';
  if(pipes().some(p=>p.site===site.id&&pipeState(p)!=='expired'))return'You already have a line to this site';if(pipes().filter(p=>pipeState(p)!=='expired').length>=pipeCap())return`Pipeline limit ${pipeCap()} (more at Stronghold Lv${(pipeCap())*PIPE.capPerSh})`;
  if(!allied(site.hex))return'The crew must hold the site hex first';const [a,b]=hexCenter(...idQR(o));if(distM(a,b,site.lat,site.lng)>PIPE.maxKm*1000)return`Too far from your Stronghold (max ${PIPE.maxKm} km)`;
  if(!canPay(PIPE.cost))return'Need '+Object.entries(PIPE.cost).map(([k,v])=>v+RES[k]).join(' ');return null;}
function buildPipe(siteId){const site=sitesNear().find(s=>s.id===siteId),why=canBuildPipe(site);if(why)return toast(why);pay(PIPE.cost);
  const route=marchTrack(pipeOrigin(),site.hex).slice(0,PIPE.maxRoute);
  pipes().push({id:'p'+Date.now(),site:site.id,name:site.name,res:site.res,hex:site.hex,lat:site.lat,lng:site.lng,route,st:'pin',pinExp:Date.now()+PIPE.pinH*3600e3,t:Date.now(),acc:0,total:0});
  save();try{pushMember();}catch(e){}allianceLog(`⛓️ ${P.name} planned a ${site.res} pipeline to ${site.name}. Drive there to switch it on.`);UI.closeModal&&UI.closeModal();drawPipes();
  toast(`📍 Pin dropped at ${site.name}. Turn on 🚗 Drive mode and drive there within ${PIPE.pinH} h.`);}
function removePipe(id){P.pipes=pipes().filter(p=>p.id!==id);save();try{pushMember();}catch(e){}drawPipes();UI.render&&UI.tab&&UI.render();}
// ---- the drive: completing pins
function pinsWaiting(){return pipes().filter(p=>pipeState(p)==='pin');}
function pipeDriveCheck(){if(!G.pos)return;for(const p of pinsWaiting()){const d=distM(G.pos[0],G.pos[1],p.lat,p.lng);p._dist=d;
  if(d<=PIPE.pinM){if(!(G.drive&&G.drive.on)){if(!p._warned){p._warned=1;toast('🚗 You are at the pin: turn on Drive mode to switch the pipeline on');}continue;}
    p.st='online';p.onT=Date.now();p.lastPay=Date.now();save();try{pushMember();}catch(e){}drawPipes();
    allianceLog(`⛓️ ${P.name} drove the line: ${p.name} pipeline is ONLINE (+${PIPE.perHour[p.res]}${RES[p.res]}/hr)`);
    UI.info({title:'⛓️ Route complete',sub:`${p.name} pipeline is online`,body:`<p>+${PIPE.perHour[p.res]}${RES[p.res]} every hour, plus +${PIPE.tileBoost*100}% ${RES[p.res]} from your own hexes.</p><p class="tiny">Keep the route clear: if the horde takes a hex on it, the line is cut until the crew retakes it.</p>`,buttons:[['Done',()=>UI.closeModal()]]});}}}
const _pp_setPos=setPos;setPos=function(){const r=_pp_setPos.apply(this,arguments);try{pipeDriveCheck();}catch(e){}return r;};
// ---- flow, boost, upkeep
function pipeTick(){const now=Date.now();let paid={};for(const p of pipes()){const st=pipeState(p);if(st==='expired'&&!p._exp){p._exp=1;report(`📍 Pipeline pin at ${p.name} expired (nobody drove it in ${PIPE.pinH} h). Plan it again from Base › Pipelines.`,false);}
  if(st!=='online'){p.lastPay=now;continue;}const hrs=Math.min(48,(now-(p.lastPay||now))/3600e3);p.lastPay=now;p.acc=(p.acc||0)+hrs*PIPE.perHour[p.res];const whole=Math.floor(p.acc);if(whole>0){p.acc-=whole;p.total=(p.total||0)+whole;paid[p.res]=(paid[p.res]||0)+whole;}}
  if(Object.keys(paid).length){addRes(paid);save();}}
setInterval(()=>{try{if(P&&P.world)pipeTick();}catch(e){}},60e3);
const _pp_gi=grossIncome;grossIncome=function(){const g=_pp_gi.apply(this,arguments);try{const ks=new Set(pipes().filter(p=>pipeState(p)==='online').map(p=>p.res));for(const k of ks)g[k]=Math.round(g[k]*(1+PIPE.tileBoost));}catch(e){}return g;};
if(typeof payUpkeep5==='function'){const _pp_pay=payUpkeep5;payUpkeep5=function(){const off=_pp_pay.apply(this,arguments);try{for(const p of pipes()){const st=pipeState(p);if(st==='pin'||st==='expired')continue;
  if(canPay(PIPE.upkeep)){pay(PIPE.upkeep);p.darkUntil=0;}else{p.darkUntil=Date.now()+msToReset();report(`⛓️ ${p.name} pipeline went dark: not enough ⚙️ for upkeep`,false);}}save();}catch(e){console.warn('pipe upkeep',e);}return off;};}
if(typeof towerUpkeep==='function'){const _pp_tu=towerUpkeep;towerUpkeep=function(){const u=_pp_tu.apply(this,arguments);try{const n=pipes().filter(p=>['online','cut','dark'].includes(pipeState(p))).length;u.parts=(u.parts||0)+n*PIPE.upkeep.parts;}catch(e){}return u;};}
// ---- shared with the crew (member doc), no GPS: hex ids and a site point
HOOK.member(function(o){try{if(P.world)o.pipes=pipes().filter(p=>pipeState(p)!=='expired').slice(0,PIPE.capMax).map(p=>({id:p.id,name:String(p.name).slice(0,40),res:p.res,route:p.route.slice(0,PIPE.maxRoute),st:pipeState(p)}));}catch(e){}return o;});
function crewPipes(){const out=pipes().map(p=>({...p,own:true,owner:P.name,color:P.color,st:pipeState(p)}));for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(m.me||isMe(uid)||!Array.isArray(m.pipes))continue;
  m.pipes.forEach(p=>{if(p&&Array.isArray(p.route))out.push({...p,own:false,owner:m.name||'Ally',color:m.color,st:p.st==='pin'?'pin':pipeCut(p)?'cut':p.st});});}return out;}
// ---- map: iron line, valves, moving truck, pin
function drawPipes(){if(typeof map==='undefined'||!P.world)return;if(!G.layers.pipes)G.layers.pipes=L.layerGroup().addTo(map);const g=G.layers.pipes;g.clearLayers();if(map.getZoom()<12)return;const gi=fxIndex();
  for(const p of crewPipes()){if(!p.route||p.route.length<2)continue;const ll=p.route.map(h=>hexCenter(...idQR(h))),col=PIPE.color[p.res]||'#ccc',live=p.st==='online';
    const dim=p.st==='pin'?.45:p.st==='dark'?.35:1;
    L.polyline(ll,{color:'#16120d',weight:9,opacity:.9*dim,interactive:false,lineCap:'round'}).addTo(g);L.polyline(ll,{color:col,weight:5,opacity:dim,interactive:false,lineCap:'round',dashArray:p.st==='pin'?'2 10':null}).addTo(g);
    L.polyline(ll,{color:'#16120d',weight:1.5,opacity:.8*dim,interactive:false}).addTo(g);
    p.route.forEach((h,i)=>{if(gi[h])L.circleMarker(hexCenter(...idQR(h)),{radius:7,color:'#ff3b2f',weight:3,fillColor:'#2a0d08',fillOpacity:1,interactive:false}).addTo(g);});
    if(live){const f=(Date.now()/(PIPE.truckH*3600e3))%2,u=f<=1?f:2-f,k=u*(ll.length-1),i=Math.min(ll.length-2,Math.floor(k)),t=k-i,pos=[ll[i][0]+(ll[i+1][0]-ll[i][0])*t,ll[i][1]+(ll[i+1][1]-ll[i][1])*t];
      L.marker(pos,{icon:L.divIcon({className:'lodm',html:'<div class="pipetruck">🚚</div>',iconSize:[0,0]}),interactive:false,zIndexOffset:500,truck62:p.id}).addTo(g);}
    const end=ll[ll.length-1],tag=p.st==='pin'?'📍 Drive here':p.st==='cut'?'✂️ CUT':p.st==='dark'?'🕯️ dark':`+${PIPE.perHour[p.res]}${RES[p.res]}/hr`;
    L.marker(end,{icon:L.divIcon({className:'lodm',html:`<div class="pipetag ${p.st}" style="--pc:${col}">${p.own?'':m2esc(p.owner)+' · '}${tag}</div>`,iconSize:[0,0]}),zIndexOffset:640}).on('click',()=>pipeCard(p)).addTo(g);}}
HOOK.draw(function(){try{drawPipes();}catch(e){console.warn('pipes',e);}});
setInterval(()=>{try{if(document.visibilityState==='visible'&&pipes().some(p=>pipeState(p)==='online')){if(typeof slideTrucks62==='function')slideTrucks62();else drawPipes();}}catch(e){}},30e3); // R6.3: slide the truck, don't rebuild the line
function pipeCard(p){const st=p.st||pipeState(p),line={pin:`Waiting for a drive · ${p._dist?Math.round(p._dist)+' m away · ':''}pin expires in ${fmtDur(Math.max(0,(p.pinExp||0)-Date.now())).replace(/ \d+s$/,'')}`,online:`Online · +${PIPE.perHour[p.res]}${RES[p.res]}/hr · ${p.total||0} delivered so far`,cut:'✂️ CUT: the horde holds a hex on the route. Retake it to restore the flow.',dark:'🕯️ Dark until the next reset (upkeep unpaid)',expired:'Pin expired'}[st]||st;
  UI.info({title:`⛓️ ${p.name}`,sub:`${p.own===false?p.owner+"'s pipeline · ":''}${RES[p.res]} ${p.res} · ${p.route.length} hexes`,body:`<p>${line}</p>`,
    buttons:[['🗺️ Show',()=>{UI.closeModal();map.setView(hexCenter(...idQR(p.route[p.route.length-1])),15);}],...(p.own!==false?[['🗑️ Remove',()=>UI.ask('Remove pipeline',`Remove the ${p.name} pipeline? The build cost is not refunded.`,'Remove').then(ok=>{if(ok){removePipe(p.id);UI.closeModal();}})]]:[]),['Close',()=>UI.closeModal()]]});}
// ---- landmark card: supply site row
const _pp_il=UI.infoLandmark;UI.infoLandmark=function(l){_pp_il.apply(this,arguments);try{const s=siteOf(l);if(!s)return;const box=$('#modalBody .ibtns');if(!box)return;const mine=pipes().find(p=>p.site===s.id&&pipeState(p)!=='expired'),why=mine?null:canBuildPipe(s);
  box.insertAdjacentHTML('beforebegin',`<div class="row pipesite"><div class="grow"><b>⛓️ Supply site · ${RES[s.res]} ${s.res}</b><small>${mine?`Your pipeline: ${pipeState(mine)}`:`A pipeline from your Stronghold pays +${PIPE.perHour[s.res]}${RES[s.res]}/hr and +${PIPE.tileBoost*100}% ${s.res} from your hexes. You must DRIVE to it once to switch it on.`}${!mine&&why?`<br>🔒 ${why}`:''}</small></div>${mine?`<button onclick="UI.closeModal();pipeCard(pipes().find(x=>x.id==='${mine.id}'))">Line</button>`:`<button class="btn-primary" ${why?'disabled':''} onclick="buildPipe('${s.id}')">Build ${Object.entries(PIPE.cost).map(([k,v])=>v+RES[k]).join(' ')}</button>`}</div>`);}catch(e){console.warn('site row',e);}};
// ---- Base › Pipelines
UI.SUBS.base.push(['pipes','⛓️ Pipelines']);
HOOK.render(function(){try{if(this.tab!=='base'||this.sub.base!=='pipes')return;pipeTick();const b=$('#sheetBody');const mine=pipes().filter(p=>pipeState(p)!=='expired'),o=pipeOrigin();
  const row=p=>{const st=pipeState(p);return`<div class="row pipe ${st}"><span class="pdot" style="background:${PIPE.color[p.res]}"></span><div class="grow"><b>${m2esc(p.name)}</b><small>${st==='pin'?`📍 Drive to it in Drive mode · ${p._dist?(p._dist/1000).toFixed(1)+' km · ':''}expires in ${fmtDur(Math.max(0,p.pinExp-Date.now())).replace(/ \d+s$/,'')}`:st==='online'?`+${PIPE.perHour[p.res]}${RES[p.res]}/hr · ${p.total||0} delivered`:st==='cut'?'✂️ Cut by the horde: retake the red hex':st==='dark'?'🕯️ Dark until reset':''}</small></div><button onclick="pipeCard(pipes().find(x=>x.id==='${p.id}'))">Open</button></div>`;};
  const sites=sitesNear().filter(s=>!mine.some(p=>p.site===s.id)).map(s=>({s,why:canBuildPipe(s),km:o?distM(...hexCenter(...idQR(o)),s.lat,s.lng)/1000:null})).filter(x=>x.km==null||x.km<=PIPE.maxKm*1.6).sort((a,b)=>(!!a.why-!!b.why)||((a.km||0)-(b.km||0))).slice(0,12);
  b.insertAdjacentHTML('beforeend',`<h2>⛓️ Pipelines <small class="lv">${mine.length}/${pipeCap()}</small></h2><p class="tiny">Run a line from your Stronghold to a supply site the crew holds, then <b>drive to the pin</b> in Drive mode to switch it on. Online lines pay every hour and boost that resource from your hexes. Upkeep ${PIPE.upkeep.parts}⚙️/day each. If the horde takes a hex on the route, the line is cut.</p>
    ${mine.map(row).join('')||'<p class="tiny">No pipelines yet.</p>'}
    <h3>Supply sites near you</h3>${sites.map(({s,why,km})=>`<div class="row"><span class="pdot" style="background:${PIPE.color[s.res]}"></span><div class="grow"><b>${LANDMARK_KINDS[s.kind].icon} ${m2esc(s.name)}</b><small>${RES[s.res]} +${PIPE.perHour[s.res]}/hr${km!=null?' · '+km.toFixed(1)+' km from your Stronghold':''}${why?' · 🔒 '+why:''}</small></div><button ${why?'disabled':''} onclick="buildPipe('${s.id}')">Build</button></div>`).join('')||'<p class="tiny">No gas stations, water towers, groceries, malls or town halls found nearby yet.</p>'}
    ${crewPipes().filter(p=>!p.own).length?`<h3>Crew pipelines</h3>${crewPipes().filter(p=>!p.own).map(p=>`<div class="row"><span class="pdot" style="background:${PIPE.color[p.res]}"></span><div class="grow"><b>${m2esc(p.name)}</b><small>${m2esc(p.owner)} · ${p.st}</small></div></div>`).join('')}`:''}`);}catch(e){console.warn('pipes tab',e);}});
