const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.81,longitude:-116.9,accuracy:10},permissions:['geolocation']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning')errs.push(m.text())});
await p.addInitScript(()=>{localStorage.setItem('wl_team','smoke-team');});await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(600);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:30000});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{const o={};const me=marchFrom(),[q,r]=idQR(me);
 // crew: full zone around me (old) + pipeline east
 const z0=zoneIdOf(me);zoneHexes(z0).forEach(h=>P.tiles[h]={t:Date.now()-20*3600e3});W().sh={hex:me,state:'up',level:1};
 const pipe={id:'px',site:'s',name:'Test Gas',res:'fuel',hex:(q+8)+'_'+r,lat:0,lng:0,route:marchTrack(me,(q+8)+'_'+r),st:'online',onT:Date.now(),lastPay:Date.now(),acc:0,total:0};P.pipes=[pipe];_zc={};
 // a gang 6 hexes north-east
 const fx=FX();fx.start=fx.start||Date.now()-864e5;fx.f=fx.f||{};const home=(q+6)+'_'+(r-6);fx.f.dogs={home,tier:0,since:Date.now()-5*864e5,tiles:{[home]:Date.now()},outposts:{},squads:[]};fxDirty();
 const f=fx.f.dogs;ensureSquads(f,'dogs',Date.now());const s=f.squads[0];
 const counts={};for(let i=0;i<40;i++){s.pos=home;s.intent=null;planSortie(f,'dogs',s,seedRand('t'+i),Date.now());counts[s.intent]=(counts[s.intent]||0)+1;}
 o.intents=counts;o.example={why:s.why,target:s.target};
 // offensive
 fx.off=null;try{const f0=Object.values(fx.f||{})[0];if(f0)f0.bank={troops:9000,res:0,t:Date.now(),log:[]};}catch(e){} /* v23: offensives need a strong clan bank */const off=offensive();o.off=off&&{zone:off.name,inH:Math.round((off.strikeT-Date.now())/36e5)};
 off.strikeT=Date.now()-1000;off.endT=Date.now()+3600e3;s.pos=home;planSortie(f,'dogs',s,seedRand('x'),Date.now());o.duringOff={intent:s.intent,pow:squadPower(f,s,Date.now()),powNoOff:(()=>{s.intent='raid';return squadPower(f,s,Date.now());})()};
 off.endT=Date.now()-1000;offBanner();o.banner=document.getElementById('offBanner').innerText;const x0=P.xp,l0=P.lvl;claimOffReward(off);o.reward={xp:P.xp-x0+(P.lvl-l0)*1000,inv:P.inv.length};
 return o;});
console.log(JSON.stringify(r,null,1));console.log('ERRORS',errs);await b.close();})();
