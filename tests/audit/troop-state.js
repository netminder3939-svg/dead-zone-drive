// 11n drops timing and origin, then uploadPlan returns the higher copy.
// 11o keeps place and time, and does not upload when that state differs.
const n11=require('/tmp/11n-pack/ddd-v26-11n-flat/public/sync26.js');
const nO=require('/tmp/11o-pack/ddd-v26-11o-flat/public/sync26.js');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const RES={scrap:2566,food:2855,water:2864,fuel:3000,parts:2992};
function prof(rev,troops,clock,ops,extra){
  return Object.assign({name:'QA-Test',lvl:1,_rev:rev,res:{...RES},troops:troops,tiles:{},stronghold:{level:2},
    sync26:{clock:clock,ops:ops,legacyAt:{},snap:null}},extra||{});
}
const op=(id,k)=>[{id:id+':1:'+k,uid:id,n:1,k:k,t:1}];
function planOf(S,a,b){return S.uploadPlan(a,b,b._rev);}
function blocks(S,a,b){const p=planOf(S,a,b);return !p.upload&&/Both devices changed/.test(p.reason||'');}
const home={home:1000,queue:[],away:{}};
const empty=Object.assign({},home,{stationed:{},returning:[],wounded:0,healing:[],healFree:{day:'',n:0},gl25Seen:0,glSeen:1,cap26Seen:1,rec26:{}});
const A=prof(34,home,{A:1},op('A','troops'));
const B=prof(23,home,{B:1},op('B','troops'));
ok(nO.gameEqual(A,prof(34,empty,{A:1},op('A','troops'))),'empty containers match the bare pile');
const same=planOf(nO,A,B);
ok(same.upload===true&&same.profile._rev===34&&same.profile.troops.home===1000,'equal state may keep the higher copy');
const q1={home:1000,queue:[{n:100,end:500}],away:{}};
const q2={home:1000,queue:[{n:100,end:900}],away:{}};
const Qa=prof(34,q1,{A:1},op('A','troops'));
const Qb=prof(23,q2,{B:1},op('B','troops'));
const n11q=planOf(n11,Qa,Qb);
ok(n11q.upload===true&&n11q.rev===34&&n11q.profile.troops.queue[0].end===500,'11n returns the higher copy for a different completion time');
ok(blocks(nO,Qa,Qb),'11o refuses a different completion time');
const backA={home:1000,queue:[],away:{},returning:[{n:40,at:5,from:'1_1',why:'recalled'}]};
const backB={home:1000,queue:[],away:{},returning:[{n:40,at:5,from:'9_9',why:'recalled'}]};
ok(!blocks(n11,prof(34,backA,{A:1},op('A','troops')),prof(23,backB,{B:1},op('B','troops')))&&blocks(nO,prof(34,backA,{A:1},op('A','troops')),prof(23,backB,{B:1},op('B','troops'))),'11o refuses a different return hex');
ok(blocks(nO,prof(34,{home:1000,queue:[],away:{}},{A:1},op('A','troops')),prof(23,{home:600,queue:[],away:{m1:400}},{B:1},op('B','troops'))),'home and away split stays blocked');
ok(blocks(nO,prof(34,{home:1000,queue:[],away:{},stationed:{'1_1':{n:50,at:1,from:'2_2'}}},{A:1},op('A','troops')),prof(23,{home:1000,queue:[],away:{},stationed:{'8_8':{n:50,at:1,from:'2_2'}}},{B:1},op('B','troops'))),'a different station hex stays blocked');
ok(blocks(nO,prof(34,{home:1000,queue:[],away:{},healing:[{n:10,end:1}],wounded:10},{A:1},op('A','troops')),prof(23,{home:1000,queue:[],away:{},healing:[{n:10,end:80}],wounded:10},{B:1},op('B','troops'))),'different healing time stays blocked');
ok(blocks(nO,prof(34,{home:1000,queue:[],away:{},esc25:{e1:{n:20,to:'4_4',from:'1_1',end:8}}},{A:1},op('A','troops')),prof(23,{home:1000,queue:[],away:{},esc25:{e1:{n:20,to:'7_7',from:'1_1',end:8}}},{B:1},op('B','troops'))),'a different escort route stays blocked');
ok(blocks(nO,A,prof(23,{home:900,queue:[],away:{}},{B:1},op('B','troops'))),'1000 against 900 stays blocked');
const absorbedA=prof(34,q1,{A:2,B:2},[{id:'A:1:troops',uid:'A',n:1,k:'troops',t:1},{id:'B:1:troops',uid:'B',n:1,k:'troops',t:1}]);
const absorbedB=prof(23,q2,{A:2,B:2},[{id:'A:1:troops',uid:'A',n:1,k:'troops',t:1},{id:'B:1:troops',uid:'B',n:1,k:'troops',t:1}]);
ok(blocks(nO,absorbedA,absorbedB),'absorbed clocks do not make a different completion time uploadable');
const resA=prof(34,home,{A:1},op('A','res'));
const resB=prof(23,home,{B:1},op('B','res'));
ok(blocks(nO,resA,resB),'resource journals still conflict');
const one=planOf(nO,prof(34,q1,{A:1},op('A','troops')),prof(23,q2,{B:1},[]));
ok(one.upload===true&&one.profile.troops.queue[0].end===500,'the device that changed the completion time is kept');
const cls=planOf(nO,prof(34,home,{A:1},op('A','troops'),{cls:{id:'scout',next:'raider',nextT:9}}),prof(23,home,{B:1},op('B','troops'),{cls:{id:'raider'}}));
ok(!cls.upload,'a different class is not uploaded over');
console.log(fail?fail+' failed':'all passed');
process.exit(fail?1:0);
