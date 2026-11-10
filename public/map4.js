// map4 (R4) One marker per hex, a list of everything on a crowded hex, map filters, and markers that merge when zoomed out.
//  Every map layer still draws its own markers exactly as before; this file runs after them and tidies the result:
//  on a hex with several markers only the most important one shows, with a number badge. Tapping it opens
//  "On this hex", one row per thing with its own button. Filter chips hide whole kinds of markers (Threats can't be
//  hidden), remembered on this device. Zoomed out, markers within one spot on screen merge into one with a count.
(function(){
  const CAT4={raids:'threat',sqmove:'threat',ew25:'threat',horde:'threat',clan23:'threat',intent:'threat',
    march:'march',mv23:'march',ret25:'march',van26:'march',
    sh26:'building',gar23:'building',hq15:'building',hex:'resource',zones:'skip',rings22:'skip',terr:'skip',
    allyFlags:'alliance',allyDefs:'alliance',
    pipes:'resource',lm:'resource',
    mons:'monster',nest:'monster',
    mark:'pin',plan:'pin'};
  const PRI4={threat:1,march:3,building:4,alliance:4,resource:5,monster:6,pin:7,other:8};
  const FILT4=[['threat','⚠️ Threats',true],['march','🚩 Marches'],['resource','⛽ Resources'],['building','🏰 Buildings'],['alliance','🤝 Alliance'],['monster','👾 Monsters'],['pin','📍 Pins']];
  const LS='wl_f4';let off={};try{off=JSON.parse(localStorage.getItem(LS)||'{}')||{};}catch(e){off={};}
  const saveOff=()=>{try{localStorage.setItem(LS,JSON.stringify(off));}catch(e){}};
  window.MAP4={CAT4,PRI4,off};
  function catMap(){const m=new Map();const walk=(g,c)=>{try{g.eachLayer(l=>{if(l instanceof L.LayerGroup)walk(l,c);else m.set(l,c);});}catch(e){}};
    for(const [k,g] of Object.entries(G.layers||{}))if(g&&g.eachLayer)walk(g,CAT4[k]||'other');return m;}
  function labelOf(mk){try{const t=mk.getTooltip&&mk.getTooltip();if(t){const c=t.getContent();const s=typeof c==='string'?c:(c&&c.textContent)||'';if(s.trim())return s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
      if(mk.options&&mk.options.title)return mk.options.title;const el=mk.getElement&&mk.getElement();if(el){const s=(el.getAttribute('title')||el.textContent||'').replace(/\s+/g,' ').trim();if(s)return s;}}catch(e){}return'';}
  const NAME4={threat:'Threat',march:'March',building:'Building',alliance:'Alliance',resource:'Resource',monster:'Monster',pin:'Pin',other:'Marker'};
  let groups=new Map();const badges=new Map();
  function tidy4(){try{if(typeof map==='undefined'||!map._loaded)return;const z=map.getZoom(),cats=catMap();const all=[];
      map.eachLayer(l=>{if(!(l instanceof L.Marker)||l._b4)return;const el=l.getElement&&l.getElement();if(!el)return;const c=cats.get(l)||'other';if(c==='skip')return;all.push({l,el,c,ll:l.getLatLng()});}); // zone names and ring markers are area labels, not things on a hex
      // filters
      for(const x of all){const hide=off[x.c]&&x.c!=='threat';x.el.dataset.f4=hide?'1':'';}
      const vis=all.filter(x=>x.el.dataset.f4!=='1');
      // group: by hex when zoomed in, by a 56 px screen cell when zoomed out
      const zoomOut=z<13;const g=new Map();
      for(const x of vis){let key;if(zoomOut){const p=map.latLngToContainerPoint(x.ll);key='c'+Math.floor(p.x/56)+'_'+Math.floor(p.y/56);}else{try{key=hexAt(x.ll.lat,x.ll.lng).id;}catch(e){key=x.ll.lat.toFixed(5)+','+x.ll.lng.toFixed(5);}}
        if(!g.has(key))g.set(key,[]);g.get(key).push(x);}
      groups=new Map();const keep=new Set();
      for(const [key,arr] of g){arr.sort((a,b)=>(PRI4[a.c]||9)-(PRI4[b.c]||9));const top=arr[0];
        arr.forEach((x,i)=>{x.el.dataset.h4=i?'1':'';x.el.dataset.top4=i?'':(arr.length>1?'1':'');});
        if(arr.length>1){groups.set(key,arr);keep.add(key);const sig=arr.length+'|'+top.c+'|'+top.ll.lat.toFixed(6)+','+top.ll.lng.toFixed(6)+'|'+zoomOut;let b=badges.get(key);
          if(!b||b._sig!==sig){if(b)b.remove();b=L.marker(top.ll,{icon:L.divIcon({className:'b4',html:`<span class="${top.c==='threat'?'t4':''}">${arr.length}</span>`,iconSize:[22,22],iconAnchor:[-6,26]}),zIndexOffset:2000,keyboard:false});
            b._b4=1;b._sig=sig;b.on('click',e=>{L.DomEvent.stop(e);if(map.getZoom()<13){map.setView(b.getLatLng(),Math.max(14,map.getZoom()+2));return;}openHex4(key);});b.addTo(map);badges.set(key,b);}
          // tapping the top marker of a crowded hex opens the list too
          if(!top.el._c4){top.el._c4=1;top.el.addEventListener('click',ev=>{const k=top.el.dataset.top4==='1'?[...groups.entries()].find(([,a])=>a[0].el===top.el):null;if(!k)return;ev.stopPropagation();ev.preventDefault();if(map.getZoom()<13){map.setView(top.ll,Math.max(14,map.getZoom()+2));return;}openHex4(k[0]);},true);}}}
      sweep4(keep);}
    catch(e){console.warn('map4',e);}}
  function sweep4(keep){for(const [k,b] of badges)if(!keep.has(k)){b.remove();badges.delete(k);}}
  window.tidy4=tidy4;
  function openHex4(key){const arr=groups.get(key);if(!arr)return;UI._h4=arr;const hex=/^-?\d+_-?\d+$/.test(key)?key:null;
    const rows=arr.map((x,i)=>{const lab=labelOf(x.l)||NAME4[x.c];const ico=(x.el.textContent||'').trim().match(/^\S{1,2}/);
      return`<div class="row h4row ${x.c==='threat'?'t4r':''}"><span class="h4i">${ico?ico[0]:'•'}</span><div class="grow"><b>${lab.slice(0,60).replace(/</g,'&lt;')}</b><small>${NAME4[x.c]}</small></div><button onclick="openH4(${i})">Open</button></div>`;}).join('');
    UI.modal(`<h2>On this hex</h2>${hex?`<p class="tiny">${hexName(hex)}</p>`:''}${rows}<div class="btns24">${hex?`<button onclick="UI.closeModal();setTimeout(()=>UI.infoTile('${hex}'),60)">🔎 Hex card</button>`:''}<button onclick="UI.closeModal()">Close</button></div>`);}
  window.openHex4=openHex4;
  window.openH4=function(i){const x=(UI._h4||[])[i];if(!x)return;UI.closeModal();setTimeout(()=>{try{const top=x.el.dataset.top4;x.el.dataset.top4='';x.l.fire('click',{latlng:x.ll,originalEvent:null});x.el.dataset.top4=top;}catch(e){console.warn('open h4',e);}},60);};
  // filter chips
  function chips4(){if(document.getElementById('f4'))return;const d=document.createElement('div');d.id='f4';
    d.innerHTML=`<button id="f4t" aria-expanded="false" title="Map filters">🧭</button><div id="f4c">${FILT4.map(([k,n,lock])=>`<button data-k="${k}" class="${off[k]?'off':''}" ${lock?'disabled title="Threats always show"':''}>${n}</button>`).join('')}</div>`;
    document.body.appendChild(d);d.querySelector('#f4t').onclick=e=>{e.stopPropagation();d.classList.toggle('open');d.querySelector('#f4t').setAttribute('aria-expanded',d.classList.contains('open'));};
    d.querySelectorAll('#f4c button[data-k]').forEach(b=>b.onclick=e=>{e.stopPropagation();const k=b.dataset.k;if(k==='threat')return;off[k]=!off[k];b.classList.toggle('off',!!off[k]);saveOff();tidy4();});}
  // bottom-left, just above the march list arrow (the right side has Drive and the base rail)
  const place4=()=>{try{const d=document.getElementById('f4');if(!d)return;const mc=document.getElementById('mcToggle'),tabs=document.getElementById('tabs');
      const navTop=tabs?tabs.getBoundingClientRect().top:innerHeight-64;let bottom=innerHeight-navTop+12,left=10;
      const box=document.getElementById('mcards'),shut=!box||box.classList.contains('mc-shut')||getComputedStyle(box).display==='none';
      if(mc&&shut){const r=mc.getBoundingClientRect();if(r.width){bottom=innerHeight-r.top+8;left=Math.round(r.left);}} // march list open: stay in the corner above the tabs
      d.style.bottom=Math.round(bottom)+'px';d.style.left=left+'px';}catch(e){}};
  setInterval(()=>{chips4();place4();tidy4();},900);
  document.addEventListener('pointerdown',e=>{const d=document.getElementById('f4');if(d&&d.classList.contains('open')&&!d.contains(e.target)){d.classList.remove('open');d.querySelector('#f4t').setAttribute('aria-expanded','false');}},true);
  try{HOOK.draw(function(){setTimeout(tidy4,0);});}catch(e){}
  setTimeout(()=>{try{map.on('zoomend moveend',()=>setTimeout(tidy4,0));}catch(e){}},1500);
  const st=document.createElement('style');
  st.textContent=`[data-f4="1"],[data-h4="1"]{display:none!important}.b4 span{display:inline-block;min-width:20px;height:20px;line-height:20px;padding:0 4px;border-radius:10px;background:#1a140c;border:1.5px solid #c9a24a;color:#ffe6a8;font:800 11px/18px system-ui;text-align:center;box-shadow:0 1px 4px #000a}
  .b4 span.t4{border-color:#ff3b2f;color:#fff;background:#5a1410;animation:p4 1.2s infinite}@keyframes p4{50%{box-shadow:0 0 0 5px #ff3b2f33}}
  #f4{position:fixed;left:10px;z-index:640;display:flex;flex-direction:column-reverse;align-items:flex-start;gap:6px;pointer-events:none}#f4 button{pointer-events:auto}
  #f4t{width:44px;height:44px;border-radius:10px;border:1.5px solid #c9a24a;background:#1a140ce8;font-size:18px}#f4c{display:none;flex-wrap:wrap;gap:4px;max-width:min(320px,calc(100vw - 40px));padding:6px;border-radius:12px;background:#120e09e6;border:1px solid #3a2f22}
  #f4.open #f4c{display:flex}#f4c button{padding:6px 8px;border-radius:14px;font-size:12px;background:#2a1f10;border:1px solid #c9a24a;color:#ffe6a8}#f4c button.off{opacity:.45;text-decoration:line-through}#f4c button[disabled]{opacity:1}
  .h4row .h4i{font-size:18px;margin-right:6px}.t4r{border-left:3px solid #ff3b2f}`;
  document.head.appendChild(st);
})();
