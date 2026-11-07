// Headless feature suite for Dead Zone Drive (local demo mode, no Firebase needed).
// Usage:  node tests/run.js            (all scenarios)   node tests/run.js zn pp   (some)
// Needs Playwright with Chromium (npm i playwright; npx playwright install chromium). Serves ../game on :8765 itself.
// A scenario PASSES when it exits cleanly and reports no page errors ("ERRORS []" / "ERRORS 0" / "ERR []").
// These complement Grok Bot's regress suite (gtest); they don't replace it.
const http=require('http'),fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const root=path.join(__dirname,'..','game'),port=+process.env.PORT||8765,types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(root,u==='/'?'index.html':u);if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
const DESC={v26:'v26 garrison combat, pipeline fix, reports, recap, cards',v26g:'v26-9 chat-only, pipe preview, sparse zones, van',v26h:'v26-10 tap escort van info card',v25:'v25 fight, reinforce, states, chat, home map',tabs:'every tab renders + troop march',t3:'ally garrisons, class bonus, loss notes',t3b:'send screen previews + risky confirm',tr:'troops: cost, tiers, hospital, Hungry',cls:'classes + switch',sk:'skill trees v2',mk:'map marks, arrows, areas, done',gps:'GPS accuracy/denied/glitch',zn:'zones states + map',pp:'pipelines drive-to-build',br:'horde intents + offensive',dr:'Drive HUD',b2:'probe/strike, siege, nests, zone boss',p2:'teammate drives your pin + guards',rw:'rewards: daily, achievements, milestones, boss loot',doll:'gear v3 math + survivor',desk:'desktop layout'};
srv.listen(port,async()=>{const pick=process.argv.slice(2),list=(pick.length?pick:Object.keys(DESC)).filter(n=>fs.existsSync(path.join(__dirname,'scenarios',n+'.js')));let fail=0;
  fs.mkdirSync(process.env.OUT||'/tmp/dzd-tests',{recursive:true});
  for(const n of list){const t0=Date.now();const out=await new Promise(res=>{let o='';const c=spawn(process.execPath,[path.join(__dirname,'scenarios',n+'.js')],{env:{...process.env,BASE:`http://localhost:${port}`,OUT:process.env.OUT||'/tmp/dzd-tests'}});
      c.stdout.on('data',d=>o+=d);c.stderr.on('data',d=>o+=d);const k=setTimeout(()=>c.kill(),180e3);c.on('close',code=>{clearTimeout(k);res({o,code});});});
    const ok=out.code===0&&/\bERR(ORS?)? (\[\]|0)/.test(out.o)&&!/PAGEERR|TypeError|ReferenceError/.test(out.o)&&!/\bERR (?!\[\]|0)\S/.test(out.o);if(!ok)fail++;
    console.log(`${ok?'PASS':'FAIL'}  ${n.padEnd(5)} ${(DESC[n]||'').padEnd(48)} ${((Date.now()-t0)/1000).toFixed(1)}s`);if(!ok)console.log(out.o.split('\n').filter(l=>!/agent-proxy|arcgis|Allowed domains|For details/.test(l)).slice(-15).join('\n'));}
  console.log(fail?`\n${fail} failed`:`\nAll ${list.length} passed`);srv.close();process.exit(fail?1:0);});
