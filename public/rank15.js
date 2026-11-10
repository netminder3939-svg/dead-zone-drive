// rank15 (TEST, build 12i) Alliance ranks, clan titles, Alliance HQ data, and bank withdrawals that need approval.
//  * One doc teams/{team}/meta/hq: {hq:{hex,lat,lng,name,by,byName,t}, roles:{uid:'leader'|'officer'}, titles:{uid:text}}.
//    The first member to claim leadership creates it. The rules (preview-auth-rules-12i) enforce who can change what:
//    leader = ranks, titles, HQ, hand over leadership; officer = titles + HQ; member = nothing.
//    An officer can take over a leader who has been inactive 14+ days.
//  * Bank: leader and officers withdraw directly. Members send a request (bankReq/{id}); a leader or officer approves or
//    denies it; the member's phone then collects it in one transaction (bank -amt, request paid). Rules check all of it.
//    Until someone claims leadership the bank stays open (old behaviour), so nothing breaks on teams without a leader yet.
//  * Research spends the bank, so it is leader/officer only once ranks exist.
(function(){
  const RANKS15={leader:{ico:'👑',n:'Leader'},officer:{ico:'⭐',n:'Officer'},member:{ico:'',n:'Member'}};
  const TAKEOVER_DAYS15=14,TITLE_MAX15=24;
  window.RANKS15=RANKS15;
  G.hq15=null; // {exists, hq, roles, titles}
  G.bankReq15={};
  const fire=()=>typeof NET!=='undefined'&&NET.mode==='firebase'&&!!NET.fs;
  const LK=()=> 'wl_hq15_'+((typeof NET!=='undefined'&&NET.team)||'local');
  const RK=()=> 'wl_bankreq15_'+((typeof NET!=='undefined'&&NET.team)||'local');
  const lget=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}};
  const lset=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
  const esc=s=>String(s==null?'':s).replace(/[&<>"'`]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
  window.esc15=esc;
  function clean15(s){return String(s||'').replace(/[<>&"'`]/g,'').replace(/\s+/g,' ').trim().slice(0,TITLE_MAX15);}
  window.clean15=clean15;

  // ---------- state ----------
  function hqState(d){const x=d||{};G.hq15={exists:!!d,hq:x.hq||null,roles:x.roles||{},titles:x.titles||{},leader:x.leader||null,bld:x.bld||null}; // R6: bld = the HQ building (hq6.js)
    try{if(typeof onHq15==='function')onHq15();}catch(e){}try{if(UI.tab==='alliance')UI.render();}catch(e){}try{drawHq15();}catch(e){}}
  // R1: ranks, titles and bank requests are keyed by the signed-in account (the id the security rules check and the id
  //  member docs use). An imported character can carry an older id in P.uid, which made the rules refuse leadership.
  function me15(){try{if(NET.mode==='firebase'&&NET.uid)return NET.uid;}catch(e){}return P.uid;}
  window.me15=me15;
  function err15(e){const m=String((e&&e.message)||e||'');return /insufficient permissions|permission-denied/i.test(m)?'The server refused this change. Only the leader or an officer can do that.':m;}
  function rankOf15(uid){const r=G.hq15&&G.hq15.roles||{};return r[uid]||'member';}
  function myRank15(){return me15()?rankOf15(me15()):'member';}
  function isOfficer15(uid){const r=uid?rankOf15(uid):myRank15();return r==='leader'||r==='officer';}
  function ranksOn15(){return !!(G.hq15&&G.hq15.exists);}
  function titleOf15(uid){return (G.hq15&&G.hq15.titles||{})[uid]||'';}
  function leaderUid15(){if(G.hq15&&G.hq15.leader)return G.hq15.leader;const r=G.hq15&&G.hq15.roles||{};return Object.keys(r).find(u=>r[u]==='leader')||null;}
  Object.assign(window,{rankOf15,myRank15,isOfficer15,ranksOn15,titleOf15,leaderUid15});

  // ---------- feeds ----------
  function startFeeds15(){if(G._feeds15)return;if(typeof NET==='undefined'||!NET.mode)return;
    if(fire()){if(!NET.uid)return;G._feeds15=1;
      NET.share('metaHq15',()=>NET.fs.doc(NET.db,...NET.base,'meta','hq'),s=>hqState(s.exists()?s.data():null),e=>console.warn('hq15',e));
      NET.share('bankReq15',()=>NET.fs.query(NET.col('bankReq'),NET.fs.orderBy('t','desc'),NET.fs.limit(40)),s=>{const o={};s.forEach(d=>{o[d.id]={id:d.id,...d.data()};});G.bankReq15=o;onReqs15();},e=>console.warn('bankReq15',e));}
    else if(NET.mode!=='firebase'){G._feeds15=1;hqState(lget(LK()));G.bankReq15=lget(RK())||{};}} // firebase not ready yet: try again next tick
  setInterval(()=>{try{startFeeds15();}catch(e){}},1500);

  // ---------- writes ----------
  async function hqTx15(mut){
    if(fire()){const ref=NET.fs.doc(NET.db,...NET.base,'meta','hq');
      await NET.fs.runTransaction(NET.db,async tx=>{const d=await tx.get(ref);const cur=d.exists()?d.data():null;const nx=mut(cur?JSON.parse(JSON.stringify(cur)):null);if(!nx)throw new Error('No change');tx.set(ref,nx);});}
    else{const cur=lget(LK());const nx=mut(cur?JSON.parse(JSON.stringify(cur)):null);if(!nx)throw new Error('No change');lset(LK(),nx);hqState(nx);}}
  window.hqTx15=hqTx15;
  async function claimLeader15(){if(!me15())return;try{await hqTx15(cur=>{if(cur)throw new Error('This alliance already has a leader');return{leader:me15(),roles:{[me15()]:'leader'},titles:{},hq:null,v:1};});
      allianceLog(`👑 ${P.name} is now the alliance leader`);toast('👑 You are the alliance leader');}catch(e){toast('🚫 '+err15(e));}}
  const OFFICERS_MAX15=2; // R6: 2 officers max (the security rules allow 3 roles: the leader + 2)
  window.OFFICERS_MAX15=OFFICERS_MAX15;
  async function setRank15(uid,rank){if(myRank15()!=='leader')return toast('🚫 Only the leader can change ranks');
    try{await hqTx15(cur=>{if(!cur)throw new Error('No alliance HQ doc');const r={...cur.roles};
        let ld=cur.leader||me15();if(rank==='leader'){r[uid]='leader';r[me15()]='officer';ld=uid;}else if(rank==='officer'){if(r[uid]!=='officer'&&Object.values(r).filter(v=>v==='officer').length>=OFFICERS_MAX15)throw new Error(`The alliance already has ${OFFICERS_MAX15} officers. Make one a member first.`);r[uid]='officer';}else delete r[uid];
        if(r[ld]!=='leader')throw new Error('The alliance needs a leader');return{...cur,roles:r,leader:ld};});
      const nm=((G.al&&G.al.members||{})[uid]||{}).name||'A teammate';allianceLog(rank==='leader'?`👑 ${P.name} handed leadership to ${nm}`:`${rank==='officer'?'⭐':'🔻'} ${nm} is now ${RANKS15[rank]?RANKS15[rank].n:'a member'}`);UI.closeModal();}
    catch(e){toast('🚫 '+err15(e));}}
  async function setTitle15(uid,txt){if(!isOfficer15())return toast('🚫 Only the leader or officers can set titles');const t=clean15(txt);
    try{await hqTx15(cur=>{if(!cur)throw new Error('No alliance HQ doc');const ti={...(cur.titles||{})};if(t)ti[uid]=t;else delete ti[uid];return{...cur,titles:ti};});toast(t?`🏷️ Title set: ${t}`:'🏷️ Title cleared');UI.closeModal();}
    catch(e){toast('🚫 '+err15(e));}}
  async function takeOver15(){const lu=leaderUid15(),m=((G.al&&G.al.members)||{})[lu]||{};
    if(myRank15()!=='officer')return toast('🚫 Only an officer can take over');
    if(Date.now()-(m.lastActive||0)<TAKEOVER_DAYS15*864e5)return toast(`🚫 The leader was active in the last ${TAKEOVER_DAYS15} days`);
    try{await hqTx15(cur=>{const r={...cur.roles};if(lu)r[lu]='officer';r[me15()]='leader';return{...cur,roles:r,leader:me15(),takeover:lu||''};});allianceLog(`👑 ${P.name} took over as leader (the old leader was inactive ${TAKEOVER_DAYS15}+ days)`);}
    catch(e){toast('🚫 '+err15(e));}}
  Object.assign(window,{claimLeader15,setRank15,setTitle15,takeOver15});

  // ---------- bank requests ----------
  const RESK=['scrap','food','water','fuel','parts'];
  async function requestWithdraw15(res,amt,why){amt=Math.floor(Math.abs(+amt||0));if(!amt||!RESK.includes(res))return toast('Pick a resource and amount');
    const bank=(G.al&&G.al.bank)||{};if((bank[res]||0)<amt)return toast(`The Vault only has ${bank[res]||0} ${RES[res]}`);
    const d={uid:me15(),name:P.name,res,amt,why:clean15(why||'').slice(0,60),status:'pending'};
    try{if(fire()){await NET.fs.addDoc(NET.col('bankReq'),{...d,t:NET.fs.serverTimestamp()});}
      else{const o=lget(RK())||{};const id='r'+Date.now();o[id]={id,...d,t:Date.now()};lset(RK(),o);G.bankReq15=o;onReqs15();}
      allianceLog(`🙋 ${P.name} asked the Vault for ${amt} ${RES[res]}`);toast('🙋 Request sent. A leader or officer has to approve it.');}
    catch(e){toast('🚫 '+err15(e));}try{UI.render();}catch(e){}}
  async function decideReq15(id,ok){if(!isOfficer15())return toast('🚫 Only the leader or officers can approve');if(ok&&window.vaultLocked6&&vaultLocked6())return toast(`🔒 The Vault is locked for ${fmtDur(vaultLockUntil6()-Date.now())} after the HQ fell`);const r=G.bankReq15[id];if(!r||r.status!=='pending')return;
    const up={status:ok?'approved':'denied',by:me15(),byName:P.name};
    try{if(fire())await NET.fs.updateDoc(NET.fs.doc(NET.col('bankReq'),id),{...up,decT:NET.fs.serverTimestamp()});
      else{const o=lget(RK())||{};o[id]={...o[id],...up,decT:Date.now()};lset(RK(),o);G.bankReq15=o;onReqs15();}
      allianceLog(`${ok?'✅':'❌'} ${P.name} ${ok?'approved':'denied'} ${poss(r.name)} request for ${r.amt} ${RES[r.res]}`);}
    catch(e){toast('🚫 '+err15(e));}try{UI.render();}catch(e){}}
  async function cancelReq15(id){const r=G.bankReq15[id];if(!r||r.uid!==me15()||r.status!=='pending')return;
    try{if(fire())await NET.fs.updateDoc(NET.fs.doc(NET.col('bankReq'),id),{status:'cancelled'});
      else{const o=lget(RK())||{};o[id]={...o[id],status:'cancelled'};lset(RK(),o);G.bankReq15=o;onReqs15();}}catch(e){toast('🚫 '+err15(e));}try{UI.render();}catch(e){}}
  // Collect an approved request: one transaction moves it out of the bank and marks it paid; only then is it added to me.
  const busy15={};
  async function collect15(id){const r=G.bankReq15[id];if(!r||r.uid!==me15()||r.status!=='approved'||busy15[id])return;if(window.vaultLocked6&&vaultLocked6())return; // R6: waits until the Vault unlocks
    busy15[id]=1;let bal=null;
    const held=window.SYNC13&&SYNC13.hold===false;if(window.SYNC13)SYNC13.hold=true;
    try{if(fire()){        const fs=NET.fs,aRef=fs.doc(NET.db,...NET.base,'meta','alliance'),rRef=fs.doc(NET.col('bankReq'),id),lRef=fs.doc(NET.col('bankLog')),sRefOwn=fs.doc(NET.col('saves'),NET.uid||me15());
        const acked=await fs.runTransaction(NET.db,async tx=>{const a=await tx.get(aRef),q=await tx.get(rRef),sv=await tx.get(sRefOwn);const x=q.exists()?q.data():null;
          if(!x||x.status!=='approved'||x.uid!==me15())throw new Error('Request is not approved any more');
          if(NET.uid&&P.uid!==NET.uid)throw new Error('not your save');
          const cur=sv.exists()?sv.data():null;
          const guard=typeof saveGuard13==='function'&&cur?saveGuard13(cur):null;
          if(guard==='rev')throw Object.assign(new Error('save-changed'),{remote:cur});
          if(guard==='lease')throw new Error('other-playing');
          const bank={...((a.exists()&&a.data().bank)||{})};const have=bank[x.res]||0;if(have<x.amt)throw new Error(`The Vault only has ${have} ${RES[x.res]} now`);
          bank[x.res]=have-x.amt;bal=bank[x.res];
          let prof={};try{prof=JSON.parse((window.profile13&&profile13())||'{}')||{};}catch(e){prof={};}
          prof.res={...(prof.res||{})};prof.res[x.res]=(prof.res[x.res]||0)+x.amt;
          prof.contrib={...(prof.contrib||{})};prof.contrib.withdrawn=(prof.contrib.withdrawn||0)+x.amt;
          const curRev=cur?(cur.rev|0):0,rev=curRev+1;
          const lease={dev:(window.SYNC13&&SYNC13.dev)||'bank',label:'phone',t:Date.now()};
          tx.set(aRef,{bank,payReq:id},{merge:true});tx.update(rRef,{status:'paid',paidT:fs.serverTimestamp()});
          tx.set(lRef,{uid:me15(),member:P.name,res:x.res,amt:-x.amt,bal,kind:'withdraw',t:fs.serverTimestamp()});
          tx.set(sRefOwn,{data:JSON.stringify(prof),rev,baseRev:curRev,savedAt:Date.now(),name:String(P.name||'').slice(0,24),lvl:P.lvl|0,v:3,fe:P.fullEpoch||0,me:P.mapEpoch||0,lease});
          return{profile:prof,rev,lease};});
        if(acked&&typeof applySave13==='function')applySave13(acked.profile,acked.rev,acked.lease);
        else{P.res[r.res]=(P.res[r.res]||0)+r.amt;P.contrib.withdrawn=(P.contrib.withdrawn||0)+r.amt;save();}
        toast(`🏦 Collected ${r.amt} ${RES[r.res]} from the Vault${bal!=null?' · Vault now '+bal:''}`);try{UI.hud();UI.render();}catch(e){}}
      else{const o=lget(RK())||{};const x=o[id];if(!x||x.status!=='approved')throw new Error('Request is not approved any more');
        const have=(NET.bankBal?NET.bankBal(x.res):((G.al&&G.al.bank||{})[x.res]||0));if(have<x.amt)throw new Error('The Vault is short');
        if(NET.bankTx)bal=await NET.bankTx(me15(),P.name,x.res,-x.amt,true);o[id]={...x,status:'paid',paidT:Date.now()};lset(RK(),o);G.bankReq15=o;
        P.res[r.res]=(P.res[r.res]||0)+r.amt;P.contrib.withdrawn=(P.contrib.withdrawn||0)+r.amt;save();pushMember();
        toast(`🏦 Collected ${r.amt} ${RES[r.res]} from the Vault${bal!=null?' · Vault now '+bal:''}`);try{UI.hud();UI.render();}catch(e){}}}
    catch(e){if(e&&e.message==='save-changed'&&e.remote&&typeof staleSave13==='function'){try{staleSave13(e.remote);}catch(err){}toast('🏦 Nothing was paid. A newer save was loaded. Collect again to take the payout.');}
      else if(e&&e.message==='other-playing')toast('🏦 Nothing was paid. Your other device is playing. Collect there.');
      else toast('🚫 '+(e.message||e));}finally{delete busy15[id];if(held&&window.SYNC13&&!SYNC13.conflictOpen)SYNC13.hold=false;}}
  Object.assign(window,{requestWithdraw15,decideReq15,cancelReq15,collect15});
  function onReqs15(){try{for(const r of Object.values(G.bankReq15))if(r.uid===me15()&&r.status==='approved')collect15(r.id);}catch(e){}
    try{const n=Object.values(G.bankReq15).filter(r=>r.status==='pending').length;if(isOfficer15()&&n&&typeof newsAdd==='function')newsAdd('alliance','bank',`🙋 ${n} Vault request${n>1?'s':''} waiting for approval`,'bankreq15');}catch(e){}
    try{if(UI.tab==='alliance')UI.render();}catch(e){}}

  // Gate the old withdraw button: members request, leader/officers withdraw. Research is leader/officer only.
  const _btx15=bankTx;bankTx=async function(res,amt){if(G.bankMode==='withdraw'&&ranksOn15()&&!isOfficer15()){const why=($('#bkwhy15')||{}).value||'';return requestWithdraw15(res,amt,why);}return _btx15.apply(this,arguments);};
  window.bankTx=bankTx;
  try{const _rs15=NET.research.bind(NET);NET.research=async function(){if(ranksOn15()&&!isOfficer15())throw new Error('Only the leader or officers can spend the Vault on research');return _rs15.apply(NET,arguments);};}catch(e){}
  // LocalNet: the stock bankTx throws on overdraw, so a collect works the same offline.

  // ---------- UI: bank part ----------
  function bankUi15(){try{if(UI.tab!=='alliance')return;const b=$('#sheetBody');const box=b&&b.querySelector('.p-bank');if(!box||box.querySelector('.bk15'))return;
    const reqs=Object.values(G.bankReq15||{}).sort((a,c)=>(c.t&&c.t.toMillis?c.t.toMillis():c.t||0)-(a.t&&a.t.toMillis?a.t.toMillis():a.t||0));
    const mine=reqs.filter(r=>r.uid===me15()&&['pending','approved','denied'].includes(r.status)).slice(0,5),pend=reqs.filter(r=>r.status==='pending');
    let h=`<div class="bk15">`;
    if(!ranksOn15())h+=`<p class="tiny">🔓 The Vault is open to everyone until someone claims leadership in 🏛️ HQ. After that, members ask and the leader or officers approve.</p>`;
    else if(!isOfficer15()){h+=`<p class="tiny">🔒 Withdrawals need approval from the leader or an officer. Pick an amount and tap Request.</p><input id="bkwhy15" maxlength="60" placeholder="What's it for? (optional)">`;}
    else h+=`<p class="tiny">${RANKS15[myRank15()].ico} You can withdraw directly and approve members' requests.</p>`;
    const row=r=>`<div class="row"><div class="grow"><b>${esc(r.name)}</b> · ${r.amt.toLocaleString()} ${RES[r.res]||''}<small>${r.why?esc(r.why)+' · ':''}${({pending:'⏳ waiting',approved:'✅ approved, collecting…',denied:'❌ denied'+(r.byName?' by '+esc(r.byName):''),paid:'paid'})[r.status]||r.status}</small></div>`;
    if(isOfficer15()&&pend.length)h+=`<h3>🙋 Requests (${pend.length})</h3>`+pend.map(r=>row(r)+`<button onclick="decideReq15('${r.id}',true)">✅ Approve</button><button class="ghost24" onclick="decideReq15('${r.id}',false)">❌</button></div>`).join('');
    if(mine.length)h+=`<h3>Your requests</h3>`+mine.map(r=>row(r)+(r.status==='pending'?`<button class="ghost24" onclick="cancelReq15('${r.id}')">Cancel</button>`:'')+'</div>').join('');
    const go0=box.querySelector('#bkgo'),row0=go0&&go0.closest('.row');if(row0)row0.insertAdjacentHTML('afterend',h+'</div>');else box.insertAdjacentHTML('beforeend',h+'</div>');
    if(ranksOn15()&&!isOfficer15()&&G.bankMode==='withdraw'){const go=box.querySelector('#bkgo');if(go)go.textContent='Request';}}catch(e){console.warn('bk15',e);}}

  // ---------- UI: ranks + titles on the crew list and person card ----------
  function badge15(uid){const r=rankOf15(uid),t=titleOf15(uid);return (r!=='member'?`<span class="rk15 rk-${r}">${RANKS15[r].ico} ${RANKS15[r].n}</span>`:'')+(t?`<span class="tt15">🏷️ ${esc(t)}</span>`:'');}
  window.badge15=badge15;
  function badgeRows15(){try{if(UI.tab!=='alliance')return;document.querySelectorAll('#sheetBody .rp26').forEach(el=>{if(el.querySelector('.rk15,.tt15,.rkx15'))return;const m=(el.getAttribute('onclick')||'').match(/person26\('([^']+)'\)/);if(!m)return;
      const h=badge15(m[1]);const b=el.querySelector('b');if(b)b.insertAdjacentHTML('afterend',h||'<span class="rkx15"></span>');});}catch(e){}}
  // The Alliance tab assembles its sections after the normal render hooks, so these run after the whole render.
  const _r15=UI.render;UI.render=function(){const o=_r15.apply(this,arguments);bankUi15();badgeRows15();return o;};
  const _pc15=UI.person26;if(_pc15)UI.person26=function(uid){const r=_pc15.apply(this,arguments);try{const mb=$('#modalBody');if(!mb||mb.querySelector('.pc15'))return r;
    const me=isMe(uid),rk=rankOf15(uid),t=titleOf15(uid);let h=`<div class="pc15">${badge15(uid)||'<span class="tiny">Member</span>'}`;
    if(ranksOn15()&&isOfficer15())h+=`<div class="row"><input id="tt15in" maxlength="${TITLE_MAX15}" placeholder="Clan title (e.g. Road Captain)" value="${esc(t)}"><button onclick="setTitle15('${uid}',$('#tt15in').value)">🏷️ Set title</button></div>`;
    if(ranksOn15()&&myRank15()==='leader'&&!me)h+=`<div class="btns24">${rk!=='officer'?`<button onclick="setRank15('${uid}','officer')">⭐ Make officer</button>`:`<button class="ghost24" onclick="setRank15('${uid}','member')">🔻 Make member</button>`}<button class="ghost24" onclick="if(confirm15('Hand leadership to this player? You become an officer.'))setRank15('${uid}','leader')">👑 Hand over leadership</button></div>`;
    mb.insertAdjacentHTML('afterbegin',h+'</div>');}catch(e){console.warn('pc15',e);}return r;};
  // a no-dialog confirm: the game never uses browser dialogs (they block the app)
  window.confirm15=function(msg){const k='_c15_'+msg;if(G[k]&&Date.now()-G[k]<6000){delete G[k];return true;}G[k]=Date.now();toast('Tap again to confirm: '+msg);return false;};

  // ---------- styles ----------
  const st=document.createElement('style');st.textContent=`.rk15{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:8px;font-size:11px;font-weight:700;background:#3a2c08;color:#ffd24a}.rk15.rk-officer{background:#14304a;color:#8fd0ff}
  .tt15{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:8px;font-size:11px;background:#262626;color:#ddd}.pc15{margin:0 0 10px}.pc15 .row input,#bkwhy15{flex:1;min-width:0;padding:8px;border-radius:8px;border:1px solid #444;background:#151515;color:#eee}
  #bkwhy15{width:100%;margin:6px 0}.bk15 h3{margin:12px 0 6px}`;document.head.appendChild(st);
})();
