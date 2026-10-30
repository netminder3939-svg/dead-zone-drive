// Stage 1c: shared turn-based fight engine, battle replay screen, info cards (never auto-fight),
// AI attack alerts with replay, raid member HP bars, loss penalties.
let _uid=0;
function mkUnit(o){const max=Math.max(1,Math.round(o.max??o.hp));return{agi:0,crit:5,def:0,...o,uid:'u'+(_uid++),max,hp:Math.max(0,Math.round(o.hp??max)),atk:Math.round(o.atk),def:Math.round(o.def||0)};}
function playerUnit(){const s=stats();return mkUnit({name:P.name,emoji:'🧍',color:P.color,hp:P.hp,max:s.hp,atk:s.atk,def:s.def,crit:s.crit,agi:s.agi,me:true});}
function runFight(A0,B0,maxRounds=BAL.fight.maxRounds){
  const A=A0.map(u=>({...u,side:'A'})),B=B0.map(u=>({...u,side:'B'})),all=[...A,...B],ev=[];let r=0;
  while(r<maxRounds&&A.some(u=>u.hp>0)&&B.some(u=>u.hp>0)){r++;
    const order=all.filter(u=>u.hp>0).map(u=>[u,(u.agi||0)+Math.random()*6]).sort((x,y)=>y[1]-x[1]).map(x=>x[0]);
    for(const u of order){if(u.hp<=0)continue;const foes=(u.side==='A'?B:A).filter(x=>x.hp>0);if(!foes.length)break;
      const t=foes[Math.floor(Math.random()*foes.length)],x=simulateRound(u,t);t.hp=Math.max(0,t.hp-x.dmg);
      ev.push({r,a:u.uid,t:t.uid,dmg:x.dmg,crit:x.crit,dodge:!!x.dodge,hp:t.hp});}}
  return{startA:A0,startB:B0,A,B,events:ev,win:B.every(u=>u.hp<=0)};}
function winChance(mkA,mkB,n=BAL.fight.scoutSims){let w=0;for(let i=0;i<n;i++)if(runFight(mkA(),mkB()).win)w++;return w/n;}
function diffLabel(p){return p>=.85?['Easy','#5fd068']:p>=.6?['Fair','#b5d84a']:p>=.4?['Even','#ffd24a']:p>=.15?['Hard','#ff8a3a']:['Deadly','#ff3b30'];}
function cooldownLeft(){return Math.max(0,(P.cooldownUntil||0)-Date.now());}
function lossPenalty(){const F=BAL.fight,lost=Math.min(F.lossScrapMax,Math.floor((P.res.scrap||0)*F.lossScrapPct));P.res.scrap-=lost;
  P.cooldownUntil=Date.now()+F.lossCooldownMin*60e3;P.hp=Math.max(1,Math.round(stats().hp*F.lossHpPct));save();return lost;}
const imgTag=(src,cls='')=>`<img class="${cls}" src="${src}" onerror="this.style.visibility='hidden'">`;
function unitArt(u){return u.img?imgTag(u.img):u.svg?u.svg:`<span class="uemo" style="${u.color?'background:'+u.color:''}">${u.emoji||'❔'}</span>`;}

// ---------- enemy builders ----------
function mutantUnits(mid,lvl){const M=MONSTERS[mid],sc=1+(lvl-M.lvl)*.15;
  return[mkUnit({name:M.name,img:monImg(mid),hp:M.hp*sc,atk:M.atk*sc,def:M.def*sc,crit:5,agi:2+Math.floor(lvl/2)})];}
function fortUnits(id){const e=enemyAt(id),s=enemyStats(e),E=BAL.enemy,u=[mkUnit({name:'Raider Stronghold',img:monImg('enemy_fort'),hp:s.hp,atk:s.atk,def:s.def,crit:s.crit,agi:1,fort:true})];
  for(let i=0;i<E.guards;i++)u.push(mkUnit({name:'Raider Guard',img:'raider.svg',hp:s.hp*E.guardMult,atk:s.atk*.7,def:s.def*.6,crit:8,agi:6}));return u;}
function raiderUnits(power){const A=BAL.ai,n=Math.max(2,Math.min(6,Math.round(power/A.unitPower)));
  return Array.from({length:n},(_,i)=>mkUnit({name:'Raider '+(i+1),img:'raider.svg',hp:power*A.hpPerPower/n,atk:Math.max(3,power*A.atkPerPower/n*1.6),def:2+power*.01,crit:6,agi:5}));}
function defenderUnit(d){const A=BAL.ai,w=W(),obj=d.kind==='sh'?w.sh:w.towers[d.id],pct=(obj&&obj.hpPct!=null?obj.hpPct:1);
  return mkUnit({name:d.kind==='sh'?`Stronghold Lv${strongholdLevel()}`:`Tower Lv${(obj&&obj.level)||1}`,svg:d.kind==='sh'?strongholdSVG(strongholdLevel()):towerSVG((obj&&obj.level)||1),
    max:d.power*A.hpPerPower,hp:d.power*A.hpPerPower*pct,atk:d.power*A.atkPerPower,def:2+d.power*.03,crit:5,agi:2,ref:d});}

// ---------- replay screen ----------
UI.replay=function(o){// o:{title,sub,f,result,buttons:[[label,fn,cls]],speed}
  const f=o.f,cards=list=>list.map(u=>`<div class="unit ${u.me?'me':''}" id="${u.uid}"><div class="uart">${unitArt(u)}</div><div class="uname">${u.name}</div><div class="hpb"><i style="width:${100*u.hp/u.max}%"></i></div><div class="hpt">${u.hp}/${u.max}</div></div>`).join('');
  this.modal(`<h2>${o.title}</h2>${o.sub?`<p class="tiny">${o.sub}</p>`:''}<div class="battle"><div class="side foe">${cards(f.startB)}</div><div class="vs">VS</div><div class="side ally">${cards(f.startA)}</div></div>
    <div class="log" id="rlog"></div><div id="rres"></div><button id="rskip" style="width:100%">Skip ⏩</button>`);
  const hp={};[...f.startA,...f.startB].forEach(u=>hp[u.uid]=[u.hp,u.max]);let i=0,done=false;const delay=Math.max(90,Math.min(420,7000/Math.max(1,f.events.length)));
  const show=e=>{const el=document.getElementById(e.t);if(!el)return;hp[e.t][0]=e.hp;const [h,m]=hp[e.t];el.querySelector('.hpb i').style.width=(100*h/m)+'%';el.querySelector('.hpt').textContent=h+'/'+m;
    el.classList.remove('hit');void el.offsetWidth;if(!e.dodge)el.classList.add('hit');if(h<=0)el.classList.add('ko');
    const d=document.createElement('div');d.className='dmg'+(e.crit?' crit':'')+(e.dodge?' dodge':'');d.textContent=e.dodge?'DODGE':(e.crit?'CRIT ':'')+'-'+e.dmg;el.appendChild(d);setTimeout(()=>d.remove(),900);
    const nm=id=>(f.startA.concat(f.startB).find(u=>u.uid===id)||{}).name;const l=$('#rlog');if(l)l.innerHTML=`R${e.r}: ${nm(e.a)} → ${nm(e.t)} ${e.dodge?'<i>dodged</i>':e.dmg+(e.crit?' <b class="c">CRIT</b>':'')}<br>`+l.innerHTML;};
  const finish=()=>{if(done)return;done=true;clearInterval(iv);for(;i<f.events.length;i++){const e=f.events[i],el=document.getElementById(e.t);if(el){hp[e.t][0]=e.hp;el.querySelector('.hpb i').style.width=(100*e.hp/hp[e.t][1])+'%';el.querySelector('.hpt').textContent=e.hp+'/'+hp[e.t][1];if(e.hp<=0)el.classList.add('ko');}}
    $('#rskip').remove();$('#rres').innerHTML=`<div class="result ${o.good?'good':'bad'}">${o.result}</div>`+(o.buttons||[]).map((b,k)=>`<button class="${b[2]||''}" style="width:100%;margin-top:6px" id="rb${k}">${b[0]}</button>`).join('');
    (o.buttons||[]).forEach((b,k)=>$('#rb'+k).onclick=b[1]);UI.hud();};
  const iv=setInterval(()=>{if(i>=f.events.length)return finish();show(f.events[i++]);},delay);$('#rskip').onclick=finish;};

// ---------- info cards (tap = info, never a fight) ----------
UI._cb=[];
UI.info=function(o){this._cb=[];const btns=(o.buttons||[]).map(b=>{this._cb.push(b[1]);return`<button class="${b[2]||''}" ${b[3]?'disabled':''} onclick="UI._cb[${this._cb.length-1}]()">${b[0]}</button>`;}).join('');
  this.modal(`<div class="icard"><div class="ihead"><div class="iart">${o.art||''}</div><div><h2>${o.title}</h2>${o.sub?`<div class="tiny">${o.sub}</div>`:''}${o.diff?`<span class="diff" style="background:${o.diff[1]}">${o.diff[0]}</span>`:''}</div></div>
    ${o.body||''}<div class="ibtns">${btns}<button onclick="UI.closeModal()">Close</button></div></div>`);};
function diffBlock(p){const d=diffLabel(p);return{d,html:`<div class="row"><div class="grow">Your odds: <b style="color:${d[1]}">${d[0]}</b> · about ${Math.round(p*100)}% win chance<small>Based on your current HP ${P.hp}/${stats().hp}, stats and gear.</small></div></div>`};}
const statLine=u=>`❤️ ${u.max} · ⚔️ ${u.atk} · 🛡️ ${u.def} · 💨 ${u.agi}`;
function cdBlock(){const c=cooldownLeft();return c?`<div class="row warn">🩹 Recovering from a defeat: ${fmtDur(c)} until you can fight</div>`:'';}

UI.infoMon=function(mid,lvl,key,lat,lng){const M=MONSTERS[mid],d=distM(...G.pos,lat,lng),far=d>120&&!G.dev.any,p=winChance(()=>[playerUnit()],()=>mutantUnits(mid,lvl)),D=diffBlock(p);
  const sc=()=>this.info({title:M.name,sub:`Level ${lvl} mutant · ${Math.round(d)} m away`,art:imgTag(monImg(mid)),diff:D.d,body:D.html+cdBlock()+`<div class="row"><div class="grow">Drops: ${Object.entries(M.drops).map(([k,v])=>v+RES[k]).join(' ')} · card · maybe gear</div></div>`+(this._scout?`<div class="row"><div class="grow">🔍 ${statLine(mutantUnits(mid,lvl)[0])}</div></div>`:''),
    buttons:[['⚔️ Fight',()=>fightMutant(mid,lvl,key),'fight',far||cooldownLeft()>0],['🔍 Scout',()=>{this._scout=true;sc();this._scout=false;}]]});
  sc();if(far)toast(`Get within 120 m to fight (${Math.round(d)} m)`);};
UI.infoFort=function(id){const e=enemyAt(id),s=enemyStats(e),[lat,lng]=hexCenter(...idQR(id)),d=distM(...G.pos,lat,lng),far=d>BAL.enemy.attackRangeM&&!G.dev.any;
  const p=winChance(()=>[playerUnit()],()=>fortUnits(id),80),D=diffBlock(p),loot=Object.entries(BAL.enemy.loot).map(([k,v])=>Math.round(v*(1+s.L*BAL.enemy.lootPerLevel))+RES[k]).join(' ');
  const draw=sc=>this.info({title:'Raider Stronghold',sub:`Enemy fort · Level ${s.L} · ${Math.round(d)} m away · ${BAL.enemy.guards} guards`,art:imgTag(monImg('enemy_fort')),diff:D.d,
    body:D.html+cdBlock()+`<div class="row"><div class="grow">Capture reward: hex + ring (${hexRing(0,0,BAL.enemy.claimRings).length} hexes) · ${loot} · Rare+ gear</div></div>`+(sc?fortUnits(id).map(u=>`<div class="row"><div class="grow">🔍 <b>${u.name}</b><small>${statLine(u)}</small></div></div>`).join(''):''),
    buttons:[['⚔️ Attack',()=>fightFort(id),'fight',far||cooldownLeft()>0],['🔍 Scout',()=>draw(true)]]});draw(false);};
UI.infoLandmark=function(l){const K=LANDMARK_KINDS[l.kind],boss=lairBoss(l),r=raidFor(l.id),v=P.badges[l.id],d=distM(...G.pos,l.lat,l.lng);
  let body=`<div class="row"><div class="grow">${v?'🏅 Badge earned':'Visit (within 90 m) to earn a badge, XP and supplies'}<small>${Math.round(d)} m away</small></div></div>`;
  if(boss)body+=`<div class="row warn">☠️ ${r&&!r.done?MONSTERS[boss].name+' raid is LIVE':'Something big lurks here. Get close to reveal it and start an alliance raid.'}</div>`;
  this.info({title:l.name,sub:K.label,art:`<span class="bigemo">${K.icon}</span>`,body,buttons:r&&!r.done&&Date.now()<r.endsAt?[['☠️ Raid info',()=>UI.infoRaid(r.id),'fight']]:[]});};
UI.infoRaid=function(id){const r=G.raids[id];if(!r)return;const B=MONSTERS[r.bossId];
  this.info({title:B.name,sub:`Alliance raid · ${r.place} · ${mins(r.endsAt)} left`,art:imgTag(monImg(r.bossId)),diff:['RAID','#c070ff'],
    body:`<div class="row"><div class="grow">Boss HP ${r.hp}/${r.maxHp}<div class="prog"><i style="width:${100*r.hp/r.maxHp}%;background:#e0573a"></i></div><small>${Object.keys(r.participants||{}).length} fighting · loot split by damage</small></div></div>`+cdBlock(),
    buttons:[['⚔️ Join raid',()=>UI.raid(id),'fight']]});};
UI.infoTile=function(id){const t=tileInfo(id),own=P.tiles[id],o=G.terr[id],raider=!own&&(W().raider[id]||o?.ai);
  this.info({title:t.res?`${t.tier[0].toUpperCase()+t.tier.slice(1)} ${RESN2[t.res]} tile`:'Empty hex',sub:'Hex '+id,art:`<span class="bigemo">${t.res?RES[t.res]:'⬡'}</span>`,diff:t.res?[t.tier.toUpperCase(),BAL.tiles.tierColor[t.tier]]:null,
    body:`<div class="row"><div class="grow">${t.res?`Pays +${t.yield} ${RES[t.res]} at each daily reset (you keep 75%)`:'No resources, but still counts as territory'}<small>${own?'✅ Yours':raider?'🔴 Held by raiders: walk over it to take it back':o&&o.uid!==P.uid?'Held by '+o.by:'Unclaimed: walk or drive across it to claim'}</small></div></div>`,
    buttons:own?[['🏗️ Build here',()=>UI.build()]]:[]});};
UI.infoStruct=function(kind,id){const w=W(),o=kind==='sh'?w.sh:w.towers[id];if(!o)return;const lvl=kind==='sh'?strongholdLevel():(o.level||1),down=o.state==='down',pct=Math.round(100*(o.hpPct??1));
  const power=kind==='sh'?BAL.stronghold.basePower+lvl*BAL.stronghold.powerPerLevel:towerPower(o),cost=c=>Object.entries(c).filter(([,v])=>v).map(([k,v])=>`<span class="${(P.res[k]||0)<v?'short':''}">${v}${RES[k]}</span>`).join(' ');
  const btn=[];
  if(down)btn.push([`🔧 Repair (${kind==='sh'?cost(shCostNow()):cost(towerRepairCost(o))})`,()=>{kind==='sh'?placeStronghold(o.hex):repairTower(id);UI.closeModal();},'fight']);
  else{if(pct<100)btn.push([`🩹 Patch up (${cost(patchCost(kind,o))})`,()=>{patchStruct(kind,id);UI.infoStruct(kind,id);}]);
    if(kind==='sh')btn.push(['⬆️ Upgrade',()=>{UI.closeModal();UI.open('base');UI.sub.base='fort';UI.render();}]);
    else if(lvl<BAL.tower.maxLevel)btn.push([`⬆️ Upgrade (${cost(towerUpCost(o))})`,()=>{upgradeTower(id);UI.infoStruct(kind,id);}]);}
  this.info({title:kind==='sh'?`${P.name}'s Stronghold`:'Watchtower',sub:`Level ${lvl} · ${down?'💥 DESTROYED':o.state==='building'?'⏳ building '+fmtDur(o.buildEnd-Date.now()):'condition '+pct+'%'}`,
    art:kind==='sh'?strongholdSVG(lvl):towerSVG(lvl),body:`<div class="row"><div class="grow">Defense power ${power} · range ${kind==='sh'?BAL.stronghold.radius:BAL.tower.radius} ring(s)<div class="prog"><i style="width:${down?0:pct}%"></i></div>${kind==='tower'?`<small>Upkeep ${Object.entries(BAL.tower.upkeep).map(([k,v])=>v+RES[k]).join(' ')}/day · ${o.online===false?'⚠️ offline':'online'}</small>`:''}</div></div>`,buttons:btn});};

// ---------- fights ----------
function fightMutant(mid,lvl,key){if(cooldownLeft())return toast('Still recovering');const M=MONSTERS[mid],f=runFight([playerUnit()],mutantUnits(mid,lvl));P.hp=Math.max(1,f.A[0].hp);
  let res,good=f.win;if(f.win){const g=battleWin(mid,lvl,key);res=`🏆 Victory! +${Object.entries(M.drops).map(([k,v])=>v+RES[k]).join(' ')} · 🃏 card${g?'<br>Loot: '+gearLine(g):''}`;}
  else{const lost=lossPenalty();res=`💀 Defeated by ${M.name}. You dropped ${lost}🔩 and need ${BAL.fight.lossCooldownMin} min to recover.`;}save();
  UI.replay({title:`${M.name} · Lv${lvl}`,f,result:res,good,buttons:[['Continue',()=>UI.closeModal(),'big']]});}
function fightFort(id){if(cooldownLeft())return toast('Still recovering');const f=runFight([playerUnit()],fortUnits(id));P.hp=Math.max(1,f.A[0].hp);let res;
  if(f.win){const c=captureEnemy(id);res=`🏴 Stronghold captured! +${c.hexes} hexes · ${Object.entries(c.loot).map(([k,v])=>v+RES[k]).join(' ')}<br>Loot: ${gearLine(c.gear)}`;}
  else{const lost=lossPenalty();res=`💀 The raiders held their fort. You dropped ${lost}🔩 and need ${BAL.fight.lossCooldownMin} min to recover.`;report(`💀 ${P.name} lost an attack on a Raider Stronghold`,false);}
  save();UI.replay({title:'Assault: Raider Stronghold',f,result:res,good:f.win,buttons:[['Continue',()=>{UI.closeModal();drawWorld();},'big']]});}

// ---------- structures: tower levels, repair, patch ----------
function towerPower(t){return Math.round(BAL.tower.power*(1+BAL.tower.powerPerLevel*((t.level||1)-1)));}
function towerUpCost(t){const l=t.level||1;return Object.fromEntries(Object.entries(BAL.tower.cost).map(([k,v])=>[k,Math.round(v*l*.8)]));}
function towerRepairCost(t){return Object.fromEntries(Object.entries(BAL.tower.cost).map(([k,v])=>[k,Math.round(v*BAL.tower.repairMult*(t.level||1))]));}
function patchCost(kind,o){const miss=1-(o.hpPct??1),base=kind==='sh'?BAL.stronghold.cost:BAL.tower.cost;return{scrap:Math.max(1,Math.round(base.scrap*.25*miss)),parts:Math.round((base.parts||0)*.2*miss)};}
function upgradeTower(id){const t=W().towers[id],c=towerUpCost(t);if(!canPay(c))return toast('Not enough resources');pay(c);t.level=(t.level||1)+1;t.hpPct=1;save();drawWorld();toast('🗼 Tower upgraded to Lv'+t.level);}
function repairTower(id){const t=W().towers[id],c=towerRepairCost(t);if(!canPay(c))return toast('Not enough resources');pay(c);t.state='building';t.hpPct=1;t.buildEnd=Date.now()+BAL.tower.buildHours*1800e3;save();drawWorld();toast('🔧 Tower repair started');}
function patchStruct(kind,id){const o=kind==='sh'?W().sh:W().towers[id],c=patchCost(kind,o);if(!canPay(c))return toast('Not enough resources');pay(c);o.hpPct=1;save();drawWorld();toast('🩹 Repaired');}

// ---------- AI attack alert ----------
UI.attackAlert=function(rep){if(!rep)return;const d=rep.detail||{};W().unseen=(W().unseen||[]).filter(t=>t!==rep.t);save();
  const fights=(rep.fights||[]).filter(x=>x.f);
  this.info({title:'⚠️ RAIDERS ATTACKED!',sub:new Date(rep.t).toLocaleString([], {weekday:'short',hour:'numeric',minute:'2-digit'})+` · raid power ${d.power}`,art:imgTag('raider.svg'),diff:rep.win?['DEFENDED','#5fd068']:['LOSSES','#ff3b30'],
    body:`<div class="chips"><span class="chip ok">🛡️ ${d.held?.length||0} held</span><span class="chip bad">🚩 ${d.lost?.length||0} lost</span>${(d.destroyed||[]).map(x=>`<span class="chip bad">💥 ${x} destroyed</span>`).join('')}</div>
      ${(rep.fights||[]).map(x=>`<div class="row"><div class="grow">Hex ${x.tile}<small>${x.f?(x.f.win?'Defenders won':'Defenders fell'):'No defense in range: tile lost'}</small></div></div>`).join('')}`,
    buttons:[...(fights.length?[['▶️ Watch battle',()=>playFights(rep,0),'fight']]:[]),['🗺️ View on map',()=>{UI.closeModal();flashTiles([...(d.held||[]),...(d.lost||[])]);}]]});};
function playFights(rep,k){const fs=rep.fights.filter(x=>x.f),x=fs[k];if(!x)return UI.attackAlert(rep);
  UI.replay({title:`Defense of hex ${x.tile}`,sub:`Battle ${k+1} of ${fs.length}`,f:x.f,good:x.f.win,result:x.f.win?'🛡️ Raiders driven off. Tile held.':'🚩 Defenders fell. Tile lost.'+(x.destroyed?.length?' 💥 '+x.destroyed.join(', ')+' destroyed.':''),
    buttons:[[k+1<fs.length?'Next battle ▶':'Back to report',()=>playFights(rep,k+1),'big'],['🗺️ View on map',()=>{UI.closeModal();flashTiles([x.tile]);}]]});}
function flashTiles(ids){if(!ids.length)return;const g=L.layerGroup().addTo(map),pts=[];
  ids.forEach(id=>{const [q,r]=idQR(id),poly=hexPoly(q,r);pts.push(...poly);L.polygon(poly,{className:'flash',color:'#ff3b30',weight:3,fillColor:'#ff3b30',fillOpacity:.45}).addTo(g);});
  map.fitBounds(pts,{maxZoom:16,padding:[60,60]});setTimeout(()=>map.removeLayer(g),9000);}

// ---------- raids with member HP bars ----------
UI.raid=function(id){this.raidOpen=id;const r=G.raids[id];if(!r)return;
  if(r.won&&r.participants?.[P.uid]&&!P.raidLoot[id]){const g=raidClaim(id);this.modal(`<h2>💀 ${MONSTERS[r.bossId].name} defeated!</h2><p>Shared loot split by damage.</p><div class="row">${g?gearLine(g):''}</div><button class="big" onclick="UI.closeModal()">Nice</button>`);return;}
  this.modal(`<h2>☠️ RAID: ${MONSTERS[r.bossId].name}</h2><p class="tiny">${r.place} · found by ${r.finder}</p>
    <div class="battle"><div class="side foe"><div class="unit boss" id="rboss"><div class="uart">${imgTag(monImg(r.bossId),'mon boss')}</div><div class="uname">${MONSTERS[r.bossId].name}</div><div class="hpb"><i id="rhp"></i></div><div class="hpt" id="rhpt"></div></div></div>
    <div class="vs" id="rtime"></div><div class="side ally" id="rparts"></div></div><div class="log" id="rlog"></div>
    <button class="big" id="rhit">⚔️ Attack (3 rounds)</button><button style="width:100%;margin-top:6px" onclick="UI.closeModal()">Leave</button>`);
  $('#rhit').onclick=()=>raidAttack(id);this.refreshRaid();};
UI.refreshRaid=function(){if(this.tab==='raids')this.render();const id=this.raidOpen,r=G.raids[id];if(!r||!$('#rhp'))return;
  $('#rhp').style.width=(100*r.hp/r.maxHp)+'%';$('#rhpt').textContent=`${r.hp} / ${r.maxHp}`;$('#rtime').textContent=r.done?(r.won?'DEFEATED':'ESCAPED'):'⏳ '+mins(r.endsAt);
  const ps={...(r.participants||{})};if(!ps[P.uid])ps[P.uid]={name:P.name+' (not joined)',dmg:0,hp:P.hp,max:stats().hp};
  $('#rparts').innerHTML=Object.entries(ps).sort((a,b)=>b[1].dmg-a[1].dmg).map(([u,p])=>{const mx=p.max||100,h=p.hp??mx;return`<div class="unit ${u===P.uid?'me':''} ${h<=0?'ko':''}"><div class="uart"><span class="uemo">🧍</span></div><div class="uname">${p.name}</div><div class="hpb"><i style="width:${100*h/mx}%"></i></div><div class="hpt">${h}/${mx} · ${p.dmg} dmg</div></div>`;}).join('');
  if(r.done){const b=$('#rhit');b.disabled=false;b.textContent=r.won&&r.participants?.[P.uid]?'🎁 Claim loot':'Close';b.onclick=()=>r.won&&r.participants?.[P.uid]?this.raid(id):this.closeModal();}};
async function raidAttack(id){const r=G.raids[id];if(!r||r.done)return;if(P.hp<=1||cooldownLeft())return toast('You are knocked out. Heal up first');
  const btn=$('#rhit');btn.disabled=true;const B=MONSTERS[r.bossId],boss=mkUnit({name:B.name,img:monImg(r.bossId),hp:r.hp,max:r.maxHp,atk:B.atk,def:B.def,crit:8,agi:3}),me=playerUnit();
  const f=runFight([me],[boss],3);const dmg=r.hp-f.B[0].hp;P.hp=Math.max(0,f.A[0].hp);
  for(const e of f.events){const l=$('#rlog');if(l)l.innerHTML=`${e.a===me.uid?'You':B.name} ${e.dodge?'missed':'hit for '+e.dmg+(e.crit?' CRIT':'')}<br>`+l.innerHTML;}
  const el=$('#rboss');if(el){el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit');const d=document.createElement('div');d.className='dmg crit';d.textContent='-'+dmg;el.appendChild(d);setTimeout(()=>d.remove(),900);}
  await NET.hitRaid(id,P.uid,P.name,dmg,P.hp,stats().hp);if(!P.raidLoot[id+'_j']){P.raidLoot[id+'_j']=1;questProg('raids');P.contrib.raids++;allianceLog(`${P.name} joined the raid on ${B.name}`);}
  if(P.hp<=0){P.hp=1;lossPenalty();toast('💀 Knocked out by the boss! Recovering…');}save();UI.hud();
  let c=4;const t=setInterval(()=>{if(!$('#rhit'))return clearInterval(t);btn.textContent=`Recharging ${c}s`;if(--c<0){clearInterval(t);btn.disabled=false;btn.textContent='⚔️ Attack (3 rounds)';}},1000);}

// ---------- tower art ----------
function towerSVG(l){let s='';const h=60+l*14,y=150-h;for(let i=0;i<l;i++)s+=`<rect x="44" y="${y+22+i*(h-30)/l}" width="32" height="3" fill="#8a7a60"/>`;
  return`<svg viewBox="0 0 120 160" class="fort" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="${y}" width="40" height="${h}" fill="#6b6355" stroke="#222" stroke-width="2"/>${s}
  <rect x="32" y="${y-14}" width="56" height="16" fill="#8a8070" stroke="#222"/>${[0,1,2,3].map(i=>`<rect x="${32+i*15}" y="${y-22}" width="9" height="9" fill="#8a8070"/>`).join('')}
  <rect x="54" y="${y+6}" width="12" height="10" fill="#ffd27a"/>${l>=3?`<path d="M60 ${y-22} L10 ${y-60} L30 ${y-66}Z" fill="#fff3b0" opacity=".25"/>`:''}${l>=4?`<line x1="60" y1="${y-22}" x2="60" y2="${y-44}" stroke="#aaa" stroke-width="2"/><path d="M60 ${y-44} l18 5 l-18 5z" fill="${P.color}"/>`:''}
  <rect x="20" y="148" width="80" height="8" fill="#3a332a"/></svg>`;}
