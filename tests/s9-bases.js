// 12i single-device: 50 km fix, HQ + move Stronghold, Home Outpost, operating base, portal, base troops, supply, miles, ranks + bank.
require('./h.js')(process.argv[2],async(p)=>{
 const ok=(c,m,x)=>console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));
 const ev=f=>p.evaluate(f);
 await p.waitForTimeout(1500);
 await ev(()=>{G.pos=G.pos||[47.7796,-116.8923];const id=hexAt(47.7796,-116.8923).id;claimTile(id);W().sh={hex:id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;save();});await p.waitForTimeout(2000);
 const s0=await ev(()=>({sh:shHex15(),op:curBase15(),bar:!!document.getElementById('op15')}));ok(!!s0.sh,'start: Stronghold exists',s0);ok(s0.bar,'operating bar shows');
 // 1) 50 km fix: a GPS fix 60 km away keeps GPS mode and claims on
 const f1=await ev(()=>{G.jump=true;setPos(48.276,-116.553);return{far:!!P.far25,op:curBase15(),pos:G.pos.map(x=>+x.toFixed(3)),claimOn:claimPath.toString().length>0};});
 ok(!f1.far&&f1.op==='gps'&&Math.abs(f1.pos[0]-48.276)<0.01,'60 km drive stays on GPS (no remote switch)',f1);
 await ev(()=>{G.jump=true;setPos(47.7796,-116.8923);});
 // 2) ranks: claim leadership, place HQ at a hex near Rathdrum
 await ev(async()=>{await claimLeader15();});await p.waitForTimeout(300);
 const r1=await ev(()=>({rank:myRank15(),on:ranksOn15(),leader:leaderUid15()===P.uid}));ok(r1.rank==='leader'&&r1.on&&r1.leader,'claim leadership',r1);
 const hq=await ev(async()=>{const id=hexAt(47.8135,-116.8968).id;await setHq15(id,'Rathdrum <b>HQ</b>');return{hex:hqHex15(),id,name:G.hq15.hq.name,lat:'lat' in G.hq15.hq};});
 ok(hq.hex===hq.id&&hq.name==='Rathdrum bHQ/b'&&!hq.lat,'HQ placed, name cleaned, no coordinates stored',hq);
 // 3) a player in Kansas: Stronghold auto-made there, then moved to HQ -> old spot becomes Home Outpost
 const k=await ev(()=>{const w=W();const kh=hexAt(37.6872,-97.3301).id;w.sh.hex=kh;P.tiles[kh]={t:Date.now()};G.jump=true;setPos(37.6872,-97.3301);
   const pick=(()=>{const [q,r]=idQR(hqHex15());for(let ring=3;ring<12;ring++)for(const x of hexRing(q,r,ring))if(hexDist(x.id,hqHex15())===ring&&!factionAt(x.id))return x.id;})();
   moveSh15(pick);return{kh,pick,sh:shHex15(),home:homeOp15(),op:curBase15(),pos:hexAt(...G.pos).id};});
 ok(k.sh===k.pick&&k.home===k.kh&&k.op==='sh'&&k.pos===k.pick,'move Stronghold to HQ: Kansas spot is Home Outpost, operating from Stronghold',k);
 const mv2=await ev(()=>{const before=shHex15();moveSh15(hexRing(...idQR(before),1)[1].id);return shHex15()===before;});ok(mv2,'second move blocked by 7-day cooldown');
 // 4) operating from Stronghold: GPS walking claims are off, map sits on the base
 const op=await ev(()=>{const n0=Object.keys(P.tiles).length;const a=hexAt(37.70,-97.33).id,b=hexAt(37.71,-97.33).id;const r=claimPath(a,b);return{r,n:Object.keys(P.tiles).length-n0,from:marchFrom()===shHex15()};});
 ok(op.r===0&&op.n===0&&op.from,'from a base: no walk claims, marches leave from the Stronghold',op);
 // 5) portal Stronghold -> Home Outpost (Idaho -> Kansas caps at 3 h), then arrival
 const pt=await ev(()=>{TP().home=1000;const ms=portalMs15(shHex15(),homeOp15());portal15('sh',homeOp15(),400);const L=TP().portal15;return{ms,home:TP().home,inPortal:L.length&&L[0].n,away:troopsAway()};});
 ok(pt.ms===3*3600e3&&pt.home===600&&pt.inPortal===400,'portal: 400 troops leave, 3 h cap for Idaho→Kansas',pt);
 const near=await ev(()=>{const a=shHex15(),[q,r]=idQR(a);const b=hexRing(q,r,4).find(x=>hexDist(x.id,a)===4).id;return Math.round(portalMs15(a,b)/60e3);});ok(near>=20&&near<=21,'portal between nearby bases: about 20 min',near);
 await ev(()=>{TP().portal15[0].at=Date.now()-1000;});await p.waitForTimeout(5500);
 const arr=await ev(()=>({at:poolOf15(homeOp15()),portal:TP().portal15.length,home:TP().home}));ok(arr.at===400&&arr.portal===0&&arr.home===600,'portal arrival: 400 troops at the Home Outpost',arr);
 // 6) operate from the Home Outpost: march uses the outpost's troops only, and they come back there
 const om=await ev(async()=>{setOp15(homeOp15());const from=marchFrom();const [q,r]=idQR(from);const to=hexRing(q,r,2).find(x=>hexDist(x.id,from)===2&&!P.tiles[x.id]).id;
   G.playLocked=false;window._why15=canMarch(to);window._toasts=[];const _t=toast;toast=function(m){window._toasts.push(m);return _t.apply(this,arguments);};G.troopSend=150;await sendMarch(to);toast=_t;const t=TP();const id=Object.keys(t.away).find(i=>t.awayBase15&&t.awayBase15[i]===from);return{why:window._why15,toasts:window._toasts,from:from===homeOp15(),pos:hexAt(...G.pos).id===from,sent:id?t.away[id]:0,left:poolOf15(from),sh:t.home,id};});
 ok(om.from&&om.pos&&om.sent===150&&om.left===250&&om.sh===600,'march from Home Outpost uses its troops (Stronghold untouched)',om);
 const back=await ev(()=>{const t=TP();const id=Object.keys(t.awayBase15||{})[0];const n=t.away[id]||150;t.returning.push({n,at:Date.now()-1,from:'x',b15:homeOp15()});delete t.away[id];troopTick();return{at:poolOf15(homeOp15()),sh:t.home};});
 ok(back.at===400&&back.sh===600,'returning troops land back at the outpost',back);
 // 7) driving forces GPS
 const dr=await ev(async()=>{await toggleDrive();const r=curBase15();await toggleDrive();return r;});ok(dr==='gps','Drive mode switches to GPS',dr);
 // 8) Home Outpost limit + Forward Outpost rules
 const lim=await ev(()=>{const before=Object.keys(W().outposts).length;placeSpecial15(hexAt(37.70,-97.30).id,'home');return Object.keys(W().outposts).length===before;});ok(lim,'only one Home Outpost');
 const fw=await ev(()=>{const id=hexAt(40.0,-105.0).id;return{why:(window.teammateLandNear15(id,9.7)?'near':'none')};});ok(fw.why==='none','Forward Outpost refused with no teammate land nearby',fw);
 // 9) supply: a hex 30 mi from every base pays nothing
 const sp=await ev(()=>{const far=hexAt(38.10,-97.33).id,nr=hexRing(...idQR(homeOp15()),1)[2].id;P.tiles[far]={t:1};P.tiles[nr]={t:1};return{far:inSupply15(far),near:inSupply15(nr)};});ok(!sp.far&&sp.near,'tiles pay only within 10 mi of a base',sp);
 // 10) miles
 const ml=await ev(async()=>{toast('Pin 5.0 km NE, 250 m away, every km pays');await new Promise(r=>setTimeout(r,300));const t=[...document.querySelectorAll('#toast,.toast,[class*=toast]')].map(e=>e.textContent).join('|');return t;});
 ok(/3\.1 mi/.test(ml)&&/820 ft/.test(ml)&&!/km/.test(ml),'distances show in miles and feet',ml.slice(0,120));
 // 11) bank: member must request, officer approves, member collects
 const bk=await ev(async()=>{await NET.bankTx(P.uid,P.name,'scrap',500);G.al=G.al||{};G.al.bank={scrap:500};
   G.hq15.roles[P.uid]='member';G.bankMode='withdraw';const s0=P.res.scrap||0;await bankTx('scrap',40);const req=Object.values(G.bankReq15).find(r=>r.status==='pending');
   const paidEarly=(P.res.scrap||0)-s0;G.hq15.roles[P.uid]='leader';await decideReq15(req.id,true);await new Promise(r=>setTimeout(r,800));
   const st=(G.bankReq15[req.id]||{}).status;return{req:!!req,paidEarly,got:(P.res.scrap||0)-s0,st};});
 ok(bk.req&&bk.paidEarly===0&&bk.got===40&&bk.st==='paid','bank: member request → approve → collected once',bk);
 // 12) HQ tab renders
 const tab=await ev(()=>{UI.open('alliance');UI.sub.alliance='hq';UI.render();const b=document.getElementById('sheetBody');return b?b.textContent.slice(0,2000):'';});
 ok(/Alliance HQ/.test(tab)&&/Ranks/.test(tab)&&/Your bases/.test(tab),'HQ tab renders',tab.slice(0,90));
});
