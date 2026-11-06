// Escort troop count that rides ABOVE the moving supply truck.
// v26-9 drew a pill in the pipe layer. On the phone that pill stopped showing
// after the v26-10 tap card (zero-size interactive marker). This draws the
// count in its own layer, march-style, glued to the truck's position.
// A stationary hex flag is not used for these troops.
(function(root){
  function truckU(now,truckH){
    const ms=Math.max(1,(truckH||2)*3600e3);
    const f=(now/ms)%2;
    return f<=1?f:2-f;
  }
  // nSeg = route.length-1. u in [0,1] ping-pongs. Returns the segment and how far along it.
  function alongIndex(nSeg,u){
    const n=Math.max(1,nSeg|0);
    const k=Math.max(0,Math.min(1,u))*n;
    const i=Math.min(n-1,Math.floor(k));
    return {i:i,t:k-i};
  }
  function vanCount(p,ctx){
    ctx=ctx||{};
    const stationed=ctx.stationed||{};
    const self=ctx.selfUid||'me';
    const parts=[];
    const seen=new Set();
    if(!p||p.own===false){
      for(const m of ctx.members||[]){
        if(!m||m.me||m.uid===self)continue;
        let n=0,uid=m.uid;
        const mp=(m.pipes||[]).find(function(x){return x&&x.id===p.id;});
        if(mp&&mp.guardN>0){n=mp.guardN|0;uid=mp.guardUid||m.uid;}
        else if(m.gar){for(const g of m.gar)if(g&&g.pipe===p.id&&g.n>0)n+=(g.n|0);}
        if(n>0&&!seen.has(uid)){seen.add(uid);parts.push({uid:uid,n:n});}
      }
    }else{
      const gh=p.guard25&&p.guard25.hex;
      const s=gh&&stationed[gh];
      const n=s&&s.n>0?s.n:0; // in transit still counts; a recall or a wipe leaves 0
      if(n>0){seen.add(self);parts.push({uid:self,n:n});}
      for(const m of ctx.members||[]){
        if(!m||m.me||m.uid===self)continue;
        let an=0,uid=m.uid;
        const mp=(m.pipes||[]).find(function(x){return x&&x.id===p.id;});
        if(mp&&mp.guardN>0){an=mp.guardN|0;uid=mp.guardUid||m.uid;}
        else if(m.gar){for(const g of m.gar)if(g&&(g.pipe===p.id||(gh&&g.hex===gh))&&g.n>0)an+=(g.n|0);}
        if(an>0&&!seen.has(uid)){seen.add(uid);parts.push({uid:uid,n:an});}
      }
    }
    return {n:parts.reduce(function(a,x){return a+x.n;},0),parts:parts};
  }
  function escortHexes(list){
    const hide={};
    for(const p of list||[]){
      const h=p&&p.guard25&&p.guard25.hex;
      if(h)hide[h]=p.id||1;
    }
    return hide;
  }
  const api={truckU:truckU,alongIndex:alongIndex,vanCount:vanCount,escortHexes:escortHexes};
  root.VAN26=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;

  if(typeof window==='undefined'||typeof document==='undefined')return;
  try{
    if(!document.getElementById('van26css')){
      const st=document.createElement('style');st.id='van26css';
      st.textContent='.vanstack26{width:78px;height:56px;pointer-events:auto;cursor:pointer}'
        +'.vannum26{position:absolute;left:50%;top:0;transform:translateX(-50%);background:#120d08ee;border:2px solid #b26aff;border-radius:12px;padding:1px 8px;color:#fff6dc;font:800 14px system-ui,-apple-system,sans-serif;white-space:nowrap;box-shadow:0 2px 6px #000;pointer-events:auto}'
        +'.vannum26 u{text-decoration:none;color:#b26aff;margin-right:3px}';
      document.head.appendChild(st);
    }
  }catch(e){}

  function boot(){
    if(typeof L==='undefined'||typeof drawPipes!=='function'||window._van26)return;
    window._van26=1;
    const prev=drawPipes;
    drawPipes=function(){
      const r=prev.apply(this,arguments);
      try{paintVans();}catch(e){console.warn('van26',e);}
      return r;
    };
    window.drawPipes=drawPipes;
  }
  function members(){
    const out=[];
    try{for(const [uid,m] of Object.entries((G.al&&G.al.members)||{}))out.push(Object.assign({uid:uid},m));}catch(e){}
    return out;
  }
  function paintVans(){
    if(typeof map==='undefined'||!P||!P.world)return;
    if(!G.layers.van26)G.layers.van26=L.layerGroup().addTo(map);
    const g=G.layers.van26;g.clearLayers();
    if(map.getZoom()<12)return;
    // Drop the old in-layer pill so it cannot cover the truck or double the number.
    try{if(G.layers.pipes)G.layers.pipes.eachLayer(function(l){
      const el=l.getElement&&l.getElement();
      if(el&&el.querySelector&&el.querySelector('.pipevan26'))G.layers.pipes.removeLayer(l);
    });}catch(e){}
    const list=typeof crewPipes==='function'?crewPipes():(typeof pipes==='function'?pipes():[]);
    const stMap=typeof window.stationed==='function'?window.stationed():((P.troops&&P.troops.stationed)||{});
    const hide=escortHexes(list);
    for(const p of list){
      if(!p||!p.route||p.route.length<2)continue;
      let online=false;
      try{online=(typeof pipeState==='function'?pipeState(p):p.st)==='online';}catch(e){}
      if(!online)continue;
      const c=vanCount(p,{stationed:stMap,members:members(),selfUid:P.uid});
      if(!(c.n>0))continue;
      const ll=[];
      try{for(const h of p.route)ll.push(hexCenter.apply(null,idQR(h)));}catch(e){continue;}
      if(ll.length<2)continue;
      const u=truckU(Date.now(),(typeof PIPE!=='undefined'&&PIPE.truckH)||2);
      const at=alongIndex(ll.length-1,u);
      const a=ll[at.i],b=ll[at.i+1]||a;
      const pos=[a[0]+(b[0]-a[0])*at.t,a[1]+(b[1]-a[1])*at.t];
      const lab=typeof kf24==='function'?kf24(c.n):c.n.toLocaleString();
      const html='<div class="vanstack26" data-pipe="'+String(p.id).replace(/"/g,'')+'"><b class="vannum26"><u>🚚</u>'+lab+'</b></div>';
      L.marker(pos,{icon:L.divIcon({className:'lodm',html:html,iconSize:[78,56],iconAnchor:[39,52]}),interactive:true,keyboard:false,zIndexOffset:780})
        .on('click',(function(pid){return function(ev){try{if(ev&&ev.originalEvent&&L.DomEvent)L.DomEvent.stopPropagation(ev.originalEvent);if(typeof pipeVanCard26==='function')pipeVanCard26(pid);else if(typeof pipeCard==='function'){const pp=(typeof pipes==='function'?pipes():[]).find(function(x){return x.id===pid;});pp&&pipeCard(pp);}}catch(e){}};}(p.id)))
        .addTo(g);
      if(p.guard25&&p.guard25.hex)hide[p.guard25.hex]=p.id;
    }
    window._vanHide26=hide;
  }
  window.paintVans26=paintVans;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else setTimeout(boot,0);
})(typeof window!=='undefined'?window:globalThis);
