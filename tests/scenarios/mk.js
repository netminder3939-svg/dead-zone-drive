const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.81,longitude:-116.9,accuracy:10},permissions:['geolocation']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning')errs.push(m.text())});
await p.addInitScript(()=>{localStorage.setItem('wl_team','smoke-team');localStorage.removeItem('wl_mk');});await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(600);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:30000});await p.waitForTimeout(1500);
const [q,r]=await p.evaluate(()=>idQR(marchFrom()));
// icon mark via picker flow
await p.evaluate(([q,r])=>{m2pick('rally',(q+1)+'_'+r);},[q,r]);await p.waitForTimeout(300);await p.fill('#m2note','Meet 6pm');
await p.evaluate(()=>{const b=[...document.querySelectorAll('#modalBody button')].find(x=>/Place/.test(x.textContent));b.click();});await p.waitForTimeout(400);
// arrow
await p.evaluate(([q,r])=>{startMark('arrow');UI.infoTile((q-2)+'_'+r);UI.infoTile((q+3)+'_'+(r-2));},[q,r]);await p.waitForTimeout(300);await p.fill('#m2note','Push north');
await p.evaluate(()=>{[...document.querySelectorAll('#modalBody button')].find(x=>/Place/.test(x.textContent)).click();});await p.waitForTimeout(300);
// area
await p.evaluate(([q,r])=>{startMark('area');for(const d of [[0,2],[1,2],[0,3],[1,1]])UI.infoTile((q+d[0])+'_'+(r+d[1]));},[q,r]);await p.waitForTimeout(200);
const banner=await p.evaluate(()=>$('#markBanner').innerText);await p.click('#mbDone');await p.waitForTimeout(200);await p.fill('#m2note','Hold this block');
await p.evaluate(()=>{[...document.querySelectorAll('#modalBody button')].find(x=>/Place/.test(x.textContent)).click();});await p.waitForTimeout(500);
const st=await p.evaluate(()=>{const ms=Object.entries(G.markers);const done=ms[0][0];UI.infoMarker(done);[...document.querySelectorAll('#modalBody button')].find(x=>/done/i.test(x.textContent)).click();
  return {n:ms.length,types:ms.map(([,m])=>m.type+(m.to?'->':'')+(m.hexes?'['+m.hexes.length+']':'')),banner:!!document.getElementById('markBanner')};});
await p.waitForTimeout(400);const st2=await p.evaluate(()=>Object.values(G.markers).map(m=>m.type+':'+(m.done?'done':'open')));
await p.evaluate(()=>{map.setZoom(17);});await p.waitForTimeout(700);await p.screenshot({path:(process.env.OUT||'/tmp')+'/marks-map.png'});
await p.evaluate(()=>{UI.open('plan');});await p.waitForTimeout(500);await p.evaluate(()=>{G.m2filter='all';UI.render();const s=$('#sheetBody');s.scrollTop=s.scrollHeight;});await p.waitForTimeout(300);await p.screenshot({path:(process.env.OUT||'/tmp')+'/marks-board.png'});
console.log(JSON.stringify({banner,st,st2}),'ERRORS',errs);await b.close();})();
