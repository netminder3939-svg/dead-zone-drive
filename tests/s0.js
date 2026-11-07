require('./h.js')(process.argv[2]||'http://127.0.0.2:8765/',async(p,errs)=>{
 const st=await p.evaluate(()=>({name:P.name,lvl:P.lvl,tiles:Object.keys(P.tiles).length,troops:P.troops,tabs:[...document.querySelectorAll('#tabs button')].map(b=>b.dataset.tab+(b.querySelector('.dot')?'*':''))}));
 console.log(JSON.stringify(st));await p.screenshot({path:'in.png'});
 for(const t of ['base','plan','alliance','player']){await p.evaluate(t=>UI.open(t),t);await p.waitForTimeout(600);
   const subs=await p.evaluate(t=>UI.SUBS[t].map(x=>x[0]),t);
   for(const s of subs){await p.evaluate(([t,s])=>{UI.sub[t]=s;UI.render();},[t,s]);await p.waitForTimeout(250);}
 }
 await p.evaluate(()=>UI.close());await p.waitForTimeout(16000);
});
