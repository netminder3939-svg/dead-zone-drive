// Reconstruct unlocked list the way v26-8 UI does
function listUnlocked(U, sitesNear, mine){
  return [...new Set([...Object.keys(U),...sitesNear.filter(s=>U[s.id]).map(s=>s.id)])]
    .map(id=>{let s=sitesNear.find(x=>x.id===id);if(!s){const u=U[id];if(u&&u.hex!=null)s={id,name:u.name,res:u.res,hex:u.hex,lat:u.lat,lng:u.lng,kind:u.kind};}return s;})
    .filter(s=>s&&!mine.some(p=>p.site===s.id));
}
const U={'w1':{name:'76',res:'fuel',hex:'-169_409',lat:1,lng:2,kind:'fuel'},'g1':{name:'Grocery',res:'food',hex:'-168_409',lat:3,lng:4,kind:'grocery'}};
const near=[{id:'w1',name:'76',res:'fuel',hex:'-169_409',lat:1,lng:2,kind:'fuel'}]; // grocery missing from landmarks
const list=listUnlocked(U,near,[]);
let fail=0;const ok=(c,m)=>{if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);};
ok(list.length===2,'shows both unlocks including missing-from-sitesNear grocery');
ok(list.some(s=>s.id==='g1'),'grocery reconstructed from pipeUnlock26');
ok(list.some(s=>s.id==='w1'),'fuel from sitesNear');
const healDone=(lvl,badges,pipes)=>lvl>=4&&badges>=9&&pipes>=1;
ok(!healDone(4,9,0),'not done without pipes');
ok(healDone(4,9,6),'done with pipes');
process.exit(fail?1:0);
