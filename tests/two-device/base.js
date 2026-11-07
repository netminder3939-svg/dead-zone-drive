const {chromium}=require('playwright');const H=require('./two.js');
(async()=>{await fetch(H.FB+'/reset',{method:'POST'});const b=await chromium.launch();const G='http://localhost:'+(process.argv[2]||8765)+'/';
 const ph=await H.device(b,'phone',G);await H.onboard(ph,'Pope');await H.signIn(ph,'pope@test.com','secret123','up');await H.choose(ph,'fresh');await H.ready(ph);
 await ph.evaluate(()=>{P.res.scrap=500;P.pipes=[{id:'pp1',name:'Phone line',route:[],st:'on'}];save();});await ph.waitForTimeout(4000);
 console.log('phone after setup',JSON.stringify(await H.st(ph)));
 const pc=await H.device(b,'pc',G);await H.onboard(pc,'Pope');await H.signIn(pc,'pope@test.com','secret123','in');await H.ready(pc);
 console.log('computer after sign-in',JSON.stringify(await H.st(pc)));
 // both open: phone earns scrap, then computer claims a tile a few seconds later
 await ph.evaluate(()=>{P.res.scrap+=100;save();});await ph.waitForTimeout(3000);
 await pc.evaluate(()=>{P.tiles['1_1']={t:Date.now()};save();});
 await pc.waitForTimeout(30000);
 console.log('phone 30s later  ',JSON.stringify(await H.st(ph)));console.log('computer 30s later',JSON.stringify(await H.st(pc)));
 const s=await (await fetch(H.FB+'/get?p='+encodeURIComponent('teams/testcrew/saves/'+await ph.evaluate(()=>NET.uid)))).json();const o=JSON.parse(s.data.data);
 console.log('SERVER save: rev',s.data.rev,'scrap',o.res.scrap,'tiles',Object.keys(o.tiles).length,'pipes',(o.pipes||[]).length);
 console.log('stats',JSON.stringify(await (await fetch(H.FB+'/stats')).json()).slice(0,300));
 console.log('errs phone',ph.errs.slice(0,5),'pc',pc.errs.slice(0,5));await b.close();})();
