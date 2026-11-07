// news8 (test server): tab dots say what they are for. Each item names its tab + sub-tab; the sub-tab gets a dot,
// the tab shows a "What's new" line at the top, and the dot clears once that sub-tab has been seen.
function newsList(){P.news=P.news||[];return P.news;}
function newsAdd(tab,sub,text,key,sel){const L=newsList();key=key||tab+':'+sub+':'+text;const old=L.find(x=>x.key===key);if(old){old.n=(old.n||1)+1;old.t=Date.now();if(text)old.text=text;}else L.push({tab,sub,text,key,sel:sel||null,t:Date.now(),n:1});
  P.news=L.slice(-30);save();newsDots();}
function newsFor(tab,sub){return newsList().filter(x=>x.tab===tab&&(!sub||x.sub===sub));}
function newsDots(){try{for(const b of document.querySelectorAll('#tabs button[data-tab]')){const t=b.dataset.tab,on=newsFor(t).length>0&&!(UI.tab===t&&newsFor(t).every(x=>x.sub===UI.sub[t]));b.querySelector('.dot')?.remove();if(on)b.insertAdjacentHTML('beforeend','<i class="dot"></i>');}}catch(e){}}
// existing callers: map to the exact place
const _badge8=UI.badge.bind(UI);UI.badge=function(tab,on){if(on===false)return newsDots();if(!on)return _badge8(tab,on);_badge8(tab,on);};
const _qp8=questProg;questProg=function(type,n){const before=(P.quests&&P.quests.list||[]).filter(q=>q.done).length;const r=_qp8.apply(this,arguments);const now=(P.quests&&P.quests.list||[]).filter(q=>q.done&&!q.claimed);
  if(now.length&&(P.quests.list.filter(q=>q.done).length>before))newsAdd('player','quests',`📜 ${now.length} quest${now.length>1?'s':''} ready to claim`,'player:quests','.qclaim, button[onclick*="claimQ"]');return r;};
const _xp8=addXP;addXP=function(n){const l=P.lvl;const r=_xp8.apply(this,arguments);if(P.lvl>l)newsAdd('player','skills',`⬆️ Level ${P.lvl} · ${P.sp||1} skill point${(P.sp||1)>1?'s':''} to spend`,'player:skills');return r;};
const _sh8=shTick;shTick=function(){const S=P.stronghold,l=S&&S.level;const r=_sh8.apply(this,arguments);if(S&&S.level>l)newsAdd('base','fort',`🏰 Stronghold upgrade done (Lv${S.level})`,'base:fort:up');return r;};
const _rep8=report;report=function(text,win){const r=_rep8.apply(this,arguments);try{const t=String(text||'');if(/Tower finished|Stronghold is finished/i.test(t))newsAdd('base','fort',t.replace(/<[^>]+>/g,'').slice(0,60),'base:fort:built');else if(/Outpost/i.test(t))newsAdd('base','outposts',t.replace(/<[^>]+>/g,'').slice(0,60),'base:outposts');}catch(e){}return r;};
const _hr8=hordeReport;hordeReport=function(ev,when){const r=_hr8.apply(this,arguments);try{if(ev&&(ev.fights.length||ev.took.length)){const o=newsList().find(x=>x.key==='base:reports');const n=(o?o.n:0)+1;newsAdd('base','reports',`⚔️ ${n} new battle report${n>1?'s':''}`,'base:reports','.rep, .row');const x=newsList().find(x=>x.key==='base:reports');x.text=`⚔️ ${x.n} new battle report${x.n>1?'s':''}`;}}catch(e){}return r;};
// raids banner already badges alliance: name it
const _b8raid=UI.badge;UI.badge=function(tab,on){if(on&&tab==='alliance'&&!newsFor('alliance').length)newsAdd('alliance',(UI.SUBS.alliance.find(x=>/raid/i.test(x[0]))||UI.SUBS.alliance[0])[0],'☠️ A raid boss is up','alliance:raid');return _b8raid(tab,on);};
// render: dot on sub-tabs, "What's new" line, highlight, then mark this sub-tab seen
const _render8=UI.render;UI.render=function(){const r=_render8.apply(this,arguments);try{const t=this.tab;if(!t)return r;const sub=this.sub[t],all=newsFor(t),b=$('#sheetBody');if(!b)return r;
  b.querySelectorAll('.seg button').forEach((btn,i)=>{const k=(this.SUBS[t][i]||[])[0];if(k&&k!==sub&&all.some(x=>x.sub===k)&&btn.closest('.seg')===b.querySelector('.seg'))btn.insertAdjacentHTML('beforeend','<i class="dot subdot"></i>');});
  if(all.length){const seg=b.querySelector('.seg');const line=`<div class="newsline">🆕 ${all.map(x=>`<a onclick="UI.sub['${t}']='${x.sub}';UI.render()">${x.text}</a>`).join(' · ')}</div>`;if(seg)seg.insertAdjacentHTML('afterend',line);else b.insertAdjacentHTML('afterbegin',line);}
  const here=all.filter(x=>x.sub===sub);here.forEach(x=>{if(x.sel){const el=b.querySelector(x.sel);if(el)el.classList.add('newshl');}});
  if(here.length){P.news=newsList().filter(x=>!here.includes(x));save();}newsDots();}catch(e){console.warn('news',e);}return r;};
const _open8=UI.open;UI.open=function(){const r=_open8.apply(this,arguments);newsDots();return r;};
setTimeout(newsDots,3000);
