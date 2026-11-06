// The save handoff. No Firebase. A fake load/write stands in for the server.
const S=require('../../js/sync26.js');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const RES={scrap:0,food:0,water:0,fuel:0,parts:0};
function base(over){
  const p={name:'QA-Test',uid:'qa',lvl:1,xp:0,res:{scrap:0,food:0,water:0,fuel:0,parts:0},
    tiles:{},badges:{},dr26:[],stats:{meters:0,kills:0},
    troops:{home:0,queue:[],away:{}},
    world:{sh:{level:1,state:'up',upEnd:0,hex:'1_0'},barracks:{level:1}},
    stronghold:{level:1},_rev:1,_savedAt:1000,sync26:{clock:{},ops:[],legacyAt:{},snap:null}};
  Object.assign(p,over||{});
  return p;
}
function spentLocal(){
  const p=base();
  S.recordChange(p,p.uid,1000);
  p.res={scrap:2574,food:2864,water:2864,fuel:3000,parts:2992};
  p.troops={home:1000,queue:[],away:{}};
  p.world={sh:{level:1,state:'up',upEnd:1793936908647,hex:'1_0'},barracks:{level:2,upEnd:0}};
  p.stronghold={level:2};
  S.recordChange(p,p.uid,2000);
  return p;
}
const quota={code:'resource-exhausted',message:'Quota exceeded.'};

(async()=>{
  const local=spentLocal();
  const cloud=base({res:{scrap:3000,food:3000,water:3000,fuel:3000,parts:3000},troops:{home:0,queue:[],away:{}},stronghold:{level:1},_rev:1,_savedAt:1500});
  let writes=0;
  const handed=await S.runCloudHandoff(local,{
    load:async()=>({rev:2,profile:cloud}),
    write:async(doc)=>{writes++;doc.seen=doc.profile.res.scrap;}
  });
  ok(handed.wrote===true&&writes===1&&handed.rev===3,'the upload is acknowledged at revision 3, one write');
  ok(handed.local.res.scrap===2574&&handed.local.res.fuel===3000,'the flat 3000 grant does not replace the spent balance');
  ok(handed.local.troops.home===1000&&handed.local.world.sh.upEnd===1793936908647&&handed.local.stronghold.level===2,'troops and the stronghold timer are what gets handed off');
  ok(handed.local._rev===3,'the local revision changes only after the write resolves');

  const phone=spentLocal();
  phone.dr26=[{t0:1,t:2,km:'8.0',newHex:4}];
  phone.stats={meters:8000,kills:0};
  const desk=base({dr26:[],stats:{meters:0,kills:0},_rev:1});
  const kept=await S.runCloudHandoff(desk,{
    load:async()=>({rev:4,profile:phone}),
    write:async()=>{}
  });
  ok(kept.wrote&&kept.local.stats.meters===8000&&kept.local.dr26.length===1,'a real drive on the other device is in the handoff, not dropped');

  let blockedWrites=0;
  const blocked=await S.runCloudHandoff(spentLocal(),{
    load:async()=>{throw quota;},
    write:async()=>{blockedWrites++;}
  });
  ok(blocked.wrote===false&&blockedWrites===0&&blocked.rev===1&&blocked.quota===true,'a quota error does not write and does not move the revision');
  ok(blocked.local.res.scrap===2574,'the spent balance stays on the device');
  ok(/quota exceeded/i.test(blocked.report),'the screen can say the server refused with quota exceeded');
  const shown=S.saveStatusLine({last:0,report:blocked.report,status:'saved earlier'},1);
  ok(shown===blocked.report,'the failure is shown even when this session has never saved');
  ok(S.saveStatusLine({last:0,report:'',status:'saved earlier'},1)==='saved earlier','an untouched session still says saved earlier');

  let failedWrite=0;
  const nack=await S.runCloudHandoff(spentLocal(),{
    load:async()=>null,
    write:async()=>{failedWrite++;throw quota;}
  });
  ok(nack.wrote===false&&nack.rev===1&&failedWrite===1,'a rejected write is not treated as saved');

  const t0=100000;
  ok(S.syncAllowed(t0,0)&&!S.syncAllowed(t0+1000,t0+S.SYNC_HOLD_MS)&&S.syncAllowed(t0+S.SYNC_HOLD_MS,t0+S.SYNC_HOLD_MS),'after quota exceeded the automatic pull stays quiet for five minutes');

  function shared(){
    const p=base({res:{scrap:3000,food:3000,water:3000,fuel:3000,parts:3000},troops:{home:1000,queue:[],away:{}}});
    S.recordChange(p,'qa',1000);
    return p;
  }
  // Legitimate newer cloud: spent, lost troops, started training, own drive. Local journal is only a later level tick.
  const stale=shared();
  stale.lvl=2; stale.dr26=[{t0:1,t:2,km:'2.0',newHex:1}]; stale.stats={meters:2000,kills:0};
  S.recordChange(stale,'qa',9000);
  const newerCloud=JSON.parse(JSON.stringify(shared()));
  newerCloud.res={scrap:1800,food:2200,water:3000,fuel:3000,parts:2990};
  newerCloud.troops={home:400,queue:[{n:100,end:9}],away:{}};
  newerCloud.dr26=[{t0:8,t:9,km:'4.0',newHex:1}];
  newerCloud.stats={meters:4000,kills:0};
  newerCloud._rev=5; newerCloud._savedAt=8000;
  const tookCloud=S.uploadPlan(stale,newerCloud,5);
  ok(tookCloud.upload&&tookCloud.profile.res.scrap===1800&&tookCloud.profile.res.food===2200,'a newer cloud spend is not replaced by the stale local balance');
  ok(tookCloud.profile.troops.home===400&&tookCloud.profile.troops.queue.length===1,'cloud troop losses and training are kept');
  ok(tookCloud.profile.dr26.map(d=>d.km).sort().join()==='2.0,4.0','neither drive is erased when the cloud copy is newer');

  // Opposite direction: this device is the one that spent and lost troops. Cloud is the old full army.
  const fresh=shared();
  const moved=JSON.parse(JSON.stringify(fresh));
  moved.res.scrap=1800; moved.troops.home=400; moved.troops.queue=[{n:100,end:9}];
  moved.dr26=[{t0:8,t:9,km:'4.0',newHex:1}]; moved.stats={meters:4000,kills:0};
  S.recordChange(moved,'qa',5000);
  fresh.dr26=[{t0:1,t:2,km:'2.0',newHex:1}]; fresh.stats={meters:2000,kills:0};
  const tookLocal=S.uploadPlan(moved,fresh,2);
  ok(tookLocal.upload&&tookLocal.profile.res.scrap===1800&&tookLocal.profile.troops.home===400,'this device\'s newer spend and troop loss are not restored from the old cloud army');
  ok(tookLocal.profile.dr26.map(d=>d.km).sort().join()==='2.0,4.0','neither drive is erased when this device is newer');

  // Both spent. Do not invent a third balance and do not upload.
  let left=shared(), right=JSON.parse(JSON.stringify(left));
  left.res.scrap=2500; left.dr26=[{t0:1,t:2,km:'3.0',newHex:1}]; left.stats={meters:3000,kills:0};
  S.recordChange(left,'qa',3000);
  right.res.scrap=1800; right.troops.home=400; right.dr26=[{t0:5,t:6,km:'9.0',newHex:2}]; right.stats={meters:9000,kills:0}; right._rev=6;
  S.recordChange(right,'phone',3500);
  let conflictWrites=0;
  const conflict=await S.runCloudHandoff(left,{
    load:async()=>({rev:6,profile:right}),
    write:async()=>{conflictWrites++;}
  });
  ok(conflict.wrote===false&&conflictWrites===0&&conflict.local.res.scrap===2500&&conflict.local.troops.home===1000,'an ambiguous spend is not blended or uploaded');
  ok(conflict.held&&conflict.held.res.scrap===1800&&conflict.held.troops.home===400,'the other device\'s copy is kept aside');
  ok(conflict.local.dr26[0].km==='3.0'&&conflict.held.dr26[0].km==='9.0','each drive stays on its own copy');

  // Revision moves between the read and the write.
  const pending=spentLocal();
  let serverRev=2;
  const raced=await S.runCloudHandoff(pending,{
    load:async()=>({rev:serverRev,profile:cloud}),
    write:async()=>{serverRev=4;throw {code:'aborted',message:'revision moved'};}
  });
  ok(raced.wrote===false&&raced.rev===1&&pending.res.scrap===2574&&serverRev===4,'a rejected write leaves this device at revision 1 with its spent state');

  // Accepted save is what a second client reads back.
  let server=null;
  const accepted=await S.runCloudHandoff(spentLocal(),{
    load:async()=>server,
    write:async(doc)=>{server={rev:doc.rev,profile:JSON.parse(JSON.stringify(doc.profile))};}
  });
  ok(accepted.wrote&&server&&server.rev===2&&server.profile.res.scrap===2574&&server.profile.troops.home===1000&&server.profile.world.sh.upEnd===1793936908647,'a second client reads the accepted save, same balance, troops, and timer');

  let again=0;
  const same=await S.runCloudHandoff(server.profile,{
    load:async()=>server,
    write:async()=>{again++;}
  });
  ok(same.already===true&&same.wrote===false&&again===0&&same.rev===2,'the same revision and the same progress is not written again');
  let rejected=0;
  const newerFail=await S.runCloudHandoff(Object.assign(JSON.parse(JSON.stringify(server.profile)),{res:Object.assign({},server.profile.res,{scrap:1})}),{
    load:async()=>server,
    write:async()=>{rejected++;throw {code:'unavailable',message:'backend unavailable'};}
  });
  ok(newerFail.wrote===false&&newerFail.confirmedRev===2&&rejected===1&&/already on the server/.test(newerFail.report)&&!/still on this device/.test(newerFail.report),'a failed newer send still says cloud save 2 is already on the server');

  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',e);process.exit(1);});
