// R6.4 §2: unpaid hexes on the map (A1-A4), the "📍 Show them" bar (B1-B3), the hex card (C1-C3), the reset line (D1),
// and no warning when claiming far out (§7b).
const lib=require('./s11-lib.js');
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const SHOT='/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/';
 await p.setViewportSize({width:430,height:900});await lib(p);
 // A3 first: no bases -> nothing amber
 const a3=await ev(()=>{const ids=S11.disc(S11.SPOK,1);map.setView(S11.ll(ids[0]),15,{animate:false});S11.redraw();return{n:S11.amber(),u:unpaid64().length};});
 ok(a3.n===0&&a3.u===0,'A3: no Stronghold or outposts -> no hex is amber',a3);
 // A1: Stronghold at Rathdrum, 7 hexes near Spokane (~27 mi)
 const a1=await ev(async()=>{S11.sh(S11.RATH);S11.redraw();await new Promise(r=>setTimeout(r,300));const sp=Object.keys(P.tiles).filter(id=>!isBase15(id)&&nearestBaseMi64(id)>20);
   const rt=[...document.querySelectorAll('.ico.rt.own')];const un=rt.filter(e=>e.classList.contains('unpaid64'));
   return{n:S11.amber(),sp:sp.length,badgesUnpaid:un.length,unpaidNums:un.filter(e=>e.querySelector('b.lv')).length,unpaidBox:un.every(e=>e.textContent.trim()==='📦'),res:sp.filter(id=>tileInfo(id).res).length};});
 ok(a1.n===a1.sp&&a1.sp===7&&a1.badgesUnpaid===a1.res&&a1.unpaidNums===0&&a1.unpaidBox,'A1: the 7 far hexes get an amber dashed border; resource ones show 📦 with no +N',a1);
 const a1b=await ev(async()=>{map.setView(S11.RATH,15,{animate:false});S11.redraw();await new Promise(r=>setTimeout(r,200));const own=[...document.querySelectorAll('.ico.rt.own')];return{amber:S11.amber(),plus:own.filter(e=>!e.classList.contains('unpaid64')&&/\+\d/.test(e.textContent)).length,own:own.length};});
 ok(a1b.amber===0&&(a1b.own===0||a1b.plus===a1b.own),'A1: Rathdrum hexes unchanged (+N badges, no amber)',a1b);
 await ev(()=>{map.setView(S11.SPOK,15,{animate:false});S11.redraw();});await p.waitForTimeout(300);await p.screenshot({path:SHOT+'s11-unpaid-430.png'});
 // C1: the hex card of an unpaid resource hex
 const c1=await ev(async()=>{let id=Object.keys(P.tiles).find(x=>unpaidSet64().has(x)&&tileInfo(x).res);if(!id){const c=hexAt(...S11.SPOK);for(const x of hexRing(c.q,c.r,4)){if(tileInfo(x.id).res){P.tiles[x.id]={t:Date.now()};id=x.id;break;}}save();S11.redraw();}
   window._c1=id;UI.infoTile(id);await new Promise(r=>setTimeout(r,150));const f=document.querySelector('#modalBody .big26>div'),n=document.querySelector('#modalBody .sup64n');
   const more=document.querySelector('#modalBody details.more26');return{fact:f&&f.textContent,note:n&&n.textContent,outside:!!n&&!n.closest('details'),moreTxt:more&&more.textContent.match(/Would yield[^.]*\./)?.[0]};});
 ok(c1.fact&&/📦 Not paying/.test(c1.fact)&&/2[0-9] mi from nearest base/.test(c1.fact)&&/pays nothing at the reset/.test(c1.note||'')&&c1.outside&&/within 10 mi of one of your bases/.test(c1.moreTxt||''),'C1: card reads 📦 Not paying / NN mi from nearest base, note outside ⓘ More, yield line reworded',c1);
 await p.screenshot({path:SHOT+'s11-card-430.png'});await ev(()=>UI.closeModal());
 // C2: a paying Rathdrum hex card has none of it
 const c2=await ev(async()=>{const id=Object.keys(P.tiles).find(x=>!unpaidSet64().has(x)&&!isBase15(x))||shAreaIds().find(x=>x!==W().sh.hex);UI.infoTile(id);await new Promise(r=>setTimeout(r,150));
   const f=document.querySelector('#modalBody .big26>div');const r={fact:f&&f.textContent,note:!!document.querySelector('#modalBody .sup64n')};UI.closeModal();return r;});
 ok(!c2.note&&!/📦/.test(c2.fact||''),'C2: a paying hex card is unchanged',c2);
 // C3: unpaid hex in a fortified zone: "Bonus only", and the reset still adds round(yield x 0.5)
 const c3=await ev(async()=>{const id=window._c1,t=tileInfo(id);const g0=grossIncome()[t.res];const keep=zoneFortified;zoneFortified=x=>x===id;const g1=grossIncome()[t.res];
   UI.infoTile(id);await new Promise(r=>setTimeout(r,150));const f=document.querySelector('#modalBody .big26>div').textContent,n=document.querySelector('#modalBody .sup64n').textContent;UI.closeModal();zoneFortified=keep;
   return{f,n,add:g1-g0,want:Math.round(t.yield*ZONE.yieldBonus)};});
 ok(/Bonus only/.test(c3.f)&&/fortified-zone bonus still pays/.test(c3.n)&&c3.add===c3.want,'C3: fortified-zone unpaid hex reads Bonus only and still earns exactly round(yield x 0.5)',c3);
 // B: two separate unpaid clusters
 const b1=await ev(async()=>{const far=[47.95,-117.35];S11.disc(far,1);S11.redraw();UI.open('base');UI.render();const b=document.querySelector('#sheetBody .sup15b');const btn=b&&b.querySelector('button');
   const txt=b&&b.textContent;payAuto64&&0;MAP4.off.payOn=false;drawPay64();const pay0=U64().payU.circles.length;btn.click();await new Promise(r=>setTimeout(r,400));
   const t1=document.getElementById('sup64bar').textContent,pay1=U64().payU.circles.length;sbStep64(1);const t2=document.getElementById('sup64bar').textContent;sbStep64(1);const t3=document.getElementById('sup64bar').textContent;
   sbDone64();await new Promise(r=>setTimeout(r,100));const gone=!document.getElementById('sup64bar'),pay2=U64().payU.circles.length;delete MAP4.off.payOn;drawPay64();
   return{txt,t1,t2,t3,gone,pay0,pay1,pay2,sheet:document.getElementById('sheet').classList.contains('hidden')};});
 ok(/📍 Show them/.test(b1.txt)&&/1 of 2/.test(b1.t1)&&/2 of 2/.test(b1.t2)&&/1 of 2/.test(b1.t3)&&b1.gone&&b1.sheet,'B1: Show them -> 1 of 2, ▶ 2 of 2, ▶ wraps to 1 of 2, Done closes',b1);
 ok(b1.pay0===0&&b1.pay1>0&&b1.pay2===0,'B2: Pay range shows while the bar is open even with the chip off, and is off again after Done',b1);
 await ev(async()=>{showUnpaid64();});await p.waitForTimeout(400);await p.screenshot({path:SHOT+'s11-showbar-430.png'});await ev(()=>sbDone64());
 // D1: the reset line
 const d1=await ev(async()=>{const n=supplyCount15().off;await payReset('test');const r=W().reports.find(x=>/Daily reset/.test(x.text));return{n,txt:r&&r.text};});
 ok(d1.n>0&&new RegExp(`· ${d1.n} hexes didn't pay \\(over 10 mi from a base\\)$`).test(d1.txt||''),'D1: the reset line ends with "· N hexes didn\'t pay (over 10 mi from a base)"',d1);
 // territory note
 const tn=await ev(()=>{UI.open('base');UI.sub.base='terr';UI.render();return(document.querySelector('.sup64t')||{}).textContent;});ok(/aren't in these numbers/.test(tn||''),'Territory table note',tn);
 // A2: an outpost within 10 mi of Spokane finishes -> those hexes pay again
 const a2=await ev(async()=>{UI.close();const id=S11.at(S11.SPOK,3,0);P.tiles[id]={t:Date.now()};W().outposts=W().outposts||{};W().outposts[id]={state:'capturing',start:Date.now()-4e6,endsAt:Date.now()-1,hpPct:1};
   const before=unpaid64().filter(x=>nearestBaseMi64(x)>0&&hexDist(x,hexAt(...S11.SPOK).id)<=4).length;outpostTick();try{UI.closeModal();}catch(e){}map.setView(S11.SPOK,15,{animate:false});drawWorld();await new Promise(r=>setTimeout(r,200));
   const near=Object.keys(P.tiles).filter(x=>hexDist(x,hexAt(...S11.SPOK).id)<=4);return{before,after:near.filter(x=>unpaidSet64().has(x)).length,amber:S11.amber()};});
 ok(a2.before>=7&&a2.after===0,'A2: after the outpost is up, the Spokane hexes are no longer unpaid',a2);
 // B3: every hex pays -> no banner
 const b3=await ev(()=>{for(const id of unpaid64())delete P.tiles[id];save();supplyBust64();UI.open('base');UI.render();return!!document.querySelector('.sup15b');});ok(!b3,'B3: no banner when every hex pays');
 // §7b: claiming 20 mi out shows no supply toast
 const nt=await ev(async()=>{UI.close();window.__t=[];const id=hexAt(47.55,-117.15).id;claimTile(id);await new Promise(r=>setTimeout(r,300));return window.__t.filter(t=>/10 mi|supply|pay/i.test(t));});
 ok(nt.length===0,'§7b: claiming far from every base shows no warning toast',nt);
 // A4: draw time with 2,000 owned hexes at zoom 13, with vs without the unpaid styling
 const a4=await ev(()=>{const c=hexAt(...S11.SPOK);for(const x of hexRing(c.q,c.r,26))P.tiles[x.id]={t:Date.now()};map.setView(S11.SPOK,13,{animate:false});supplyBust64();unpaid64();
   const t=f=>{const a=performance.now();for(let i=0;i<6;i++)drawWorld();return(performance.now()-a)/6;};const keep=window.unpaidSet64;t();const on=t();window.unpaidSet64=null;t();const off=t();window.unpaidSet64=keep;
   return{n:Object.keys(P.tiles).length,on:+on.toFixed(1),off:+off.toFixed(1)};});
 ok(a4.n>=2000&&a4.on<=a4.off*1.1+2,'A4: drawWorld with 2,000 hexes within 10% of no-styling',a4);
 console.log('errors:',errs.length,errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');
});
