// R4.1: a teammate's Stronghold hex (Stronghold art + ally flag + ally label) keeps showing the Stronghold through
// redraws and the flag's own 5 s timer; your own dot is never hidden; zoom-12 merging doesn't change when you pan;
// the pipeline truck never rebuilds the badge.
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();const c=hexAt(47.7796,-116.8923);const [q,r]=idQR(c.id);const hx=hexRing(q,r,6)[0].id;G._gh=hx;
   G.al=G.al||{};G.al.members=G.al.members||{};G.al.members.graceTest={name:'Grace',color:'#e05aa0',base:hx,defs:[{k:'sh',hex:hx,lv:1,hp:1,r:2}]};
   map.setView(hexCenter(...idQR(hx)),15,{animate:false});drawWorld();drawAllyFlags();});
 const shVis=()=>ev(()=>{const h=G._gh;let v=0,n=0;G.layers.sh26&&G.layers.sh26.eachLayer(l=>{if(!(l instanceof L.Marker))return;const ll=l.getLatLng(),k=hexAt(ll.lat,ll.lng).id;if(k!==h)return;n++;const e=l.getElement();if(e&&getComputedStyle(e).display!=='none')v++;});return{n,v};});
 const seen=[];for(let i=0;i<16;i++){if(i%3===0)await ev(()=>drawWorld());if(i%5===2)await ev(()=>drawAllyFlags());await p.waitForTimeout(i%2?50:700);seen.push(await shVis());}
 ok(seen.every(s=>s.n>=1&&s.v===s.n),'teammate Stronghold art visible through 16 samples of redraws and flag redraws',seen.map(s=>s.v+'/'+s.n).join(' '));
 const fl=await ev(()=>{let v=0;G.layers.allyFlags.eachLayer(l=>{const e=l.getElement();if(e&&getComputedStyle(e).display!=='none')v++;});return v;});
 ok(fl===0,'duplicate ally flag on that hex is tucked behind the Stronghold',fl);
 const me=await ev(()=>{G.layers.mark=G.layers.mark||L.layerGroup().addTo(map);if(!map.hasLayer(meMarker))meMarker.setLatLng(hexCenter(...idQR(G._gh))).addTo(map);const ll=meMarker.getLatLng();L.marker(ll,{icon:L.divIcon({className:'t41pin',html:'<div>📍</div>',iconSize:[20,20]})}).addTo(G.layers.mark);map.setView(ll,16,{animate:false});tidy4();const e=meMarker.getElement();return e?getComputedStyle(e).display:'none-el';});
 ok(me!=='none'&&me!=='none-el','your own dot shows on a hex with a pin',me);
 const pan=await ev(async()=>{map.setView(hexCenter(...idQR(G._gh)),12,{animate:false});const out=[];for(let i=0;i<6;i++){map.panBy([9,0],{animate:false});tidy4();out.push([...document.querySelectorAll('.b4 span')].map(x=>x.textContent).sort().join(','));}return out;});
 ok(pan.every(x=>x===pan[0]),'zoom 12: merged counts do not change while panning',pan);
 const tr=await ev(async()=>{map.setView(hexCenter(...idQR(G._gh)),15,{animate:false});G.layers.van26=G.layers.van26||L.layerGroup().addTo(map);G.layers.mons=G.layers.mons||L.layerGroup().addTo(map);const ll=hexCenter(...idQR(G._gh));
   L.marker(ll,{icon:L.divIcon({className:'',html:'<div>👾</div>',iconSize:[20,20]})}).addTo(G.layers.mons);let made=0;const o=L.Marker.prototype.onAdd;L.Marker.prototype.onAdd=function(m){if(this._b4)made++;return o.call(this,m);};tidy4();made=0;
   for(let i=0;i<5;i++){G.layers.van26.clearLayers();L.marker([ll[0]+i*4e-5,ll[1]],{icon:L.divIcon({className:'',html:'<div class="vanstack26">🚚</div>',iconSize:[20,20]})}).addTo(G.layers.van26);tidy4();}
   L.Marker.prototype.onAdd=o;const e=document.querySelector('.vanstack26').parentElement;return{made,truck:getComputedStyle(e).display};});
 ok(tr.made===0&&tr.truck!=='none','moving pipeline truck: shown, no badge rebuilds',tr);
 console.log('errors:',errs.length,errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');
});
