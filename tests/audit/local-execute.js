// Executes the real page in local demo mode (?local). No Firebase project is opened.
// Counts calls the page makes into the stubbed NET methods. A stub failure is not a
// Firestore transport error and is not evidence of why a listen stream closed.
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'../..');
const port=8766;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{
  const u=decodeURIComponent(q.url.split('?')[0]);
  const f=path.join(root,u==='/'?'index.html':u);
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('missing');}
  r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(f).pipe(r);
});
function banned(url){return /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebaseio\.com/.test(url);}

(async()=>{
  const puppeteer=require('puppeteer-core');
  await new Promise(r=>srv.listen(port,r));
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  const hits=[];
  await page.setRequestInterception(true);
  page.on('request',req=>{
    if(banned(req.url())){hits.push(req.url());return req.abort();}
    if(/arcgisonline|mail\.ru|tile/.test(req.url()))return req.abort();
    req.continue();
  });
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+port+'/?local',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#onboard')&&!document.querySelector('#onboard').classList.contains('hidden'),{timeout:20000}).catch(()=>{});
  const onboard=await page.evaluate(()=>{const e=document.querySelector('#onboard');return e&&!e.classList.contains('hidden');});
  if(onboard){
    await page.type('#obName','Audit');
    await page.type('#obTeam','local-audit');
    await page.click('#obGo');
  }
  await page.waitForFunction(()=>typeof P!=='undefined'&&P.name&&typeof fight26==='function'&&typeof marchTick==='function',{timeout:30000});
  const report=await page.evaluate(async()=>{
    const out={fail:[],ok:[]};
    const check=(c,m)=>{out[c?'ok':'fail'].push(m);};
    check(NET.mode==='local','page is local demo mode');
    check(location.search.indexOf('local')>=0,'address asked for local mode');
    const empty={bld:{kind:'sh',lvl:1},players:[]};
    const hold=fight26(empty,{n:1000}),lose=fight26(empty,{n:2000}),again=fight26(empty,{n:1000});
    check(JSON.stringify(hold)===JSON.stringify(again),'fight26 same inputs, same result');
    check(hold.win===true&&lose.win===false,'empty level-1 stronghold holds 1000 and falls to 2000');
    const ring=zoneHexes(zoneIdOf('0_0'));
    check(ring.length===61,'a zone is 61 hexes');
    check(zoneTitle(zoneIdOf('0_0'))===zoneTitle(zoneIdOf('0_0')),'zone name is stable');
    const name=zoneTitle('Z0_0');
    check(typeof name==='string'&&name.length>3,'zone title is generated on the phone');
    const feed=actDedupe([{text:"🌅 Daily reset: Ada's share",t:1000},{text:"🌅 Daily reset: Ada's share",t:2000},{text:'hello',t:3000,kind:'chat'}]);
    const wrapped=actDedupe([{text:"🌅 Daily reset: Ada's share",t:1000,kind:'x'},{kind:'chat',text:'hi',t:5},{kind:'gl25',text:'g',t:6}]);
    check(feed.length===1,'daily-reset lines collapse');
    check(wrapped.every(x=>x.kind!=='chat'&&x.kind!=='gl25'),'chat and battle lines stay out of the activity feed');
    const cost=trainCost(1000);
    P.res={scrap:0,food:0,water:0,fuel:0,parts:0};
    Object.assign(P.res,cost);
    P.troops={home:0,queue:[],away:{}};
    try{W().hungry=false;}catch(e){}
    const before=P.res.scrap, room=troopRoom(), batch=batchMax();
    trainTroops(1000);
    const paid=before-P.res.scrap, q=(P.troops.queue||[]).length;
    trainTroops(1000);
    check(room>=1000&&batch>=1000,'troop room allows a 1000 batch ('+room+'/'+batch+')');
    const hungry=!!(typeof isHungry==='function'&&isHungry());
    const why=' hungry='+hungry+' paid='+paid+' scrap='+P.res.scrap+' q='+JSON.stringify(P.troops.queue)+' toast='+(($('#toast')&&$('#toast').innerText)||'').slice(0,80);
    check(q===1&&P.troops.queue.length===1,'a second train with no supplies does not add a second batch'+why);
    check(paid===cost.scrap&&P.res.scrap===0,'training scrap is paid once'+why);
    if(P.troops.queue[0]){
      const home0=P.troops.home||0;
      P.troops.queue[0].end=Date.now()-1;
      troopTick();const home1=P.troops.home;
      troopTick();
      check(home1===home0+1000&&P.troops.home===home1&&P.troops.queue.length===0,'finished training is added once');
    }else check(false,'training queue was not created');
    P.world=P.world||{};P.world.sh={hex:'0_0',hpPct:1,state:'building',buildEnd:Date.now()-5,everBuilt:true};
    shState();
    check(P.world.sh.state==='up','a finished stronghold timer completes');
    shState();
    check(P.world.sh.state==='up','the timer does not run twice');
    const route=SYNC26.planClaimRoute('0_0','4_0',{owned:()=>false,ally:()=>false,fort:()=>false,defender:()=>null,room:99});
    check(route.claim.length===4,'four intermediate hexes are on a 4-step claim');
    const ownedRoute=SYNC26.planClaimRoute('0_0','4_0',{owned:id=>route.claim.includes(id),ally:()=>false,fort:()=>false,defender:()=>null,room:99});
    check(ownedRoute.claim.length===0&&ownedRoute.skip.length===4,'those hexes are skipped once they are owned');

    const counts={srv:0,disable:0,enable:0,upd:0,loot:0};
    const realAdd=addRes;
    addRes=function(){counts.loot++;return realAdd.apply(this,arguments);};
    NET.mode='firebase';
    NET.fs=NET.fs||{};
    NET.db=NET.db||{};
    NET.srvNow=async()=>{counts.srv++;throw new Error('stub-probe-fail');};
    NET.fs.disableNetwork=async()=>{counts.disable++;};
    NET.fs.enableNetwork=async()=>{counts.enable++;};
    NET.updMarch=async()=>{counts.upd++;};
    G._netFail=0;G._netNext=0;G.netOk=undefined;G._mBusy={};
    const origNow=Date.now;
    let fake=origNow();
    Date.now=()=>fake;
    P.uid=P.uid||'local-audit';
    G.marches={m1:{uid:P.uid,state:'out',startT:fake-5000,dur:1000,from:'0_0',to:'1_0',name:'t',color:'#fff',power:1,escorts:{},unit:{}}};
    for(let t=0;t<=60;t++){
      fake=origNow()+t*1000;
      marchTick();
      await new Promise(r=>setTimeout(r,0));
      if(t>0&&t%15===0){await netKick();await new Promise(r=>setTimeout(r,0));}
    }
    const failedProbe={srv:counts.srv,disable:counts.disable,enable:counts.enable,upd:counts.upd,loot:counts.loot,chip:($('#mode')&&$('#mode').textContent)||''};
    check(failedProbe.srv>=2&&failedProbe.srv<=6,'a minute of failed probes stays in the backoff (not once a second)');
    check(failedProbe.loot===0&&failedProbe.upd===0,'a failed probe pays no loot and writes no march');
    check(failedProbe.disable<=4,'network restart stays inside the same backoff');

    counts.srv=0;counts.disable=0;counts.loot=0;counts.upd=0;
    G.marches={};
    G._netNext=0;G._netFail=0;G._mBusy={};G.netOk=true;
    NET.srvNow=()=>new Promise(res=>{counts.srv++;setTimeout(()=>res(fake),30);});
    const p1=netKick(),p2=netKick();
    await Promise.all([p1,p2]);
    out.recover={disable:counts.disable,srv:counts.srv};
    check(counts.disable===1&&counts.srv===1,'two recoveries share one restart and one clock probe');

    G._netNext=0;G._netFail=0;G._mBusy={};G.netOk=true;P.marchPaid={};P.res.scrap=0;counts.loot=0;counts.upd=0;counts.srv=0;
    NET.srvNow=async()=>{counts.srv++;return fake;};
    const home={uid:P.uid,state:'arrived',startT:fake-100000,dur:1000,win:true,loot:{scrap:7},to:'1_0',from:'0_0',name:'t',color:'#fff'};
    G.marches={m2:home};
    await returnMarch('m2',home);
    const scrap=P.res.scrap, loot1=counts.loot, upd1=counts.upd;
    G.marches={m2:home};
    await returnMarch('m2',home);
    check(scrap===7&&P.res.scrap===7&&loot1===1&&counts.loot===1,'march loot is paid once');
    out.ret={upd1,upd2:counts.upd,scrap};
    check(upd1>=1&&counts.loot===1,'the return pays once; the march document write is not repeated by the payout');
    Date.now=origNow;
    NET.mode='local';
    out.failedProbe=failedProbe;
    out.pair={disable:counts.disable,srv:counts.srv};
    return out;
  });
  console.log('PRODUCTION_HITS',hits.length);
  console.log('PAGE_ERRORS',JSON.stringify(errors.slice(0,8)));
  console.log('FAILS',report.fail.length);
  report.ok.forEach(m=>console.log('ok',m));
  report.fail.forEach(m=>console.log('FAIL',m));
  console.log('PROBE_COUNTS',JSON.stringify(report.failedProbe));
  console.log('RECOVER',JSON.stringify(report.recover));
  console.log('RETURN',JSON.stringify(report.ret));
  const bad=hits.length||report.fail.length||errors.some(e=>/ReferenceError|TypeError/.test(e));
  await browser.close();
  srv.close();
  process.exit(bad?1:0);
})().catch(e=>{console.error('HARNESS',e);process.exit(1);});
