// Acceptance tests for the two ddd-v26-11 fixes. No Firebase, no browser, deterministic.
const S=require('../../js/sync26.js');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const RES={scrap:0,food:0,water:0,fuel:0,parts:0};
function prof(o){
  const p={name:'pope',uid:'u',lvl:5,xp:40,sp:4,skills:{},hp:100,
    res:{...RES,scrap:100,food:80,water:70,fuel:10,parts:8},
    tiles:{a:{t:1}},badges:{b1:1},pipeUnlock26:{s1:1},dr26:[],
    stats:{meters:10000,kills:2},contrib:{hexes:1,badges:1,km:10},
    troops:{home:892,away:{},stationed:{},returning:[],queue:[]},
    claimDay:{d:'2026-11-05',n:10},marchDone:{},marchPaid:{},
    stronghold:{level:1},world:{sh:{hex:'a',state:'up'},barracks:{level:1}},
    _savedAt:1000};
  for(const k in o)p[k]=o[k];
  return p;
}
function tiles(ids,t){const o={};ids.forEach((id,i)=>o[id]={t:t||i+1});return o;}

// ---- old score gate: a real drive is far below the 100,000-point upload block ----
function score26(o){
  const b=Object.keys(o.badges||{}).length,u=Object.keys(o.pipeUnlock26||{}).length,d=(o.dr26||[]).length;
  const m=Math.floor(((o.stats&&o.stats.meters)||0)/100),t=Math.min(Object.keys(o.tiles||{}).length,5000);
  return (o.lvl||1)*1e9+(o.xp||0)*1e5+b*1e4+u*1e3+d*100+m+t;
}
const before=prof({tiles:tiles(['a']),stats:{meters:32400,kills:2},dr26:[{restored:1,km:'32.4',newHex:3,t:1,t0:1}]});
const afterDrive=prof({tiles:tiles(['a','b','c']),stats:{meters:47500,kills:2},
  dr26:[{restored:1,km:'32.4',newHex:3,t:1,t0:1},{km:'15.1',newHex:64,t:200,t0:100}]});
ok(score26(afterDrive)-score26(before)<1e5,'a finished drive is under the old 100k score block');

// ---- repro: phone drive, desktop has the seeded summary and a newer timestamp ----
const phone=prof({uid:'7qg8',_savedAt:2000,
  tiles:tiles(['home','h2','h3']),
  stats:{meters:47500,kills:4},
  dr26:[{km:'15.1',newHex:64,t:5000,t0:4000,own:74}],
  res:{...RES,scrap:173,food:90,water:60,fuel:12,parts:9},
  troops:{home:500,away:{m1:392},stationed:{},returning:[],queue:[]}});
const desk=prof({uid:'vXcZ',_savedAt:9000,xp:80,
  tiles:tiles(['home']),
  stats:{meters:32400,kills:2},
  dr26:[{restored:1,km:'32.4',newHex:30,t:1500,t0:1400}],
  res:{...RES,scrap:258,food:180,water:155,fuel:10,parts:26},
  troops:{home:0,away:{},stationed:{conoco:{n:892,at:1}},returning:[],queue:[]}});
const synced=S.merge(desk,phone,{uid:'vXcZ',remoteUid:'7qg8',now:10000});
ok(synced.changed,'desktop adopts the phone drive');
ok(synced.profile.troops.home===500&&synced.profile.troops.away.m1===392,'troop split is the phone assignment, not 892 on the van');
ok(synced.profile.troops.home+synced.profile.troops.away.m1===892,'troops are not duplicated');
ok(!synced.profile.troops.stationed.conoco,'stale van escort does not come back on top of the march');
ok(synced.profile.tiles.h2&&synced.profile.tiles.h3&&synced.profile.tiles.home,'new hexes are kept');
ok(synced.profile.dr26.some(r=>r.km==='15.1'&&!r.restored),'real 15.1 km recap is kept');
ok(synced.profile.dr26.filter(r=>r.km==='15.1').length===1,'recap is not duplicated');
ok(synced.profile.res.scrap===173,'drive resources come from the phone, not the sum');
ok((synced.profile.lvl>desk.lvl)||synced.profile.xp>=desk.xp,'higher xp is not thrown away');

// stale timestamp must not beat a richer land save (the bad desktop upload)
ok(S.landAhead(phone,desk),'phone land is ahead of the stale desktop');
const again=S.merge(synced.profile,phone,{uid:'vXcZ',remoteUid:'7qg8',now:11000});
ok(!again.changed,'refreshing the same pair does not change the save again');
ok(again.profile.troops.home===500&&again.profile.troops.away.m1===392,'refresh does not duplicate troops');
ok(again.profile.dr26.filter(r=>!r.restored&&r.km==='15.1').length===1,'refresh does not duplicate the recap');

// equal-length lists: old rule kept the local restored row and dropped the real one
const localList=desk.dr26,remoteList=phone.dr26;
const oldPick=localList.length>=remoteList.length?localList:remoteList;
ok(oldPick===localList&&!oldPick.some(r=>r.km==='15.1'),'old length rule drops the real recap when lengths match');
ok(synced.profile.dr26.some(r=>r.km==='15.1'),'new union keeps the real recap anyway');

// ---- desktop spend + reassign, then the phone opens ----
const phoneIdle=prof({uid:'7qg8',_savedAt:1000,res:{...RES,scrap:100,food:80,water:70,fuel:10,parts:8},
  troops:{home:892,away:{},stationed:{},returning:[],queue:[]}});
const deskSpend=prof({uid:'vXcZ',_savedAt:3000,res:{...RES,scrap:40,food:80,water:70,fuel:10,parts:8},
  troops:{home:0,away:{},stationed:{conoco:{n:892,at:1}},returning:[],queue:[]}});
const spent=S.merge(phoneIdle,deskSpend,{uid:'7qg8',remoteUid:'vXcZ',now:4000});
ok(spent.profile.res.scrap===40,'a later spend is kept');
ok(spent.profile.res.scrap!==180,'spend is not undone by adding the two resource piles');
ok(spent.profile.troops.stationed.conoco.n===892&&spent.profile.troops.home===0,'phone sees the desktop assignment');
ok((spent.profile.troops.home||0)+(spent.profile.troops.stationed.conoco.n||0)===892,'assignment does not create a second army');

// same progress, nothing to do
const twin=S.merge(phoneIdle,prof({...phoneIdle,uid:'vXcZ',_savedAt:1000}),{uid:'7qg8',now:5000});
ok(!twin.changed&&twin.mode==='equal','identical saves are left alone');

// ---- a loss stays a loss once both saves carry clocks ----
const lost=prof({uid:'7qg8',tiles:{a:{t:1}},sync26:{clock:{'7qg8':2,'vXcZ':1},ops:[],legacyAt:{},snap:null}});
const older=prof({uid:'vXcZ',tiles:{a:{t:1},b:{t:2}},sync26:{clock:{'7qg8':1,'vXcZ':1},ops:[],legacyAt:{},snap:null}});
const keptLoss=S.merge(lost,older,{uid:'7qg8',remoteUid:'vXcZ',now:6000});
ok(keptLoss.mode==='A'&&keptLoss.profile.tiles.a&&!keptLoss.profile.tiles.b,'a newer clock keeps a lost hex lost');

// ---- offline concurrent journals: deltas add once, troops do not ----
function withSnap(p){p.sync26=p.sync26||{clock:{'7qg8':1,'vXcZ':1},ops:[],legacyAt:{}};p.sync26.snap=S.snapOf(p);return p;}
const p0=withSnap(prof({uid:'7qg8',res:{...RES,scrap:100,food:50,water:50,fuel:5,parts:5},troops:{home:100,away:{},stationed:{},returning:[],queue:[]},tiles:{a:{t:1}}}));
const d0=withSnap(prof({uid:'vXcZ',res:{...RES,scrap:100,food:50,water:50,fuel:5,parts:5},troops:{home:100,away:{},stationed:{},returning:[],queue:[]},tiles:{a:{t:1}},sync26:p0.sync26}));
const p1=JSON.parse(JSON.stringify(p0));p1.res.scrap=80;p1._savedAt=7000;S.recordChange(p1,'7qg8',7000);
const d1=JSON.parse(JSON.stringify(d0));d1.res.scrap=130;d1.tiles.c={t:8};d1._savedAt=7100;S.recordChange(d1,'vXcZ',7100);
const both=S.merge(p1,d1,{uid:'7qg8',remoteUid:'vXcZ',now:7200});
ok(both.mode==='concurrent','diverged clocks are concurrent');
ok(both.profile.res.scrap===110,'spend -20 and loot +30 meet at 110, not 210 or 130');
ok(both.profile.tiles.a&&both.profile.tiles.c,'the other device\'s new hex is added once');
ok(both.profile.troops.home===100,'untouched troop counts are not doubled');

const p2=JSON.parse(JSON.stringify(p1));p2.troops={home:40,away:{m:60},stationed:{},returning:[],queue:[]};S.recordChange(p2,'7qg8',7300);
const d2=JSON.parse(JSON.stringify(d1));d2.troops={home:70,away:{},stationed:{q:{n:30}},returning:[],queue:[]};S.recordChange(d2,'vXcZ',7400);
const troops=S.merge(p2,d2,{uid:'7qg8',remoteUid:'vXcZ',now:7500});
const home=troops.profile.troops.home||0;
const away=Object.values(troops.profile.troops.away||{}).reduce((s,n)=>s+(n||0),0);
const st=Object.values(troops.profile.troops.stationed||{}).reduce((s,x)=>s+((x&&x.n)||0),0);
ok(home+away+st===100,'concurrent troop edits keep one army, not the sum');

// ---- claim march: pipeline guard is not ownership; defenders stop; each hex once ----
const line=S.hexLine('0_0','9_0');
ok(line.length===10&&line[0]==='0_0'&&line[9]==='9_0','a 9-hex route has 10 cells including the start');
for(let i=1;i<line.length;i++)ok(S.hexDist(line[i-1],line[i])===1,'step '+i+' is exactly one hex');
const guarded=new Set(line);
const owned=new Set(['1_0']);
const ally=new Set(['2_0']);
const fort=new Set(['3_0']);
const plan=S.planClaimRoute('0_0','9_0',{
  owned:id=>owned.has(id),ally:id=>ally.has(id),fort:id=>fort.has(id),
  defender:id=>id==='8_0'?{win:false,name:'Rad Rat'}:null,
  room:Infinity
});
ok(plan.claim.join(',')==='4_0,5_0,6_0,7_0','open hexes before the loss are claimed, and only those');
ok(plan.claim.length===new Set(plan.claim).size,'no hex is claimed twice');
ok(plan.skip.some(s=>s.id==='1_0'&&s.why==='already yours'),'owned hex is skipped with a reason');
ok(plan.skip.some(s=>s.id==='2_0'&&/ally/.test(s.why)),'ally hex is skipped with a reason');
ok(plan.skip.some(s=>s.id==='3_0'&&/fort/.test(s.why)),'enemy fort is reported, not taken');
ok(plan.stop&&plan.stop.id==='8_0'&&/Rad Rat/.test(plan.stop.why),'defenders stop the march and the reason is kept');
ok(!plan.claim.includes('9_0'),'hexes past the loss are not taken');
ok(guarded.has('4_0')&&plan.claim.includes('4_0'),'a guarded pipeline hex is still claimable when nobody owns it');
const allPipe=S.planClaimRoute('0_0','9_0',{owned:()=>false,ally:()=>false,fort:()=>false,defender:()=>null,room:Infinity});
const crossed=S.crossedHexes('0_0','4_-2',function(t){return t<0.99?'0_0':'4_-2';});
ok(crossed[0]==='0_0'&&crossed[crossed.length-1]==='4_-2'&&crossed.length>2,'a route that only sampled the ends still includes the hexes between');
for(let i=1;i<crossed.length;i++)ok(S.hexDist(crossed[i-1],crossed[i])===1,'crossed step '+i+' is one hex');
ok(crossed.includes('2_-1')||crossed.includes('1_0')||crossed.includes('2_0'),'an intermediate hex is on the route, not only the destination');
ok(allPipe.claim.length===9&&allPipe.stop==null,'a whole unowned 9-hex route is claimed, not returned empty');
ok(allPipe.claim[0]==='1_0'&&allPipe.claim.includes('4_0')&&allPipe.claim.includes('8_0')&&allPipe.claim[8]==='9_0','every crossed hex is claimed, not only the destination');
ok(S.explainClaim(allPipe).indexOf('Claimed 9')===0,'the report says how many hexes were claimed');
const none=S.planClaimRoute('0_0','3_0',{owned:()=>true,ally:()=>false,fort:()=>false,room:Infinity});
ok(none.claim.length===0&&/Skipped 3/.test(S.explainClaim(none)),'a route you already own reports the skips instead of a silent zero');
const capped=S.planClaimRoute('0_0','4_0',{owned:()=>false,ally:()=>false,fort:()=>false,room:2});
ok(capped.claim.length===2&&capped.stop&&/daily claim limit/.test(capped.stop.why),'the daily cap stops the march and says so');

// cross-device while the march is out: the sender resolves; the other device waits, then can finish it once
const march={uid:'7qg8',state:'out',startT:0,dur:1000};
ok(S.aliasMayResolve(march,500,'7qg8',15000),'the phone that sent the march resolves it');
ok(!S.aliasMayResolve(march,500,'vXcZ',15000),'the computer does not resolve during the grace window');
ok(S.aliasMayResolve(march,1000+15000,'vXcZ',15000),'the computer resolves after the grace if the phone never did');
ok(!S.aliasMayResolve({...march,state:'arrived'},2000,'vXcZ',15000),'loot is not paid by the second device early');
ok(S.aliasMayResolve({...march,state:'arrived'},2000+15000,'vXcZ',0),'grace 0 lets a test finish the return immediately');

// stale background tab must not upload
ok(!S.shouldUpload(3,5),'an older tab does not upload over a newer save');
ok(S.shouldUpload(5,5)&&S.shouldUpload(6,5),'the tab that holds the latest save may upload');

console.log(fail?fail+' failed':'all passed');
process.exit(fail?1:0);
