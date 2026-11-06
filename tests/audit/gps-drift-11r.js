// Synthetic GPS decisions for the current 11r rules. No browser, no geolocation, no network.
const fs=require('fs');
const src=fs.readFileSync('/tmp/11r-pack/ddd-v26-11r-flat/public/game.js','utf8');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
function distM(a,b,c,d){const R=6371e3,t=Math.PI/180,x=Math.sin((c-a)*t/2)**2+Math.cos(a*t)*Math.cos(c*t)*Math.sin((d-b)*t/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
const GPS={claimAcc:60,showAcc:1500,minMoveM:6,maxSpeedMs:70};
// What the current gpsFix does with one reading. Mirrors game.js, nothing else.
function decideCurrent(state,fix){
  const acc=fix.acc,now=fix.t;
  if(acc>GPS.showAcc)return {action:'ignore',why:'beyond 1500m',claim:false,move:false,recenter:false,meters:false,landmark:false,lastPos:false};
  const weak=acc>GPS.claimAcc;
  let jump=false,force=state.forceNext;
  if(state.pos){
    const d=distM(state.pos[0],state.pos[1],fix.lat,fix.lng);
    const dt=Math.max(1,(now-(state.lastMove||now))/1000);
    if(d<Math.max(GPS.minMoveM,Math.min(acc,30)/2)&&!force)return {action:'ignore',why:'stationary jitter',d:Math.round(d),claim:false,move:false,recenter:false,meters:false,landmark:false,lastPos:false};
    if(d/dt>GPS.maxSpeedMs&&d>300)jump=true;
  }
  const first=!state.pos;
  const recenter=first||!!state.recenter;
  return {action:weak?'apply-weak':'apply-good',why:jump?'impossible jump still applied':weak?'weak but applied':'good fix',claim:!weak,move:true,recenter,meters:true,landmark:true,lastPos:true,jump};
}
// Proposed: a weak reading never moves, saves, rewards, or claims. An impossible hop is dropped even under 300m.
function decideProposed(state,fix){
  const acc=fix.acc,now=fix.t;
  if(acc>GPS.claimAcc)return {action:'ignore',why:'weaker than 60m',claim:false,move:false,recenter:false,meters:false,landmark:false,lastPos:false};
  if(state.pos){
    const d=distM(state.pos[0],state.pos[1],fix.lat,fix.lng);
    const dt=Math.max(1,(now-(state.lastMove||now))/1000);
    if(d<Math.max(GPS.minMoveM,Math.min(acc,30)/2)&&!state.forceNext)return {action:'ignore',why:'stationary jitter',claim:false,move:false,recenter:false,meters:false,landmark:false,lastPos:false};
    if(d/dt>GPS.maxSpeedMs&&d>30)return {action:'ignore',why:'impossible jump',claim:false,move:false,recenter:false,meters:false,landmark:false,lastPos:false};
  }
  const first=!state.pos;
  return {action:'apply-good',why:'good fix',claim:true,move:true,recenter:first||!!state.recenter,meters:true,landmark:true,lastPos:true};
}
const here=[47.8135,-116.8968];
function east(m){return [here[0],here[1]+m/(111320*Math.cos(here[0]*Math.PI/180))];}
ok(/claimAcc:60,showAcc:1500,minMoveM:6,maxSpeedMs:70,staleMs:30000/.test(src),'11r still uses these GPS thresholds');
ok(/acc>GPS\.showAcc\)\{G\.gps\.state='weak';return gpsChip\(\)/.test(src),'a reading worse than 1500m is ignored');
ok(/G\.gpsWeak=acc>GPS\.claimAcc/.test(src),'61m through 1500m is marked weak and still continues');
ok(/if\(P\.world&&\(!G\.gpsWeak/.test(src),'setPos claims only when the reading was not marked weak');
ok(/checkLandmarks\(\);if\(P\.world&&\(!G\.gpsWeak/.test(src),'landmark rewards run before the weak-claim guard');
ok(/d\/dt>GPS\.maxSpeedMs&&d>300\)G\.jump=true/.test(src),'an impossible hop is flagged, not rejected');
ok(!/lastPos/.test(fs.readFileSync('/tmp/11r-pack/ddd-v26-11r-flat/public/sync26.js','utf8')),'the save compare does not carry position to another device');

const phone=decideCurrent({pos:here,lastMove:1000},{lat:east(40)[0],lng:east(40)[1],acc:8,t:9000});
ok(phone.action==='apply-good'&&phone.claim&&phone.move,'a phone walking 40m at ±8m is applied and can claim');
const stand=decideCurrent({pos:here,lastMove:1000},{lat:east(4)[0],lng:east(4)[1],acc:8,t:2000});
ok(stand.action==='ignore'&&stand.why==='stationary jitter','a 4m wobble at ±8m is ignored');
const weakHop=decideCurrent({pos:here,lastMove:1000},{lat:east(180)[0],lng:east(180)[1],acc:120,t:3000});
ok(weakHop.action==='apply-weak'&&weakHop.move&&!weakHop.claim&&weakHop.meters&&weakHop.landmark,'a stationary computer hop of 180m at ±120m moves the dot, adds distance, and can award a landmark, without claiming');
const useless=decideCurrent({pos:here,lastMove:1000},{lat:east(800)[0],lng:east(800)[1],acc:2000,t:4000});
ok(useless.action==='ignore','a ±2000m reading does not move the dot');
const tightLie=decideCurrent({pos:here,lastMove:1000},{lat:east(250)[0],lng:east(250)[1],acc:40,t:2000});
ok(tightLie.action==='apply-good'&&tightLie.claim&&!tightLie.jump,'a 250m hop in one second at ±40m is treated as a real move and can claim');
const bigJump=decideCurrent({pos:here,lastMove:1000},{lat:east(900)[0],lng:east(900)[1],acc:40,t:2000});
ok(bigJump.action==='apply-good'&&bigJump.jump&&bigJump.claim&&bigJump.move,'a 900m hop is still applied and can claim the arrival hex');
const proposedWeak=decideProposed({pos:here,lastMove:1000},{lat:east(180)[0],lng:east(180)[1],acc:120,t:3000});
ok(proposedWeak.action==='ignore'&&!proposedWeak.move&&!proposedWeak.claim&&!proposedWeak.landmark,'the proposed rule drops the ±120m computer hop');
const proposedPhone=decideProposed({pos:here,lastMove:1000},{lat:east(40)[0],lng:east(40)[1],acc:8,t:9000});
ok(proposedPhone.action==='apply-good'&&proposedPhone.claim,'the proposed rule still accepts the phone walk');
const proposedLie=decideProposed({pos:here,lastMove:1000},{lat:east(250)[0],lng:east(250)[1],acc:40,t:2000});
ok(proposedLie.action==='ignore'&&proposedLie.why==='impossible jump','the proposed rule drops a 250m one-second hop even at ±40m');
console.log(fail?fail+' failed':'all passed');
process.exit(fail?1:0);
