const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.8107,longitude:-116.8963},permissions:['geolocation']});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(800);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:20000});await p.waitForTimeout(2500);
const o=await p.evaluate(()=>{TP().home=4000;const out={};for(const L of [6,8,10,12]){const en=()=>mutantUnits('ghoul',L);out[L]={hero:marchPreview(0,en).win,n1000:marchPreview(1000,en),n4000:marchPreview(4000,en),min:minToWin(4000,en)};}return out;});
console.log(JSON.stringify(o));
await p.evaluate(()=>{G.troopRisk={win:true,pct:.35,wounded:900,dead:300};const [q,r]=idQR(marchFrom());sendMarch((q+2)+'_'+r);});await p.waitForTimeout(500);
console.log('v25 no predictions: confirm shown:',await p.evaluate(()=>!!document.getElementById('kitModal')&&document.getElementById('kitModal').innerText));
await p.screenshot({path:(process.env.OUT||'/tmp')+'/confirm.png'});
await p.waitForTimeout(300);console.log('marches sent (no risky prompt in v25)',await p.evaluate(()=>Object.values(G.marches||{}).filter(m=>m.uid===P.uid).length));
console.log('ERRORS',errs);await b.close();})();
