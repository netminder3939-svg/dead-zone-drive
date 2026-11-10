// places65 (R6.5) Jacob's drawn buildings and landmarks, cut from his sheets as drawn (STRONGHOLD-LANDMARKS-SCREEN-SPEC v2).
//  Manifest-driven: assets/places/manifest.json says which drawing goes where. If it is missing or an entry has png:false,
//  every helper returns '' / null and the callers keep today's SVG or emoji. If a WebP 404s its PNG loads, and if that fails
//  too the image is swapped for the SVG/emoji. State (ruins, building, offline, fallen, visited, lair, fog) is CSS only.
//  Presentation only: no game data, stats, Firestore, rules or auth.
window.PLACES=window.PLACES||{};
(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function shTier(lv){return lv>=7?3:lv>=4?2:1;} // identical to shHTML26
  function placeArt(kind,key){const P_=PLACES[kind];if(!P_||P_.png===false)return null;
    const e=kind==='stronghold'?P_.tiers&&P_.tiers[shTier(key)]:kind==='tower'?P_.levels&&P_.levels[Math.min(5,Math.max(1,key||1))]
      :P_.img?P_:P_[key]||(kind==='outpost'?P_.other:null);
    return e&&e.img?e:null;}
  // fb: what replaces the picture if both files fail: {sh:L} | {tw:L} | {emo:'🏰', cls:'kp'} | {drop:true} (a sibling emoji is already there)
  function placeImg(e,cls,alt,fb,attrs){if(!e)return'';fb=fb||{drop:true};const x2=e.x2===false?'':` srcset="${e.img} 1x, ${e.img.replace(/\.webp$/,'@2x.webp')} 2x"`;
    const f=fb.sh?`data-sh="${fb.sh}"`:fb.tw?`data-tw="${fb.tw}"`:fb.emo?`data-emo="${esc(fb.emo)}" data-ecls="${esc(fb.cls||'')}"`:'data-drop="1"';
    return`<img class="p65 ${cls}" src="${e.img}"${x2} alt="${esc(alt)}" loading="lazy" decoding="async" data-png="${e.fallback||''}" ${f} ${attrs||''} onerror="pErr65(this)">`;}
  window.pErr65=function(img){const d=img.dataset;if(d.png){const p=d.png;d.png='';img.removeAttribute('srcset');img.src=p;return;}img.onerror=null;
    const host=img.closest('.has65');if(host)host.classList.remove('has65');
    let h='';try{if(d.sh)h=strongholdSVG(+d.sh,true);else if(d.tw)h=towerSVG(+d.tw);else if(d.emo)h=`<span class="${d.ecls}">${d.emo}</span>`;}catch(e){}
    if(!h){img.remove();return;}const t=document.createElement('span');t.innerHTML=h;img.replaceWith(...t.childNodes);};
  window.logoErr65=window.logoErr65||function(img){if(!img.dataset.t){img.dataset.t=1;img.src=img.src.replace(/\.webp$/,'.png');return;}img.onerror=null;img.style.display='none';const h=img.closest('.logo65');if(h)h.classList.add('logo65off');};
  // ---- small helpers the game files call (each returns '' when the art is off, so the caller keeps its own picture)
  const shArt65=(L,cls,fb)=>{const e=placeArt('stronghold',L);return e?placeImg(e,cls||'sh65',`Stronghold, tier ${shTier(L)}`,fb||{sh:L}):'';};
  const towerArt65=(lv,cls)=>{const e=placeArt('tower',lv);return e?placeImg(e,cls||'tw65',`Watchtower level ${lv}`,{tw:lv}):'';};
  const opArt65=(kind,cls,fb)=>{const e=placeArt('outpost',kind||'other');return e?placeImg(e,cls||'op65',kind==='home'?'Home Outpost':kind==='fwd'?'Forward Outpost':'Outpost',fb||{drop:true}):'';};
  const lmArt65=(kind,cls,fb)=>{const e=placeArt('landmarkKinds',kind),K=(typeof LANDMARK_KINDS!=='undefined'&&LANDMARK_KINDS[kind])||{};return e?placeImg(e,cls||'lm65',K.label||String(kind||'landmark').replace(/_/g,' '),fb||{drop:true}):'';};
  const hqArt65=(cls,fb)=>{const e=placeArt('allianceHq');return e?placeImg(e,cls||'hq65','Alliance HQ',fb||{drop:true}):'';};
  const fxArt65=(color,cls)=>{const e=placeArt('factionHome');return e?placeImg(e,cls||'fx65','Raider faction home',{drop:true},`style="--fc:${esc(color||'#d63a2a')}"`):'';};
  const rankArt65=(r,emo)=>{const e=placeArt('ranks',r);return e?placeImg(e,'rk65',r==='leader'?'Leader':'Officer',{emo}):emo;};
  const hdr65=(k,emo,px)=>{const e=placeArt('headers',k);return e?placeImg(e,'hd65',emo,{emo},`style="height:${px||28}px"`):emo;};
  // thumbnails next to text (decorative: alt="")
  const thumb65=(html)=>html?html.replace(/ alt="[^"]*"/,' alt=""').replace('class="p65 ','class="p65 th65 '):'';
  window.lmIcon65=(kind)=>{const h=lmArt65(kind,'th65',{emo:((typeof LANDMARK_KINDS!=='undefined'&&LANDMARK_KINDS[kind])||{}).icon||'📍'});return h||(((typeof LANDMARK_KINDS!=='undefined'&&LANDMARK_KINDS[kind])||{}).icon||'📍');};
  // Base › Stronghold: art stage + tier strip (the SVG stays the fallback inside the same .fortwrap)
  window.shStage65=function(L){const img=shArt65(L,'sh65big',{sh:L});if(!img)return`<div class="fortwrap">${strongholdSVG(L,true)}</div>`;const t=shTier(L);
    const chips=[1,2,3].map(k=>{const e=placeArt('stronghold',k===1?1:k===2?4:7);const lab=['I · Lv1-3','II · Lv4-6','III · Lv7-10'][k-1];
      return`<div class="tc65${k===t?' on':''}${k>t?' fut':''}">${e?placeImg(e,'th65','',{drop:true},'width="40" height="40"'):''}<span>${k>t?'🔒 ':''}${lab}</span></div>`;}).join('');
    return`<div class="fortwrap sh-art">${img}</div><div class="tier65">${chips}</div><p class="tiny tier65c">Your Stronghold grows at Lv4 and Lv7</p>`;};
  Object.assign(window,{shTier65:shTier,placeArt,placeImg,shArt65,towerArt65,opArt65,lmArt65,hqArt65,fxArt65,rankArt65,hdr65,thumb65});
  // preload only the current tier's castle when the Base tab opens
  let pre=0;window.preShTier65=function(){try{const L=strongholdLevel(),e=placeArt('stronghold',L);if(e&&pre!==shTier(L)){pre=shTier(L);const i=new Image();i.src=e.img;}}catch(e){}};
  // ---- load the manifest once, then redraw what's on screen
  fetch('assets/places/manifest.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}).then(m=>{window.PLACES=m||{};
      try{drawWorld();}catch(e){}try{drawLandmarks&&drawLandmarks();}catch(e){}try{drawHq15&&drawHq15();}catch(e){}try{if(!$('#sheet').classList.contains('hidden'))UI.render();}catch(e){}})
    .catch(()=>{window.PLACES={};});
  const st=document.createElement('style');
  st.textContent=`
  img.p65{object-fit:contain;display:block}
  .logo65 img.logo{width:min(100%,340px);height:auto;display:block;margin:0 auto;filter:drop-shadow(0 0 18px #d6a03a55)}.logo65 .vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .logo65.logo65off .vh{position:static;width:auto;height:auto;clip:auto}#onboard h1.logo65{text-shadow:none;letter-spacing:6px}
  /* Base › Stronghold stage (Hero-screen look: dark glow, skyline, iron frame) */
  .fortwrap.sh-art{position:relative;display:flex!important;justify-content:center;align-items:flex-end;height:auto!important;max-height:none!important;padding:14px 10px 10px;border-radius:12px;overflow:hidden;
    background:radial-gradient(60% 40% at 50% 92%,#8fd14f40,transparent 70%),radial-gradient(120% 80% at 50% 30%,#2a3320 0%,#161a12 55%,#0b0c09 100%)!important;
    border:2px solid #15130f!important;box-shadow:inset 0 0 0 1px #4d4232,inset 0 0 30px #000,0 3px 8px #000a}
  .fortwrap.sh-art:before{content:"";position:absolute;left:0;right:0;bottom:0;height:40%;opacity:.85;pointer-events:none;
    background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 120' preserveAspectRatio='none'><path d='M0 120V70l14-6v-20h10v14l12-4V30h16v30l10 4V48l14-8v34h12V20l6-8 6 8v56l16-4V44h20v30l10-6V36l8 4v36l14 4V54h12v26l10-8V40l14 6v34l12-6v46z' fill='%23161812'/></svg>") bottom/100% 100% no-repeat}
  .fortwrap.sh-art:after{content:"";position:absolute;inset:5px;pointer-events:none;background:radial-gradient(circle at 4px 4px,#8a7a60 0 2px,#2a241c 2.5px,transparent 3px),radial-gradient(circle at calc(100% - 4px) 4px,#8a7a60 0 2px,#2a241c 2.5px,transparent 3px),radial-gradient(circle at 4px calc(100% - 4px),#8a7a60 0 2px,#2a241c 2.5px,transparent 3px),radial-gradient(circle at calc(100% - 4px) calc(100% - 4px),#8a7a60 0 2px,#2a241c 2.5px,transparent 3px)}
  .fortwrap.sh-art img.sh65big{position:relative;z-index:1;width:auto;max-width:100%;height:min(42vh,300px);max-height:min(42vh,300px);filter:drop-shadow(0 6px 10px #000c)}
  .fortwrap.sh-art.small img.sh65big{height:120px;max-height:120px}
  .tier65{display:flex;gap:6px;margin:6px 0 2px}.tc65{flex:1;display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:8px;background:#1d1a14;border:1px solid #3a3226;font-size:11px;color:#cfc3a8}
  .tc65 img{width:40px;height:40px;flex:none}.tc65.on{border-color:#b6ff5c;box-shadow:0 0 8px #8fd14f88;color:#d8ffb0}.tc65.fut img{filter:grayscale(1) opacity(.45)}.tier65c{margin:0 0 8px}
  img.th65{width:36px;height:36px;flex:none;margin-right:8px}.big-ico img.th65{width:36px;height:36px;margin:0}.row>img.th65{align-self:center}
  img.hd65{display:inline-block;vertical-align:middle;width:auto;margin-right:4px}
  img.rk65{display:inline-block;width:18px;height:18px;vertical-align:-4px;margin-right:2px}
  /* map markers: emoji at far/mid, the drawing at near/close (16+) */
  .ico img.p65{display:none}.lod-near .ico.has65 img.p65,.lod-close .ico.has65 img.p65{display:block}
  .lod-near .ico.has65>.emo,.lod-close .ico.has65>.emo,.lod-near .ico.lm.has65>span,.lod-close .ico.lm.has65>span{display:none!important}
  .ico.st .art img.p65{display:block;width:100%;height:auto}.ico.st.down .art img.p65,.ico.st.off65 .art img.p65{filter:grayscale(1) brightness(.55)}
  .ico.op img.op65{height:44px;width:auto}.ico.op.down img.op65{filter:grayscale(1) brightness(.55)}.ico.op.cap65 img.op65{opacity:.6}
  .ico.lm img.lm65{height:48px;width:auto}.lod-close .ico.lm img.lm65{height:64px}.ico.lm.visited img.lm65{filter:drop-shadow(0 0 6px #d6a03a)}.ico.lm.lair img.lm65{filter:drop-shadow(0 0 10px #e0573a)}
  .ico.fxhome img.fx65{height:48px;width:auto;filter:drop-shadow(0 0 6px var(--fc))}
  .sh26 .kp-img{display:none}.lod-near .sh26.has65 .kp-img,.lod-close .sh26.has65 .kp-img{display:block;margin:0 auto}.lod-near .sh26.has65 .kp,.lod-close .sh26.has65 .kp{display:none}
  .sh26.t1 .kp-img{height:54px}.sh26.t2 .kp-img{height:64px}.sh26.t3 .kp-img{height:76px}.sh26.bld65 .kp-img{opacity:.6;outline:1px dashed #ffd24a;outline-offset:2px}
  .hq15ico img.hq65{display:none;margin:0 auto 2px}.lod-near .hq15ico img.hq65{display:block;height:56px;width:auto}.lod-close .hq15ico img.hq65{display:block;height:72px;width:auto}
  .hq15ico.fall65 img.hq65{filter:grayscale(1) drop-shadow(0 0 8px #ff3b2f)}
  .hq6 img.hqcard65{height:120px;width:auto;margin:0 auto 6px}.hq6.fall65 img.hqcard65{filter:grayscale(1) drop-shadow(0 0 10px #ff3b2f)}
  .iart img.p65{max-height:160px;width:auto;max-width:100%}.iart img.lmcard65{max-height:140px}
  `;
  document.head.appendChild(st);
})();
