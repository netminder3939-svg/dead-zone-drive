// Stage 4 (preview): map pins, planned routes, target board, horde intel.
// Plans ride in each phone's member doc as an optional `plan` field (hex ids + short notes, no GPS). Live v19 clients ignore it.
const S4={maxPins:12,maxRoute:20,maxTargets:10,noteLen:40};
function s4esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function myPlan(){P.plan=P.plan||{};const p=P.plan;p.pins=p.pins||[];p.route=p.route||[];p.targets=p.targets||[];return p;}
function planOk(p){return p&&typeof p==='object';}
function s4hex(h){return typeof h==='string'&&/^-?\d+_-?\d+$/.test(h);}
function teamPlans(){const out=[],mem=(G.al&&G.al.members)||{};let mine=false;
  for(const [uid,m] of Object.entries(mem)){const me=isMe(uid)||m.me;if(me){mine=true;out.push({uid:P.uid,name:P.name,color:P.color,me:true,plan:myPlan()});continue;}
    if(planOk(m.plan))out.push({uid,name:m.name||'Ally',color:m.color||'#ccc',me:false,plan:m.plan});}
  if(!mine)out.unshift({uid:P.uid,name:P.name,color:P.color,me:true,plan:myPlan()});return out;}
function planChanged(){save();try{pushMember();}catch(e){}drawWorld();if(UI.tab)UI.render();}
const _msS4=memberSummary;memberSummary=function(){const o=_msS4();try{const p=myPlan();if(p.pins.length||p.route.length||p.targets.length)o.plan={pins:p.pins.slice(0,S4.maxPins),route:p.route.slice(0,S4.maxRoute),targets:p.targets.slice(0,S4.maxTargets)};}catch(e){}return o;};
// ---- actions
function addPin(h,note){const p=myPlan();if(!s4hex(h))return;note=String(note||'').trim().slice(0,S4.noteLen)||'Pinned';p.pins=p.pins.filter(x=>x.hex!==h);p.pins.unshift({hex:h,note,t:Date.now()});p.pins=p.pins.slice(0,S4.maxPins);toast('📍 Pinned for the crew');planChanged();}
function delPin(h){const p=myPlan();p.pins=p.pins.filter(x=>x.hex!==h);planChanged();}
function routeAdd(h){const p=myPlan();if(!s4hex(h))return;if(p.route.includes(h))return toast(`Already stop ${p.route.indexOf(h)+1} on your route`);if(p.route.length>=S4.maxRoute)return toast(`Route is full (${S4.maxRoute} stops)`);p.route.push(h);toast(`🧭 Stop ${p.route.length} added`);planChanged();}
function routeDel(h){const p=myPlan();p.route=p.route.filter(x=>x!==h);toast('🧭 Stop removed');planChanged();}
function routeUndo(){myPlan().route.pop();planChanged();}
function routeClear(){myPlan().route=[];toast('🧭 Route cleared');planChanged();}
function targetAdd(h,why){const p=myPlan();if(!s4hex(h))return;if(p.targets.some(x=>x.hex===h))return toast('Already on the board');if(p.targets.length>=S4.maxTargets)return toast(`Board is full (${S4.maxTargets})`);p.targets.push({hex:h,why:String(why||'').trim().slice(0,S4.noteLen),t:Date.now()});toast('🎯 Added to the target board');planChanged();}
function targetDel(h){const p=myPlan();p.targets=p.targets.filter(x=>x.hex!==h);planChanged();}
function s4show(h){UI.close();UI.closeModal&&UI.closeModal();map.setView(hexCenter(...idQR(h)),16);}
function s4ask(title,ph,fn){UI.closeModal&&UI.closeModal();const id='s4in';UI.modal?UI.modal(`<h3>${title}</h3><input id="${id}" maxlength="${S4.noteLen}" placeholder="${ph}" style="width:100%"><div class="ibtns"><button class="fight" id="s4ok">Save</button></div>`):0;
  const ok=document.getElementById('s4ok');if(!ok){fn(prompt(title)||'');return;}oneTap(ok,()=>{const v=document.getElementById(id).value;UI.closeModal();fn(v);});setTimeout(()=>{const i=document.getElementById(id);i&&i.focus();},50);}
// ---- horde intel: every visible squad, where it is heading and how a hit there would go
function hordeIntel(){const fx=P.world&&P.world.fx,out=[];if(!fx||!fx.f)return out;const now=Date.now(),ms=HB().stepMin*60e3;
  for(const [fid,f] of Object.entries(fx.f)){if(!f||!Array.isArray(f.squads))continue;const d=fdef(fid);if(!d)continue;
    for(const s of f.squads){if(!s||!s.pos)continue;const seen=isVis(s.pos)||(s.target&&isVis(s.target));if(!seen)continue;
      const sp=squadPower(f,s,now),resting=now<(s.restUntil||0),hops=(s.path||[]).indexOf(s.target)+1||(s.path||[]).length,start=Math.max(now,s.restUntil||0),eta=s.target?start+hops*ms-now:0;
      const ours=!!(s.target&&allied(s.target)),dp=s.target?defPower(activeDefs(s.target)):0;
      out.push({fid,sid:s.id,name:d.name,icon:d.icon,color:d.color,pos:s.pos,target:s.target||null,why:s.why||'',sp,resting,eta,ours,dp,holds:!!s.target&&dp>=sp,dist:G.pos?hexDist(hexAt(...G.pos).id,s.pos):null});}}
  return out.sort((a,b)=>(b.ours-a.ours)||(a.eta-b.eta));}
// ---- map layer: pins, routes, target flags
const _drawS4=drawWorld;drawWorld=function(){_drawS4();try{if(typeof map==='undefined'||!P.world)return;if(!G.layers.plan)G.layers.plan=L.layerGroup().addTo(map);const g=G.layers.plan;g.clearLayers();if(map.getZoom()<12)return;
  for(const m of teamPlans()){const p=m.plan||{},col=s4esc(m.color);
    const rt=(Array.isArray(p.route)?p.route:[]).filter(s4hex).slice(0,S4.maxRoute);if(rt.length){const ll=rt.map(h=>hexCenter(...idQR(h)));if(m.me&&G.pos)ll.unshift(G.pos);L.polyline(ll,{color:m.color||'#fff',weight:4,opacity:.85,dashArray:'8 8',className:'s4route',interactive:false}).addTo(g);
      L.marker(ll[ll.length-1],{icon:L.divIcon({className:'lodm',html:`<div class="ico s4" style="color:${col}"><span>🏁</span><b class="nm">${poss(s4esc(m.name))} route</b></div>`,iconSize:[0,0]}),zIndexOffset:640}).addTo(g);}
    (Array.isArray(p.pins)?p.pins:[]).filter(x=>x&&s4hex(x.hex)).slice(0,S4.maxPins).forEach(x=>L.marker(hexCenter(...idQR(x.hex)),{icon:L.divIcon({className:'lodm',html:`<div class="ico s4pin" style="color:${col}"><span>📍</span><b class="nm">${s4esc(x.note)}</b></div>`,iconSize:[0,0]}),zIndexOffset:650}).on('click',()=>UI.infoTile(x.hex)).addTo(g));
    (Array.isArray(p.targets)?p.targets:[]).filter(x=>x&&s4hex(x.hex)).slice(0,S4.maxTargets).forEach(x=>L.marker(hexCenter(...idQR(x.hex)),{icon:L.divIcon({className:'lodm',html:`<div class="ico s4tg" style="color:${col}"><span>🎯</span></div>`,iconSize:[0,0]}),zIndexOffset:655}).on('click',()=>UI.infoTile(x.hex)).addTo(g));}}catch(e){console.warn('plan layer',e);}};
// ---- hex card buttons + who planned what here
const _infoTileS4=UI.infoTile;UI.infoTile=function(id){_infoTileS4.apply(this,arguments);try{const box=document.querySelector('#modalBody .ibtns');if(!box)return;const notes=[];
  for(const m of teamPlans()){const p=m.plan||{};(p.pins||[]).forEach(x=>x&&x.hex===id&&notes.push(`📍 ${s4esc(m.me?'You':m.name)}: ${s4esc(x.note)}`));(p.targets||[]).forEach(x=>x&&x.hex===id&&notes.push(`🎯 Target (${s4esc(m.me?'you':m.name)})${x.why?': '+s4esc(x.why):''}`));const k=(p.route||[]).indexOf(id);if(k>=0)notes.push(`🧭 Stop ${k+1} on ${s4esc(m.me?'your':poss(m.name))} route`);}
  if(notes.length)box.insertAdjacentHTML('beforebegin',`<div class="row s4notes"><div class="grow"><b>Crew plans here</b><small>${notes.join('<br>')}</small></div></div>`);
  const me=myPlan(),pinned=me.pins.some(x=>x.hex===id),tg=me.targets.some(x=>x.hex===id),w=document.createElement('div');w.className='s4btns';w.style.cssText='display:flex;gap:6px;flex-wrap:wrap;width:100%';
  const mk=(lbl,cls,fn)=>{const b=document.createElement('button');b.className=cls;b.textContent=lbl;oneTap(b,fn);w.appendChild(b);};
  mk(pinned?'📍 Unpin':'📍 Pin','s4pinb',()=>pinned?(delPin(id),UI.closeModal()):s4ask('Pin note for your crew','e.g. Meet here 6pm',v=>addPin(id,v)));
  const ri=me.route.indexOf(id);mk(ri>=0?`✕ Remove stop ${ri+1}`:'🧭 Add to route','s4routeb',()=>{ri>=0?routeDel(id):routeAdd(id);UI.closeModal();});
  if(me.route.length)mk('🧹 Clear route','s4clrb',()=>{routeClear();UI.closeModal();});
  mk(tg?'🎯 Remove target':'🎯 Target','s4tgb',()=>tg?(targetDel(id),UI.closeModal()):s4ask('Why this target?','e.g. Weak edge',v=>targetAdd(id,v)));
  box.appendChild(w);}catch(e){console.warn('plan card',e);}};
// ---- Alliance › Plans tab: target board, routes, pins, horde intel
UI.SUBS.alliance.push(['plans','🗺️ Plans']);
function fmtEta(ms){return ms<=60e3?'any minute':'in '+fmtDur(ms).replace(/ \d+s$/,'');}
const _renderS4=UI.render;UI.render=function(){_renderS4.call(this);try{const t=this.tab,sub=this.sub[t],b=$('#sheetBody');if(!b||t!=='alliance'||sub!=='plans')return;const here=G.pos?hexAt(...G.pos).id:null,dist=h=>here?hexDist(here,h)+' hexes away':'';
  const TP=teamPlans(),tg=[];TP.forEach(m=>(m.plan.targets||[]).forEach(x=>x&&s4hex(x.hex)&&tg.push({...x,m})));tg.sort((a,b)=>(a.t||0)-(b.t||0));
  let h=`<h2>🎯 Target Board</h2><p class="tiny">Hexes the crew wants hit next. Add one from any hex card (🎯 Target).</p>`;
  h+=tg.map(x=>`<div class="row"><i class="cdot" style="background:${s4esc(x.m.color)}"></i><div class="grow"><b>${s4esc(hexName(x.hex))}</b><small>${s4esc(x.m.me?'You':x.m.name)}${x.why?' · '+s4esc(x.why):''} · ${dist(x.hex)}</small></div><button onclick="s4show('${x.hex}')">Show</button>${x.m.me?`<button onclick="targetDel('${x.hex}')">✕</button>`:''}</div>`).join('')||'<p class="tiny">No targets yet. Scout a hex and tap 🎯 Target.</p>';
  const intel=hordeIntel();h+=`<h2>☠️ Horde Intel</h2><p class="tiny">Squads you can see, where they're headed, and how a hit would go.</p>`;
  h+=intel.map(s=>`<div class="row s4intel"><i class="cdot" style="background:${s4esc(s.color)}"></i><div class="grow"><b>${s4esc(s.icon)} ${s4esc(s.name)} squad</b> <small style="display:inline">power ${s.sp}</small><small>${s.resting?'Resting':'On the move'}${s.dist!=null?' · '+s.dist+' hexes from you':''}</small><small>${s.target?(s.ours?`⚠️ Heading for ${s4esc(hexName(s.target))} (ours) · ${fmtEta(s.eta)} · our defense ${s.dp} → ${s.holds?'✅ likely holds':'❌ likely lost'}`:`Heading for ${s4esc(hexName(s.target))}${s.why?' ('+s4esc(s.why)+')':''} · ${fmtEta(s.eta)} · defense there ${s.dp} → ${s.holds?'✅ likely holds':'❌ likely lost'} (not our hex yet)`):'No target yet · ✅ nothing of ours at risk'}</small></div><button onclick="s4show('${s.pos}');UI.infoSquad('${s.fid}','${s.sid}')">Show</button></div>`).join('')||(hordeLoaded()?`<p class="tiny s4empty">${FX().start?'All quiet: no squads in sight. They show up once you can see their hexes.':`No raider gangs yet. They set up camp once the crew holds ${BAL.factions.startTiles} hexes.`}</p>`:'<p class="tiny s4loading">⏳ Loading horde intel…</p>');
  const me=myPlan();h+=`<h2>🧭 Planned Routes</h2><p class="tiny">Add stops from hex cards (🧭 Add to route). Your crew sees your route as a dashed line.</p>`;
  h+=TP.filter(m=>(m.plan.route||[]).length).map(m=>`<div class="row"><i class="cdot" style="background:${s4esc(m.color)}"></i><div class="grow"><b>${s4esc(m.me?'Your route':poss(m.name)+" route")}</b><small>${m.plan.route.length} stops · ends ${s4esc(hexName(m.plan.route[m.plan.route.length-1]))}</small></div><button onclick="s4show('${m.plan.route[m.plan.route.length-1]}')">Show</button></div>`).join('')||'<p class="tiny">No routes planned.</p>';
  if(me.route.length)h+=`<div class="row"><button onclick="routeUndo()">Undo last stop</button><button onclick="routeClear()">Clear my route</button></div>`;
  const pins=[];TP.forEach(m=>(m.plan.pins||[]).forEach(x=>x&&s4hex(x.hex)&&pins.push({...x,m})));
  h+=`<h2>📍 Map Pins</h2>`+(pins.map(x=>`<div class="row"><i class="cdot" style="background:${s4esc(x.m.color)}"></i><div class="grow"><b>${s4esc(x.note)}</b><small>${s4esc(x.m.me?'You':x.m.name)} · ${dist(x.hex)}</small></div><button onclick="s4show('${x.hex}')">Show</button>${x.m.me?`<button onclick="delPin('${x.hex}')">✕</button>`:''}</div>`).join('')||'<p class="tiny">No pins. Tap a hex and 📍 Pin it.</p>');
  b.insertAdjacentHTML('beforeend',h);}catch(e){console.warn('plans tab',e);}};
// teammates' plans arrive with member updates: redraw the plan layer when they change
let _s4sig='';setInterval(()=>{try{const s=JSON.stringify(teamPlans().map(m=>[m.uid,m.plan]));if(s!==_s4sig){_s4sig=s;if(typeof map!=='undefined'&&P.world)drawWorld();}}catch(e){}},5000);
// horde intel is "loading" until the shared horde doc has answered (or 12 s passed: a brand-new team has no doc yet)
function hordeLoaded(){return NET.mode!=='firebase'||(typeof HS!=='undefined'&&HS.remoteLast>=0)||!!(FX()&&FX().start)||performance.now()>12000;}
// ghost tap: a button that closes a card on pointerup must not let the follow-up click land on the map
// (with dev Walk on, that click walked you into a new hex and claimed it, so a pin looked like it bumped the held counter)
let _s4closeT=0;const _cmS4=UI.closeModal;UI.closeModal=function(){_s4closeT=Date.now();return _cmS4.apply(this,arguments);};
const _ucS4=UI.close;UI.close=function(){_s4closeT=Date.now();return _ucS4.apply(this,arguments);};
let _s4downT=0;document.addEventListener('pointerdown',()=>{_s4downT=Date.now();},true);
document.addEventListener('click',e=>{if(_s4downT<=_s4closeT&&Date.now()-_s4closeT<450&&e.target&&e.target.closest&&e.target.closest('#map')){e.stopPropagation();e.preventDefault();}},true);
