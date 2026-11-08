// v26d (TEST) Tougher Stronghold + real horde reset + grace + bank-backed squads. Approved by Jacob Nov 5.
//  1) Stronghold: own HP pool + strong fire even with 0 troops. Lv1 fire 450 / HP 3,500 (+40% HP, +20% fire per level), walls 30%+.
//     It is SACKED (loot + half fire for 24 h), never destroyed. Hexes in its range can only be taken by beating it in the fight
//     (it is always the building in that fight: defenses fight first). Same deterministic fight26 math.
//  2) Wipe epoch: any horde started before the last wipe (fullEpoch) is refused and a local stale one is dropped, so old phones can't restore it.
//  3) Grace: 48 h with no horde moves onto a player's land after their Stronghold is founded (and after a fresh world).
//  4) Clan banks start at 500 troops, grow ~44/h; a squad marches with 30% of its bank and fights with exactly those troops.
const SH26={fire:450,hp:3500,hpPerLvl:.40,sackH:24,sackLoot:.20,sackPct:.5,graceH:48,bankStart:500,sortiePct:.30,sortieMin:50};
window.SH26D=SH26;
C26.bld.sh.fire=SH26.fire;
innate26=function(bld){if(bld&&bld.kind==='sh')return Math.round(SH26.hp*(1+SH26.hpPerLvl*(Math.max(1,bld.lvl||1)-1)));return C26.innate;};
window.innate26=innate26;
function shStats26(lv){lv=lv||strongholdLevel();return{lv,hp:innate26({kind:'sh',lvl:lv}),fire:Math.round(SH26.fire*(1+C26.lvlFire*(lv-1))),walls:Math.round(Math.min(C26.maxWalls,C26.bld.sh.walls+C26.lvlWalls*(lv-1))*100)};}
window.shStats26=shStats26;
// ---- sacked, never destroyed
const _ds26d=destroy;destroy=function(d){if(d&&d.kind==='sh'){const w=W(),s=w.sh;if(!s)return;const now=Date.now();
    s.state='up';s.hpPct=SH26.sackPct;s.sackedUntil=now+SH26.sackH*3600e3;
    const loot={};try{for(const k in P.res){const n=Math.floor((P.res[k]||0)*SH26.sackLoot);if(n>0){loot[k]=n;P.res[k]-=n;}}}catch(e){}
    try{allianceLog(`🔥 ${poss(P.name)} Stronghold was sacked by raiders (not destroyed)`);}catch(e){}save();return;}
  return _ds26d.apply(this,arguments);};
// sack wears off
setInterval(()=>{try{const s=P.world&&P.world.sh;if(s&&s.sackedUntil&&Date.now()>s.sackedUntil){delete s.sackedUntil;s.hpPct=1;save();}}catch(e){}},30e3);
// ---- wipe epoch
function fe26(){try{return Math.max(G.srvFullEpoch||0,+(localStorage.getItem('wl_fullEpoch_'+(NET.team||''))||0));}catch(e){return G.srvFullEpoch||0;}}
window.fe26=fe26;
function staleHorde26(fx){const fe=fe26();return !!(fe&&fx&&fx.start&&fx.start<fe);}
function dropStale26(){try{const w=P.world;if(w&&w.fx&&staleHorde26(w.fx)){w.fx={start:null,last:null,anchor:null,f:{},takes:{}};fxDirty();save();console.log('v26d: dropped pre-wipe horde');return true;}}catch(e){}return false;}
window.dropStale26=dropStale26;
const _ad26d=adoptHorde;adoptHorde=function(doc){try{const r=JSON.parse(doc&&doc.fx||'null');if(r&&staleHorde26(r)){console.log('v26d: refused pre-wipe horde doc');setTimeout(()=>{try{if(FX().start&&!staleHorde26(FX()))publishHorde();}catch(e){}},3000);return;}}catch(e){}
  dropStale26();return _ad26d.apply(this,arguments);};
const _pub26d=publishHorde;publishHorde=function(){if(dropStale26())return;try{FX().fe=fe26();}catch(e){}return _pub26d.apply(this,arguments);};
// re-aim at the current Stronghold
const _fcu26d=factionCatchUp;factionCatchUp=function(){dropStale26();try{const fx=FX(),s=P.world&&P.world.sh,hq=typeof hqHex15==='function'?hqHex15():null;const want=hq||(s&&s.hex&&s.state!=='down'?s.hex:null);if(fx.start&&want&&fx.anchor!==want)fx.anchor=want;}catch(e){}return _fcu26d.apply(this,arguments);};
// ---- grace
function myGrace26(){const s=P.world&&P.world.sh;if(s&&s.hex&&!P.born26){P.born26=Date.now();try{save();}catch(e){}}return Math.max(P.born26||0,fe26())+SH26.graceH*3600e3;}
window.myGrace26=myGrace26;
HOOK.member(function(m){try{m.gr26=myGrace26();}catch(e){}return m;});
function graceOf26(id){if(P.tiles[id])return myGrace26();const o=G.terr[id];if(!o||o.ai||!o.uid)return 0;if(isMe(o.uid))return myGrace26();
  const m=((G.al&&G.al.members)||{})[o.uid]||{};return Math.max(m.gr26||0,fe26()+SH26.graceH*3600e3);}
window.graceOf26=graceOf26;
// ---- bank-backed squads
HE.start.troops=SH26.bankStart;HE.start.res=500;HE.resPerH=30;HE.resPerHex=2;HE.convPerH=60;HE.lowTroops=100;
function squadTroops26(f){try{const b=bankOf(f);return Math.max(0,Math.round(Math.min(b.troops,Math.max(SH26.sortieMin,b.troops*SH26.sortiePct))));}catch(e){return 0;}}
window.squadTroops26=squadTroops26;
factionAttack=function(f){return Math.round(squadTroops26(f)*TROOP.powerPer*(1-rfx('jammers')/100)*100)/100;};
let _sortie26=300;try{Object.defineProperty(HE,'sortie',{get:()=>_sortie26,set:v=>{},configurable:true});}catch(e){}
// outermost step wrapper: grace + sortie size from the bank
const _st26d=squadStep;squadStep=function(f,fid,s,k,t,ev){try{_sortie26=Math.max(SH26.sortieMin,squadTroops26(f));
    const nx=s&&s.path&&s.path[0];if(nx&&allied(nx)){const g=graceOf26(nx);if(t<g){s.path=[];s.target=null;s.restUntil=Math.max(s.restUntil||0,Math.min(g,t+12*3600e3));return;}}}catch(e){}
  return _st26d.apply(this,arguments);};
// targeting: protected land is not a target
const _ps26d=planSortie;planSortie=function(f,fid,s,rnd,t){_ps26d.apply(this,arguments);try{if(s.target&&allied(s.target)&&t<graceOf26(s.target)){s.target=null;s.path=[];}}catch(e){}};
// ---- Stronghold card: numbers + protection note
function shNote26(){const st=shStats26(),g=myGrace26()-Date.now(),s=P.world&&P.world.sh;
  const prot=g>0?`<b class="prot26">🛡 Protected ${Math.ceil(g/3600e3)}h</b>`:'';const sack=s&&s.sackedUntil>Date.now()?` · 🔥 Sacked ${Math.ceil((s.sackedUntil-Date.now())/3600e3)}h (half fire)`:'';
  return`<div class="sh26d">${prot}<span>❤️ ${st.hp.toLocaleString()} HP · 🔥 ${st.fire} fire · 🧱 ${st.walls}% walls${sack}</span><small>Fights even with 0 troops. Can be sacked, never destroyed. Hexes in range can't be taken until it's beaten.</small></div>`;}
window.shNote26=shNote26;
const _is26d=UI.infoStruct;UI.infoStruct=function(kind){const r=_is26d.apply(this,arguments);try{if(kind==='sh'){const mb=$('#modalBody');if(mb&&!mb.querySelector('.sh26d')){const at=mb.querySelector('.cc26')||mb.querySelector('.icard')||mb;at.insertAdjacentHTML('afterbegin',shNote26());}}}catch(e){console.warn('sh26d',e);}return r;};
// ---- one-time heal: Stronghold/hexes the stale (pre-wipe) horde took from me since the wipe. Runs after the stale horde is dropped.
function heal26(){try{if(P.heal26b||!P.world||!P.uid)return;const fe=fe26();if(!fe||staleHorde26(FX()))return;const s=P.world.sh;let n=0;
  if(s&&s.hex&&s.state==='down'){s.state='up';s.hpPct=1;delete s.sackedUntil;n++;}
  const gi=fxIndex();for(const [id,o] of Object.entries(G.terr||{})){if(o&&o.ai&&isMe(o.prevUid)&&(o.t||0)>=fe&&!gi[id]&&!P.tiles[id]){const t=Date.now();P.tiles[id]={t};try{NET.claimHex(id,{by:P.name,uid:P.uid,color:P.color,t});}catch(e){}G.terr[id]={by:P.name,uid:P.uid,color:P.color,t};n++;}}
  P.heal26b=Date.now();P.heal26n=n;save();try{pushMember();}catch(e){}if(n){try{drawWorld();}catch(e){}try{toast(`🛠 Restored ${n} thing${n>1?'s':''} the old horde took after the wipe`);}catch(e){}}}catch(e){console.warn('heal26',e);}}
window.heal26=heal26;setTimeout(function h(){if(P&&P.world&&Object.keys(G.terr||{}).length&&G.srvFullEpoch!==undefined)heal26();else setTimeout(h,4000);},20000);
