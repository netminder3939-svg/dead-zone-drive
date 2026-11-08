require('./h.js')(process.argv[2],async(p)=>{
 const out=await p.evaluate(()=>{const R={};const pl=(n,type='raider',tp=1,k='a')=>({key:k,uid:k,n,type,gear:{tp},name:k});
  const brk=(def)=>{let lo=1,hi=1e7;while(lo<hi){const m=Math.floor((lo+hi)/2);if(fight26(def,{n:m}).win)lo=m+1;else hi=m;}return lo;};
  R.towerEmpty=['op','tower'].map(k=>k+':'+brk({bld:{kind:k,lvl:1},players:[]}));R.towerLv=[1,5,10].map(l=>l+':'+brk({bld:{kind:'tower',lvl:l},players:[]}));
  R.sh1=brk({bld:{kind:'sh',lvl:1},players:[]});
  R.cls=['engineer','raider','scout','caster','strategist'].map(c=>c+':'+brk({bld:{kind:'tower',lvl:1},players:[pl(2000,c)]}));
  R.tier=[1,1.4,3.2].map(t=>t+':'+brk({bld:{kind:'tower',lvl:1},players:[pl(2000,'raider',t)]}));
  // real path: my barracks level -> who26 -> fight
  const lv=[];for(const L of [1,9]){P.world.barracks=P.world.barracks||{};P.world.barracks.level=L;const w=who26(P.uid);lv.push({L,tier:troopTier(),tp:w.gear.tp,brk:brk({bld:{kind:'tower',lvl:1},players:[{key:'me',uid:P.uid,n:2000,type:w.type,gear:w.gear,name:'me'}]})});}
  R.barracks=lv;
  // member doc carries tier + army
  let m={};try{m=HOOK._member?HOOK._member({}):null;}catch(e){}R.memberHookKeys=Object.keys(HOOK).join(',');
  // horde scale
  P.world.barracks.level=1;const t=TP();const h0=t.home;t.home=0;R.scale0=hordeScale14();t.home=30000;R.scale30k=hordeScale14();P.world.barracks.level=9;R.scale30kT5=hordeScale14();
  const f={tiles:{},tier:0,bank:{troops:10000,res:999999,t:Date.now()-10*3600e3,log:[]}};const b=bankOf(f);R.bankAfter10h=Math.round(b.troops);R.squad=squadTroops26(f);
  t.home=h0;P.world.barracks.level=1;
  R.lines=['engineer','caster','strategist'].map(k=>CLASSES.list[k].lines[0]);
  return R;});
 console.log(JSON.stringify(out,null,1));
});
