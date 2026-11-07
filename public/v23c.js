// v23c (TEST) Accounts: same player on every device. Email + password (free Firebase Auth).
// "Save my login" links the email to THIS device's player (linkWithCredential keeps the same player id, so nothing is lost).
// "Log in" on another device signs into that account; the game reloads and pulls the cloud save for it.
function acctErr(e){const c=(e&&e.code)||'';return /operation-not-allowed|PASSWORD_LOGIN_DISABLED/i.test(c+(e&&e.message))?'Email login is not switched on for the game yet (Firebase console → Authentication → Sign-in method → Email/Password → Enable).':
  /email-already-in-use|credential-already-in-use/.test(c)?'That email already has a player. Use "Log in" instead.':/wrong-password|invalid-credential|invalid-login/.test(c)?'Wrong email or password.':/user-not-found/.test(c)?'No account with that email yet.':/weak-password/.test(c)?'Password needs 6+ characters.':/invalid-email/.test(c)?'That email looks wrong.':(e&&e.message)||String(e);}
async function acctLink(email,pw){try{if(NET.mode!=='firebase')return toast('Offline demo: no accounts');const A=NET.authMod,u=NET.auth.currentUser;if(!u.isAnonymous)return toast('Already saved as '+u.email);
  await A.linkWithCredential(u,A.EmailAuthProvider.credential(email.trim(),pw));NET.isAnon=false;NET.email=email.trim();try{await cloudSave(true);}catch(e){}toast('🔐 Login saved. Use it on your other devices.');UI.profile&&UI.profile();return true;}catch(e){toast('⚠️ '+acctErr(e));return false;}}
async function acctLogin(email,pw){try{if(NET.mode!=='firebase')return toast('Offline demo: no accounts');const A=NET.authMod;if(!confirm('Log in to that account on this device? This device\'s current player stays saved in the cloud under its old restore code.'))return;
  try{await cloudSave(true);}catch(e){}const c=await A.signInWithEmailAndPassword(NET.auth,email.trim(),pw);localStorage.setItem('wl_acct_switch',c.user.uid);toast('🔐 Logged in. Loading your player…');setTimeout(()=>location.reload(),600);return true;}catch(e){toast('⚠️ '+acctErr(e));return false;}}
async function acctLogout(){try{if(!confirm('Log out on this device? You can log back in any time.'))return;await NET.authMod.signOut(NET.auth);localStorage.removeItem('wl_p');location.reload();}catch(e){toast(acctErr(e));}}
window.acctLink=acctLink;window.acctLogin=acctLogin;window.acctLogout=acctLogout;
function acctBlock(){const anon=NET.isAnon!==false,em=NET.email||'';
  return`<h3>🔐 Login (same player on every device)</h3>${anon?`<p class="tiny">This device plays as a guest. Save a login so your phone and computer are the same player.</p>
   <input id="acEm" type="email" placeholder="email" autocomplete="username"><input id="acPw" type="password" placeholder="password (6+)" autocomplete="current-password">
   <div class="seg"><button onclick="acctLink($('#acEm').value,$('#acPw').value)">💾 Save my login (keep this player)</button><button onclick="acctLogin($('#acEm').value,$('#acPw').value)">🔑 Log in (load my player)</button></div>`
   :`<p class="tiny">Logged in as <b>${em.replace(/[<>&]/g,'')}</b>. Use the same email on any device.</p><div class="seg"><button onclick="acctLogout()">Log out</button></div>`}<p class="tiny">Player id ends in …${(P.uid||'').slice(-6)}</p>`;}
window.acctBlock=acctBlock;
const _prof23c=UI.profile;UI.profile=function(){_prof23c.apply(this,arguments);try{const b=document.querySelector('#modalBody');b&&b.insertAdjacentHTML('beforeend',acctBlock());}catch(e){}};
// after switching accounts: force the cloud save of the new player to win over this device's local copy
(function(){const sw=localStorage.getItem('wl_acct_switch');if(!sw)return;const t=setInterval(async()=>{try{if(!NET.uid)return;clearInterval(t);localStorage.removeItem('wl_acct_switch');if(NET.uid!==sw)return;
  const d=await NET.loadProfile(sw);if(d&&d.data){const o=JSON.parse(d.data);if(profileValid(o)&&(o.uid===sw||!o.uid)&&(P.uid!==sw||(o.lvl||0)>(P.lvl||0)||Object.keys(o.tiles||{}).length>Object.keys(P.tiles||{}).length)){P.tiles={};adoptProfile(o,'Logged in');P.uid=sw;save();location.reload();}}}catch(e){console.warn('acct switch',e);}},1000);})();
