const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({geolocation:{latitude:47.7796,longitude:-116.8923},permissions:['geolocation'],viewport:{width:430,height:900}});
await c.route(/googleapis|gstatic|firebase(io|app)\.com|identitytoolkit|tile|openstreetmap|overpass|arcgis|carto/,r=>r.abort());
await c.addInitScript(()=>{const S=window.setInterval;window.__T={};window.setInterval=function(fn,ms,...a){const st=(new Error().stack||'').split('\n')[2]||'';const k=(st.match(/\/([\w.]+\.js):(\d+)/)||[,'?','?']).slice(1).join(':')+' @'+ms;const w=function(){const t=performance.now();try{return typeof fn==='function'?fn.apply(this,a):eval(fn);}finally{const d=performance.now()-t;const e=__T[k]=__T[k]||{n:0,ms:0,max:0};e.n++;e.ms+=d;e.max=Math.max(e.max,d);}};return S(w,ms);};});
const p=await c.newPage();await p.goto(process.argv[2]+'?local');await p.waitForTimeout(2500);
const inp=await p.$$('input');if(inp.length){await inp[0].fill('Pope');await inp[1].fill('testcrew');await p.click('text=Enter the Wastes');}
await p.waitForTimeout(4000);
// give the player a realistic mid-game state: 60 hexes, troops, a pipeline
await p.evaluate(()=>{G.pos=G.pos||[47.7796,-116.8923];const h0=hexAt(47.7796,-116.8923);const [q,r]=idQR(h0.id);for(let i=-4;i<=4;i++)for(let j=-3;j<=3;j++){const id=hexAt(...hexCenter(q+i,r+j)).id;P.tiles[id]={t:Date.now()};}
  TP().home=4000;const route=[0,1,2,3,4].map(i=>hexAt(...hexCenter(q+i,r)).id);P.pipes=[{id:'p1',name:'Line',route,st:'on'}];save();try{drawWorld();}catch(e){}});
await p.evaluate(()=>{for(const k in __T)delete __T[k];});const t0=Date.now();
const cdp=await c.newCDPSession(p);await cdp.send('Performance.enable');const m0=await cdp.send('Performance.getMetrics');
await p.waitForTimeout(60000);
const m1=await cdp.send('Performance.getMetrics');const g=(m,n)=>m.metrics.find(x=>x.name===n).value;
const T=await p.evaluate(()=>__T);const rows=Object.entries(T).sort((a,b)=>b[1].ms-a[1].ms);
console.log('60s: script CPU',(g(m1,'ScriptDuration')-g(m0,'ScriptDuration')).toFixed(2),'s, layout',(g(m1,'LayoutDuration')-g(m0,'LayoutDuration')).toFixed(2),'s, timers',rows.length);
rows.slice(0,15).forEach(([k,v])=>console.log(v.ms.toFixed(0).padStart(6)+'ms total  '+String(v.n).padStart(4)+' runs  max '+v.max.toFixed(1)+'ms  '+k));
await b.close();})();
