// combat2 (R2) One army combat system for every troop fight: Horde attacks on your land, pipeline guards, and every
//  march (Horde squads, raider holdouts, forts, mutants on a march). Solo hero vs monster fights keep the duel engine.
//  The math is the 12h army formula (fight26) that Pope approved, generalized to two sides that can both have troop
//  squads, a hero and a building. fight26 itself now runs on this engine and gives identical numbers (tested on
//  10,000 random fights). The fight is shown as rounds: squads line up by class (Engineers in front), each round both
//  sides deal their damage, the front squad takes it first and the hero stands behind his troops.
//  Loaded right after fight.js so every later wrapper of runFight / UI.replay wraps this one.
(function(){
  const ORDER2=['engineer','strategist','raider','scout','caster']; // front line first
  const num=v=>+v||0;
  // ---------- one side's numbers (same formulas as fight26)
  function sideStats2(side){
    const T=C26.types,Pk=C26.perk,perksOn=side.perksOn!==false;
    const sq=(side.squads||[]).filter(s=>s.n>0);const totN=sq.reduce((a,s)=>a+s.n,0)||0;
    const byType={};sq.forEach(s=>byType[s.type]=(byType[s.type]||0)+s.n);
    const gs=t=>Math.max(0,...sq.filter(s=>s.type===t).map(s=>(num(s.gear&&s.gear.atk))+(num(s.gear&&s.gear.def))+num(s.gear&&s.gear.hp)/4));
    const on=t=>perksOn&&totN>0&&(byType[t]||0)>=C26.perkMin*totN;const pv=(t,base)=>on(t)?base+Math.min(.05,Math.floor(gs(t)/40)*.01):0;
    const perks={shieldwall:pv('engineer',Pk.shieldwall),battleborne:pv('raider',Pk.battleborne),sighted:pv('scout',Pk.sighted),mend:pv('caster',Pk.mend),saboteur:pv('strategist',Pk.saboteur),mastermind:pv('strategist',Pk.mastermind)};
    const nTypes=Object.keys(byType).filter(t=>byType[t]>0).length,mix=perksOn?(C26.mix[Math.min(5,nTypes)]||0):0;
    const bl=side.bld||null;const inn=bl?innate26(bl):0;const b=bl?{...(C26.bld[bl.kind]||C26.bld.tower)}:null;let fire=0,walls=0;
    if(b){const L=Math.max(1,bl.lvl||1),pct=bl.pct==null?1:bl.pct;fire=b.fire*(1+C26.lvlFire*(L-1))*pct;walls=Math.min(C26.maxWalls,b.walls+C26.lvlWalls*(L-1));}
    if(perksOn)walls=Math.min(C26.maxWalls+.10,walls+perks.shieldwall);
    return{sq,perks,nTypes,mix,inn,b,fire,walls,totN};}
  function rows2(S,foeP){const T=C26.types;
    return S.sq.map(s=>{const t=T[s.type]||T.raider;
      if(s.custom){return{...s,atkPer:s.custom.atk*(1-foeP.sighted),hpPer:s.custom.hp*(1-foeP.saboteur)};}
      if(s.plain){return{...s,atkPer:t.atk*(1-foeP.sighted),hpPer:t.hp*(1-foeP.saboteur)};}
      const c=C26.cls[s.type]||{},g=s.gear||{};const tp=Math.min(3.2,Math.max(1,+g.tp||1));
      const atkPer=t.atk*tp*(1+(c.atk||0))*(1+num(g.atk)/200)*(1+S.perks.battleborne)*(1-foeP.sighted),
            hpPer=t.hp*tp*(1+(c.hp||0))*(1+(num(g.def)+num(g.hp)/4)/200)*(1+S.perks.mend)*(1+S.mix)*(1-foeP.saboteur);
      return{...s,atkPer,hpPer};}).map(r=>({...r,dmg:r.n*r.atkPer,hp:r.n*r.hpPer}));}
  // damage soaked: building first, then Engineers, then the rest evenly (fight26 rule); heroes last
  function allocate2(rows,heroes,lossHP,inn){const out=rows.map(r=>({lost:0}));let left=Math.max(0,lossHP-Math.min(inn,lossHP));
    for(const [r,i] of rows.map((r,i)=>[r,i]).filter(([r])=>r.type==='engineer')){if(left<=0)break;const k=Math.min(r.n,Math.ceil(left/r.hpPer-1e-9));out[i].lost=k;left-=k*r.hpPer;}
    for(let guard=0;guard<10&&left>1e-6;guard++){const al=rows.map((r,i)=>[r,i]).filter(([r,i])=>out[i].lost<r.n);if(!al.length)break;const per=left/al.length;left=0;
      for(const [r,i] of al.sort((x,y)=>(x[0].n-out[x[1]].lost)*x[0].hpPer-(y[0].n-out[y[1]].lost)*y[0].hpPer)){const cap=(r.n-out[i].lost)*r.hpPer;if(per>=cap){out[i].lost=r.n;left+=per-cap;}else out[i].lost+=Math.round(per/r.hpPer);}}
    const hl=(heroes||[]).map(h=>{const d=Math.min(h.hp,Math.max(0,left));left-=d;return Math.round(d);});
    return{lost:out.map(o=>o.lost),heroLost:hl};}
  // ---------- the battle. att / def: {name, squads:[{key,uid,name,type,n,gear,plain}], heroes:[{name,atk,hp,me}], bld, perksOn}
  function battle2(att,def){
    const SA0=sideStats2(att),SD0=sideStats2(def);
    const RA=rows2(SA0,SD0.perks),RD=rows2(SD0,SA0.perks);
    const hA=(att.heroes||[]).map(h=>({...h,hp:Math.max(0,num(h.hp)),atk:Math.max(0,num(h.atk))})),hD=(def.heroes||[]).map(h=>({...h,hp:Math.max(0,num(h.hp)),atk:Math.max(0,num(h.atk))}));
    const DD=(SD0.fire+RD.reduce((a,r)=>a+r.dmg,0)+hD.reduce((a,h)=>a+h.atk,0))*(1+SD0.perks.mastermind);
    const HD=RD.reduce((a,r)=>a+r.hp,0)+SD0.inn+hD.reduce((a,h)=>a+h.hp,0);
    const DA=(SA0.fire+RA.reduce((a,r)=>a+r.dmg,0)+hA.reduce((a,h)=>a+h.atk,0))*(1+SA0.perks.mastermind);
    const HA=RA.reduce((a,r)=>a+r.hp,0)+SA0.inn+hA.reduce((a,h)=>a+h.hp,0);
    const nA=RA.reduce((a,r)=>a+r.n,0)+hA.length;
    const tWe=DD>0?HA/Math.max(.01,1-SA0.walls)/DD:Infinity;   // turns the defenders need to wipe the attackers
    const tThey=DA>0?HD/Math.max(.01,1-SD0.walls)/DA:Infinity; // turns the attackers need to break the defenders
    const win=nA<=0||tWe<=tThey; // defender wins ties
    // losses
    const dOut=RD.map(r=>({key:r.key,uid:r.uid,name:r.name,type:r.type,n:r.n,lost:0,dmg:Math.round(r.dmg),hp:Math.round(r.hp),hpPer:r.hpPer,kind:r.kind,custom:!!r.custom}));
    const aOut=RA.map(r=>({key:r.key,uid:r.uid,name:r.name,type:r.type,n:r.n,lost:0,dmg:Math.round(r.dmg),hp:Math.round(r.hp),hpPer:r.hpPer,kind:r.kind,custom:!!r.custom}));
    let dHero=hD.map(()=>0),aHero=hA.map(h=>h.hp);
    if(win){const a=allocate2(RD,hD,DA*(isFinite(tWe)?tWe:0)*(1-SD0.walls),SD0.inn);a.lost.forEach((k,i)=>dOut[i].lost=k);dHero=a.heroLost;
      aOut.forEach(o=>o.lost=o.n);} // attackers who lose are wiped
    else{dOut.forEach(o=>o.lost=Math.ceil(o.n*(1-C26.retreat)));dHero=hD.map(h=>h.hp); // losing defenders retreat with 20%
      const a=allocate2(RA,hA,DD*(isFinite(tThey)?tThey:0)*(1-SA0.walls),SA0.inn);a.lost.forEach((k,i)=>aOut[i].lost=k);aHero=a.heroLost;}
    [...dOut,...aOut].forEach(o=>{o.lost=Math.min(o.n,Math.max(0,Math.round(o.lost)));o.left=o.n-o.lost;});
    return{win,DD,HD,DA,HA,tWe,tThey,SA:SA0,SD:SD0,bldD:def.bld||null,def:{rows:dOut,heroes:hD.map((h,i)=>({name:h.name,me:!!h.me,atk:h.atk,hp:h.hp,lost:dHero[i]||0}))},
      att:{rows:aOut,heroes:hA.map((h,i)=>({name:h.name,me:!!h.me,atk:h.atk,hp:h.hp,lost:aHero[i]||0}))}};}
  window.battle2=battle2;window.rows2=rows2;window.sideStats2=sideStats2;
  // ---------- fight26 rebuilt on battle2 (same inputs, same output)
  const fight26_old=window.fight26;
  function fight26v2(def,att){const T=C26.types,an=Math.max(0,att.n||0),aType=att.type||C26.horde;
    const r=battle2({name:att.name||'Horde',squads:an>0?[{key:'att',name:att.name||'Horde',type:aType,n:an,plain:true}]:[],perksOn:false},
                    {squads:(def.players||[]).filter(p=>p.n>0).map(p=>({...p})),bld:def.bld||null});
    const at=T[aType]||T.raider,sab=r.SD.perks.saboteur;
    const D=r.DD,H=r.HD,A=r.DA,E=r.HA,tWe=r.tWe,tThey=r.tThey,win=r.win,walls=r.SD.walls;
    const aLost=win?an:Math.min(an,Math.round(D*tThey/Math.max(.01,at.hp*(1-sab))));
    const b=def.bld;
    const why=win?`We needed ${tWe.toFixed(1)} turns to wipe them. They needed ${isFinite(tThey)?tThey.toFixed(1):'∞'} to break us (walls ${Math.round(walls*100)}% + ${Math.round(H).toLocaleString()} HP, to the death). Faster side wins, a tie goes to the defender.`
      :`They needed ${tThey.toFixed(1)} turns to break us. We needed ${isFinite(tWe)?tWe.toFixed(1):'∞'} to wipe them. Faster side wins, so the ${b?'building fell':'hex fell'}. 80% of the defenders fell and the rest retreated home.`;
    return{win,D:Math.round(D),H:Math.round(H),A:Math.round(A),E:Math.round(E),tWe:+(isFinite(tWe)?tWe:999).toFixed(2),tThey:+(isFinite(tThey)?tThey:999).toFixed(2),walls:+walls.toFixed(2),fire:Math.round(r.SD.fire),
      perks:r.SD.perks,mix:r.SD.mix,nTypes:r.SD.nTypes,players:r.def.rows.map(o=>({key:o.key,uid:o.uid,name:o.name,type:o.type,n:o.n,lost:o.lost,dmg:o.dmg,hp:o.hp,left:o.left})),
      att:{n:an,type:aType,name:att.name||'Horde',lost:aLost,left:an-aLost},bld:def.bld||null,why,b2:r};}
  window.fight26_old=fight26_old;window.fight26v2=fight26v2;
  // fight26 is defined later (v26a.js); install the new one once it exists
  window.installFight26v2=function(){if(typeof fight26==='function'&&fight26!==fight26v2){window.fight26_old=fight26;fight26=fight26v2;window.fight26=fight26v2;}};
  // ---------- rounds timeline for the battle view (shows the exact outcome)
  function timeline2(r,maxR){const T=Math.min(r.tWe,r.tThey);const R=Math.max(3,Math.min(maxR||8,Math.ceil(isFinite(T)?T:1)));/* at least 3 rounds to watch; the outcome is the same */const out=[];
    const sideT=(s,frac)=>({rows:s.rows.map(o=>({n:o.n,left:o.n-Math.round(o.lost*frac)})),heroes:s.heroes.map(h=>({hp:h.hp,left:Math.round(h.hp-h.lost*frac)}))});
    for(let k=1;k<=R;k++){const f=k/R;out.push({k,att:sideT(r.att,f),def:sideT(r.def,f),dmgAtt:Math.round(r.DA*(isFinite(T)?T:1)/R),dmgDef:Math.round(r.DD*(isFinite(T)?T:1)/R)});}
    return out;}
  window.timeline2=timeline2;
  window.ORDER2=ORDER2;
  // ---------- troop fights go to the army engine; a hero alone (vs a monster) keeps the duel engine
  //  Enemy units from the old engine (Horde squads, raider holdouts, forts, mutants) become Horde troops: a unit's
  //  strength is its health x attack, the same way a Horde squad of power p already counts as p / power-per-troop troops
  //  when it attacks your land. K2 scales forts and mutants so marching difficulty matches the old engine (calibrated in
  //  tests/r2-calibrate.js).
  const K2={band:0.56,fort:0.40,mob:3.5};window.K2=K2; // calibrated: tests/r2-calibrate.js (median old/new threshold = 1.00)
  const runFight_duel=runFight;window.runFight_duel=runFight_duel;
  function kindOf2(u,all){if(u.fort||(all||[]).some(x=>x&&x.fort))return'fort';if(/\(power \d+\)/.test(u.name||''))return'band';return'mob';}
  // old-engine stats -> army scale. A Horde squad of power p is p / power-per-troop Horde troops (1 ATK, 2 HP each), so one
  // old-engine ATK point = 1/(base power-per-troop x atkPerPower) troop ATK, and one HP point = 2/(base x hpPerPower) troop HP.
  function scale2(){const A=BAL.ai,b=(typeof _tr2_basePower!=='undefined'?_tr2_basePower:TROOP.powerPer)||0.02;return{atk:1/(b*A.atkPerPower),hp:(C26.types.raider.hp)/(b*A.hpPerPower)};}
  window.scale2=scale2;
  function enemySquad2(u,i,all){const k=kindOf2(u,all),nm=String(u.name||'Enemy').replace(/ \(power \d+\)/,'');
    const m=/\(power (\d+)\)/.exec(u.name||'');
    if(k==='band'&&m)return{key:'e'+i,name:nm,type:'raider',n:Math.max(1,Math.round(+m[1]/(typeof basePower3==='function'?basePower3():TROOP.powerPer)*K2.band)),plain:true,kind:k};
    const S=scale2(),K=Math.sqrt(K2[k]||1);return{key:'e'+i,name:nm,type:'raider',n:1,kind:k,custom:{atk:Math.max(1,num(u.atk))*S.atk*K,hp:Math.max(1,num(u.max)||num(u.hp))*S.hp*K}};} // K scales ATK x HP, so each gets its square root
  function army2Fight(A0,B0){
    const tr=A0.filter(u=>u.troop>0),he=A0.filter(u=>!(u.troop>0));
    const myType=typeof myType26==='function'?myType26():'raider',gear={...(typeof myGear26==='function'?myGear26():{}),tp:typeof myTp26==='function'?myTp26():1};
    const att={name:P.name,squads:tr.map((u,i)=>({key:'t'+i,uid:P.uid,name:'Your troops',type:myType,n:Math.round(u.troop),gear:u.c3&&typeof avg3==='function'?{...gear,tp:avg3(u.c3)}:gear,c3:u.c3})),heroes:he.map(u=>{const S=scale2(),hk=Math.sqrt(K2[kindOf2(B0[0]||{},B0)]||1);return{name:u.name,atk:num(u.atk)*S.atk*hk,hp:(num(u.max)||num(u.hp))*S.hp*hk,me:!!u.me,src:u};})}; // heroes keep the same footing vs each enemy kind as in the old engine
    const def={name:(B0[0]&&B0[0].name)||'Enemy',squads:B0.map((u,i)=>enemySquad2(u,i,B0)),perksOn:false};
    const r=battle2(att,def);
    const f=fFrom2(r,'att',he,B0);f.army2.att=att;f.army2.def=def;return f;}
  // a fight record the older code understands (startA/A = our side, startB/B = theirs) from a battle2 result
  function fFrom2(r,us,heroSrc,foeSrc){const S=us==='att'?r.att:r.def,O=us==='att'?r.def:r.att;
    let uid=0;const U=o=>({...o,uid:'q2_'+(uid++)});const startA=[],endA=[],startB=[],endB=[];
    S.rows.forEach(o=>{const u=U({name:`🪖 ${o.n.toLocaleString()} troops`,troop:o.n,type:o.type,hp:Math.round(o.n*o.hpPer),max:Math.round(o.n*o.hpPer),atk:o.dmg,def:0,agi:0,crit:0,img:'',squad2:true,owner:o.name,ownerUid:o.uid});
      startA.push(u);endA.push({...u,hp:Math.round(o.left*o.hpPer)});});
    S.heroes.forEach((h,i)=>{const src=(heroSrc||[])[i]||{},mx=num(src.max)||num(src.hp)||Math.round(h.hp)||1,fr=h.hp>0?(h.hp-h.lost)/h.hp:1;
      const u=U({...src,name:h.name,me:h.me,hp:Math.round(mx),max:Math.round(mx),hero2:true,armyAtk:Math.round(h.atk),armyHp:Math.round(h.hp)});startA.push(u);endA.push({...u,hp:Math.round(mx*fr)});});
    O.rows.forEach((o,i)=>{const src=(foeSrc||[])[i]||{};const u=U({...src,name:src.name||o.name,n2:o.n,type:o.type,hp:Math.round(o.n*o.hpPer),max:Math.round(o.n*o.hpPer),atk:o.dmg,squad2:true,custom2:o.custom});
      startB.push(u);endB.push({...u,hp:Math.round(o.left*o.hpPer)});});
    const tl=timeline2(r);const events=tl.map(x=>({r:x.k,a:(startA[0]||{}).uid,t:(startB[0]||{}).uid,dmg:us==='att'?x.dmgAtt:x.dmgDef,real:us==='att'?x.dmgAtt:x.dmgDef,hp:0}));
    const rc={win:r.win,DA:Math.round(r.DA),DD:Math.round(r.DD),HA:Math.round(r.HA),HD:Math.round(r.HD),tWe:+(isFinite(r.tWe)?r.tWe:999).toFixed(2),tThey:+(isFinite(r.tThey)?r.tThey:999).toFixed(2),
      wallsD:r.SD?+r.SD.walls.toFixed(2):0,fireD:r.SD?Math.round(r.SD.fire):0,innD:r.SD?Math.round(r.SD.inn):0,bldD:r.bldD||null,
      att:{rows:r.att.rows.map(o=>({name:o.name,type:o.type,n:o.n,lost:o.lost,left:o.left,dmg:o.dmg,hp:o.hp,kind:o.kind,custom:o.custom})),heroes:r.att.heroes},
      def:{rows:r.def.rows.map(o=>({name:o.name,type:o.type,n:o.n,lost:o.lost,left:o.left,dmg:o.dmg,hp:o.hp,kind:o.kind,custom:o.custom})),heroes:r.def.heroes}};
    return{startA,startB,A:endA,B:endB,events,win:us==='att'?!r.win:r.win,army2:{r:rc,tl,us}};}
  window.fFrom2=fFrom2;
  window.army2Fight=army2Fight;
  runFight=function(A0,B0){try{if((A0||[]).some(u=>u&&u.troop>0)&&(B0||[]).length)return army2Fight(A0,B0);}catch(e){console.warn('army2 fight, using the duel engine',e);}
    return runFight_duel.apply(this,arguments);};
  window.runFight=runFight;
  // ---------- the battle view: your side left in your color, the enemy right in red, squads by class, hero behind his line
  const esc2=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n2=v=>Math.round(+v||0).toLocaleString();
  const clsName=t=>((typeof CLASSES!=='undefined'&&CLASSES.list[t])||{}).name||(t?t.charAt(0).toUpperCase()+t.slice(1):'Troops');
  function myColor2(){try{return (G.al&&G.al.color)||P.color||'#4ad7ff';}catch(e){return '#4ad7ff';}}
  function sideHTML2(rows,heroes,foe,label,tier){
    const order=rows.map((o,i)=>[o,i]).sort((a,b)=>ORDER2.indexOf(a[0].type)-ORDER2.indexOf(b[0].type));
    const sq=order.map(([o,i])=>{const ico=foe?(o.custom?'👹':'🪓'):((C26.types[o.type]||{}).ico||'🪖');
      const nm=foe?esc2(o.name):`${esc2(clsName(o.type))}${tier?' T'+tier:''}${o.name&&o.name!=='Your troops'?` <small>${esc2(o.name)}</small>`:''}`;
      return`<div class="sq2" data-i="${i}"><span class="ic2">${ico}</span><div class="grow"><b>${nm}</b><div class="bar2"><i style="width:100%"></i></div></div><b class="cnt2">${o.custom?'':n2(o.n)}</b></div>`;}).join('');
    const hs=(heroes||[]).map((h,i)=>`<div class="hero2" data-h="${i}"><span class="ic2">${h.me?'🧍':'🛡️'}</span><div class="grow"><b>${esc2(h.name)}</b><small>leads from behind · +${n2(h.atk)} damage a round</small><div class="bar2 hp"><i style="width:100%"></i></div></div></div>`).join('');
    return`<div class="side2 ${foe?'foe':'us'}"><div class="lab2">${label}</div>${sq||'<p class="tiny">No troops</p>'}${hs}</div>`;}
  function render2(o){const f=o.f,A=f.army2,r=A.r,us=A.us==='att'?r.att:r.def,them=A.us==='att'?r.def:r.att,tl=A.tl;
    const tier=typeof troopTier==='function'?troopTier():1;const bld=A.us==='def'&&r.bldD?`<div class="bld2">${({sh:'🏰 Stronghold',tower:'🗼 Watchtower',op:'⛺ Outpost',pipe:'⛓️ Pipeline'})[r.bldD.kind]||'🏚 Building'} Lv${r.bldD.lvl||1} · walls block ${Math.round(r.wallsD*100)}% · fire ${n2(r.fireD)}</div>`:'';
    const skip=!!P.fightSkip2;
    this.modal(`<h2>${o.title}</h2>${o.sub?`<p class="tiny">${o.sub}</p>`:''}<div class="b2" style="--us2:${esc2(myColor2())}">${sideHTML2(us.rows,us.heroes,false,'YOUR SIDE',tier)}<div class="mid2"><b id="rround">VS</b><small id="rdmg2"></small></div>${sideHTML2(them.rows,them.heroes,true,'ENEMY',0)}</div>${bld}
      <div class="log" id="rlog"></div><div id="rres"></div>
      <div class="ibtns" id="rctl"><button class="fight big" id="rauto">▶️ Watch the battle</button><button id="rskip">⏭️ Skip to result</button></div>
      <label class="skip2"><input type="checkbox" id="rskip2" ${skip?'checked':''}> Always skip battle animations</label>`);
    const box=$('#modalBody .b2'),mine=$('#rlog');let k=0,iv=null,done=false;
    const set=(sideEl,rows,state,isFoe)=>{rows.forEach((o,i)=>{const el=sideEl.querySelector(`.sq2[data-i="${i}"]`);if(!el)return;const left=state.rows[i].left;el.querySelector('.bar2 i').style.width=(o.n?100*left/o.n:0)+'%';
        if(!o.custom)el.querySelector('.cnt2').textContent=n2(left);el.classList.toggle('ko',left<=0);});
      (state.heroes||[]).forEach((h,i)=>{const el=sideEl.querySelector(`.hero2[data-h="${i}"] .bar2 i`);if(el)el.style.width=(h.hp?100*h.left/h.hp:0)+'%';});};
    const usEl=box.querySelector('.side2.us'),foeEl=box.querySelector('.side2.foe');
    const stateOf=x=>({us:A.us==='att'?x.att:x.def,them:A.us==='att'?x.def:x.att,dealt:A.us==='att'?x.dmgAtt:x.dmgDef,taken:A.us==='att'?x.dmgDef:x.dmgAtt});
    const gone=()=>!mine||!mine.isConnected||$('#modal').classList.contains('hidden');
    const step=()=>{if(gone()){clearInterval(iv);return;}if(k>=tl.length)return finish();const x=tl[k++],st=stateOf(x);
      set(usEl,us.rows,st.us);set(foeEl,them.rows,st.them,true);$('#rround').textContent='Round '+x.k+' of '+tl.length;
      $('#rdmg2').textContent=`you deal ${n2(st.dealt)} · take ${n2(st.taken)}`;
      mine.innerHTML=`<div>Round ${x.k}: you dealt ${n2(st.dealt)}, took ${n2(st.taken)}</div>`+mine.innerHTML;
      [usEl,foeEl].forEach(e=>{e.classList.remove('hit2');void e.offsetWidth;e.classList.add('hit2');});};
    const finish=()=>{if(done)return;done=true;clearInterval(iv);if(gone())return;while(k<tl.length)step();const fin=stateOf(tl[tl.length-1]||{att:{rows:[],heroes:[]},def:{rows:[],heroes:[]}});
      set(usEl,us.rows,{rows:us.rows.map(o=>({left:o.left})),heroes:us.heroes.map(h=>({hp:h.hp,left:h.hp-h.lost}))});set(foeEl,them.rows,{rows:them.rows.map(o=>({left:o.left})),heroes:them.heroes.map(h=>({hp:h.hp,left:h.hp-h.lost}))},true);
      $('#rround').textContent=f.win?'WON':'LOST';$('#rctl')?.remove();
      const lost=us.rows.reduce((a,x)=>a+x.lost,0),sent=us.rows.reduce((a,x)=>a+x.n,0),kill=them.rows.reduce((a,x)=>a+(x.custom?0:x.lost),0);
      $('#rres').innerHTML=`<div class="result ${o.good?'good':'bad'}">${o.result}</div><div class="sum2">${sent?`You lost <b>${n2(lost)}</b> of ${n2(sent)} troops`:''}${kill?` · they lost <b>${n2(kill)}</b>`:''}${f.xp2?` · <b>+${n2(f.xp2)} XP</b>`:''}</div>`+(o.buttons||[]).map((b,j)=>`<button class="${b[2]||''}" style="width:100%;margin-top:6px" id="rb${j}">${b[0]}</button>`).join('');
      (o.buttons||[]).forEach((b,j)=>$('#rb'+j).onclick=b[1]);try{UI.hud();}catch(e){}};
    $('#rauto').onclick=()=>{if(iv)return;$('#rauto').disabled=true;$('#rauto').textContent='⚔️ Fighting…';iv=setInterval(step,700);step();};
    $('#rskip').onclick=finish;
    $('#rskip2').onchange=e=>{P.fightSkip2=!!e.target.checked;save();if(P.fightSkip2)finish();};
    if(skip)finish();else if(o.autostart)$('#rauto').click();}
  window.render2=render2;
  const _rp2=UI.replay;
  UI.replay=function(o){if(o&&o.f&&o.f.army2&&o.f.army2.tl)return render2.call(this,o);return _rp2.apply(this,arguments);};
  const st=document.createElement('style');
  st.textContent=`.b2{display:flex;gap:6px;align-items:stretch;margin:8px 0}.side2{flex:1 1 0;min-width:0;border-radius:10px;padding:6px;border:1px solid #3a2f22;background:#15110c}
  .side2.us{border-color:var(--us2,#4ad7ff)}.side2.foe{border-color:#b33a2c}.lab2{font-size:11px;font-weight:800;letter-spacing:.08em;margin-bottom:4px}.side2.us .lab2{color:var(--us2,#4ad7ff)}.side2.foe .lab2{color:#ff6b55}
  .sq2,.hero2{display:flex;gap:6px;align-items:center;padding:4px 0;border-bottom:1px solid #2a2219}.sq2 .grow,.hero2 .grow{flex:1 1 auto;min-width:0}.sq2 b,.hero2 b{font-size:12px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .sq2 small,.hero2 small{font-size:10px;opacity:.75;display:block}.ic2{font-size:18px;flex:0 0 auto}.cnt2{flex:0 0 auto;font-size:12px}.bar2{height:5px;border-radius:3px;background:#2b2118;overflow:hidden;margin-top:3px}
  .bar2 i{display:block;height:100%;transition:width .5s}.side2.us .bar2 i{background:var(--us2,#4ad7ff)}.side2.foe .bar2 i{background:#d8432f}.bar2.hp i{background:#5fd068!important}
  .hero2{margin-top:6px;border-top:1px dashed #4a3b2a;border-bottom:0;opacity:.95}.sq2.ko{opacity:.35}.mid2{flex:0 0 54px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  .mid2 b{font-size:11px}.mid2 small{font-size:9px;opacity:.75}.side2.hit2{animation:hit2 .35s}@keyframes hit2{0%{transform:translateX(0)}30%{transform:translateX(-2px)}60%{transform:translateX(2px)}100%{transform:none}}
  .bld2{font-size:12px;opacity:.85;margin:-2px 0 6px}.skip2{display:flex;gap:6px;align-items:center;font-size:12px;opacity:.8;margin-top:8px}.sum2{font-size:13px;margin:6px 0}
  @media (max-width:420px){.mid2{flex-basis:40px}.ic2{font-size:15px}.side2{padding:5px}}`;
  document.head.appendChild(st);
})();
