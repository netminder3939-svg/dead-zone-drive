// fixed build sanity: the own truck and its count still move, the count changes in place, escort ends cleanly, a removed line drops its truck.
require(process.cwd()+'/tests/h.js')(process.argv[2],async(p,errs)=>{let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};const ev=(f,a)=>p.evaluate(f,a);
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();const me=hexAt(...(G.pos||[47.7796,-116.8923])).id;const start=(typeof shHex15==='function'&&shHex15())||me;const [sq,sr]=idQR(start);const end=hexRing(sq,sr,6)[0].id;const route=marchTrack(start,end);if(route[0]!==start)route.unshift(start);
   PIPE.truckH=0.01;const gh=route[3];P.pipes=[{id:'tp1',name:'Test line',res:'fuel',site:'x',route,st:'online',onT:Date.now(),lastPay:Date.now(),guard25:{hex:gh,esc:true}}];const now=Date.now();stationed()[gh]={n:500,at:now+6e3,st:now,from:start};map.setView(hexCenter(...idQR(gh)),14,{animate:false});drawWorld();drawPipes();});
 const pos=()=>ev(()=>{const t=document.querySelector('.pipetruck'),v=document.querySelector('.vanstack26');const ll=e=>{let r=null;map.eachLayer(l=>{if(l.getElement&&l.getElement()&&l.getElement().contains(e))r=l.getLatLng();});return r&&[+r.lat.toFixed(6),+r.lng.toFixed(6)];};return{t:t&&ll(t),v:v&&ll(v),n:v&&v.textContent,esc:!!document.querySelector('.mk24.t-escort'),eta:(document.querySelector('.mk24.t-escort .mt')||{}).textContent};});
 await p.waitForTimeout(1300);const a=await pos();await p.waitForTimeout(2500);const b=await pos();
 ok(a.t&&b.t&&(a.t[0]!==b.t[0]||a.t[1]!==b.t[1]),'pipeline truck moves',[a.t,b.t]);ok(a.v&&b.v&&(a.v[0]!==b.v[0]||a.v[1]!==b.v[1]),'escort count moves with it',[a.v,b.v]);
 ok(b.t&&b.v&&Math.abs(b.t[0]-b.v[0])<1e-9&&Math.abs(b.t[1]-b.v[1])<1e-9,'truck and count at the same spot',[b.t,b.v]);
 ok(a.esc&&a.eta!==b.eta,'escort timer counts down in place',[a.eta,b.eta]);
 await ev(()=>{const gh=P.pipes[0].guard25.hex;stationed()[gh].n=750;});await p.waitForTimeout(1300);const c=await pos();ok(/750/.test(c.n||''),'count changes in place',c.n);
 await p.waitForTimeout(4000);const d=await pos();ok(!d.esc,'escort marker gone after arrival',d);
 await ev(()=>{P.pipes=[];drawPipes();});await p.waitForTimeout(1300);const e=await pos();ok(!e.t&&!e.v,'removed line: truck and count gone',e);
 console.log(fails?fails+' FAIL':'ALL PASS');});
