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
  function sig(o){
    return JSON.stringify(stable({
      lvl:(o&&o.lvl)||1,xp:(o&&o.xp)||0,sp:(o&&o.sp)||0,skills:(o&&o.skills)||{},
      badges:(o&&o.badges)||{},pipes:(o&&o.pipeUnlock26)||{},meters:meters(o),kills:kills(o),
      tiles:(o&&o.tiles)||{},res:normRes(o&&o.res),troops:(o&&o.troops)||null,
      drives:(o&&o.dr26||[]).map(driveKey).filter(Boolean).sort(),
      claim:(o&&o.claimDay)||null,paid:(o&&o.marchPaid)||null,done:(o&&o.marchDone)||null,
      hp:(o&&o.hp)||0,sh:(o&&o.stronghold)||null,
      worldSh:o&&o.world&&o.world.sh||null,barracks:o&&o.world&&o.world.barracks||null,
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
    return (A._savedAt||0)>=(B._savedAt||0)?A:B;
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
    const troopChanged=JSON.stringify(s.snap.troops)!==JSON.stringify(cur.troops);
    const progChanged=JSON.stringify(s.snap.prog)!==JSON.stringify(cur.prog);
    if(!rd&&!td&&!troopChanged&&!progChanged)return false;
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

  const api={clone,cmpClock,clockOf,merge,gameEqual,recordChange,snapOf,shouldUpload,hexLine,hexDist,crossedHexes,planClaimRoute,explainClaim,aliasMayResolve,driveKey,unionDrives,landAhead,decide};
  root.SYNC26=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
