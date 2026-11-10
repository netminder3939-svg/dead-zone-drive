// Headless repro for "flashy trucks": own guarded pipeline with an escort marching out to it, a horde squad, a march flag.
// Counts, per vehicle marker type: DOM creations/removals per second, frames hidden (display:none) vs shown, show<->hide
// toggles per second, frames where the type has no element at all, and vertical jumps (declutter marginTop) per second.
// usage: NODE_PATH=/tmp/pwshim/node_modules node r6-2-van-flash.js http://localhost:PORT/ [seconds]
const path=require('path');
require(path.resolve(process.argv[2+1]?process.cwd():process.cwd(),'tests/h.js'))(process.argv[2],async(p,errs)=>{
 const SEC=+(process.argv[3]||20);const ev=(f,a)=>p.evaluate(f,a);
 await ev(m=>{window._MODE=m;},process.argv[4]||'move');
 const setup=await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();
   const me=hexAt(...(G.pos||[47.7796,-116.8923])).id;const [q,r]=idQR(me);
   const start=(typeof shHex15==='function'&&shHex15())||me;const [sq,sr]=idQR(start);const end=hexRing(sq,sr,6)[0].id;
   const route=marchTrack(start,end);if(route[0]!==start)route.unshift(start);
   const MODE=window._MODE;
   if(MODE==='end'){const now0=Date.now(),k=Math.round(now0/(2*7200e3));PIPE.truckH=(now0+20e3)/(2*k+1)/3600e3;} // real 2 h speed, parked at the site end (~u=1) for the whole test
   else PIPE.truckH=0.01; // one pass in 36 s so the truck crosses hexes during the test (real: 2 h)
   const gh=route[3];P.pipes=[{id:'tp1',name:'Test line',res:'fuel',site:'x',route,st:'online',onT:Date.now(),lastPay:Date.now(),guard25:{hex:gh,esc:true}}];
   const now=Date.now();stationed()[gh]={n:500,at:now+60e3,st:now,from:start}; // escort marching out along the pipe for 60 s
   P.avatar='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
   G._route=route;map.setView(hexCenter(...idQR(route[3])),15,{animate:false});G.lay=G.lay||{};G.lay.enemy=true;
   // a resource marker on every route hex (realistic: claimed resource hexes, landmarks) to see whether tidy4 hides trucks
   G.layers.lm=G.layers.lm||L.layerGroup().addTo(map);
   if(MODE==='end'){ // the supply site at the end of a real pipeline is a landmark (gas station etc.): resource marker on that hex
     const addLm=()=>{if(G._lmT&&G.layers.lm.hasLayer(G._lmT))return;G._lmT=L.marker(hexCenter(...idQR(end)),{icon:L.divIcon({className:'mk lodm',html:'<div class="ico lm"><span>⛽</span><b class="nm">Gas station</b></div>',iconSize:[0,0]})}).addTo(G.layers.lm);};
     addLm();HOOK.draw(addLm);map.setView(hexCenter(...idQR(end)),15,{animate:false});}
   drawWorld();try{drawPipes();}catch(e){}
   return{mode:MODE,start,end,route,gh,pipes:P.pipes.length,state:pipeState(P.pipes[0]),truckHex:(()=>{const e=document.querySelector('.pipetruck');if(!e)return null;const m=[...G.layers.pipes.getLayers()].find(l=>l.getElement&&l.getElement()&&l.getElement().querySelector('.pipetruck'));return m?hexAt(m.getLatLng().lat,m.getLatLng().lng).id:null;})()};});
 console.log('setup',JSON.stringify(setup));
 await ev((SEC)=>{const T={pipetruck:'.pipetruck',vanstack26:'.vanstack26',pipevan26:'.pipevan26',escort:'.mk24.t-escort',horde:'.mk24.t-horde',flag:'.mflag2,.mk24.t-attack,.mk24.t-claim'};
   const S={};for(const k in T)S[k]={made:0,gone:0,img:0,frames:0,hid:0,none:0,tog:0,jump:0,last:null,lastMt:null};S.mtrack={made:0,gone:0};S.badge={made:0,gone:0};
   const typ=n=>{if(!(n instanceof Element))return null;for(const k in T)if(n.matches(T[k])||n.querySelector(T[k]))return k;return null;};
   const mo=new MutationObserver(ms=>{for(const m of ms){for(const n of m.addedNodes){const k=typ(n);if(k){S[k].made++;S[k].img+=n.querySelectorAll('img').length;}if(n.classList&&n.classList.contains('b4'))S.badge.made++;if(n.classList&&n.classList.contains('mtrack'))S.mtrack.made++;}
     for(const n of m.removedNodes){const k=typ(n);if(k)S[k].gone++;if(n.classList&&n.classList.contains('b4'))S.badge.gone++;if(n.classList&&n.classList.contains('mtrack'))S.mtrack.gone++;}}});
   mo.observe(map.getContainer(),{childList:true,subtree:true});
   const end=performance.now()+SEC*1000;window._S=S;
   return new Promise(res=>{const f=()=>{for(const k in T){const els=[...document.querySelectorAll('.leaflet-marker-pane '+T[k].split(',').join(',.leaflet-marker-pane '))];const s=S[k];s.frames++;
         if(!els.length){s.none++;continue;}
         const icon=els[0].closest('.leaflet-marker-icon');const vis=icon&&getComputedStyle(icon).display!=='none'&&getComputedStyle(els[0]).display!=='none';if(!vis)s.hid++;
         if(s.last!==null&&s.last!==vis)s.tog++;s.last=vis;const mt=els[0].style.marginTop||'0px';if(s.lastMt!==null&&mt!==s.lastMt)s.jump++;s.lastMt=mt;}
       if(performance.now()<end)requestAnimationFrame(f);else{mo.disconnect();res();}};requestAnimationFrame(f);});},SEC);
 // simulate periodic data snapshots during the wait: drawWorld every 4 s (team/member snapshot redraws)
 const t0=Date.now();while(Date.now()-t0<SEC*1000){await p.waitForTimeout(4000);await ev(()=>{try{drawWorld();}catch(e){}});}
 await p.waitForTimeout(500);
 const S=await ev(()=>{const o={};for(const [k,s] of Object.entries(window._S)){o[k]={...s};delete o[k].last;delete o[k].lastMt;}return o;});
 console.log('per-type over',SEC,'s (rAF frames):');
 for(const [k,s] of Object.entries(S)){if(s.frames===undefined){console.log(k.padEnd(11),`created ${(s.made/SEC).toFixed(2)}/s removed ${(s.gone/SEC).toFixed(2)}/s`);continue;}
   console.log(k.padEnd(11),`created ${(s.made/SEC).toFixed(2)}/s removed ${(s.gone/SEC).toFixed(2)}/s imgs-inserted ${s.img} | frames ${s.frames} hidden ${s.hid} absent ${s.none} show/hide-toggles ${s.tog} (${(s.tog/SEC).toFixed(2)}/s) declutter-jumps ${s.jump} (${(s.jump/SEC).toFixed(2)}/s)`);}
 console.log('JSON',JSON.stringify(S));
});
