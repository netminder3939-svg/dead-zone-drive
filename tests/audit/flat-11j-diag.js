// 11j diagnostic proof. Exact flat tree, real service worker, real Firebase 10.12.2, real Save button.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,getDoc}=require('firebase/firestore');
const repoRoot=path.join(__dirname,'../..');
const root=process.env.FLAT_PUBLIC||'/tmp/11j-pack/ddd-v26-11j-flat/public';
const httpPort=8801, appPort=8802;
const TEAM='dj'+Date.now().toString(36);
const base=`teams/${TEAM}`;
const MARK='LEAKMARKER';
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
function kind(ct){return String(ct||'').split(';')[0].trim();}
function serve(port){
  const srv=http.createServer((q,res)=>{
    const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'')||'index.html';
    const f=path.join(root,rel);
    if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('missing');}
    res.writeHead(200,{'content-type':(types[path.extname(f)]||'application/octet-stream')+'; charset=utf-8','cache-control':'no-store'});
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r=>srv.listen(port,'127.0.0.1',()=>r(srv)));
}
function walk(dir, prefix=''){
  const out=[];
  for(const name of fs.readdirSync(dir)){
    const abs=path.join(dir,name), rel=prefix?prefix+'/'+name:name;
    if(fs.statSync(abs).isDirectory())out.push(...walk(abs,rel)); else out.push(rel);
  }
  return out;
}
(async()=>{
  const index=fs.readFileSync(path.join(root,'index.html'));
  ok(crypto.createHash('sha256').update(index).digest('hex')==='bde3c418529d3a6d0de17cb4c007bf803e5a15df2e47c0bc30915eb8b324ed52','index bytes are unchanged');
  const files=walk(root);
  ok(files.length===125&&!files.some(u=>u.startsWith('js/')||u.startsWith('css/')||u.startsWith('lib/')),'125 flat files');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  ok(/const C='ddd-v26-11j';/.test(sw)&&!/cache\.addAll|precache/.test(sw),'service worker cache is 11j');
  const httpSrv=await serve(httpPort);
  const puppeteer=require('puppeteer-core');
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request',req=>{
    let u;try{u=new URL(req.url());}catch(e){return req.abort();}
    if(u.hostname==='localhost'||u.hostname==='127.0.0.1')return req.continue();
    return req.abort();
  });
  await page.goto('http://localhost:'+httpPort+'/',{waitUntil:'domcontentloaded',timeout:60000});
  for(let i=0;i<4&&!(await page.evaluate(()=>!!(navigator.serviceWorker&&navigator.serviceWorker.controller)).catch(()=>false));i++){
    await page.evaluate(()=>navigator.serviceWorker.ready).catch(()=>{});
    await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  }
  const served=await page.evaluate(async(list)=>{
    async function hex(buf){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',buf));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');}
    const out=[];
    for(const u of list){
      const r=await fetch('/'+u,{cache:'no-store'});
      out.push({u,status:r.status,ct:(r.headers.get('content-type')||'').split(';')[0].trim(),sha:await hex(await r.arrayBuffer())});
    }
    let keys=[];
    for(let i=0;i<30;i++){keys=await caches.keys();if(keys.indexOf('ddd-v26-11j')>=0)break;await new Promise(r=>setTimeout(r,50));}
    return {sw:!!navigator.serviceWorker.controller,keys,out};
  }, files);
  let bad=0;
  for(const row of served.out){
    const disk=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,row.u))).digest('hex');
    const want=types[path.extname(row.u)]||'';
    if(row.status!==200||row.sha!==disk||(want&&row.ct!==want))bad++;
  }
  ok(bad===0&&served.sw&&served.keys.indexOf('ddd-v26-11j')>=0,'the 11j worker served all 125 files');
  await page.close(); httpSrv.close();

  const rules=fs.readFileSync(path.join(repoRoot,'tests/fixtures/published-firestore-rules.rules'),'utf8');
  const env=await initializeTestEnvironment({projectId:'demo-dead-zone-drive',firestore:{host:'127.0.0.1',port:8080,rules}});
  async function revOf(id){
    let rev=-1;
    await env.withSecurityRulesDisabled(async ctx=>{
      const s=await getDoc(doc(ctx.firestore(),`${base}/saves/${id}`));
      rev=s.exists()?(s.data().rev||0):-1;
    });
    return rev;
  }
  const appSrv=await serve(appPort);
  const view=await browser.newPage();
  const leaks=[];
  view.on('console',msg=>{if(String(msg.text()).includes(MARK))leaks.push('console');});
  view.on('pageerror',err=>{if(String(err&&err.message||err).includes(MARK))leaks.push('page');});
  await view.setRequestInterception(true);
  view.on('request',req=>{
    let u;try{u=new URL(req.url());}catch(e){return req.abort();}
    const host=u.hostname;
    if(host==='127.0.0.1'||host==='localhost'||host==='www.gstatic.com')return req.continue();
    if(/googleapis|firebase|gstatic|arcgisonline|openstreetmap/.test(host))return req.abort();
    return req.continue();
  });
  await view.evaluateOnNewDocument(()=>{
    try{location.reload=function(){window.__blockedReload=(window.__blockedReload||0)+1;};}catch(e){}
    document.addEventListener('DOMContentLoaded',function(){
      if(typeof NET==='undefined'||NET.__emuInit)return;
      NET.__emuInit=true;
      NET.init=async function(profile){
        const V='https://www.gstatic.com/firebasejs/10.12.2/';
        const appMod=await import(V+'firebase-app.js');
        const authMod=await import(V+'firebase-auth.js');
        const fsMod=await import(V+'firebase-firestore.js');
        const a=appMod.initializeApp({apiKey:'demo',authDomain:'localhost',projectId:'demo-dead-zone-drive'},'emu11j');
        this.fs=fsMod;
        try{this.db=fsMod.initializeFirestore(a,{experimentalAutoDetectLongPolling:true});}catch(e){this.db=fsMod.getFirestore(a);}
        fsMod.connectFirestoreEmulator(this.db,'127.0.0.1',8080);
        const au=authMod.getAuth(a);
        authMod.connectAuthEmulator(au,'http://127.0.0.1:9099',{disableWarnings:true});
        this.auth=au;this.authMod=authMod;
        const user=(await authMod.signInAnonymously(au)).user;
        this.mode='firebase';this.uid=user.uid;this.me=profile;
        this.team=localStorage.getItem('wl_team')||this.team;
        this.base=['teams',this.team];
        P.uid=this.uid;
        if(typeof cloudCheck==='function')await cloudCheck(this.uid);
        return this.uid;
      };
    },true);
  });
  await view.goto('http://localhost:'+appPort+'/?team='+TEAM,{waitUntil:'domcontentloaded',timeout:60000});
  await view.waitForSelector('#obName');
  await view.click('#obName',{clickCount:3});
  await view.type('#obName','QA-Diag');
  await view.click('#obGo');
  await view.waitForFunction(()=>P&&P.uid&&P.name==='QA-Diag',{timeout:30000});
  await view.evaluate(()=>{
    try{sessionStorage.setItem('wl_sync26_reloaded','1');}catch(e){}
    location.reload=function(){window.__blockedReload=(window.__blockedReload||0)+1;};
    P.res={scrap:2566,food:2855,water:2864,fuel:3000,parts:2992};
    P.troops={home:1000,queue:[],away:{}};
    P.stronghold={level:2};
    save();
    window.__sdk=NET.fs; window.__base=NET.base;
  });
  async function press(){
    await view.evaluate(()=>{
      UI.sub.player='save';UI.open('player');
      const b=[...document.querySelectorAll('button')].find(x=>/Save to the cloud/.test(x.textContent));
      if(!b)throw new Error('save button missing');
      b.click();
    });
  }
  async function shown(){
    return view.evaluate(()=>{
      UI.sub.player='save';UI.open('player');
      const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
      if(d)d.open=true;
      const check=d&&d.querySelector('small')?d.querySelector('small').textContent:'';
      const status=((document.querySelector('#sheetBody b')||{}).textContent)||'';
      const leaked=/LEAKMARKER|Cannot read properties|is not iterable|is not a function|Failed to fetch/.test(check+status);
      return {check:leaked?'':check,status:leaked?'':status,leaked,rev:P._rev||0,stored:!(localStorage.getItem('wl_p')||'').includes('readfail')&&!(localStorage.getItem('wl_p')||'').includes('LEAKMARKER')};
    });
  }
  async function waitClass(token){
    const hit=await view.waitForFunction(tok=>{
      UI.sub.player='save';UI.open('player');
      const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
      return !!(d&&d.textContent.indexOf(tok)>=0);
    },{timeout:20000},token).then(()=>true).catch(()=>false);
    return hit;
  }
  await view.evaluate(()=>{CS.why='';CS.report='';CS.readFail='';});
  await press();
  ok(await waitClass('wrote '), 'a real save finishes');
  const wrote=await shown();
  const uid=await view.evaluate(()=>P.uid);
  const storedRev=await revOf(uid);
  const ready=await view.evaluate(()=>{const n=window.__dddLoad||{};return {base:n.base,getDoc:n.getDoc,collection:n.collection,doc:n.doc};});
  ok(/Safe to switch/.test(wrote.status)&&!/Do not switch yet/.test(wrote.status)&&wrote.rev>=1&&storedRev===wrote.rev,'the accepted write is safe only after the server takes it');
  ok(ready.base==='array'&&ready.getDoc==='function'&&ready.collection==='function'&&ready.doc==='function','after startup the SDK methods and team path are ready');
  ok(!/readfail/.test(wrote.check),'a clean save has no read-failure note');

  async function boom(mode, token, extra){
    await view.evaluate(mode=>{
      const sdk=window.__sdk;
      NET.fs=sdk; NET.base=window.__base; G.syncHoldUntil=0;
      if(mode==='base')NET.base=null;
      else if(mode==='nofn')NET.fs={collection:sdk.collection,doc:sdk.doc,getDoc:undefined};
      else if(mode==='prop')NET.fs=null;
      else if(mode==='fetch')NET.fs={collection:sdk.collection,doc:sdk.doc,getDoc:function(){return Promise.reject(new TypeError('Failed to fetch'));}};
      else if(mode==='other')NET.fs={collection:sdk.collection,doc:sdk.doc,getDoc:function(){return Promise.reject(new TypeError('Failed to fetch LEAKMARKER'));}};
    }, mode);
    const before=await revOf(uid);
    await press();
    ok(await waitClass(token), token+' reaches the save check');
    const row=await shown();
    ok(!row.leaked&&row.check.indexOf(token)>=0&&/code=TypeError/.test(row.check)&&/Do not switch yet/.test(row.status)&&!/Safe to switch/.test(row.status),'the '+token+' failure stays fail-closed and shows no raw error');
    if(extra)ok(extra(row.check), token+' details');
    ok((await revOf(uid))===before,'the '+token+' failure does not write');
  }
  await boom('base', 'class=not-iterable', t=>/step=before-getDoc/.test(t)&&/base=missing/.test(t)&&!/is not iterable/.test(t));
  await boom('nofn', 'class=not-a-function', t=>/step=before-getDoc/.test(t)&&/getDoc=undefined/.test(t)&&/collection=function/.test(t));
  await boom('prop', 'class=property', t=>/step=before-getDoc/.test(t)&&/getDoc=undefined/.test(t)&&!/Cannot read/.test(t));
  await boom('fetch', 'class=failed-to-fetch', t=>/step=before-getDoc/.test(t)&&!/Failed to fetch/.test(t));
  await boom('other', 'class=other', t=>t.indexOf('LEAKMARKER')<0&&/step=before-getDoc/.test(t));
  const kept=await shown();
  await view.evaluate(()=>{
    const sdk=window.__sdk;
    const err=new Error('LEAKMARKER client is offline'); err.code='unavailable'; err.name='FirebaseError';
    NET.fs={collection:sdk.collection,doc:sdk.doc,getDoc:function(){return Promise.reject(err);}};
    NET.base=window.__base; G.syncHoldUntil=0;
  });
  await press();
  ok(await waitClass('code=unavailable'), 'a Firebase code stays the code');
  const fb=await shown();
  ok(/code=unavailable/.test(fb.check)&&/class=other/.test(fb.check)&&!/class=unavailable/.test(fb.check)&&/Do not switch yet/.test(fb.status)&&!/Safe to switch/.test(fb.status),'the earlier read failure stays visible and the Firebase code is unchanged');

  await view.evaluate(()=>{NET.fs=window.__sdk;NET.base=window.__base;G.syncHoldUntil=0;CS.why='waiting';CS.report='';P.res.scrap=2500;save();UI.sub.player='save';UI.open('player');UI.render();});
  await press();
  ok(await waitClass('wrote '), 'a later real save still completes');
  const again=await shown();
  const againRev=await revOf(uid);
  ok(/Safe to switch/.test(again.status)&&again.rev===storedRev+1&&againRev===again.rev&&/class=other/.test(again.check)&&again.stored,'the successful save keeps the read-failure note only in memory');
  ok(leaks.length===0,'the raw error stayed off the console');
  ok(kept.check.indexOf(MARK)<0&&fb.check.indexOf(MARK)<0,'classified text has no secret marker');

  await browser.close(); appSrv.close(); await env.cleanup();
  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',String(e&&e.stack||e).split('\n').slice(0,6).join(' | '));process.exit(1);});
