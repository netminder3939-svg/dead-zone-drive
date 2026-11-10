// R6 on two phones (fake Firebase): Pope (leader) builds the HQ from the Vault in one transaction, Kay (member) sees it,
// the HQ tab and Vault capacity agree on both phones, the Horde takes the HQ hex: Pope's phone applies the 10% loss and the
// lock once, Kay's approved withdrawal waits while locked, Pope can't name a 3rd officer.
const {chromium}=require('playwright');const H=require('./two.js');
let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
const ev=(p,f,a)=>p.evaluate(f,a);
const mkSh=(p,lat,lng)=>ev(p,([lat,lng])=>{G.playLocked=false;G.dev=G.dev||{};G.dev.hold=true;G.jump=true;setPos(lat,lng);const id=hexAt(lat,lng).id;claimTile(id);
  W().sh={hex:id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;save();pushMember();return id;},[lat,lng]);
(async()=>{await fetch(H.FB+'/reset',{method:'POST'});const b=await chromium.launch();const GAME='http://127.0.0.1:'+(process.env.PORT||8771)+'/';
 const A=await H.device(b,'phone',GAME);await H.onboard(A,'Pope');await H.signIn(A,'pope@test.com','secret123','up');await H.choose(A,'fresh');await H.ready(A);const sh=await mkSh(A,47.7796,-116.8923);
 const K=await H.device(b,'phone',GAME);await H.onboard(K,'Kay');await H.signIn(K,'kay@test.com','secret123','up');await H.choose(K,'fresh');await H.ready(K);await mkSh(K,47.80,-116.95);
 await A.waitForTimeout(3000);
 const shot=async(p,n)=>p.screenshot({path:'/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/'+n+'.png'});
 // Pope: leader, HQ spot 8 rings from his Stronghold, Vault funded
 const hq=await ev(A,async sh=>{await claimLeader15();const [q,r]=idQR(sh);const hx=hexRing(q,r,8).find(x=>hexDist(x.id,sh)===8).id;await hqTx15(cur=>({...cur,hq:{hex:hx,name:'Base',by:NET.uid,byName:P.name,t:Date.now()}}));
   const fs=NET.fs;await fs.setDoc(fs.doc(NET.db,...NET.base,'meta','alliance'),{bank:{scrap:5000,food:2000,water:2000,fuel:2000,parts:2000}},{merge:true});return hx;},sh);
 await A.waitForTimeout(2500);
 const bl=await ev(A,async()=>{await buildHq6();await new Promise(r=>setTimeout(r,2000));return{bld:G.hq15.bld,bank:{...G.al.bank}};});
 ok(bl.bld&&bl.bld.built&&bl.bank.scrap===3500&&bl.bank.parts===1850,'Pope builds the HQ: Vault paid and HQ saved in one transaction',bl);
 await K.waitForTimeout(2500);
 const ks=await ev(K,()=>({lvl:hqLvl6(),cap:vaultCap6(),rank:myRank15()}));
 ok(ks.lvl===1&&ks.cap===8000&&ks.rank==='member','Kay sees the Lv1 HQ and the 8,000 Vault',ks);
 const kt=await ev(K,async()=>{UI.open('alliance');UI.sub.alliance='hq';UI.render();await new Promise(r=>setTimeout(r,600));const c=document.querySelector('.hq6');return c?{txt:c.textContent.replace(/\s+/g,' ').slice(0,300),btns:c.querySelectorAll('button').length}:null;});
 ok(kt&&/Lv1/.test(kt.txt)&&kt.btns===0,'Kay\'s HQ tab shows the building with no upgrade button (members can\'t spend)',kt);
 await shot(K,'r6-kay-hq');
 // Kay can't build/upgrade
 const ku=await ev(K,async()=>{const s=G.al.bank.scrap;await upgradeHq6();await new Promise(r=>setTimeout(r,800));return{same:G.al.bank.scrap===s,lvl:hqLvl6(),upEnd:!!(G.hq15.bld||{}).upEnd};});
 ok(ku.same&&!ku.upEnd,'a member cannot upgrade the HQ',ku);
 // Kay asks for 100 scrap; Pope approves before the fall -> Kay collects normally
 // the Horde takes the HQ hex (same shared record on both phones)
 const fl=await ev(A,async hx=>{const fx=FX();let fid=Object.keys(fx.f||{})[0];if(!fid){factionCatchUp(true);fid=Object.keys(FX().f)[0];}const f=FX().f[fid];f.tiles[hx]=Date.now();fxDirty();
   const k=Math.floor(Date.now()/(HB().stepMin*60e3));hordeStep(k,{grew:{},took:[],held:[],fights:[],outposts:[],back:[],destroyed:[]});const b0={...G.al.bank};await applyFall6();await new Promise(r=>setTimeout(r,2000));
   await applyFall6();await new Promise(r=>setTimeout(r,1500));return{fall:!!hqFall6(),b0,b1:{...G.al.bank},lock:(G.hq15.bld||{}).lockUntil,locked:vaultLocked6()};},hq);
 ok(fl.fall&&fl.locked&&fl.lock>Date.now()+23*3600e3,'the fall locks the Vault for 24 h (lock saved on meta/hq)',{fall:fl.fall,lockH:Math.round((fl.lock-Date.now())/36e5)});
 ok(fl.b1.scrap===fl.b0.scrap-Math.floor(fl.b0.scrap*.1)&&fl.b1.parts===fl.b0.parts-Math.floor(fl.b0.parts*.1),'10% of each resource taken once (applied twice, charged once)',{b0:fl.b0,b1:fl.b1});
 await K.waitForTimeout(2500);
 ok(await ev(K,()=>vaultLocked6()),'Kay\'s phone sees the lock');
 // Kay requests, Pope tries to approve while locked
 await ev(K,async()=>{await requestWithdraw15('scrap',100,'fuel run');});await A.waitForTimeout(2500);
 const ap=await ev(A,async()=>{const r=Object.values(G.bankReq15).find(x=>x.status==='pending');if(!r)return{none:true};await decideReq15(r.id,true);await new Promise(r=>setTimeout(r,1500));return{status:G.bankReq15[r.id].status};});
 ok(ap.status==='pending','approvals wait while the Vault is locked',ap);
 // 3rd officer refused
 const kU=await ev(K,()=>NET.uid);
 const of=await ev(A,async u=>{await hqTx15(cur=>({...cur,roles:{...cur.roles,x1:'officer',x2:'officer'}}));await setRank15(u,'officer');await new Promise(r=>setTimeout(r,1200));return{k:G.hq15.roles[u]||null,n:Object.values(G.hq15.roles).filter(r=>r==='officer').length};},kU);
 ok(!of.k&&of.n===2,'a 3rd officer is refused',of);
 await shot(A,'r6-pope');
 console.log('errors A:',A.errs.slice(0,5),'K:',K.errs.slice(0,5));console.log(fails?`${fails} FAIL`:'ALL PASS');await b.close();process.exit(fails?1:0);})();
