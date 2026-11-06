// v26: garrison combat, pipeline guard fix, reports home, drive recap, troop cap, clean cards, tabs, markers, stronghold look
const {chromium}=require('playwright');const OUT=process.env.SHOTS||'/tmp/dzd-tests';
(async()=>{const b=await chromium.launch();const errs=[];const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.8135,longitude:-116.8968,accuracy:10},permissions:['geolocation']});
const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning')console.log('WARN',m.text().slice(0,300));});
await p.addInitScript(()=>{localStorage.setItem('wl_team','zz-v26');});await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(800);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Pope');await p.fill('#obTeam','zz-v26');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos&&P.world,null,{timeout:30000});await p.waitForTimeout(1500);
const ev=async(f,a)=>{for(let i=0;i<3;i++){try{return await p.evaluate(f,a);}catch(e){if(!/context was destroyed/.test(e.message))throw e;await p.waitForTimeout(800);}}};
const shot=async n=>{await p.waitForTimeout(500);await p.screenshot({path:OUT+'/'+n+'.png'});};
let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;};
// v26-5: tougher Stronghold, grace, bank squads (then switch grace off so the old horde-step checks below still run)
const t5=await ev(()=>{const S=k=>fight26({bld:{kind:'sh',lvl:1},players:[]},{n:k});const h=Object.keys(P.tiles)[0];const o={h1000:S(1000).win,f2000:!S(2000).win,hp:innate26({kind:'sh',lvl:1}),g:graceOf26(h)-Date.now(),bank:HE.start.troops};
  const fid=BAL.factions.list[0].id,f={tiles:{},squads:[],outposts:{},home:'0_0',tier:0};const s={id:'g5',pos:'0_0',trail:[],path:[h],restUntil:0,moved:0};
  const evv={fights:[],held:[],took:[],destroyed:[],outposts:[],grew:{},back:[],power:0};squadStep(f,fid,s,1,Date.now(),evv);o.blocked=evv.took.length===0&&evv.fights.length===0;return o;});
ok(t5.h1000&&t5.f2000&&t5.hp===3500,'v26-5 empty Stronghold Lv1 (3,500 HP) holds vs 1,000, falls to 2,000 '+JSON.stringify(t5));
ok(t5.g>47*3600e3&&t5.blocked,'v26-5 48 h grace blocks horde steps onto new player land');ok(t5.bank===500,'v26-5 clan bank starts at 500');
await ev(()=>UI.infoStruct('sh'));await p.waitForTimeout(400);const card5=await ev(()=>$('#modalBody').innerText);console.log('CARD5',card5.slice(0,300));ok(/Protected \d+h/.test(card5),'v26-5 Stronghold card shows Protected note');await shot('v26-5-sh-card-local');await ev(()=>{UI.closeModal();P.born26=1;});
// 1 combat math (doc example) + determinism
const m=await ev(()=>{const D={bld:{kind:'tower',lvl:1},players:[{key:'a',uid:'a',n:1500,type:'engineer',gear:{atk:0,def:0,hp:0},name:'jpope'},{key:'b',uid:'b',n:500,type:'scout',gear:{},name:'Kansas'}]};
  const a=fight26(D,{n:2000}),c=fight26(D,{n:4000}),same=JSON.stringify(fight26(D,{n:2000}))===JSON.stringify(a);
  const mix=fight26({bld:null,players:['engineer','raider','scout'].map((t,i)=>({key:t,uid:t,n:100,type:t,gear:{},name:t}))},{n:10});
  const tiny=fight26({bld:null,players:[{key:'x',uid:'x',n:1000,type:'raider',gear:{},name:'x'},{key:'y',uid:'y',n:50,type:'caster',gear:{},name:'y'}]},{n:10});
  return{held:a.win,eng:a.players[0].lost,sc:a.players[1].lost,fell:!c.win,allDead:c.players.every(p=>p.left===0),same,mix:mix.mix,mendOff:tiny.perks.mend===0,cls:Object.keys(CLASSES.list).length,F25:F25.rounds};});
ok(m.held&&m.eng>0&&m.sc===0,'2,000 horde vs tower+1,500 Engineer+500 Scout: held, Engineers take losses first '+JSON.stringify(m));
ok(m.fell&&m.allDead,'4,000 horde: building falls, fight to the death (no survivors)');ok(m.same,'same inputs -> same result (no luck)');ok(m.mix===0.10,'3 types = +10% mix bonus');ok(m.mendOff,'perk needs 10% of the garrison');ok(m.cls===5,'5 classes');
// 2 pipeline guard: horde holding a guarded route hex without a fight is NOT a cut; guards fight for it (reconcile); unguarded route = cut
const pg=await ev(()=>{const me=marchFrom(),[q,r]=idQR(me);const route=[1,2,3].map(i=>(q+i)+'_'+r);route.forEach(h=>P.tiles[h]={t:Date.now()});TP().home=3000;P.cls={id:'engineer'};
  P.pipes=[{id:'pw',name:'Water Tower #13',res:'water',route,st:'online',t:Date.now()}];const pp=P.pipes[0];pp.guard25={hex:route[1]};TP().stationed=TP().stationed||{};stationed()[route[1]]={n:1500,at:Date.now()-1000,from:me,st:Date.now()-5000};
  const fx=FX();fx.f=fx.f||{};const fid=Object.keys(fx.f)[0]||BAL.factions.list[0].id;fx.f[fid]=fx.f[fid]||{tiles:{},squads:[],outposts:{},home:(q+9)+'_'+r,tier:0};const f=fx.f[fid];f.squads=f.squads||[];
  f.tiles[route[2]]=Date.now()-60000;fxDirty();const o={cutBefore:pipeState(pp)};
  const keepSq=f.squads;f.squads=[{id:'zz1',pos:(q+9)+'_'+r,trail:[],path:[],restUntil:Date.now()+9e6}];const sp0=squadPower;squadPower=()=>Math.round(1000*TROOP.powerPer);
  reconcile26();squadPower=sp0;f.squads=keepSq;o.after=pipeState(pp);o.guards=stationedAt(route[1]);o.rep=(P.fr25[0]||{}).title;o.hordeHas=!!fxIndex()[route[2]];
  // unguarded line
  delete stationed()[route[1]];f.tiles[route[0]]=Date.now();fxDirty();o.unguarded=pipeState(pp);
  return o;});
ok(pg.cutBefore==='online','guarded line is not shown CUT when the horde holds a route hex without a fight '+JSON.stringify(pg));
ok(/drove/.test(pg.rep||'')&&pg.guards>0&&pg.guards<1500&&!pg.hordeHas,'guards fight for the hex with garrison math, win, horde pushed off, report saved');
ok(pg.unguarded==='cut','nobody guarding = cut');
// 3 horde step onto a guarded route hex the crew list does not have -> fight runs (old bug: walked in silently)
const st=await ev(()=>{const me=marchFrom(),[q,r]=idQR(me);const h=(q+5)+'_'+(r+1),g=(q+6)+'_'+(r+1);delete P.tiles[h];if(G.terr[h])delete G.terr[h];
  P.pipes.push({id:'p2',name:'Fuel Line',res:'fuel',route:[g,h],st:'online',guard25:{hex:g},t:Date.now()});stationed()[g]={n:800,at:Date.now()-1000,from:me,st:Date.now()-5000};
  const fx=FX(),fid=Object.keys(fx.f)[0],f=fx.f[fid];const s={id:'zz2',pos:(q+5)+'_'+(r+2),trail:[],path:[h],restUntil:0,moved:0};const evv={fights:[],held:[],took:[],destroyed:[],outposts:[],grew:{},back:[],power:0};
  const n0=(P.fr25||[]).length;const sp0=squadPower;squadPower=()=>Math.round(300*TROOP.powerPer);try{squadStep(f,fid,s,2,Date.now(),evv);}finally{squadPower=sp0;}
  return{fights:evv.fights.length,held:evv.held.length,took:evv.took.length,allied:allied(h)};});
ok(st.allied&&st.fights===1,'horde step onto a guarded route hex runs the guard fight '+JSON.stringify(st));
// 4 undefended capture -> report with the reason
const un=await ev(()=>{const me=marchFrom(),[q,r]=idQR(me);const h=(q-4)+'_'+(r+3);P.tiles[h]={t:Date.now()};G.terr[h]={uid:P.uid,t:Date.now()};
  const fx=FX(),fid=Object.keys(fx.f)[0],f=fx.f[fid];const s={id:'zz3',pos:(q-4)+'_'+(r+4),trail:[],path:[h],restUntil:0,moved:0};const evv={fights:[],held:[],took:[],destroyed:[],outposts:[],grew:{},back:[],power:0};
  const sp0=squadPower;squadPower=()=>5;try{squadStep(f,fid,s,2,Date.now(),evv);}finally{squadPower=sp0;}const top=P.fr25[0];return{took:evv.took.length,none:!!top.none,why:top.why};});
ok(un.took===1&&un.none&&/Nobody/.test(un.why),'undefended capture gets a report with the reason '+JSON.stringify(un));
// 5 Reports home + fight report popup (no auto close)
await ev(()=>{const r=P.fr25.find(x=>x.r26);UI.report26('f',r);});await p.waitForTimeout(7500);ok(await ev(()=>!$('#modal').classList.contains('hidden')),'fight report still open after 7.5 s');await shot('03-fight-report');
await ev(()=>{UI.closeModal();UI.inbox();});await shot('02-reports-home');const rp=await ev(()=>({n:reportItems26().length,txt:$('#modalBody').innerText.slice(0,120)}));ok(rp.n>=3&&/Reports/.test(rp.txt),'bell opens Reports home '+rp.n);
await ev(()=>{UI.closeModal();const r=P.fr25.find(x=>x.none);UI.report26('f',r);});await shot('04-undefended-report');
// 6 drive recap: own resource hex pays once during the drive, bug run over, badge reward NOT counted as drive loot
const dv=await ev(async()=>{UI.closeModal();const me=marchFrom(),[q,r]=idQR(me);let own=null;for(const x of hexRing(q,r,3)){const t=tileInfo(x.id);if(t.res&&x.id!==me&&!fxIndex()[x.id]&&!P.pipes.some(pp=>(pp.route||[]).includes(x.id))){own=x;break;}}P.tiles[own.id]={t:Date.now()-5e6};P.dp26=null;
  P.hp=stats().hp;P.cooldownUntil=0;await toggleDrive();G.dev.tp=true;const c=hexCenter(own.q,own.r);G.jump=true;setPos(c[0],c[1]);
  const mid=Object.keys(MONSTERS).find(k=>!MONSTERS[k].boss&&!MONSTERS[k].fort&&MONSTERS[k].lvl<=2);const sm=spawnMonsters;spawnMonsters=()=>{};G.monList=[{mid,lvl:1,key:'zzbug@'+Date.now(),lat:c[0]+0.0001,lng:c[1]}];setPos(c[0]+0.00005,c[1]);spawnMonsters=sm;
  P.res.scrap+=40; // a badge reward landing mid-drive
  const res0={...P.res};setPos(c[0]+0.0001,c[1]);G.dev.tp=false;const paidTwice=P.res[tileInfo(own.id).res]-res0[tileInfo(own.id).res];
  await toggleDrive();const d=P.dr26[0];return{own:d.own,ownPaid:d.ownPaid,src:JSON.stringify(d.src),other:JSON.stringify(d.other),bugs:d.bugs.length,paidTwice,open:!$('#modal').classList.contains('hidden'),pre:JSON.stringify(P.dp26.pre)};});
ok(dv.ownPaid===1&&dv.paidTwice===0,'own resource hex pays once per day during a drive '+JSON.stringify(dv));ok(dv.bugs===1,'driving over a lone bug auto-fights it');ok(/"scrap":40/.test(dv.other),'badge reward listed as not-drive-loot');ok(dv.open,'recap popup stays open');
await shot('01-drive-recap');
// reset pays the rest (same daily total)
const rs=await ev(async()=>{const g=grossIncome();G._pre26={...P.dp26.pre};const g2=grossIncome();G._pre26=null;const k=Object.keys(P.dp26.pre)[0];return{k,full:g[k],afterPre:g2[k],pre:P.dp26.pre[k]};});
ok(rs.full-rs.afterPre===rs.pre,'next reset subtracts what the drive already paid (no extra income) '+JSON.stringify(rs));
// 7 troop cap
await ev(()=>{UI.closeModal();TP().home=troopCap();UI.sub.base='barracks';UI.open('base');});await shot('05-troop-cap');ok(await ev(()=>!!$('#sheetBody .cap26.full')),'Troops full bar + upgrade button');
await ev(()=>{trainTroops(100);});ok(await ev(()=>[...$('#toast').children].some(c=>/Troops full/.test(c.textContent))),'cap-hit message');await ev(()=>{TP().home=1200;UI.close();});
// 8 clean cards
await ev(()=>{const me=marchFrom();UI.infoTile(me);});await shot('06-clean-tile-card');const cc=await ev(()=>({btn:$('#modalBody .ccbtn26').children.length,more:!!$('#modalBody details.more26'),owner:/Owner: You/.test($('#modalBody').innerHTML)}));
ok(cc.btn<=3&&cc.more&&!cc.owner,'tile card: ≤3 buttons, ⓘ More, no repeated owner '+JSON.stringify(cc));
await ev(()=>{UI.closeModal();const me=marchFrom(),[q,r]=idQR(me);const t=(q-1)+'_'+(r+1);P.tiles[t]={t:Date.now()};W().towers[t]={state:'up',level:1,online:true,hpPct:1};stationed()[t]={n:1500,at:Date.now()-1000,from:me,st:Date.now()-9e3};drawWorld();UI.infoTile(t);});
await shot('07-garrison-card');ok(await ev(()=>/GARRISON/.test($('#modalBody').innerText)),'building card shows garrison totals + who is inside');
// 9 tabs
await ev(()=>{UI.closeModal();UI.open('alliance');});await shot('08-alliance-crew');ok(await ev(()=>UI.SUBS.alliance.length===5),'alliance tabs 10 -> 5');
await ev(()=>{UI.sub.player='class';UI.open('player');});await shot('09-class-picker');ok(await ev(()=>$('#sheetBody .clscard')&&document.querySelectorAll('#sheetBody .clscard').length===5),'class picker has 5 classes');
// 10 markers + stronghold
await ev(()=>{UI.close();const me=marchFrom(),[q,r]=idQR(me);W().sh={hex:me,state:'up',level:2,hpPct:.9};const fx=FX(),fid=Object.keys(fx.f)[0],f=fx.f[fid];
  f.squads.push({id:'zz9',pos:(q+3)+'_'+(r-2),trail:[],path:[(q+2)+'_'+(r-1),(q+2)+'_'+r],target:(q+2)+'_'+r,intent:'strike',restUntil:0});
  f.squads.push({id:'zz8',pos:(q-3)+'_'+(r+1),trail:[],path:[(q-2)+'_'+(r+1)],target:(q-2)+'_'+(r+1),intent:'raid',restUntil:Date.now()+20*60e3});
  P.tiles[(q+2)+'_'+r]={t:Date.now()};map.setView(hexCenter(q,r),16,{animate:false});drawWorld();});
await p.waitForTimeout(1500);await shot('10-map-markers-stronghold');ok(await ev(()=>document.querySelectorAll('.ht26').length>=1&&document.querySelectorAll('.sh26').length>=1),'new horde markers + Stronghold look on the map');
console.log('ERRORS',errs);await b.close();process.exit(fail?1:0);})();
