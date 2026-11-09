// R1: titles through the real UI (tap names, type, tap buttons), Pope leader + Kay member.
const {chromium}=require('playwright');const H=require('./two.js');
let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
const ev=(p,f,a)=>p.evaluate(f,a);
const mkSh=(p,lat,lng)=>ev(p,([lat,lng])=>{G.playLocked=false;G.dev=G.dev||{};G.dev.hold=true;G.jump=true;setPos(lat,lng);const id=hexAt(lat,lng).id;claimTile(id);
  W().sh={hex:id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;save();pushMember();return id;},[lat,lng]);
(async()=>{await fetch(H.FB+'/reset',{method:'POST'});const b=await chromium.launch();const GAME='http://127.0.0.1:'+(process.env.PORT||8771)+'/';
 const A=await H.device(b,'phone',GAME);await H.onboard(A,'Pope');await H.signIn(A,'pope@test.com','secret123','up');await H.choose(A,'fresh');await H.ready(A);await mkSh(A,47.7796,-116.8923);
 const K=await H.device(b,'phone',GAME);await H.onboard(K,'Kay');await H.signIn(K,'kay@test.com','secret123','up');await H.choose(K,'fresh');await H.ready(K);await mkSh(K,47.80,-116.95);
 await A.waitForTimeout(4000);
 const shot=async(p,n)=>p.screenshot({path:'/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/'+n+'.png'});
 // Pope: Alliance tab -> HQ sub-tab -> Claim leadership
 const openAl=async(p,sub)=>{await ev(p,s=>{UI.open('alliance');UI.sub.alliance=s;UI.render();},sub);await p.waitForTimeout(800);};
 await ev(A,()=>{P.uid='old-anon-uid-from-import';});// an imported character keeps an older id
 await openAl(A,'hq');await shot(A,'t1-hq');
 const claim=await A.$('button:has-text("Claim leadership")');ok(!!claim,'HQ tab shows Claim leadership');if(claim){await claim.click();await A.waitForTimeout(2500);}
 ok(await ev(A,()=>myRank15())==='leader','Pope is leader');
 ok(await ev(A,()=>G.hq15.leader===NET.uid&&G.hq15.roles[NET.uid]==='leader'),'leadership is stored under the signed-in account id (what the rules check)');
 // Pope: open crew list, tap Kay
 const kUid=await ev(K,()=>NET.uid);
 await openAl(A,'crew');await A.waitForTimeout(800);await shot(A,'t2-crew');
 const opened=await ev(A,([u])=>{const el=[...document.querySelectorAll('[onclick*="person26"]')].find(e=>e.getAttribute('onclick').includes(u));if(!el)return 'no row for Kay';el.click();return 'ok';},[kUid]);
 ok(opened==='ok','crew list has a tappable row for Kay',opened);await A.waitForTimeout(800);await shot(A,'t3-card');
 const inp=await A.$('#tt15in');ok(!!inp,'person card shows the title box');
 if(inp){await inp.fill('Road Captain');await A.click('button:has-text("Set title")');await A.waitForTimeout(2500);}
 await shot(A,'t4-after');
 const t=await ev(A,([u])=>({title:titleOf15(u),toast:[...document.querySelectorAll('#toast div')].map(d=>d.textContent).slice(-3)}),[kUid]);ok(t.title==='Road Captain','title saved',t);
 // make officer via UI
 await ev(A,([u])=>UI.person26(u),[kUid]);await A.waitForTimeout(600);
 const mo=await A.$('button:has-text("Make officer")');ok(!!mo,'Make officer button');if(mo){await mo.click();await A.waitForTimeout(2500);}
 ok(await ev(K,()=>myRank15())==='officer','Kay becomes officer (seen on Kay\'s phone)');
 ok(await ev(K,([u])=>titleOf15(u),[kUid])==='Road Captain','Kay sees her title');
 // Pope sets his OWN title (tap his own row)
 const self=await ev(A,()=>{UI.person26(NET.uid);return !!document.getElementById('tt15in');});ok(self,'leader can open the title box for himself');
 console.log('errors A:',A.errs.slice(0,5),'K:',K.errs.slice(0,5));console.log(fails?`${fails} FAIL`:'ALL PASS');await b.close();process.exit(fails?1:0);})();
