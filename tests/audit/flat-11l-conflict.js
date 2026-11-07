// 11l startup conflict. Real flat files, real Firebase 10.12.2. No production calls.
const http=require('http'),fs=require('fs'),path=require('path');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc}=require('firebase/firestore');
const root=process.env.FLAT_PUBLIC||'/tmp/11m-pack/ddd-v26-11m-flat/public';
const repoRoot=path.join(__dirname,'../..');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const RES={scrap:2566,food:2855,water:2864,fuel:3000,parts:2992};
const TROOPS={home:1000,queue:[],away:{}};
function snap(){return {res:{...RES},tiles:{},troops:JSON.parse(JSON.stringify(TROOPS)),prog:{lvl:1,xp:0,meters:0,kills:0,badges:0,drives:0}};}
function op(uid,n,k){return {id:uid+':'+n+':'+k,uid,n,k,t:n,d:k==='res'?{scrap:1}:undefined};}
function journal(clock,ops){return {clock,ops,legacyAt:{},snap:snap()};}
const SPLIT_A=journal({devA:1},[op('devA',1,'res')]);
const SPLIT_B=journal({devB:1},[op('devB',1,'troops')]);
const BOTH=journal({devA:1,devB:1},[op('devA',1,'res'),op('devB',1,'troops')]);
function profile(rev,savedAt,sync){
  return {name:'QA-Test',lvl:1,acct:'qatest',_rev:rev,_savedAt:savedAt,res:{...RES},troops:JSON.parse(JSON.stringify(TROOPS)),stronghold:{level:2},tiles:{},dr26:[],stats:{meters:0,kills:0},sync26:sync};
}
function serve(port){
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
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
  let auth=fs.readFileSync('/tmp/firebase-auth-10.12.2.js','utf8');
  auth=auth.replace('export{', 'const __getAuthOrig=getAuth;function getAuthEmulatorWrap(e){const au=__getAuthOrig(e);try{connectAuthEmulator(au,"http://127.0.0.1:9099",{disableWarnings:true});}catch(err){}if(!au.__delayed){au.__delayed=1;const ready=au.authStateReady.bind(au);au.authStateReady=function(){return ready().then(function(){return new Promise(function(r){setTimeout(r,4000);});});};}return au;}\nexport{');
  auth=auth.replace('getAuth,getIdToken','getAuthEmulatorWrap as getAuth,getIdToken');
  fs.writeFileSync('/tmp/auth-emu-4000.js', auth);
  const rules=fs.readFileSync(path.join(repoRoot,'tests/fixtures/published-firestore-rules.rules'),'utf8');
  const env=await initializeTestEnvironment({projectId:'dead-zone-drive',firestore:{host:'127.0.0.1',port:8080,rules}});
  const team='conf'+Date.now().toString(36);
  const puppeteer=require('puppeteer-core');
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  const srv=await serve(8831);
  const prod=[];
  async function open(which){
    const ctx=await browser.createBrowserContext();
    const page=await ctx.newPage();
    await page.setRequestInterception(true);
    page.on('request',req=>{
      const u=req.url();
      const cors={'access-control-allow-origin':'*','content-type':'text/javascript'};
      if(u.indexOf('firebase-firestore.js')>=0)return req.respond({status:200,headers:cors,body:fs.readFileSync('/tmp/firestore-emu-11k.js')});
      if(u.indexOf('firebase-auth.js')>=0)return req.respond({status:200,headers:cors,body:fs.readFileSync('/tmp/auth-emu-4000.js')});
      let host=''; try{host=new URL(u).hostname;}catch(e){}
      if(host==='www.gstatic.com'||host==='127.0.0.1'||host==='localhost')return req.continue();
      prod.push(host);return req.abort();
    });
    await page.evaluateOnNewDocument((t,p)=>{
      localStorage.setItem('wl_team',t);if(!localStorage.getItem('wl_lock'))localStorage.setItem('wl_p',JSON.stringify(p));
      setInterval(()=>{
        try{if(typeof startGPS==='function')startGPS=function(){};}catch(e){}
        try{if(typeof ensureStartSh26==='function')ensureStartSh26=function(){};}catch(e){}
        try{if(typeof CS!=='undefined'&&/Both devices changed/.test(CS.report||''))window.__saw=CS.why||'yes';}catch(e){}
      },20);
    }, team, profile(33,5000,SPLIT_A));
    await page.goto('http://127.0.0.1:8831/?team='+team,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>typeof G!=='undefined',{timeout:15000});
    await page.evaluate(()=>{G.syncHoldUntil=Date.now()+600000;});
    await page.waitForFunction(()=>typeof NET!=='undefined'&&NET.uid&&Array.isArray(NET.base),{timeout:20000});
    const uid=await page.evaluate(()=>NET.uid);
    return {ctx,page,uid,which};
  }
  async function putSave(uid,p,rev){
    await env.withSecurityRulesDisabled(async c=>{
      await setDoc(doc(c.firestore(),'teams',team,'saves',uid),{data:JSON.stringify(p),rev,savedAt:p._savedAt,name:'QA-Test',lvl:1,v:2,fe:0,acct:'qatest'});
    });
  }
  async function revOf(uid){
    let rev=-1;
    await env.withSecurityRulesDisabled(async c=>{
      const s=await getDoc(doc(c.firestore(),'teams',team,'saves',uid));
      rev=s.exists()?(s.data().rev||0):-1;
    });
    return rev;
  }
  async function show(page){
    await page.evaluate(()=>{try{UI.sub.player='save';UI.open('player');UI.render();}catch(e){}});
    return page.evaluate(()=>{
      const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
      if(d)d.open=true;
      const status=((document.getElementById('sheetBody')||{}).innerText||'').replace(/\s+/g,' ');
      const check=d&&d.querySelector('small')?d.querySelector('small').textContent:'';
      const held=P.sync26&&P.sync26.heldRemote;
      const mark=o=>((o&&o.sync26&&o.sync26.ops)||[]).map(x=>x&&x.k==='res'?'r':x&&x.k==='troops'?'t':x&&x.k==='tiles'?'x':'o').join('');
      return {status:status.slice(0,240),check,why:(typeof CS!=='undefined'&&CS.why)||'',report:(typeof CS!=='undefined'&&CS.report)||'',rev:P._rev||0,ops:mark(P),heldRev:held?held.rev:0,heldOps:held?mark(held.profile):''};
    });
  }
  async function arm(page,p){
    await page.evaluate(raw=>{
      Storage.prototype.setItem.call(localStorage,'wl_lock','1');
      Storage.prototype.setItem.call(localStorage,'wl_p',JSON.stringify(raw));
    if(typeof G!=='undefined')G.syncHoldUntil=0;
  }, p);
  }
  const a=await open('source');
  const b=await open('other');
  ok(a.uid!==b.uid,'the two windows have different sign-ins');
  const booted=await a.page.evaluate(()=>JSON.parse(JSON.stringify(P)));
  function stamped(rev,savedAt,sync){
    const p=JSON.parse(JSON.stringify(booted));
    p.name='QA-Test';p.lvl=1;p.acct='qatest';p._rev=rev;p._savedAt=savedAt;
    p.res={...RES};p.troops=JSON.parse(JSON.stringify(TROOPS));
    p.sync26=JSON.parse(JSON.stringify(sync));
    p.sync26.snap=snap();
    return p;
  }
  await env.withSecurityRulesDisabled(async c=>{
    await setDoc(doc(c.firestore(),'teams',team,'meta','alliance'),{acct24:{qatest:{name:'QA-Test',s:'salt',h:null,uids:[a.uid,b.uid]}}});
  });

  // Inflated local revision, identical journal, no linked document.
  await putSave(a.uid, stamped(32,4000,SPLIT_A), 32);
  await arm(a.page, stamped(33,5000,SPLIT_A));
  await a.page.reload({waitUntil:'domcontentloaded'});
  await a.page.waitForFunction(()=>typeof G!=='undefined'&&G.sync26Ready,{timeout:20000});
  const inflated=await show(a.page);
  const inflatedRev=await revOf(a.uid);
  ok(!/Both devices changed/.test(inflated.report)&&inflated.rev===33&&inflatedRev===32,'a higher local revision with the same progress does not conflict and does not write');

  // Same visible progress, linked device journal differs. Own document matches the local copy.
  await putSave(a.uid, profile(33,5000,SPLIT_A), 33);
  await putSave(b.uid, profile(29,3000,SPLIT_B), 29);
  await arm(a.page, profile(33,5000,SPLIT_A));
  const beforeA=await revOf(a.uid), beforeB=await revOf(b.uid);
  await a.page.reload({waitUntil:'domcontentloaded'});
  let probe=null;
  for(let i=0;i<40&&!probe;i++){
    try{
      probe=await a.page.evaluate(async()=>{
        if(typeof G==='undefined'||!G.sync26Ready||(typeof CS!=='undefined'&&CS.why==='pending'))return null;
        const text=await fetch('/sync26.js',{cache:'no-store'}).then(r=>r.text());
        const v=await fetch('/v26i.js',{cache:'no-store'}).then(r=>r.text());
        return {fn:typeof (window.SYNC26&&SYNC26.conflictMark),sync:text.includes('function troopState'),v26:v.includes('troops=differs')};
      });
    }catch(e){probe=null;}
    if(!probe)await new Promise(r=>setTimeout(r,500));
  }
  ok(probe&&probe.fn==='function'&&probe.sync&&probe.v26,'the served pack includes the read-only conflict mark');
  const linked=await show(a.page);
  const afterA=await revOf(a.uid), afterB=await revOf(b.uid);
  console.log('linked-ui', JSON.stringify({report:linked.report,why:linked.why,rev:linked.rev,heldRev:linked.heldRev,check:linked.check}));
  ok(!/Both devices changed/.test(linked.report)&&afterB===beforeB,'the same troop counts are not a conflict and the linked document is not written');
  const fewer=profile(23,3000,{devB:1},[op('devB',1,'troops')]);
  fewer.troops.home=900;
  const splitLocal=profile(33,5000,SPLIT_A);
  await putSave(a.uid, splitLocal, 33);
  await putSave(b.uid, fewer, 23);
  await arm(a.page, splitLocal);
  const beforeSplitA=await revOf(a.uid), beforeSplitB=await revOf(b.uid);
  await a.page.reload({waitUntil:'domcontentloaded'});
  let splitSeen=false;
  for(let i=0;i<40&&!splitSeen;i++){
    try{splitSeen=await a.page.evaluate(()=>typeof CS!=='undefined'&&/Both devices changed/.test(CS.report||''));}catch(e){splitSeen=false;}
    if(!splitSeen)await new Promise(r=>setTimeout(r,500));
  }
  const split=await show(a.page);
  const saw=await a.page.evaluate(()=>{
    const remote=JSON.parse(JSON.stringify(P));
    remote.troops=Object.assign({},P.troops,{home:(P.troops.home||0)-100});
    remote.sync26={clock:{devB:1},ops:[{id:'devB:1:troops',uid:'devB',n:1,k:'troops',t:1}],legacyAt:{},snap:null};
    const plan=SYNC26.uploadPlan(P,remote,23);
    return {saw:window.__saw||'',home:P.troops&&P.troops.home,plan:plan.upload?'upload':(plan.reason||''),mark:SYNC26.conflictMark(P,remote,23,false)};
  });
  console.log('split-ui', JSON.stringify({report:split.report,why:split.why,rev:split.rev,saw}));
  ok(/troops=differs/.test(saw.mark)&&saw.plan!=='upload'&&(await revOf(b.uid))===beforeSplitB,'a real troop-count split is still blocked and the linked document is not written');

  // Same journals on both documents. The linked copy is older but already absorbed.
  await putSave(a.uid, stamped(33,5000,BOTH), 33);
  await putSave(b.uid, stamped(29,3000,BOTH), 29);
  await arm(a.page, stamped(33,5000,BOTH));
  await a.page.reload({waitUntil:'domcontentloaded'});
  await a.page.waitForFunction(()=>typeof G!=='undefined'&&G.sync26Ready,{timeout:20000});
  const absorbed=await show(a.page);
  if(/Both devices changed/.test(absorbed.report))console.log('absorbed-ui', JSON.stringify({report:absorbed.report,rev:absorbed.rev,ops:absorbed.ops,heldRev:absorbed.heldRev,heldOps:absorbed.heldOps,check:absorbed.check}));
  ok(!/Both devices changed/.test(absorbed.report)&&(await revOf(a.uid))===33&&(await revOf(b.uid))===29,'an older linked copy with the same absorbed journal is not a conflict');

  // The other window stays open and idle while this window reloads. Journals start absorbed.
  await b.page.evaluate(()=>{G.syncHoldUntil=0;});
  await new Promise(r=>setTimeout(r,2500));
  const idleRev=await revOf(b.uid);
  await a.page.reload({waitUntil:'domcontentloaded'});
  await a.page.waitForFunction(()=>typeof G!=='undefined'&&G.sync26Ready,{timeout:20000});
  const idle=await show(a.page);
  console.log('idle-ui', JSON.stringify({report:idle.report,why:idle.why,rev:idle.rev,ops:idle.ops,heldRev:idle.heldRev,heldOps:idle.heldOps,otherRev:idleRev}));
  ok(!/Both devices changed/.test(idle.report)&&idleRev===29,'an idle second window does not by itself create the conflict');

  ok(prod.filter(h=>/googleapis|firebase|gstatic/.test(h)&&h!=='www.gstatic.com').length===0,'no production Firebase host was contacted');
  await browser.close(); srv.close(); await env.cleanup();
  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',String(e&&e.stack||e).split('\n').slice(0,8).join(' | '));process.exit(1);});
