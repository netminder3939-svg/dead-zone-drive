// v26h (TEST · ddd-v26-10) Tap escort van → info card (who / troops / protection). No fight.
// Jacob Nov 5: "i wonna see who is guarding and whats the protection looking like"
(function(){
try{

function escH(s){try{return typeof esc24==='function'?esc24(s):String(s||'').replace(/[<>&]/g,c=>({'>':'&gt;','<':'&lt;','&':'&amp;'}[c]));}catch(e){return String(s||'');}}
function nn(v){return Math.round(v||0).toLocaleString();}

// Richer member sync so every crew phone can name the escort
try{
  HOOK.member(function(o){
    try{
      if(Array.isArray(o.pipes)){
        o.pipes=o.pipes.map(function(p){
          const full=pipes().find(x=>x.id===p.id);
          if(!full||!full.guard25)return p;
          const s=stationed()[full.guard25.hex];
          const gn=s&&s.n>0?s.n:0;
          if(!gn)return Object.assign({},p,{guardN:0,esc:false});
          return Object.assign({},p,{
            guardN:gn,esc:true,guardHex:full.guard25.hex,
            guardUid:P.uid,guardName:String(P.name||'').slice(0,24),
            guardCls:(P.cls&&P.cls.id)||null,
            guardMoving:!!(s.at&&s.at>Date.now())
          });
        });
      }
    }catch(e){}
    return o;
  });
}catch(e){console.warn('vanMember26h',e);}

function pipeGuardsList26(p){
  const out=[],seen=new Set();
  const add=function(g){if(!g||!(g.n>0))return;const k=(g.uid||'?')+'|'+(g.hex||'');if(seen.has(k))return;seen.add(k);out.push(g);};
  try{
    if(p.own!==false){
      const gh=p.guard25&&p.guard25.hex;const s=gh&&stationed()[gh];
      if(s&&s.n>0){const w=who26(P.uid);add({uid:P.uid,name:P.name+(isMe(P.uid)?' (you)':''),n:s.n,type:w.type,gear:w.gear,hex:gh,moving:!!(s.at&&s.at>Date.now()),own:true});}
    }
    // Crew members escorting this pipe (synced guardN / gar.pipe)
    for(const [uid,m] of Object.entries((G.al&&G.al.members)||{})){
      if(m.me)continue;
      if(Array.isArray(m.pipes)){
        const mp=m.pipes.find(x=>x&&x.id===p.id);
        if(mp&&mp.guardN>0){
          const id=mp.guardUid||uid;const w=who26(id);
          add({uid:id,name:(mp.guardName||m.name||w.name||'Teammate')+(isMe(id)?' (you)':''),n:mp.guardN|0,type:type26(mp.guardCls||m.cls||w.type),gear:w.gear,hex:mp.guardHex,moving:!!mp.guardMoving,own:false});
        }
      }
      if(Array.isArray(m.gar)){
        for(const g of m.gar){
          if(!g||!g.n)continue;
          if(g.pipe!==p.id&&!(p.guard25&&g.hex===p.guard25.hex))continue;
          const w=who26(uid);
          add({uid:uid,name:(m.name||w.name||'Teammate')+(isMe(uid)?' (you)':''),n:g.n|0,type:type26(g.c||m.cls||w.type),gear:w.gear,hex:g.hex,moving:false,own:false});
        }
      }
    }
    // Own view of an ally pipe: still list our own troops if we somehow guard it
    if(p.own===false){
      try{
        const pg=typeof pipeGuards25==='function'?pipeGuards25():{};
        for(const [gh,info] of Object.entries(pg)){
          if(info.id!==p.id)continue;
          const s=stationed()[gh];
          if(s&&s.n>0){const w=who26(P.uid);add({uid:P.uid,name:P.name+' (you)',n:s.n,type:w.type,gear:w.gear,hex:gh,moving:!!(s.at&&s.at>Date.now()),own:true});}
        }
      }catch(e){}
    }
  }catch(e){console.warn('guardsList26',e);}
  return out;
}
window.pipeGuardsList26=pipeGuardsList26;

window.pipeVanCard26=function(pipeId){
  try{
    let p=null;
    try{p=(typeof crewPipes==='function'?crewPipes():[]).find(x=>x&&x.id===pipeId);}catch(e){}
    if(!p)p=pipes().find(x=>x&&x.id===pipeId);
    if(!p)return toast('Pipeline not found');
    const guards=pipeGuardsList26(p);
    if(!guards.length)return toast('Nobody escorting this line right now');
    const players=guards.map(g=>({key:String(g.uid)+':'+(g.hex||''),uid:g.uid,n:g.n,type:g.type||'raider',gear:g.gear||{},name:g.name}));
    let r=null;try{r=fight26({bld:{kind:'pipe',lvl:1},players},{n:0});}catch(e){console.warn('vanFight',e);}
    const tot=guards.reduce((a,g)=>a+(g.n||0),0);
    const walls=r?Math.round((r.walls||0)*100):10;
    const dmg=r?r.D:0,hp=r?r.H:0;
    const moving=guards.some(g=>g.moving);
    const len=(p.route||[]).length;
    const rows=guards.map(g=>{
      const t=C26.types[g.type]||{},cls=(CLASSES.list[g.type]||{});
      const ico=t.ico||'🪖';
      return `<div class="pl26"><span>${typeof av24==='function'?av24(g.uid,28):ico}</span><div class="grow"><b>${escH(g.name)}</b><small>${ico} ${escH(cls.name||g.type||'Troops')} · ${nn(g.n)} troops${g.moving?' · marching to the line':''}</small></div><b>${nn(g.n)}</b></div>`;
    }).join('');
    const pk=r?Object.entries(r.perks||{}).filter(([,v])=>v>0).map(([k])=>k.charAt(0).toUpperCase()+k.slice(1)):[];
    UI.info({
      title:'🚚 Pipeline escort',
      sub:(p.name||'Pipeline')+(p.own===false&&p.owner?' · '+p.owner:'')+(moving?' · en route':''),
      body:`<div class="big26"><div><b>${nn(tot)}🪖</b><small>troops</small></div><div><b>${nn(dmg)}⚔</b><small>damage</small></div><div><b>${walls}%</b><small>walls block</small></div></div>
        <div class="sec26">WHO IS GUARDING</div>${rows}
        <p class="tiny">Covers all <b>${len}</b> hexes on this line. Pipe walls block ${walls}% of each hit. ${pk.length?'Perks on: '+pk.join(', ')+'. ':''}${r&&r.nTypes>=3?'Mix bonus on ('+r.nTypes+' types). ':''}Tap is info only — no fight starts.</p>`,
      buttons:[
        ['⛓️ Line',function(){try{UI.closeModal();pipeCard(p);}catch(e){}}],
        ...(p.own!==false?[['↩ Recall',function(){try{const gh=p.guard25&&p.guard25.hex;if(gh){recallStation(gh);UI.closeModal();drawPipes();}}catch(e){}}]]:[]),
        ['Close',function(){UI.closeModal();}]
      ]
    });
  }catch(e){console.warn('pipeVanCard26',e);toast('Could not open escort card');}
};

// Van badge click is wired in v26g (interactive marker → pipeVanCard26).

console.log('v26h ready',{sw:'ddd-v26-10'});
}catch(e){console.error('v26h boot',e);}
})();
