// R4 map (updated R4.1: marches move, so they are never grouped and never hidden; they keep their own marker)
// a hex with a threat, a march, a monster and a pin shows the threat with a badge of 3 plus the march; tapping
// opens "On this hex" with 4 rows; filters hide monsters but never threats; zoomed out, nearby markers merge.
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const shot=n=>p.screenshot({path:'/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/'+n+'.png'});
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();G.pos=[47.7796,-116.8923];const c=hexAt(47.7796,-116.8923);claimTile(c.id);W().sh={hex:c.id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;save();
   const [q,r]=idQR(c.id),hx=hexRing(q,r,3)[0].id,ll=hexCenter(...idQR(hx));G._hx=hx;map.setView(ll,16);
   const mk=(layer,emoji,title)=>{G.layers[layer]=G.layers[layer]||L.layerGroup().addTo(map);const m=L.marker(ll,{icon:L.divIcon({className:'t4test',html:`<div>${emoji}</div>`,iconSize:[24,24]}),title});m.on('click',()=>{G._clicked=(G._clicked||[]).concat(title);});m.addTo(G.layers[layer]);return m;};
   mk('mons','👾','Rad Rat');mk('mark','📍','My pin');mk('march','🚩','Your march');mk('raids','⚔️','Raid on this hex');});
 await p.waitForTimeout(2500);
 const s1=await ev(()=>{const els=[...document.querySelectorAll('.t4test')];const vis=els.filter(e=>getComputedStyle(e).display!=='none').map(e=>e.textContent.trim());const b=[...document.querySelectorAll('.b4 span')].map(x=>({n:x.textContent,threat:x.classList.contains('t4')}));return{vis,b};});
 ok(s1.vis.length===2&&s1.vis.includes('⚔️')&&s1.vis.includes('🚩')&&s1.b.some(x=>x.n==='3'&&x.threat),'crowded hex: the threat shows with a red badge of 3, the march is never hidden',s1);
 await shot('r4-crowded');
 // tap the badge: list of 4, threat first
 await p.click('.b4 span');await p.waitForTimeout(400);
 const l1=await ev(()=>({h:($('#modalBody h2')||{}).textContent,rows:[...document.querySelectorAll('.h4row b')].map(b=>b.textContent)}));
 ok(l1.h==='On this hex'&&l1.rows.length===3&&/Raid/.test(l1.rows[0]),'tapping it lists all 3, threat first',l1);
 await shot('r4-list');
 // open the monster from the list: its own action runs
 await ev(()=>{const i=[...document.querySelectorAll('.h4row b')].findIndex(b=>/Rad Rat/.test(b.textContent));openH4(i);});await p.waitForTimeout(300);
 ok(await ev(()=>(G._clicked||[]).includes('Rad Rat')),'a row opens that marker\'s own action');
 await ev(()=>{try{UI.closeModal();}catch(e){}});
 // filters: hide monsters and pins; threats can't be hidden
 await p.click('#f4t');await p.click('#f4c button[data-k="monster"]');await p.click('#f4c button[data-k="pin"]');await p.waitForTimeout(400);
 const f1=await ev(()=>({b:[...document.querySelectorAll('.b4 span')].map(x=>x.textContent),locked:document.querySelector('#f4c button[data-k="threat"]').disabled,saved:localStorage.getItem('wl_f4')}));
 ok(f1.b.length===0&&f1.locked&&/monster/.test(f1.saved),'filters hide monsters and pins (only the threat left, no badge), Threats locked on, choice remembered',f1);
 await ev(()=>{MAP4.off.monster=false;MAP4.off.pin=false;localStorage.setItem('wl_f4','{}');tidy4();});
 // zoomed out: the cluster merges with a count and tapping zooms in
 await ev(()=>{map.setZoom(11);});await p.waitForTimeout(1500);const z=await ev(()=>({b:[...document.querySelectorAll('.b4 span')].map(x=>x.textContent),z:map.getZoom()}));
 ok(z.b.length>=1,'zoomed out, markers merge into a counted marker',z);
 console.log('errors:',errs.length,errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');
});
