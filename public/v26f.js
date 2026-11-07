// v26f (TEST · ddd-v26-8) Pipeline unlocks + drive reports restored after dual-device wipe.
// Why unlocks looked missing: Pipelines UI required sitesNear() so saved pipeUnlock26 rows vanished from the list;
// computer alias still empty; build also needs 15⚙️. Drive recaps (dr26) were wiped with no cloud copy — re-seed a summary.
(function(){
try{
function siteFromU26(id){const u=(P.pipeUnlock26||{})[id];if(!u||u.hex==null)return null;return{id:id,name:u.name,res:u.res,hex:u.hex,lat:u.lat,lng:u.lng,kind:u.kind};}
window.siteFromU26=siteFromU26;
function pipeCandidates26(){const out=[],seen={};
  function add(s){if(!s||!s.id||seen[s.id]||!s.res)return;seen[s.id]=1;out.push(s);}
  try{if(typeof sitesNear==='function')(sitesNear()||[]).forEach(add);}catch(e){}
  try{(G.landmarks||[]).forEach(function(l){try{if(typeof siteOf==='function')add(siteOf(l));}catch(e){}});}catch(e){}
  try{if(typeof LM_STATIC!=='undefined'){LM_STATIC.list.forEach(function(l){if(!PIPE.sites[l.kind])return;
    const hex=hexAt(l.lat,l.lng).id;add({id:l.id,hex:hex,res:PIPE.sites[l.kind],name:l.name||((LANDMARK_KINDS[l.kind]||{}).label)||l.kind,kind:l.kind,lat:l.lat,lng:l.lng});});}}catch(e){}
  // badge evidence: a visited landmark that is also a supply site counts as driven-past
  try{Object.keys(P.badges||{}).forEach(function(bid){const b=P.badges[bid];const L=(G.landmarks||[]).find(function(l){return l&&(l.id===bid||(b&&l.name===b.name));});
    if(L&&typeof siteOf==='function')add(siteOf(L));
    // synthetic numbered badges (Water Tower #4 etc.) — unlock nearest real site of that kind
    if(b&&b.name){const m=/^(Water Tower|Looted Grocery|Dead Mall|Old Town Hall|Toxic Shore)/i.exec(b.name);
      if(m){const kindMap={'water tower':'water_tower','looted grocery':'grocery','dead mall':'mall','old town hall':'townhall'};
        const kind=kindMap[m[1].toLowerCase()];if(kind&&PIPE.sites[kind]){const hit=pipeCandidatesKind26(kind);if(hit)add(hit);}}}});}catch(e){}
  return out;}
function pipeCandidatesKind26(kind){try{if(typeof LM_STATIC!=='undefined'){for(let i=0;i<LM_STATIC.list.length;i++){const l=LM_STATIC.list[i];if(l.kind!==kind)continue;
  return{id:l.id,hex:hexAt(l.lat,l.lng).id,res:PIPE.sites[l.kind],name:l.name||((LANDMARK_KINDS[l.kind]||{}).label)||l.kind,kind:l.kind,lat:l.lat,lng:l.lng};}}
  const L=(G.landmarks||[]).find(function(x){return x&&x.kind===kind;});if(L&&typeof siteOf==='function')return siteOf(L);}catch(e){}return null;}
function unlockPipes26(){let n=0;try{P.pipeUnlock26=P.pipeUnlock26||{};const cand=pipeCandidates26();
  let o=null;try{o=typeof pipeOrigin==='function'?pipeOrigin():(P.world&&P.world.sh&&P.world.sh.hex);}catch(e){}
  const ids=Object.keys(P.tiles||{});
  for(let i=0;i<cand.length;i++){const s=cand[i];if(!s||P.pipeUnlock26[s.id])continue;
    let hold=!!(P.tiles&&P.tiles[s.hex]);
    if(!hold){for(let j=0;j<ids.length;j++){try{if(hexDist(ids[j],s.hex)<=2){hold=true;break;}}catch(e){}}}
    let near=false;if(o&&s.lat!=null){try{const c=hexCenter(...idQR(typeof o==='string'?o:o));near=distM(c[0],c[1],s.lat,s.lng)<=(PIPE.maxKm||5)*1000;}catch(e){}}
    if(!hold&&!near)continue;
    if(!hold&&near){let close=false;for(let j=0;j<ids.length;j++){try{if(hexDist(ids[j],s.hex)<=4){close=true;break;}}catch(e){}}if(!close)continue;}
    P.pipeUnlock26[s.id]={t:Date.now(),res:s.res,name:String(s.name||'').slice(0,40),hex:s.hex,lat:s.lat,lng:s.lng,kind:s.kind};n++;}
  if(n)save();}catch(e){console.warn('unlockPipes26',e);}return n;}
window.unlockPipes26=unlockPipes26;

function healDone26(){try{return (P.lvl||1)>=4&&Object.keys(P.badges||{}).length>=9&&Object.keys(P.pipeUnlock26||{}).length>=1;}catch(e){return false;}}
window.healDone26=healDone26;

// Restore a drive-report summary so Reports › Drives is not empty after the wipe (exact per-drive rows are gone).
function healDrives26(){try{if(!(P&&P.name&&(false/*12e: repair retired*/)))return false;
  if(P.heal26cDrives)return false;
  P.dr26=Array.isArray(P.dr26)?P.dr26:[];
  // drop broken negative rows
  P.dr26=P.dr26.filter(function(r){return r&&parseFloat(r.km)>=0&&(r.newHex|0)>=0;});
  const km=((P.stats&&P.stats.meters)||0)/1000;
  const hexes=Object.keys(P.tiles||{}).length;
  if(!P.dr26.length&&km>=0.5){
    const now=Date.now();
    P.dr26=[{t:now,t0:now-Math.max(20,km)*60e3,km:km.toFixed(1),newHex:Math.max(0,hexes),own:0,ownPaid:0,src:{},total:{},other:{},bugs:[],
      restored:1,title:'Restored drive summary'}];
  }
  P.heal26cDrives=Date.now();save();
  try{if(P.dr26.length)toast('🚗 Drive reports: restored a summary from your '+km.toFixed(1)+' km driven (detail rows were lost in the sync wipe)');}catch(e){}
  return true;}catch(e){console.warn('healDrives26',e);return false;}}
window.healDrives26=healDrives26;

// Show restored tag on drive recap cards
try{if(typeof driveHTML26==='function'){const _dh26f=driveHTML26;driveHTML26=function(r){let h=_dh26f(r);try{if(r&&r.restored)h=h.replace('<h2>🚗 Drive Recap</h2>','<h2>🚗 Drive Recap</h2><p class="tiny">♻️ Restored summary after the sync wipe — exact per-drive loot rows could not be recovered.</p>');}catch(e){}return h;};}}catch(e){}
try{if(typeof reportItems26==='function'){const _ri26f=reportItems26;reportItems26=function(){const o=_ri26f.apply(this,arguments);try{o.forEach(function(x){if(x.k==='d'&&x.r&&x.r.restored)x.title='♻️ Restored · '+x.r.km+' km';});}catch(e){}return o;};}}catch(e){}

function healPipes26(force){try{if(!(P&&P.name&&(false/*12e: repair retired*/)))return false;
  const before=Object.keys(P.pipeUnlock26||{}).length;
  const n=unlockPipes26();
  let parts=0;try{if(!P.heal26cParts&&(P.res.parts||0)<15&&Object.keys(P.pipeUnlock26||{}).length){P.res.parts=(P.res.parts||0)+15;P.heal26cParts=Date.now();parts=15;}}catch(e){}
  try{healDrives26();}catch(e){}
  const after=Object.keys(P.pipeUnlock26||{}).length;
  if(n||parts||force||after!==before){P.heal26cPipe=Date.now();P.heal26cPipeNote={before:before,after:after,n:n,parts:parts,v:'v26-8'};
    if(after>=1&&(P.lvl||1)>=4&&Object.keys(P.badges||{}).length>=9)P.heal26cDone=Date.now();
    save();try{pushMember();}catch(e){}try{cloudSave&&cloudSave(true);}catch(e){}
    try{toast('⛓️ Pipelines: '+after+' site'+(after===1?'':'s')+' unlocked'+(parts?' · +15⚙️ to build':'')+'. Open Base › Pipelines.');}catch(e){}
    try{if(UI.tab==='base'&&UI.sub&&UI.sub.base==='pipes')UI.render();}catch(e){}
    console.log('healPipes26',P.heal26cPipeNote);}
  return after>0;}catch(e){console.warn('healPipes26',e);return false;}}
window.healPipes26=healPipes26;

setTimeout(function(){try{healPipes26(false);healDrives26();}catch(e){}},800);
setTimeout(function(){try{healPipes26(false);}catch(e){}},3000);
setTimeout(function(){try{healPipes26(false);}catch(e){}},8000);
setTimeout(function(){try{healPipes26(true);}catch(e){}},15000);
setInterval(function(){try{if(P&&P.name&&(false/*12e: repair retired*/)&&Object.keys(P.pipeUnlock26||{}).length<1)healPipes26(false);
  else if(P&&P.name&&(false/*12e: repair retired*/)){const n=unlockPipes26();if(n){try{cloudSave(true);}catch(e){}}}
  if(P&&P.name&&(false/*12e: repair retired*/)&&!P.heal26cDrives)healDrives26();}catch(e){}},10000);

const _rp26f=UI.render;UI.render=function(){const r=_rp26f.apply(this,arguments);try{if(this.tab==='base'&&this.sub&&this.sub.base==='pipes'&&typeof healPipes26==='function')healPipes26(false);}catch(e){}return r;};
}catch(e){console.error('v26f boot',e);}
})();
