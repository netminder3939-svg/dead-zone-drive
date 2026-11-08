// operating base is per device: computer operates from the Stronghold, phone stays on GPS
const {chromium}=require('playwright');const H=require('./two.js');let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
const act=(p,fn)=>p.evaluate(fn=>{document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));(0,eval)('('+fn+')')();save();},fn.toString());
(async()=>{await fetch(H.FB+'/reset',{method:'POST'});const b=await chromium.launch();const G='http://127.0.0.1:'+(process.env.PORT||8767)+'/';
 const ph=await H.device(b,'phone',G);await H.onboard(ph,'Pope');await H.signIn(ph,'pope@test.com','secret123','up');await H.choose(ph,'fresh');await H.ready(ph);
 await act(ph,()=>{const id=hexAt(47.7796,-116.8923).id;claimTile(id);W().sh={hex:id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;P.res.scrap=500;});await ph.waitForTimeout(3500);
 const pc=await H.device(b,'pc',G);await H.onboard(pc,'Pope');await H.signIn(pc,'pope@test.com','secret123','in');await H.ready(pc);await pc.waitForTimeout(3000);
 await act(pc,()=>{});await pc.waitForTimeout(2500);await act(pc,()=>{setOp15('sh');P.res.scrap=(P.res.scrap||0)+7;});await ph.waitForTimeout(5000);
 const r=await Promise.all([ph.evaluate(()=>({op:curBase15(),scrap:P.res.scrap})),pc.evaluate(()=>({op:curBase15(),scrap:P.res.scrap}))]);
 ok(r[1].op==='sh'&&r[0].op==='gps'&&r[0].scrap===507&&r[1].scrap===507,'computer operates from its Stronghold; phone stays on GPS; progress still syncs',r);
 console.log(fails?'FAILS':'ALL PASS');await b.close();})();
