// kit8 (PREVIEW HOSTS ONLY): v26 fresh start = Stronghold + gear set, NO starter resources (Jacob Nov 4). Dev "Refill resources" still available.
const KIT8={res:3000,set:'hazmat'};
function kitGear(name,slot,ri){const b=GEAR_BASES.find(x=>x.name===name)||GEAR_BASES.find(x=>x.slot===slot)||{};const sc=RARITY[ri].mult*1.12,g={id:'k'+slot+Date.now().toString(36),name:b.name||name,slot,rarity:ri};for(const k of['atk','def','hp','crit','agi','luck'])if(b[k])g[k]=Math.round(b[k]*sc);return g;}
function giveStartKit(){if(typeof G!=='undefined'&&G.cloudLogin&&G.cloudLogin.pending)return false;if(!location.hostname.includes('--')||!P||P.kit8||!P.name)return false;const army=P.troops&&((P.troops.home||0)>0||(P.troops.queue||[]).length||Object.keys(P.troops.away||{}).length);const fresh=(P.lvl||1)<=1&&(P.inv||[]).length<=1&&!army&&!((P._rev||0)>0);P.kit8=1;if(!fresh){save();return false;}
  const S=GEAR_SETS[KIT8.set],slots=['head','chest','legs','boots'];P.inv=P.inv||[];P.equip=P.equip||{};
  S.pieces.forEach((nm,i)=>{const g=kitGear(nm,slots[i],2);g.set=KIT8.set;P.inv.push(g);P.equip[slots[i]]=g.id;});
  const wpn=GEAR_BASES.filter(b=>b.slot==='weapon').sort((a,b)=>(b.atk||0)-(a.atk||0))[0],tr=GEAR_BASES.find(b=>b.slot==='trinket');
  if(wpn){const g=kitGear(wpn.name,'weapon',2);P.inv.push(g);P.equip.weapon=g.id;}if(tr){const g=kitGear(tr.name,'trinket',2);P.inv.push(g);P.equip.trinket=g.id;}
  // v26: leave resources at zero so upgrades/troops have to be earned. Use the Refill button if you need a stockpile.
  for(const k of Object.keys(RES))P.res[k]=0;P.hp=stats().hp;save();toast('🎁 Test kit: Hazmat set. Resources start at 0 — gather to grow.');try{UI.hud();}catch(e){}return true;}
function devRefill(quiet){if(!location.hostname.includes('--'))return;P.res=P.res||{};for(const k of Object.keys(RES))P.res[k]=Math.max(P.res[k]||0,KIT8.res);save();try{UI.hud();if(UI.tab)UI.render();}catch(e){}if(!quiet)toast('💰 Resources refilled');}
(function(){if(!location.hostname.includes('--'))return;const t=setInterval(()=>{try{if(P&&P.name&&P.world)giveStartKit();if(P&&P.kit8)clearInterval(t);}catch(e){}},1000);
  const add=()=>{const bar=document.getElementById('devbar');if(!bar||bar.querySelector('[data-dev="refill"]'))return;const bt=document.createElement('button');bt.dataset.dev='refill';bt.textContent='💰 Refill resources';bt.onclick=()=>devRefill();bar.appendChild(bt);};
  setInterval(add,2000);})();
