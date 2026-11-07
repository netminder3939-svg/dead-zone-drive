// Stage 7 (test server): readable horde strategies + big raid-boss rewards.
// Each gang has ONE fixed strategy, shown wherever the gang appears. Growth, tiers, daily take cap and squad counts are unchanged (late game stays slow).
const STRAT={
  rush:  {icon:'⚡',name:'Rush',  desc:'Fast, lighter squads (85% power) that move 2 hexes per step and grab the nearest border hex.',power:.85},
  siege: {icon:'🏰',name:'Siege', desc:'Slow, heavy squads (120% power) that move every other step and go after your towers, outposts and Stronghold.',power:1.2},
  supply:{icon:'📦',name:'Supply raid',desc:'Squads that hunt your rare and epic resource hexes and steal part of that resource when they take one.',power:1}};
const STRAT_OF={dogs:'rush',choir:'siege',vultures:'supply'};
function stratOf(fid){return STRAT[STRAT_OF[fid]]?STRAT_OF[fid]:'rush';}
function stratTag(fid){const s=STRAT[stratOf(fid)];return`${s.icon} ${s.name}`;}
// power
const _sp7=squadPower;squadPower=function(f,s,t){const fid=Object.keys(FX().f||{}).find(k=>FX().f[k]===f);return Math.round(_sp7(f,s,t)*(fid?STRAT[stratOf(fid)].power:1));};
// targets: siege → nearest allied hex covered by one of our structures; supply → nearest allied rare/epic hex. Else the normal plan.
function s7wanted(fid,id){const k=stratOf(fid);if(!allied(id))return false;if(k==='siege'){const d=defendersFor(id);return d.some(x=>['sh','tower','op'].includes(x.kind));}if(k==='supply'){const t=tileInfo(id);return !!(t.res&&t.tier!=='common');}return false;}
const _plan7=planSortie;planSortie=function(f,fid,s,rnd,t){_plan7.apply(this,arguments);try{const k=stratOf(fid);if(k==='rush'||!s.path)return;const H=HB(),start=s.pos,prev={[start]:null},dist={[start]:0},q=[start];let hit=null;
  while(q.length&&!hit){const id=q.shift();if(dist[id]>=H.searchRadius)continue;const [a,b]=idQR(id);for(const n of hexRing(a,b,1)){if(n.id in dist||!passable(n.id,fid))continue;dist[n.id]=dist[id]+1;prev[n.id]=id;if(s7wanted(fid,n.id)){hit=n.id;break;}q.push(n.id);}}
  if(!hit)return;const path=[];for(let c=hit;c&&c!==start;c=prev[c])path.unshift(c);s.target=hit;s.why=k==='siege'?'siege: your defenses':'supply raid: rich ground';s.path=path.slice(0,H.maxPath);}catch(e){console.warn('strat plan',e);}};
// speed + supply theft
const _step7=squadStep;squadStep=function(f,fid,s,k,t,ev){const st=stratOf(fid);if(st==='siege'&&k%2===1&&t>=(s.restUntil||0)&&(s.path||[]).length)return; // slow: every other step
  const next=(s.path||[])[0],mine=next&&P.tiles[next],ti=next&&tileInfo(next);_step7.apply(this,arguments);
  if(st==='supply'&&mine&&ev.took.includes(next)&&ti&&ti.res){const take=Math.min(P.res[ti.res]||0,5+3*(ti.yield||1));if(take>0){P.res[ti.res]-=take;ev.stolen=(ev.stolen||[]);ev.stolen.push([fdef(fid).name,take,ti.res]);}}
  if(st==='rush'&&t>=(s.restUntil||0)&&(s.path||[]).length&&!ev._rush2){ev._rush2=1;try{_step7.call(this,f,fid,s,k,t,ev);}finally{ev._rush2=0;}}};
const _hr7=hordeReport;hordeReport=function(ev,when){const r=_hr7.apply(this,arguments);if(ev.stolen&&ev.stolen.length){const txt=`📦 Supply raid: ${ev.stolen.map(([n,a,res])=>`${n} stole ${a} ${RES[res]}`).join(', ')}`;report(txt,false);if(r)r.parts.push(txt);else return{txt,parts:[txt]};}return r;};
// readable everywhere: intel rows, squad card, factions tab
const _intel7=hordeIntel;hordeIntel=function(){return _intel7().map(s=>({...s,strat:stratOf(s.fid)}));};
const _render7s=UI.render;UI.render=function(){_render7s.apply(this,arguments);try{const t=this.tab,sub=this.sub[t],b=$('#sheetBody');if(!b)return;
  if(t==='alliance'&&sub==='plans'){const rows=b.querySelectorAll('.s4intel'),list=hordeIntel();rows.forEach((r,i)=>{const s=list[i];if(!s||r.querySelector('.strat'))return;const g=r.querySelector('.grow b');if(g)g.insertAdjacentHTML('afterend',` <small class="strat" style="display:inline">${stratTag(s.fid)}</small>`);});}
  if(t==='base'&&sub==='factions'&&!b.querySelector('.stratkey')){b.insertAdjacentHTML('beforeend',`<h3 class="stratkey">How each gang fights</h3>${BAL.factions.list.map(d=>{const s=STRAT[stratOf(d.id)];return`<div class="row"><i class="cdot" style="background:${d.color}"></i><div class="grow"><b>${d.icon} ${d.name} · ${s.icon} ${s.name}</b><small>${s.desc}</small></div></div>`;}).join('')}`);}}catch(e){console.warn('strat ui',e);}};
const _isq7=UI.infoSquad;UI.infoSquad=function(fid,sid){_isq7.apply(this,arguments);try{const s=STRAT[stratOf(fid)],box=document.querySelector('#modalBody .ibtns');if(box&&!document.querySelector('#modalBody .strat'))box.insertAdjacentHTML('beforebegin',`<div class="row strat"><div class="grow"><b>${s.icon} Strategy: ${s.name}</b><small>${s.desc}</small></div></div>`);}catch(e){}};
// ---- big raid-boss rewards (Rust Behemoth unchanged)
const RAIDX={resMult:3,xp:250,skip:['boss_tank']};
const _rc7=raidClaim;raidClaim=function(id){const r=G.raids[id],before=P.raidLoot&&P.raidLoot[id];const g=_rc7.apply(this,arguments);if(!g||before||!r||RAIDX.skip.includes(r.bossId))return g;
  try{const total=Object.values(r.participants).reduce((a,p)=>a+p.dmg,0),me=r.participants[P.uid],share=Math.max(.15,me.dmg/total);const extra={};
    for(const [k,v] of Object.entries(MONSTERS[r.bossId].drops))extra[k]=Math.round(v*share*Object.keys(r.participants).length*.6*RAIDX.resMult);addRes(extra);
    const epic=rollGear(P.lvl+3,3);P.inv.push(epic);addXP(RAIDX.xp);P.trophies=P.trophies||{};P.trophies[r.bossId]=(P.trophies[r.bossId]||0)+1;save();
    G._raidBonus={id,extra,epic};report(`🏆 ${MONSTERS[r.bossId].name} raid bonus: ${Object.entries(extra).map(([k,v])=>v+RES[k]).join(' ')} · ${gearLine(epic)} · +${RAIDX.xp} XP · trophy`,true);}catch(e){console.warn('raid bonus',e);}return g;};
const _raid7=UI.raid;UI.raid=function(id){_raid7.apply(this,arguments);try{const b=G._raidBonus;if(b&&b.id===id){const row=document.querySelector('#modalBody .row');if(row)row.insertAdjacentHTML('afterend',`<div class="row raidbonus"><div class="grow"><b>🏆 Boss bonus</b><small>${Object.entries(b.extra).map(([k,v])=>v+RES[k]).join(' ')} · +${RAIDX.xp} XP · trophy</small><small>Guaranteed epic+: ${gearLine(b.epic)}</small></div></div>`);}}catch(e){}};
