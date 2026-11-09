// R1: a save made on the live build (9745fd7) loads on R1 with nothing lost: same reports, same troops and resources.
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();let fails=0;const ok=(c,m,x)=>{console.log((c?'PASS ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x):''));if(!c)fails++;};
 const mk=async()=>{const c=await b.newContext({geolocation:{latitude:47.7796,longitude:-116.8923},permissions:['geolocation'],viewport:{width:390,height:844}});
   await c.route(/googleapis|gstatic|firebase(io|app)\.com|identitytoolkit|tile|openstreetmap|overpass|arcgis|carto/,r=>r.abort());return c;};
 const OLD=process.argv[2]||'http://localhost:8769/',NEW=process.argv[3]||'http://localhost:8767/';
 const c1=await mk();const p1=await c1.newPage();await p1.goto(OLD+'?local');await p1.waitForTimeout(2500);
 const inp=await p1.$$('input');if(inp.length){await inp[0].fill('Pope');await inp[1].fill('testcrew');await p1.click('text=Enter the Wastes').catch(()=>{});}await p1.waitForTimeout(6000);
 const before=await p1.evaluate(async()=>{G.playLocked=false;document.getElementById('auth12')?.remove();G.pos=[47.7796,-116.8923];const c=hexAt(47.7796,-116.8923);claimTile(c.id);W().sh={hex:c.id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:2};P.startSh26=1;P.startShMoved26=1;
   const ring=hexRing(...idQR(c.id),1);for(const x of ring)claimTile(x.id);TP().home=3000;save();
   for(let i=0;i<25;i++){const defs=activeDefs(c.id);squadReplay(defs,defPower(defs),300+i*40,'Rust Dogs');}
   P.hp=9999;fightMutant(Object.keys(MONSTERS)[0],1,'old1');UI.closeModal();P.res.scrap=777;save();await new Promise(r=>setTimeout(r,1500));
   return{fr:(P.fr25||[]).length,home:TP().home,scrap:P.res.scrap,tiles:Object.keys(P.tiles).length,ls:JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])))};});
 await c1.close();
 const c2=await mk();await c2.addInitScript(ls=>{const o=JSON.parse(ls);for(const k in o)localStorage.setItem(k,o[k]);},before.ls);
 const p2=await c2.newPage();const errs=[];p2.on('pageerror',e=>errs.push(e.message));await p2.goto(NEW+'?local');await p2.waitForTimeout(7000);
 const after=await p2.evaluate(()=>{G.playLocked=false;document.getElementById('auth12')?.remove();UI.reports26();return{fr:(P.fr25||[]).length,home:TP().home,scrap:P.res.scrap,tiles:Object.keys(P.tiles).length,items:reportItems26().length,list:document.querySelectorAll('.rp26').length};});
 ok(after.fr===before.fr&&after.home===before.home&&after.scrap===before.scrap&&after.tiles===before.tiles,'old save: reports, troops, scrap and tiles unchanged',{before:{fr:before.fr,home:before.home,scrap:before.scrap,tiles:before.tiles},after});
 ok(after.items>=after.fr&&after.list>0,'old reports show in the new Reports page',{items:after.items,rows:after.list});
 ok(errs.length===0,'no script errors loading the old save',errs.slice(0,3));
 await b.close();console.log(fails?`${fails} FAIL`:'ALL PASS');process.exit(fails?1:0);})();
