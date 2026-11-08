require('./h.js')(process.argv[2],async(p)=>{
 const ok=(c,m,x)=>console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));const ev=f=>p.evaluate(f);
 await ev(()=>{G.playLocked=false;const id=hexAt(47.7796,-116.8923).id;claimTile(id);W().sh={hex:id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;
   const ho=hexAt(47.80,-116.80).id;claimTile(ho);W().outposts[ho]={state:'up',kind:'home',start:1,endsAt:1,hpPct:1};TP().home=1000;addPool15(ho,300);save();});
 const r=await ev(async()=>{const ho=homeOp15();setOp15(ho);const [q,rr]=idQR(ho);const to=hexRing(q,rr,2).find(x=>hexDist(x.id,ho)===2&&!P.tiles[x.id]).id;G.troopSend=120;await sendMarch(to);
   const id=Object.keys(TP().away)[0];const m=G.marches[id]||Object.values(NET.marches||{})[0];return{id,away:TP().away[id],pool:poolOf15(ho),sh:TP().home,has:!!m};});
 ok(r.away===120&&r.pool===180&&r.sh===1000,'sent 120 from Home Outpost',r);
 // fast-forward the march: arrive and come home through the game's own march tick
 for(let i=0;i<8;i++){await ev(()=>{for(const m of Object.values(G.marches||{})){m.startT-=10*60e3;}try{marchTick();}catch(e){}});await p.waitForTimeout(1200);}
 const e=await ev(()=>({pool:poolOf15(homeOp15()),sh:TP().home,away:Object.keys(TP().away).length,ret:TP().returning.length,st:Object.values(G.marches||{}).map(m=>m.state)}));
 ok(e.pool+e.sh>=1000+180&&e.sh===1000&&e.away===0,'march came home to the Home Outpost, Stronghold unchanged',e);
});
