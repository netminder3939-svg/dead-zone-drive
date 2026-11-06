// Desktop Hero panel: Save must be the control under its own label.
const http=require('http'),fs=require('fs'),path=require('path');
const root=process.env.FLAT_PUBLIC||'/tmp/11q-pack/ddd-v26-11q-flat/public';
const puppeteer=require('puppeteer-core');
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
  const port=Number(process.env.PORT)||8845;
  const srv=await serve(port);
  const browser=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  await page.setViewport({width:1400,height:900});
  async function check(width){
    await page.setViewport({width:width,height:900});
    await page.evaluate(()=>{UI.open('player');UI.sub.player='stats';UI.render();});
    await new Promise(r=>setTimeout(r,150));
    return page.evaluate(()=>{
      const seg=document.querySelector('#sheetBody .seg');
      const save=[...seg.querySelectorAll('button')].find(b=>/Save/.test(b.textContent));
      const r=save.getBoundingClientRect();
      const sr=seg.getBoundingClientRect();
      const x=document.getElementById('sheetX').getBoundingClientRect();
      const hit=document.elementFromPoint(Math.min(Math.max(r.x+r.width/2,1),innerWidth-2), Math.min(Math.max(r.y+r.height/2,1),innerHeight-2));
      const overlap=!(r.right<x.left||r.left>x.right||r.bottom<x.top||r.top>x.bottom);
      return {width:innerWidth,inView:r.left>=sr.left-1&&r.right<=sr.right+1&&r.bottom<=sr.bottom+1,overlap,hit:(hit&&hit.textContent||'').trim().slice(0,24)};
    });
  }
  const day=new Date().toLocaleDateString('en-CA');
  const profile={name:'QA-Test',lvl:1,xp:0,sp:0,hp:100,acct:'qatest',_rev:34,res:{scrap:2566,food:2855,water:2864,fuel:3000,parts:2992},skills:{},badges:{},contrib:{kills:0,badges:0,raids:0,hexes:0,deposited:0,withdrawn:0,km:0},troops:{home:1000,queue:[],away:{}},stronghold:{level:2},world:{barracks:{level:1}},tiles:{},stats:{meters:0,kills:0},claimDay:{d:day,n:35}};
  await page.evaluateOnNewDocument(p=>{
    localStorage.setItem('wl_team','rathdrum-crew');
    localStorage.setItem('wl_p',JSON.stringify(p));
    setInterval(()=>{try{if(typeof startGPS==='function')startGPS=function(){};if(typeof ensureStartSh26==='function')ensureStartSh26=function(){};}catch(e){}},20);
  }, profile);
  await page.setRequestInterception(true);
  page.on('request',req=>{
    let host=''; try{host=new URL(req.url()).hostname;}catch(e){}
    if(host==='127.0.0.1'||host==='localhost')return req.continue();
    return req.abort();
  });
  await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof UI!=='undefined'&&P&&P.name,{timeout:20000});
  await page.evaluate(()=>{const b=document.querySelector('[data-tab=player]');b.click();});
  await new Promise(r=>setTimeout(r,200));
  const layout=await page.evaluate(()=>{
    const seg=document.querySelector('#sheetBody .seg');
    const save=[...seg.querySelectorAll('button')].find(b=>/Save/.test(b.textContent));
    const r=save.getBoundingClientRect();
    const sr=seg.getBoundingClientRect();
    const x=document.getElementById('sheetX').getBoundingClientRect();
    const hit=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
    const overlap=!(r.right<x.left||r.left>x.right||r.bottom<x.top||r.top>x.bottom);
    return {
      sheet:!$('#sheet').classList.contains('hidden'),
      overscroll:getComputedStyle(seg).overscrollBehaviorX,
      wrap:getComputedStyle(seg).flexWrap,
      inView:r.left>=sr.left-1&&r.right<=sr.right+1&&r.top>=sr.top-1&&r.bottom<=sr.bottom+1,
      overlap, hit:(hit&&hit.textContent||'').trim().slice(0,24),
      x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2), claims:P.claimDay.n
    };
  });
  await page.mouse.click(layout.x, layout.y);
  await new Promise(r=>setTimeout(r,250));
  const after=await page.evaluate(()=>{
    const cloud=[...document.querySelectorAll('#sheetBody button')].find(b=>/Save to the cloud/.test(b.textContent));
    const cr=cloud?cloud.getBoundingClientRect():null;
    const ch=cr?document.elementFromPoint(cr.x+Math.min(cr.width/2,80), cr.y+cr.height/2):null;
    return {
      sheet:!$('#sheet').classList.contains('hidden'),
      modal:!$('#modal').classList.contains('hidden'),
      sub:UI.sub.player,
      cloud:!!cloud,
      cloudHit:(ch&&ch.textContent||'').trim().slice(0,32),
      claims:P.claimDay.n
    };
  });
  let fail=0;
  function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
  console.log(JSON.stringify({layout,after}));
  ok(layout.sheet&&layout.wrap==='wrap'&&layout.overscroll==='contain','tab strip wraps and contains sideways scroll');
  ok(layout.inView&&!layout.overlap&&/Save/.test(layout.hit),'Save is on screen and is the control under its label');
  ok(after.sheet&&!after.modal&&after.sub==='save'&&after.cloud&&/Save to the cloud/.test(after.cloudHit),'clicking Save opens the save controls and leaves the panel up');
  ok(after.claims===35,'opening Save does not claim a hex');
  const phone=await check(390);
  console.log(JSON.stringify({phone}));
  ok(phone.inView&&!phone.overlap&&/Save/.test(phone.hit),'Save stays tappable on a phone width');
  await browser.close(); srv.close();
  process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS',String(e&&e.stack||e).split('\n').slice(0,8).join(' | '));process.exit(1);});
