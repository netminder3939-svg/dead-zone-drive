// Two real browser pages run the real sync26 handoff against an in-memory server.
// This is not Firebase and not a live account.
const http=require('http'),fs=require('fs'),path=require('path');
const puppeteer=require('puppeteer-core');
const root=path.join(__dirname,'../..');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
function serve(){
  const srv=http.createServer((q,res)=>{
    const rel=decodeURIComponent(q.url.split('?')[0]);
    const file=rel==='/'?path.join(__dirname,'handoff-harness.html'):path.join(root,rel.replace(/^\/+/,''));
    if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end('missing');}
    const type=file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8';
    res.writeHead(200,{'content-type':type,'cache-control':'no-store'});
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r=>srv.listen(0,'127.0.0.1',()=>r(srv)));
}
function prof(extra){
  return Object.assign({name:'pope',lvl:6,xp:10,hp:100,_rev:1,
    res:{scrap:412,food:330,water:227,fuel:90,parts:78},
    tiles:{a:{t:1}},troops:{home:1000,queue:[],away:{}},
    world:{sh:{hex:'1_1',state:'up'},barracks:{level:1},outposts:{},towers:{}},
    pipeUnlock26:{},stats:{meters:1,kills:0},stronghold:{level:6},
    sync26:{clock:{},ops:[],legacyAt:{}}},extra||{});
}
(async()=>{
  const srv=await serve();
  const port=srv.address().port;
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  let server=null;
  const writes=[];
  async function open(tab){
    const page=await browser.newPage();
    await page.exposeFunction('__load',async()=>server?JSON.parse(JSON.stringify(server)):null);
    await page.exposeFunction('__write',async(doc)=>{writes.push({tab,rev:doc.rev,baseRev:doc.baseRev,v:doc.v,scrap:doc.profile.res.scrap,outpost:!!(doc.profile.world.outposts&&doc.profile.world.outposts.H)});server={rev:doc.rev,profile:doc.profile};});
    await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.SYNC26&&SYNC26.runCloudHandoff);
    return page;
  }
  const phone=await open('phone');
  const desk=await open('desk');
  async function run(page,tab,profile,background){
    return page.evaluate(async(p,tab,background)=>{
      const r=await SYNC26.runCloudHandoff(p,{arm:true,tab,background,load:()=>window.__load(),write:(doc)=>window.__write(doc)});
      return {wrote:!!r.wrote,adopt:!!r.adopt,why:r.why||'',rev:r.rev||0,scrap:r.local&&r.local.res&&r.local.res.scrap,outpost:!!(r.local&&r.local.world&&r.local.world.outposts&&r.local.world.outposts.H),report:r.report||''};
    },profile,tab,!!background);
  }
  const spent=prof({res:{scrap:230,food:236,water:213,fuel:83,parts:77},troops:{home:1900,queue:[],away:{}},pipeUnlock26:{site:1},xp:40,
    world:{sh:{hex:'1_1',state:'up'},barracks:{level:1},towers:{},outposts:{H:{state:'up',hpPct:1}}}});
  const saved=await run(phone,'phone',Object.assign(spent,{_userEdit:1}));
  ok(saved.wrote&&saved.rev===2&&saved.outpost&&writes.length===1&&writes[0].v===3&&writes[0].scrap===230,'browser phone write keeps the outpost and the spent scrap');
  const adopted=await run(desk,'desk',prof());
  ok(adopted.adopt&&adopted.wrote===false&&adopted.scrap===230&&adopted.outpost&&writes.length===1,'browser desktop adopts that save and does not write');
  const stale=prof();stale.res.scrap=900;stale._tab='phone';stale._handoff=1;stale._ackedRev=2;stale._rev=2;
  const ignored=await run(desk,'desk',stale);
  ok(ignored.adopt&&ignored.scrap===230&&writes.length===1,'browser stale tab does not re-credit scrap');
  const hidden=JSON.parse(JSON.stringify(server.profile));hidden.res.food+=9;
  const before=writes.length;
  const hid=await run(phone,'phone',hidden,true);
  ok(hid.wrote===false&&writes.length===before&&hid.why==='background','browser hide does not upload a passive tick');
  const offline=await phone.evaluate(async()=>{
    const p={name:'pope',lvl:6,xp:1,hp:100,_rev:2,_handoff:1,_ackedRev:2,_tab:'phone',res:{scrap:230,food:1,water:1,fuel:1,parts:1},troops:{home:1},world:{sh:{hex:'1_1',state:'up'},outposts:{H:{state:'up'}}},tiles:{},sync26:{clock:{},ops:[]}};
    const r=await SYNC26.runCloudHandoff(p,{arm:true,tab:'phone',load:async()=>{throw {code:'unavailable',message:'offline'};},write:async()=>{throw new Error('should not write');}});
    return {wrote:!!r.wrote,adopt:!!r.adopt,why:r.why,safe:/Safe to switch/.test(r.report||''),outpost:!!(r.local.world.outposts&&r.local.world.outposts.H)};
  });
  ok(offline.wrote===false&&offline.adopt===false&&offline.why==='load-error'&&offline.safe===false&&offline.outpost,'browser failed read keeps the local outpost and does not say safe');
  await browser.close();srv.close();
  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
