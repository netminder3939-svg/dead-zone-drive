// Pure sync + claim-route rules for ddd-v26-11. No DOM, no Firebase.
// Browser classic script and Node (module.exports) both work.
(function(root){
  const RES=['scrap','food','water','fuel','parts'];

  function clone(o){return o==null?o:JSON.parse(JSON.stringify(o));}
  function clockOf(o){const c=o&&o.sync26&&o.sync26.clock;return c&&typeof c==='object'?c:null;}
  function cmpClock(a,b){
    const A=a||{},B=b||{},keys=new Set([...Object.keys(A),...Object.keys(B)]);
    let ag=false,bg=false;
    for(const k of keys){const av=A[k]|0,bv=B[k]|0;if(av>bv)ag=true;else if(bv>av)bg=true;}
    if(ag&&!bg)return 1;if(bg&&!ag)return -1;if(!ag&&!bg)return 0;return 2;
  }
  function clockEqual(a,b){
    const A=(a&&a.clock)||a||{},B=(b&&b.clock)||b||{};
    const la=(a&&a.legacyAt)||{},lb=(b&&b.legacyAt)||{};
    return cmpClock(A,B)===0&&JSON.stringify(stable(la))===JSON.stringify(stable(lb));
  }
  function stable(v){
    if(Array.isArray(v))return v.map(stable);
    if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;}
    return v;
  }
  function normRes(r){const o={};for(const k of RES)o[k]=Math.max(0,(r&&r[k])|0);return o;}
  function driveKey(r){
    if(!r||!(parseFloat(r.km)>=0)||(r.newHex|0)<0)return '';
    if(r.restored)return 'restored';
    return String(r.t0)+'|'+String(r.t)+'|'+String(r.km);
  }
  function realDrives(list){return (list||[]).filter(r=>r&&!r.restored&&driveKey(r));}
  function unionDrives(a,b){
    const map=new Map();
    for(const r of [...(a||[]),...(b||[])]){
      const k=driveKey(r);if(!k)continue;
      const prev=map.get(k);
      if(!prev||(prev.restored&&!r.restored))map.set(k,clone(r));
    }
    const all=[...map.values()];
    const real=all.filter(r=>!r.restored).sort((x,y)=>(y.t||0)-(x.t||0));
    const rest=all.filter(r=>r.restored);
    return [...real,...rest].slice(0,20);
  }
  function supersetKeys(a,b){for(const k in b||{})if(!(k in (a||{})))return false;return true;}
  function meters(o){return (o&&o.stats&&o.stats.meters)||0;}
  function kills(o){return (o&&o.stats&&o.stats.kills)||0;}
  function xpTuple(o){return [(o&&o.lvl)||1,(o&&o.xp)||0];}
  function tupleLess(a,b){return a[0]<b[0]||(a[0]===b[0]&&a[1]<b[1]);}
  function skillsCover(a,b){for(const id in b||{})if(((a||{})[id]||0)<b[id])return false;return true;}
  // Strict progress superset: covers the other save and has something it does not.
  function strictlyAhead(A,B){return monoDominates(A,B)&&!monoDominates(B,A);}
  function monoDominates(A,B){
    if(meters(A)<meters(B)||kills(A)<kills(B))return false;
    if(tupleLess(xpTuple(A),xpTuple(B)))return false;
    if(!supersetKeys(A.badges,B.badges)||!supersetKeys(A.pipeUnlock26,B.pipeUnlock26))return false;
    if(!supersetKeys(A.tiles,B.tiles))return false;
    if(!skillsCover(A.skills,B.skills))return false;
    const have=new Set(realDrives(A.dr26).map(driveKey));
    for(const r of realDrives(B.dr26))if(!have.has(driveKey(r)))return false;
    return true;
  }
  // Land (tiles + real drive rows), ignoring the seeded "restored" placeholder.
  function landAhead(A,B){
    if(!supersetKeys(A.tiles,B.tiles))return false;
    const have=new Set(realDrives(A.dr26).map(driveKey));
    for(const r of realDrives(B.dr26))if(!have.has(driveKey(r)))return false;
    return Object.keys(A.tiles||{}).length>Object.keys(B.tiles||{}).length||realDrives(A.dr26).length>realDrives(B.dr26).length;
  }
  function sawLegacy(stamped,legacy){
    const id=(legacy&&legacy.uid)||'legacy';
    const saw=stamped&&stamped.sync26&&stamped.sync26.legacyAt&&stamped.sync26.legacyAt[id];
    return saw!=null&&(legacy._savedAt||0)<=saw;
  }
  function ensure(p){
    p.sync26=p.sync26||{clock:{},ops:[],legacyAt:{},snap:null};
    p.sync26.clock=p.sync26.clock||{};
    p.sync26.ops=p.sync26.ops||[];
    p.sync26.legacyAt=p.sync26.legacyAt||{};
    return p.sync26;
  }
  function absorb(profile,other){
    const s=ensure(profile);
    const c=clockOf(other);
    if(c){for(const k in c)s.clock[k]=Math.max(s.clock[k]||0,c[k]|0);}
    else if(other){const id=other.uid||'legacy';s.legacyAt[id]=Math.max(s.legacyAt[id]||0,other._savedAt||0);}
    const ops=[...(s.ops||[]),...((other&&other.sync26&&other.sync26.ops)||[])];
    const seen=new Set();const out=[];
    for(const op of ops){if(!op||!op.id||seen.has(op.id))continue;seen.add(op.id);out.push(op);}
    s.ops=out.slice(-200);
    if((other&&other.sync26&&other.sync26.truncated)||s.truncated)s.truncated=true;
  }
  function maxContrib(a,b){
    const o={...(a||{})};
    for(const k in b||{})if(typeof b[k]==='number')o[k]=Math.max(o[k]||0,b[k]);
    return o;
  }
  function overlayMono(profile,other){
    profile.badges={...(profile.badges||{}),...(other.badges||{})};
    profile.pipeUnlock26={...(profile.pipeUnlock26||{}),...(other.pipeUnlock26||{})};
    profile.dr26=unionDrives(profile.dr26,other.dr26);
    profile.stats={...(other.stats||{}),...(profile.stats||{}),meters:Math.max(meters(profile),meters(other)),kills:Math.max(kills(profile),kills(other))};
    const ta=xpTuple(profile),tb=xpTuple(other);
    if(tupleLess(ta,tb)){profile.lvl=tb[0];profile.xp=tb[1];}
    profile.contrib=maxContrib(profile.contrib,other.contrib);
    if(tupleLess(xpTuple(profile),xpTuple(other))){profile.lvl=other.lvl;profile.xp=other.xp;profile.sp=other.sp;profile.skills=clone(other.skills)||{};}
    profile.marchDone={...(other.marchDone||{}),...(profile.marchDone||{})};
    profile.marchPaid={...(other.marchPaid||{}),...(profile.marchPaid||{})};
    profile.skills=profile.skills||{};
  }
  function emptyObj(v){return !v||(typeof v==='object'&&!Array.isArray(v)&&!Object.keys(v).length);}

  function campMap(m){
    if(!m||typeof m!=='object')return null;
    const o={};
    Object.keys(m).sort().forEach(function(k){if(m[k])o[k]=m[k];});
    return Object.keys(o).length?o:null;
  }
  function liveCamps(p){
    const w=p&&p.world||{},ids=[];
    const sh=w.sh;
    if(sh&&sh.hex&&sh.state!=='down')ids.push('sh:'+sh.hex);
    Object.keys(w.outposts||{}).forEach(function(id){const o=w.outposts[id];if(o&&o.state!=='down')ids.push('op:'+id);});
    Object.keys(w.towers||{}).forEach(function(id){const o=w.towers[id];if(o&&o.state!=='down')ids.push('tw:'+id);});
    return ids.sort();
  }
  function missingCamps(from,to){
    const have={};
    liveCamps(to).forEach(function(id){have[id]=1;});
    return liveCamps(from).filter(function(id){return !have[id];});
  }
  function progressEqual(a,b){
    const x=clone(a)||{},y=clone(b)||{};
    x.hp=0;y.hp=0;
    return gameEqual(x,y);
  }
  function userDirty(p){return !!p&&(p._userEdit|0)!==(p._userBase|0);}
  function spentLess(a,b){
    const ar=normRes(a&&a.res),br=normRes(b&&b.res);
    for(let i=0;i<RES.length;i++)if(ar[RES[i]]<br[RES[i]])return true;
    return false;
  }
  function aheadProgress(a,b){
    if(!a||!b)return false;
    if(missingCamps(a,b).length)return true;
    if(spentLess(a,b))return true;
    if((a.lvl|0)>(b.lvl|0)||(a.xp|0)>(b.xp|0))return true;
    if(((a.troops&&a.troops.home)|0)<((b.troops&&b.troops.home)|0))return true;
    if(((a.troops&&a.troops.wounded)|0)>((b.troops&&b.troops.wounded)|0))return true;
    return false;
  }
  function conflictWrite(e){
    const blob=((e&&e.code)||'')+' '+((e&&e.message)||'');
    return /permission-denied|failed-precondition|aborted|already-exists/i.test(blob);
  }
  function notePlay(p){if(p)p._userEdit=(p._userEdit|0)+1;}
  function hasUnsentProgress(local,remote){
    if(!local||!remote)return false;
    if(missingCamps(local,remote).length)return true;
    const lr=normRes(local.res),rr=normRes(remote.res);
    for(let i=0;i<RES.length;i++)if(lr[RES[i]]<rr[RES[i]])return true;
    if((local.lvl|0)>(remote.lvl|0)||(local.xp|0)>(remote.xp|0))return true;
    return false;
  }
  // A has player progress B lacks. Passive income alone is not progress.
  // Buildings, a spend, tiles, drives, distance, kills, xp, badges, pipeline
  // unlocks, skills, fewer troops at home, or more wounded all count.
  function realAhead(a,b){
    if(!a||!b)return false;
    if(missingCamps(a,b).length)return true;
    if(spentLess(a,b))return true;
    if(!monoDominates(b,a))return true;
    const ta=a.troops||{},tb=b.troops||{};
    if((ta.home|0)<(tb.home|0))return true;
    if((ta.wounded|0)>(tb.wounded|0))return true;
    return false;
  }
  // First contact with THIS device's own save document. The acknowledged
  // revision is the revision the server holds. A larger local number is an
  // unconfirmed send, not a reason to wait forever. Two copies that each have
  // progress the other lacks are not written and not adopted.
  function armHandoff(local,remote,remoteRev){
    if(!local||local._handoff===1)return local;
    local._handoff=1;
    const rr=remoteRev|0,lr=local._rev|0;
    if(!remote){local._ackedRev=lr;return local;}
    if(progressEqual(local,remote)){local._ackedRev=rr;local._userBase=local._userEdit|0;return local;}
    if(rr>lr){
      local._ackedRev=lr;
      if(hasUnsentProgress(local,remote))local._userEdit=(local._userBase|0)+1;
      return local;
    }
    local._ackedRev=rr;
    const lA=realAhead(local,remote),rA=realAhead(remote,local);
    if(lA&&rA){local._armHold=rr;local._userEdit=(local._userBase|0)+1;return local;}
    if(lA||!rA)local._userEdit=(local._userBase|0)+1;
    else local._userBase=local._userEdit|0;
    return local;
  }
  // A linked device's document. Its revision counter is never compared with
  // this device's counter. Adopt only real progress this copy lacks, and only
  // when this device has no unsent edit of its own.
  function linkedDecide(local,remote,remoteRev,opt){
    opt=opt||{};
    const ru=String(opt.remoteUid||''),me=String(opt.myUid||'');
    remoteRev=remoteRev|0;
    if(!local||!remote||remote.wiped||!remote.name)return {action:'skip',why:'no-remote'};
    const seen=local._seen&&local._seen[ru];
    if(seen!=null&&remoteRev<=(seen|0))return {action:'skip',why:'seen'};
    if(progressEqual(local,remote))return {action:'seen',rev:remoteRev,why:'equal'};
    const rA=realAhead(remote,local);
    if(!rA)return {action:'seen',rev:remoteRev,why:'remote-not-ahead'};
    const reason='Do not switch yet. Your other device has different progress. Neither copy was overwritten.';
    if(userDirty(local)||local._armHold!=null)return {action:'hold',why:'linked-dirty',reason:reason};
    const lA=realAhead(local,remote);
    const acked=local._ackedRev|0;
    const theySawMine=acked>0&&((remote._seen&&remote._seen[me])|0)>=acked;
    if(lA&&!theySawMine)return {action:'hold',why:'linked-both',reason:reason};
    return {action:'adopt',rev:remoteRev,why:lA?'linked-newer':'linked-ahead'};
  }
  // Full troop state. Empty containers and seen-cursors are omitted. Locations, routes, and completion times stay.
  function troopState(t){
    t=t||{};
    const away={};
    Object.keys(t.away||{}).sort().forEach(function(k){const n=t.away[k]|0;if(n)away[k]=n;});
    const queue=(t.queue||[]).filter(Boolean).map(function(q){return {n:q.n|0,end:q.end|0};}).sort(function(a,b){return a.end-b.end||a.n-b.n;});
    const station={};
    Object.keys(t.stationed||{}).sort().forEach(function(k){const s=t.stationed[k]||{},n=s.n|0;if(n)station[k]={n:n,at:s.at|0,from:s.from||''};});
    const back=(t.returning||[]).filter(Boolean).map(function(r){return {n:r.n|0,at:r.at|0,from:r.from||'',why:r.why||''};}).sort(function(a,b){return a.at-b.at||(a.from<b.from?-1:a.from>b.from?1:0);});
    const healing=(t.healing||[]).filter(Boolean).map(function(q){return {n:q.n|0,end:q.end|0};}).sort(function(a,b){return a.end-b.end||a.n-b.n;});
    const esc={};
    Object.keys(t.esc25||{}).sort().forEach(function(k){const e=t.esc25[k]||{};if(!(e.n|0)&&!e.to&&!e.from)return;esc[k]={n:e.n|0,to:e.to||'',from:e.from||'',end:e.end|0,done:e.done?1:0};});
    const recalled=Object.keys(t.recalled||{}).filter(function(k){return t.recalled[k];}).sort();
    const state={home:t.home|0};
    if(Object.keys(away).length)state.away=away;
    if(queue.length)state.queue=queue;
    if(Object.keys(station).length)state.station=station;
    if(back.length)state.back=back;
    if(healing.length)state.healing=healing;
    if(Object.keys(esc).length)state.esc=esc;
    if(t.wounded|0)state.wounded=t.wounded|0;
    if(recalled.length)state.recalled=recalled;
  const hf=t.healFree;
  // A day stamp with nothing used is still a full allowance. hospitalTick writes that stamp while idle.
  if(hf&&(hf.n|0))state.healFree={day:String(hf.day||''),n:hf.n|0};
    return state;
  }
  function troopStatesEqual(a,b){return JSON.stringify(troopState(a&&a.troops))===JSON.stringify(troopState(b&&b.troops));}
  function classSig(c){c=c||{};const o={};if(c.id)o.id=String(c.id);if(c.next)o.next=String(c.next);if(c.nextT)o.nextT=c.nextT|0;return Object.keys(o).length?o:null;}
  function sig(o){
    return JSON.stringify(stable({
      lvl:(o&&o.lvl)||1,xp:(o&&o.xp)||0,sp:(o&&o.sp)||0,skills:(o&&o.skills)||{},
      badges:(o&&o.badges)||{},pipes:(o&&o.pipeUnlock26)||{},meters:meters(o),kills:kills(o),
      tiles:(o&&o.tiles)||{},res:normRes(o&&o.res),troops:troopState(o&&o.troops),cls:classSig(o&&o.cls),
      drives:(o&&o.dr26||[]).map(driveKey).filter(Boolean).sort(),
      claim:(o&&o.claimDay)||null,paid:emptyObj(o&&o.marchPaid)?null:o.marchPaid,done:emptyObj(o&&o.marchDone)?null:o.marchDone,
      hp:(o&&o.hp)||0,sh:(o&&o.stronghold)||null,
      worldSh:o&&o.world&&o.world.sh||null,barracks:o&&o.world&&o.world.barracks||null,
      outposts:campMap(o&&o.world&&o.world.outposts),towers:campMap(o&&o.world&&o.world.towers),
      contrib:(o&&o.contrib)||null
    }));
  }
  function gameEqual(a,b){return sig(a)===sig(b);}
  function decide(A,B){
    const ca=clockOf(A),cb=clockOf(B);
    if(ca&&cb){
      const c=cmpClock(ca,cb);
      if(c===1)return 'A';if(c===-1)return 'B';
      if(c===0)return gameEqual(A,B)?'equal':'concurrent';
      return 'concurrent';
    }
    if(ca&&!cb){
      if(sawLegacy(A,B)&&monoDominates(A,B))return gameEqual(A,B)?'equal':'A';
      if(monoDominates(B,A)&&!strictlyAhead(A,B))return strictlyAhead(B,A)?'B':'concurrent';
      if(monoDominates(A,B)&&!strictlyAhead(B,A))return strictlyAhead(A,B)?'A':(gameEqual(A,B)?'equal':'concurrent');
      return 'concurrent';
    }
    if(!ca&&cb){
      if(sawLegacy(B,A)&&monoDominates(B,A))return gameEqual(A,B)?'equal':'B';
      if(monoDominates(A,B)&&!strictlyAhead(B,A))return strictlyAhead(A,B)?'A':'concurrent';
      if(monoDominates(B,A)&&!strictlyAhead(A,B))return strictlyAhead(B,A)?'B':(gameEqual(A,B)?'equal':'concurrent');
      return 'concurrent';
    }
    const aDom=monoDominates(A,B),bDom=monoDominates(B,A);
    const aS=strictlyAhead(A,B),bS=strictlyAhead(B,A);
    if(aDom&&!bS){if(!aS)return gameEqual(A,B)?'equal':'concurrent';return 'A';}
    if(bDom&&!aS){if(!bS)return gameEqual(A,B)?'equal':'concurrent';return 'B';}
    if(!aS&&!bS)return gameEqual(A,B)?'equal':'concurrent';
    return 'concurrent';
  }
  function unseen(ops,clock){return (ops||[]).filter(op=>op&&(!clock||(clock[op.uid]|0)<(op.n|0)));}
  function applyRes(base,ops){
    const r=normRes(base);
    for(const op of ops)if(op.k==='res'&&op.d)for(const k of RES)if(op.d[k])r[k]=Math.max(0,r[k]+op.d[k]);
    return r;
  }
  function applyTiles(base,ops){
    const tiles={...(base||{})};
    for(const op of ops)if(op.k==='tiles'){
      for(const id of op.add||[]){const cur=tiles[id];if(!cur||(cur.t||0)<=(op.t||0))tiles[id]={t:op.t||1};}
      for(const id of op.del||[]){const cur=tiles[id];if(cur&&(cur.t||0)>(op.t||0))continue;delete tiles[id];}
    }
    return tiles;
  }
  function uniqueRealDrive(A,B){
    const have=new Set(realDrives(B.dr26).map(driveKey));
    return realDrives(A.dr26).some(function(r){return !have.has(driveKey(r));});
  }
  // Land evidence, not the save timestamp. A newer clock-less timestamp must not
  // beat a phone that actually drove and claimed.
  function preferLand(A,B){
    const da=realDrives(A.dr26).length,db=realDrives(B.dr26).length;
    if(da!==db)return da>db?A:B;
    const ma=meters(A),mb=meters(B);
    if(ma!==mb)return ma>mb?A:B;
    const ra=A._rev||0,rb=B._rev||0;
    if(ra!==rb)return ra>rb?A:B;
    return (A._savedAt||0)>=(B._savedAt||0)?A:B;
  }
  // The client stores the whole player as one JSON string in the save doc's
  // `data` field. A dotted write like data.res is not that string. Accept
  // either a string or a map so a grant the console can read is not ignored.
  function profileFromSaveDoc(d){
    if(!d||d.data==null)return null;
    let o=null;
    if(typeof d.data==='string'){try{o=JSON.parse(d.data);}catch(e){return null;}}
    else if(typeof d.data==='object')o=clone(d.data);
    if(!o||typeof o!=='object'||Array.isArray(o))return null;
    if(d.rev)o._rev=Math.max(o._rev||0,Number(d.rev)||0);
    if(d.savedAt)o._savedAt=Math.max(o._savedAt||0,Number(d.savedAt)||0);
    return o;
  }
  // A grant that replaced the string with only {res:{...}} must not wipe the player.
  function overlayResGrant(local,res,rev,savedAt){
    if(!local||!res||typeof res!=='object')return null;
    const o=clone(local);
    o.res=Object.assign({},local.res||{},res);
    o._rev=Math.max(local._rev||0,rev||0);
    o._savedAt=Math.max(local._savedAt||0,savedAt||0);
    return o;
  }
  // Extras that exist only on the older alias are quarantined, not owned.
  // Extras on a device that has its own real drive are kept: those are unsynced
  // claims, and dropping them would discard a drive.
  function legacyTiles(auth,other){
    const tiles={...(auth.tiles||{})};
    const q=[];
    if(uniqueRealDrive(other,auth)){
      for(const id of Object.keys(other.tiles||{}))if(!(id in tiles))tiles[id]=clone(other.tiles[id]);
      return {tiles:tiles,quarantine:q};
    }
    for(const id of Object.keys(other.tiles||{}))if(!(id in tiles))q.push(id);
    return {tiles:tiles,quarantine:q};
  }
  function stashQuarantine(profile,ids,source,now){
    if(!ids||!ids.length)return 0;
    const s=ensure(profile);
    s.quarantine=s.quarantine||{tiles:{},shown:0};
    let n=0;
    for(const id of ids){
      if(profile.tiles&&profile.tiles[id])continue;
      if(s.quarantine.tiles[id])continue;
      s.quarantine.tiles[id]={t:(source&&source[id]&&source[id].t)||now,why:'older-device'};
      n++;
    }
    if(n)s.quarantine.shown=0;
    return n;
  }
  function noteTroopDrop(profile,otherTroops,now){
    if(JSON.stringify(profile.troops||null)===JSON.stringify(otherTroops||null))return;
    const s=ensure(profile);
    if(s.troopNotice)return;
    s.troopNotice={t:now,shown:0,text:'Troops on your other device were assigned differently. This assignment was kept. The other was not added.'};
  }
  function mergeConcurrent(A,B,now){
    const body=preferLand(A,B),other=body===A?B:A;
    const profile=clone(body);
    overlayMono(profile,A);overlayMono(profile,B);
    const journals=!((A.sync26&&A.sync26.truncated)||(B.sync26&&B.sync26.truncated));
    const opsOther=journals?unseen(other.sync26&&other.sync26.ops,clockOf(body)):[];
    const opsBody=journals?unseen(body.sync26&&body.sync26.ops,clockOf(other)):[];
    if(journals&&(opsOther.some(o=>o.k==='res')||opsBody.some(o=>o.k==='res')))profile.res=applyRes(body.res,opsOther.filter(o=>o.k==='res'));
    else profile.res=normRes(body.res);
    let tileQ=[];
    if(journals&&(opsOther.some(o=>o.k==='tiles')||opsBody.some(o=>o.k==='tiles')))profile.tiles=applyTiles(body.tiles,opsOther.filter(o=>o.k==='tiles'));
    else {const lt=legacyTiles(body,other);profile.tiles=lt.tiles;tileQ=lt.quarantine;}
    const aT=opsBody.some(o=>o.k==='troops'),bT=opsOther.some(o=>o.k==='troops');
    if(aT&&bT)profile.troops=clone(body.troops)||{};
    else if(bT&&!aT)profile.troops=clone(other.troops)||{};
    else profile.troops=clone(body.troops)||{};
    if(aT&&bT)noteTroopDrop(profile,other.troops,now);
    else if(!aT&&!bT)noteTroopDrop(profile,other.troops,now);
    stashQuarantine(profile,tileQ,other.tiles,now);
    profile._merged=journals?'concurrent':'concurrent-legacy';
    profile._mergedAt=now;
    return profile;
  }
  function merge(a,b,opt){
    opt=opt||{};
    const now=opt.now||Date.now();
    const uid=opt.uid||(a&&a.uid)||'local';
    const A=clone(a)||{},B=clone(b)||{};
    if(opt.remoteUid&&!B.uid)B.uid=opt.remoteUid;
    if(!A.uid&&opt.uid)A.uid=opt.uid;
    const mode=decide(A,B);
    if(mode==='equal'){
      const profile=clone(A);
      absorb(profile,B);
      profile.sync26.snap=snapOf(profile);
      return {profile,changed:false,clockWrite:!clockEqual(a&&a.sync26,profile.sync26),mode,conflict:false};
    }
    let profile;
    if(mode==='A'||mode==='B'){
      const win=mode==='A'?A:B,lose=mode==='A'?B:A;
      profile=clone(win);
      overlayMono(profile,lose);
      profile.res=normRes(profile.res);
      noteTroopDrop(profile,lose.troops,now);
      profile._merged=mode==='A'?'local':'remote';
    }else profile=mergeConcurrent(A,B,now);
    absorb(profile,A);absorb(profile,B);
    // A higher document rev is an external edit (the QA grant). Copy its resources
    // only when this device still has zeros and has not journaled a spend or refill.
    // A drive, a training queue, or a later spend stays on the profile we already picked.
    const ra=A._rev||0,rb=B._rev||0;
    if(ra!==rb){
      const hi=ra>rb?A:B,lo=ra>rb?B:A;
      const loRes=normRes(lo.res);
      const untouched=RES.every(function(k){return loRes[k]===0;});
      const blocked=(lo.sync26&&lo.sync26.truncated)||unseen(lo.sync26&&lo.sync26.ops,clockOf(hi)).some(function(op){return op&&op.k==='res';});
      if(untouched&&!blocked&&hi.res&&typeof hi.res==='object')profile.res=normRes(hi.res);
    }
    const changed=!gameEqual(A,profile);
    if(changed){
      const s=ensure(profile);
      s.clock[uid]=(s.clock[uid]||0)+1;
      profile._savedAt=now;
    }
    profile.sync26.snap=snapOf(profile);
    return {profile,changed,clockWrite:changed||!clockEqual(a&&a.sync26,profile.sync26),mode,conflict:profile._merged==='concurrent'||profile._merged==='concurrent-legacy'};
  }

  function snapOf(p){
    return {
      res:normRes(p.res),
      tiles:clone(p.tiles)||{},
      troops:clone(p.troops)||null,
      prog:{lvl:p.lvl||1,xp:p.xp||0,meters:meters(p),kills:kills(p),badges:Object.keys(p.badges||{}).length,drives:realDrives(p.dr26).length}
    };
  }
  function resDelta(before,after){
    const d={};let any=false;
    for(const k of RES){const n=(after[k]||0)-(before[k]||0);if(n){d[k]=n;any=true;}}
    return any?d:null;
  }
  function tileDiff(before,after){
    const add=[],del=[];
    for(const id in after||{})if(!(id in (before||{})))add.push(id);
    for(const id in before||{})if(!(id in (after||{})))del.push(id);
    return (add.length||del.length)?{add,del}:null;
  }
  // Journal a local edit. First observation only sets the baseline (no fake delta).
  function recordChange(profile,uid,now){
    if(!profile)return false;
    uid=uid||profile.uid||'local';now=now||Date.now();
    const s=ensure(profile);
    const cur=snapOf(profile);
    if(!s.snap){s.snap=cur;return false;}
    const rd=resDelta(s.snap.res,cur.res);
    const td=tileDiff(s.snap.tiles,cur.tiles);
    const troopChanged=JSON.stringify(troopState(s.snap&&s.snap.troops))!==JSON.stringify(troopState(cur.troops));
    const progChanged=JSON.stringify(s.snap.prog)!==JSON.stringify(cur.prog);
    if(!rd&&!td&&!troopChanged&&!progChanged){if(JSON.stringify(s.snap.troops)!==JSON.stringify(cur.troops))s.snap.troops=cur.troops;return false;}
    const n=(s.clock[uid]||0)+1;s.clock[uid]=n;
    if(rd)s.ops.push({id:uid+':'+n+':res',uid,n,k:'res',d:rd,t:now});
    if(td)s.ops.push({id:uid+':'+n+':tiles',uid,n,k:'tiles',add:td.add,del:td.del,t:now});
    if(troopChanged)s.ops.push({id:uid+':'+n+':troops',uid,n,k:'troops',t:now});
    if(s.ops.length>200){s.ops=s.ops.slice(-200);s.truncated=true;}
    s.snap=cur;profile._savedAt=now;return true;
  }
  function shouldUpload(memoryGen,storedGen){return (storedGen|0)<=(memoryGen|0);}

  function hexDist(a,b){
    const [q1,r1]=a.split('_').map(Number),[q2,r2]=b.split('_').map(Number),dq=q1-q2,dr=r1-r2;
    return (Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;
  }
  // Hexes a straight march enters, in order. `at(t)` is the hex under the
  // straight line at fraction t. A sample that jumps a hex is filled, so a
  // defender cannot be stepped over. Start and destination are always included.
  function crossedHexes(fromId,toId,at){
    const base=hexLine(fromId,toId);
    const steps=Math.max(8,(base.length-1)*8);
    const raw=[];
    function pushRaw(id){if(!id)return;if(raw.length&&raw[raw.length-1]===id)return;raw.push(id);}
    pushRaw(fromId);
    if(typeof at==='function'){for(let i=0;i<=steps;i++)pushRaw(at(i/steps));}
    pushRaw(toId);
    const out=[];
    for(const id of raw){
      if(!out.length){out.push(id);continue;}
      const prev=out[out.length-1];
      if(prev===id)continue;
      if(hexDist(prev,id)>1){const fill=hexLine(prev,id);for(let k=1;k<fill.length;k++)if(out[out.length-1]!==fill[k])out.push(fill[k]);}
      else out.push(id);
    }
    return out;
  }
  function hexLine(fromId,toId){
    const [aq,ar]=String(fromId).split('_').map(Number),[bq,br]=String(toId).split('_').map(Number);
    const as=-aq-ar,bs=-bq-br;
    const n=hexDist(fromId,toId);
    const out=[];
    for(let i=0;i<=n;i++){
      const t=n?i/n:0;
      let q=aq+(bq-aq)*t,r=ar+(br-ar)*t,s=as+(bs-as)*t;
      let rq=Math.round(q),rr=Math.round(r),rs=Math.round(s);
      const dq=Math.abs(rq-q),dr=Math.abs(rr-r),ds=Math.abs(rs-s);
      if(dq>dr&&dq>ds)rq=-rr-rs;else if(dr>ds)rr=-rq-rs;
      const id=rq+'_'+rr;
      if(out[out.length-1]!==id)out.push(id);
    }
    if(out[out.length-1]!==toId)out.push(toId);
    return out;
  }
  // Claim march: one hex at a time along the route. Already-owned and ally hexes are skipped.
  // A guarded pipeline is NOT ownership. Defenders stop the march. Forts are reported, not taken.
  // Each eligible hex is listed once.
  function planClaimRoute(fromId,toId,ctx){
    ctx=ctx||{};
    const path=hexLine(fromId,toId).slice(1);
    const claim=[],skip=[],seen=new Set();
    let stop=null,room=ctx.room==null?Infinity:ctx.room;
    for(const id of path){
      if(seen.has(id)){skip.push({id,why:'already considered on this march'});continue;}
      seen.add(id);
      if(ctx.owned&&ctx.owned(id)){skip.push({id,why:'already yours'});continue;}
      if(ctx.ally&&ctx.ally(id)){skip.push({id,why:'an ally holds it'});continue;}
      if(ctx.fort&&ctx.fort(id)){skip.push({id,why:'enemy fort — attack it in person'});continue;}
      if(!(room>0)){stop={id,why:'daily claim limit'};break;}
      const d=ctx.defender?ctx.defender(id):null;
      if(d&&d.win===false){stop={id,why:'defenders held '+(d.name||'this hex')};break;}
      claim.push(id);room--;
    }
    return {path,claim,skip,stop};
  }
  function explainClaim(plan){
    const parts=[];
    if(plan.claim.length)parts.push('Claimed '+plan.claim.length+' hex'+(plan.claim.length===1?'':'es')+' on the route.');
    const by={};
    for(const s of plan.skip)by[s.why]=(by[s.why]||0)+1;
    for(const w of Object.keys(by))parts.push('Skipped '+by[w]+' ('+w+').');
    if(plan.stop)parts.push('Stopped: '+plan.stop.why+'.');
    if(!parts.length)parts.push('Nothing new to claim on this path.');
    return parts.join(' ');
  }
  // The device that sent the march resolves immediately. Another linked device waits out `grace`
  // so both phones don't pay the loot or return the same troops.
  function aliasMayResolve(m,now,myUid,grace){
    if(!m)return false;
    if(!m.uid||m.uid===myUid)return true;
    const g=grace==null?15000:grace,dur=m.dur||0,start=m.startT||0;
    if(m.state==='arrived'||m.state==='back'||m.state==='done')return now>=start+2*dur+g;
    return now>=start+dur+g;
  }

  const SYNC_HOLD_MS=5*60*1000;
  function cloudFailureText(err){
    const code=err&&(err.code||err.status)||'';
    const msg=err&&err.message?String(err.message):'';
    if(/quota|resource-exhausted|429/i.test(code+' '+msg))return 'Do not switch yet. The server said quota exceeded. The latest change is still on this device.';
    return 'Do not switch yet. Cloud save did not go through. The latest change is still on this device.';
  }
  function saveStatusLine(cs,rev){
    if(cs&&cs.report)return cs.report;
    if(cs&&cs.last)return cs.status||'saved';
    if(rev)return 'saved earlier';
    return 'not saved yet';
  }
  function syncAllowed(now,holdUntil){return !(holdUntil&&now<holdUntil);}
  function unseenKind(profile,other,kind){
    return unseen(profile&&profile.sync26&&profile.sync26.ops,clockOf(other)).some(function(op){return op&&op.k===kind;});
  }
  function withBothDrives(body,a,b){
    body.dr26=unionDrives(a.dr26,b.dr26);
    const st=Object.assign({},body.stats||{});
    st.meters=Math.max(meters(a),meters(b));
    st.kills=Math.max(kills(a),kills(b));
    body.stats=st;
    return body;
  }
  // A higher revision is not "local spent wins". Offline work on only one side
  // keeps that side's resources and troops. Work on both sides is not blended
  // and is not uploaded. Drives from both sides stay on any copy we do write.
  function uploadPlan(local,remote,remoteRev){
    if(!remote||remote.wiped||!remote.name)return {upload:false,reason:'A newer cloud save is present. This device was not overwritten.'};
    const remoteHigher=(remoteRev||0)>=(local._rev||0);
    const hi=remoteHigher?remote:local,lo=remoteHigher?local:remote;
    const troopsDiffer=!troopStatesEqual(lo,hi)||JSON.stringify(classSig(lo&&lo.cls))!==JSON.stringify(classSig(hi&&hi.cls));
    const loRes=unseenKind(lo,hi,'res'),hiRes=unseenKind(hi,lo,'res');
    const loTroop=unseenKind(lo,hi,'troops'),hiTroop=unseenKind(hi,lo,'troops');
    const loWork=loRes||(troopsDiffer&&loTroop);
    const hiWork=hiRes||(troopsDiffer&&hiTroop);
    // Matching totals are not enough. A different place or time is still a conflict.
    // If the clocks already absorbed the journal, uploading the higher copy would drop the other state.
    if((loWork&&hiWork)||(troopsDiffer&&!loTroop&&!hiTroop&&!loRes&&!hiRes)){
      return {upload:false,held:clone(remote),reason:'Both devices changed this save. Neither copy was overwritten.'};
    }
    const body=clone((loWork&&!hiWork)?lo:hi);
    withBothDrives(body,local,remote);
    body._rev=Math.max(local._rev||0,remoteRev||0);
    return {upload:true,profile:body,rev:body._rev};
  }
  async function runCloudHandoff(local,io){
    io=io||{};
    let loaded=null;
    try{loaded=await io.load();}
    catch(e){
      const blob=((e&&e.code)||'')+' '+((e&&e.message)||'');
      return {local:local,report:cloudFailureText(e),wrote:false,adopt:false,rev:local._rev||0,quota:/quota|resource-exhausted|429/i.test(blob),why:'load-error',code:((String((e&&(e.code||e.name))||'unknown').trim().match(/^[A-Za-z0-9_-]+/)||['unknown'])[0]).slice(0,40),readFail:classifyTypeError(e)};
    }
    if(io.arm)armHandoff(local,loaded&&loaded.profile,loaded&&loaded.rev||0);
    if(local&&local._handoff===1)return runArmedHandoff(local,loaded,io);
    let profile=clone(local),rev=local._rev||0;
    if(loaded&&(loaded.rev||0)>rev){
      const plan=uploadPlan(local,loaded.profile,loaded.rev||0);
      if(!plan.upload)return {local:local,report:plan.reason,wrote:false,rev:rev,quota:false,held:plan.held||null,heldRev:loaded.rev||0,why:'held',serverRev:loaded.rev||0};
      profile=plan.profile;rev=plan.rev;
    }
    // The server already has this revision and the same progress. Another
    // click must not pretend the copy never arrived, and must not burn a new number.
    if(loaded&&(loaded.rev||0)===rev&&gameEqual(local,loaded.profile)){
      return {local:local,report:'',wrote:false,already:true,rev:rev,savedAt:(loaded.profile&&loaded.profile._savedAt)||0,quota:false,why:'already',serverRev:rev};
    }
    const next=rev+1,savedAt=io.now?io.now():Date.now();
    const out=clone(profile);out._rev=next;out._savedAt=savedAt;
    const blocked=buildingBlock(local,profile,loaded);
    if(blocked)return blocked;
    try{await io.write({profile:out,rev:next,savedAt:savedAt,baseRev:loaded?loaded.rev||0:0,v:2});}
    catch(e){
      const blob=((e&&e.code)||'')+' '+((e&&e.message)||'');
      const heldRev=loaded&&(loaded.rev||0)=== (local._rev||0)?(local._rev||0):0;
      const quota=/quota|resource-exhausted|429/i.test(blob);
      const why=quota?'The server said quota exceeded.':(/unavailable|deadline-exceeded|aborted|cancelled/i.test(blob)?'The server did not answer.':'This send did not go through.');
      const report=heldRev?('Do not switch yet. Cloud save '+heldRev+' is on the server. '+why+' The latest change is still on this device.'):cloudFailureText(e);
      return {local:local,report:report,wrote:false,rev:local._rev||0,confirmedRev:heldRev,quota:quota,why:heldRev?'write-error-same-rev':'write-error',code:((String((e&&(e.code||e.name))||'unknown').trim().match(/^[A-Za-z0-9_-]+/)||['unknown'])[0]).slice(0,40),serverRev:loaded?(loaded.rev||0):null};
    }
    return {local:out,report:'',wrote:true,rev:next,quota:false,why:'wrote',serverRev:loaded?(loaded.rev||0):null};
  }

  function sameIdSet(a,b){
    const A=Object.keys(a||{}),B=Object.keys(b||{});
    if(A.length!==B.length)return false;
    const s={};for(const k of A)s[k]=1;
    return B.every(function(k){return s[k];});
  }
  function changeKind(profile,other){
    const ops=unseen(profile&&profile.sync26&&profile.sync26.ops,clockOf(other));
    const res=ops.some(function(op){return op&&op.k==='res';});
    const troops=ops.some(function(op){return op&&op.k==='troops';});
    return res&&troops?'res+troops':res?'res':troops?'troops':'none';
  }
  // Read-only label for the conflict panel. Fixed words and revision numbers only.
  function conflictMark(local,remote,remoteRev,own){
    const kind=/^(none|res|troops|res\+troops)$/;
    const a=changeKind(local,remote),b=changeKind(remote,local);
    if(!kind.test(a)||!kind.test(b))return '';
    const peer=own?'own':'linked';
    const progress=gameEqual(local,remote)?'same':'differs';
    const troops=troopStatesEqual(local,remote)?'same':'differs';
    const tiles=sameIdSet(local&&local.tiles,remote&&remote.tiles)?'same':'differs';
    const rev=Math.max(0,Number(remoteRev)||0)|0;
    const localRev=Math.max(0,Number(local&&local._rev)||0)|0;
    return 'conflict peer='+peer+' peerrev='+rev+' local='+localRev+' this='+a+' other='+b+' progress='+progress+' troops='+troops+' tiles='+tiles;
  }
  function classifyTypeError(e){
    if(!e||e.code||e.name!=='TypeError')return '';
    const m=String(e.message||'');
    const kind=m==='Failed to fetch'?'failed-to-fetch':(/not iterable/.test(m)?'not-iterable':(/not a function/.test(m)?'not-a-function':(/Cannot read properties/.test(m)?'property':'other')));
    const n=typeof window!=='undefined'&&window.__dddLoad||{};
    const ok={function:1,undefined:1,object:1,string:1,number:1,boolean:1,symbol:1,bigint:1,other:1};
    const pick=v=>ok[v]?v:'other';
    const steps={'before-getDoc':1,'before-exists':1,'before-data':1};
    const step=steps[n.step]?n.step:'before-getDoc';
    const bases={array:1,missing:1};
    const base=bases[n.base]?n.base:pick(n.base);
    return 'class='+kind+' step='+step+' collection='+pick(n.collection)+' doc='+pick(n.doc)+' getDoc='+pick(n.getDoc)+' base='+base;
  }
  function readFailText(){
    const s=typeof CS!=='undefined'&&CS&&CS.readFail||'';
    return /^class=(failed-to-fetch|not-iterable|not-a-function|property|other) step=(before-getDoc|before-exists|before-data) collection=(function|undefined|object|string|number|boolean|symbol|bigint|other) doc=(function|undefined|object|string|number|boolean|symbol|bigint|other) getDoc=(function|undefined|object|string|number|boolean|symbol|bigint|other) base=(array|missing|function|undefined|object|string|number|boolean|symbol|bigint|other)$/.test(s)?' readfail '+s:'';
  }

  function keptLocal(local,remote){
    if(!local||!remote)return false;
    if(missingCamps(local,remote).length||spentLess(local,remote))return true;
    const ta=local.troops||{},tb=remote.troops||{};
    if((ta.home|0)<(tb.home|0)||(ta.wounded|0)>(tb.wounded|0))return true;
    if(kills(local)>kills(remote))return true;
    if(!supersetKeys(remote.tiles,local.tiles)||!supersetKeys(remote.pipeUnlock26,local.pipeUnlock26)||!supersetKeys(remote.badges,local.badges)||!skillsCover(remote.skills,local.skills))return true;
    const have=new Set(realDrives(remote.dr26).map(driveKey));
    for(const r of realDrives(local.dr26))if(!have.has(driveKey(r)))return true;
    if(JSON.stringify(local.equip||null)!==JSON.stringify(remote.equip||null))return true;
    if(JSON.stringify(local.inv||null)!==JSON.stringify(remote.inv||null))return true;
    return false;
  }
  function handoffDecide(local,remote,remoteRev,opt){
    opt=opt||{};
    remoteRev=remoteRev|0;
    if(!local||local._handoff!==1){
      const plan=uploadPlan(local,remote,remoteRev);
      return {action:plan.upload?'upload':'hold',legacy:true,upload:plan.upload,profile:plan.profile||local,held:plan.held||null,reason:plan.reason||'',rev:plan.rev||0};
    }
    if(!remote||remote.wiped||!remote.name)return {action:'upload',profile:clone(local),why:'first'};
    if(local._armHold!=null)return {action:'hold',profile:local,held:clone(remote),reason:'Do not switch yet. This device and the cloud copy each have progress the other lacks. Neither copy was overwritten.',why:'arm-both'};
    const acked=local._ackedRev|0;
    const dirty=userDirty(local);
    const owner=!!opt.tab&&opt.tab===local._tab;
    const same=progressEqual(local,remote);
    const localHp=local.hp|0,remoteHp=remote.hp|0;
    if(remoteRev===acked&&same){
      if(localHp<remoteHp)return {action:'hold',profile:local,reason:'Do not switch yet. Cloud save '+acked+' is on the server. The latest change is still on this device.',why:'hp-lower'};
      if(localHp>remoteHp&&owner&&!opt.background)return {action:'keep',profile:local,why:'hp-regen'};
      return {action:'already',profile:local,why:'already'};
    }
    if(remoteRev<acked)return {action:'hold',profile:local,held:clone(remote),reason:'Do not switch yet. Cloud save '+remoteRev+' is on the server. The latest change is still on this device.',why:'server-behind'};
    if(remoteRev>acked&&!dirty){
      const adopted=clone(remote);
      adopted._handoff=1;adopted._ackedRev=remoteRev;adopted._userEdit=local._userEdit|0;adopted._userBase=local._userEdit|0;adopted._tab=remote._tab||local._tab||'';adopted._rev=remoteRev;
      return {action:'adopt',profile:adopted,rev:remoteRev,why:'adopt'};
    }
    if(remoteRev>acked&&dirty){
      // Higher resources or travel drift can follow the other device's save.
      // A kill, claim, pipeline, badge, drive, or gear change on this device stays.
      const kept=keptLocal(local,remote);
      const passive=!kept;
      if(passive&&realAhead(remote,local)){
        const adopted=clone(remote);
        adopted._handoff=1;adopted._ackedRev=remoteRev;adopted._userEdit=local._userEdit|0;adopted._userBase=local._userEdit|0;adopted._tab=remote._tab||local._tab||'';adopted._rev=remoteRev;
        return {action:'adopt',profile:adopted,rev:remoteRev,why:'adopt-passive'};
      }
      if((aheadProgress(local,remote)||kept)&&!realAhead(remote,local)&&!keptLocal(remote,local))return {action:'upload',profile:clone(local),why:'takeover'};
      return {action:'hold',profile:local,held:clone(remote),reason:'Both devices changed this save. Neither copy was overwritten.',why:'dirty-behind'};
    }
    if(dirty||owner){
      if(opt.background&&!dirty)return {action:'keep',profile:local,why:'background'};
      return {action:'upload',profile:clone(local),why:'tip'};
    }
    const adopted=clone(remote);
    adopted._handoff=1;adopted._ackedRev=remoteRev;adopted._userEdit=local._userEdit|0;adopted._userBase=local._userEdit|0;adopted._tab=remote._tab||'';adopted._rev=remoteRev;
    return {action:'adopt',profile:adopted,rev:remoteRev,why:'stale-drift'};
  }
  function seal(profile,rev,tab){
    profile._rev=rev;profile._ackedRev=rev;profile._handoff=1;profile._userBase=profile._userEdit|0;
    if(tab)profile._tab=tab;
    return profile;
  }
  function buildingBlock(local,chosen,loaded){
    const droppedLocal=missingCamps(local,chosen);
    const droppedServer=loaded&&missingCamps(loaded.profile,chosen);
    if(!droppedLocal.length&&!(droppedServer&&droppedServer.length))return null;
    return {local:local,report:'Both devices changed this save. Neither copy was overwritten.',wrote:false,adopt:false,rev:local._rev||0,quota:false,held:loaded?clone(loaded.profile):null,heldRev:loaded&&loaded.rev||0,why:'building',serverRev:loaded?loaded.rev||0:null};
  }
  async function runArmedHandoff(local,loaded,io){
    const remote=loaded&&loaded.profile;
    const remoteRev=loaded?loaded.rev||0:0;
    const decision=handoffDecide(local,remote,remoteRev,{tab:io.tab||'',background:!!io.background});
    if(decision.action==='already'||decision.why==='hp-regen'||decision.why==='background'){
      return {local:decision.profile||local,report:'',wrote:false,adopt:false,already:decision.action==='already',rev:remoteRev||local._rev||0,savedAt:(remote&&remote._savedAt)||0,quota:false,why:decision.why,serverRev:remote?remoteRev:null};
    }
    if(decision.action==='adopt')return {local:decision.profile,report:'',wrote:false,adopt:true,rev:decision.rev||remoteRev,quota:false,why:decision.why,serverRev:remoteRev};
    if(decision.action!=='upload'){
      return {local:decision.profile||local,report:decision.reason||'Do not switch yet. The latest change is still on this device.',wrote:false,adopt:false,rev:local._rev||0,quota:false,held:decision.held||null,heldRev:remoteRev,why:decision.why||'hold',serverRev:remote?remoteRev:null};
    }
    const blocked=buildingBlock(local,decision.profile,loaded);
    if(blocked){blocked.local=local;return blocked;}
    const base=loaded?remoteRev:0;
    const next=(loaded?remoteRev:local._rev||0)+1;
    const savedAt=io.now?io.now():Date.now();
    const out=seal(clone(decision.profile),next,io.tab||local._tab||'');
    out._savedAt=savedAt;
    try{await io.write({profile:out,rev:next,savedAt:savedAt,baseRev:base,v:3});}
    catch(e){
      const blob=((e&&e.code)||'')+' '+((e&&e.message)||'');
      const quota=/quota|resource-exhausted|429/i.test(blob);
      if(conflictWrite(e)&&!io._retried&&io.load){
        let again=null;
        try{again=await io.load();}
        catch(e2){return {local:local,report:cloudFailureText(e2),wrote:false,adopt:false,rev:local._rev||0,quota:quota,why:'load-error',readFail:classifyTypeError(e2),serverRev:null};}
        return runArmedHandoff(local,again,Object.assign({},io,{_retried:true}));
      }
      return {local:local,report:cloudFailureText(e),wrote:false,adopt:false,rev:local._rev||0,quota:quota,why:'write-error',code:((String((e&&(e.code||e.name))||'unknown').trim().match(/^[A-Za-z0-9_-]+/)||['unknown'])[0]).slice(0,40),serverRev:loaded?remoteRev:null};
    }
    return {local:out,report:'',wrote:true,adopt:false,rev:next,quota:false,why:'wrote',serverRev:loaded?remoteRev:null,baseRev:base};
  }

  const api={clone,cmpClock,clockOf,merge,gameEqual,recordChange,snapOf,shouldUpload,hexLine,hexDist,crossedHexes,planClaimRoute,explainClaim,aliasMayResolve,driveKey,unionDrives,landAhead,decide,profileFromSaveDoc,overlayResGrant,preferLand,cloudFailureText,saveStatusLine,syncAllowed,uploadPlan,runCloudHandoff,handoffDecide,armHandoff,notePlay,progressEqual,missingCamps,realAhead,linkedDecide,conflictMark,classifyTypeError,readFailText,SYNC_HOLD_MS};
  root.SYNC26=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
