// 11i diagnostic proof. Serves the exact flat public tree, uses the real
// service worker, and presses the real Save button. Emulator only.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,getDoc,updateDoc,getDocs,collection}=require('firebase/firestore');
const repoRoot=path.join(__dirname,'../..');
const root=process.env.FLAT_PUBLIC||'/opt/cursor/artifacts/ddd-v26-11i-flat/public';
const httpPort=8794, appPort=8795;
const TEAM='dg'+Date.now().toString(36);
const base=`teams/${TEAM}`;
const MARK='LEAKMARKER';
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const types={
  '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'
};
function kind(ct){return String(ct||'').split(';')[0].trim();}
function serve(port){
  const srv=http.createServer((q,res)=>{
    const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'')||'index.html';
    const f=path.join(root,rel);
    if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){
      res.writeHead(404,{'content-type':'text/html; charset=utf-8'});
      return res.end('<!doctype html><html><body>missing</body></html>');
    }
    res.writeHead(200,{'content-type':(types[path.extname(f)]||'application/octet-stream')+'; charset=utf-8','cache-control':'no-store'});
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r=>srv.listen(port,'127.0.0.1',()=>r(srv)));
}
function walk(dir, prefix=''){
  const out=[];
  for(const name of fs.readdirSync(dir)){
    const abs=path.join(dir,name);
    const rel=prefix?prefix+'/'+name:name;
    if(fs.statSync(abs).isDirectory())out.push(...walk(abs,rel));
    else out.push(rel);
  }
  return out;
}
function urls(html){
  const out=[];
  for(const raw of html.match(/ (?:src|href)="([^"]+)"/g)||[]){
    const u=raw.replace(/^ (?:src|href)="/,'').replace(/"$/,'').split('?')[0];
    if(!u.startsWith('data:'))out.push(u);
  }
  return out;
}
function show(text, uid){
  return String(text||'').split(uid||'\u0000').join('[id]').split(MARK).join('[redacted]').replace(/\s+/g,' ').slice(0,220);
}

(async()=>{
  const index=fs.readFileSync(path.join(root,'index.html'));
  ok(crypto.createHash('sha256').update(index).digest('hex')==='bde3c418529d3a6d0de17cb4c007bf803e5a15df2e47c0bc30915eb8b324ed52','index bytes match the flat 11f/11h index');
  const files=walk(root);
  ok(files.length===125&&!files.some(u=>u.startsWith('js/')||u.startsWith('css/')||u.startsWith('lib/')),'125 flat files and no repo-native prefix');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  ok(/const C='ddd-v26-11i';/.test(sw)&&!/cache\.addAll|precache/.test(sw),'service worker cache label is 11i and it does not precache');
  const runtime=files.filter(f=>['stage2.js','sync26.js','v26i.js','sw.js'].includes(f)).map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
  ok(/Save check/.test(runtime)&&/hold-skip/.test(runtime)&&/why:'load-error'/.test(runtime)&&/why:'wrote'/.test(runtime),'the diagnostic lines are in the served runtime files');
  ok(!/syncHoldQuota|hold-cleared|cloudLogin|loginHold/.test(runtime),'the pack does not clear the hold or bring back the lookup screen');

  const list=urls(index.toString());
  ok(list.length===86,'the index still points at 86 flat assets');
  const httpSrv=await serve(httpPort);
  const puppeteer=require('puppeteer-core');
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  const blocked=[], continued=[];
  await page.setRequestInterception(true);
  page.on('request',req=>{
    let u;try{u=new URL(req.url());}catch(e){return req.abort();}
    if(u.hostname!=='localhost'&&u.hostname!=='127.0.0.1'){blocked.push(u.hostname);return req.abort();}
    continued.push(u.hostname+u.pathname);
    req.continue();
  });
  await page.goto('http://localhost:'+httpPort+'/',{waitUntil:'domcontentloaded',timeout:60000});
  for(let i=0;i<4;i++){
    await page.evaluate(()=>navigator.serviceWorker.ready).catch(()=>{});
    const on=await page.evaluate(()=>!!(navigator.serviceWorker&&navigator.serviceWorker.controller)).catch(()=>false);
    if(on)break;
    await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  }
  const state=await page.evaluate(async(list)=>{
    async function hex(buf){
      const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
      return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
    }
    const out={sw:!!(navigator.serviceWorker&&navigator.serviceWorker.controller),script:(navigator.serviceWorker.controller||{}).scriptURL||'',caches:[],bg:getComputedStyle(document.body).backgroundColor,name:!!document.querySelector('#obName'),fetched:[]};
    for(const u of list){
      const r=await fetch('/'+u,{cache:'no-store'});
      const body=await r.arrayBuffer();
      out.fetched.push({u,status:r.status,ct:(r.headers.get('content-type')||'').split(';')[0].trim(),sha:await hex(body)});
    }
    for(let i=0;i<30;i++){
      out.caches=await caches.keys();
      if(out.caches.indexOf('ddd-v26-11i')>=0)break;
      await new Promise(r=>setTimeout(r,50));
    }
    return out;
  }, files);
  let bad=[];
  for(const row of state.fetched){
    const disk=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,row.u))).digest('hex');
    const ext=path.extname(row.u);
    const want=types[ext]||'';
    if(row.status!==200||row.sha!==disk||(want&&row.ct!==want))bad.push(row.u+' '+row.status+' '+row.ct);
  }
  ok(bad.length===0,'the service worker served all 125 flat files byte for byte ('+(files.length-bad.length)+'/'+files.length+')');
  if(bad.length)console.log(bad.slice(0,8).join('\n'));
  if(!(state.sw&&/\/sw\.js$/.test(state.script)&&state.caches.indexOf('ddd-v26-11i')>=0))console.log('worker',JSON.stringify({sw:state.sw,script:state.script,caches:state.caches,bg:state.bg,name:state.name}));
  ok(state.sw&&/\/sw\.js$/.test(state.script)&&state.caches.indexOf('ddd-v26-11i')>=0&&state.name&&state.bg==='rgb(17, 20, 22)','the real 11i service worker controlled the styled page');
  const prod=/firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebaseio|firebaseapp/;
  ok(!continued.some(u=>prod.test(u)),'no production Firebase request was loaded');
  await page.close();
  httpSrv.close();

  const rules=fs.readFileSync(path.join(repoRoot,'tests/fixtures/published-firestore-rules.rules'),'utf8');
  const env=await initializeTestEnvironment({projectId:'demo-dead-zone-drive',firestore:{host:'127.0.0.1',port:8080,rules}});
  async function saves(){
    let rows=[];
    await env.withSecurityRulesDisabled(async ctx=>{
      const snap=await getDocs(collection(ctx.firestore(),`${base}/saves`));
      rows=snap.docs.map(d=>({id:d.id,rev:d.data().rev||0,bytes:(d.data().data||'').length}));
    });
    return rows;
  }
  const appSrv=await serve(appPort);
  async function openPage(){
    const ctx=await browser.createBrowserContext();
    const view=await ctx.newPage();
    const hits=[];
    const consoleLeak=[];
    function redact(s){return String(s||'').split(MARK).join('[redacted]').replace(/\s+/g,' ').slice(0,120);}
    view.on('console',msg=>{const t=String(msg.text());if(t.includes(MARK))consoleLeak.push(msg.type()+':'+redact(t));});
    view.on('pageerror',err=>{const t=String(err&&err.stack||err);if(t.includes(MARK))consoleLeak.push('pageerror:'+redact(t));});
    await view.setRequestInterception(true);
    view.on('request',req=>{
      let u;try{u=new URL(req.url());}catch(e){return req.abort();}
      const host=u.hostname;
      if(host==='127.0.0.1'||host==='localhost'||host==='www.gstatic.com')return req.continue();
      if(/googleapis|firebase|gstatic|arcgisonline|openstreetmap/.test(host)){hits.push(host);return req.abort();}
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
          const a=appMod.initializeApp({apiKey:'demo',authDomain:'localhost',projectId:'demo-dead-zone-drive'},'emu-'+Math.random().toString(36).slice(2));
          this.fs=fsMod;
          try{this.db=fsMod.initializeFirestore(a,{experimentalForceLongPolling:true});}catch(e){this.db=fsMod.getFirestore(a);}
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
    const ready=await view.waitForFunction(()=>P&&P.uid&&P.name==='QA-Diag',{timeout:30000}).then(()=>true).catch(()=>false);
    if(!ready){
      const snap=await view.evaluate(()=>({name:P&&P.name,mode:typeof NET!=='undefined'&&NET.mode,hasUid:!!(P&&P.uid)})).catch(()=>({}));
      console.log('boot',JSON.stringify(snap));
      throw new Error('startup did not finish');
    }
    await view.evaluate(()=>{
      try{sessionStorage.setItem('wl_sync26_reloaded','1');}catch(e){}
      location.reload=function(){window.__blockedReload=(window.__blockedReload||0)+1;};
      P.res={scrap:2566,food:2855,water:2864,fuel:3000,parts:2992};
      P.troops={home:1000,queue:[],away:{}};
      P.stronghold={level:2};
      save();
    });
    await view.reload({waitUntil:'domcontentloaded',timeout:60000});
    await view.waitForFunction(()=>P&&P.name==='QA-Diag'&&P.troops&&P.troops.home===1000,{timeout:30000});
    await view.evaluate(()=>{
      try{sessionStorage.setItem('wl_sync26_reloaded','1');}catch(e){}
      location.reload=function(){window.__blockedReload=(window.__blockedReload||0)+1;};
    });
    const controlled=await view.evaluate(async()=>{
      const reg=await navigator.serviceWorker.ready;
      return {on:!!navigator.serviceWorker.controller,script:(navigator.serviceWorker.controller||{}).scriptURL||'',cache:(await caches.keys()).indexOf('ddd-v26-11i')>=0,active:!!(reg.active)};
    });
    return {ctx,view,hits,consoleLeak,controlled};
  }
  async function armHooks(view){
    await view.evaluate((mark)=>{
      window.__loads=0;window.__writes=0;window.__loadFail='';window.__saveFail='';
      const realLoad=NET.loadProfile.bind(NET), realSave=NET.saveProfile.bind(NET);
      NET.loadProfile=function(uid){
        window.__loads++;
        if(window.__loadFail){
          const e=new Error(mark);e.code=window.__loadFail;e.stack=mark+'\n    at hidden';
          throw e;
        }
        return realLoad(uid);
      };
      NET.saveProfile=function(uid,doc){
        window.__writes++;
        window.__saveUid=String(uid||'');
        if(window.__saveFail==='hang')return new Promise(function(){});
        if(window.__saveFail){const e=new Error(mark);e.code=window.__saveFail;e.stack=mark;throw e;}
        return realSave(uid,doc);
      };
    }, MARK);
  }
  async function press(view){
    await view.evaluate(()=>{
      UI.sub.player='save';UI.open('player');
      const b=[...document.querySelectorAll('button')].find(x=>/Save to the cloud/.test(x.textContent));
      if(!b)throw new Error('save button missing');
      b.click();
    });
  }
  async function waitCheck(view, pred, timeout){
    const settled=await view.waitForFunction(pred,{timeout:timeout||20000}).then(()=>true).catch(e=>{console.log('wait',String(e&&e.message||e).split('\n')[0]);return false;});
    if(!settled){
      const snap=await readDiag(view,'').catch(()=>({check:'',status:''}));
      console.log('visible',show(snap.check,''),show(snap.status,''));
    }
    return settled;
  }
  async function readDiag(view, uid){
    const row=await view.evaluate(()=>{
      UI.sub.player='save';UI.open('player');
      const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
      if(d)d.open=true;
      const small=d&&d.querySelector('small');
      const check=small?small.textContent:'';
      const status=((document.querySelector('#sheetBody b')||{}).textContent)||'';
      const leaked=check.includes('LEAKMARKER')||status.includes('LEAKMARKER');
      return {check:leaked?'':check,status:leaked?'':status,leaked,open:!!(d&&d.open),visible:!!(small&&small.getClientRects().length),rev:P._rev||0,loads:window.__loads||0,writes:window.__writes||0};
    });
    if(row.leaked)ok(false,'save check hid the raw error');
    return row;
  }
  function left(check){
    const m=/hold=on left=(\d+)/.exec(check||'');
    return m?+m[1]:-1;
  }

  const session=await openPage();
  ok(session.controlled.on&&/\/sw\.js$/.test(session.controlled.script)&&session.controlled.cache,'the Save page is controlled by the real 11i worker');
  await armHooks(session.view);
  async function saveId(){return session.view.evaluate(()=>window.__saveUid||P.uid||'');}
  async function oneSave(){
    const id=await saveId();
    return (await saves()).find(r=>r.id===id)||null;
  }
  await session.view.evaluate(()=>{window.__loadFail='unavailable LEAKMARKER';});
  await press(session.view);
  const thrown=await waitCheck(session.view,()=>{
    UI.sub.player='save';UI.open('player');
    const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
    return !!(d&&/load-error/.test(d.textContent||''));
  },20000);
  ok(thrown,'a thrown read reaches the save check');
  const readErr=await readDiag(session.view, await saveId());
  const readLeft=left(readErr.check);
  ok(!readErr.leaked&&readErr.visible&&readErr.open,'the save check is open and does not show the raw error');
  ok(/load-error code=unavailable local=0 server=/.test(readErr.check)&&readErr.check.indexOf(MARK)<0,'the read failure shows the caught code only');
  ok(readLeft>=240&&readLeft<=300,'the five-minute hold is active with the remaining seconds');
  ok(/Do not switch yet/.test(readErr.status)&&!/Safe to switch/.test(readErr.status)&&readErr.writes===0,'a caught read is not safe to switch and does not write');
  const loadsAfterRead=readErr.loads;
  await press(session.view);
  ok(await waitCheck(session.view,()=>{
    UI.sub.player='save';UI.open('player');
    const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
    return !!(d&&/hold-skip left=/.test(d.textContent||''));
  },10000),'the dropped click is visible in the save check');
  const dropped=await readDiag(session.view, await saveId());
  const dropLeft=left(dropped.check);
  ok(dropped.loads===loadsAfterRead&&dropped.writes===0,'the manual click during the hold does not start another read or write');
  ok(/load-error code=unavailable/.test(dropped.check)&&/hold-skip left=\d+/.test(dropped.check)&&dropLeft>=240&&dropLeft<=300,'the dropped click keeps the caught code and shows the hold');
  ok(/Do not switch yet/.test(dropped.status)&&!/Safe to switch/.test(dropped.status),'the dropped click stays fail-closed');
  ok((await saves()).length===0,'the held clicks stored no save');

  await session.view.evaluate(()=>{window.__loadFail='';G.syncHoldUntil=0;CS.why='';CS.report='';CS.status='not saved yet';CS.last=0;CS.lastStr='';});
  const writesBefore=await session.view.evaluate(()=>window.__writes||0);
  await press(session.view);
  ok(await waitCheck(session.view,()=>{
    UI.sub.player='save';UI.open('player');
    const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
    const status=((document.querySelector('#sheetBody b')||{}).textContent)||'';
    return !!(d&&/wrote /.test(d.textContent||'')&&/Safe to switch/.test(status));
  },30000),'the accepted write is visible in the save check');
  const wrote=await readDiag(session.view, await saveId());
  const mine=await oneSave();
  ok(/wrote local=0 server= hold=off/.test(wrote.check)&&/Safe to switch/.test(wrote.status)&&!/Do not switch yet/.test(wrote.status),'a missing server save writes and says safe only after it is accepted');
  ok(!!mine&&mine.rev===wrote.rev&&wrote.rev>=1&&mine.bytes>1000&&wrote.writes===writesBefore+1,'the accepted write is the profile and the check matches that attempt');

  const revAfterWrite=wrote.rev;
  const writesAfter=wrote.writes;
  await press(session.view);
  ok(await waitCheck(session.view,()=>{
    UI.sub.player='save';UI.open('player');
    const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
    return !!(d&&/already /.test(d.textContent||''));
  },20000),'the equal revision is visible in the save check');
  const again=await readDiag(session.view, await saveId());
  const againDoc=(await oneSave())||{rev:-1};
  ok(new RegExp('already local='+revAfterWrite+' server='+revAfterWrite+' hold=off').test(again.check)&&again.rev===revAfterWrite&&againDoc.rev===revAfterWrite&&again.writes===writesAfter,'an equal revision with the same progress does not write');
  ok(/Safe to switch/.test(again.status)&&!/Do not switch yet/.test(again.status),'the equal revision says the copy already on the server is safe');

  await env.withSecurityRulesDisabled(async ctx=>{
    const ref=doc(ctx.firestore(),`${base}/saves/${await saveId()}`);
    const snap=await getDoc(ref);
    if(!snap.exists())throw new Error('stored save missing before mismatch');
    await updateDoc(ref,{rev:1});
  }).catch(e=>{throw new Error('mismatch setup failed: '+((e&&e.code)||'error'));});
  await session.view.evaluate(()=>{P._rev=4;save();window.__saveFail='aborted LEAKMARKER';});
  await press(session.view);
  ok(await waitCheck(session.view,()=>{
    UI.sub.player='save';UI.open('player');
    const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
    const text=(d&&d.textContent)||'';
    return !!(d&&/write-error /.test(text)&&!/write-error-same-rev/.test(text));
  },20000),'the mismatched read is visible in the save check');
  const mismatch=await readDiag(session.view, await saveId());
  const mismatchDoc=(await oneSave())||{rev:-1};
  ok(/write-error code=aborted local=4 server=1 hold=off/.test(mismatch.check)&&mismatch.check.indexOf('same-rev')<0,'a read whose revision differs shows that server revision and the write code');
  ok(/Do not switch yet/.test(mismatch.status)&&!/Safe to switch/.test(mismatch.status)&&/did not go through/.test(mismatch.status),'a mismatched read plus a failed write is not safe');
  ok(mismatch.rev===4&&mismatchDoc.rev===1,'the failed mismatched write does not replace the stored revision');

  await env.withSecurityRulesDisabled(async ctx=>{
    const ref=doc(ctx.firestore(),`${base}/saves/${await saveId()}`);
    const snap=await getDoc(ref);
    if(!snap.exists())throw new Error('stored save missing before equal-rev write');
    await updateDoc(ref,{rev:4});
  }).catch(e=>{throw new Error('equal-rev setup failed: '+((e&&e.code)||'error'));});
  await session.view.evaluate(()=>{P.res.scrap=2565;save();window.__saveFail='permission-denied LEAKMARKER';});
  await press(session.view);
  ok(await waitCheck(session.view,()=>{
    UI.sub.player='save';UI.open('player');
    const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
    return !!(d&&/write-error-same-rev/.test((d&&d.textContent)||''));
  },20000),'the equal-revision write failure is visible in the save check');
  const same=await readDiag(session.view, await saveId());
  const sameDoc=(await oneSave())||{rev:-1};
  ok(/write-error-same-rev code=permission-denied local=4 server=4/.test(same.check),'an equal-revision write failure shows the caught code and both revisions');
  ok(/Do not switch yet/.test(same.status)&&!/Safe to switch/.test(same.status)&&/Cloud save 4 is on the server/.test(same.status),'the equal-revision failure names the server copy and is not safe');
  ok(same.rev===4&&sameDoc.rev===4,'the equal-revision failure does not advance the stored revision');

  await session.view.evaluate(()=>{P.res.scrap=2564;save();window.__saveFail='hang';});
  const beforeHang=((await oneSave())||{rev:-1}).rev;
  await press(session.view);
  ok(await waitCheck(session.view,()=>{
    UI.sub.player='save';UI.open('player');
    const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
    const status=((document.querySelector('#sheetBody b')||{}).textContent)||'';
    return !!(d&&/pending /.test((d&&d.textContent)||'')&&/Do not switch yet/.test(status));
  },15000),'the pending send is visible in the save check');
  const pending=await readDiag(session.view, await saveId());
  ok(/pending hold=off/.test(pending.check)&&/has not been confirmed/.test(pending.status)&&!/Safe to switch/.test(pending.status),'a send that has not finished stays pending and is not safe');
  ok(((await oneSave())||{rev:-1}).rev===beforeHang,'the pending send has not written a new revision');
  const firebaseHit=session.hits.filter(h=>/firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebaseio|firebaseapp/.test(h));
  if(session.consoleLeak.length)console.log('console types',session.consoleLeak.join(','));
  ok(session.consoleLeak.length===0,'the raw error stayed off the console');
  ok(firebaseHit.length===0,'no production Firebase host was called');

  await browser.close();appSrv.close();await env.cleanup();
  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',e&&e.stack?e.stack.split('\n').slice(0,6).join('\n'):e);process.exit(1);});
