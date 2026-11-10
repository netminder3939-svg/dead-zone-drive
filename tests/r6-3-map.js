// R6.3: the crowded-hex grouping is gone. Every marker on a crowded hex shows on its own (no number badges, no
// "On this hex" list, no zoomed-out merging) and none of them toggles hidden/shown across redraws. The 🧭 filters stay:
// they hide whole kinds (never threats) and remember the choice.
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const shot=n=>p.screenshot({path:'/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/'+n+'.png'});
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();G.pos=[47.7796,-116.8923];const c=hexAt(47.7796,-116.8923);claimTile(c.id);W().sh={hex:c.id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;save();
   const [q,r]=idQR(c.id),hx=hexRing(q,r,3)[0].id,ll=hexCenter(...idQR(hx));G._hx=hx;map.setView(ll,16);
   const mk=(layer,emoji,title)=>{G.layers[layer]=G.layers[layer]||L.layerGroup().addTo(map);const m=L.marker(ll,{icon:L.divIcon({className:'t4test',html:`<div>${emoji}</div>`,iconSize:[24,24]}),title});m.on('click',()=>{G._clicked=(G._clicked||[]).concat(title);});m.addTo(G.layers[layer]);return m;};
   mk('mons','👾','Rad Rat');mk('mark','📍','My pin');mk('march','🚩','Your march');mk('raids','⚔️','Raid on this hex');});
 await p.waitForTimeout(2500);
 const vis=()=>ev(()=>[...document.querySelectorAll('.t4test')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.textContent.trim()).sort().join(''));
 const s1=await ev(()=>({b:document.querySelectorAll('.b4').length,on:typeof openHex4}));const v1=await vis();
 ok(v1.length&&['👾','📍','🚩','⚔️'].every(e=>v1.includes(e))&&s1.b===0&&s1.on==='undefined','crowded hex: all 4 markers show, no badge, no "On this hex"',{v1,...s1});
 await shot('r63-crowded');
 // tapping a marker runs its own action
 await ev(()=>{G.layers.mons.eachLayer(l=>l.fire('click'));});ok(await ev(()=>(G._clicked||[]).includes('Rad Rat')),'tapping a marker opens its own action');
 // no flicker: 20 samples across redraws, the same markers stay shown
 const seen=[];for(let i=0;i<20;i++){await ev(()=>{try{drawWorld();}catch(e){}try{drawAllyFlags&&drawAllyFlags();}catch(e){}tidy4();});seen.push(await vis());await p.waitForTimeout(120);}
 ok(seen.every(x=>x===seen[0]),'20 redraws: nothing toggles hidden/shown',[...new Set(seen)]);
 // filters still work; threats can't be hidden; choice remembered
 await p.click('#f4t');await p.click('#f4c button[data-k="monster"]');await p.click('#f4c button[data-k="pin"]');await p.waitForTimeout(400);
 const f1=await ev(()=>({locked:document.querySelector('#f4c button[data-k="threat"]').disabled,saved:localStorage.getItem('wl_f4')}));const v2=await vis();
 ok(!v2.includes('👾')&&!v2.includes('📍')&&v2.includes('⚔️')&&v2.includes('🚩')&&f1.locked&&/monster/.test(f1.saved),'filters hide monsters and pins, threats stay, choice remembered',{v2,...f1});
 await ev(()=>{MAP4.off.monster=false;MAP4.off.pin=false;localStorage.setItem('wl_f4','{}');tidy4();});
 // zoomed out: no merged markers
 await ev(()=>{map.setZoom(11);});await p.waitForTimeout(1500);const z=await ev(()=>document.querySelectorAll('.b4').length);const v3=await vis();
 ok(z===0&&v3.length===await ev(()=>[...document.querySelectorAll('.t4test')].map(e=>e.textContent.trim()).join('').length),'zoomed out: nothing merges or hides',{z,v3});
 console.log('errors:',errs.length,errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');
});
