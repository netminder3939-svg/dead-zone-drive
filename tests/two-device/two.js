// two-device harness: phone + computer, same email account, fake Firebase
const {chromium,devices}=require('playwright');
const FB='http://localhost:8790';
async function device(browser,kind,game){
  const ctx=await browser.newContext({...(kind==='phone'?devices['iPhone 13']:{viewport:{width:1280,height:850}}),geolocation:{latitude:47.7796,longitude:-116.8923},permissions:['geolocation']});
  await ctx.route(/gstatic\.com\/firebasejs\/[^/]+\/firebase-(app|auth|firestore)\.js/,r=>{const m=r.request().url().match(/firebase-(app|auth|firestore)\.js/)[1];r.fulfill({status:200,contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:`export * from '${FB}/fake-${m}.js';`});});
  await ctx.route(/googleapis|identitytoolkit|tile|openstreetmap|overpass|arcgis|carto/,r=>r.abort());
  const p=await ctx.newPage();p.kind=kind;p.errs=[];
  p.on('pageerror',e=>p.errs.push('PAGEERR '+e.message+' @ '+(e.stack||'').split('\n').slice(1,3).join(' | ')));
  p.on('console',m=>{const t=m.text();if(m.type()==='error'&&!/Failed to load resource/.test(t))p.errs.push(t.slice(0,240));if(/\[sync13\]/.test(t))p.log13=(p.log13||[]).concat(t);});
  await p.goto(game,{waitUntil:'load'});return p;}
async function onboard(p,name){await p.waitForTimeout(1500);const vis=await p.isVisible('#obName').catch(()=>false);if(vis){await p.fill('#obName',name);await p.fill('#obTeam','testcrew');await p.click('text=Enter the Wastes');}}
async function signIn(p,email,pass,mode){await p.waitForSelector('#a12email',{timeout:20000});await p.fill('#a12email',email);await p.fill('#a12pass',pass);
  if(mode==='up')await p.click('#a12up');else await p.click('#a12form button[type=submit], #a12form input[type=submit]');}
async function choose(p,which){try{await p.waitForSelector(which==='import'?'#a12import':'#a12fresh',{state:'visible',timeout:6000});await p.click(which==='import'?'#a12import':'#a12fresh');}catch(e){}}
async function ready(p){await p.waitForFunction(()=>typeof G!=='undefined'&&!G.playLocked&&typeof P!=='undefined'&&P.name,null,{timeout:30000});await p.waitForTimeout(1500);}
const st=p=>p.evaluate(()=>({scrap:P.res.scrap,food:P.res.food,tiles:Object.keys(P.tiles||{}).length,pipes:(P.pipes||[]).length,home:(P.troops||{}).home,lvl:P.lvl,xp:P.xp,rev:P._rev,banner:(document.getElementById('sync13bar')||{}).textContent||'',cs:typeof CS!=='undefined'?CS.report:''}));
module.exports={device,onboard,signIn,choose,ready,st,FB};
