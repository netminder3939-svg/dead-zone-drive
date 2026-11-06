// UI redesign Step 1 (test build): layer manager + kit helpers. One sheet at a time, Back/✕/Esc close the top layer.
const Layers={stack:[],top(){return this.stack[this.stack.length-1]||null;},
  push(kind,close){this.stack=this.stack.filter(x=>x.kind!==kind);this.stack.push({kind,close});try{history.pushState({layer:kind},'');}catch(e){}},
  drop(kind){this.stack=this.stack.filter(x=>x.kind!==kind);},
  closeTop(){const t=this.stack.pop();if(t)t.close();return !!t;}};
window.Layers=Layers;
// sheet + modal register as layers
const _openK=UI.open;UI.open=function(){const r=_openK.apply(this,arguments);Layers.push('sheet',()=>UI.close());return r;};
const _closeK=UI.close;UI.close=function(){Layers.drop('sheet');return _closeK.apply(this,arguments);};
const _infoK=UI.info;UI.info=function(){const r=_infoK.apply(this,arguments);Layers.push('modal',()=>UI.closeModal());return r;};
const _cmK=UI.closeModal;UI.closeModal=function(){Layers.drop('modal');return _cmK.apply(this,arguments);};
window.addEventListener('popstate',()=>{Layers.closeTop();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')Layers.closeTop();});
// kit modal: Cancel + one action (async replacement for confirm(); old confirm() calls keep working)
UI.ask=function(title,text,action='OK'){return new Promise(res=>{const m=document.createElement('div');m.id='kitModal';m.innerHTML=`<div class="frame"><h3></h3><p></p><div class="kbtns"><button class="btn-ghost k0">Cancel</button><button class="btn-primary k1"></button></div></div>`;
  m.querySelector('h3').textContent=title;m.querySelector('p').textContent=text;m.querySelector('.k1').textContent=action;const done=v=>{m.remove();Layers.drop('ask');res(v);};
  m.querySelector('.k0').onclick=()=>done(false);m.querySelector('.k1').onclick=()=>done(true);document.body.appendChild(m);Layers.push('ask',()=>done(false));});};
// toast tones (gold info, ember reward, blood blocked), max 2 shown
const _toastK=toast;toast=function(t){const r=_toastK.apply(this,arguments);try{const box=document.getElementById('toast');if(box){const kids=[...box.children];kids.slice(0,-2).forEach(k=>k.remove());const last=kids[kids.length-1];if(last&&!last.dataset.tone){const s=String(t||'');last.dataset.tone=1;last.classList.add(/🚫|❌|Not enough|Need |can't|cannot|locked|🔒/i.test(s)?'toast-block':/\+\d|💰|🎁|reward|loot|XP|⬆️/i.test(s)?'toast-reward':'toast-info');}}}catch(e){}return r;};
