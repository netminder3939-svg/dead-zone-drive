// v26a (TEST) Garrison combat + 5 classes + pipeline guard fix. Design: reviews/v26-combat-system.md (locked by Jacob, Nov 4).
//  * One deterministic calculation per fight. No rounds, no cap, no range, no luck, no matchups, no fatigue, no named variants.
//  * Class = troop type. Engineer=Tank, Raider=Melee, Scout=Ranged, + Caster, Strategist. Troops convert 1:1 (type is read from the class).
//  * 12f: the losing defenders lose 80% and the rest retreat home (was: wiped). Defender losses hit Engineers first, then split evenly (smallest stacks run out first).
//  * Pipeline: CUT only when a route hex was taken in a fight the guards lost, or nobody guards the route. Every capture makes a report.
const C26={
  types:{engineer:{hp:3,atk:.5,ico:'🛡',role:'Tank'},raider:{hp:2,atk:1,ico:'🪓',role:'Melee'},scout:{hp:1.5,atk:1,ico:'🏹',role:'Ranged'},
         caster:{hp:1,atk:1,ico:'✨',role:'Caster'},strategist:{hp:1.5,atk:.6,ico:'♟',role:'Strategist'}},
  perk:{shieldwall:.10,battleborne:.10,sighted:.10,mend:.10,saboteur:.10,mastermind:.05},perkMin:.10,
  cls:{engineer:{hp:.10},caster:{hp:.10},raider:{atk:.10},scout:{atk:.10},strategist:{hp:.05,atk:.05}},
  mix:{3:.10,4:.15,5:.20},
  bld:{tower:{fire:70,walls:.20},op:{fire:40,walls:.15},sh:{fire:120,walls:.30},pipe:{fire:0,walls:.10}},lvlFire:.20,lvlWalls:.02,maxWalls:.50,innate:100,
  horde:'raider',retreat:.20,lootShare:.5,repWin:5,repHold:3};
window.C26=C26;
// ---------- classes 3 -> 5 (names locked: Scout, Raider, Engineer, Caster, Strategist) ----------
CLASSES.list.caster={name:'Caster',icon:'✨',tag:'Mends the garrison, grows the land',fx:{},income:0.10,
  lines:['Troops: Caster type (1 HP, 1 ATK)','In a fight: Mend, +10% HP to every friendly troop','+10% daily output from your tiles','Scrying: tile cards show the full tile info']};
CLASSES.list.strategist={name:'Strategist',icon:'♟',tag:'Plans the fight, trains faster',fx:{},trainTime:0.15,
  lines:['Troops: Strategist type (1.5 HP, 0.6 ATK)','In a fight: Saboteur −10% enemy HP + Mastermind +5% all friendly damage (building too)','Troops train 15% faster']};
const _addL=(id,a)=>{const k=CLASSES.list[id];if(k&&!k._26){k._26=1;k.lines=[...a,...k.lines];}};
_addL('engineer',['Troops: Engineer type = Tank (3 HP, 0.5 ATK), die first','In a fight: Shieldwall, walls block +10%','Marches carry 25% more']);
_addL('raider',['Troops: Raider type = Melee (2 HP, 1 ATK)','In a fight: Battleborne, +10% ATK to every friendly troop']);
_addL('scout',['Troops: Scout type = Ranged (1.5 HP, 1 ATK)','In a fight: Sighted, −10% enemy ATK','+10% food from your tiles']);
CLASSES.list.engineer.load=(CLASSES.list.engineer.load||0)+0.25; // Tank: extra carry (marchLoad wrapper in classes.js reads c.load)
// out-of-fight perks for the new classes + Scout food
try{const _gi26=grossIncome;grossIncome=function(){const g=_gi26.apply(this,arguments);try{const c=P.cls&&P.cls.id;if(c==='caster')for(const k in g)g[k]=Math.round(g[k]*1.10);if(c==='scout')g.food=Math.round((g.food||0)*1.10);}catch(e){}return g;};}catch(e){}
try{const _tm26=trainMs;trainMs=function(){const v=_tm26.apply(this,arguments);return P.cls&&P.cls.id==='strategist'?Math.round(v*(1-0.15)):v;};}catch(e){}
// ---------- my type + gear (published so teammates' phones can do the same math) ----------
function type26(clsId){return C26.types[clsId]?clsId:'raider';}
function myType26(){return type26(P.cls&&P.cls.id);}
function myGear26(){const o={atk:0,def:0,hp:0,agi:0};try{equippedGear().forEach(([,g])=>{if(g)for(const k in o)o[k]+=g[k]||0;});const b=setBonus().total;for(const k in o)o[k]+=b[k]||0;}catch(e){}return o;}
window.myType26=myType26;window.myGear26=myGear26;window.type26=type26;
HOOK.member(function(m){try{m.cls=P.cls&&P.cls.id||m.cls||null;const g=myGear26();m.g26={a:g.atk|0,d:g.def|0,h:g.hp|0};}catch(e){}return m;});
function who26(uid){if(!uid||isMe(uid))return{type:myType26(),gear:myGear26(),name:P.name};const m=((G.al&&G.al.members)||{})[uid]||{};const g=m.g26||{};return{type:type26(m.cls),gear:{atk:g.a|0,def:g.d|0,hp:g.h|0},name:m.name||'Teammate'};}
window.who26=who26;
// speed gear (AGI) shortens marches: -0.5% per AGI, max -25%
try{const _md26=marchDur;marchDur=function(){const d=_md26.apply(this,arguments);try{const a=myGear26().agi||0;return Math.round(d*(1-Math.min(.25,a*.005)));}catch(e){return d;}};}catch(e){}
// ---------- the fight (one calculation) ----------
// def: {bld:{kind,lvl,pct}|null, players:[{key,uid,n,type,gear,name}]}, att:{n,type,name}
function innate26(bld){return C26.innate;}
function fight26(def,att){const T=C26.types,Pk=C26.perk;const pl=(def.players||[]).filter(p=>p.n>0);const totN=pl.reduce((a,p)=>a+p.n,0)||0;
  const byType={};pl.forEach(p=>byType[p.type]=(byType[p.type]||0)+p.n);
  const gs=t=>Math.max(0,...pl.filter(p=>p.type===t).map(p=>(p.gear.atk||0)+(p.gear.def||0)+(p.gear.hp||0)/4)); // best gear of that type boosts the perk
  const on=t=>totN>0&&(byType[t]||0)>=C26.perkMin*totN;const pv=(t,base)=>on(t)?base+Math.min(.05,Math.floor(gs(t)/40)*.01):0;
  const perks={shieldwall:pv('engineer',Pk.shieldwall),battleborne:pv('raider',Pk.battleborne),sighted:pv('scout',Pk.sighted),mend:pv('caster',Pk.mend),saboteur:pv('strategist',Pk.saboteur),mastermind:pv('strategist',Pk.mastermind)};
  const nTypes=Object.keys(byType).filter(t=>byType[t]>0).length,mix=C26.mix[Math.min(5,nTypes)]||0;
  const inn=def.bld?innate26(def.bld):0;const b=def.bld?{...C26.bld[def.bld.kind]||C26.bld.tower}:null;let fire=0,walls=0;
  if(b){const L=Math.max(1,def.bld.lvl||1),pct=def.bld.pct==null?1:def.bld.pct;fire=b.fire*(1+C26.lvlFire*(L-1))*pct;walls=Math.min(C26.maxWalls,b.walls+C26.lvlWalls*(L-1));}
  walls=Math.min(C26.maxWalls+.10,walls+perks.shieldwall);
  const rows=pl.map(p=>{const t=T[p.type]||T.raider,c=C26.cls[p.type]||{},g=p.gear||{};
    const atkPer=t.atk*(1+(c.atk||0))*(1+(g.atk||0)/200)*(1+perks.battleborne),hpPer=t.hp*(1+(c.hp||0))*(1+((g.def||0)+(g.hp||0)/4)/200)*(1+perks.mend)*(1+mix);
    return{...p,atkPer,hpPer,dmg:p.n*atkPer,hp:p.n*hpPer};});
  const D=(fire+rows.reduce((a,r)=>a+r.dmg,0))*(1+perks.mastermind),H=rows.reduce((a,r)=>a+r.hp,0)+(b?inn:0);
  const at=T[att.type||C26.horde]||T.raider,an=Math.max(0,att.n||0),A=an*at.atk*(1-perks.sighted),E=an*at.hp*(1-perks.saboteur);
  const tWe=D>0?E/D:Infinity,tThey=A>0?H/Math.max(.01,1-walls)/A:Infinity,win=an<=0||tWe<=tThey;
  let lossHP=win?A*(isFinite(tWe)?tWe:0)*(1-walls):H;const out=rows.map(r=>({key:r.key,uid:r.uid,name:r.name,type:r.type,n:r.n,lost:0,dmg:Math.round(r.dmg),hp:Math.round(r.hp)}));
  if(win){let left=Math.max(0,lossHP-(b?Math.min(inn,lossHP):0)); // the building's own guard soaks first, then Engineers, then even split
    for(const r of rows.map((r,i)=>[r,i]).filter(([r])=>r.type==='engineer')){if(left<=0)break;const [rr,i]=r;const k=Math.min(rr.n,Math.ceil(left/rr.hpPer-1e-9));out[i].lost=k;left-=k*rr.hpPer;}
    for(let guard=0;guard<10&&left>1e-6;guard++){const al=rows.map((r,i)=>[r,i]).filter(([r,i])=>out[i].lost<r.n);if(!al.length)break;const per=left/al.length;left=0;
      for(const [r,i] of al.sort((x,y)=>(x[0].n-out[x[1]].lost)*x[0].hpPer-(y[0].n-out[y[1]].lost)*y[0].hpPer)){const cap=(r.n-out[i].lost)*r.hpPer;if(per>=cap){out[i].lost=r.n;left+=per-cap;}else out[i].lost+=Math.round(per/r.hpPer);}}}
  else out.forEach(o=>o.lost=Math.ceil(o.n*(1-C26.retreat))); // 12f: losers retreat with 20% instead of being wiped
  out.forEach(o=>{o.lost=Math.min(o.n,Math.max(0,Math.round(o.lost)));o.left=o.n-o.lost;});
  const aLost=win?an:Math.min(an,Math.round(D*tThey/Math.max(.01,at.hp*(1-perks.saboteur))));
  const why=win?`We needed ${tWe.toFixed(1)} turns to wipe them. They needed ${isFinite(tThey)?tThey.toFixed(1):'∞'} to break us (walls ${Math.round(walls*100)}% + ${Math.round(H).toLocaleString()} HP, to the death). Faster side wins, a tie goes to the defender.`
    :`They needed ${tThey.toFixed(1)} turns to break us. We needed ${isFinite(tWe)?tWe.toFixed(1):'∞'} to wipe them. Faster side wins, so the ${b?'building fell':'hex fell'}. 80% of the defenders fell and the rest retreated home.`;
  return{win,D:Math.round(D),H:Math.round(H),A:Math.round(A),E:Math.round(E),tWe:+(isFinite(tWe)?tWe:999).toFixed(2),tThey:+(isFinite(tThey)?tThey:999).toFixed(2),walls:+walls.toFixed(2),fire:Math.round(fire),
    perks,mix,nTypes,players:out,att:{n:an,type:att.type||C26.horde,name:att.name||'Horde',lost:aLost,left:an-aLost},bld:def.bld||null,why};}
window.fight26=fight26;
// ---------- plug into the defense pipeline (replaces fight25 / F25 rounds) ----------
function bld26(defs){let k=null,lvl=1,pct=1;for(const d of defs){const rank={sh:3,tower:2,op:1}[d.kind]||0;if(!rank)continue;const o=structOf(d);if(!k||rank>({sh:3,tower:2,op:1}[k]||0)){k=d.kind;lvl=d.kind==='sh'?strongholdLevel():d.kind==='tower'?((o&&o.level)||1):1;}if(o&&o.hpPct!=null)pct=Math.min(pct,o.hpPct);}
  if(!k&&defs.some(d=>d.pipe))k='pipe';return k?{kind:k,lvl,pct}:null;}
const _ds26=defSides25;defSides25=function(defs){const s=_ds26.apply(this,arguments);s.bld=bld26(defs||[]);G._ds26=s;return s;};
fight25=function(bPow,bPct,guards,aPow){const s=G._ds26||{};const players=(guards||[]).filter(g=>g.pow>0).map(g=>{const w=who26(g.uid);return{key:g.key,uid:g.uid,n:g.n||Math.round(g.pow/TROOP.powerPer),type:w.type,gear:w.gear,name:g.key==='home'?'Home garrison':w.name};});
  const bld=s.bld||(bPow>0?{kind:'tower',lvl:1,pct:bPct}:null);const r=fight26({bld,players},{n:Math.round((aPow||0)/TROOP.powerPer),type:C26.horde,name:G._gname26||'Horde'});
  G._r26=r;const fr=Object.fromEntries(r.players.map(p=>[p.key,p]));
  return{win:r.win,end:r.win?'held':'broke',rounds:[],bFell:!r.win&&!!bld,bPct:bPct==null?1:bPct,aLeft:r.att.n?r.att.left/r.att.n:0,aPow,bPow,r26:r,
    guards:(guards||[]).map(g=>{const p=fr[g.key];return{key:g.key,uid:g.uid,frac:p&&p.n?p.left/p.n:1,out:p&&p.left<=0?'dead':(!r.win&&p?'retreated':null),pow:g.pow};})};};
window.fight25=fight25;try{F25.rounds=0;}catch(e){}
// keep the gang name for the report
const _sr26=squadReplay;squadReplay=function(defs,dp,sp,gname){G._gname26=gname;return _sr26.apply(this,arguments);};
// the v25 report writer (apply25) stores P.fr25 rows; attach the full breakdown to the newest one + route it to Reports
const _rep26=report;let _lastFr26=null;
setInterval(()=>{try{const top=(P.fr25||[])[0];if(top&&top!==_lastFr26){_lastFr26=top;if(!top.r26&&G._r26&&Date.now()-top.t<15e3){top.r26=G._r26;G._r26=null;save();}}}catch(e){}},700);
// ---------- pipeline guard fix ----------
// 1) every hex on a guarded route counts as ours for the horde step, so the step MUST run the guard fight there
function guardedRoute26(id){try{for(const [gh,pg] of Object.entries(pipeGuards25()))if(pg.route.includes(id)&&stationedAt(gh)>0)return true;}catch(e){}
  try{for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){if(isMe(uid)||m.me||!Array.isArray(m.gar))continue;for(const g of m.gar)if(g&&g.route&&g.n>0&&g.route.includes(id))return true;}}catch(e){}return false;}
window.guardedRoute26=guardedRoute26;
const _al26=allied;allied=function(id){return _al26.apply(this,arguments)||guardedRoute26(id);};
// 2) record route hexes the horde won in a real fight (or took with nobody guarding) -> the only way a pipeline reads CUT
function cutLog26(){const fx=FX();fx.cut26=fx.cut26||{};return fx.cut26;}
const _st26=squadStep;squadStep=function(f,fid,s,k,t,ev){const n0=(ev.took||[]).length,f0=(ev.fights||[]).length;const r=_st26.apply(this,arguments);
  try{const took=(ev.took||[]).slice(n0),fights=(ev.fights||[]).slice(f0);for(const h of took){const fr=fights.find(x=>x.tile===h);cutLog26()[h]={t:Math.round(t),fid,why:fr&&fr.f?'fight':'unguarded'};
      if(!fr||!fr.f)capReport26(h,fid,t);}}catch(e){console.warn('st26',e);}return r;};
// pipeline route hexes the horde grows into without a fight (route not ours, nobody guarding): unguarded cut
pipeCut=function(p){const gi=fxIndex(),cl=(FX().cut26)||{};const guarded=!!(p.guard25&&stationedAt(p.guard25.hex)>0)||(p.own===false&&(p.route||[]).some(h=>guardedRoute26(h)));
  const rec=(P.troops&&P.troops.rec26)||{},f=FX().f||{};
  return(p.route||[]).some(h=>gi[h]&&!(rec[h]&&f[gi[h]]&&rec[h]===String(f[gi[h]].tiles[h])&&!(cl[h]&&cl[h].why==='fight'))&&(!guarded||(cl[h]&&cl[h].why==='fight')));};
window.pipeCut=pipeCut;
// 3) reports for captures with no defenders: the hex owner always gets one (their own phone)
function capReport26(h,fid,t){const prev=G.terr[h],pu=(prev&&prev.prevUid)||'';const gname=(fdef(fid)||{}).name||'Horde';const row={t:Math.round(t)||Date.now(),hex:h,gang:gname,win:false,none:true,me:[],why:'Nobody was guarding this hex, so the horde walked in. No fight was run.'};
  if(!pu||isMe(pu)){P.fr25=[row,...(P.fr25||[])].slice(0,30);save();try{notify26('cap',row);}catch(e){}}
  else{try{if(NET.mode==='firebase')NET.fs.addDoc(NET.fs.collection(NET.db,...NET.base,'activity'),{kind:'cap26',text:JSON.stringify({for:pu,hex:h,gang:String(gname).slice(0,24)}),uid:NET.uid||P.uid,name:(P.name||'').slice(0,24),t:NET.fs.serverTimestamp()});}catch(e){}}}
window.capReport26=capReport26;
function listenCap26(){if(G._cap26L||NET.mode!=='firebase'||!NET.fs||!NET.db||!NET.base)return;G._cap26L=1;
  NET.actFeed(60,s=>{const seen=TP().cap26Seen||0;let mx=seen,ch=false;
    s.forEach(d=>{const x=d.data();if(x.kind!=='cap26')return;let p={};try{p=JSON.parse(x.text||'{}');}catch(e){return;}const t=x.t&&x.t.toMillis?x.t.toMillis():0;if(!t||t<=seen||!isMe(p.for))return;mx=Math.max(mx,t);
      const row={t,hex:p.hex,gang:p.gang,win:false,none:true,me:[],why:'Nobody was guarding this hex, so the horde walked in. No fight was run.'};P.fr25=[row,...(P.fr25||[])].slice(0,30);ch=true;try{notify26('cap',row);}catch(e){}});
    if(ch){TP().cap26Seen=mx;save();}},e=>console.warn('cap26',e));}
setInterval(()=>{try{listenCap26();}catch(e){}},3000);
// 4) reconcile: a route hex the horde holds while my guards sit on the line (no fight on record) -> the guards fight for it now.
//    Normal game math: fight26 vs that gang's strongest squad. Win: the gang is pushed off the hex. Lose: guards lose 80% and the rest retreat home, line is cut.
function reconcile26(){if(!P.world||!P.world.fx)return;const gi=fxIndex(),cl=cutLog26(),now=Date.now();let ch=false;
  for(const p of pipes()){const g=p.guard25,n=g?stationedAt(g.hex):0;if(!g||n<=0)continue;
    for(const h of p.route||[]){const fid=gi[h];if(!fid||(cl[h]&&cl[h].why==='fight'&&cl[h].t>((stationed()[g.hex]||{}).at||0)))continue;const f=FX().f[fid];if(!f)continue;
      const rec=TP().rec26=TP().rec26||{},held=String(f.tiles[h]||0);if(rec[h]===held)continue; // already fought for this exact capture
      let sp=0;for(const s of f.squads||[])sp=Math.max(sp,squadPower(f,s,now)||0);if(!sp)sp=Math.round(2000*TROOP.powerPer);
      const gname=(fdef(fid)||{}).name||'Horde',stn=stationed()[g.hex].n;
      const r=fight26({bld:{kind:'pipe',lvl:1},players:[{key:'me:'+g.hex,uid:P.uid,n:stn,type:myType26(),gear:myGear26(),name:'Your pipeline guard'}]},{n:Math.round(sp/TROOP.powerPer),name:gname});
      const me=r.players[0];const row={t:now,hex:h,gang:gname,sp,win:r.win,r26:r,pipe:p.name,me:[{who:'Your pipeline guard',n:me.n,lost:me.lost}]};
      rec[h]=held;if(r.win){delete f.tiles[h];fxDirty();stationed()[g.hex].n=me.left;if(cl[h])delete cl[h];row.title=`Pipeline guard drove ${gname} off ${p.name}`;}
      else{cl[h]={t:now,fid,why:'fight'};sendHome25(g.hex,me.left,'retreated');row.title=`Pipeline line lost · ${p.name}`;}
      if(me.lost){try{const w=woundSplit(me.lost,r.win);addWounded(w.wounded);}catch(e){}}
      P.fr25=[row,...(P.fr25||[])].slice(0,30);ch=true;try{notify26('fight',row);}catch(e){}
      break;}}
  if(ch){save();try{pushMember();}catch(e){}try{drawWorld();}catch(e){}}}
window.reconcile26=reconcile26;
setInterval(()=>{try{reconcile26();}catch(e){console.warn('rec26',e);}},10e3);
