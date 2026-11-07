// v25: alternating fight, reinforce, states, building card, colour picker, chat, crew home map (far player)
const {chromium}=require('playwright');const OUT=process.env.SHOTS||'/tmp/dzd-tests';
(async()=>{const b=await chromium.launch();const errs=[];
const boot=async(geo,team,name)=>{const ctx=await b.newContext({viewport:{width:1440,height:900},geolocation:geo,permissions:['geolocation']});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(t=>{localStorage.setItem('wl_team',t);},team);await p.goto((process.env.BASE||'http://localhost:8765')+'/index.html?local');await p.waitForTimeout(800);
  if(await p.$eval('#onboard',e=>!e.classList.contains('hidden'))){await p.fill('#obName',name);await p.fill('#obTeam',team);await p.click('#obGo');}
  await p.waitForFunction(()=>typeof G!=='undefined'&&G.pos&&P.world,null,{timeout:30000});await p.waitForTimeout(1500);return p;};
const p=await boot({latitude:47.8135,longitude:-116.8968,accuracy:10},'rathdrum-crew','Pope');
const r=await p.evaluate(async()=>{const o={};
  const f=fight25(157,1,[{key:'a',pow:10}],24);o.f1={win:f.win,rounds:f.rounds.length,end:f.end,g:f.guards[0].frac.toFixed(2)};
  const f2=fight25(20,1,[{key:'a',pow:2},{key:'b',pow:8}],60);o.f2={win:f2.win,end:f2.end,fell:f2.bFell,g:f2.guards.map(x=>x.key+':'+x.frac.toFixed(2)+':'+x.out)};
  o.det=JSON.stringify(fight25(30,1,[{key:'a',pow:5}],40))===JSON.stringify(fight25(30,1,[{key:'a',pow:5}],40));o.patched=!!window._f25patched;
  // a tower with my guards gets hit by a squad
  const me=marchFrom(),[q,rr]=idQR(me);for(let i=0;i<5;i++)claimTile((q+i)+'_'+rr);const tw=(q+2)+'_'+rr;W().towers[tw]={state:'up',level:1,hpPct:1};
  TP().home=3000;stationTroops(tw,500);stationed()[tw].at=Date.now()-1;const defs=activeDefs(tw);o.defs=defs.map(d=>d.kind+':'+d.power);
  squadReplay(defs,defPower(defs),40,'Rot-Fang');o.fr=(P.fr25||[])[0]&&{win:P.fr25[0].win,rounds:P.fr25[0].rounds.length};o.left=(stationed()[tw]||{}).n;
  squadReplay(activeDefs(tw),0,400,'Rot-Fang');o.fr2=P.fr25[0].win;o.ret=TP().returning.length;
  // marches commit troops
  TP().home=0;G.troopSend=0;await sendMarch((q+4)+'_'+(rr+3));o.blocked=myMarches().length===0;
  TP().home=800;G.troopSend=0;BAL.march.minSec=60;await sendMarch((q+4)+'_'+(rr+3));const mm=myMarches()[0];o.sent=mm?mm[1].troops:0;o.homeAfter=TP().home;
  mcardsDraw();o.panel=[...document.querySelectorAll('#mcards .st25')].map(x=>x.textContent);
  o.card=bldCard(tw);o.cardOk=/COMBINED/.test(o.card)&&!/likely|holds|falls/i.test(o.card.replace(/household/g,''));o.card=o.card.length;
  stationTroops(tw,0);o.zeroMsg=[...document.querySelectorAll('.toast,#toast')].map(x=>x.textContent).join('|').slice(-160);
  UI.profile();o.picker=document.querySelectorAll('#modalBody .col25 button').length;UI.closeModal();
  await chatSend25('hello crew');UI.sub.alliance='chat';UI.open('alliance');o.chat=document.querySelectorAll('.cm25').length;UI.close();
  return o;});
console.log(JSON.stringify(r));
await p.evaluate(()=>{const tw=Object.keys(W().towers)[0];map.setView(hexCenter(...idQR(tw)),16);});await p.waitForTimeout(1200);await p.screenshot({path:OUT+'/v25-local-panel.png'});
await p.evaluate(()=>{UI.infoTile(Object.keys(W().towers)[0]);});await p.waitForTimeout(600);await p.screenshot({path:OUT+'/v25-local-bldcard.png'});
// far player (Wichita, Kansas)
const k=await boot({latitude:37.6872,longitude:-97.3301,accuracy:10},'rathdrum-crew','KansasBud');
const kr=await k.evaluate(async()=>{const o={};o.far=isFar25();o.banner=(document.getElementById('far25')||{}).textContent;o.pick=!!G.pick25;
  const id=autoStart25();o.auto=id;startHere25(id);o.anchor=anchor25();o.tile=!!P.tiles[id];o.pos=hexAt(...G.pos).id===id;
  o.pipe=canBuildPipe({id:'x'});P.res.scrap=99999;P.res.parts=99999;P.res.fuel=99999;P.res.food=99999;P.res.water=99999;UI.closeModal();placeStronghold(id);o.sh=W().sh&&W().sh.hex;
  G.drive.on=true;realFix25(37.6872,-97.3301);realFix25(37.6962,-97.3301);realFix25(37.7052,-97.3301);o.km=(G.drive.far25/1000).toFixed(1);G.drive.on=false;
  setPos(37.6872,-97.3301);o.stay=hexAt(...G.pos).id===anchor25();return o;});
console.log(JSON.stringify(kr));await k.waitForTimeout(1500);await k.screenshot({path:OUT+'/v25-local-far.png'});
console.log('ERRORS',errs);await b.close();})();
