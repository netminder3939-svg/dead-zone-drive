// UI: HUD, sheets (gear, quests, raids, base, collection), battle + raid modals, onboarding, dev tools.
const UI={
  hud(){const s=stats();$('#pname').textContent=P.name;$('#plvl').textContent='Lv'+P.lvl;
    $('#hpbar').style.width=(100*P.hp/s.hp)+'%';$('#xpbar').style.width=(100*P.xp/(xpNeed(P.lvl)))+'%';
    const inc=P.world?expectedIncome():{};$('#res').innerHTML=Object.keys(RES).map(k=>`<span>${RES[k]} ${P.res[k]||0}${inc[k]?` <em class="${inc[k]>0?'inc':'dec'}">${inc[k]>0?'+':''}${inc[k]}</em>`:''}</span>`).join('');},
  badge(tab,on){const b=document.querySelector(`[data-tab=${tab}]`);b.querySelector('.dot')?.remove();if(on)b.insertAdjacentHTML('beforeend','<i class="dot"></i>');},
  claimBtn(){if(!G.pos||!P.world)return;$('#btnClaim').style.opacity=P.tiles[hexAt(...G.pos).id]?1:.45;},
  build(){if(!G.pos)return;const id=hexAt(...G.pos).id,t=tileInfo(id),own=!!P.tiles[id],w=W(),sh=w.sh;const cost=c=>Object.entries(c).filter(([,v])=>v).map(([k,v])=>`<span class="${(P.res[k]||0)<v?'short':''}">${v} ${RES[k]}</span>`).join(' ');
    const canSh=!sh||sh.state==='down';
    this.modal(`<h2>🏗️ Build · ${hexName(id)}</h2><div class="row"><div class="grow">${t.res?`${RES[t.res]} <b style="color:${BAL.tiles.tierColor[t.tier]}">${t.tier.toUpperCase()}</b> ${RESN2[t.res]} tile · +${t.yield}/day`:'Empty tile (no resource)'}<small>${own?'✅ You own this hex':'❌ Not yours yet: walk across it to claim it'}</small></div></div>
    ${canSh?`<div class="row"><div class="grow"><b>🏰 ${sh?'Rebuild':'Place'} Stronghold here</b><small>${cost(shCostNow())}</small><small>Takes ${sh?BAL.stronghold.rebuildHours:BAL.stronghold.buildHours}h · defends ${shRadius()} rings</small></div><button ${own?'':'disabled'} onclick="placeStronghold('${id}');UI.closeModal()">Build</button></div>`:''}
    <div class="row"><div class="grow"><b>🗼 Tower</b><small>${cost(BAL.tower.cost)} · ${Object.entries(BAL.tower.upkeep).map(([k,v])=>v+RES[k]).join(' ')}/day</small><small>${Object.values(w.towers).filter(x=>x.state!=='down').length}/${towerMax()} built${towerMax()?'':' · needs a Stronghold'}</small></div><button ${own&&towerMax()?'':'disabled'} onclick="placeTower('${id}');UI.closeModal()">Build</button></div>
    <button style="width:100%" onclick="UI.closeModal()">Close</button>`);},
  open(tab){this.tab=tab;this.badge(tab,false);if(tab==='alliance'){G._seenRaids=G._seenRaids||{};Object.keys(G.raids||{}).forEach(k=>G._seenRaids[k]=1);}document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x.dataset.tab===tab));$('#sheet').classList.remove('hidden');this.render();},
  close(){$('#sheet').classList.add('hidden');this.tab=null;document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x.dataset.tab==='map'));},
  SUBS:{base:[['fort','🏰 Stronghold'],['terr','🗺️ Territory'],['reports','⚔️ Reports']],player:[['stats','📊 Stats'],['skills','🌳 Skills'],['gear','🗡️ Gear'],['quests','📜 Quests']],
    alliance:[['over','Overview'],['members','Members'],['board','Leaderboards'],['bank','Resources'],['act','Activity']],inv:[['res','Resources'],['items','Items'],['dex','Collection']]},
  sub:{},
  subnav(t){return`<div class="seg">${this.SUBS[t].map(([k,n])=>`<button class="${this.sub[t]===k?'on':''}" onclick="UI.sub['${t}']='${k}';UI.render()">${n}</button>`).join('')}</div>`;},
  render(){const b=$('#sheetBody'),t=this.tab;if(!t)return;this.hud();if(!this.sub[t])this.sub[t]=this.SUBS[t][0][0];const sub=this.sub[t];let h=this.subnav(t);
    const cost=c=>Object.entries(c).filter(([,v])=>v).map(([k,v])=>`<span class="${(P.res[k]||0)<v?'short':''}">${v} ${RES[k]}</span>`).join(' ');
    if(t==='base'&&sub==='fort'){const S=P.stronghold||{level:1},L=S.level,up=S.upEnd;
      h+=`<h2>🏰 ${poss(P.name)} Stronghold <small class="lv">Lv ${L}/${SH_MAX}</small></h2><div class="fortwrap">${strongholdSVG(L,true)}</div>
      <div class="row"><div class="grow">Bonuses now: +${L*2} 🛡️ Defense · +${L*10} ❤️ Health<small>Outpost capacity: ${typeof outpostCap==='function'?outpostCap():L}</small></div></div>`;
      if(up){const tot=up-S.upStart,left=up-Date.now();h+=`<h3>Upgrading to Lv ${L+1}</h3><div class="row"><div class="grow">⏳ <b id="shleft">${fmtDur(left)}</b> left<small>Keeps going while the app is closed.</small><div class="prog"><i id="shprog" style="width:${100*(1-left/tot)}%"></i></div></div></div>`;}
      else if(L<SH_MAX){h+=`<h3>Next: Lv ${L+1}</h3><div class="row"><div class="grow">Cost: ${cost(shCost(L))}<small>Time: ${fmtDur(shTime(L))} · +2 🛡️ · +10 ❤️</small></div></div><button class="big" onclick="shUpgrade();UI.render()">🔨 Raise the Stronghold to Lv ${L+1}</button>`;}
      else h+='<p>Fully fortified. 💪</p>';}
    if(t==='base'&&sub==='terr'){const w=W(),ids=Object.keys(P.tiles),g=grossIncome(),e=expectedIncome(),u=towerUpkeep(),sh=w.sh;
      const tiers={common:0,rare:0,epic:0};let empty=0;ids.forEach(id=>{const x=tileInfo(id);x.res?tiers[x.tier]++:empty++;});
      const shTxt=!sh?'Not placed yet':sh.state==='down'?'💥 Destroyed: rebuild for '+Math.round(BAL.stronghold.rebuildMult*100)+'% of the cost':sh.state==='building'?'⏳ Building: '+fmtDur(sh.buildEnd-Date.now())+' left':'✅ Standing '+hexName(sh.hex);
      const towers=Object.entries(w.towers);
      h+=`<h2>🗺️ Territory</h2><div class="stats"><div><b>${ids.length}</b><small>Hexes owned</small></div><div><b style="color:${BAL.tiles.tierColor.rare}">${tiers.rare}</b><small>Rare tiles</small></div><div><b style="color:${BAL.tiles.tierColor.epic}">${tiers.epic}</b><small>Epic tiles</small></div></div>
      <p class="tiny">Walk or drive across hexes to claim them. They stay yours until raiders take them.</p>
      <h3>Next daily reset · in ${fmtDur(msToReset()).replace(/ \d+s$/,'')} (midnight Pacific)</h3><table class="log2"><tr><th></th><th>Tiles</th><th>Alliance 25%</th><th>Upkeep</th><th>You get</th></tr>
      ${Object.keys(RES).map(k=>`<tr><td>${RES[k]}</td><td>${g[k]}</td><td>-${Math.round(g[k]*BAL.reset.allianceShare)}</td><td>${u[k]?'-'+u[k]:'0'}</td><td class="${e[k]>=0?'pos':'neg'}">${e[k]>=0?'+':''}${e[k]}</td></tr>`).join('')}</table>
      <h3>🏰 Map Stronghold</h3><div class="row"><div class="grow">${shTxt}<small>Defends hexes within ${shRadius()} rings · ${sh?'':'Cost: '+cost(shCostNow())}${sh&&sh.state==='down'?'Rebuild: '+cost(shCostNow()):''}</small></div>${sh&&sh.state!=='down'?`<button onclick="UI.go('${sh.hex}')">📍</button>`:''}</div>
      <h3>🗼 Towers (${towers.filter(([,x])=>x.state!=='down').length}/${towerMax()})</h3><p class="tiny">Cost ${cost(BAL.tower.cost)} · upkeep ${Object.entries(BAL.tower.upkeep).map(([k,v])=>v+RES[k]).join(' ')}/day · ring ${BAL.tower.radius} at Lv1, +1 ring every ${BAL.tower.levelsPerRing} levels</p>
      ${towers.map(([id,x])=>`<div class="row"><div class="grow">🗼 Tower · ${hexName(id)}<small>${x.state==='down'?'💥 destroyed':x.state==='building'?'⏳ '+fmtDur(x.buildEnd-Date.now()):x.online===false?'⚠️ offline (upkeep unpaid)':'✅ online'}</small></div><button onclick="UI.go('${id}')">📍</button></div>`).join('')}
      <button class="big" onclick="UI.close();UI.build()">🏗️ Build on my current hex</button>`;}
    if(t==='base'&&sub==='reports'){const r=W().reports;h+=`<h2>⚔️ Battle Reports</h2>${r.map(x=>`<div class="act ${x.win?'':'bad'}"><small>${when(x.t)}</small> ${x.text}</div>`).join('')||'<p class="tiny">Quiet so far. Raiders usually hit a few times a week once you hold '+BAL.ai.minTiles+'+ hexes.</p>'}`;}
    if(t==='player'&&sub==='stats'){const s=stats();
      h+=`<h2>${P.name} <small class="lv">Lv ${P.lvl}</small></h2><div class="prog"><i style="width:${100*P.xp/(xpNeed(P.lvl))}%;background:var(--acc)"></i></div><p class="tiny">${P.xp}/${xpNeed(P.lvl)} XP · ${P.sp||0} skill point(s) to spend</p>
      <div class="stats">${Object.entries(STAT_INFO).map(([k,[i,n]])=>`<div><b>${i} ${k==='hp'?P.hp+'/'+s.hp:s[k]}</b><small>${n}</small></div>`).join('')}</div>
      <p class="tiny">Fights have no luck: same stats, same result. 💨 Agility = act first + shave up to 25% off hits taken. 💥 Critical = +1% damage on every hit per point. 🍀 Luck = more and rarer gear.</p>
      <h3>Record</h3><div class="row"><div class="grow">☠️ ${P.stats.kills} mutants · 🚶 ${(P.stats.meters/1000).toFixed(1)} km · 🏅 ${Object.keys(P.badges).length} badges · ⚔️ ${P.contrib.raids} raids</div></div>
      `;}
    if(t==='player'&&sub==='skills'){
      h+=`<h2>🌳 Skills <small class="lv">${P.sp||0} point${P.sp==1?'':'s'}</small></h2><p class="tiny">Earn 1 point per level. Max ${SKILL_MAX} ranks each.</p>
      ${Object.entries(SKILLS).map(([tk,T])=>`<h3>${T.icon} ${T.name}</h3>${Object.entries(T.list).map(([id,S])=>{const r=(P.skills||{})[id]||0;
        return`<div class="row"><div class="grow"><b>${S.name}</b> <span class="pips">${'●'.repeat(r)}${'○'.repeat(SKILL_MAX-r)}</span><small>${S.desc}</small></div><button ${!(P.sp>0)||r>=SKILL_MAX?'disabled':''} onclick="spendSkill('${id}');UI.render()">+</button></div>`;}).join('')}`).join('')}
      <button style="width:100%;margin-top:8px" onclick="if(confirm('Reset all skills for '+respecCost()+' scrap?')){respecSkills();UI.render()}">Reset skills (${respecCost()} 🔩)</button>`;}
    if(t==='player'&&sub==='gear'){h+=gearTabHTML();} // Phase 2: gear tab lives in gear2.js
    if(t==='player'&&sub==='quests'){ensureQuests();
      h+=`<h2>📜 Daily Quests</h2><p class="tiny">New quests every day at midnight.</p>${P.quests.list.map((q,i)=>`<div class="row"><div class="grow">${q.text}
      <small>Reward: ${Object.entries(q.reward).map(([k,v])=>v+' '+RES[k]).join(' ')}</small><div class="prog"><i style="width:${100*q.prog/q.goal}%"></i></div></div>
      ${q.claimed?'✅':q.done?`<button onclick="UI.claimQ(${i})">Claim</button>`:`<small>${q.type==='meters'?Math.round(q.prog)+'m':q.prog}/${q.goal}</small>`}</div>`).join('')}`;}
    if(t==='inv'&&sub==='res'){
      h+=`<h2>🎒 Your Resources</h2>${Object.keys(RES).map(k=>`<div class="row"><span class="big-ico">${RES[k]}</span><div class="grow"><b>${RESN[k]}</b><small>${RESD[k]}</small></div><b class="num">${P.res[k]||0}</b></div>`).join('')}
      <p class="tiny">Your inventory is personal. Shared resources live in Alliance → Resources.</p>`;}
    if(t==='inv'&&sub==='items'){
      const fs=this.invSlot||'all',so=this.invSort||'rarity',pw=g=>(g.atk||0)*2+(g.def||0)*2+(g.hp||0)/5+(g.crit||0)+(g.agi||0)+(g.luck||0);
      const list=P.inv.filter(g=>fs==='all'||g.slot===fs).sort((a,b)=>so==='rarity'?b.rarity-a.rarity:so==='power'?pw(b)-pw(a):a.name.localeCompare(b.name));
      h+=`<h2>🗡️ Items (${P.inv.length})</h2><div class="seg">${['all',...GEAR_SLOTS].map(x=>`<button class="${fs===x?'on':''}" onclick="UI.invSlot='${x}';UI.render()">${x}</button>`).join('')}</div>
      <div class="row"><small>Sort</small><select onchange="UI.invSort=this.value;UI.render()">${['rarity','power','name'].map(x=>`<option ${so===x?'selected':''}>${x}</option>`).join('')}</select><button onclick="UI.salvageCommons()">Salvage all Commons</button></div>
      <p class="tiny">Salvage gives 🔩 Scrap, and Rare+ also gives ⚙️ Parts.</p>${list.map(g=>`<div class="row"><div class="grow">${gearLine(g)}<small>${g.slot}</small></div>
      ${P.equip[g.slot]===g.id?'<small>equipped</small>':`<button onclick="UI.salvage('${g.id}')">Salvage</button>`}</div>`).join('')||'<p class="tiny">Empty.</p>'}`;}
    if(t==='inv'&&sub==='dex'){const ids=Object.keys(MONSTERS);
      h+=`<h2>🃏 Collection</h2><h3>Mutant Cards (${Object.keys(P.cards).length}/${ids.length})</h3><div class="grid">${ids.map(id=>`<div class="tile ${P.cards[id]?'':'locked'}" onclick="cardTap('${id}')"><img src="${monImg(id)}" onerror="this.onerror=null;this.src='assets/monsters/${id}.svg'"><br>${P.cards[id]?MONSTERS[id].name+' ×'+P.cards[id]:'???'}</div>`).join('')}</div>
      <h3>Landmark Badges (${Object.keys(P.badges).length})</h3>${Object.values(P.badges).map(x=>`<div class="row">${LANDMARK_KINDS[x.kind].icon}<div class="grow">${x.name}<small>${new Date(x.t).toLocaleDateString()}</small></div></div>`).join('')||'<p class="tiny">Visit parks, schools, water towers… to earn badges.</p>'}`;}
    if(t==='alliance'){const A=G.al||{bank:{},log:[],act:[],members:{}},M=Object.entries(A.members);
      if(sub==='over'){const tot=k=>M.reduce((a,[,m])=>a+((m.contrib||{})[k]||0),0),rs=Object.values(G.raids).filter(r=>!r.done&&Date.now()<r.endsAt);
        h+=`<h2>🤝 ${localStorage.getItem('wl_team')||window.DEFAULT_TEAM}</h2><div class="stats"><div><b>${M.length}</b><small>Survivors</small></div><div><b>${Object.values(G.terr).filter(o=>o&&!o.ai&&!o.released&&o.uid).length}</b><small>Ground held now</small></div><div><b>${tot('hexes')}</b><small>Ground ever taken</small></div><div><b>${tot('kills')}</b><small>Mutants put down</small></div><div><b>${tot('raids')}</b><small>Raids joined</small></div><div><b>${Object.values(A.bank).reduce((a,b)=>a+b,0)}</b><small>In the crew hoard</small></div></div>
        <h3>☠️ Bosses stirring</h3>${rs.map(r=>`<div class="row"><div class="grow"><b>${MONSTERS[r.bossId].name}</b><small>${r.place} · ${mins(r.endsAt)} left</small><div class="prog"><i style="width:${100*r.hp/r.maxHp}%;background:#e0573a"></i></div></div><button onclick="UI.raid('${r.id}')">Join</button></div>`).join('')||'<p class="tiny">No bosses stirring. They lair at glowing landmarks; get close to wake one.</p>'}
        <h3>📯 Around the fire</h3>${actDedupe(A.act).slice(0,4).map(actLine).join('')}`;}
      if(sub==='board'){const cats=[['hexes','🗺️ Expansion (hexes claimed)'],['kills','☠️ Mutants defeated'],['deposited','🏦 Resources donated'],['raids','⚔️ Raid joins'],['badges','🏅 Landmarks visited'],['km','🚶 Exploration (km)']];
        h+=`<h2>🏆 Leaderboards</h2><p class="tiny">All-time totals. Weekly MVP arrives with cloud saves.</p>${cats.map(([k,n])=>{const top=M.map(([u,m])=>[m.name,(m.contrib||{})[k]||0,m.me,u]).sort((a,b)=>b[1]-a[1]).slice(0,3);
          return`<h3>${n}</h3>${top.map((t,i)=>`<div class="row"><b>${['🥇','🥈','🥉'][i]}</b>${av24(t[3],30)}<div class="grow">${t[0]}${t[2]?' (you)':''}</div><b>${k==='km'?t[1].toFixed(1):t[1]}</b></div>`).join('')}`;}).join('')}`;}
      if(sub==='members'){h+=`<h2>👥 Members</h2><p class="tiny">Shows activity and contributions only. Locations are never shared.</p>
        ${M.sort((a,b)=>b[1].lvl-a[1].lvl).map(([uid,m])=>{const c=m.contrib||{},held=m.me?Object.keys(P.tiles).length:Object.values(G.terr).filter(o=>o&&o.uid===uid&&!o.ai&&!o.released).length,dup=!m.me&&M.some(([u2,m2])=>u2!==uid&&m2.name===m.name);return`<div class="row mem24">${av24(uid,40)}<div class="grow"><b style="color:${m.color}">${m.name}${m.me?' (you)':dup?' <small style="display:inline">(other device)</small>':''}</b> <small style="display:inline">Lv ${m.lvl} · 🏰 ${m.stronghold||1}</small>
          <small>☠️ ${c.kills||0} · 🗺️ ${pl(held,'hex','hexes')} held now (${c.hexes||0} claimed all-time) · ⚔️ ${pl(c.raids||0,'raid')} · 🏅 ${c.badges||0} · 🚶 ${(c.km||0).toFixed(1)} km</small><small>🏦 Gave ${c.deposited||0} · took ${c.withdrawn||0} · active ${ago(m.lastActive)}</small></div></div>`;}).join('')}`;}
      if(sub==='bank'){const mode=G.bankMode||'deposit';
        h+=`<h2>🏦 Alliance Bank</h2><p class="tiny">Open access: anyone in the alliance can deposit or withdraw, and every move is logged.</p>
        <div class="stats">${Object.keys(RES).map(k=>`<div><b>${RES[k]} ${A.bank[k]||0}</b><small>${RESN[k]} · you ${P.res[k]||0}</small></div>`).join('')}</div>
        <div class="seg"><button class="${mode==='deposit'?'on':''}" onclick="G.bankMode='deposit';UI.render()">⬆️ Deposit</button><button class="${mode==='withdraw'?'on':''}" onclick="G.bankMode='withdraw';UI.render()">⬇️ Withdraw</button></div>
        <div class="row"><select id="bkres">${Object.keys(RES).map(k=>`<option value="${k}">${RES[k]} ${RESN[k]}</option>`).join('')}</select><input id="bkamt" type="number" inputmode="numeric" min="1" placeholder="Amount"><button id="bkgo" onclick="bankTx($('#bkres').value,+$('#bkamt').value)">${mode==='deposit'?'Deposit':'Withdraw'}</button></div>
        <h3>Transaction log</h3><table class="log2"><tr><th>When</th><th>Member</th><th>Change</th><th>Balance</th></tr>${A.log.map(x=>`<tr><td>${when(x.t)}</td><td>${x.member}</td><td class="${x.amt>0?'pos':'neg'}">${x.amt>0?'+':''}${x.amt} ${RES[x.res]}${x.kind==='auto-share'?'<br><span class="tag">auto-share</span>':''}</td><td>${x.bal}</td></tr>`).join('')||'<tr><td colspan=4>No transactions yet</td></tr>'}</table>`;}
      if(sub==='act'){h+=`<h2>📣 Activity</h2>${actDedupe(A.act).map(actLine).join('')||'<p class="tiny">Nothing yet.</p>'}`;}}
    b.innerHTML=h;},
  equip(id){const g=P.inv.find(x=>x.id===id);P.equip[g.slot]=id;P.hp=Math.min(P.hp,stats().hp);save();this.render();},
  salvageCommons(){const c=P.inv.filter(g=>g.rarity===0&&!Object.values(P.equip).includes(g.id));if(!c.length)return toast('No spare Commons');if(!confirm(`Salvage ${c.length} Common items?`))return;c.forEach(g=>{P.inv=P.inv.filter(x=>x!==g);addRes({scrap:5});});save();toast(`🔩 +${c.length*5} scrap`);this.render();},
  salvage(id){const g=P.inv.find(x=>x.id===id);P.inv=P.inv.filter(x=>x.id!==id);addRes({scrap:5*(g.rarity+1),parts:g.rarity>=2?g.rarity*2:0});save();toast('🔩 Salvaged');this.render();},
  claimQ(i){const q=P.quests.list[i];if(q.claimed)return;q.claimed=true;addRes(q.reward,1+skillFx('explore')/100);addXP(50);save();this.render();},
  go(id){const [q,r]=id.split('_').map(Number);map.setView(hexCenter(q,r),17);this.close();},
  modal(html){$('#modalBody').innerHTML=html;$('#modal').classList.remove('hidden');},
  closeModal(){$('#modal').classList.add('hidden');this.raidOpen=null;this.hud();this.render();},
  battle(M,mid,lvl,foe,key){const s=stats();let mhp=P.hp,fhp=foe.hp;
    this.modal(`<h2>${M.name} <small style="color:var(--acc)">Lv${lvl}</small></h2><div class="arena" id="arena"><img class="mon" id="mon" src="${monImg(mid)}" onerror="this.onerror=null;this.src='assets/monsters/${mid}.svg'"></div>
      <div class="hpline"><span>You ❤️ <b id="bme">${mhp}</b></span><span>${M.name} ❤️ <b id="bfoe">${fhp}</b></span></div><div class="log" id="blog">Auto-battle starting…</div><button class="big" id="bdone" disabled>Fighting…</button>`);
    const log=t=>{const l=$('#blog');l.innerHTML=t+'<br>'+l.innerHTML;};
    const iv=setInterval(()=>{const a=simulateRound(s,foe);fhp=Math.max(0,fhp-a.dmg);pop(a.dmg,a.crit);$('#mon').classList.remove('hit');void $('#mon').offsetWidth;$('#mon').classList.add('hit');
      log(`You hit for ${a.dmg}`);$('#bfoe').textContent=fhp;
      if(fhp<=0)return end(true);const b=simulateRound(foe,s);mhp=Math.max(0,mhp-b.dmg);pop(b.dmg,b.crit,true);log(`${M.name} hits you for ${b.dmg}`);$('#bme').textContent=mhp;
      if(mhp<=0)end(false);},700);
    const end=win=>{clearInterval(iv);P.hp=Math.max(1,mhp);let msg;
      if(win){$('#mon').classList.add('dead');const g=battleWin(mid,lvl,key);if(g&&g.fort){const f=g.fort;msg=`🏴 Stronghold captured! +${f.hexes} hexes · ${Object.entries(f.loot).map(([k,v])=>v+RES[k]).join(' ')}<br>Loot: ${gearLine(f.gear)}`;}else msg=`🏆 Victory! +${Object.entries(M.drops).map(([k,v])=>v+RES[k]).join(' ')} · 🃏 card`+(g?`<br>Loot: ${gearLine(g)}`:'');}
      else{msg='💀 You retreated with 1 HP. Rest to heal.';}
      save();log('<b style="color:var(--txt)">'+msg+'</b>');const d=$('#bdone');d.disabled=false;d.textContent='Continue';d.onclick=()=>this.closeModal();};},
  raid(id){this.raidOpen=id;const r=G.raids[id];if(!r)return;
    if(r.won&&r.participants?.[P.uid]&&!P.raidLoot[id]){const g=raidClaim(id);this.modal(`<h2>💀 ${MONSTERS[r.bossId].name} defeated!</h2><p>Shared loot split by damage.</p><div class="row">${g?gearLine(g):''}</div><button class="big" onclick="UI.closeModal()">Nice</button>`);return;}
    this.modal(`<h2>☠️ RAID: ${MONSTERS[r.bossId].name}</h2><p class="tiny">${r.place} · found by ${r.finder}</p><div class="arena" id="arena"><img class="mon boss" id="mon" src="${monImg(r.bossId)}" onerror="this.onerror=null;this.src='assets/monsters/${r.bossId}.svg'"></div>
      <div class="prog" style="height:12px"><i id="rhp" style="background:#e0573a"></i></div><div class="hpline"><span id="rhpt"></span><span id="rtime"></span></div>
      <div id="rparts" class="log"></div><button class="big" id="rhit">⚔️ Attack (auto 3 rounds)</button><button style="width:100%;margin-top:6px" onclick="UI.closeModal()">Leave</button>`);
    $('#rhit').onclick=async()=>{const btn=$('#rhit');btn.disabled=true;const x=await raidHit(id);if(x){pop(x.tot,x.crits>0);$('#mon').classList.remove('hit');void $('#mon').offsetWidth;$('#mon').classList.add('hit');}
      let c=4;const t=setInterval(()=>{if(!$('#rhit'))return clearInterval(t);btn.textContent=`Recharging ${c}s`;if(--c<0){clearInterval(t);btn.disabled=false;btn.textContent='⚔️ Attack (auto 3 rounds)';}},1000);};
    this.refreshRaid();},
  refreshRaid(){if(this.tab==='raids')this.render();const id=this.raidOpen,r=G.raids[id];if(!r||!$('#rhp'))return;
    $('#rhp').style.width=(100*r.hp/r.maxHp)+'%';$('#rhpt').textContent=`${r.hp} / ${r.maxHp}`;$('#rtime').textContent=r.done?(r.won?'DEFEATED':'ESCAPED'):'⏳ '+mins(r.endsAt);
    $('#rparts').innerHTML=Object.values(r.participants||{}).sort((a,b)=>b.dmg-a.dmg).map(p=>`${p.name}: ${p.dmg} dmg`).join(' · ')||'Waiting for fighters…';
    if(r.done){$('#mon').classList.add(r.won?'dead':'');const b=$('#rhit');b.disabled=false;b.textContent=r.won&&r.participants?.[P.uid]?'🎁 Claim loot':'Close';b.onclick=()=>r.won&&r.participants?.[P.uid]?this.raid(id):this.closeModal();}},
  raidBanner(){const live=Object.values(G.raids).filter(r=>!r.done&&Date.now()<r.endsAt).sort((a,b)=>a.endsAt-b.endsAt),el=$('#raidBanner');
    // v16: one row per live raid (P4); banner height pushes toasts + dev panel down so nothing covers it (P3/J6)
    if(!live.length){el.classList.add('hidden');document.documentElement.style.setProperty('--banH','0px');return;}el.classList.remove('hidden');
    el.innerHTML=live.map(r=>`<div class="rbrow">☠️ <div><b>${MONSTERS[r.bossId].name}</b><br><small>${r.place} · ${mins(r.endsAt)} left</small></div><button onclick="UI.raid('${r.id}')">JOIN</button></div>`).join('');
    document.documentElement.style.setProperty('--banH','0px'); /* v19: banner sits at the bottom now */const seen=G._seenRaids||{};if(live.some(r=>!seen[r.id])&&this.tab!=='alliance')this.badge('alliance',true);},
};
const RESN={scrap:'Scrap',food:'Food',water:'Water',fuel:'Fuel',parts:'Parts'};
const RESD={scrap:'Twisted metal: what every wall and blade is made of, and what the wasteland trades in',food:'Keeps the crew on its feet and the fires fed',water:'Clean water is worth more than gold out here',fuel:'Keeps the engines turning and the marches moving',parts:'Rare salvage for the upgrades that matter'};
function ago(t){if(!t)return'—';const m=Math.round((Date.now()-t)/60e3);return m<2?'now':m<60?m+'m ago':m<1440?Math.round(m/60)+'h ago':Math.round(m/1440)+'d ago';}
function when(t){const d=new Date(t);return d.toLocaleDateString([], {month:'numeric',day:'numeric'})+' '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});}
function actLine(a){return a.uid&&typeof av24==='function'?`<div class="act act24">${av24(a.uid,30)}<div><b style="color:${who24(a.uid).color}">${who24(a.uid).name.replace(/[<>&]/g,'')}</b> <small>${when(a.t)}</small><div class="bub24">${a.text}</div></div></div>`:`<div class="act"><small>${when(a.t)}</small> ${a.text}</div>`;}
function gearLine(g){const R=RARITY[g.rarity];return`<span class="rar" style="color:${R.color}">${g.name}</span> <small style="display:inline">${R.name} · ${['atk','def','hp','crit','agi','luck'].filter(k=>g[k]).map(k=>'+'+g[k]+' '+k.toUpperCase()).join(' ')}</small>`;}
function mins(t){const s=Math.max(0,Math.round((t-Date.now())/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function pop(n,crit,me){const a=$('#arena');if(!a)return;const d=document.createElement('div');d.className='dmg'+(crit?' crit':'')+(me?' me':'');d.textContent=(me?'-':'')+n;
  d.style.left=(me?15:40+Math.random()*30)+'%';d.style.top=(30+Math.random()*30)+'%';a.appendChild(d);setTimeout(()=>d.remove(),1000);}
setInterval(()=>{UI.raidBanner();UI.refreshRaid();const S=P.stronghold;if(S&&S.upEnd&&$('#shleft')){$('#shleft').textContent=fmtDur(S.upEnd-Date.now());$('#shprog').style.width=(100*(1-(S.upEnd-Date.now())/(S.upEnd-S.upStart)))+'%';}},1000);

document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('on',x===b));if(b.dataset.tab==='map'||UI.tab===b.dataset.tab){UI.close();document.querySelector('[data-tab=map]').classList.add('on');}else UI.open(b.dataset.tab);});
$('#sheetX').onclick=()=>UI.close();$('#sheetX').addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();UI.close();});$('#btnCenter').onclick=()=>G.pos&&map.setView(G.pos,16);$('#btnClaim').onclick=()=>UI.build();
$('#btnDev').onclick=()=>{$('#devbar').classList.toggle('hidden');G.dev.any=true;};
document.querySelectorAll('#devbar button').forEach(b=>b.onclick=()=>{const k=b.dataset.dev;
  if(k==='walk'||k==='drive'||k==='tp'){G.dev[k]=!G.dev[k];b.classList.toggle('on',G.dev[k]);toast(k==='tp'?'Tap the map to teleport':(k==='walk'?'Walk ':'Drive ')+(G.dev[k]?'on':'off'));}
  if(k==='daily'){W().lastReset=pacificDate(Date.now()-864e5);runResets().then(()=>UI.render());}
  if(k==='ai'){const r=aiAttack(seedRand('dev'+Date.now()));if(!r)toast('No tiles to attack');else UI.attackAlert(W().reports[0]);}
  if(k==='finish'){devFinishBuilds();toast('Builds finished');}
  if(k==='boss'){spawnTestBossNear();}
  if(k==='rath'){G.dev.hold=true;G.jump=true;setPos(47.8135,-116.8968);map.setView(G.pos,16);}
  if(k==='reset')devWipe();});

// Wipe: in live mode the anonymous login survives localStorage.clear(), so the cloud save would load right back.
// Overwrite this player's cloud save with an empty marker and release their hexes first, then clear and reload.
async function devWipe(){if(!confirm('Wipe ALL your progress (this phone and your cloud save) and start over? This cannot be undone.'))return;
  window.__wiping=true;toast('♻️ Wiping…');const team=localStorage.getItem('wl_team');
  try{if(NET.saveProfile&&P.uid)await Promise.race([NET.saveProfile(P.uid,{data:'{"wiped":true}',rev:0,savedAt:0,fe:G.srvFullEpoch||P.fullEpoch||0}),new Promise(r=>setTimeout(r,5000))]);}catch(e){}
  try{const ids=Object.keys(P.tiles||{}).slice(0,400);await Promise.race([Promise.all(ids.map(id=>NET.claimHex(id,{by:'',released:true,t:Date.now()}).catch(()=>{}))),new Promise(r=>setTimeout(r,5000))]);}catch(e){}
  try{localStorage.clear();if(team)localStorage.setItem('wl_team',team);}catch(e){}
  try{if(window.caches)for(const k of await caches.keys())await caches.delete(k);}catch(e){}
  location.replace(location.pathname+location.search);}
// onboarding
const COLORS=['#4ad7ff','#ff7ab6','#ffd24a','#8fd14f','#c070ff','#ff8a3a'];
const _inv=new URLSearchParams(location.search).get('team');if(_inv&&!P.name)localStorage.setItem('wl_team',_inv.trim().toLowerCase().slice(0,40));
if(!P.name){$('#onboard').classList.remove('hidden');$('#obTeam').value=localStorage.getItem('wl_team')||''; // v20: never pre-fill the private crew code; use an invite link or type it
  $('#obColors').innerHTML=COLORS.map(c=>`<b style="background:${c}" data-c="${c}" class="${c===P.color?'on':''}"></b>`).join('');
  $('#obColors').onclick=e=>{if(!e.target.dataset.c)return;P.color=e.target.dataset.c;document.querySelectorAll('#obColors b').forEach(x=>x.classList.toggle('on',x.dataset.c===P.color));};
  $('#obGo').onclick=()=>{const n=$('#obName').value.trim();if(!n)return $('#obName').focus();const tc=$('#obTeam').value.trim().toLowerCase();if(!tc){$('#obTeam').placeholder='Team code (from your invite link)';return $('#obTeam').focus();}P.name=n;localStorage.setItem('wl_team',tc);
    P.inv.push({id:'starter',name:'Pipe Wrench',slot:'weapon',rarity:0,atk:6});P.equip.weapon='starter';save();$('#onboard').classList.add('hidden');boot();};}
else window.addEventListener('DOMContentLoaded',boot);

// v16 (P5): one daily auto-share line per member per day in the feed; exact repeats within a minute collapsed.
function actDedupe(list){const seen=new Set();return(list||[]).filter(x=>{const t=x.text||'',m=/^🌅 Daily reset: (.+?)'s/.exec(t),k=m?'ds|'+m[1]+'|'+pacificDate(x.t):t+'|'+Math.floor((x.t||0)/60e3);if(seen.has(k))return false;seen.add(k);return true;});}

function pl(n,one,many){return n+' '+(n===1?one:(many||one+'s'));}

function cardTap(id){const M=MONSTERS[id];if(!P.cards[id])return toast('🔒 Defeat one to unlock this card');toast(`🃏 ${M.name} ×${P.cards[id]}${M.drops?' · drops '+Object.entries(M.drops).map(([k,v])=>v+RES[k]).join(' '):''}`);}

// v19: tap an equipped row -> where every stat comes from (level, skills, stronghold, each item)
UI.statBreak=function(sl){const L=P.lvl,SL=strongholdLevel(),K=['atk','def','hp','crit','agi','luck'];
  const base={atk:8+L*2,def:2+L,hp:100+L*10,crit:5,agi:3+Math.floor(L/2),luck:3+Math.floor(L/3)},rows=[['Level '+L,base],['Skills',Object.fromEntries(K.map(k=>[k,skillFx(k)]))],['Stronghold Lv'+SL,{def:SL*2,hp:SL*10}]];
  ['weapon','armor','trinket'].forEach(s=>{const g=P.inv.find(x=>x.id===P.equip[s]);if(g)rows.push([(s===sl?'➡️ ':'')+g.name,Object.fromEntries(K.map(k=>[k,g[k]||0]))]);});
  const tot=stats(),cell=v=>v?`<td>${v>0&&rows?'+':''}${v}</td>`:'<td style="opacity:.35">·</td>';
  this.modal(`<h2>📊 Stat breakdown</h2><table class="statbrk" style="width:100%;font-size:13px;text-align:right"><tr><th style="text-align:left">From</th>${K.map(k=>`<th>${k.toUpperCase()}</th>`).join('')}</tr>${rows.map(([n,o])=>`<tr><td style="text-align:left">${n}</td>${K.map(k=>cell(o[k]||0)).join('')}</tr>`).join('')}<tr style="font-weight:700;border-top:1px solid #555"><td style="text-align:left">Total</td>${K.map(k=>`<td>${tot[k]}</td>`).join('')}</tr></table><button onclick="UI.closeModal()" style="width:100%;margin-top:10px">Close</button>`);};
