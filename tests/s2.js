require('./h.js')(process.argv[2],async(p)=>{
 const r=await p.evaluate(async()=>{const out=[];const L=x=>out.push(x);G.pos=G.pos||[47.7796,-116.8923];
  const h0=hexAt(47.7796,-116.8923);const [q,r0]=idQR(h0.id);const route=[0,1,2,3,4,5].map(i=>hexAt(...hexCenter(q+i,r0)).id);
  route.forEach(h=>P.tiles[h]={t:Date.now()});P.pipes=[{id:'p1',name:'Test Line',route,st:'on'}];
  const t=TP();t.home=5000;t.stationed={};t.returning=[];
  const _eh=exposedHex;let pick=route[2];exposedHex=function(){return pick;};
  const _md=marchDur;marchDur=()=>1000; // instant arrival
  guardLine('p1',1000);L('after 1st guard: guard hex '+route.indexOf(P.pipes[0].guard25.hex)+' stationed '+JSON.stringify(Object.fromEntries(Object.entries(stationed()).map(([h,s])=>[route.indexOf(h),s.n]))));
  await new Promise(r=>setTimeout(r,1500));
  pick=route[4]; // horde moved: most exposed hex changes
  guardLine('p1',1000);L('after 2nd guard: guard hex '+route.indexOf(P.pipes[0].guard25.hex)+' stationed '+JSON.stringify(Object.fromEntries(Object.entries(stationed()).map(([h,s])=>[route.indexOf(h),s.n]))));
  L('pipe card shows guards: '+lineGuards(P.pipes[0]));
  recallStation(P.pipes[0].guard25.hex);L('after Recall from pipe card: still out='+Object.values(stationed()).reduce((a,s)=>a+s.n,0)+' returning='+t.returning.reduce((a,x)=>a+x.n,0)+' home='+t.home);
  // removing a pipe with a guard
  t.returning=[];t.stationed={};t.home=5000;delete P.pipes[0].guard25;pick=route[3];guardLine('p1',2000);await new Promise(r=>setTimeout(r,1500));
  // mark the guard hex not ours (route crossing open land)
  delete P.tiles[route[3]];
  removePipe('p1');L('after Remove pipeline: stationed='+Object.values(stationed()).reduce((a,s)=>a+s.n,0)+' returning='+t.returning.reduce((a,x)=>a+x.n,0)+' home='+t.home);
  if(window.FIX13){const rn=Date.now;let off=0;Date.now=()=>rn()+off;
    t.returning=[];t.stationed={};stationed()[route[3]]={n:777,at:rn()-1,from:route[0],st:rn()-1};
    off=200e3;FIX13.sweepStations();off=520e3;FIX13.sweepStations();
    L('sweeper on orphan 777: stationed='+Object.values(stationed()).reduce((a,s)=>a+s.n,0)+' returning='+t.returning.reduce((a,x)=>a+x.n,0));
    t.away={ghost:300};G.marches=G.marches||{};off=200e3;FIX13.sweepAway();off=900e3;const h1=t.home;FIX13.sweepAway();L('stuck march troops: home +'+(t.home-h1)+' away='+JSON.stringify(t.away));Date.now=rn;}
  exposedHex=_eh;marchDur=_md;return out;});
 console.log(r.join('\n'));});
