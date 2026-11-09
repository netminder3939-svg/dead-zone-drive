// R3 screens: Barracks shows the army by tier, a tier picker, upgrades and the T1–T5 table; Stronghold and towers say
// what the next level unlocks; the march size picker says which tiers go.
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const shot=n=>p.screenshot({path:'/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/'+n+'.png',fullPage:false});
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();G.pos=[47.7796,-116.8923];const c=hexAt(47.7796,-116.8923);claimTile(c.id);W().sh={hex:c.id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:4};P.startSh26=1;P.startShMoved26=1;
   const ring=hexRing(...idQR(c.id),1);for(const x of ring)claimTile(x.id);W().towers[ring[0].id]={level:2,state:'up',hpPct:1,everBuilt:true,buildEnd:0,online:true};G._tw=ring[0].id;
   barracks().level=3;const t=TP();t.home=2000;t.c3={home:{1:1500,2:500}};P.res.scrap=1e6;P.res.food=1e6;P.res.water=1e6;save();});
 await p.waitForTimeout(2500);
 await ev(()=>{UI.open('base');UI.sub.base='barracks';UI.render();});await p.waitForTimeout(500);
 const b=await ev(()=>{const s=$('#sheetBody');return{txt:s.textContent,sel:!!$('#t3sel'),opts:[...document.querySelectorAll('#t3sel option')].map(o=>o.value),up:!!s.querySelector('[onclick^="upgradeTroops3(1"]'),rows:s.querySelectorAll('.t3tbl tbody tr').length,locked:s.querySelectorAll('.t3tbl tr.lock').length};});
 ok(/Your army by tier/.test(b.txt)&&/1,500 T1/.test(b.txt)&&/500 T2/.test(b.txt),'Barracks shows the army by tier',b.txt.slice(0,0));
 ok(b.sel&&b.opts.join()==='2,1','train picker offers T2 and T1 at Barracks Lv3',b.opts);
 ok(b.up,'upgrade T1 → T2 offered');ok(b.rows===5&&b.locked===3,'T1–T5 table, T3–T5 locked',{rows:b.rows,locked:b.locked});
 ok(/Next level unlocks/.test(b.txt)&&/T2|T3/.test(b.txt),'Barracks says what the next level unlocks');
 await p.evaluate(()=>document.querySelector('.t3').scrollIntoView());await shot('r3-barracks');
 // pick T1 and the cost drops
 const c1=await ev(()=>{const before=trainCost(1000).food;G._t3train=1;const after=trainCost(1000).food;G._t3train=null;return{before,after};});ok(c1.after<c1.before,'T1 costs less than T2',c1);
 // Stronghold card
 await ev(()=>{UI.sub.base='fort';UI.render();});await p.waitForTimeout(300);const sh=await ev(()=>($('.t3sh')||{}).textContent||'');
 ok(/troop cap/.test(sh)&&/Barracks can reach Lv6/.test(sh),'Stronghold: next level unlocks a bigger troop cap and Barracks Lv6',sh);
 await p.evaluate(()=>document.querySelector('.t3sh').scrollIntoView());await shot('r3-stronghold');
 // tower card
 await ev(()=>{UI.close&&UI.close();UI.infoTile(G._tw);});await p.waitForTimeout(300);const tw=await ev(()=>($('#modalBody .t3tw')||{}).textContent||'');
 ok(/wall HP/.test(tw)&&/fire/.test(tw),'tower card: next level wall HP and fire',tw);
 await ev(()=>UI.closeModal());
 console.log('errors:',errs.length,errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');
});
