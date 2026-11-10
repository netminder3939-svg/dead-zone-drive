// terr15 (TEST, build 12i) Territory by region, tiles pay near your bases, and miles everywhere.
//  1) Region loading. Every phone used to read EVERY claimed hex of the alliance on each app open. With tiles that never
//     fade and long drives, that would eat the free 50,000 reads/day. Now each hex doc carries a region cell `rg`
//     (about 17 x 15 mi) and the alliance id `al` (for a future shared world). A phone listens only to the cells around
//     where you are, your bases, the HQ, and wherever the map is looking. One listener per cell, so moving the map
//     never re-reads cells it already has.
//     Migration: until meta/terrv says v2, phones load the whole collection (old way) and stamp `rg`/`al` on every doc
//     that lacks it (rules allow a write that only adds those two fields). When none is left, v2 is set and every
//     phone switches to region loading.
//  2) Tiles you own pay their daily output only within 10 mi of one of your bases (Stronghold or any outpost).
//     They stay yours forever unless someone captures them; drop an outpost nearby and they pay again.
//  3) Distances show in miles (and feet).
(function(){
  const T15={cellLat:0.25,cellLng:0.35,ring:1,maxCells:45,keepMin:10,supplyMi:10};
  window.T15=T15;
  const MI=1609.34;
  function cellOf15(lat,lng){return Math.floor(lat/T15.cellLat)+'_'+Math.floor(lng/T15.cellLng);}
  function cellOfHex15(id){const c=hexCenter(...idQR(id));return cellOf15(c[0],c[1]);}
  window.cellOfHex15=cellOfHex15;window.cellOf15=cellOf15;
  // ---- stamp every claim with its region + alliance
  try{const _ch=NET.claimHex.bind(NET);NET.claimHex=function(id,data){const d={...(data||{})};try{d.rg=cellOfHex15(id);d.al=NET.team||'';}catch(e){}
    const p=_ch(id,d);
    try{if(d.rg){if(S15.mode==='region')listenCell15(d.rg);const cell=S15.cells[d.rg];if(cell)cell.docs[id]=Object.assign({},cell.docs[id]||{},d);if(S15.full)S15.full[id]=Object.assign({},S15.full[id]||{},d);emit15();}}catch(e){}
    return p;};}catch(e){}

  // ---- which cells this phone needs
  function points15(){const pts=[];const add=ll=>{if(ll&&isFinite(ll[0])&&isFinite(ll[1]))pts.push(ll);};
    add(G.real15||G.pos);add(G.pos);try{for(const b of (typeof myBases15==='function'?myBases15():[]))add(hexCenter(...idQR(b)));}catch(e){}
    try{const h=typeof hqHex15==='function'&&hqHex15();if(h)add(hexCenter(...idQR(h)));}catch(e){}
    try{if(typeof map!=='undefined'&&map.getCenter){const c=map.getCenter();add([c.lat,c.lng]);}}catch(e){}
    return pts;}
  function wanted15(){const s=new Set();for(const [la,ln] of points15()){const a=Math.floor(la/T15.cellLat),b=Math.floor(ln/T15.cellLng);
      for(let i=-T15.ring;i<=T15.ring;i++)for(let j=-T15.ring;j<=T15.ring;j++)s.add((a+i)+'_'+(b+j));}return [...s].slice(0,T15.maxCells);}
  window.wanted15=wanted15;

  // ---- the feed (called by FirebaseNet.onTerritory)
  const S15={net:null,cb:null,mode:null,cells:{},full:null,fullUnsub:null,merged:{},stamping:false};
  window.TERR15=S15;
  function emit15(){const o={};if(S15.full)Object.assign(o,S15.full);for(const c of Object.values(S15.cells))Object.assign(o,c.docs||{});S15.merged=o;G.terrV15=(G.terrV15||0)+1;try{S15.cb&&S15.cb({...o});}catch(e){console.warn('terr15 cb',e);}}
  function listenCell15(cell){const n=S15.net,fs=n.fs;if(S15.cells[cell]){S15.cells[cell].used=Date.now();return;}
    const c=S15.cells[cell]={docs:{},used:Date.now(),unsub:null};
    c.unsub=fs.onSnapshot(fs.query(n.col('territory'),fs.where('rg','==',cell)),s=>{const o={};s.forEach(d=>o[d.id]=d.data());c.docs=o;emit15();},e=>console.warn('terr15 cell',cell,e));}
  function refresh15(){if(S15.mode!=='region')return;const w=wanted15(),t=Date.now();for(const c of w)listenCell15(c);
    for(const [k,c] of Object.entries(S15.cells))if(!w.includes(k)&&t-c.used>T15.keepMin*60e3){try{c.unsub&&c.unsub();}catch(e){}delete S15.cells[k];emit15();}}
  window.refresh15=refresh15;
  function goRegion15(){if(S15.mode==='region')return;S15.mode='region';try{S15.fullUnsub&&S15.fullUnsub();}catch(e){}S15.fullUnsub=null;refresh15();
    setTimeout(()=>{S15.full=null;emit15();},4000); // keep the old snapshot until the cells have answered
    console.log('terr15: region loading on',Object.keys(S15.cells).length,'cells');}
  async function unstamped15(){const n=S15.net,fs=n.fs,s=await fs.getDocs(n.col('territory')),left=[];s.forEach(d=>{const x=d.data();if(x&&!x.rg)left.push(d.id);});return left;}
  async function stamp15(){if(S15.stamping||S15.mode==='region')return;S15.stamping=true;const n=S15.net,fs=n.fs;let again=false;
    try{const left=await unstamped15();let ok=0,fail=0;
      for(const id of left.slice(0,400)){try{await fs.setDoc(fs.doc(n.col('territory'),id),{rg:cellOfHex15(id),al:n.team||''},{merge:true});ok++;}catch(e){fail++;}}
      console.log('terr15 stamp',ok,'ok',fail,'failed',left.length,'needed');
      if(fail)return;
      if(left.length>400){again=true;return;}
      const still=await unstamped15();
      if(still.length){again=true;return;}
      await fs.setDoc(fs.doc(n.db,...n.base,'meta','terrv'),{v:2,t:fs.serverTimestamp(),by:n.uid||''});goRegion15();}
    catch(e){console.warn('terr15 stamp',e);}finally{S15.stamping=false;if(again&&S15.mode!=='region')Promise.resolve().then(()=>{try{stamp15();}catch(e){}});}}
  window.terrFeed15=function(net,f){S15.net=net;S15.cb=f;const fs=net.fs;
    (async()=>{let v=0;try{const d=await fs.getDoc(fs.doc(net.db,...net.base,'meta','terrv'));v=d.exists()?(d.data().v||0):0;}catch(e){}
      if(v>=2)return goRegion15();
      S15.mode='full';S15.fullUnsub=fs.onSnapshot(net.col('territory'),s=>{const o={};s.forEach(d=>o[d.id]=d.data());S15.full=o;emit15();if(S15.mode==='full')stamp15(o);},e=>console.warn('terr15 full',e));})();};
  setInterval(()=>{try{refresh15();}catch(e){}},10e3);
  let _mv15=null;const hookMap=()=>{try{if(typeof map==='undefined'||map._t15)return;map._t15=1;map.on('moveend',()=>{clearTimeout(_mv15);_mv15=setTimeout(()=>{try{refresh15();}catch(e){}},1500);});}catch(e){}};
  setInterval(hookMap,2000);

  // ---- 2) tiles pay only within 10 mi of a base
  let _sup=null,_supT=0;
  function supplyCentres15(){const t=Date.now();if(_sup&&t-_supT<5000)return _sup;_supT=t;_sup=[];try{for(const b of (typeof myBases15==='function'?myBases15():[]))_sup.push(hexCenter(...idQR(b)));}catch(e){}return _sup;}
  function inSupply15(id){const C=supplyCentres15();if(!C.length)return true; // no base yet: nothing is cut off
    const [a,b]=hexCenter(...idQR(id));for(const c of C)if(distM(a,b,c[0],c[1])<=T15.supplyMi*MI)return true;return false;}
  window.inSupply15=inSupply15;window.supplyBust15=()=>{_sup=null;_supT=0;}; // R6.4: supply64 clears this when a base is added, finished, lost or moved
  function supplyCount15(){let n=0,off=0;for(const id of Object.keys(P.tiles||{})){n++;if(!inSupply15(id))off++;}return{n,off};}
  window.supplyCount15=supplyCount15;
  // R6.4: the hex-card note moved to supply64.js (it now sits outside ⓘ More, with the distance)
  HOOK.render(function(){try{if(this.tab!=='base')return;const b=$('#sheetBody');if(!b||b.querySelector('.sup15b'))return;const s=supplyCount15();if(!s.off)return;
    const h=b.querySelector('h2');(h||b).insertAdjacentHTML(h?'afterend':'afterbegin',`<div class="sup15 sup15b"><span>📦 ${s.off.toLocaleString()} of your ${s.n.toLocaleString()} hexes are more than ${T15.supplyMi} mi from your bases and don't pay.</span><button onclick="window.showUnpaid64&&showUnpaid64()">📍 Show them</button></div>`);}catch(e){}});

  // ---- 3) miles: rewrite distances in the page text (km -> mi, m -> ft)
  const fmtNum=v=>v<10?(Math.round(v*10)/10).toString():Math.round(v).toLocaleString();
  function toMi(txt){return txt
    .replace(/±(\d[\d,]*)m\b/g,(m,n)=>{const v=parseFloat(n.replace(/,/g,''));return v>=1609?'±'+fmtNum(v/MI)+' mi':'±'+Math.round(v*3.28084).toLocaleString()+' ft';})
    .replace(/(\d[\d,]*(?:\.\d+)?)\s?km\/h\b/g,(m,n)=>fmtNum(parseFloat(n.replace(/,/g,''))/1.60934)+' mph')
    .replace(/(\d[\d,]*(?:\.\d+)?)\s?km\b/g,(m,n)=>fmtNum(parseFloat(n.replace(/,/g,''))/1.60934)+' mi')
    .replace(/(\d[\d,]*(?:\.\d+)?) m\b(?![a-zA-Z])/g,(m,n)=>{const v=parseFloat(n.replace(/,/g,''));if(!isFinite(v))return m;return v>=1609?fmtNum(v/MI)+' mi':Math.max(10,Math.round(v*3.28084/10)*10).toLocaleString()+' ft';})
    .replace(/\bevery km\b/g,'every 0.6 mi').replace(/\bper km\b/g,'per 0.6 mi').replace(/\bkm driven\b/g,'driven');}
  window.toMi15=toMi;
  function fixNode(n){if(n.nodeType===3){const p=n.parentNode;if(!p||/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(p.nodeName))return;const t=n.nodeValue;
      if(t.trim()==='km'){n.nodeValue=t.replace('km','mi');const b=p.previousElementSibling;if(b&&/^\s*\d[\d,]*(\.\d+)?\s*$/.test(b.textContent)){const v=parseFloat(b.textContent.replace(/,/g,''))/1.60934;b.textContent=v<10?v.toFixed(1):Math.round(v).toLocaleString();}return;}
      if(/\d\s?km\b|\d m\b|±\d[\d,]*m\b|every km|per km|km driven/.test(t)){const x=toMi(t);if(x!==t)n.nodeValue=x;}return;}
    if(n.nodeType===1&&n.childNodes&&!/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.nodeName)){const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);const L=[];let x;while((x=w.nextNode()))L.push(x);L.forEach(fixNode);}}
  window.fixMiles15=()=>fixNode(document.body);
  const mo=new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData')fixNode(m.target);else m.addedNodes.forEach(fixNode);}});
  const startMo=()=>{if(!document.body)return setTimeout(startMo,200);mo.observe(document.body,{subtree:true,childList:true,characterData:true});fixNode(document.body);};startMo();

  function layout15(){try{const hud=document.getElementById('hud'),md=document.getElementById('mode'),st=document.getElementById('status'),op=document.getElementById('op15'),mc=document.getElementById('mcards');if(!hud)return;
      if(innerWidth>600){for(const e of [md,st,op,mc])if(e&&e.dataset.l15){e.style.removeProperty('top');e.style.removeProperty('bottom');delete e.dataset.l15;}return;}
      const b=Math.round(hud.getBoundingClientRect().bottom);if(md){md.style.setProperty('top',(b+2)+'px','important');md.dataset.l15=1;}
      if(st){st.style.setProperty('top',(b+(md&&md.offsetHeight?md.offsetHeight+4:2))+'px','important');st.dataset.l15=1;}
      const sb=st?Math.round(st.getBoundingClientRect().bottom):b;
      if(op){op.style.setProperty('top',(sb+10)+'px','important');op.dataset.l15=1;}
      if(mc&&mc.offsetHeight){const want=sb+10;if(mc.dataset.l15||Math.round(mc.getBoundingClientRect().top)<want){mc.style.setProperty('top',want+'px','important');mc.style.setProperty('bottom','auto','important');mc.dataset.l15=1;}}}catch(e){}}
  window.layout15=layout15;
  const startLayout=()=>{const hud=document.getElementById('hud');if(!hud)return setTimeout(startLayout,300);try{new ResizeObserver(()=>layout15()).observe(hud);const s=document.getElementById('status');if(s)new ResizeObserver(()=>layout15()).observe(s);}catch(e){}addEventListener('resize',layout15);setInterval(layout15,2000);layout15();};startLayout();

  const st=document.createElement('style');st.textContent=`.sup15{background:#2a1f05;border:1px solid #6b5212;color:#ffd98a;padding:6px 8px;border-radius:8px;font-size:12px;margin:0 0 8px}.sup15b{display:flex;gap:8px;align-items:center}.sup15b span{flex:1}.sup15b button{flex:none;margin:0;padding:6px 10px;font-size:12px}`;document.head.appendChild(st);
})();
