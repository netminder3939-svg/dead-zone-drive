// tiers3 (R3) Every troop has a tier. Your army is counted per tier (for example 3,000 T1 + 800 T2) in every place troops
//  live: home, wounded, each outpost/guard post, each march, the portal, returning troops, training and healing.
//  How: the older code keeps its plain troop counts (they stay the truth for how many troops you have). This file keeps a
//  tier breakdown next to each count and follows the troops when a count moves: what leaves one place is held for a
//  moment and handed to the place that grows, so a march carries the exact troops that left home, and troops that died
//  are simply gone. Marches, guards and the portal send your strongest tiers first. New troops come from training at the
//  tier you picked. Totals are never changed here, only the breakdown, so a mistake can never lose troops.
//  Fights use each place's own average tier power. Horde troop counts no longer shrink when your tier goes up.
(function(){
  const T3={expireMs:15*60e3,bagMax:40};
  window.T3=T3;
  const maxTier3=()=>{try{return Math.min(5,Math.max(1,troopTier()));}catch(e){return 1;}};
  window.maxTier3=maxTier3;
  const tpOf=t=>(TR2.tierPower[(+t||1)-1]||1);
  const sum=c=>{let s=0;for(const k in c||{})s+=c[k]||0;return s;};
  const clean=c=>{for(const k of Object.keys(c))if(!(c[k]>0))delete c[k];return c;};
  const addC=(a,b)=>{for(const k in b||{})a[k]=(a[k]||0)+b[k];return clean(a);};
  // take n out of comp c (changes c, returns what was taken)
  function takeStrong(c,n){const out={};for(const t of Object.keys(c).map(Number).sort((x,y)=>y-x)){if(n<=0)break;const k=Math.min(c[t],n);if(k>0){out[t]=k;c[t]-=k;n-=k;}}clean(c);return out;}
  function takeProp(c,n){const s=sum(c);if(s<=0||n<=0)return{};if(n>=s){const all={...c};for(const k in c)delete c[k];return all;}
    const ks=Object.keys(c),raw=ks.map(k=>c[k]*n/s),fl=raw.map(Math.floor);let left=n-fl.reduce((a,b)=>a+b,0);
    const ord=raw.map((v,i)=>[v-fl[i],i]).sort((a,b)=>b[0]-a[0]);for(const [,i] of ord){if(left<=0)break;if(fl[i]<c[ks[i]]){fl[i]++;left--;}}
    const out={};ks.forEach((k,i)=>{if(fl[i]>0){out[k]=fl[i];c[k]-=fl[i];}});clean(c);return out;}
  window.takeStrong3=takeStrong;window.takeProp3=takeProp;
  function C(){const t=TP();t.c3=t.c3||{};const c=t.c3;c.a=c.a||{};c.s=c.s||{};c.p=c.p||{};c.bag=c.bag||[];return c;}
  // every place troops can be, with how many there are now
  function places(){const t=TP(),c=C(),out=[];
    out.push({key:'home',tot:t.home||0,get:()=>c.home,set:v=>{c.home=v;},src:true});
    out.push({key:'w',tot:(typeof T2==='function'?T2().wounded:t.wounded)||0,get:()=>c.w,set:v=>{c.w=v;}});
    for(const id of Object.keys(t.away||{}))out.push({key:'a:'+id,tot:t.away[id]||0,get:()=>c.a[id],set:v=>{c.a[id]=v;}});
    for(const h of Object.keys(t.stationed||{})){const o=t.stationed[h];out.push({key:'s:'+h,tot:(o&&o.n)||0,get:()=>c.s[h],set:v=>{c.s[h]=v;},src:true});}
    for(const p of (t.portal15||[]))if(p&&p.id)out.push({key:'p:'+p.id,tot:p.n||0,get:()=>c.p[p.id],set:v=>{c.p[p.id]=v;}});
    (t.returning||[]).forEach(o=>{if(o)out.push({key:o,tot:o.n||0,get:()=>o.c3,set:v=>{o.c3=v;}});});
    (t.healing||[]).forEach(o=>{if(o)out.push({key:o,tot:o.n||0,get:()=>o.c3,set:v=>{o.c3=v;}});});
    (t.queue||[]).forEach(o=>{if(o)out.push({key:o,tot:o.n||0,get:()=>o.c3,set:v=>{o.c3=v;},train:true,q:o});});
    return out;}
  let seen=new Map(),lastT=null;
  G._t3send=0;
  function drop(key){const c=C();if(typeof key==='string'){if(key.startsWith('a:'))delete c.a[key.slice(2)];else if(key.startsWith('s:'))delete c.s[key.slice(2)];else if(key.startsWith('p:'))delete c.p[key.slice(2)];}}
  function reconcile3(){try{if(!P||!P.troops)return;const t=TP(),c=C(),now=Date.now();
      if(lastT!==t){seen=new Map();lastT=t;} // a save adopted from another device: start following from here
      const L=places(),here=new Set(L.map(x=>x.key));
      // 1) places that are gone: their troops are in transit (or died)
      for(const [k,v] of seen){if(!here.has(k)){if(v&&sum(v)>0)c.bag.push({c:{...v},t:now});drop(k);seen.delete(k);}}
      // 2) places that shrank
      for(const x of L){const cur=x.get();if(!cur)continue;const s=sum(cur);if(s>x.tot){const out=(G._t3send>0&&x.src)?takeStrong(cur,s-x.tot):takeProp(cur,s-x.tot);if(sum(out)>0)c.bag.push({c:out,t:now});x.set(clean(cur));}}
      // 3) new training: new troops at the tier picked when training started
      for(const x of L){if(!x.train||x.get())continue;const tr=+x.q.tier3||maxTier3();x.set({[tr]:x.tot});}
      // 4) places that grew take the newest troops in transit; anything unexplained is new at your top tier
      for(const x of L){const cur=x.get()||{};let need=x.tot-sum(cur);if(need<=0){if(!x.get())x.set(cur);continue;}
        for(let i=c.bag.length-1;i>=0&&need>0;i--){const b=c.bag[i];const bs=sum(b.c);if(bs<=0)continue;const got=bs<=need?(()=>{const a={...b.c};b.c={};return a;})():takeProp(b.c,need);addC(cur,got);need-=sum(got);}
        if(need>0)addC(cur,{[maxTier3()]:need});x.set(clean(cur));}
      c.bag=c.bag.filter(b=>sum(b.c)>0&&now-b.t<T3.expireMs).slice(-T3.bagMax);
      seen=new Map(L.map(x=>[x.key,{...(x.get()||{})}]));}
    catch(e){console.warn('tiers3',e);}}
  window.reconcile3=reconcile3;
  // runs on a short timer, after every send and before any fight reads a place's tiers (save() is a constant in game.js,
  // so it can't be wrapped; what moved between two passes is matched up on the next one)
  setInterval(reconcile3,2000);setTimeout(reconcile3,1500);
  try{const _tt0=troopTick;troopTick=function(){reconcile3();const r=_tt0.apply(this,arguments);reconcile3();return r;};window.troopTick=troopTick;}catch(e){}
  // ---------- strongest first when troops are sent somewhere
  const sending=fn=>function(){G._t3send++;let r;try{r=fn.apply(this,arguments);}catch(e){G._t3send--;throw e;}
    if(r&&typeof r.then==='function')return r.finally(()=>{reconcile3();G._t3send--;});reconcile3();G._t3send--;return r;};
  try{sendMarch=sending(sendMarch);window.sendMarch=sendMarch;}catch(e){}
  try{stationTroops=sending(stationTroops);window.stationTroops=stationTroops;}catch(e){}
  try{if(window.portal15)window.portal15=sending(window.portal15);}catch(e){}
  try{if(typeof guardLine==='function'){guardLine=sending(guardLine);window.guardLine=guardLine;}}catch(e){}
  // ---------- tier power of a place (fights use it)
  function avg3(c){const s=sum(c);if(s<=0)return tpOf(maxTier3());let w=0;for(const k in c)w+=c[k]*tpOf(k);return w/s;}
  function compOf3(key){reconcile3();const c=C();let v={};if(key==='home')v=c.home;else if(key==='w')v=c.w;
    else if(key.startsWith('a:'))v=c.a[key.slice(2)];else if(key.startsWith('s:'))v=c.s[key.slice(2)];else if(key.startsWith('p:'))v=c.p[key.slice(2)];return{...(v||{})};} // a copy: callers can't change the record
  function allComp3(){reconcile3();const t=TP(),c=C(),all={};addC(all,c.home);addC(all,c.w);for(const k in c.a)addC(all,c.a[k]);for(const k in c.s)addC(all,c.s[k]);for(const k in c.p)addC(all,c.p[k]);
    (t.returning||[]).forEach(o=>addC(all,o.c3));(t.healing||[]).forEach(o=>addC(all,o.c3));return all;}
  window.compOf3=compOf3;window.allComp3=allComp3;window.avg3=avg3;
  window.tp3Of=key=>avg3(compOf3(key));
  // your troops' average tier power across the whole army (what allies see; old code that has no place uses it)
  myTp26=function(){try{const a=allComp3();return sum(a)>0?avg3(a):tpOf(maxTier3());}catch(e){return 1;}};window.myTp26=myTp26;
  window.tp3Gear=function(gear,key){try{if(key==='home')return{...gear,tp:tp3Of('home')};if(String(key).startsWith('me:'))return{...gear,tp:tp3Of('s:'+String(key).slice(3))};}catch(e){}return gear;};
  // troop power: base power x average tier (was x the Barracks tier for every troop)
  try{Object.defineProperty(TROOP,'powerPer',{configurable:true,get(){return _tr2_basePower*myTp26();}});}catch(e){console.warn('tiers3 powerPer',e);}
  window.basePower3=()=>_tr2_basePower;
  // troops sent on a march: the exact tiers (march) or the ones that would go (preview, strongest first)
  const _tu=troopUnit;troopUnit=function(n){const u=_tu.apply(this,arguments);try{let comp=null;
      if(G._marchId&&C().a[G._marchId])comp={...C().a[G._marchId]};
      else{const from=typeof marchFrom==='function'?marchFrom():null,sh=typeof shHex15==='function'?shHex15():null;const src=(!from||from===sh)?compOf3('home'):compOf3('s:'+from);comp=takeStrong({...src},n);if(sum(comp)<n)addC(comp,{[maxTier3()]:n-sum(comp)});}
      u.c3=comp;const ts=Object.keys(comp).map(Number).sort((a,b)=>b-a);u.name=`🪖 ${n.toLocaleString()} troops (${ts.map(t=>`${(comp[t]||0).toLocaleString()} T${t}`).join(' + ')})`;}catch(e){}return u;};
  window.troopUnit=troopUnit;
  window.mixText3=c=>Object.keys(c||{}).map(Number).sort((a,b)=>b-a).map(t=>`${Math.round(c[t]).toLocaleString()} T${t}`).join(' + ')||'none';
  // army size for Horde scaling (bal14) is troops x myTp26(), which is now the real average, so it equals troops x their own tier
  // ---------- training at a chosen tier
  G._t3train=null;
  const trainTier3=()=>Math.min(maxTier3(),Math.max(1,+G._t3train||maxTier3()));window.trainTier3=trainTier3;
  trainCost=function(n,tier){const m=Math.pow(TR2.tierCostMult,(tier||trainTier3())-1),o={};for(const [k,v] of Object.entries(TR2.costPer100))o[k]=Math.ceil(n/100*v*m);return o;};window.trainCost=trainCost;
  const _tt=trainTroops;trainTroops=function(n){const t=TP(),q0=t.queue.length,tier=trainTier3();const r=_tt.apply(this,arguments);
    try{if(t.queue.length>q0){const q=t.queue[t.queue.length-1];q.tier3=tier;q.c3={[tier]:q.n};save();}}catch(e){}return r;};window.trainTroops=trainTroops;
  // ---------- upgrade troops one tier (pay the difference in training cost, takes training time)
  function upCost3(n,from){const a=trainCost(n,from+1),b=trainCost(n,from),o={};for(const k in a)o[k]=Math.max(0,(a[k]||0)-(b[k]||0));return o;}
  window.upCost3=upCost3;
  window.upgradeTroops3=function(from,n){from=+from;n=Math.floor(+n);const to=from+1;if(to>maxTier3())return toast(`🔒 T${to} needs Barracks Lv${2*to-1}`);
    const home=compOf3('home');n=Math.min(n,home[from]||0);if(n<=0)return toast(`No T${from} troops at home`);
    const cost=upCost3(n,from);if(!canPay(cost))return toast('Not enough supplies to upgrade');pay(cost);
    const t=TP(),c=C();t.home-=n;c.home[from]-=n;clean(c.home);seen.set('home',{...c.home});
    const start=Math.max(Date.now(),...t.queue.map(q=>q.end));const q={n,end:start+trainMs(n),tier3:to,up3:from,c3:{[to]:n}};t.queue.push(q);seen.set(q,{...q.c3});
    save();toast(`⬆️ Upgrading ${n.toLocaleString()} T${from} → T${to}`);try{UI.render();}catch(e){}};
})();
