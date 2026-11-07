// fix13 (TEST · ddd-v26-12e..12g) Audit fixes, Nov 7.
//  1) Stuck notifications. Tab dots and "What's new" lines now (a) file under the sub-tab that really exists,
//     (b) clear when that sub-tab is opened, (c) vanish on their own when the thing they point at is gone
//     (raid boss escaped or killed, plan mark deleted / done / expired, quest claimed, skill points spent).
//     Root causes: Plan's render never ran the news clear-out (shell2/step6 bypass it), and the Alliance
//     regroup (v26c) renders old part names (over/members/...) so items filed under "crew" could never match.
//     Nothing checked whether a raid or mark still existed.
//  2) Pipeline guard troops. Adding guards re-picked the "most exposed" hex each time. When the horde moved,
//     new guards went to a new hex and the pipe forgot the old group: it kept sitting on the old hex, out of
//     the fight, not recallable from the pipe card, and never came home. Removing a pipe left its guards out too.
//     Now: extra guards join the existing group, removing a pipe recalls its guards, and a sweeper walks any
//     orphaned group home (visible as Returning, with a report).
//  3) March troops whose march finished on another device or vanished stay "away" forever. Sweeper brings them home.
//  4) (12f) Wounded with no bed no longer die; see troops2.js. Losing defenders retreat with 20%; see v26a.js.
//  5) The one-off Pope profile repair (v26e/v26f) kept running every 8-10 s and unlocked pipeline sites near
//     owned land without a drive. That breaks "pipelines only by driving" and the 12d no-grants rule. Retired.
(function(){
'use strict';
const now=()=>Date.now();
const BOOT13=now();

// ================= 1) notifications =================
function liveRaids13(){try{return Object.values(G.raids||{}).filter(r=>r&&!r.done&&now()<r.endsAt).sort((a,b)=>a.endsAt-b.endsAt);}catch(e){return[];}}
function groupOf13(tab,sub){
  try{
    if(tab==='plan')return'stub';
    if(tab==='alliance'&&typeof AT26!=='undefined'){if(AT26[sub])return sub;for(const [k,v] of Object.entries(AT26))if(v.parts.includes(sub))return k;
      if(/raid/i.test(String(sub||'')))return'crew';return'crew';}
    const subs=(UI.SUBS[tab]||[]).map(x=>x[0]);if(subs.length&&!subs.includes(sub))return subs[0];
  }catch(e){}
  return sub;}
// does the thing this news item points at still exist?
function stillTrue13(x){
  try{
    const k=String(x.key||'');
    if(k==='alliance:raid')return liveRaids13().length>0;
    if(k.startsWith('mark:')){
      const M=G.markers||{};
      // markers arrive a little after boot; do not drop mark news before we have heard from the server
      if(!Object.keys(M).length&&now()-BOOT13<90e3)return true;
      const m=M[k.slice(5)];
      return !!(m&&!m.done&&(typeof m2live!=='function'||m2live(m)));}
    if(k==='player:quests')return !!(P.quests&&(P.quests.list||[]).some(q=>q.done&&!q.claimed));
    if(k==='player:skills')return (P.sp||0)>0;
    // anything else: expire after 3 days so nothing can sit there forever
    return now()-(x.t||0)<3*86400e3;
  }catch(e){return true;}}
function tidy13(){
  try{
    if(typeof newsList!=='function')return false;
    const L=newsList();let ch=false;
    for(const x of L){const g=groupOf13(x.tab,x.sub);if(g!==x.sub){x.sub=g;ch=true;}}
    // merge duplicates created by the remap (same key)
    const seen=new Set(),keep=[];
    for(const x of L){if(seen.has(x.key)){ch=true;continue;}seen.add(x.key);if(!stillTrue13(x)){ch=true;continue;}keep.push(x);}
    if(ch){P.news=keep;try{save();}catch(e){}}
    return ch;
  }catch(e){console.warn('tidy13',e);return false;}}
window.tidy13=tidy13;

// newsAdd: file under the real sub-tab from the start
if(typeof newsAdd==='function'){const _na13=newsAdd;newsAdd=function(tab,sub,text,key,sel){return _na13.call(this,tab,groupOf13(tab,sub),text,key,sel);};window.newsAdd=newsAdd;}

// tab dots: tidy first, then the news8 rule (dot when there is something unseen)
if(typeof newsDots==='function'){const _nd13=newsDots;newsDots=function(){tidy13();return _nd13.apply(this,arguments);};window.newsDots=newsDots;}

// the outermost render: one clean "What's new" line, sub-tab dots on the real sub-tabs, clear what is on screen
const _r13=UI.render;UI.render=function(){
  const r=_r13.apply(this,arguments);
  try{
    const t=this.tab,b=document.getElementById('sheetBody');if(!t||!b||typeof newsFor!=='function')return r;
    tidy13();
    b.querySelectorAll('.newsline').forEach(e=>e.remove());b.querySelectorAll('.subdot').forEach(e=>e.remove());
    const sub=t==='plan'?'stub':this.sub[t],all=newsFor(t);
    const seg=b.querySelector(':scope > .seg')||b.querySelector('.seg');
    if(seg&&t!=='plan')seg.querySelectorAll('button').forEach((btn,i)=>{const k=((this.SUBS[t]||[])[i]||[])[0];if(k&&k!==sub&&all.some(x=>x.sub===k))btn.insertAdjacentHTML('beforeend','<i class="dot subdot"></i>');});
    const other=all.filter(x=>x.sub!==sub);
    if(other.length){
      const line=document.createElement('div');line.className='newsline';line.textContent='🆕 ';
      other.forEach((x,i)=>{if(i)line.appendChild(document.createTextNode(' · '));const a=document.createElement('a');a.textContent=x.text;a.href='#';
        a.onclick=ev=>{ev.preventDefault();if(x.key==='alliance:raid'){const lr=liveRaids13()[0];if(lr){UI.raid(lr.id);return;}tidy13();UI.render();return;}UI.sub[t]=x.sub;UI.render();};
        line.appendChild(a);});
      if(seg)seg.after(line);else b.prepend(line);}
    // what is on screen now counts as seen
    const here=all.filter(x=>x.sub===sub);
    here.forEach(x=>{if(x.sel){try{const el=b.querySelector(x.sel);if(el)el.classList.add('newshl');}catch(e){}}});
    if(here.length){P.news=newsList().filter(x=>!here.includes(x));try{save();}catch(e){}}
    if(t==='alliance'){G._seenRaids=G._seenRaids||{};liveRaids13().forEach(x=>G._seenRaids[x.id]=1);}
    if(typeof newsDots==='function')newsDots();
  }catch(e){console.warn('news13',e);}
  return r;};

// raid alerts: only while a raid is actually up and unseen
const _rb13=UI.raidBanner;UI.raidBanner=function(){const r=_rb13.apply(this,arguments);try{tidy13();if(typeof newsDots==='function')newsDots();}catch(e){}return r;};
setInterval(()=>{try{if(tidy13()&&typeof newsDots==='function')newsDots();}catch(e){}},5000);
setTimeout(()=>{try{tidy13();newsDots&&newsDots();}catch(e){}},1500);

// ================= 2) pipeline guards =================
function hexOk13(h){try{if(P.tiles&&P.tiles[h])return true;const w=W();if(w.towers&&w.towers[h])return true;if(w.sh&&w.sh.hex===h)return true;
  if(typeof _al26==='function'&&_al26(h))return true;}catch(e){}return false;}
function guardHexes13(){const s=new Set();try{for(const p of pipes())if(p.guard25&&p.guard25.hex)s.add(p.guard25.hex);}catch(e){}return s;}
// adding guards to a line that already has a group joins that group (no second, forgotten group)
if(typeof guardLine==='function'){const _gl13=guardLine;guardLine=function(id,n,esc){
  try{const p=pipes().find(x=>x.id===id);const g=p&&p.guard25;
    if(g&&g.hex&&stationed()[g.hex]&&(p.route||[]).includes(g.hex)){
      if(TP().home<=0)return toast('🪖 No troops at home. Train some in Base › Barracks first.');
      stationTroops(g.hex,n);g.esc=true;save();try{pushMember();}catch(e){}try{UI.closeModal&&UI.closeModal();}catch(e){}try{drawPipes();}catch(e){}
      return toast('🚚 +'+(+n||0).toLocaleString()+' troops joined the '+p.name+' guard');}}catch(e){console.warn('guard13',e);}
  return _gl13.apply(this,arguments);};window.guardLine=guardLine;}
// removing a pipeline sends its guards home
if(typeof removePipe==='function'){const _rp13=removePipe;removePipe=function(id){try{const p=pipes().find(x=>x.id===id),h=p&&p.guard25&&p.guard25.hex;
    if(h&&stationed()[h]&&!pipes().some(x=>x.id!==id&&x.guard25&&x.guard25.hex===h)&&!hexOk13(h))sendHome25(h,stationed()[h].n,'pipeline removed');}catch(e){console.warn('rmpipe13',e);}
  return _rp13.apply(this,arguments);};window.removePipe=removePipe;}
// sweeper: groups sitting on a hex that is not ours, not an ally's, and not a pipe guard post walk home.
// Two looks five minutes apart before acting, never in the first 3 minutes after load.
const orphanSeen13={};
function sweepStations13(){
  try{if(!P||!P.world||now()-BOOT13<180e3)return;
    const S=stationed(),gh=guardHexes13(),t=now();let moved=0,list=[];
    for(const [h,s] of Object.entries(S)){
      if(!s||!(s.n>0)){if(s&&!(s.n>0)&&t>=(s.at||0)){delete S[h];}continue;}
      if(t<(s.at||0)){delete orphanSeen13[h];continue;}         // still marching there
      if(gh.has(h)||hexOk13(h)){delete orphanSeen13[h];continue;}
      if(!orphanSeen13[h]){orphanSeen13[h]=t;continue;}
      if(t-orphanSeen13[h]<5*60e3)continue;
      delete orphanSeen13[h];moved+=s.n;list.push(hexName(h));sendHome25(h,s.n,'post lost');}
    if(moved){report(`↩️ ${moved.toLocaleString()} troops were left on ${list.length>1?list.length+' posts':list[0]} the crew no longer holds. They are marching home now.`,true);save();}
  }catch(e){console.warn('sweep13',e);}}
setInterval(sweepStations13,60e3);

// ================= 3) march troops stuck "away" =================
const awayMiss13={};
function sweepAway13(){
  try{if(!P||!P.world||now()-BOOT13<180e3||!G.marches)return;const t=TP(),A=t.away||{};let back=0;
    for(const [id,n] of Object.entries(A)){
      if(G.marches[id]){delete awayMiss13[id];continue;}
      if(!awayMiss13[id]){awayMiss13[id]=now();continue;}
      if(now()-awayMiss13[id]<10*60e3)continue;
      delete awayMiss13[id];delete A[id];if(n>0){t.home+=n;back+=n;}}
    if(back){report(`🏠 ${back.toLocaleString()} troops from a finished march were not counted home. They are home now.`,true);save();try{pushMember();}catch(e){}}
  }catch(e){console.warn('away13',e);}}
setInterval(sweepAway13,60e3);

// ================= 5) the one-off Pope profile repair is switched off inside v26e.js / v26f.js (12e) =================

// ================= 6) player names cannot carry markup =================
// Names are shown raw in march flags, the activity feed and raid cards. Strip < > & " ' and cap the length.
function cleanName13(){try{if(P&&typeof P.name==='string'){const c=P.name.replace(/[<>&"'`]/g,'').trim().slice(0,24);if(c&&c!==P.name){P.name=c;save();try{pushMember();}catch(e){}}}}catch(e){}}
setInterval(cleanName13,5000);setTimeout(cleanName13,1000);

window.FIX13={tidy:tidy13,sweepStations:sweepStations13,sweepAway:sweepAway13,groupOf:groupOf13,stillTrue:stillTrue13};
})();
