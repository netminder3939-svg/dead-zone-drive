// UI Step 5 (test build): Send March shows slot use; raider auto-battle countdown gets a Skip button (straight to the result).
const _amb5=addMarchBtn;addMarchBtn=function(id){_amb5.apply(this,arguments);try{const b=$('#btnMarch');if(!b)return;const u=poolUse(),sup=friendlyHex(id);
  b.insertAdjacentHTML('afterbegin',`<span class="slotind">⚔ ${u.reg}/${SLOTS.reg} · 🛡 ${u.sup}/${SLOTS.sup}${b.disabled?'':` · ${sup?'support':'regular'} slot`}</span><br>`);b.classList.add(sup?'pool-sup':'pool-reg');}catch(e){}};
const _info5=UI.info;UI.info=function(o){const r=_info5.apply(this,arguments);try{const c=$('#fcount');const ib=$('#modalBody .ibtns');if(c&&ib&&/Auto-battle/.test(c.textContent||'')&&!ib.querySelector('.skipb')){const fb=ib.querySelector('button.fight')||ib.querySelector('button');
  const s=document.createElement('button');s.className='btn-sec skipb';s.textContent='⏭ Skip';s.onclick=()=>{G._skip5=1;fb&&fb.click();};ib.appendChild(s);}}catch(e){}return r;};
const _rp5=UI.replay;UI.replay=function(o){if(G._skip5){G._skip5=0;const v=P.fightView;P.fightView='skip';try{return _rp5.apply(this,arguments);}finally{P.fightView=v;}}return _rp5.apply(this,arguments);};
