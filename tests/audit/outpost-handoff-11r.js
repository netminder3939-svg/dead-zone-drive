// Outpost vs tiles on the current 11r adopt rules. No browser, no Firebase, no account.
const fs=require('fs');
const S=require('/tmp/11r-pack/ddd-v26-11r-flat/public/sync26.js');
const v26i=fs.readFileSync('/tmp/11r-pack/ddd-v26-11r-flat/public/v26i.js','utf8');
const stage2=fs.readFileSync('/tmp/11r-pack/ddd-v26-11r-flat/public/stage2.js','utf8');
const march=fs.readFileSync('/tmp/11r-pack/ddd-v26-11r-flat/public/march.js','utf8');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const RES={scrap:2566,food:2855,water:2864,fuel:3000,parts:2992};
function base(rev,extra){
  return Object.assign({name:'QA-Test',lvl:1,xp:0,sp:0,hp:100,_rev:rev,res:{...RES},tiles:{},
    troops:{home:1000,queue:[],away:{}},stronghold:{level:6},
    world:{sh:{hex:'1_1',state:'up',hpPct:1},barracks:{level:1},outposts:{},towers:{}},
    stats:{meters:0,kills:0},contrib:{kills:0,badges:0,raids:0,hexes:0,deposited:0,withdrawn:0,km:0},
    sync26:{clock:{},ops:[],legacyAt:{}}},extra||{});
}
const COPY=['res','troops','world','dr26','tiles','stats','badges','pipeUnlock26','sync26','stronghold','lvl','xp','sp','skills','contrib'];
function restEqual(a,b){const x=JSON.parse(JSON.stringify(a)),y=JSON.parse(JSON.stringify(b));x.hp=0;y.hp=0;return S.gameEqual(x,y);}
// The 11r branch: same tiles and the same compared progress do not copy world.
function adopt(local,remote,remoteRev){
  const tilesSame=JSON.stringify(local.tiles||{})===JSON.stringify(remote.tiles||{});
  if(tilesSame&&restEqual(remote,local)){
    if(remoteRev>(local._rev||0))return {copied:false,why:'newer-but-equal-skip',local};
    return {copied:false,why:'equal-skip',local};
  }
  const plan=S.uploadPlan(local,remote,remoteRev);
  if(!plan.upload)return {copied:false,why:'conflict',local};
  if(!restEqual(local,plan.profile)){
    const next=JSON.parse(JSON.stringify(local));
    for(const k of COPY)if(plan.profile[k]!==undefined)next[k]=plan.profile[k];
    next._rev=Math.max(local._rev||0,plan.rev||0);
    return {copied:true,why:'field-copy',local:next};
  }
  return {copied:false,why:'plan-equal',local};
}
function syncOwned(tiles,terr,uid){
  const out={...tiles};let n=0;
  for(const [id,o] of Object.entries(terr)){
    if(!o||o.ai||o.released||o.uid!==uid)continue;
    if(!out[id]){out[id]={t:o.t||1};n++;}
  }
  return {tiles:out,added:n,outposts:null};
}

const tiles={H:{t:1},A:{t:1},B:{t:1}};
const phone=base(82,{tiles,res:{...RES,scrap:2400},world:{sh:{hex:'1_1',state:'up',hpPct:1},barracks:{level:1},towers:{},outposts:{H:{state:'up',hpPct:1,start:1,endsAt:2}}}});
const computer=base(29,{tiles,world:{sh:{hex:'1_1',state:'up',hpPct:1},barracks:{level:1},towers:{},outposts:{}}});
ok(S.gameEqual(phone,computer)===false,'different resources are not the same progress');
ok(restEqual(Object.assign({},phone,{res:{...RES}}),computer)===true,'an outpost alone is not part of the compared progress');
const skipped=adopt(computer,Object.assign({},phone,{res:{...RES}}),82);
ok(skipped.copied===false&&skipped.why==='newer-but-equal-skip'&&Object.keys(skipped.local.world.outposts).length===0&&skipped.local.tiles.H,'same tiles and a newer phone still leave the computer without the outpost');
const pulled=adopt(computer,phone,82);
ok(pulled.copied&&pulled.local.world.outposts.H&&pulled.local.world.outposts.H.state==='up'&&pulled.local.tiles.H&&pulled.local.res.scrap===2400,'when resources differ and the phone is newer, the copy brings the outpost, the tiles, and the resources together');
const stale=adopt(base(157,{tiles}),phone,82);
ok(stale.copied===false&&Object.keys(stale.local.world.outposts).length===0,'a computer revision above the phone does not take the phone outpost');
const mapOnly=syncOwned({},{'H':{uid:'phone',t:5,ai:false},'A':{uid:'phone',t:5}},'phone');
ok(mapOnly.added===2&&mapOnly.tiles.H&&mapOnly.outposts===null,'the shared territory map restores tiles and does not create an outpost');
ok(/pay\(c\);w\.outposts\[id\]=/.test(stage2)&&/claimTile\(id\);\s*save\(\)/.test(stage2),'the profile save is after both the payment and the outpost record');
ok(/NET\.claimHex\(id/.test(fs.readFileSync('/tmp/11r-pack/ddd-v26-11r-flat/public/world.js','utf8')),'a claimed hex is also written to the shared territory feed');
ok(/function syncOwned\(\)[\s\S]*P\.tiles\[id\]=\{t:o\.t/.test(march)&&!/outposts\[id\]/.test(march.slice(march.indexOf('function syncOwned'),march.indexOf('function syncOwned')+400)),'syncOwned fills tiles only');
ok(/worldSh:o&&o\.world&&o\.world\.sh/.test(fs.readFileSync('/tmp/11r-pack/ddd-v26-11r-flat/public/sync26.js','utf8'))&&!/outposts/.test(fs.readFileSync('/tmp/11r-pack/ddd-v26-11r-flat/public/sync26.js','utf8')),'the compare sees the stronghold and not outposts');
ok(/\['res','troops','world','dr26','tiles'/.test(v26i),'a real copy includes world and tiles in the same list');
console.log(fail?fail+' failed':'all passed');
process.exit(fail?1:0);
