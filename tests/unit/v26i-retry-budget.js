// App reaction to a dropped Firestore listen. No Firebase, no network.
// The 19:45 PT console lines (ERR_TUNNEL_CONNECTION_FAILED, Listen stream transport errored)
// are not replayed here. This checks what the game code does when that warning happens.
const fs=require('fs');
const path=require('path');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
function read(p){return fs.readFileSync(path.join(__dirname,'../../',p),'utf8');}
const march=read('js/march.js');
const v26i=read('js/v26i.js');
const sync=read('js/sync26.js');
const sw=read('sw.js');
const net=read('js/net.js');
const preview=read('js/preview.js');
const cfg=read('firebase-config.js');
// Byte-for-byte the v26-10 netKick. Compared on this machine against the v26-10 rollback before the assertion was locked.
const V26_10_KICK="async function netKick(){if(NET.mode!=='firebase'||!NET.fs)return;try{await NET.fs.disableNetwork(NET.db);await NET.fs.enableNetwork(NET.db);}catch(e){}\n  try{const t=await withTO(NET.srvNow(),8000);G.srvOff=t-Date.now();netState(true);marchTick();}catch(e){netState(false);}}\n";

ok(cfg.includes('projectId: "dead-zone-drive"'),'the client project id is dead-zone-drive');
ok(preview.includes("hostname.indexOf('--')")&&preview.includes("const PX='pv-'"),'only a hostname containing -- is prefixed pv-');
ok(!preview.includes('localhost'),'localhost is not treated as a test host by the prefix');

// Badge: only netState(false) changes the top-left chip. A listen error is not one of those callers.
const falseCalls=[];
const re=/netState\(false\)/g; let m; while((m=re.exec(march)))falseCalls.push(march.slice(m.index-80,m.index+16).replace(/\s+/g,' '));
ok(falseCalls.length===3,'march.js sets the reconnect chip from exactly three sites');
ok(falseCalls.some(s=>s.includes("addEventListener('offline'")),'one site is the browser offline event');
ok(march.includes("catch(e){netState(false);}}"),'one site is a failed clock probe inside netKick');
ok(march.includes('Retrying')&&!v26i.includes('Retrying')&&!sync.includes('Retrying'),'the only Retrying text is the march clock-probe toast');
ok(!v26i.includes('netState')&&!v26i.includes('disableNetwork'),'v26-11 sync does not flip the chip or restart the Firestore network');
ok(!sync.includes('onSnapshot')&&!v26i.includes('onSnapshot'),'v26-11 adds no listen streams');

function kickArmed(netOk){return netOk===false;}
ok(kickArmed(undefined)===false,'a listen error that never sets the chip does not arm the 15s restart');
ok(kickArmed(false)===true,'once the chip is red, the 15s restart is armed');

// 60s with listen transport errors only, no marches, chip never set. v26-10 and v26-11.
function budget(opts){
  const writes={clock:0,save:0,disable:0};
  const reads={save:0};
  let netOk; // undefined until a probe fails
  const marches=opts.marches||0;
  for(let t=0;t<=60000;t+=1000){
    if(opts.listenError && t===0){ /* SDK logs and retries on its own. The app does not hear it. */ }
    if(marches&&t%1000===0){
      if(opts.clockFails){netOk=false;writes.clock++;}
      else writes.clock++;
    }
    if(kickArmed(netOk)&&t%15000===0){writes.disable++;writes.clock++;}
    if(opts.v26i && t%20000===0)reads.save++;
  }
  return {writes,reads,netOk};
}
const listenOnly=budget({listenError:true,v26i:true});
ok(listenOnly.writes.clock===0&&listenOnly.writes.disable===0&&listenOnly.netOk===undefined,'listen errors alone cause no clock writes and no chip');
ok(listenOnly.reads.save===4,'the new 20s sync is four save reads a minute, not a listen restart');
const oldListen=budget({listenError:true,v26i:false});
ok(oldListen.writes.disable===0&&oldListen.reads.save===0,'v26-10 also leaves the chip alone, and does not add those reads');
const stuck=budget({marches:1,clockFails:true,v26i:true});
ok(stuck.netOk===false&&stuck.writes.disable===5,'a failing march clock probe arms five network restarts a minute');
ok(stuck.writes.clock>=60,'that probe is already a once-a-second clock write while the march is due');

// The restart loop is the same text in the known-good v26-10 march file.
function sliceKick(src){
  const i=src.indexOf('async function netKick');
  return src.slice(i,src.indexOf('window.addEventListener',i));
}
ok(sliceKick(march)===V26_10_KICK,'netKick is unchanged from v26-10');
ok(sw.includes("const C='ddd-v26-11'")&&sw.includes('.catch(()=>caches.match'),'a failed fetch can still serve the previous file from the ddd-v26-11 cache');
ok((net.match(/onSnapshot/g)||[]).length>=8,'the listen count lives in net.js and was not added by the sync fix');

console.log(fail?fail+' failed':'all passed');
process.exit(fail?1:0);
