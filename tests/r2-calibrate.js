// R2: marching difficulty on the army engine vs the old duel engine. For each enemy (Horde squads, forts, mutants) and
// several player levels/classes: the fewest troops that win (threshold) on each engine. Prints the ratio old/new per
// enemy kind; combat2's K2 must make the median 1.00 and keep 90% of samples within 15%.
require('./h.js')(process.argv[2],async(p)=>{
 const r=await p.evaluate(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();
   const thr=(eng,enemy)=>{let lo=0,hi=400000;const w=n=>{G._tl=null;const f=eng([...marchUnits({unit:frozenMe(),escorts:{}}),troopUnit(n)],enemy());return f.win;};
     if(!w(hi))return null;while(hi-lo>Math.max(1,hi*0.005)){const m=Math.floor((lo+hi)/2);if(w(m))hi=m;else lo=m;}return hi;};
   const keepL=P.lvl,keepT=P.cls||P.class,out={band:[],fort:[],mob:[]};
   const classes=Object.keys(CLASSES.list);
   for(const L of [1,5,10,20]){P.lvl=L;
     for(const c of classes){try{P.cls=c;P.class=c;}catch(e){}
       for(const pw of [50,200,800,2500,6000])out.band.push({L,c,pw,old:thr(runFight_duel,()=>[bandUnit('Rust Dogs squad',pw)]),neu:thr(army2Fight,()=>[bandUnit('Rust Dogs squad',pw)])});
       for(const lv of [0,3,8,15]){const mk=()=>{const s=enemyStats({level:lv}),E=BAL.enemy,u=[mkUnit({name:'Raider Stronghold',hp:s.hp,atk:s.atk,def:s.def,crit:s.crit,agi:1,fort:true})];for(let i=0;i<E.guards;i++)u.push(mkUnit({name:'Raider Guard',hp:s.hp*E.guardMult,atk:s.atk*.7,def:s.def*.6,crit:8,agi:6}));return u;};
         out.fort.push({L,c,lv,old:thr(runFight_duel,mk),neu:thr(army2Fight,mk)});}
       for(const mid of Object.keys(MONSTERS).slice(0,6))for(const ml of [1,5,12])out.mob.push({L,c,mid,ml,old:thr(runFight_duel,()=>mutantUnits(mid,ml)),neu:thr(army2Fight,()=>mutantUnits(mid,ml))});}}
   P.lvl=keepL;
   const sum={};for(const [k,a] of Object.entries(out)){const rs=a.filter(x=>x.old&&x.neu&&x.old>=500).map(x=>x.old/x.neu).sort((x,y)=>x-y);const med=rs[Math.floor(rs.length/2)];
     sum[k]={n:rs.length,median:+(med||0).toFixed(3),p10:+(rs[Math.floor(rs.length*.1)]||0).toFixed(3),p90:+(rs[Math.floor(rs.length*.9)]||0).toFixed(3),within15:rs.length?+(rs.filter(x=>Math.abs(x/med-1)<=.15).length/rs.length).toFixed(2):0,
       tiny:a.filter(x=>x.old!=null&&x.old<500).length,noWinOld:a.filter(x=>x.old==null).length,noWinNew:a.filter(x=>x.neu==null).length};}
   return{K2,sum,scale:scale2(),bandL:[1,5,10,20].map(L=>{const a=out.band.filter(x=>x.L===L&&x.old>=500).map(x=>+(x.old/x.neu).toFixed(2));return [L,a.join(" ")];}),fortL:[1,5,10,20].map(L=>[L,out.fort.filter(x=>x.L===L).map(x=>+(x.old/x.neu).toFixed(2)).join(" ")]),mobL:out.mob.filter(x=>x.old>=500).map(x=>[x.L,x.mid,x.ml,+(x.old/x.neu).toFixed(2)].join(":"))};});
 console.log(JSON.stringify(r,null,0));
});
