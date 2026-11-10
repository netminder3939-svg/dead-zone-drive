// base15 (TEST, build 12i) Play anywhere, together. Approved by Pope Nov 8.
//  * Rule: you claim and connect pipelines only where you physically are (GPS). Anywhere else you act with marches.
//  * Alliance HQ: the leader or an officer places it. "Jump to HQ", and build or move your Stronghold within 5 mi of it.
//    Moving your Stronghold turns the old spot into your Home Outpost, so driving, pipelines and resources keep working there.
//  * Bases: Stronghold, Home Outpost (1, built where you stand), Forward Outposts (2, placed remotely within 6 mi of a
//    teammate's land). Each base has its own troops. Marches leave from the base you operate from, with that base's troops.
//  * Portal: move troops between your bases. 20 min + 10 min per 100 km, max 3 h. No return penalty. Troops in the portal
//    can't fight. Resources are never stored at a base, so they never travel.
//  * Operating base: "📍 Here" (GPS, the default; driving always uses it) or one of your bases. From a base, the map and
//    your actions sit on that base and walking/driving claims are off.
(function(){
  const MI=1609.34;
  const B15={hqMi:5,fwdNearMi:6,fwdMax:2,homeMax:1,portalBaseMin:20,portalPer100kmMin:10,portalCapH:3,moveCooldownH:24*7};
  window.B15=B15;
  const now=()=>(typeof nowS==='function'?nowS():Date.now());
  const ctr=id=>hexCenter(...idQR(id));
  const kmBetween=(a,b)=>{const x=ctr(a),y=ctr(b);return distM(x[0],x[1],y[0],y[1])/1000;};
  const mi=km=>(km/1.60934);
  const fmtMi=km=>{const m=mi(km);return m<10?m.toFixed(1)+' mi':Math.round(m)+' mi';};
  window.fmtMi15=fmtMi;

  // ---------- bases ----------
  function shHex15(){const s=W().sh;return s&&s.hex&&s.state!=='down'?s.hex:null;}
  function ops15(kind){return Object.entries(W().outposts||{}).filter(([,o])=>o.state!=='down'&&(kind?o.kind===kind:true));}
  function homeOp15(){const e=ops15('home')[0];return e?e[0]:null;}
  function isBase15(id){if(!id)return false;if(id===shHex15())return true;const o=(W().outposts||{})[id];return !!(o&&o.state!=='down');}
  function baseLabel15(id){if(id===shHex15())return'🏰 Stronghold';const o=(W().outposts||{})[id]||{};return o.kind==='home'?'🏡 Home Outpost':o.kind==='fwd'?'🚩 Forward Outpost':'⛺ Outpost';}
  function myBases15(){const out=[];const s=shHex15();if(s)out.push(s);for(const [id,o] of ops15())if(o.state==='up'||o.kind)out.push(id);return out;}
  Object.assign(window,{shHex15,homeOp15,isBase15,baseLabel15,myBases15});
  // troops per base: the Stronghold's troops are TP().home; an outpost's troops are stationed on its hex
  function poolOf15(b){if(!b||b===shHex15()||b==='sh')return TP().home||0;const s=stationed()[b];return s&&Date.now()>=(s.at||0)?s.n:0;}
  function addPool15(b,n){if(n<=0)return;if(!b||b==='sh'||b===shHex15()||!isBase15(b)){TP().home+=n;return;}const s=stationed(),c=s[b];s[b]={...(c||{}),n:((c&&c.n)||0)+n,at:Math.min((c&&c.at)||0,Date.now()),from:b,b15o:b};}
  function takePool15(b,n){if(!b||b==='sh'||b===shHex15()){const k=Math.min(n,TP().home);TP().home-=k;return k;}const s=stationed(),c=s[b];if(!c)return 0;const k=Math.min(n,c.n);c.n-=k;if(c.n<=0)delete s[b];return k;}
  Object.assign(window,{poolOf15,addPool15,takePool15});

  // ---------- operating base ----------
  function curBase15(){const b=P.op15;if(!b||b==='gps')return'gps';if(b==='sh')return shHex15()?'sh':'gps';return isBase15(b)?b:'gps';}
  function opHex15(){const b=curBase15();return b==='gps'?null:b==='sh'?shHex15():b;}
  function outpostMode15(){const b=curBase15();return b!=='gps'&&b!=='sh'&&b!==shHex15();}
  window.curBase15=curBase15;window.opHex15=opHex15;
  G.real15=null;
  const _sp15=setPos;setPos=function(lat,lng){try{G.real15=[lat,lng];const h=opHex15();
      if(h){try{if(typeof realFix25==='function')realFix25(lat,lng);}catch(e){}const c=ctr(h);if(!G.pos||hexAt(...G.pos).id!==h){G.jump=true;return _sp15.call(this,c[0],c[1]);}return;}}catch(e){console.warn('op15 pos',e);}
    return _sp15.apply(this,arguments);};
  window.setPos=setPos;
  function setOp15(b){P.op15=b||'gps';save();const h=opHex15();
    try{if(h){const c=ctr(h);G.jump=true;_sp15(c[0],c[1]);map.setView(c,16);}else{if(G.real15){G.jump=true;_sp15(G.real15[0],G.real15[1]);map.setView(G.real15,16);}}drawWorld();}catch(e){}
    toast(h?`${baseLabel15(h)}: you're operating from here. Marches leave from this base.`:'📍 Back on your GPS position');bar15(true);try{UI.closeModal();}catch(e){}}
  window.setOp15=setOp15;
  // walking / driving claims only on GPS
  const _cp15=claimPath;claimPath=function(){if(curBase15()!=='gps')return 0;return _cp15.apply(this,arguments);};
  // driving always uses GPS
  const _td15=toggleDrive;toggleDrive=async function(){if(!(G.drive&&G.drive.on)&&curBase15()!=='gps'){P.op15='gps';save();if(G.real15){G.jump=true;_sp15(G.real15[0],G.real15[1]);}bar15(true);}return _td15.apply(this,arguments);};
  window.toggleDrive=toggleDrive;

  // ---------- marches leave from a base, with that base's troops ----------
  marchFrom=function(){const h=opHex15()||shHex15();if(h)return h;return G.pos?hexAt(...G.pos).id:null;};
  window.marchFrom=marchFrom;
  // synchronous screens and actions that read TP().home: show/use the outpost's troops while operating from an outpost
  function withPool15(fn,ctx,args){if(!outpostMode15())return fn.apply(ctx,args);const b=opHex15(),s=stationed(),e=s[b],k=e?e.n:0,keep=TP().home;TP().home=k;delete s[b];
    try{return fn.apply(ctx,args);}finally{const left=TP().home;TP().home=keep;if(left>0)s[b]={...(e||{at:0,from:b}),n:left,b15o:b};}}
  for(const name of ['addMarchBtn','stationTroops']){try{const f=window[name];if(typeof f!=='function')continue;const w=function(){return withPool15(f,this,arguments);};window[name]=w;
      if(name==='addMarchBtn')addMarchBtn=w;else stationTroops=w;}catch(e){}}
  // stations made from an outpost go back to that outpost when recalled
  const _st15=stationTroops;stationTroops=function(h,n){const b=outpostMode15()?opHex15():null;const r=_st15.apply(this,arguments);try{if(b){const s=stationed()[h];if(s)s.b15o=b;save();}}catch(e){}return r;};window.stationTroops=stationTroops;
  const _rs15=recallStation;recallStation=function(h){const s=stationed()[h],b=s&&s.b15o&&s.b15o!==h?s.b15o:null;const n0=TP().returning.length;const r=_rs15.apply(this,arguments);try{if(b)for(let i=n0;i<TP().returning.length;i++)TP().returning[i].b15=b;save();}catch(e){}return r;};window.recallStation=recallStation;
  // sending a march from an outpost: only that outpost's troops can go
  const _sm15=sendMarch;sendMarch=async function(){if(!outpostMode15())return _sm15.apply(this,arguments);const b=opHex15(),t=TP(),s=stationed(),e=s[b],k=e?e.n:0;
    if(k<=0)return toast('🚫 No troops at this outpost. 🌀 Portal some here first.');
    const pre=new Set(Object.keys(t.away||{})),keep=t.home;t.home=k;delete s[b];
    try{return await _sm15.apply(this,arguments);}
    finally{let taken=0;t.awayBase15=t.awayBase15||{};for(const id of Object.keys(t.away||{}))if(!pre.has(id)){taken+=t.away[id]||0;t.awayBase15[id]=b;}
      const x=t.home,leftOut=Math.max(0,k-taken);t.home=keep+Math.max(0,x-leftOut);if(leftOut>0)s[b]={...(e||{at:0,from:b}),n:leftOut,b15o:b};save();}};
  window.sendMarch=sendMarch;
  // the march comes home to the base it left from
  const _rm15=returnMarch;returnMarch=async function(id,m){const t=TP(),b=(t.awayBase15||{})[id];if(!b)return _rm15.apply(this,arguments);const n=t.away[id]||0;const r=await _rm15.apply(this,arguments);
    try{if(t.away[id]==null){const k=Math.min(n,t.home);if(k>0){t.home-=k;addPool15(b,k);}delete t.awayBase15[id];save();}}catch(e){}return r;};
  window.returnMarch=returnMarch;
  try{const _rmt15=recallMarchTroops;recallMarchTroops=function(id){const b=(TP().awayBase15||{})[id],n0=TP().returning.length;const r=_rmt15.apply(this,arguments);try{if(b){for(let i=n0;i<TP().returning.length;i++)TP().returning[i].b15=b;delete TP().awayBase15[id];save();}}catch(e){}return r;};window.recallMarchTroops=recallMarchTroops;}catch(e){}
  // returning troops tagged with a base land there (not at the Stronghold)
  const _tt15=troopTick;troopTick=function(){try{const t=TP();if(Array.isArray(t.returning)){const due=t.returning.filter(r=>r.b15&&r.at<=Date.now());if(due.length){t.returning=t.returning.filter(r=>!due.includes(r));let n=0;for(const r of due){addPool15(r.b15,r.n);n+=r.n;}save();toast(`🏠 ${n.toLocaleString()} troops are back at ${baseLabel15(due[0].b15)}`);}}}catch(e){}return _tt15.apply(this,arguments);};
  window.troopTick=troopTick;

  // ---------- portal ----------
  function portalMs15(a,b){const km=kmBetween(a,b);const min=B15.portalBaseMin+B15.portalPer100kmMin*km/100;return Math.round(Math.min(B15.portalCapH*60,min)*60e3*(1-(window.hqPortalCut6?hqPortalCut6():0)));} // R6: the HQ cuts portal time
  window.portalMs15=portalMs15;
  function portalList15(){const t=TP();t.portal15=t.portal15||[];return t.portal15;}
  function portal15(from,to,n){from=from==='sh'?shHex15():from;to=to==='sh'?shHex15():to;
    if(!isBase15(from)||!isBase15(to)||from===to)return toast('🚫 Pick two of your bases');n=Math.floor(n);if(!(n>0))return toast('🚫 Pick how many troops');
    const k=takePool15(from,n);if(k<=0)return toast('🚫 No troops there');const d=portalMs15(from,to),t0=now();
    portalList15().push({id:'p'+t0.toString(36)+Math.random().toString(36).slice(2,5),n:k,from,to,st:t0,at:t0+d});save();
    toast(`🌀 ${k.toLocaleString()} troops in the portal · arrive at ${baseLabel15(to)} in ${fmtDur(d)}`);allianceLog(`🌀 ${P.name} sent ${k.toLocaleString()} troops through the portal (${fmtMi(kmBetween(from,to))})`);try{UI.closeModal();UI.hud();}catch(e){}}
  window.portal15=portal15;
  setInterval(()=>{try{if(!P.world)return;const L=portalList15(),t=now(),due=L.filter(p=>p.at<=t);if(!due.length)return;
      TP().portal15=L.filter(p=>!due.includes(p));for(const p of due){addPool15(p.to,p.n);report(`🌀 ${p.n.toLocaleString()} troops arrived at ${baseLabel15(p.to)} (${hexName(p.to)})`,true);}save();try{UI.hud();}catch(e){}}catch(e){}},4000);
  const _ta15=troopsAway;troopsAway=function(){let n=_ta15.apply(this,arguments);try{n+=portalList15().reduce((a,p)=>a+p.n,0);}catch(e){}return n;};window.troopsAway=troopsAway;

  // ---------- outposts: Home + Forward ----------
  const _ol15=outpostsLive;outpostsLive=function(){return Object.values(W().outposts||{}).filter(o=>o.state!=='down'&&!o.kind).length;};window.outpostsLive=outpostsLive;
  function placeSpecial15(id,kind){const w=W(),c=outpostCost();w.outposts=w.outposts||{};const _u015=window.unpaid64?unpaid64().length:0;
    if(factionAt(id))return toast('🚫 Retake this hex from the raiders first');const o=G.terr[id];if(o&&!o.released&&(o.ai||(o.uid&&!isMe(o.uid))))return toast(o.ai?'🚫 Raiders hold that hex':'🚫 That hex belongs to a teammate');
    if(w.outposts[id]&&w.outposts[id].state!=='down')return toast('🚫 There is already an outpost here');
    if(id===shHex15())return toast('🚫 That is your Stronghold');
    if(kind==='home'&&ops15('home').length>=B15.homeMax)return toast('🚫 You already have a Home Outpost');
    if(kind==='fwd'&&ops15('fwd').length>=B15.fwdMax)return toast(`🚫 You already have ${B15.fwdMax} Forward Outposts`);
    if(!canPay(c))return toast('🚫 Not enough resources');pay(c);
    w.outposts[id]={state:'capturing',kind,start:Date.now(),endsAt:Date.now()+BAL.outpost.holdMin*60e3,hpPct:1};if(!P.tiles[id])claimTile(id);
    save();drawWorld();try{pushMember();}catch(e){}{let rv=0;try{if(window.supplyBust64){supplyBust64();rv=_u015-unpaid64().length;}}catch(e){}toast(`${kind==='home'?'🏡':'🚩'} Building: holds for ${BAL.outpost.holdMin} min, then it's up.${rv>0?` ${rv} hex${rv===1?'':'es'} pay again now.`:''}`);}allianceLog(`${kind==='home'?'🏡':'🚩'} ${P.name} is building a ${kind==='home'?'Home':'Forward'} Outpost`);UI.closeModal();}
  window.placeSpecial15=placeSpecial15;
  function teammateLandNear15(id,km){for(const [hx,o] of Object.entries(G.terr||{})){if(!o||o.ai||o.released||!o.uid||isMe(o.uid))continue;if(kmBetween(hx,id)<=km)return o.uid;}
    const M=(G.al&&G.al.members)||{};for(const [uid,m] of Object.entries(M)){if(isMe(uid)||!Array.isArray(m.defs))continue;for(const d of m.defs){if(d&&d.hex&&kmBetween(d.hex,id)<=km)return uid;}}return null;}
  window.teammateLandNear15=teammateLandNear15;
  // R6.4: one validity function for the Forward picker (green hexes, the tap and the build all agree). The first failing reason wins.
  //  Teammate anchors (their held hexes + their buildings) are listed once per pick and the answer per hex is memoised;
  //  both reset when territory or the alliance changes.
  let anc15=null,ancKey15='',okMemo15=new Map();
  function ancSig15(){const M=(G.al&&G.al.members)||{};return Object.keys(G.terr||{}).length+'|'+Object.keys(M).length+'|'+Object.values(M).reduce((a,m)=>a+((m&&m.defs&&m.defs.length)||0),0)+'|'+(G.terrV15||0);}
  function fwdAnchors15(){const k=ancSig15();if(anc15&&k===ancKey15)return anc15;ancKey15=k;okMemo15=new Map();const out=[],seen=new Set();
    for(const [hx,o] of Object.entries(G.terr||{})){if(!o||o.ai||o.released||!o.uid||isMe(o.uid))continue;if(seen.has(hx))continue;seen.add(hx);out.push({hex:hx,uid:o.uid,c:ctr(hx)});}
    const M=(G.al&&G.al.members)||{};for(const [uid,m] of Object.entries(M)){if(isMe(uid)||!Array.isArray(m.defs))continue;for(const d of m.defs){if(d&&d.hex&&!seen.has(d.hex)){seen.add(d.hex);out.push({hex:d.hex,uid,c:ctr(d.hex)});}}}
    return anc15=out;}
  // nearest teammate anchor: {uid, mi, hex} or null
  function fwdNearest15(id){const A=fwdAnchors15();if(!A.length)return null;const c=ctr(id);let best=null;for(const a of A){const m=distM(c[0],c[1],a.c[0],a.c[1])/MI;if(!best||m<best.mi)best={uid:a.uid,hex:a.hex,mi:m};}return best;}
  function fwdOk15(id){const k=ancSig15();if(k!==ancKey15)fwdAnchors15();if(okMemo15.has(id))return okMemo15.get(id);let why=null;
    const o=G.terr[id];
    if(factionAt(id)||(o&&!o.released&&o.ai))why='Raiders hold that hex';
    else if(o&&!o.released&&o.uid&&!isMe(o.uid))why='That hex belongs to a teammate';
    else if((W().outposts||{})[id]&&W().outposts[id].state!=='down')why='There is already an outpost here';
    else if(id===shHex15())why='That is your Stronghold';
    else{const n=fwdNearest15(id);if(!n||n.mi>B15.fwdNearMi)why=`Forward Outposts go within ${B15.fwdNearMi} mi of a teammate's land`;}
    okMemo15.set(id,why);return why;}
  window.fwdOk15=fwdOk15;Object.assign(window,{fwdAnchors15,fwdNearest15,fwdMemoReset15:()=>{anc15=null;okMemo15=new Map();}});
  // Build menu: Home Outpost where you stand (GPS only)
  const _bd15=UI.build;UI.build=function(){_bd15.apply(this,arguments);try{if(!G.pos)return;const mb=$('#modalBody');if(!mb||mb.querySelector('.home15'))return;const id=hexAt(...G.pos).id,gps=curBase15()==='gps',has=ops15('home').length>=B15.homeMax;
      const c=outpostCost(),cost=Object.entries(c).map(([k,v])=>`<span class="${(P.res[k]||0)<v?'short':''}">${v} ${RES[k]}</span>`).join(' ');
      const why=has?'You already have one':!gps?'Switch to 📍 Here (GPS): it goes where you actually are':null;
      mb.insertAdjacentHTML('beforeend',`<div class="row home15"><div class="grow"><b>🏡 Home Outpost</b><small>${cost}</small><small>Where you live or play by GPS. Drives, pipelines and resources work around it. 1 per player, doesn't count toward your outpost limit.</small>${why?`<small>❌ ${why}</small>`:''}</div><button ${why?'disabled':''} onclick="placeSpecial15('${id}','home')">Build</button></div>`);}catch(e){console.warn('home15',e);}};
  // pipelines can start at your Home Outpost while you are physically near it
  try{const _po15=pipeOrigin;pipeOrigin=function(){const ho=homeOp15(),r=G.real15;if(ho&&r){const c=ctr(ho);if(distM(r[0],r[1],c[0],c[1])<=(PIPE.maxKm||5)*1000)return ho;}return _po15.apply(this,arguments);};window.pipeOrigin=pipeOrigin;}catch(e){}

  // ---------- Alliance HQ ----------
  function hq15(){return G.hq15&&G.hq15.hq||null;}
  window.hqHex15=()=>{const h=hq15();return h&&h.hex||null;};
  function nearHq15(id){const h=hq15();return !!(h&&kmBetween(h.hex,id)<=B15.hqMi*MI/1000);}
  window.drawHq15=function(){try{if(typeof map==='undefined')return;if(!G.layers.hq15)G.layers.hq15=L.layerGroup().addTo(map);const g=G.layers.hq15;g.clearLayers();const h=hq15();if(!h)return;const c=ctr(h.hex);
    L.marker(c,{icon:L.divIcon({className:'mk hq15mk',html:`<div class="hq15ico">🏛️<b>${esc15(h.name||'HQ')}</b></div>`,iconSize:[0,0]}),zIndexOffset:600}).on('click',()=>UI.hq15()).addTo(g);
    L.circle(c,{radius:B15.hqMi*MI,color:'#ffd24a',weight:1,opacity:.5,fillOpacity:.03,dashArray:'6 6',interactive:false}).addTo(g);}catch(e){}};
  HOOK.draw(function(){drawHq15();});
  window.jumpHq15=function(){const h=hq15();if(!h)return toast('No HQ yet');try{map.setView(ctr(h.hex),15);G.view15=ctr(h.hex);}catch(e){}UI.closeModal&&UI.closeModal();try{UI.close&&UI.close();}catch(e){}};
  function startOk15(id){const h=hq15();if(!h)return'No HQ yet';if(!nearHq15(id))return`Keep within ${B15.hqMi} mi of the HQ`;
    const o=G.terr[id];if(o&&!o.released&&(o.ai||(o.uid&&!isMe(o.uid))))return o.ai?'Raiders hold that hex':'That hex belongs to a teammate';
    if(factionAt(id))return'Raiders hold that hex';if(typeof allyBldNear==='function'&&allyBldNear(id,1))return"Too close to a teammate's building (keep 2 hexes away)";return null;}
  function autoHqHex15(){const h=hq15();if(!h)return null;const [q,r]=idQR(h.hex);for(let ring=2;ring<=20;ring++)for(const x of hexRing(q,r,ring))if(hexDist(x.id,h.hex)===ring&&!startOk15(x.id))return x.id;return null;}
  function moveSh15(id){const why=startOk15(id);if(why)return toast('🚫 '+why);const w=W(),s=w.sh,t=Date.now();
    if(s&&s.movedAt15&&t-s.movedAt15<B15.moveCooldownH*3600e3)return toast(`🚫 You can move your Stronghold again in ${fmtDur(B15.moveCooldownH*3600e3-(t-s.movedAt15))}`);
    const old=s&&s.state!=='down'?s.hex:null;
    if(old&&old!==id&&!ops15('home').length){w.outposts=w.outposts||{};w.outposts[old]={state:'up',kind:'home',start:t,endsAt:t,hpPct:1,fromSh15:1};}
    if(s&&s.state!=='down'){s.hex=id;s.hpPct=s.hpPct??1;s.movedAt15=t;}else{w.sh={hex:id,hpPct:1,state:'up',buildEnd:0,everBuilt:true,movedAt15:t};P.stronghold=P.stronghold||{level:1};}
    if(!P.tiles[id])claimTile(id);try{shClaimArea();}catch(e){}P.startSh26=1;P.startShMoved26=1;P.op15='sh';save();try{pushMember();}catch(e){}
    allianceLog(`🏰 ${P.name} moved their Stronghold to the alliance HQ${old?' (their old spot is now a Home Outpost)':''}`);UI.closeModal();setOp15('sh');}
  window.moveSh15=moveSh15;
  function pickBar15(){let el=document.getElementById('pick15');const k=G.pick15&&Date.now()-(G.pick15At||0)<=180e3?G.pick15:null;if(!k){if(el)el.remove();if(G.pick15&&!k)G.pick15=null;return;}
    if(!el){el=document.createElement('div');el.id='pick15';document.body.appendChild(el);}
    const t=k==='free4'?'🏰 Tap a green hex for your Stronghold (free move)':k==='hq'?'🏛️ Tap the hex for the alliance HQ':k==='sh'?`🏰 Tap a free hex within ${B15.hqMi} mi of the HQ`:(fwdAnchors15().length?`🚩 Tap a green hex: within ${B15.fwdNearMi} mi of a teammate's land, not on anyone's hexes.`:`🚩 None of your teammates hold land yet, so there's nowhere to put a Forward Outpost.`);
    if(k==='fwd'&&!fwdAnchors15().length&&!G.pick15None){G.pick15None=setTimeout(()=>{G.pick15None=null;if(G.pick15==='fwd'){G.pick15=null;pickBar15();}},5000);}
    const kk=k+(k==='fwd'?(fwdAnchors15().length?'+':'0'):'');if(el.dataset.k!==kk){el.dataset.k=kk;el.innerHTML=`<span>${t}</span><button onclick="G.pick15=null;window.ringShow64&&ringShow64(null);pickBar15()">Cancel</button>`;}}
  window.pickBar15=pickBar15;setInterval(()=>{try{pickBar15();}catch(e){}},1000);
  function pick15(kind){G.pick15=kind;G.pick15At=Date.now();setTimeout(pickBar15,0);try{UI.closeModal();UI.close&&UI.close();}catch(e){}}
  window.pick15=pick15;
  const _it15=UI.infoTile;UI.infoTile=function(id){if(G.pick15&&Date.now()-(G.pick15At||0)>180e3)G.pick15=null;const k=G.pick15;if(!k)return _it15.apply(this,arguments);
    if(k==='hq'){return UI.modal(`<h2>🏛️ Alliance HQ here?</h2><p>${hexName(id)}. Teammates can jump here and build their Strongholds within ${B15.hqMi} mi.</p><input id="hq15name" maxlength="24" placeholder="HQ name (e.g. Rathdrum)" value="${esc15((hq15()||{}).name||'')}"><div class="btns24"><button class="red24" onclick="setHq15('${id}',$('#hq15name').value)">✅ Place HQ</button><button class="ghost24" onclick="G.pick15=null;UI.closeModal()">Cancel</button></div>`);}
    if(k==='sh'){const why=startOk15(id);if(why){toast('🚫 '+why);return;}const old=shHex15();return UI.modal(`<h2>🏰 Stronghold here?</h2><p>${hexName(id)} near the alliance HQ.${old&&!homeOp15()?' Your current Stronghold spot becomes your 🏡 Home Outpost, so driving and pipelines keep working there.':''} Moving again is possible after 7 days.</p><div class="btns24"><button class="red24" onclick="G.pick15=null;moveSh15('${id}')">✅ Build here</button><button class="ghost24" onclick="UI.closeModal()">Pick another</button></div>`);}
    if(k==='fwd'){const why=window.fwdOk15(id);if(why){toast('🚫 '+why);return;}const c=outpostCost(),cost=Object.entries(c).map(([kk,v])=>`${v} ${RES[kk]}`).join(' ');
      const nb=fwdNearest15(id),nm=nb?esc15((typeof who24==='function'?who24(nb.uid).name:'')||'a teammate'):'a teammate';
      let rp=null;try{rp=window.ringPreview64?ringPreview64(id,'fwd'):null;if(window.ringShow64)ringShow64(id,'fwd');}catch(e){}
      return UI.modal(`<h2>🚩 Forward Outpost here?</h2><p>${hexName(id)}${nb?` · ${fmtMi(nb.mi*1.60934)} from ${nm}'s land`:''}</p>${rp?`<p><b>${claimLine64(rp)}</b>${rp.revive?`<br>${reviveLine64(rp,'fwd')}`:''}</p>`:''}<p class="tiny">It guards these hexes like any outpost. 🌀 Portal troops in to defend it and march from it. You can't claim by walking here unless you're really there.</p><p class="tiny">Cost ${cost} · ${ops15('fwd').length}/${B15.fwdMax} used</p><div class="btns24"><button class="red24" onclick="G.pick15=null;window.ringShow64&&ringShow64(null);placeSpecial15('${id}','fwd')">✅ Build</button><button class="ghost24" onclick="UI.closeModal()">Pick another</button></div>`);}
    return _it15.apply(this,arguments);};
  window.setHq15=async function(id,name){if(!isOfficer15())return toast('🚫 Only the leader or officers can place the HQ');const c=ctr(id),nm=clean15(name)||'HQ';G.pick15=null;
    try{await hqTx15(cur=>{if(!cur)throw new Error('Claim leadership first');return{...cur,hq:{hex:id,name:nm,by:P.uid,byName:P.name,t:Date.now()}};});
      allianceLog(`🏛️ ${P.name} set the alliance HQ: ${nm}`);toast('🏛️ HQ placed');UI.closeModal();drawHq15();}catch(e){toast('🚫 '+(e.message||e));}};

  // ---------- Alliance tab: 🏛️ HQ ----------
  try{AT26.hq={n:'🏛️ HQ',parts:['hq']};UI.SUBS.alliance=Object.entries(AT26).map(([k,v])=>[k,v.n]);}catch(e){}
  function hqHtml15(){const h=hq15(),me=P.uid,rk=myRank15(),s=shHex15(),M=(G.al&&G.al.members)||{};let x=`<h2>🏛️ Alliance HQ</h2>`;
    if(!ranksOn15())return x+`<p>Nobody leads this alliance yet. The leader places the HQ, names officers and approves bank withdrawals.</p><button class="red24" onclick="claimLeader15()">👑 Claim leadership</button>`;
    if(h){const d=s?kmBetween(h.hex,s):null;x+=`<div class="row"><div class="grow"><b>${esc15(h.name)}</b><small>${hexName(h.hex)} · set by ${esc15(h.byName||'the leader')}${d!=null?` · your Stronghold is ${fmtMi(d)} away`:''}</small></div><button onclick="jumpHq15()">🧭 Jump</button></div>`;
      if(!s||d>B15.hqMi*MI/1000)x+=`<div class="row"><div class="grow"><b>Play next to the crew</b><small>Build your Stronghold within ${B15.hqMi} mi of the HQ. ${s?'Your current spot becomes your 🏡 Home Outpost so driving, pipelines and resources keep working there.':''}</small></div><button class="red24" onclick="jumpHq15();setTimeout(()=>pick15('sh'),300)">🏰 Pick a spot</button></div>`;}
    else x+=`<p class="tiny">No HQ yet.${isOfficer15()?'':' The leader or an officer places it.'}</p>`;
    if(isOfficer15()&&!(G.hq15&&G.hq15.bld&&G.hq15.bld.built))x+=`<div class="btns24"><button onclick="pick15('hq')">🏛️ ${h?'Move':'Place'} HQ (tap the map)</button></div>`;
    const lu=leaderUid15(),lm=M[lu]||{};if(rk==='officer'&&lu&&Date.now()-(lm.lastActive||0)>=14*864e5)x+=`<button class="ghost24" onclick="takeOver15()">👑 Take over (leader inactive 14+ days)</button>`;
    // ranks
    const rows=Object.entries(M).sort((a,c)=>({leader:0,officer:1,member:2}[rankOf15(a[0])]-{leader:0,officer:1,member:2}[rankOf15(c[0])]));
    x+=`<h3>Ranks</h3><p class="tiny">👑 Leader: ranks, titles, HQ, bank. ⭐ Officers: titles, HQ, bank. Tap a name to set a title${rk==='leader'?' or rank':''}.</p>`+rows.map(([u,m])=>`<div class="rp26" onclick="UI.person26('${u}')"><span class="ri">${typeof av24==='function'?av24(u,26):'👤'}</span><div class="grow"><b>${esc15(isMe(u)?P.name+' (you)':m.name||'Teammate')}</b>${badge15(u)||'<span class="rkx15"></span>'}</div><span class="chev">›</span></div>`).join('');
    // bases
    x+=`<h3>Your bases</h3>`+basesHtml15();return x;}
  function basesHtml15(){const L=myBases15(),cb=curBase15();let x='';
    x+=`<div class="row"><div class="grow"><b>📍 Here (GPS)</b><small>Claim by walking and driving where you really are</small></div>${cb==='gps'?'<span class="tiny">● now</span>':`<button onclick="setOp15('gps')">Use</button>`}</div>`;
    for(const id of L){const n=poolOf15(id),on=opHex15()===id;x+=`<div class="row"><div class="grow"><b>${baseLabel15(id)}</b><small>${hexName(id)} · 🪖 ${n.toLocaleString()} troops${window.baseLine64?' · '+baseLine64(id):''}</small></div>${on?'<span class="tiny">● now</span>':`<button onclick="setOp15('${id===shHex15()?'sh':id}')">Operate</button>`}<button onclick="UI.portal15('${id}')">🌀</button></div>`;}
    const P15=portalList15();if(P15.length)x+=`<h3>🌀 In the portal</h3>`+P15.map(p=>`<div class="row"><div class="grow">${p.n.toLocaleString()} troops → ${baseLabel15(p.to)}<small>arrive in ${fmtDur(Math.max(0,p.at-now()))}</small></div></div>`).join('');
    const f=ops15('fwd').length;x+=`<p class="tiny">🚩 Forward Outposts ${f}/${B15.fwdMax}: open a teammate's card and tap "Forward Outpost near them".</p>`;return x;}
  UI.hq15=function(){try{this.tab='alliance';this.sub.alliance='hq';UI.open?UI.open('alliance'):UI.render();}catch(e){UI.modal(hqHtml15());}};
  UI.bases15=function(){UI.modal(`<h2>🏰 Your bases</h2>`+basesHtml15());};
  HOOK.render(function(){try{if(this.tab!=='alliance'||this.sub.alliance!=='hq')return;const b=$('#sheetBody');if(!b||b.querySelector('.p-hq'))return;b.innerHTML=this.subnav('alliance')+`<section class="part26 p-hq">${hqHtml15()}</section>`;}catch(e){console.warn('hq15',e);}});
  // portal screen
  UI.portal15=function(to){const L=myBases15().filter(b=>b!==to&&poolOf15(b)>0);if(!L.length)return toast('🚫 No other base has troops to send');
    const opt=L.map(b=>`<option value="${b}">${baseLabel15(b)} · ${poolOf15(b).toLocaleString()} troops · ${fmtDur(portalMs15(b,to))}</option>`).join('');
    UI.modal(`<h2>🌀 Portal troops to ${baseLabel15(to)}</h2><p class="tiny">${hexName(to)} · 20 min + about 10 min for every 60 mi, max 3 h. No return penalty. Troops in the portal can't fight.</p>
      <select id="pt15from">${opt}</select><div class="btns24">${[.25,.5,1].map(f=>`<button onclick="portal15($('#pt15from').value,'${to}',Math.floor(poolOf15($('#pt15from').value)*${f}))">${f===1?'All':Math.round(f*100)+'%'}</button>`).join('')}</div>`);};
  // teammate card: forward outpost near them + jump
  const _pp15=UI.person26;if(_pp15)UI.person26=function(uid){const r=_pp15.apply(this,arguments);try{if(isMe(uid))return r;const mb=$('#modalBody');if(!mb||mb.querySelector('.fw15'))return r;const m=((G.al&&G.al.members)||{})[uid]||{};
      const d=(Array.isArray(m.defs)?m.defs:[]).find(x=>x&&x.k==='sh'&&x.hex)||(Array.isArray(m.defs)?m.defs:[]).find(x=>x&&x.hex);if(!d)return r;
      mb.insertAdjacentHTML('beforeend',`<div class="btns24 fw15"><button onclick="map.setView(hexCenter(...idQR('${d.hex}')),14);UI.closeModal();try{UI.close()}catch(e){}">🧭 Jump to their base</button><button ${ops15('fwd').length>=B15.fwdMax?'disabled':''} onclick="map.setView(hexCenter(...idQR('${d.hex}')),13);pick15('fwd')">🚩 Forward Outpost near them</button></div>`);}catch(e){}return r;};
  // outpost card: kind + troops + portal
  const _io15=UI.infoOutpost;UI.infoOutpost=function(id){const r=_io15.apply(this,arguments);try{const o=(W().outposts||{})[id];const mb=$('#modalBody');if(!o||!mb||mb.querySelector('.op15'))return r;
      mb.insertAdjacentHTML('afterbegin',`<div class="op15"><b>${baseLabel15(id)}</b> · 🪖 ${poolOf15(id).toLocaleString()} troops here${o.state==='up'?`<div class="btns24"><button onclick="UI.portal15('${id}')">🌀 Portal troops here</button>${opHex15()===id?'':`<button onclick="setOp15('${id}')">Operate from here</button>`}</div>`:''}</div>`);}catch(e){}return r;};

  // ---------- operating bar ----------
  function bar15(force){let el=document.getElementById('op15');const L=myBases15();if(!P.name||!L.length){if(el)el.remove();return;}
    const cb=curBase15(),h=opHex15(),key=cb+'|'+L.join(',')+'|'+portalList15().length+'|'+(G.op15open?1:0);if(el&&!force&&el.dataset.k===key)return;
    if(!el){el=document.createElement('div');el.id='op15';document.body.appendChild(el);}el.dataset.k=key;
    const cur=h?baseLabel15(h).split(' ')[0]:'📍',dot=portalList15().length?'<small>🌀</small>':'';
    if(!G.op15open){el.className='';el.innerHTML=`<button class="on" title="Where you play from" aria-label="Where you play from: ${h?baseLabel15(h):'GPS'}. Tap to change" onclick="G.op15open=1;bar15(true)">${cur}${dot}</button>`;return;}
    el.className='open';
    el.innerHTML=`<button class="${cb==='gps'?'on':''}" title="Here (GPS)" aria-label="Play from where you are (GPS)" onclick="G.op15open=0;setOp15('gps')">📍</button>`+L.slice(0,4).map(id=>`<button class="${h===id?'on':''}" title="${baseLabel15(id)}" aria-label="Operate from ${baseLabel15(id)}" onclick="G.op15open=0;setOp15('${id===shHex15()?'sh':id}')">${baseLabel15(id).split(' ')[0]}</button>`).join('')+`<button title="Bases and portal" aria-label="Bases and portal" onclick="G.op15open=0;bar15(true);UI.bases15()">${portalList15().length?'🌀':'⚙︎'}</button>`;}
  window.bar15=bar15;setInterval(()=>{try{bar15();}catch(e){}},1500);

  // ---------- migration: old automatic remote mode ----------
  function migrate15(){try{if(!P.world||P.mig15)return;if(P.far25){if(P.far25.on&&shHex15())P.op15='sh';delete P.far25;}P.mig15=1;save();}catch(e){}}
  setInterval(migrate15,3000);migrate15();
  window.isFar25=()=>curBase15()!=='gps';

  const st=document.createElement('style');st.textContent=`#op15{position:fixed;top:calc(env(safe-area-inset-top,0px) + 214px);right:8px;z-index:590;display:flex;flex-direction:column;gap:5px;background:rgba(20,16,12,.86);padding:5px;border-radius:14px;border:1px solid #6b5a3a}
  #op15 button{width:42px;height:42px;min-height:0;min-width:0;padding:0;margin:0;font:400 19px/1 system-ui,sans-serif;text-transform:none;letter-spacing:0;background:#1d1a16;color:#ddd;border:1px solid #3a3226;border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:none}
  #op15 button.on{background:#ffd24a;border-color:#ffd24a;box-shadow:0 0 0 2px #ffd24a55}#op15.open{flex-direction:row-reverse}#op15 button{position:relative}#op15 small{position:absolute;right:-4px;top:-6px;font-size:12px}
  body.drive #op15{display:none}.hq15ico{transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;font-size:26px;filter:drop-shadow(0 2px 3px #000)}.hq15ico b{font-size:11px;background:#111;color:#ffd24a;padding:0 5px;border-radius:6px;white-space:nowrap}
  #pick15{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 72px);z-index:870;display:flex;gap:10px;align-items:center;background:#241c10f2;border:1.5px solid #ffd24a;color:#ffe9a8;padding:8px 10px 8px 14px;border-radius:14px;font-size:14px;width:min(520px,calc(100vw - 24px));box-sizing:border-box;box-shadow:0 4px 14px #000a}
  #pick15 span{flex:1 1 auto;line-height:1.3}#pick15 button{flex:0 0 auto}.op15{margin-bottom:8px}#hq15name{width:100%;padding:8px;border-radius:8px;border:1px solid #444;background:#151515;color:#eee;margin:6px 0}#pt15from{width:100%;padding:9px;margin:6px 0;border-radius:8px;border:1px solid #6b5a3a;background:#151515;color:#eee;font-size:14px}`;document.head.appendChild(st);
})();
