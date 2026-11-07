// v20 Horde brain, part 2: more tactics + nests and zone bosses. Loads after brain.js. All seeded / shared, so phones agree.
//   👁️ Probe   a light squad (60% power) tests a defended crew hex; what it learns is written to the shared horde doc
//   💥 Strike  within 12 h a sibling squad hits the probed hex at +15% power
//   🔱 Pincer  two squads of one gang converge on the same crew zone from opposite sides
//   🏰 Siege   a squad camps next to a crew tower; while it sits there that tower's daily upkeep is doubled
//   🪺 Nests   every horde-held zone has a nest on its center hex. Retake the nest hex to flush out a ZONE BOSS raid (45 min).
//              Kill it and the horde is driven out of the whole zone. Each horde zone also gives its gang +10% power (max +30%).
const BRAIN2={chance:{probe:.20,pincer:.20,siege:.20},probePower:.6,strikePower:1.15,probeHours:12,zonePower:.10,zonePowerMax:.30,bossMin:45,
  bosses:['boss_tank','boss_queen','boss_warden','boss_crystal']};
Object.assign(BRAIN.icons,{probe:['👁️','Probe'],strike:['💥','Strike'],pincer:['🔱','Pincer'],siege:['🏰','Siege']});
function myTowersAndAllies(){const out=[];for(const [id,t] of Object.entries(W().towers||{}))if(t.state==='up')out.push({hex:id,r:towerRadius(t),own:true});
  for(const m of Object.values((G.al&&G.al.members)||{}))if(!m.me&&Array.isArray(m.defs))m.defs.forEach(d=>{if(d&&d.k==='tower'&&typeof d.hex==='string')out.push({hex:d.hex,r:d.r||1,own:false});});return out;}
const _b2_plan=planSortie;planSortie=function(f,fid,s,rnd,t){_b2_plan.apply(this,arguments);try{if(s.intent&&s.intent!=='raid')return;const start=s.pos,fx=FX(),sibs=(f.squads||[]).filter(x=>x!==s);
    const go=(k,res,why)=>{if(!res)return false;s.intent=k;s.target=res.hex;s.path=res.path;s.why=why;return true;};
    // strike where a probe found the gap
    const pr=fx.probe&&fx.probe[fid];if(pr&&t-pr.t<BRAIN2.probeHours*3600e3&&pr.by!==s.id&&allied(pr.hex)){if(go('strike',bfsTo(start,fid,h=>h===pr.hex),`strike: the probe found ${pr.dp} defense here`)){delete fx.probe[fid];return;}}
    // probe a defended crew hex
    if(sibs.length&&rnd()<BRAIN2.chance.probe&&go('probe',bfsTo(start,fid,h=>allied(h)&&activeDefs(h).length>0),'probe your defenses'))return;
    // pincer: join a sibling already heading into a crew zone, from the far side
    if(sibs.length&&rnd()<BRAIN2.chance.pincer){const sib=sibs.find(x=>x.target&&allied(x.target)&&t>=(x.woundUntil||0));if(sib){const zid=zoneIdOf(sib.target),far=zoneHexes(zid).filter(h=>allied(h)).sort((a,b)=>hexDist(b,sib.target)-hexDist(a,sib.target));
      const fs=new Set(far.slice(0,4));if(go('pincer',bfsTo(start,fid,h=>fs.has(h)),`pincer on ${zoneTitle(zid)} with another squad`)){sib.intent='pincer';sib.why=`pincer on ${zoneTitle(zid)}`;return;}}}
    // siege: camp just outside a crew tower's ring
    if(rnd()<BRAIN2.chance.siege){const tw=myTowersAndAllies();if(tw.length){const ring=new Set();tw.forEach(x=>{const [q,r]=idQR(x.hex);hexRing(q,r,x.r+1).forEach(h=>{if(hexDist(h.id,x.hex)===x.r+1&&!allied(h.id))ring.add(h.id);});});
      if(go('siege',bfsTo(start,fid,h=>ring.has(h)),'siege a tower'))return;}}
  }catch(e){console.warn('brain2',e);}};
// probe results
const _b2_step=squadStep;squadStep=function(f,fid,s,k,t,ev){const n0=(ev.fights||[]).length;const r=_b2_step.apply(this,arguments);try{if(s&&s.intent==='probe'&&(ev.fights||[]).length>n0){const fr=ev.fights[ev.fights.length-1];
  const fx=FX();fx.probe=fx.probe||{};fx.probe[fid]={hex:fr.tile,dp:fr.dp||0,t,by:s.id};s.intent='raid';}}catch(e){}return r;};
// power: probe / strike / horde zones
let _b2_zc={t:0,v:{}};function gangZones(fid){if(Date.now()-_b2_zc.t>30e3){_b2_zc={t:Date.now(),v:{}};try{const gi=fxIndex();for(const z of zonesNear(ZONE.listKm))if(z.st==='horde'){const owner=gi[zoneHexes(z.id)[0]];if(owner)_b2_zc.v[owner]=(_b2_zc.v[owner]||0)+1;}}catch(e){}}return _b2_zc.v[fid]||0;}
const _b2_sp=squadPower;squadPower=function(f,s,t){let p=_b2_sp.apply(this,arguments);try{if(s&&s.intent==='probe')p*=BRAIN2.probePower;if(s&&s.intent==='strike')p*=BRAIN2.strikePower;
  const fid=Object.keys(FX().f||{}).find(k=>FX().f[k]===f);if(fid)p*=1+Math.min(BRAIN2.zonePowerMax,BRAIN2.zonePower*gangZones(fid));}catch(e){}return Math.round(p);};
// siege: doubled upkeep for besieged towers (yours)
function besieged(hex){const now=Date.now();for(const f of Object.values(FX().f||{}))for(const s of (f&&f.squads)||[])if(s&&s.intent==='siege'&&s.pos===s.target&&now<(s.restUntil||0)){const t=W().towers&&W().towers[hex];if(t&&hexDist(s.pos,hex)<=towerRadius(t)+1)return true;}return false;}
if(typeof upkeepParts==='function'){const _b2_up=upkeepParts;upkeepParts=function(){const out=_b2_up.apply(this,arguments);try{return out.map(p=>p.k==='tower'&&besieged(p.id)?{...p,name:p.name+' (besieged ×2)',cost:Object.fromEntries(Object.entries(p.cost).map(([k,v])=>[k,v*2]))}:p);}catch(e){return out;}};}
// ---- nests and zone bosses
function nestHex(zid){const [q,r]=zoneCenter(zid);return q+'_'+r;}
function hordeZonesNear(){try{return zonesNear(ZONE.listKm).filter(z=>z.st==='horde');}catch(e){return[];}}
const _b2_claim=claimTile;claimTile=function(id){let zid=null;try{zid=zoneIdOf(id);delete _zc[zid];if(!(id===nestHex(zid)&&zoneState(zid).st==='horde'))zid=null;}catch(e){zid=null;}
  const r=_b2_claim.apply(this,arguments);if(zid)try{flushZoneBoss(zid);}catch(e){console.warn('zone boss',e);}return r;};
function flushZoneBoss(zid){const day=today(),id=`rz_${zid}_${day}`;if(G.raids&&G.raids[id])return;const rnd=seedRand('zboss:'+zid),b=BRAIN2.bosses[Math.floor(rnd()*BRAIN2.bosses.length)],[q,r]=zoneCenter(zid),c=hexCenter(q,r),name=zoneTitle(zid);
  NET.createRaid({id,bossId:b,zid,day,lat:c[0],lng:c[1],place:`${name} nest`,hp:MONSTERS[b].hp,maxHp:MONSTERS[b].hp,endsAt:Date.now()+BRAIN2.bossMin*60e3,finder:P.name,participants:{},done:false});
  toast(`🪺 Nest destroyed! ${MONSTERS[b].name} bursts out of ${name}: raid for the crew`);allianceLog(`🪺 ${P.name} broke the nest in ${name}: ${MONSTERS[b].name} raid (${BRAIN2.bossMin} min). Kill it to drive the horde out of the zone!`);}
const _b2_rc=raidClaim;raidClaim=function(id){const r=G.raids[id],before=P.raidLoot&&P.raidLoot[id];const g=_b2_rc.apply(this,arguments);try{if(!before&&r&&r.won&&r.zid)purgeZone(r.zid);}catch(e){}return g;};
function purgeZone(zid){const fx=FX(),hs=new Set(zoneHexes(zid));let n=0;for(const f of Object.values(fx.f||{})){for(const h of Object.keys(f.tiles||{}))if(hs.has(h)&&h!==f.home){delete f.tiles[h];if(f.outposts)delete f.outposts[h];n++;}}
  fx.purged=fx.purged||{};fx.purged[zid]=Date.now();fxDirty();try{publishHorde();}catch(e){}if(n){toast(`🏳️ The horde flees ${zoneTitle(zid)} (${n} hexes freed)`);allianceLog(`🏳️ The horde was driven out of ${zoneTitle(zid)}`);}drawWorld();}
function drawNests(){if(typeof map==='undefined'||!P.world)return;if(!G.layers.nest)G.layers.nest=L.layerGroup().addTo(map);const g=G.layers.nest;g.clearLayers();if(map.getZoom()<13)return;
  for(const z of hordeZonesNear()){const h=nestHex(z.id);if(!isVis(h)&&!(G.allyExp&&G.allyExp.has(h)))continue;L.marker(hexCenter(...idQR(h)),{icon:L.divIcon({className:'lodm',html:'<div class="nest">🪺<small>NEST</small></div>',iconSize:[0,0]}),zIndexOffset:680})
    .on('click',()=>UI.info({title:`🪺 ${z.name} nest`,sub:'Horde zone',body:`<p>Retake this hex (march or stand on it after beating its garrison) to flush out a zone boss. Kill the boss within ${BRAIN2.bossMin} min and the horde is driven out of all of ${z.name}.</p><p class="tiny">Horde zones make their gang stronger: +${BRAIN2.zonePower*100}% each.</p>`,buttons:[['🚩 March here',()=>{UI.closeModal();UI.infoTile(h);}],['Close',()=>UI.closeModal()]]})).addTo(g);}}
HOOK.draw(function(){try{drawNests();}catch(e){}});
