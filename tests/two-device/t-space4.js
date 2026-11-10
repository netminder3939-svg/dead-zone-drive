// R4 spacing, two players standing on the same spot: Kay's first Stronghold lands where the areas don't overlap, her
// tower is refused inside Pope's area, edges may touch, and an overlap made before R4 gets the free move on both phones.
const {chromium}=require('playwright');const H=require('./two.js');
let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
const ev=(p,f,a)=>p.evaluate(f,a);
(async()=>{await fetch(H.FB+'/reset',{method:'POST'});const b=await chromium.launch();const GAME='http://127.0.0.1:'+(process.env.PORT||8767)+'/';
 const A=await H.device(b,'phone',GAME);await H.onboard(A,'Pope');await H.signIn(A,'pope@test.com','secret123','up');await H.choose(A,'fresh');await H.ready(A);
 const shA=await ev(A,()=>{G.playLocked=false;G.dev=G.dev||{};G.dev.hold=true;G.jump=true;setPos(47.7796,-116.8923);const id=hexAt(47.7796,-116.8923).id;claimTile(id);W().sh={hex:id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;save();pushMember();return id;});
 await A.waitForTimeout(2500);
 // Kay starts on the same spot: her first Stronghold is placed by the game
 const K=await H.device(b,'phone',GAME);await H.onboard(K,'Kay');await H.signIn(K,'kay@test.com','secret123','up');await H.choose(K,'fresh');await H.ready(K);
 await K.waitForTimeout(3000);
 const k1=await ev(K,([a])=>{G.playLocked=false;G.dev=G.dev||{};G.dev.hold=true;G.jump=true;setPos(47.7796,-116.8923);W().sh=null;P.startSh26=0;P.startShMoved26=0;ensureStartSh26();const s=W().sh;return{sh:s&&s.hex,d:s?hexDist(s.hex,a):null,need:shRadius()*2+1,why:s?spaceWhy4(s.hex,'sh'):null};},[shA]);
 ok(k1.sh&&k1.d>=k1.need&&!k1.why,'Kay standing on Pope\'s spot gets a Stronghold whose area does not overlap',k1);
 await ev(K,()=>{pushMember();});await A.waitForTimeout(2500);
 // a tower inside Pope's area is refused; on the edge it's fine
 const k2=await ev(K,([a])=>{const [q,r]=idQR(a);const inside=hexRing(q,r,2).find(x=>hexDist(x.id,a)===2).id;const edge=hexRing(q,r,4).find(x=>hexDist(x.id,a)===4).id;
   return{inside:spaceWhy4(inside,'tower'),edge:spaceWhy4(edge,'tower'),touchSh:spaceWhy4(hexRing(q,r,5).find(x=>hexDist(x.id,a)===5).id,'sh'),overlapSh:spaceWhy4(hexRing(q,r,4).find(x=>hexDist(x.id,a)===4).id,'sh')};},[shA]);
 ok(!!k2.inside&&!k2.edge,'a tower inside Pope\'s area is refused; one touching the edge is allowed',k2);
 ok(!k2.touchSh&&!!k2.overlapSh,'Strongholds: 5 hexes apart is fine (edges touch), 4 is refused',k2);
 // Pope's own tower inside his own area is allowed
 const a1=await ev(A,([a])=>{const [q,r]=idQR(a);return spaceWhy4(hexRing(q,r,1)[0].id,'tower');},[shA]);ok(!a1,'your own buildings may overlap each other',a1);
 // an overlap from before R4: Kay's Stronghold 2 hexes from Pope's
 const k3=await ev(K,([a])=>{const [q,r]=idQR(a);const id=hexRing(q,r,2).find(x=>hexDist(x.id,a)===2).id;W().sh.hex=id;W().sh.t4=0;save();pushMember();return id;},[shA]);
 await A.waitForTimeout(3000);await K.waitForTimeout(500);
 const ov=await ev(K,()=>{const o=overlap4();return o?{who:o.who,d:o.d,newer:o.mineNewer}:null;}),ovA=await ev(A,()=>{const o=overlap4();return o?{who:o.who,newer:o.mineNewer}:null;});
 ok(ov&&ov.who==='Pope'&&ovA&&ovA.who==='Kay','both phones see the overlap',{kay:ov,pope:ovA});
 await K.waitForTimeout(9000);const card=await ev(K,()=>($('#modalBody')&&!$('#modal').classList.contains('hidden'))?$('#modalBody').textContent:'');ok(/overlaps Pope/.test(card),'Kay is offered the free move',card.slice(0,120));
 // free move: pick a highlighted hex
 const mv=await ev(K,([a])=>{UI.closeModal();startFree4();const s=W().sh,[q,r]=idQR(s.hex);let pick=null;for(let ring=1;ring<=8&&!pick;ring++)for(const x of hexRing(q,r,ring))if(!freeMoveOk4(x.id)){pick=x.id;break;}
   const tiles0=Object.keys(P.tiles).length;freeMove4(pick);return{pick,now:W().sh.hex,overlap:!!overlap4(),d:hexDist(W().sh.hex,a),tiles0,tiles1:Object.keys(P.tiles).length,bar:!!document.getElementById('pick15')};},[shA]);
 ok(mv.now===mv.pick&&!mv.overlap&&mv.d>=5&&mv.tiles1>=mv.tiles0&&!mv.bar,'free move: Stronghold moved clear, tiles kept, pick bar gone',mv);
 await ev(K,()=>pushMember());await A.waitForTimeout(3000);ok(await ev(A,()=>!overlap4()),'Pope\'s phone sees the overlap is gone');
 console.log('errors A:',A.errs.slice(0,3),'K:',K.errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');await b.close();process.exit(fails?1:0);})();
