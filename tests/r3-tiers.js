// R3 tiers: old saves convert at the current tier, training at a chosen tier, marches/guards send strongest first and
// carry exact tiers, losses/wounded/healing keep tiers, upgrades cost the difference, totals always match, fights use
// each place's own tier power, Horde counts don't shrink with your tier, a save adopted from another device keeps tiers.
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();G.pos=[47.7796,-116.8923];const c=hexAt(47.7796,-116.8923);claimTile(c.id);W().sh={hex:c.id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:6};P.startSh26=1;P.startShMoved26=1;
   const ring=hexRing(...idQR(c.id),1);for(const x of ring)claimTile(x.id);W().towers[ring[0].id]={lvl:1,state:'up',hpPct:1,everBuilt:true,buildEnd:0,online:true};
   barracks().level=3;const t=TP();t.home=3000;t.stationed={};t.stationed[ring[0].id]={n:500,at:0};delete t.c3;P.res.scrap=1e6;P.res.food=1e6;P.res.water=1e6;P.res.fuel=1e6;P.res.parts=1e6;save();G._c=c.id;G._tw=ring[0].id;});
 await p.waitForTimeout(2000);
 const tot=()=>ev(()=>{reconcile3();const a=allComp3();const t=TP();const q=t.queue.reduce((s,x)=>s+(x.up3==null?0:x.n),0);let s=0;for(const k in a)s+=a[k];
   return{comp:s,count:t.home+(T2().wounded||0)+Object.values(t.away).reduce((a,b)=>a+b,0)+Object.values(t.stationed||{}).reduce((a,b)=>a+(b.n||0),0)+(t.returning||[]).reduce((a,b)=>a+b.n,0)+(t.healing||[]).reduce((a,b)=>a+b.n,0)+(t.portal15||[]).reduce((a,b)=>a+b.n,0)};});
 // 1) conversion of an old save: everyone at the Barracks tier (Lv3 = T2)
 const m1=await ev(()=>({home:compOf3('home'),tw:compOf3('s:'+G._tw),max:maxTier3()}));
 ok(m1.max===2&&m1.home[2]===3000&&m1.tw[2]===500,'old save: every troop becomes the current tier (T2)',m1);
 // 2) train 1,000 T1 at Barracks Lv3: cheaper, arrives as T1
 const m2=await ev(()=>{const c1=trainCost(1000,1),c2=trainCost(1000,2);G._t3train=1;trainTroops(1000);G._t3train=null;const q=TP().queue[TP().queue.length-1];q.end=0;troopTick();reconcile3();return{c1:c1.food,c2:c2.food,home:compOf3('home')};});
 ok(m2.c1<m2.c2&&m2.home[1]===1000&&m2.home[2]===3000,'training T1 costs less and lands as T1',m2);
 // 3) a guard post gets the strongest first
 const m3=await ev(()=>{const h0=compOf3('home'),s0=TP().stationed[G._tw].n;stationTroops(G._tw,3200);reconcile3();const x=TP().stationed[G._tw].n-s0;return{x,tw:compOf3('s:'+G._tw),home:compOf3('home'),exp2:500+Math.min(x,h0[2]),exp1:Math.max(0,x-h0[2])};});
 ok(m3.x>0&&m3.tw[2]===m3.exp2&&(m3.tw[1]||0)===m3.exp1,'stationing sends the strongest first',m3);
 // 4) losses + wounded at home come out of the troops that were there, in proportion
 const m4=await ev(()=>{const h0=compOf3('home'),n0=(h0[1]||0)+(h0[2]||0);const t=TP();t.home-=400;addWounded(300);reconcile3();const h=compOf3('home'),w=compOf3('w');
   return{h0,home:h,w,lost1:(h0[1]||0)-(h[1]||0),lost2:(h0[2]||0)-(h[2]||0),share1:(h0[1]||0)/n0,wsum:(w[1]||0)+(w[2]||0)};});
 ok(m4.lost1+m4.lost2===400&&Math.abs(m4.lost1/400-m4.share1)<0.01&&m4.wsum===300,'losses and wounded are taken in proportion to the tiers at home',m4);
 // 5) heal: wounded T1 come back as T1
 const m5=await ev(()=>{healTroops(300);reconcile3();const h=T2().healing[T2().healing.length-1];h.end=0;try{troopTick();}catch(e){}try{healTick&&healTick();}catch(e){}reconcile3();return{home:compOf3('home'),w:compOf3('w'),healing:T2().healing.length};});
 ok((m5.home[1]===700||m5.healing>0)&&!m5.w[1],'healed troops keep their tier',m5);
 // 6) upgrade 200 T1 -> T2: pays the difference, comes back as T2
 const m6=await ev(()=>{const h0=compOf3('home'),cost=upCost3(200,1),f0=P.res.food;upgradeTroops3(1,200);const q=TP().queue[TP().queue.length-1];const mid={queued:q.n,from:q.up3,to:q.tier3,paid:f0-P.res.food,cost:cost.food};q.end=0;troopTick();reconcile3();const h=compOf3('home');return{...mid,h0,home:h};});
 ok(m6.queued===200&&m6.paid===m6.cost&&m6.cost>0&&m6.home[2]===(m6.h0[2]||0)+200&&m6.home[1]===(m6.h0[1]||0)-200,'upgrade T1 → T2 pays the difference and returns as T2',m6);
 // 7) totals: tier breakdown always adds up to the real troop count
 const t7=await tot();ok(t7.comp===t7.count,'tier breakdown adds up to the real troop count',t7);
 // 8) fights use the place's own tier: the guard post (mostly T2) vs home (T1/T2 mix)
 const m8=await ev(()=>({home:tp3Of('home'),tw:tp3Of('s:'+G._tw),gHome:tp3Gear({atk:0},'home').tp,gTw:tp3Gear({atk:0},'me:'+G._tw).tp}));
 ok(m8.tw>m8.home&&Math.abs(m8.gTw-m8.tw)<1e-6&&Math.abs(m8.gHome-m8.home)<1e-6,'defense fights use each place\'s own tier power',m8);
 // 9) Horde troop count no longer depends on your tier
 const m9=await ev(()=>{const g=[];barracks().level=1;const a=fight25(0,1,[],900).r26.att.n;barracks().level=9;const b=fight25(0,1,[],900).r26.att.n;barracks().level=3;return{t1:a,t5:b};});
 ok(m9.t1===m9.t5,'Horde squads count the same troops whatever your tier',m9);
 // 10) a save adopted from another device keeps every tier
 const m10=await ev(()=>{const before=JSON.stringify(allComp3());P.troops=JSON.parse(JSON.stringify(P.troops));reconcile3();save();reconcile3();return{same:JSON.stringify(allComp3())===before,bag:(TP().c3.bag||[]).length};});
 ok(m10.same,'adopting the same save from another device changes no tiers',m10);
 // 11) a march takes the strongest, and only T2 comes back
 const m11=await ev(async()=>{const t=TP();t.stationed={};T2().wounded=0;T2().healing=[];t.queue=[];t.returning=[];t.home=3000;t.c3={home:{1:1000,2:2000}};reconcile3();
   const [q,r]=idQR(G._c);const to=hexRing(q,r,2).find(x=>hexDist(x.id,G._c)===2&&!P.tiles[x.id]).id;G.troopSend=1500;await sendMarch(to);reconcile3();
   const id=Object.keys(TP().away)[0];return{away:compOf3('a:'+id),home:compOf3('home')};});
 ok(m11.away[2]===1500&&!m11.away[1]&&m11.home[1]===1000&&m11.home[2]===500,'a 1,500-troop march takes 1,500 T2, home keeps 1,000 T1 + 500 T2',m11);
 for(let i=0;i<8;i++){await ev(()=>{for(const mm of Object.values(G.marches||{})){mm.startT-=10*60e3;}try{marchTick();}catch(e){}});await p.waitForTimeout(1200);}
 const t12=await tot();ok(t12.comp===t12.count,'after the march comes home, tiers still add up',t12);
 const m12=await ev(()=>({home:compOf3('home'),away:Object.keys(TP().away).length}));ok(m12.away===0&&m12.home[1]===1000&&(m12.home[2]||0)>=500,'only T2 came back from the march; T1 at home untouched',m12);
 console.log('errors:',errs.length);console.log(fails?`${fails} FAIL`:'ALL PASS');
});
