// map4 (R4, cut back in R6.3) Map filters only: the 🧭 chips hide whole kinds of markers (Threats can't be hidden),
//  remembered on this device. The crowded-hex grouping (badges, "On this hex", zoomed-out merging) was removed in R6.3.
(function(){
  const CAT4={raids:'threat',sqmove:'threat',ew25:'threat',horde:'threat',clan23:'threat',intent:'threat',
    march:'march',mv23:'march',ret25:'march',van26:'march',
    sh26:'building',gar23:'building',hq15:'building',hex:'resource',zones:'skip',rings22:'skip',terr:'skip',
    allyFlags:'alliance',allyDefs:'alliance',
    pipes:'resource',lm:'resource',
    mons:'monster',nest:'monster',
    mark:'pin',plan:'pin',pay64:'skip'};
  const PRI4={threat:1,march:3,building:4,alliance:4.5,resource:5,monster:6,pin:7,other:8};
  const FILT4=[['threat','⚠️ Threats',true],['march','🚩 Marches'],['resource','⛽ Resources'],['building','🏰 Buildings'],['alliance','🤝 Alliance'],['monster','👾 Monsters'],['pin','📍 Pins'],['pay64','📦 Pay range']]; // R6.4: Pay range SHOWS an overlay (on unless wl_f4.payOn===false)
  const LS='wl_f4';let off={};try{off=JSON.parse(localStorage.getItem(LS)||'{}')||{};}catch(e){off={};}
  const saveOff=()=>{try{localStorage.setItem(LS,JSON.stringify(off));}catch(e){}};
  window.MAP4={CAT4,PRI4,off};
  function catMap(){const m=new Map();const walk=(g,c,k)=>{try{g.eachLayer(l=>{if(l instanceof L.LayerGroup)walk(l,c,k);else m.set(l,{c,k});});}catch(e){}};
    for(const [k,g] of Object.entries(G.layers||{}))if(g&&g.eachLayer)walk(g,CAT4[k]||'other',k);return m;}
  function tidy4(){try{if(typeof map==='undefined'||!map._loaded)return;const cats=catMap();
      map.eachLayer(l=>{if(!(l instanceof L.Marker))return;const el=l.getElement&&l.getElement();if(!el)return;const ci=cats.get(l);
        if(el.dataset.h4)el.dataset.h4='';if(el.dataset.top4)el.dataset.top4=''; // clears anything left by an older build in this tab
        const want=ci&&ci.c!=='skip'&&ci.c!=='threat'&&off[ci.c]?'1':'';if((el.dataset.f4||'')!==want)el.dataset.f4=want;});}
    catch(e){console.warn('map4',e);}}
  window.tidy4=tidy4;
  // filter chips
  function chips4(){if(document.getElementById('f4'))return;const d=document.createElement('div');d.id='f4';
    d.innerHTML=`<button id="f4t" aria-expanded="false" title="Map filters">🧭</button><div id="f4c">${FILT4.map(([k,n,lock])=>`<button data-k="${k}" class="${(k==='pay64'?off.payOn===false:off[k])?'off':''}" ${lock?'disabled title="Threats always show"':''}>${n}</button>`).join('')}<small id="pay64leg"></small></div>`;
    document.body.appendChild(d);d.querySelector('#f4t').onclick=e=>{e.stopPropagation();d.classList.toggle('open');d.querySelector('#f4t').setAttribute('aria-expanded',d.classList.contains('open'));};
    d.querySelectorAll('#f4c button[data-k]').forEach(b=>b.onclick=e=>{e.stopPropagation();const k=b.dataset.k;if(k==='threat')return;if(k==='pay64'){off.payOn=off.payOn===false;b.classList.toggle('off',off.payOn===false);saveOff();try{window.payChip64&&payChip64();}catch(e){}return;}off[k]=!off[k];b.classList.toggle('off',!!off[k]);saveOff();tidy4();});}
  // bottom-left, just above the march list arrow (the right side has Drive and the base rail)
  const place4=()=>{try{const d=document.getElementById('f4');if(!d)return;const mc=document.getElementById('mcToggle'),tabs=document.getElementById('tabs');
      const phone=innerWidth<1100;let bottom,left;
      if(phone){const navTop=tabs?tabs.getBoundingClientRect().top:innerHeight-64;bottom=innerHeight-navTop+12;left=10;
        const box=document.getElementById('mcards'),shut=!box||box.classList.contains('mc-shut')||getComputedStyle(box).display==='none';
        if(mc&&shut){const r=mc.getBoundingClientRect();if(r.width){bottom=innerHeight-r.top+8;left=Math.round(r.left);}}}
      else{ // desktop rail is a full-height left column (top=0). tabs.top would park this off-screen.
        left=76;const lg=document.getElementById('legend21'),on=lg&&getComputedStyle(lg).display!=='none';
        bottom=innerHeight-(on?lg.getBoundingClientRect().top:innerHeight-16)+8;}
      bottom=Math.max(8,Math.min(Math.round(bottom),innerHeight-60));
      d.style.bottom=bottom+'px';d.style.left=Math.round(left)+'px';}catch(e){}};
  setInterval(()=>{chips4();place4();tidy4();},900);
  document.addEventListener('pointerdown',e=>{const d=document.getElementById('f4');if(d&&d.classList.contains('open')&&!d.contains(e.target)){d.classList.remove('open');d.querySelector('#f4t').setAttribute('aria-expanded','false');}},true);
  try{HOOK.draw(function(){tidy4();});}catch(e){} // same tick as the redraw, so new markers never paint untidied
  try{if(typeof drawAllyFlags==='function'){const _daf4=drawAllyFlags;drawAllyFlags=function(){const r=_daf4.apply(this,arguments);tidy4();return r;};}}catch(e){} // its own 5 s timer: filters apply to new flags at once
  const st=document.createElement('style');
  st.textContent=`[data-f4="1"]{display:none!important}
  #f4{position:fixed;left:10px;z-index:640;display:flex;flex-direction:column-reverse;align-items:flex-start;gap:6px;pointer-events:none}#f4 button{pointer-events:auto}
  #f4t{width:44px;height:44px;border-radius:10px;border:1.5px solid #c9a24a;background:#1a140ce8;font-size:18px}#f4c{display:none;flex-wrap:wrap;gap:4px;max-width:min(320px,calc(100vw - 40px));padding:6px;border-radius:12px;background:#120e09e6;border:1px solid #3a2f22}
  #f4.open #f4c{display:flex}#f4c button{padding:6px 8px;border-radius:14px;font-size:12px;background:#2a1f10;border:1px solid #c9a24a;color:#ffe6a8}#f4c button.off{opacity:.45;text-decoration:line-through}#f4c button[disabled]{opacity:1}#pay64leg{flex-basis:100%;color:#ffd98a;font-size:11px;line-height:1.3}#pay64leg:empty{display:none}
`;
  document.head.appendChild(st);
})();
