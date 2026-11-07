const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.81,longitude:-116.9,accuracy:10},permissions:['geolocation']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning')errs.push(m.text())});
await p.addInitScript(()=>{localStorage.setItem('wl_team','smoke-team');localStorage.removeItem('wl_mk');});await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(600);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:30000});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{const o={};const me=marchFrom(),[q,r]=idQR(me);W().sh={hex:me,state:'up',level:1};
 const pt=[G.pos[0]+0.003,G.pos[1]+0.003];G.al.members.jake={name:'Jacob',color:'#4a9be0',lastActive:Date.now(),pipes:[{id:'pj',name:'Cenex Gas',res:'fuel',route:[me],st:'pin',pt,hex:hexAt(...pt).id,exp:Date.now()+864e5}]};
 o.allyPins=allyPins().length;o.hudPins=pinsWaiting().map(x=>x.name);
 G.drive.on=true;G.jump=true;setPos(pt[0],pt[1]);o.signal=Object.values(G.markers).filter(m=>m.type==='pipedrive').map(m=>m.by+'->'+m.owner);o.drawnAsMark=Object.values(G.markers).filter(m2live).length;G.drive.on=false;
 // owner side
 P.pipes=[{id:'pmine',site:'x',name:'Well #2',res:'water',hex:(q+3)+'_'+r,lat:0,lng:0,route:marchTrack(me,(q+3)+'_'+r),st:'pin',pinExp:Date.now()+864e5,t:Date.now()}];
 NET.addMarker({type:'pipedrive',hex:(q+3)+'_'+r,pipe:'pmine',owner:P.uid,by:'Jacob',uid:'jake',t:Date.now(),exp:Date.now()+864e5});
 for(let i=0;i<4;i++)P.tiles[(q+i)+'_'+r]={t:Date.now()};TP().home=5000;return o;});
await p.waitForTimeout(6000);
const r2=await p.evaluate(()=>{const pp=pipes()[0];const o={state:pipeState(pp),drivenBy:pp.drivenBy,markersLeft:Object.values(G.markers).filter(m=>m.type==='pipedrive'&&m.owner===P.uid).length};
 const fx=FX();fx.f={dogs:{home:(idQR(marchFrom())[0]+3)+'_'+(idQR(marchFrom())[1]-4),tiles:{},squads:[],outposts:{}}};fx.f.dogs.tiles[fx.f.dogs.home]=1;fxDirty();
 o.exposed=exposedHex(pp);guardLine(pp.id,1000);o.guards=lineGuards(pp)+' (arriving: '+(stationed()[o.exposed]?'yes':'no')+')';return o;});
console.log(JSON.stringify({...r,...r2},null,1));console.log('ERRORS',errs);await b.close();})();
