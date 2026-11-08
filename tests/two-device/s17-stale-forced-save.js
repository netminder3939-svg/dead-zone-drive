// a phone that has not yet seen the computer's newer save calls cloudSave(true): it must not overwrite it
const {chromium}=require('playwright');const H=require('./two.js');
const act=(p,fn)=>p.evaluate(fn=>{document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));(0,eval)('('+fn+')')();save();},fn.toString());
(async()=>{await fetch(H.FB+'/reset',{method:'POST'});const b=await chromium.launch();const G='http://127.0.0.1:'+(process.env.PORT||8767)+'/';
 const ph=await H.device(b,'phone',G);await H.onboard(ph,'Pope');await H.signIn(ph,'pope@test.com','secret123','up');await H.choose(ph,'fresh');await H.ready(ph);
 await act(ph,()=>{P.res.scrap=500;});await ph.waitForTimeout(3500);
 const pc=await H.device(b,'pc',G);await H.onboard(pc,'Pope');await H.signIn(pc,'pope@test.com','secret123','in');await H.ready(pc);await pc.waitForTimeout(3000);
 // phone stops hearing the server (its feed pauses), computer takes over and earns 100
 await ph.evaluate(()=>{window.__S=(window.__fakeFS||{});__fakeFS.listeners.forEach(l=>{l._c=l.check;l.check=()=>{};});});
 await act(pc,()=>{});await pc.waitForTimeout(2500);await act(pc,()=>{P.res.scrap+=100;});await pc.waitForTimeout(3000);
 // the stale phone makes a change and something calls an immediate save
 await ph.evaluate(async()=>{P.res.food=(P.res.food||0)+1;save();await cloudSave(true);});await ph.waitForTimeout(2000);
 const uid=await ph.evaluate(()=>NET.uid);const s=await (await fetch(H.FB+'/get?p='+encodeURIComponent('teams/testcrew/saves/'+uid))).json();const o=JSON.parse(s.data.data);
 console.log((o.res.scrap===600?'PASS':'FAIL')+' server keeps the computer\'s +100 (scrap '+o.res.scrap+')');await b.close();})();
