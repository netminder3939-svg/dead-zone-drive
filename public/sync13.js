// sync13 (TEST · ddd-v26-12g) One character, one playing device, live follow.
// Replaces the 12d merge engine (sync26 handoff/merge) whenever the player is signed in with an email account.
//
//  * One save document per account: teams/{team}/saves/{uid}. Every open device listens to it live.
//  * Exactly one device is "playing" (the lease holder). Only it writes. Every other device mirrors the
//    save within a second or two and shows who is playing.
//  * Touch the game on another device and it takes over at once: it is already on the latest copy,
//    so it simply writes the next revision. Nothing is merged, so nothing is guessed.
//  * A device that sits idle (hidden, asleep, closed) for 90 s gives up the lease to a visible device.
//  * Every write is a transaction on the revision: rev must be the one we hold, and goes up by one
//    (same rule the 12d Firestore rules already enforce). A stale device can never overwrite newer work.
//  * Rare case: both devices changed the game while one was offline (a drive in a dead zone).
//    The player picks which copy to keep. The other copy is kept on that device as a backup.
//  * Per-device fields (position, notifications, old sync metadata) are never synced.
(function(){
'use strict';
const LOCAL=new Set(['uid','op15','pos','lat','lng','news','_rev','_ackedRev','_handoff','_userEdit','_userBase','_tab','_armHold','_seen','sync26',
  'heal26c','heal26cDone','heal26cNote','heal26cDrives','heal26cParts','heal26cPipe','heal26cPipeNote']);
const T13={flushMs:1500,ownerMinGapMs:20e3,gestureMs:4e3,staleLeaseMs:90e3,heartbeatMs:60e3};
const isPhone=/Mobi|iPhone|iPad|Android/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const LABEL=isPhone?'phone':'computer',ICON=isPhone?'📱':'💻';
function devId(){let base='',tab='';try{base=localStorage.getItem('wl_dev13');if(!base){base=Math.random().toString(36).slice(2,10);localStorage.setItem('wl_dev13',base);}}catch(e){base=Math.random().toString(36).slice(2,10);}
  try{tab=sessionStorage.getItem('wl_tab13');if(!tab){tab=Math.random().toString(36).slice(2,6);sessionStorage.setItem('wl_tab13',tab);}}catch(e){tab=Math.random().toString(36).slice(2,6);}return base+'-'+tab;}
const S={on:false,dev:devId(),rev:0,lease:null,lastFp:null,lastWrite:0,lastGesture:0,writing:null,hold:false,unsub:null,state:'',savedAt:0,conflictOpen:false,offline:false,log:[]};
window.SYNC13=S;
function log(){const a=[...arguments].join(' ');S.log.push(new Date().toISOString().slice(11,19)+' '+a);if(S.log.length>60)S.log.shift();try{console.log('[sync13] '+a);}catch(e){}}
// ---------- profile helpers ----------
function strip(o){const c={};for(const k of Object.keys(o||{}))if(!LOCAL.has(k)&&o[k]!==undefined)c[k]=o[k];return c;}
function fp(){try{return JSON.stringify(strip(P));}catch(e){return null;}}
function ref(){return NET.fs.doc(NET.col('saves'),NET.uid);}
function leaseFresh(l){return !!(l&&l.t&&Date.now()-l.t<T13.staleLeaseMs);}
function iOwn(){return !!(S.lease&&S.lease.dev===S.dev);}
function other(l){return l&&l.label==='phone'?'your phone':l&&l.label==='computer'?'your computer':'another device';}
function visible(){return document.visibilityState==='visible';}
// ---------- status (Save tab + small bar) ----------
function setStatus(state,text){S.state=state;try{if(typeof CS!=='undefined'){CS.report=text;CS.status=text;CS.why='sync13 '+state+' rev='+S.rev;}}catch(e){}bar();}
function bar(){let el=document.getElementById('sync13bar');
  const follower=S.on&&S.lease&&!iOwn()&&leaseFresh(S.lease);
  const show=follower||S.state==='offline'||S.state==='conflict';
  if(!show){if(el)el.remove();return;}
  if(!el){el=document.createElement('div');el.id='sync13bar';el.style.cssText='position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 40px);z-index:1900;max-width:92vw;background:rgba(20,15,12,.92);color:#f3e6d0;border:1px solid #6b4a2a;border-radius:10px;padding:6px 12px;font:600 12px system-ui;text-align:center;pointer-events:auto;box-shadow:0 2px 10px rgba(0,0,0,.4)';document.body.appendChild(el);
    el.onclick=()=>{S.lastGesture=Date.now();if(S.state!=='conflict')takeover('tap');};}
  if(S.state==='offline')el.textContent='📡 Offline. Your progress is kept on this '+LABEL+' and saves when you are back online.';
  else if(S.state==='conflict')el.textContent='⚠️ Choose which copy to keep';
  else el.textContent=(S.lease.label==='phone'?'📱':'💻')+' Playing on '+other(S.lease)+' · synced '+ago13(S.savedAt)+'. Tap here or play to switch to this '+LABEL+'.';}
function ago13(t){if(!t)return'just now';const s=Math.round((Date.now()-t)/1000);return s<5?'just now':s<60?s+'s ago':Math.round(s/60)+'m ago';}
// ---------- adopt the server copy ----------
window.profile13=fp;
window.applySave13=function(profile,rev,lease){adopt(profile,rev,lease,'bank-collect');};
function adopt(o,rev,lease,why){
  const keep={};for(const k of LOCAL)if(P[k]!==undefined)keep[k]=P[k];
  for(const k of Object.keys(P))if(!LOCAL.has(k)&&!(k in o))delete P[k];
  for(const k of Object.keys(o))if(!LOCAL.has(k))P[k]=o[k];
  Object.assign(P,keep);
  S.rev=rev;S.lease=lease||S.lease;P._rev=rev;P._ackedRev=rev;P._userBase=P._userEdit|0;
  S.lastFp=fp();S.savedAt=Date.now();
  try{save();}catch(e){}
  redraw();try{if(window.onProfile25)onProfile25();}catch(e){}log('adopt rev',rev,'from',lease&&lease.label,why||'');}
function redraw(){try{UI.hud();}catch(e){}try{drawWorld();}catch(e){}try{if(typeof drawPipes==='function')drawPipes();}catch(e){}try{if(UI.tab)UI.render();}catch(e){}}
// ---------- write (transaction on the revision) ----------
async function write(reason,force){
  if(S.writing)return S.writing;
  const f=fp();if(!f)return;
  S.writing=(async()=>{
    const base=S.rev,lease={dev:S.dev,label:LABEL,t:Date.now()};let out='ok',cur=null;
    try{
      await NET.fs.runTransaction(NET.db,async tx=>{
        const s=await tx.get(ref());cur=s.exists()?s.data():null;
        if(cur&&(cur.rev|0)!==base&&!force){out='stale';return;}
        const rev=(cur?(cur.rev|0):0)+1;
        const prof=Object.assign(JSON.parse(f),{uid:NET.uid,_rev:rev});
        const body={data:JSON.stringify(prof),rev,baseRev:cur?(cur.rev|0):0,savedAt:Date.now(),name:String(P.name||'').slice(0,24),lvl:P.lvl|0,v:3,fe:P.fullEpoch||0,me:P.mapEpoch||0,lease};
        if(P.acct)body.acct=String(P.acct).slice(0,24);
        tx.set(ref(),body);out={rev};});
    }catch(e){const c=(e&&e.code)||'';
      if(/unavailable|network|offline|deadline/i.test(c+' '+(e&&e.message))){S.offline=true;setStatus('offline','Offline. Progress is on this device and will save when you are back online. Do not switch devices yet.');stash();}
      else if(/resource-exhausted|quota/i.test(c)){setStatus('quota','The free daily save limit was reached. Progress is on this device. Do not switch devices.');stash();}
      else{log('write error',c,e&&e.message);setStatus('error','Save did not go through. Progress is on this device. Do not switch devices yet.');stash();}
      return 'error';}
    if(out==='stale'){log('write stale: server',cur&&cur.rev,'we',base);onRemote(cur,true);return 'stale';}
    const wasOwner=iOwn();S.rev=out.rev;S.lease=lease;S.lastFp=f;S.lastWrite=Date.now();S.savedAt=Date.now();S.offline=false;
    P._rev=S.rev;P._ackedRev=S.rev;P._userBase=P._userEdit|0;unstash();
    setStatus('saved','Safe to switch. Saved to the cloud (save '+S.rev+') from this '+LABEL+'.');
    if(!wasOwner&&reason!=='first')try{toast(ICON+' Now playing on this '+LABEL+'.');}catch(e){}
    log('wrote rev',S.rev,reason);return 'ok';})();
  try{return await S.writing;}finally{S.writing=null;}}
// unsent progress survives a reload while offline
function stashKey(){return 'wl_sync13_unsent_'+(localStorage.getItem('wl_team')||'')+'_'+NET.uid;}
function stash(){try{localStorage.setItem(stashKey(),JSON.stringify({base:S.rev,at:Date.now(),fp:fp()}));}catch(e){}}
function unstash(){try{localStorage.removeItem(stashKey());}catch(e){}}
// ---------- the server copy changed ----------
function parse(d){try{return JSON.parse(d.data);}catch(e){return null;}}
function onRemote(d,fromStale){
  if(!d)return;const rev=d.rev|0,lease=d.lease||null;
  if(rev<=S.rev){if(rev===S.rev){S.lease=lease||S.lease;bar();}return;}
  if(S.writing&&lease&&lease.dev===S.dev)return; // our own write echoing back
  const o=parse(d);if(!o)return;
  const mine=fp(),changed=mine!==S.lastFp;
  const userChanged=changed&&S.lastGesture>S.savedAt;
  if(userChanged&&typeof SYNC26!=='undefined'&&SYNC26.realAhead){
    let ahead=false;try{ahead=SYNC26.realAhead(JSON.parse(mine),o);}catch(e){}
    if(ahead)return conflict(o,rev,lease);}
  adopt(o,rev,lease,fromStale?'(after stale write)':'');
  if(lease&&lease.dev!==S.dev)setStatus('following','Following '+other(lease)+'. This '+LABEL+' has the latest save ('+rev+').');}
function conflict(o,rev,lease){
  if(S.conflictOpen)return;S.conflictOpen=true;S.hold=true;setStatus('conflict','Both devices changed the game. Choose which copy to keep.');
  const mine=JSON.parse(fp()),sum=x=>`Lv${x.lvl||1} · ${Object.keys(x.tiles||{}).length} hexes · ${((x.stats&&x.stats.meters||0)/1000).toFixed(1)} km · ${(x.res&&x.res.scrap)||0} scrap`;
  const otherName=other(lease);
  try{UI.modal(`<h2>⚠️ Two copies of your game</h2><p class="tiny">This ${LABEL} and ${otherName} both changed the game while they could not see each other (usually a drive with no signal). Pick the one to keep. The other copy stays on this ${LABEL} as a backup.</p>
    <div class="row"><div class="grow"><b>${ICON} This ${LABEL}</b><small>${sum(mine)}</small></div><button class="big" id="s13mine">Keep this</button></div>
    <div class="row"><div class="grow"><b>${lease&&lease.label==='phone'?'📱':'💻'} ${otherName}</b><small>${sum(o)}</small></div><button class="big" id="s13theirs">Keep that</button></div>`);
    const done=()=>{S.conflictOpen=false;S.hold=false;try{UI.closeModal();}catch(e){}};
    document.getElementById('s13mine').onclick=async()=>{try{localStorage.setItem('wl_sync13_backup',JSON.stringify({at:Date.now(),kept:'mine',other:o}));}catch(e){}S.rev=rev;done();S.lastGesture=Date.now();await write('conflict-keep-mine');};
    document.getElementById('s13theirs').onclick=()=>{try{localStorage.setItem('wl_sync13_backup',JSON.stringify({at:Date.now(),kept:'theirs',other:mine}));}catch(e){}done();adopt(o,rev,lease,'conflict-keep-theirs');setStatus('following','Kept the copy from '+otherName+'.');};
  }catch(e){log('conflict modal failed',e);S.conflictOpen=false;S.hold=false;}}
// ---------- the loop ----------
function canWrite(){
  if(S.hold||!S.on||G.playLocked)return false;
  if(!S.lease||iOwn())return true;
  if(Date.now()-S.lastGesture<T13.gestureMs&&visible())return true;   // the player is using this device: take over
  if(visible()&&!leaseFresh(S.lease))return true;                      // the playing device went quiet
  return false;}
async function tick(force){
  if(!S.on||S.writing||S.hold)return;
  const f=fp();if(!f)return;
  const changed=f!==S.lastFp,now=Date.now();
  if(!changed){
    if(iOwn()&&visible()&&now-S.lastWrite>T13.heartbeatMs)return write('heartbeat');
    if(!iOwn()&&visible()&&S.lease&&!leaseFresh(S.lease)&&!S.offline)return write('idle-takeover');
    if(S.state!=='following'&&S.state!=='saved'&&S.state!=='offline'&&S.state!=='conflict')setStatus('saved','Safe to switch. Saved to the cloud (save '+S.rev+').');
    bar();return;}
  if(!canWrite()){bar();return;}
  if(!force&&iOwn()&&now-S.lastWrite<T13.ownerMinGapMs&&now-S.lastGesture>T13.gestureMs)return; // owner: batch passive ticks
  if(S.state!=='offline')setStatus('pending','Saving… do not switch devices yet.');
  return write(force?'forced':'change',false);}
async function takeover(why){if(!S.on||iOwn())return;S.lastGesture=Date.now();log('takeover',why);return write('takeover-'+why,false);}
// ---------- start ----------
async function start(){
  if(S.on)return;S.on=true;
  try{G.syncHoldUntil=8.64e15;G.sync26Ready=true;}catch(e){}   // the 12d merge engine stands down
  S.rev=P._ackedRev|0||P._rev|0;S.lastFp=null;
  // read the server once so we know rev + lease before the listener fires
  try{const s=await NET.fs.getDoc(ref());if(s.exists()){const d=s.data();S.lease=d.lease||null;
      // auth12 copies only part of the save on sign-in; take the complete server copy so nothing (pipelines, raid loot…) is left behind
      const o=parse(d);if(o)adopt(o,d.rev|0,d.lease,'start');else{S.rev=d.rev|0;S.lastFp=fp();}}}catch(e){log('start read failed',e&&e.code);}
  S.lastGesture=0; // taps on the sign-in screen are not play
  if(S.lastFp===null)S.lastFp=fp();
  // a reload while offline: auth12 already loaded the server copy; tell the player if this device had unsent work
  try{const u=JSON.parse(localStorage.getItem(stashKey())||'null');if(u&&u.fp&&u.fp!==S.lastFp&&(u.base|0)===S.rev){const o=JSON.parse(u.fp);adoptLocal(o);log('restored unsent progress from before reload');}
    else if(u)unstash();}catch(e){}
  S.unsub=NET.fs.onSnapshot(ref(),s=>{if(!s.exists())return;if(s.metadata&&s.metadata.hasPendingWrites)return;onRemote(s.data(),false);},e=>log('listen error',e&&e.code));
  setStatus(iOwn()?'saved':'following',iOwn()?'Safe to switch. Saved (save '+S.rev+').':'Following '+other(S.lease)+'.');
  log('started dev',S.dev,'label',LABEL,'rev',S.rev,'lease',S.lease&&S.lease.label);
  if(!S.lease||!leaseFresh(S.lease))write('first');}
function adoptLocal(o){for(const k of Object.keys(o))if(!LOCAL.has(k))P[k]=o[k];try{save();}catch(e){}redraw();try{if(window.onProfile25)onProfile25();}catch(e){}}
['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,e=>{if(e.target&&e.target.closest&&e.target.closest('#auth12'))return;S.lastGesture=Date.now();},true));
document.addEventListener('visibilitychange',()=>{if(!S.on)return;if(visible()){tick();}else if(iOwn()&&fp()!==S.lastFp)write('hide');});
window.addEventListener('online',()=>{if(S.on){S.offline=false;tick(true);}});
setInterval(()=>{try{tick();}catch(e){console.warn('sync13 tick',e);}},T13.flushMs);
setInterval(()=>{try{bar();}catch(e){}},5000);
// cloudSave is called by the game, auth12 (autosave, log out) and the Save tab: route it here
const _cs13=typeof cloudSave==='function'?cloudSave:null;
// only real taps/keys count as "playing here", never an automatic save
cloudSave=async function(force){if(S.on)return tick(!!force);if(_cs13)return _cs13.apply(this,arguments);};
window.cloudSave=cloudSave;
const boot=setInterval(()=>{try{if(S.on){clearInterval(boot);return;}
  if(window.__emailAuth&&typeof NET!=='undefined'&&NET.mode==='firebase'&&NET.uid&&NET.fs&&Array.isArray(NET.base)&&typeof G!=='undefined'&&!G.playLocked&&P&&P.name){clearInterval(boot);start();}}catch(e){}},500);
})();
