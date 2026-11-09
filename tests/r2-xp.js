// R2 XP: defending a hex (win and loss), a march that fights a raider holdout, and what a level gives.
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();G.pos=[47.7796,-116.8923];const c=hexAt(47.7796,-116.8923);claimTile(c.id);W().sh={hex:c.id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:2};P.startSh26=1;P.startShMoved26=1;
   const ring=hexRing(...idQR(c.id),1);for(const x of ring)claimTile(x.id);TP().home=3000;P.lvl=1;P.xp=0;P.fr25=[];P.rp1=[];save();G._c=c.id;});
 await p.waitForTimeout(800);
 // 1) a defense we win: XP = (40 + beaten/5) x 1.5 + 20 for the owner
 const d1=await ev(()=>{const xp0=P.xp,l0=P.lvl;const defs=activeDefs(G._c);squadReplay(defs,defPower(defs),40,'Rust Dogs');const row=P.fr25[0],x=row.r26;
   const exp=Math.round((40+x.att.lost*0.02/5)*1.5)+20;return{win:row.win,beaten:x.att.lost,xp1:row.xp1,exp,gained:P.xp-xp0+(P.lvl>l0?99999:0)};});
 ok(d1.win&&d1.xp1===d1.exp,'defense win: (40 + beaten power/5) x 1.5 + 20 owner bonus',d1);
 // 2) a defense we lose: 25%
 const d2=await ev(()=>{TP().home=50;save();const defs=activeDefs(G._c);squadReplay(defs,defPower(defs),3000,'Rust Dogs');const row=P.fr25[0],x=row.r26;
   return{win:row.win,beaten:x.att.lost,xp1:row.xp1,exp:Math.max(1,Math.round((40+x.att.lost*0.02/5)*1.5*.25))};});
 ok(!d2.win&&d2.xp1===d2.exp,'defense loss gives 25%',d2);
 // 3) a march that beats a raider holdout on the way: capture XP, shown on the report
 const m=await ev(async()=>{TP().home=4000;save();const [q,r]=idQR(G._c);const to=hexRing(q,r,3).find(x=>hexDist(x.id,G._c)===3&&!P.tiles[x.id]).id;W().raider=W().raider||{};W().raider[to]=1;
   G._mto=to;G.troopSend=3000;const xp0=P.xp;await sendMarch(to);G._xp0=xp0;return{to,away:Object.values(TP().away)[0]};});
 for(let i=0;i<8;i++){await ev(()=>{for(const mm of Object.values(G.marches||{})){mm.startT-=10*60e3;}try{marchTick();}catch(e){}});await p.waitForTimeout(1200);}
 await ev(()=>{try{if(!$('#modal').classList.contains('hidden'))UI.closeModal();}catch(e){}});
 const mr=await ev(()=>{const row=(P.rp1||[]).find(x=>x.kind==='march');return{gained:P.xp-G._xp0,lvl:P.lvl,row:row?{xp:row.xp,win:row.win,rows2:!!row.rows2,rounds:row.rows2&&row.rows2.rounds.length}:null};});
 ok(mr.row&&mr.row.xp>0&&mr.row.rows2&&mr.row.rounds>=3,'march fight: XP on the report, squads and rounds stored',mr);
 // 4) the report card shows XP and round-by-round details
 await p.mouse.click(5,5);const card=await ev(()=>{const r=P.rp1.find(x=>x.kind==='march');UI.report26('a',r);return $('#modalBody').textContent;});
 ok(/XP earned/.test(card)&&/round by round/i.test(card),'report shows XP earned and a round-by-round Details',card.slice(0,160));
 await ev(()=>UI.closeModal());
 // 5) what a level gives: +3% hero stats and +100 march size per level
 const lv=await ev(()=>{P.lvl=1;const s1=stats(),c1=marchTroopCap();P.lvl=11;const s11=stats(),c11=marchTroopCap();P.lvl=1;return{hp1:s1.hp,hp11:s11.hp,cap1:c1,cap11:c11,base11:100+11*10};});
 ok(lv.cap11-lv.cap1===1000,'march size +100 per level',lv);
 ok(lv.hp11>=Math.round(lv.base11*1.3)-2,'hero HP includes +3% per level',lv);
 console.log(fails?`${fails} FAIL`:'ALL PASS');
});
