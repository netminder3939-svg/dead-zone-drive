// Full flat 11h tree over HTTP with the real service worker. Production hosts are aborted.
const http=require('http'),fs=require('fs'),path=require('path');
const root=process.env.FLAT_PUBLIC||'/opt/cursor/artifacts/ddd-v26-11h-flat/public';
const port=8781;
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const types={
  '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'
};
function kind(ct){return String(ct||'').split(';')[0].trim();}
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
function urls(html){
  const out=[];
  for(const raw of html.match(/ (?:src|href)="([^"]+)"/g)||[]){
    const u=raw.replace(/^ (?:src|href)="/,'').replace(/"$/,'').split('?')[0];
    if(u.startsWith('data:'))continue;
    out.push(u);
  }
  return out;
}

(async()=>{
  const index=fs.readFileSync(path.join(root,'index.html'));
  const crypto=require('crypto');
  ok(crypto.createHash('sha256').update(index).digest('hex')==='bde3c418529d3a6d0de17cb4c007bf803e5a15df2e47c0bc30915eb8b324ed52','the flat index bytes are the rolled-back 11f index');
  const list=urls(index.toString());
  ok(list.length===86&&!list.some(u=>u.startsWith('js/')||u.startsWith('css/')||u.startsWith('lib/')),'the index has 86 flat asset URLs');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  ok(/const C='ddd-v26-11h';/.test(sw)&&!/cache\.addAll|precache|js\/|css\/|lib\//.test(sw),'the service worker is 11h and has no path precache');
  await new Promise(r=>srv.listen(port,'127.0.0.1',r));
  const puppeteer=require('puppeteer-core');
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  const seen=new Map();
  const blocked=[];
  const continued=[];
  await page.setRequestInterception(true);
  page.on('request',req=>{
    let u;try{u=new URL(req.url());}catch(e){return req.abort();}
    if(u.hostname!=='localhost'&&u.hostname!=='127.0.0.1'){
      blocked.push(u.hostname);
      return req.abort();
    }
    continued.push(u.hostname+u.pathname);
    req.continue();
  });
  page.on('response',res=>{
    let u;try{u=new URL(res.url());}catch(e){return;}
    if(u.hostname!=='localhost')return;
    seen.set(u.pathname,{status:res.status(),ct:kind(res.headers()['content-type'])});
  });
  await page.goto('http://localhost:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  const state=await page.evaluate(async(list)=>{
    const out={sw:!!(navigator.serviceWorker&&navigator.serviceWorker.controller),bg:getComputedStyle(document.body).backgroundColor,name:!!document.querySelector('#obName'),fetched:[]};
    for(const u of list){
      const r=await fetch('/'+u,{cache:'no-store'});
      out.fetched.push({u,status:r.status,ct:(r.headers.get('content-type')||'').split(';')[0].trim()});
    }
    return out;
  }, list.concat(['sw.js']));
  let bad=[];
  for(const row of state.fetched){
    const ext=path.extname(row.u);
    const want=types[ext]||'';
    if(row.status!==200||(want&&row.ct!==want))bad.push(row.u+' '+row.status+' '+row.ct);
  }
  ok(bad.length===0,'all 86 index URLs plus sw.js returned 200 with the right type ('+(list.length+1-bad.length)+'/'+(list.length+1)+')');
  if(bad.length)console.log(bad.slice(0,12).join('\n'));
  ok(state.sw&&state.name&&state.bg==='rgb(17, 20, 22)','the 11h service worker controlled the styled flat page');
  const prod=/firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebaseio|firebaseapp/;
  ok(!continued.some(u=>prod.test(u)),'no production Firebase request was loaded');
  console.log('aborted hosts', [...new Set(blocked)].join(' ')||'none');
  await browser.close();srv.close();
  console.log(fail?fail+' failed':'all passed');
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',e);process.exit(1);});
