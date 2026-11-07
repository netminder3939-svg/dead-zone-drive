const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.81,longitude:-116.9,accuracy:10},permissions:['geolocation']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning')errs.push(m.text())});
await p.addInitScript(()=>{localStorage.setItem('wl_team','smoke-team');});await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(600);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:30000});await p.waitForTimeout(7000);
await p.evaluate(()=>document.getElementById('daily22')?.click());await p.waitForTimeout(600);
const daily=await p.evaluate(()=>{const m=document.querySelector('#modal:not(.hidden)');return m?m.innerText.slice(0,120).replace(/\n+/g,' | '):'none';});
await p.screenshot({path:(process.env.OUT||'/tmp')+'/daily.png'});
const r=await p.evaluate(()=>{const o={};[...document.querySelectorAll('#modalBody button')].find(x=>/Claim/.test(x.textContent))?.click();o.dailyClaimed=JSON.stringify(P.daily);
 const xp0=P.xp,l0=P.lvl;P.contrib.hexes=260;P.stats.kills=30;achCheck();o.tiers=JSON.stringify(P.ach.got);o.lvlUp=P.lvl-l0;
 // milestones
 for(let i=0;i<120;i++)G.terr['t'+i+'_0']={uid:'x',by:'J',t:1};o.m100=MILE[0].done();claimMilestone('m_hex100');o.claimed=JSON.stringify(P.msClaimed);
 // boss set loot
 const n0=P.inv.length;G.raids.rtest={id:'rtest',bossId:'boss_queen',won:true,done:true,participants:{[P.uid]:{dmg:50,name:P.name}}};raidClaim('rtest');o.bossLoot=P.inv.slice(n0).map(g=>g.name+' '+RARITY[g.rarity].name+(g.set?' ['+g.set+']':''));
 // title
 P.ach.got.hexes=3;P.title='hexes';o.title=memberSummary().title;UI.closeModal();return o;});
await p.evaluate(()=>{UI.open('player');UI.sub.player='ach';UI.render();});await p.waitForTimeout(400);await p.screenshot({path:(process.env.OUT||'/tmp')+'/ach.png'});
await p.evaluate(()=>{UI.open('alliance');UI.sub.alliance='miles';UI.render();});await p.waitForTimeout(300);
console.log(JSON.stringify({daily,...r},null,1),'\nmiles:',await p.evaluate(()=>$('#sheetBody').innerText.slice(-300).replace(/\n+/g,' | ')),'\nERRORS',errs);await b.close();})();
