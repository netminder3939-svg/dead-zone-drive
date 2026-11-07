const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,geolocation:{latitude:47.81,longitude:-116.9,accuracy:10},permissions:['geolocation']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='warning')errs.push(m.text())});
await p.addInitScript(()=>{localStorage.setItem('wl_team','smoke-team');});await p.goto(''+(process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(600);
if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName','Smoke');await p.fill('#obTeam','smoke-team');await p.click('#obGo');}
await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos,null,{timeout:30000});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{const o={};P.lvl=12;P.skills={power:3,builder:2,oldjunk:4};syncSP();o.pts={total:skillPtsTotal(),spent:skillPtsSpent(),sp:P.sp,skills:JSON.stringify(P.skills)};
 o.lockT3=nodeLock(ALL_NODES.ironhide);spendSkill('ironhide');o.ironhide=P.skills.ironhide||0;
 for(let i=0;i<3;i++)spendSkill('vitality');o.after4=nodeLock(ALL_NODES.ironhide);
 const d0=marchDur(marchFrom(),(+marchFrom().split('_')[0]+10)+'_'+marchFrom().split('_')[1]);P.skills.marcher=5;const d1=marchDur(marchFrom(),(+marchFrom().split('_')[0]+10)+'_'+marchFrom().split('_')[1]);o.march=d0+'->'+d1;
 const p0=TROOP.powerPer;P.skills.discipline=5;o.troopPow=p0+'->'+TROOP.powerPer;
 // class tree
 spendSkill('s_fleet');o.noClass=P.skills.s_fleet||0;pickClass('scout');o.skillsKeys=Object.keys(SKILLS);spendSkill('s_fleet');spendSkill('s_fleet');o.fleet=P.skills.s_fleet;o.cp=classPtsTotal()-classPtsSpent('scout');
 P.cls.next='raider';P.cls.nextT=Date.now()-1;classTick();o.afterSwitch=Object.keys(SKILLS);o.fleetKept=P.skills.s_fleet;o.marchAfterSwitch=skillFx('marchSpd');
 return o;});
console.log(JSON.stringify(r,null,1));
await p.evaluate(()=>{UI.tab='player';UI.sub.player='skills';$('#sheet').classList.remove('hidden');UI.render();});await p.waitForTimeout(400);await p.screenshot({path:(process.env.OUT||'/tmp')+'/skills.png'});
console.log('ERRORS',errs);await b.close();})();
