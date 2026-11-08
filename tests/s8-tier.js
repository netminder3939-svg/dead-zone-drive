require('./h.js')(process.argv[2],async(p)=>{
 const out=await p.evaluate(()=>{const res={};for(const L of [1,9]){try{W().barracks=W().barracks||{};}catch(e){}
   try{if(P.world&&P.world.barracks)P.world.barracks.level=L;}catch(e){}
   const tier=typeof troopTier==='function'?troopTier():null;const pp=TROOP.powerPer;
   const r=fight26({bld:{kind:'tower',lvl:1},players:[{key:'a',uid:P.uid,n:2000,type:'raider',gear:{},name:'me'}]},{n:2400});
   res['L'+L]={tier,powerPer:pp,win:r.win,lost:r.players[0].lost};}
   return res;});
 console.log(JSON.stringify(out));
 await p.evaluate(()=>{try{UI.tab&&UI.tab('base')}catch(e){}});
 const txt=await p.evaluate(()=>{try{const f=Object.keys(UI).find(k=>/barracks/i.test(k));if(f)UI[f]();}catch(e){}const m=document.querySelector('#modalBody');return (m?m.innerText:'').slice(0,400)+' || keys:'+Object.keys(UI).filter(k=>/barr|troop/i.test(k)).join(',');});
 console.log(txt);
});
