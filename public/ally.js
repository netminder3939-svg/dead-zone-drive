// Stage 3 (preview): allies' towers defend each other's hexes.
// Each phone publishes its standing defense structures (hex id, radius, power; no GPS) in its member doc as `defs`.
// Live v19 clients ignore the extra field. Every phone then counts teammates' structures when a squad hits any alliance hex.
function ownDefStructs(){const w=W(),out=[];const m=1+rfx('walls')/100;const s=w.sh;
  if(s&&s.state==='up'){const st=stats();out.push({k:'sh',hex:s.hex,r:shRadius(),p:Math.round((BAL.stronghold.basePower+strongholdLevel()*BAL.stronghold.powerPerLevel+Math.round((st.atk+st.def)/2))*m)});}
  Object.entries(w.towers||{}).forEach(([tid,t])=>{if(t.state==='up'&&t.online!==false)out.push({k:'tower',hex:tid,r:towerRadius(t),p:Math.round(towerPower(t)*m)});});
  Object.entries(w.outposts||{}).forEach(([oid,o])=>{if(o.state==='up')out.push({k:'op',hex:oid,r:BAL.outpost.radius,p:Math.round(outpostPower()*m)});});
  return out.slice(0,40);}
const _msAlly=memberSummary;memberSummary=function(){const o=_msAlly();try{if(P.world)o.defs=ownDefStructs();}catch(e){}return o;};
function allyDefsFor(id){const out=[],mem=(G.al&&G.al.members)||{};for(const [uid,m] of Object.entries(mem)){if(isMe(uid)||m.me||!Array.isArray(m.defs))continue;
    for(const d of m.defs){if(d&&typeof d.hex==='string'&&hexDist(d.hex,id)<=(d.r||0))out.push({kind:'ally',id:`ally:${uid}:${d.k}:${d.hex}`,power:Math.max(0,d.p|0),owner:m.name||'Ally',ak:d.k,hex:d.hex});}}
  return out.sort((a,b)=>a.id<b.id?-1:1);}
const _defForAlly=defendersFor;defendersFor=function(id){const out=_defForAlly(id);try{if(allied(id))out.push(...allyDefsFor(id));}catch(e){}return out;};
// ally structures live on the ally's phone: here they are read-only stand-ins (fights never change their state from this phone)
const _structOfAlly=structOf;structOf=function(d){if(d&&d.kind==='ally')return{state:'up',hpPct:1,ally:true};return _structOfAlly(d);};
// hex card: show which teammates' structures cover this hex
const _infoTileAlly=UI.infoTile;UI.infoTile=function(id){_infoTileAlly.apply(this,arguments);try{const a=allied(id)?allyDefsFor(id):[];const box=document.querySelector('#modalBody .ibtns');if(a.length&&box){const nm={sh:'Stronghold',tower:'Tower',op:'Outpost'};
  box.insertAdjacentHTML('beforebegin',`<div class="row allydef"><div class="grow">🛡️ <b>Ally cover</b><small>${a.map(d=>`${poss(d.owner)} ${nm[d.ak]||'structure'} (power ${d.power})`).join(' · ')}</small></div></div>`);}}catch(e){}};
// push the new field soon after load so teammates see it without waiting a minute
(document.readyState==='complete'?f=>f():f=>window.addEventListener('load',f))(()=>setTimeout(()=>{try{pushMember();}catch(e){}},4000));
