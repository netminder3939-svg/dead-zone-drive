// v20 Rewards pass: something good every session, and big moments feel big.
//  🏅 Achievements: 16 tracks × 3 tiers (bronze / silver / gold), paid automatically. Gold tiers unlock a title shown to the crew.
//  🏆 Crew milestones: goals the whole crew reaches together (from member docs). Every member claims each reward once.
//  🎁 Daily supply drop: first open each day (Pacific), 7-day streak that grows; day 7 has a Rare+ gear piece.
//  👑 Boss loot: raid bosses drop SET pieces from their own loot table (zone bosses can drop Legendary).
//  ⬆️ Level-up card: what you just earned.
P.ach=P.ach||{c:{},got:{}};
function achInc(k,n){P.ach=P.ach||{c:{},got:{}};P.ach.c[k]=(P.ach.c[k]||0)+(n||1);}
function achMax(k,v){P.ach=P.ach||{c:{},got:{}};P.ach.c[k]=Math.max(P.ach.c[k]||0,v||0);}
const ACH={tierName:['Bronze','Silver','Gold'],tierIcon:['🥉','🥈','🥇'],
  rewards:[{xp:60,res:{scrap:40}},{xp:180,res:{scrap:100,parts:12}},{xp:500,res:{scrap:250,food:100,water:100,fuel:50,parts:30}}],
  list:[
    ['hexes','🚩','Landgrabber','Hexes claimed',[25,250,2000],()=>P.contrib.hexes||0,'the Landgrabber'],
    ['km','🚗','Road Warrior','Km traveled',[10,100,1000],()=>Math.floor((P.stats.meters||0)/1000),'of the Long Road'],
    ['kills','☠️','Exterminator','Mutants put down',[25,250,2000],()=>P.stats.kills||0,'the Exterminator'],
    ['raids','👹','Giant Slayer','Boss raids joined',[3,25,100],()=>P.contrib.raids||0,'Giant Slayer'],
    ['badges','🗺️','Cartographer','Landmark badges',[5,30,120],()=>Object.keys(P.badges||{}).length,'the Cartographer'],
    ['level','⭐','Veteran','Level reached',[5,15,30],()=>P.lvl||1,'the Veteran'],
    ['zones','🏳️','Wallbuilder','Fortified zones at once',[1,3,8],()=>(P.ach.c.zones||0),'the Wallbuilder'],
    ['offs','📣','Unbroken','Offensives held',[1,5,15],()=>Object.keys(P.offClaimed||{}).length,'the Unbroken'],
    ['pipes','⛓️','Pipefitter','Pipelines switched on',[1,5,20],()=>(P.ach.c.pipes||0),'the Pipefitter'],
    ['assist','🤝','Wingman','Teammates\' pins driven',[1,5,20],()=>P.pipeAssists||0,'the Wingman'],
    ['troops','🪖','Warlord','Troops trained',[5000,50000,500000],()=>(P.ach.c.troops||0),'the Warlord'],
    ['marches','🚩','Field Marshal','Marches won',[10,100,500],()=>(P.ach.c.marches||0),'Field Marshal'],
    ['nests','🪺','Nest Breaker','Horde nests broken',[1,5,20],()=>(P.ach.c.nests||0),'Nest Breaker'],
    ['upgrade','⬆️','Tinkerer','Best gear upgrade',[3,6,10],()=>Math.max(0,...(P.inv||[]).map(g=>g.up||0)),'the Tinkerer'],
    ['legend','👑','Relic Hunter','Legendary items found',[1,3,10],()=>(P.ach.c.legend||0),'Relic Hunter'],
    ['streak','🎁','Loyal','Daily drop streak',[3,7,30],()=>(P.ach.c.streak||0),'the Loyal'],
  ].map(([id,icon,name,what,tiers,val,title])=>({id,icon,name,what,tiers,val,title}))};
function achTier(a){const v=a.val();let t=0;a.tiers.forEach((x,i)=>{if(v>=x)t=i+1;});return t;}
function achCheck(quiet){const got=P.ach.got;let any=false;for(const a of ACH.list){const t=achTier(a),had=got[a.id]||0;for(let k=had;k<t;k++){const R=ACH.rewards[k];addXP(R.xp);addRes(R.res);any=true;
    if(!quiet){toast(`${ACH.tierIcon[k]} ${a.name} ${ACH.tierName[k]}: ${a.what} ${a.tiers[k].toLocaleString()} · +${R.xp} XP`);try{if(k===2)allianceLog(`🥇 ${P.name} earned ${a.name} Gold: now "${P.name} ${a.title}"`);}catch(e){}}}
  if(t>had)got[a.id]=t;}if(any)save();}
// counters the old code doesn't keep
const _rw_train=trainTroops;trainTroops=function(n){const q0=troopsQueued();const r=_rw_train.apply(this,arguments);try{const d=troopsQueued()-q0;if(d>0)achInc('troops',d);}catch(e){}return r;};
const _rw_res=resolveMarch;resolveMarch=async function(id,m){const was=!!(P.marchDone||{})[id];const r=await _rw_res.apply(this,arguments);try{if(!was&&(P.marchDone||{})[id]&&m&&m.uid===P.uid&&m.win)achInc('marches');}catch(e){}return r;};
const _rw_flush=flushZoneBoss;flushZoneBoss=function(){const r=_rw_flush.apply(this,arguments);achInc('nests');return r;};
const _rw_roll=rollGear;rollGear=function(){const g=_rw_roll.apply(this,arguments);try{if(g&&g.rarity>=4)achInc('legend');}catch(e){}return g;};
// first run: pay out everything already earned from your history in one go, with one summary instead of a pile of toasts
setTimeout(()=>{try{if(!P||!P.world||P.ach.init)return;const n0=Object.values(P.ach.got).reduce((a,b)=>a+b,0);achCheck(true);P.ach.init=1;save();const n=Object.values(P.ach.got).reduce((a,b)=>a+b,0)-n0;if(n)toast(`🏅 ${n} achievement tier${n>1?'s':''} unlocked from your history: Hero › Achievements`);}catch(e){}},8000);
setInterval(()=>{try{if(!P||!P.world)return;achMax('zones',crewZones().filter(z=>z.st==='fortified').length);achMax('pipes',pipes().filter(p=>p.onT).length);achCheck();}catch(e){}},20e3);
// titles
function titleOf(){const t=P.title&&ACH.list.find(a=>a.id===P.title);return t&&(P.ach.got[t.id]||0)>=3?t.title:'';}
HOOK.member(function(o){try{const t=titleOf();if(t)o.title=t;o.offHeld=Object.keys(P.offClaimed||{}).length;}catch(e){}return o;});

// ---- crew milestones
const MILE=[
  ['m_hex100','🚩','Crew holds 100 hexes',()=>crewHeld()>=100,{xp:150,res:{scrap:100,food:60,water:60}}],
  ['m_hex500','🚩','Crew holds 500 hexes',()=>crewHeld()>=500,{xp:400,res:{scrap:250,parts:30}}],
  ['m_hex2000','🚩','Crew holds 2,000 hexes',()=>crewHeld()>=2000,{xp:1000,res:{scrap:600,parts:80},gear:3}],
  ['m_zone1','🏳️','First fortified zone',()=>crewFort()>=1,{xp:250,res:{scrap:150,parts:20}}],
  ['m_zone5','🏳️','5 fortified zones at once',()=>crewFort()>=5,{xp:700,res:{scrap:400,parts:50},gear:2}],
  ['m_zone15','🏳️','15 fortified zones at once',()=>crewFort()>=15,{xp:1500,res:{scrap:900,parts:120},gear:3}],
  ['m_kill500','☠️','Crew puts down 500 mutants',()=>crewSum('kills')>=500,{xp:300,res:{food:120,water:120}}],
  ['m_raid25','👹','Crew joins 25 boss raids',()=>crewSum('raids')>=25,{xp:500,res:{scrap:300,fuel:60},gear:2}],
  ['m_off1','📣','Crew holds an offensive',()=>crewMax('offHeld')>=1,{xp:400,res:{scrap:200,parts:30},gear:2}],
  ['m_off5','📣','Crew holds 5 offensives',()=>crewMax('offHeld')>=5,{xp:1200,res:{scrap:700,parts:100},gear:3}],
].map(([id,icon,text,done,reward])=>({id,icon,text,done,reward}));
function crewMembers(){return Object.values((G.al&&G.al.members)||{});}
function crewHeld(){try{return Object.values(G.terr||{}).filter(o=>o&&!o.ai&&!o.released&&o.uid).length||Object.keys(P.tiles).length;}catch(e){return 0;}}
function crewFort(){try{return crewZones().filter(z=>z.st==='fortified').length;}catch(e){return 0;}}
function crewSum(k){const m=crewMembers();const s=m.reduce((a,x)=>a+((x.contrib||{})[k]||0),0);return Math.max(s,(P.contrib||{})[k]||0);}
function crewMax(k){return Math.max(Object.keys(P.offClaimed||{}).length,...crewMembers().map(x=>x[k]||0));}
function claimMilestone(id){const m=MILE.find(x=>x.id===id);P.msClaimed=P.msClaimed||{};if(!m||P.msClaimed[id]||!m.done())return;P.msClaimed[id]=1;addXP(m.reward.xp);addRes(m.reward.res);let g=null;if(m.reward.gear){g=rollGear(P.lvl+3,m.reward.gear);P.inv.push(g);}
  save();toast(`🏆 ${m.text}: +${m.reward.xp} XP${g?' + '+g.name:''}`);UI.render();}
UI.SUBS.alliance.splice(2,0,['miles','🏆 Milestones']);
// ---- Hero › Achievements
UI.SUBS.player.push(['ach','🏅 Achievements']);
HOOK.render(function(){try{const b=$('#sheetBody');if(!b)return;
  if(this.tab==='player'&&this.sub.player==='ach'){achCheck(true);const golds=ACH.list.filter(a=>(P.ach.got[a.id]||0)>=3);
    b.insertAdjacentHTML('beforeend',`<h2>🏅 Achievements</h2><p class="tiny">Every tier pays out on its own. Gold tiers unlock a title your crew sees.</p>
     ${golds.length?`<div class="row"><div class="grow"><b>Title</b><small>Shown after your name on the roster</small></div><select onchange="P.title=this.value;save();pushMember();UI.render()"><option value="">None</option>${golds.map(a=>`<option value="${a.id}" ${P.title===a.id?'selected':''}>${P.name} ${a.title}</option>`).join('')}</select></div>`:''}
     ${ACH.list.map(a=>{const t=P.ach.got[a.id]||0,v=a.val(),next=a.tiers[t],prev=t?a.tiers[t-1]:0,pct=next?Math.min(100,Math.round(100*(v-prev)/(next-prev))):100;
       return`<div class="row ach t${t}"><span class="achic">${a.icon}</span><div class="grow"><b>${a.name}</b> <span>${[0,1,2].map(i=>i<t?ACH.tierIcon[i]:'▫️').join('')}</span><small>${a.what}: ${v.toLocaleString()}${next?` / ${next.toLocaleString()} for ${ACH.tierName[t]}`:' · complete'}</small><div class="zbar"><i style="width:${pct}%"></i></div></div></div>`;}).join('')}`);}
  if(this.tab==='alliance'&&this.sub.alliance==='miles'){P.msClaimed=P.msClaimed||{};
    b.insertAdjacentHTML('beforeend',`<h2>🏆 Crew milestones</h2><p class="tiny">Goals the whole crew reaches together. When one is done, every member claims the reward once.</p>
     ${MILE.map(m=>{const d=m.done(),c=P.msClaimed[m.id];return`<div class="row ms ${d?'done':''}"><span class="achic">${m.icon}</span><div class="grow"><b>${m.text}</b><small>+${m.reward.xp} XP · ${Object.entries(m.reward.res).map(([k,v])=>v+RES[k]).join(' ')}${m.reward.gear?' · '+RARITY[m.reward.gear].name+'+ gear':''}</small></div>${c?'<span>✅</span>':d?`<button class="btn-primary" onclick="claimMilestone('${m.id}')">Claim</button>`:'<span class="tiny">🔒</span>'}</div>`;}).join('')}`);}}catch(e){console.warn('rewards tab',e);}});
// roster shows titles
HOOK.render(function(){try{if(this.tab!=='alliance')return;const mem=(G.al&&G.al.members)||{};document.querySelectorAll('#sheetBody td').forEach(td=>{for(const m of Object.values(mem)){if(m.title&&td.textContent.trim().startsWith(m.name)&&!td.dataset.t){td.dataset.t=1;td.insertAdjacentHTML('beforeend',` <small class="ttl">${m.title}</small>`);}}});}catch(e){}});

// ---- boss loot: set pieces from each boss's table
const BOSS_SETS={boss_tank:['road','foreman'],boss_queen:['hazmat','pathfinder'],boss_warden:['warlord','road'],boss_crystal:['runner','warlord']};
const _rw_rc=raidClaim;raidClaim=function(id){const r=G.raids[id],before=P.raidLoot&&P.raidLoot[id];const n0=(P.inv||[]).length;const g=_rw_rc.apply(this,arguments);
  try{if(!before&&r&&r.won){const sets=BOSS_SETS[r.bossId]||Object.keys(GEAR_SETS),rnd=Math.random,setId=sets[Math.floor(rnd()*sets.length)],pieces=GEAR3_BASES.filter(b=>b.set===setId),b=pieces[Math.floor(rnd()*pieces.length)];
    const rar=r.zid&&rnd()<.15?4:Math.max(2,g&&g.rarity||2),it={id:'g'+Date.now()+Math.random().toString(36).slice(2,6),name:b.name,slot:b.slot,rarity:rar,iLvl:P.lvl+3,up:0};if(rar>=3)it.perk=g3Perk(rar);g3Apply(it);
    if(rar>=4)achInc('legend');const gi=g?P.inv.findIndex(x=>x.id===g.id):-1;if(gi>=0)P.inv[gi]=it;else P.inv.push(it);save(); /* the set piece REPLACES the old random drop */toast(`👑 ${MONSTERS[r.bossId].name} dropped ${RARITY[rar].name} ${b.name} (${GEAR_SETS[setId].name} set)`);}}catch(e){console.warn('boss loot',e);}return g;};

// ---- daily supply drop (7-day streak). v22: a small top-bar badge + one toast; the card opens only when tapped.
function dailyBadge(day){let b=document.getElementById('daily22');if(!b){b=document.createElement('button');b.id='daily22';b.className='chip';b.onclick=()=>{b.remove();G._dailyGo=true;dailyCheck();};const h=document.getElementById('hud');h&&h.insertBefore(b,document.getElementById('btnInbox'));if(!G._dailyToast){G._dailyToast=1;toast('🎁 Daily supply drop ready: tap the 🎁 badge');}}b.innerHTML=`🎁 Day ${day}`;}
const DAILY=[{scrap:30,food:20},{scrap:40,water:30},{scrap:50,food:30,water:30},{scrap:60,fuel:15,parts:5},{scrap:80,food:40,water:40,parts:8},{scrap:100,fuel:30,parts:12},{scrap:150,food:60,water:60,fuel:40,parts:20}];
function dailyCheck(){if(!P||!P.world||!P.name)return;const d=pacificDate();P.daily=P.daily||{last:'',streak:0};if(P.daily.last===d)return;
  if(document.querySelector('#modal:not(.hidden)'))return setTimeout(dailyCheck,4000);
  const y=pacificDate(Date.now()-864e5),streak=P.daily.last===y?P.daily.streak+1:1,day=((streak-1)%7)+1,R=DAILY[day-1];
  if(!G._dailyGo){dailyBadge(day);return;}G._dailyGo=false;
  UI.info({title:`🎁 Daily supply drop · day ${day}`,sub:`Streak ${streak} day${streak>1?'s':''}${day===7?' · gear piece included!':` · day 7 brings a Rare+ gear piece`}`,
    body:`<div class="dailyrow">${DAILY.map((x,i)=>`<div class="dd ${i+1<day?'past':i+1===day?'now':''}"><b>${i+1}</b><small>${i===6?'🎁':'📦'}</small></div>`).join('')}</div><p style="text-align:center">${Object.entries(R).map(([k,v])=>`+${v}${RES[k]}`).join(' ')}${day===7?' + Rare+ gear':''}</p>`,
    buttons:[['Claim',()=>{P.daily={last:d,streak};addRes(R);let g=null;if(day===7){g=rollGear(P.lvl+2,2);P.inv.push(g);}achMax('streak',streak);save();UI.closeModal();toast(`🎁 Supply drop claimed${g?': '+g.name:''}`);achCheck();}]]});}
setTimeout(dailyCheck,6000);setInterval(dailyCheck,10*60e3);

// ---- level-up card
const _rw_xp=addXP;addXP=function(){const L=P.lvl;const r=_rw_xp.apply(this,arguments);try{if(P.lvl>L)levelCard(L,P.lvl);}catch(e){}return r;};
function levelCard(from,to){if(document.querySelector('#modal:not(.hidden)'))return setTimeout(()=>levelCard(from,to),3000);const lines=[];
  for(let l=from+1;l<=to;l++){lines.push(`+1 skill point`);if(l%5===0)lines.push('+1 bonus skill point');if(l%2===0)lines.push('+1 class point');}
  UI.info({title:`⬆️ Level ${to}!`,sub:'You grow stronger',body:`<p style="text-align:center;font-size:15px">${[...new Set(lines)].map(x=>`<div>${x}${lines.filter(y=>y===x).length>1?' ×'+lines.filter(y=>y===x).length:''}</div>`).join('')}<div>+Attack, Defense and Health</div></p>`,buttons:[['🌳 Spend points',()=>{UI.closeModal();UI.open('player');UI.sub.player='skills';UI.render();}]]});}
