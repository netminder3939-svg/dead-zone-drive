const {chromium}=require('playwright');
module.exports=async function(root,fn){
const b=await chromium.launch();const c=await b.newContext({geolocation:{latitude:47.7796,longitude:-116.8923},permissions:['geolocation'],viewport:{width:+process.env.VW||430,height:+process.env.VH||900}});
await c.route(/googleapis|gstatic|firebase(io|app)\.com|identitytoolkit/,r=>r.abort());
await c.route(/tile|openstreetmap|overpass|arcgis|carto/,r=>r.abort());
const p=await c.newPage();const errs=[];
p.on('pageerror',e=>errs.push('PAGEERR '+e.message+' @ '+(e.stack||'').split('\n').slice(1,3).join(' | ')));
p.on('console',m=>{const t=m.text();if((m.type()==='error'||m.type()==='warning')&&!/Failed to load resource/.test(t))errs.push(m.type()+' '+t.slice(0,300));});
await p.goto(root+'?local',{waitUntil:'load'});await p.waitForTimeout(2500);
const inp=await p.$$('input');if(inp.length){await inp[0].fill('Pope');await inp[1].fill('testcrew');await p.click('text=Enter the Wastes');}
await p.waitForTimeout(8000);
try{await fn(p,errs);}catch(e){console.log('SCENARIO FAIL',e.message);}
console.log('--- errors ('+errs.length+')');console.log([...new Set(errs)].slice(0,80).join('\n'));await b.close();};
