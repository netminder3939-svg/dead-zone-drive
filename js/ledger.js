// Stage 2c: personal transaction log. Every resource change is recorded with a category.
// All automatic income (daily reset payout, after upkeep and the 25% alliance share) is grouped into ONE line per day.
// Fights, builds, donations and losses stay as their own lines. Filter chips: All / Income / Combat.
const TX_MAX=150;let _txDepth=0;
function txSnap(){return{...P.res};}
function txDelta(a){const d={};for(const k of Object.keys(RES)){const v=(P.res[k]||0)-(a[k]||0);if(v)d[k]=v;}return d;}
function txAdd(cat,label,d,t=Date.now()){if(!Object.keys(d).length)return;P.ledger=P.ledger||[];
  if(cat==='income'){const day=pacificDate(t),e=P.ledger.find(x=>x.cat==='income'&&x.day===day);
    if(e){for(const k in d)e.d[k]=(e.d[k]||0)+d[k];e.t=t;e.n=(e.n||1)+1;return save();}
    P.ledger.unshift({cat,label:'Daily income',day,d,t,n:1});}
  else P.ledger.unshift({cat,label,d,t});
  P.ledger=P.ledger.slice(0,TX_MAX);save();}
// wrap a global function: the outermost tagged call records the net resource change it caused (sync + async parts)
function txTag(name,cat,label){const fn=globalThis[name]||window[name];if(typeof fn!=='function')return;
  const w=function(...a){if(_txDepth)return fn.apply(this,a);const s=txSnap();_txDepth++;let r;
    try{r=fn.apply(this,a);}finally{_txDepth--;}
    const lab=typeof label==='function'?label(a):label;
    if(r&&typeof r.then==='function')return r.then(v=>{txAdd(cat,lab,txDelta(s));return v;},e=>{txAdd(cat,lab,txDelta(s));throw e;});
    txAdd(cat,lab,txDelta(s));return r;};
  try{eval(name+'=w');}catch(e){window[name]=w;}}
const MN=id=>(MONSTERS[id]||{}).name||id;
[['payReset','income','Daily income'],
 ['fightMutant','combat',a=>'Fight: '+MN(a[0])],['fightFort','combat','Assault: Raider Stronghold'],['fightFaction','combat',a=>{const x=factionAt(a[0]);return 'Fight: '+(x?fdef(x.fid).name:'gang')+(x&&x.home?' HQ':'');}],
 ['raidAttack','combat','Boss raid'],['raidClaim','combat','Boss raid loot'],['factionCatchUp','combat','Horde attacks'],['aiAttack','combat','Horde attack (demo)'],
 ['shUpgrade','build','Stronghold upgrade'],['placeStronghold','build','Stronghold build'],['placeTower','build','Tower build'],['upgradeTower','build','Tower upgrade'],['repairTower','build','Tower repair'],
 ['patchStruct','build','Repair'],['relocateStronghold','build','Stronghold move'],['placeOutpost','build','Outpost'],['respecSkills','build','Skill reset'],
 ['bankTx','donation',a=>G.bankMode==='withdraw'?'Bank withdrawal':'Bank donation'],
 ['opsClaim','reward','Operation reward'],['checkLandmarks','reward','Landmark badge']].forEach(x=>txTag(...x));
// anything else (quests, salvage, etc.) lands as "Other" via a light poll so totals always add up
let _txLast=null;setInterval(()=>{if(!P.res)return;if(_txLast&&!_txDepth){const d=txDelta(_txLast);if(Object.keys(d).length)txAdd('other','Other (quests, salvage, loot)',d);}_txLast=txSnap();},1500);
const _txAdd=txAdd;txAdd=function(...a){_txAdd(...a);_txLast=txSnap();};
const TXC={all:['All',()=>true],income:['Income',x=>x.cat==='income'],combat:['Combat',x=>x.cat==='combat']};
const TXI={income:'🌅',combat:'⚔️',build:'🏗️',donation:'🏦',reward:'🎖️',other:'📦'};
function txLine(x){const d=Object.entries(x.d).map(([k,v])=>`<span class="${v>0?'pos':'neg'}">${v>0?'+':''}${v} ${RESN2[k]}</span>`).join(', ');
  return`<div class="row tx tx-${x.cat}"><span class="big-ico">${TXI[x.cat]||'📦'}</span><div class="grow"><b>${x.cat==='income'?`Daily income · ${x.day}`:x.label}</b><small>${d}</small><small>${when(x.t)}${x.cat==='income'?' · after tower upkeep and the 25% alliance share':''}</small></div></div>`;}
UI.SUBS.inv.splice(1,0,['ledger','📒 Log']);
// group the Alliance bank's automatic shares too: one line per member per day
function groupBankLog(log){const out=[],idx={};(log||[]).forEach(x=>{if(x.kind!=='auto-share'){out.push(x);return;}const k=x.uid+'|'+pacificDate(x.t);
  if(idx[k]){idx[k].parts[x.res]=(idx[k].parts[x.res]||0)+x.amt;return;}idx[k]={...x,grouped:true,parts:{[x.res]:x.amt}};out.push(idx[k]);});return out;}
const _renderTx=UI.render;UI.render=function(){_renderTx.call(this);const b=$('#sheetBody');if(!b)return;
  if(this.tab==='inv'&&this.sub.inv==='ledger'){const f=G.txf||'all',L=(P.ledger||[]).filter(TXC[f][1]);
    b.insertAdjacentHTML('beforeend',`<h2>📒 Transaction log</h2><div class="seg chips">${Object.entries(TXC).map(([k,[n]])=>`<button class="${f===k?'on':''}" onclick="G.txf='${k}';UI.render()">${n}</button>`).join('')}</div>
      ${L.map(txLine).join('')||'<p class="tiny">Nothing here yet.</p>'}<p class="tiny">Automatic income is grouped into one line per day. Last ${TX_MAX} entries.</p>`);}
  if(this.tab==='alliance'&&this.sub.alliance==='bank'){const tb=b.querySelector('table.log2');if(tb){const A=G.al||{log:[]};
    tb.innerHTML=`<tr><th>When</th><th>Member</th><th>Change</th><th>Balance</th></tr>`+groupBankLog(A.log).map(x=>x.grouped?`<tr><td>${when(x.t)}</td><td>${x.member}</td><td class="pos">Daily share: ${Object.entries(x.parts).map(([k,v])=>'+'+v+' '+RES[k]).join(' ')}<br><span class="tag">auto 25%</span></td><td>—</td></tr>`
      :`<tr><td>${when(x.t)}</td><td>${x.member}</td><td class="${x.amt>0?'pos':'neg'}">${x.amt>0?'+':''}${x.amt} ${RES[x.res]}${x.kind==='research'?'<br><span class="tag">research</span>':''}</td><td>${x.bal}</td></tr>`).join('');}}};

// ---- invite link (alliance = team code) ----
function inviteLink(){const t=localStorage.getItem('wl_team')||window.DEFAULT_TEAM;return location.origin+location.pathname+'?team='+encodeURIComponent(t);}
async function shareInvite(){const url=inviteLink(),txt='Join my Dead Zone Drive alliance: '+url;try{if(navigator.share){await navigator.share({title:'Dead Zone Drive',text:txt,url});return;}}catch(e){}
  try{await navigator.clipboard.writeText(url);toast('Invite link copied');}catch(e){prompt('Copy this invite link:',url);}}
const _renderInv=UI.render;UI.render=function(){_renderInv.call(this);if(this.tab==='alliance'&&this.sub.alliance==='over'){const b=$('#sheetBody'),h=b&&b.querySelector('h2');
  if(h)h.insertAdjacentHTML('afterend',`<div class="row"><div class="grow">Team code: <b>${localStorage.getItem('wl_team')||window.DEFAULT_TEAM}</b><small>${NET.mode==='local'?'Demo mode (offline)':'Live: everyone with this code is in your alliance'}</small></div><button onclick="shareInvite()">📨 Invite</button></div>`);}};
