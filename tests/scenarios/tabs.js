const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},geolocation:{latitude:47.8107,longitude:-116.8963},permissions:['geolocation']});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Failed'))errs.push('ERR '+m.text().slice(0,200));if(m.type()==='warning')errs.push('WARN '+m.text().slice(0,200));});
await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(800);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:20000});await p.waitForTimeout(2000);
const n=await p.evaluate(async()=>{let c=0;for(const t of Object.keys(UI.SUBS)){for(const [s] of UI.SUBS[t]){try{UI.tab=t;UI.sub[t]=s;$('#sheet').classList.remove('hidden');UI.render();c++;}catch(e){console.error('render '+t+'/'+s+': '+e.message);}}}
 // a real march: tap a nearby hex 3 east, send with troops
 T2();TP().home=5000;const f=marchFrom().split('_').map(Number);const tg=(f[0]+3)+'_'+f[1];try{G.troopSend=5000;await sendMarch(tg);}catch(e){console.error('march '+e.message);}
 const ms=Object.entries(G.marches||{}).filter(([,m])=>m.uid===P.uid);return c+' tabs rendered; marches='+ms.length+' troops on march='+JSON.stringify(TP().away)+' home='+TP().home;});
console.log(n);await p.waitForTimeout(1000);console.log('ERRORS',errs.length);errs.slice(0,20).forEach(e=>console.log(e));await b.close();})();
