// v23b (TEST) Horde economy + diplomacy. Fixed math, catch-up safe (all from timestamps), lives in the shared horde doc (fx).
// Bank per clan: troops + resources. Income 100 res/h + 5/h per held hex; converts up to 150 res -> 150 troops per hour.
// Each sortie commits 300 troops (lost if beaten, 80% back if it comes home). Offensive costs 2,000 and only launches if a clan has 5,000+.
// Regrouping 12 h when a clan lost >40% of what it committed in the last 24 h, or troops < 800: no sorties, no offensives.
// Truces 24/48/72 h: clan says yes if score >= 40 (regrouping +50, troops < 3,000 +30, you pay tribute +20, troops > 7,000 -40).
// Tribute = 100 scrap per 24 h (goes to the clan bank). A regrouping clan pays YOU 30 scrap per 24 h instead (the perk).
// Breaking: you break -> clan Enraged 24 h (+20% squad power). Horde breaks on its own once its troops reach 7,000.
const HE={start:{troops:3000,res:2000},resPerH:100,resPerHex:5,convPerH:150,capBase:10000,capPerTier:0.5,sortie:300,refund:0.8,offCost:2000,offMin:5000,
  regroupH:12,lossPct:0.40,lowTroops:800,winH:24,breakAt:7000,enrageH:24,enrage:0.20,tribute:100,perk:30,accept:40};
function bankOf(f){if(!f)return null;const t=Date.now();if(!f.bank)f.bank={troops:HE.start.troops,res:HE.start.res,t,log:[]};const b=f.bank;b.log=b.log||[];
  const h=Math.max(0,(t-b.t)/3600e3);if(h>0){const hexes=Object.keys(f.tiles||{}).length,cap=HE.capBase*(1+HE.capPerTier*(f.tier||0));b.res+=h*(HE.resPerH+HE.resPerHex*hexes);
    const conv=Math.min(b.res,h*HE.convPerH,Math.max(0,cap-b.troops));b.troops+=conv;b.res-=conv;b.t=t;}
  b.log=b.log.filter(x=>t-x.t<HE.winH*3600e3);const com=b.log.filter(x=>x.k==='c').reduce((a,x)=>a+x.n,0),lost=b.log.filter(x=>x.k==='l').reduce((a,x)=>a+x.n,0);
  if(!(b.regroupUntil>t)&&((com>0&&lost/com>HE.lossPct)||b.troops<HE.lowTroops)){b.regroupUntil=t+HE.regroupH*3600e3;b.log=[];try{allianceLog(`⏸️ A horde clan is regrouping for ${HE.regroupH} h after heavy losses`);}catch(e){}}
  return b;}
function clanState(fid){const f=(FX().f||{})[fid],b=bankOf(f),t=Date.now(),tr=treatyOf(fid);return{troops:Math.round(b.troops),res:Math.round(b.res),regroup:b.regroupUntil>t?b.regroupUntil-t:0,enraged:b.enragedUntil>t?b.enragedUntil-t:0,treaty:tr,strong:b.troops>=HE.offMin};}
function bankSpend(fid,n,k){const f=(FX().f||{})[fid];if(!f)return;const b=bankOf(f);b.troops=Math.max(0,b.troops-n);b.log.push({k:k||'c',n,t:Date.now()});try{fxDirty();}catch(e){}}
function bankLoss(fid,n){const f=(FX().f||{})[fid];if(!f)return;const b=bankOf(f);b.log.push({k:'l',n,t:Date.now()});bankOf(f);}
function bankRefund(fid,n){const f=(FX().f||{})[fid];if(!f)return;const b=bankOf(f);b.troops+=n;}
// ---- treaties (stored in fx.treaty[fid])
function treatyOf(fid){const fx=FX();const tr=(fx.treaty||{})[fid];return tr&&tr.until>Date.now()?tr:null;}
function truceScore(fid,tribute){const s=clanState(fid);return(s.regroup?50:0)+(s.troops<3000?30:0)+(tribute?20:0)-(s.troops>7000?40:0);}
function proposeTruce(fid,hours,tribute){const fx=FX();fx.treaty=fx.treaty||{};const s=clanState(fid),sc=truceScore(fid,tribute),d=fdef(fid);
  if(sc<HE.accept){toast(`🕊️ The ${d.name} refuse (score ${sc}/${HE.accept}). Hit them harder or offer tribute.`);return false;}
  const perk=!!s.regroup&&!tribute,cost={scrap:HE.tribute*hours/24};if(tribute){if(!canPay(cost)){toast('Need '+cost.scrap+'🔩 for tribute');return false;}pay(cost);(FX().f[fid].bank).res+=cost.scrap;}
  if(perk)addRes({scrap:HE.perk*hours/24});fx.treaty[fid]={until:Date.now()+hours*3600e3,t:Date.now(),by:P.name,tribute:!!tribute,perk};save();try{publishHorde();}catch(e){}
  allianceLog(`🕊️ ${P.name} made a ${hours} h truce with the ${d.name}${tribute?' (tribute paid)':perk?' (they pay us)':''}`);toast(`🕊️ Truce with the ${d.name} for ${hours} h`);drawClans();UI.closeModal&&UI.closeModal();return true;}
function breakTruce(fid,byHorde){const fx=FX();if(!treatyOf(fid))return;delete fx.treaty[fid];const d=fdef(fid);
  if(!byHorde){const b=bankOf(FX().f[fid]);b.enragedUntil=Date.now()+HE.enrageH*3600e3;allianceLog(`💢 ${P.name} broke the truce with the ${d.name}: they are ENRAGED for ${HE.enrageH} h (+${HE.enrage*100}% power)`);}
  else allianceLog(`💢 The ${d.name} broke the truce: they feel strong again`);save();try{publishHorde();}catch(e){}drawClans();}
// ---- hooks into the horde sim
const _sqs23=squadStep;squadStep=function(f,fid,s,k,t,ev){try{const b=bankOf(f);if(b.regroupUntil>t){s.restUntil=Math.max(s.restUntil||0,b.regroupUntil);s.path=[];return;}
    const tr=treatyOf(fid);if(tr&&b.troops>=HE.breakAt)breakTruce(fid,true);else if(tr&&s.path&&s.path.length&&allied(s.path[0])){s.path=[];s.restUntil=t+6*3600e3;return;}
    const had=s.path&&s.path.length,held0=ev&&ev.held?ev.held.length:0;if(!had&&b.troops<HE.sortie){s.restUntil=t+3600e3;return;}
    const r=_sqs23.apply(this,arguments);
    if(!had&&s.path&&s.path.length)bankSpend(fid,HE.sortie,'c');
    if(ev&&ev.held&&ev.held.length>held0)bankLoss(fid,HE.sortie);
    else if(had&&(!s.path||!s.path.length)&&!(s.woundUntil>t))bankRefund(fid,Math.round(HE.sortie*HE.refund));
    return r;}catch(e){return _sqs23.apply(this,arguments);}};
const _sp23=squadPower;squadPower=function(f,s,t){const p=_sp23.apply(this,arguments);try{const b=bankOf(f);if(b.enragedUntil>(t||Date.now()))return Math.round(p*(1+HE.enrage));}catch(e){}return p;};
const _off23=offensive;offensive=function(){try{const fx=FX();if(!fx||!fx.start)return null;const c=offCycle();if(!(fx.off&&fx.off.cycle===c)){const ids=Object.keys(fx.f||{}).filter(id=>{const s=clanState(id);return s.strong&&!s.regroup&&!s.treaty;});
    if(!ids.length)return null;const o=_off23.apply(this,arguments);if(o&&!o.spent){const best=ids.sort((a,b)=>clanState(b).troops-clanState(a).troops)[0];bankSpend(best,HE.offCost,'c');o.spent=best;}return o;}}catch(e){}return _off23.apply(this,arguments);};
const _rs23=resolveMarch;resolveMarch=async function(id,m){const r=await _rs23.apply(this,arguments);try{if(m&&m.kind==='intercept'&&/Caught the/.test(m.result||'')&&!m._bl23){m._bl23=1;bankLoss(m.fid,HE.sortie);}}catch(e){}return r;};
// ---- UI: clan card, map tags, Alliance tab
function clanRows(fid){const s=clanState(fid),fmt=ms=>fmtDur(ms).replace(/ \d+s$/,'');
  return`<div class="clan23"><div><b>🪖 ${s.troops.toLocaleString()}</b><small>troops</small></div><div><b>📦 ${s.res.toLocaleString()}</b><small>bank</small></div><div><b>${s.regroup?'⏸️ '+fmt(s.regroup):s.strong?'💪 Strong':'Normal'}</b><small>${s.regroup?'regrouping':'state'}</small></div></div>
    ${s.enraged?`<p class="tiny" style="color:#ff8a76">💢 Enraged ${fmt(s.enraged)} (+${HE.enrage*100}% power)</p>`:''}${s.treaty?`<p class="tiny" style="color:#9fe0a8">🕊️ Truce: ${fmt(s.treaty.until-Date.now())} left${s.treaty.tribute?' · tribute paid':s.treaty.perk?' · they pay us':''}</p>`:''}`;}
function truceBtns(fid){const s=clanState(fid);if(s.treaty)return`<div class="seg"><button onclick="breakTruce('${fid}')">💢 Break truce (they get Enraged ${HE.enrageH} h)</button></div>`;
  return`<small>Offer a truce (they agree at score ${HE.accept}+; now: ${truceScore(fid,false)} plain / ${truceScore(fid,true)} with tribute)</small><div class="seg">${[24,48,72].map(h=>`<button onclick="proposeTruce('${fid}',${h},false)">🕊️ ${h} h</button>`).join('')}${[24,48,72].map(h=>`<button onclick="proposeTruce('${fid}',${h},true)">💰 ${h} h (${HE.tribute*h/24}🔩)</button>`).join('')}</div>`;}
window.proposeTruce=proposeTruce;window.breakTruce=breakTruce;window.clanState=clanState;window.HE=HE;window.bankOf=bankOf;
const _ifb=UI.infoFaction;UI.infoFaction=function(id){_ifb.apply(this,arguments);try{const x=factionAt(id);if(!x)return;const box=document.querySelector('#modalBody .ibtns');box&&box.insertAdjacentHTML('beforebegin',`<h3>🏴 Clan strength</h3>${clanRows(x.fid)}${truceBtns(x.fid)}`);}catch(e){console.warn('clan',e);}};
function drawClans(){if(typeof map==='undefined'||!P.world)return;if(!G.layers.clan23)G.layers.clan23=L.layerGroup().addTo(map);const g=G.layers.clan23;g.clearLayers();if(map.getZoom()<12)return;
  for(const [fid,f] of Object.entries(FX().f||{})){if(!f||!f.home)continue;const s=clanState(fid),tag=s.treaty?`🕊️ Truce ${fmtDur(s.treaty.until-Date.now()).replace(/ \d+s$/,'')}`:s.regroup?`⏸️ Regrouping ${fmtDur(s.regroup).replace(/ \d+s$/,'')}`:s.enraged?'💢 Enraged':`🪖 ${typeof kfmt==='function'?kfmt(s.troops):s.troops}`;
    L.marker(hexCenter(...idQR(f.home)),{icon:L.divIcon({className:'lodm',html:`<div class="clantag23 ${s.treaty?'tr':s.regroup?'rg':''}">${fdef(fid).name}: ${tag}</div>`,iconSize:[0,0]}),interactive:false,zIndexOffset:720}).addTo(g);}}
HOOK.draw(function(){try{drawClans();}catch(e){}});setInterval(()=>{try{drawClans();}catch(e){}},30000);
HOOK.render(function(){try{if(this.tab!=='alliance'||(this.sub.alliance||'overview')!=='overview')return;const b=document.querySelector('#sheetBody');if(!b)return;
  const rows=Object.keys(FX().f||{}).map(fid=>`<div class="row"><div class="grow"><b>${fdef(fid).icon||''} ${fdef(fid).name}</b>${clanRows(fid)}${truceBtns(fid)}</div></div>`).join('');
  b.insertAdjacentHTML('beforeend',`<h2>🏴 Horde clans · treaties</h2>${rows||'<p class="tiny">No clans nearby.</p>'}`);}catch(e){}});
