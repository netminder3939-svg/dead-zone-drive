// default new-player colour is a free COL25 (not the old #4ad7ff)
const _bootCol25=()=>{try{if(P&&P.color&&!COL25.includes(P.color)&&!P.world){P.color=COL25[0];}}catch(e){}};
setTimeout(_bootCol25,0);setInterval(()=>{try{if(P&&!P.world&&P.color&&!COL25.includes(P.color))P.color=COL25.find(c=>!clashM(c))||COL25[0];}catch(e){}},2000);
// v25a (TEST) playtest bug fixes: unique crew colours + picker saved to the name+PIN account, roster/device dedupe,
// no claiming / building on a teammate's hex or Stronghold, explicit 0-troop messages, own Stronghold opens its stats card,
// training queue survives a device switch, no-troops hint.
const COL25=['#ffc94a','#ff6ac8','#3ae0c8','#b26aff','#ff5a2a','#6ab8ff','#7aff6a','#e8dcc0','#d9884a','#ff4a6a','#4affb0','#a0a8ff'];
window.COL25=COL25;try{COLORS.length=0;COL25.forEach(c=>COLORS.push(c));}catch(e){}
G.col25={};
function myKey25(){return P.acct||(typeof acctKey==='function'?acctKey(P.name):'')||P.uid;}
function colOwner(c){const r=G.col25[c];return r&&r.k!==myKey25()?r:null;}
function colWatch(){if(G._colW||NET.mode!=='firebase'||!NET.fs||!NET.db||!NET.base)return;G._colW=1;const fs=NET.fs;
  fs.onSnapshot(fs.doc(NET.db,...NET.base,'meta','alliance'),d=>{const x=d.exists()?d.data():{};G.col25=x.col25||{};G._colReady=1;try{colorDedupe();}catch(e){}});}
async function colWrite(c,old){if(NET.mode!=='firebase'){G.col25[c]={k:myKey25(),n:P.name,t:Date.now()};if(old&&old!==c)delete G.col25[old];return;}
  const fs=NET.fs,o={[c]:{k:myKey25(),n:P.name,t:Date.now()}};if(old&&old!==c&&G.col25[old]&&G.col25[old].k===myKey25())o[old]=fs.deleteField();
  await fs.setDoc(fs.doc(NET.db,...NET.base,'meta','alliance'),{col25:o},{merge:true});}
async function pickColor25(c){if(!COL25.includes(c))return;const o=colOwner(c);if(o)return toast(`🔒 ${o.n||'A teammate'} already has that colour`);const old=P.color;
  try{await colWrite(c,old);}catch(e){return toast('⚠️ Could not save colour, try again');}P.color=c;save();try{pushMember();}catch(e){}
  try{if(P.acct){const a=await acctGet(P.acct);if(a)await acctPut(P.acct,{...a,color:c});}}catch(e){}
  try{drawWorld();UI.hud();}catch(e){}toast('🎨 Colour saved to your name: it follows you on every device');if(document.querySelector('#modalBody .col25'))UI.profile();}
window.pickColor25=pickColor25;
// older/bigger player keeps a contested colour; registry (first saved) always wins
function seniority(m){return[(m&&m.contrib&&m.contrib.hexes)||0,(m&&m.lvl)||0];}
colorDedupe=function(){if(!P.uid||!P.name||!G._colReady)return;
  if(!COL25.includes(P.color)){const mine=Object.entries(G.col25).find(([,r])=>r.k===myKey25());const nc=mine?mine[0]:COL25.find(c=>!G.col25[c]&&!clashM(c));if(nc){const old=P.color;P.color=nc;save();try{pushMember();drawWorld();}catch(e){}if(!mine)colWrite(nc,null).catch(()=>{});}return;}
  const me=P.color,reg=G.col25[me];
  if(reg&&reg.k!==myKey25()){const mine=Object.entries(G.col25).find(([,r])=>r.k===myKey25());const nc=mine?mine[0]:COL25.find(c=>!G.col25[c]&&!clashM(c));if(!nc)return;P.color=nc;save();try{pushMember();drawWorld();}catch(e){}
    if(!mine)colWrite(nc,null).catch(()=>{});toast(`🎨 ${reg.n||'A teammate'} already had your colour, so yours is now a new one. Change it in Profile › Crew colour.`);return;}
  if(!reg){const rival=clashM(me);if(rival){const a=seniority(rival),b=seniority({contrib:P.contrib,lvl:P.lvl});if(a[0]>b[0]||(a[0]===b[0]&&a[1]>b[1]))return;}
    if(!G._colClaim){G._colClaim=1;colWrite(me,null).catch(()=>{}).finally(()=>G._colClaim=0);}}};
function clashM(c){for(const [u,m] of Object.entries((G.al&&G.al.members)||{}))if(!isMe(u)&&!m.me&&m.color===c&&acctKey(m.name)!==myKey25())return m;return null;}
setInterval(()=>{try{colWatch();}catch(e){}},2000);
// account colour wins on any device
setInterval(async()=>{try{if(G._acctCol||!P.acct||!G._colReady)return;G._acctCol=1;const a=await acctGet(P.acct);if(a&&a.color&&a.color!==P.color&&!colOwner(a.color)){P.color=a.color;save();try{pushMember();drawWorld();}catch(e){}}}catch(e){}},3000);
// profile: colour picker
function colBlock(){return`<h3>🎨 Crew colour</h3><p class="tiny">One colour per player in the crew. Taken colours are locked with the owner's name. Saved to your name + PIN.</p>
  <div class="col25">${COL25.map(c=>{const o=colOwner(c),on=P.color===c;return`<button class="${on?'on':''} ${o?'lock':''}" style="--c:${c}" ${o?'disabled':''} onclick="pickColor25('${c}')"><i></i><small>${on?'You':o?'🔒 '+esc24(o.n||'taken'):'free'}</small></button>`;}).join('')}</div>`;}
const _pf25a=UI.profile;UI.profile=function(){_pf25a.apply(this,arguments);try{const b=document.querySelector('#modalBody');if(b&&!b.querySelector('.col25')){const h=[...b.querySelectorAll('h3')].find(x=>/March flag/.test(x.textContent));h?h.insertAdjacentHTML('beforebegin',colBlock()):b.insertAdjacentHTML('beforeend',colBlock());}}catch(e){console.warn('col25',e);}};
// ---------- roster: one row per player (name+PIN account), newest device wins ----------
function dedupeMembers(M){const by={},out={};for(const [uid,m] of Object.entries(M||{})){const k=(m&&m.acct)||(typeof acctKey==='function'?acctKey(m&&m.name):'')||uid;const cur=by[k];
    const better=!cur||m.me||(!cur[1].me&&(m.lastActive||0)>(cur[1].lastActive||0));if(better)by[k]=[uid,m];}
  for(const [uid,m] of Object.values(by))out[uid]=m;return out;}
window.dedupeMembers=dedupeMembers;
const _onAl25=NET.onAlliance.bind(NET);NET.onAlliance=function(f){return _onAl25(a=>{try{a={...a,rawMembers:a.members,members:dedupeMembers(a.members)};}catch(e){}f(a);});};
// linked devices: list + remove old ones
async function dropDevice25(uid){if(!P.acct)return;const a=await acctGet(P.acct);if(!a)return;const me=NET.uid||P.uid;if(uid===me)return toast('That is this device');
  const uids=(a.uids||[]).filter(u=>u!==uid);await acctPut(P.acct,{...a,uids,t:Date.now()});P.alias=uids.filter(u=>u!==me);save();try{pushMember();}catch(e){}toast('📱 Device removed');UI.profile();}
window.dropDevice25=dropDevice25;
const _pf25b=UI.profile;UI.profile=function(){_pf25b.apply(this,arguments);(async()=>{try{if(!P.acct)return;const a=await acctGet(P.acct);const b=document.querySelector('#modalBody');if(!a||!b||b.querySelector('.dev25'))return;const me=NET.uid||P.uid,raw=(G.al&&G.al.rawMembers)||{};
  const rows=(a.uids||[]).map((u,i)=>{const m=raw[u],la=m&&m.lastActive?fmtDur(Math.max(0,Date.now()-m.lastActive)).replace(/ \d+s$/,'')+' ago':'not seen';return`<div class="r24"><span>📱 ${u===me?'This device':'Device '+(i+1)}</span><b>${u===me?'active now':la} ${u===me?'':`<button class="ghost24 sm" onclick="dropDevice25('${u}')">Remove</button>`}</b></div>`;}).join('');
  const pin=b.querySelector('#pin24');(pin?pin.parentElement:b).insertAdjacentHTML('beforeend',`<div class="dev25"><h3>📱 Linked devices (${(a.uids||[]).length})</h3>${rows}<p class="tiny">Remove phones or browsers you no longer use. Logging in again with your name + PIN re-adds a device.</p></div>`);}catch(e){}})();};
// auto-prune devices not seen for 30 days
setInterval(async()=>{try{if(G._prune25||!P.acct||!G.al||!G.al.rawMembers)return;G._prune25=1;const a=await acctGet(P.acct);if(!a)return;const me=NET.uid||P.uid,raw=G.al.rawMembers;
  const keep=(a.uids||[]).filter(u=>u===me||!raw[u]||(Date.now()-(raw[u].lastActive||0))<30*864e5);if(keep.length<(a.uids||[]).length){await acctPut(P.acct,{...a,uids:keep});P.alias=keep.filter(u=>u!==me);save();}}catch(e){}},20000);
// ---------- never claim / build on a teammate's hex or next to their Stronghold ----------
function allyOwned(id){const o=G.terr[id];return !!(o&&!o.ai&&!o.released&&o.uid&&!isMe(o.uid)&&!P.tiles[id]);}
window.allyOwned=allyOwned;
const _ct25=claimTile;claimTile=function(id){if(allyOwned(id))return;return _ct25.apply(this,arguments);};
function allyBldNear(id,r){for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||m.me||!Array.isArray(m.defs))continue;for(const d of m.defs)if(d&&d.hex&&hexDist(d.hex,id)<=r)return{m,d};}return null;}
window.allyBldNear=allyBldNear;
const _ps25=placeStronghold;placeStronghold=function(id){const n=allyBldNear(id,1);if(n){toast(`🚫 Too close to ${n.m.name||'a teammate'}'s ${({sh:'Stronghold',tower:'tower',op:'outpost'})[n.d.k]||'building'}. Pick a hex at least 2 away.`);return'ally';}
  if(allyOwned(id)){toast('🚫 That hex belongs to a teammate');return'ally';}return _ps25.apply(this,arguments);};
const _sa25=shAreaIds;shAreaIds=function(){return _sa25.apply(this,arguments).filter(id=>!allyOwned(id));};
// ---------- 0-troop reinforce: say why ----------
const _st25=stationTroops;stationTroops=function(h,n){if(TP().home<=0||!(n>0))return toast('🪖 No troops at home to send. Train some in Base › Barracks, or recall troops from another spot.');return _st25.apply(this,arguments);};
// ---------- own buildings open their stats card too ----------
// building hexes: the stats card leads the hex card (old duplicate "troops guarding" row removed)
const _it25=UI.infoTile;UI.infoTile=function(id){const r=_it25.apply(this,arguments);try{const b=bldAt(id),mb=document.querySelector('#modalBody');if(b&&mb){mb.querySelectorAll('.bld23').forEach(x=>x.remove());
    [...mb.querySelectorAll('.row')].forEach(x=>{if(/Troops guarding here|Owner:/.test(x.textContent)&&!x.closest('.bld25'))x.remove();});[...mb.querySelectorAll('div')].forEach(x=>{if(/^\s*Owner: /.test(x.textContent)&&x.children.length===0)x.remove();});
    const art=mb.querySelector('.icard,.ihead,h2');const h=bldCard(id);mb.insertAdjacentHTML('afterbegin',h);}}catch(e){console.warn('it25',e);}return r;};
// ---------- training queue / save survives a device switch ----------
const _ad25a=adoptProfile;adoptProfile=function(o,why){const keepQ=((P.troops||{}).queue||[]).filter(x=>x&&x.end>Date.now());const r=_ad25a.apply(this,arguments);try{const t=TP(),seen=new Set(t.queue.map(x=>x.end+':'+x.n));for(const x of keepQ)if(!seen.has(x.end+':'+x.n))t.queue.push(x);t.queue.sort((a,b)=>a.end-b.end);save();}catch(e){}return r;};
document.addEventListener('visibilitychange',()=>{try{if(document.visibilityState==='visible'&&P.acct&&typeof acctSync==='function'){sessionStorage.removeItem('wl_acct24_sync');acctSync();}}catch(e){}});
// ---------- no-troops hint ----------
function troopHint(){let el=document.getElementById('hint25');const t=TP(),none=t.home<=0&&!(t.queue||[]).some(x=>x.end>Date.now())&&!Object.keys(stationed()).length&&!myMarches().length&&P.world;
  if(!none||G.drive&&G.drive.on){if(el)el.remove();return;}if(!el){el=document.createElement('div');el.id='hint25';el.onclick=()=>{UI.sub.base='barracks';UI.open('base');};document.body.appendChild(el);}
  el.innerHTML='🪖 <b>No troops yet.</b> Train some in Base › Barracks: marches and reinforcements need real troops.';}
setInterval(()=>{try{troopHint();}catch(e){}},3000);
