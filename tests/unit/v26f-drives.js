const P={name:'pope',acct:'pope',dr26:[],stats:{meters:23600},tiles:{a:1,b:1,c:1},heal26cDrives:0};
P.dr26=P.dr26.filter(r=>r&&parseFloat(r.km)>=0);
const km=P.stats.meters/1000, hexes=Object.keys(P.tiles).length;
if(!P.dr26.length&&km>=0.5){P.dr26=[{t:1,t0:1,km:km.toFixed(1),newHex:hexes,restored:1}];}
P.heal26cDrives=1;
let fail=0;const ok=(c,m)=>{if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);};
ok(P.dr26.length===1,'seeded one restored drive');
ok(P.dr26[0].restored===1,'marked restored');
ok(P.dr26[0].km==='23.6','km from meters');
process.exit(fail?1:0);
