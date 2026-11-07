// fix10 (test server): playtest of ddd-s8-8.
const IS_PV10=location.hostname.includes('--');
// 1) horde doc on another grid size is ignored; our own horde carries the grid size. "Send nearest squad at me" launches a real march that sticks.
const _adopt10=adoptHorde;adoptHorde=function(doc){try{const r=JSON.parse(doc.fx);if((r.gridR||98)!==HEX_R)return;}catch(e){}return _adopt10.apply(this,arguments);};
const _fcu10=factionCatchUp;factionCatchUp=function(){try{const fx=P.world&&P.world.fx;if(fx&&fx.start)fx.gridR=HEX_R;}catch(e){}return _fcu10.apply(this,arguments);};
const _pass10=passable;passable=function(id,fid){if(G.devSq&&G.devSq.has(id))return true;return _pass10.apply(this,arguments);};
devSquadAtMe=function(){if(!G.pos||!P.world)return toast('No GPS yet');const me=hexAt(...G.pos).id;const fx=FX();
  if(!fx.start){const keep=BAL.factions.startTiles;BAL.factions.startTiles=0;try{factionCatchUp(true);}finally{BAL.factions.startTiles=keep;}}
  let best=null;for(const [fid,f] of Object.entries(fx.f||{})){if(f.routedUntil)continue;for(const s of f.squads||[]){if(!s.pos)continue;const d=hexDist(s.pos,me);if(d<3)continue;if(!best||d<best.d)best={fid,f,s,d};}}
  if(!best)return toast('No squad far enough away to march at you');const s=best.s;s.path=marchTrack(s.pos,me).slice(1);G.devSq=new Set(s.path);P.explored=P.explored||{};[s.pos,...s.path].forEach(h=>P.explored[h]=1);s.target=me;s.why='marching at you (dev)';s.restUntil=0;s.woundUntil=0;s.moved=0;delete s.icept;
  fx.gridR=HEX_R;fx.last=Math.max(fx.last||0,HS.remoteLast)+1;try{fxDirty();publishHorde();}catch(e){}save();drawWorld();drawSquadMoves();
  try{map.fitBounds([hexCenter(...idQR(s.pos)),G.pos],{padding:[60,60],maxZoom:16});}catch(e){}
  toast(`☠️ ${fdef(best.fid).name} squad is marching at you · ${best.d} hexes · ~${fmtDur(best.d*BAL.horde.stepMin*60e3)}`);return best;};
// 3) teleport toggle: clear on/off, off by default, turns itself off after one jump
G.dev.tp=false;function tpSync(){const b=document.querySelector('#devbar [data-dev="tp"]');if(b){b.classList.toggle('on',!!G.dev.tp);b.textContent=G.dev.tp?'📍 Teleport: ON (tap map)':'📍 Teleport: off';}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#devbar [data-dev="tp"]');if(!b)return;e.stopImmediatePropagation();e.preventDefault();G.dev.tp=!G.dev.tp;tpSync();toast(G.dev.tp?'📍 Teleport ON: tap the map where you want to jump':'📍 Teleport OFF: taps open hex cards again');},true);
if(typeof map!=='undefined')map.on('click',()=>{if(G.dev.tp)setTimeout(()=>{G.dev.tp=false;tpSync();toast('📍 Jumped there. Teleport is off again');},0);});
setTimeout(tpSync,500);
// 4) safety sweep: no "Infinity" and no long decimals in visible text
function tidy10(root){try{const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const t=n.nodeValue;if(!/Infinity|\d\.\d{3,}/.test(t))continue;n.nodeValue=t.replace(/ (of|\/) ?Infinity/g,'').replace(/Infinity/g,'∞').replace(/(\d+)\.(\d{3,})/g,(m)=>String(Math.round(parseFloat(m)*10)/10));}}catch(e){}}
['modal','sheet','toast','hud','res'].forEach(id=>{const e=document.getElementById(id);if(e){new MutationObserver(()=>tidy10(e)).observe(e,{childList:true,subtree:true,characterData:true});}});
// 5) troop losses scale with the whole army's damage share (more troops = bigger army, sensible losses)
function armyFrac(f){let h=0,m=0;(f.A||[]).forEach(u=>{h+=Math.max(0,u.hp);m+=Math.max(1,u.max);});return m?h/m:1;}
const _rf10=runFight;runFight=function(A,B){const f=_rf10.apply(this,arguments);try{if((f.startA||[]).some(u=>u.troop)){const fr=armyFrac(f);G._tl=G._tl==null?fr:Math.min(G._tl,fr);}}catch(e){}return f;};
expectedLoss=function(n,enemy){if(!n||!enemy)return 0;const keep=G._tl;G._tl=null;const f=_rf10([...marchUnits({unit:frozenMe(),escorts:{}}),troopUnit(n)],enemy());const fr=f.win?armyFrac(f):0;G._tl=keep;return{lost:Math.round(n*(1-fr)),win:f.win};};
// 8) first Train tap: act on pointerup so a re-render between down and click can't eat it
let _tr10=0;document.addEventListener('pointerup',e=>{const b=e.target.closest&&e.target.closest('#btnTrain');if(!b||b.disabled)return;const m=(b.getAttribute('onclick')||'').match(/trainTroops\((\d+)\)/);if(!m)return;e.preventDefault();_tr10=Date.now();trainTroops(+m[1]);},true);
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#btnTrain')&&Date.now()-_tr10<800){e.stopImmediatePropagation();e.preventDefault();}},true);

