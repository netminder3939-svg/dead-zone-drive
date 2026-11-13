// xp2 (R2, payout replaced in R6.7 by XP-SPEC.md) XP for Horde and defense fights, and what a level gives.
//  One formula for every real Horde / raider fight, attack or defense, win or loss:
//    typical = xpNeed(P.lvl) / 9 · sizeFactor = clamp(enemyTroops / myTroops, 0.5, 2)
//    win = max(1, round(typical x sizeFactor)) · loss = max(1, round(win x 0.25))
//  About 9 typical wins per level at every level; a group twice your size pays double, half your size pays half.
//  myTroops = your own troops in that fight (never the hero, never teammates'); 0 counts as 1 (hero-only assault).
//  enemyTroops = the Horde / raider troop count of that fight; 0 means sizeFactor 0.5.
//  Each player with troops in a fight gets their own payout on their own phone. Owning the hex gives nothing extra.
//  Little monsters keep 15 + 5 x level (battleWin), never this formula. Simulations (predict) never pay.
//  The amount is written onto the fight's report in the same write: f.xp2 (march / walk-up) or xp1 (defense rows).
//  Each level: +3% hero HP/ATK/DEF and +100 march size (unchanged).
(function(){
  const XP2={perLevelWins:9,minF:.5,maxF:2,loss:.25,heroPerLvl:.03,marchPerLvl:100};
  window.XP2=XP2;
  function xpOf2(enemyTroops,myTroops,win){const typical=xpNeed(Math.max(1,P.lvl||1))/XP2.perLevelWins;const e=Math.max(0,+enemyTroops||0),m=Math.max(1,+myTroops||0);
    const f=e>0?Math.min(XP2.maxF,Math.max(XP2.minF,e/m)):XP2.minF;const w=Math.max(1,Math.round(typical*f));return win?w:Math.max(1,Math.round(w*XP2.loss));}
  window.xpOf2=xpOf2;
  function give2(n){if(!(n>0))return 0;try{addXP(n);}catch(e){return 0;}return n;}
  window.give2=give2;
  // ---------- troop counts of a fight you start (march or walk-up)
  const powN=u=>{const m=/\(power (\d+)\)/.exec(u&&u.name||'');return m?+m[1]:0;};
  function hordeNames2(){try{return BAL.factions.list.map(d=>String(d.name||'').split(' · ')[0]).filter(Boolean);}catch(e){return [];}}
  // a Horde / raider fight (squad, holdout, clan garrison or home, raider Stronghold) and not a little monster
  function isHordeFight2(B0){const L=B0||[];if(!L.length)return false;if(L.some(u=>u&&u.fort))return true;if(L.some(u=>powN(u)))return true;
    const names=L.map(u=>String(u&&u.name||'')).join(' | ');if(/Raider holdout/i.test(names))return true;const hn=hordeNames2();return L.some(u=>hn.some(h=>String(u&&u.name||'').startsWith(h)));}
  window.isHordeFight2=isHordeFight2;
  // enemy troops: the army-row total (the same rows the battle uses); my troops: my own troop rows, never the hero
  //  a raider unit with no troop count (a Stronghold, a clan garrison or boss) counts as its HP in basic raider troops
  const tHp2=()=>{try{return C26.types.raider.hp||2;}catch(e){return 2;}};
  function countsOf2(f,A0,B0){const R=f&&f.army2&&f.army2.r;
    if(R){const us=f.army2.us==='att'?R.att:R.def,th=f.army2.us==='att'?R.def:R.att;
      return{enemy:th.rows.reduce((a,o)=>a+(o.custom?Math.max(1,Math.round((+o.hp||0)/tHp2())):(+o.n||0)),0),mine:us.rows.filter(o=>!o.uid||o.uid===P.uid).reduce((a,o)=>a+(+o.n||0),0)};}
    const bp=TROOP.powerPer||1;
    const enemy=(B0||[]).reduce((a,u)=>a+(powN(u)?Math.max(1,Math.round(powN(u)/bp)):Math.max(1,Math.round((+u.max||+u.hp||0)/tHp2()))),0);
    const mine=(A0||[]).filter(u=>u&&u.troop>0&&(!u.uid||u.uid===P.uid)).reduce((a,u)=>a+(+u.troop||0),0);return{enemy,mine};}
  window.countsOf2=countsOf2;
  // a real fight you started: work out the payout, grant it once, put it on the fight (the report reads f.xp2)
  window.fightXP2=function(f,A0,B0){try{if(!f||!isHordeFight2(B0))return 0;if(G._xp2){const i=G._xp2.indexOf(f);if(i>=0)G._xp2.splice(i,1);} // a march resolving at the same moment does not also count it
    if(f._xp2paid)return f.xp2||0;f._xp2paid=1;const c=countsOf2(f,A0,B0);const n=xpOf2(c.enemy,c.mine,!!f.win);f.xp2=give2(n);f.xp2c=c;return f.xp2;}catch(e){console.warn('xp2 fight',e);return 0;}};
  // ---------- marches: each real Horde fight during one march resolution (intercept, path defenders, holdouts, forts)
  //  Each fight's own payout is f.xp2one; f.xp2 is the running march total, so the fight handed to the replay / report
  //  (always the last one) carries exactly what the march grants. Granted once, when the march first resolves.
  G._xp2=null;
  const _rf=runFight;runFight=function(A0,B0){const f=_rf.apply(this,arguments);
    try{if(G._xp2&&!G._xp2sim&&f&&isHordeFight2(B0)&&!(f.army2&&f.army2.us&&f.army2.us!=='att')){const c=countsOf2(f,A0,B0);f.xp2one=xpOf2(c.enemy,c.mine,!!f.win);f.xp2c=c;
      G._xp2.push(f);f.xp2=G._xp2.reduce((a,x)=>a+(x.xp2one||0),0);}}catch(e){}return f;};
  window.runFight=runFight;
  // a forecast never pays, even while a march is resolving in the background
  try{const _pr=predict;predict=function(){const was=G._xp2sim;G._xp2sim=1;try{return _pr.apply(this,arguments);}finally{G._xp2sim=was;}};window.predict=predict;}catch(e){}
  const _rm=resolveMarch;resolveMarch=async function(id,m){const was=!!(P.marchDone||{})[id];const mine2=[];G._xp2=mine2;
    try{return await _rm.apply(this,arguments);}
    finally{if(G._xp2===mine2)G._xp2=null;try{const n=mine2.reduce((a,x)=>a+(x.xp2one||0),0);if(!was&&(P.marchDone||{})[id]&&n>0){give2(n);save();}}catch(e){}}};
  window.resolveMarch=resolveMarch;
  // ---------- defense of your hexes: your own troops there (home garrison + your stationed guards)
  const mine=k=>k==='home'||String(k||'').startsWith('me:');
  G._xp2def=null;
  const _ap=apply25;apply25=function(defs,s,r){const before=(P.fr25||[])[0];const out=_ap.apply(this,arguments);
    try{const x=r&&r.r26;const top=(P.fr25||[])[0];if(x&&top&&top!==before&&!top.none){const myN=x.players.filter(p=>mine(p.key)).reduce((a,p)=>a+(+p.n||0),0);
      top.xp1=myN>0?give2(xpOf2((x.att&&x.att.n)||0,myN,!!x.win)):0;G._xp2def=top.xp1;save();}}catch(e){console.warn('xp2 defend',e);}return out;};
  window.apply25=apply25;
  // the defense replay (Watch battle) carries the same number for its end-of-fight summary
  try{const _sr=squadReplay;squadReplay=function(){G._xp2def=null;const f=_sr.apply(this,arguments);try{if(f&&G._xp2def!=null)f.xp2=G._xp2def;}catch(e){}G._xp2def=null;return f;};window.squadReplay=squadReplay;}catch(e){}
  // ---------- your troops helping on a teammate's hex (the note between phones carries the enemy power and your troops)
  const _gl=applyGl25;applyGl25=function(){const before=new Set(P.fr25||[]);const out=_gl.apply(this,arguments);
    try{for(const row of P.fr25||[]){if(before.has(row)||!row.ally||row.xp1!=null)continue;const n=(row.me&&row.me[0]&&row.me[0].n)||0;if(!n){row.xp1=0;continue;}
      const enemyN=Math.round((row.sp||0)/(TROOP.powerPer||1));row.xp1=give2(xpOf2(enemyN,n,!!row.win));}save();}catch(e){console.warn('xp2 ally',e);}return out;};
  window.applyGl25=applyGl25;
  // ---------- pipeline guards
  try{const _rc=reconcile26;reconcile26=function(){const before=new Set(P.fr25||[]);const out=_rc.apply(this,arguments);
    try{for(const row of P.fr25||[]){if(before.has(row)||!row.pipe||row.none||row.xp1!=null||!row.r26)continue;const x=row.r26,myN=(x.players||[]).filter(p=>mine(p.key)||p.uid===P.uid).reduce((a,p)=>a+(+p.n||0),0);
      row.xp1=myN>0?give2(xpOf2((x.att&&x.att.n)||0,myN,!!row.win)):0;}save();}catch(e){console.warn('xp2 pipe',e);}return out;};
    window.reconcile26=reconcile26;}catch(e){}
  // ---------- end-of-fight summary for hero fights (the troop replay in combat2 already prints f.xp2)
  //  reports1 wraps UI.replay later, so it records the report before this line is added: the report keeps its own XP row
  try{const _rp=UI.replay;UI.replay=function(o){try{if(o&&o.f&&typeof o.f.xp2==='number'&&!(o.f.army2&&o.f.army2.r))
      o={...o,result:(o.result||'')+`<div class="xp67">XP earned <b>+${o.f.xp2.toLocaleString()}</b></div>`};}catch(e){}return _rp.call(this,o);};}catch(e){}
  // ---------- what a level gives
  const _st=stats;stats=function(){const s=_st.apply(this,arguments);try{const k=1+XP2.heroPerLvl*Math.max(0,(P.lvl||1)-1);if(s&&typeof s==='object'){s.hp=Math.round(s.hp*k);s.atk=Math.round(s.atk*k);s.def=Math.round(s.def*k);}}catch(e){}return s;};
  window.stats=stats;
  const _mc=marchTroopCap;marchTroopCap=function(){return _mc.apply(this,arguments)+XP2.marchPerLvl*Math.max(0,(P.lvl||1)-1);};
  window.marchTroopCap=marchTroopCap;
})();
