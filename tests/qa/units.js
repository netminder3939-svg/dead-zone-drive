const {chromium,devices}=require('playwright');(async()=>{const b=await chromium.launch();const ctx=await b.newContext({...devices['iPhone 13'],geolocation:{latitude:47.7796,longitude:-116.8923},permissions:['geolocation']});
 await ctx.route(/googleapis|gstatic|firebase(io|app)\.com|identitytoolkit|tile|openstreetmap|overpass|arcgis|carto/,r=>r.abort());const p=await ctx.newPage();
 await p.goto('http://localhost:8765/index.html?local');await p.waitForTimeout(2500);if(await p.$('#obName')){await p.fill('#obName','Pope');await p.fill('#obTeam','qacrew');await p.click('text=Enter the Wastes');}await p.waitForTimeout(5000);
 const hits=await p.evaluate(async()=>{const a=document.getElementById('auth12');if(a)a.remove();const id=hexAt(47.7796,-116.8923).id;claimTile(id);W().sh={hex:id,hpPct:1,state:'up',buildEnd:0,everBuilt:true};P.stronghold={level:2};
   const out=new Set();const grab=()=>{const t=document.body.innerText;for(const m of t.matchAll(/[^\n]{0,40}\b\d[\d,.]*\s?(ft|mi|mph|km|m)\b(?![a-z])[^\n]{0,30}/g))out.add(m[0].trim());};
   for(const t of Object.keys(UI.SUBS))for(const [s] of UI.SUBS[t]){UI.open(t);UI.sub[t]=s;UI.render();await new Promise(r=>setTimeout(r,250));grab();}
   UI.close&&UI.close();UI.build();await new Promise(r=>setTimeout(r,250));grab();UI.closeModal();
   for(const k of Object.keys(P.tiles).slice(0,3)){UI.infoTile(k);await new Promise(r=>setTimeout(r,200));grab();UI.closeModal();}
   return [...out];});
 for(const h of hits)console.log(h);await b.close();})();
