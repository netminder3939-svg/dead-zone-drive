// Persisted proof for the extracted 11o archive. Real SDK. No production Firebase.
const http=require('http'),fs=require('fs'),path=require('path');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc}=require('firebase/firestore');
const root=process.env.FLAT_PUBLIC||'/tmp/11o-exact/ddd-v26-11o-flat/public';
const repoRoot=path.join(__dirname,'../..');
const RES={scrap:2566,food:2855,water:2864,fuel:3000,parts:2992};
function snap(){return {res:{...RES},tiles:{},troops:{home:1000,queue:[],away:{}},prog:{lvl:1,xp:0,meters:0,kills:0,badges:0,drives:0}};}
function profile(rev,savedAt,clock,ops,home){
  const day=new Date().toLocaleDateString('en-CA');
  return {name:'QA-Test',lvl:1,xp:0,sp:0,hp:100,acct:'qatest',_rev:rev,_savedAt:savedAt,res:{...RES},skills:{},badges:{},contrib:{kills:0,badges:0,raids:0,hexes:0,deposited:0,withdrawn:0,km:0},troops:{home:home==null?1000:home,queue:[],away:{}},stronghold:{level:2},world:{barracks:{level:1}},tiles:{},stats:{meters:0,kills:0},claimDay:{d:day,n:0},sync26:{clock,ops,legacyAt:{},snap:snap()}};
}
function serve(port){
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
  const srv=http.createServer((q,res)=>{
    const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'')||'index.html';
    const f=path.join(root,rel);
    if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('missing');}
    res.writeHead(200,{'content-type':(types[path.extname(f)]||'application/octet-stream')+'; charset=utf-8','cache-control':'no-store'});
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r=>srv.listen(port,'127.0.0.1',()=>r(srv)));
}
(async()=>{
  let fail=0;function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
  const rules=fs.readFileSync(path.join(repoRoot,'tests/fixtures/published-firestore-rules.rules'),'utf8');
  const env=await initializeTestEnvironment({projectId:'dead-zone-drive',firestore:{host:'127.0.0.1',port:8080,rules}});
  const team='adopt'+Date.now().toString(36);
  const puppeteer=require('puppeteer-core');
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  const srv=await serve(8834);
  async function open(){
    const ctx=await browser.createBrowserContext();
    const page=await ctx.newPage();
    await page.setRequestInterception(true);
    page.on('request',req=>{
      const u=req.url();
      const cors={'access-control-allow-origin':'*','content-type':'text/javascript'};
      if(u.indexOf('firebase-firestore.js')>=0)return req.respond({status:200,headers:cors,body:fs.readFileSync('/tmp/firestore-emu-11k.js')});
      if(u.indexOf('firebase-auth.js')>=0)return req.respond({status:200,headers:cors,body:fs.readFileSync('/tmp/auth-emu-fast.js')});
      let host=''; try{host=new URL(u).hostname;}catch(e){}
      if(host==='www.gstatic.com'||host==='127.0.0.1'||host==='localhost')return req.continue();
      return req.abort();
    });
    const seed=profile(33,5000,{devA:1},[{id:'devA:1:troops',uid:'devA',n:1,k:'troops',t:1}]);
    seed.troops.stationed={};seed.troops.returning=[];seed.troops.gl25Seen=0;
    await page.evaluateOnNewDocument((t,p)=>{
      localStorage.setItem('wl_team',t);if(!localStorage.getItem('wl_lock'))localStorage.setItem('wl_p',JSON.stringify(p));
      setInterval(()=>{try{if(typeof startGPS==='function')startGPS=function(){};if(typeof ensureStartSh26==='function')ensureStartSh26=function(){};}catch(e){}},20);
    }, team, seed);
    await page.goto('http://127.0.0.1:8834/?team='+team,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>typeof G!=='undefined',{timeout:15000});
    await page.evaluate(()=>{G.syncHoldUntil=Date.now()+600000;});
    await page.waitForFunction(()=>typeof NET!=='undefined'&&NET.uid&&Array.isArray(NET.base),{timeout:20000});
    return {page,uid:await page.evaluate(()=>NET.uid)};
  }
  async function stored(uid){
    let row=null;
    await env.withSecurityRulesDisabled(async c=>{
      const s=await getDoc(doc(c.firestore(),'teams',team,'saves',uid));
      if(!s.exists())return;
      const data=JSON.parse(s.data().data||'{}');
      row={rev:s.data().rev||0,home:data.troops&&data.troops.home|0};
    });
    return row;
  }
  const source=await open();
  const idle=await open();
  const bare=profile(33,5000,{devA:1},[{id:'devA:1:troops',uid:'devA',n:1,k:'troops',t:1}]);
  const withEmpty=JSON.parse(JSON.stringify(bare));
  withEmpty.troops.stationed={};withEmpty.troops.returning=[];withEmpty.troops.wounded=0;withEmpty.troops.gl25Seen=0;
  await env.withSecurityRulesDisabled(async c=>{
    const db=c.firestore();
    await setDoc(doc(db,'teams',team,'meta','alliance'),{acct24:{qatest:{name:'QA-Test',s:'salt',h:null,uids:[source.uid,idle.uid]}}});
    await setDoc(doc(db,'teams',team,'saves',source.uid),{data:JSON.stringify(bare),rev:33,savedAt:5000,name:'QA-Test',lvl:1,v:2,fe:0,acct:'qatest'});
    await setDoc(doc(db,'teams',team,'saves',idle.uid),{data:JSON.stringify(withEmpty),rev:23,savedAt:3000,name:'QA-Test',lvl:1,v:2,fe:0,acct:'qatest'});
  });
  async function arm(page,p){await page.evaluate(raw=>{Storage.prototype.setItem.call(localStorage,'wl_lock','1');Storage.prototype.setItem.call(localStorage,'wl_p',JSON.stringify(raw));G.syncHoldUntil=0;},p);}
  await arm(source.page,bare);
  await arm(idle.page,withEmpty);
  await source.page.reload({waitUntil:'domcontentloaded'});
  await idle.page.reload({waitUntil:'domcontentloaded'});
  await source.page.waitForFunction(()=>typeof G!=='undefined'&&G.sync26Ready,{timeout:20000});
  await new Promise(r=>setTimeout(r,2000));
  const idleSource=await stored(source.uid);
  const idleLinked=await stored(idle.uid);
  const idleUi=await source.page.evaluate(()=>({report:(typeof CS!=='undefined'&&CS.report)||'',home:P.troops.home|0}));
  console.log('idle-docs', JSON.stringify({source:idleSource,linked:idleLinked,ui:idleUi}));
  ok(!/Both devices changed/.test(idleUi.report)&&idleUi.home===1000&&idleSource.rev===33&&idleSource.home===1000&&idleLinked.rev===23&&idleLinked.home===1000,'an open second window does not overwrite either document when the troop state matches');
  await source.page.evaluate(()=>{P.troops.home=900;save();G.syncHoldUntil=0;});
  await source.page.evaluate(async()=>{await cloudSave(true);});
  await source.page.waitForFunction(()=>P&&P.troops&&P.troops.home===900&&(P._rev||0)>=34,{timeout:20000});
  const spent=await stored(source.uid);
  const linkedAfterSpend=await stored(idle.uid);
  console.log('spent-docs', JSON.stringify({source:spent,linked:linkedAfterSpend}));
  ok(spent.rev===34&&spent.home===900&&linkedAfterSpend.rev===23&&linkedAfterSpend.home===1000,'the one-sided spend is stored on the source and the idle document is not overwritten');
  await idle.page.evaluate(()=>{G.syncHoldUntil=0;return window.syncNow26&&window.syncNow26();});
  await idle.page.waitForFunction(()=>P&&P.troops&&P.troops.home===900&&(P._rev||0)>=34,{timeout:20000});
  const adoptedUi=await idle.page.evaluate(()=>({report:(typeof CS!=='undefined'&&CS.report)||'',home:P.troops.home|0,rev:P._rev||0}));
  const sourceStill=await stored(source.uid);
  console.log('adopted', JSON.stringify({ui:adoptedUi,source:sourceStill}));
  ok(!/Both devices changed/.test(adoptedUi.report)&&adoptedUi.home===900&&adoptedUi.rev>=34&&sourceStill.rev===34&&sourceStill.home===900,'the already open window adopts the newer revision and does not rewrite the source');
  await source.page.reload({waitUntil:'domcontentloaded'});
  await source.page.waitForFunction(()=>P&&P.troops&&P.troops.home===900&&G&&G.sync26Ready,{timeout:20000});
  const back=await source.page.evaluate(()=>({report:(typeof CS!=='undefined'&&CS.report)||'',home:P.troops.home|0,rev:P._rev||0}));
  const backDoc=await stored(source.uid);
  console.log('reread', JSON.stringify({ui:back,doc:backDoc}));
  ok(!/Both devices changed/.test(back.report)&&back.home===900&&back.rev===34&&backDoc.rev===34&&backDoc.home===900,'the source reload reads the stored spend back without a conflict');
  await browser.close(); srv.close(); await env.cleanup();
  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',String(e&&e.stack||e).split('\n').slice(0,8).join(' | '));process.exit(1);});
