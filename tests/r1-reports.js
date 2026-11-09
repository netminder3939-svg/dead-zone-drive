// R1 reports: every defense fight keeps its full breakdown (also two in a row, as in catch-up), fights you start are
// recorded from the fight, the Reports page has tabs, delete one / select several / clear a tab, and old reports expire.
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);
 const shot=n=>p.screenshot({path:'/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/'+n+'.png'});
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();G.pos=[47.7796,-116.8923];const c=hexAt(47.7796,-116.8923);claimTile(c.id);W().sh={hex:c.id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:2};P.startSh26=1;P.startShMoved26=1;
   const ring=hexRing(...idQR(c.id),1);for(const x of ring)claimTile(x.id);const tw=ring[0].id;W().towers[tw]={lvl:2,state:'up',hpPct:1,everBuilt:true,buildEnd:0,online:true};
   TP().home=3000;stationed()[tw]={n:800,at:Date.now()};P.fr25=[];P.rp1=[];P.mr26=[];P.dr26=[];save();G._tw=tw;});
 await p.waitForTimeout(1200);
 // 1) two defense fights in a row (catch-up style, no waiting between them)
 const d=await ev(()=>{const tw=G._tw,defs=activeDefs(tw);const out=[];for(const sp of [900,4000]){const dp=defPower(defs);squadReplay(defs,dp,sp,'Rust Dogs');}
   return (P.fr25||[]).slice(0,2).map(r=>({win:r.win,hasR26:!!r.r26,att:r.r26&&r.r26.att&&r.r26.att.n,players:r.r26&&r.r26.players.length,bld:r.r26&&r.r26.bld&&r.r26.bld.kind,why:!!(r.r26&&r.r26.why)}));});
 ok(d.length===2&&d.every(x=>x.hasR26&&x.att>0&&x.bld&&x.why),'both back-to-back defense fights keep their full breakdown',d);
 ok(d[0].att!==d[1].att,'each report has its own fight (different attacker counts)',d.map(x=>x.att));
 // the report card shows both sides
 await p.mouse.click(5,5);await ev(()=>UI.report26('f',P.fr25[0]));await p.waitForTimeout(300);
 const fh=await ev(()=>$('#modalBody').textContent);ok(/DEFENDERS/.test(fh)&&/ATTACKERS/.test(fh)&&/LOSSES/.test(fh)&&/WHY/.test(fh),'defense report shows defenders, attackers, losses and why');
 await shot('r1-defense');await ev(()=>UI.closeModal());
 // 2) fights you start: monster + fort + a march fight are recorded from the fight itself
 const m=await ev(()=>{P.hp=99999;fightMutant(Object.keys(MONSTERS)[0],1,'kr1');UI.closeModal();
   // a march fight: hero + 1,500 troops vs a horde squad, through the same card the march code uses
   const id='mtest1';G.marches=G.marches||{};G.marches[id]={to:G._tw,name:P.name};G._marchId=id;
   const f=runFight([...marchUnits({unit:frozenMe(),escorts:{}}),troopUnit(1500)],[bandUnit('Rust Dogs squad',600)]);
   UI.replay({title:'🚩 March to '+hexName(G._tw),sub:'test',f,good:f.win,result:f.win?'Beat the squad':'Lost',buttons:[['Continue',()=>UI.closeModal(),'big']]});delete G._marchId;UI.closeModal();
   return (P.rp1||[]).map(r=>({kind:r.kind,win:r.win,troops:r.us.troops,hero:!!r.us.hero,foes:r.them.units.length,horde:r.horde,hex:r.hex}));});
 ok(m.length===2&&m.some(x=>x.kind==='monster')&&m.some(x=>x.kind==='march'),'monster fight and march fight both recorded',m.map(x=>x.kind));
 const mr=m.find(x=>x.kind==='march')||{};ok(mr.troops&&mr.troops.sent===1500&&mr.troops.lost+mr.troops.left===1500&&mr.horde&&mr.hex,'march report: troops sent/lost/left add up, marked Horde, has a place',mr);
 await p.mouse.click(5,5);await ev(()=>{const r=P.rp1.find(x=>x.kind==='march');UI.report26('a',r);});await p.waitForTimeout(300);
 const mh=await ev(()=>$('#modalBody').textContent);ok(/YOUR SIDE/.test(mh)&&/ENEMY/.test(mh)&&/1,500 T\d troops/.test(mh),'march report shows your side and the enemy',mh.slice(0,140));
 await shot('r1-march');await ev(()=>UI.closeModal());
 // 3) Reports page: tabs and counts
 await p.mouse.click(5,5);await ev(()=>{UI._rf1='all';UI.reports26();});await p.waitForTimeout(300);await shot('r1-list');
 const tabs=await ev(()=>[...document.querySelectorAll('.rpf1 button')].map(b=>b.textContent.trim()));
 ok(/All 4/.test(tabs[0])&&tabs.some(t=>/Attacks 2/.test(t))&&tabs.some(t=>/Defense 2/.test(t))&&tabs.some(t=>/Horde 3/.test(t)),'tabs count All 4 / Attacks 2 / Defense 2 / Horde 3',tabs);
 // delete one with its ✕ (one tap)
 const b1=await p.$('.rp26 .rx1');await b1.click();await p.waitForTimeout(300);
 ok(await ev(()=>reportItems26().length)===3,'✕ deletes one report');
 // select two and delete
 await p.click('button:has-text("Select")');await p.waitForTimeout(200);const rows=await p.$$('.rp26');await rows[0].click();await p.waitForTimeout(150);await (await p.$$('.rp26'))[1].click();await p.waitForTimeout(150);
 await p.click('button:has-text("Delete 2")');await p.waitForTimeout(300);ok(await ev(()=>reportItems26().length)===1,'select two and delete leaves one');
 // clear the tab: first tap asks, second clears
 await p.click('button:has-text("Clear all")');await p.waitForTimeout(200);const still=await ev(()=>reportItems26().length);
 await p.click('button:has-text("Clear all")');await p.waitForTimeout(300);const after=await ev(()=>reportItems26().length);
 ok(still===1&&after===0,'Clear all needs two taps',{afterFirst:still,afterSecond:after});
 // 4) 14 days, newest 60
 const pr=await ev(()=>{const now=Date.now();P.fr25=[];for(let i=0;i<70;i++)P.fr25.push({t:now-i*60e3,hex:'1_1',gang:'x',win:true,me:[]});P.fr25.push({t:now-15*864e5,hex:'1_1',gang:'old',win:true,me:[]});
   P.rp1=[{t:now-20*864e5,kind:'monster',us:{},them:{}}];prune1();return{fr:P.fr25.length,old:P.fr25.some(r=>r.gang==='old'),rp:P.rp1.length};});
 ok(pr.fr===60&&!pr.old&&pr.rp===0,'keeps the newest 60 and drops reports older than 14 days',pr);
 // 5) the old 15-second timer is gone: a fight on record without breakdown stays without one
 console.log(fails?`${fails} FAIL`:'ALL PASS');
});
