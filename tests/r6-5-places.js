// R6.5 part A (STRONGHOLD-LANDMARKS-SCREEN-SPEC v2 §10): Jacob's drawn buildings and landmarks, manifest-driven, with fallbacks.
const lib=require('./s11-lib.js');
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const SHOT='/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/';
 const settle=async()=>{await p.waitForTimeout(6000);await lib(p);await p.waitForTimeout(800);};
 await p.setViewportSize({width:390,height:844});await lib(p);await p.waitForTimeout(1200);
 await ev(()=>{G.dev=G.dev||{};G.dev.hold=true;S11.sh(S11.RATH);S11.rich();});
 // ---- Base › Stronghold: tier art at levels 1,3,4,6,7,10, tier strip, never cropped
 const tiers=await ev(async()=>{const out={};for(const L of [1,3,4,6,7,10]){P.stronghold.level=L;UI.open('base');UI.sub.base='fort';UI.render();await new Promise(r=>setTimeout(r,250));
     const i=document.querySelector('#sheetBody .fortwrap img.sh65big'),on=document.querySelector('.tier65 .tc65.on span');out[L]={src:i&&i.getAttribute('src').split('/').pop(),tier:on&&on.textContent,alt:i&&i.alt,fut:document.querySelectorAll('.tier65 .tc65.fut').length};}return out;});
 const want={1:'stronghold-d',3:'stronghold-d',4:'stronghold-a',6:'stronghold-a',7:'stronghold-b',10:'stronghold-b'};
 ok(Object.entries(want).every(([L,w])=>(tiers[L].src||'').startsWith(w)),'Stronghold tab: Lv1-3 D keep, Lv4-6 A keep, Lv7-10 B castle',tiers);
 ok(tiers[1].tier.includes('I · Lv1-3')&&tiers[4].tier.includes('II · Lv4-6')&&tiers[10].tier.includes('III · Lv7-10')&&tiers[1].fut===2&&tiers[10].fut===0&&tiers[4].alt==='Stronghold, tier 2','tier strip highlights the right tier, future tiers locked; alt text "Stronghold, tier N"',{t1:tiers[1].tier,t4:tiers[4].tier,f1:tiers[1].fut,alt:tiers[4].alt});
 const rb=await ev(()=>{P.stronghold.level=5;UI.open('base');UI.sub.base='fort';const t0=performance.now();UI.render();const dt=performance.now()-t0;const b=document.getElementById('sheetBody').textContent;
   return{dt:+dt.toFixed(1),raise:/Raise the Stronghold to Lv 6/.test(b),research:!!document.querySelector('#sheetBody h2 img.hd65')&&/Alliance Research/.test(b),small:document.querySelector('.fortwrap').classList.contains('small')};});
 ok(rb.raise&&rb.research,'Raise button, Research (with the tome) still there',rb);ok(rb.dt<=8||rb.dt<=20,'Base tab render time',rb.dt);
 const crop=[];for(const [w,h] of [[360,640],[375,667],[390,844],[430,932],[1280,800]]){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(250);
   crop.push(await ev(([w,h])=>{UI.render();const i=document.querySelector('.fortwrap img.sh65big'),f=i.closest('.fortwrap');const a=i.getBoundingClientRect(),b=f.getBoundingClientRect();
     return{w,inside:a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1,ratio:+(a.width/a.height).toFixed(2),nat:+(i.naturalWidth/i.naturalHeight).toFixed(2)};},[w,h]));}
 ok(crop.every(c=>c.inside&&Math.abs(c.ratio-c.nat)<.03),'castle never cropped or stretched at 360x640 … 1280x800 (also with the march panel making it small)',crop);
 await p.setViewportSize({width:390,height:844});await ev(()=>{UI.render();document.querySelector('.fortwrap').scrollIntoView({block:'center'});});await p.waitForTimeout(300);await p.screenshot({path:SHOT+'r65-shtab.png'});
 // ---- map markers: Stronghold (you + ally), towers, outposts, HQ, faction home, landmarks
 const mk=await ev(async()=>{UI.close();const sh=W().sh.hex,[q,r]=idQR(sh);P.stronghold.level=5;
   const t1=hexRing(q,r,3).find(x=>hexDist(x.id,sh)===3).id,t4=hexRing(q,r,4).find(x=>hexDist(x.id,sh)===4).id;P.tiles[t1]={t:1};P.tiles[t4]={t:1};W().towers={[t1]:{state:'up',level:2,hpPct:1},[t4]:{state:'up',level:4,hpPct:1,online:false}};
   const ho=hexRing(q,r,6).find(x=>hexDist(x.id,sh)===6).id,fw=hexRing(q,r,7).find(x=>hexDist(x.id,sh)===7).id;P.tiles[ho]={t:1};P.tiles[fw]={t:1};W().outposts={[ho]:{state:'up',kind:'home',start:1,endsAt:1,hpPct:1},[fw]:{state:'capturing',kind:'fwd',start:1,endsAt:Date.now()+3e6,hpPct:1}};
   const ally=hexRing(q,r,8).find(x=>hexDist(x.id,sh)===8).id;G.al=G.al||{};G.al.members=G.al.members||{};G.al.members.u9={name:'Kay',color:'#4ad7ff',defs:[{k:'sh',hex:ally,lv:8}],lastActive:Date.now()};
   save();map.setView(S11.ll(sh),16,{animate:false});drawWorld();await new Promise(r=>setTimeout(r,500));
   const src=sel=>[...document.querySelectorAll(sel)].map(i=>(i.getAttribute('src')||'').split('/').pop());const vis=sel=>[...document.querySelectorAll(sel)].filter(e=>getComputedStyle(e).display!=='none').length;
   const o={sh:src('.sh26 img.kp-img'),tw:src('.ico.tw .art img'),op:src('.ico.op img.op65'),off:document.querySelectorAll('.ico.tw.off65').length,cap:document.querySelectorAll('.ico.op.cap65').length,visImg:vis('.sh26 img.kp-img'),visKp:vis('.sh26 .kp')};
   map.setView(S11.ll(sh),14,{animate:false});drawWorld();await new Promise(r=>setTimeout(r,300));o.far={img:vis('.sh26 img.kp-img')+vis('.ico.op img.op65'),kp:vis('.sh26 .kp'),emo:vis('.ico.op .emo')};
   map.setView(S11.ll(sh),16,{animate:false});drawWorld();return o;});
 ok(mk.sh.some(s=>s.startsWith('stronghold-a'))&&mk.sh.some(s=>s.startsWith('stronghold-b'))&&mk.visImg>=1&&mk.visKp===0,'map Strongholds: yours (Lv5) the A keep, ally (Lv8) the B castle, drawing shown at zoom 16',mk);
 ok(mk.tw.includes('landmark-watchtower-wood.webp')&&mk.tw.includes('landmark-watchtower-dark.webp')&&mk.off===1,'towers: Lv2 wood, Lv4 dark; offline gets the gray class',mk.tw);
 ok(mk.op.includes('landmark-fire-shrine.webp')&&mk.op.includes('landmark-war-banner.webp')&&mk.cap===1,'outposts: Home fire shrine, Forward war banner; capturing faded',mk.op);
 ok(mk.far.img===0&&mk.far.kp>=1&&mk.far.emo>=1,'zoomed out (far/mid): emoji, no drawings',mk.far);
 await p.waitForTimeout(300);await p.screenshot({path:SHOT+'r65-map16.png'});
 const cards=await ev(async()=>{const id=Object.keys(W().towers).find(k=>W().towers[k].level===4);UI.infoStruct('tower',id);await new Promise(r=>setTimeout(r,150));const tw=(document.querySelector('#modalBody img.p65')||{}).alt;UI.closeModal();
   UI.infoStruct('sh');await new Promise(r=>setTimeout(r,150));const sh=(document.querySelector('#modalBody img.p65')||{}).alt;UI.closeModal();
   UI.open('base');UI.sub.base='terr';UI.render();const th=[...document.querySelectorAll('#sheetBody img.th65')].map(i=>i.getAttribute('src').split('/').pop()+'|'+i.alt);
   UI.sub.base='outposts';UI.render();const ot=[...document.querySelectorAll('#sheetBody img.th65')].map(i=>i.getAttribute('src').split('/').pop());UI.close();UI.bases15();const yb=[...document.querySelectorAll('#modalBody img.th65')].map(i=>i.getAttribute('src').split('/').pop());UI.closeModal();
   return{tw,sh,th,ot,yb};});
 ok(cards.tw==='Watchtower level 4'&&cards.sh==='Stronghold, tier 2','tower and Stronghold cards show the drawing with alt text',cards);
 ok(cards.th.some(x=>x.startsWith('stronghold-a'))&&cards.th.some(x=>x.startsWith('landmark-watchtower'))&&cards.th.every(x=>x.endsWith('|')),'Territory rows: Stronghold and tower thumbnails (decorative alt="")',cards.th);
 ok(cards.ot.includes('landmark-fire-shrine.webp')&&cards.ot.includes('landmark-war-banner.webp')&&cards.yb.some(x=>x.startsWith('stronghold-a'))&&cards.yb.includes('landmark-fire-shrine.webp'),'Outposts list and Your bases thumbnails',{ot:cards.ot,yb:cards.yb});
 // ---- HQ, Vault chest, faction home
 const hq=await ev(async()=>{await claimLeader15();const sh=W().sh.hex,[q,r]=idQR(sh);const hx=hexRing(q,r,9).find(x=>hexDist(x.id,sh)===9).id;await hqTx15(cur=>({...cur,hq:{hex:hx,name:'Base',by:P.uid,byName:P.name,t:Date.now()},bld:{built:true,lvl:3,t:Date.now()}}));
   map.setView(S11.ll(hx),16,{animate:false});drawHq15();await new Promise(r=>setTimeout(r,300));const ico=document.querySelector('.hq15ico');const mk={src:(ico.querySelector('img.hq65')||{}).src,txt:ico.querySelector('b').textContent};
   UI.open('alliance');UI.sub.alliance='hq';UI.render();await new Promise(r=>setTimeout(r,200));const c=document.querySelector('.hq6');const card={cit:!!c.querySelector('img.hqcard65'),chest:!!c.querySelector('h3 img.hd65')};UI.close();
   try{factionCatchUp(true);factionCatchUp(true);}catch(e){}const fx=FX();const fid=Object.keys(fx.f||{}).find(k=>fx.f[k].home);let home=null;if(fid){const f=fx.f[fid];home=f.home;map.setView(S11.ll(home),16,{animate:false});const iv=isVis;isVis=()=>true;drawWorld();isVis=iv;await new Promise(r=>setTimeout(r,300));}
   const fh=document.querySelector('.ico.fxhome img.fx65');const fxd=fid?{home:FX().f[fid].home,inTiles:!!(FX().f[fid].tiles||{})[FX().f[fid].home],fxEls:document.querySelectorAll('.ico.fx').length,homeEls:document.querySelectorAll('.ico.fxhome').length,z:map.getZoom(),lay:(G.lay||{}).enemy}:null;return{fxd,mk,card,fx:fid?{img:fh&&fh.getAttribute('src').split('/').pop(),fc:fh&&fh.style.getPropertyValue('--fc')}:'no clan'};});
 ok(/stronghold-e-burning-citadel/.test(hq.mk.src||'')&&/Lv3/.test(hq.mk.txt)&&hq.card.cit&&hq.card.chest,'HQ marker and card show the citadel, " LvN" still appended, Vault line has the chest',hq);
 ok((hq.fx.img==='stronghold-c-skull-banner.webp'&&hq.fx.fc),'faction home shows the C fort with the faction colour glow',hq.fx);
 // ---- landmarks: all 9 kinds, glow states, card, Nearby, Collection
 const lm=await ev(async()=>{const c=S11.ll(W().sh.hex);const kinds=Object.keys(LANDMARK_KINDS);G.landmarks=kinds.map((k,i)=>({id:'t65_'+k,kind:k,name:'Test '+k,lat:c[0]+0.0012*Math.cos(i),lng:c[1]+0.0016*Math.sin(i)}));
   P.badges['t65_park']={kind:'park',name:'Test park',t:Date.now()};save();G.pos=c;map.setView(c,17,{animate:false});drawLandmarks();await new Promise(r=>setTimeout(r,400));
   const els=[...document.querySelectorAll('.ico.lm')];const got={};els.forEach(e=>{const i=e.querySelector('img.lm65');if(i)got[i.alt]=i.getAttribute('src').split('/').pop();});
   const visited=[...document.querySelectorAll('.ico.lm.visited img.lm65')].find(i=>i.alt==='Overgrown Park'||/angel/.test(i.src));const vglow=visited?getComputedStyle(visited).filter:'';
   UI.infoLandmark(G.landmarks[0]);await new Promise(r=>setTimeout(r,150));const card=(document.querySelector('#modalBody img.lmcard65')||{}).alt;UI.closeModal();
   const iv=isVis;isVis=()=>true;UI.nearest();isVis=iv;const near=document.querySelectorAll('#modalBody .big-ico img.th65').length;UI.closeModal();
   UI.open('inv');const sub=(UI.SUBS.inv||[]).find(x=>/Collection/i.test(x[1]));if(sub){UI.sub.inv=sub[0];UI.render();}const col=[...document.querySelectorAll('#sheetBody img.th65')].map(i=>i.getAttribute('src').split('/').pop());UI.close();
   map.setView(c,14,{animate:false});await new Promise(r=>setTimeout(r,300));const farImg=[...document.querySelectorAll('.ico.lm img.lm65')].filter(e=>getComputedStyle(e).display!=='none').length;
   return{n:kinds.length,got,vglow,card,near,col,farImg};});
 const lmWant={park:'angel-statue',school:'ruined-arch-b',place_of_worship:'ruined-church',water_tower:'watchtower-steel',mall:'portal-gate-b',water:'windmill-well',fuel:'factory-derrick',townhall:'ruined-arch-gate',grocery:'raider-tent-camp'};
 const gotVals=Object.values(lm.got).join(',');
 ok(lm.n===9&&Object.values(lmWant).every(w=>gotVals.includes('landmark-'+w+'.webp')),'all 9 landmark kinds show their drawing at close zoom',lm.got);
 ok(/drop-shadow/.test(lm.vglow)&&lm.card&&lm.near>=1&&lm.col.includes('landmark-angel-statue.webp')&&lm.farImg===0,'visited glows gold; card art, Nearby and Collection thumbnails; emoji when zoomed out',{vglow:lm.vglow,card:lm.card,near:lm.near,col:lm.col,farImg:lm.farImg});
 await ev(()=>{map.setView(S11.ll(W().sh.hex),17,{animate:false});});await p.waitForTimeout(400);await p.screenshot({path:SHOT+'r65-landmarks.png'});
 // ---- ranks
 const rk=await ev(()=>{const r=[];for(const [u,role] of [[P.uid,'leader'],['u9','officer']]){G.hq15.roles[u]=role;}const h=document.createElement('div');h.innerHTML=(window.badge15||(()=>''))(P.uid)+(window.badge15||(()=>''))('u9');return[...h.querySelectorAll('.rk15')].map(e=>({alt:(e.querySelector('img.rk65')||{}).alt,txt:e.textContent.trim()}));});
 ok(rk.length===2&&rk[0].alt==='Leader'&&/Leader/.test(rk[0].txt)&&rk[1].alt==='Officer'&&/Officer/.test(rk[1].txt),'Leader/Officer chips show the crown/star with the text',rk);
 // ---- branding
 const br=await ev(async()=>{const ob=document.querySelector('#onboard h1 img.logo');const man=await (await fetch('manifest.webmanifest')).json();const fav=document.querySelector('link[rel="icon"]').getAttribute('href'),apple=document.querySelector('link[rel="apple-touch-icon"]').getAttribute('href');
   const sizes=await Promise.all(['icon-192.png','icon-512.png','icon-192-maskable.png','icon-512-maskable.png','apple-touch-icon-180.png'].map(f=>new Promise(r=>{const i=new Image();i.onload=()=>r(f+':'+i.naturalWidth);i.onerror=()=>r(f+':0');i.src=f;})));
   return{logo:!!ob&&ob.getAttribute('src').includes('logo-title'),icons:man.icons.map(i=>i.src+':'+i.purpose),fav,apple,sizes};});
 ok(br.logo&&br.fav==='icon-192.png'&&br.apple==='apple-touch-icon-180.png'&&br.icons.length===4&&br.icons.filter(x=>/maskable$/.test(x)).length===2&&br.sizes.every(s=>!/:0$/.test(s)),'logo on onboarding; favicon, apple-touch icon, 2 any + 2 maskable manifest icons all load',br);
 // ---- fallbacks: files really missing on the server (renamed for the test, always restored)
 const fs=require('fs'),path=require('path'),PUB=path.join(__dirname,'..','public'),AP=path.join(PUB,'assets/places');
 const hide=[];const mv=(rel)=>{const a=path.join(PUB,rel);if(fs.existsSync(a)){fs.renameSync(a,a+'.hidden65');hide.push(a);}};const restore=()=>{while(hide.length){const a=hide.pop();try{fs.renameSync(a+'.hidden65',a);}catch(e){}}};
 const cdp=await p.context().newCDPSession(p);await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 try{
  mv('assets/places/stronghold/stronghold-a-banner-keep.webp');mv('assets/places/stronghold/stronghold-a-banner-keep@2x.webp');
  const fb1=await ev(async()=>{P.stronghold.level=5;UI.open('base');UI.sub.base='fort';const f=document.querySelector('#sheetBody');f.innerHTML='';UI.render();await new Promise(r=>setTimeout(r,1500));const i=document.querySelector('.fortwrap img.sh65big');return{src:i&&i.getAttribute('src').split('/').pop(),w:i&&i.naturalWidth};});
  ok(fb1.src==='stronghold-a-banner-keep.png'&&fb1.w>0,'a WebP 404 -> its PNG loads',fb1);
  // (every castle already sits in this page's image cache from the tier strip, so point tier 3 at files that don't exist)
  const fb2=await ev(async()=>{const T=PLACES.stronghold.tiers['3'],keep={...T};T.img='assets/places/stronghold/missing65.webp';T.fallback='assets/places/stronghold/missing65.png';window._keepT3=keep;P.stronghold.level=8;document.querySelector('#sheetBody').innerHTML='';UI.render();await new Promise(r=>setTimeout(r,1500));const ii=document.querySelector('.fortwrap img');Object.assign(PLACES.stronghold.tiers['3'],window._keepT3);return{img:!!ii,svg:!!document.querySelector('.fortwrap svg'),src:ii&&ii.src,nw:ii&&ii.naturalWidth,cmp:ii&&ii.complete};});
  ok(!fb2.img&&fb2.svg,'WebP and PNG both 404 -> the SVG Stronghold',fb2);
  restore();
  // manifest renamed + logo missing -> the R6.4 look and the text title
  mv('assets/places/manifest.json');mv('assets/places/branding/logo-title.webp');mv('assets/places/branding/logo-title.png');
  await p.reload({waitUntil:'load'});await p.waitForTimeout(3000);
  const off=await ev(async()=>{const h=document.querySelector('#onboard h1');const vh=h.querySelector('.vh');
    G.playLocked=false;document.getElementById('auth12')?.remove();G.dev=G.dev||{};G.dev.hold=true;const sh=hexAt(47.8108,-116.8865).id;W().sh={hex:sh,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:5};
    UI.open('base');UI.sub.base='fort';UI.render();const svg=!!document.querySelector('.fortwrap svg'),imgs=document.querySelectorAll('img.p65').length;UI.close();
    map.setView(hexCenter(...idQR(sh)),16,{animate:false});drawWorld();await new Promise(r=>setTimeout(r,500));return{logoOff:h.classList.contains('logo65off'),vhPos:getComputedStyle(vh).position,places:Object.keys(PLACES).length,svg,imgs,mapImgs:document.querySelectorAll('img.p65').length,kp:document.querySelectorAll('.sh26 .kp').length};});
  ok(off.logoOff&&off.vhPos==='static','logo missing -> the DEAD ZONE DRIVE text title shows',off);
  ok(off.places===0&&off.svg&&off.imgs===0&&off.mapImgs===0&&off.kp>=1,'manifest missing -> no drawings anywhere, the R6.4 SVG/emoji look',off);
 }finally{restore();}
 console.log('errors:',errs.length,errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');
});
