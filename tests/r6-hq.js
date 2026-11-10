// R6 HQ building + Alliance Vault + 2 officers: build from the Vault, spacing, upgrade over time, protection rings and the
// HQ in fights, portal time cut, Vault capacity (deposit refused, auto-share overflow stays with the player), the Horde
// taking the HQ hex (lock 24 h, 10% taken once, withdrawals wait), repair, the HQ can't move once built, 3rd officer refused.
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const shot=n=>p.screenshot({path:'/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/'+n+'.png'});
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();const sh=hexAt(47.7796,-116.8923).id;W().sh={hex:sh,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;
   const [q,rr]=idQR(sh);for(const x of hexRing(q,rr,2))P.tiles[x.id]={t:Date.now()-864e5};P.born26=Date.now()-10*864e5;save();factionCatchUp(true);factionCatchUp(true);G._sh=sh;
   // the HQ spot 8 rings away (clear of my Stronghold area)
   const hx=hexRing(q,rr,8).find(x=>hexDist(x.id,sh)===8).id;G._hq=hx;});
 await ev(async()=>{await claimLeader15();await hqTx15(cur=>({...cur,hq:{hex:G._hq,name:'Base',by:P.uid,byName:P.name,t:Date.now()}}));});
 await p.waitForTimeout(500);
 // 0) names: Vault tab
 const nm=await ev(()=>{UI.open('alliance');const s=UI.SUBS.alliance.find(x=>x[0]==='hoard');UI.sub.alliance='hoard';UI.render();return{tab:s&&s[1],h2:[...$('#sheetBody').querySelectorAll('h2')].map(h=>h.textContent).join('|'),cap:($('.vcap6')||{}).textContent};});
 ok(/Vault/.test(nm.tab)&&/Alliance Vault/.test(nm.h2)&&/5,000/.test(nm.cap||''),'the Hoard is now the Alliance Vault, 5,000 per resource before the HQ is built',nm);
 // 1) build: refused when the Vault is short, then paid from the Vault
 const b0=await ev(async()=>{const a=NET._al();a.bank={scrap:100,food:0,water:0,fuel:0,parts:0};NET._alSave();await buildHq6();return{built:!!(G.hq15.bld&&G.hq15.bld.built),bank:{...NET._al().bank}};});
 ok(!b0.built&&b0.bank.scrap===100,'a short Vault cannot build the HQ (nothing spent)',b0);
 const b1=await ev(async()=>{const a=NET._al();a.bank={scrap:5000,food:2000,water:2000,fuel:2000,parts:2000};NET._alSave();await buildHq6();return{bld:G.hq15.bld,bank:{...NET._al().bank},lvl:hqLvl6(),rings:hqRings6(),cap:vaultCap6()};});
 ok(b1.bld&&b1.bld.built&&b1.lvl===1&&b1.bank.scrap===3500&&b1.bank.parts===1850,'the leader builds the HQ from the Vault (1,500 scrap 300 food 300 water 200 fuel 150 parts)',b1);
 ok(b1.rings===2&&b1.cap===8000,'Lv1: 2 rings protected, Vault holds 8,000 of each',{rings:b1.rings,cap:b1.cap});
 // 2) spacing: no tower inside the HQ area (others4 lists it), and the HQ can't be moved once built
 const sp=await ev(()=>{const [q,r]=idQR(G._hq);const near=hexRing(q,r,2).find(x=>hexDist(x.id,G._hq)===2).id;const far=hexRing(q,r,6).find(x=>hexDist(x.id,G._hq)===6).id;
   return{near:spaceWhy4(near,'tower',1),far:spaceWhy4(far,'tower',1),listed:others4().some(o=>o.k==='ahq'&&o.hex===G._hq)};});
 ok(sp.listed&&/HQ/.test(sp.near||'')&&!sp.far,'member buildings keep out of the HQ area',sp);
 const mv=await ev(async()=>{await setHq15(G._sh,'Elsewhere');return G.hq15.hq.hex===G._hq;});
 ok(mv,'a built HQ cannot be moved');
 // 3) protection: my tile inside the rings gets the HQ as a defender, and the fight uses the HQ's wall and fire
 const pr=await ev(()=>{const [q,r]=idQR(G._hq);const t=hexRing(q,r,1)[0].id;P.tiles[t]={t:Date.now()};const out=hexRing(q,r,5).find(x=>hexDist(x.id,G._hq)===5).id;P.tiles[out]={t:Date.now()};
   const d=defendersFor(t),d2=defendersFor(out);const b=bld26(d);const r26=fight26({bld:b,players:[]},{n:200,type:'raider'});
   return{has:d.some(x=>x.kind==='hq'),outside:d2.some(x=>x.kind==='hq'),bld:b,win:r26.win,H:r26.H,fire:r26.fire};});
 ok(pr.has&&!pr.outside&&pr.bld.kind==='hq','tiles within 2 rings are protected by the HQ, tiles further out are not',pr);
 ok(pr.H===3500&&pr.fire===450&&pr.win,'the HQ fights with its own 3,500 HP and 450 fire (Lv1), even with no troops',pr);
 // 4) troops stationed on the HQ hex fight with it
 const gar=await ev(()=>{stationed()[G._hq]={n:300,at:0};const s=defSides25(defendersFor(G._hq));delete stationed()[G._hq];return{guards:s.guards.map(g=>g.n),bld:s.bld&&s.bld.kind};});
 ok(gar.guards.includes(300)&&gar.bld==='hq','troops stationed on the HQ hex join its fight',gar);
 // 5) upgrade: paid now, level rises when the time is up; portal time and Vault grow
 const up=await ev(async()=>{const pm0=portalMs15(G._sh,G._hq);const before={...NET._al().bank};await upgradeHq6();const b=G.hq15.bld,mid=hqLvl6();
   await hqTx15(cur=>({...cur,bld:{...cur.bld,upEnd:Date.now()-1}}));const after=hqLvl6();return{spent:before.scrap-NET._al().bank.scrap,hrs:Math.round((b.upEnd-Date.now())/36e5),mid,after,cut:hqPortalCut6(),pm0,pm1:portalMs15(G._sh,G._hq),cap:vaultCap6()};});
 ok(up.spent===2250&&up.mid===1&&up.after===2,'upgrade Lv1→2 costs 1.5× from the Vault and finishes after its time',up);
 ok(Math.abs(up.cut-.10)<1e-9&&up.pm1<up.pm0&&up.cap===11000,'Lv2: portal time −10%, Vault holds 11,000',up);
 const r5=await ev(async()=>{await hqTx15(cur=>({...cur,bld:{...cur.bld,lvl:5,upEnd:0}}));const a=hqRings6(),c=hqPortalCut6();await hqTx15(cur=>({...cur,bld:{...cur.bld,lvl:10}}));const b=hqRings6(),d=hqPortalCut6();
   await hqTx15(cur=>({...cur,bld:{...cur.bld,lvl:2}}));return{l5:a,c5:c,l10:b,c10:d};});
 ok(r5.l5===3&&r5.l10===4&&Math.abs(r5.c10-.25)<1e-9,'3 rings at Lv5, 4 at Lv10, portal cut stops at 25%',r5);
 // 6) Vault cap: a deposit past the cap is refused, nothing is removed; the auto-share overflow stays with the player
 const cp=await ev(async()=>{const a=NET._al();a.bank.food=10900;NET._alSave();P.res.food=1000;G.bankMode='deposit';await bankTx('food',500);const r1={bank:NET._al().bank.food,mine:P.res.food};
   await bankTx('food',100);const r2={bank:NET._al().bank.food,mine:P.res.food};await NET.bankMulti(P.uid,P.name,{food:50,water:20},'auto-share');return{r1,r2,r3:{bank:NET._al().bank.food,mine:P.res.food,water:NET._al().bank.water}};});
 ok(cp.r1.bank===10900&&cp.r1.mine===1000,'a deposit that would overfill the Vault is refused (nothing moves)',cp.r1);
 ok(cp.r2.bank===11000&&cp.r2.mine===900,'a deposit that fits goes in',cp.r2);
 ok(cp.r3.bank===11000&&cp.r3.mine===950,'auto-share into a full Vault: the extra stays with the player',cp.r3);
 // 7) the Horde takes the HQ hex: falls, Vault locked 24 h, 10% taken once
 const fl=await ev(async()=>{const fx=FX();const fid=Object.keys(fx.f).find(i=>!fx.f[i].routedUntil);const f=fx.f[fid];const b0={...NET._al().bank};const res0=bankOf(f).res;
   const k=Math.floor(Date.now()/(HB().stepMin*60e3));f.tiles[G._hq]=Date.now();const e={grew:{},took:[],held:[],fights:[],outposts:[],back:[],destroyed:[]};hordeStep(k,e);
   const fall=hqFall6();await applyFall6();const b1={...NET._al().bank};await applyFall6();const b2={...NET._al().bank};
   return{fall:!!fall,up:hqUp6(),locked:vaultLocked6(),h:Math.round((vaultLockUntil6()-Date.now())/36e5),b0,b1,b2,res:Math.round(bankOf(f).res-res0),def:defendersFor(hexRing(...idQR(G._hq),1)[0].id).some(x=>x.kind==='hq'),fid};});
 ok(fl.fall&&!fl.up&&fl.locked&&fl.h>=23&&fl.h<=24,'Horde takes the HQ hex: the HQ is down and the Vault locks for 24 h',fl);
 ok(fl.b1.scrap===Math.ceil(fl.b0.scrap*.9)&&fl.b1.food===fl.b0.food-Math.floor(fl.b0.food*.1)&&JSON.stringify(fl.b1)===JSON.stringify(fl.b2),'10% of each resource is taken, once',{b0:fl.b0,b1:fl.b1,b2:fl.b2});
 ok(fl.res>0&&!fl.def,'the clan banks what it took; the fallen HQ stops defending',{res:fl.res,def:fl.def});
 // 8) locked: deposits still work, withdrawals and approvals wait
 const lk=await ev(async()=>{G.bankMode='withdraw';const s0=NET._al().bank.scrap;await bankTx('scrap',10);const s1=NET._al().bank.scrap;G.bankMode='deposit';P.res.parts=50;await bankTx('parts',5);
   const o=JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>/req/i.test(k)&&/15/.test(k))||'null')||'null');
   return{withdrew:s0!==s1,dep:NET._al().bank.parts};});
 ok(!lk.withdrew,'a locked Vault refuses withdrawals',lk);
 // 9) repair: refused while the Horde holds the hex, then works and the HQ defends again
 const rp=await ev(async()=>{const fx=FX();const f=fx.f[Object.keys(fx.f).find(i=>fx.f[i].tiles&&fx.f[i].tiles[G._hq])];await repairHq6();const still=!!hqFall6();delete f.tiles[G._hq];fxDirty();
   G.layers&&0;const s00=NET._al().bank.scrap;await repairHq6();const lockedTry=s00-NET._al().bank.scrap;FX().hqFall5.t-=25*3600e3;await hqTx15(cur=>({...cur,bld:{...cur.bld,lockUntil:Date.now()-1}}));const s0=NET._al().bank.scrap;await repairHq6();return{still,lockedTry,after:!!hqFall6(),up:hqUp6(),spent:s0-NET._al().bank.scrap,locked:vaultLocked6()};});
 ok(rp.still&&rp.lockedTry===0&&!rp.after&&rp.up&&rp.spent===Math.round(1500*.4*1.5),'repair needs the hex back and the lock over, costs 40% of the build cost (at Lv2) and puts the HQ back up',rp);
 // 10) the HQ tab shows the building, the Vault and the crew
 const tab=await ev(()=>{UI.open('alliance');UI.sub.alliance='hq';UI.render();const c=$('.hq6');return c?c.textContent.replace(/\s+/g,' ').slice(0,600):null;});
 ok(tab&&/HQ building/.test(tab)&&/Lv2/.test(tab)&&/wall HP/.test(tab)&&/Alliance Vault/.test(tab)&&/Crew/.test(tab),'the HQ tab shows the building, the Vault and the crew',tab&&tab.slice(0,200));
 await shot('r6-hq');
 // 11) officers: at most 2
 const of=await ev(async()=>{await hqTx15(cur=>({...cur,roles:{...cur.roles,u1:'officer',u2:'officer'}}));await setRank15('u3','officer');const r=G.hq15.roles;return{u3:r.u3||null,n:Object.values(r).filter(x=>x==='officer').length};});
 ok(!of.u3&&of.n===2,'a 3rd officer is refused',of);
 console.log('errors:',errs.length,errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');
});
