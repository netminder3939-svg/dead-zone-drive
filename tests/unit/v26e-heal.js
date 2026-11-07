// Simulate heal26c restore rules without browser
const HEAL26C={minLvl:4,minBadges:9,badgeNames:['Water Tower #4','Overgrown Park #10','Abandoned School #2','Overgrown Park #1','Toxic Shore #6','Looted Grocery #9','Water Tower #13','Dead Mall #5','Old Town Hall #8']};
function heal(P){
  if(!/pope/i.test(P.name)&&P.acct!=='pope')return P;
  if((P.lvl||1)<HEAL26C.minLvl){P.lvl=HEAL26C.minLvl;P.xp=Math.max(P.xp||0,40);P.sp=Math.max(P.sp||0,3);}
  P.badges=P.badges||{};
  for(const name of HEAL26C.badgeNames){const sid='heal26c:'+name;if(!Object.values(P.badges).some(b=>b&&b.name===name))P.badges[sid]={name,kind:'park',t:1};}
  // fake pipe unlocks on held hexes
  P.pipeUnlock26=P.pipeUnlock26||{};
  const sites=[{id:'s1',hex:'-165_405',res:'water',name:'WT'},{id:'s2',hex:'-999_999',res:'fuel',name:'Far'}];
  for(const s of sites){if(P.tiles[s.hex])P.pipeUnlock26[s.id]={t:1,res:s.res,name:s.name,hex:s.hex};}
  return P;
}
const P={name:'pope',acct:'pope',lvl:2,xp:21,sp:1,badges:{},pipeUnlock26:{},tiles:{'-165_405':{t:1},'-166_405':{t:1}}};
heal(P);
let fail=0;const ok=(c,m)=>{if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);};
ok(P.lvl===4,'lvl 4');
ok(Object.keys(P.badges).length===9,'9 badges');
ok(!!P.pipeUnlock26.s1,'pipe unlock on held hex');
ok(!P.pipeUnlock26.s2,'no unlock on far hex');
ok((P.lvl>=4&&Object.keys(P.badges).length>=9),'healDone');
process.exit(fail?1:0);
