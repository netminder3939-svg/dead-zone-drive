// R2 battle view: march fight and a defense both show squads by class (ours left, enemy right), counts end at the
// exact result, the hero sits behind his line, Skip and "Always skip" work, and the troops that come home = troops left.
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);const shot=n=>p.screenshot({path:'/tmp/claude-0/-home-claude/00a3791d-653d-51f8-8596-70dbf5f30ee6/scratchpad/probe/'+n+'.png'});
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();G.pos=[47.7796,-116.8923];const c=hexAt(47.7796,-116.8923);claimTile(c.id);W().sh={hex:c.id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:2};P.startSh26=1;P.startShMoved26=1;
   const ring=hexRing(...idQR(c.id),1);for(const x of ring)claimTile(x.id);TP().home=3000;P.fightSkip2=false;save();G._c=c.id;});
 await p.waitForTimeout(1000);
 // march fight: 4,000 troops + hero vs a Horde squad of power 60
 await p.mouse.click(5,5);
 const m=await ev(()=>{const f=runFight([...marchUnits({unit:frozenMe(),escorts:{},uid:P.uid}),troopUnit(4000)],[bandUnit('Rust Dogs squad',60)]);
   UI.replay({title:'🚩 March test',sub:'x',f,good:f.win,result:f.win?'Won':'Lost',buttons:[['Continue',()=>UI.closeModal(),'big']]});
   const r=f.army2.r;return{army:!!f.army2,win:f.win,usRows:r.att.rows.length,sent:r.att.rows[0].n,left:r.att.rows[0].left,frac:armyFrac(f),hero:r.att.heroes.length,
     ui:{us:!!document.querySelector('.side2.us .sq2'),foe:!!document.querySelector('.side2.foe .sq2'),hero:!!document.querySelector('.side2.us .hero2'),usFirst:document.querySelector('.b2').firstElementChild.classList.contains('us')}};});
 ok(m.army&&m.usRows===1&&m.hero===1,'march fight runs on the army engine (your troops + hero vs their squad)',m);
 ok(m.ui.us&&m.ui.foe&&m.ui.hero&&m.ui.usFirst,'view: your squads on the left, enemy on the right, hero card behind your line',m.ui);
 ok(Math.abs(m.frac-m.left/m.sent)<1e-6,'troops that come home = troops left (hero health not counted)',{frac:m.frac,left:m.left,sent:m.sent});
 await shot('r2-march-start');
 await ev(()=>{const b=document.getElementById('rauto');if(b&&!b.disabled)b.click();});await p.waitForTimeout(1600);await shot('r2-march-mid');
 await ev(()=>{const b=document.getElementById('rskip');if(b)b.click();});await p.waitForTimeout(300);await shot('r2-march-end');
 const end=await ev(()=>({cnt:[...document.querySelectorAll('.side2.us .cnt2')].map(e=>e.textContent),round:$('#rround').textContent,sum:($('.sum2')||{}).textContent,cont:!!$('#rb0')}));
 ok(end.cnt[0]===m.left.toLocaleString()&&/WON|LOST/.test(end.round)&&end.cont,'skip ends on the exact troops left, with Continue',end);
 await p.click('#rb0');await p.waitForTimeout(200);
 // defense: tower hex with 800 stationed engineers-ish troops + home garrison vs a squad
 await p.mouse.click(5,5);
 const d=await ev(()=>{const id=G._c,defs=activeDefs(id);const f=squadReplay(defs,defPower(defs),300,'Rust Dogs');
   playFights({fights:[{tile:id,f,dp:defPower(defs)}],detail:{},t:Date.now()},0);
   return{army:!!(f&&f.army2),us:f.army2&&f.army2.us,rows:f.army2&&f.army2.r.def.rows.length,bld:!!document.querySelector('.bld2'),enemy:(document.querySelector('.side2.foe b')||{}).textContent};});
 ok(d.army&&d.us==='def'&&d.rows>=1&&d.bld&&/Rust Dogs/.test(d.enemy),'a Horde attack on your land shows as the same army battle (your garrison + building vs their squad)',d);
 await shot('r2-defense');
 await ev(()=>{const b=document.getElementById('rskip');if(b)b.click();});await p.waitForTimeout(200);
 // Always skip
 await ev(()=>{const c=document.getElementById('rskip2');});await ev(()=>UI.closeModal());await p.mouse.click(5,5);
 await ev(()=>{const f=runFight([...marchUnits({unit:frozenMe(),escorts:{},uid:P.uid}),troopUnit(2000)],[bandUnit('Rust Dogs squad',40)]);UI.replay({title:'t2',f,good:f.win,result:'r',buttons:[['Continue',()=>UI.closeModal(),'big']]});});
 await p.click('#rskip2');await p.waitForTimeout(200);await ev(()=>UI.closeModal());await p.mouse.click(5,5);
 const sk=await ev(()=>{const f=runFight([...marchUnits({unit:frozenMe(),escorts:{},uid:P.uid}),troopUnit(2000)],[bandUnit('Rust Dogs squad',40)]);UI.replay({title:'t3',f,good:f.win,result:'r',buttons:[['Continue',()=>UI.closeModal(),'big']]});return{saved:P.fightSkip2,ended:/WON|LOST/.test($('#rround').textContent),cont:!!$('#rb0')};});
 ok(sk.saved&&sk.ended&&sk.cont,'"Always skip" is saved and the next battle opens on the result',sk);
 await ev(()=>{P.fightSkip2=false;save();UI.closeModal();});
 // a hero alone vs a monster still uses the duel
 await p.mouse.click(5,5);const solo=await ev(()=>{P.hp=9999;fightMutant(Object.keys(MONSTERS)[0],1,'solo2');return{duel:!document.querySelector('.b2')&&!!document.querySelector('.battle')};});ok(solo.duel,'solo hero vs monster keeps the duel view',solo);
 console.log(fails?`${fails} FAIL`:'ALL PASS');
});
