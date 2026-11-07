// v23d (TEST) Building stats card + Reinforce on every structure (Stronghold, towers, outposts, teammates' structures).
// Card: level, owner, condition, defense power, range + protected hexes, garrison (who/how many), upkeep, upgrade cost, Reinforce.
// Reinforcements = stationed troops on the building's hex: synced to the crew (member doc), shown as 🛡️ count on the map,
// use a support slot (left panel), and fight AFTER the building's own defense (defenses always first).
L.Marker.addInitHook(function(){this.on('click',e=>{G._lastLL=[(e.latlng||this.getLatLng()).lat,(e.latlng||this.getLatLng()).lng];G._lastLLt=Date.now();});});
function bldAt(hex){const w=W();if(w.sh&&w.sh.hex===hex)return{k:'sh',o:w.sh,own:true,owner:P.name};if((w.towers||{})[hex])return{k:'tower',o:w.towers[hex],own:true,owner:P.name};if((w.outposts||{})[hex])return{k:'op',o:w.outposts[hex],own:true,owner:P.name};
  for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||m.me||!Array.isArray(m.defs))continue;const d=m.defs.find(x=>x&&x.hex===hex);if(d)return{k:d.k,o:{power:d.p,r:d.r},own:false,owner:m.name||'Ally'};}return null;}
function bldCard(hex){const b=bldAt(hex);if(!b)return'';const o=b.o,lv=b.k==='sh'?strongholdLevel():b.k==='tower'?(o.level||1):0,
  r=b.own?(b.k==='sh'?shRadius():b.k==='tower'?towerRadius(o):BAL.outpost.radius):(o.r||1),
  pw=b.own?(b.k==='sh'?Math.round(BAL.stronghold.basePower+strongholdLevel()*BAL.stronghold.powerPerLevel):b.k==='tower'?towerPower(o):outpostPower()):o.power,
  mine=(stationed()[hex]||{}),allies=(typeof allyGarAt==='function'?allyGarAt(hex):[]),tot=(mine.n||0)+allies.reduce((a,g)=>a+g.n,0),cap=typeof hexGarCap==='function'?hexGarCap(hex):0;
  const up=b.own&&b.k==='tower'&&typeof towerUpCost==='function'&&lv<BAL.tower.maxLevel?Object.entries(towerUpCost(o)).map(([k,v])=>v+RES[k]).join(' '):b.own&&b.k==='sh'?'see Base › Fort':'—';
  const upk=b.k==='tower'?(Object.values(BAL.tower.upkeep||{}).some(v=>v)?Object.entries(BAL.tower.upkeep).map(([k,v])=>v+RES[k]).join(' ')+'/day':'free'):'none';
  const home=TP().home,u=typeof poolUse==='function'?poolUse():{sup:0},full=u.sup>=SLOTS.sup&&!mine.n,room=cap?Math.max(0,cap-tot):home,opts=[500,1000,5000].filter(x=>x<Math.min(home,room));if(Math.min(home,room)>0)opts.push(Math.min(home,room));
  const row=(a,v)=>`<div class="ps22r"><span>${a}</span><b>${v}</b></div>`;
  return`<div class="bld23"><h3>📋 Building stats</h3>${row('Owner',b.owner)}${lv?row('Level','Lv'+lv):''}${row('Condition',b.own&&o.hpPct!=null?Math.round(100*o.hpPct)+'%':b.own?(o.state==='down'?'ruined':'100%'):'—')}
    ${row('Defense power',pw)}${row('Range',`${r} ring${r>1?'s':''} · protects ${hexRing(0,0,r).length} hexes (gold tint on map)`)}${row('Upkeep',upk)}${row('Upgrade cost',up)}
    ${row('Reinforcements',tot?`🛡️ ${tot.toLocaleString()}`:'none')}${mine.n?`<small>You: ${mine.n.toLocaleString()}${mine.at>Date.now()?' (arriving '+fmtDur(mine.at-Date.now())+')':''}</small><br>`:''}${allies.map(g=>`<small>${(g.owner||'Ally').replace(/[<>&]/g,'')}: ${g.n.toLocaleString()}</small>`).join('<br>')}
    <p class="tiny">Reinforcements fight after the building's own defense (the building always fights first). Uses a support slot (${u.sup}/${SLOTS.sup}).</p>
    ${home&&!full&&room>0?`<div class="seg">${opts.map(x=>`<button onclick="stationTroops('${hex}',${x});UI.closeModal()">🛡️ Reinforce ${x===Math.min(home,room)?'all '+x.toLocaleString():'+'+x.toLocaleString()}</button>`).join('')}</div>`:`<p class="tiny">${full?'All support slots in use.':!home?'No troops at home.':'Garrison full.'}</p>`}
    ${mine.n?`<div class="seg"><button onclick="recallStation('${hex}');UI.closeModal()">↩️ Recall mine</button></div>`:''}</div>`;}
window.bldCard=bldCard;window.bldAt=bldAt;
const _inf23d=UI.info;UI.info=function(o){const r=_inf23d.apply(this,arguments);try{if(!o||!o.title||!/Stronghold|Tower|Outpost|Watchtower/i.test(String(o.title))||Date.now()-(G._lastLLt||0)>1500||!G._lastLL)return r;const hex=hexAt(...G._lastLL).id;if(!bldAt(hex))return r;const mb=document.querySelector('#modalBody');if(!mb||mb.querySelector('.bld23'))return r;
  const box=mb.querySelector('.ibtns');const html=bldCard(hex);box?box.insertAdjacentHTML('beforebegin',html):mb.insertAdjacentHTML('beforeend',html);}catch(e){console.warn('bld23',e);}return r;};
