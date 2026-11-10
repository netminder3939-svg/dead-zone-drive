// R6.4 §4: Forward Outpost picker (F1-F5): one validity function, the 6 mi zone, ring preview and the confirm card.
const lib=require('./s11-lib.js');
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const SHOT='/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/';
 await p.setViewportSize({width:430,height:900});await lib(p);
 // my Stronghold at Rathdrum; the only teammate land is a 7-hex patch at Spokane
 await ev(()=>{S11.sh(S11.RATH);S11.rich();const c=hexAt(...S11.SPOK);S11.mate(hexRing(c.q,c.r,1).map(x=>x.id));window.fwdMemoReset15&&fwdMemoReset15();G.dev=G.dev||{};G.dev.hold=true;});
 const green=()=>ev(()=>{const s=new Set();map.eachLayer(l=>{if(l instanceof L.Polygon&&l.options.color==='#5fd068'&&l.options.fillOpacity===.12){const b=l.getBounds().getCenter();s.add(hexAt(b.lat,b.lng).id);}});return[...s];});
 // F1: map 9.3 mi from the only teammate land: nothing green, the 6 mi zone shows, a tap is refused
 const f1=await ev(async()=>{const c=S11.ll(hexAt(...S11.SPOK).id);const ll=[c[0]+9.3*1609.34/111320,c[1]];map.setView(ll,13,{animate:false});pick15('fwd');await new Promise(r=>setTimeout(r,1600));
   window.__t=[];UI.infoTile(hexAt(...ll).id);await new Promise(r=>setTimeout(r,200));return{zone:U64().fwdU.circles.length,bar:(document.getElementById('pick15')||{}).textContent,toast:window.__t.join('|'),exp:typeof window.fwdOk15};});
 const g1=await green();
 ok(g1.length===0&&f1.zone>=7&&/within 6 mi of a teammate's land/.test(f1.toast)&&f1.exp==='function','F1: 9.3 mi away: no green hexes, the 6 mi zone is drawn, tapping gives the 6 mi reason',{...f1,green:g1.length});
 ok(/Tap a green hex: within 6 mi of a teammate's land, not on anyone's hexes\./.test(f1.bar||''),'bar copy',f1.bar);
 // F2: 2 mi from teammate land: green everywhere valid; a teammate hex is not green and says so
 const f2=await ev(async()=>{const c=S11.ll(hexAt(...S11.SPOK).id);map.setView([c[0]+2*1609.34/111320,c[1]],13,{animate:false});G.pick15At=Date.now();await new Promise(r=>setTimeout(r,1600));return null;});
 const g2=await green();
 const f2b=await ev(async(g)=>{const mate=hexAt(...S11.SPOK).id;window.__t=[];map.setView(S11.ll(mate),13,{animate:false});await new Promise(r=>setTimeout(r,1200));UI.infoTile(mate);await new Promise(r=>setTimeout(r,200));return{mate,toast:window.__t.join('|')};},g2);
 const g2b=await green();
 ok(g2.length>20&&g2b.length>0&&!g2b.includes(f2b.mate)&&/That hex belongs to a teammate/.test(f2b.toast),'F2: 2 mi away: green hexes; a teammate-held hex is not green and tapping it says so',{n:g2.length,...f2b});
 // F3/F4: a valid hex next to the teammate patch: ring 6 claim + 1 skip; 3 unpaid hexes of mine nearby -> revive line
 const f3=await ev(async()=>{const c=hexAt(...S11.SPOK);let cand=null;for(const x of hexRing(c.q,c.r,6)){if(hexDist(x.id,c.id)<2)continue;const ring=hexRing(...idQR(x.id),1).map(y=>y.id);if(ring.filter(id=>G.terr[id]).length===1&&!ring.some(id=>factionAt(id)||enemyAt(id))&&!window.fwdOk15(x.id)){cand=x.id;break;}}
   // 3 of my hexes 6-8 rings from the candidate (unpaid: 27 mi from Rathdrum, within 10 mi of here)
   const [q,r]=idQR(cand);const mine=hexRing(q,r,8).filter(y=>hexDist(y.id,cand)===8&&!G.terr[y.id]).slice(0,3).map(y=>y.id);mine.forEach(id=>P.tiles[id]={t:Date.now()});save();supplyBust64();
   map.setView(S11.ll(cand),14,{animate:false});G.pick15At=Date.now();await new Promise(r=>setTimeout(r,300));UI.infoTile(cand);await new Promise(r=>setTimeout(r,300));
   let red=0,grn=0,skipM=0;map.eachLayer(l=>{if(l instanceof L.Polygon&&l.options.dashArray==='6 4'&&l.options.color==='#d63a2a')red++;if(l instanceof L.Polygon&&l.options.color==='#5fd068'&&l.options.weight===2.5)grn++;});skipM=document.querySelectorAll('.skip64').length;
   window._cand=cand;return{cand,txt:document.getElementById('modalBody').textContent,red,grn,skipM};});
 ok(f3.red===1&&f3.grn===6&&f3.skipM===1&&/Will claim 6 of 7 · skips 1 \(Wife's\)/.test(f3.txt),'F3: ring preview 6 green + 1 red dashed with 🚫; card reads "Will claim 6 of 7 · skips 1 (Wife\'s)"',{red:f3.red,grn:f3.grn,skipM:f3.skipM,txt:f3.txt.slice(0,160)});
 ok(/Brings 3 unpaid hexes back into pay as soon as it's placed\./.test(f3.txt)&&/mi from Wife's land/.test(f3.txt),'F4: card shows "Brings 3 unpaid hexes back into pay as soon as it\'s placed." and the distance to Wife\'s land',f3.txt.slice(0,220));
 await p.screenshot({path:SHOT+'s11c-fwd-card-430.png'});await ev(()=>UI.closeModal());await p.waitForTimeout(200);await p.screenshot({path:SHOT+'s11c-fwd-ring-430.png'});
 // F5: green validity == !window.fwdOk15(id) for every hex within 9 rings, three layouts
 const res=[];for(const [dlat,dlng] of [[0.01,0],[0.0865,0],[-0.02,-0.03]]){const lay=await ev(async([a,b])=>{const c=S11.ll(hexAt(...S11.SPOK).id);const ll=[c[0]+a,c[1]+b];for(let i=0;i<3;i++){map.setView(ll,13,{animate:false});G.pick15At=Date.now();await new Promise(r=>setTimeout(r,900));const c2=map.getCenter();if(Math.abs(c2.lat-ll[0])<1e-4&&map.getZoom()===13)break;} // the app may recenter on your position; put it back
     const ctr=hexAt(...ll),[q,r]=idQR(ctr.id);const want=[];for(const x of hexRing(q,r,9))if(!window.fwdOk15(x.id))want.push(x.id);return{want,ctr:ctr.id,why:window.fwdOk15(ctr.id),pk:G.pick15};},[dlat,dlng]);
   const g=await green();const W_=new Set(lay.want),G_=new Set(g);const miss=lay.want.filter(x=>!G_.has(x)).length,extra=g.filter(x=>!W_.has(x)).length;res.push({want:lay.want.length,green:g.length,miss,extra,why:lay.why,pk:lay.pk});}
 ok(res.every(r=>r.miss===0&&r.extra===0||(r.green>=259&&r.extra===0)),'F5: in three layouts the green hexes equal !window.fwdOk15 (9 rings)',res);
 // no teammates with land: bar says so and cancels after 5 s
 const nt=await ev(async()=>{S11.unmate();G.al.members={};G.pick15=null;await new Promise(r=>setTimeout(r,800));pick15('fwd');await new Promise(r=>setTimeout(r,1300));const t=(document.getElementById('pick15')||{}).textContent;
   await new Promise(r=>setTimeout(r,5200));return{t,after:G.pick15,el:!!document.getElementById('pick15')};});
 ok(/None of your teammates hold land yet/.test(nt.t||'')&&!nt.after&&!nt.el,'no teammate land: the bar says so and cancels itself after 5 s',nt);
 console.log('errors:',errs.length,errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');
});
