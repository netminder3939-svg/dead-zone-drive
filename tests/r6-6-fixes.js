// R6.6 FIXES.md at 390x844: landmark supply row, outpost/tower card art, demolish, move a built Alliance HQ. Local only.
process.env.VW=process.env.VW||'390';process.env.VH=process.env.VH||'844';
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,500):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const close=()=>ev(()=>{try{UI.closeModal();}catch(e){}});
 const B=await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();G.dev=G.dev||{};G.dev.hold=true;G.pos=[47.7796,-116.8923];
   const sh=hexAt(...G.pos).id;W().sh={hex:sh,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:8};P.startSh26=1;P.startShMoved26=1;if(!P.tiles[sh])claimTile(sh);
   const [q,r]=idQR(sh),R=k=>hexRing(q,r,k).filter(x=>hexDist(x.id,sh)===k);
   const t4=R(3)[0].id,t1=R(3)[2].id,opF=R(2)[0].id,opH=R(4)[0].id,opO=R(4)[3].id,mA=R(1)[0],mB=R(1)[1];[t4,t1,opF,opH,opO,mA.id,mB.id].forEach(h=>{if(!P.tiles[h])claimTile(h);});
   W().towers={[t4]:{state:'up',level:4,hpPct:1,online:true},[t1]:{state:'up',level:1,hpPct:1,online:true}};
   W().outposts={[opF]:{state:'up',kind:'fwd',hpPct:1,start:Date.now(),endsAt:Date.now()},[opH]:{state:'up',kind:'home',hpPct:1,start:Date.now(),endsAt:Date.now()},[opO]:{state:'up',hpPct:1,start:Date.now(),endsAt:Date.now()}};
   const cA=hexCenter(mA.q,mA.r),cB=hexCenter(mB.q,mB.r);const lA={id:'lm-mall-other',kind:'mall',name:'Dead Mall #1',lat:cA[0],lng:cA[1]},lB={id:'lm-mall-5',kind:'mall',name:'Dead Mall #5',lat:cB[0],lng:cB[1]};
   G.landmarks=(G.landmarks||[]).concat([lA,lB]);P.pipeUnlock26=P.pipeUnlock26||{};
   for(const [l,m] of [[lA,mA],[lB,mB]])P.pipeUnlock26[l.id]={t:Date.now(),res:'scrap',name:l.name,hex:m.id,lat:l.lat,lng:l.lng,kind:'mall'};
   P.pipes=[{id:'p-scrap',site:lA.id,name:lA.name,res:'scrap',hex:mA.id,lat:lA.lat,lng:lA.lng,route:[sh,mA.id],st:'online',onT:Date.now(),lastPay:Date.now(),t:Date.now(),acc:0,total:0}];
   P.res={scrap:5000,food:5000,water:5000,fuel:5000,parts:5000};TP().home=5000;save();drawWorld();G._b={sh,t4,t1,opF,opH,opO};return G._b;});
 await p.waitForFunction(()=>window.PLACES&&window.PLACES.outpost,null,{timeout:15000}).catch(()=>{});await p.waitForTimeout(600);
 // ---- 1) landmark Supply site row
 const lm=await ev(()=>{const l=G.landmarks.find(x=>x.id==='lm-mall-5');UI.infoLandmark(l);const box=$('#modalBody .pipesite'),g=box&&box.querySelector('.grow'),btn=box&&box.querySelector('button'),mb=$('#modalBody');
   const r=e=>e?Math.round(e.getBoundingClientRect().width):0;return{box:r(box),grow:r(g),growH:g?Math.round(g.getBoundingClientRect().height):0,mb:r(mb),btn:btn&&btn.textContent,dis:btn&&btn.disabled,
     small:(box.querySelector('small')||{}).innerText||'',art:!!$('#modalBody .iart img'),toast:($('#toast')||{}).innerText||''};});
 ok(lm.box>=lm.mb*0.8&&lm.grow>=150&&lm.growH<160,'supply site row is full width and wraps as sentences',lm);
 ok(lm.dis&&/^Build /.test(lm.btn)&&!/pipeline/.test(lm.btn),'blocked Build button is disabled and still says Build + cost',lm.btn);
 ok((lm.small.match(/already have a scrap pipeline/g)||[]).length===1&&!/already have/.test(lm.toast),'the reason appears once, in the small line, no toast',lm.small);
 ok(lm.art,'landmark art still on the card');
 await p.screenshot({path:'/home/claude/scr/r66-landmark.png'});
 const lmOk=await ev(()=>{UI.closeModal();P.pipes=[];const l=G.landmarks.find(x=>x.id==='lm-mall-5');const why=canBuildPipe(siteOf(l));UI.infoLandmark(l);const btn=$('#modalBody .pipesite button');return{why,dis:btn&&btn.disabled,txt:btn&&btn.textContent};});
 ok(lmOk.why||(!lmOk.dis&&/^Build /.test(lmOk.txt)),'a site with no cap conflict shows an enabled Build button',lmOk);
 await close();
 // ---- 2) outpost / tower / stronghold card art
 for(const [k,file] of [['opF','war-banner'],['opH','fire-shrine'],['opO','war-banner']]){
  const c=await ev(([k])=>{UI.closeModal();const id=G._b[k];const c=hexCenter(...idQR(id));G._lastLL=c;G._lastLLt=Date.now();UI.infoOutpost(id);const mb=$('#modalBody'),ia=mb.querySelector('.iart'),bi=mb.querySelector('.bi24'),h=mb.querySelector('h2');
    return{title:h&&h.innerText,iart:ia?ia.innerHTML.slice(0,200):'',iartImg:!!(ia&&ia.querySelector('img')),bi:bi?bi.innerHTML.slice(0,160):'none',biImg:!!(bi&&bi.querySelector('img')),tent:/⛺/.test((h&&h.innerText)||'')||/⛺/.test((ia&&ia.innerText)||'')||/⛺/.test((bi&&bi.innerText)||''),dm:mb.querySelectorAll('.dm66b').length,op15:(mb.querySelector('.op15')||{}).innerText||''};},[k]);
  ok(c.iartImg&&c.iart.includes(file)&&(c.bi==='none'||(c.biImg&&c.bi.includes(file)))&&!c.tent&&!/^[🏡🚩⛺]/u.test(c.title),`${k} card: ${file} drawing in the big image and teal box, plain title, no tent`,c);
  ok(c.dm===1,`${k} card: exactly one Demolish`,c.dm);}
 await ev(()=>{UI.closeModal();UI.infoOutpost(G._b.opF);});await p.screenshot({path:'/home/claude/scr/r66-outpost.png'});
 const tw=await ev(()=>{UI.closeModal();const id=G._b.t4;G._lastLL=hexCenter(...idQR(id));G._lastLLt=Date.now();UI.infoStruct('tower',id);const mb=$('#modalBody'),h=mb.querySelector('h2'),bi=mb.querySelector('.bi24');
   return{title:h&&h.innerText,art:!!mb.querySelector('.iart img, .cca26 img'),bi:bi?bi.innerHTML.slice(0,140):'none',tower:/🗼/.test((h&&h.innerText)||'')||/🗼/.test((bi&&bi.innerText)||''),dm:mb.querySelectorAll('.dm66b').length};});
 ok(tw.art&&!tw.tower&&tw.dm===1,'watchtower card: drawing, no 🗼, one Demolish',tw);
 const tt=await ev(()=>{UI.closeModal();try{UI.infoTile(G._b.t4);}catch(e){return{err:e.message};}const t=($('#modalBody .cch26')||$('#modalBody h2')||{}).innerText||'';return{t:t.slice(0,80)};});
 ok(!/🗼/.test(tt.t||''),'tile card title for a tower has no 🗼',tt);
 const sh=await ev(()=>{UI.closeModal();const id=G._b.sh;G._lastLL=hexCenter(...idQR(id));G._lastLLt=Date.now();UI.infoStruct('sh');const mb=$('#modalBody'),h=mb.querySelector('h2'),bi=mb.querySelector('.bi24');
   return{title:h&&h.innerText,bi:bi?bi.innerHTML.slice(0,140):'none',biImg:!!(bi&&bi.querySelector('img')),castle:/🏰/.test((h&&h.innerText)||''),dm:mb.querySelectorAll('.dm66b,.dm66p').length,txt:/Demolish/.test(mb.innerText)};});
 ok(!sh.castle&&!sh.txt&&(sh.bi==='none'||sh.biImg),'stronghold card: drawing, no 🏰 title, no Demolish',sh);
 await close();
 // ---- 3) demolish
 const pay=await ev(()=>({lv1:refundHalf66(towerPaid66({level:1})),lv4:towerPaid66({level:4}),cost:BAL.tower.cost,up:[1,2,3].map(L=>towerUpCost({level:L}))}));
 const exp4={};for(const k in pay.cost){let s=pay.cost[k];for(const u of pay.up)s+=u[k]||0;exp4[k]=s;}
 ok(JSON.stringify(pay.lv4)===JSON.stringify(exp4),'Lv4 tower paid = build + 3 upgrades',pay);
 // cancel changes nothing
 const cn=await ev(async()=>{const r0=JSON.stringify(P.res);const pr=demolish66(G._b.t4);await new Promise(r=>setTimeout(r,150));const m=$('#kitModal');const txt=m?m.innerText:'';m.querySelector('.k0').click();await pr;return{txt,same:r0===JSON.stringify(P.res),still:!!W().towers[G._b.t4]};});
 ok(cn.same&&cn.still&&/Refund/.test(cn.txt)&&/Demolish Watchtower\?/i.test(cn.txt),'cancel changes nothing; the confirm lists the refund',cn);
 const conf=async(fn,arg)=>ev(async([fn,arg])=>{const r0={...P.res};const pr=window[fn](arg);await new Promise(r=>setTimeout(r,150));const m=$('#kitModal');const txt=m?m.innerText:'';m.querySelector('.k1').click();await pr;
   const d={};for(const k in P.res)if(P.res[k]!==r0[k])d[k]=P.res[k]-r0[k];return{txt,d};},[fn,arg]);
 await ev(()=>{stationed()[G._b.t4]={n:300,at:0,from:G._b.sh};save();});
 const d4=await conf('demolish66',B.t4);const back=await ev(()=>({gone:!W().towers[G._b.t4],st:!!stationed()[G._b.t4],ret:TP().returning.filter(x=>x.from===G._b.t4).map(x=>({n:x.n,why:x.why}))}));
 const half4={};for(const k in exp4){const v=Math.floor(exp4[k]/2);if(v>0)half4[k]=v;}
 ok(JSON.stringify(d4.d)===JSON.stringify(half4)&&back.gone&&!back.st&&back.ret.length===1&&back.ret[0].n===300&&back.ret[0].why==='building demolished','Lv4 tower: 50% floored refund, record gone, 300 troops on a Returning march',{d4,back,half4});
 const d1=await conf('demolish66',B.t1);
 ok(JSON.stringify(d1.d)===JSON.stringify(pay.lv1),'Lv1 tower refund = half the build cost',{d:d1.d,exp:pay.lv1});
 const slot=await ev(()=>({live:Object.values(W().towers).filter(t=>t.state!=='down').length}));ok(slot.live===0,'tower slots freed',slot);
 // outposts: paid recorded at build; operating from it returns you to GPS; pay range busts
 const opc=await ev(()=>({c:outpostCost()}));
 await ev(()=>{P.op15=G._b.opF;stationed()[G._b.opF]={n:120,at:0,from:G._b.opF,b15o:G._b.opF};save();G._bust=0;const sb=window.supplyBust64;window.supplyBust64=function(){G._bust++;return sb.apply(this,arguments);};});
 const dF=await conf('demolish66',B.opF);const af=await ev(()=>({gone:!W().outposts[G._b.opF],op:P.op15,bust:G._bust,own:!!P.tiles[G._b.opF],ret:TP().returning.filter(x=>x.from===G._b.opF).length}));
 const hc={};for(const k in opc.c){const v=Math.floor(opc.c[k]/2);if(v>0)hc[k]=v;}
 ok(JSON.stringify(dF.d)===JSON.stringify(hc)&&af.gone&&af.op==='gps'&&af.bust>=1&&af.own&&af.ret===1,'Forward Outpost: 50% refund, gone, back on GPS, pay range redrawn, hex still yours, troops home',{dF,af,hc});
 const dH=await conf('demolish66',B.opH);const dO=await conf('demolish66',B.opO);
 ok(JSON.stringify(dH.d)===JSON.stringify(hc)&&JSON.stringify(dO.d)===JSON.stringify(hc),'Home and regular outposts: same refund',{dH:dH.d,dO:dO.d});
 // capturing outpost placed now: records paid66, demolish mid-hold claims nothing
 const cap=await ev(async()=>{const [q,r]=idQR(G._b.sh);const id=hexRing(q,r,6).map(x=>x.id).find(h=>!P.tiles[h]&&!factionAt(h)&&!enemyAt(h));claimTile(id);const c=outpostCost();placeOutpost(id);const o=W().outposts[id];
   G._cap=id;return{id,state:o&&o.state,paid:o&&o.paid66,c,tiles:Object.keys(P.tiles).length};});
 const dC=await conf('demolish66',cap.id);
 const ac=await ev(()=>({gone:!W().outposts[G._cap],tiles:Object.keys(P.tiles).length}));
 await p.waitForTimeout(500);
 ok(cap.state==='capturing'&&JSON.stringify(cap.paid)===JSON.stringify(cap.c)&&ac.gone&&ac.tiles===cap.tiles&&/still capturing/.test(dC.txt),'capturing outpost: paid recorded, demolished mid-hold, nothing claimed',{cap,ac});
 // pipeline: Demolish replaces Remove
 const pp=await ev(async()=>{const l=G.landmarks.find(x=>x.id==='lm-mall-5');P.pipes=[{id:'p2',site:l.id,name:l.name,res:'scrap',hex:G._b.sh,lat:l.lat,lng:l.lng,route:[G._b.sh],st:'online',onT:Date.now(),lastPay:Date.now(),t:Date.now(),acc:0,total:0}];save();
   pipeCard(P.pipes[0]);const t=$('#modalBody').innerText;return{remove:/Remove/.test(t),dem:/Demolish/.test(t),cls:!!$('#modalBody button.fight.dm66p')};});
 ok(!pp.remove&&pp.dem&&pp.cls,'pipeline card: Demolish (danger) replaces Remove',pp);
 const dp=await conf('demolishPipe66','p2');const ap=await ev(()=>{const l=G.landmarks.find(x=>x.id==='lm-mall-5');return{n:P.pipes.length,why:canBuildPipe(siteOf(l))};});
 const hp={};for(const [k,v] of Object.entries({scrap:120,parts:15})){const n=Math.floor(v/2);if(n)hp[k]=n;}
 ok(JSON.stringify(dp.d)===JSON.stringify(hp)&&ap.n===0&&!/already have/.test(ap.why||''),'pipeline: 50% refund, the scrap slot is free again',{d:dp.d,ap});
 // ally structure: no Demolish
 const al=await ev(()=>{UI.closeModal();const h=hexRing(...idQR(G._b.sh),7)[0].id;G.al=G.al||{};G.al.members=G.al.members||{};G.al.members['uAlly']={name:'Ally',defs:[{k:'tower',hex:h,r:1,p:100}]};const html=bldCard(h);delete G.al.members['uAlly'];return{has:/Demolish/.test(html)};});
 ok(!al.has,'teammate building card has no Demolish',al);
 await close();
 // ---- 4) Move a built Alliance HQ
 await ev(async()=>{await claimLeader15();await new Promise(r=>setTimeout(r,200));const [q,r]=idQR(G._b.sh);const h0=hexRing(q,r,9).map(x=>x.id).find(h=>!hqSpaceWhy6(h)&&!factionAt(h));G._h0=h0;await setHq15(h0,'Rathdrum');
   const a=NET._al();a.bank={scrap:5000,food:5000,water:5000,fuel:5000,parts:5000};NET._alSave();G.al.bank=a.bank;await buildHq6();await new Promise(r=>setTimeout(r,200));});
 const hq0=await ev(()=>({hex:G.hq15&&G.hq15.hq&&G.hq15.hq.hex,bld:JSON.stringify(G.hq15&&G.hq15.bld),cost:HQ6.moveCost,bank:{...NET._al().bank}}));
 ok(JSON.stringify(hq0.cost)===JSON.stringify({scrap:375,food:75,water:75,fuel:50,parts:37}),'move cost = 25% of the build cost, floored (proposed)',hq0.cost);
 ok(hq0.hex===await ev(()=>G._h0)&&/"built":true/.test(hq0.bld),'HQ built at the first spot',hq0);
 const tab=await ev(()=>{UI.open('alliance');UI.sub.alliance='hq';UI.render();const t=$('#sheetBody').innerText;return{move:/Move HQ \(tap the map\)/.test(t),dem:/Demolish/.test(t),prop:/proposed/i.test(t)};});
 ok(tab.move&&!tab.dem&&tab.prop,'Alliance › HQ shows Move HQ (with the proposed cost) and no Demolish',tab);
 // blocked hex: no debit
 const bl=await ev(()=>{G._bw={sp:hqSpaceWhy6(G._b.sh),mw:moveWhy66(G._b.sh),defs:(()=>{try{return ownDefStructs().map(d=>d.k+':'+d.hex+':'+d.r);}catch(e){return 'ERR '+e.message;}})(),sh:G._b.sh};pick15('hq');UI.infoTile(G._b.sh);return{bw:G._bw,bank:{...NET._al().bank},modal:!$('#modal').classList.contains('hidden')&&/Move the HQ/.test($('#modalBody').innerText),toast:($('#toast')||{}).innerText};});
 ok(JSON.stringify(bl.bank)===JSON.stringify(hq0.bank)&&!bl.modal,'a blocked hex toasts the why and does not debit the Vault',bl);
 // confirm and move; mover's troops at the old hex go home
 const mv=await ev(async()=>{stationed()[G._h0]={n:200,at:0,from:G._b.sh};save();const [q,r]=idQR(G._h0);const h1=hexRing(q,r,4).map(x=>x.id).find(h=>!hqSpaceWhy6(h)&&!factionAt(h)&&!moveWhy66(h));G._h1=h1;
   pick15('hq');UI.infoTile(h1);const txt=$('#modalBody').innerText;const b0=G.hq15.bld;
   // cancel first: nothing changes
   [...$('#modalBody').querySelectorAll('button')].find(b=>/Cancel/.test(b.textContent)).click();const afterCancel={hex:G.hq15.hq.hex,bank:{...NET._al().bank}};
   pick15('hq');UI.infoTile(h1);await [...$('#modalBody').querySelectorAll('button')].find(b=>/Move HQ/.test(b.textContent)).onclick();await new Promise(r=>setTimeout(r,300));
   return{txt,afterCancel,hex:G.hq15.hq.hex,h1,bldSame:JSON.stringify(G.hq15.bld)===JSON.stringify(b0),bank:{...NET._al().bank},ret:TP().returning.filter(x=>x.from===G._h0).map(x=>x.why),st:!!stationed()[G._h0],sh:W().sh.hex};});
 const db={};for(const k in hq0.bank)db[k]=hq0.bank[k]-mv.bank[k];
 ok(/375/.test(mv.txt)&&/PROPOSED — Jacob to confirm/.test(mv.txt)&&/kept/.test(mv.txt)&&/march home/.test(mv.txt),'move confirm: cost (proposed), level kept, troops march home',mv.txt.slice(0,300));
 ok(mv.afterCancel.hex===await ev(()=>G._h0)&&JSON.stringify(mv.afterCancel.bank)===JSON.stringify(hq0.bank),'cancel changes nothing',mv.afterCancel);
 ok(mv.hex===mv.h1&&mv.bldSame&&JSON.stringify(db)===JSON.stringify(hq0.cost),'moved: new hex, bld byte-identical, Vault debited exactly the cost',{hex:mv.hex,db});
 ok(mv.ret.includes('HQ moved')&&!mv.st,'troops on the old HQ hex march home (HQ moved)',mv.ret);
 ok(mv.sh===B.sh,'nobody\'s Stronghold is auto-moved',mv.sh);
 // vault short / locked: refused
 const sh2=await ev(async()=>{const a=NET._al();a.bank={scrap:100,food:5000,water:5000,fuel:5000,parts:5000};NET._alSave();const [q,r]=idQR(G._h1);const h2=hexRing(q,r,4).map(x=>x.id).find(h=>!moveWhy66(h));
   const res=await moveBuiltHq6(h2,'x');return{res,hex:G.hq15.hq.hex,bank:{...NET._al().bank}};});
 ok(!sh2.res&&sh2.hex===mv.h1&&sh2.bank.scrap===100,'Vault short of scrap: refused, HQ and bank unchanged',sh2);
 const lk=await ev(async()=>{const a=NET._al();a.bank={scrap:5000,food:5000,water:5000,fuel:5000,parts:5000};NET._alSave();const cur=JSON.parse(JSON.stringify(G.hq15));await hqTx15(c=>({...c,bld:{...c.bld,lockUntil:Date.now()+3600e3}}));
   const [q,r]=idQR(G._h1);const h2=hexRing(q,r,4).map(x=>x.id).find(h=>!hqSpaceWhy6(h)&&!factionAt(h));const res=await moveBuiltHq6(h2,'x');const out={res,hex:G.hq15.hq.hex,bank:NET._al().bank.scrap,why:moveWhy66(h2)};
   await hqTx15(c=>({...c,bld:{...c.bld,lockUntil:0}}));return out;});
 ok(!lk.res&&lk.hex===mv.h1&&lk.bank===5000&&/locked/.test(lk.why||''),'Vault locked: refused like an upgrade',lk);
 // member: no Move button, setHq15 refuses
 const mem=await ev(async()=>{const r0=G.hq15.roles;await hqTx15(c=>({...c,roles:{other:'leader'},leader:'other'}));UI.closeModal();UI.open('alliance');UI.sub.alliance='hq';UI.render();const t=$('#sheetBody').innerText;G._memT=t;const [q,r]=idQR(G._h1);const h2=hexRing(q,r,4).map(x=>x.id).find(h=>!hqSpaceWhy6(h)&&!factionAt(h));
   const res=await moveBuiltHq6(h2,'x');const out={move:/Move HQ/.test(t),res,hex:G.hq15.hq.hex};await hqTx15(c=>({...c,roles:r0,leader:Object.keys(r0)[0]}));return out;});
 ok(!mem.move&&mem.res!==true&&mem.hex===mv.h1,'a member sees no Move and cannot move it',mem);
 // unbuilt spot stays free
 const fr=await ev(async()=>{await hqTx15(c=>{const n={...c};delete n.bld;return n;});const b0={...NET._al().bank};const [q,r]=idQR(G._h1);const h2=hexRing(q,r,5).map(x=>x.id).find(h=>!hqSpaceWhy6(h)&&!factionAt(h));await setHq15(h2,'Spot');return{hex:G.hq15.hq.hex,h2,same:JSON.stringify(b0)===JSON.stringify(NET._al().bank)};});
 ok(fr.hex===fr.h2&&fr.same,'unbuilt HQ spot still moves for free',fr);
 // sweeper: my troops on a teammate's building that disappears go home after 5 min; a bare owned hex is untouched
 const sw=await ev(()=>{const h=hexRing(...idQR(G._b.sh),8)[1].id;G.al.members['uAlly']={name:'Ally',defs:[{k:'tower',hex:h,r:1,p:100}]};stationed()[h]={n:50,at:0,from:G._b.sh};sweep66();
   G.al.members['uAlly'].defs=[];sweep66();const m=TP().bld66[h];m.gone=Date.now()-6*60e3;sweep66();const r=TP().returning.filter(x=>x.from===h).map(x=>x.why);delete G.al.members['uAlly'];return{r,st:!!stationed()[h]};});
 ok(sw.r.includes('building demolished')&&!sw.st,'sweeper: troops on a demolished teammate building march home',sw);
 ok(!errs.filter(e=>/PAGEERR/.test(e)).length,'no page errors',errs.filter(e=>/PAGEERR/.test(e)));
 console.log(fails?`${fails} FAIL`:'ALL PASS');
});
