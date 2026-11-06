const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.81,longitude:-116.9,accuracy:10},permissions:['geolocation']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning')errs.push(m.text())});
await p.addInitScript(()=>{localStorage.setItem('wl_team','smoke-team');});await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(600);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:30000});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{const o={};const home=marchFrom();W().sh={hex:home,state:'up',level:1};P.tiles[home]={t:Date.now()};
 const site={id:'ntest1',kind:'fuel',name:'Cenex Gas',lat:G.pos[0]+0.006,lng:G.pos[1]+0.006};G.landmarks.push(site);const s=siteOf(site);
 o.why1=canBuildPipe(s);P.tiles[s.hex]={t:Date.now()};P.res.scrap=500;P.res.parts=100;o.why2=canBuildPipe(s);buildPipe('ntest1');const pp=pipes()[0];o.built={st:pipeState(pp),route:pp.route.length};
 // arrive without drive mode
 G.drive.on=false;G.jump=true;setPos(site.lat,site.lng);o.noDrive=pipeState(pp);UI.closeModal();
 G.drive.on=true;G.jump=true;setPos(site.lat+0.0002,site.lng);o.drove=pipeState(pp);UI.closeModal();
 const f0=P.res.fuel;pp.lastPay=Date.now()-3*3600e3;pipeTick();o.fuel3h=P.res.fuel-f0;
 o.member=JSON.stringify(memberSummary().pipes);
 // horde cut
 const fx=FX();fx.f=fx.f||{};fx.f.dogs=fx.f.dogs||{tiles:{},squads:[],home:pp.route[3]};fx.f.dogs.tiles[pp.route[3]]=Date.now();fxDirty();o.cut=pipeState(pp);
 const f1=P.res.fuel;pp.lastPay=Date.now()-3*3600e3;pipeTick();o.fuelWhileCut=P.res.fuel-f1;
 // upkeep short -> dark
 delete fx.f.dogs.tiles[pp.route[3]];fxDirty();P.res.parts=0;payUpkeep5();o.dark=pipeState(pp);G.drive.on=false;
 window.__pp=pp;return o;});
console.log(JSON.stringify(r,null,1));
await p.evaluate(()=>{window.__pp.darkUntil=0;G.jump=true;setPos(G.pos[0]-0.006,G.pos[1]-0.006);map.setView(G.pos,15);drawWorld();});await p.waitForTimeout(800);await p.screenshot({path:(process.env.OUT||'/tmp')+'/pipe-map.png'});
await p.evaluate(()=>{UI.open('base');UI.sub.base='pipes';UI.render();});await p.waitForTimeout(400);await p.screenshot({path:(process.env.OUT||'/tmp')+'/pipe-tab.png'});
console.log('ERRORS',errs);await b.close();})();
