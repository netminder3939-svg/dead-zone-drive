// R6.4 §5-§7a: Build-menu preview (G1-G2), capture results (H1-H6), outpost marker at every zoom (I1).
const lib=require('./s11-lib.js');
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const SHOT='/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/';
 await p.setViewportSize({width:430,height:900});await lib(p);
 await ev(()=>{S11.sh(S11.RATH);S11.rich();G.dev=G.dev||{};G.dev.hold=true;});
 // G1: standing 6 rings from the Stronghold with 1 teammate hex in the ring
 const g1=await ev(async()=>{const s=myBases15()[0],[q,r]=idQR(s);let here=null,mate=null;
   for(const x of hexRing(q,r,6)){if(hexDist(x.id,s)!==6)continue;const ring=hexRing(...idQR(x.id),1).map(y=>y.id).filter(y=>y!==x.id);if(ring.some(y=>factionAt(y)||enemyAt(y)||P.tiles[y]))continue;here=x.id;mate=ring[0];break;}
   S11.mate([mate]);G.pos=S11.ll(here);UI.build();await new Promise(r=>setTimeout(r,400));const txt=document.getElementById('modalBody').textContent;
   let ring=0,red=0;map.eachLayer(l=>{if(l instanceof L.Polygon&&l.options.color==='#5fd068'&&l.options.weight===2.5&&!l.options.className)ring++;if(l instanceof L.Polygon&&l.options.color==='#d63a2a'&&l.options.dashArray==='6 4')red++;});
   const p0=map.latLngToContainerPoint(S11.ll(here)),top=document.getElementById('modalBody').getBoundingClientRect().top;
   return{txt:(txt.match(/Will claim[^B⛺🏡]*/g)||[]).join(' | '),ring,red,y:Math.round(p0.y),top:Math.round(top),here};});
 ok(/Will claim 6 of 7 · skips 1 \(Wife's\)/.test(g1.txt)&&g1.ring===6&&g1.red===1&&g1.y<g1.top,'G1: Build menu row reads "Will claim 6 of 7 · skips 1 (Wife\'s)" and the ring is drawn above the sheet',g1);
 await p.screenshot({path:SHOT+'s11d-build-430.png'});
 const g1c=await ev(async()=>{UI.closeModal();await new Promise(r=>setTimeout(r,200));let ring=0;map.eachLayer(l=>{if(l instanceof L.Polygon&&l.options.color==='#d63a2a'&&l.options.dashArray==='6 4')ring++;});return ring;});
 ok(g1c===0,'G1: closing the menu removes the preview');
 // G2: standing 12 mi from all bases, 4 of my hexes unpaid within 10 mi of here
 const g2=await ev(async()=>{const a=S11.ll(myBases15()[0]);const here=hexAt(a[0]-12*1609.34/111320,a[1]).id;const [q,r]=idQR(here);hexRing(q,r,8).filter(y=>hexDist(y.id,here)===8).slice(0,4).forEach(y=>P.tiles[y.id]={t:Date.now()});save();supplyBust64();
   G.pos=S11.ll(here);UI.build();await new Promise(r=>setTimeout(r,300));const t=document.getElementById('modalBody').textContent;UI.closeModal();
   return{op:/Brings 4 unpaid hexes back into pay after the 60-min hold\./.test(t),home:/Brings 4 unpaid hexes back into pay as soon as it's placed\./.test(t)};});
 ok(g2.op&&g2.home,'G2: Outpost row "…after the 60-min hold.", Home row "…as soon as it\'s placed."',g2);
 // H1: an outpost whose ring holds 1 teammate hex: claimed 5, skipped 1 (Wife's)
 const h1=await ev(async()=>{const id=hexAt(...S11.SPOK).id,[q,r]=idQR(id);const ring=hexRing(q,r,1).map(y=>y.id).filter(y=>y!==id);
   const mate=ring.find(y=>!factionAt(y)&&!enemyAt(y));S11.mate([mate]);for(const y of ring)if(y!==mate&&(factionAt(y)||enemyAt(y)))W().enemyTaken[y]=1;
   G.pos=S11.ll(id);placeOutpost(id);const o=W().outposts[id];if(!o)return{err:'not placed',why:window.__t.slice(-2)};const n0=Object.keys(P.tiles).length;o.endsAt=Date.now()-1;UI.closeModal();await new Promise(r=>setTimeout(r,2100));
   outpostTick();await new Promise(r=>setTimeout(r,300));const card=document.getElementById('modalBody').textContent,facts=[...document.querySelectorAll('#modalBody .big26>div')].map(d=>d.textContent);
   const log=W().reports.find(x=>/Outpost up at/.test(x.text));window._h1=id;
   return{grew:Object.keys(P.tiles).length-n0,log:log&&log.text,facts,card:card.slice(0,240),op64:(P.op64||[]).length,cap:o.cap64&&{c:o.cap64.claimed.length,s:o.cap64.skipped.length,a:o.cap64.already}};});
 ok(h1.grew===5&&/claimed 5, skipped 1 \(Wife's\)/.test(h1.log||'')&&h1.facts[0]==='5new hexes'&&h1.facts[1]==='6 of 7holds'&&/Skipped 1: held by Wife\./.test(h1.card),'H1: P.tiles grew by exactly 5, log "claimed 5, skipped 1 (Wife\'s)", popup 5 new hexes / holds 6 of 7',h1);
 await p.screenshot({path:SHOT+'s11d-popup-430.png'});
 const h1r=await ev(async()=>{UI.closeModal();UI._rf1='bases';UI.reports26();await new Promise(r=>setTimeout(r,200));const rows=[...document.querySelectorAll('.rp26')].map(r=>r.textContent);const tab=[...document.querySelectorAll('.rpf1 button')].map(b=>b.textContent).find(t=>/Outposts/.test(t));
   document.querySelector('.rp26').click();await new Promise(r=>setTimeout(r,200));const again=[...document.querySelectorAll('#modalBody .big26>div')].map(d=>d.textContent);return{rows,tab,again};});
 ok(h1r.rows.length===1&&/Outpost up/.test(h1r.rows[0])&&/claimed 5 · skipped 1 \(teammate\)/.test(h1r.rows[0])&&/⛺ Outposts 1/.test(h1r.tab)&&h1r.again[0]==='5new hexes','H1: 📬 Reports ⛺ Outposts tab has 1 entry and it reopens the same card',h1r);
 await p.screenshot({path:SHOT+'s11d-reports-430.png'});
 // H4: the outpost card while standing
 const h4=await ev(async()=>{UI.closeModal();const id=window._h1;UI.infoOutpost(id);await new Promise(r=>setTimeout(r,150));const t=document.getElementById('modalBody').textContent;
   const a=S11.ll(id);const N=Object.keys(P.tiles).filter(x=>{const b=S11.ll(x);return distM(a[0],a[1],b[0],b[1])<=10*1609.34;}).length;UI.closeModal();return{t:(t.match(/Holds[^.]*?paying/)||[''])[0],held:/1 held by Wife/.test(t),N};});
 ok(h4.t===`Holds 6 of its 7 hexes · keeps ${h4.N} of your hexes paying`&&h4.held,'H4: card reads "Holds 6 of its 7 hexes · keeps N of your hexes paying" with N = hexes within 10 mi, and "1 held by Wife"',h4);
 // H5: lists
 const h5=await ev(()=>{UI.open('base');UI.sub.base='outposts';UI.render();const b=document.getElementById('sheetBody').textContent;UI.close();UI.bases15();const y=document.getElementById('modalBody').textContent;UI.closeModal();
   return{hdr:/regular 1\/\d · 🏡 Home 0\/1 · 🚩 Forward 0\/2/.test(b),row:/⛺ Outpost · .*✅ standing · holds 6\/7 · keeps \d+ paying/.test(b),bases:/holds 6\/7 · keeps \d+ paying/.test(y)&&/holds \d+\/\d+ · keeps \d+ paying/.test(y)};});
 ok(h5.hdr&&h5.row&&h5.bases,'H5: Base › Outposts header and rows show kind, holds and keeps; Your bases rows too',h5);
 await p.screenshot({path:SHOT+'s11d-list-430.png'});
 // H2: two finish in one catch-up -> one combined card, 2 reports
 const h2=await ev(async()=>{const a=S11.ll(myBases15()[0]);const ids=[hexAt(a[0]+0.05,a[1]+0.05).id,hexAt(a[0]-0.05,a[1]+0.06).id];const n0=(P.op64||[]).length;
   for(const id of ids){P.tiles[id]={t:Date.now()};W().outposts[id]={state:'capturing',start:1,endsAt:Date.now()-1,hpPct:1};}await new Promise(r=>setTimeout(r,2100));outpostTick();await new Promise(r=>setTimeout(r,200));
   return{title:(document.querySelector('#modalBody h2')||{}).textContent,rows:document.querySelectorAll('#modalBody .row').length,added:P.op64.length-n0};});
 ok(/2 outposts finished while you were away/.test(h2.title||'')&&h2.rows===2&&h2.added===2,'H2: two finishing together: one combined card, 2 report entries',h2);
 // H3: failure
 const h3=await ev(async()=>{UI.closeModal();const a=S11.ll(myBases15()[0]);const id=hexAt(a[0]+0.07,a[1]-0.05).id;W().outposts[id]={state:'capturing',start:1,endsAt:Date.now()+3e6,hpPct:1};delete P.tiles[id];await new Promise(r=>setTimeout(r,2100));outpostTick();await new Promise(r=>setTimeout(r,200));
   return{title:(document.querySelector('#modalBody h2')||{}).textContent,body:document.getElementById('modalBody').textContent,rep:P.op64[0]};});
 ok(/Outpost capture failed/.test(h3.title||'')&&/taken during the 60-min hold/.test(h3.body)&&h3.rep.ok===false,'H3: a failed capture gets a failure card and a failure report',{title:h3.title,ok:h3.rep.ok});
 // H6: 14-day prune and 60 cap apply to P.op64
 const h6=await ev(()=>{UI.closeModal();P.op64.push({t:Date.now()-15*864e5,hex:window._h1,kind:'op',ok:true,claimed:1,skipped:[],already:0,revived:0,keeps:1});for(let i=0;i<70;i++)P.op64.push({t:Date.now()-i,hex:window._h1,kind:'op',ok:true,claimed:1,skipped:[],already:0,revived:0,keeps:1});prune1();return{n:P.op64.length,old:P.op64.some(r=>r.t<Date.now()-14*864e5)};});
 ok(h6.n===60&&!h6.old,'H6: 14-day prune and 60 cap apply to P.op64',h6);
 // queueing: a result while another card is open waits in the card bar
 const q=await ev(async()=>{UI.info({title:'Other card',body:'x',buttons:[]});const a=S11.ll(myBases15()[0]);const id=hexAt(a[0]-0.08,a[1]-0.03).id;P.tiles[id]={t:Date.now()};W().outposts[id]={state:'capturing',start:1,endsAt:Date.now()-1,hpPct:1};outpostTick();
   const title=(document.querySelector('#modalBody h2')||{}).textContent,qn=CARD1.queue.length,lab=(CARD1.queue[CARD1.queue.length-1]||{}).label;UI.closeModal();await new Promise(r=>setTimeout(r,200));cardNext1();await new Promise(r=>setTimeout(r,200));
   return{title,qn,lab,after:(document.querySelector('#modalBody h2')||{}).textContent};});
 ok(/Other card/.test(q.title)&&q.qn>=1&&/⛺ Outpost up/.test(q.lab)&&/Outpost up/.test(q.after),'a result while another card is open waits in the queue as "⛺ Outpost up"',q);
 // I1: marker at every zoom the map allows, outline at 13+
 const i1=await ev(async()=>{UI.closeModal();const id=window._h1;const out={};for(const z of [13,14,16]){map.setView(S11.ll(id),z,{animate:false});drawWorld();await new Promise(r=>setTimeout(r,250));let ol=0;G.layers.terr.eachLayer(l=>{if(l.options&&l.options.className==='oprange')ol++;});out[z]={mk:[...document.querySelectorAll('.ico.op')].length,ol};}
   return{out,minZoom:map.getMinZoom(),lbl:[...document.querySelectorAll('.ico.op b.lv')].map(b=>b.textContent)};});
 ok(Object.values(i1.out).every(x=>x.mk>=1&&x.ol>=7)&&i1.lbl.includes('OUTPOST'),'I1: the ⛺ marker and the 7-hex outline show at every zoom the map allows (13+), label shows the kind',i1);
 console.log('errors:',errs.length,errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');
});
