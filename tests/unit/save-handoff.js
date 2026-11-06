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
  ok(S.syncAllowed(t0,0)&&!S.syncAllowed(t0+1000,t0+S.SYNC_HOLD_MS)&&S.syncAllowed(t0+S.SYNC_HOLD_MS,t0+S.SYNC_HOLD_MS),'after quota exceeded the pull stays quiet for five minutes and then may try once');

  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',e);process.exit(1);});
