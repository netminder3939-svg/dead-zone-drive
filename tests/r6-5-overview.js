// R6.5 part B (spec §13): zoom out to 10; overview at 10-12 shows only the pay range and base pins; 13+ unchanged.
const lib=require('./s11-lib.js');
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const SHOT='/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/';
 await p.setViewportSize({width:360,height:640});await lib(p);await p.waitForTimeout(1200);
 await ev(async()=>{G.dev=G.dev||{};G.dev.hold=true;S11.sh(S11.RATH);S11.disc(S11.SPOK,1);const o=hexAt(47.75,-117.0).id;P.tiles[o]={t:1};W().outposts={[o]:{state:'up',kind:'home',start:1,endsAt:1,hpPct:1}};
   G.al=G.al||{};G.al.members=G.al.members||{};const kay={name:'Kay',color:'#4ad7ff',defs:[{k:'sh',hex:hexAt(47.70,-116.80).id,lv:8}],lastActive:1};G.al.members.u9=kay;save();supplyBust64();
   // the local alliance feed replaces G.al.members now and then: keep the test ally (same object, so nothing looks changed)
   setInterval(()=>{G.al=G.al||{};G.al.members=G.al.members||{};if(G.al.members.u9!==kay)G.al.members.u9=kay;},50);});
 const at=async z=>{await ev(async z=>{map.setView(S11.RATH,z,{animate:false});await new Promise(r=>setTimeout(r,500));},z);};
 // limits
 const lim=await ev(()=>{map.setZoom(5,{animate:false});const z=map.getZoom();return{min:map.getMinZoom(),max:map.getMaxZoom(),z};});
 ok(lim.min===10&&lim.max===18&&lim.z===10,'the map zooms down to 10 and no further (max stays 18, set by fix5.js)',lim);
 // at 10 a base's whole pay range fits a 360x640 phone
 await at(10);const fit=await ev(()=>{const u=U64().payU;const [lat,lng,rm]=u.circles[0];const p0=map.latLngToContainerPoint([lat,lng]),e=map.latLngToContainerPoint([lat,lng+rm/(111320*Math.cos(lat*Math.PI/180))]);return{diam:Math.round(2*Math.abs(e.x-p0.x)),w:innerWidth};});
 ok(fit.diam<=fit.w,'at 10 one base\'s full 20 mi pay range fits a 360 px phone',fit);
 // overview content
 const ovc=async()=>ev(()=>{const on=k=>!!G.layers[k]&&map.hasLayer(G.layers[k]);const polys=[];map.eachLayer(l=>{if(l instanceof L.Polygon)polys.push(1);});
   return{z:map.getZoom(),ov:OV65.on,hex:on('hex'),terr:on('terr'),mons:on('mons'),lm:on('lm'),pay:on('pay64'),pins:[...document.querySelectorAll('.pin65w')].map(e=>e.className.replace('pin65w ','')),polys:polys.length,
     markers:[...document.querySelectorAll('.leaflet-marker-icon')].filter(e=>!e.querySelector('.pin65w')&&!e.querySelector('.me-dot')).length,payCircles:U64().payU.circles.length,chip:(document.getElementById('ov65chip')||{}).textContent||''};});
 const o10=await ovc();await p.screenshot({path:SHOT+'r65-ov10.png'});
 await at(12);const o12=await ovc();
 ok([o10,o12].every(o=>o.ov&&!o.hex&&!o.terr&&!o.mons&&!o.lm&&o.pay&&o.polys===0&&o.markers===0&&o.payCircles>=2&&o.pins.length===3),'10-12: no hexes or markers; the gold pay range plus 3 pins (your Stronghold, your outpost, Kay\'s Stronghold)',{o10,o12});
 ok(/7 hexes outside pay range — zoom in to see/.test(o10.chip),'unpaid hexes summarised in a chip',o10.chip);
 await at(13);const o13=await ovc();
 ok(!o13.ov&&o13.hex&&o13.terr&&o13.lm&&o13.pins.length===0&&o13.polys>0&&!o13.chip,'13: hex layers back, no pins, no chip',o13);
 // crossing 12<->13 ten times: no leftovers
 const cross=await ev(async()=>{for(let i=0;i<10;i++){map.setView(S11.RATH,12,{animate:false});await new Promise(r=>setTimeout(r,60));map.setView(S11.RATH,13,{animate:false});await new Promise(r=>setTimeout(r,60));}
   await new Promise(r=>setTimeout(r,400));const keys=Object.keys(G.layers).filter(k=>G.layers[k]&&G.layers[k].eachLayer);const off=keys.filter(k=>k!=='ov65'&&!map.hasLayer(G.layers[k]));
   map.setView(S11.RATH,12,{animate:false});await new Promise(r=>setTimeout(r,300));let polys=0;map.eachLayer(l=>{if(l instanceof L.Polygon)polys++;});const pins=document.querySelectorAll('.pin65w').length;
   map.setView(S11.RATH,13,{animate:false});await new Promise(r=>setTimeout(r,300));return{offAt13:off,polysAt12:polys,pinsAt12:pins,pinsAt13:document.querySelectorAll('.pin65w').length,ov:OV65.on};});
 ok(cross.offAt13.length===0&&cross.polysAt12===0&&cross.pinsAt12===3&&cross.pinsAt13===0&&!cross.ov,'12↔13 ten times: no leftover layers or pins',cross);
 // still-map probe at 10, 11, 12, 13: 0 adds / 0 removals over 4 s (after the map settles)
 const still=[];for(const z of [10,11,12,13]){still.push(await ev(async z=>{map.setView(S11.RATH,z,{animate:false});await new Promise(r=>setTimeout(r,3500));const pane=map.getPane('mapPane');let add=0,rem=0;const who=[];
   const mo=new MutationObserver(ms=>{for(const m of ms){add+=m.addedNodes.length;rem+=m.removedNodes.length;[...m.addedNodes,...m.removedNodes].forEach(n=>who.push(String((n.className&&n.className.baseVal!==undefined?n.className.baseVal:n.className)||n.nodeName).slice(0,30)+'|'+(n.innerHTML||'').slice(0,30)));}});mo.observe(pane,{childList:true,subtree:true});await new Promise(r=>setTimeout(r,4000));mo.disconnect();return{z:map.getZoom(),add,rem,who:who.slice(0,6)};},z));}
 ok(still.slice(0,3).every(s=>s.add===0&&s.rem===0),'still-map probe: 0 added / 0 removed over 4 s at 10, 11 and 12',still.slice(0,3));
 console.log('INFO zoom 13 (unchanged from R6.4.1: the 10 s territory refresh redraws the hexes the same way there):',JSON.stringify({add:still[3].add,rem:still[3].rem}));
 // taps in overview never open a hex card; a pin opens its base's card
 const tap=await ev(async()=>{map.setView(S11.RATH,11,{animate:false});await new Promise(r=>setTimeout(r,300));UI.closeModal();const n0=Object.keys(P.tiles).length;
   const ev0={latlng:L.latLng(S11.SPOK[0]+.01,S11.SPOK[1]+.01),containerPoint:L.point(100,100),layerPoint:L.point(100,100)};map.fire('preclick',ev0);map.fire('click',ev0);await new Promise(r=>setTimeout(r,300));const hidden=document.getElementById('modal').classList.contains('hidden');
   let fired=0;G.layers.ov65.eachLayer(m=>{if(!fired&&m.getElement&&m.getElement()&&m.getElement().querySelector('.k-op')){m.fire('click');fired=1;}});await new Promise(r=>setTimeout(r,300));
   const title=(document.querySelector('#modalBody h2')||{}).textContent;UI.closeModal();return{hidden,claimed:Object.keys(P.tiles).length-n0,title};});
 ok(tap.hidden&&tap.claimed===0&&/Outpost/.test(tap.title||''),'overview: tapping the map opens nothing and claims nothing; tapping a pin opens that base\'s card',tap);
 // pickers jump to 13 first
 const pk=await ev(async()=>{map.setView(S11.RATH,11,{animate:false});await new Promise(r=>setTimeout(r,300));pick15('fwd');const mid=G.pick15||null;await new Promise(r=>setTimeout(r,1500));const r={before:mid,z:map.getZoom(),pick:G.pick15,ov:OV65.on};G.pick15=null;return r;});
 ok(!pk.before&&pk.z===13&&pk.pick==='fwd'&&!pk.ov,'the Forward picker from overview zooms to 13 first, then opens',pk);
 // GPS recenter keeps a zoomed-out zoom
 const gps=await ev(async()=>{map.setView(S11.RATH,11,{animate:false});await new Promise(r=>setTimeout(r,200));G.gps=G.gps||{};G.gps.recenter=true;setPos(S11.RATH[0]+.001,S11.RATH[1]);await new Promise(r=>setTimeout(r,300));return map.getZoom();});
 ok(gps===11,'a GPS recenter keeps the zoomed-out zoom (no snap back)',gps);
 // Pay range off -> overview shows only the pins; hint shown once under its own key
 const pay=await ev(async()=>{G.al.members.u9={name:'Kay',color:'#4ad7ff',defs:[{k:'sh',hex:hexAt(47.70,-116.80).id,lv:8}],lastActive:Date.now()};drawPins65(true);MAP4.off.payOn=false;localStorage.setItem('wl_f4',JSON.stringify(MAP4.off));drawPay64();await new Promise(r=>setTimeout(r,200));const c=U64().payU.circles.length,pins=document.querySelectorAll('.pin65w').length;delete MAP4.off.payOn;localStorage.setItem('wl_f4',JSON.stringify(MAP4.off));drawPay64();
   return{c,pins,hintKey:localStorage.getItem('wl_ov65hint'),f4:JSON.parse(localStorage.getItem('wl_f4'))};});
 ok(pay.c===0&&pay.pins===3&&pay.hintKey==='1'&&!('ov65hint' in pay.f4),'Pay range off: overview shows only the pins; the overview hint is saved under its own key (wl_ov65hint)',pay);
 const hints=await ev(async()=>{window.__t=[];map.setView(S11.RATH,13,{animate:false});await new Promise(r=>setTimeout(r,200));map.setView(S11.RATH,11,{animate:false});await new Promise(r=>setTimeout(r,300));return window.__t.filter(t=>/Zoomed out/.test(t)).length;});
 ok(hints===0,'the overview hint shows only once',hints);
 // Show-them bar never lands in overview (R6.4 zoom 10-12 recheck)
 const sb=await ev(async()=>{map.setView(S11.RATH,11,{animate:false});await new Promise(r=>setTimeout(r,200));showUnpaid64();await new Promise(r=>setTimeout(r,500));const z=map.getZoom(),ov=OV65.on;sbDone64();return{z,ov};});
 ok(sb.z>=13&&!sb.ov,'R6.4 recheck: "📍 Show them" lands at zoom 13+, never in overview',sb);
 await at(10);await p.waitForTimeout(400);await p.screenshot({path:SHOT+'r65-ov10b.png'});
 console.log('errors:',errs.length,errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');
});
