// horde8 (test server): the horde plays by player rules.
// 1) squads walk at player march speed (one hex per BAL.march.secPerHex), along a path line drawn on the map with a timer;
// 2) they claim tiles as they go (squadStep already does); 3) no random raider hits (aiAttack chance 0);
// 4) a squad may launch an intercept march at a player march it can see; the fight happens only if it physically reaches the meeting hex in time.
BAL.horde.stepMin=BAL.march.secPerHex/60;BAL.factions.maxCatchUpDays=Math.min(BAL.factions.maxCatchUpDays||2,2);BAL.ai.attackChance=0;
const H8_STEP=()=>BAL.horde.stepMin*60e3;
// switch an older save's step index to the new step size once (no 14-day replay)
const _fcu8=factionCatchUp;factionCatchUp=function(){try{const fx=P.world&&P.world.fx;if(fx&&fx.start&&fx.v8!==H8_STEP()){fx.v8=H8_STEP();fx.last=Math.floor(Date.now()/H8_STEP());}}catch(e){}return _fcu8.apply(this,arguments);};
// where a march is at time t (hex index along its track), and when it passes hex i
function marchAt(m,i,len){return m.startT+m.dur*(i/Math.max(1,len-1));}
function visibleMarches(now){return Object.entries(G.marches||{}).filter(([,m])=>m&&m.state==='out'&&now<m.startT+m.dur&&!['intercept','patrol'].includes(m.kind)).filter(([,m])=>marchTrack(m.from,m.to).some(isVis));}
// pick a meeting hex the squad can reach no later than the march passes it
function planIntercept(s,fid,now){if(now<(s.woundUntil||0)&&now<(s.restUntil||0))return false; /* v23: a beaten, retreating squad stays home */if(s.icept||!s.pos||!isVis(s.pos))return false;const step=H8_STEP();
  for(const [mid,m] of visibleMarches(now)){const tr=marchTrack(m.from,m.to);for(let i=1;i<tr.length;i++){const h=tr[i];if(!isVis(h))continue;const d=hexDist(s.pos,h);if(d>BAL.horde.sortieHexes)continue;
      const arrive=now+d*step,pass=marchAt(m,i,tr.length);if(arrive<=pass){const path=marchTrack(s.pos,h).slice(1);s.path=path;s.target=h;s.why='intercept march';s.icept={mid,hex:h,pass,eta:arrive,from:s.pos};s.restUntil=0;return true;}}}
  return false;}
const _step8=squadStep;squadStep=function(f,fid,s,k,t,ev){if(s.icept&&t>s.icept.pass+H8_STEP()*2&&s.pos!==s.icept.hex){delete s.icept;s.path=[];} // missed it: give up
  if(!s.icept&&!(f.routedUntil)&&Math.abs(Date.now()-t)<H8_STEP()*2)planIntercept(s,fid,t);
  const r=_step8.apply(this,arguments);if(s.icept&&s.pos===s.icept.hex&&!s.icept.at)s.icept.at=t;return r;};
// interception: only an intercept march that reached the meeting hex in time, or a visible squad standing where the march is right now. Newbie protection kept.
interceptor=function(m){if(marchesDone()<NEWBIE_MARCHES&&!(m&&m.kind==='intercept'))return null;const fx=P.world&&P.world.fx;if(!fx||!fx.f)return null;try{factionCatchUp(true);}catch(e){}
  const tr=marchTrack(m.from,m.to),mid=m.id||Object.keys(G.marches||{}).find(k=>G.marches[k]===m);
  for(const [fid,f] of Object.entries(fx.f).sort()){if(f.routedUntil)continue;for(const s of f.squads||[]){if(!s||!s.pos)continue;
    if(s.icept&&s.icept.mid===mid&&s.icept.at&&s.icept.at<=s.icept.pass+H8_STEP()&&isVis(s.icept.hex)){const hx=s.icept.hex;delete s.icept;return{fid,f,s,hex:hx};}
    if(isVis(s.pos)&&s.pos===m.to)return{fid,f,s,hex:s.pos};}}return null;};
// map: squad path ahead as a line + timer (like a player march)
const _draw8=drawWorld;drawWorld=function(){_draw8.apply(this,arguments);try{if(!P.world||!map||map.getZoom()<13||!(G.lay||{}).enemy)return;const fx=P.world.fx;if(!fx||!fx.f)return;const g=G.layers.terr,now=Date.now(),step=H8_STEP();
  for(const [fid,f] of Object.entries(fx.f)){const d=fdef(fid);for(const s of f.squads||[]){if(!s.pos||!isVis(s.pos)||!s.path||!s.path.length||now<s.restUntil)continue;
    const ll=[s.pos,...s.path].map(id=>hexCenter(...idQR(id)));L.polyline(ll,{color:'#120d08',weight:9,opacity:.5,interactive:false,className:'sqpath-bg'}).addTo(g);L.polyline(ll,{color:d.color,weight:5,opacity:.95,dashArray:'10 8',interactive:false,className:'sqpath'+(s.icept?' sqicept':'')}).addTo(g);
    const left=s.path.length*step;L.marker(ll[ll.length-1],{icon:L.divIcon({className:'lodm',html:`<div class="tgt24" style="--a:${d.color}">${s.icept?'⚔️ Intercept':'🎯 '+d.name+' target'} · ${fmtDur(left)}</div>`,iconSize:[0,0]}),zIndexOffset:630}).addTo(g);}}}catch(e){console.warn('sqpath',e);}};
setInterval(()=>{try{if(P.world&&P.world.fx&&P.world.fx.start){factionCatchUp(true);drawWorld();}}catch(e){}},20000);
