// shared page setup for the R6.4 supply tests (s11*). Installs window.S11 in the page.
module.exports=async function(p){await p.evaluate(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();
  window.__t=[];const T=document.getElementById('toast');if(T)new MutationObserver(ms=>{for(const m of ms)m.addedNodes.forEach(n=>window.__t.push(n.textContent));}).observe(T,{childList:true});
  window.S11={RATH:[47.8108,-116.8865],SPOK:[47.6588,-117.4260],
    sh(ll){const id=hexAt(...ll).id;W().sh={hex:id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;try{shClaimArea();}catch(e){}if(!P.tiles[id])P.tiles[id]={t:Date.now()};save();return id;},
    disc(ll,rad){const c=hexAt(...ll);const out=[];for(const x of hexRing(c.q,c.r,rad)){P.tiles[x.id]={t:Date.now()};out.push(x.id);}save();return out;},
    at(ll,dq,dr){const c=hexAt(...ll);return(c.q+dq)+'_'+(c.r+dr);},
    ll(id){return hexCenter(...idQR(id));},
    mate(ids,name='Wife',uid='u2'){G.al=G.al||{};G.al.members=G.al.members||{};G.al.members[uid]=G.al.members[uid]||{name,defs:[],lastActive:Date.now()};for(const id of ids)G.terr[id]={uid,by:name,t:Date.now()};G.terrV15=(G.terrV15||0)+1;
      // the local territory feed can replace G.terr every few seconds: keep the test's teammate land in place
      window.__mate=(window.__mate||[]).concat(ids.map(id=>[id,uid,name]));if(!window.__mateT)window.__mateT=setInterval(()=>{let ch=false;for(const [id,u,n] of window.__mate||[])if(!G.terr[id]||G.terr[id].uid!==u){G.terr[id]={uid:u,by:n,t:Date.now()};ch=true;}if(ch)G.terrV15=(G.terrV15||0)+1;},100);},
    unmate(){window.__mate=[];for(const k of Object.keys(G.terr))delete G.terr[k];G.terrV15=(G.terrV15||0)+1;},
    rich(){for(const k of Object.keys(RES))P.res[k]=1e6;save();},
    amber(){let n=0;G.layers.hex.eachLayer(l=>{if(l.options&&l.options.color==='#ffb52e'&&l.options.dashArray==='6 4')n++;});return n;},
    redraw(){supplyBust64();drawWorld();}};
  // keep the test's teammate land: terr feeds in local mode would otherwise reset it
  });};
