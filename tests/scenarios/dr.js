const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.81,longitude:-116.9,accuracy:10},permissions:['geolocation']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning')errs.push(m.text())});
await p.addInitScript(()=>{localStorage.setItem('wl_team','smoke-team');});await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(600);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:30000});await p.waitForTimeout(1500);
await p.evaluate(async()=>{const me=marchFrom(),[q,r]=idQR(me);W().sh={hex:me,state:'up',level:1};P.pipes=[{id:'pa',site:'s1',name:'Cenex Gas',res:'fuel',hex:(q+6)+'_'+r,lat:G.pos[0]+0.004,lng:G.pos[1]+0.012,route:marchTrack(me,(q+6)+'_'+r),st:'pin',pinExp:Date.now()+40*3600e3,t:Date.now()}];
 await toggleDrive();P.res.scrap+=12;P.res.food+=4;});await p.waitForTimeout(2500);await p.screenshot({path:(process.env.OUT||'/tmp')+'/drive.png'});
console.log(await p.evaluate(()=>$('#drivehud').innerText.replace(/\n+/g,' | ')),'ERRORS',errs);await b.close();})();
