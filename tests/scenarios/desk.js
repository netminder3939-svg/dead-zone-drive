const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900},geolocation:{latitude:47.81,longitude:-116.9,accuracy:10},permissions:['geolocation']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('wl_team','smoke-team');});await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(600);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:30000});await p.waitForTimeout(1500);
await p.evaluate(()=>{const [q,r]=idQR(marchFrom());for(let i=1;i<6;i++)P.tiles[(q+i)+'_'+r]={t:Date.now()};TP().home=3000;drawWorld();});
await p.screenshot({path:(process.env.OUT||'/tmp')+'/desk1.png'});await p.evaluate(()=>{UI.open('player');UI.sub.player='gear';UI.render();});await p.waitForTimeout(500);await p.screenshot({path:(process.env.OUT||'/tmp')+'/desk2.png'});
console.log('ERR',errs);await b.close();})();
