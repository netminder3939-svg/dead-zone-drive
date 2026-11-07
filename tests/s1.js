require('./h.js')(process.argv[2],async(p)=>{
 const dots=()=>p.evaluate(()=>[...document.querySelectorAll('#tabs button[data-tab]')].filter(b=>b.querySelector('.dot')).map(b=>b.dataset.tab).join(','));
 const fast=process.argv[3]==='fast';
 // --- PLAN: a teammate marks something, then deletes it
 await p.evaluate(()=>{G.markers=G.markers||{};G.markers['mk1']={type:'attack',hex:Object.keys(G.terr||{})[0]||hexAt(47.7796,-116.8923).id,by:'Jacob',uid:'other',t:Date.now(),exp:Date.now()+864e5};});
 await p.waitForTimeout(4000);
 console.log('A plan news after mark:',await p.evaluate(()=>JSON.stringify((P.news||[]).map(x=>x.tab+'/'+x.sub+'/'+x.key))),'dots:',await dots());
 await p.evaluate(()=>{UI.open('plan');});await p.waitForTimeout(800);await p.evaluate(()=>UI.close());await p.waitForTimeout(500);
 console.log('B after opening Plan:',await p.evaluate(()=>(P.news||[]).length),'dots:',await dots());
 // re-add then delete the mark without opening plan
 await p.evaluate(()=>{G.m2seen.delete('mk1');});await p.waitForTimeout(4000);
 await p.evaluate(()=>{delete G.markers['mk1'];G.markers['other']={type:'note',hex:'x',exp:0};});
 await p.waitForTimeout(7000);await p.evaluate(()=>{try{newsDots()}catch(e){}});
 console.log('C after mark deleted (no visit):',await p.evaluate(()=>(P.news||[]).length),'dots:',await dots());
 // --- RAID: boss pops, then escapes
 await p.evaluate(()=>{P.news=[];G._seenRaids={};G.raids=G.raids||{};const id='rz1';const b=Object.keys(MONSTERS).find(k=>/boss/.test(k))||Object.keys(MONSTERS)[0];G.raids[id]={id,bossId:b,hp:100,maxHp:100,endsAt:Date.now()+8000,place:'Test Lair',finder:'Jacob',participants:{}};UI.raidBanner();});
 await p.waitForTimeout(800);
 console.log('D raid up news:',await p.evaluate(()=>JSON.stringify((P.news||[]).map(x=>x.tab+'/'+x.sub+'/'+x.key))),'dots:',await dots());
 await p.waitForTimeout(9000);await p.evaluate(()=>{UI.raidBanner();try{newsDots()}catch(e){}});await p.waitForTimeout(5500);
 console.log('E raid gone (no visit):',await p.evaluate(()=>JSON.stringify((P.news||[]).map(x=>x.key))),'dots:',await dots());
 await p.evaluate(()=>{UI.open('alliance');});await p.waitForTimeout(800);
 console.log('F newsline on alliance:',await p.evaluate(()=>[...document.querySelectorAll('.newsline')].map(e=>e.textContent).join(' || ')));
 await p.evaluate(()=>UI.close());await p.waitForTimeout(500);
 console.log('G after visiting Alliance:',await p.evaluate(()=>(P.news||[]).length),'dots:',await dots());
});
