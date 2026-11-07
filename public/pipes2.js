// v20 Pipeline team play. Loads after pipes.js.
// 1) A teammate can drive YOUR pin: pins (site point, no player GPS) ride in your member doc. When a teammate in Drive mode
//    reaches it, their phone drops a tiny `pipedrive` signal in the shared markers collection (no rules change); your phone
//    sees it, switches the line on and credits them.
// 2) Guard the line: send troops to the most exposed hex on a route (nearest the horde). The horde has to beat them to cut it.
HOOK.member(function(o){try{if(Array.isArray(o.pipes))o.pipes=o.pipes.map(x=>{const p=pipes().find(y=>y.id===x.id);return p&&x.st==='pin'?{...x,pt:[+p.lat.toFixed(5),+p.lng.toFixed(5)],hex:p.hex,exp:p.pinExp}:x;});}catch(e){}return o;});
function allyPins(){const out=[];for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(m.me||isMe(uid)||!Array.isArray(m.pipes))continue;
  for(const p of m.pipes)if(p&&p.st==='pin'&&Array.isArray(p.pt)&&(!p.exp||p.exp>Date.now()))out.push({...p,lat:p.pt[0],lng:p.pt[1],owner:m.name||'Ally',ownerUid:uid,ally:true,pinExp:p.exp||Date.now()+864e5});}return out;}
G._pdSent=G._pdSent||{};
const _p2_check=pipeDriveCheck;pipeDriveCheck=function(){_p2_check.apply(this,arguments);try{if(!G.pos||!(G.drive&&G.drive.on))return;for(const p of allyPins()){if(G._pdSent[p.id])continue;const d=distM(G.pos[0],G.pos[1],p.lat,p.lng);if(d>PIPE.pinM)continue;
  G._pdSent[p.id]=1;NET.addMarker({type:'pipedrive',hex:p.hex||hexAt(p.lat,p.lng).id,pipe:p.id,owner:p.ownerUid,by:P.name,uid:P.uid,t:Date.now(),exp:Date.now()+7*864e5});
  toast(`⛓️ You drove ${poss(p.owner)} ${p.name} line. It switches on when their game syncs.`);allianceLog(`⛓️ ${P.name} drove ${poss(p.owner)} ${p.name} pipeline pin`);P.pipeAssists=(P.pipeAssists||0)+1;save();}}catch(e){console.warn('ally pin',e);}};
// owner side: pick up signals for my pins
setInterval(()=>{try{if(!P||!P.world)return;for(const [mid,m] of Object.entries(G.markers||{})){if(!m||m.type!=='pipedrive')continue;const p=pipes().find(x=>x.id===m.pipe);
  if(m.owner&&m.owner!==P.uid&&!p)continue; // someone else's line
  if(p&&pipeState(p)==='pin'){p.st='online';p.onT=Date.now();p.lastPay=Date.now();p.drivenBy=m.by;save();try{pushMember();}catch(e){}drawPipes();toast(`⛓️ ${m.by} drove your ${p.name} pin: the pipeline is ONLINE`);report(`⛓️ ${m.by} drove your ${p.name} pipeline pin. It's online.`,true);}
  if(p||(m.owner===P.uid)||Date.now()>(m.exp||0))try{NET.delMarker(mid);}catch(e){}}}catch(e){}},5000);
// Drive HUD lists teammates' pins too
const _p2_pins=pinsWaiting;pinsWaiting=function(){const own=_p2_pins.apply(this,arguments);try{return own.concat(allyPins().filter(p=>!G._pdSent[p.id]).map(p=>({...p,name:`${poss(p.owner)} ${p.name}`})));}catch(e){return own;}};
// guard the line
function lineGuards(p){let n=0;for(const h of p.route||[]){n+=(stationed()[h]||{}).n||0;try{n+=allyGarAt(h).reduce((a,g)=>a+g.n,0);}catch(e){}}return n;}
function exposedHex(p){const hs=Object.keys(fxIndex());const route=(p.route||[]).slice(1,-1).filter(h=>allied(h));if(!route.length)return null;if(!hs.length)return route[Math.floor(route.length/2)];
  let best=null,bd=1e9;for(const h of route){let d=1e9;for(const x of hs){const k=hexDist(h,x);if(k<d)d=k;}if(d<bd){bd=d;best=h;}}return best;}
function guardLine(id,n){const p=pipes().find(x=>x.id===id);if(!p)return;const h=exposedHex(p);if(!h)return toast('No crew hex on this route to guard');stationTroops(h,n);UI.closeModal&&UI.closeModal();}
const _p2_card=pipeCard;pipeCard=function(p){_p2_card.apply(this,arguments);try{if(p.own===false)return;const box=$('#modalBody .ibtns');if(!box)return;const h=exposedHex(p),home=TP().home,g=lineGuards(p),opts=[1000,5000].filter(x=>x<home);if(home)opts.push(home);
  box.insertAdjacentHTML('beforebegin',`<div class="row"><div class="grow"><b>🛡️ Guards on the line: ${g.toLocaleString()}</b><small>${h?`Most exposed hex: ${hexName(h)} (nearest the horde). Squads must beat the guards there to cut it.`:'No crew hex on the route to guard.'}${p.drivenBy?` · Switched on by ${m2esc(p.drivenBy)}`:''}</small>${h&&home?`<div class="seg">${opts.map(x=>`<button onclick="guardLine('${p.id}',${x})">${x===home?'All '+x.toLocaleString():'+'+x.toLocaleString()}</button>`).join('')}</div>`:''}</div></div>`);}catch(e){console.warn('guard row',e);}};
