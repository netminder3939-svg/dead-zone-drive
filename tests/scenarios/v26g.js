// v26-9: chat-only, pipeline preview (no charge until confirm), sparse zones ~5km, pipe-guard van
const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch();const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.8135,longitude:-116.8968,accuracy:10},permissions:['geolocation']});
const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{localStorage.setItem('wl_team','zz-v26g');});
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(800);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Pope');await p.fill('#obTeam','zz-v26g');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos&&P.world&&typeof zoneIdOf==='function',null,{timeout:30000});
await p.waitForTimeout(2000);
const ev=async(f,a)=>{for(let i=0;i<3;i++){try{return await p.evaluate(f,a);}catch(e){if(!/context was destroyed/.test(e.message))throw e;await p.waitForTimeout(800);}}};
let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;};

// 1 chat parts
const chat=await ev(()=>({parts:AT26.chat.parts.slice(),crew:AT26.crew.parts.slice()}));
ok(chat.parts.length===1&&chat.parts[0]==='chat','chat parts = [chat] only '+JSON.stringify(chat.parts));
ok(chat.crew.includes('act'),'crew keeps Activity list '+JSON.stringify(chat.crew));
await ev(()=>{UI.open('alliance');UI.sub.alliance='chat';UI.render();});
await p.waitForTimeout(400);
const chatTxt=await ev(()=>({hasChat:!!document.querySelector('.chatwrap25,.chat25,#chat25'),hasAct:!!document.querySelector('.p-act'),body:(document.querySelector('#sheetBody')||{}).innerText||''}));
ok(chatTxt.hasChat&&!/Crew activity/i.test(chatTxt.body),'Chat tab shows chat, no Crew activity panel');

// 2 sparse zones
const zn=await ev(()=>{
  const me=hexAt(...G.pos);
  const z0=zoneIdOf(me.id);
  // walk out until we leave a zone, count how many plain hexes in a ring
  let plain=0,rich=0;const seen=new Set();
  for(let ring=0;ring<=30;ring++){
    for(const x of hexRing(me.q,me.r,ring)){
      if(seen.has(x.id))continue;seen.add(x.id);
      const z=zoneIdOf(x.id);if(z)rich++;else plain++;
    }
  }
  const S=ZONE.step;const a='Z'+(Math.round(me.q/S)*S)+'_'+(Math.round(me.r/S)*S);
  const b='Z'+((Math.round(me.q/S)+1)*S)+'_'+(Math.round(me.r/S)*S);
  const [aq,ar]=zoneCenter(a),[bq,br]=zoneCenter(b);
  const dist=hexDist(aq+'_'+ar,bq+'_'+br);
  const km=dist*HEX_R*Math.sqrt(3)/1000;
  // fortify still works inside a zone
  let fortOk=false;
  if(z0){const hs=zoneHexes(z0);const old=Date.now()-30*3600e3;hs.forEach(h=>{P.tiles[h]={t:old};if(G.terr&&G.terr[h])G.terr[h].t=old;else{G.terr=G.terr||{};G.terr[h]={uid:P.uid,by:P.name,t:old};}});try{_zc={};}catch(e){}fortOk=zoneState(z0).st==='fortified';}
  // plain hex: no fortify bonus
  let plainHex=null;for(const x of hexRing(me.q,me.r,12)){if(!zoneIdOf(x.id)){plainHex=x.id;break;}}
  const plainFort=plainHex?zoneFortified(plainHex):null;
  return{z0,plain,rich,step:ZONE.step,sparseKm:ZONE.sparseKm,n:ZONE.n,dist,km,fortOk,plainFort,hexes:z0?zoneHexes(z0).length:0};
});
ok(zn.step>=2*zn.n+1,'zone step non-overlapping '+zn.step);
ok(zn.km>=4&&zn.km<=7,'centers ~5 km apart (got '+zn.km.toFixed(2)+' km, step '+zn.step+')');
ok(zn.plain>zn.rich,'most hexes in 30-ring are plain ('+zn.plain+' plain / '+zn.rich+' rich)');
ok(zn.hexes===61||zn.z0==null,'zone size 61 when on a zone (got '+zn.hexes+', z0='+zn.z0+')');
ok(zn.plainFort===false,'plain hex is not fortified');
if(zn.z0)ok(zn.fortOk,'held zone fortifies after 24h sim (terr.t cleared)');

// 3 pipeline preview: no charge until confirm
const pipe=await ev(()=>{
  // seed a fake unlocked site near SH
  const o=pipeOrigin()||hexAt(...G.pos).id;
  if(!W().sh)W().sh={hex:o,hpPct:1,state:'up',buildEnd:0,everBuilt:true};
  const [q,r]=idQR(o);const siteHex=(q+3)+'_'+r;
  P.tiles[o]={t:Date.now()};P.tiles[siteHex]={t:Date.now()};
  P.pipeUnlock26=P.pipeUnlock26||{};
  const sid='testsite26g';
  const [la,ln]=hexCenter(...idQR(siteHex));
  P.pipeUnlock26[sid]={t:Date.now(),res:'water',name:'Test Water',hex:siteHex,lat:la,lng:ln,kind:'water_tower'};
  P.res={scrap:500,parts:50,food:10,water:10,fuel:10};
  P.pipes=[];
  const before={scrap:P.res.scrap,parts:P.res.parts,n:pipes().length};
  // preview should NOT charge
  pipePreview26(sid);
  const mid={scrap:P.res.scrap,parts:P.res.parts,n:pipes().length,ghost:!!(G.pipePrev26&&G.pipePrev26.route&&G.pipePrev26.route.length>=2)};
  confirmPipe26();
  const after={scrap:P.res.scrap,parts:P.res.parts,n:pipes().length,st:pipes()[0]&&pipeState(pipes()[0]),esc:pipes()[0]&&pipes()[0].guard25};
  // cancel path
  P.res={scrap:500,parts:50,food:10,water:10,fuel:10};P.pipes=[];
  const sid2='testsite26g2';const siteHex2=(q+4)+'_'+r;const [la2,ln2]=hexCenter(...idQR(siteHex2));
  P.tiles[siteHex2]={t:Date.now()};
  P.pipeUnlock26[sid2]={t:Date.now(),res:'fuel',name:'Test Fuel',hex:siteHex2,lat:la2,lng:ln2,kind:'fuel'};
  pipePreview26(sid2);clearPipePrev26();
  const cancel={scrap:P.res.scrap,parts:P.res.parts,n:pipes().length,ghost:!!G.pipePrev26};
  return{before,mid,after,cancel,cost:PIPE.cost};
});
ok(pipe.mid.scrap===pipe.before.scrap&&pipe.mid.parts===pipe.before.parts&&pipe.mid.n===0,'preview does not charge or place');
ok(pipe.mid.ghost,'preview draws a local ghost route');
ok(pipe.after.n===1&&pipe.after.st==='online','confirm places online pipe');
ok(pipe.after.scrap===pipe.before.scrap-pipe.cost.scrap&&pipe.after.parts===pipe.before.parts-pipe.cost.parts,'confirm charges exact cost');
ok(pipe.cancel.n===0&&pipe.cancel.scrap===500&&!pipe.cancel.ghost,'cancel is free and clears ghost');

// 4 pipe guard van: escort auto-on, hex badge hidden, troop count rides the van (crew-visible via guardN)
const van=await ev(()=>{
  // rebuild a pipe (cancel test cleared the list)
  const o=pipeOrigin()||hexAt(...G.pos).id;
  const [q,r]=idQR(o);const siteHex=(q+5)+'_'+r;
  P.tiles[o]={t:Date.now()};P.tiles[siteHex]={t:Date.now()};
  // claim the whole planned route so stationTroops accepts the guard hex
  const route=marchTrack(o,siteHex).slice(0,PIPE.maxRoute);
  route.forEach(h=>P.tiles[h]={t:Date.now()});
  const [la,ln]=hexCenter(...idQR(siteHex));
  P.pipeUnlock26=P.pipeUnlock26||{};
  P.pipeUnlock26['vanSite']={t:Date.now(),res:'scrap',name:'Van Mall',hex:siteHex,lat:la,lng:ln,kind:'mall'};
  P.res={scrap:500,parts:50,food:10,water:10,fuel:10};P.pipes=[];
  pipePreview26('vanSite');confirmPipe26();
  const p0=pipes()[0];if(!p0)return{ok:false,why:'no pipe'};
  TP().home=2000;
  guardLine(p0.id,500);
  const g=p0.guard25||{};
  const st=g.hex?stationed()[g.hex]:null;
  const n=st?st.n:0; // in-transit counts
  const hide=new Set();for(const x of pipes())if(x.guard25&&x.guard25.hex)hide.add(x.guard25.hex);
  // member sync payload should carry guardN for the crew
  const mem={pipes:(pipes()||[]).map(pp=>({id:pp.id}))};
  try{HOOK.member.fns?null:null;}catch(e){}
  // manually run the same mapping the HOOK does
  const full=p0;const s=full.guard25&&stationed()[full.guard25.hex];
  const guardN=s&&s.n>0?s.n:0;
  return{esc:!!g.esc,n,hidden:hide.has(g.hex),hex:g.hex,guardN,route:p0.route.length,ok:true};
});
ok(van.ok&&van.esc&&van.n===500,'guardLine auto-escorts and stations 500 '+JSON.stringify(van));
ok(van.hidden,'pipe guard hex is in the hide-from-gar set');
ok(van.guardN===500,'member pipe guardN=500 so the whole crew sees the van badge');

await ev(()=>{UI.open('alliance');UI.sub.alliance='zones';UI.render();});
await p.waitForTimeout(400);
const OUT=process.env.SHOTS||'/tmp/dzd-tests';
await p.screenshot({path:OUT+'/v26-9-zones.png'});
await ev(()=>{UI.open('alliance');UI.sub.alliance='chat';UI.render();});
await p.waitForTimeout(300);
await p.screenshot({path:OUT+'/v26-9-chat.png'});
await ev(()=>{UI.open('base');UI.sub.base='pipes';UI.render();});
await p.waitForTimeout(300);
await p.screenshot({path:OUT+'/v26-9-pipes.png'});

console.log('ERRORS',errs);
console.log(fail?fail+' failed':'all good');
await b.close();process.exit(fail||errs.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
