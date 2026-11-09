// xp2 (R2) XP for every fight, and what a level gives. Approved table (design doc, Nov 9):
//  XP for a win = (base + 1 per 5 power of enemy troops beaten, i.e. 1 per 250 T1 troops) x multiplier. A loss gives 25% of that.
//  Capture a hex (march vs raider holdout) base 25 x1 · Horde / fort fight you start base 40 x1 · defend a hex base 40 x1.5 ·
//  defend a pipeline base 40 x1.5. Small monsters keep their own XP (15 + 5 x level). Shared defenses split the beaten
//  troops by each player's share of the defenders; the hex owner gets +20 when their land holds.
//  Each level: +3% hero HP/ATK/DEF and +100 march size.
(function(){
  const XP2={perTroops:5,loss:.25,owner:20,base:{capture:25,attack:40,defend:40,pipe:40},mult:{capture:1,attack:1,defend:1.5,pipe:1.5},heroPerLvl:.03,marchPerLvl:100};
  window.XP2=XP2;
  // beaten troops are counted as power (troops x power-per-troop): Horde squads field tens of thousands of troops, so 1 XP per 5
  // troops would give a whole level per fight. 1 XP per 5 power = 1 XP per 250 T1 troops.
  function xpOf2(kind,beaten,win){const b=XP2.base[kind]||40,m=XP2.mult[kind]||1,pw=Math.max(0,beaten)*((typeof _tr2_basePower!=='undefined'?_tr2_basePower:0.02)||0.02),full=(b+pw/XP2.perTroops)*m;return Math.max(1,Math.round(win?full:full*XP2.loss));}
  window.xpOf2=xpOf2;
  function give2(n,why){if(!(n>0))return 0;try{addXP(n);}catch(e){return 0;}try{save();}catch(e){}return n;}
  // ---------- marches: fights during one march resolution
  G._xp2=null;
  const _af=window.army2Fight;
  function beatenOf(f){const r=f.army2&&f.army2.r;if(!r)return 0;const them=f.army2.us==='att'?r.def:r.att;
    return them.rows.reduce((a,o)=>a+(o.custom?(o.lost?Math.round(o.hp/(C26.types.raider.hp||2)):0):o.lost),0);}
  const _rf=runFight;runFight=function(A0,B0){const f=_rf.apply(this,arguments);
    try{if(G._xp2&&f&&f.army2&&f.army2.us==='att'){const names=(B0||[]).map(u=>u.name||'').join(' ');const mob=!(B0||[]).some(u=>u.fort)&&!/\(power \d+\)/.test(names);
      if(!mob){const kind=/Raider holdout/i.test(names)?'capture':'attack',xp=xpOf2(kind,beatenOf(f),f.win);f.xp2=xp;G._xp2.push(xp);}}}catch(e){}return f;};
  window.runFight=runFight;
  const _rm=resolveMarch;resolveMarch=async function(id,m){const was=!!(P.marchDone||{})[id];G._xp2=[];let got=[];
    try{const r=await _rm.apply(this,arguments);got=G._xp2||[];return r;}
    finally{G._xp2=null;try{if(!was&&(P.marchDone||{})[id]&&got.length){const n=got.reduce((a,x)=>a+x,0);give2(n,'march');
      const row=(P.rp1||[]).find(x=>x.kind==='march'&&Date.now()-x.t<120e3&&!x.xp);if(row){row.xp=n;save();}}}catch(e){}}};
  window.resolveMarch=resolveMarch;
  // ---------- defense of your hexes (your share of the defenders)
  const mine=k=>k==='home'||String(k||'').startsWith('me:');
  const _ap=apply25;apply25=function(defs,s,r){const before=(P.fr25||[])[0];const out=_ap.apply(this,arguments);
    try{const x=r&&r.r26;const top=(P.fr25||[])[0];if(x&&top&&top!==before){const tot=x.players.reduce((a,p)=>a+p.n,0)||1,myN=x.players.filter(p=>mine(p.key)).reduce((a,p)=>a+p.n,0);
      let xp=0;if(myN>0)xp=xpOf2('defend',(x.att.lost||0)*myN/tot,x.win);
      const own=x.win&&P.tiles&&P.tiles[top.hex]?XP2.owner:0;xp+=own;top.xp1=give2(xp,'defend');save();}}catch(e){console.warn('xp2 defend',e);}return out;};
  window.apply25=apply25;
  // ---------- your troops helping on a teammate's hex (the note between phones carries result, power and your share)
  const _gl=applyGl25;applyGl25=function(){const before=new Set(P.fr25||[]);const out=_gl.apply(this,arguments);
    try{for(const row of P.fr25||[]){if(before.has(row)||!row.ally||row.xp1!=null)continue;const n=(row.me&&row.me[0]&&row.me[0].n)||0;if(!n)continue;
      const enemyN=Math.round((row.sp||0)/TROOP.powerPer);row.xp1=give2(xpOf2('defend',row.win?Math.min(enemyN,n):0,row.win),'ally');}save();}catch(e){console.warn('xp2 ally',e);}return out;};
  window.applyGl25=applyGl25;
  // ---------- pipeline guards
  try{const _rc=reconcile26;reconcile26=function(){const before=new Set(P.fr25||[]);const out=_rc.apply(this,arguments);
    try{for(const row of P.fr25||[]){if(before.has(row)||!row.pipe||row.xp1!=null||!row.r26)continue;row.xp1=give2(xpOf2('pipe',row.r26.att.lost||0,row.win),'pipe');}save();}catch(e){console.warn('xp2 pipe',e);}return out;};
    window.reconcile26=reconcile26;}catch(e){}
  // ---------- what a level gives
  const _st=stats;stats=function(){const s=_st.apply(this,arguments);try{const k=1+XP2.heroPerLvl*Math.max(0,(P.lvl||1)-1);if(s&&typeof s==='object'){s.hp=Math.round(s.hp*k);s.atk=Math.round(s.atk*k);s.def=Math.round(s.def*k);}}catch(e){}return s;};
  window.stats=stats;
  const _mc=marchTroopCap;marchTroopCap=function(){return _mc.apply(this,arguments)+XP2.marchPerLvl*Math.max(0,(P.lvl||1)-1);};
  window.marchTroopCap=marchTroopCap;
})();
