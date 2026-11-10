// card1 (R1) One card manager. Loaded last, so it wraps every older layer.
//  Why: "close card" ran through five layers of older code. If any one of them threw, the card stayed open, so X
//  sometimes needed several taps. Fight cards also skipped the Back/Esc stack, and an old fight's playback timer could
//  keep writing its result onto the next fight card. And cards the game opens on its own (march results, raid alerts)
//  could pop up the moment you closed another one, which looked like the X had not worked.
//  1) Closing always hides the card first, then runs the older cleanup steps, each failure caught and logged.
//  2) Every fight card registers with Back/Esc, and a newer card stops the older card's playback.
//  3) A fight card or raid alert the game opens on its own (a march arriving, a raid) while you are looking at another
//     card, or within 2 s of closing one, waits in a short queue. A bar says how many are waiting; tapping it opens the next. Nothing is dropped.
(function(){
  const q=s=>document.querySelector(s);
  const CARD1={lastClose:0,lastTap:0,queue:[],token:0};
  window.CARD1=CARD1;
  document.addEventListener('pointerdown',()=>{CARD1.lastTap=Date.now();},true);
  document.addEventListener('keydown',()=>{CARD1.lastTap=Date.now();},true);
  const isOpen=()=>{const m=q('#modal');return !!m&&!m.classList.contains('hidden');};
  // ---------- 1) close: hide first, then the older cleanup
  const _close=UI.closeModal;
  UI.closeModal=function(){
    try{const m=q('#modal');if(m)m.classList.add('hidden');}catch(e){}
    try{this.raidOpen=null;}catch(e){}
    CARD1.token++;CARD1.lastClose=Date.now();
    try{Layers.drop('modal');}catch(e){}
    try{_close.apply(this,arguments);}catch(e){console.warn('card1: cleanup step failed after close',e);}
    try{const m=q('#modal');if(m)m.classList.add('hidden');}catch(e){} // an older step must not leave it open
    setTimeout(bar,0);};
  // ---------- 2) fight cards: Back/Esc closes them, and a newer card ends the older playback
  const _rp=UI.replay;
  UI.replay=function(o){
    // a march arriving is always the game's own popup; other fight cards only when no tap opened them
    const own=!!G._marchId||auto();
    if(own&&(isOpen()||Date.now()-CARD1.lastClose<2000))return wait('replay',o,o&&o.title);
    CARD1.token++;
    _rp.apply(this,arguments); // fight.js stops the playback when its own card is closed or replaced
    try{Layers.push('modal',()=>UI.closeModal());}catch(e){}};
  // ---------- 3) cards the game opens on its own wait their turn
  function auto(){return Date.now()-CARD1.lastTap>1500;}
  function wait(kind,arg,label){CARD1.queue.push({kind,arg,label:String(label||'').replace(/<[^>]*>/g,'').slice(0,60),t:Date.now()});CARD1.queue=CARD1.queue.slice(-12);bar();}
  // UI.info is NOT queued: tile cards, building cards and menus open from code paths that are not always right after a tap.
  const _info=UI.info;
  UI.info=function(o){CARD1.token++;return _info.apply(this,arguments);};
  const _aa=UI.attackAlert;
  UI.attackAlert=function(rep){
    if(auto()&&(isOpen()||Date.now()-CARD1.lastClose<2000))return wait('alert',rep,'Raid report');
    return _aa.apply(this,arguments);};
  function openNext(){const x=CARD1.queue.shift();bar();if(!x)return;CARD1.lastTap=Date.now();
    try{if(x.kind==='replay')UI.replay(x.arg);else if(x.kind==='info')UI.info(x.arg);else if(x.kind==='info64'){if(typeof opCard64==='function')opCard64(x.arg);}else UI.attackAlert(x.arg);}catch(e){console.warn('card1 open',e);}}
  window.cardNext1=openNext;
  // R6.4: outpost results (supply64) wait their turn like march replays: cardWait1('info64', records, '⛺ Outpost up')
  window.cardWait1=function(kind,arg,label){wait(kind,arg,label);};window.cardBusy1=()=>isOpen()||Date.now()-CARD1.lastClose<2000;
  function bar(){let b=document.getElementById('cardq1');const n=CARD1.queue.length;
    if(!n||isOpen()){if(b)b.remove();return;}
    if(!b){b=document.createElement('button');b.id='cardq1';b.type='button';b.onclick=e=>{e.stopPropagation();openNext();};document.body.appendChild(b);}
    const first=CARD1.queue[0];b.textContent=`📬 ${n} waiting: ${first.label||'new result'} · tap to view`;}
  setInterval(bar,1500);
  const _md=UI.modal;UI.modal=function(){const r=_md.apply(this,arguments);try{bar();}catch(e){}return r;};
  const st=document.createElement('style');
  st.textContent='body:has(#modal:not(.hidden)) #cardq1{display:none}#cardq1{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom) + 76px);z-index:640;max-width:calc(100vw - 32px);padding:10px 14px;border-radius:22px;border:1px solid #c9a24a;background:#2a1f10;color:#ffe6a8;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 4px 14px #0008}';
  document.head.appendChild(st);
})();
