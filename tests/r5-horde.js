// R5 Horde: income only from land, a capped army that grows with land and its Stronghold, troops leave when they can't
// be fed, migration of a huge old clan, no attacks on players until the army is ready, wiped clans gone for 7 days and
// then a small new clan, squads counted the same at every tier, the map shows only real moves, and the leader dashboard.
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const shot=n=>p.screenshot({path:'/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/'+n+'.png'});
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();const sh=hexAt(47.7796,-116.8923).id;W().sh={hex:sh,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;
   const [q,rr]=idQR(sh);for(const x of hexRing(q,rr,2))P.tiles[x.id]={t:Date.now()-864e5};P.born26=Date.now()-10*864e5;save();factionCatchUp(true);factionCatchUp(true);FX().last-=3;factionCatchUp(true);G._sh=sh;});
 await p.waitForTimeout(800);
 // 1) a clan with no land gains nothing over 48 h (and loses troops it can't feed)
 const a=await ev(()=>{const f={tiles:{},outposts:{},bank:{troops:800,res:0,t:Date.now()-48*3600e3,log:[],lvl5:2,m5:1}};const b=bankOf(f);return{troops:Math.round(b.troops),res:Math.round(b.res)};});
 ok(a.troops<800&&a.res===0,'no land: no income, no new troops over 48 h, hungry troops leave',a);
 // 2) a clan with 30 hexes grows at the expected rate, up to its cap
 const g=await ev(()=>{const tiles={};const [q,r]=idQR(G._sh);let n=0;for(let ring=20;n<30;ring++)for(const x of hexRing(q,r,ring)){if(n>=30)break;if(hexDist(x.id,G._sh)===ring){tiles[x.id]=1;n++;}}
   const f={tiles,outposts:{},bank:{troops:500,res:0,t:Date.now()-24*3600e3,log:[],lvl5:1,m5:1}};const inc=incomeH5(f),e=eff5();const b=bankOf(f);return{inc:Math.round(inc),eff:e,troops:Math.round(b.troops),cap:cap5(f),lvl:b.lvl5,res:Math.round(b.res)};});
 ok(g.inc>=90*g.eff-1&&g.troops>500&&g.troops<=g.cap+1,'30 hexes: income from land, army grows up to its cap',g);
 // 3) a huge old clan is cut to what its land and Stronghold support
 const m=await ev(()=>{const f={tiles:{'9_9':1},outposts:{},tier:0,bank:{troops:20000,res:5000,t:Date.now(),log:[]}};const b=bankOf(f);return{troops:b.troops,cap:cap5(f),log:(f.log5||[]).map(x=>x.txt)};});
 ok(m.troops===m.cap&&m.cap===1000&&/left/.test(m.log[0]||''),'old clan with 20,000 troops is cut to its cap (Lv1: 1,000)',m);
 // 4) no attacks on players until the army is at 40% of its cap
 const at=await ev(()=>{const fx=FX();const fid=Object.keys(fx.f).find(i=>!fx.f[i].routedUntil);const f=fx.f[fid];f.bank.troops=100;f.bank.t=Date.now();const out=[];
   for(const s of f.squads||[]){s.path=[];s.restUntil=0;planSortie(f,fid,s,seedRand('t5'),Date.now());out.push((s.path||[]).some(h=>allied(h)));}f.bank.troops=cap5(f);let any=false;
   for(const s of f.squads||[]){s.path=[];planSortie(f,fid,s,seedRand('t5b'),Date.now());if((s.path||[]).some(h=>allied(h)))any=true;}return{weakAttacks:out.some(Boolean),goal:f.goal5,strongCanAttack:any};});
 ok(!at.weakAttacks,'a weak clan does not head for players\' land',at);
 // 5) wiped clan: gone, then a small new clan "II" after 7 days
 const w=await ev(()=>{const fx=FX();const fid=Object.keys(fx.f).find(i=>!i.includes('~')&&!fx.f[i].routedUntil);const f=fx.f[fid];const name0=fdef(fid).name;f.tiles={};const k=Math.ceil(Date.now()/(HB().stepMin*60e3));const ev={grew:{},took:[],held:[],fights:[],outposts:[],back:[],destroyed:[]};
   hordeStep(k,ev);const gone=fx.f[fid];const r1={routed:!!gone.routedUntil,days:Math.round((gone.routedUntil-k*HB().stepMin*60e3)/864e5),troops:gone.bank.troops,squads:gone.squads.length};
   const k2=k+Math.ceil(7.1*864e5/(HB().stepMin*60e3));hordeStep(k2,ev);const nf=fx.f[fid];return{name0,...r1,back:!nf.routedUntil,name1:fdef(fid).name,troops1:nf.bank.troops,lvl:nf.bank.lvl5};});
 ok(w.routed&&w.days===7&&w.troops===0&&w.squads===0,'a clan with no land is wiped out for 7 days',w);
 ok(w.back&&w.name1===w.name0+' II'&&w.troops1===500&&w.lvl===1,'7 days later a small new clan "II" arrives (Lv1, 500 troops)',w);
 // 6) squads count the same troops at any tier of yours
 const t=await ev(()=>{const fx=FX();const f=Object.values(fx.f).find(x=>!x.routedUntil);f.bank.troops=3000;f.bank.t=Date.now();barracks().level=1;const a=factionAttack(f);TP().home=1000;TP().c3={home:{5:1000}};barracks().level=9;reconcile3();const b=factionAttack(f);barracks().level=1;return{a,b};});
 ok(t.a===t.b,'Horde squad power does not change with your tier',t);
 // 7) map: no resting squads, no target markers; a moving squad shows troops on the hex it's heading for
 const mp=await ev(()=>{const fx=FX();const fid=Object.keys(fx.f).find(i=>!fx.f[i].routedUntil);const f=fx.f[fid];f.bank.troops=cap5(f);f.bank.t=Date.now();const s=f.squads[0];const [q,r]=idQR(G._sh);
   s.pos=hexRing(q,r,4).find(x=>hexDist(x.id,G._sh)===4).id;s.path=[hexRing(q,r,3).find(x=>hexDist(x.id,G._sh)===3).id,hexRing(q,r,2).find(x=>hexDist(x.id,G._sh)===2).id];s.restUntil=0;
   for(const o of f.squads.slice(1)){o.restUntil=Date.now()+3600e3;o.target=hexRing(q,r,2)[0].id;}map.setView(hexCenter(q,r),15);drawWorld();drawIntents();
   const txt=[];G.layers.horde.eachLayer(l=>{const el=l.getElement&&l.getElement();if(el)txt.push(el.textContent);});const it=[];G.layers.intent.eachLayer(l=>{const el=l.getElement&&l.getElement();if(el)it.push(el.textContent);});
   return{resting:txt.some(x=>/resting/.test(x)),targets:txt.some(x=>/ target/.test(x)),intent:it,troops:squadTroops26(f)};});
 ok(!mp.resting&&!mp.targets,'no resting squads or planned targets on the map',mp);
 ok(mp.intent.filter(Boolean).length===1&&mp.intent.filter(Boolean)[0].includes(mp.troops.toLocaleString()+' troops'),'the hex a moving squad is heading for flashes with its troop count and time',mp.intent);
 await shot('r5-map');
 // 8) dashboard: leader only
 const d0=await ev(()=>{UI.open('alliance');return UI.SUBS.alliance.some(x=>x[0]==='horde5');});
 await ev(async()=>{await claimLeader15();});await p.waitForTimeout(2500);
 const d1=await ev(()=>{UI.open('alliance');UI.sub.alliance='horde5';UI.render();const b=$('#sheetBody');return{tab:UI.SUBS.alliance.some(x=>x[0]==='horde5'),txt:b.textContent.slice(0,400),cards:b.querySelectorAll('.hd5').length};});
 ok(!d0&&d1.tab&&d1.cards>=3&&/Horde dashboard/.test(d1.txt)&&/income/.test(d1.txt),'Horde dashboard appears for the leader only, one card per clan',{before:d0,...d1,txt:d1.txt.slice(0,120)});
 await shot('r5-dash');
 console.log('errors:',errs.length,errs.slice(0,3));console.log(fails?`${fails} FAIL`:'ALL PASS');
});
