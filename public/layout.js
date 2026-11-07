// v20 desktop layout helper: tells CSS when the side panel is open (so buttons slide clear of it) and keeps Leaflet sized right.
(function(){const sh=document.getElementById('sheet');if(!sh)return;const sync=()=>document.body.classList.toggle('sheet-open',!sh.classList.contains('hidden'));
  new MutationObserver(sync).observe(sh,{attributes:true,attributeFilter:['class']});sync();
  const fit=()=>{try{map.invalidateSize();}catch(e){}};window.addEventListener('resize',()=>{clearTimeout(window._fitT);window._fitT=setTimeout(fit,150);});setTimeout(fit,300);})();
