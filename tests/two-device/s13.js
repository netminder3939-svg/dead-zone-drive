const {chromium}=require('playwright');const H=require('./two.js');
const act=(p,fn)=>p.evaluate(fn=>{document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));(0,eval)('('+fn+')')();save();},fn.toString());
const srv=async p=>{const uid=await p.evaluate(()=>NET.uid);const s=await (await fetch(H.FB+'/get?p='+encodeURIComponent('teams/testcrew/saves/'+uid))).json();const o=JSON.parse(s.data.data);return{rev:s.data.rev,lease:s.data.lease&&s.data.lease.label,scrap:o.res.scrap,tiles:Object.keys(o.tiles).length,pipes:(o.pipes||[]).length};};
const writes=async()=>{const s=await (await fetch(H.FB+'/stats')).json();return Object.entries(s.writesByPath).filter(([k])=>k.includes('/saves/')).reduce((a,[,v])=>a+v,0);};
const short=x=>JSON.stringify({scrap:x.scrap,tiles:x.tiles,pipes:x.pipes,rev:x.rev,banner:x.banner.slice(0,60),cs:x.cs.slice(0,50)});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{await fetch(H.FB+'/reset',{method:'POST'});const b=await chromium.launch();const G='http://localhost:'+(process.argv[2]||8765)+'/';
 const ph=await H.device(b,'phone',G);await H.onboard(ph,'Pope');await H.signIn(ph,'pope@test.com','secret123','up');await H.choose(ph,'fresh');await H.ready(ph);
 await act(ph,()=>{P.res.scrap=500;P.pipes=[{id:'pp1',name:'Phone line',route:[],st:'on'}];});await ph.waitForTimeout(3500);
 console.log('phone',short(await H.st(ph)),'server',JSON.stringify(await srv(ph)));
 // A
 const pc=await H.device(b,'pc',G);await H.onboard(pc,'Pope');await H.signIn(pc,'pope@test.com','secret123','in');await H.ready(pc);await pc.waitForTimeout(2500);
 let c=await H.st(pc);console.log('pc',short(c));const sv=await srv(ph);ok(c.scrap===sv.scrap&&c.pipes===1&&c.tiles===sv.tiles,'A computer signs in with the phone\'s scrap + pipeline');
 ok(/phone/i.test(c.banner),'A computer shows "Playing on your phone"');
 // B
 await act(ph,()=>{P.res.scrap+=100;P.tiles['5_5']={t:Date.now()};});await pc.waitForTimeout(3500);
 c=await H.st(pc);const sb=await srv(ph);ok(c.scrap===sb.scrap&&c.tiles===sb.tiles&&c.pipes===1&&sb.scrap===600,'B computer follows the phone live (scrap 600, 1 tile) '+short(c));
 // C
 await act(pc,()=>{P.tiles['6_6']={t:Date.now()};P.res.scrap-=50;});await ph.waitForTimeout(4000);
 let p=await H.st(ph);c=await H.st(pc);const sc=await srv(ph);ok(p.tiles===c.tiles&&p.scrap===550&&c.scrap===550&&sc.lease==='computer','C phone follows after the computer takes over '+short(p));
 ok(/computer/i.test(p.banner)&&!c.banner,'C phone banner says playing on computer; computer has no banner');
 console.log('server',JSON.stringify(await srv(ph)));
 // D idle: both visible 40 s
 const w0=await writes();const l0=(await srv(ph)).lease;await ph.waitForTimeout(40000);const w1=await writes();const s1=await srv(ph);
 ok(w1-w0<=8,'D idle 40 s: '+(w1-w0)+' save writes (owner heartbeat/batched ticks only)');ok(s1.lease===l0,'D idle: lease did not flip ('+l0+' -> '+s1.lease+')');
 p=await H.st(ph);c=await H.st(pc);ok(p.scrap===c.scrap&&p.tiles===c.tiles,'D both devices still identical');
 // E offline conflict
 await act(ph,()=>{P.res.scrap+=1;});await ph.waitForTimeout(3000); // phone takes over
 await ph.evaluate(()=>__fakeNet.offline(true));
 await act(ph,()=>{P.tiles['7_7']={t:Date.now()};P.tiles['8_8']={t:Date.now()};P.stats.meters=(P.stats.meters||0)+5000;});await ph.waitForTimeout(3000);
 p=await H.st(ph);var phTiles=p.tiles;ok(/Offline/i.test(p.cs),'E phone says Offline, not safe to switch: '+p.cs.slice(0,60));
 await pc.waitForTimeout(1000);await act(pc,()=>{P.res.scrap+=1000;});await pc.waitForTimeout(3500);
 console.log('server after computer play',JSON.stringify(await srv(pc)));
 await ph.evaluate(()=>__fakeNet.offline(false));await ph.evaluate(()=>window.dispatchEvent(new Event('online')));await ph.waitForTimeout(5000);
 const modal=await ph.evaluate(()=>!!document.getElementById('s13mine'));ok(modal,'E phone back online: asks which copy to keep');
 if(modal){await ph.click('#s13mine');await ph.waitForTimeout(5000);}
 const s2=await srv(ph);c=await H.st(pc);ok(s2.tiles===phTiles&&c.tiles===phTiles&&s2.lease==='phone','E kept the phone copy: server + computer have the drive tiles '+JSON.stringify(s2));
 // F reload
 await pc.reload();await H.onboard(pc,'Pope');await H.ready(pc);await pc.waitForTimeout(3000);c=await H.st(pc);ok(c.tiles===phTiles&&c.pipes===1,'F computer reload keeps everything '+short(c));
 console.log('total save writes',await writes(),'phone log',JSON.stringify((ph.log13||[]).slice(-8)));
 console.log('errs',ph.errs.slice(0,4),pc.errs.slice(0,4));console.log(fails?fails+' FAILED':'ALL PASS');await b.close();})();
