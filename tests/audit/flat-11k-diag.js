// 11k proof. Real flat files, real service worker, real Firebase 10.12.2, real login and Save.
const http=require('http'),fs=require('fs'),path=require('path');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,getDoc,getDocs,collection}=require('firebase/firestore');
const brokenRoot=process.env.FLAT_11J||'/tmp/11j-clean/ddd-v26-11j-flat/public';
const fixedRoot=process.env.FLAT_PUBLIC||'/tmp/11l-pack/ddd-v26-11l-flat/public';
const deployed11k=process.env.FLAT_11K||'/tmp/11k-deployed/ddd-v26-11k-flat/public';
const repoRoot=path.join(__dirname,'../..');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
function serve(root,port){
  const srv=http.createServer((q,res)=>{
    const rel=decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'')||'index.html';
    const f=path.join(root,rel);
    if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('missing');}
    res.writeHead(200,{'content-type':(types[path.extname(f)]||'application/octet-stream')+'; charset=utf-8','cache-control':'no-store'});
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r=>srv.listen(port,'127.0.0.1',()=>r(srv)));
}
function sdk(){
  let fire=fs.readFileSync('/tmp/firebase-firestore-10.12.2.js','utf8');
  fire=fire.replace('export{', 'const __ifsOrig=initializeFirestore;function initializeFirestoreEmulatorWrap(e,i,s){const db=__ifsOrig(e,i,s);try{connectFirestoreEmulator(db,"127.0.0.1",8080);}catch(err){}return db;}\nexport{');
  fire=fire.replace('initializeFirestore,limit','initializeFirestoreEmulatorWrap as initializeFirestore,limit');
  fs.writeFileSync('/tmp/firestore-emu-11k.js', fire);
  const writeAuth=(delay,file)=>{
    let auth=fs.readFileSync('/tmp/firebase-auth-10.12.2.js','utf8');
    auth=auth.replace('export{', 'const __getAuthOrig=getAuth;function getAuthEmulatorWrap(e){const au=__getAuthOrig(e);try{connectAuthEmulator(au,"http://127.0.0.1:9099",{disableWarnings:true});}catch(err){}if(!au.__delayed){au.__delayed=1;const ready=au.authStateReady.bind(au);au.authStateReady=function(){return ready().then(function(){return new Promise(function(r){setTimeout(r,'+delay+');});});};}return au;}\nexport{');
    auth=auth.replace('getAuth,getIdToken','getAuthEmulatorWrap as getAuth,getIdToken');
    fs.writeFileSync(file, auth);
  };
  writeAuth(700,'/tmp/auth-emu-delay.js');
  writeAuth(0,'/tmp/auth-emu-fast.js');
}
function preload(team){
  return {name:'QA-Test',lvl:1,_rev:30,uid:'reload-uid',acct:'qatest',res:{scrap:2566,food:2855,water:2864,fuel:3000,parts:2992},troops:{home:1000,queue:[],away:{}},stronghold:{level:2},team:team};
}
(async()=>{
  const crypto=require('crypto');
  const index=fs.readFileSync(path.join(fixedRoot,'index.html'));
  ok(crypto.createHash('sha256').update(index).digest('hex')==='bde3c418529d3a6d0de17cb4c007bf803e5a15df2e47c0bc30915eb8b324ed52','11k index bytes are unchanged');
  const cacheName=(fs.readFileSync(path.join(fixedRoot,'sw.js'),'utf8').match(/const C='(ddd-v26-11[a-z])';/)||[])[1]||'';
  ok(/^ddd-v26-11[a-z]$/.test(cacheName),'flat cache name '+cacheName);
  ok(/!Array.isArray\(NET\.base\)/.test(fs.readFileSync(path.join(fixedRoot,'v26i.js'),'utf8')),'11k waits until the team path exists');
  sdk();
  const rules=fs.readFileSync(path.join(repoRoot,'tests/fixtures/published-firestore-rules.rules'),'utf8');
  const env=await initializeTestEnvironment({projectId:'dead-zone-drive',firestore:{host:'127.0.0.1',port:8080,rules}});
  const puppeteer=require('puppeteer-core');
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  const swSrv=await serve(fixedRoot,8819);
  const swPage=await browser.newPage();
  await swPage.setRequestInterception(true);
  swPage.on('request',req=>{
    let u;try{u=new URL(req.url());}catch(e){return req.abort();}
    if(u.hostname==='127.0.0.1'||u.hostname==='localhost')return req.continue();
    return req.abort();
  });
  await swPage.goto('http://localhost:8819/',{waitUntil:'domcontentloaded',timeout:60000});
  for(let i=0;i<4&&!(await swPage.evaluate(()=>!!(navigator.serviceWorker&&navigator.serviceWorker.controller)).catch(()=>false));i++){
    await Promise.race([swPage.evaluate(()=>navigator.serviceWorker.ready),new Promise(r=>setTimeout(r,4000))]).catch(()=>{});
    await swPage.reload({waitUntil:'domcontentloaded',timeout:60000});
  }
  function walk(dir,prefix=''){const out=[];for(const name of fs.readdirSync(dir)){const abs=path.join(dir,name),rel=prefix?prefix+'/'+name:name;if(fs.statSync(abs).isDirectory())out.push(...walk(abs,rel));else out.push(rel);}return out;}
  const files=walk(fixedRoot);
  const served=await swPage.evaluate(async(list,cacheLabel)=>{
    async function hex(buf){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',buf));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');}
    const out=[];
    for(const u of list){const r=await fetch('/'+u,{cache:'no-store'});out.push({u,status:r.status,sha:await hex(await r.arrayBuffer())});}
    let keys=[];
    for(let i=0;i<30;i++){keys=await caches.keys();if(keys.indexOf(cacheLabel)>=0)break;await new Promise(r=>setTimeout(r,50));}
    return {sw:!!navigator.serviceWorker.controller,keys,out};
  }, files, cacheName);
  let swBad=0;
  for(const row of served.out){const disk=crypto.createHash('sha256').update(fs.readFileSync(path.join(fixedRoot,row.u))).digest('hex');if(row.status!==200||row.sha!==disk)swBad++;}
  ok(files.length===125&&swBad===0&&served.sw&&served.keys.indexOf(cacheName)>=0,'the service worker served all 125 flat files from '+cacheName);
  await swPage.close(); swSrv.close();
  async function openRace(root,port,authFile){
    const srv=await serve(root,port);
    const page=await browser.newPage();
    const prod=[];
    await page.setRequestInterception(true);
    page.on('request',req=>{
      const u=req.url();
      const cors={'access-control-allow-origin':'*','content-type':'text/javascript'};
      if(u.indexOf('firebase-firestore.js')>=0)return req.respond({status:200,headers:cors,body:fs.readFileSync('/tmp/firestore-emu-11k.js')});
      if(u.indexOf('firebase-auth.js')>=0)return req.respond({status:200,headers:cors,body:fs.readFileSync(authFile)});
      let host=''; try{host=new URL(u).hostname;}catch(e){}
      if(host==='www.gstatic.com'||host==='127.0.0.1'||host==='localhost')return req.continue();
      if(/googleapis|firebase|gstatic/.test(host)){prod.push(host);return req.abort();}
      return req.abort();
    });
    const team='race'+port.toString(36);
    await page.evaluateOnNewDocument((t,profile)=>{localStorage.setItem('wl_team',t);localStorage.setItem('wl_p',JSON.stringify(profile));}, team, preload(team));
    await page.goto('http://127.0.0.1:'+port+'/?team='+team,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>P&&P.name==='QA-Test'&&P.res&&P.res.scrap===2566,{timeout:20000});
    await new Promise(r=>setTimeout(r,1200));
    const snap=await page.evaluate(()=>{
      try{UI.sub.player='save';UI.open('player');}catch(e){}
      const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
      if(d)d.open=true;
      const check=d&&d.querySelector('small')?d.querySelector('small').textContent:'';
      const hold=Math.ceil(((G.syncHoldUntil||0)-Date.now())/1000);
      return {check,hold,base:Array.isArray(NET.base)?'array':(NET.base==null?'missing':typeof NET.base),rev:P._rev||0};
    });
    return {page,srv,prod,snap,team};
  }
  const oldRace=await openRace(brokenRoot,8821,'/tmp/auth-emu-delay.js');
  ok(/class=not-iterable/.test(oldRace.snap.check)&&/base=missing/.test(oldRace.snap.check)&&/before-getDoc/.test(oldRace.snap.check)&&oldRace.snap.hold>60,'11j startup read fails while the team path is still missing and holds');
  ok(oldRace.prod.length===0,'11j race did not call production Firebase');
  await oldRace.page.close(); oldRace.srv.close();

  const neu=await openRace(fixedRoot,8822,'/tmp/auth-emu-delay.js');
  ok(!/class=not-iterable/.test(neu.snap.check)&&neu.snap.base==='array'&&neu.snap.hold<=0,'11k does not fail or hold while init is still signing in');
  ok(neu.prod.length===0,'11l race did not call production Firebase');
  async function earlyClick(root,port){
    const srv=await serve(root,port);
    const page=await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request',req=>{
      const u=req.url();
      const cors={'access-control-allow-origin':'*','content-type':'text/javascript'};
      if(u.indexOf('firebase-firestore.js')>=0)return req.respond({status:200,headers:cors,body:fs.readFileSync('/tmp/firestore-emu-11k.js')});
      if(u.indexOf('firebase-auth.js')>=0)return req.respond({status:200,headers:cors,body:fs.readFileSync('/tmp/auth-emu-delay.js')});
      let host=''; try{host=new URL(u).hostname;}catch(e){}
      if(host==='www.gstatic.com'||host==='127.0.0.1'||host==='localhost')return req.continue();
      return req.abort();
    });
    const team='early'+port.toString(36);
    await page.evaluateOnNewDocument((t,profile)=>{localStorage.setItem('wl_team',t);localStorage.setItem('wl_p',JSON.stringify(profile));}, team, preload(team));
    const t0=Date.now();
    await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
    await new Promise(r=>setTimeout(r,700));
    await page.evaluate(()=>{try{UI.sub.player='save';UI.open('player');}catch(e){} const b=[...document.querySelectorAll('button')].find(x=>/Save to the cloud/.test(x.textContent)); if(b)b.click();});
    let last={};
    for(let i=0;i<16;i++){
      await new Promise(r=>setTimeout(r,400));
      last=await page.evaluate(()=>{
        const d=[...document.querySelectorAll('details')].find(x=>/Save check/.test(((x.querySelector('summary')||{}).textContent)||''));
        if(d)d.open=true;
        return {ready:!!(G&&G.sync26Ready),why:(typeof CS!=='undefined'&&CS.why)||'',report:(typeof CS!=='undefined'&&CS.report)||'',dom:d&&d.querySelector('small')?d.querySelector('small').textContent:'',uid:P&&P.uid||'',rev:P&&P._rev||0};
      });
      if(/Safe to switch/.test(last.report||'')&&/wrote /.test(last.dom||'')){
        const safe=/Cloud save (\d+)/.exec(last.report||'');
        const local=/local=(\d+)/.exec(last.why||'');
        const server=/server=([^ ]*)/.exec((last.why||'')+' ');
        let row=null;
        await env.withSecurityRulesDisabled(async ctx=>{
          const s=await getDoc(doc(ctx.firestore(),'teams',team,'saves',last.uid));
          if(s.exists()){const o=JSON.parse(s.data().data||'{}');row={rev:s.data().rev||0,scrap:o.res&&o.res.scrap};}
        });
        last.safeN=safe?+safe[1]:-1;
        last.localN=local?+local[1]:-1;
        last.serverField=server?server[1]:null;
        last.doc=row;
        break;
      }
    }
    await page.close(); srv.close();
    return {ms:Date.now()-t0,...last};
  }
  const stuck=await earlyClick(deployed11k,8824);
  ok(stuck.why==='not-ready'&&stuck.ready===false&&!/wrote /.test(stuck.dom||''),'deployed 11k leaves that Save on not-ready');
  const healed=await earlyClick(fixedRoot,8825);
  ok(/Safe to switch/.test(healed.report)&&/wrote /.test(healed.dom)&&!/not-ready/.test(healed.dom)&&!/class=not-iterable/.test(healed.dom),'11l finishes that same early Save and paints the confirmation');
  ok(healed.serverField==='','the wrote line leaves server blank when the read found no document');
  if(!(healed.doc&&healed.doc.rev===healed.safeN&&healed.doc.rev!==healed.localN&&healed.doc.scrap===2566))console.log('early-doc',JSON.stringify({why:healed.why,report:healed.report,safeN:healed.safeN,localN:healed.localN,server:healed.serverField,doc:healed.doc,uid:healed.uid}));
  ok(healed.doc&&healed.doc.rev===healed.safeN&&healed.doc.rev!==healed.localN&&healed.doc.scrap===2566,'Safe names the stored revision, not the old local number');
  await neu.page.close(); neu.srv.close();

  // Normal login, no-op, spend, second device, handback. Fast auth, real init.
  const team='crew'+Date.now().toString(36);
  const srv=await serve(fixedRoot,8823);
  async function person(){
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
    await page.goto('http://127.0.0.1:8823/?team='+team,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForSelector('#obName');
    await page.click('#obName',{clickCount:3});
    await page.type('#obName','QA-Test');
    await page.click('#obGo');
    await page.waitForFunction(()=>P&&P.uid&&P.name==='QA-Test'&&Array.isArray(NET.base),{timeout:30000});
    return page;
  }
  async function clickSave(page){
    await page.evaluate(()=>{
      G.syncHoldUntil=0;
      CS.report='waiting';CS.status='waiting';CS.why='waiting';
      UI.sub.player='save';UI.open('player');UI.render();
      const b=[...document.querySelectorAll('button')].find(x=>/Save to the cloud/.test(x.textContent));
      if(!b)throw new Error('no save');
      b.click();
    });
    await page.waitForFunction(()=>{
      const t=(document.getElementById('sheetBody')||{}).innerText||'';
      if(/waiting|has not been confirmed/.test(t))return false;
      return /Safe to switch|Do not switch yet/.test(t);
    },{timeout:20000}).catch(()=>{});
    return page.evaluate(()=>{
      G.syncHoldUntil=Date.now()+600000;
      const t=(document.getElementById('sheetBody')||{}).innerText||'';
      return {text:t.replace(/\s+/g,' ').slice(0,240),rev:P._rev||0,scrap:P.res.scrap,why:(typeof CS!=='undefined'&&CS.why)||'',report:(typeof CS!=='undefined'&&CS.report)||''};
    });
  }
  const source=await person();
  const sourceUid=await source.evaluate(()=>P.uid);
  async function docOf(id){
    let row=null;
    await env.withSecurityRulesDisabled(async ctx=>{
      const s=await getDoc(doc(ctx.firestore(),'teams',team,'saves',id));
      if(!s.exists())return;
      const o=JSON.parse(s.data().data||'{}');
      row={rev:s.data().rev||0,scrap:o.res&&o.res.scrap,troops:o.troops&&o.troops.home};
    });
    return row;
  }
  await source.waitForFunction(()=>typeof G!=='undefined'&&G.sync26Ready,{timeout:15000});
  await source.evaluate(()=>{G.syncHoldUntil=Date.now()+600000;});
  let beforeFirst=null;
  for(let i=0;i<15;i++){
    const row=await docOf(sourceUid);
    const local=await source.evaluate(()=>P._rev||0);
    if(row&&row.rev===local){beforeFirst=row;break;}
    if(!row&&i>=6)break;
    await new Promise(r=>setTimeout(r,200));
  }
  await source.evaluate(()=>{P.res={scrap:2566,food:2855,water:2864,fuel:3000,parts:2992};P.troops={home:1000,queue:[],away:{}};P.stronghold={level:2};save();G.syncHoldUntil=Date.now()+600000;});
  const first=await clickSave(source);
  const sourceDoc=await docOf(sourceUid);
  const firstSafe=/Cloud save (\d+)/.exec(first.report||'');
  const firstServer=/server=([^ ]*)/.exec((first.why||'')+' ');
  const firstAnchored=!!(firstSafe&&sourceDoc&&+firstSafe[1]===sourceDoc.rev&&sourceDoc.rev===first.rev&&sourceDoc.scrap===2566&&firstServer&&(beforeFirst?firstServer[1]===String(beforeFirst.rev)&&sourceDoc.rev===beforeFirst.rev+1:firstServer[1]===''));
  if(!firstAnchored)console.log('first-doc',JSON.stringify({before:beforeFirst,after:sourceDoc,why:first.why,report:first.report,rev:first.rev}));
  ok(firstAnchored,'the first Safe number is the stored revision, and server= is the revision that read returned');
  const tight=await source.evaluate(async()=>{
    G.syncHoldUntil=0;
    await cloudSave(true);
    const a=P._rev||0;
    await cloudSave(true);
    const b=P._rev||0;
    G.syncHoldUntil=Date.now()+600000;
    return {a,b};
  });
  const noopDoc=await docOf(sourceUid);
  if(!(tight.b===tight.a&&noopDoc&&noopDoc.rev===sourceDoc.rev&&noopDoc.scrap===2566))console.log('noop-doc',JSON.stringify({tight,noop:noopDoc,source:sourceDoc}));
  ok(tight.b===tight.a&&noopDoc&&noopDoc.rev===sourceDoc.rev&&noopDoc.scrap===2566,'the same progress does not write a new stored revision');
  const beforeSpend=await docOf(sourceUid);
  await source.evaluate(()=>{G.syncHoldUntil=0;P.res.scrap=2400;P.troops.home=900;save();});
  const spent=await clickSave(source);
  const spentDoc=await docOf(sourceUid);
  const spentSafe=/Cloud save (\d+)/.exec(spent.report||'');
  const spentServer=/server=(\d+)/.exec(spent.why||'');
  const spendAnchored=!!(/Safe to switch/.test(spent.report)&&spentSafe&&spentDoc&&+spentSafe[1]===spentDoc.rev&&spentDoc.rev===beforeSpend.rev+1&&spentDoc.scrap===2400&&spentDoc.troops===900&&spentServer&&+spentServer[1]===beforeSpend.rev);
  if(!spendAnchored)console.log('spend-doc',JSON.stringify({before:beforeSpend,after:spentDoc,why:spent.why,report:spent.report,rev:spent.rev}));
  ok(spendAnchored,'the spend Safe number and its server= line match the stored document');
  const guest=await person();
  const guestReady=await guest.waitForFunction(()=>P&&P.res&&P.res.scrap===2400&&P.troops&&P.troops.home===900,{timeout:20000}).then(()=>true).catch(()=>false);
  const guestInfo=await guest.evaluate(src=>({same:P.uid===src,scrap:P.res&&P.res.scrap,troops:P.troops&&P.troops.home,rev:P._rev||0}), sourceUid);
  ok(guestReady&&!guestInfo.same&&guestInfo.scrap===2400&&guestInfo.troops===900&&guestInfo.rev===spentDoc.rev,'a second device adopts the new stored revision and its changed progress');
  let sourceStill=null;
  await env.withSecurityRulesDisabled(async ctx=>{
    const s=await getDoc(doc(ctx.firestore(),'teams',team,'saves',sourceUid));
    sourceStill=s.exists()?s.data().rev:-1;
    const other=await getDocs(collection(ctx.firestore(),'teams',team+'x','saves'));
    ok(other.size===0,'another crew has none of these saves');
  });
  ok(sourceStill===spent.rev,'the second device does not rewrite the source document');
  await source.reload({waitUntil:'domcontentloaded'});
  await source.waitForFunction(()=>P&&P.res&&P.res.scrap===2400&&NET.fs&&NET.fs.getDoc&&Array.isArray(NET.base),{timeout:20000});
  await source.evaluate(()=>{try{sessionStorage.setItem('wl_sync26_reloaded','1');}catch(e){}G.syncHoldUntil=Date.now()+600000;});
  const back=await source.evaluate(()=>({scrap:P.res.scrap,troops:P.troops.home,rev:P._rev||0}));
  ok(back.scrap===2400&&back.troops===900&&back.rev===spentDoc.rev,'the source reads the stored revision back');

  let frozen=-1;
  await env.withSecurityRulesDisabled(async ctx=>{
    const s=await getDoc(doc(ctx.firestore(),'teams',team,'saves',sourceUid));
    frozen=s.exists()?s.data().rev:-1;
  });
  await source.evaluate(()=>{
    const sdk=window.__sdk||NET.fs; window.__sdk=sdk;
    NET.fs=new Proxy(sdk,{get:function(t,p){if(p==='getDoc')return function(){const e=new Error('unavailable');e.code='unavailable';e.name='FirebaseError';return Promise.reject(e);};return t[p];}});
    P.res.scrap=2350;save();G.syncHoldUntil=0;
  });
  const unread=await clickSave(source);
  let afterUnread=-1;
  await env.withSecurityRulesDisabled(async ctx=>{const s=await getDoc(doc(ctx.firestore(),'teams',team,'saves',sourceUid));afterUnread=s.data().rev;});
  ok(/Do not switch yet/.test(unread.text)&&!/Safe to switch/.test(unread.text)&&afterUnread===frozen,'a failed read is not safe and does not write');
  await source.evaluate(()=>{
    const sdk=window.__sdk;
    NET.fs=new Proxy(sdk,{get:function(t,p){if(p==='getDoc')return function(){const e=new Error('quota');e.code='resource-exhausted';e.name='FirebaseError';return Promise.reject(e);};return t[p];}});
    P.res.scrap=2300;save();G.syncHoldUntil=0;
  });
  const quota=await clickSave(source);
  let afterQuota=-1;
  await env.withSecurityRulesDisabled(async ctx=>{const s=await getDoc(doc(ctx.firestore(),'teams',team,'saves',sourceUid));afterQuota=s.data().rev;});
  if(!(/Do not switch yet/.test(quota.text)&&!/Safe to switch/.test(quota.text)&&afterQuota===frozen))console.log('quota', frozen, afterQuota, quota.text.slice(0,140));
  ok(/Do not switch yet/.test(quota.text)&&!/Safe to switch/.test(quota.text)&&afterQuota===frozen,'a quota failure is not safe and does not advance');
  await source.evaluate(()=>{window.__keptBase=NET.base;NET.base=null;G.syncHoldUntil=0;P.res.scrap=2200;save();});
  const missing=await clickSave(source);
  ok(/Do not switch yet|not saved yet|class=not-iterable/.test(missing.text)&&!/Safe to switch/.test(missing.text),'a missing team path is not reported as safe');
  let afterMissing=-1;
  await env.withSecurityRulesDisabled(async ctx=>{const s=await getDoc(doc(ctx.firestore(),'teams',team,'saves',sourceUid));afterMissing=s.data().rev;});
  if(afterMissing!==afterQuota)console.log('missing-path', afterQuota, afterMissing, missing.text.slice(0,140));
  ok(afterMissing===afterQuota,'nothing is written before the team path is valid');
  await source.evaluate(()=>{
    NET.base=window.__keptBase;
    const sdk=window.__sdk;
    NET.fs=new Proxy(sdk,{get:function(t,p){if(p==='getDoc')return function(){return new Promise(function(){});};return t[p];}});
    G.syncHoldUntil=0;P.res.scrap=2100;save();
  });
  await source.evaluate(()=>{UI.sub.player='save';UI.open('player');[...document.querySelectorAll('button')].find(x=>/Save to the cloud/.test(x.textContent)).click();});
  await source.waitForFunction(()=>/Do not switch yet/.test((document.getElementById('sheetBody')||{}).innerText||''),{timeout:10000});
  const pending=(await source.evaluate(()=>(document.getElementById('sheetBody')||{}).innerText||''));
  ok(/Do not switch yet/.test(pending)&&!/Safe to switch/.test(pending),'a save that has not finished is not safe');

  console.log('proof',JSON.stringify({early:{local:healed.localN,server:healed.serverField,safe:healed.safeN,stored:healed.doc},first:{before:beforeFirst,why:first.why,report:first.report,stored:sourceDoc},noop:noopDoc,spend:{before:beforeSpend,why:spent.why,report:spent.report,stored:spentDoc,guest:guestInfo,back}}));
  await browser.close(); srv.close(); await env.cleanup();
  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',String(e&&e.stack||e).split('\n').slice(0,8).join(' | '));process.exit(1);});
