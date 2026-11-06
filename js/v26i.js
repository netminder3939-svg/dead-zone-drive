// v26i (TEST · ddd-v26-11) Two separate fixes. Not deployed.
// 1) Phone ↔ computer saves. v26e's "higher score wins" and one-shot acctSync let a stale
//    desktop upload, or refuse a drive that did not move the score by 100,000. Reports were
//    kept by list length, so one restored summary replaced a real recap of the same length.
//    Sync now merges before any upload, retries when the tab wakes up, and will not let a
//    background tab write over a newer save. A later spend or a dead troop stays gone.
//    A drive, a claim, and a real recap are not dropped just because the other device
//    saved a second later.
// 2) Claim marches. allied() was widened so a guarded pipeline counts as owned. The march
//    walked that route, skipped every hex, and came home with zero tiles and no reason.
//    Claiming uses real ownership again. Pipeline guards still count for the horde.
//    Defenders stop the march. Skipped and blocked hexes are written on the report.
(function(){
try{
if(typeof SYNC26==='undefined'){console.error('v26i: sync26 missing');return;}
const Gref=typeof G!=='undefined'?G:(window.G={});
Gref.sync26Ready=false;
Gref.marchAliasGraceMs=15000;
let memGen=0;
try{memGen=+(localStorage.getItem('wl_sync_gen')||0);}catch(e){}
let boot=null;
try{boot=JSON.parse(JSON.stringify(P));}catch(e){boot=null;}
const HEAL_MARK=['heal26c','heal26cDone','heal26cNote','heal26cDrives','heal26cParts','heal26cPipe','heal26cPipeNote'];
function healMutated(){
  if(!boot)return false;
  for(const k of HEAL_MARK){if(JSON.stringify(P[k]||null)!==JSON.stringify(boot[k]||null))return true;}
  return false;
}
function revertHeal(){
  if(!boot)return;
  P.lvl=boot.lvl;P.xp=boot.xp;P.sp=boot.sp;P.skills=boot.skills;
  P.badges=boot.badges;P.pipeUnlock26=boot.pipeUnlock26;P.dr26=boot.dr26;
  if(boot.res&&P.res&&P.heal26cParts&&!boot.heal26cParts)P.res.parts=boot.res.parts;
  for(const k of HEAL_MARK)P[k]=boot[k];
}
function scrub(){if(!Gref.sync26Ready&&typeof NET!=='undefined'&&NET.mode==='firebase'&&healMutated())revertHeal();}
function myUid(){return (typeof NET!=='undefined'&&NET.uid)||P.uid||'local';}
function snap(){try{return JSON.parse(JSON.stringify(P));}catch(e){return {};}}
function storedGen(){try{return +(localStorage.getItem('wl_sync_gen')||0);}catch(e){return memGen;}}

const rawSet=localStorage.setItem.bind(localStorage);
localStorage.setItem=function(k,v){
  if(k==='wl_p'&&!Gref._syncWrite){
    try{
      const stored=+(localStorage.getItem('wl_sync_gen')||0);
      if(stored>memGen){setTimeout(()=>{try{location.reload();}catch(e){}},0);return localStorage.getItem('wl_p');}
      scrub();
      SYNC26.recordChange(P,myUid(),Date.now());
      memGen=stored+1;
      Gref._syncWrite=true;
      rawSet('wl_sync_gen',String(memGen));
      v=JSON.stringify(P);
    }catch(e){console.warn('v26i save',e);}
    finally{Gref._syncWrite=false;}
  }
  return rawSet(k,v);
};

function forceFields(src){
  if(!src)return;
  const keepUid=P.uid,keepRev=P._rev||0,keepAcct=P.acct,keepAlias=P.alias,keepName=P.name;
  const keys=['tiles','res','troops','dr26','badges','pipeUnlock26','stats','lvl','xp','sp','skills','sync26','contrib','world','marchDone','marchPaid','claimDay','hp','inv','equip','stronghold','killed','quests','cards'];
  for(const k of keys)if(k in src)P[k]=src[k];
  P.uid=keepUid;P._rev=keepRev;P.acct=keepAcct;P.alias=keepAlias;
  if(keepName)P.name=keepName;
  if(src._savedAt)P._savedAt=src._savedAt;
}

try{const _mp=mergeProg26;mergeProg26=function(keep,o){if(Gref._sync26merged)return o;return _mp?_mp(keep,o):o;};}catch(e){}
try{
  const prevAdopt=adoptProfile;
  adoptProfile=function(o,why){
    scrub();
    const remoteUid=o&&o.uid;
    const m=SYNC26.merge(snap(),o||{},{uid:myUid(),remoteUid:remoteUid,now:Date.now()});
    Gref._sync26merged=true;
    let r;
    try{r=prevAdopt(m.profile,why);}finally{Gref._sync26merged=false;}
    forceFields(m.profile);
    try{if(typeof syncSP==='function')syncSP();}catch(e){}
    try{save();}catch(e){}
    try{showSyncNotices26();}catch(e){}
    return r;
  };
}catch(e){console.warn('v26i adopt',e);}

let syncing=null;
function needFirebase(){return typeof NET!=='undefined'&&NET.mode==='firebase'&&NET.loadProfile&&P&&(P.uid||P.acct);}
async function syncNow(){
  if(syncing)return syncing;
  syncing=(async()=>{
    try{
      if(Gref.cloudLogin&&Gref.cloudLogin.pending){Gref.sync26Ready=true;return;}
      if(!needFirebase()){Gref.sync26Ready=true;return;}
      if(Gref.syncHoldUntil&&Date.now()<Gref.syncHoldUntil){Gref.sync26Ready=true;return;}
      if(Gref.drive&&Gref.drive.on){Gref.sync26Ready=true;return;} // never swap saves out from under a live drive recap
      scrub();
      let uids=[myUid()];
      try{const a=await acctGet(P.acct);if(a&&Array.isArray(a.uids))uids=[...new Set([myUid(),...a.uids])];}catch(e){}
      let changed=false;
      for(const u of uids){
        let d=null;try{d=await NET.loadProfile(u);}catch(e){if(u===myUid()){Gref.syncHoldUntil=Date.now()+SYNC26.SYNC_HOLD_MS;if(typeof CS!=='undefined'){CS.report=SYNC26.cloudFailureText(e);CS.status=CS.report;}Gref.sync26Ready=true;return;}continue;}
        if(!d||d.data==null)continue;
        let o=SYNC26.profileFromSaveDoc(d);
        if(o&&o.res&&!o.name&&!o.wiped&&(d.rev||0)>(P._rev||0))o=SYNC26.overlayResGrant(snap(),o.res,d.rev,d.savedAt);
        if(!o||o.wiped||!o.name)continue;
        o.uid=o.uid||u;
        if(u===myUid()&&JSON.stringify(o.tiles||{})===JSON.stringify(P.tiles||{})&&(o._savedAt||0)<=(P._savedAt||0)&&SYNC26.gameEqual(o,snap())){if(typeof CS!=='undefined'&&(d.rev||0)>0&&(d.rev||0)===(P._rev||0)){CS.report='Safe to switch. Cloud save '+(P._rev||0)+' is on the server.';CS.status=CS.report;CS.last=Date.now();}continue;}
        scrub();
        const before=snap();
        const plan=SYNC26.uploadPlan(before,o,d.rev||0);
        if(!plan.upload){
          P.sync26=P.sync26||{clock:{},ops:[],legacyAt:{}};
          P.sync26.heldRemote={rev:d.rev||0,at:Date.now(),profile:plan.held||o};
          if(typeof CS!=='undefined'){CS.report=plan.reason;CS.status=plan.reason;}
          try{save();}catch(e){}
          continue;
        }
        if(!SYNC26.gameEqual(before,plan.profile)){
          const src=plan.profile,keepUid=P.uid,keepAcct=P.acct,keepAlias=P.alias;
          ['res','troops','world','dr26','tiles','stats','badges','pipeUnlock26','sync26','stronghold','lvl','xp','sp','skills','contrib'].forEach(function(k){if(src[k]!==undefined)P[k]=src[k];});
          P._rev=Math.max(P._rev||0,plan.rev||0);P.uid=keepUid;if(keepAcct)P.acct=keepAcct;if(keepAlias)P.alias=keepAlias;
          changed=true;try{save();}catch(e){}
        }
      }
      Gref.sync26Ready=true;
      if(changed){
        try{save();}catch(e){}
        try{if(typeof cloudSave==='function')await cloudSave(true);}catch(e){console.warn('v26i upload',e);}
        try{
          if(!sessionStorage.getItem('wl_sync26_reloaded')){sessionStorage.setItem('wl_sync26_reloaded','1');location.reload();return;}
        }catch(e){}
      }else{
        try{sessionStorage.removeItem('wl_sync26_reloaded');}catch(e){}
        if(Gref.sync26Pending){Gref.sync26Pending=false;try{await cloudSave(true);}catch(e){}}
      }
    }catch(e){console.warn('v26i sync',e);Gref.sync26Ready=true;}
    finally{syncing=null;}
  })();
  return syncing;
}
function showSyncNotices26(){
  const s=P&&P.sync26;if(!s)return;
  if(s.troopNotice&&!s.troopNotice.shown){
    s.troopNotice.shown=Date.now();
    try{toast(s.troopNotice.text);}catch(e){}
    try{if(typeof report==='function')report('🪖 '+s.troopNotice.text,false);}catch(e){}
  }
  const q=s.quarantine&&s.quarantine.tiles;
  const n=q?Object.keys(q).length:0;
  if(n&&s.quarantine.shown===0){
    const msg=n+' hex'+(n===1?'':'es')+' from your other device '+(n===1?'was':'were')+' set aside. '+(n===1?'It was':'They were')+' not on the newer save, so '+(n===1?'it is':'they are')+' not back on the map.';
    try{
      if(UI&&UI.notice)UI.notice('<b>Hexes set aside</b><br><small>'+msg+' Restore them only if they were still yours.</small>',[['Restore',function(){restoreQuarantine26();}],['Leave them',function(){}]]);
      else toast(msg);
    }catch(e){try{toast(msg);}catch(e2){}}
    s.quarantine.shown=Date.now();
    try{save();}catch(e){}
  }
}
window.showSyncNotices26=showSyncNotices26;
window.restoreQuarantine26=function(){
  const q=P.sync26&&P.sync26.quarantine&&P.sync26.quarantine.tiles;
  const ids=q?Object.keys(q):[];
  if(!ids.length){try{toast('No hexes set aside');}catch(e){}return;}
  P.tiles=P.tiles||{};
  for(const id of ids)if(!P.tiles[id])P.tiles[id]={t:(q[id]&&q[id].t)||Date.now()};
  P.sync26.quarantine.tiles={};
  P.sync26.quarantine.shown=Date.now();
  try{save();}catch(e){}
  try{if(typeof drawWorld==='function')drawWorld();}catch(e){}
  try{toast('Restored '+ids.length+' hex'+(ids.length===1?'':'es')+' from your other device');}catch(e){}
};
window.syncNow26=syncNow;
try{acctSync=function(){try{sessionStorage.removeItem('wl_acct24_sync');}catch(e){}return syncNow();};}catch(e){}
try{sessionStorage.removeItem('wl_acct24_sync');}catch(e){}

try{
  const prevCC=cloudCheck;
  cloudCheck=async function(uid){
    try{if(typeof fullResetCheck==='function'&&await fullResetCheck())return;}catch(e){}
    await syncNow();
    return prevCC?undefined:undefined;
  };
}catch(e){console.warn('v26i cloudCheck',e);}

try{
  const prevCS=cloudSave;
  const prevScore=typeof score26==='function'?score26:null;
  if(prevScore)score26=function(o){if(Gref._sync26force&&o===P)return prevScore(o)+1e12;return prevScore(o);};
  cloudSave=async function(force){
    if(Gref.cloudLogin&&Gref.cloudLogin.pending)return;
    if(!Gref.sync26Ready){if(force&&typeof CS!=='undefined'){CS.report='Do not switch yet. This send has not been confirmed.';CS.status=CS.report;}Gref.sync26Pending=true;return;}
    if(!force&&Gref.syncHoldUntil&&Date.now()<Gref.syncHoldUntil)return;
    if(!SYNC26.shouldUpload(memGen,storedGen())){if(force&&typeof CS!=='undefined'){CS.report='Do not switch yet. This send has not been confirmed.';CS.status=CS.report;}return;}
    if(!syncing)await syncNow();
    if(Gref.syncHoldUntil&&Date.now()<Gref.syncHoldUntil)return;
    if(!SYNC26.shouldUpload(memGen,storedGen())){if(force&&typeof CS!=='undefined'){CS.report='Do not switch yet. This send has not been confirmed.';CS.status=CS.report;}return;}
    Gref._sync26force=!!force;
    try{return await prevCS(!!force);}finally{Gref._sync26force=false;}
  };
}catch(e){console.warn('v26i cloudSave',e);}

function onWake(){
  if(!SYNC26.shouldUpload(memGen,storedGen())){location.reload();return;}
  syncNow();
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')onWake();},true);
window.addEventListener('focus',onWake);
window.addEventListener('pageshow',e=>{if(e.persisted)onWake();});
setInterval(()=>{if(document.visibilityState==='visible')syncNow();},20000);
if(!needFirebase())Gref.sync26Ready=true;
else setTimeout(syncNow,300);

// ---- claim marches (independent of the save merge) ----
function realOwned(id){
  if(P.tiles&&P.tiles[id])return 'already yours';
  const o=Gref.terr&&Gref.terr[id];
  if(o&&!o.ai&&!o.released&&o.uid)return (typeof isMe==='function'&&isMe(o.uid))?'already yours':'an ally holds it';
  return null;
}
function realFort(id){try{return typeof enemyAt==='function'&&enemyAt(id)&&!(W().enemyTaken&&W().enemyTaken[id]);}catch(e){return false;}}
// Claim walks use these. allied() itself stays as v26a left it, so horde steps still
// fight on a guarded pipeline. A global flag around the async march resolve would have
// turned that off during the server-clock wait.
window.claimRoute26=function(from,to){
  if(typeof hexCenter!=='function'||typeof hexAt!=='function'||typeof idQR!=='function')return SYNC26.hexLine(from,to);
  let a,b;
  try{a=hexCenter.apply(null,idQR(from));b=hexCenter.apply(null,idQR(to));}
  catch(e){return SYNC26.hexLine(from,to);}
  return SYNC26.crossedHexes(from,to,function(t){return hexAt(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t).id;});
};
window.claimSkip26=function(id){return realOwned(id);};
try{
  myMarches=function(){return Object.entries(Gref.marches||{}).filter(([,m])=>m&&typeof isMe==='function'&&isMe(m.uid));};
}catch(e){}

function skipText(line){
  const counts={};
  for(const id of line){
    const why=realOwned(id)||(realFort(id)?'enemy fort — attack it in person':null);
    if(why)counts[why]=(counts[why]||0)+1;
  }
  return Object.keys(counts).map(w=>'Skipped '+counts[w]+' ('+w+').').join(' ');
}
function annotate(id,m,line){
  const extra=skipText(line);
  if(!extra||(m.result&&m.result.indexOf('Skipped ')!==-1))return;
  m.result=(m.result?m.result+' ':'')+extra;
  try{NET.updMarch&&NET.updMarch(id,{result:m.result});}catch(e){}
}
function repairClaim(id,m){
  // Only after the march has actually arrived. An early return (still on the road) must not grant hexes.
  if(!m||m.state!=='arrived'||m.kind==='intercept'||m.kind==='patrol'||m.kind==='mob')return;
  const line=(typeof claimRoute26==='function'?claimRoute26(m.from,m.to):SYNC26.hexLine(m.from,m.to)).slice(1);
  if(m.win===false||/Stopped by defenders|Daily claim limit/.test(m.result||'')){annotate(id,m,line);return;}
  const missed=[];
  for(const hx of line){
    if(P.tiles&&P.tiles[hx])continue;
    if(realOwned(hx)||realFort(hx))continue;
    let units=0,fort=false;
    try{const tg=marchTarget(hx);fort=tg.kind==='fort';units=(tg.units&&tg.units.length)||0;}catch(e){}
    if(fort||units)continue; // defenses first: never grant a defended hex from the safety net
    missed.push(hx);
  }
  if(!missed.length){annotate(id,m,line);return;}
  let room=Infinity;
  try{const cap=BAL.tiles.dailyClaimCap;if(cap!==Infinity)room=Math.max(0,cap-(claimsToday().n||0));}catch(e){}
  const got=[];
  for(const hx of missed){if(!(room>0))break;try{claimTile(hx);}catch(e){continue;}got.push(hx);room--;}
  if(!got.length){annotate(id,m,line);return;}
  m.claimed=[...(Array.isArray(m.claimed)?m.claimed:[]),...got];
  m.win=true;m.kind=m.kind||'path';
  try{
    const base=(BAL.march&&BAL.march.neutralLoot)||{};
    m.loot=m.loot||{};
    for(let i=0;i<got.length;i++)for(const k in base)m.loot[k]=(m.loot[k]||0)+base[k];
  }catch(e){}
  const phrase='Claimed '+got.length+' open hex'+(got.length===1?'':'es')+' on the route.';
  m.result=((m.result&&m.result.indexOf('Nothing new to claim')===-1)?m.result+' ':'')+phrase;
  annotate(id,m,line);
  P.marchDone=P.marchDone||{};P.marchDone[id]=1;
  try{save();}catch(e){}
  try{NET.updMarch&&NET.updMarch(id,{state:'arrived',win:true,kind:'path',claimed:m.claimed,result:m.result,loot:m.loot});}catch(e){}
}
try{
  const prevRes=resolveMarch;
  resolveMarch=async function(id,m){
    if(!m||typeof isMe!=='function'||!isMe(m.uid))return;
    const now=typeof nowS==='function'?nowS():Date.now();
    if(!SYNC26.aliasMayResolve(m,now,P.uid,Gref.marchAliasGraceMs))return;
    const r=await prevRes.apply(this,arguments);
    try{repairClaim(id,m);}catch(e){console.warn('claim26',e);}
    return r;
  };
}catch(e){console.warn('v26i resolve',e);}
try{
  const prevRet=returnMarch;
  returnMarch=async function(id,m){
    if(!m||typeof isMe!=='function'||!isMe(m.uid))return;
    const now=typeof nowS==='function'?nowS():Date.now();
    if(!SYNC26.aliasMayResolve(m,now,P.uid,Gref.marchAliasGraceMs))return;
    if(m.paid&&m.paidBy&&m.paidBy!==P.uid){P.marchPaid=P.marchPaid||{};P.marchPaid[id]=1;}
    return prevRet.apply(this,arguments);
  };
}catch(e){}
try{
  const prevUpd=NET.updMarch.bind(NET);
  NET.updMarch=function(id,d){
    try{if(d&&d.state==='done'){d.paid=true;d.paidBy=P.uid;}}catch(e){}
    return prevUpd(id,d);
  };
}catch(e){}
window.realOwned26=realOwned;
}catch(e){console.error('v26i boot',e);}
})();
