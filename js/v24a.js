// v24a (TEST) Name + PIN: type your player name (+ optional 4-digit PIN) on any device to load the same player.
// No email, no real logins. Anonymous auth stays under the hood (one hidden id per device). A small account record per
// name lives in this team's meta/alliance doc (already writable, no rules change): {name, salt, hash of PIN, uids:[device ids]}.
// Every device of the player lists the others as aliases, so hexes, buildings and the roster count as ONE player.
const ACCT24={field:'acct24'};
function acctKey(n){return String(n||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,24);}
async function pinHash(pin,salt,k){const b=new TextEncoder().encode(salt+':'+k+':'+pin);const h=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function pinOk(p){return p===''||/^\d{4}$/.test(p);}
async function acctGet(k){if(NET.mode!=='firebase'){const a=JSON.parse(localStorage.getItem('wl_acct24')||'{}');return a[k]||null;}
  const fs=NET.fs,d=await fs.getDoc(fs.doc(NET.db,...NET.base,'meta','alliance'));return ((d.exists()?d.data():{})[ACCT24.field]||{})[k]||null;}
async function acctPut(k,a){if(NET.mode!=='firebase'){const all=JSON.parse(localStorage.getItem('wl_acct24')||'{}');all[k]=a;localStorage.setItem('wl_acct24',JSON.stringify(all));return;}
  const fs=NET.fs,ref=fs.doc(NET.db,...NET.base,'meta','alliance');
  await fs.runTransaction(NET.db,async tx=>{const d=await tx.get(ref);const prev=d.exists()?d.data():{};const map=Object.assign({},(prev&&prev[ACCT24.field])||{});map[k]=a;tx.set(ref,{[ACCT24.field]:map},{merge:true});});}
function rosterNameClash(k){for(const [uid,m] of Object.entries((G.al&&G.al.members)||{}))if(!isMe(uid)&&acctKey(m.name)===k)return m;return null;}
// Set or change the PIN for the player on THIS device (keeps all progress). Also claims the name.
async function pinSet(pin){pin=String(pin||'').trim();if(!pinOk(pin))return {err:'PIN must be 4 digits (or empty for no PIN).'};const k=acctKey(P.name);if(!k)return {err:'Set a player name first.'};
  const a=await acctGet(k),me=NET.uid||P.uid;
  if(a&&!(a.uids||[]).includes(me))return {err:`The name "${a.name}" is already taken by another player. Change your name in the profile first.`};
  if(!a){const c=rosterNameClash(k);if(c)return {err:`Another player in this crew is already called "${c.name}". Pick a different name.`};}
  const salt=(a&&a.s)||Math.random().toString(36).slice(2,10),rec={name:P.name,s:salt,h:pin?await pinHash(pin,salt,k):null,uids:[...new Set([...((a&&a.uids)||[]),me])].slice(-6),t:Date.now()};
  await acctPut(k,rec);P.acct=k;P.alias=rec.uids.filter(u=>u!==me);save();try{pushMember();}catch(e){}return {ok:true,pin:!!pin};}
// A brand-new device has no progress of its own. Copy the cloud profile as-is.
// Merging it with the blank starter would treat that blank as a local spend.
function installLoadedSave(doc){
  let o=null;try{o=JSON.parse(doc.data);}catch(e){return false;}
  if(typeof profileValid==='function'&&!profileValid(o))return false;
  if(!o||!o.name||!o.res)return false;
  const uid=NET.uid||P.uid,acct=P.acct,alias=P.alias?P.alias.slice():[];
  const rev=Math.max(doc.rev||0,o._rev||0);
  const next=Object.assign(typeof P_DEFAULT==='function'?P_DEFAULT():{},o);
  next.uid=uid;next.acct=acct||o.acct||null;next.alias=alias;next._rev=rev;
  if(!next._savedAt)next._savedAt=doc.savedAt||0;
  for(const k of Object.keys(P))delete P[k];
  Object.assign(P,next);
  try{G._syncWrite=true;save();}finally{G._syncWrite=false;}
  return true;
}
// Log in on this device as an existing name. A fresh device reads the cloud
// revision and does not write. A failed read does not become a new player.
async function pinLogin(name,pin){pin=String(pin||'').trim();const k=acctKey(name);if(!k)return {err:'Type your player name.'};if(!pinOk(pin))return {err:'PIN must be 4 digits.'};
  const a=await acctGet(k),me=NET.uid||P.uid;
  if(!a){const c=rosterNameClash(k);if(c)return {err:`"${c.name}" is an existing player who has not set a PIN yet. On their first device open Profile → Name & PIN and save, then log in here.`,code:'nopin'};return {err:`No player called "${name}" yet. Use "Start new player" to take that name.`,code:'none'};}
  if(a.h&&(!pin||await pinHash(pin,a.s,k)!==a.h))return {err:pin?`Wrong PIN for "${a.name}".`:`"${a.name}" has a PIN. Enter it to log in.`,code:'pin'};
  const uids=[...new Set([...(a.uids||[]),me])].slice(-6);await acctPut(k,{...a,uids,t:Date.now()});
  P.acct=k;P.alias=uids.filter(u=>u!==me);const best=await newestSave(uids.filter(u=>u!==me));
  if(!best||!best.data)return {err:'This name is on the crew, but its cloud save did not load. This device did not start a new player.',code:'nosave'};
  const fresh=!!(G.cloudLogin&&G.cloudLogin.pending);
  if(fresh){if(!installLoadedSave(best))return {err:'That cloud save could not be read. This device did not start a new player.',code:'bad'};}
  else{let o=null;try{o=JSON.parse(best.data);}catch(e){o=null;}
    if(typeof profileValid!=='function'||!profileValid(o))return {err:'That cloud save could not be read.',code:'bad'};
    const rev=Math.max(best.rev||0,o._rev||0);
    P.tiles={};adoptProfile(Object.assign({},o,{acct:k,alias:P.alias,_rev:rev}),'Logged in as '+a.name);P.uid=me;P.acct=k;P.alias=uids.filter(u=>u!==me);if((P._rev||0)<rev)P._rev=rev;save();}
  sessionStorage.setItem('wl_acct24_done','1');return {ok:true,name:a.name,rev:P._rev||0};}
async function newestSave(uids){let best=null;for(const u of uids){try{const d=await NET.loadProfile(u);if(!d||!d.data)continue;let o=null;try{o=JSON.parse(d.data);}catch(e){continue;}
  if(typeof profileValid==='function'&&!profileValid(o))continue;
  const rev=(d.rev||o._rev||0)|0,t=d.serverT&&d.serverT.toMillis?d.serverT.toMillis():(d.savedAt||o._savedAt||d.t||0);
  const cand=Object.assign({},d,{uid:u,t:t,rev:rev,o:o});
  if(!best||cand.rev>best.rev||(cand.rev===best.rev&&cand.t>best.t))best=cand;}catch(e){}}return best;}
// On start: refresh aliases; if another device of mine saved more recently, take that copy (keeps this device's hidden id).
async function acctSync(){if(!P.acct||NET.mode!=='firebase'||sessionStorage.getItem('wl_acct24_sync'))return;sessionStorage.setItem('wl_acct24_sync','1');
  try{const a=await acctGet(P.acct),me=NET.uid;if(!a)return;if(!(a.uids||[]).includes(me)){P.acct=null;P.alias=[];save();return;}P.alias=a.uids.filter(u=>u!==me);save();
    const best=await newestSave(a.uids),mine=best&&best.uid===me;if(best&&!mine){const own=await NET.loadProfile(me),ot=own&&own.serverT&&own.serverT.toMillis?own.serverT.toMillis():0;
      if(best.t>ot+5000){const o=JSON.parse(best.data);if(profileValid(o)){P.tiles={};const al=P.alias,ac=P.acct;adoptProfile(o,'Synced from your other device');P.uid=me;P.alias=al;P.acct=ac;save();location.reload();}}}}catch(e){console.warn('acctSync',e);}}
window.pinSet=pinSet;window.pinLogin=pinLogin;window.acctKey=acctKey;window.pinHash=pinHash;
HOOK.member(function(m){try{if(P.alias&&P.alias.length)m.alias=P.alias.slice(0,6);if(P.acct)m.acct=P.acct;}catch(e){}return m;});
// ---- UI: onboarding gets a PIN box + "Log in" button; profile card gets Name & PIN.
function pinModal(msg,name){UI.modal(`<h2>🔑 Log in with your name</h2>${msg?`<p class="err24">${msg}</p>`:''}<input id="pl24n" placeholder="Player name" maxlength="16" value="${String(name||'').replace(/"/g,'')}"><input id="pl24p" inputmode="numeric" pattern="\\d*" maxlength="4" placeholder="PIN (if you set one)">
  <div class="seg"><button class="primary" onclick="pinLoginUI()">Log in</button><button onclick="UI.closeModal()">Cancel</button></div><p class="tiny">Same name + PIN on any phone or computer = the same player.</p>`);}
async function pinLoginUI(){const n=$('#pl24n').value,p=$('#pl24p').value;const r=await pinLogin(n,p);if(r.err)return pinModal(r.err,n);toast('🔑 Welcome back, '+r.name);setTimeout(()=>location.reload(),500);}
window.pinModal=pinModal;window.pinLoginUI=pinLoginUI;
function loginHold(on){
  let el=document.getElementById('loginHold');
  if(on){
    if(!el){el=document.createElement('div');el.id='loginHold';el.style.cssText='position:fixed;inset:0;z-index:5000;background:#140e08;color:#f4e2c4;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font:16px system-ui';document.body.appendChild(el);}
    el.style.display='flex';el.textContent='';
    const box=document.createElement('div');const b=document.createElement('b');b.textContent='Looking up this name';
    const p=document.createElement('p');p.textContent='The cloud save has not loaded yet. This device has not started a new player, and it will not save over one.';
    box.appendChild(b);box.appendChild(p);el.appendChild(box);
  }else if(el)el.style.display='none';
}
function loginFail(msg){
  if(!G.cloudLogin)G.cloudLogin={};
  G.cloudLogin.pending=true;G.cloudLogin.failed=true;
  let el=document.getElementById('loginHold');
  if(!el){loginHold(true);el=document.getElementById('loginHold');}
  el.style.display='flex';el.textContent='';
  const box=document.createElement('div');const b=document.createElement('b');b.textContent='Cloud save did not load';
  const p=document.createElement('p');p.textContent=String(msg||'This device did not start a new player.');
  box.appendChild(b);box.appendChild(p);el.appendChild(box);
}
function loginOpened(r){
  if(G.cloudLogin){G.cloudLogin.pending=false;G.cloudLogin.loaded=true;G.cloudLogin.resolving=false;}
  loginHold(false);
  try{UI.hud();}catch(e){}
  try{if(typeof troopHint==='function')troopHint();}catch(e){}
  toast('Loaded '+r.name+' · cloud save '+(P._rev||0));
}
(function(){const ob=document.querySelector('#obTeam');if(ob&&!document.querySelector('#obPin')){ob.insertAdjacentHTML('afterend','<input id="obPin" inputmode="numeric" pattern="\\d*" maxlength="4" placeholder="PIN, 4 digits (recommended)"><p class="tiny">Already playing on another device? Type the same name and PIN to load your player.</p>');}
  const go=document.querySelector('#obGo');if(go){const h=go.onclick;go.onclick=function(){const p=($('#obPin')&&$('#obPin').value||'').trim();if(!pinOk(p)){$('#obPin').focus();return toast('PIN must be 4 digits, or leave it empty');}
    const n=($('#obName').value||'').trim();localStorage.setItem('wl_ob24',JSON.stringify({n:n,p:p}));
    G.cloudLogin={pending:true,failed:false,loaded:false,name:n};
    loginHold(true);return h&&h.apply(this,arguments);};}})();
// After auth: an existing name loads the cloud revision and does not write.
// A brand-new name is started only after the account read succeeds and the
// name is absent. A refused read, a quota error, or a wait for sign-in does
// not count as "no such player" and does not start the zeroed kit.
(function(){
  if(NET&&NET.onAlliance){const prev=NET.onAlliance.bind(NET);NET.onAlliance=function(f){return prev(function(a){try{G.allianceSeen=true;}catch(e){}return f(a);});};}
  const t=setInterval(async()=>{
    if(!NET||!NET.uid||!P.uid)return;
    if(G.cloudLogin&&G.cloudLogin.resolving)return;
    const ob=localStorage.getItem('wl_ob24');
    if(!ob){clearInterval(t);try{acctSync();}catch(e){}return;}
    let n,p;try{const parsed=JSON.parse(ob);n=parsed.n;p=parsed.p;}catch(e){localStorage.removeItem('wl_ob24');loginFail('The name on this screen could not be read.');clearInterval(t);return;}
    if(G.cloudLogin)G.cloudLogin.resolving=true;
    let a=null,lookup='error';
    try{a=await acctGet(acctKey(n));lookup=a?'found':'absent';}catch(e){lookup='error';}
    if(G.cloudLogin)G.cloudLogin.lookup=lookup;
    if(lookup!=='found'&&lookup!=='absent'){if(G.cloudLogin)G.cloudLogin.resolving=false;loginFail('The crew list did not answer. This device did not start a new player.');clearInterval(t);return;}
    if(lookup==='found'){
      localStorage.removeItem('wl_ob24');
      let r;try{r=await pinLogin(n,p);}catch(e){r={err:'The cloud save could not be read. This device did not start a new player.'};}
      if(r&&r.ok)loginOpened(r);
      else loginFail((r&&r.err)||'Cloud save did not load. This device did not start a new player.');
      clearInterval(t);return;
    }
    if(NET.mode==='firebase'&&!G.allianceSeen){if(G.cloudLogin)G.cloudLogin.resolving=false;return;}
    localStorage.removeItem('wl_ob24');
    const c=rosterNameClash(acctKey(n));
    if(c){loginFail('"'+c.name+'" is already in this crew. This device did not start a new player.');clearInterval(t);return;}
    let r;try{r=await pinSet(p);}catch(e){loginFail('The crew list did not answer. This device did not start a new player.');clearInterval(t);return;}
    if(r&&r.err){loginFail(r.err);clearInterval(t);return;}
    if(G.cloudLogin){G.cloudLogin.pending=false;G.cloudLogin.resolving=false;}
    loginHold(false);
    toast(p?'🔑 Name + PIN saved':'Name saved. Add a PIN in your Profile so nobody else can load you.');
    clearInterval(t);
  },700);
})();
function pinBlock(){const k=P.acct;return`<h3>🔑 Name &amp; PIN (same player on every device)</h3>
  <p class="tiny">${k?`Your name <b>${String(P.name).replace(/[<>&]/g,'')}</b> is saved${(P.alias||[]).length?` · linked devices: ${P.alias.length+1}`:''}.`:'Set a PIN so you can load this player on your phone and computer.'}</p>
  <input id="pin24" inputmode="numeric" pattern="\\d*" maxlength="4" placeholder="${k?'New 4-digit PIN':'4-digit PIN (recommended)'}">
  <div class="seg"><button onclick="pinSet($('#pin24').value).then(r=>{toast(r.err?'⚠️ '+r.err:r.pin?'🔑 PIN saved. Use your name + PIN on other devices.':'Saved without a PIN');UI.profile&&UI.profile();})">💾 ${k?'Change PIN':'Save name + PIN'}</button><button onclick="pinModal('',P.name)">🔄 Log in as another player</button></div>`;}
window.pinBlock=pinBlock;
const _prof24=UI.profile;UI.profile=function(){_prof24.apply(this,arguments);try{const b=document.querySelector('#modalBody');b&&!b.querySelector('#pin24')&&b.insertAdjacentHTML('beforeend',pinBlock());}catch(e){}};
