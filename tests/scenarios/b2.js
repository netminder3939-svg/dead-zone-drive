const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.81,longitude:-116.9,accuracy:10},permissions:['geolocation']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning')errs.push(m.text())});
await p.addInitScript(()=>{localStorage.setItem('wl_team','smoke-team');});await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(600);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:30000});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{const o={};const me=marchFrom(),[q,r]=idQR(me);
 // crew: some hexes + a tower, no zones complete
 for(let i=0;i<6;i++)P.tiles[(q+i)+'_'+r]={t:Date.now()};W().towers[(q+2)+'_'+r]={state:'up',level:1};
 const fx=FX();fx.start=fx.start||Date.now()-864e5;fx.f={};const home=(q+5)+'_'+(r-6);fx.f.dogs={home,tier:1,since:Date.now()-5*864e5,tiles:{[home]:Date.now()},outposts:{},squads:[]};fxDirty();
 const f=fx.f.dogs;ensureSquads(f,'dogs',Date.now());o.squads=f.squads.length;const [s1,s2]=f.squads;
 const cnt={};for(let i=0;i<60;i++){s1.pos=home;s1.intent=null;s2.target=(q+1)+'_'+r;s2.intent='raid';planSortie(f,'dogs',s1,seedRand('k'+i),Date.now());cnt[s1.intent]=(cnt[s1.intent]||0)+1;}o.intents=cnt;
 // probe -> strike
 fx.probe={dogs:{hex:(q+2)+'_'+r,dp:70,t:Date.now(),by:s2.id}};s1.pos=home;s1.intent=null;planSortie(f,'dogs',s1,seedRand('z'),Date.now());o.strike={intent:s1.intent,target:s1.target,probeCleared:!(fx.probe&&fx.probe.dogs)};
 const base=(()=>{s1.intent='raid';return squadPower(f,s1,Date.now());})();s1.intent='probe';const pp=squadPower(f,s1,Date.now());s1.intent='strike';o.power={raid:base,probe:pp,strike:squadPower(f,s1,Date.now())};
 // siege doubles upkeep
 const tw=(q+2)+'_'+r;s1.intent='siege';s1.target=s1.pos=(q+2)+'_'+(r-2);s1.restUntil=Date.now()+3600e3;o.besieged=besieged(tw);o.upkeep=upkeepParts().filter(x=>x.k==='tower').map(x=>x.name+' '+JSON.stringify(x.cost));
 // horde zone + nest + boss
 const zid=zoneIdOf((q+12)+'_'+(r-4));zoneHexes(zid).forEach(h=>f.tiles[h]=Date.now());fxDirty();_zc={};_b2_zc.t=0;o.zone=zoneState(zid).st;o.gangZoneBoost=squadPower(f,s2,Date.now())+' vs raid '+base;
 claimTile(nestHex(zid));const rid=Object.keys(G.raids).find(k=>k.startsWith('rz_'+zid));o.raid=rid&&G.raids[rid].place;
 const R=G.raids[rid];R.won=true;R.done=true;R.participants={[P.uid]:{dmg:100,name:P.name}};raidClaim(rid);_zc={};o.afterBoss=zoneState(zid).horde+' horde hexes left';
 return o;});
console.log(JSON.stringify(r,null,1));console.log('ERRORS',errs);await b.close();})();
