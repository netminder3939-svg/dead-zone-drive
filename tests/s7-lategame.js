require('./h.js')(process.argv[2],async(p)=>{
 const o=await p.evaluate(()=>{const pl=(n,type,tp,k)=>({key:k,uid:k,n,type,gear:{tp},name:k});
  const brk=(def)=>{let lo=1,hi=1e7;while(lo<hi){const m=Math.floor((lo+hi)/2);if(fight26(def,{n:m}).win)lo=m+1;else hi=m;}return lo;};
  return {
   'SH Lv5 + 15k T3 at home':brk({bld:{kind:'sh',lvl:5},players:[pl(15000,'raider',1.9,'a')]}),
   'Tower Lv5 + 2k T3':brk({bld:{kind:'tower',lvl:5},players:[pl(2000,'raider',1.9,'a')]}),
   'Tower Lv5 + 3 teammates 2k T3 mixed':brk({bld:{kind:'tower',lvl:5},players:[pl(2000,'engineer',1.9,'a'),pl(2000,'raider',1.9,'b'),pl(2000,'scout',1.9,'c')]}),
   'Pipeline + 1k T3 guard':brk({bld:{kind:'pipe',lvl:1},players:[pl(1000,'engineer',1.9,'a')]}),
   'New teammate: Tower Lv1 + 1k T1':brk({bld:{kind:'tower',lvl:1},players:[pl(1000,'raider',1,'a')]})};});
 console.log(JSON.stringify(o,null,1));});
