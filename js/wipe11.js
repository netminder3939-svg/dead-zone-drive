// wipe11 (PREVIEW pv- TEAMS ONLY): Wipe = full team reset to a clean slate. Never runs on live hosts or non-pv- teams.
const PVW=()=>location.hostname.includes('--')&&/^pv-/.test(localStorage.getItem('wl_team')||'')&&NET.mode==='firebase'&&/^pv-/.test(NET.team||'');
const feNow=()=>Math.max(G.srvFullEpoch||0,+(localStorage.getItem('wl_fullEpoch_'+(NET.team||''))||0));
const msT=x=>x&&x.toMillis?x.toMillis():(+x||0);
// after a team reset: hide anything from before it (other players, hexes, marches, horde, log)
if(location.hostname.includes('--')){
const _onT=NET.onTerritory.bind(NET);NET.onTerritory=function(f){return _onT(o=>{const fe=feNow();if(fe&&/^pv-/.test(NET.team||''))for(const k in o)if(msT(o[k]&&o[k].t)<fe)delete o[k];f(o);});};
const _onA=NET.onAlliance.bind(NET);NET.onAlliance=function(f){return _onA(a=>{const fe=feNow();if(fe&&a&&/^pv-/.test(NET.team||'')){for(const [k,m] of Object.entries(a.members||{}))if(!m.me&&msT(m.lastActive)<fe)delete a.members[k];a.log=(a.log||[]).filter(x=>msT(x.t)>=fe);a.act=(a.act||[]).filter(x=>msT(x.t)>=fe);}f(a);});};
const _onM=NET.onMarches.bind(NET);NET.onMarches=function(f){return _onM(o=>{const fe=feNow();if(fe&&/^pv-/.test(NET.team||''))for(const k in o)if((o[k].startT||0)<fe)delete o[k];f(o);});};
const _adW=adoptHorde;adoptHorde=function(doc){const fe=feNow();if(fe&&doc&&msT(doc.t)<fe&&/^pv-/.test(NET.team||''))return;return _adW.apply(this,arguments);};}
const _devWipe11=devWipe;devWipe=async function(){if(!PVW())return _devWipe11.apply(this,arguments);
  if(!confirm(`TEST RESET of team "${NET.team}": clears every player, hex, structure, resource, troop and march for this preview team, then you start fresh with the test kit. Continue?`))return;
  window.__wiping=true;toast('♻️ Resetting the test team…');const fs=NET.fs,db=NET.db,base=NET.base,now=Date.now();
  let ep=0;try{const d=await fs.getDoc(fs.doc(db,...base,'meta','map'));ep=d.exists()?(d.data().epoch||0):0;}catch(e){}
  if(!/^pv-/.test(NET.team||'')||!location.hostname.includes('--'))return; // hard guard before any delete
  let del=0;for(const c of ['territory','marches','raids','players','saves','activity','bankLog','explored','markers','clock']){try{const snap=await fs.getDocs(fs.collection(db,...base,c));await Promise.all(snap.docs.map(d=>fs.deleteDoc(d.ref).then(()=>del++).catch(e=>console.warn('del',c,e.code))));}catch(e){console.warn('wipe',c,e);}}
  for(const m of ['alliance','horde','map']){try{await fs.deleteDoc(fs.doc(db,...base,'meta',m));del++;}catch(e){console.warn('del meta',m,e.code);}}
  try{await fs.setDoc(fs.doc(db,...base,'meta','map'),{epoch:ep+1,fullEpoch:now});}catch(e){console.warn('wipe map',e);}
  localStorage.setItem('wl_fullEpoch_'+NET.team,now);localStorage.setItem('wl_mapEpoch_'+NET.team,ep+1);console.log('wipe deleted',del);
  const team=NET.team,fe=now,me=localStorage.getItem('wl_mapEpoch_'+team);
  try{localStorage.clear();localStorage.setItem('wl_team',team);localStorage.setItem('wl_fullEpoch_'+team,fe);localStorage.setItem('wl_mapEpoch_'+team,me);}catch(e){}
  try{if(window.caches)for(const k of await caches.keys())await caches.delete(k);}catch(e){}
  location.reload();};
