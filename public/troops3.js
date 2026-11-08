// v20 Troops, full spec part 2 (TROOPS-SPEC §5, §7). Loads after troops2.js.
// 1) Send screen: None / Min to win / Half / Max, power bar (you vs them), verdict, expected wounded + dead, confirm when risky.
// 2) Ally garrisons: guard an ally's hex (max 3 players per hex, combined cap 2,000 on a plain hex, 3,000 x tower level on a tower).
//    Your garrison is published in your member doc (no GPS) so every phone counts it when the horde hits that hex.
//    Losses: the phone that runs the fight writes a small loss note into the shared horde doc (fx.gl); your phone applies it to your troops.
// 3) Class bonus per hex, once per class: Engineer +15% garrison power, Raider +10%, Scout reveals the ring around the hex.
const TR3={minWinMaxLossPct:0.10,riskyLossPct:0.20,maxPlayersPerHex:3,plainCap:2000,towerCapPerLevel:3000,
  clsGarrison:{engineer:0.15,raider:0.10},scoutRing:1,lossNotes:60};

// ---------- 1) send screen ----------
function _tr3_enemy(id){const tg=marchTarget(id),mb=friendlyHex(id)&&!squadAt(id)?mobAt(id):null;
  return mb?()=>mutantUnits(mb.mid,mb.lvl):tg.units.length?()=>marchTarget(id).units:null;}
function marchPreview(n,enemy){const mine=[...marchUnits({unit:frozenMe(),escorts:{}}),...(n>0?[troopUnit(n)]:[])],them=enemy?enemy():[];
  const pw=a=>a.reduce((s,u)=>s+unitPower(u),0);let win=true,lost=0;
  if(enemy){if(n>0){const e=expectedLoss(n,enemy);win=e.win;lost=win?e.lost:n;}else win=predict(()=>marchUnits({unit:frozenMe(),escorts:{}}),enemy).win;}
  const s=n>0?woundSplit(lost,win):{wounded:0,dead:0};return{n,win,lost,wounded:s.wounded,dead:s.dead,you:pw(mine),them:pw(them),pct:n?lost/n:0};}
function minToWin(maxN,enemy){if(!enemy)return 0;const low=n=>{const p=marchPreview(n,enemy);return p.win&&p.pct<=TR3.minWinMaxLossPct;},any=n=>marchPreview(n,enemy).win;
  if(low(0))return 0;if(maxN<=0)return null;const ok=low(maxN)?low:any(maxN)?any:null;if(!ok)return null; // prefer <=10% losses, else the smallest group that still wins
  let lo=0,hi=maxN;while(hi-lo>100){const mid=Math.round((lo+hi)/2/100)*100||100;if(mid>=hi)break;if(ok(mid))hi=mid;else lo=mid;}return hi;}
function verdict(p,hasEnemy){if(!hasEnemy)return['ok','✅ No fight expected'];if(!p.win)return['bad','❌ You lose'];if(p.pct>=TR3.riskyLossPct)return['warn','⚠️ Close: you win with heavy losses'];return['ok','✅ You win'];}
G.troopRisk=null;
// v20 fix: step5 puts the slot counter first in the button, and the old picker overwrote it (firstChild). Update the time text node instead.
function setMarchLabel(btn,t){for(const n of btn.childNodes)if(n.nodeType===3&&/March/.test(n.nodeValue)){n.nodeValue=t;return;}}
const _tr3_amb=addMarchBtn;addMarchBtn=function(id){_tr3_amb.apply(this,arguments);try{if(document.querySelector('#modalBody .troopsel3'))return;const btn=$('#btnMarch'),old=document.querySelector('#modalBody .troopsel');if(!btn||btn.disabled||!old)return;
  const enemy=_tr3_enemy(id),home=TP().home,maxN=Math.min(home,marchTroopCap()),mw=enemy?minToWin(maxN,enemy):0;
  const row=document.createElement('div');row.className='row troopsel3';row.style.width='100%';old.replaceWith(row);
  if(G.troopSend==null||G.troopSend>maxN)G.troopSend=0;if(enemy&&mw!=null)G.troopSend=Math.min(maxN,mw);
  else if(!enemy&&!(G.troopSend>0)&&home>0&&typeof defaultSend25==='function')G.troopSend=Math.min(maxN,defaultSend25());
  const clamp=v=>Math.max(0,Math.min(maxN,Math.round(+v||0)));
  row.innerHTML=`<div class="grow trooppick"><div class="tnrow"><label for="trange">🪖 Troops <b class="tnow">0</b></label><input id="tnum" class="tnum" type="number" inputmode="numeric" min="0" max="${maxN}" step="1" value="0" aria-label="Troop count"></div>
    <input id="trange" type="range" min="0" max="${maxN}" step="1" value="0" aria-valuemin="0" aria-valuemax="${maxN}" aria-valuenow="0" aria-label="Troops to send">
    <small class="tmeta">${home.toLocaleString()} home · max ${marchTroopCap().toLocaleString()} per march${isHungry()?' · 🍞 Hungry −10% ATK':''}${enemy&&mw==null&&maxN?' · can\'t win with the troops at home':''}</small>
    <div class="tpv"></div></div>`;
  const range=row.querySelector('#trange'),num=row.querySelector('#tnum'),pv=row.querySelector('.tpv'),now=row.querySelector('.tnow');
  const paint=()=>{const n=clamp(G.troopSend),p=marchPreview(n,enemy),[vk,vt]=verdict(p,!!enemy),tot=Math.max(1,p.you+p.them),d=marchDur(marchFrom(),id);
    G.troopSend=n;G.troopRisk=enemy&&(!p.win||p.pct>=TR3.riskyLossPct)?p:null;
    range.value=String(n);num.value=String(n);range.setAttribute('aria-valuenow',String(n));now.textContent=n.toLocaleString();
    pv.innerHTML=`${enemy?`<div class="pbar"><i style="width:${Math.round(100*p.you/tot)}%"></i></div><small>⚡ You ${p.you.toLocaleString()} vs Them ${p.them.toLocaleString()}</small>`:''}
      <small>🎒 Load ${marchLoad(n)} · 🐢 ${fmtDur(d)} each way${n&&enemy?` · 💀 ~${p.wounded.toLocaleString()} wounded, ~${p.dead.toLocaleString()} dead`:''}</small>
      <div class="verdict ${vk}">${vt}</div>`;
    setMarchLabel(btn,`🚩 March · ${fmtDur(d)} there, ${fmtDur(d)} back`);};
  const pick=v=>{G.troopSend=clamp(v);paint();};
  range.addEventListener('input',()=>pick(range.value));
  num.addEventListener('input',()=>pick(num.value));
  num.addEventListener('change',()=>pick(num.value));
  paint();
  document.querySelectorAll('#modalBody .row').forEach(el=>{if(!el.closest('.troopsel3')&&/Predicted:/.test(el.textContent||''))el.remove();});
  }catch(e){console.warn('send screen',e);}};
const _tr3_send=sendMarch;sendMarch=async function(to,opt){const r=G.troopRisk;G.troopRisk=null;
  if(r&&!(opt&&opt.confirmed)){const ok=await UI.ask('Risky march',r.win?`You're likely to lose ~${Math.round(r.pct*100)}% of these troops (~${r.wounded.toLocaleString()} wounded, ~${r.dead.toLocaleString()} dead). Send anyway?`:`This march is likely to lose. ~${r.wounded.toLocaleString()} wounded and ~${r.dead.toLocaleString()} dead. Send anyway?`,'Send');if(!ok)return;}
  return _tr3_send.apply(this,arguments);};

// ---------- 2) ally garrisons ----------
function myGarrisons(){return Object.entries(stationed()).filter(([,s])=>Date.now()>=s.at&&s.n>0).map(([hex,s])=>({hex,n:s.n,p:Math.round(s.n*TROOP.powerPer),c:(P.cls&&P.cls.id)||''})).slice(0,30);}
HOOK.member(function(o){try{if(P.world)o.gar=myGarrisons();}catch(e){}return o;});
function allyGarAt(hex){const out=[],mem=(G.al&&G.al.members)||{};for(const [uid,m] of Object.entries(mem)){if(isMe(uid)||m.me||!Array.isArray(m.gar))continue;
  for(const g of m.gar)if(g&&g.hex===hex&&g.n>0)out.push({kind:'allygar',id:`allygar:${uid}:${hex}`,hex,uid,owner:m.name||'Ally',n:g.n|0,power:Math.max(0,g.p|0),c:g.c||''});}
  return out.sort((a,b)=>a.id<b.id?-1:1);}
function hexGarCap(hex){const t=(W().towers||{})[hex];if(t&&t.state==='up')return TR3.towerCapPerLevel*(t.level||1);
  const allyTower=Object.values((G.al&&G.al.members)||{}).some(m=>Array.isArray(m.defs)&&m.defs.some(d=>d.k==='tower'&&d.hex===hex));return allyTower?TR3.towerCapPerLevel:TR3.plainCap;}
function garrisonedAt(hex){const mine=(stationed()[hex]||{}).n||0;return mine+allyGarAt(hex).reduce((a,g)=>a+g.n,0);}
const _tr3_ad=activeDefs;activeDefs=function(id){const d=_tr3_ad.apply(this,arguments);try{if(allied(id))for(const g of allyGarAt(id))if(!d.some(x=>x.id===g.id))d.push(g);
    const cls=new Set();d.forEach(x=>{if(x.kind==='troops'&&P.cls&&P.cls.id)cls.add(P.cls.id);if(x.kind==='allygar'&&x.c)cls.add(x.c);});
    let m=1;for(const c of cls)m+=TR3.clsGarrison[c]||0;if(m>1)d.forEach(x=>{if(x.kind==='troops'||x.kind==='allygar')x.power=Math.round(x.power*m);});}catch(e){console.warn('ally gar',e);}return d;};
const _tr3_so=structOf;structOf=function(d){if(d&&d.kind==='allygar')return{state:'up',hpPct:1,troops:true};return _tr3_so.apply(this,arguments);};
const _tr3_sn=structName;structName=function(d){if(d&&d.kind==='allygar')return`${d.owner}'s ${d.n.toLocaleString()} troops`;return _tr3_sn.apply(this,arguments);};
const _tr3_ds=destroy;destroy=function(d){if(d&&d.kind==='allygar')return;return _tr3_ds.apply(this,arguments);}; // the owner's phone applies losses
const _tr3_du=defenderUnit;defenderUnit=function(d){if(d&&d.kind==='allygar')return bandUnit(`🪖 ${d.owner}'s troops`,Math.max(1,d.power));return _tr3_du.apply(this,arguments);};
// loss notes for allies' garrisons (same loss rule as stage8: held = min(50%, 30% x attack/defense), lost = everyone)
const _tr3_sr=squadReplay;squadReplay=function(defs,dp,sp,g){const f=_tr3_sr.apply(this,arguments);try{const ag=defs.filter(x=>x.kind==='allygar');if(ag.length){const fx=FX(),held=dp>=sp,frac=held?Math.min(.5,sp/dp*.3):1;
  fx.gl=(fx.gl||[]).concat(ag.map(x=>({t:Date.now(),hex:x.hex,uid:x.uid,frac:+frac.toFixed(3),won:held}))).slice(-TR3.lossNotes);}}catch(e){}return f;};
function applyGarLosses(){const t=TP();if(t.glSeen==null){t.glSeen=Date.now();save();return;}const notes=(FX().gl||[]).filter(e=>e.uid===P.uid&&e.t>t.glSeen);if(!notes.length)return;
  for(const e of notes){const s=stationed()[e.hex];t.glSeen=Math.max(t.glSeen,e.t);if(!s||s.n<=0)continue;const lost=Math.min(s.n,Math.round(s.n*e.frac));if(lost<=0)continue;s.n-=lost;if(s.n<=0)delete stationed()[e.hex];
    const w=woundSplit(lost,e.won);addWounded(w.wounded);report(`🛡️ Your troops guarding ${hexName(e.hex)} ${e.won?'held':'fell'}: ${w.wounded.toLocaleString()} wounded, ${w.dead.toLocaleString()} dead`,e.won);}
  save();try{pushMember();}catch(e){}}
setInterval(()=>{try{if(P&&P.world)applyGarLosses();}catch(e){}},15e3);
// stationing: ally hexes allowed (max 3 players per hex), combined cap per hex
const _tr3_st=stationTroops;stationTroops=function(h,n){const own=!!(P.tiles[h]||W().towers[h]||(W().sh&&W().sh.hex===h));
  if(!own&&!allied(h))return toast('You can only guard your own or an ally\'s hexes');
  const others=allyGarAt(h);if(!stationed()[h]&&others.length>=TR3.maxPlayersPerHex)return toast(`🛡️ ${TR3.maxPlayersPerHex} players already guard this hex`);
  const room=hexGarCap(h)-garrisonedAt(h);if(room<=0)return toast(`🛡️ This hex is full (${hexGarCap(h).toLocaleString()} troops)`);
  const r=_tr3_st(h,Math.min(n,room));try{pushMember();}catch(e){}return r;};
const _tr3_rs=recallStation;recallStation=function(){const r=_tr3_rs.apply(this,arguments);try{pushMember();}catch(e){}return r;};
// ally hex card: guard row (stage8 only adds it on your own hexes)
HOOK.tile(function(id){try{const box=$('#modalBody .ibtns');if(!box)return;const gs=allyGarAt(id),here=stationed()[id];
  let info=gs.length?`<small>Guarding now: ${gs.map(g=>`${g.owner} ${g.n.toLocaleString()}${g.c?' '+CLASSES.list[g.c].icon:''}`).join(' · ')}</small>`:'';
  const row0=document.querySelector('#modalBody .stationrow');if(row0){if(info)row0.querySelector('.grow').insertAdjacentHTML('beforeend',info);return;}
  if(P.tiles[id]||!allied(id))return;const home=TP().home,room=Math.max(0,hexGarCap(id)-garrisonedAt(id)),opts=[1000,5000].filter(x=>x<Math.min(home,room));if(Math.min(home,room)>0)opts.push(Math.min(home,room));
  const row=document.createElement('div');row.className='row stationrow';row.style.width='100%';
  row.innerHTML=`<div class="grow"><b>🛡️ Guard this ally hex: ${here?here.n.toLocaleString()+' of yours':'none of yours'}</b><small>${home.toLocaleString()} at home · room ${room.toLocaleString()} of ${hexGarCap(id).toLocaleString()} · up to ${TR3.maxPlayersPerHex} players</small>${info}<div class="seg">${opts.map(x=>`<button class="stn" data-n="${x}">${x===Math.min(home,room)?'All '+x.toLocaleString():'+'+x.toLocaleString()}</button>`).join('')}${here?'<button class="stnrecall">↩️ Recall</button>':''}</div></div>`;
  row.querySelectorAll('.stn').forEach(b=>oneTap(b,()=>{stationTroops(id,+b.dataset.n);UI.closeModal();}));const rc=row.querySelector('.stnrecall');if(rc)oneTap(rc,()=>{recallStation(id);UI.closeModal();});box.before(row);}catch(e){console.warn('ally guard row',e);}});

// ---------- 3) Scout garrisons light up the ring around them ----------
let _tr3_scoutCache={t:0,set:null};
function scoutWatch(){if(Date.now()-_tr3_scoutCache.t<5000&&_tr3_scoutCache.set)return _tr3_scoutCache.set;const s=new Set(),add=h=>{const [q,r]=idQR(h);hexRing(q,r,TR3.scoutRing).forEach(x=>s.add(x.id));};
  if(P.cls&&P.cls.id==='scout')myGarrisons().forEach(g=>add(g.hex));
  for(const m of Object.values((G.al&&G.al.members)||{}))if(!m.me&&Array.isArray(m.gar))m.gar.forEach(g=>{if(g&&g.c==='scout'&&typeof g.hex==='string')add(g.hex);});
  _tr3_scoutCache={t:Date.now(),set:s};return s;}
const _tr3_vis=isVis;isVis=function(id){return _tr3_vis.apply(this,arguments)||scoutWatch().has(id);};

// ---------- 4) TROOPS-SPEC §9 balance fix: troop blocks were paper ----------
// troopUnit came from bandUnit(power), so 1,000 troops had ~60 HP (less than the hero) and enemies, which focus the lowest-HP
// unit, shredded small groups even in fights the hero wins alone. Now the block gets HP per troop (spec: T1 = 1.0 HP/troop;
// we use a quarter of that so the hero stays the main damage dealer early). ATK is unchanged.
TR3.hpPerTroop=0.25;
const _tr3_tu=troopUnit;troopUnit=function(n){const u=_tr3_tu(n);const hp=Math.round(Math.max(u.max||u.hp||1,n*TR3.hpPerTroop*TR2.tierPower[troopTier()-1]));u.max=hp;u.hp=hp;return u;};
