require('./h.js')(process.argv[2],async(p)=>{
 const ok=(c,m,x)=>console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));const ev=f=>p.evaluate(f);
 const r=await ev(async()=>{G.playLocked=false;const sh=hexAt(47.7796,-116.8923).id;W().sh={hex:sh,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};
   const [q,rr]=idQR(sh);for(const x of hexRing(q,rr,2))P.tiles[x.id]={t:Date.now()-864e5};P.born26=Date.now()-10*864e5;
   const ko=hexAt(37.6872,-97.3301).id;W().outposts[ko]={state:'up',kind:'home',start:1,endsAt:1,hpPct:1};const [kq,kr]=idQR(ko);for(const x of hexRing(kq,kr,2))P.tiles[x.id]={t:Date.now()-864e5};
   save();factionCatchUp(true);const fx=FX();const F=fx.fronts15||{};
   // second pass: the Kansas front opens on the next catch-up
   factionCatchUp(true);fx.last-=3;factionCatchUp(true);
   const fronts=Object.keys(fx.fronts15||{});const ids=Object.keys(fx.f);
   const dist=(id,a)=>Math.round(distM(...hexCenter(...idQR(id)),...hexCenter(...idQR(a)))/1000);
   const main=ids.filter(i=>!i.includes('~')).map(i=>dist(fx.f[i].home,sh)),far=ids.filter(i=>i.includes('~')).map(i=>dist(fx.f[i].home,ko));
   return{start:!!fx.start,anchor:fx.anchor===sh,fronts,ko,main,far,names:BAL.factions.list.map(d=>d.name),strat:ids.filter(i=>i.includes('~')).map(i=>STRAT_OF[i]||null)};});
 ok(r.start&&r.anchor,'horde started on the main front',r.anchor);
 ok(r.fronts.length===1&&r.fronts[0]===r.ko,'Kansas base opened its own front',r.fronts);
 ok(r.main.length===3&&r.main.every(d=>d<15),'main clans camp near Idaho (km)',r.main);
 ok(r.far.length===3&&r.far.every(d=>d<15),'Kansas clans camp near Kansas (km)',r.far);
 ok(r.strat.every(Boolean)&&r.names.length===6,'front clans have names + strategies',{names:r.names.slice(3),strat:r.strat});
 // run 2 days of horde steps: Kansas squads rest 48 h first, then move; no errors
 const g=await ev(()=>{const fx=FX();const k=Object.keys(fx.f).filter(i=>i.includes('~'));const rest=k.flatMap(i=>(fx.f[i].squads||[]).map(s=>s.restUntil));
   const since=Object.values(fx.fronts15)[0].since;return{allRest:rest.length>0&&rest.every(t=>t>=since+47*3600e3),n:rest.length};});
 ok(g.allRest,'Kansas squads rest 48 h after the front opens',g);
 const s=await ev(()=>{const fx=FX();const K=Object.keys(fx.fronts15)[0];G._front15=K;const a=frontUids15();G._front15=null;const b=frontUids15();return{kansas:a?[...a]:null,main:b?[...b]:null,me:P.uid};});
 ok(s.kansas&&s.kansas.includes(s.me)&&s.main&&s.main.includes(s.me),'scaling counts players per front',s);
 // close: remove the Kansas outpost, age the front 8 days -> front and its clans go away
 const c=await ev(()=>{const fx=FX();const K=Object.keys(fx.fronts15)[0];delete W().outposts[K];fx.fronts15[K].seen=Date.now()-8*864e5;fx.fronts15[K].since=Date.now()-9*864e5;planFronts15();return{fronts:Object.keys(fx.fronts15).length,clans:Object.keys(fx.f).filter(i=>i.includes('~')).length,list:BAL.factions.list.length};});
 ok(c.fronts===0&&c.clans===0&&c.list===3,'empty front closes after 7 days',c);
});
