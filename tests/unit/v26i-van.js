// Moving escort count + full-route claim intermediates. No browser, no Firebase.
const V=require('../../js/van26.js');
const S=require('../../js/sync26.js');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}

// The truck ping-pongs. Mid-route is not the destination and not stuck at the start.
ok(Math.abs(V.truckU(0,2)-0)<1e-9,'truck starts at the stronghold end');
const mid=V.truckU(1*3600e3,2); // halfway through a 2h leg
ok(mid>0.4&&mid<0.6,'truck is mid-route after half a leg ('+mid.toFixed(2)+')');
const back=V.truckU(3*3600e3,2); // 1h into the return of a 2h trip
ok(back>0.4&&back<0.6,'truck is mid-route on the way back ('+back.toFixed(2)+')');
const seg=V.alongIndex(8,0.5); // 9 hexes, 8 steps, halfway
ok(seg.i===4&&Math.abs(seg.t)<1e-9,'halfway is on an intermediate hex, not the destination');
const early=V.alongIndex(8,0.1);
ok(early.i===0&&early.t>0,'just after leaving, the truck is still on the first step');
const late=V.alongIndex(8,0.99);
ok(late.i>=6&&late.i<8,'near the site the truck is on a late step, not only the last hex');

// Own escort: stationed count, including troops still walking to the van. guardN is the same group, not added again.
const own=V.vanCount({id:'conoco',own:true,guard25:{hex:'h',esc:true},guardN:500},{
  selfUid:'phone',stationed:{h:{n:500,at:Date.now()+60000}},
  members:[{uid:'phone',me:true,pipes:[{id:'conoco',guardN:500}]}]
});
ok(own.n===500,'in-transit escort shows 500, not 0 and not 1000');

const afterFight=V.vanCount({id:'conoco',own:true,guard25:{hex:'h',esc:true}},{
  selfUid:'phone',stationed:{h:{n:120,at:0}},members:[]
});
ok(afterFight.n===120,'deaths shrink the badge to the survivors');

const recalled=V.vanCount({id:'conoco',own:true,guard25:{hex:'h',esc:true},guardN:500},{
  selfUid:'phone',stationed:{},
  members:[{uid:'phone',me:true,pipes:[{id:'conoco',guardN:500,guardUid:'phone'}]}]
});
ok(recalled.n===0,'recall clears the badge; a stale guardN does not bring the troops back');

// Ally pipes: synced guardN, no double count with the same player's gar row.
const ally=V.vanCount({id:'conoco',own:false},{
  selfUid:'desk',stationed:{},
  members:[
    {uid:'phone',pipes:[{id:'conoco',guardN:892,guardUid:'phone'}],gar:[{pipe:'conoco',hex:'h',n:892}]},
    {uid:'wife',pipes:[{id:'conoco',guardN:40,guardUid:'wife'}]}
  ]
});
ok(ally.n===932&&ally.parts.length===2,'crew sees both escorts once (892+40)');

const reinforce=V.vanCount({id:'conoco',own:true,guard25:{hex:'h'}},{
  selfUid:'phone',stationed:{h:{n:500,at:0}},
  members:[{uid:'wife',pipes:[{id:'conoco',guardN:200,guardUid:'wife'}]}]
});
ok(reinforce.n===700,'a teammate reinforcing the line is added on top of yours');

const hide=V.escortHexes([{id:'conoco',guard25:{hex:'h'}}]);
ok(hide.h==='conoco','the guard hex is flagged so no stationary hex badge is drawn there');

// Claim march: intermediates, not destination-only. Defenders stop before later hexes.
const open=S.planClaimRoute('0_0','9_0',{owned:()=>false,ally:()=>false,fort:()=>false,defender:()=>null,room:Infinity});
ok(open.claim.length===9&&open.claim.includes('3_0')&&open.claim.includes('6_0')&&open.claim[8]==='9_0','all nine crossed hexes are claimed');
const stopped=S.planClaimRoute('0_0','9_0',{
  owned:id=>id==='1_0',ally:()=>false,fort:()=>false,
  defender:id=>id==='5_0'?{win:false,name:'wall'}:null,room:Infinity
});
ok(stopped.claim.join(',')==='2_0,3_0,4_0','hexes before the loss are taken and the destination is not');
ok(stopped.stop&&stopped.stop.id==='5_0','first defeat stops the march');

console.log(fail?fail+' failed':'all passed');
process.exit(fail?1:0);
