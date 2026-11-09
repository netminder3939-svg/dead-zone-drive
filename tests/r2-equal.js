// R2: fight26 rebuilt on the army engine gives exactly the same result as the 12h fight26 on 10,000 random fights.
require('./h.js')(process.argv[2],async(p)=>{
 const r=await p.evaluate(()=>{let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
   const types=Object.keys(C26.types),kinds=['tower','op','sh','pipe',null];let same=0,diff=[],wins=0;
   for(let i=0;i<10000;i++){const np=1+Math.floor(rnd()*4);const players=[];
     for(let j=0;j<np;j++)players.push({key:'k'+j,uid:'u'+j,name:'P'+j,type:types[Math.floor(rnd()*types.length)],n:Math.floor(rnd()*rnd()*6000),gear:{atk:Math.floor(rnd()*120),def:Math.floor(rnd()*120),hp:Math.floor(rnd()*300),tp:[1,1.4,1.9,2.5,3.2][Math.floor(rnd()*5)]}});
     const k=kinds[Math.floor(rnd()*kinds.length)];const bld=k?{kind:k,lvl:1+Math.floor(rnd()*10),pct:rnd()<.3?rnd():1}:null;
     const att={n:Math.floor(rnd()*rnd()*20000),type:'raider',name:'Rust Dogs'};
     const a=fight26_old({bld,players:players.map(x=>({...x,gear:{...x.gear}}))},{...att}),b=fight26v2({bld,players:players.map(x=>({...x,gear:{...x.gear}}))},{...att});delete b.b2;
     const ja=JSON.stringify(a),jb=JSON.stringify(b);if(ja===jb)same++;else if(diff.length<3)diff.push({a:ja.slice(0,300),b:jb.slice(0,300)});if(a.win)wins++;}
   return{same,diff,wins,installed:fight26===fight26v2};});
 console.log((r.same===10000&&r.installed?'PASS':'FAIL')+' fight26 on the army engine equals the 12h formula on 10,000 random fights',JSON.stringify({same:r.same,defenderWins:r.wins,installed:r.installed,diff:r.diff}));
});
