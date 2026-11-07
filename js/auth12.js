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
  el.innerHTML='<div style="width:min(420px,92vw);background:#241910;padding:22px;border-radius:14px"><form id="a12form"><h1 style="font-size:22px;margin:0 0 8px">Sign in</h1><p id="a12msg" style="min-height:2.4em;color:#ffb4a2"></p><label>Email<br><input id="a12email" type="email" autocomplete="username" required style="width:100%;margin:4px 0 10px;padding:8px"></label><label>Password<br><input id="a12pass" type="password" autocomplete="current-password" minlength="6" required style="width:100%;margin:4px 0 10px;padding:8px"></label><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="a12in" type="submit">Sign in</button><button id="a12up" type="button">Create account</button><button id="a12reset" type="button">Email a password reset</button></div></form><p id="a12spin" hidden>Loading your character…</p><div id="a12choose" hidden><p>This account has no character on this team yet.</p><button id="a12import" type="button">Import the character on this device</button><button id="a12fresh" type="button">Start a new character</button></div></div>';
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
    if(!serverObj||typeof SYNC26==='undefined'||!SYNC26.realAhead||!SYNC26.realAhead(P,serverObj))return false;
    localStorage.setItem('wl_p_unsaved',JSON.stringify(P));
    return true;
  }catch(e){return false;}
}
function noteParked(){
  if(document.getElementById('a12parked'))return;
  const n=document.createElement('div');
  n.id='a12parked';
  n.style.cssText='position:fixed;left:8px;right:8px;bottom:48px;z-index:3500;background:#3a2418;color:#f3e6d0;padding:10px;border-radius:8px';
  n.textContent='The account character is loaded. A change that was only on this device was not uploaded.';
  document.body.appendChild(n);
  if(typeof CS!=='undefined'){CS.report=n.textContent;CS.status=CS.report;}
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
async function createIfAbsent(net,profile){
  const fs=net.fs,ref=fs.doc(net.col('saves'),net.uid);
  profile._rev=1;profile._ackedRev=1;profile._handoff=1;profile._userEdit=0;profile._userBase=0;profile.uid=net.uid;
  let existing=null;
  await fs.runTransaction(net.db,async function(tx){
    const s=await tx.get(ref);
    if(s.exists()){existing=s.data();return;}
    tx.set(ref,{data:JSON.stringify(profile),rev:1,savedAt:Date.now(),baseRev:0,name:profile.name||'',lvl:profile.lvl||1,v:3,fe:profile.fullEpoch||0});
  });
  return existing;
}
window.auth12Canonical=async function(net){
  show('load');
  let d=null;
  try{d=await net.loadProfile(net.uid);}catch(e){msg('Could not load the character. Nothing was replaced.');throw e;}
  if(d&&d.data){
    let o;try{o=JSON.parse(d.data);}catch(e){o=null;}
    const parked=o?parkUnsent(o):false;
    if(o)applyCanon(o,d.rev||o._rev||1);
    document.getElementById('auth12').remove();
    G.playLocked=false;
    if(parked)noteParked();
    return;
  }
  show('choose');
  const choice=await Promise.race([
    waitClick('a12import').then(function(){return 'import';}),
    waitClick('a12fresh').then(function(){return 'fresh';})
  ]);
  show('load');
  const profile=choice==='import'?JSON.parse(JSON.stringify(P)):blankCharacter();
  let existing=null;
  try{existing=await createIfAbsent(net,profile);}catch(e){msg('The character was not created. Nothing on the account was replaced.');throw e;}
  if(existing&&existing.data){
    applyCanon(JSON.parse(existing.data),existing.rev||1);
    msg('This account already has a character. The one on this device was not uploaded.');
  }else applyCanon(profile,1);
  document.getElementById('auth12').remove();
  G.playLocked=false;
};
window.auth12SignOut=async function(){
  if(window.__emailAuth&&(P._userEdit|0)!==(P._userBase|0)){
    if(!confirm('A change on this device is not confirmed on the account yet. Sign out without sending it?'))return;
  }
  G.playLocked=true;
  try{if(NET.authMod&&NET.auth)await NET.authMod.signOut(NET.auth);}catch(e){}
  try{localStorage.removeItem('wl_p');localStorage.removeItem('wl_p_unsaved');}catch(e){}
  location.reload();
};
function lock(fn){return function(){if(G.playLocked){try{toast('Sign in before playing.');}catch(e){}return;}return fn.apply(this,arguments);};}
try{if(typeof pay==='function')pay=lock(pay);}catch(e){}
try{if(typeof claimTile==='function')claimTile=lock(claimTile);}catch(e){}
try{if(typeof sendMarch==='function')sendMarch=lock(sendMarch);}catch(e){}
try{if(typeof shClaimArea==='function'){const _sh=shClaimArea;shClaimArea=function(){if(G.playLocked)return 0;return _sh.apply(this,arguments);};}}catch(e){}
try{if(typeof catchUpAI==='function'){const _c=catchUpAI;catchUpAI=function(){if(G.playLocked)return;return _c.apply(this,arguments);};}}catch(e){}
if(location.hostname==='localhost'||location.hostname==='127.0.0.1'){
  window.auth12Debug=function(){return {locked:!!(typeof G!=='undefined'&&G.playLocked),uid:typeof NET!=='undefined'&&NET.uid,email:typeof NET!=='undefined'&&NET.email,scrap:typeof P!=='undefined'&&P.res&&P.res.scrap,food:typeof P!=='undefined'&&P.res&&P.res.food,out:typeof P!=='undefined'&&P.world&&P.world.outposts?Object.keys(P.world.outposts):[],towers:typeof P!=='undefined'&&P.world&&P.world.towers?Object.keys(P.world.towers):[],home:typeof P!=='undefined'&&P.troops&&P.troops.home,xp:typeof P!=='undefined'&&P.xp,tile:typeof P!=='undefined'&&P.tiles&&!!P.tiles.b,pipe:typeof P!=='undefined'&&P.pipeUnlock26&&P.pipeUnlock26.site,report:typeof CS!=='undefined'&&CS.report,saved:localStorage.getItem('wl_p')!=null};};
  window.auth12Mark=function(){P.world.outposts={H:{state:'up',hpPct:1}};P.res.scrap-=300;P.tiles.b={t:1};P.troops.home=880;P.xp=40;SYNC26.notePlay(P);};
  window.auth12Tower=function(){P.world.towers={T:{state:'up'}};P.res.food-=40;SYNC26.notePlay(P);};
}
document.addEventListener('DOMContentLoaded',function(){
  if(!document.getElementById('a12out')){
    const b=document.createElement('button');
    b.id='a12out';b.type='button';b.textContent='Sign out';
    b.style.cssText='position:fixed;right:8px;bottom:8px;z-index:3500';
    b.onclick=function(){window.auth12SignOut();};
    document.body.appendChild(b);
  }
});
})();
