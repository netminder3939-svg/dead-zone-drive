// Stage 6 (preview): activatable buffs. About 3 activations a day (resets midnight Pacific).
// How many can run at once = buff slots from the main tower tier (Stage 5: 1 / 2 / 3). Personal only: no alliance buffs, no classes.
const BUFF={perDay:3,list:{
  bloodrage:{icon:'🩸',name:'Bloodrage',desc:'+15% attack',hours:1,fx:{atk:.15}},
  ironhide:{icon:'🛡️',name:'Ironhide',desc:'+15% defense',hours:1,fx:{def:.15}},
  secondwind:{icon:'💚',name:'Second Wind',desc:'+20% max HP',hours:1,fx:{hp:.20}},
  fortify:{icon:'🏰',name:'Fortify',desc:'Your stronghold, towers and outposts defend at +20%',hours:4,fx:{struct:.20}},
  farsight:{icon:'👁️',name:'Far Sight',desc:'See 3 hexes around you through the fog',hours:2,fx:{sight:3}}}};
function buffState(){const d=pacificDate(Date.now());P.buffs=P.buffs||{day:d,used:0,active:{}};const B=P.buffs;if(B.day!==d){B.day=d;B.used=0;}B.active=B.active||{};
  const now=Date.now();for(const k in B.active)if(B.active[k]<=now)delete B.active[k];return B;}
function fmtBuff(ms){const m=Math.max(0,Math.ceil(ms/60e3)),h=Math.floor(m/60);return h?`${h}h ${String(m%60).padStart(2,'0')}m`:`${m}m`;}
function buffOn(id){const B=P.buffs;return !!(B&&B.active&&B.active[id]>Date.now());}
function buffsActive(){return Object.keys(buffState().active);}
function buffsLeft(){return Math.max(0,BUFF.perDay-buffState().used);}
function activateBuff(id){const b=BUFF.list[id];if(!b)return false;const B=buffState();
  if(buffOn(id)){toast(`${b.icon} ${b.name} is already running`);return false;}
  if(B.used>=BUFF.perDay){toast(`No buffs left today (${BUFF.perDay}/day). More after midnight Pacific.`);return false;}
  if(buffsActive().length>=buffSlots()){const n=(typeof mtNext==='function')&&mtNext();toast(`All ${buffSlots()} buff slot${buffSlots()>1?'s':''} in use${n&&n.buffs>buffSlots()?` (Stronghold Lv${n.at} adds one)`:''}`);return false;}
  B.used++;B.active[id]=Date.now()+b.hours*3600e3;save();toast(`${b.icon} ${b.name} on for ${b.hours}h`);try{UI.hud();drawWorld();}catch(e){}if(UI.tab)UI.render();buffChip();return true;}
// effects
const _stats6=stats;stats=function(){const s=_stats6.apply(this,arguments);try{if(!P.buffs)return s;const o={...s};for(const id of Object.keys(P.buffs.active||{})){if(!buffOn(id))continue;const f=BUFF.list[id].fx;
  for(const k of ['atk','def','hp'])if(f[k]&&typeof o[k]==='number')o[k]=Math.round(o[k]*(1+f[k]));}return o;}catch(e){return s;}};
const _defFor6=defendersFor;defendersFor=function(id){const out=_defFor6(id);if(!buffOn('fortify'))return out;const m=1+BUFF.list.fortify.fx.struct;return out.map(d=>['sh','tower','op'].includes(d.kind)?{...d,power:Math.round(d.power*m)}:d);};
const _isVis6=isVis;isVis=function(id){if(_isVis6(id))return true;return !!(G.pos&&buffOn('farsight')&&hexDist(hexAt(...G.pos).id,id)<=BUFF.list.farsight.fx.sight);};
// HUD chip with running buffs
function buffChip(){let c=document.getElementById('buffchip');const a=P.buffs?buffsActive():[];if(!a.length){if(c)c.remove();return;}
  if(!c){c=document.createElement('div');c.id='buffchip';c.style.cssText='position:fixed;left:8px;top:calc(env(safe-area-inset-top) + 112px);z-index:700;background:#1d1a17cc;border:1px solid #6b5a3a;border-radius:12px;padding:3px 8px;font-size:12px;color:#f3e6c8';c.onclick=()=>{UI.open('player');UI.sub.player='buffs';UI.render();};document.body.appendChild(c);}
  c.textContent=a.map(id=>`${BUFF.list[id].icon} ${fmtBuff(P.buffs.active[id]-Date.now())}`).join('  ');}
setInterval(()=>{try{if(P&&P.buffs){const before=Object.keys(P.buffs.active||{}).length;buffState();if(Object.keys(P.buffs.active).length!==before){save();try{drawWorld();}catch(e){}}}buffChip();}catch(e){}},5000);
// Player › Buffs
UI.SUBS.player.push(['buffs','✨ Buffs']);
if(typeof FLAVOR!=='undefined')FLAVOR.buffs='✨ Old tricks and stranger rites. Use them when it counts.';
const _render6=UI.render;UI.render=function(){_render6.apply(this,arguments);try{if(this.tab!=='player'||this.sub.player!=='buffs')return;const b=$('#sheetBody');if(!b)return;const B=buffState(),slots=buffSlots(),act=buffsActive();
  let h=`<h2>✨ Buffs <small class="lv">${buffsLeft()}/${BUFF.perDay} left today</small></h2><p class="tiny">Turn one on when you need it. ${BUFF.perDay} activations a day (reset at midnight Pacific). Running at once: ${act.length}/${slots} slot${slots>1?'s':''}, set by your Stronghold tier.</p>`;
  h+=Object.entries(BUFF.list).map(([id,x])=>{const on=buffOn(id),can=!on&&B.used<BUFF.perDay&&act.length<slots;
    return`<div class="row buff ${on?'on':''}"><span class="big-ico">${x.icon}</span><div class="grow"><b>${x.name}</b><small>${x.desc} · ${x.hours}h</small>${on?`<small>✅ Running · ${fmtBuff(B.active[id]-Date.now())} left</small>`:''}</div>${on?'<b>ON</b>':`<button ${can?'':'disabled'} onclick="activateBuff('${id}')">Activate</button>`}</div>`;}).join('');
  b.insertAdjacentHTML('beforeend',h);}catch(e){console.warn('buffs',e);}};
(document.readyState==='complete'?f=>f():f=>window.addEventListener('load',f))(()=>setTimeout(buffChip,3000));
