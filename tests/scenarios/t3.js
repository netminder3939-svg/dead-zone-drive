const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.8107,longitude:-116.8963},permissions:['geolocation']});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='warning'||(m.type()==='error'&&!m.text().startsWith('Failed')))errs.push(m.type()+' '+m.text().slice(0,200));});
await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(800);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:20000});await p.waitForTimeout(2500);
const r=await p.evaluate(()=>{const o={};TP().home=4000;barracks().level=2;for(let i=0;i<60;i++){const [a,c]=idQR(marchFrom());}
 const [q0,r0]=idQR(marchFrom());let tgt=null;for(let dq=-6;dq<=6&&!tgt;dq++)for(let dr=-6;dr<=6&&!tgt;dr++){const id=(q0+dq)+'_'+(r0+dr);if(id===marchFrom())continue;if(mobAt(id)){tgt=id;P.tiles[id]={t:Date.now()};}}
 o.target=tgt;if(!tgt)return o;const en=_tr3_enemy(tgt);o.p0=marchPreview(0,en);o.pMax=marchPreview(Math.min(4000,marchTroopCap()),en);o.minWin=minToWin(Math.min(4000,marchTroopCap()),en);
 window.__tgt=tgt;return o;});
console.log(JSON.stringify(r));
if(r.target){await p.evaluate(()=>{UI.infoTile(window.__tgt);});await p.waitForTimeout(600);await p.screenshot({path:(process.env.OUT||'/tmp')+'/send.png'});console.log(await p.evaluate(()=>$('#btnMarch').innerHTML));}
const g=await p.evaluate(()=>{const o={};const [q0,r0]=idQR(marchFrom());const hex=(q0+2)+'_'+r0;
 G.terr[hex]={uid:'ally1',by:'Ally',t:Date.now()};G.al=G.al||{members:{}};G.al.members=G.al.members||{};
 G.al.members.ally1={name:'Jacob',gar:[{hex,n:1500,p:30,c:'engineer'}],defs:[]};
 const d=activeDefs(hex);o.defs=d.map(x=>x.kind+':'+x.power);o.cap=hexGarCap(hex);o.garAt=garrisonedAt(hex);
 // station mine there (raider): engineer+raider bonus
 P.cls={id:'raider'};stationTroops(hex,5000);const s=stationed()[hex];o.mine=s&&s.n;if(s)s.at=0;
 const d2=activeDefs(hex);o.defs2=d2.map(x=>x.kind+':'+x.power);
 // fight: squad beats nothing (sp small) -> held; loss note for ally
 const dp=defPower(d2);squadReplay(d2,dp,Math.round(dp*0.8),'Rust Dogs');o.notes=JSON.stringify(FX().gl25||[]);
 // owner-side apply: make a note for me
 TP().gl25Seen=Date.now()-1000;FX().gl25=FX().gl25||[];FX().gl25.push({t:Date.now(),hex,uid:P.uid,frac:0.8,won:true,gang:'Rust Dogs',sp:10,share:.5,rounds:[]});const w0=T2().wounded,n0=stationed()[hex].n;applyGl25(); /* v25: exact fraction LEFT */o.applied={lost:n0-stationed()[hex].n,woundedAdded:T2().wounded-w0};
 // scout vision
 P.cls={id:'scout'};_tr3_scoutCache.t=0;const far=(q0+40)+'_'+r0;stationed()[far]={n:100,at:0};_tr3_scoutCache.t=0;o.scoutSees=isVis((q0+41)+'_'+r0);
 o.member=JSON.stringify(memberSummary().gar);return o;});
console.log(JSON.stringify(g,null,1));console.log('ERRORS',errs);await b.close();})();
