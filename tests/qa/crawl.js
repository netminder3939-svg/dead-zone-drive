// QA crawl: every tab + sub-tab, every safe button inside, map tiles/structures; phone + desktop. Logs errors, overflow, empty screens.
const {chromium,devices}=require('playwright');
const VIEW=process.argv[2]||'phone';const OUT=__dirname+'/'+VIEW;require('fs').mkdirSync(OUT,{recursive:true});
const BAD=/log ?out|wipe|reset|delete|remove|leave|abandon|sign out|hand over|disband|salvage|scrap all|retire|forget|switch account|new game|start over|clear/i;
(async()=>{const b=await chromium.launch();
 const ctx=await b.newContext({...(VIEW==='phone'?devices['iPhone 13']:{viewport:{width:1366,height:850}}),geolocation:{latitude:47.7796,longitude:-116.8923},permissions:['geolocation']});
 await ctx.route(/googleapis|gstatic|firebase(io|app)\.com|identitytoolkit|tile|openstreetmap|overpass|arcgis|carto/,r=>r.abort());
 const p=await ctx.newPage();const errs=[];let where='boot';
 p.on('pageerror',e=>errs.push(where+' :: PAGEERR '+e.message+' @ '+(e.stack||'').split('\n').slice(1,3).join(' | ')));
 p.on('console',m=>{const t=m.text();if((m.type()==='error'||m.type()==='warning')&&!/Failed to load resource|ERR_FAILED|net::/.test(t))errs.push(where+' :: '+m.type()+' '+t.slice(0,240));});
 await p.goto('http://localhost:8765/index.html?local',{waitUntil:'load'});await p.waitForTimeout(2500);
 const inp=await p.$$('#obName');if(inp.length){await p.fill('#obName','Pope');await p.fill('#obTeam','qacrew');await p.click('text=Enter the Wastes');}
 await p.waitForTimeout(6000);
 // a realistic mid-game profile
 await p.evaluate(async()=>{const a=document.getElementById('auth12');if(a)a.remove();G.playLocked=false;
   const id=hexAt(47.7796,-116.8923).id;claimTile(id);W().sh={hex:id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:3};P.startSh26=1;P.startShMoved26=1;
   const [q,r]=idQR(id);for(const x of hexRing(q,r,3))claimTile(x.id);
   for(const k of Object.keys(RES))P.res[k]=5000;TP().home=3000;P.lvl=6;
   const ho=hexAt(47.83,-116.80).id;claimTile(ho);W().outposts[ho]={state:'up',kind:'home',start:1,endsAt:1,hpPct:1};addPool15(ho,400);
   const t1=hexRing(q,r,2)[0].id;W().towers=W().towers||{};W().towers[t1]={state:'up',level:2,hpPct:1};
   await claimLeader15();await setHq15(hexRing(q,r,4)[0].id,'Rathdrum');portal15('sh',ho,200);
   P.pipes=[{id:'pp1',name:'Test Line',route:hexRing(q,r,1).map(x=>x.id),st:'on',res:'scrap'}];
   save();try{factionCatchUp(true);}catch(e){}UI.closeModal&&UI.closeModal();});
 await p.waitForTimeout(2000);
 const shot=async n=>{try{await p.screenshot({path:OUT+'/'+n.replace(/[^a-z0-9_-]/gi,'_')+'.png'});}catch(e){}};
 const overflow=()=>p.evaluate(()=>{const W=innerWidth;const bad=[];for(const el of document.querySelectorAll('#sheet *,#modal *,#hud *,#op15 *')){const r=el.getBoundingClientRect();if(r.width>0&&r.right>W+2&&getComputedStyle(el).position!=='fixed'){bad.push((el.id?'#'+el.id:el.className||el.tagName)+':'+Math.round(r.right));if(bad.length>4)break;}}
   return{page:document.documentElement.scrollWidth>W+2?document.documentElement.scrollWidth:0,els:bad};});
 const report=[];
 const tabs=await p.evaluate(()=>Object.keys(UI.SUBS));
 for(const tab of tabs){const subs=await p.evaluate(t=>UI.SUBS[t].map(x=>x[0]),tab);
   for(const sub of subs){where=tab+'/'+sub;
     await p.evaluate(([t,s])=>{try{UI.closeModal();}catch(e){}UI.open(t);UI.sub[t]=s;UI.render();},[tab,sub]);await p.waitForTimeout(400);
     const info=await p.evaluate(()=>{const b=document.getElementById('sheetBody');return{len:b?b.innerText.trim().length:0,txt:b?b.innerText.slice(0,80).replace(/\s+/g,' '):'' ,und:b?(b.innerText.match(/undefined|NaN|\[object Object\]|null mi|NaN mi/g)||[]).slice(0,3):[]};});
     const of=await overflow();report.push({where,len:info.len,und:info.und,of});await shot(where);
     // click safe buttons in the sheet, one at a time
     const n=await p.evaluate(()=>document.querySelectorAll('#sheetBody button').length);
     for(let i=0;i<Math.min(n,40);i++){const lab=await p.evaluate(i=>{const x=document.querySelectorAll('#sheetBody button')[i];return x?(x.innerText||x.title||'').trim().slice(0,40):null;},i);
       if(lab===null||BAD.test(lab))continue;where=tab+'/'+sub+' ▸ '+lab;
       try{await p.evaluate(i=>{const x=document.querySelectorAll('#sheetBody button')[i];if(x&&!x.disabled)x.click();},i);}catch(e){errs.push(where+' :: click '+e.message);}
       await p.waitForTimeout(250);
       const m=await p.evaluate(()=>{const md=document.getElementById('modal');const open=md&&!md.classList.contains('hidden');const t=open?document.getElementById('modalBody').innerText:'';return{open,und:(t.match(/undefined|NaN|\[object Object\]/g)||[]).slice(0,3),t:t.slice(0,60).replace(/\s+/g,' ')};});
       if(m.open){const of2=await overflow();if(m.und.length||of2.page||of2.els.length)report.push({where,modal:m.t,und:m.und,of:of2});try{await p.evaluate(()=>UI.closeModal());}catch(e){}}
       // re-open the same sheet if the click navigated away
       await p.evaluate(([t,s])=>{if(UI.tab!==t||UI.sub[t]!==s){UI.open(t);UI.sub[t]=s;UI.render();}},[tab,sub]);}
   }}
 // map: tap own tiles, tower, outpost, stronghold, HQ, a faction tile, an empty tile
 await p.evaluate(()=>{UI.close&&UI.close();});
 const ids=await p.evaluate(()=>{const o={sh:shHex15(),ho:homeOp15(),tower:Object.keys(W().towers||{})[0],empty:hexAt(47.70,-116.95).id};try{const f=Object.values(FX().f)[0];if(f)o.faction=Object.keys(f.tiles)[0],o.fhome=f.home;}catch(e){}o.own=Object.keys(P.tiles)[3];return o;});
 for(const [k,id] of Object.entries(ids)){if(!id)continue;where='map tile '+k;try{await p.evaluate(id=>{UI.infoTile(id);},id);}catch(e){errs.push(where+' :: '+e.message);}await p.waitForTimeout(400);
   const m=await p.evaluate(()=>{const t=(document.getElementById('modalBody')||{}).innerText||'';return{t:t.slice(0,70).replace(/\s+/g,' '),und:(t.match(/undefined|NaN|\[object Object\]/g)||[]).slice(0,3)};});const of=await overflow();report.push({where,modal:m.t,und:m.und,of});await shot(where);
   const nb=await p.evaluate(()=>document.querySelectorAll('#modalBody button').length);
   for(let i=0;i<Math.min(nb,12);i++){const lab=await p.evaluate(i=>{const x=document.querySelectorAll('#modalBody button')[i];return x?x.innerText.trim().slice(0,40):null;},i);if(lab===null||BAD.test(lab))continue;where='map tile '+k+' ▸ '+lab;
     await p.evaluate(i=>{const x=document.querySelectorAll('#modalBody button')[i];if(x&&!x.disabled)x.click();},i);await p.waitForTimeout(300);
     await p.evaluate(id=>{try{UI.closeModal();}catch(e){}G.pick15=null;UI.infoTile(id);},id);await p.waitForTimeout(200);}
   await p.evaluate(()=>{try{UI.closeModal();}catch(e){}});}
 // build menu, bases, portal, drive
 for(const [n,fn] of [['build',()=>UI.build()],['bases',()=>UI.bases15()],['portal',()=>UI.portal15(homeOp15())],['drive on',()=>toggleDrive()],['drive off',()=>toggleDrive()]]){where=n;try{await p.evaluate(fn);}catch(e){errs.push(n+' :: '+e.message);}await p.waitForTimeout(700);
   const of=await overflow();const t=await p.evaluate(()=>((document.getElementById('modalBody')||{}).innerText||'').slice(0,60));report.push({where:n,modal:t.replace(/\s+/g,' '),of});await shot(n);try{await p.evaluate(()=>UI.closeModal());}catch(e){}}
 await p.evaluate(()=>{UI.close&&UI.close();});await p.waitForTimeout(500);await shot('map-final');
 const issues=report.filter(r=>r.und&&r.und.length||r.of&&(r.of.page||r.of.els.length)||(r.len!==undefined&&r.len<20));
 console.log('screens',report.length,'issues',issues.length);for(const r of issues)console.log(JSON.stringify(r));
 console.log('errors',[...new Set(errs)].length);for(const e of [...new Set(errs)].slice(0,60))console.log(e);
 await b.close();})();
