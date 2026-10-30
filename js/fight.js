// Stage 1c: shared turn-based fight engine, auto-fight screen with damage meter, info cards (tap = info first),
// AI attack alerts with replay, raid member HP bars, loss penalties.
let _uid=0;
// ---- Stat modifier hook (skill trees / class paths plug in here later) ----
// Each entry is fn(unit) -> {atk:+n, def:+n, hp:+n, agi:+n, crit:+n, heal:+n}. Unit-specific mods go in o.mods.
// Everything is flat math: same stats in = same fight out. No random rolls anywhere.
const UNIT_MODS=[];
function applyMods(o){const out={...o};for(const m of [...UNIT_MODS,...(o.mods||[])]){const x=m(out)||{};for(const k in x)if(typeof x[k]==='number'){out[k]=(out[k]||0)+x[k];if(k==='hp'&&out.max!=null)out.max+=x[k];}}return out;}
function mkUnit(o){o=applyMods(o);const max=Math.max(1,Math.round(o.max??o.hp));return{agi:0,crit:5,def:0,...o,uid:'u'+(_uid++),max,hp:Math.max(0,Math.round(o.hp??max)),atk:Math.round(o.atk),def:Math.round(o.def||0)};}
function playerUnit(){const s=stats();return mkUnit({name:P.name,emoji:'🧍',color:P.color,hp:P.hp,max:s.hp,atk:s.atk,def:s.def,crit:s.crit,agi:s.agi,me:true});}
function runFight(A0,B0,maxRounds=BAL.fight.maxRounds){
  const A=A0.map(u=>({...u,side:'A'})),B=B0.map(u=>({...u,side:'B'})),all=[...A,...B],ev=[];let r=0;
  while(r<maxRounds&&A.some(u=>u.hp>0)&&B.some(u=>u.hp>0)){r++;
    // Fixed order: higher agility first; ties: attacker side, then line-up order. Target = living foe with lowest HP.
    const order=all.filter(u=>u.hp>0).map((u,i)=>[u,(u.agi||0)*1000+(u.side==='A'?500:0)-i]).sort((x,y)=>y[1]-x[1]).map(x=>x[0]);
    for(const u of order){if(u.hp<=0)continue;const foes=(u.side==='A'?B:A).filter(x=>x.hp>0);if(!foes.length)break;
      if(u.heal>0){const mates=(u.side==='A'?A:B).filter(x=>x.hp>0&&x.hp<x.max*.6);if(mates.length){const m=mates.reduce((a,x)=>x.hp/x.max<a.hp/a.max?x:a),h=Math.min(Math.round(u.heal),m.max-m.hp);m.hp+=h;ev.push({r,a:u.uid,t:m.uid,dmg:h,real:h,heal:true,hp:m.hp});continue;}}
      const t=foes.reduce((m,x)=>x.hp<m.hp?x:m),x=simulateRound(u,t),real=Math.min(t.hp,x.dmg);t.hp=Math.max(0,t.hp-x.dmg);
      ev.push({r,a:u.uid,t:t.uid,dmg:x.dmg,real,hp:t.hp});}}
  return{startA:A0,startB:B0,A,B,events:ev,win:B.every(u=>u.hp<=0)};}
// Prediction = the exact same fight the button will run (no randomness), so it is always right.
function predict(mkA,mkB){const f=runFight(mkA(),mkB()),me=f.A[0],mx=f.startA[0].max;return{win:f.win,rounds:Math.max(0,...f.events.map(e=>e.r)),hpLeft:me.hp,hpMax:mx,hpPct:me.hp/mx,foeLeft:f.B.reduce((a,u)=>a+u.hp,0),foeMax:f.startB.reduce((a,u)=>a+u.max,0)};}
function diffLabel(p){return !p.win?(p.foeLeft/p.foeMax<.35?['Close loss','#ff8a3a']:['You lose','#ff3b30']):p.hpPct>=.7?['Easy win','#5fd068']:p.hpPct>=.4?['Win','#b5d84a']:['Narrow win','#ffd24a'];}
function cooldownLeft(){return Math.max(0,(P.cooldownUntil||0)-Date.now());}
function lossPenalty(){const F=BAL.fight,lost=Math.min(F.lossScrapMax,Math.floor((P.res.scrap||0)*F.lossScrapPct));P.res.scrap-=lost;
  P.cooldownUntil=Date.now()+F.lossCooldownMin*60e3;P.hp=Math.max(1,Math.round(stats().hp*F.lossHpPct));save();return lost;}
const imgTag=(src,cls='')=>`<img class="${cls}" src="${src}" onerror="this.style.visibility='hidden'">`;
function unitArt(u){return u.img?imgTag(u.img):u.svg?u.svg:`<span class="uemo" style="${u.color?'background:'+u.color:''}">${u.emoji||'❔'}</span>`;}

// ---------- enemy builders ----------
function mutantUnits(mid,lvl){const M=MONSTERS[mid],sc=1+(lvl-M.lvl)*BAL.progress.mutantScalePerLevel;
  return[mkUnit({name:M.name,img:monImg(mid),hp:M.hp*sc,atk:M.atk*sc,def:M.def*sc,crit:5,agi:2+Math.floor(lvl/2)})];}
function fortUnits(id){const e=enemyAt(id),s=enemyStats(e),E=BAL.enemy,u=[mkUnit({name:'Raider Stronghold',img:monImg('enemy_fort'),hp:s.hp,atk:s.atk,def:s.def,crit:s.crit,agi:1,fort:true})];
  for(let i=0;i<E.guards;i++)u.push(mkUnit({name:'Raider Guard',img:'assets/monsters/raider.svg',hp:s.hp*E.guardMult,atk:s.atk*.7,def:s.def*.6,crit:8,agi:6}));return u;}
function raiderUnits(power){const A=BAL.ai,n=Math.max(2,Math.min(6,Math.round(power/A.unitPower)));
  return Array.from({length:n},(_,i)=>mkUnit({name:'Raider '+(i+1),img:'assets/monsters/raider.svg',hp:power*A.hpPerPower/n,atk:Math.max(3,power*A.atkPerPower/n*1.6),def:2+power*.01,crit:6,agi:5}));}
function defenderUnit(d){const A=BAL.ai,w=W(),obj=d.kind==='sh'?w.sh:w.towers[d.id],pct=(obj&&obj.hpPct!=null?obj.hpPct:1);
  return mkUnit({name:d.kind==='sh'?`Stronghold Lv${strongholdLevel()}`:`Tower Lv${(obj&&obj.level)||1}`,svg:d.kind==='sh'?strongholdSVG(strongholdLevel()):towerSVG((obj&&obj.level)||1),
    max:d.power*A.hpPerPower,hp:d.power*A.hpPerPower*pct,atk:d.power*A.atkPerPower,def:2+d.power*.03,crit:5,agi:2,ref:d});}

// ---------- auto-fight screen + damage meter ----------
function fightMeter(f,upto){const m={};[...f.startA,...f.startB].forEach((u,i)=>m[u.uid]={u,side:i<f.startA.length?'A':'B',dealt:0,taken:0,heal:0});
  for(let i=0;i<upto;i++){const e=f.events[i],x=e.real??e.dmg;if(e.heal){m[e.a].heal+=x;continue;}m[e.a].dealt+=x;m[e.t].taken+=x;}return m;}
function meterHTML(f,upto){const m=fightMeter(f,upto),rounds=Math.max(1,upto?f.events[upto-1].r:0);
  const side=(sd,lbl)=>{const L=Object.values(m).filter(x=>x.side===sd).sort((a,b)=>b.dealt-a.dealt||b.heal-a.heal),tot=L.reduce((a,x)=>a+x.dealt,0)||1,top=L[0]?.dealt||1;
    return`<div class="mside"><b>${lbl}</b>${L.map(x=>`<div class="mrow ${x.u.me?'me':''}"><div class="mbar" style="width:${100*x.dealt/top}%"></div><span class="mn">${x.u.name}</span><span class="mv">${x.dealt} <em>${Math.round(100*x.dealt/tot)}%</em></span><small>⚔️ ${(x.dealt/rounds).toFixed(1)}/rd · 🩸 took ${x.taken}${x.heal?` · 💚 healed ${x.heal}`:''}</small></div>`).join('')}</div>`;};
  return`<div class="meter"><div class="mhead">📊 Damage meter · round ${upto?f.events[upto-1].r:0}</div>${side('A','Your side')}${side('B','Enemy')}</div>`;}
UI.replay=function(o){// o:{title,sub,f,result,good,buttons:[[label,fn,cls]]}. Starts paused: tap Auto fight to watch, or Skip.
  const f=o.f,cards=list=>list.map(u=>`<div class="unit ${u.me?'me':''} ${u.boss?'boss':''}" id="${u.uid}"><div class="uart">${unitArt(u)}</div><div class="uname">${u.name}</div><div class="hpb"><i style="width:${100*u.hp/u.max}%"></i></div><div class="hpt">${u.hp}/${u.max}</div></div>`).join('');
  this.modal(`<h2>${o.title}</h2>${o.sub?`<p class="tiny">${o.sub}</p>`:''}<div class="battle"><div class="side foe">${cards(f.startB)}</div><div class="vs" id="rround">VS</div><div class="side ally">${cards(f.startA)}</div></div>
    <div id="rmeter">${meterHTML(f,0)}</div><div class="log" id="rlog"></div><div id="rres"></div>
    <div class="ibtns" id="rctl"><button class="fight big" id="rauto">▶️ Auto fight</button><button id="rskip">⏭️ Skip to result</button></div>`);
  const nm=id=>(f.startA.concat(f.startB).find(u=>u.uid===id)||{}).name,hp={};[...f.startA,...f.startB].forEach(u=>hp[u.uid]=[u.hp,u.max]);
  let i=0,done=false,iv=null;const delay=Math.max(90,Math.min(420,9000/Math.max(1,f.events.length)));
  const setHP=e=>{const el=document.getElementById(e.t);if(!el)return null;hp[e.t][0]=e.hp;const [h,m]=hp[e.t];el.querySelector('.hpb i').style.width=(100*h/m)+'%';el.querySelector('.hpt').textContent=h+'/'+m;el.classList.toggle('ko',h<=0);return el;};
  const show=e=>{const el=setHP(e);if(!el)return;if(!e.heal){el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit');}
    const d=document.createElement('div');d.className='dmg'+(e.heal?' heal':'');d.textContent=(e.heal?'+':'-')+e.dmg;el.appendChild(d);setTimeout(()=>d.remove(),900);
    const l=$('#rlog');if(l)l.innerHTML=`R${e.r}: ${nm(e.a)} ${e.heal?'heals '+nm(e.t)+' +'+e.dmg:'→ '+nm(e.t)+' '+e.dmg}<br>`+l.innerHTML;
    $('#rround').textContent='R'+e.r;$('#rmeter').innerHTML=meterHTML(f,i);};
  const finish=()=>{if(done)return;done=true;clearInterval(iv);for(;i<f.events.length;i++)setHP(f.events[i]);if(!$('#rres'))return;
    $('#rctl')?.remove();$('#rmeter').innerHTML=meterHTML(f,f.events.length);$('#rround').textContent=f.events.length?'END':'VS';
    $('#rres').innerHTML=`<div class="result ${o.good?'good':'bad'}">${o.result}</div>`+(o.buttons||[]).map((b,k)=>`<button class="${b[2]||''}" style="width:100%;margin-top:6px" id="rb${k}">${b[0]}</button>`).join('');
    (o.buttons||[]).forEach((b,k)=>$('#rb'+k).onclick=b[1]);UI.hud();};
  $('#rauto').onclick=()=>{if(iv)return;$('#rauto').disabled=true;$('#rauto').textContent='⚔️ Fighting…';iv=setInterval(()=>{if(!$('#rlog'))return clearInterval(iv);if(i>=f.events.length)return finish();i++;show(f.events[i-1]);},delay);};
  $('#rskip').onclick=finish;if(o.autostart)$('#rauto').click();};

// ---------- info cards (tap = info, never a fight) ----------
UI._cb=[];
UI.info=function(o){this._cb=[];const btns=(o.buttons||[]).map(b=>{this._cb.push(b[1]);return`<button class="${b[2]||''}" ${b[3]?'disabled':''} onclick="UI._cb[${this._cb.length-1}]()">${b[0]}</button>`;}).join('');
  this.modal(`<div class="icard"><div class="ihead"><div class="iart">${o.art||''}</div><div><h2>${o.title}</h2>${o.sub?`<div class="tiny">${o.sub}</div>`:''}${o.diff?`<span class="diff" style="background:${o.diff[1]}">${o.diff[0]}</span>`:''}</div></div>
    ${o.body||''}<div class="ibtns">${btns}<button onclick="UI.closeModal()">Close</button></div></div>`);};
function diffBlock(p){const d=diffLabel(p);return{d,html:`<div class="row"><div class="grow">Predicted: <b style="color:${d[1]}">${p.win?'WIN':'LOSS'}</b> in ${p.rounds} turn${p.rounds===1?'':'s'} · ${p.win?`you end with ${p.hpLeft}/${p.hpMax} HP`:`enemy keeps ${p.foeLeft}/${p.foeMax} HP`}<small>Exact result, no luck involved: same HP, stats and gear always give this outcome.</small></div></div>`};}
const statLine=u=>`❤️ ${u.max} · ⚔️ ${u.atk} · 🛡️ ${u.def} · 💨 ${u.agi}`;
function cdBlock(){const c=cooldownLeft();return c?`<div class="row warn">🩹 Recovering from a defeat: ${fmtDur(c)} until you can fight</div>`:'';}

UI.infoMon=function(mid,lvl,key,lat,lng){const M=MONSTERS[mid],d=distM(...G.pos,lat,lng),far=d>120&&!G.dev.any,p=predict(()=>[playerUnit()],()=>mutantUnits(mid,lvl)),D=diffBlock(p);
  const sc=()=>this.info({title:M.name,sub:`Level ${lvl} mutant · ${Math.round(d)} m away`,art:imgTag(monImg(mid)),diff:D.d,body:D.html+cdBlock()+`<div class="row"><div class="grow">Drops: ${Object.entries(M.drops).map(([k,v])=>v+RES[k]).join(' ')} · card · maybe gear</div></div>`+(this._scout?`<div class="row"><div class="grow">🔍 ${statLine(mutantUnits(mid,lvl)[0])}</div></div>`:''),
    buttons:[['⚔️ Fight',()=>fightMutant(mid,lvl,key),'fight',far||cooldownLeft()>0],['🔍 Scout',()=>{this._scout=true;sc();this._scout=false;}]]});
  sc();if(far)toast(`Get within 120 m to fight (${Math.round(d)} m)`);};
UI.infoFort=function(id){const e=enemyAt(id),s=enemyStats(e),[lat,lng]=hexCenter(...idQR(id)),d=distM(...G.pos,lat,lng),far=d>BAL.enemy.attackRangeM&&!G.dev.any;
  const p=predict(()=>[playerUnit()],()=>fortUnits(id)),D=diffBlock(p),loot=Object.entries(BAL.enemy.loot).map(([k,v])=>Math.round(v*(1+s.L*BAL.enemy.lootPerLevel))+RES[k]).join(' ');
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
    buttons:[...(own?[['🏗️ Build here',()=>UI.build()]]:[]),['📌 Mark',()=>UI.markPick(id)]]});};
UI.infoStruct=function(kind,id){const w=W(),o=kind==='sh'?w.sh:w.towers[id];if(!o)return;const lvl=kind==='sh'?strongholdLevel():(o.level||1),down=o.state==='down',pct=Math.round(100*(o.hpPct??1));
  const power=kind==='sh'?BAL.stronghold.basePower+lvl*BAL.stronghold.powerPerLevel:towerPower(o),cost=c=>Object.entries(c).filter(([,v])=>v).map(([k,v])=>`<span class="${(P.res[k]||0)<v?'short':''}">${v}${RES[k]}</span>`).join(' ');
  const btn=[];
  if(down)btn.push([`🔧 Repair (${kind==='sh'?cost(shCostNow()):cost(towerRepairCost(o))})`,()=>{kind==='sh'?placeStronghold(o.hex):repairTower(id);UI.closeModal();},'fight']);
  else{if(pct<100)btn.push([`🩹 Patch up (${cost(patchCost(kind,o))})`,()=>{patchStruct(kind,id);UI.infoStruct(kind,id);}]);
    if(kind==='sh'&&G.pos&&P.tiles[hexAt(...G.pos).id]&&hexAt(...G.pos).id!==o.hex)btn.push([`🚚 Relocate here (${cost(BAL.stronghold.relocateCost)})`,()=>{relocateStronghold();UI.closeModal();}]);
    if(kind==='sh')btn.push(['⬆️ Upgrade',()=>{UI.closeModal();UI.open('base');UI.sub.base='fort';UI.render();}]);
    else if(lvl<BAL.tower.maxLevel)btn.push([`⬆️ Upgrade (${cost(towerUpCost(o))})`,()=>{upgradeTower(id);UI.infoStruct(kind,id);}]);}
  this.info({title:kind==='sh'?`${P.name}'s Stronghold`:'Watchtower',sub:`Level ${lvl} · ${down?'💥 DESTROYED':o.state==='building'?'⏳ building '+fmtDur(o.buildEnd-Date.now()):'condition '+pct+'%'}`,
    art:kind==='sh'?strongholdSVG(lvl):towerSVG(lvl),body:`<div class="row"><div class="grow">Defense power <b>${power}</b> · protects <b>${kind==='sh'?shRadius():towerRadius(o)} ring(s)</b> (${hexRing(0,0,kind==='sh'?shRadius():towerRadius(o)).length} hexes)${kind==='tower'&&lvl<BAL.tower.maxLevel?`<small class="pos">Next level: power ${towerPower({level:lvl+1})} · ring ${towerRadiusAt(lvl+1)}${towerRadiusAt(lvl+1)>towerRadius(o)?' ⬆ bigger area!':''}</small>`:''}${kind==='sh'&&!down&&o.state==='up'?(()=>{const a=shAreaInfo(),tot=Object.values(a.mine).reduce((x,y)=>x+y,0);return`<div class="areabox"><b>🌾 Area income</b> · ${a.hexes} hexes in ring, ${a.res} resource tiles<div class="areares">${Object.keys(RES).map(k=>`<span>${RES[k]} <em class="inc">+${a.mine[k]}</em></span>`).join('')}</div><small>You get <em class="inc">+${tot}/day</em> at reset (after 25% alliance share). Next ring at Lv${(Math.floor((lvl-1)/BAL.stronghold.levelsPerRing)+1)*BAL.stronghold.levelsPerRing+1}.</small></div>`;})():''}<small>Tiles outside every ring are taken by raiders with no fight.</small><div class="prog"><i style="width:${down?0:pct}%"></i></div>${kind==='tower'?`<small>Upkeep ${Object.entries(BAL.tower.upkeep).map(([k,v])=>v+RES[k]).join(' ')}/day · ${o.online===false?'⚠️ offline':'online'}</small>`:''}</div></div>`,buttons:btn});};

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
  this.info({title:'⚠️ RAIDERS ATTACKED!',sub:new Date(rep.t).toLocaleString([], {weekday:'short',hour:'numeric',minute:'2-digit'})+` · raid power ${d.power}`,art:imgTag('assets/monsters/raider.svg'),diff:rep.win?['DEFENDED','#5fd068']:['LOSSES','#ff3b30'],
    body:`<div class="chips"><span class="chip ok">🛡️ ${d.held?.length||0} held</span><span class="chip bad">🚩 ${d.lost?.length||0} lost</span>${(d.destroyed||[]).map(x=>`<span class="chip bad">💥 ${x} destroyed</span>`).join('')}</div>
      ${(rep.fights||[]).map(x=>`<div class="row"><div class="grow">Hex ${x.tile}<small>${x.f?(x.f.win?'Defenders won':'Defenders fell'):'No defense in range: tile lost'}</small></div></div>`).join('')}`,
    buttons:[...(fights.length?[['▶️ Watch battle',()=>playFights(rep,0),'fight']]:[]),['🗺️ View on map',()=>{UI.closeModal();flashTiles([...(d.held||[]),...(d.lost||[])]);}]]});};
function playFights(rep,k){const fs=rep.fights.filter(x=>x.f),x=fs[k];if(!x)return UI.attackAlert(rep);
  UI.replay({title:`Defense of hex ${x.tile}`,sub:`Battle ${k+1} of ${fs.length}`,f:x.f,good:x.f.win,result:x.f.win?'🛡️ Raiders driven off. Tile held.':'🚩 Defenders fell. Tile lost.'+(x.destroyed?.length?' 💥 '+x.destroyed.join(', ')+' destroyed.':''),
    buttons:[[k+1<fs.length?'Next battle ▶':'Back to report',()=>playFights(rep,k+1),'big'],['🗺️ View on map',()=>{UI.closeModal();flashTiles([x.tile]);}]]});}
function flashTiles(ids){if(!ids.length)return;const g=L.layerGroup().addTo(map),pts=[];
  ids.forEach(id=>{const [q,r]=idQR(id),poly=hexPoly(q,r);pts.push(...poly);L.polygon(poly,{className:'flash',color:'#ff3b30',weight:3,fillColor:'#ff3b30',fillOpacity:.45}).addTo(g);});
  map.fitBounds(pts,{maxZoom:16,padding:[60,60]});setTimeout(()=>map.removeLayer(g),9000);}

// ---------- raids: auto fight + team damage meter ----------
function bossUnit(r){const B=MONSTERS[r.bossId];return mkUnit({name:B.name,img:monImg(r.bossId),hp:r.hp,max:r.maxHp,atk:B.atk,def:B.def,crit:8,agi:3,boss:true});}
function raidMeterHTML(r){const ps=Object.entries(r.participants||{}).sort((a,b)=>b[1].dmg-a[1].dmg),tot=ps.reduce((a,[,p])=>a+p.dmg,0)||1,top=ps[0]?.[1].dmg||1;
  return`<div class="meter"><div class="mhead">📊 Raid damage meter · ${ps.length} fighter${ps.length===1?'':'s'}</div><div class="mside">${ps.map(([u,p])=>`<div class="mrow ${u===P.uid?'me':''}"><div class="mbar" style="width:${100*p.dmg/top}%"></div><span class="mn">${p.name}</span><span class="mv">${p.dmg} <em>${Math.round(100*p.dmg/tot)}%</em></span><small>⚔️ ${p.fights||1} fight${(p.fights||1)>1?'s':''} · 🩸 took ${p.taken||0}${p.heal?` · 💚 healed ${p.heal}`:''}</small></div>`).join('')||'<p class="tiny">No one has hit it yet.</p>'}</div></div>`;}
UI.raid=function(id){this.raidOpen=id;const r=G.raids[id];if(!r)return;
  if(r.won&&r.participants?.[P.uid]&&!P.raidLoot[id]){const g=raidClaim(id);this.modal(`<h2>💀 ${MONSTERS[r.bossId].name} defeated!</h2><p>Shared loot split by damage.</p><div class="row">${g?gearLine(g):''}</div><button class="big" onclick="UI.closeModal()">Nice</button>`);return;}
  const p=r.done?null:predict(()=>[playerUnit()],()=>[bossUnit(r)]);
  this.modal(`<h2>☠️ RAID: ${MONSTERS[r.bossId].name}</h2><p class="tiny">${r.place} · found by ${r.finder}</p>
    <div class="battle"><div class="side foe"><div class="unit boss" id="rboss"><div class="uart">${imgTag(monImg(r.bossId),'mon boss')}</div><div class="uname">${MONSTERS[r.bossId].name}</div><div class="hpb"><i id="rhp"></i></div><div class="hpt" id="rhpt"></div></div></div>
    <div class="vs" id="rtime"></div><div class="side ally" id="rparts"></div></div>
    ${p?`<div class="row"><div class="grow">Your next fight: you hit until ${p.win?'the boss falls':'you are knocked out'} (${p.rounds} rounds) and deal <b>${r.hp-p.foeLeft}</b> damage.<small>Exact math from your stats, gear and buffs. No luck.</small></div></div>`:''}
    <div id="rmeterbox">${raidMeterHTML(r)}</div>
    <button class="big fight" id="rhit">▶️ Auto fight the boss</button><button style="width:100%;margin-top:6px" onclick="UI.closeModal()">Leave</button>`);
  $('#rhit').onclick=()=>raidAttack(id);this.refreshRaid();};
UI.refreshRaid=function(){if(this.tab==='raids')this.render();const id=this.raidOpen,r=G.raids[id];if(!r||!$('#rhp'))return;
  $('#rhp').style.width=(100*r.hp/r.maxHp)+'%';$('#rhpt').textContent=`${r.hp} / ${r.maxHp}`;$('#rtime').textContent=r.done?(r.won?'DEFEATED':'ESCAPED'):'⏳ '+mins(r.endsAt);
  const ps={...(r.participants||{})};if(!ps[P.uid])ps[P.uid]={name:P.name+' (not joined)',dmg:0,hp:P.hp,max:stats().hp};
  $('#rparts').innerHTML=Object.entries(ps).sort((a,b)=>b[1].dmg-a[1].dmg).map(([u,p])=>{const mx=p.max||100,h=p.hp??mx;return`<div class="unit ${u===P.uid?'me':''} ${h<=0?'ko':''}"><div class="uart"><span class="uemo">🧍</span></div><div class="uname">${p.name}</div><div class="hpb"><i style="width:${100*h/mx}%"></i></div><div class="hpt">${h}/${mx} · ${p.dmg} dmg</div></div>`;}).join('');
  if($('#rmeterbox'))$('#rmeterbox').innerHTML=raidMeterHTML(r);
  if(r.done){const b=$('#rhit');if(!b)return;b.disabled=false;b.textContent=r.won&&r.participants?.[P.uid]?'🎁 Claim loot':'Close';b.onclick=()=>r.won&&r.participants?.[P.uid]?this.raid(id):this.closeModal();}};
// One tap = one full automatic fight: you and the boss trade blows until one of you drops (or the round cap).
async function raidAttack(id){const r=G.raids[id];if(!r||r.done)return;if(P.hp<=1||cooldownLeft())return toast('You are knocked out. Heal up first');
  const B=MONSTERS[r.bossId],me=playerUnit(),f=runFight([me],[bossUnit(r)],BAL.fight.maxRounds),mt=fightMeter(f,f.events.length)[me.uid],dmg=mt.dealt;
  P.hp=Math.max(0,f.A[0].hp);await NET.hitRaid(id,P.uid,P.name,dmg,P.hp,stats().hp,mt.taken,mt.heal);
  if(!P.raidLoot[id+'_j']){P.raidLoot[id+'_j']=1;questProg('raids');P.contrib.raids++;allianceLog(`${P.name} joined the raid on ${B.name}`);}
  let ko=false;if(P.hp<=0){P.hp=1;lossPenalty();ko=true;}save();UI.hud();
  UI.replay({title:`☠️ Raid: ${B.name}`,sub:r.place,f,good:!ko,result:(f.win?`💀 ${B.name} is down! You landed the final blow.`:`You dealt <b>${dmg}</b> damage to ${B.name}.`)+(ko?` You were knocked out and need ${BAL.fight.lossCooldownMin} min to recover.`:''),
    buttons:[['⬅️ Back to raid',()=>UI.raid(id),'big']],autostart:true});}

// ---------- Test boss button: spawns the Crystal Knight one hex next to you (local + live) ----------
function spawnTestBossNear(){try{if(!G.pos||typeof NET==='undefined'){toast('Waiting for GPS…');return false;}
  const h=hexAt(...G.pos),[lat,lng]=hexCenter(h.q+1,h.r),id='test_crystal_'+today(),old=G.raids[id];
  if(old&&!old.done&&Date.now()<old.endsAt){map.setView([old.lat,old.lng],17);toast('Crystal Knight is already up next to you');return true;}
  const B=MONSTERS.boss_crystal,id2=old?id+'_'+Date.now().toString(36):id;
  const r={id:id2,bossId:'boss_crystal',lat,lng,place:'Next hex',hp:B.hp,maxHp:B.hp,endsAt:Date.now()+120*60e3,finder:P.name||'Test',participants:{},done:false,day:today()};
  G.raids[id2]=r;drawRaids();if(UI.raidBanner)UI.raidBanner();
  Promise.resolve(NET.createRaid(r)).catch(e=>{console.warn('createRaid',e);toast('Boss shown on your map only (sync failed)');});
  toast('☠️ Crystal Knight spawned next to you');return true;}catch(e){console.warn('testboss',e);toast('Could not spawn boss');return false;}}

// ---------- tower art ----------
function towerSVG(l){let s='';const h=60+l*14,y=150-h;for(let i=0;i<l;i++)s+=`<rect x="44" y="${y+22+i*(h-30)/l}" width="32" height="3" fill="#8a7a60"/>`;
  return`<svg viewBox="0 0 120 160" class="fort" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="${y}" width="40" height="${h}" fill="#6b6355" stroke="#222" stroke-width="2"/>${s}
  <rect x="32" y="${y-14}" width="56" height="16" fill="#8a8070" stroke="#222"/>${[0,1,2,3].map(i=>`<rect x="${32+i*15}" y="${y-22}" width="9" height="9" fill="#8a8070"/>`).join('')}
  <rect x="54" y="${y+6}" width="12" height="10" fill="#ffd27a"/>${l>=3?`<path d="M60 ${y-22} L10 ${y-60} L30 ${y-66}Z" fill="#fff3b0" opacity=".25"/>`:''}${l>=4?`<line x1="60" y1="${y-22}" x2="60" y2="${y-44}" stroke="#aaa" stroke-width="2"/><path d="M60 ${y-44} l18 5 l-18 5z" fill="${P.color}"/>`:''}
  <rect x="20" y="148" width="80" height="8" fill="#3a332a"/></svg>`;}
