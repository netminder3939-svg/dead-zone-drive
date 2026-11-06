// Semantic troop state for the extracted 11o archive. No production Firebase.
const S=require('/tmp/11p-pack/ddd-v26-11p-flat/public/sync26.js');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const RES={scrap:2566,food:2855,water:2864,fuel:3000,parts:2992};
function prof(rev,troops,clock,ops,extra){
  return Object.assign({name:'QA-Test',lvl:1,hp:100,_rev:rev,res:{...RES},troops:troops,tiles:{},stronghold:{level:2},
    sync26:{clock:clock,ops:ops,legacyAt:{},snap:null}},extra||{});
}
const troop=(id)=>[{id:id+':1:troops',uid:id,n:1,k:'troops',t:1}];
const res=(id)=>[{id:id+':1:res',uid:id,n:1,k:'res',t:1,d:{scrap:-1}}];
function plan(a,b){return S.uploadPlan(a,b,b._rev);}
function blocked(p){return !p.upload&&/Both devices changed/.test(p.reason||'');}
const home={home:1000,queue:[],away:{}};
const empty=Object.assign({},home,{stationed:{},returning:[],wounded:0,healing:[],healFree:{day:'',n:0},gl25Seen:0,glSeen:1,cap26Seen:1,rec26:{h1:'1'}});
const A=()=>prof(34,home,{A:1},troop('A'));
const B=(troops,ops)=>prof(23,troops||home,{B:1},ops||troop('B'));
ok(S.gameEqual(A(),prof(34,empty,{A:1},troop('A'))),'empty containers and seen markers match a missing container');
ok(plan(A(),B()).upload===true&&plan(A(),B()).profile.troops.home===1000,'old troop journals with the same state do not conflict');
function both(ta,tb){return blocked(plan(prof(34,ta,{A:1},troop('A')),prof(23,tb,{B:1},troop('B'))));}
ok(both({home:1000,queue:[],away:{},stationed:{'1_1':{n:50,at:1,from:'2_2'}}},
        {home:1000,queue:[],away:{},stationed:{'8_8':{n:50,at:1,from:'2_2'}}}),'different station hex');
ok(both({home:1000,queue:[],away:{},stationed:{'1_1':{n:50,at:1,from:'2_2'}}},
        {home:1000,queue:[],away:{},stationed:{'1_1':{n:50,at:1,from:'9_9'}}}),'different station origin');
ok(both({home:1000,queue:[],away:{},returning:[{n:40,at:5,from:'1_1',why:'recalled'}]},
        {home:1000,queue:[],away:{},returning:[{n:40,at:5,from:'9_9',why:'recalled'}]}),'different return hex');
ok(both({home:1000,queue:[],away:{},returning:[{n:40,at:5,from:'1_1',why:'recalled'}]},
        {home:1000,queue:[],away:{},returning:[{n:40,at:5,from:'1_1',why:'beaten'}]}),'different return reason');
ok(both({home:1000,queue:[],away:{},returning:[{n:40,at:5,from:'1_1',why:'recalled'}]},
        {home:1000,queue:[],away:{},returning:[{n:40,at:90,from:'1_1',why:'recalled'}]}),'different return time');
ok(both({home:1000,queue:[{n:100,end:500}],away:{}},{home:1000,queue:[{n:100,end:900}],away:{}}),'different queue completion');
ok(both({home:1000,queue:[],away:{},healing:[{n:10,end:1}],wounded:10},{home:1000,queue:[],away:{},healing:[{n:10,end:80}],wounded:10}),'different healing completion');
ok(both({home:1000,queue:[],away:{},esc25:{e1:{n:20,to:'4_4',from:'1_1',end:8}}},
        {home:1000,queue:[],away:{},esc25:{e1:{n:20,to:'7_7',from:'1_1',end:8}}}),'different escort route');
ok(both({home:1000,queue:[],away:{},esc25:{e1:{n:20,to:'4_4',from:'1_1',end:8}}},
        {home:1000,queue:[],away:{},esc25:{e1:{n:20,to:'4_4',from:'1_1',end:40}}}),'different escort time');
ok(both({home:1000,queue:[],away:{}},{home:600,queue:[],away:{m1:400}}),'different home and away distribution');
ok(both({home:1000,queue:[],away:{},recalled:{m1:1}},{home:1000,queue:[],away:{},recalled:{m2:1}}),'different recalled march');
ok(S.gameEqual(prof(34,home,{A:1},[],{troops:Object.assign({},home,{rec26:{h1:'1'}})}),prof(34,home,{A:1},[],{troops:Object.assign({},home,{rec26:{h1:'9'}})})),'seen marker rec26 is not part of troop equality');
ok(S.gameEqual(prof(34,home,{A:1},[]),prof(34,home,{A:1},[],{cls:null}))&&S.gameEqual(prof(34,home,{A:1},[]),prof(34,home,{A:1},[],{cls:{}})),'a missing class and a null class are the same');
ok(blocked(plan(prof(34,Object.assign({},home,{wounded:8,healFree:{day:'2026-11-06',n:5}}),{A:1},troop('A')),prof(23,Object.assign({},home,{wounded:8,healFree:{day:'2026-11-06',n:0}}),{B:1},troop('B')))),'a used free-heal allowance is not the same as an unused one');
ok(S.gameEqual(prof(34,home,{A:1},[],{troops:Object.assign({},home,{healFree:{day:'',n:0}})}),prof(34,home,{A:1},[])),'an empty free-heal counter matches a missing one');
ok(S.gameEqual(prof(34,Object.assign({},home,{returning:[{n:40,at:90,from:'1_1',why:'recalled',st:1}]}),{A:1},[]),prof(34,Object.assign({},home,{returning:[{n:40,at:90,from:'1_1',why:'recalled',st:50}]}),{A:1},[])),'a different travel-start stamp is not a different arrival');
ok(blocked(plan(prof(34,home,{A:1},troop('A'),{cls:{id:'scout',next:'raider',nextT:1000}}),prof(23,home,{B:1},troop('B'),{cls:{id:'scout',next:'raider',nextT:5000}}))),'different class pending time');
ok(blocked(plan(prof(34,home,{A:1},res('A')),prof(23,home,{B:1},res('B')))),'resource journals still conflict');
ok(blocked(plan(A(),prof(23,{home:900,queue:[],away:{}},{B:1},troop('B')))),'1000 against 900 stays blocked');
const adopted=plan(prof(33,home,{A:1},[]),prof(34,{home:900,queue:[],away:{}},{B:1},troop('B')));
ok(adopted.upload===true&&adopted.profile.troops.home===900&&adopted.rev===34,'a newer remote spend is adopted');
const absorbed=plan(
  prof(34,{home:1000,queue:[{n:100,end:500}],away:{}},{A:2,B:2},[{id:'A:1:troops',uid:'A',n:1,k:'troops',t:1},{id:'B:1:troops',uid:'B',n:1,k:'troops',t:1}]),
  prof(23,{home:1000,queue:[{n:100,end:900}],away:{}},{A:2,B:2},[{id:'A:1:troops',uid:'A',n:1,k:'troops',t:1},{id:'B:1:troops',uid:'B',n:1,k:'troops',t:1}]));
ok(blocked(absorbed),'absorbed clocks do not make a different completion uploadable');
console.log(fail?fail+' failed':'all passed');
process.exit(fail?1:0);
