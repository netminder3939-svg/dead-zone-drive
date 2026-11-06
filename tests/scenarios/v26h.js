// v26-10: tap escort van → info card (who / troops / protection), no fight
const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch();const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.8135,longitude:-116.8968,accuracy:10},permissions:['geolocation']});
const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>localStorage.setItem('wl_team','zz-v26h'));
await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(700);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Pope');await p.fill('#obTeam','zz-v26h');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos&&P.world&&typeof pipeVanCard26==='function',null,{timeout:30000});
await p.waitForTimeout(1500);
const ev=async(f,a)=>{for(let i=0;i<3;i++){try{return await p.evaluate(f,a);}catch(e){if(!/context was destroyed/.test(e.message))throw e;await p.waitForTimeout(800);}}};
let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;};

const r=await ev(()=>{
  const o=pipeOrigin()||hexAt(...G.pos).id;
  if(!W().sh||W().sh.state==='down')W().sh={hex:o,hpPct:1,state:'up',everBuilt:true};
  const [q,r]=idQR(o);const siteHex=(q+4)+'_'+r;
  const route=marchTrack(o,siteHex).slice(0,PIPE.maxRoute);
  route.forEach(h=>P.tiles[h]={t:Date.now()});
  const [la,ln]=hexCenter(...idQR(siteHex));
  P.pipeUnlock26={vh:{t:Date.now(),res:'water',name:'Van Tap Tower',hex:siteHex,lat:la,lng:ln,kind:'water_tower'}};
  P.res={scrap:500,parts:50,food:20,water:20,fuel:20};P.pipes=[];P.cls={id:'engineer'};
  pipePreview26('vh');confirmPipe26();
  const p0=pipes()[0];TP().home=3000;guardLine(p0.id,1500);
  drawPipes();
  pipeVanCard26(p0.id);
  const mb=(document.querySelector('#modalBody')||{}).innerText||'';
  const mem={id:p0.id}; // simulate member payload
  const s=stationed()[p0.guard25.hex];
  return{
    open:/Pipeline escort|WHO IS GUARDING|walls block/i.test(mb),
    name:/Pope|you/i.test(mb),
    troops:/1[,.]?500|1500/i.test(mb),
    cls:/Engineer|Tank|🛡/i.test(mb),
    walls:/\b10%|walls block/i.test(mb),
    noFight:!/Auto-battle|Defend now|⚔️ Fight/i.test(mb),
    mb:mb.slice(0,400),
    guardN:s&&s.n,
    hasFn:typeof pipeVanCard26==='function'
  };
});
ok(r.hasFn,'pipeVanCard26 exists');
ok(r.open,'escort info card opens');
ok(r.name,'card shows who (name)');
ok(r.troops,'card shows troop count');
ok(r.cls,'card shows class/type');
ok(r.walls,'card shows walls / protection');
ok(r.noFight,'card is info only (no fight buttons)');
ok(r.guardN===1500,'1500 troops stationed for escort');

const OUT=process.env.SHOTS||'/tmp/dzd-tests';
await p.waitForTimeout(400);
await p.screenshot({path:OUT+'/v26-10-van-card.png'});
console.log('CARD',r.mb);
console.log('ERRORS',errs);
await b.close();process.exit(fail||errs.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
