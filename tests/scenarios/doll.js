const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.81,longitude:-116.9,accuracy:10},permissions:['geolocation']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning')errs.push(m.text())});
await p.addInitScript(()=>{localStorage.setItem('wl_team','smoke-team');});await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(600);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:30000});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{const o={};const s0=stats();
 // equip a full warlord set + weapon + trinket at iLvl 10, epic
 P.inv=P.inv||[];const mk=(name,r,lvl)=>{const b=G3_BY_NAME[name];const g={id:'t'+name,name,slot:b.slot,rarity:r,iLvl:lvl,up:0};if(r>=3)g.perk={k:'resb',v:8};return g3Apply(g);};
 o.compare=['Pipe Wrench','Nail Bat','Hazmat Coat','Runner Jacket','Road-Sign Plate'].map(n=>{const g=mk(n,2,10);return n+': ⚡'+g3Score(g)+' '+STAT_K.filter(k=>g[k]).map(k=>k+g[k]).join(' ');});
 o.byLevel=[1,5,10,20,30].map(l=>'iLvl'+l+' common wrench atk '+mk('Pipe Wrench',0,l).atk+' / legendary '+mk('Pipe Wrench',4,l).atk);
 for(const n of ['Skull Helm','Spiked Plate','Chain Kilt','Stomper Boots','Machete','Dog Tags']){const g=mk(n,3,10);P.inv.push(g);P.equip[g.slot]=g.id;}
 const s1=stats();o.before=s0;o.after=s1;o.sets=setPct();o.resb=skillFx('resb');o.score=gearScore();
 P.res.scrap=9999;P.res.parts=999;const w=P.inv.find(x=>x.name==='Machete');const a0=w.atk;upgradeGear(w.id);o.upgrade=a0+'->'+w.atk+' cost '+JSON.stringify(upCost({...w,up:0}));
 // drops
 const d=[];for(let i=0;i<300;i++)d.push(rollGear(8));o.drops={slots:{},sets:0,perks:0};d.forEach(g=>{o.drops.slots[g.slot]=(o.drops.slots[g.slot]||0)+1;if(g.set)o.drops.sets++;if(g.perk)o.drops.perks++;});
 window.__body='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 768" width="512" height="768">'+bodySVG()+'</svg>';
 window.__full=dollSVG();return o;});
console.log(JSON.stringify(r,null,1));
const body=await p.evaluate(()=>window.__body);fs.writeFileSync((process.env.OUT||'/tmp')+'/body.svg',body);
await p.evaluate(()=>{UI.tab='player';UI.sub.player='gear';$('#sheet').classList.remove('hidden');UI.render();});await p.waitForTimeout(500);await p.screenshot({path:(process.env.OUT||'/tmp')+'/gear.png'});
const p2=await ctx.newPage();await p2.setContent('<body style="margin:0;background:#1a1612;display:flex;gap:10px">'+body.replace('width="512" height="768"','width="300" height="450"')+'<div style="width:300px">'+(await p.evaluate(()=>window.__full))+'</div></body>');await p2.waitForTimeout(300);await p2.screenshot({path:(process.env.OUT||'/tmp')+'/doll.png',clip:{x:0,y:0,width:620,height:460}});
console.log('ERRORS',errs);await b.close();})();
