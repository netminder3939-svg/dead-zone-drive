// Email/password account on preview and localhost only. One Firebase user, one character document.
// Live hostnames keep anonymous sign-in. Passwords are handed to the Auth SDK and are not stored.
(function(){
function previewHost(){return location.hostname.indexOf('--')>=0||location.hostname==='localhost'||location.hostname==='127.0.0.1';}
if(!previewHost())return;
try{if(typeof G!=='undefined')G.playLocked=true;}catch(e){}
const KEYS=['res','troops','world','dr26','tiles','stats','badges','pipeUnlock26','sync26','stronghold','lvl','xp','sp','skills','contrib','marchDone','marchPaid','claimDay','hp','inv','equip','killed','quests','cards','cls','_rev','_ackedRev','_handoff','_userEdit','_userBase','_tab','_seen'];
function gate(){
  let el=document.getElementById('auth12');
  if(el)return el;
  el=document.createElement('div');
  el.id='auth12';
  el.style.cssText='position:fixed;inset:0;z-index:4000;background:#140f0c;color:#f3e6d0;display:flex;align-items:center;justify-content:center;font:16px system-ui';
  el.innerHTML='<div style="width:min(420px,92vw);background:#241910;padding:22px;border-radius:14px"><form id="a12form"><div class="logo65" style="text-align:center;margin:0 0 6px"><img class="logo" style="width:min(100%,260px)" src="assets/places/branding/logo-title.webp" alt="Dead Zone Drive" width="463" height="191" onerror="logoErr65(this)"><span class="vh">DEAD ZONE DRIVE</span></div><h1 style="font-size:22px;margin:0 0 8px">Sign in</h1><p id="a12msg" style="min-height:2.4em;color:#ffb4a2"></p><label>Email<br><input id="a12email" type="email" autocomplete="username" required style="width:100%;margin:4px 0 10px;padding:8px"></label><label>Password<br><input id="a12pass" type="password" autocomplete="current-password" minlength="6" required style="width:100%;margin:4px 0 10px;padding:8px"></label><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="a12in" type="submit">Sign in</button><button id="a12up" type="button">Create account</button><button id="a12reset" type="button">Email a password reset</button></div></form><p id="a12spin" hidden>Loading your character…</p><div id="a12choose" hidden><p>This account has no character on this team yet.</p><button id="a12import" type="button">Import the character on this device</button><button id="a12fresh" type="button">Start a new character</button></div></div>';
  document.body.appendChild(el);
  return el;
}
function msg(t){const n=document.getElementById('a12msg');if(n)n.textContent=t||'';}
function show(which){
  gate();
  const form=document.getElementById('a12form');
  const spin=document.getElementById('a12spin');
  const choose=document.getElementById('a12choose');
  form.hidden=which==='load'||which==='choose';
  spin.hidden=which!=='load';
  choose.hidden=which!=='choose';
}
window.auth12Prepare=function(){G.playLocked=true;show('sign');};
function nice(e){
  const c=e&&e.code||'';
  if(c==='auth/invalid-credential'||c==='auth/wrong-password'||c==='auth/user-not-found'||c==='auth/invalid-email')return 'Wrong email or password.';
  if(c==='auth/email-already-in-use')return 'That email already has an account. Sign in instead.';
  if(c==='auth/weak-password')return 'Use at least 6 characters.';
  if(c==='auth/too-many-requests')return 'Too many attempts. Wait a minute and try again.';
  return 'Sign-in did not finish. Check the connection and try again.';
}
function waitClick(id){return new Promise(function(res){document.getElementById(id).addEventListener('click',function(){res();},{once:true});});}
window.auth12SignIn=async function(auth,au){
  show(au.currentUser&&!au.currentUser.isAnonymous?'load':'sign');
  if(au.currentUser&&au.currentUser.isAnonymous){try{await auth.signOut(au);}catch(e){}}
  if(au.currentUser&&!au.currentUser.isAnonymous&&au.currentUser.email){window.__auth12Ready=true;return au.currentUser;}
  const form=document.getElementById('a12form');
  return await new Promise(function(resolve){
    form.onsubmit=async function(ev){
      ev.preventDefault();
      const email=document.getElementById('a12email').value.trim();
      const pass=document.getElementById('a12pass').value;
      msg('');
      try{resolve((await auth.signInWithEmailAndPassword(au,email,pass)).user);}catch(e){msg(nice(e));}
    };
    document.getElementById('a12up').onclick=async function(){
      const email=document.getElementById('a12email').value.trim();
      const pass=document.getElementById('a12pass').value;
      msg('');
      try{resolve((await auth.createUserWithEmailAndPassword(au,email,pass)).user);}catch(e){msg(nice(e));}
    };
    document.getElementById('a12reset').onclick=async function(){
      const email=document.getElementById('a12email').value.trim();
      if(!email){msg('Enter the email first.');return;}
      try{await auth.sendPasswordResetEmail(au,email);msg('If that account exists, a reset message was sent.');}
      catch(e){if(e&&(e.code==='auth/user-not-found'||e.code==='auth/invalid-email'))msg('If that account exists, a reset message was sent.');else msg(nice(e));}
    };
    window.__auth12Ready=true;
  });
};
function pendingKey(uid){
  const team=String(localStorage.getItem('wl_team')||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,48);
  const id=String(uid||'').replace(/[^A-Za-z0-9]/g,'').slice(0,128);
  return 'wl_pending_'+team+'_'+id;
}
function readPending(uid){
  try{
    const o=JSON.parse(localStorage.getItem(pendingKey(uid))||'null');
    if(!o||o.uid!==uid||o.team!==(localStorage.getItem('wl_team')||'')||!o.profile)return null;
    return o;
  }catch(e){return null;}
}
function writePending(uid,profile,base){
  if(!uid||!profile)return;
  localStorage.setItem(pendingKey(uid),JSON.stringify({uid:uid,team:localStorage.getItem('wl_team')||'',at:Date.now(),base:base|0,profile:profile}));
}
function dropPending(uid){try{localStorage.removeItem(pendingKey(uid));}catch(e){}}
function acked(){return (P._userEdit|0)===(P._userBase|0)&&typeof CS!=='undefined'&&/Safe to switch/.test(CS.report||'');}
function applyCanon(o,rev){
  const keepName=P.name,keepColor=P.color;
  for(const k of KEYS)if(o[k]!==undefined)P[k]=o[k];
  if(!P.name)P.name=keepName;
  if(!P.color)P.color=keepColor;
  P.uid=NET.uid;
  P._rev=rev||o._rev||1;
  P._ackedRev=P._rev;
  P._handoff=1;
  P._userBase=P._userEdit|0;
  try{save();}catch(e){}
}
function parkUnsent(serverObj){
  try{
    if(!serverObj||!NET.uid||typeof SYNC26==='undefined'||!SYNC26.realAhead||!SYNC26.realAhead(P,serverObj))return false;
    const prev=readPending(NET.uid);
    if(prev&&SYNC26.realAhead(prev.profile,P)&&!SYNC26.realAhead(P,prev.profile))return true;
    writePending(NET.uid,JSON.parse(JSON.stringify(P)),P._ackedRev|0);
    return true;
  }catch(e){return false;}
}
function noteKept(){
  if(document.getElementById('a12parked'))return;
  const n=document.createElement('div');
  n.id='a12parked';
  n.style.cssText='position:fixed;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom) + 72px);z-index:3500;background:#3a2418;color:#f3e6d0;padding:10px;border-radius:8px';
  n.textContent='The account character is loaded. A change from this device is stored here and was not uploaded.';
  const b=document.createElement('button');
  b.type='button';
  b.textContent='Discard that stored change';
  b.style.marginTop='8px';
  b.onclick=function(){dropPending(NET.uid);n.remove();};
  n.appendChild(b);
  document.body.appendChild(n);
  if(typeof CS!=='undefined'){CS.report=n.firstChild&&n.firstChild.textContent||n.textContent;CS.status=CS.report;}
}
function mountLogout(){
  const hud=document.getElementById('hud');
  if(!hud||document.getElementById('a12out'))return;
  const b=document.createElement('button');
  b.id='a12out';b.type='button';b.className='chip';b.textContent='Log out';b.title='Log out';b.setAttribute('aria-label','Log out');
  b.onclick=function(){window.auth12SignOut();};
  hud.appendChild(b);
}
function blankCharacter(){
  const n=JSON.parse(JSON.stringify(P));
  n.res={scrap:0,food:0,water:0,fuel:0,parts:0};
  n.tiles={};
  n.troops={home:0,queue:[],away:{},wounded:0,healing:[]};
  if(n.world){n.world.outposts={};n.world.towers={};}
  n.xp=0;n.lvl=1;
  return n;
}
function whole(v){const n=Number(v);return Number.isFinite(n)?Math.floor(n):0;}
async function teamEpoch(net){
  const fs=net.fs,d=await fs.getDoc(fs.doc(net.db,...net.base,'meta','map'));
  if(!d.exists())return {fe:0,me:0};
  const x=d.data()||{};
  return {fe:whole(x.fullEpoch),me:whole(x.epoch)};
}
async function createIfAbsent(net,profile){
  const fs=net.fs,ref=fs.doc(net.col('saves'),net.uid);
  const ep=await teamEpoch(net);
  const fe=Math.max(whole(profile.fullEpoch),ep.fe),me=Math.max(whole(profile.mapEpoch),ep.me);
  profile.fullEpoch=fe;profile.mapEpoch=me;
  profile._rev=1;profile._ackedRev=1;profile._handoff=1;profile._userEdit=0;profile._userBase=0;profile.uid=net.uid;
  let existing=null;
  await fs.runTransaction(net.db,async function(tx){
    const s=await tx.get(ref);
    if(s.exists()){existing=s.data();return;}
    tx.set(ref,{data:JSON.stringify(profile),rev:1,savedAt:Date.now(),baseRev:0,name:profile.name||'',lvl:profile.lvl||1,v:3,fe:fe,me:me});
  });
  return existing;
}
function importFailed(text){
  show('choose');
  const choose=document.getElementById('a12choose');
  let n=document.getElementById('a12err');
  if(!n&&choose){n=document.createElement('p');n.id='a12err';n.style.cssText='color:#ffb4a2';choose.insertBefore(n,choose.firstChild);}
  if(n)n.textContent=text;
}
window.auth12Canonical=async function(net){
  show('load');
  let d=null;
  try{d=await net.loadProfile(net.uid);}catch(e){show('sign');msg('Could not load the character. Nothing was replaced.');throw e;}
  if(d&&d.data){
    let o;try{o=JSON.parse(d.data);}catch(e){o=null;}
    const pend=readPending(net.uid);
    if(o&&pend&&typeof SYNC26!=='undefined'&&SYNC26.realAhead(pend.profile,o)&&!SYNC26.realAhead(o,pend.profile)&&(pend.base|0)===(d.rev|0)){
      applyCanon(pend.profile,d.rev||1);
      P._ackedRev=d.rev|0;
      P._userEdit=(P._userBase|0)+1;
      try{save();}catch(e){}
      document.getElementById('auth12').remove();
      G.playLocked=false;
      mountLogout();
      try{await cloudSave(true);}catch(e){}
      if(acked())dropPending(net.uid);
      return;
    }
    if(o&&pend&&typeof SYNC26!=='undefined'&&SYNC26.realAhead(pend.profile,o)&&SYNC26.realAhead(o,pend.profile)){
      applyCanon(o,d.rev||o._rev||1);
      document.getElementById('auth12').remove();
      G.playLocked=false;
      mountLogout();
      noteKept();
      return;
    }
    if(pend&&o&&typeof SYNC26!=='undefined'&&!SYNC26.realAhead(pend.profile,o))dropPending(net.uid);
    const parked=o?parkUnsent(o):false;
    if(o)applyCanon(o,d.rev||o._rev||1);
    document.getElementById('auth12').remove();
    G.playLocked=false;
    mountLogout();
    if(parked)noteKept();
    return;
  }
  let existing=null,profile=null;
  for(;;){
    show('choose');
    const choice=await Promise.race([
      waitClick('a12import').then(function(){return 'import';}),
      waitClick('a12fresh').then(function(){return 'fresh';})
    ]);
    show('load');
    const held=readPending(net.uid);
    profile=choice==='import'?JSON.parse(JSON.stringify(held&&held.profile?held.profile:P)):blankCharacter();
    try{existing=await createIfAbsent(net,profile);break;}
    catch(e){importFailed('The character was not created. Nothing on this device was replaced.');}
  }
  if(existing&&existing.data){
    applyCanon(JSON.parse(existing.data),existing.rev||1);
    msg('This account already has a character. The one on this device was not uploaded.');
  }else{
    P.fullEpoch=whole(profile.fullEpoch);P.mapEpoch=whole(profile.mapEpoch);
    try{const team=(typeof NET!=='undefined'&&NET.team)||net.team||'';localStorage.setItem('wl_fullEpoch_'+team,String(P.fullEpoch));localStorage.setItem('wl_mapEpoch_'+team,String(P.mapEpoch));}catch(e){}
    applyCanon(profile,1);
  }
  document.getElementById('auth12').remove();
  G.playLocked=false;
  mountLogout();
};
window.auth12SignOut=async function(){
  const uid=typeof NET!=='undefined'&&NET.uid;
  if(window.__emailAuth&&uid&&(P._userEdit|0)!==(P._userBase|0)&&typeof cloudSave==='function'){
    let timer=null;
    try{await Promise.race([cloudSave(true),new Promise(function(_,rej){timer=setTimeout(function(){rej(new Error('timeout'));},4000);})]);}catch(e){}
    finally{clearTimeout(timer);}
  }
  const dirty=window.__emailAuth&&(P._userEdit|0)!==(P._userBase|0);
  if(uid&&dirty){try{writePending(uid,JSON.parse(JSON.stringify(P)),P._ackedRev|0);}catch(e){}}
  else if(uid&&acked())dropPending(uid);
  G.playLocked=true;
  try{localStorage.removeItem('wl_p');localStorage.removeItem('wl_p_unsaved');}catch(e){}
  try{if(NET.authMod&&NET.auth)await NET.authMod.signOut(NET.auth);}catch(e){}
  location.reload();
};
function lock(fn){return function(){if(G.playLocked){try{toast('Sign in before playing.');}catch(e){}return;}return fn.apply(this,arguments);};}
try{if(typeof pay==='function')pay=lock(pay);}catch(e){}
try{if(typeof claimTile==='function')claimTile=lock(claimTile);}catch(e){}
try{if(typeof sendMarch==='function')sendMarch=lock(sendMarch);}catch(e){}
try{if(typeof shClaimArea==='function'){const _sh=shClaimArea;shClaimArea=function(){if(G.playLocked)return 0;return _sh.apply(this,arguments);};}}catch(e){}
try{if(typeof catchUpAI==='function'){const _c=catchUpAI;catchUpAI=function(){if(G.playLocked)return;return _c.apply(this,arguments);};}}catch(e){}
try{window.acctLogout=function(){return window.auth12SignOut();};}catch(e){}
try{window.acctBlock=function(){const em=String(NET.email||'').replace(/[<>&]/g,'');const name=String(P.name||'').replace(/[<>&]/g,'');return '<h3>Account</h3><p class="tiny">Signed in as <b>'+em+'</b>. This character is <b>'+name+'</b>.</p><div class="seg"><button type="button" onclick="auth12SignOut()">Log out</button></div>';};}catch(e){}
try{if(typeof SYNC26!=='undefined'&&SYNC26.notePlay){const _np=SYNC26.notePlay;let autoT=null;SYNC26.notePlay=function(p){_np(p);if(p===P&&window.__emailAuth&&!G.playLocked){clearTimeout(autoT);autoT=setTimeout(function(){try{cloudSave(true);}catch(e){}},800);}};}}catch(e){}
if(location.hostname==='localhost'||location.hostname==='127.0.0.1'){
  window.auth12PendingKey=pendingKey;
  window.auth12Debug=function(){return {locked:!!(typeof G!=='undefined'&&G.playLocked),uid:typeof NET!=='undefined'&&NET.uid,email:typeof NET!=='undefined'&&NET.email,name:typeof P!=='undefined'&&P.name,scrap:typeof P!=='undefined'&&P.res&&P.res.scrap,food:typeof P!=='undefined'&&P.res&&P.res.food,parts:typeof P!=='undefined'&&P.res&&P.res.parts,out:typeof P!=='undefined'&&P.world&&P.world.outposts?Object.keys(P.world.outposts):[],towers:typeof P!=='undefined'&&P.world&&P.world.towers?Object.keys(P.world.towers):[],home:typeof P!=='undefined'&&P.troops&&P.troops.home,xp:typeof P!=='undefined'&&P.xp,hp:typeof P!=='undefined'&&P.hp,tile:typeof P!=='undefined'&&P.tiles&&!!P.tiles.b,pipe:typeof P!=='undefined'&&P.pipeUnlock26&&P.pipeUnlock26.site,gear:typeof P!=='undefined'&&P.equip&&P.equip.body,kills:typeof P!=='undefined'&&P.stats&&P.stats.kills,report:typeof CS!=='undefined'&&CS.report,why:typeof CS!=='undefined'&&CS.why,saved:localStorage.getItem('wl_p')!=null,logout:!!document.getElementById('a12out')};};
  window.auth12Mark=function(){P.world.outposts={H:{state:'up',hpPct:1}};P.res.scrap-=300;P.tiles.b={t:1};P.troops.home=880;P.xp=40;P.hp=77;if(P.equip)P.equip.body='vest';SYNC26.notePlay(P);};
  window.auth12Tower=function(){P.world.towers={T:{state:'up'}};P.res.food-=40;SYNC26.notePlay(P);};
}
document.addEventListener('DOMContentLoaded',mountLogout);
})();
