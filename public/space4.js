// space4 (R4) One spacing rule for every building that protects hexes, and a free move for a Stronghold that overlaps.
//  A building protects the hexes within its radius (Stronghold 2+, tower 1+, outposts 1; radii grow with level).
//  Allies: areas may touch edges but never share a hex (distance >= radius A + radius B + 1).
//  Enemies (Horde buildings now, other alliances later): one free hex between areas (distance >= rA + rB + 2).
//  Your own buildings may overlap each other (a tower inside your Stronghold area is how you stack defense).
//  Checked everywhere a building is placed: the automatic first Stronghold, Pick a spot near the HQ, towers, outposts,
//  Home and Forward Outposts, and the free move. While picking on the map, the hexes you can use are outlined.
//  Areas can still grow into each other later as buildings level up; they keep defending together (allies' buildings
//  already help defend each other's hexes), the rule only stops new overlaps.
(function(){
  const S4={allyGap:1,enemyGap:2,enemyR:1,freeMoveMi:3,searchRings:14};
  window.S4=S4;
  function myR4(kind,lvl){try{if(kind==='sh')return shRadius();if(kind==='tower')return towerRadiusAt(lvl||1);return BAL.outpost.radius||1;}catch(e){return kind==='sh'?2:1;}}
  window.myR4=myR4;
  // other players' buildings (allies) and enemy buildings (Horde Strongholds and outposts)
  function others4(){const out=[];
    for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||m.me||!Array.isArray(m.defs))continue;
      for(const d of m.defs)if(d&&typeof d.hex==='string'&&/^-?\d+_-?\d+$/.test(d.hex))out.push({hex:d.hex,r:Math.max(0,+d.r||0),k:d.k,who:m.name||'a teammate',uid,enemy:false,t:d.t||0});}
    try{for(const [fid,x] of Object.entries((FX()&&FX().f)||{})){if(!x)continue;const nm=(typeof fdef==='function'&&fdef(fid)||{}).name||'the Horde';
      if(typeof x.home==='string'&&(x.tiles||{})[x.home])out.push({hex:x.home,r:S4.enemyR,k:'hq',who:nm,enemy:true});for(const h of Object.keys(x.outposts||{}))if((x.tiles||{})[h])out.push({hex:h,r:S4.enemyR,k:'op',who:nm,enemy:true});}}catch(e){}
    try{const h=window.hqHex15&&hqHex15(),b=G.hq15&&G.hq15.bld;if(h&&b&&b.built)out.push({hex:h,r:2,k:'ahq',who:'the alliance',uid:'hq',enemy:false,t:b.t||0});}catch(e){} // R6: the HQ area
    return out;}
  window.others4=others4;
  const KN={sh:'Stronghold',tower:'tower',op:'outpost',hq:'Stronghold',ahq:'HQ'};
  // null when a building of this kind can go on this hex, else the reason
  function spaceWhy4(hex,kind,lvl){const r=myR4(kind,lvl);for(const o of others4()){const need=r+o.r+(o.enemy?S4.enemyGap:S4.allyGap),d=hexDist(hex,o.hex);
      if(d<need)return o.enemy?`Too close to ${o.who}'s ${KN[o.k]||'base'}. Keep a free hex between your areas.`:`Too close to ${o.who}'s ${KN[o.k]||'building'} area. Areas can touch but not overlap.`;}
    return null;}
  window.spaceWhy4=spaceWhy4;
  // older checks used allyBldNear(id,1) for Strongholds: they now use the full rule
  allyBldNear=function(id){const o=others4().find(o=>!o.enemy&&hexDist(id,o.hex)<myR4('sh')+o.r+S4.allyGap);return o?{m:{name:o.who},d:{k:o.k,hex:o.hex}}:null;};window.allyBldNear=allyBldNear;
  // the automatic first Stronghold: the nearest hex that passes
  try{pickStartHex26=function(){let id=hexAt(...G.pos).id;if(startHexFree26(id)&&!spaceWhy4(id,'sh'))return id;const [q,r]=idQR(id);
      for(let ring=1;ring<=S4.searchRings;ring++)for(const x of hexRing(q,r,ring))if(hexDist(x.id,id)===ring&&startHexFree26(x.id)&&!spaceWhy4(x.id,'sh'))return x.id;return id;};window.pickStartHex26=pickStartHex26;}catch(e){}
  // placements
  const guard=(fn,kind,lvlOf)=>function(id){const w=spaceWhy4(id,typeof kind==='function'?kind.apply(this,arguments):kind,lvlOf?lvlOf(id):1);if(w){toast('🚫 '+w);return;}return fn.apply(this,arguments);};
  try{placeTower=guard(placeTower,'tower');window.placeTower=placeTower;}catch(e){}
  try{placeOutpost=guard(placeOutpost,'op');window.placeOutpost=placeOutpost;}catch(e){}
  try{if(window.placeSpecial15)window.placeSpecial15=guard(window.placeSpecial15,'op');}catch(e){}
  try{if(typeof placeStronghold==='function'){placeStronghold=guard(placeStronghold,'sh');window.placeStronghold=placeStronghold;}}catch(e){}
  try{if(window.moveSh15)window.moveSh15=guard(window.moveSh15,'sh');}catch(e){}
  try{if(window.startOk15){const _so=window.startOk15;window.startOk15=function(id){return _so.apply(this,arguments)||spaceWhy4(id,'sh');};}}catch(e){}
  try{if(window.fwdOk15){const _fo=window.fwdOk15;window.fwdOk15=function(id){return _fo.apply(this,arguments)||spaceWhy4(id,'op');};}}catch(e){}
  // ---------- building times (newer of two overlapping buildings is the one that should move)
  const _ods=ownDefStructs;ownDefStructs=function(){const out=_ods.apply(this,arguments);try{const w=W();
      for(const d of out){const o=d.k==='sh'?w.sh:d.k==='tower'?(w.towers||{})[d.hex]:(w.outposts||{})[d.hex];if(o&&o.t4)d.t=o.t4;}}catch(e){}return out;};window.ownDefStructs=ownDefStructs;
  function stamp4(){try{const w=W(),now=Date.now();let ch=false;const st=o=>{if(o&&o.state!=='down'&&o.t4==null){o.t4=0;ch=true;}};st(w.sh);Object.values(w.towers||{}).forEach(st);Object.values(w.outposts||{}).forEach(st);return ch;}catch(e){return false;}}
  // anything placed from now on gets its time; buildings from before R4 are 0 ("unknown")
  for(const n of ['placeTower','placeOutpost','placeStronghold']){try{const f=window[n];if(typeof f!=='function')continue;window[n]=function(id){const r=f.apply(this,arguments);try{const w=W();const o=(w.sh&&w.sh.hex===id)?w.sh:(w.towers||{})[id]||(w.outposts||{})[id];if(o&&!o.t4){o.t4=Date.now();save();}}catch(e){}return r;};
    if(n==='placeTower')placeTower=window[n];else if(n==='placeOutpost')placeOutpost=window[n];else placeStronghold=window[n];}catch(e){}}
  // ---------- overlap check for my Stronghold, and the free move
  function overlap4(){try{const s=W().sh;if(!s||s.state==='down')return null;const r=myR4('sh');let worst=null;
      for(const o of others4()){if(o.enemy)continue;const d=hexDist(s.hex,o.hex);if(d<=r+o.r){if(!worst||d<worst.d)worst={...o,d};}}
      if(!worst)return null;const mine=s.t4||0;worst.mineNewer=mine&&worst.t?mine>worst.t:null;return worst;}catch(e){return null;}}
  window.overlap4=overlap4;
  function freeMoveOk4(id){const s=W().sh;if(!s)return'You have no Stronghold';if(id===s.hex)return'That is where it is now';
    const km=(a,b)=>{const x=hexCenter(...idQR(a)),y=hexCenter(...idQR(b));return distM(x[0],x[1],y[0],y[1])/1000;};
    if(km(id,s.hex)>S4.freeMoveMi*1.60934)return`Pick a spot within ${S4.freeMoveMi} mi of your Stronghold`;
    if(factionAt(id))return'Raiders hold that hex';const o=G.terr&&G.terr[id];if(o&&!o.released&&!o.ai&&o.uid&&!isMe(o.uid))return'That hex belongs to a teammate';
    return spaceWhy4(id,'sh');}
  window.freeMoveOk4=freeMoveOk4;
  window.freeMove4=function(id){const why=freeMoveOk4(id);if(why)return toast('🚫 '+why);const s=W().sh,old=s.hex;if(!overlap4())return toast('Your Stronghold no longer overlaps anyone');
    s.hex=id;s.t4=Date.now();s.free4=1;if(!P.tiles[id]){try{claimTile(id);}catch(e){}}try{shClaimArea();}catch(e){}save();try{pushMember();drawWorld();}catch(e){}
    G.pick15=null;try{pickBar15();}catch(e){}UI.closeModal();toast('🏰 Stronghold moved. Your tiles and pipelines stay yours.');try{allianceLog(`🏰 ${P.name} moved their Stronghold so its area no longer overlaps`);}catch(e){}};
  window.startFree4=function(){G.pick15='free4';G.pick15At=Date.now();try{pickBar15();}catch(e){}try{UI.closeModal();UI.close&&UI.close();}catch(e){}toast('Tap a highlighted hex for your Stronghold');};
  // map pick: the free move uses the same pick bar as the other map picks
  const _it=UI.infoTile;UI.infoTile=function(id){if(G.pick15==='free4'){const why=freeMoveOk4(id);if(why){toast('🚫 '+why);return;}
      return UI.modal(`<h2>🏰 Move your Stronghold here?</h2><p>${hexName(id)}. Free, one time. Your tiles, pipelines, towers and troops stay as they are.</p><div class="btns24"><button class="red24" onclick="freeMove4('${id}')">✅ Move here</button><button class="ghost24" onclick="UI.closeModal()">Pick another</button></div>`);}
    return _it.apply(this,arguments);};
  // the card that offers it (once per session, and in the Base tab until it's fixed)
  function offerText4(o){return `Your Stronghold's area overlaps ${o.who}'s ${KN[o.k]||'building'} area.${o.mineNewer===false?` Yours was there first, so ${o.who} can move theirs for free.`:''} Pick a new spot nearby. This move is free.`;}
  setInterval(()=>{try{if(!P.world||G._off4)return;const o=overlap4();if(!o||o.mineNewer===false||(P.ov4keep||{})[o.uid])return;G._off4=1;
      UI.info({title:'🏰 Your area overlaps',body:`<p>${offerText4(o)}</p><p class="tiny">Your tiles, pipelines and troops stay yours. Until one of you moves, both buildings defend the shared hexes.</p>`,buttons:[['📍 Pick a new spot',()=>startFree4(),'fight'],['Mine stays here',()=>{P.ov4keep=P.ov4keep||{};P.ov4keep[o.uid]=Date.now();save();UI.closeModal();toast(`OK. ${o.who} can move theirs for free.`);}]]});}catch(e){}},8000);
  HOOK.render(function(){try{if(this.tab!=='base'||this.sub.base!=='fort')return;const b=$('#sheetBody');if(!b||b.querySelector('.ov4'))return;const o=overlap4();if(!o)return;
    b.querySelector('h2')?.insertAdjacentHTML('afterend',`<div class="row ov4"><div class="grow"><b>⚠️ Area overlaps ${o.who}</b><small>${offerText4(o)}</small></div>${o.mineNewer===false?'':'<button onclick="startFree4()">📍 Move free</button>'}</div>`);}catch(e){console.warn('ov4',e);}});
  // ---------- while picking on the map, outline the hexes you can use
  const valid4={hq:null,sh:id=>window.startOk15?!window.startOk15(id):!spaceWhy4(id,'sh'),fwd:id=>window.fwdOk15?!window.fwdOk15(id):!spaceWhy4(id,'op'),free4:id=>!freeMoveOk4(id)};
  let lay4=null,key4='';
  function drawPick4(){try{if(typeof map==='undefined')return;const k=G.pick15&&Date.now()-(G.pick15At||0)<=180e3?G.pick15:null,ok=k&&valid4[k];
      const c=map.getCenter(),z=map.getZoom(),kk=ok?`${k}|${c.lat.toFixed(3)}|${c.lng.toFixed(3)}|${z}|${G.terrV15||0}`:''; // R6.4: territory arriving redraws the green hexesif(kk===key4)return;key4=kk;
      if(lay4){lay4.remove();lay4=null;}if(!ok||z<13)return;lay4=L.layerGroup().addTo(map);const ctr=hexAt(c.lat,c.lng),[q,r]=idQR(ctr.id);let n=0;
      for(let ring=0;ring<=9&&n<260;ring++)for(const x of (ring?hexRing(q,r,ring):[{id:ctr.id}])){if(ring&&hexDist(x.id,ctr.id)!==ring)continue;if(!ok(x.id))continue;n++;
        L.polygon(hexPoly(...idQR(x.id)),{color:'#5fd068',weight:2,fill:true,fillOpacity:.12,interactive:false}).addTo(lay4);}}catch(e){}}
  window.drawPick4=drawPick4;setInterval(drawPick4,700);
  setTimeout(stamp4,3000);
})();
