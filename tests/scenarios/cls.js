const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.8107,longitude:-116.8963},permissions:['geolocation']});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(800);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:20000});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{const o={};const s0=stats(),f=marchFrom(),t=f.split('_').map(Number);const tgt=(t[0]+20)+'_'+t[1];const d0=marchDur(f,tgt),l0=marchLoad(1000),u0=JSON.stringify(upkeepParts()[0].cost),bh0=TROOP.barracks.hours(3);
 const res={};for(const id of ['scout','engineer','raider']){P.cls={id};const s=stats();res[id]={atk:s.atk-s0.atk,def:s.def-s0.def,agi:s.agi-s0.agi,crit:s.crit-s0.crit,durPct:Math.round(100*marchDur(f,tgt)/d0),load:marchLoad(1000)+'/'+l0,upkeep:JSON.stringify(upkeepParts()[0].cost)+' vs '+u0,barracksH:TROOP.barracks.hours(3)+'/'+bh0,buildt:skillFx('buildt')};
  P.explored={};explore([f]);res[id].revealed=Object.keys(P.explored).length;}
 P.cls={};return res;});
console.log(JSON.stringify(r,null,1));
// UI: open Hero tab -> Class
await p.evaluate(()=>{UI.open?UI.open('player'):null;UI.tab='player';UI.sub.player='class';$('#sheet').classList.remove('hidden');UI.render();});await p.waitForTimeout(400);
await p.screenshot({path:(process.env.OUT||'/tmp')+'/class1.png'});
await p.evaluate(()=>pickClass('scout'));await p.waitForTimeout(300);
await p.evaluate(()=>pickClass('raider'));await p.waitForTimeout(300);
const st=await p.evaluate(()=>({cls:JSON.stringify(P.cls),cur:myClass().name}));console.log(st);
await p.screenshot({path:(process.env.OUT||'/tmp')+'/class2.png'});
await p.evaluate(()=>{P.cls.nextT=Date.now()-1;classTick();});const st2=await p.evaluate(()=>myClass().name);console.log('after switch',st2);
console.log('ERRORS',errs);await b.close();})();
