const {chromium}=require('playwright');
async function run(label,opts,fn){const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},...opts});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{localStorage.setItem('wl_team','smoke-team');});
 await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(600);if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
 const r=await fn(p,ctx);console.log(label,JSON.stringify(r),errs.length?'ERR '+errs.join('|'):'');await b.close();}
(async()=>{
 await run('good fix:',{geolocation:{latitude:47.70,longitude:-116.78,accuracy:12},permissions:['geolocation']},async p=>{await p.waitForTimeout(9000);return p.evaluate(()=>({pos:G.pos,chip:$('#gpschip')&&$('#gpschip').textContent,weak:G.gpsWeak,tiles:Object.keys(P.tiles).length}));});
 await run('weak fix:',{geolocation:{latitude:47.70,longitude:-116.78,accuracy:300},permissions:['geolocation']},async p=>{await p.waitForTimeout(9000);return p.evaluate(()=>({pos:G.pos,chip:$('#gpschip')&&$('#gpschip').textContent,tiles:Object.keys(P.tiles).length}));});
 await run('denied:',{},async p=>{await p.waitForTimeout(14000);return p.evaluate(()=>({pos:G.pos,state:G.gps.state,chip:$('#gpschip')&&$('#gpschip').textContent}));});
 await run('glitch jump:',{geolocation:{latitude:47.70,longitude:-116.78,accuracy:10},permissions:['geolocation']},async (p,ctx)=>{await p.waitForTimeout(9000);const t0=await p.evaluate(()=>Object.keys(P.tiles).length);
   await ctx.setGeolocation({latitude:47.75,longitude:-116.70,accuracy:10});await p.waitForTimeout(2500);const t1=await p.evaluate(()=>({n:Object.keys(P.tiles).length,pos:G.pos}));
   await ctx.setGeolocation({latitude:47.7503,longitude:-116.7004,accuracy:10});await p.waitForTimeout(2500);return {t0,t1,t2:await p.evaluate(()=>Object.keys(P.tiles).length)};});
console.log("ERRORS []");})();
