// 11r health handoff. Real flat files, real SDK. No production Firebase.
const http=require('http'),fs=require('fs'),path=require('path');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc}=require('firebase/firestore');
const root=process.env.FLAT_PUBLIC||'/tmp/11r-pack/ddd-v26-11r-flat/public';
const repoRoot=path.join(__dirname,'../..');
const RES={scrap:2566,food:2855,water:2864,fuel:3000,parts:2992};
function profile(rev,hp,savedAt){
  const day=new Date().toLocaleDateString('en-CA');
  return {name:'QA-Test',lvl:1,xp:0,sp:0,hp:hp,_rev:rev,_savedAt:savedAt==null?5000:savedAt,acct:'qatest',res:{...RES},skills:{},badges:{},
    contrib:{kills:0,badges:0,raids:0,hexes:0,deposited:0,withdrawn:0,km:0},
    troops:{home:1000,queue:[],away:{}},stronghold:{level:2},world:{barracks:{level:1}},tiles:{},
    stats:{meters:0,kills:0},claimDay:{d:day,n:35},
    sync26:{clock:{devA:1},ops:[{id:'devA:1:troops',uid:'devA',n:1,k:'troops',t:1}],legacyAt:{},
      snap:{res:{...RES},tiles:{},troops:{home:1000,queue:[],away:{}},prog:{lvl:1,xp:0,meters:0,kills:0,badges:0,drives:0}}}};
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
  const team='hp'+Date.now().toString(36);
  const puppeteer=require('puppeteer-core');
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  const srv=await serve(8848);
  const seed=profile(34,100);
  async function open(width,height){
    const ctx=await browser.createBrowserContext();
    const page=await ctx.newPage();
    await page.setViewport({width,height});
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
    await page.evaluateOnNewDocument((t,p)=>{
      localStorage.setItem('wl_team',t);
      if(sessionStorage.getItem('wl_keep')!=='1')localStorage.setItem('wl_p',JSON.stringify(p));
      window.__writes=[];
      setInterval(()=>{try{
        if(typeof startGPS==='function')startGPS=function(){};
        if(typeof ensureStartSh26==='function')ensureStartSh26=function(){};
        if(typeof NET!=='undefined'&&NET.saveProfile&&!NET.saveProfile.__w){
          const orig=NET.saveProfile.bind(NET);
          const wrapped=function(id,body){let hp=null;try{hp=JSON.parse(body.data).hp;}catch(e){}window.__writes.push({rev:body.rev,hp});return orig(id,body);};
          wrapped.__w=1;NET.saveProfile=wrapped;
        }
      }catch(e){}},20);
    }, team, seed);
    await page.goto('http://127.0.0.1:8848/?team='+team,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>typeof NET!=='undefined'&&NET.uid&&Array.isArray(NET.base),{timeout:20000});
    return {page,uid:await page.evaluate(()=>NET.uid)};
  }
  const desk=await open(1280,800);
  const phone=await open(390,844);
  const other=await open(1280,800);
  async function stored(uid){
    let row=null;
    await env.withSecurityRulesDisabled(async c=>{
      const s=await getDoc(doc(c.firestore(),'teams',team,'saves',uid));
      if(!s.exists())return;
      const data=JSON.parse(s.data().data||'{}');
      row={rev:s.data().rev||0,hp:data.hp,savedAt:s.data().savedAt||0};
    });
    return row;
  }
  await env.withSecurityRulesDisabled(async c=>{
    const db=c.firestore();
    const body={data:JSON.stringify(seed),rev:34,savedAt:5000,name:'QA-Test',lvl:1,v:2,fe:0,acct:'qatest'};
    await setDoc(doc(db,'teams',team,'meta','alliance'),{acct24:{qatest:{name:'QA-Test',s:'salt',h:null,uids:[desk.uid,phone.uid,other.uid]}}});
    await setDoc(doc(db,'teams',team,'saves',desk.uid),body);
    await setDoc(doc(db,'teams',team,'saves',phone.uid),body);
    await setDoc(doc(db,'teams',team,'saves',other.uid),body);
  });
  async function arm(page){
    await page.evaluate(raw=>{
      sessionStorage.removeItem('wl_keep');
      Storage.prototype.setItem.call(localStorage,'wl_p',JSON.stringify(raw));
      G.syncHoldUntil=0;
    }, seed);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof G!=='undefined'&&G.sync26Ready,{timeout:20000});
    await page.evaluate(()=>{UI.sub.player='save';UI.open('player');UI.render();window.__writes=[];});
  }
  await arm(desk.page); await arm(phone.page); await arm(other.page);
  await new Promise(r=>setTimeout(r,32000));
  const regen=await desk.page.evaluate(()=>({hp:P.hp|0,rev:P._rev||0,sheet:!$('#sheet').classList.contains('hidden'),modal:!$('#modal').classList.contains('hidden'),sub:UI.sub.player,report:CS.report||'',writes:window.__writes||[]}));
  const regenPhone=await phone.page.evaluate(()=>({hp:P.hp|0,rev:P._rev||0,sheet:!$('#sheet').classList.contains('hidden'),modal:!$('#modal').classList.contains('hidden'),sub:UI.sub.player,writes:(window.__writes||[]).length}));
  const regenDoc=await stored(desk.uid);
  console.log('regen', JSON.stringify({desk:regen,phone:regenPhone,doc:regenDoc}));
  ok(regen.hp>100&&regen.rev===34&&regen.sheet&&!regen.modal&&regen.sub==='save'&&regen.writes.length===0&&regenDoc.rev===34&&regenDoc.hp===100,'desktop recovery for 30s stays on Save and does not upload');
  ok(regenPhone.hp>100&&regenPhone.rev===34&&regenPhone.sheet&&!regenPhone.modal&&regenPhone.sub==='save'&&regenPhone.writes===0,'phone recovery for 30s stays on Save and does not upload');
  const wound=await desk.page.evaluate(async()=>{
    P.hp=40;save();window.__writes=[];
    await syncNow26();
    return {hp:P.hp|0,rev:P._rev||0,report:CS.report||'',why:CS.why||'',writes:window.__writes||[],sheet:!$('#sheet').classList.contains('hidden')};
  });
  const woundDoc=await stored(desk.uid);
  console.log('wound', JSON.stringify({wound,woundDoc}));
  ok(wound.hp===40&&wound.rev===34&&!/Safe to switch/.test(wound.report)&&wound.writes.length===0&&woundDoc.rev===34&&woundDoc.hp===100&&wound.sheet,'an unsaved wound is not Safe and is not uploaded');
  const manual=await desk.page.evaluate(async()=>{
    window.__writes=[];
    const btn=[...document.querySelectorAll('#sheetBody button')].find(b=>/Save to the cloud/.test(b.textContent));
    if(!btn)return {missing:true};
    btn.click();
    await new Promise(r=>setTimeout(r,500));
    return {hp:P.hp|0,rev:P._rev||0,report:CS.report||'',why:CS.why||'',writes:window.__writes||[]};
  });
  const manualDoc=await stored(desk.uid);
  console.log('manual', JSON.stringify({manual,manualDoc}));
  ok(!manual.missing&&manual.hp===40&&manualDoc.hp===40&&manualDoc.rev===35&&manual.rev===35&&/Safe to switch/.test(manual.report),'the Save button stores the wounded health');
  const noop=await desk.page.evaluate(async()=>{
    const before=P._rev||0;window.__writes=[];
    await cloudSave(true);
    return {before,rev:P._rev||0,hp:P.hp|0,writes:(window.__writes||[]).length};
  });
  const noopDoc=await stored(desk.uid);
  ok(noop.rev===noop.before&&noop.hp===40&&noop.writes===0&&noopDoc.rev===35&&noopDoc.hp===40,'the same confirmed health does not write again');
  const adopted=await other.page.evaluate(async()=>{
    window.__writes=[];
    await syncNow26();
    return {hp:P.hp|0,rev:P._rev||0,report:CS.report||'',writes:window.__writes||[]};
  });
  const sourceStill=await stored(desk.uid);
  const otherDoc=await stored(other.uid);
  console.log('adopt', JSON.stringify({adopted,sourceStill,otherDoc}));
  ok(adopted.hp===40&&sourceStill.hp===40&&sourceStill.rev===35&&otherDoc.hp===100&&!adopted.writes.some(w=>w.hp===100),'the other device takes confirmed 40 and does not write the old 100 over it');
  await other.page.evaluate(()=>{sessionStorage.setItem('wl_keep','1');});
  await other.page.reload({waitUntil:'domcontentloaded'});
  await other.page.waitForFunction(()=>typeof P!=='undefined'&&P.hp!=null&&G&&G.sync26Ready,{timeout:20000});
  const otherBack=await other.page.evaluate(()=>({hp:P.hp|0,rev:P._rev||0,report:CS.report||''}));
  const sourceAfter=await stored(desk.uid);
  console.log('other-reload', JSON.stringify({otherBack,sourceAfter}));
  ok(otherBack.hp===40&&sourceAfter.hp===40&&sourceAfter.rev===35,'a reload of the other device keeps 40');
  await desk.page.evaluate(()=>{sessionStorage.setItem('wl_keep','1');});
  await desk.page.reload({waitUntil:'domcontentloaded'});
  await desk.page.waitForFunction(()=>typeof P!=='undefined'&&(P._rev||0)>=35&&G&&G.sync26Ready,{timeout:20000});
  const sourceBack=await desk.page.evaluate(()=>({hp:P.hp|0,rev:P._rev||0,report:CS.report||''}));
  console.log('source-reload', JSON.stringify(sourceBack));
  ok(sourceBack.hp===40&&sourceBack.rev===35&&/Safe to switch/.test(sourceBack.report),'the source comes back at the confirmed 40');
  const agedAt=Date.now()-30000;
  const aged=profile(36,40,agedAt);
  await env.withSecurityRulesDisabled(async c=>{
    await setDoc(doc(c.firestore(),'teams',team,'saves',desk.uid),{data:JSON.stringify(aged),rev:36,savedAt:agedAt,name:'QA-Test',lvl:1,v:2,fe:0,acct:'qatest'});
  });
  const caught=await desk.page.evaluate(async()=>{
    P.hp=100;P._rev=35;save();
    await syncNow26();
    return {hp:P.hp|0,max:stats().hp|0};
  });
  console.log('elapsed', JSON.stringify(caught));
  ok(caught.hp===46&&caught.hp<caught.max,'thirty seconds of recovery from 40 is 46, not the old 100');
  await browser.close(); srv.close(); await env.cleanup();
  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',String(e&&e.stack||e).split('\n').slice(0,8).join(' | '));process.exit(1);});
