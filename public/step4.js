// UI Step 4 (test build): tile cards = one bottom-sheet template with a variant chip (own / ally / enemy / empty / fog).
function tileVariant(id){try{if(!isVis(id))return['fog','UNEXPLORED'];if(P.tiles[id])return['own','YOURS'];if(enemyAt(id)||(typeof factionAt==='function'&&factionAt(id)))return['enemy','HOSTILE'];const o=G.terr[id];if(o&&!o.released&&!o.ai)return['ally','ALLY'];return['empty','OPEN'];}catch(e){return['empty','OPEN'];}}
function tileCard(id){const m=$('#modal');m.classList.add('tilecard');const b=$('#modalBody');if(!b||b.querySelector('.tchip'))return;const [k,t]=tileVariant(id);b.insertAdjacentHTML('afterbegin',`<span class="tchip tv-${k}">${t}</span>`);}
const _cm4=UI.closeModal;UI.closeModal=function(){$('#modal').classList.remove('tilecard');return _cm4.apply(this,arguments);};
const _it4=UI.infoTile;UI.infoTile=function(id){const r=_it4.apply(this,arguments);if(!$('#modal').classList.contains('hidden'))tileCard(id);return r;};
for(const fn of['infoFort','infoFaction']){const o=UI[fn];if(o)UI[fn]=function(id){const r=o.apply(this,arguments);try{if(!$('#modal').classList.contains('hidden'))tileCard(id);}catch(e){}return r;};}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal'&&$('#modal').classList.contains('tilecard'))UI.closeModal();});
