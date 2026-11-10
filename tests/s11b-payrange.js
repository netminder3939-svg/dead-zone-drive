// R6.4 §3: the 📦 Pay range chip and overlay (E1-E6, E2b-E2d).
const lib=require('./s11-lib.js');
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const SHOT='/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/';
 const reload=async()=>{await p.reload({waitUntil:'load'});await p.waitForTimeout(6000);await lib(p);await p.waitForTimeout(2500);};
 await p.setViewportSize({width:430,height:900});await lib(p);
 // E2d: no bases -> no overlay, no hint
 const e2d=await ev(async()=>{await new Promise(r=>setTimeout(r,2000));return{c:U64().payU?U64().payU.circles.length:0,hint:!!MAP4.off.payHint64,leg:(document.getElementById('pay64leg')||{}).textContent,t:window.__t.filter(t=>/gold area/.test(t)).length};});
 ok(e2d.c===0&&!e2d.hint&&e2d.t===0,'E2d: no bases -> no overlay and no hint',e2d);
 // E1: first Stronghold -> chip on, gold area drawn, hint once
 const e1=await ev(async()=>{S11.sh(S11.RATH);map.setView(S11.RATH,12,{animate:false});drawWorld();await new Promise(r=>setTimeout(r,600));document.getElementById('f4t').click();await new Promise(r=>setTimeout(r,100));
   const chip=document.querySelector('#f4c button[data-k="pay64"]');return{c:U64().payU.circles.length,struck:chip.classList.contains('off'),hint:window.__t.filter(t=>/gold area shows where your hexes pay/.test(t)).length,saved:JSON.parse(localStorage.getItem('wl_f4')||'{}'),leg:document.getElementById('pay64leg').textContent};});
 ok(e1.c===1&&!e1.struck&&e1.hint===1&&e1.saved.payHint64===true&&e1.saved.payOn===undefined&&/Gold area/.test(e1.leg),'E1/E2d: after the first base the chip is on, the gold area shows, the hint shows once',e1);
 await p.screenshot({path:SHOT+'s11b-payrange-430.png'});
 // E4 phone placement + panel on screen
 const e4p=await ev(()=>{const f=document.getElementById('f4c').getBoundingClientRect(),t=document.getElementById('f4t').getBoundingClientRect(),mc=document.getElementById('mcToggle');const m=mc&&mc.getBoundingClientRect();
   return{top:Math.round(f.top),right:Math.round(f.right),btnBottom:Math.round(t.bottom),mcTop:m?Math.round(m.top):null,chips:document.querySelectorAll('#f4c button').length};});
 ok(e4p.top>=0&&e4p.right<=430&&e4p.chips===8&&(e4p.mcTop==null||!e4p.mcTop||e4p.btnBottom<=e4p.mcTop),'E4: phone: panel with 8 chips fully on screen, 🧭 above the march arrow',e4p);
 // E2b: turn it off, reload, build menu shows it while open
 const e2b=await ev(async()=>{MAP4.off.monster=true;localStorage.setItem('wl_f4',JSON.stringify(MAP4.off));document.querySelector('#f4c button[data-k="pay64"]').click();await new Promise(r=>setTimeout(r,200));
   return{c:U64().payU.circles.length,saved:JSON.parse(localStorage.getItem('wl_f4'))};});
 ok(e2b.c===0&&e2b.saved.payOn===false&&e2b.saved.monster===true,'E2b: turning the chip off hides it and saves payOn:false (other choices untouched)',e2b);
 await reload();
 const e2b2=await ev(async()=>{const c0=U64().payU.circles.length;const s=W().sh;G.pos=S11.ll(s.hex);UI.build();await new Promise(r=>setTimeout(r,300));const c1=U64().payU.circles.length;UI.closeModal();await new Promise(r=>setTimeout(r,200));
   return{c0,c1,c2:U64().payU.circles.length,mon:MAP4.off.monster,payOn:MAP4.off.payOn,hint:window.__t.filter(t=>/gold area/.test(t)).length};});
 ok(e2b2.c0===0&&e2b2.c1===1&&e2b2.c2===0&&e2b2.mon===true&&e2b2.payOn===false&&e2b2.hint===0,'E2b: still off after reload; the Build menu shows it while open, off again after closing',e2b2);
 // E2: an R6.3 wl_f4 with monster:true (no payOn, no payHint64) -> after the upgrade monsters still hidden AND pay range on, hint once
 await ev(()=>localStorage.setItem('wl_f4',JSON.stringify({monster:true})));await reload();
 const e2=await ev(()=>({c:U64().payU.circles.length,mon:MAP4.off.monster,hint:window.__t.filter(t=>/gold area/.test(t)).length,saved:JSON.parse(localStorage.getItem('wl_f4'))}));
 ok(e2.c===1&&e2.mon===true&&e2.saved.payHint64===true,'E2: an R6.3 saved filter keeps monsters hidden and Pay range comes on',e2);
 // E2c: 3 reloads, the hint never shows again
 let hints=0;for(let i=0;i<3;i++){await reload();hints+=await ev(()=>window.__t.filter(t=>/gold area/.test(t)).length);}
 ok(hints===0,'E2c: 3 reloads after the first hint: it never shows again',hints);
 // E3: two bases 8 mi apart -> one merged outline (no double-dark lens): sample the canvas between them
 const e3=await ev(async()=>{const shx=myBases15()[0];const a0=S11.ll(shx);const id=hexAt(a0[0]+8*1609.34/111320,a0[1]).id;
   P.tiles[id]={t:Date.now()};W().outposts[id]={state:'up',start:Date.now()-4e6,endsAt:Date.now()-1,hpPct:1};save();supplyBust64();const a=S11.ll(shx),b=S11.ll(id);map.fitBounds([a,b],{padding:[120,120],animate:false});await new Promise(r=>setTimeout(r,400));drawPay64();await new Promise(r=>setTimeout(r,200));
   const cv=document.querySelector('canvas.u64'),ctx=cv.getContext('2d');const pos=L.DomUtil.getPosition(cv),lp=map.latLngToLayerPoint([(a[0]+b[0])/2,(a[1]+b[1])/2]);const x=Math.round(lp.x-pos.x),y=Math.round(lp.y-pos.y);
   const mid=ctx.getImageData(x,y,1,1).data[3];const pa=map.latLngToLayerPoint(a);const one=ctx.getImageData(Math.round(pa.x-pos.x),Math.round(pa.y-pos.y),1,1).data[3];
   return{circles:U64().payU.circles.length,mid,one};});
 ok(e3.circles===2&&e3.mid>0&&Math.abs(e3.mid-e3.one)<=1,'E3: two bases 8 mi apart: the overlap is no darker than one circle',e3);
 await p.screenshot({path:SHOT+'s11b-two-bases-430.png'});
 // E6: pan for 10 s: the overlay redraws on moveend only, never on the 900 ms timer
 const e6=await ev(async()=>{const u=U64().payU;const d0=u.draws;await new Promise(r=>setTimeout(r,4000));const idle=u.draws-d0;const d1=u.draws;for(let i=0;i<10;i++){map.panBy([30,0],{animate:false});await new Promise(r=>setTimeout(r,600));}
   return{idle,pans:10,draws:u.draws-d1};});
 ok(e6.idle===0&&e6.draws<=e6.pans*2,'E6: no redraws while idle (900 ms timer) and at most one per moveend while panning',e6);
 // E5: the R6.2.1 van check is a separate script (tests/r6-2-van-flash.js), run with Pay range on
 // E4 desktop
 await p.setViewportSize({width:1280,height:800});await p.waitForTimeout(1500);
 const e4d=await ev(async()=>{document.getElementById('f4').classList.add('open');await new Promise(r=>setTimeout(r,100));const d=document.getElementById('f4'),f=document.getElementById('f4c').getBoundingClientRect(),lg=document.getElementById('legend21');
   const lr=lg&&getComputedStyle(lg).display!=='none'?lg.getBoundingClientRect():null;return{left:parseInt(d.style.left),bottom:Math.round(d.getBoundingClientRect().bottom),legTop:lr?Math.round(lr.top):null,top:Math.round(f.top),right:Math.round(f.right)};});
 ok(e4d.left===76&&(e4d.legTop==null||e4d.bottom<=e4d.legTop)&&e4d.top>=0&&e4d.right<=1280,'E4: desktop: 🧭 at left 76 above the legend, panel fully on screen',e4d);
 await p.screenshot({path:SHOT+'s11b-desk.png'});
 console.log('errors:',errs.length,errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');
});
