// R1: every card closes with ONE tap on its close button (50 rounds per card type), Back/Esc closes fight cards,
// an old fight's playback never writes onto a newer card, and march results / raid alerts the game opens on its own wait in a queue.
require('./h.js')(process.argv[2],async(p,errs)=>{
 let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const ev=(f,a)=>p.evaluate(f,a);
 await ev(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();G.pos=[47.7796,-116.8923];const c=hexAt(47.7796,-116.8923);claimTile(c.id);W().sh={hex:c.id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:1};P.startSh26=1;P.startShMoved26=1;
   for(const x of hexRing(...idQR(c.id),1))claimTile(x.id);save();});
 await p.waitForTimeout(1500);
 const open=()=>ev(()=>!$('#modal').classList.contains('hidden'));
 const tapClose=async()=>{if(await ev(()=>!!$('#rskip'))){await ev(()=>$('#rskip').click());await p.waitForTimeout(100);}const h=await p.evaluateHandle(()=>{const bs=[...document.querySelectorAll('#modal button')].filter(b=>b.offsetParent);return bs.find(b=>/^\s*(✕|✖ Close|Close|Continue)\s*$/.test(b.textContent))||null;});const el=h.asElement();if(!el)return 'no close button';
   const bb=await el.boundingBox();await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);await p.waitForTimeout(120);return (await open())?'still open':'closed';};
 const kinds={
  tile:()=>UI.infoTile(W().sh.hex),
  monster:()=>{const m=Object.keys(MONSTERS)[0];UI.infoMon(m,1,'k'+Math.random(),G.pos[0]+.0005,G.pos[1]);},
  person:()=>UI.person26(P.uid),
  reports:()=>UI.inbox(),
  fightDone:()=>{P.hp=9999;const m=Object.keys(MONSTERS)[0];fightMutant(m,1,'k'+Math.random());$('#rskip')&&$('#rskip').click();},
 };
 for(const [k,fn] of Object.entries(kinds)){let bad=[];for(let i=0;i<50;i++){await p.mouse.move(5,5);await p.mouse.down();await p.mouse.up();await ev(`(${fn.toString()})()`);await p.waitForTimeout(60);
   if(!(await open())){bad.push(i+':did not open');continue;}const r=await tapClose();if(r!=='closed')bad.push(i+':'+r);}
  ok(bad.length===0,`${k} card closes with one tap, 50 times`,bad.slice(0,4));}
 // Back (Esc) closes a fight card mid-playback
 await p.mouse.click(5,5);await ev(()=>{P.hp=9999;fightMutant(Object.keys(MONSTERS)[0],1,'kb');$('#rauto').click();});await p.waitForTimeout(300);
 await p.keyboard.press('Escape');await p.waitForTimeout(200);ok(!(await open()),'Esc/Back closes a fight card while it plays');
 // old playback must not write onto a newer card: fight A (monster 1) is closed mid-play, fight B (monster 2) opens
 const names=await ev(()=>{const ks=Object.keys(MONSTERS);return [MONSTERS[ks[0]].name,MONSTERS[ks[1]].name];});
 await p.mouse.click(5,5);await ev(()=>{P.hp=99999;fightMutant(Object.keys(MONSTERS)[0],9,'ka');$('#rauto')&&!$('#rauto').disabled&&$('#rauto').click();});await p.waitForTimeout(400);
 await p.mouse.click(5,5);await ev(()=>{UI.closeModal();P.hp=99999;fightMutant(Object.keys(MONSTERS)[1],9,'kc');});await p.waitForTimeout(2500);
 const nw=await ev(()=>({log:($('#rlog')||{}).textContent||'',title:($('#modalBody h2')||{}).textContent}));
 ok(!nw.log.includes(names[0]),'a closed fight never plays onto the next fight card',{A:names[0],B:names[1],log:nw.log.slice(0,120)});
 await ev(()=>UI.closeModal());
 // auto-opened cards wait in a queue while a card is open
 await p.mouse.click(5,5);await ev(()=>UI.infoTile(W().sh.hex));await p.waitForTimeout(1800);
 await ev(()=>{const mk=t=>{const f=runFight([playerUnit()],mutantUnits(Object.keys(MONSTERS)[0],1));G._marchId='mq'+t;UI.replay({title:'March result '+t,sub:'x',f,good:f.win,result:'r',buttons:[['Continue',()=>UI.closeModal(),'big']]});delete G._marchId;};mk('A');mk('B');});await p.waitForTimeout(200);
 const q1=await ev(()=>({title:$('#modalBody h2')&&$('#modalBody h2').textContent,queued:CARD1.queue.length}));ok(q1.queued===2&&!/March result/.test(q1.title),'game-opened cards queue behind the open card',q1);
 ok(await tapClose()==='closed','closing the card does not pop the queued one over it');await p.waitForTimeout(1700);
 const bar=await ev(()=>{const b=document.getElementById('cardq1');return b?b.textContent:null;});ok(!!bar&&/2 waiting/.test(bar),'a bar says 2 are waiting',bar);
 await p.click('#cardq1');await p.waitForTimeout(300);ok(await ev(()=>/March result A/.test($('#modalBody').textContent)),'tapping the bar opens the first one');
 await tapClose();await p.waitForTimeout(1700);await p.click('#cardq1');await p.waitForTimeout(300);ok(await ev(()=>/March result B/.test($('#modalBody').textContent)),'then the second');
 await tapClose();await p.waitForTimeout(1700);ok(await ev(()=>!document.getElementById('cardq1')),'bar gone when the queue is empty');
 // a card the player opens with a tap is never queued
 await p.click('#tabs [data-tab=map]').catch(()=>{});await ev(()=>UI.info({title:'Tapped card',body:'x'}));await p.waitForTimeout(200);ok(await ev(()=>/Tapped card/.test($('#modalBody').textContent)),'a tapped card opens right away');
 console.log(fails?`${fails} FAIL`:'ALL PASS');
});
