// UI: HUD, sheets (gear, quests, raids, base, collection), battle + raid modals, onboarding, dev tools.
const UI={
  hud(){const s=stats();$('#pname').textContent=P.name;$('#plvl').textContent='Lv'+P.lvl;
    $('#hpbar').style.width=(100*P.hp/s.hp)+'%';$('#xpbar').style.width=(100*P.xp/(P.lvl*100))+'%';
    $('#res').innerHTML=Object.keys(RES).map(k=>`<span>${RES[k]} ${P.res[k]||0}</span>`).join('');},
  badge(tab,on){const b=document.querySelector(`[data-tab=${tab}]`);b.querySelector('.dot')?.remove();if(on)b.insertAdjacentHTML('beforeend','<i class="dot"></i>');},
  claimBtn(){if(!G.pos)return;const h=hexAt(...G.pos);$('#btnClaim').style.opacity=G.terr[h.id]?.core?.4:1;},
  open(tab){this.tab=tab;this.badge(tab,false);$('#sheet').classList.remove('hidden');this.render();},
  close(){$('#sheet').classList.add('hidden');this.tab=null;},
  SUBS:{base:[['fort','🏰 Stronghold'],['terr','⛺ Territory']],player:[['stats','📊 Stats'],['skills','🌳 Skills'],['gear','🗡️ Gear'],['quests','📜 Quests']],
    alliance:[['over','Overview'],['members','Members'],['bank','Resources'],['act','Activity']],inv:[['res','Resources'],['items','Items'],['dex','Collection']]},
  sub:{},
  subnav(t){return`<div class="seg">${this.SUBS[t].map(([k,n])=>`<button class="${this.sub[t]===k?'on':''}" onclick="UI.sub['${t}']='${k}';UI.render()">${n}</button>`).join('')}</div>`;},
  render(){const b=$('#sheetBody'),t=this.tab;if(!t)return;this.hud();if(!this.sub[t])this.sub[t]=this.SUBS[t][0][0];const sub=this.sub[t];let h=this.subnav(t);
    const cost=c=>Object.entries(c).filter(([,v])=>v).map(([k,v])=>`<span class="${(P.res[k]||0)<v?'short':''}">${v} ${RES[k]}</span>`).join(' ');
    if(t==='base'&&sub==='fort'){const S=P.stronghold||{level:1},L=S.level,up=S.upEnd;
      h+=`<h2>🏰 ${P.name}'s Stronghold <small class="lv">Lv ${L}/${SH_MAX}</small></h2><div class="fortwrap">${strongholdSVG(L)}</div>
      <div class="row"><div class="grow">Bonuses now: +${L*2} 🛡️ Defense · +${L*10} ❤️ Health<small>Outpost capacity (Stage 2): ${L}</small></div></div>`;
      if(up){const tot=up-S.upStart,left=up-Date.now();h+=`<h3>Upgrading to Lv ${L+1}</h3><div class="row"><div class="grow">⏳ <b id="shleft">${fmtDur(left)}</b> left<small>Keeps going while the app is closed.</small><div class="prog"><i id="shprog" style="width:${100*(1-left/tot)}%"></i></div></div></div>`;}
      else if(L<SH_MAX){h+=`<h3>Next: Lv ${L+1}</h3><div class="row"><div class="grow">Cost: ${cost(shCost(L))}<small>Time: ${fmtDur(shTime(L))} · +2 🛡️ · +10 ❤️</small></div></div><button class="big" onclick="shUpgrade();UI.render()">Upgrade Stronghold</button>`;}
      else h+='<p>Fully fortified. 💪</p>';}
    if(t==='base'&&sub==='terr'){const mine=Object.entries(G.terr).filter(([,x])=>x.core);
      h+=`<h2>⛺ Team Territory</h2><div class="row"><div class="grow">🗺️ ${Object.keys(G.terr).length} hexes · ⛺ ${mine.length} outposts · 🗼 ${mine.filter(([,x])=>x.tower).length} towers</div></div>
      ${Object.entries(BUILD).map(([k,v])=>`<div class="row"><div class="grow"><b>${v.name}</b><small>${v.desc}</small><small>Cost: ${cost(v.cost)}</small></div></div>`).join('')}
      <p class="tiny">Stand in a hex and tap ⛺ on the map to build an outpost. Full outposts &amp; AI factions arrive in Stage 2.</p>
      ${mine.map(([id,x])=>`<div class="row"><div class="grow">${x.tower?'🗼':'⛺'} Hex ${id}<small>by ${x.by}</small></div>${x.tower?'':`<button onclick="buildTower('${id}');UI.render()">→ 🗼</button>`}<button onclick="UI.go('${id}')">📍</button></div>`).join('')}`;}
    if(t==='player'&&sub==='stats'){const s=stats();
      h+=`<h2>${P.name} <small class="lv">Lv ${P.lvl}</small></h2><div class="prog"><i style="width:${100*P.xp/(P.lvl*100)}%;background:var(--acc)"></i></div><p class="tiny">${P.xp}/${P.lvl*100} XP · ${P.sp||0} skill point(s) to spend</p>
      <div class="stats">${Object.entries(STAT_INFO).map(([k,[i,n]])=>`<div><b>${i} ${k==='hp'?P.hp+'/'+s.hp:s[k]}</b><small>${n}</small></div>`).join('')}</div>
      <p class="tiny">💨 Agility = dodge chance + chance of a 1.5× strike. 🍀 Luck = more and rarer gear. 💥 Critical = chance of a 1.8× hit.</p>
      <h3>Record</h3><div class="row"><div class="grow">☠️ ${P.stats.kills} mutants · 🚶 ${(P.stats.meters/1000).toFixed(1)} km · 🏅 ${Object.keys(P.badges).length} badges · ⚔️ ${P.contrib.raids} raids</div></div>`;}
    if(t==='player'&&sub==='skills'){
      h+=`<h2>🌳 Skills <small class="lv">${P.sp||0} point${P.sp==1?'':'s'}</small></h2><p class="tiny">Earn 1 point per level. Max ${SKILL_MAX} ranks each.</p>
      ${Object.entries(SKILLS).map(([tk,T])=>`<h3>${T.icon} ${T.name}</h3>${Object.entries(T.list).map(([id,S])=>{const r=(P.skills||{})[id]||0;
        return`<div class="row"><div class="grow"><b>${S.name}</b> <span class="pips">${'●'.repeat(r)}${'○'.repeat(SKILL_MAX-r)}</span><small>${S.desc}</small></div><button ${!(P.sp>0)||r>=SKILL_MAX?'disabled':''} onclick="spendSkill('${id}');UI.render()">+</button></div>`;}).join('')}`).join('')}
      <button style="width:100%;margin-top:8px" onclick="if(confirm('Reset all skills for 50 scrap?')){respecSkills();UI.render()}">Reset skills (50 🔩)</button>`;}
    if(t==='player'&&sub==='gear'){
      h+=`<h2>🗡️ Equipped</h2>${['weapon','armor','trinket'].map(sl=>{const g=P.inv.find(x=>x.id===P.equip[sl]);return`<div class="row"><div class="grow"><small>${sl}</small>${g?gearLine(g):'— empty —'}</div></div>`;}).join('')}
      <h3>Swap in</h3>${P.inv.filter(g=>P.equip[g.slot]!==g.id).sort((a,b)=>b.rarity-a.rarity).map(g=>`<div class="row"><div class="grow">${gearLine(g)}<small>${g.slot}</small></div><button onclick="UI.equip('${g.id}')">Equip</button></div>`).join('')||'<p class="tiny">Beat mutants to find gear.</p>'}`;}
    if(t==='player'&&sub==='quests'){ensureQuests();
      h+=`<h2>📜 Daily Quests</h2><p class="tiny">New quests every day at midnight.</p>${P.quests.list.map((q,i)=>`<div class="row"><div class="grow">${q.text}
      <small>Reward: ${Object.entries(q.reward).map(([k,v])=>v+' '+RES[k]).join(' ')}</small><div class="prog"><i style="width:${100*q.prog/q.goal}%"></i></div></div>
      ${q.claimed?'✅':q.done?`<button onclick="UI.claimQ(${i})">Claim</button>`:`<small>${q.type==='meters'?Math.round(q.prog)+'m':q.prog}/${q.goal}</small>`}</div>`).join('')}`;}
    if(t==='inv'&&sub==='res'){
      h+=`<h2>🎒 Your Resources</h2>${Object.keys(RES).map(k=>`<div class="row"><span class="big-ico">${RES[k]}</span><div class="grow"><b>${RESN[k]}</b><small>${RESD[k]}</small></div><b class="num">${P.res[k]||0}</b></div>`).join('')}
      <p class="tiny">Your inventory is personal. Shared resources live in Alliance → Resources.</p>`;}
    if(t==='inv'&&sub==='items'){
      h+=`<h2>🗡️ Items (${P.inv.length})</h2><p class="tiny">Salvage gives 🔩 Scrap, and Rare+ also gives ⚙️ Parts.</p>${[...P.inv].sort((a,b)=>b.rarity-a.rarity).map(g=>`<div class="row"><div class="grow">${gearLine(g)}<small>${g.slot}</small></div>
      ${P.equip[g.slot]===g.id?'<small>equipped</small>':`<button onclick="UI.salvage('${g.id}')">Salvage</button>`}</div>`).join('')||'<p class="tiny">Empty.</p>'}`;}
    if(t==='inv'&&sub==='dex'){const ids=Object.keys(MONSTERS);
      h+=`<h2>🃏 Collection</h2><h3>Mutant Cards (${Object.keys(P.cards).length}/${ids.length})</h3><div class="grid">${ids.map(id=>`<div class="tile ${P.cards[id]?'':'locked'}"><img src="${monImg(id)}" onerror="this.src='${id}.svg'"><br>${P.cards[id]?MONSTERS[id].name+' ×'+P.cards[id]:'???'}</div>`).join('')}</div>
      <h3>Landmark Badges (${Object.keys(P.badges).length})</h3>${Object.values(P.badges).map(x=>`<div class="row">${LANDMARK_KINDS[x.kind].icon}<div class="grow">${x.name}<small>${new Date(x.t).toLocaleDateString()}</small></div></div>`).join('')||'<p class="tiny">Visit parks, schools, water towers… to earn badges.</p>'}`;}
    if(t==='alliance'){const A=G.al||{bank:{},log:[],act:[],members:{}},M=Object.entries(A.members);
      if(sub==='over'){const tot=k=>M.reduce((a,[,m])=>a+((m.contrib||{})[k]||0),0),rs=Object.values(G.raids).filter(r=>!r.done&&Date.now()<r.endsAt);
        h+=`<h2>🤝 ${localStorage.getItem('wl_team')||window.DEFAULT_TEAM}</h2><div class="stats"><div><b>${M.length}</b><small>Members</small></div><div><b>${Object.keys(G.terr).length}</b><small>Hexes held</small></div><div><b>${tot('hexes')}</b><small>Lifetime hexes</small></div><div><b>${tot('kills')}</b><small>Mutants</small></div><div><b>${tot('raids')}</b><small>Raid joins</small></div><div><b>${Object.values(A.bank).reduce((a,b)=>a+b,0)}</b><small>Bank total</small></div></div>
        <h3>☠️ Live raids</h3>${rs.map(r=>`<div class="row"><div class="grow"><b>${MONSTERS[r.bossId].name}</b><small>${r.place} · ${mins(r.endsAt)} left</small><div class="prog"><i style="width:${100*r.hp/r.maxHp}%;background:#e0573a"></i></div></div><button onclick="UI.raid('${r.id}')">Join</button></div>`).join('')||'<p class="tiny">No live raids. Bosses hide at glowing landmarks.</p>'}
        <h3>Latest</h3>${A.act.slice(0,4).map(actLine).join('')}`;}
      if(sub==='members'){h+=`<h2>👥 Members</h2><p class="tiny">Shows activity and contributions only. Locations are never shared.</p>
        ${M.sort((a,b)=>b[1].lvl-a[1].lvl).map(([,m])=>{const c=m.contrib||{};return`<div class="row"><i class="cdot" style="background:${m.color}"></i><div class="grow"><b>${m.name}${m.me?' (you)':''}</b> <small style="display:inline">Lv ${m.lvl} · 🏰 ${m.stronghold||1}</small>
          <small>☠️ ${c.kills||0} · 🗺️ ${c.hexes||0} hexes · ⚔️ ${c.raids||0} raids · 🏅 ${c.badges||0} · 🚶 ${(c.km||0).toFixed(1)} km</small><small>🏦 Gave ${c.deposited||0} · took ${c.withdrawn||0} · active ${ago(m.lastActive)}</small></div></div>`;}).join('')}`;}
      if(sub==='bank'){const mode=G.bankMode||'deposit';
        h+=`<h2>🏦 Alliance Bank</h2><p class="tiny">Open access: anyone in the alliance can deposit or withdraw, and every move is logged.</p>
        <div class="stats">${Object.keys(RES).map(k=>`<div><b>${RES[k]} ${A.bank[k]||0}</b><small>${RESN[k]} · you ${P.res[k]||0}</small></div>`).join('')}</div>
        <div class="seg"><button class="${mode==='deposit'?'on':''}" onclick="G.bankMode='deposit';UI.render()">⬆️ Deposit</button><button class="${mode==='withdraw'?'on':''}" onclick="G.bankMode='withdraw';UI.render()">⬇️ Withdraw</button></div>
        <div class="row"><select id="bkres">${Object.keys(RES).map(k=>`<option value="${k}">${RES[k]} ${RESN[k]}</option>`).join('')}</select><input id="bkamt" type="number" inputmode="numeric" min="1" placeholder="Amount"><button id="bkgo" onclick="bankTx($('#bkres').value,+$('#bkamt').value)">${mode==='deposit'?'Deposit':'Withdraw'}</button></div>
        <h3>Transaction log</h3><table class="log2"><tr><th>When</th><th>Member</th><th>Change</th><th>Balance</th></tr>${A.log.map(x=>`<tr><td>${when(x.t)}</td><td>${x.member}</td><td class="${x.amt>0?'pos':'neg'}">${x.amt>0?'+':''}${x.amt} ${RES[x.res]}</td><td>${x.bal}</td></tr>`).join('')||'<tr><td colspan=4>No transactions yet</td></tr>'}</table>`;}
      if(sub==='act'){h+=`<h2>📣 Activity</h2>${A.act.map(actLine).join('')||'<p class="tiny">Nothing yet.</p>'}`;}}
    b.innerHTML=h;},
  equip(id){const g=P.inv.find(x=>x.id===id);P.equip[g.slot]=id;P.hp=Math.min(P.hp,stats().hp);save();this.render();},
  salvage(id){const g=P.inv.find(x=>x.id===id);P.inv=P.inv.filter(x=>x.id!==id);addRes({scrap:5*(g.rarity+1),parts:g.rarity>=2?g.rarity*2:0});save();toast('🔩 Salvaged');this.render();},
  claimQ(i){const q=P.quests.list[i];if(q.claimed)return;q.claimed=true;addRes(q.reward,1+skillFx('explore')/100);addXP(50);save();this.render();},
  go(id){const [q,r]=id.split('_').map(Number);map.setView(hexCenter(q,r),17);this.close();},
  modal(html){$('#modalBody').innerHTML=html;$('#modal').classList.remove('hidden');},
  closeModal(){$('#modal').classList.add('hidden');this.raidOpen=null;this.hud();this.render();},
  battle(M,mid,lvl,foe,key){const s=stats();let mhp=P.hp,fhp=foe.hp;
    this.modal(`<h2>${M.name} <small style="color:var(--acc)">Lv${lvl}</small></h2><div class="arena" id="arena"><img class="mon" id="mon" src="${monImg(mid)}" onerror="this.src='${mid}.svg'"></div>
      <div class="hpline"><span>You ❤️ <b id="bme">${mhp}</b></span><span>${M.name} ❤️ <b id="bfoe">${fhp}</b></span></div><div class="log" id="blog">Auto-battle starting…</div><button class="big" id="bdone" disabled>Fighting…</button>`);
    const log=t=>{const l=$('#blog');l.innerHTML=t+'<br>'+l.innerHTML;};
    const iv=setInterval(()=>{const a=simulateRound(s,foe);fhp=Math.max(0,fhp-a.dmg);pop(a.dmg,a.crit);$('#mon').classList.remove('hit');void $('#mon').offsetWidth;$('#mon').classList.add('hit');
      log(`You hit for ${a.dmg}${a.crit?' 💥CRIT':''}`);$('#bfoe').textContent=fhp;
      if(fhp<=0)return end(true);const b=simulateRound(foe,s);mhp=Math.max(0,mhp-b.dmg);pop(b.dmg,b.crit,true);log(`${M.name} hits you for ${b.dmg}`);$('#bme').textContent=mhp;
      if(mhp<=0)end(false);},700);
    const end=win=>{clearInterval(iv);P.hp=Math.max(1,mhp);let msg;
      if(win){$('#mon').classList.add('dead');const g=battleWin(mid,lvl,key);msg=`🏆 Victory! +${Object.entries(M.drops).map(([k,v])=>v+RES[k]).join(' ')} · 🃏 card`+(g?`<br>Loot: ${gearLine(g)}`:'');}
      else{msg='💀 You retreated with 1 HP. Rest to heal.';}
      save();log('<b style="color:var(--txt)">'+msg+'</b>');const d=$('#bdone');d.disabled=false;d.textContent='Continue';d.onclick=()=>this.closeModal();};},
  raid(id){this.raidOpen=id;const r=G.raids[id];if(!r)return;
    if(r.won&&r.participants?.[P.uid]&&!P.raidLoot[id]){const g=raidClaim(id);this.modal(`<h2>💀 ${MONSTERS[r.bossId].name} defeated!</h2><p>Shared loot split by damage.</p><div class="row">${g?gearLine(g):''}</div><button class="big" onclick="UI.closeModal()">Nice</button>`);return;}
    this.modal(`<h2>☠️ RAID: ${MONSTERS[r.bossId].name}</h2><p class="tiny">${r.place} · found by ${r.finder}</p><div class="arena" id="arena"><img class="mon boss" id="mon" src="${monImg(r.bossId)}" onerror="this.src='${r.bossId}.svg'"></div>
      <div class="prog" style="height:12px"><i id="rhp" style="background:#e0573a"></i></div><div class="hpline"><span id="rhpt"></span><span id="rtime"></span></div>
      <div id="rparts" class="log"></div><button class="big" id="rhit">⚔️ Attack (auto 3 rounds)</button><button style="width:100%;margin-top:6px" onclick="UI.closeModal()">Leave</button>`);
    $('#rhit').onclick=async()=>{const btn=$('#rhit');btn.disabled=true;const x=await raidHit(id);if(x){pop(x.tot,x.crits>0);$('#mon').classList.remove('hit');void $('#mon').offsetWidth;$('#mon').classList.add('hit');}
      let c=4;const t=setInterval(()=>{if(!$('#rhit'))return clearInterval(t);btn.textContent=`Recharging ${c}s`;if(--c<0){clearInterval(t);btn.disabled=false;btn.textContent='⚔️ Attack (auto 3 rounds)';}},1000);};
    this.refreshRaid();},
  refreshRaid(){if(this.tab==='raids')this.render();const id=this.raidOpen,r=G.raids[id];if(!r||!$('#rhp'))return;
    $('#rhp').style.width=(100*r.hp/r.maxHp)+'%';$('#rhpt').textContent=`${r.hp} / ${r.maxHp}`;$('#rtime').textContent=r.done?(r.won?'DEFEATED':'ESCAPED'):'⏳ '+mins(r.endsAt);
    $('#rparts').innerHTML=Object.values(r.participants||{}).sort((a,b)=>b.dmg-a.dmg).map(p=>`${p.name}: ${p.dmg} dmg`).join(' · ')||'Waiting for fighters…';
    if(r.done){$('#mon').classList.add(r.won?'dead':'');const b=$('#rhit');b.disabled=false;b.textContent=r.won&&r.participants?.[P.uid]?'🎁 Claim loot':'Close';b.onclick=()=>r.won&&r.participants?.[P.uid]?this.raid(id):this.closeModal();}},
  raidBanner(){const live=Object.values(G.raids).filter(r=>!r.done&&Date.now()<r.endsAt),el=$('#raidBanner');
    if(!live.length)return el.classList.add('hidden');const r=live[0];el.classList.remove('hidden');
    el.innerHTML=`☠️ <div><b>${MONSTERS[r.bossId].name}</b><br><small>${r.place} · ${mins(r.endsAt)} left</small></div><button onclick="UI.raid('${r.id}')">JOIN</button>`;this.badge('alliance',true);},
};
const RESN={scrap:'Scrap',food:'Food',water:'Water',fuel:'Fuel',parts:'Parts'};
const RESD={scrap:'General building material and currency',food:'Survival and upkeep',water:'Survival and upkeep',fuel:'Travel and operations',parts:'Advanced upgrades and equipment'};
function ago(t){if(!t)return'—';const m=Math.round((Date.now()-t)/60e3);return m<2?'now':m<60?m+'m ago':m<1440?Math.round(m/60)+'h ago':Math.round(m/1440)+'d ago';}
function when(t){const d=new Date(t);return d.toLocaleDateString([], {month:'numeric',day:'numeric'})+' '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});}
function actLine(a){return`<div class="act"><small>${when(a.t)}</small> ${a.text}</div>`;}
function gearLine(g){const R=RARITY[g.rarity];return`<span class="rar" style="color:${R.color}">${g.name}</span> <small style="display:inline">${R.name} · ${['atk','def','hp','crit','agi','luck'].filter(k=>g[k]).map(k=>'+'+g[k]+' '+k.toUpperCase()).join(' ')}</small>`;}
function mins(t){const s=Math.max(0,Math.round((t-Date.now())/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function pop(n,crit,me){const a=$('#arena');if(!a)return;const d=document.createElement('div');d.className='dmg'+(crit?' crit':'')+(me?' me':'');d.textContent=(me?'-':'')+n;
  d.style.left=(me?15:40+Math.random()*30)+'%';d.style.top=(30+Math.random()*30)+'%';a.appendChild(d);setTimeout(()=>d.remove(),1000);}
setInterval(()=>{UI.raidBanner();UI.refreshRaid();const S=P.stronghold;if(S&&S.upEnd&&$('#shleft')){$('#shleft').textContent=fmtDur(S.upEnd-Date.now());$('#shprog').style.width=(100*(1-(S.upEnd-Date.now())/(S.upEnd-S.upStart)))+'%';}},1000);

document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x===b));if(b.dataset.tab==='map'||UI.tab===b.dataset.tab){UI.close();document.querySelector('[data-tab=map]').classList.add('on');}else UI.open(b.dataset.tab);});
$('#sheetX').onclick=()=>UI.close();$('#btnCenter').onclick=()=>G.pos&&map.setView(G.pos,16);$('#btnClaim').onclick=claimHere;
$('#btnDev').onclick=()=>{$('#devbar').classList.toggle('hidden');G.dev.any=true;};
document.querySelectorAll('#devbar button').forEach(b=>b.onclick=()=>{const k=b.dataset.dev;
  if(k==='walk'||k==='tp'){G.dev[k]=!G.dev[k];b.classList.toggle('on',G.dev[k]);toast(k==='walk'?'Auto-walk '+(G.dev.walk?'on':'off'):'Tap the map to teleport');}
  if(k==='boss'&&G.pos){NET.spawnTestBoss(...G.pos);toast('A teammate found a boss!');}
  if(k==='rath'){G.dev.tp=true;setPos(47.8135,-116.8968);map.setView(G.pos,16);}
  if(k==='reset'&&confirm('Wipe all local progress?')){localStorage.clear();location.reload();}});

// onboarding
const COLORS=['#4ad7ff','#ff7ab6','#ffd24a','#8fd14f','#c070ff','#ff8a3a'];
if(!P.name){$('#onboard').classList.remove('hidden');$('#obTeam').value=localStorage.getItem('wl_team')||window.DEFAULT_TEAM;
  $('#obColors').innerHTML=COLORS.map(c=>`<b style="background:${c}" data-c="${c}" class="${c===P.color?'on':''}"></b>`).join('');
  $('#obColors').onclick=e=>{if(!e.target.dataset.c)return;P.color=e.target.dataset.c;document.querySelectorAll('#obColors b').forEach(x=>x.classList.toggle('on',x.dataset.c===P.color));};
  $('#obGo').onclick=()=>{const n=$('#obName').value.trim();if(!n)return $('#obName').focus();P.name=n;localStorage.setItem('wl_team',$('#obTeam').value.trim()||window.DEFAULT_TEAM);
    P.inv.push({id:'starter',name:'Pipe Wrench',slot:'weapon',rarity:0,atk:6});P.equip.weapon='starter';save();$('#onboard').classList.add('hidden');boot();};}
else boot();
