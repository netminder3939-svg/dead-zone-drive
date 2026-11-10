// R6.2 Hero/Gear screen (HERO-GEAR-SCREEN-SPEC v2 acceptance checklist): full-screen shell, tabs, the avatar rule,
// fallbacks, icons, slot looks, stat bar = stats(), card actions, compare notes, sizes, close paths, Stats-tab avatar.
const SHOT='/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/';
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();
  window.T6={n:0,mk(name,rar=2,up=0){const b=G3_BY_NAME[name];const g={id:'t6_'+(++this.n),name,slot:b.slot,rarity:rar,iLvl:12,up,v3:true,set:b.set||undefined};g3Apply(g);P.inv.push(g);return g;},
   wear(names){for(const sl of GEAR_SLOTS)delete P.equip[sl];for(const n of names){const g=this.mk(n);P.equip[g.slot]=g.id;}save();UI.render();},
   av(){const i=document.querySelector('.hz-fig img.avatar');return i?i.dataset.av:(document.querySelector('.hz-fig svg')?'svg':null);}};
  P.inv=P.inv.filter(g=>g.id==='starter');P.equip={weapon:'starter'};save();});
 await p.waitForTimeout(800);
 await ev(()=>{UI.open('player');UI.sub.player='gear';UI.render();});await p.waitForTimeout(600);
 // 1) shell
 const sh=await ev(()=>{const s=document.getElementById('sheet'),seg=document.querySelector('#sheetBody .hz-tabs');const r=s.getBoundingClientRect();
  return{full:s.classList.contains('hero-full'),cover:r.top<=0.5&&r.left<=0.5&&Math.abs(r.width-innerWidth)<2&&Math.abs(r.height-innerHeight)<2,tabs:getComputedStyle(document.getElementById('tabs')).display,
   x:!!document.querySelector('.hz-hdr .hz-x[aria-label="Close Hero"]'),order:[...seg.querySelectorAll(':scope>button')].map(b=>b.querySelector('span').textContent),subs:UI.SUBS.player.map(x=>x[0]),
   cur:(seg.querySelector('[aria-current=page] span')||{}).textContent,hdr:document.querySelector('.hz-hdr .ttl small').textContent,firstFocus:document.querySelector('#sheetBody button')===document.querySelector('.hz-x')};});
 ok(sh.full&&sh.cover&&sh.tabs==='none'&&sh.x,'Hero opens full screen, bottom nav hidden, ✕ in the header',sh);
 ok(sh.order.join()==='Stats,Class,Skills,Gear,Quests,Save,Buffs,Achievements'&&sh.cur==='Gear'&&sh.hdr==='GEAR'&&sh.firstFocus,'8 tabs in today\'s order, Gear active, ✕ is the first button',sh.order);
 // 2) avatar rule
 const A=async(names)=>{await ev(n=>T6.wear(n),names);await p.waitForTimeout(150);return ev(()=>T6.av());};
 const none=await A([]);ok(none==='base','nothing equipped -> base',none);
 ok(await A(['Welding Mask','Tire Vest','Patched Jeans','Work Boots'])==='base','basics only -> base');
 ok(await A(['Gas Mask','Hazmat Coat','Hazmat Pants','Runner Sneakers'])==='base','3 Hazmat + 1 Runner -> base');
 const hz=await A(['Gas Mask','Hazmat Coat','Hazmat Pants','Rubber Boots','Pipe Wrench','Dog Tags']);
 const hzInfo=await ev(()=>({alt:document.querySelector('.hz-fig img').alt,look:document.querySelector('.hz-name small').textContent}));
 ok(hz==='hazmat'&&/Hazmat outfit/.test(hzInfo.alt)&&/Hazmat look/.test(hzInfo.look),'4 Hazmat -> hazmat figure, alt and "Hazmat look"',hzInfo);
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);await p.screenshot({path:SHOT+'r62-hazmat-390.png'});
 const off=await ev(()=>{UI.unequip('boots');return T6.av();});ok(off==='base','take off the boots -> base');
 for(const [set,names] of Object.entries({runner:['Runner Cap','Runner Jacket','Track Pants','Runner Sneakers'],pathfinder:['Scout Goggles','Long Duster','Cargo Pants','Trail Boots'],foreman:['Hard Hat','Work Vest','Knee-Pad Carhartts','Steel-Toe Boots'],warlord:['Skull Helm','Spiked Plate','Chain Kilt','Stomper Boots']})){
  const a=await A(names);ok(a===set,`4 ${set} -> ${set} figure`,a);await p.screenshot({path:SHOT+'r62-'+set+'.png'});}
 const road=await A(['Hubcap Helm','Road-Sign Plate','Tire Greaves','Tread Boots']);
 const roadLook=await ev(()=>document.querySelector('.hz-name small').textContent);
 ok(road==='base'&&/Complete a set/.test(roadLook),'4 Road Warrior -> base while road.png is off',{road,roadLook});
 const road2=await ev(()=>{GEAR_ART.avatars.road={png:true,img:'assets/gear/avatars/runner.webp',fallback:'assets/gear/avatars/runner.png'};UI.render();const a=T6.av();GEAR_ART.avatars.road.png=false;GEAR_ART.avatars.road.img='assets/gear/avatars/road.webp';GEAR_ART.avatars.road.fallback='assets/gear/avatars/road.png';UI.render();return a;});
 ok(road2==='road','with a road figure switched on in the manifest -> road (no code change)');
 const same=await ev(()=>{T6.wear(['Gas Mask','Hazmat Coat','Hazmat Pants','Rubber Boots']);const a=T6.av();for(const sl of ['head','chest','legs','boots']){const g=P.inv.find(x=>x.id===P.equip[sl]);g.up=10;g.rarity=4;g3Apply(g);}
   const w=T6.mk('Machete',4,7);P.equip.weapon=w.id;const t=T6.mk('Rabbit Foot',1);P.equip.trinket=t.id;save();UI.render();return[a,T6.av()];});
 ok(same[0]==='hazmat'&&same[1]==='hazmat','upgrade level, rarity, weapon and trinket never change the figure',same);
 // 3) fallbacks
 const fb=await ev(async()=>{const A=GEAR_ART.avatars.hazmat,keep={...A};A.img='assets/gear/avatars/nope.webp';UI.render();await new Promise(r=>setTimeout(r,700));const a=document.querySelector('.hz-fig img').getAttribute('src');
   A.fallback='assets/gear/avatars/nope.png';UI.render();await new Promise(r=>setTimeout(r,900));const b=document.querySelector('.hz-fig img').getAttribute('src');Object.assign(A,keep);
   const all=GEAR_ART;GEAR_ART={};UI.render();const svg=!!document.querySelector('.hz-fig svg.doll3');GEAR_ART=all;UI.render();return{a,b,svg};});
 ok(/hazmat\.png$/.test(fb.a)&&/base\.(webp|png)$/.test(fb.b)&&fb.svg,'missing avatar -> its PNG, then base; no manifest -> the R6.1 SVG survivor',fb);
 const ic=await ev(async()=>{const it=Object.entries(GEAR_ART).filter(([k,v])=>v&&v.slot);const res=await Promise.all(it.map(([k,v])=>new Promise(r=>{const i=new Image();i.onload=()=>r([k,i.naturalWidth]);i.onerror=()=>r([k,0]);i.src=v.icon;})));
   const bad=res.filter(([,w])=>!w).map(([k])=>k);const g=P.inv.find(x=>x.id===P.equip.head);const keep=GEAR_ART[g.art].icon,kf=GEAR_ART[g.art].iconFallback;GEAR_ART[g.art].icon='assets/gear/icons/nope.webp';GEAR_ART[g.art].iconFallback='assets/gear/icons/nope.png';UI.render();
   await new Promise(r=>setTimeout(r,900));const emo=(document.querySelector('.hz-slot[data-slot=head] .hz-emo')||{}).textContent;GEAR_ART[g.art].icon=keep;GEAR_ART[g.art].iconFallback=kf;UI.render();
   const wt=getComputedStyle(document.querySelector('.hz-slot[data-slot=weapon] img')).transform;return{n:res.length,bad,emo,wt};});
 ok(ic.n===39&&!ic.bad.length,'all 39 items have a loading icon',ic);ok(ic.emo==='⛑️'&&ic.wt!=='none','missing icon -> slot emoji; weapon icon shown rotated',ic);
 // 4) slots
 const sl=await ev(()=>{const h=document.querySelector('.hz-slot[data-slot=head]'),w=document.querySelector('.hz-slot[data-slot=weapon]');const g=P.inv.find(x=>x.id===P.equip.head);
   const hex=c=>{const m=c.match(/\d+/g).map(Number);return'#'+m.slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');};
   const o={border:hex(getComputedStyle(h).borderTopColor),want:RARITY[g.rarity].color.toLowerCase(),up:(h.querySelector('.up')||{}).textContent,wup:(w.querySelector('.up')||{}).textContent,dot:!!h.querySelector('.set'),label:h.getAttribute('aria-label'),size:[h.offsetWidth,h.offsetHeight]};
   delete P.equip.legs;UI.render();const e=document.querySelector('.hz-slot[data-slot=legs]');
   return{...o,empty:e.classList.contains('empty')&&getComputedStyle(e).borderTopStyle==='dashed'&&e.getAttribute('aria-label')==='Legs: empty'};});
 ok(sl.border===sl.want&&sl.up==='MAX'&&sl.wup==='+7'&&sl.dot&&/Head: Gas Mask \+10, Legendary, Hazmat set/.test(sl.label)&&sl.empty&&sl.size[0]>=76&&sl.size[1]>=90,'slot looks: rarity border, +N / MAX, set dot, labels, dashed empty slot, ≥76x90',sl);
 // 5) stat bar = stats() = breakdown total
 const st=await ev(()=>{const s=stats(),bar=[...document.querySelectorAll('.hz-st b')].map(b=>+b.textContent);UI.statBreak();const tot=[...document.querySelectorAll('.statbrk tr.tot td[data-k]')].map(t=>+t.textContent);UI.closeModal();return{s:STAT_K.map(k=>s[k]),bar,tot};});
 ok(JSON.stringify(st.s)===JSON.stringify(st.bar)&&JSON.stringify(st.bar)===JSON.stringify(st.tot),'stat bar = stats() = the breakdown Total row',st);
 // 6) card: take off, upgrade (cost = upCost), swap, empty slot, compare
 const cd=await ev(async()=>{P.inv=P.inv.filter(g=>g.id==='starter');T6.wear(['Gas Mask','Hazmat Coat','Hazmat Pants','Rubber Boots','Pipe Wrench']);const g=P.inv.find(x=>x.id===P.equip.head);T6.mk('Runner Cap',1);T6.mk('Scout Goggles',3);
   UI.gearSlot='head';UI.render();const c=upCost(g);P.res.scrap=5000;P.res.parts=500;const s0=P.res.scrap,p0=P.res.parts,u0=g.up||0;
   const up=[...document.querySelectorAll('.hz-card .cb')].find(b=>/UPGRADE/.test(b.textContent));const txt=up.textContent;up.click();
   const paid={scrap:s0-P.res.scrap,parts:p0-P.res.parts,up:g.up-u0,want:c,txt};
   const cmp=[...document.querySelectorAll('#hzSpare .hz-cmp')].map(e=>e.textContent);
   [...document.querySelectorAll('.hz-card .cb')].find(b=>/SWAP/.test(b.textContent)).click();await new Promise(r=>setTimeout(r,500));const sw=UI.gearSlot;
   [...document.querySelectorAll('.hz-card .cb')].find(b=>/TAKE OFF/.test(b.textContent)).click();const offd=!P.equip.head;
   const empty=document.querySelector('.hz-card').textContent;[...document.querySelectorAll('.hz-card .cb')].find(b=>/EQUIP/.test(b.textContent)).click();
   const best=P.inv.find(x=>x.id===P.equip.head);return{paid,cmp,sw,offd,empty:empty.slice(0,160),best:best&&best.name};});
 ok(cd.paid.scrap===cd.paid.want.scrap&&cd.paid.parts===cd.paid.want.parts&&cd.paid.up===1&&cd.paid.txt.includes(cd.paid.want.scrap+' 🔩'),'upgrade shows the upCost cost and spends exactly that',cd.paid);
 ok(cd.cmp.length===2&&cd.cmp.every(t=>/Runner|Pathfinder/.test(t)&&/vs Gas Mask/.test(t)&&/⚡ [+−]\d+/.test(t)&&/changes look to the base survivor/.test(t)&&/Hazmat 4→3\/4/.test(t)),'spare rows compare against the equipped item: deltas, ⚡ ±, set count and look change',cd.cmp);
 ok(cd.sw==='head'&&cd.offd&&/best spare/.test(cd.empty)&&cd.best==='Scout Goggles','swap filters the spares, take off works, an empty slot offers the best spare to equip',cd);
 const ns=await ev(()=>{delete P.equip.trinket;P.inv=P.inv.filter(g=>g.slot!=='trinket');UI.gearSlot='trinket';UI.render();return document.querySelector('.hz-card').textContent;});
 ok(/No spare trinket yet/.test(ns),'no-spare text shows');
 // 7) persistence
 await ev(()=>{UI.gearSlot=null;T6.wear(['Gas Mask','Hazmat Coat','Hazmat Pants','Rubber Boots']);const g=P.inv.find(x=>x.id===P.equip.chest);P.res.scrap=5000;P.res.parts=500;upgradeGear(g.id);window._u=g.id;save();});
 const sv=await ev(()=>({eq:{...P.equip},up:P.inv.find(x=>x.id===window._u).up}));
 await p.reload({waitUntil:'load'});await p.waitForTimeout(8000);await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();});
 const rl=await ev(()=>({eq:{...P.equip},up:(P.inv.find(x=>x.id===Object.values(P.equip).find(id=>(P.inv.find(g=>g.id===id)||{}).name==='Hazmat Coat'))||{}).up}));
 ok(JSON.stringify(rl.eq)===JSON.stringify(sv.eq)&&rl.up===sv.up,'equip and upgrade survive a reload',{sv,rl});
 const salv=await ev(()=>{const id=P.equip.head;const n=P.inv.length;UI.salvage(id);return P.inv.length===n;});ok(salv,'salvage is still blocked on equipped items');
 // 8) Stats tab shows the same figure; other tabs render inside the shell
 const tb=await ev(()=>{G.playLocked=false;UI.open('player');UI.sub.player='stats';UI.render();const a=document.querySelector('.avatarbox img.avatar');const out={_av:a&&a.dataset.av};
   for(const [k] of UI.SUBS.player){UI.sub.player=k;UI.render();out[k]=document.getElementById('sheet').classList.contains('hero-full')&&!!document.querySelector('.hz-hdr')&&document.getElementById('sheetBody').textContent.length>200;}return out;});
 ok(tb._av==='hazmat'&&UI_ALL(tb),'Stats-tab avatar box shows the same figure; every Hero tab renders in the shell',tb);
 function UI_ALL(o){return Object.entries(o).filter(([k])=>k!=='_av').every(([,v])=>v);}
 // 9) sizes: avatar never cropped, card position
 await ev(()=>{UI.sub.player='gear';UI.gearSlot='head';UI.render();});
 for(const [w,h] of [[360,640],[375,667],[390,844],[393,852],[430,932],[1280,800]]){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(350);
  const m=await ev(()=>{const i=document.querySelector('.hz-fig img.avatar'),d=document.querySelector('.hz-doll'),c=document.querySelector('.hz-card'),body=document.getElementById('sheetBody');
   const ir=i.getBoundingClientRect(),dr=d.getBoundingClientRect(),cr=c.getBoundingClientRect();const sw=document.getElementById('sheet');
   return{inside:ir.top>=dr.top-1&&ir.bottom<=dr.bottom+1&&ir.left>=dr.left-1&&ir.right<=dr.right+1,ratio:+(ir.width/ir.height).toFixed(3),cardTop:Math.round(cr.top),cardBtm:Math.round(cr.bottom),bodyW:Math.round(body.getBoundingClientRect().width),hscroll:sw.scrollWidth>sw.clientWidth+1,hdr:Math.round(document.querySelector('.hz-hdr').getBoundingClientRect().height)};});
  ok(m.inside&&!m.hscroll&&(w<900||m.bodyW<=560)&&(w!==430||m.cardBtm<=h)&&(w!==390||m.cardTop<h),`${w}x${h}: figure uncropped, no side scroll${w>=900?', content ≤560 px':''}${w===430?', card buttons on screen':''}${w===390?', card top on screen':''}`,m);
  await p.screenshot({path:SHOT+`r62-${w}x${h}.png`});}
 await p.setViewportSize({width:430,height:900});
 // 10) close: ✕, Escape
 const cl=await ev(()=>{document.querySelector('.hz-x').click();const s=document.getElementById('sheet');return{hidden:s.classList.contains('hidden'),full:s.classList.contains('hero-full'),tabs:getComputedStyle(document.getElementById('tabs')).display,body:document.body.classList.contains('hero-open')};});
 ok(cl.hidden&&!cl.full&&cl.tabs!=='none'&&!cl.body,'✕ closes and restores the map and the nav',cl);
 await ev(()=>{UI.open('player');UI.render();});await p.keyboard.press('Escape');await p.waitForTimeout(200);
 const es=await ev(()=>({hidden:document.getElementById('sheet').classList.contains('hidden'),tabs:getComputedStyle(document.getElementById('tabs')).display}));
 ok(es.hidden&&es.tabs!=='none','Escape closes Hero',es);
 const ot=await ev(()=>{UI.open('player');UI.open('base');return{full:document.getElementById('sheet').classList.contains('hero-full'),tabs:getComputedStyle(document.getElementById('tabs')).display};});
 ok(!ot.full&&ot.tabs!=='none','switching to Base drops the full-screen shell',ot);
 // 11) load budget: only the current avatar loads at open
 const ld=await ev(async()=>{performance.clearResourceTimings();UI.close();UI.open('player');UI.sub.player='gear';const t0=performance.now();UI.render();const dt=performance.now()-t0;await new Promise(r=>setTimeout(r,300));
   const av=performance.getEntriesByType('resource').filter(e=>/avatars\//.test(e.name)).map(e=>e.name.split('/').pop());const t1=performance.now();gearTabHTML();return{dt:+dt.toFixed(1),html:+(performance.now()-t1).toFixed(1),av};});
 ok(ld.html<=8,'gear tab HTML builds in ≤ 8 ms',ld);
 console.log('errors:',errs.length);console.log(fails?`${fails} FAIL`:'ALL PASS');
});
