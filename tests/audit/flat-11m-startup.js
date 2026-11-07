// What an ordinary 11m startup changes on a saved 1000-troop profile. Real flat files, real SDK.
const http=require('http'),fs=require('fs'),path=require('path');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc}=require('firebase/firestore');
const root=process.env.FLAT_PUBLIC||'/tmp/11m-pack/ddd-v26-11m-flat/public';
const repoRoot=path.join(__dirname,'../..');
const RES={scrap:2566,food:2855,water:2864,fuel:3000,parts:2992};
function snap(){return {res:{...RES},tiles:{},troops:{home:1000,queue:[],away:{}},prog:{lvl:1,xp:0,meters:0,kills:0,badges:0,drives:0}};}
function troopOp(uid){return {id:uid+':1:troops',uid,n:1,k:'troops',t:1};}
function profile(rev,savedAt,clock,ops){
  return {name:'QA-Test',lvl:1,xp:0,sp:0,hp:100,acct:'qatest',_rev:rev,_savedAt:savedAt,res:{...RES},skills:{},badges:{},contrib:{kills:0,badges:0,raids:0,hexes:0,deposited:0,withdrawn:0,km:0},troops:{home:1000,queue:[],away:{}},stronghold:{level:2},world:{barracks:{level:1}},tiles:{},stats:{meters:0,kills:0},claimDay:{d:new Date().toLocaleDateString('en-CA'),n:0},sync26:{clock,ops,legacyAt:{},snap:snap()}};
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
  const rules=fs.readFileSync(path.join(repoRoot,'tests/fixtures/published-firestore-rules.rules'),'utf8');
  const env=await initializeTestEnvironment({projectId:'dead-zone-drive',firestore:{host:'127.0.0.1',port:8080,rules}});
  const team='boot'+Date.now().toString(36);
  const puppeteer=require('puppeteer-core');
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  const srv=await serve(8832);
  const prod=[];
  async function open(){
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
    const seed=profile(33,5000,{devA:1},[troopOp('devA')]);
    await page.evaluateOnNewDocument((t,p)=>{
      localStorage.setItem('wl_team',t);if(!localStorage.getItem('wl_lock'))localStorage.setItem('wl_p',JSON.stringify(p));
      const allow=['home','queue','away','stationed','returning','wounded','healing','healFree','glSeen','gl25Seen','esc25','rec26','cap26Seen','recalled'];
      setInterval(()=>{try{if(typeof startGPS==='function')startGPS=function(){};if(typeof ensureStartSh26==='function')ensureStartSh26=function(){};}catch(e){}},20);
      window.__boot=[];
      setInterval(()=>{
        if(typeof P==='undefined'||!P)return;
        const t0=P.troops||{};
        const row={rev:P._rev||0,home:t0.home|0,tiles:Object.keys(P.tiles||{}).length,keys:allow.filter(k=>k in t0).join(','),ops:((P.sync26&&P.sync26.ops)||[]).filter(o=>o&&o.k==='troops').length,why:(typeof CS!=='undefined'&&CS.why)||''};
        const prev=window.__boot[window.__boot.length-1];
        if(!prev||JSON.stringify(prev)!==JSON.stringify(row))window.__boot.push(row);
      },100);
    }, team, seed);
    await page.goto('http://127.0.0.1:8832/?team='+team,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>typeof G!=='undefined',{timeout:15000});
    await page.evaluate(()=>{G.syncHoldUntil=Date.now()+600000;});
    await page.waitForFunction(()=>typeof NET!=='undefined'&&NET.uid&&Array.isArray(NET.base),{timeout:20000});
    return {page,uid:await page.evaluate(()=>NET.uid)};
  }
  const a=await open();
  const b=await open();
  const local=profile(33,5000,{devA:1},[troopOp('devA')]);
  const linked=profile(23,3000,{devB:1},[troopOp('devB')]);
  await env.withSecurityRulesDisabled(async c=>{
    const db=c.firestore();
    await setDoc(doc(db,'teams',team,'meta','alliance'),{acct24:{qatest:{name:'QA-Test',s:'salt',h:null,uids:[a.uid,b.uid]}}});
    await setDoc(doc(db,'teams',team,'saves',a.uid),{data:JSON.stringify(local),rev:33,savedAt:5000,name:'QA-Test',lvl:1,v:2,fe:0,acct:'qatest'});
    await setDoc(doc(db,'teams',team,'saves',b.uid),{data:JSON.stringify(linked),rev:23,savedAt:3000,name:'QA-Test',lvl:1,v:2,fe:0,acct:'qatest'});
  });
  await a.page.evaluate(raw=>{
    Storage.prototype.setItem.call(localStorage,'wl_lock','1');
    Storage.prototype.setItem.call(localStorage,'wl_p',JSON.stringify(raw));
    G.syncHoldUntil=0;
  }, local);
  await a.page.reload({waitUntil:'domcontentloaded'});
  await a.page.waitForFunction(()=>typeof G!=='undefined'&&(G.sync26Ready||(typeof CS!=='undefined'&&/Both devices changed/.test(CS.report||''))),{timeout:20000}).catch(()=>{});
  await new Promise(r=>setTimeout(r,1500));
  const seen=await a.page.evaluate(()=>{
    const allow=['home','queue','away','stationed','returning','wounded','healing','healFree','glSeen','gl25Seen','esc25','rec26','cap26Seen','recalled'];
    const t=P.troops||{};
    const sum=o=>Object.values(o||{}).reduce((n,v)=>n+(v||0),0);
    const q=(t.queue||[]).reduce((n,x)=>n+(x&&x.n||0),0);
    const st=sum(Object.fromEntries(Object.entries(t.stationed||{}).map(([k,v])=>[k,v&&v.n||0])));
    const back=(t.returning||[]).reduce((n,x)=>n+(x&&x.n||0),0);
    const held=P.sync26&&P.sync26.heldRemote&&P.sync26.heldRemote.profile;
    const ht=held&&held.troops||{};
    function sameCount(x,y){return ((x||0)|(0))===((y||0)|(0));}
    const ops=(P.sync26&&P.sync26.ops||[]).map(o=>o&&o.k==='troops'?'t':o&&o.k==='res'?'r':o&&o.k==='tiles'?'x':'o').join('');
    const resSame=held?['scrap','food','water','fuel','parts'].every(k=>(P.res[k]|0)===(held.res&&held.res[k]|0)):'n/a';
    const tileSame=held?Object.keys(P.tiles||{}).length===Object.keys(held.tiles||{}).length:'n/a';
    const shSame=held?(P.stronghold&&P.stronghold.level)===(held.stronghold&&held.stronghold.level):'n/a';
    return {
      rev:P._rev||0,
      home:t.home|0,
      away:sum(t.away),
      queue:q,
      station:st,
      back,
      wounded:t.wounded|0,
      keys:allow.filter(k=>k in t).join(','),
      ops,
      report:(typeof CS!=='undefined'&&CS.report)||'',
      why:(typeof CS!=='undefined'&&CS.why)||'',
      heldRev:P.sync26&&P.sync26.heldRemote?P.sync26.heldRemote.rev:0,
      homeSame:held?sameCount(t.home,ht.home):'n/a',
      awaySame:held?sum(t.away)===sum(ht.away):'n/a',
      resSame,tileSame,shSame,
      tiles:Object.keys(P.tiles||{}).length,
      sh:P.world&&P.world.sh?1:0,
      meters:(P.stats&&P.stats.meters)|0,
      brief:{hp:P.hp||0,xp:P.xp||0,badges:Object.keys(P.badges||{}).length,world:P.world?Object.keys(P.world).sort().join(','):'',contrib:JSON.stringify(P.contrib||null),claim:P.claimDay||'',paid:P.marchPaid?Object.keys(P.marchPaid).length:0,done:P.marchDone?Object.keys(P.marchDone).length:0,quests:P.quests?1:0,worldVals:Object.fromEntries(Object.keys(P.world||{}).map(k=>[k,P.world[k]==null?'null':Array.isArray(P.world[k])?'a'+P.world[k].length:(typeof P.world[k]==='object'?'o'+Object.keys(P.world[k]).length:typeof P.world[k])]))},
      boot:(window.__boot||[]).slice(0,12)
    };
  });
  let ownRev=-1,linkedRev=-1,linkedEnd=null;
  await env.withSecurityRulesDisabled(async c=>{
    const db=c.firestore();
    const s=await getDoc(doc(db,'teams',team,'saves',a.uid));
    const o=await getDoc(doc(db,'teams',team,'saves',b.uid));
    ownRev=s.exists()?s.data().rev:-1;
    linkedRev=o.exists()?o.data().rev:-1;
    if(o.exists()){try{linkedEnd=(JSON.parse(o.data().data).troops.queue[0]||{}).end;}catch(e){linkedEnd=null;}}
  });
  let fail=0;
  function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
  console.log('startup', JSON.stringify({report:seen.report,why:seen.why,rev:seen.rev,home:seen.home,keys:seen.keys,tiles:seen.tiles,sh:seen.sh,meters:seen.meters,brief:seen.brief,ownRev,linkedRev,prod:prod.filter(h=>/googleapis|firebase|gstatic/.test(h)&&h!=='www.gstatic.com').length}));
  if(process.env.EXPECT==='conflict'){
    ok(/Both devices changed/.test(seen.report)&&seen.home===1000&&linkedRev===23&&ownRev===33,'11m startup empty containers conflict and write nothing');
  }else{
    ok(!/Both devices changed/.test(seen.report)&&seen.home===1000&&linkedRev===23&&ownRev===33,'11o empty containers do not conflict or write');
    const late=profile(33,5000,{devA:1},[troopOp('devA')]);
    late.troops.queue=[{n:100,end:500}];
    const early=profile(23,3000,{devB:1},[troopOp('devB')]);
    early.troops.queue=[{n:100,end:900}];
    await env.withSecurityRulesDisabled(async c=>{
      const db=c.firestore();
      await setDoc(doc(db,'teams',team,'saves',a.uid),{data:JSON.stringify(late),rev:33,savedAt:5000,name:'QA-Test',lvl:1,v:2,fe:0,acct:'qatest'});
      await setDoc(doc(db,'teams',team,'saves',b.uid),{data:JSON.stringify(early),rev:23,savedAt:3000,name:'QA-Test',lvl:1,v:2,fe:0,acct:'qatest'});
    });
    await a.page.evaluate(raw=>{Storage.prototype.setItem.call(localStorage,'wl_p',JSON.stringify(raw));G.syncHoldUntil=0;}, late);
    await a.page.reload({waitUntil:'domcontentloaded'});
    await a.page.waitForFunction(()=>typeof CS!=='undefined'&&/Both devices changed/.test(CS.report||''),{timeout:20000}).catch(()=>{});
    const timed=await a.page.evaluate(()=>({report:(CS&&CS.report)||'',why:(CS&&CS.why)||'',home:P.troops.home|0,end:(P.troops.queue[0]||{}).end|0}));
    let timedRev=-1,timedEnd=null;
    await env.withSecurityRulesDisabled(async c=>{
      const o=await getDoc(doc(c.firestore(),'teams',team,'saves',b.uid));
      timedRev=o.exists()?o.data().rev:-1;
      timedEnd=(JSON.parse(o.data().data).troops.queue[0]||{}).end;
    });
    console.log('timing', JSON.stringify({report:timed.report,why:timed.why,home:timed.home,end:timed.end,linkedRev:timedRev,linkedEnd:timedEnd}));
    ok(/Both devices changed/.test(timed.report)&&/troops=differs/.test(timed.why)&&timed.home===1000&&timed.end===500&&timedRev===23&&timedEnd===900,'a different completion time conflicts and the linked document stays at its own time');
  }
  await browser.close(); srv.close(); await env.cleanup();
  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS', String(e&&e.stack||e).split('\n').slice(0,6).join(' | ')); process.exit(1);});
