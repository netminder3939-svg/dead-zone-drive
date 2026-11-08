// 12i two players: Pope (Idaho, leader) and Kay (Kansas, member). Ranks, HQ, bank approval, region loading, forward outpost + portal.
const {chromium}=require('playwright');const H=require('./two.js');
let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
const ev=(p,f,a)=>p.evaluate(f,a);
const mkSh=(p,lat,lng)=>ev(p,([lat,lng])=>{G.playLocked=false;G.dev=G.dev||{};G.dev.hold=true;G.jump=true;setPos(lat,lng);const id=hexAt(lat,lng).id;claimTile(id);
  W().sh={hex:id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;const [q,r]=idQR(id);for(const x of hexRing(q,r,1))claimTile(x.id);save();pushMember();return id;},[lat,lng]);
(async()=>{await fetch(H.FB+'/reset',{method:'POST'});const b=await chromium.launch();const GAME='http://localhost:8765/';
 const A=await H.device(b,'phone',GAME);await H.onboard(A,'Pope');await H.signIn(A,'pope@test.com','secret123','up');await H.choose(A,'fresh');await H.ready(A);
 const shA=await mkSh(A,47.7796,-116.8923);
 const K=await H.device(b,'pc',GAME);await K.context().setGeolocation({latitude:37.6872,longitude:-97.3301});await H.onboard(K,'Kay');await H.signIn(K,'kay@test.com','secret123','up');await H.choose(K,'fresh');await H.ready(K);
 const shK=await mkSh(K,37.6872,-97.3301);
 await A.waitForTimeout(4000);
 // ---- region stamps + migration
 const dump=await (await fetch(H.FB+'/dump')).json();const terr=Object.entries(dump.docs).filter(([p])=>p.startsWith('teams/testcrew/territory/'));
 ok(terr.length>=14&&terr.every(([,d])=>d.data.rg&&d.data.al==='testcrew'),'every hex doc carries its region + alliance',{n:terr.length,sample:terr[0]&&terr[0][1].data.rg});
 const tv=dump.docs['teams/testcrew/meta/terrv'];ok(!!tv&&tv.data.v===2,'territory version 2 set (region loading on)');
 await A.reload();await A.waitForTimeout(1000);await H.onboard(A,'Pope');await H.ready(A);await A.waitForTimeout(5000);
 const ra=await ev(A,()=>({mode:TERR15.mode,cells:Object.keys(TERR15.cells).length,terr:Object.keys(G.terr).length,hasK:Object.values(G.terr).some(o=>o.rg&&o.rg.startsWith('150_'))}));
 ok(ra.mode==='region'&&!ra.hasK,'Idaho phone loads only its own region (Kansas hexes not read)',ra);
 // Kay claims 300 hexes in Kansas: Idaho still reads none of them
 await ev(K,()=>{const [q,r]=idQR(shHex15());let n=0;for(let ring=2;ring<12&&n<300;ring++)for(const x of hexRing(q,r,ring)){if(n>=300)break;if(hexDist(x.id,shHex15())===ring){claimTile(x.id);n++;}}save();});
 await A.waitForTimeout(4000);const rb=await ev(A,()=>Object.keys(G.terr).length),rbk=await ev(A,()=>Object.values(G.terr).filter(o=>o.rg&&o.rg.startsWith('150_')).length);ok(rbk===0&&rb<ra.terr+5,'after Kay claims 300 Kansas hexes, the Idaho phone reads none of them',{docs:rb,kansas:rbk});
 await ev(A,([h])=>{map.setView(hexCenter(...idQR(h)),13);refresh15();},[shK]);await A.waitForTimeout(4000);
 const rc=await ev(A,()=>Object.keys(G.terr).length);ok(rc>=rb+300,'looking at Kansas on the map loads Kansas',{before:rb,after:rc});
 await ev(A,([h])=>{map.setView(hexCenter(...idQR(h)),15);},[shA]);
 // ---- ranks + HQ
 await ev(A,async()=>{await claimLeader15();});await A.waitForTimeout(2500);
 const k1=await ev(K,()=>({on:ranksOn15(),me:myRank15(),leader:G.hq15.leader}));const aUid=await ev(A,()=>NET.uid),kUid=await ev(K,()=>NET.uid);
 ok(k1.on&&k1.me==='member'&&k1.leader===aUid,'Kay sees Pope as leader, herself as member',k1);
 await ev(A,async([h])=>{const [q,r]=idQR(h);await setHq15(hexRing(q,r,3)[0].id,'Rathdrum');},[shA]);await K.waitForTimeout(2500);
 ok(await ev(K,()=>!!hqHex15()&&G.hq15.hq.name==='Rathdrum'),'Kay sees the HQ');
 await ev(A,async([u])=>{await setTitle15(u,'Road Captain');},[kUid]);await K.waitForTimeout(2500);
 ok(await ev(K,()=>titleOf15(NET.uid))==='Road Captain','Pope gives Kay a clan title; Kay sees it');
 const deny=await ev(K,async([u])=>{try{await setRank15(u,'officer');}catch(e){}return myRank15();},[kUid]);ok(deny==='member','a member cannot promote herself');
 // ---- bank approval
 await ev(A,async()=>{P.res.scrap=1000;G.bankMode='deposit';await bankTx('scrap',500);});await K.waitForTimeout(2500);
 const k0=await ev(K,()=>P.res.scrap||0);
 await ev(K,async()=>{G.bankMode='withdraw';await bankTx('scrap',40);});await A.waitForTimeout(2500);
 const pend=await ev(A,()=>Object.values(G.bankReq15).filter(r=>r.status==='pending').map(r=>({id:r.id,amt:r.amt,name:r.name})));
 const kMid=await ev(K,()=>P.res.scrap||0);ok(pend.length===1&&pend[0].amt===40&&kMid===k0,'Kay\'s withdrawal becomes a request; nothing paid yet',{pend,k0,kMid});
 await ev(A,async([id])=>{await decideReq15(id,true);},[pend[0].id]);await K.waitForTimeout(4000);
 const done=await ev(K,()=>({res:P.res.scrap||0,bank:(G.al.bank||{}).scrap}));const st=(await (await fetch(H.FB+'/get?p='+encodeURIComponent('teams/testcrew/bankReq/'+pend[0].id))).json()).data.status;
 ok(done.res===k0+40&&done.bank===460&&st==='paid','Pope approves → Kay collects 40 once, bank 460, request paid',{...done,st});
 await K.waitForTimeout(3000);ok(await ev(K,()=>P.res.scrap||0)===k0+40,'no double payout');
 // ---- forward outpost near Pope, portal from Kansas
 const fw=await ev(K,([h])=>{P.res={...P.res,scrap:5000,food:5000,water:5000,fuel:5000,parts:5000};const [q,r]=idQR(h);const id=hexRing(q,r,4).find(x=>hexDist(x.id,h)===4).id;placeSpecial15(id,'fwd');const o=W().outposts[id];if(o){o.state='up';}save();pushMember();
   TP().home=800;portal15('sh',id,500);return{id,kind:o&&o.kind,ms:TP().portal15[0]&&TP().portal15[0].at-TP().portal15[0].st,mine:!!P.tiles[id]};},[shA]);
 ok(fw.kind==='fwd'&&fw.mine&&fw.ms===3*3600e3,'Kay drops a Forward Outpost near Pope and portals 500 troops (3 h)',fw);
 // ---- fronts: Kay's Kansas base opens its own front on Pope's horde sim
 const fr=await ev(A,()=>{for(const x of hexRing(...idQR(shHex15()),2))P.tiles[x.id]=P.tiles[x.id]||{t:Date.now()};factionCatchUp(true);factionCatchUp(true);const fx=FX();return{start:!!fx.start,fronts:Object.values(fx.fronts15||{}).map(f=>f.label)};});
 ok(fr.start&&fr.fronts.includes("Kay's area"),'Kay\'s Kansas base opens its own horde front',fr);
 console.log('errs',JSON.stringify(A.errs.slice(0,5)),JSON.stringify(K.errs.slice(0,5)));
 console.log(fails?'FAILS '+fails:'ALL PASS');await b.close();})();
