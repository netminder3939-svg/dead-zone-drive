// Fresh-uid startup against the Firestore emulator. No production host is contacted.
// A preview hostname (contains "--") is what turns on the test-kit path.
const http=require('http'),fs=require('fs'),path=require('path');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,Timestamp}=require('firebase/firestore');
const root=path.join(__dirname,'../..');
const port=8767;
const TEAM='pv-rathdrum-crew';
const base=`teams/${TEAM}`;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{
  const u=decodeURIComponent(q.url.split('?')[0]);
  const f=path.join(root,u==='/'?'index.html':u);
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('missing');}
  r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(f).pipe(r);
});
function banned(url){
  let u;try{u=new URL(url);}catch(e){return false;}
  if(u.hostname==='127.0.0.1'||u.hostname==='localhost')return false;
  if(u.hostname==='www.gstatic.com')return false;
  return /googleapis|firebase|gstatic/.test(u.hostname);
}
function profile(over){
  return Object.assign({
    name:'QA-Test',lvl:1,xp:0,hp:100,color:'#4ad7ff',fullEpoch:0,mapEpoch:1,kit8:1,
    res:{scrap:2566,food:2855,water:2864,fuel:3000,parts:2992},
    troops:{home:1000,queue:[],away:{}},tiles:{},
    world:{sh:{hex:'1_0',hpPct:1,state:'up',buildEnd:0,everBuilt:true},towers:{},reports:[]},
    stronghold:{level:2},
    inv:[{id:'wrench',name:'Pipe Wrench',slot:'weapon'},{id:'coat',name:'Hazmat Coat',slot:'armor'}],
    equip:{weapon:'wrench'},
    sync26:{clock:{'qa-source':1},ops:[],snap:null},acct:'qatest'
  },over||{});
}
function saveDoc(p,rev,savedAt){
  return {data:JSON.stringify(p),rev:rev,savedAt:savedAt,name:p.name,lvl:p.lvl,v:2,fe:0,me:1,acct:p.acct||'qatest',serverT:Timestamp.fromMillis(savedAt)};
}
const SOURCE=profile({_rev:7,_savedAt:1700000000000});
const PHONE=profile({
  _rev:8,_savedAt:1700000100000,acct:'qatest',
  res:{scrap:2400,food:2700,water:2800,fuel:2900,parts:2000},
  troops:{home:900,queue:[],away:{}},
  sync26:{clock:{'qa-phone':2},ops:[],snap:null}
});

(async()=>{
  let fail=0;
  const ok=(c,m)=>{if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);};
  const rules=fs.readFileSync(path.join(root,'tests/fixtures/published-firestore-rules.rules'),'utf8');
  const env=await initializeTestEnvironment({
    projectId:'demo-dead-zone-drive',
    firestore:{host:'127.0.0.1',port:8080,rules:rules}
  });
  async function writeAlliance(acct){
    await env.withSecurityRulesDisabled(async ctx=>{
      const db=ctx.firestore();
      await setDoc(doc(db,`${base}/meta/map`),{epoch:1,fullEpoch:0});
      await setDoc(doc(db,`${base}/meta/alliance`),{bank:{scrap:0,food:0,water:0,fuel:0,parts:0},acct24:acct});
    });
  }
  async function writeSave(id,body){
    await env.withSecurityRulesDisabled(async ctx=>{
      await setDoc(doc(ctx.firestore(),`${base}/saves/${id}`),body);
    });
  }
  async function saves(){
    let rows=[];
    await env.withSecurityRulesDisabled(async ctx=>{
      const snap=await getDocs(collection(ctx.firestore(),`${base}/saves`));
      rows=snap.docs.map(d=>({id:d.id,rev:d.data().rev,data:d.data().data,acct:d.data().acct||''}));
    });
    return rows;
  }
  function same(rows,id,body){
    const row=rows.find(r=>r.id===id);
    return !!row&&row.rev===body.rev&&row.data===body.data;
  }
  await writeAlliance({qatest:{name:'QA-Test',s:'testsalt',h:null,uids:['qa-source'],t:1}});
  const sourceBody=saveDoc(SOURCE,7,1700000000000);
  await writeSave('qa-source',sourceBody);

  await new Promise(r=>srv.listen(port,'127.0.0.1',r));
  const puppeteer=require('puppeteer-core');
  const browser=await puppeteer.launch({
    executablePath:'/usr/bin/google-chrome',headless:'new',
    args:['--no-sandbox','--disable-dev-shm-usage','--host-resolver-rules=MAP dead-zone-drive--test.example 127.0.0.1']
  });
  async function openGuest(){
    const context=await browser.createBrowserContext();
    const page=await context.newPage();
    const hits=[];
    const errors=[];
    await page.setRequestInterception(true);
    page.on('request',req=>{
      const url=req.url();
      if(banned(url)){hits.push(url);return req.abort();}
      if(/arcgisonline|openstreetmap|mail\.ru/.test(url))return req.abort();
      req.continue();
    });
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://dead-zone-drive--test.example:'+port+'/?team=rathdrum-crew',{waitUntil:'domcontentloaded',timeout:60000});
    await page.evaluate(()=>{
      NET.init=async function(profile){
        window.__bootInitEntered=Date.now();
        await new Promise(r=>setTimeout(r,1000));
        const V='https://www.gstatic.com/firebasejs/10.12.2/';
        const appMod=await import(V+'firebase-app.js');
        const authMod=await import(V+'firebase-auth.js');
        const fsMod=await import(V+'firebase-firestore.js');
        const name='emu-'+Math.random().toString(36).slice(2);
        const a=appMod.initializeApp({apiKey:'demo',authDomain:'demo.firebaseapp.com',projectId:'demo-dead-zone-drive'},name);
        this.fs=fsMod;
        try{this.db=fsMod.initializeFirestore(a,{experimentalForceLongPolling:true});}
        catch(e){this.db=fsMod.getFirestore(a);}
        fsMod.connectFirestoreEmulator(this.db,'127.0.0.1',8080);
        const au=authMod.getAuth(a);
        authMod.connectAuthEmulator(au,'http://127.0.0.1:9099',{disableWarnings:true});
        this.authMod=authMod;this.auth=au;
        const user=(await authMod.signInAnonymously(au)).user;
        this.mode='firebase';this.uid=user.uid;this.isAnon=true;this.email='';this.me=profile;
        this.team=localStorage.getItem('wl_team')||this.team;
        this.base=['teams',this.team];
        P.uid=this.uid;
        if(typeof cloudCheck==='function')await cloudCheck(this.uid);
        return this.uid;
      };
    });
    return {context,page,hits,errors};
  }
  async function enter(page,name){
    await page.waitForFunction(()=>document.querySelector('#onboard')&&!document.querySelector('#onboard').classList.contains('hidden')&&document.querySelector('#obPin'),{timeout:20000});
    const team=await page.$eval('#obTeam',e=>e.value);
    await page.click('#obName',{clickCount:3});
    await page.type('#obName',name);
    await page.evaluate(()=>{const p=document.querySelector('#obPin');if(p)p.value='';});
    await page.click('#obGo');
    return team;
  }

  const guest=await openGuest();
  const team=await enter(guest.page,'QA-Test');
  ok(team==='pv-rathdrum-crew','the preview address fills pv-rathdrum-crew before Enter');
  const pending=await guest.page.waitForFunction(()=>{
    const el=document.getElementById('loginHold');
    return !!(el&&el.style.display!=='none'&&/Looking up this name/.test(el.textContent)&&window.__bootInitEntered&&!P.uid);
  },{timeout:15000}).then(()=>guest.page.evaluate(()=>({
    hold:document.getElementById('loginHold').textContent,
    kit:P.kit8||0,
    scrap:P.res.scrap,
    troops:(P.troops&&P.troops.home)||0,
    hazmat:/Hazmat set|Resources start at 0/.test(document.body.innerText),
    gps:G.gps&&G.gps.state
  }))).catch(e=>null);
  ok(!!pending&&/has not loaded yet/.test(pending.hold),'while auth is still pending the screen says the cloud save has not loaded');
  ok(!!pending&&pending.kit===0&&pending.scrap===0&&pending.troops===0&&pending.hazmat===false,'the pending screen does not apply the zeroed test kit');
  if(pending)console.log('pending gps',pending.gps);

  await guest.page.waitForFunction(()=>{
    const el=document.getElementById('loginHold');
    return P&&P.troops&&P.troops.home===1000&&P._rev===7&&(!el||el.style.display==='none');
  },{timeout:30000});
  const loaded=await guest.page.evaluate(()=>{
    UI.sub.player='save';UI.open('player');
    const seg=[...document.querySelectorAll('#sheetBody .seg button')].find(b=>/Save/.test(b.textContent)&&!/cloud/.test(b.textContent));
    if(seg)seg.click();
    return {
      scrap:P.res.scrap,food:P.res.food,water:P.res.water,fuel:P.res.fuel,parts:P.res.parts,
      troops:P.troops.home,rev:P._rev,name:P.name,lvl:P.lvl,kit:P.kit8||0,
      hint:!!document.getElementById('hint25'),
      sheet:(document.getElementById('sheetBody')||{}).innerText||'',
      res:(document.getElementById('res')||{}).innerText||'',
      hold:(document.getElementById('loginHold')||{}).textContent||'',
      gps:G.gps&&G.gps.state,
      team:NET.team
    };
  });
  ok(loaded.name==='QA-Test'&&loaded.lvl===1,'the loaded player is QA-Test level 1');
  ok(loaded.scrap===2566&&loaded.food===2855&&loaded.water===2864&&loaded.fuel===3000&&loaded.parts===2992,'the resource bar is the cloud balance, not a new zero hero');
  ok(loaded.troops===1000&&loaded.hint===false,'home troops are the cloud army, and the empty-barracks hint is gone');
  ok(loaded.rev===7&&/Cloud save number 7/.test(loaded.sheet),'Player → Save shows cloud save number 7');
  ok(/2566/.test(loaded.res),'the HUD paints 2566 scrap from the loaded profile');
  ok(loaded.team==='pv-rathdrum-crew','the read used the preview team');
  console.log('loaded gps',loaded.gps);
  const after1=await saves();
  ok(same(after1,'qa-source',sourceBody)&&after1.length===1,'the source cloud document is unchanged and no blank save was written');
  ok(guest.hits.length===0,'the page did not call the hosted project ('+guest.hits.length+')');
  if(guest.errors.length)console.log('page errors',guest.errors.slice(0,8));
  await guest.context.close();

  const phoneBody=saveDoc(PHONE,8,1700000100000);
  await writeSave('qa-phone',phoneBody);
  await writeAlliance({qatest:{name:'QA-Test',s:'testsalt',h:null,uids:['qa-source','qa-phone'],t:2}});
  const guest2=await openGuest();
  await enter(guest2.page,'QA-Test');
  await guest2.page.waitForFunction(()=>P&&P.troops&&P.troops.home===900&&P._rev===8,{timeout:30000});
  const newer=await guest2.page.evaluate(()=>({scrap:P.res.scrap,troops:P.troops.home,rev:P._rev}));
  ok(newer.rev===8&&newer.troops===900&&newer.scrap===2400,'a fresh uid reads the newer cloud revision, not the older one and not zeros');
  const after2=await saves();
  ok(same(after2,'qa-source',sourceBody),'the older source document is still the original revision 7');
  ok(same(after2,'qa-phone',phoneBody),'the newer phone document was not overwritten');
  ok(!after2.some(r=>r.id!=='qa-source'&&r.id!=='qa-phone'),'the fresh uid did not upload its own profile over either save');
  ok(guest2.hits.length===0,'the second page did not call the hosted project');
  await guest2.context.close();

  await writeAlliance({
    qatest:{name:'QA-Test',s:'testsalt',h:null,uids:['qa-source','qa-phone'],t:2},
    qalock:{name:'QA-Lock',s:'testsalt',h:'locked',uids:['qa-source'],t:3}
  });
  const guest3=await openGuest();
  await enter(guest3.page,'QA-Lock');
  await guest3.page.waitForFunction(()=>{
    const el=document.getElementById('loginHold');
    return el&&el.style.display!=='none'&&/has a PIN/.test(el.textContent);
  },{timeout:30000});
  const refused=await guest3.page.evaluate(()=>({
    kit:P.kit8||0,scrap:P.res.scrap,rev:P._rev||0,pending:!!(G.cloudLogin&&G.cloudLogin.pending),
    hazmat:/Hazmat set|Resources start at 0/.test(document.body.innerText)
  }));
  ok(refused.pending&&refused.kit===0&&refused.scrap===0&&refused.rev===0&&refused.hazmat===false,'a failed lookup stays on the hold and does not start the zeroed hero');
  const after3=await saves();
  ok(same(after3,'qa-source',sourceBody)&&same(after3,'qa-phone',phoneBody),'a refused login does not change either cloud profile');
  await guest3.context.close();

  await browser.close();
  srv.close();
  await env.cleanup();
  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',e);process.exit(1);});
