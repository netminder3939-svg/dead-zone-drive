// bal14 (TEST, build 12h) Combat balance pass. Approved by Pope Nov 8.
//  1) Towers and outposts are real defenses: own HP pool + more fire, and each level adds 40% HP (like the Stronghold).
//     Empty Lv1 tower now stops ~400 horde troops (was 67), Lv5 ~900, Lv10 ~1,600. Stronghold stays the toughest building.
//  2) Horde clans grow with the players: a clan's troop cap and growth follow the team's average army
//     (troops x tier power), up to 10x. Never below the old 10,000 cap.
//  3) Classes: Engineers stay the tank (they still take the hits first) and are now the best defenders.
//     Casters and Strategists defend ~15% better.
//  (Troop tier counting in fights is in v26a.js: ATK and HP x tier power.)
(function(){
  // ---- 1) buildings
  const IN14={tower:1000,op:600},HPLVL14=.40;
  C26.bld.tower.fire=250;C26.bld.op.fire=150;
  const _in14=innate26;
  innate26=function(bld){try{if(bld&&IN14[bld.kind]){const L=Math.max(1,bld.lvl||1);return Math.round(IN14[bld.kind]*(1+HPLVL14*(L-1)));}}catch(e){}return _in14.apply(this,arguments);};
  window.innate26=innate26;

  // ---- 3) classes
  C26.types.engineer.atk=.8;C26.cls.engineer.hp=.25;
  C26.cls.caster.hp=.45;
  C26.cls.strategist.hp=.30;C26.cls.strategist.atk=.15;
  const relabel=(id,from,to)=>{try{const k=CLASSES.list[id];if(k&&Array.isArray(k.lines))k.lines=k.lines.map(l=>l===from?to:l);}catch(e){}};
  relabel('engineer','Troops: Engineer type = Tank (3 HP, 0.5 ATK), die first','Troops: Engineer type = Tank (3 HP +25%, 0.8 ATK). Best defenders, take the hits first');
  relabel('caster','Troops: Caster type (1 HP, 1 ATK)','Troops: Caster type (1 HP +45%, 1 ATK)');
  relabel('strategist','Troops: Strategist type (1.5 HP, 0.6 ATK)','Troops: Strategist type (1.5 HP +30%, 0.6 ATK +15%)');

  // ---- 2) horde grows with the team (average army)
  // Army strength in tier-1 troops: (home + stationed) x tier power. Published as m.p14 so every phone scales the same way.
  function myArmy14(){try{const t=TP();let n=t.home||0;for(const k in (t.stationed||{}))n+=(t.stationed[k]&&t.stationed[k].n)||0;return Math.round(n*(window.myTp26?myTp26():1));}catch(e){return 0;}}
  window.myArmy14=myArmy14;
  HOOK.member(function(m){try{m.p14=myArmy14();}catch(e){}return m;});
  // Team average, not the strongest: one big army must not make raids crush newer teammates.
  function strongest14(){const v={};try{if(P.uid)v[P.uid]=myArmy14();const ms=(G.al&&G.al.members)||{};for(const k in ms){if(isMe(k))continue;const n=+ms[k].p14||0;if(n>0)v[k]=n;}}catch(e){}
    const a=Object.values(v).filter(n=>n>0);return a.length?a.reduce((x,y)=>x+y,0)/a.length:0;}
  const BASE14={cap:HE.capBase,conv:HE.convPerH,res:HE.resPerH},MAXS14=10;
  function scale14(){return Math.min(MAXS14,Math.max(1,strongest14()/BASE14.cap));}
  window.hordeScale14=scale14;
  const _bank14=bankOf;
  bankOf=function(f){try{const s=scale14();HE.capBase=BASE14.cap*s;HE.convPerH=BASE14.conv*s;HE.resPerH=BASE14.res*s;}catch(e){}return _bank14.apply(this,arguments);};
  window.bankOf=bankOf;
  // Visible label for this combined build. The service worker cache is ddd-v26-12h-integrated, not Claude's ddd-v26-12h.
  try{document.documentElement.dataset.build='12h-integrated-3';const who=document.querySelector('#hud .who');if(who&&!document.getElementById('build14')){const el=document.createElement('span');el.id='build14';el.textContent='12h-integrated-3';el.title='Build 12h-integrated-3';el.style.cssText='display:inline-block;margin-left:6px;padding:1px 6px;border-radius:8px;background:#2a241c;color:#e7d7c1;font:600 10px system-ui;letter-spacing:.02em;vertical-align:middle';who.appendChild(el);}}catch(e){}
})();
