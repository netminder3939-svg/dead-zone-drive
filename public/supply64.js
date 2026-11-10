// supply64 (R6.4) Supply range & outpost clarity (SUPPLY-RANGE-OUTPOST-CLARITY-SPEC). Shows rules that already exist:
//  hexes more than 10 mi from your bases don't pay; Forward Outposts go within 6 mi of a teammate's land; an outpost claims
//  the 7 hexes around it except teammates', raiders' and raider forts'. No rule, rate, cost or zone change here.
//  Shared helpers (window): supplyBust64, nearestBaseMi64, unpaid64, unpaidSet64, ringClass64, ringPreview64, baseStats64,
//  claimLine64, reviveLine64, opHoldLine64, opRow64, baseLine64, buildLines64, opDone64, opCard64, showUnpaid64, ringShow64.
//  Player state: P.op64 (outpost reports) and o.cap64 on outposts (hex ids and names only, no positions).
//  Device only: localStorage wl_f4.payOn (missing = on) and wl_f4.payHint64. Never rename or reset these keys.
(function(){
  const MI=1609.34,SMI=()=>T15.supplyMi,now=()=>Date.now();
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ctr=id=>hexCenter(...idQR(id));
  const miBetween=(a,b)=>{const x=ctr(a),y=ctr(b);return distM(x[0],x[1],y[0],y[1])/MI;};
  const fmt=mi=>mi<10?(Math.round(mi*10)/10).toString()+' mi':Math.round(mi).toLocaleString()+' mi';
  const nameOf=uid=>{try{return(typeof who24==='function'?who24(uid).name:'')||'a teammate';}catch(e){return'a teammate';}};

  // ================= 1) shared helpers =================
  let ver=0,memo=null,baseSig='';
  function supplyBust64(){ver++;memo=null;try{window.supplyBust15&&supplyBust15();}catch(e){}schedulePay();}
  function basesNow(){try{return myBases15();}catch(e){return[];}}
  function nearestBaseMi64(id){const B=basesNow();if(!B.length)return null;let m=Infinity;for(const b of B)m=Math.min(m,miBetween(id,b));return m;}
  function unpaid64(){const key=ver+'|'+Object.keys(P.tiles||{}).length+'|'+Math.floor(now()/5000);if(memo&&memo.k===key)return memo.v;
    const out=[];try{if(basesNow().length)for(const id of Object.keys(P.tiles||{}))if(!inSupply15(id))out.push(id);}catch(e){}memo={k:key,v:out,set:new Set(out)};return out;}
  function unpaidSet64(){unpaid64();return memo.set;}
  // the same tests outpostTick uses at completion
  function ringClass64(id){const w=W();if(P.tiles[id])return{state:'mine'};if(factionAt(id))return{state:'skip',why:'raiders'};
    if(enemyAt(id)&&!(w.enemyTaken||{})[id])return{state:'skip',why:'fort'};
    if(typeof allyOwned==='function'&&allyOwned(id)){const o=G.terr[id]||{};return{state:'skip',why:'teammate',who:o.by||nameOf(o.uid)};}return{state:'claim'};}
  // kind: 'op' (regular, counts once up), 'home' / 'fwd' (count from placement)
  function ringPreview64(hex,kind){const [q,r]=idQR(hex),ring=[],skipped=[];let claim=0,already=0;
    for(const x of hexRing(q,r,BAL.outpost.radius)){const c=ringClass64(x.id);ring.push({id:x.id,...c});if(c.state==='mine')already++;else if(c.state==='claim')claim++;else skipped.push({id:x.id,why:c.why,who:c.who||''});}
    // unpaid hexes of yours within 10 mi of here that no current base covers
    let revive=0;for(const id of unpaid64())if(miBetween(id,hex)<=SMI())revive++;
    return{ring,claim,already,skipped,revive,reviveWhen:kind==='op'?'after the 60-min hold':"as soon as it's placed"};}
  function shRing(){try{const s=W().sh;if(!s||s.state==='down')return null;return shAreaIds();}catch(e){return null;}}
  function baseStats64(b){let ring=[];if(b===shHex15())ring=shRing()||[b];else{const [q,r]=idQR(b);ring=hexRing(q,r,BAL.outpost.radius).map(x=>x.id);}
    const holds=ring.filter(id=>P.tiles[id]).length,others=basesNow().filter(x=>x!==b);let keeps=0,only=0;
    for(const id of Object.keys(P.tiles||{})){if(miBetween(id,b)>SMI())continue;keeps++;if(!others.some(o=>miBetween(id,o)<=SMI()))only++;}
    return{holds,ring:ring.length,keeps,only};}
  function skipBits(sk){const tm={},o={raiders:0,fort:0,locked:0};for(const x of sk||[]){if(x.why==='teammate')tm[x.who||'a teammate']=(tm[x.who||'a teammate']||0)+(x.n||1);else o[x.why]=(o[x.why]||0)+(x.n||1);}return{tm,o};}
  function claimLine64(rp){const {tm,o}=skipBits(rp.skipped);let t=`Will claim ${rp.claim+0} of ${rp.ring.length}`;if(rp.already)t+=` · ${rp.already} already yours`;
    const tl=Object.entries(tm).map(([w,n])=>`${n} (${esc(w)}'s)`);if(tl.length)t+=` · skips ${tl.join(', ')}`;if(o.raiders)t+=` · skips ${o.raiders} (raiders)`;if(o.fort)t+=` · skips ${o.fort} (raider fort)`;return t;}
  function reviveLine64(rp,kind){if(!rp.revive)return'';return`Brings ${rp.revive} unpaid hex${rp.revive===1?'':'es'} back into pay ${kind==='op'?'after the 60-min hold':"as soon as it's placed"}.`;}
  Object.assign(window,{supplyBust64,nearestBaseMi64,unpaid64,unpaidSet64,ringClass64,ringPreview64,baseStats64,claimLine64,reviveLine64});

  // bases changed? (added, finished, lost, moved) -> bust the caches and redraw the pay overlay
  function sigOf(){const w=W(),s=w.sh;return[(s&&s.state!=='down')?s.hex+':'+s.state:'',...Object.entries(w.outposts||{}).map(([id,o])=>id+':'+o.state+':'+(o.kind||''))].join('|');}
  function checkBases(){const s=sigOf();if(s!==baseSig){baseSig=s;supplyBust64();}}
  HOOK.draw(function(){try{checkBases();}catch(e){}});

  // ================= 2b) "📍 Show them": clusters of unpaid hexes =================
  function clusters64(){const U=unpaid64(),left=new Set(U),out=[];
    while(left.size){const s=left.values().next().value;left.delete(s);const c=[s],q=[s];
      while(q.length){const a=q.pop();for(const b of [...left])if(hexDist(a,b)<=3){left.delete(b);c.push(b);q.push(b);}}out.push(c);}
    const me=G.pos?hexAt(...G.pos).id:(()=>{try{const m=map.getCenter();return hexAt(m.lat,m.lng).id;}catch(e){return null;}})();
    const dme=c=>me?Math.min(...c.map(id=>hexDist(id,me))):0;
    out.sort((a,b)=>(b.length-a.length)||(dme(a)-dme(b)));return out;}
  const SB={on:false,i:0,L:[]};
  function sbBar(){let el=document.getElementById('sup64bar');if(!SB.on){if(el)el.remove();return;}
    if(!el){el=document.createElement('div');el.id='sup64bar';document.body.appendChild(el);}
    const L=SB.L;if(!L.length){el.innerHTML=`<span>📦 All your hexes pay now.</span>`;clearTimeout(SB.t);SB.t=setTimeout(()=>{SB.on=false;sbBar();payAuto('show',false);},3000);return;}
    const c=L[SB.i],mi=Math.min(...c.map(id=>nearestBaseMi64(id)||0));
    el.innerHTML=`<span><b>📦 Unpaid${L.length>1?` · ${SB.i+1} of ${L.length}`:''} · ${c.length} hex${c.length===1?'':'es'} · ${fmt(mi)} from nearest base</b><small>Build an outpost within ${SMI()} mi of them and they pay again.</small></span>${L.length>1?'<button onclick="sbStep64(-1)" aria-label="Previous">◀</button><button onclick="sbStep64(1)" aria-label="Next">▶</button>':''}<button onclick="sbDone64()">Done</button>`;}
  function sbFit(){const c=SB.L[SB.i];if(!c)return;try{const b=L.latLngBounds(c.map(ctr));map.fitBounds(b,{padding:[60,60],maxZoom:15});if(map.getZoom()<11)map.setView(b.getCenter(),11);}catch(e){}}
  window.showUnpaid64=function(){SB.L=clusters64();if(!SB.L.length)return toast('📦 All your hexes pay now.');SB.i=0;SB.on=true;try{UI.closeModal();}catch(e){}try{UI.close&&UI.close();}catch(e){}payAuto('show',true);sbFit();sbBar();};
  window.sbStep64=function(d){const n=SB.L.length;if(!n)return;SB.i=(SB.i+d+n)%n;sbFit();sbBar();};
  window.sbDone64=function(){SB.on=false;clearTimeout(SB.t);sbBar();payAuto('show',false);};
  HOOK.draw(function(){if(!SB.on||!SB.L.length)return;const L2=clusters64(),sig=a=>a.map(c=>c.length).join(',');if(sig(L2)===sig(SB.L)&&L2.length)return;SB.L=L2;SB.i=Math.min(SB.i,Math.max(0,L2.length-1));sbBar();});

  // ================= 2c) hex card: "Not paying" in the main area =================
  HOOK.tile(function(id){queueMicrotask(()=>{try{if(!P.tiles[id]||isBase15(id))return;if(!unpaidSet64().has(id))return;const t=tileInfo(id);if(!t.res)return;
      const mb=$('#modalBody');if(!mb||mb.querySelector('.sup64n'))return;const mi=nearestBaseMi64(id),bonus=(()=>{try{return zoneFortified(id);}catch(e){return false;}})();
      const big=mb.querySelector('.big26');if(big){const f=big.firstElementChild;if(f){f.innerHTML=`<b>📦 ${bonus?'Bonus only':'Not paying'}</b><small>${fmt(mi)} from nearest base</small>`;f.classList.add('sup64f');}}
      const note=bonus?`📦 More than ${SMI()} mi from your bases, so its normal pay stops at the reset. The fortified-zone bonus still pays. Build an outpost within ${SMI()} mi and the full amount pays again.`
        :`📦 More than ${SMI()} mi from your bases, so it pays nothing at the reset. It stays yours. Build an outpost within ${SMI()} mi and it pays again.`;
      const anchor=mb.querySelector('.cc26 .big26')||mb.querySelector('.cc26');(anchor||mb).insertAdjacentHTML(anchor?'afterend':'afterbegin',`<p class="sup15 sup64n">${note}</p>`);
      // the yield sentence inside ⓘ More
      const w=document.createTreeWalker(mb.querySelector('details.more26')||mb,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode()))if(/^Yields \d+ /.test(n.nodeValue.trim())){n.nodeValue=`Would yield ${t.yield} ${RES[t.res]} a night if it were within ${SMI()} mi of one of your bases.`;break;}
    }catch(e){console.warn('sup64 card',e);}});});

  // ================= 2d) Territory table note =================
  HOOK.render(function(){try{if(this.tab!=='base'||this.sub.base!=='terr')return;const b=$('#sheetBody');if(!b||b.querySelector('.sup64t'))return;const s=supplyCount15();if(!s.off)return;
    const tb=b.querySelector('table.log2');if(tb)tb.insertAdjacentHTML('afterend',`<p class="tiny sup64t">📦 ${s.off} hex${s.off===1?'':'es'} ${s.off===1?"isn't":"aren't"} in these numbers: ${s.off===1?"it's":"they're"} more than ${SMI()} mi from a base.</p>`);}catch(e){}});

  // ================= union overlay (one fill + one clean outline for many circles) =================
  const Union=L.Layer.extend({initialize(o){this.o=o;this.circles=[];},
    onAdd(m){this._m=m;const c=this._c=L.DomUtil.create('canvas','u64');c.style.pointerEvents='none';c.style.position='absolute';m.getPanes().overlayPane.appendChild(c);
      this._r=()=>this.redraw();m.on('moveend zoomend resize',this._r);this._z=()=>{c.style.opacity=0;};m.on('zoomstart',this._z);this.redraw();},
    onRemove(m){m.off('moveend zoomend resize',this._r);m.off('zoomstart',this._z);this._c.remove();},
    set(circles){this.circles=circles||[];if(this._m)this.redraw();},
    redraw(){const m=this._m,c=this._c;if(!m)return;this.draws=(this.draws||0)+1;const sz=m.getSize(),pad=Math.round(Math.max(sz.x,sz.y)*.3),W=sz.x+2*pad,H=sz.y+2*pad;
      const tl=m.containerPointToLayerPoint([-pad,-pad]);L.DomUtil.setPosition(c,tl);c.width=W;c.height=H;c.style.width=W+'px';c.style.height=H+'px';c.style.opacity=1;
      const ctx=c.getContext('2d');ctx.clearRect(0,0,W,H);if(!this.circles.length)return;
      const P_=this.circles.map(([lat,lng,rm])=>{const p=m.latLngToContainerPoint([lat,lng]),e=m.latLngToContainerPoint([lat,lng+rm/(111320*Math.cos(lat*Math.PI/180))]);return{x:p.x+pad,y:p.y+pad,r:Math.abs(e.x-p.x)};})
        .filter(p=>p.x+p.r>0&&p.y+p.r>0&&p.x-p.r<W&&p.y-p.r<H);if(!P_.length)return;
      const mk=()=>{const x=document.createElement('canvas');x.width=W;x.height=H;return x;};const o=this.o;
      // fill: union mask, tinted
      const mask=mk(),mc=mask.getContext('2d');mc.fillStyle='#000';for(const p of P_){mc.beginPath();mc.arc(p.x,p.y,p.r,0,7);mc.fill();}
      const tint=mk(),tc=tint.getContext('2d');tc.fillStyle=o.color;tc.fillRect(0,0,W,H);tc.globalCompositeOperation='destination-in';tc.drawImage(mask,0,0);
      ctx.globalAlpha=o.fillA;ctx.drawImage(tint,0,0);
      // outline: each circle's stroke with every other circle's inside cut out, so overlaps never double up
      const edge=mk(),ec=edge.getContext('2d');
      P_.forEach((p,i)=>{const one=mk(),oc=one.getContext('2d');oc.strokeStyle=o.color;oc.lineWidth=o.w;if(o.dash)oc.setLineDash(o.dash);oc.beginPath();oc.arc(p.x,p.y,p.r,0,7);oc.stroke();
        oc.globalCompositeOperation='destination-out';oc.setLineDash([]);P_.forEach((q,j)=>{if(j===i)return;oc.beginPath();oc.arc(q.x,q.y,Math.max(0,q.r-.5),0,7);oc.fill();});ec.drawImage(one,0,0);});
      ctx.globalAlpha=o.lineA;ctx.drawImage(edge,0,0);ctx.globalAlpha=1;}});
  function layerHost(){if(!G.layers.pay64)G.layers.pay64=L.layerGroup().addTo(map);return G.layers.pay64;}
  let payU=null,fwdU=null,extra=null;
  function ensure(){if(typeof map==='undefined'||!map._loaded)return false;const g=layerHost();
    if(!payU){payU=new Union({color:'#ffd98a',fillA:.05,lineA:.6,w:1.5,dash:[6,6]});g.addLayer(payU);}
    if(!fwdU){fwdU=new Union({color:'#5fd068',fillA:.06,lineA:.7,w:1.5});g.addLayer(fwdU);}
    if(!extra){extra=L.layerGroup();g.addLayer(extra);}return true;}
  window.U64=()=>({payU,fwdU,extra});

  // ================= 3) 📦 Pay range =================
  const F=()=>(window.MAP4&&MAP4.off)||{};const saveF=()=>{try{localStorage.setItem('wl_f4',JSON.stringify(F()));}catch(e){}};
  const auto=new Set();function payAuto(why,on){on?auto.add(why):auto.delete(why);schedulePay();}
  window.payAuto64=payAuto;
  const payOn=()=>F().payOn!==false;
  const payShown=()=>payOn()||auto.size>0;
  let payT=null;function schedulePay(){clearTimeout(payT);payT=setTimeout(drawPay,30);}
  function drawPay(){if(!ensure())return setTimeout(schedulePay,800);const B=basesNow(),w=W();
    const counted=new Set(B),cap=Object.entries(w.outposts||{}).filter(([id,o])=>o.state==='capturing'&&!o.kind&&!counted.has(id)).map(([id])=>id);
    payU.set(payShown()?B.map(b=>{const c=ctr(b);return[c[0],c[1],SMI()*MI];}):[]);
    extra.eachLayer(l=>{if(l._cap64)extra.removeLayer(l);});
    if(payShown())for(const id of cap){const l=L.circle(ctr(id),{radius:SMI()*MI,color:'#ffd98a',weight:1.5,opacity:.35,dashArray:'2 6',fill:false,interactive:false});l._cap64=1;extra.addLayer(l);}
    legend();
    if(payOn()&&B.length&&!F().payHint64&&!(G.drive&&G.drive.on)){F().payHint64=true;saveF();toast('📦 New: the gold area shows where your hexes pay at midnight. Hide it from 🧭 Layers.');}}
  function legend(){const el=document.getElementById('pay64leg');if(!el)return;el.textContent=!payOn()?'':basesNow().length?'📦 Gold area: your hexes inside it pay at midnight.':'📦 No bases yet: everything you claim pays.';}
  window.payChip64=function(){drawPay();};
  window.drawPay64=drawPay;
  setInterval(legend,1000);setTimeout(schedulePay,1500);
  // the hint waits for the drive to end
  setInterval(()=>{try{if(payOn()&&!F().payHint64&&basesNow().length&&!(G.drive&&G.drive.on))drawPay();}catch(e){}},5000);

  // ================= ring preview on the map (Forward tap, Build menu) =================
  let ringL=null;
  window.ringShow64=function(hex,kind){try{if(!ensure())return;if(ringL){extra.removeLayer(ringL);ringL=null;}if(!hex){payAuto('ring',false);return;}
    const rp=ringPreview64(hex,kind),z=map.getZoom();ringL=L.layerGroup();
    for(const x of rp.ring){const pts=hexPoly(...idQR(x.id));
      if(x.state==='skip'){L.polygon(pts,{color:'#d63a2a',weight:2.5,dashArray:'6 4',fill:false,interactive:false}).addTo(ringL);if(z>=14)L.marker(ctr(x.id),{icon:L.divIcon({className:'skip64',html:'🚫',iconSize:[18,18]}),interactive:false,keyboard:false}).addTo(ringL);}
      else L.polygon(pts,{color:'#5fd068',weight:2.5,opacity:.95,fill:x.state==='claim',fillColor:'#5fd068',fillOpacity:.16,interactive:false}).addTo(ringL);}
    const c=ctr(hex);L.circle(c,{radius:SMI()*MI,color:'#ffd98a',weight:2,opacity:.9,fill:false,interactive:false}).addTo(ringL); // the candidate's own pay circle, not unioned
    extra.addLayer(ringL);payAuto('ring',true);}catch(e){console.warn('ring64',e);}};

  // ================= 4) Forward picker: the 6 mi zone =================
  let fwdSig='';
  function fwdTick(){try{if(!ensure())return;const on=G.pick15==='fwd'&&now()-(G.pick15At||0)<=180e3;
      if(!on){if(fwdSig){fwdSig='';fwdU.set([]);payAuto('fwd',false);if(ringL)ringShow64(null);}return;}
      const A=window.fwdAnchors15?fwdAnchors15():[],sig=A.length+'|'+(G.terrV15||0);if(sig===fwdSig)return;fwdSig=sig;
      fwdU.set(A.map(a=>[a.c[0],a.c[1],B15.fwdNearMi*MI]));payAuto('fwd',true);}catch(e){}}
  setInterval(fwdTick,700);

  // ================= 5) Build menu: the same 7-hex preview =================
  function buildLines64(hex,kind){try{const rp=ringPreview64(hex,kind);return`<small class="bl64">${claimLine64(rp)}</small>${rp.revive?`<small class="bl64">${reviveLine64(rp,kind)}</small>`:''}`;}catch(e){return'';}}
  window.buildLines64=buildLines64;
  let buildOn=false;
  const _bd=UI.build;UI.build=function(){const r=_bd.apply(this,arguments);try{if(!G.pos)return r;const id=hexAt(...G.pos).id,mb=$('#modalBody');if(!mb)return r;
      const home=mb.querySelector('.home15 .grow');if(home&&!home.querySelector('.bl64'))home.insertAdjacentHTML('beforeend',buildLines64(id,'home'));
      const rows=[...mb.querySelectorAll('.row')],op=rows.find(x=>/⛺ Outpost/.test((x.querySelector('b')||{}).textContent||'')),hm=mb.querySelector('.home15');
      const live=[op,hm].some(x=>x&&x.querySelector('button')&&!x.querySelector('button').disabled);
      buildOn=true;payAuto('build',true);if(live){ringShow64(id,(op&&!op.querySelector('button').disabled)?'op':'home');}
      // keep the hex above the sheet
      setTimeout(()=>{try{const box=$('#modalBody');const top=box?box.getBoundingClientRect().top:innerHeight;try{map.stop();}catch(e){}const z=Math.max(15,map.getZoom());
        // centre the map so the hex sits halfway down the visible area above the sheet (a plain pan would be undone by the menu's own animated setView)
        const hb=['hud','status','mode'].map(i=>document.getElementById(i)).filter(e=>e&&e.offsetHeight).reduce((m,e)=>Math.max(m,e.getBoundingClientRect().bottom),0);const want=Math.max(60,(Math.min(hb,top-80)+top)/2),H=map.getSize().y,pt=map.project(ctr(id),z).add([0,H/2-want]);map.setView(map.unproject(pt,z),z,{animate:false});}catch(e){}},30);}catch(e){console.warn('build64',e);}return r;};
  const modal=document.getElementById('modal');
  if(modal)new MutationObserver(()=>{if(buildOn&&modal.classList.contains('hidden')){buildOn=false;payAuto('build',false);if(!(G.pick15==='fwd'))ringShow64(null);}}).observe(modal,{attributes:true,attributeFilter:['class']});
  // the Forward confirm card closes -> keep the ring while still picking; the pick ending clears it (fwdTick)

  // ================= 6) capture results =================
  function opRecord(id,o,ok){const c=o.cap64||{claimed:[],skipped:[],already:0,revived:0};const g={};for(const s of c.skipped||[]){const k=s.why+'|'+(s.why==='teammate'?s.who:'');(g[k]=g[k]||{why:s.why,who:s.why==='teammate'?s.who:'',n:0}).n++;}
    let keeps=0;try{keeps=ok?baseStats64(id).keeps:0;}catch(e){}
    return{t:now(),hex:id,kind:o.kind||'op',ok,claimed:(c.claimed||[]).length,skipped:Object.values(g),already:c.already||0,revived:c.revived||0,keeps};}
  function kindOf(r){return r.kind==='home'?['🏡','Home Outpost']:r.kind==='fwd'?['🚩','Forward Outpost']:['⛺','Outpost'];}
  function skipLine(s){return s.why==='teammate'?`Skipped ${s.n}: held by ${esc(s.who||'a teammate')}.`:s.why==='fort'?`Skipped ${s.n}: a raider fort. Beat the fort to take it.`:s.why==='locked'?`Skipped ${s.n}: sign in to claim.`:`Skipped ${s.n}: raiders hold it. Beat them to take it.`;}
  window.opDone64=function(list){const recs=list.map(x=>opRecord(x.id,x.o,x.ok));P.op64=[...recs.slice().reverse(),...(P.op64||[])].slice(0,60);save();
    if(window.cardBusy1&&cardBusy1())cardWait1('info64',recs,recs.length>1?`⛺ ${recs.length} outposts`:recs[0].ok?`${kindOf(recs[0])[0]} ${kindOf(recs[0])[1]} up`:'⛺ Outpost capture failed');else opCard64(recs);};
  window.opCard64=function(recs){if(!recs||!recs.length)return;
    if(recs.length>1){UI._op64=recs;return UI.info({title:`⛺ ${recs.length} outposts finished while you were away`,art:'<span class="bigemo">⛺</span>',
      body:recs.map((r,i)=>{const [ic]=kindOf(r);const sk=(r.skipped||[]).reduce((a,s)=>a+s.n,0);return`<div class="row"><div class="grow"><b>${ic} ${hexName(r.hex)}</b><small>${r.ok?`claimed ${r.claimed}${sk?` · skipped ${sk}`:''}`:'capture failed'}</small></div><button onclick="UI.closeModal();setTimeout(()=>opShow64('${r.hex}'),60)">📍</button></div>`;}).join(''),buttons:[]});}
    const r=recs[0],[ic,kn]=kindOf(r);
    if(!r.ok)return UI.info({title:`${ic} ${kn} capture failed`,sub:hexName(r.hex),art:`<span class="bigemo">${ic}</span>`,body:`<p>${hexName(r.hex)}: the hex was taken during the 60-min hold. Retake the hex, then rebuild from the outpost's card.</p>`,buttons:[['🗺️ Show on map',()=>{UI.closeModal();setTimeout(()=>opShow64(r.hex),60);}]]});
    const holds=r.claimed+(r.already||0);
    UI.info({title:`${ic} ${kn} up`,sub:hexName(r.hex),art:`<span class="bigemo">${ic}</span>`,
      body:`<div class="big26"><div><b>${r.claimed}</b><small>new hex${r.claimed===1?'':'es'}</small></div><div><b>${holds} of 7</b><small>holds</small></div><div><b>${r.keeps}</b><small>paying</small></div></div>
        <p>Claimed ${r.claimed} new hex${r.claimed===1?'':'es'}.</p>${(r.skipped||[]).map(s=>`<p class="tiny">${skipLine(s)}</p>`).join('')}${r.revived>0?`<p>Brought ${r.revived} unpaid hex${r.revived===1?'':'es'} back into pay.</p>`:''}`,
      buttons:[['🗺️ Show on map',()=>{UI.closeModal();setTimeout(()=>opShow64(r.hex),60);}]]});};
  window.opShow64=function(hex){try{map.setView(ctr(hex),16);ensure();const [q,r]=idQR(hex);const g=L.layerGroup();hexRing(q,r,BAL.outpost.radius).forEach(x=>L.polygon(hexPoly(x.q,x.r),{color:'#5fd068',weight:2.5,fill:false,interactive:false}).addTo(g));extra.addLayer(g);
      let i=0;const w=[2.5,3.2,4,3.2,2.5,3.2,4,3.2,2.5];const t=setInterval(()=>{g.eachLayer(l=>l.setStyle({weight:w[i]}));if(++i>=w.length){clearInterval(t);extra.removeLayer(g);}},3000/w.length);}catch(e){}};
  // 6d) outpost card line; 6e) lists
  window.opHoldLine64=function(id){const o=(W().outposts||{})[id];if(!o)return'';
    if(o.state==='capturing'){const rp=ringPreview64(id,o.kind||'op');const {tm,o:x}=skipBits(rp.skipped);const sk=[...Object.entries(tm).map(([w,n])=>`${n} (${esc(w)}'s)`),...(x.raiders?[`${x.raiders} (raiders)`]:[]),...(x.fort?[`${x.fort} (raider fort)`]:[])];
      return`Will claim about ${rp.claim} of 7 when the hold ends${sk.length?' · skips '+sk.join(', '):''}`;}
    if(o.state==='down')return'Lost: rebuild it to guard these hexes again';
    const s=baseStats64(id),[q,r]=idQR(id);const ring=hexRing(q,r,BAL.outpost.radius).map(x=>ringClass64(x.id));const tm={};let rd=0;for(const c of ring){if(c.why==='teammate')tm[c.who]=(tm[c.who]||0)+1;if(c.why==='raiders'||c.why==='fort')rd++;}
    const held=[...Object.entries(tm).map(([w,n])=>`${n} held by ${esc(w)}`),...(rd?[`${rd} held by raiders`]:[])];
    return`Holds ${s.holds} of its 7 hexes · keeps ${s.keeps} of your hexes paying${held.length?'<br>'+held.join(' · '):''}${s.only?`<br>If you lose it, ${s.only} hex${s.only===1?'':'es'} stop${s.only===1?'s':''} paying.`:''}`;};
  window.opRow64=function(id,o){if(o.state==='capturing'){const rp=ringPreview64(id,o.kind||'op');return`⏳ capturing · ${fmtDur(o.endsAt-now())} left · will claim about ${rp.claim}`;}
    if(o.state==='down')return'💥 lost';const s=baseStats64(id);return`✅ standing · holds ${s.holds}/${s.ring} · keeps ${s.keeps} paying`;};
  window.baseLine64=function(id){try{const s=baseStats64(id);return`holds ${s.holds}/${s.ring} · keeps ${s.keeps} paying`;}catch(e){return'';}};

  const st=document.createElement('style');
  st.textContent=`#sup64bar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 72px);z-index:870;display:flex;gap:8px;align-items:center;background:#241c10f2;border:1.5px solid #ffd24a;color:#ffe9a8;padding:8px 10px 8px 14px;border-radius:14px;font-size:13px;width:min(560px,calc(100vw - 24px));box-sizing:border-box;box-shadow:0 4px 14px #000a}
  #sup64bar span{flex:1 1 auto;line-height:1.3}#sup64bar small{display:block;color:#ffd98a;font-size:11.5px}#sup64bar button{flex:0 0 auto;margin:0;min-width:40px}
  .ico.rt.unpaid64{opacity:.9;filter:saturate(.6)}.skip64{font-size:14px;line-height:18px;text-align:center;filter:drop-shadow(0 1px 2px #000)}.bl64{color:#bfe9a8}
  .big26 .sup64f b{color:#ffd98a}canvas.u64{z-index:1}`;
  document.head.appendChild(st);
})();
