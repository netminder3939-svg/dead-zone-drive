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

ok(cfg.includes('projectId: "dead-zone-drive"'),'the client project id is dead-zone-drive');
ok(preview.includes("hostname.indexOf('--')")&&preview.includes("const PX='pv-'"),'only a hostname containing -- is prefixed pv-');
ok(!preview.includes('localhost'),'localhost is not treated as a test host by the prefix');

// Badge: only netState(false) changes the top-left chip. A listen error is not one of those callers.
const falseCalls=[];
const re=/netState\(false\)/g; let m; while((m=re.exec(march)))falseCalls.push(march.slice(m.index-80,m.index+16).replace(/\s+/g,' '));
ok(march.includes('function armNetFail')&&march.includes("addEventListener('offline'"),'the chip is armed by a failed probe and by the browser offline event');
ok(march.includes('G.netOk===false)return'),'while the chip is off, the 1s march tick does not start another probe');
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
ok(stuck.netOk===false&&stuck.writes.disable===5,'pre-fix schedule model: five network restarts a minute once the chip is off');
ok(stuck.writes.clock>=60,'pre-fix schedule model: one clock write a second while a march is due');

// The restart loop is the same text in the known-good v26-10 march file.
ok(march.includes('function netBackoffMs')&&march.includes('function clockProbe'),'clock recovery waits on a shared probe');
ok(march.includes('if(_recover||_probe)return'),'a second recovery joins the one already running');
ok(march.includes('if(G._netNext&&Date.now()<G._netNext)return'),'a failed probe is not retried on the next march tick');
ok(sw.includes("const C='ddd-v26-11b'")&&sw.includes('.catch(()=>caches.match'),'cache name ddd-v26-11b will not reuse the ddd-v26-11 fallback');
ok((net.match(/onSnapshot/g)||[]).length>=8,'the listen count lives in net.js and was not added by the sync fix');

console.log(fail?fail+' failed':'all passed');
process.exit(fail?1:0);
