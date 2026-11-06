const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900},geolocation:{latitude:47.81,longitude:-116.9,accuracy:10},permissions:['geolocation']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning')errs.push(m.text())});
await p.addInitScript(()=>{localStorage.setItem('wl_team','smoke-team');});await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(600);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:30000});await p.waitForTimeout(1500);
const ev=async(f)=>{for(let i=0;i<3;i++){try{return await p.evaluate(f);}catch(e){if(!/context was destroyed/.test(e.message))throw e;await p.waitForTimeout(800);}}}; // same-document history push can reset the context
const r=await p.evaluate(()=>{const o={};const me=marchFrom();
 // v26-9 sparse: ensure we stand on (or jump to) a real material-rich zone seed
 let z0=zoneIdOf(me);if(!z0){const S=ZONE.step||(2*ZONE.n+1);const [q,r]=idQR(me);z0='Z'+(Math.round(q/S)*S)+'_'+(Math.round(r/S)*S);}
 const [cq,cr]=zoneCenter(z0);
 const old=Date.now()-20*3600e3;const g0=grossIncome();
 zoneHexes(z0).forEach(h=>{P.tiles[h]={t:old};});
 const S=ZONE.step||(2*ZONE.n+1);
 const z1='Z'+(cq+S)+'_'+cr; // neighbouring seed (~5 km)
 // a far seed used as horde zone
 const z2='Z'+(cq-S)+'_'+(cr+S);
 const z3=z1;
 zoneHexes(z1).slice(0,8).forEach(h=>P.tiles[h]={t:Date.now()});
 // leave z3 partially held (same as z1) — contested
 const fx=FX();fx.f=fx.f||{};fx.f.dogs=fx.f.dogs||{tiles:{},squads:[],home:zoneHexes(z2)[0]};zoneHexes(z2).forEach(h=>fx.f.dogs.tiles[h]=Date.now());fxDirty();_zc={};
 o.states=[z0,z1,z2].map(z=>{const s=zoneState(z);return s.name+':'+s.st+' '+s.crew+'/'+s.total+(s.fortLeft?' left '+Math.round(s.fortLeft/36e5)+'h':'');});
 o.sparse={step:ZONE.step,km:ZONE.sparseKm,plain:!zoneIdOf((cq+Math.ceil(ZONE.n*1.5))+'_'+cr)};
 const g1=grossIncome();o.income={before:JSON.stringify(g0),after:JSON.stringify(g1)};o.unique=new Set(zoneHexes(z0).map(zoneIdOf)).size;
 drawWorld();map.setView(hexCenter(cq,cr),14);return o;});
console.log(JSON.stringify(r,null,1));await p.waitForTimeout(1200);await p.screenshot({path:(process.env.OUT||'/tmp')+'/zones14.png'});
await ev(()=>map.setZoom(13));await p.waitForTimeout(1000);await p.screenshot({path:(process.env.OUT||'/tmp')+'/zones13.png'});
await ev(()=>{UI.open('alliance');UI.sub.alliance='zones';UI.render();});await p.waitForTimeout(500);await p.screenshot({path:(process.env.OUT||'/tmp')+'/zonestab.png'});
console.log('chip',await ev(()=>($('#zonechip')||{}).textContent),'ERRORS',errs);await b.close();})();
