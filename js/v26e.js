// v26e/v26-7 (TEST) Dual-device sync must never roll progress backwards + hard heal for pope Nov 5 wipe.
// v26-6 shipped with a SYNTAX ERROR (extra } in cloudSave wrap) so this whole file never ran — heal26c was undefined.
(function(){
try{
function score26(o){if(!o||typeof o!=='object')return 0;
  const b=Object.keys(o.badges||{}).length,u=Object.keys(o.pipeUnlock26||{}).length,d=(o.dr26||[]).length;
  const m=Math.floor(((o.stats&&o.stats.meters)||0)/100),t=Object.keys(o.tiles||{}).length;
  return (o.lvl||1)*1e9+(o.xp||0)*1e5+b*1e4+u*1e3+d*100+m+Math.min(t,5000);}
window.score26=score26;
function mergeProg26(keep,o){if(!keep||!o)return o||keep;
  const out=Object.assign({},o);
  if((keep.lvl||1)>(o.lvl||1)||((keep.lvl||1)===(o.lvl||1)&&(keep.xp||0)>(o.xp||0))){out.lvl=keep.lvl;out.xp=keep.xp;out.sp=Math.max(keep.sp||0,o.sp||0);}
  else out.sp=Math.max(keep.sp||0,o.sp||0);
  out.badges=Object.assign({},o.badges||{},keep.badges||{});
  out.pipeUnlock26=Object.assign({},o.pipeUnlock26||{},keep.pipeUnlock26||{});
  const kd=keep.dr26||[],od=o.dr26||[];out.dr26=(kd.length>=od.length?kd:od).slice(0,20);
  const km=Math.max((keep.stats&&keep.stats.meters)||0,(o.stats&&o.stats.meters)||0);
  out.stats=Object.assign({},o.stats||{},keep.stats||{},{meters:km,kills:Math.max((keep.stats&&keep.stats.kills)||0,(o.stats&&o.stats.kills)||0)});
  out.contrib=Object.assign({},o.contrib||{},keep.contrib||{});
  out.contrib.badges=Math.max(out.contrib.badges||0,Object.keys(out.badges).length);
  out.contrib.km=Math.max(out.contrib.km||0,km/1000);
  if((keep.heal26c||0)>(o.heal26c||0))out.heal26c=keep.heal26c;
  if(keep.heal26cDone)out.heal26cDone=keep.heal26cDone;
  return out;}
window.mergeProg26=mergeProg26;

try{const _ad26e=adoptProfile;adoptProfile=function(o,why){const keep={name:P.name,lvl:P.lvl,xp:P.xp,sp:P.sp,badges:P.badges,pipeUnlock26:P.pipeUnlock26,dr26:P.dr26,stats:P.stats,contrib:P.contrib,heal26c:P.heal26c,heal26cDone:P.heal26cDone,tiles:P.tiles};
  try{if(G.drive){G.drive.on=false;G.drive.s26=null;G.drive.claimed=0;}}catch(e){}
  return _ad26e(mergeProg26(keep,o),why);};}catch(e){console.warn('v26e adopt',e);}

try{const _cc26e=cloudCheck;cloudCheck=async function(uid){if(!NET.loadProfile)return;try{const d=await NET.loadProfile(uid);if(!d||!d.data)return;let o;try{o=JSON.parse(d.data);}catch(e){return;}
  if(!profileValid(o))return;if((d.rev||0)<=(P._rev||0))return;
  if(score26(o)+1<score26(P)){CS.status='cloud save is older progress — kept this phone\'s copy';return;}
  adoptProfile(o,'Loaded your newer cloud save (Lv'+o.lvl+'). Old phone copy kept as a backup.');}catch(e){CS.status='cloud check failed';}};}catch(e){console.warn('v26e cloudCheck',e);}

try{const _cs26e=cloudSave;cloudSave=async function(force){
  try{
    if(NET.saveProfile&&P.name&&!window.__wiping){
      const c=await NET.loadProfile(P.uid);
      if(c&&c.data){
        let o=null;try{o=JSON.parse(c.data);}catch(e){o=null;}
        if(o&&score26(o)>score26(P)+1e5){CS.status='a richer save is in the cloud: reopen the app to load it';return;}
      }
    }
  }catch(e){}
  return _cs26e.apply(this,arguments);
};}catch(e){console.warn('v26e cloudSave',e);}

try{if(typeof newestSave==='function'){newestSave=async function(uids){let best=null;for(const u of uids){try{const d=await NET.loadProfile(u);if(!d||!d.data)continue;let o;try{o=JSON.parse(d.data);}catch(e){continue;}
  const t=d.serverT&&d.serverT.toMillis?d.serverT.toMillis():(d.t||d.savedAt||0);const sc=score26(o);
  if(!best||sc>best.sc||(sc===best.sc&&t>best.t))best=Object.assign({},d,{uid:u,t:t,sc:sc,o:o});}catch(e){}}return best;};}}catch(e){console.warn('v26e newestSave',e);}

try{if(typeof acctSync==='function'){acctSync=async function(){if(!P.acct||NET.mode!=='firebase'||sessionStorage.getItem('wl_acct24_sync'))return;sessionStorage.setItem('wl_acct24_sync','1');
  try{const a=await acctGet(P.acct),me=NET.uid;if(!a)return;if(!(a.uids||[]).includes(me)){P.acct=null;P.alias=[];save();return;}P.alias=a.uids.filter(u=>u!==me);save();
    const best=await newestSave(a.uids);if(!best||best.uid===me)return;
    const mineSc=score26(P),bestSc=best.sc||score26(best.o||JSON.parse(best.data));
    if(bestSc<=mineSc)return;
    const o=best.o||JSON.parse(best.data);if(profileValid(o)){P.tiles={};const al=P.alias,ac=P.acct;adoptProfile(o,'Synced from your other device');P.uid=me;P.alias=al;P.acct=ac;save();location.reload();}}catch(e){console.warn('acctSync26e',e);}};}}catch(e){console.warn('v26e acctSync',e);}

try{const _td26e=toggleDrive;toggleDrive=async function(){const wasOn=G.drive.on;const s=wasOn?G.drive.s26:null;
  const r=await _td26e.apply(this,arguments);
  try{if(!G.drive.on&&s&&P.dr26&&P.dr26[0]&&P.dr26[0].t0===s.t0){const rec=P.dr26[0];if(!(parseFloat(rec.km)>=0))rec.km='0.0';
    if(!(rec.newHex>=0))rec.newHex=Math.max(0,G.drive.claimed||0);save();}}catch(e){}return r;};}catch(e){console.warn('v26e toggleDrive',e);}
try{if(typeof driveHTML26==='function'){const _dh26e=driveHTML26;driveHTML26=function(r){try{r=Object.assign({},r,{km:(!(parseFloat(r.km)>=0)?'0.0':r.km),newHex:Math.max(0,r.newHex|0),own:Math.max(0,r.own|0)});}catch(e){}return _dh26e(r);};}}catch(e){console.warn('v26e driveHTML',e);}

// ---- HARD heal: re-applies every load until verified (lvl>=4 AND >=9 badges). v26-6 never ran due to syntax error.
const HEAL26C={minLvl:4,minBadges:9,badgeNames:['Water Tower #4','Overgrown Park #10','Abandoned School #2','Overgrown Park #1','Toxic Shore #6','Looted Grocery #9','Water Tower #13','Dead Mall #5','Old Town Hall #8']};
function isPope26(){try{return !!(P&&P.name&&(/pope/i.test(P.name)||P.acct==='pope'));}catch(e){return false;}}
function healDone26(){try{return (P.lvl||1)>=HEAL26C.minLvl&&Object.keys(P.badges||{}).length>=HEAL26C.minBadges;}catch(e){return false;}}
function unlockPipes26(){let n=0;try{if(typeof unlockSite26!=='function')return 0;
  let near=[];try{if(typeof sitesNear==='function')near=sitesNear()||[];}catch(e){}
  if(!near.length&&typeof siteOf==='function'){try{near=(G.landmarks||[]).map(siteOf).filter(Boolean);}catch(e){}}
  for(let i=0;i<near.length;i++){const s=near[i];if(!s||s.hex==null)continue;
    let hold=!!(P.tiles&&P.tiles[s.hex]);if(!hold){const ids=Object.keys(P.tiles||{});for(let j=0;j<ids.length;j++){try{if(hexDist(ids[j],s.hex)<=1){hold=true;break;}}catch(e){}}}
    if(!hold)continue;
    const before=!!(P.pipeUnlock26&&P.pipeUnlock26[s.id]);
    try{unlockSite26(s);}catch(e){}
    if(!before&&P.pipeUnlock26&&P.pipeUnlock26[s.id])n++;}
  }catch(e){console.warn('unlockPipes26',e);}return n;}
function heal26c(force){try{if(!isPope26())return false;
  if(!force&&P.heal26cDone&&healDone26()){unlockPipes26();return false;}
  const before={lvl:P.lvl,xp:P.xp,badges:Object.keys(P.badges||{}).length,pipe:Object.keys(P.pipeUnlock26||{}).length};
  let n=0;
  if((P.lvl||1)<HEAL26C.minLvl){P.lvl=HEAL26C.minLvl;P.xp=Math.max(P.xp||0,40);P.sp=Math.max(P.sp||0,HEAL26C.minLvl-1);try{P.hp=stats().hp;}catch(e){}n++;}
  P.badges=P.badges||{};
  const L=G.landmarks||[];
  for(let i=0;i<HEAL26C.badgeNames.length;i++){const name=HEAL26C.badgeNames[i];
    let hit=null;for(let j=0;j<L.length;j++){if(L[j]&&L[j].name===name){hit=L[j];break;}}
    if(hit){if(!P.badges[hit.id]){P.badges[hit.id]={name:hit.name,kind:hit.kind||'park',t:Date.now()};n++;}}
    else{const sid='heal26c:'+name;if(!P.badges[sid]){P.badges[sid]={name:name,kind:'park',t:Date.now()};n++;}}}
  P.contrib=P.contrib||{};P.contrib.badges=Math.max(P.contrib.badges||0,Object.keys(P.badges).length);
  n+=unlockPipes26();
  if(Array.isArray(P.dr26)){const bd=P.dr26.length;P.dr26=P.dr26.filter(function(r){return r&&parseFloat(r.km)>=0&&(r.newHex|0)>=0;});if(P.dr26.length!==bd)n++;}
  const done=healDone26();P.heal26c=Date.now();if(done)P.heal26cDone=Date.now();
  P.heal26cNote={before:before,after:{lvl:P.lvl,xp:P.xp,badges:Object.keys(P.badges).length,pipe:Object.keys(P.pipeUnlock26||{}).length},n:n,done:!!done,v:'v26-7'};
  try{localStorage.setItem('wl_heal26c_v7',JSON.stringify({t:Date.now(),lvl:P.lvl,badges:Object.keys(P.badges).length}));}catch(e){}
  save();
  try{pushMember();}catch(e){}
  try{if(typeof cloudSave==='function')cloudSave(true);}catch(e){console.warn('heal cloudSave',e);}
  try{const el=document.getElementById('notice');if(el){el.classList.remove('hidden');el.textContent=done?('🛠 Restored Lv'+P.lvl+' · '+Object.keys(P.badges).length+' badges · pipelines unlocked'):('🛠 Restoring progress… Lv'+P.lvl);setTimeout(function(){el.classList.add('hidden');},8000);}}catch(e){}
  if(n||force){try{toast('🛠 Restored your progress (Lv'+P.lvl+', '+Object.keys(P.badges).length+' badges'+(Object.keys(P.pipeUnlock26||{}).length?', pipelines':'')+').');}catch(e){}}
  console.log('heal26c',P.heal26cNote);return true;}catch(e){console.warn('heal26c',e);return false;}}
window.heal26c=heal26c;window.healDone26=healDone26;window.isPope26=isPope26;

// Apply ASAP (don't wait 8s — that race lost to sync). Retry until verified done.
function tickHeal26(){try{if(!P||!P.name)return;if(!isPope26())return;heal26c(false);}catch(e){}}
setTimeout(tickHeal26,500);
setTimeout(tickHeal26,2000);
setTimeout(tickHeal26,5000);
setTimeout(tickHeal26,12000);
setInterval(function(){try{if(isPope26()&&!healDone26())heal26c(false);else if(isPope26()){const n=unlockPipes26();if(n){try{cloudSave(true);}catch(e){}}}}catch(e){}},8000);
}catch(e){console.error('v26e boot failed',e);try{window.heal26c=function(){console.error('heal stub');};}catch(e2){}}
})();
