// Whole-profile handoff. Fake load/write only. No Firebase and no account.
const S=require('../../js/sync26.js');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const RES={scrap:230,food:236,water:213,fuel:83,parts:77};
function prof(rev,extra){
  return Object.assign({name:'pope',lvl:6,xp:10,hp:100,_rev:rev,_savedAt:1000,
    res:{scrap:412,food:330,water:227,fuel:90,parts:78},
    tiles:{a:{t:1},b:{t:1}},troops:{home:1000,queue:[],away:{},wounded:0},
    world:{sh:{hex:'1_1',state:'up'},barracks:{level:1},outposts:{},towers:{}},
    pipeUnlock26:{},stats:{meters:10,kills:0},stronghold:{level:6},
    sync26:{clock:{},ops:[],legacyAt:{}}},extra||{});
}
function phone(){
  return prof(284,{res:{...RES},troops:{home:1900,queue:[{n:20,end:9}],away:{},wounded:0,healing:[{n:10,end:8}]},
    tiles:{a:{t:1}},world:{sh:{hex:'1_1',state:'up'},barracks:{level:1},towers:{},outposts:{H:{state:'up',hpPct:1}}},
    pipeUnlock26:{site:1},xp:40});
}
let server=null,writes=0;
function io(local,opt){
  return Object.assign({
    arm:true,tab:opt.tab,background:!!opt.background,
    load:async()=>server?{rev:server.rev,profile:JSON.parse(JSON.stringify(server.profile))}:null,
    write:async(doc)=>{writes++;server={rev:doc.rev,baseRev:doc.baseRev,v:doc.v,profile:JSON.parse(JSON.stringify(doc.profile))};}
  },opt||{});
}
(async()=>{
  ok(S.gameEqual(phone(),prof(284))===false,'an outpost is part of the profile comparison');
  const buildingOnly=prof(1,{world:{sh:{hex:'1_1',state:'up'},barracks:{level:1},towers:{},outposts:{H:{state:'capturing',hpPct:1}}}});
  const plain=prof(1);
  ok(S.progressEqual(buildingOnly,plain)===false,'a building with the same resources is not the same save');

  // Phone plays first: outpost and the spent balance are what the desktop must adopt.
  writes=0;server=null;
  let ph=phone();ph._rev=1;ph.res={...RES};
  S.notePlay(ph);
  let r=await S.runCloudHandoff(ph,io(ph,{tab:'phone'}));
  ok(r.wrote&&r.rev===2&&writes===1&&server.v===3&&server.profile.world.outposts.H.state==='up'&&server.profile.res.scrap===230,'the phone save is acknowledged with the outpost and the spent scrap');
  ok(server.baseRev===0,'the write names the revision it was based on');

  // Desktop was a stale higher balance. It must adopt, not write those resources back.
  writes=0;
  let desk=prof(1,{_tab:'phone'});
  r=await S.runCloudHandoff(desk,io(desk,{tab:'desk'}));
  ok(r.adopt&&r.wrote===false&&writes===0&&r.local.res.scrap===230&&r.local.world.outposts.H&&r.local.troops.home===1900&&r.local.pipeUnlock26.site===1&&r.local.xp===40,'the desktop adopts the whole phone profile and does not write');

  // Round trip back to the phone. Same save, no second grant.
  writes=0;
  ph=server.profile;
  r=await S.runCloudHandoff(JSON.parse(JSON.stringify(ph)),io(ph,{tab:'phone'}));
  ok(r.already&&writes===0&&r.rev===2,'reopening the phone does not write again');

  // Stale desktop tab gains income and must not put the spent scrap back.
  writes=0;
  desk=JSON.parse(JSON.stringify(server.profile));
  desk.res.scrap=999;desk._tab='phone';
  r=await S.runCloudHandoff(desk,io(desk,{tab:'desk'}));
  ok(r.adopt&&writes===0&&r.local.res.scrap===230,'a stale tab adopts the saved balance instead of re-crediting scrap');

  // The phone, which owns the save, can record a real income tick.
  writes=0;
  ph=JSON.parse(JSON.stringify(server.profile));
  ph.res.food+=5;
  r=await S.runCloudHandoff(ph,io(ph,{tab:'phone'}));
  ok(r.wrote&&server.profile.res.food===241&&server.profile.world.outposts.H,'the device that owns the save can persist a later change without dropping the outpost');

  // Hiding that device does not upload a passive tick.
  writes=0;
  ph=JSON.parse(JSON.stringify(server.profile));
  ph.res.food+=5;
  r=await S.runCloudHandoff(ph,io(ph,{tab:'phone',background:true}));
  ok(r.wrote===false&&writes===0&&r.why==='background','hiding the app does not upload a passive change');

  // Building-only change on the owner, resources unchanged from the server.
  writes=0;
  ph=JSON.parse(JSON.stringify(server.profile));
  ph.world.towers={T:{state:'up',hpPct:1}};
  r=await S.runCloudHandoff(ph,io(ph,{tab:'phone'}));
  ok(r.wrote&&server.profile.world.towers.T.state==='up'&&server.profile.res.scrap===ph.res.scrap,'a tower with no resource change is in the next save');

  // Both devices changed after the acknowledged save. Neither is blended.
  const base=JSON.parse(JSON.stringify(server.profile));
  let left=JSON.parse(JSON.stringify(base));
  S.notePlay(left);left.res.scrap-=10;left._userEdit=left._userBase+1;
  let right=JSON.parse(JSON.stringify(base));
  S.notePlay(right);right.res.scrap-=30;right.troops.home=400;
  writes=0;
  r=await S.runCloudHandoff(left,io(left,{tab:'phone'}));
  ok(r.wrote&&server.profile.res.scrap===base.res.scrap-10,'the first real edit is written');
  writes=0;
  r=await S.runCloudHandoff(right,{arm:true,tab:'desk',load:async()=>({rev:server.rev,profile:JSON.parse(JSON.stringify(server.profile))}),write:async()=>{writes++;}});
  ok(r.wrote===false&&writes===0&&r.why==='dirty-behind'&&r.local.res.scrap===base.res.scrap-30&&r.local.troops.home===400,'a second device with its own edit does not upload or take the other balance');

  // Failed read leaves the local outpost and balance alone.
  writes=0;
  ph=phone();ph._rev=2;ph._handoff=1;ph._ackedRev=2;ph._tab='phone';
  r=await S.runCloudHandoff(ph,{arm:true,tab:'phone',load:async()=>{throw {code:'unavailable',message:'offline'};},write:async()=>{writes++;}});
  ok(r.wrote===false&&r.adopt===false&&writes===0&&r.why==='load-error'&&r.local.world.outposts.H&&r.rev===2&&!/Safe to switch/.test(r.report),'a failed read does not adopt and does not say the save succeeded');

  // Failed write does not advance the revision.
  writes=0;server={rev:2,profile:prof(2)};
  ph=phone();ph._rev=2;ph._handoff=1;ph._ackedRev=2;ph._tab='phone';ph._userBase=0;S.notePlay(ph);
  r=await S.runCloudHandoff(ph,{arm:true,tab:'phone',load:async()=>server,write:async()=>{writes++;throw {code:'resource-exhausted',message:'Quota exceeded.'};}});
  ok(r.wrote===false&&r.quota&&writes===1&&r.rev===2&&r.local.res.scrap===230&&!/Safe to switch/.test(r.report),'a rejected write is not a success and does not move the local revision');

  // Legacy higher revision must not delete a live outpost.
  writes=0;
  const legacyPhone=phone();
  const legacyDesk=prof(460);
  r=await S.runCloudHandoff(legacyPhone,{load:async()=>({rev:460,profile:legacyDesk}),write:async()=>{writes++;}});
  ok(r.wrote===false&&writes===0&&r.why==='building'&&r.local.world.outposts.H,'a higher revision without the outpost is not written over the device that has it');

  // Troop loss on the owner replaces the old home count and does not add them back.
  writes=0;server=null;
  let army=prof(1,{troops:{home:1000,queue:[],away:{},wounded:200}});
  army._rev=1;
  r=await S.runCloudHandoff(army,io(army,{tab:'phone'}));
  army=JSON.parse(JSON.stringify(server.profile));
  army.troops={home:600,queue:[],away:{east:50},wounded:80,healing:[{n:40,end:3}]};
  r=await S.runCloudHandoff(army,io(army,{tab:'phone'}));
  ok(r.wrote&&server.profile.troops.home===600&&server.profile.troops.wounded===80&&server.profile.troops.away.east===50,'a troop loss, a march, and healing replace the old disposition');
  desk=prof(1,{_tab:'phone',troops:{home:1000,queue:[],away:{},wounded:0}});
  desk._ackedRev=1;desk._handoff=1;
  writes=0;
  r=await S.runCloudHandoff(desk,io(desk,{tab:'desk'}));
  ok(r.adopt&&r.local.troops.home===600&&writes===0,'the other device receives the loss and does not restore the old army');

  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
