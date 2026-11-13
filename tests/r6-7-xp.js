// R6.7 XP-SPEC: one payout for Horde / raider fights (attack and defense), shown on every fight report.
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,400):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);
 const close=()=>ev(()=>{try{if(!$('#modal').classList.contains('hidden'))UI.closeModal();}catch(e){}});
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();G.pos=[47.7796,-116.8923];const c=hexAt(47.7796,-116.8923);claimTile(c.id);W().sh={hex:c.id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:2};
   const ring=hexRing(...idQR(c.id),1);for(const x of ring)claimTile(x.id);TP().home=3000;P.lvl=10;P.xp=0;P.fr25=[];P.rp1=[];save();G._c=c.id;
   G._L10=()=>{P.lvl=10;P.xp=0;};});
 await p.waitForTimeout(800);
 // 0) the locked table and the size factor
 const t=await ev(()=>{const at=L=>{P.lvl=L;return[xpOf2(100,100,true),xpOf2(100,100,false)];};const r={L1:at(1),L5:at(5),L10:at(10),L15:at(15),L20:at(20)};P.lvl=10;
   r.x2=xpOf2(2000,1000,true);r.half=xpOf2(500,1000,true);r.x5=xpOf2(5000,1000,true);r.tenth=xpOf2(100,1000,true);r.heroOnly=xpOf2(40,0,true);r.noEnemy=xpOf2(0,1000,true);r.loss2=xpOf2(2000,1000,false);
   r.old=['base','mult','perTroops','owner'].filter(k=>k in XP2);return r;});
 ok(''+t.L1==='11,3'&&''+t.L5==='124,31'&&''+t.L10==='351,88'&&''+t.L15==='645,161'&&''+t.L20==='994,249','locked table L1/5/10/15/20 win,loss',t);
 ok(t.x2===703&&t.half===176&&t.x5===703&&t.tenth===176&&t.heroOnly===703&&t.noEnemy===176&&t.loss2===176,'size factor clamps 0.5..2; hero-only counts 1 troop; no enemy = floor; loss = 25% of the sized win',t);
 ok(!t.old.length,'old R2 bases, multipliers, per-troop and owner bonus are gone',t.old);
 // 1) defense win, equal troops, level 10: +351
 const d1=await ev(()=>{G._L10();TP().home=1000;save();const defs=activeDefs(G._c);const sp=1000*TROOP.powerPer;const f=squadReplay(defs,defPower(defs),sp,'Rust Dogs');const row=P.fr25[0],x=row.r26;
   return{win:row.win,att:x.att.n,my:x.players.filter(q=>q.key==='home').reduce((a,q)=>a+q.n,0),xp1:row.xp1,gained:P.xp,fx:f&&f.xp2};});
 ok(d1.win&&d1.att===1000&&d1.my===1000&&d1.xp1===351&&d1.gained===351&&d1.fx===351,'defense win, equal troops, L10: +351 granted, on the row and on the replay',d1);
 const l1=await ev(()=>{const L=reportItems26().find(x=>x.k==='f'&&x.r===P.fr25[0]);UI.report26('f',P.fr25[0]);return{sub:L&&L.sub,card:$('#modalBody').textContent};});
 ok(/\+351 XP/.test(l1.sub)&&/XP earned\s*\+351/.test(l1.card),'report list "+351 XP" and card "XP earned +351"',{sub:l1.sub,card:l1.card.slice(0,120)});
 await close();
 // 2) defense loss: 25% of the sized win, shown
 const d2=await ev(()=>{G._L10();TP().home=1000;save();const defs=activeDefs(G._c);const sp=30000*TROOP.powerPer;squadReplay(defs,defPower(defs),sp,'Rust Dogs');const row=P.fr25[0],x=row.r26;
   const my=x.players.filter(q=>q.key==='home').reduce((a,q)=>a+q.n,0);P.lvl=10;return{win:row.win,att:x.att.n,my,xp1:row.xp1,gained:P.xp,exp:xpOf2(x.att.n,my,false),sub:(reportItems26().find(y=>y.r===row)||{}).sub};});
 ok(!d2.win&&d2.xp1===d2.exp&&d2.xp1===176&&d2.gained===176&&/\+176 XP/.test(d2.sub),'defense loss vs 30x: 703 sized win x 25% = +176, shown',d2);
 const d2b=await ev(()=>{G._L10();const f={win:false,army2:{us:'def',r:{att:{rows:[{n:1000}]},def:{rows:[{n:1000}]}}}};return xpOf2(1000,1000,false);});
 ok(d2b===88,'defense loss at equal troops is +88',d2b);
 // 7) ally helper: own payout from own troops; owner with 0 troops gets 0
 const al=await ev(()=>{G._L10();const hx=hexRing(...idQR(G._c),1)[0].id;const st=stationed();st[hx]={n:400};save();
   FX().gl25=[...(FX().gl25||[]),{uid:P.uid,hex:hx,gang:'Rust Dogs',sp:800*TROOP.powerPer,won:true,frac:.9,share:.1,t:Date.now()}];applyGl25();const row=P.fr25[0];return{ally:row.ally,xp1:row.xp1,gained:P.xp,sub:(reportItems26().find(y=>y.r===row)||{}).sub};});
 ok(al.ally&&al.xp1===703&&al.gained===703&&/\+703 XP/.test(al.sub),'ally helper with 400 troops vs 800: own full payout +703 (not a share)',al);
 const own0=await ev(()=>{G._L10();TP().home=0;for(const k of Object.keys(stationed()))delete stationed()[k];save();const defs=activeDefs(G._c);if(!defs.length)return{skip:true};const sp=500*TROOP.powerPer;squadReplay(defs,defPower(defs),sp,'Rust Dogs');const row=P.fr25[0];
   return{none:!!row.none,xp1:row.xp1,gained:P.xp};});
 ok(own0.skip||(own0.gained===0&&(own0.xp1===0||own0.xp1===undefined)),'land owner with 0 troops in the fight gets 0',own0);
 // 8) unguarded walk-in: no XP, no line
 const w=await ev(()=>{G._L10();const h=hexRing(...idQR(G._c),2)[0].id;claimTile(h);const fid=Object.keys(BAL.factions.list?{}:{})[0];try{capReport26(h,(BAL.factions.list[0]||{}).id,Date.now());}catch(e){return{err:e.message};}
   const row=P.fr25.find(x=>x.none);const it=reportItems26().find(y=>y.r===row);return{none:!!row,xp1:row&&row.xp1,gained:P.xp,sub:it&&it.sub};});
 ok(w.none&&w.xp1===undefined&&w.gained===0&&!/XP/.test(w.sub||''),'unguarded walk-in: no XP, no XP line',w);
 // 3/4) Horde march fight: the payout uses the enemy army-row total and my own troop rows
 for(const mult of [4,.3]){
  const m=await ev(async([mult])=>{G._L10();TP().home=4000;save();const units=marchUnits({unit:frozenMe(),escorts:{},troops:1000,n:1000});const mineN=units.filter(u=>u.troop>0).reduce((a,u)=>a+u.troop,0);
    const sp=Math.round(mineN*mult*TROOP.powerPer);G._xp2=[];const f=runFight(units,[bandUnit('Rust Dogs squad',sp)]);G._xp2=null;
    const rows=f.army2.r.def.rows.reduce((a,o)=>a+o.n,0);P.lvl=10;return{mine:mineN,rows,win:f.win,c:f.xp2c,one:f.xp2one,exp:xpOf2(rows,mineN,f.win),fac:rows/mineN};},[mult]);
  ok(m.c&&m.c.mine===m.mine&&m.c.enemy===m.rows&&m.one===m.exp&&(mult>1?m.fac>=2&&m.exp===(m.win?703:176):m.fac<=.5&&m.exp===(m.win?176:44)),`march fight vs a ${mult}x squad (L10): enemy rows / my troops, ${mult>1?'703 (2x cap)':'176 (half floor)'} on a win`,m);}
 await ev(()=>{G._rfx=[];const r0=UI.replay;UI.replay=function(o){try{if(o&&o.f)G._rfx.push({xp2:o.f.xp2,army:!!(o.f.army2&&o.f.army2.r)});}catch(e){}return r0.apply(this,arguments);};G._adds=[];const a0=addXP;addXP=function(n){G._adds.push(n);return a0.apply(this,arguments);};window.addXP=addXP;});
 // 3b) a full march through resolveMarch: granted once, on the march report and the replay summary
 const mm=await ev(async()=>{G._L10();P.rp1=[];TP().home=4000;save();const [q,r]=idQR(G._c);const to=hexRing(q,r,3).find(x=>hexDist(x.id,G._c)===3&&!P.tiles[x.id]).id;W().raider=W().raider||{};W().raider[to]=1;
   G.troopSend=1000;await sendMarch(to);return{to};});
 for(let i=0;i<8;i++){await ev(()=>{for(const m of Object.values(G.marches||{})){m.startT-=10*60e3;}try{marchTick();}catch(e){}});await p.waitForTimeout(1200);}
 await ev(()=>{try{$('#rskip')&&$('#rskip').click();}catch(e){}});await p.waitForTimeout(600);
 const mr=await ev(()=>{const row=(P.rp1||[]).find(x=>x.kind==='march');const sum=G._rfx.slice();return{adds:G._adds.slice(),gained:P.xp,row:row&&{xp:row.xp,win:row.win},sum:sum.slice(0,200),it:(reportItems26().find(y=>y.r===row)||{}).sub};});
 ok(mr.row&&mr.row.xp>0&&mr.adds.filter(n=>n===mr.row.xp).length===1&&/\+\s*[\d,]+ XP/.test(mr.it||''),'march: XP granted once = the number on the march report',mr);
 ok(mr.row&&mr.sum.length&&mr.sum[mr.sum.length-1].xp2===mr.row.xp,'march: the fight handed to the replay carries the same XP',mr.sum);
 const sm=await ev(async()=>{const units=marchUnits({unit:frozenMe(),escorts:{},troops:1000,n:1000});const f=runFight(units,[bandUnit('Rust Dogs squad',500)]);f.xp2=351;
   UI.replay({title:'t',f,result:'r',good:f.win,buttons:[['Continue',()=>UI.closeModal(),'big']],_rec1:1});await new Promise(r=>setTimeout(r,200));$('#rskip').click();await new Promise(r=>setTimeout(r,300));return $('#rres').textContent;});
 ok(/\+351 XP/.test(sm),'troop fight summary prints "+351 XP"',sm);
 await close();
 await close();
 // 5) fightFaction retake: the new payout once, no +25 on top
 const ff=await ev(()=>{G._L10();P.rp1=[];P.cooldownUntil=0;P.hp=99999;const B=BAL.factions;const keep=[B.retakeXP,B.homeXP];
   // find or plant a horde hex next to us
   let id=null,x=null;for(const h of hexRing(...idQR(G._c),2)){const a=factionAt(h.id);if(a&&!a.home){id=h.id;x=a;break;}}
   if(!id){if(!Object.keys(FX().f||{}).length){FX().anchor=FX().anchor||G._c;FX().f=FX().f||{};spawnFaction(0,0,Date.now());}const fid=Object.keys(P.world.fx.f)[0];if(!fid)return{noFaction:true};let h=null;for(let k=2;k<8&&!h;k++)h=hexRing(...idQR(G._c),k).map(z=>z.id).find(z=>!P.tiles[z]&&!(G.terr||{})[z]&&!enemyAt(z)&&P.world.fx.f[fid].home!==z);P.world.fx.f[fid].tiles[h]=Date.now();fxDirty();id=h;x=factionAt(h);if(!x)return{noFaction:true};}
   const s0=stats;stats=function(){const s=s0.apply(this,arguments);return{...s,hp:s.hp*1e4,atk:s.atk*1e4,def:s.def*1e3};};try{fightFaction(id);}finally{stats=s0;}
   const row=P.rp1[0];const res=$('#rres')?$('#rres').textContent:'';return{id,gained:P.xp,xp:row&&row.xp,win:row&&row.win,keep,res:res.slice(0,240),it:(reportItems26().find(y=>y.r===row)||{}).sub};});
 ok(!ff.noFaction&&(ff.win&&ff.gained===ff.xp&&ff.xp===703&&!/\+25 XP/.test(ff.res)),'fightFaction retake: +703 (hero-only vs garrison caps 2x), nothing flat on top, on the report',ff);
 await close();
 // 6) fightFort win: the new payout on the report (the capture bonus 120+40L is separate and unchanged)
 await ev(()=>{try{UI.closeModal();}catch(e){}});await p.waitForTimeout(400);await ev(()=>{try{UI.closeModal();}catch(e){}});await p.waitForTimeout(400);const fo=await ev(async()=>{G._L10();P.rp1=[];P.cooldownUntil=0;let id=null;for(let k=2;k<12&&!id;k++)id=hexRing(...idQR(G._c),k).map(h=>h.id).find(h=>enemyAt(h)&&!(W().enemyTaken||{})[h]&&!P.tiles[h]);if(!id)return{noFort:1};
   const s=enemyStats(enemyAt(id));const s0=stats;stats=function(){const t=s0.apply(this,arguments);return{...t,hp:t.hp*1e4,atk:t.atk*1e4,def:t.def*1e3};};const xp0=P.xp;let lv0=P.lvl;try{CARD1.lastTap=Date.now();CARD1.lastClose=0;fightFort(id);}finally{stats=s0;}
   try{[...document.querySelectorAll('#modalBody button')].find(b=>/Skip/.test(b.textContent)).click();}catch(e){}await new Promise(r=>setTimeout(r,500));const row=P.rp1[0];return{gained:P.xp+(P.lvl>lv0?9e9:0),cap:120+s.L*40,xp:row&&row.xp,win:row&&row.win,res:$('#modalBody').innerHTML.replace(/<[^>]+>/g,' ').replace(/\s+/g,' '),it:(reportItems26().find(y=>y.r===row)||{}).sub};});
 ok(!fo.noFort&&(fo.win&&fo.xp===703&&fo.gained===703+fo.cap&&/XP earned\s*\+703/.test(fo.res)&&/\+703 XP/.test(fo.it)),'fightFort win: +703 on the report and the summary (capture bonus unchanged on top)',fo);
 await close();
 // 9) a little monster win still 15 + 5 x level, no Horde payout
 const mo=await ev(()=>{G._L10();const mid=Object.keys(MONSTERS)[0];const f=runFight([playerUnit()],mutantUnits(mid,3));const x0=P.xp;const isH=isHordeFight2(mutantUnits(mid,3));const pay=fightXP2(f,[playerUnit()],mutantUnits(mid,3));return{isH,pay,xp2:f.xp2,gained:P.xp-x0};});
 ok(!mo.isH&&mo.pay===0&&mo.xp2===undefined&&mo.gained===0,'little monster fights never take the Horde formula',mo);
 const bw=await ev(()=>{G._L10();const mid=Object.keys(MONSTERS)[0];const x0=P.xp;battleWin(mid,3,'t67:'+Date.now());return P.xp-x0;});
 ok(bw===15+5*3,'monster win is still 15 + 5 x monster level (Lv3 = 30)',bw);
 // 10) predict / a simulated runFight never pays, even during a march resolution
 const pr=await ev(()=>{G._L10();let id=null;for(let k=2;k<12&&!id;k++)id=hexRing(...idQR(G._c),k).map(h=>h.id).find(h=>enemyAt(h));G._xp2=[];const a=predict(()=>[playerUnit()],()=>fortUnits(id));const n=G._xp2.length;G._xp2=null;
   const b=runFight([playerUnit()],fortUnits(id));return{n,gained:P.xp,b:b.xp2};});
 ok(pr.n===0&&pr.gained===0&&pr.b===undefined,'predict and a bare runFight change nothing',pr);
 // 11) level bonuses unchanged
 const lv=await ev(()=>{P.lvl=1;const s1=stats(),c1=marchTroopCap();P.lvl=11;const s11=stats(),c11=marchTroopCap();P.lvl=10;return{cap:c11-c1,r:s11.hp/s1.hp};});
 ok(lv.cap===1000&&lv.r>1.29,'+100 march size and +3% hero stats per level',lv);
 // 12) nine typical wins at level 10 = 3,159, still level 10
 const nine=await ev(()=>{P.lvl=10;P.xp=0;let s=0;for(let i=0;i<9;i++)s+=give2(xpOf2(500,500,true));return{s,lvl:P.lvl,xp:P.xp,need:xpNeed(10)};});
 ok(nine.s===3159&&nine.lvl===10,'nine typical L10 wins = 3,159, one short of the level',nine);
 const ten=await ev(()=>{const before=P.lvl;give2(xpOf2(500,500,true));return{lvl:P.lvl,before};});
 ok(ten.lvl===11,'the tenth win levels up',ten);
 ok(!errs.filter(e=>/PAGEERR/.test(e)).length,'no page errors',errs.filter(e=>/PAGEERR/.test(e)));
 console.log(fails?`${fails} FAIL`:'ALL PASS');
});
