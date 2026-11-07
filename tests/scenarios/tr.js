const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.8107,longitude:-116.8963},permissions:['geolocation']});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='warning'&&/wounds|hospital|troop|class/i.test(m.text()))errs.push('WARN '+m.text());});
await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(800);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:20000});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{const o={};const t=T2();
 o.tier1=troopTier();o.cost1000=JSON.stringify(trainCost(1000));o.power1=TROOP.powerPer;barracks().level=3;o.tier3=troopTier();o.cost1000_T2=JSON.stringify(trainCost(1000));o.power3=TROOP.powerPer;barracks().level=1;
 o.cap=troopCap();o.beds=hospitalBeds();o.marchCap=marchTroopCap();
 // train
 P.res.scrap=5000;P.res.food=5000;P.res.water=5000;const before={...P.res};trainTroops(1000);o.paid=Object.keys(before).map(k=>k+':'+(before[k]-P.res[k])).join(' ');
 t.queue.forEach(q=>q.end=0);troopTick();o.home=t.home;
 // wounded split
 o.splitWin=JSON.stringify(woundSplit(100,true));o.splitLoss=JSON.stringify(woundSplit(100,false));
 // hospital: 900 wounded -> 200 free heal queued, rest wait
 t.wounded=900;t.healFree={day:'',n:0};hospitalTick();o.afterFree={wounded:t.wounded,healing:troopsHealing()};
 // overflow: beds = 20% of 5000 = 1000; push wounded to 3000, wait 10h
 t.wounded=3000;t.overT=Date.now()-10*3600e3;hospitalTick();o.after10hOverflow=t.wounded;
 // heal paid
 P.res.food=5000;P.res.water=5000;P.res.scrap=5000;const w0=t.wounded;healTroops(500);o.healed=w0-t.wounded;
 // room counts wounded
 o.room=troopRoom();o.total=troopTotal();
 // upkeep + hungry
 o.upkeep=JSON.stringify(troopUpkeep());P.res.food=0;payUpkeep5();o.hungry=isHungry();const u=troopUnit(1000);o.hungryAtk=u.atk;trainTroops(100);P.res.food=999;payUpkeep5();o.hungryAfterFood=isHungry();o.fullAtk=troopUnit(1000).atk;
 // horde answers army
 const f={tier:0,since:Date.now()};o.landStr=landStr();
 return o;});
console.log(JSON.stringify(r,null,1));
await p.evaluate(()=>{UI.tab='base';UI.sub.base='barracks';$('#sheet').classList.remove('hidden');UI.render();});await p.waitForTimeout(400);
await p.screenshot({path:(process.env.OUT||'/tmp')+'/barracks.png',fullPage:false});
const txt=await p.evaluate(()=>$('#sheetBody').innerText.slice(0,1500));console.log(txt);
console.log('ERRORS',errs);await b.close();})();
