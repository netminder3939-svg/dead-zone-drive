// Source → guest → source through the real Save button. Emulator only.
const http=require('http'),fs=require('fs'),path=require('path');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,getDoc,getDocs,collection}=require('firebase/firestore');
const root=path.join(__dirname,'../..');
const port=8780;
const TEAM='hb'+Date.now().toString(36);
const base=`teams/${TEAM}`;
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{
  const u=decodeURIComponent(q.url.split('?')[0]);
  const f=path.join(root,u==='/'?'index.html':u);
  if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end('missing');}
  r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(f).pipe(r);
});
function banned(url){let u;try{u=new URL(url);}catch(e){return false;}if(u.hostname==='127.0.0.1'||u.hostname==='localhost')return false;return /googleapis|firebase|gstatic/.test(u.hostname)&&u.hostname!=='www.gstatic.com';}

(async()=>{
  const rules=fs.readFileSync(path.join(root,'tests/fixtures/published-firestore-rules.rules'),'utf8');
  const env=await initializeTestEnvironment({projectId:'demo-dead-zone-drive',firestore:{host:'127.0.0.1',port:8080,rules}});
  async function saves(){
    let rows=[];
    await env.withSecurityRulesDisabled(async ctx=>{
      const snap=await getDocs(collection(ctx.firestore(),`${base}/saves`));
      rows=snap.docs.map(d=>{
        let o={};try{o=JSON.parse(d.data().data||'{}');}catch(e){}
        return {id:d.id,rev:d.data().rev||0,acct:d.data().acct||'',scrap:o.res&&o.res.scrap,troops:o.troops&&o.troops.home,bytes:JSON.stringify(d.data()).length};
      });
    });
    return rows;
  }
  await new Promise(r=>srv.listen(port,'127.0.0.1',r));
  const puppeteer=require('puppeteer-core');
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage','--unsafely-treat-insecure-origin-as-secure=http://localhost:'+port]});
  async function openPage(){
    const ctx=await browser.createBrowserContext();
    const page=await ctx.newPage();
    const hits=[];
    await page.setRequestInterception(true);
    page.on('request',req=>{if(banned(req.url())){hits.push(req.url());return req.abort();}if(/arcgisonline|openstreetmap/.test(req.url()))return req.abort();req.continue();});
    await page.evaluateOnNewDocument(()=>{
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
    await page.goto('http://localhost:'+port+'/?team='+TEAM,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForSelector('#obName');
    await page.click('#obName',{clickCount:3});
    await page.type('#obName','QA-Hand');
    const team=await page.$eval('#obTeam',e=>e.value);
    await page.click('#obGo');
    const ready=await page.waitForFunction(()=>P&&P.name==='QA-Hand'&&!(G.cloudLogin&&G.cloudLogin.pending),{timeout:20000}).then(()=>true).catch(()=>false);
    if(!ready){
      const snap=await page.evaluate(()=>({name:P&&P.name,uid:P&&P.uid,pending:G.cloudLogin&&G.cloudLogin.pending,lookup:G.cloudLogin&&G.cloudLogin.lookup,hold:(document.getElementById('loginHold')||{}).textContent||'',mode:typeof NET!=='undefined'&&NET.mode})).catch(e=>({err:String(e)}));
      console.log('boot',JSON.stringify(snap));
      throw new Error('startup did not finish');
    }
    return {ctx,page,hits,team};
  }
  async function arm(page){
    await page.evaluate(()=>{
      P.res={scrap:2566,food:2855,water:2864,fuel:3000,parts:2992};
      P.troops={home:1000,queue:[],away:{}};
      P.stronghold={level:2};
      save();
    });
  }
  async function clickSave(page){
    await page.evaluate(()=>{
      UI.sub.player='save';UI.open('player');
      CS.status='waiting';CS.report='';UI.render();
      [...document.querySelectorAll('button')].find(b=>/Save to the cloud/.test(b.textContent)).click();
    });
    await page.waitForFunction(()=>{
      const t=(document.getElementById('sheetBody')||{}).innerText||'';
      return /Status: saved |already on the server|This send did not go through|Both devices changed|newer cloud save/.test(t);
    },{timeout:30000});
    return page.evaluate(()=>{
      const t=(document.getElementById('sheetBody')||{}).innerText||'';
      return {text:t.replace(/\s+/g,' ').slice(0,240),rev:P._rev||0,scrap:P.res.scrap,troops:P.troops&&P.troops.home,uid:(P.uid||'').slice(-4)};
    });
  }

  const source=await openPage();
  ok(source.team===TEAM,'this harness is not the preview host, so the team stays on the emulator');
  await arm(source.page);
  const first=await clickSave(source.page);
  const afterFirst=await saves();
  const mine=afterFirst.find(r=>r.scrap===2566&&r.troops===1000);
  ok(/Status: saved /.test(first.text)&&!/did not go through/.test(first.text)&&!!mine&&mine.rev===first.rev,'the first Save click acks and writes that revision');
  ok(!!mine&&mine.bytes>1000,'the save document is the profile, not a few-hundred-byte side write');
  if(!mine){await browser.close();srv.close();await env.cleanup();process.exit(1);}
  const second=await clickSave(source.page);
  const afterSecond=await saves();
  const mine2=afterSecond.find(r=>r.id===mine.id);
  ok(/Status: saved /.test(second.text)&&!/did not go through/.test(second.text)&&second.rev===first.rev&&mine2.rev===mine.rev,'the same revision is confirmed again and is not written as a new number');

  await source.page.evaluate(()=>{P.res.scrap=2400;P.troops.home=400;save();});
  const spent=await clickSave(source.page);
  const afterSpend=await saves();
  const spentDoc=afterSpend.find(r=>r.id===mine.id);
  ok(/Status: saved /.test(spent.text)&&spent.rev===first.rev+1&&spentDoc.rev===spent.rev&&spentDoc.scrap===2400&&spentDoc.troops===400,'a real local spend writes the next revision and the screen acks it');

  let acctRows=null;
  await env.withSecurityRulesDisabled(async ctx=>{
    const s=await getDoc(doc(ctx.firestore(),`${base}/meta/alliance`));
    acctRows=s.exists()?s.data().acct24||null:null;
  });
  ok(acctRows&&acctRows.qahand&&acctRows.qahand.uids.length===1,'the name points at the source device before the guest links');
  const guest=await openPage();
  const guestReady=await guest.page.waitForFunction(rev=>P&&P.troops&&P.troops.home===400&&P.res.scrap===2400&&P._rev>=rev,{timeout:20000},spent.rev).then(()=>true).catch(async()=>{
    const snap=await guest.page.evaluate(()=>({rev:P._rev,scrap:P.res&&P.res.scrap,troops:P.troops&&P.troops.home,lookup:G.cloudLogin&&G.cloudLogin.lookup,pending:!!(G.cloudLogin&&G.cloudLogin.pending),hold:(document.getElementById('loginHold')||{}).textContent||'',acct:P.acct}));
    console.log('guest',JSON.stringify(snap));
    return false;
  });
  ok(guestReady,'the other device reads the higher revision');
  if(!guestReady){await browser.close();srv.close();await env.cleanup();process.exit(1);}
  const loaded=await guest.page.evaluate(()=>({rev:P._rev,scrap:P.res.scrap,troops:P.troops.home,uid:(P.uid||'').slice(-4)}));
  ok(loaded.uid!==first.uid&&loaded.troops===400&&loaded.scrap===2400,'the other device is a different id and reads the higher revision');
  const guestSave=await clickSave(guest.page);
  const afterGuest=await saves();
  const sourceDoc=afterGuest.find(r=>r.id===mine.id);
  ok(sourceDoc.rev===spent.rev&&sourceDoc.troops===400,'the guest Save does not rewrite the source document');
  ok(/Status: saved /.test(guestSave.text)&&!/still on this device/.test(guestSave.text),'the guest Save tells the truth instead of the generic failure');

  await source.page.reload({waitUntil:'domcontentloaded'});
  await source.page.waitForFunction(()=>P&&P.name==='QA-Hand'&&P.troops&&!(G.cloudLogin&&G.cloudLogin.pending),{timeout:30000});
  const back=await source.page.evaluate(()=>{UI.sub.player='save';UI.open('player');const t=(document.getElementById('sheetBody')||{}).innerText||'';return {text:t.replace(/\s+/g,' ').slice(0,240),rev:P._rev,troops:P.troops.home,scrap:P.res.scrap};});
  ok(back.troops===400&&back.scrap===2400&&back.rev>=spent.rev&&!/still on this device/.test(back.text),'the source reads the higher revision back and does not call that a lost save');
  ok(source.hits.length+guest.hits.length===0,'no production host was called');

  await browser.close();srv.close();await env.cleanup();
  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',e);process.exit(1);});
