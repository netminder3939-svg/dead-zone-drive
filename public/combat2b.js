// combat2b (R2) Late hooks for the army combat system (combat2.js): loaded after every older file.
(function(){
  try{installFight26v2();}catch(e){console.warn('combat2b install',e);}
  // troops that come home after an army fight = troops left, not counting the hero's health
  try{const _af=armyFrac;armyFrac=function(f){try{if(f&&f.army2){let h=0,m=0;(f.startA||[]).forEach((u,i)=>{if(u.troop>0){m+=Math.max(1,u.max);h+=Math.max(0,(f.A[i]||{}).hp||0);}});return m?h/m:0;}}catch(e){}return _af.apply(this,arguments);};window.armyFrac=armyFrac;}catch(e){}
  // Horde attacks on your land: the battle you watch is the army fight that decided it
  try{const _sr=squadReplay;squadReplay=function(defs,dp,sp,gname){G._r26=null;const f=_sr.apply(this,arguments);
      try{const r=G._r26;if(r&&r.b2){const f2=fFrom2(r.b2,'def',[],[]);f2.startB.forEach(u=>u.name=`${gname} squad`);f2.B.forEach(u=>u.name=`${gname} squad`);f2.army2.r.att.rows.forEach(x=>x.name=`${gname} squad`);return f2;}}catch(e){console.warn('combat2b defense view',e);}
      return f;};window.squadReplay=squadReplay;}catch(e){}
})();
