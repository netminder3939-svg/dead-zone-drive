// Stage 2: AI factions (deterministic power checks + fights, seeded timing), outposts (1-hour capture hold),
// alliance research + operations, cloud saves. All numbers live in balance.js (BAL.factions/outpost/research/ops/cloud).

// ================= helpers =================
const FX=()=>{const w=W();w.fx=w.fx||{start:null,last:null,anchor:null,f:{},takes:{}};w.outposts=w.outposts||{};return w.fx;};
function rl(id){return((G.al&&G.al.research)||{})[id]||0;}            // alliance research level
function rfx(id){return rl(id)*BAL.research.list[id].per;}             // effect in %
function allianceSize(){return Math.max(1,Object.keys((G.al&&G.al.members)||{}).length);}
function fdef(id){return BAL.factions.list.find(f=>f.id===id);}

// ================= research effects (wrap existing formulas) =================
const _gross=grossIncome;grossIncome=function(){const g=_gross(),m=1+rfx('logistics')/100;if(m!==1)for(const k in g)g[k]=Math.round(g[k]*m);return g;};
const _stats=stats;stats=function(){const s=_stats();if(rl('medics'))s.hp=Math.round(s.hp*(1+rfx('medics')/100));return s;};
const _skillFx=skillFx;skillFx=function(k){return _skillFx(k)+(k==='resb'?rfx('salvage'):0);};
const _defFor=defendersFor;defendersFor=function(id){const m=1+rfx('walls')/100,out=_defFor(id).map(d=>({...d,power:Math.round(d.power*m)}));
  Object.entries(W().outposts||{}).forEach(([oid,o])=>{if(o.state==='up'&&hexDist(oid,id)<=BAL.outpost.radius)out.push({kind:'op',id:oid,power:Math.round(outpostPower()*m)});});return out;};

// ================= AI factions =================
function factionStr(f){const B=BAL.factions,days=f.since?Math.min(30,(Date.now()-f.since)/864e5):0;
  return Math.round((B.base+B.perLevel*P.lvl+B.perMember*(allianceSize()-1)+B.perDay*days)*Math.pow(B.tierMult,f.tier||0));}
function factionAttack(f){return Math.round(factionStr(f)*(1-rfx('jammers')/100));}
let _fxIdx=null;function fxIndex(){if(_fxIdx)return _fxIdx;_fxIdx={};const fx=FX();for(const [fid,f] of Object.entries(fx.f))for(const id in f.tiles||{})_fxIdx[id]=fid;return _fxIdx;}
function fxDirty(){_fxIdx=null;}
function factionAt(id){if(!P.world||!P.world.fx)return null;const fid=fxIndex()[id];return fid?{fid,f:P.world.fx.f[fid],home:P.world.fx.f[fid].home===id}:null;}
function isNeutral(id){const o=G.terr[id];return !P.tiles[id]&&!fxIndex()[id]&&!(enemyAt(id)&&!W().enemyTaken[id])&&!(o&&!o.ai&&o.uid!==P.uid)&&!(W().outposts||{})[id];}
function fxAnchor(){const w=W();if(w.sh&&w.sh.hex)return w.sh.hex;const ids=Object.keys(P.tiles).sort();return ids[0]||(G.pos?hexAt(...G.pos).id:null);}
function placeHome(fi,tier,t){const B=BAL.factions,a=FX().anchor,[q0,r0]=idQR(a),rnd=seedRand(P.uid+':fxhome:'+fi+':'+tier);
  for(let k=0;k<30;k++){const ang=(fi*2*Math.PI/B.list.length)+(rnd()-.5)*1.2,d=B.homeDist[0]+Math.floor(rnd()*(B.homeDist[1]-B.homeDist[0]+1))+tier*2;
    // axial from polar (pointy-top): approximate via cube rounding
    const x=d*Math.cos(ang),y=d*Math.sin(ang),q=Math.round(x-y/Math.sqrt(3)),r=Math.round(2*y/Math.sqrt(3)),id=(q0+q)+'_'+(r0+r);
    if(isNeutral(id))return id;}
  return null;}
function spawnFaction(fi,tier,t){const B=BAL.factions,d=B.list[fi],fx=FX(),home=placeHome(fi,tier,t);if(!home)return;
  const f=fx.f[d.id]={home,tier,since:t,tiles:{},routedUntil:null};fxDirty();
  const [q,r]=idQR(home);hexRing(q,r,B.startRing).forEach(x=>{if(isNeutral(x.id)){f.tiles[x.id]=t;fxDirty();}});f.tiles[home]=t;fxDirty();}
function fxTick(k,ev){const B=BAL.factions,fx=FX(),t=k*B.tickHours*3600e3,day=pacificDate(t);
  B.list.forEach((d,fi)=>{let f=fx.f[d.id];
    if(!f){spawnFaction(fi,0,t);return;}
    if(f.routedUntil){if(t>=f.routedUntil){spawnFaction(fi,(f.tier||0)+1,t);ev.back.push(d.name);}return;}
    const rnd=seedRand(P.uid+':fx:'+d.id+':'+k),ids=Object.keys(f.tiles),cap=B.maxTiles+B.maxTilesPerTier*(f.tier||0);
    const front=new Map();ids.forEach(id=>{const [q,r]=idQR(id);hexRing(q,r,1).forEach(x=>{if(x.id!==id&&!f.tiles[x.id])front.set(x.id,1);});});
    const fr=[...front.keys()],anchor=fx.anchor;
    // contest one of your edge hexes (power check)
    const mine=fr.filter(id=>P.tiles[id]);fx.takes[day]=fx.takes[day]||0;
    if(mine.length&&rnd()<B.contestChance&&fx.takes[day]<B.maxTakesPerDay){const id=mine.sort()[Math.floor(rnd()*mine.length)],
        defs=defendersFor(id).filter(x=>{const o=structOf(x);return o&&o.state==='up';}),dp=defs.reduce((a,x)=>a+structPower(x),0),ap=factionAttack(f);
      if(ap>dp){delete P.tiles[id];f.tiles[id]=t;fxDirty();fx.takes[day]++;NET.claimHex(id,{by:d.name,ai:true,color:d.color,t});
        const op=(W().outposts||{})[id];if(op){op.state='down';}ev.took.push([d.name,id,ap,dp]);}
      else ev.held.push([d.name,id,ap,dp]);return;}
    if(ids.length>=cap||rnd()>=B.expandChance)return;
    const cand=fr.filter(isNeutral).map(id=>[id,hexDist(id,anchor)+rnd()*2]).sort((a,b)=>a[1]-b[1]);
    for(let i=0;i<Math.min(B.expandPerTick,cand.length);i++){f.tiles[cand[i][0]]=t;fxDirty();ev.grew[d.name]=(ev.grew[d.name]||0)+1;}});}
function factionCatchUp(quiet){if(!P.world||!P.uid)return;const B=BAL.factions,fx=FX(),win=B.tickHours*3600e3,now=Date.now();
  if(!fx.start){if(Object.keys(P.tiles).length<B.startTiles)return;fx.anchor=fxAnchor();if(!fx.anchor)return;fx.start=now;fx.last=Math.floor(now/win);
    const ev={grew:{},took:[],held:[],back:[]};fxTick(fx.last,ev);report('☠️ Three raider factions have set up camp a couple of km from your land. Expect them to push toward you.',false);save();drawWorld();return;}
  const from=Math.max(fx.last+1,Math.floor((now-B.maxCatchUpDays*864e5)/win)),to=Math.floor(now/win);if(to<from)return;
  const ev={grew:{},took:[],held:[],back:[]};for(let k=from;k<=to;k++)fxTick(k,ev);fx.last=to;
  // prune old take counters
  Object.keys(fx.takes).sort().slice(0,-3).forEach(d=>delete fx.takes[d]);
  const grew=Object.entries(ev.grew);
  if(ev.took.length||ev.held.length||grew.length||ev.back.length){
    const parts=[];if(grew.length)parts.push(grew.map(([n,c])=>`${n} +${c} hex${c>1?'es':''}`).join(', '));
    if(ev.took.length)parts.push(`🚩 lost ${ev.took.length} edge hex${ev.took.length>1?'es':''} (${ev.took.map(x=>x[0]).join(', ')})`);
    if(ev.held.length)parts.push(`🛡️ held ${ev.held.length} attack${ev.held.length>1?'s':''}`);if(ev.back.length)parts.push(`${ev.back.join(', ')} came back stronger`);
    const txt='☠️ Factions: '+parts.join(' · ');report(txt,!ev.took.length);
    if(!quiet&&(ev.took.length||ev.held.length||to-from>=2))UI.notice(`<b>While you were away</b><br><small>${parts.join('<br>')}</small>`,ev.took.length?[['🗺️ Show',()=>flashTiles(ev.took.map(x=>x[1]))]]:[]);
    if(ev.took.length)allianceLog(`${P.name}: ${ev.took.length} hex(es) lost to raider factions`);}
  save();drawWorld();UI.hud();}
// --- fighting faction hexes (same deterministic engine)
function factionUnits(id){const x=factionAt(id);if(!x)return[];const B=BAL.factions,g=B.garrison,s=factionStr(x.f),d=fdef(x.fid),art='raider.svg';
  if(x.home){const H=B.home,m=s*H.mult,u=[mkUnit({name:d.name+' Boss',img:art,hp:m*g.hp,atk:m*g.atk,def:m*g.def,crit:0,agi:g.agi})];
    for(let i=0;i<H.guards;i++)u.push(mkUnit({name:d.name+' Guard',img:art,hp:s*H.guardMult*g.hp*2,atk:s*g.atk*.8,def:s*g.def,crit:0,agi:g.agi+2}));
    // Siege: damage on the HQ carries over between attacks and heals 25%/day, so repeated attacks wear it down.
    if(x.f.hq){const heal=(Date.now()-x.f.hqT)/864e5*H.regenPerDay;u.forEach((v,i)=>{if(x.f.hq[i]!=null)v.hp=Math.min(v.max,Math.round(x.f.hq[i]+v.max*heal));});}return u;}
  const [q,r]=idQR(id),adj=hexRing(q,r,1).filter(h=>h.id!==id&&x.f.tiles[h.id]).length,m=s*(1+g.perAdjacent*Math.min(3,adj));
  return[mkUnit({name:d.name+' Garrison',img:art,hp:m*g.hp,atk:m*g.atk,def:m*g.def,crit:0,agi:g.agi})];}
UI.infoFaction=function(id){const x=factionAt(id),B=BAL.factions;if(!x)return;const d=fdef(x.fid),[lat,lng]=hexCenter(...idQR(id)),dist=G.pos?distM(...G.pos,lat,lng):1e9,far=dist>B.attackRangeM&&!G.dev.any;
  const p=predict(()=>[playerUnit()],()=>factionUnits(id)),D=diffBlock(p),units=factionUnits(id),n=Object.keys(x.f.tiles).length;
  this.info({title:`${d.icon} ${d.name}${x.home?' · HOME BASE':''}`,sub:`Raider faction · tier ${x.f.tier||0} · ${n} hexes · ${Math.round(dist)} m away`,art:imgTag('raider.svg'),diff:D.d,
    body:D.html+cdBlock()+`<div class="row"><div class="grow">${x.home?`Beat the home base to rout the whole faction: all ${n} hexes go free and they stay away ${B.respawnDays} days.`:'Win to retake this hex. Hexes with more faction neighbors are better guarded: hit the edges first.'}<small>Their attack power on your border: <b>${factionAttack(x.f)}</b>. Your defense there must be at least that to hold.</small></div></div>`+
      units.map(u=>`<div class="row"><div class="grow">🔍 <b>${u.name}</b><small>${statLine(u)}</small></div></div>`).join(''),
    buttons:[['⚔️ Attack',()=>fightFaction(id),'fight',far||cooldownLeft()>0]]});if(far)toast(`Get within ${B.attackRangeM} m to attack (${Math.round(dist)} m)`);};
function fightFaction(id){if(cooldownLeft())return toast('Still recovering');const x=factionAt(id);if(!x)return;const B=BAL.factions,d=fdef(x.fid),f=runFight([playerUnit()],factionUnits(id));P.hp=Math.max(1,f.A[0].hp);let res;
  if(f.win){if(x.home){const n=Object.keys(x.f.tiles).length;x.f.tiles={};x.f.hq=null;x.f.routedUntil=Date.now()+B.respawnDays*864e5;fxDirty();addRes(B.homeLoot,1,true);addXP(B.homeXP);claimTile(id);
      res=`🏴 ${d.name} routed! ${n} hexes freed · ${Object.entries(B.homeLoot).map(([k,v])=>v+RES[k]).join(' ')}`;report(`🏴 ${P.name} routed the ${d.name}`,true);allianceLog(`🏴 ${P.name} routed the ${d.name}!`);opsBump('retakes',1);}
    else{delete x.f.tiles[id];fxDirty();claimTile(id);addRes(B.retakeLoot,1,true);addXP(B.retakeXP);opsBump('retakes',1);res=`🚩 Hex retaken from the ${d.name}. +${B.retakeXP} XP`;}}
  else{if(x.home){x.f.hq=f.B.map(u=>u.hp);x.f.hqT=Date.now();}const lost=lossPenalty();res=`💀 The ${d.name} held${x.home?` (HQ damage sticks: ${f.B.reduce((a,u)=>a+u.hp,0)}/${f.B.reduce((a,u)=>a+u.max,0)} HP left, heals ${Math.round(BAL.factions.home.regenPerDay*100)}%/day)`:''}. You dropped ${lost}🔩 and need ${BAL.fight.lossCooldownMin} min to recover.`;}
  save();UI.replay({title:`${d.name}${x.home?' home base':' garrison'}`,f,result:res,good:f.win,buttons:[['Continue',()=>{UI.closeModal();drawWorld();},'big']]});}
const _infoTile=UI.infoTile;UI.infoTile=function(id){if(factionAt(id)&&isVis(id))return UI.infoFaction(id);const o=(W().outposts||{})[id];if(o)return UI.infoOutpost(id);return _infoTile.call(this,id);};

// ================= outposts =================
function outpostCap(){return BAL.outpost.capBase+Math.floor(strongholdLevel()/BAL.outpost.capPerShLevels);}
function outpostPower(){return BAL.outpost.power+BAL.outpost.powerPerShLevel*strongholdLevel();}
function outpostsLive(){return Object.values(W().outposts||{}).filter(o=>o.state!=='down').length;}
function placeOutpost(id){const w=W(),c=BAL.outpost.cost;w.outposts=w.outposts||{};
  if(factionAt(id))return toast('Retake this hex from the faction first');if(w.outposts[id]&&w.outposts[id].state!=='down')return toast('Outpost already here');
  if(outpostsLive()>=outpostCap())return toast(`Outpost limit ${outpostCap()} (raise it with Stronghold levels)`);if(!canPay(c))return toast('Not enough resources');
  pay(c);w.outposts[id]={state:'capturing',start:Date.now(),endsAt:Date.now()+BAL.outpost.holdMin*60e3,hpPct:1};if(!P.tiles[id])claimTile(id);
  save();drawWorld();toast(`⛺ Capturing: hold for ${BAL.outpost.holdMin} min`);allianceLog(`⛺ ${P.name} started capturing an outpost`);}
function outpostTick(){const w=W();let ch=false;Object.entries(w.outposts||{}).forEach(([id,o])=>{
  if(o.state==='capturing'){if(!P.tiles[id]||factionAt(id)){o.state='down';report('⛺ Outpost capture failed: the hex was taken during the hold',false);ch=true;}
    else if(Date.now()>=o.endsAt){o.state='up';const [q,r]=idQR(id);let n=0;hexRing(q,r,BAL.outpost.radius).forEach(x=>{if(!P.tiles[x.id]&&!factionAt(x.id)&&!(enemyAt(x.id)&&!w.enemyTaken[x.id])){claimTile(x.id);n++;}});
      report(`⛺ Outpost captured (+${n} hexes)`,true);allianceLog(`⛺ ${P.name} captured an outpost`);opsBump('outposts',1);ch=true;}}});
  if(ch){save();drawWorld();}}
setInterval(()=>{if(P.world)outpostTick();},10e3);
UI.infoOutpost=function(id){const o=W().outposts[id],c=BAL.outpost;const st=o.state==='capturing'?`⏳ capturing · ${fmtDur(o.endsAt-Date.now())} left`:o.state==='up'?`✅ standing · condition ${Math.round(100*(o.hpPct??1))}%`:'💥 lost';
  this.info({title:'⛺ Outpost',sub:`Hex ${id} · ${st}`,art:'<span class="bigemo">⛺</span>',body:`<div class="row"><div class="grow">Defense power <b>${outpostPower()}</b> · guards and collects ${hexRing(0,0,c.radius).length} hexes<small>Capture hold: ${c.holdMin} min. If the hex is lost during the hold, the capture fails.</small>${o.state==='capturing'?`<div class="prog"><i style="width:${100*(1-(o.endsAt-Date.now())/(c.holdMin*60e3))}%"></i></div>`:''}</div></div>`,
    buttons:o.state==='down'&&P.tiles[id]?[['🔧 Rebuild',()=>{placeOutpost(id);UI.closeModal();},'fight']]:[]});};
const _build2=UI.build;UI.build=function(){_build2.call(this);if(!G.pos)return;const id=hexAt(...G.pos).id,c=BAL.outpost.cost,cost=Object.entries(c).map(([k,v])=>`<span class="${(P.res[k]||0)<v?'short':''}">${v} ${RES[k]}</span>`).join(' '),fa=factionAt(id);
  const row=`<div class="row"><div class="grow"><b>⛺ Outpost</b><small>${cost}</small><small>${outpostsLive()}/${outpostCap()} · ${BAL.outpost.holdMin}-min capture hold · claims + guards ${hexRing(0,0,BAL.outpost.radius).length} hexes</small>${fa?'<small>❌ Faction hex: retake it first</small>':''}</div><button ${fa||outpostsLive()>=outpostCap()?'disabled':''} onclick="placeOutpost('${id}');UI.closeModal()">Capture</button></div>`;
  const b=$('#modalBody'),btns=b.querySelectorAll('button[onclick="UI.closeModal()"]'),last=btns[btns.length-1];if(last)last.insertAdjacentHTML('beforebegin',row);else b.insertAdjacentHTML('beforeend',row);};

// ================= map drawing =================
const _draw=drawWorld;drawWorld=function(){_draw();if(!P.world||!map||map.getZoom()<13)return;const fx=P.world.fx,g=G.layers.terr,z=map.getZoom(),c=map.getCenter(),h=hexAt(c.lat,c.lng),n=z>=16?8:z>=15?12:16;
  if(fx&&fx.f)for(const [fid,f] of Object.entries(fx.f)){const d=fdef(fid);for(const id in f.tiles||{}){const [q,r]=idQR(id);if(hexDist(id,h.id)>n||!isVis(id))continue;
      L.polygon(hexPoly(q,r),{renderer:tileRenderer,interactive:false,color:d.color,weight:2,opacity:.9,fillColor:d.color,fillOpacity:.28,dashArray:'3 3'}).addTo(g);
      if(z>=15||f.home===id)L.marker(hexCenter(q,r),{icon:L.divIcon({className:'lodm',html:`<div class="ico fx${f.home===id?' fxhome':''}" style="color:${d.color}"><span>${f.home===id?'🏴':d.icon}</span>${f.home===id?`<b class="nm">${d.name} HQ</b>`:''}</div>`,iconSize:[0,0]}),zIndexOffset:f.home===id?350:150}).on('click',()=>UI.infoFaction(id)).addTo(g);}}
  Object.entries(P.world.outposts||{}).forEach(([id,o])=>{const ll=hexCenter(...idQR(id));if(o.state==='up'&&z>=15)L.circle(ll,{radius:BAL.outpost.radius*HEX_R*Math.sqrt(3)+HEX_R*.9,color:'#5fd068',weight:1.5,dashArray:'4 5',fillOpacity:.04,interactive:false}).addTo(g);
    L.marker(ll,{icon:L.divIcon({className:'lodm',html:`<div class="ico op${o.state==='down'?' down':''}"><span class="emo">⛺</span><b class="lv">${o.state==='capturing'?'⏳ '+Math.max(0,Math.ceil((o.endsAt-Date.now())/60e3))+'m':o.state==='down'?'LOST':'OUTPOST'}</b></div>`,iconSize:[0,0]}),zIndexOffset:280}).on('click',()=>UI.infoOutpost(id)).addTo(g);});};

// ================= alliance operations =================
function opsWeek(t=Date.now()){const d=new Date(pacificDate(t)+'T12:00:00Z'),day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day);return 'w'+d.toISOString().slice(0,10);}
function opsList(){const wk=opsWeek(),rnd=seedRand('ops:'+wk+':'+(localStorage.getItem('wl_team')||window.DEFAULT_TEAM||'crew')),pool=[...BAL.ops.pool].map(o=>[o,rnd()]).sort((a,b)=>a[1]-b[1]).map(x=>x[0]).slice(0,BAL.ops.pick);
  const m=allianceSize(),prog=((G.al&&G.al.ops)||{})[wk]||{};return pool.map(o=>{const n=o.per*m;return{...o,n,text:o.text.replace('{n}',n),prog:Math.min(n,prog[o.k]||0),done:(prog[o.k]||0)>=n,key:wk+':'+o.k};});}
let _opsQ={};function opsBump(k,n=1){_opsQ[k]=(_opsQ[k]||0)+n;}
setInterval(opsFlush,30e3);function opsFlush(){const q=_opsQ;_opsQ={};if(!Object.keys(q).length||typeof NET==='undefined'||!NET.opsAdd)return;NET.opsAdd(opsWeek(),q);}
const _qp=questProg;questProg=function(type,n=1){_qp(type,n);if(['claims','kills','visits','raids'].includes(type))opsBump(type,n);};
function opsClaim(key){const o=opsList().find(x=>x.key===key);P.opsClaimed=P.opsClaimed||{};if(!o||!o.done||P.opsClaimed[key])return;P.opsClaimed[key]=1;addRes(o.reward);addXP(BAL.ops.xp);save();toast('🎖️ Operation reward claimed');UI.render();}

// ================= cloud saves =================
const CS={last:0,lastStr:'',status:'not saved yet'};
function profileValid(o){return o&&typeof o==='object'&&typeof o.name==='string'&&o.name&&Number.isFinite(o.lvl)&&o.lvl>=1&&o.res&&typeof o.res==='object';}
function profileClean(){const o=JSON.parse(JSON.stringify(P));delete o.pos;delete o.lat;delete o.lng;return o;}
async function cloudSave(force){if(!NET.saveProfile||!P.name)return;const o=profileClean(),s=JSON.stringify(o);if(!force&&s===CS.lastStr)return;
  // safety: never overwrite a newer save made on another device
  try{const c=await NET.loadProfile(P.uid);if(c&&(c.rev||0)>(P._rev||0)){CS.status='a newer save is in the cloud: reopen the app to load it';return;}}catch(e){}
  P._rev=(P._rev||0)+1;P._savedAt=Date.now();save();const doc={data:JSON.stringify(profileClean()),rev:P._rev,savedAt:P._savedAt,name:P.name,lvl:P.lvl,v:2};
  try{await NET.saveProfile(P.uid,doc);CS.last=Date.now();CS.lastStr=s;CS.status='saved '+when(CS.last);}catch(e){CS.status='save failed: '+(e.message||e);}}
function adoptProfile(o,why){localStorage.setItem('wl_p_backup',localStorage.getItem('wl_p')||'');const uid=P.uid;for(const k of Object.keys(P))delete P[k];Object.assign(P,P_DEFAULT(),o);P.uid=uid||o.uid;save();report('☁️ '+why,true);}
async function cloudCheck(uid){if(!NET.loadProfile)return;try{const d=await NET.loadProfile(uid);if(!d||!d.data)return;let o;try{o=JSON.parse(d.data);}catch(e){return;}
    if(!profileValid(o))return;if((d.savedAt||0)>(P._savedAt||0)+60e3&&(d.rev||0)>(P._rev||0)){adoptProfile(o,`Loaded your newer cloud save (Lv${o.lvl}). Old phone copy kept as a backup.`);}}catch(e){CS.status='cloud check failed';}}
async function cloudRestore(code){code=(code||'').trim();if(!code)return toast('Enter a restore code');try{const d=await NET.loadProfile(code);if(!d||!d.data)return toast('No save found for that code');
  const o=JSON.parse(d.data);if(!profileValid(o))return toast('That save looks damaged, not loaded');if(!confirm(`Load ${o.name} (Lv${o.lvl})? Your current progress is backed up first.`))return;adoptProfile(o,'Restored a cloud save');location.reload();}catch(e){toast('Restore failed: '+(e.message||e));}}
function undoRestore(){const b=localStorage.getItem('wl_p_backup');if(!b)return toast('No backup');if(!confirm('Go back to the copy saved before the last restore?'))return;localStorage.setItem('wl_p',b);location.reload();}
const _ninit=NET.init.bind(NET);NET.init=async function(p){const uid=await _ninit(p);P.uid=uid;await cloudCheck(uid);return uid;};
setInterval(()=>cloudSave(false),BAL.cloud.autosaveSec*1000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){opsFlush();cloudSave(false);}});

// ================= boot hooks =================
const _cua=catchUpAI;catchUpAI=function(){_cua();try{factionCatchUp();outpostTick();}catch(e){console.error(e);}};
setInterval(()=>{if(P.world)factionCatchUp(true);},5*60e3);

// ================= UI tabs =================
UI.SUBS.alliance.push(['research','🔬 Research'],['ops','🎖️ Ops']);UI.SUBS.base.push(['outposts','⛺ Outposts'],['factions','☠️ Factions']);UI.SUBS.player.push(['save','☁️ Save']);
function rcost(id){const l=rl(id),m=Math.pow(l+1,BAL.research.exp);return Object.fromEntries(Object.entries(BAL.research.base).map(([k,v])=>[k,Math.round(v*m)]));}
async function fundResearch(id){if(rl(id)>=BAL.research.max)return toast('Maxed');try{const l=await NET.research(P.uid,P.name,id,rcost(id));toast(`🔬 ${BAL.research.list[id].name} Lv${l}`);}catch(e){toast(e.message||'Research failed');}UI.render();UI.hud();}
const _render=UI.render;UI.render=function(){_render.call(this);const t=this.tab,sub=this.sub[t],b=$('#sheetBody');if(!b)return;let h='';
  const A=G.al||{bank:{}},bank=A.bank||{},cs=c=>Object.entries(c).filter(([,v])=>v).map(([k,v])=>`<span class="${(bank[k]||0)<v?'short':''}">${v} ${RES[k]}</span>`).join(' ');
  if(t==='alliance'&&sub==='research'){h=`<h2>🔬 Alliance Research</h2><p class="tiny">Paid from the Alliance Bank. Perks are permanent and shared by everyone in the alliance.</p>`+Object.entries(BAL.research.list).map(([id,r])=>{const l=rl(id),mx=l>=BAL.research.max,c=rcost(id),ok=Object.entries(c).every(([k,v])=>(bank[k]||0)>=v);
      return`<div class="row"><div class="grow"><b>${r.icon} ${r.name}</b> <small style="display:inline">Lv ${l}/${BAL.research.max}</small><small>${r.desc} · now ${l*r.per}%</small>${mx?'':`<small>Next: ${cs(c)}</small>`}<div class="prog"><i style="width:${100*l/BAL.research.max}%"></i></div></div>${mx?'<b>MAX</b>':`<button ${ok?'':'disabled'} onclick="fundResearch('${id}')">Fund</button>`}</div>`;}).join('')+`<p class="tiny">Bank: ${Object.keys(RES).map(k=>RES[k]+' '+(bank[k]||0)).join(' · ')}</p>`;}
  if(t==='alliance'&&sub==='ops'){const L=opsList();P.opsClaimed=P.opsClaimed||{};h=`<h2>🎖️ Operations · this week</h2><p class="tiny">Crew-wide missions. Everyone's progress counts; each member claims the reward once. New missions every Monday (Pacific).</p>`+L.map(o=>`<div class="row"><div class="grow"><b>${o.text}</b><small>Reward each: ${Object.entries(o.reward).map(([k,v])=>v+RES[k]).join(' ')} · ${BAL.ops.xp} XP</small><div class="prog"><i style="width:${100*o.prog/o.n}%"></i></div><small>${o.prog}/${o.n}</small></div>${P.opsClaimed[o.key]?'<b>✅</b>':`<button ${o.done?'':'disabled'} onclick="opsClaim('${o.key}')">Claim</button>`}</div>`).join('');}
  if(t==='base'&&sub==='outposts'){const w=W(),os=Object.entries(w.outposts||{}),c=BAL.outpost;h=`<h2>⛺ Outposts <small class="lv">${outpostsLive()}/${outpostCap()}</small></h2><p class="tiny">Stand on a hex and tap 🏗️ Build to capture one. ${c.holdMin}-min hold, then it claims and guards a ${hexRing(0,0,c.radius).length}-hex area with power ${outpostPower()}. Limit: ${c.capBase} + 1 per ${c.capPerShLevels} Stronghold levels.</p>`+
      (os.map(([id,o])=>`<div class="row"><div class="grow"><b>Hex ${id}</b><small>${o.state==='capturing'?'⏳ capturing · '+fmtDur(o.endsAt-Date.now())+' left':o.state==='up'?'✅ standing':'💥 lost'}</small></div><button onclick="UI.close();map.setView(hexCenter(...idQR('${id}')),16);UI.infoOutpost('${id}')">Show</button></div>`).join('')||'<p class="tiny">No outposts yet.</p>');}
  if(t==='base'&&sub==='factions'){const fx=P.world&&P.world.fx;h=`<h2>☠️ Raider Factions</h2><p class="tiny">They grow a little every few hours, even while you're away, and push toward your land. Where they touch your border they test it: their attack vs your defense there. Fight their hexes to take them back (edges are weakest). Beat a home base to rout the whole faction.</p>`;
    if(!fx||!fx.start)h+=`<p class="tiny">Quiet for now. Factions show up once you hold ${BAL.factions.startTiles} hexes.</p>`;
    else h+=BAL.factions.list.map(d=>{const f=fx.f[d.id];if(!f)return'';const n=Object.keys(f.tiles||{}).length,seen=Object.keys(f.tiles||{}).filter(isVis).length,homeSeen=f.home&&isVis(f.home);
      return`<div class="row"><i class="cdot" style="background:${d.color}"></i><div class="grow"><b>${d.icon} ${d.name}</b> <small style="display:inline">tier ${f.tier||0}</small><small>${f.routedUntil&&Date.now()<f.routedUntil?'🏳️ Routed · back in '+fmtDur(f.routedUntil-Date.now()):`${n} hexes (${seen} seen) · attack power ${factionAttack(f)} · ${homeSeen?'HQ spotted':'HQ hidden in the fog'}`}</small></div>${homeSeen&&!f.routedUntil?`<button onclick="UI.close();map.setView(hexCenter(...idQR('${f.home}')),15)">HQ</button>`:''}</div>`;}).join('');}
  if(t==='player'&&sub==='save'){const live=NET.mode!=='local';h=`<h2>☁️ Cloud save</h2><p class="tiny">${live?'Your progress is saved to the alliance cloud every couple of minutes and when you leave the app.':'Demo mode: saves stay on this phone (a cloud copy is kept in local storage).'}</p>
    <div class="row"><div class="grow">Status: <b>${CS.status}</b><small>Save #${P._rev||0}</small></div><button onclick="cloudSave(true).then(()=>UI.render())">Save now</button></div>
    <div class="row"><div class="grow">Restore code<small style="word-break:break-all">${P.uid||'—'}</small><small>Keep this somewhere safe. On a new phone, join the same team and enter it below.</small></div></div>
    <div class="row"><input id="rcode" placeholder="Paste a restore code"><button onclick="cloudRestore($('#rcode').value)">Load</button></div>
    <button style="width:100%" onclick="undoRestore()">Undo last load (use backup)</button>`;}
  if(h)b.insertAdjacentHTML('beforeend',h);};
