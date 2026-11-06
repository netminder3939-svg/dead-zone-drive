// Real stepRaid / runRaidSteps. A serial commit stands in for a Firestore transaction.
// A dropped chunk is a thrown commit, not a claim about the live network.
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../../js/net.js'),'utf8');
function sliceFn(name){
  const re=name==='runRaidSteps'?/async function runRaidSteps/:new RegExp('function '+name);
  const i=src.search(re);
  if(i<0)throw new Error('missing '+name);
  let depth=0,seen=false;
  for(let j=src.indexOf('{',i);j<src.length;j++){
    if(src[j]==='{'){depth++;seen=true;}
    else if(src[j]==='}'){depth--;if(seen&&depth===0)return src.slice(i,j+1);}
  }
  throw new Error('unclosed '+name);
}
const api=eval('(function(){'+['raidChunks','foldRaidHit','stepRaid','settleRaidBlow'].map(sliceFn).join('\n')+'\n'+sliceFn('runRaidSteps')+'\nreturn {stepRaid:stepRaid,runRaidSteps:runRaidSteps,settleRaidBlow:settleRaidBlow};})()');
const stepRaid=api.stepRaid,runRaidSteps=api.runRaidSteps,settleRaidBlow=api.settleRaidBlow;
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
function boss(hp){return {hp:hp,maxHp:hp,done:false,won:false,endsAt:Date.now()+3600000,participants:{}};}
function apply(raid,step){
  if(!step.write)return;
  raid.hp=step.patch.hp;raid.done=step.patch.done;raid.won=step.patch.won;
  const key=Object.keys(step.patch).find(k=>k.indexOf('participants.')===0);
  raid.participants[key.slice('participants.'.length)]=step.patch[key];
}
function store(raid){
  const commits=[];
  return {raid:raid,commits:commits,async tx(fn){const step=fn(JSON.parse(JSON.stringify(raid)));if(step.write){apply(raid,step);commits.push(step.applied);}return step;}};
}
const extra={name:'QA',hp:10,max:100,taken:4,heal:1};

(async()=>{
  // Drop the connection after the first committed chunk, then retry the same fight.
  const s1=store(boss(4000));
  let drops=1;
  const flaky=async function(fn){const step=fn(JSON.parse(JSON.stringify(s1.raid)));if(step.write){if(drops>0){drops--;apply(s1.raid,step);s1.commits.push(step.applied);throw new Error('closed');}}return step;};
  const mid=await runRaidSteps(flaky,'alice','QA','fight-1',4000,extra,1500);
  ok(mid.complete===false&&mid.error===true&&s1.raid.hp===2500,'a drop after the first chunk leaves 2500 and is not a finished blow');
  ok(s1.raid.participants.alice.fights===1&&s1.raid.participants.alice.dmg===1500,'that chunk counted one fight and 1500 damage');
  const rest=await runRaidSteps(s1.tx.bind(s1),'alice','QA','fight-1',4000,extra,1500);
  ok(rest.complete===true&&s1.raid.hp===0&&s1.raid.participants.alice.dmg===4000&&s1.raid.participants.alice.fights===1,'the same fight finishes at 0 without a second fight or a second 4000');
  const again=await runRaidSteps(s1.tx.bind(s1),'alice','QA','fight-1',4000,extra,1500);
  ok(again.complete===true&&s1.raid.participants.alice.dmg===4000&&s1.commits.length===3,'replaying the finished fight writes nothing more');

  // Two callers, one fight id, transactions one at a time.
  const s2=store(boss(4000));
  let gate=Promise.resolve();
  const queued=function(fn){const run=gate.then(function(){return s2.tx(fn);});gate=run.then(function(){},function(){});return run;};
  const both=await Promise.all([
    runRaidSteps(queued,'alice','QA','fight-2',4000,extra,1500),
    runRaidSteps(queued,'alice','QA','fight-2',4000,extra,1500)
  ]);
  ok(both.every(function(r){return r.complete;})&&s2.raid.hp===0&&s2.raid.participants.alice.dmg===4000&&s2.raid.participants.alice.fights===1,'two tabs of one fight deal 4000 once');

  // A second fight id while the first is open does not add damage.
  const s3=store(boss(9000));
  await runRaidSteps(async function(fn){const step=fn(JSON.parse(JSON.stringify(s3.raid)));if(step.write){apply(s3.raid,step);if(s3.raid.hp===7500)throw new Error('closed');}return step;},'alice','QA','fight-3',4000,extra,1500);
  const other=await runRaidSteps(s3.tx.bind(s3),'alice','QA','fight-9',4000,extra,1500);
  ok(other.busy===true&&s3.raid.hp===7500&&s3.raid.participants.alice.dmg===1500,'a second tab with a new id waits and does not add damage');

  // Boss already dead.
  const s4=store(boss(6000));s4.raid.hp=0;s4.raid.done=true;s4.raid.won=true;
  const dead=await runRaidSteps(s4.tx.bind(s4),'alice','QA','fight-4',6000,extra,1500);
  ok(dead.alreadyDead===true&&dead.complete===false&&s4.raid.hp===0&&s4.commits.length===0,'an already dead boss takes no damage');

  // Someone else kills the boss between our chunks.
  const s5=store(boss(7200));
  await runRaidSteps(async function(fn){const step=fn(JSON.parse(JSON.stringify(s5.raid)));if(step.write){apply(s5.raid,step);s5.raid.hp=0;s5.raid.done=true;s5.raid.won=true;throw new Error('closed');}return step;},'alice','QA','fight-5',7200,extra,1500);
  const stopped=await runRaidSteps(s5.tx.bind(s5),'alice','QA','fight-5',7200,extra,1500);
  ok(stopped.complete===false&&stopped.alreadyDead===true&&s5.raid.participants.alice.dmg===1500&&s5.raid.participants.alice.fights===1,'a boss killed mid-blow does not take the rest of the fight');

  // Two players. Each has their own fight. The boss takes the sum, not a double of either.
  const s6=store(boss(4000));
  await runRaidSteps(s6.tx.bind(s6),'alice','QA','a-1',2000,extra,1500);
  await runRaidSteps(s6.tx.bind(s6),'bob','Bob','b-1',2000,Object.assign({},extra,{name:'Bob'}),1500);
  ok(s6.raid.hp===0&&s6.raid.participants.alice.dmg===2000&&s6.raid.participants.bob.dmg===2000&&s6.raid.participants.alice.fights===1&&s6.raid.participants.bob.fights===1,'two players split 4000 without doubling either blow');

  // A transaction callback that runs twice on one snapshot commits once.
  const s7=store(boss(4000));
  const snap=JSON.parse(JSON.stringify(s7.raid));
  const a=stepRaid(snap,'alice','QA','fight-7',4000,extra,1500);
  const b=stepRaid(snap,'alice','QA','fight-7',4000,extra,1500);
  apply(s7.raid,a);
  ok(a.applied===b.applied&&a.patch.hp===b.patch.hp&&s7.raid.hp===2500&&s7.raid.participants.alice.dmg===1500,'replaying one uncommitted step does not stack');

  const no=settleRaidBlow({complete:false,fightId:'fight-1',settled:{},alreadyJoined:false,ko:true});
  ok(!no.apply&&!no.charge&&!no.join,'an unfinished blow does not change HP, scrap, or the join reward');
  const yes=settleRaidBlow({complete:true,fightId:'fight-1',settled:{},alreadyJoined:false,ko:true});
  const twice=settleRaidBlow({complete:true,fightId:'fight-1',settled:{'fight-1':1},alreadyJoined:true,ko:true});
  ok(yes.apply&&yes.charge&&yes.join,'a finished knockout charges and joins once');
  ok(!twice.apply&&!twice.charge&&!twice.join,'settling that same fight again charges nothing');

  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(function(e){console.error('HARNESS',e);process.exit(1);});
