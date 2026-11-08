// front15 (TEST, build 12i) Regional horde fronts.
//  The horde used to be one simulation around one spot, so a base far away (Kansas) never saw a raider.
//  Now bases that sit within 15 mi of each other form a front. The main front is centred on the HQ (or the first
//  Stronghold). Any base more than 15 mi from every front opens a new front: its own three raider clans spawn around it,
//  rest 48 h first, and scale to the armies of the players who have bases in that front. All fronts live in the same
//  shared horde doc, so every phone runs the same history. Max 6 extra fronts; a front with no base for 7 days closes.
(function(){
  const F15={frontKm:15*1.60934,maxFronts:6,graceH:48,closeDays:7};
  window.F15=F15;
  const ctr=id=>hexCenter(...idQR(id));
  const km=(a,b)=>{const x=ctr(a),y=ctr(b);return distM(x[0],x[1],y[0],y[1])/1000;};
  const BASE_DEFS=BAL.factions.list.filter(d=>!d.front15).map(d=>({...d}));
  // every base in the alliance (shared through member docs: Strongholds and outposts), plus mine
  function allBases15(){const out=[];const add=(hex,uid,name)=>{if(hex&&typeof hex==='string'&&/^-?\d+_-?\d+$/.test(hex))out.push({hex,uid,name});};
    try{const s=W().sh;if(s&&s.state!=='down')add(s.hex,P.uid,P.name);for(const [id,o] of Object.entries(W().outposts||{}))if(o.state!=='down')add(id,P.uid,P.name);}catch(e){}
    try{for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||!Array.isArray(m.defs))continue;for(const d of m.defs)if(d&&(d.k==='sh'||d.k==='op'))add(d.hex,uid,m.name);}}catch(e){}
    return out.sort((a,b)=>a.hex<b.hex?-1:a.hex>b.hex?1:0);}
  window.allBases15=allBases15;
  function fronts(){const fx=FX();fx.fronts15=fx.fronts15||{};return fx.fronts15;}
  function defsOf15(K){return BASE_DEFS.map(d=>({...d,id:d.id+'~'+K,front15:K,name:d.name+((fronts()[K]&&fronts()[K].label)?' · '+fronts()[K].label:'')}));}
  // register every front's clans so lookups by id (names, colours, strategies) work everywhere
  function registerDefs15(){const B=BAL.factions,keep=B.list.filter(d=>!d.front15);const extra=[];for(const K of Object.keys(fronts()))extra.push(...defsOf15(K));B.list=[...keep,...extra];
    try{for(const d of extra){const base=d.id.split('~')[0];if(typeof STRAT_OF!=='undefined'&&STRAT_OF[base]&&!STRAT_OF[d.id])STRAT_OF[d.id]=STRAT_OF[base];}}catch(e){}}
  window.registerDefs15=registerDefs15;
  // open / close fronts
  function planFronts15(){const fx=FX();if(!fx.start||!fx.anchor)return false;const F=fronts(),t=Date.now();let ch=false;
    const anchors=()=>[fx.anchor,...Object.values(F).map(f=>f.anchor)];const bases=allBases15();
    for(const b of bases){if(Object.keys(F).length>=F15.maxFronts)break;if(anchors().some(a=>km(a,b.hex)<=F15.frontKm))continue;
      const step=HB().stepMin*60e3;F[b.hex]={anchor:b.hex,since:Math.floor(t/step)*step,label:(b.name?b.name+"'s area":'far front'),takes:{}};ch=true;break;}  // one per pass: deterministic and gentle
    for(const [K,f] of Object.entries(F)){const live=bases.some(b=>km(b.hex,f.anchor)<=F15.frontKm);if(live){f.seen=t;continue;}
      if(t-(f.seen||f.since)>F15.closeDays*864e5){for(const id of Object.keys(fx.f))if(id.endsWith('~'+K))delete fx.f[id];delete F[K];ch=true;try{fxDirty();}catch(e){}}}
    if(ch)registerDefs15();return ch;}
  window.planFronts15=planFronts15;
  // which players count toward a front's horde scaling (bal14 reads this)
  G._front15=null;
  window.frontUids15=function(){const fx=FX(),a=G._front15?(fronts()[G._front15]||{}).anchor:fx.anchor;if(!a)return null;const u=new Set();for(const b of allBases15())if(km(b.hex,a)<=F15.frontKm)u.add(b.uid);return u.size?u:null;};
  // run the horde step once per front, each with its own clans, centre and daily take counter
  const _hs15=hordeStep;hordeStep=function(k,ev){const B=BAL.factions,fx=FX(),all=B.list,a0=fx.anchor,tk0=fx.takes;
    try{B.list=all.filter(d=>!d.front15);G._front15=null;_hs15.call(this,k,ev);
      for(const [K,f] of Object.entries(fronts())){const t=k*HB().stepMin*60e3;if(t<f.since)continue;B.list=defsOf15(K);fx.anchor=f.anchor;f.takes=f.takes||{};fx.takes=f.takes;G._front15=K;
        try{_hs15.call(this,k,ev);
          for(const d of B.list){const x=fx.f[d.id];if(x&&!x.g15){x.g15=1;for(const s of (x.squads||[]))s.restUntil=Math.max(s.restUntil||0,f.since+F15.graceH*3600e3);}}}
        catch(e){console.warn('front15 step',K,e);}}}
    finally{B.list=all;fx.anchor=a0;fx.takes=tk0;G._front15=null;}
    try{for(const f of Object.values(fronts()))Object.keys(f.takes||{}).sort().slice(0,-3).forEach(d=>delete f.takes[d]);}catch(e){}};
  window.hordeStep=hordeStep;
  const _fc15=factionCatchUp;factionCatchUp=function(){try{registerDefs15();planFronts15();}catch(e){console.warn('front15',e);}return _fc15.apply(this,arguments);};
  window.factionCatchUp=factionCatchUp;
  // a horde doc from another phone may carry new fronts
  try{const _ah15=adoptHorde;adoptHorde=function(){const r=_ah15.apply(this,arguments);try{registerDefs15();}catch(e){}return r;};window.adoptHorde=adoptHorde;}catch(e){}
  setTimeout(()=>{try{registerDefs15();}catch(e){}},500);
})();
