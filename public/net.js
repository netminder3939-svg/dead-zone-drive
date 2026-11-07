// Shared-state layer. LocalNet = offline demo (localStorage + fake teammates).
// FirebaseNet = live crew sync via Firestore. Same interface for both.
// The published raid rule rejects a single update that drops more than 1500 HP.
// One fight is still one fight: chunks are only the HP writes. Fights, taken, heal, and loot stay once.
function raidChunks(dmg,cap){
  const n=Math.max(0,Math.round(Number(dmg))||0),c=Math.max(1,(cap|0)||1500),out=[];
  for(let left=n;left>0;){const step=Math.min(c,left);out.push(step);left-=step;}
  return out;
}
function foldRaidHit(prev,chunk,first,extra){
  extra=extra||{};
  const p=Object.assign({name:extra.name||'',dmg:0,fights:0},prev||{});
  p.dmg=(p.dmg||0)+chunk;
  if(first){p.fights=(p.fights||0)+1;p.taken=(p.taken||0)+(extra.taken||0);p.heal=(p.heal||0)+(extra.heal||0);if(extra.hp!=null){p.hp=extra.hp;p.max=extra.max;}}
  return p;
}
// One step of a boss hit, read from the raid doc the transaction just loaded.
// openFight / doneFight live on the participant, which the published raid update
// already allows. A retry of the same fight id continues. A second id waits.
// This does not stop a modified client from ignoring the marker.
function stepRaid(raid,uid,name,fightId,target,extra,cap){
  extra=extra||{};
  cap=Math.max(1,(cap|0)||1500);
  target=Math.max(0,Math.round(Number(target))||0);
  const now=extra.now||Date.now();
  const r=raid||{};
  const prev=Object.assign({name:name||'',dmg:0,fights:0},(r.participants||{})[uid]||{});
  const base={applied:prev.openFight===fightId?(prev.openDmg|0):0,complete:false,alreadyDead:false,busy:false,write:false,action:'noop'};
  if(prev.doneFight===fightId)return Object.assign(base,{action:'complete',complete:true,applied:prev.openDmg|0});
  const open=prev.openFight||'';
  if(open&&open!==fightId)return Object.assign(base,{action:'busy',busy:true,applied:prev.openDmg|0});
  const have=open===fightId?(prev.openDmg|0):0;
  const room=Math.max(0,r.hp|0);
  const expired=!!(r.done||(r.endsAt&&now>r.endsAt)||room<=0);
  if(expired&&have<=0)return Object.assign(base,{action:'dead',alreadyDead:true});
  if(expired)return Object.assign(base,{action:'partial',applied:have,alreadyDead:true});
  if(target<=0||have>=target)return Object.assign(base,{action:'complete',complete:true,applied:have});
  const chunk=Math.min(cap,target-have,room);
  const p=foldRaidHit(prev,chunk,have===0,extra);
  const left=room-chunk;
  const finished=have+chunk>=target||left<=0;
  p.openFight=finished?'':fightId;
  p.openDmg=have+chunk;
  p.openTarget=target;
  p.doneFight=finished?fightId:(prev.doneFight||'');
  const participants=Object.assign({},r.participants||{});
  participants[uid]=p;
  const patch={hp:left,done:left<=0,won:left<=0};
  patch['participants.'+uid]=p;
  return {action:finished?'complete':'wrote',applied:have+chunk,complete:finished,alreadyDead:false,busy:false,write:true,patch:patch,next:Object.assign({},r,{hp:left,done:left<=0,won:left<=0,participants:participants})};
}
function settleRaidBlow(o){
  o=o||{};
  if(!o.complete)return {apply:false,charge:false,join:false};
  if(o.settled&&o.settled[o.fightId])return {apply:false,charge:false,join:false};
  return {apply:true,charge:!!o.ko,join:!o.alreadyJoined};
}
// readCommit(fn) loads the committed raid, runs fn(raid)=stepRaid, and commits
// only if that step asks for a write. A throw leaves the last committed step.
async function runRaidSteps(readCommit,uid,name,fightId,target,extra,cap){
  let last={complete:false,alreadyDead:false,applied:0,busy:false,action:'noop'};
  for(let n=0;n<30;n++){
    let step;
    try{step=await readCommit(function(raid){return stepRaid(raid,uid,name,fightId,target,extra,cap);});}
    catch(e){return {complete:false,alreadyDead:!!last.alreadyDead,applied:last.applied|0,busy:false,error:true};}
    last=step||last;
    if(!step||!step.write||step.complete||step.busy||step.alreadyDead)break;
  }
  return {complete:!!last.complete,alreadyDead:!!last.alreadyDead,applied:last.applied|0,busy:!!last.busy,error:false};
}
function isMe(u){try{return !!u&&(u===P.uid||(P.alias||[]).includes(u));}catch(e){return false;}} // v24: same player across devices (name+PIN)
const SIM_NAMES = [['Wife','#ff7ab6'],['Toni','#4ad7ff'],['Adam','#ffd24a']];

class LocalNet {
  constructor(){ this.mode='local'; this.cbs={players:[],raids:[],territory:[]}; }
  async init(profile){
    this.me=profile;
    this.terr=JSON.parse(localStorage.getItem('wl_terr')||'{}');
    this.raids=JSON.parse(localStorage.getItem('wl_raids')||'{}');
    this.sims=SIM_NAMES.map(([n,c],i)=>({uid:'sim'+i,name:n,color:c,lat:0,lng:0,ang:i*2}));
    setInterval(()=>this._tick(),2000);
    this.uid='local-'+profile.name;return this.uid;
  }
  _save(){localStorage.setItem('wl_terr',JSON.stringify(this.terr));localStorage.setItem('wl_raids',JSON.stringify(this.raids));}
  _emit(k,v){this.cbs[k].forEach(f=>f(v));}
  setCenter(lat,lng){ if(!this.center){this.sims.forEach((s,i)=>{s.lat=lat+0.004*Math.cos(i*2);s.lng=lng+0.006*Math.sin(i*2);});} this.center={lat,lng}; }
  _tick(){
    if(!this.center) return;
    this.sims.forEach(s=>{s.ang+=0.3*(Math.random()-.4);s.lat+=0.00015*Math.cos(s.ang);s.lng+=0.0002*Math.sin(s.ang);});
    this._emit('players',this.sims.map(s=>({...s})));
    // simulated teammates explore (shared fog reveal)
    this.allyExp=this.allyExp||new Set(JSON.parse(localStorage.getItem('wl_allyexp')||'[]'));const add=[];
    this.sims.forEach(s=>{const h=hexAt(s.lat,s.lng);if(!this.allyExp.has(h.id)){this.allyExp.add(h.id);add.push(h.id);}});
    if(add.length){localStorage.setItem('wl_allyexp',JSON.stringify([...this.allyExp]));(this.cbs.exp||[]).forEach(f=>f(add));}
    let ch=false;
    for(const r of Object.values(this.raids)){
      if(r.done) continue;
      if(Date.now()>r.endsAt){r.done=true;r.won=false;ch=true;continue;}
      // simulated teammates join and hit
      this.sims.forEach(s=>{ if(Math.random()<0.5){const d=Math.round(20+Math.random()*30);const p=r.participants[s.uid]||{name:s.name,dmg:0,max:120+Math.round(Math.random()*80)};p.hp=Math.max(0,(p.hp??p.max)-Math.round(Math.random()*18));p.dmg+=d;r.participants[s.uid]=p;r.hp=Math.max(0,r.hp-d);ch=true;}});
      if(r.hp<=0){r.hp=0;r.done=true;r.won=true;}
    }
    if(ch){this._save();this._emit('raids',this.raids);}
  }
  // ----- Alliance (local demo) -----
  _al(){if(!this.al){this.al=JSON.parse(localStorage.getItem('wl_al')||'null')||{bank:{scrap:120,food:60,water:60,fuel:20,parts:8},log:[],act:[],members:{}};
    const now=Date.now();this.sims.forEach((s,i)=>{this.al.members[s.uid]=this.al.members[s.uid]||{name:s.name,color:s.color,lvl:3+i*2,stronghold:2+i,contrib:{kills:20+i*15,badges:3+i*2,raids:1+i,hexes:7*(i+1),deposited:40*i,withdrawn:10*i,km:5+i*3.5}};this.al.members[s.uid].lastActive=now-(i*47+3)*60e3;});
    if(!this.al.act.length)this.al.act=[{text:'Toni built an outpost (+7 hexes)',t:now-3*3600e3},{text:'Wife earned the Overgrown Park badge',t:now-5*3600e3},{text:'Alliance founded',t:now-86400e3}];}return this.al;}
  _alSave(){localStorage.setItem('wl_al',JSON.stringify(this.al));this._emitAl();}
  _emitAl(){(this.cbs.al||[]).forEach(f=>f({research:{...(this.al.research||{})},ops:JSON.parse(JSON.stringify(this.al.ops||{})),bank:{...this.al.bank},log:this.al.log.slice(0,60),act:this.al.act.slice(0,60),members:this.al.members}));}
  onAlliance(f){(this.cbs.al=this.cbs.al||[]).push(f);this._al();this._emitAl();}
  updateMember(m){this._al().members[this.uid||'me']={...m,lastActive:Date.now(),me:true};this._alSave();}
  activity(text){this._al().act.unshift({text,t:Date.now()});this._alSave();}
  async bankMulti(uid,name,obj,kind){const a=this._al();let tot=0;for(const [res,amt] of Object.entries(obj)){if(!amt)continue;a.bank[res]=(a.bank[res]||0)+amt;tot+=amt;a.log.unshift({member:name,uid,res,amt,bal:a.bank[res],kind,t:Date.now()});}
    a.act.unshift({text:`🌅 Daily reset: ${poss(name)} 25% auto-share sent ${tot} resources to the bank`,t:Date.now()});this._alSave();}
  async bankTx(uid,name,res,amt){const a=this._al(),bal=(a.bank[res]||0)+amt;if(bal<0)throw new Error('Bank only has '+(a.bank[res]||0));
    a.bank[res]=bal;a.log.unshift({member:name,uid,res,amt,bal,kind:amt>0?'deposit':'withdraw',t:Date.now()});a.act.unshift({text:`${name} ${amt>0?'deposited':'withdrew'} ${Math.abs(amt)} ${res}`,t:Date.now()});this._alSave();return bal;}
  onExplored(f){(this.cbs.exp=this.cbs.exp||[]).push(f);f(JSON.parse(localStorage.getItem('wl_allyexp')||'[]'));}
  // ----- Stage 2 (local demo): research, operations, cloud-save stand-in -----
  async research(uid,name,id,cost){const a=this._al();a.research=a.research||{};for(const [k,v] of Object.entries(cost))if((a.bank[k]||0)<v)throw new Error('Bank needs '+v+' '+k);
    for(const [k,v] of Object.entries(cost)){if(!v)continue;a.bank[k]-=v;a.log.unshift({member:name,uid,res:k,amt:-v,bal:a.bank[k],kind:'research',t:Date.now()});}
    a.research[id]=(a.research[id]||0)+1;a.act.unshift({text:`🔬 ${name} funded research: ${id} → Lv${a.research[id]}`,t:Date.now()});this._alSave();return a.research[id];}
  async opsAdd(week,inc){const a=this._al();a.ops=a.ops||{};const o=a.ops[week]=a.ops[week]||{};for(const k in inc)o[k]=(o[k]||0)+inc[k];this._alSave();}
  async saveProfile(uid,doc){localStorage.setItem('wl_cloud_'+uid,JSON.stringify(doc));}
  async loadProfile(uid){const s=localStorage.getItem('wl_cloud_'+uid);return s?JSON.parse(s):null;}
  shareExplored(){}
  onMarkers(f){this.cbs.mk=[f];f(JSON.parse(localStorage.getItem('wl_mk')||'{}'));}
  _mk(fn){const m=JSON.parse(localStorage.getItem('wl_mk')||'{}');fn(m);localStorage.setItem('wl_mk',JSON.stringify(m));(this.cbs.mk||[]).forEach(f=>f(m));}
  addMarker(d){this._mk(m=>m['m'+Date.now()]=d);}
  delMarker(id){this._mk(m=>delete m[id]);}
  onPlayers(f){this.cbs.players.push(f);}
  onRaids(f){this.cbs.raids.push(f);f(this.raids);}
  onTerritory(f){this.cbs.territory.push(f);f(this.terr);}
  updatePlayer(){}
  async claimHex(id,data){this.terr[id]=data;this._save();this._emit('territory',this.terr);}
  async createRaid(r){this.raids[r.id]=r;this._save();this._emit('raids',this.raids);}
  async hitRaid(id,uid,name,dmg,hp,max,taken,heal,fightId){const r=this.raids[id];if(!r)return {complete:false,alreadyDead:false,applied:0,busy:false};
    const fid=fightId||(uid+':'+id);const extra={name:name,hp:hp,max:max,taken:taken,heal:heal};const self=this;
    return runRaidSteps(async function(fn){const step=fn(r);if(step.write){r.hp=step.next.hp;r.done=step.next.done;r.won=step.next.won;r.participants=step.next.participants;self._save();self._emit('raids',self.raids);}return step;},uid,name,fid,dmg,extra,1500);}
  // dev helper: a teammate "finds" a boss near you
  spawnTestBoss(lat,lng){
    const ids=['boss_crystal','boss_queen','boss_warden'];const b=ids[Math.floor(Math.random()*3)];
    const s=this.sims[Math.floor(Math.random()*3)];
    this.createRaid({id:'r'+Date.now(),bossId:b,lat:lat+0.006,lng:lng-0.004,place:'Found by '+s.name,
      hp:MONSTERS[b].hp,maxHp:MONSTERS[b].hp,endsAt:Date.now()+10*60e3,finder:s.name,participants:{},done:false});
  }
}

class FirebaseNet {
  constructor(cfg,team){this.mode='firebase';this.cfg=cfg;this.team=team;}
  async init(profile){
    this.team=localStorage.getItem('wl_team')||this.team;const V='https://www.gstatic.com/firebasejs/10.12.2/';
    const app=await import(V+'firebase-app.js'), auth=await import(V+'firebase-auth.js'), fs=await import(V+'firebase-firestore.js');
    this.fs=fs; const a=app.initializeApp(this.cfg); // v16 (J3): iOS Safari drops Firestore's streaming channel after backgrounding; long-polling is the reliable transport there.
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    try{this.db=fs.initializeFirestore(a,ios?{experimentalForceLongPolling:true}:{experimentalAutoDetectLongPolling:true});}catch(e){this.db=fs.getFirestore(a);}
    const au=auth.getAuth(a);this.authMod=auth;this.auth=au;
    const localHost=location.hostname==='localhost'||location.hostname==='127.0.0.1';
    if(localHost){try{auth.connectAuthEmulator(au,'http://127.0.0.1:9099',{disableWarnings:true});}catch(e){}try{fs.connectFirestoreEmulator(this.db,'127.0.0.1',8080);}catch(e){}}
    try{await auth.setPersistence(au,auth.browserLocalPersistence);}catch(e){}
    try{await au.authStateReady();}catch(e){}
    const preview=location.hostname.indexOf('--')>=0||localHost;
    let user;
    if(preview&&window.auth12SignIn){user=await window.auth12SignIn(auth,au);this.emailAuth=true;window.__emailAuth=true;}
    else user=au.currentUser||(await auth.signInAnonymously(au)).user;
    this.uid=user.uid; this.isAnon=user.isAnonymous; this.email=user.email||''; this.me=profile;
    this.base=['teams',this.team];
    if(this.emailAuth&&window.auth12Canonical)await window.auth12Canonical(this);
    return this.uid;
  }
  col(n){return this.fs.collection(this.db,...this.base,n);}
  // 12f: one Firestore listener per query, shared by every caller (free Spark plan read budget).
  // Late subscribers get the last snapshot at once. Errors go to every subscriber.
  share(key,mk,f,err){this._sh=this._sh||{};let e=this._sh[key];
    if(!e){e=this._sh[key]={cbs:[],last:null};this.fs.onSnapshot(mk(),s=>{e.last=s;for(const c of e.cbs){try{c.f(s);}catch(x){console.warn('share '+key,x);}}},x=>{for(const c of e.cbs){try{c.err&&c.err(x);}catch(y){}}});}
    e.cbs.push({f,err});if(e.last){try{f(e.last);}catch(x){console.warn('share '+key,x);}}}
  // newest activity docs (one listener, 150 deep); each caller sees its own newest n
  actFeed(n,f,err){this.share('activity',()=>this.fs.query(this.col('activity'),this.fs.orderBy('t','desc'),this.fs.limit(150)),s=>{const docs=s.docs.slice(0,n);f({docs,size:docs.length,empty:!docs.length,forEach(cb){docs.forEach(cb);}});},err);}
  playersFeed(f,err){this.share('players',()=>this.col('players'),f,err);}
  allianceDocFeed(f,err){this.share('metaAlliance',()=>this.fs.doc(this.db,...this.base,'meta','alliance'),f,err);}
  setCenter(){}
  onPlayers(f){this.playersFeed(s=>{const a=[];s.forEach(d=>{const v=d.data();if(d.id!==this.uid&&Date.now()-v.t<15*60e3)a.push({uid:d.id,...v});});f(a);});}
  onRaids(f){this.fs.onSnapshot(this.col('raids'),s=>{const o={};s.forEach(d=>o[d.id]={id:d.id,...d.data()});f(o);});}
  onTerritory(f){this.fs.onSnapshot(this.col('territory'),s=>{const o={};s.forEach(d=>o[d.id]=d.data());f(o);});}
  // Fog of war: each member's explored hex ids (170 m cells, never raw GPS) shared with the alliance.
  onExplored(f){this.fs.onSnapshot(this.col('explored'),s=>{const a=[];s.forEach(d=>{if(d.id!==this.uid)a.push(...(d.data().ids||[]));});f(a);});}
  shareExplored(ids){if(!ids.length)return;this.fs.setDoc(this.fs.doc(this.col('explored'),this.uid),{ids:this.fs.arrayUnion(...ids)},{merge:true}).catch(()=>{});}
  onMarkers(f){this.fs.onSnapshot(this.col('markers'),s=>{const o={};s.forEach(d=>o[d.id]=d.data());f(o);});}
  addMarker(d){this.fs.addDoc(this.col('markers'),d);}
  delMarker(id){this.fs.deleteDoc(this.fs.doc(this.col('markers'),id));}
  // Privacy: no GPS is written. Members doc = name, level, contribution stats, last active.
  updateMember(m){this.fs.setDoc(this.fs.doc(this.col('players'),this.uid),{...m,lastActive:this.fs.serverTimestamp()});}
  activity(text){this.fs.addDoc(this.col('activity'),{text,uid:this.uid,t:this.fs.serverTimestamp()});}
  onAlliance(f){const fs=this.fs,st={bank:{},research:{},ops:{},log:[],act:[],members:{}},emit=()=>f({...st});const ms=x=>x&&x.toMillis?x.toMillis():Date.now();
    this.allianceDocFeed(d=>{const x=d.exists()?d.data():{};st.bank=x.bank||{};st.research=x.research||{};st.ops=x.ops||{};emit();});
    fs.onSnapshot(fs.query(this.col('bankLog'),fs.orderBy('t','desc'),fs.limit(60)),s=>{st.log=s.docs.map(d=>({...d.data(),t:ms(d.data().t)}));emit();});
    this.actFeed(60,s=>{st.act=s.docs.map(d=>({...d.data(),t:ms(d.data().t)}));emit();});
    this.playersFeed(s=>{st.members={};s.forEach(d=>st.members[d.id]={...d.data(),lastActive:ms(d.data().lastActive),me:d.id===this.uid});for(const m of Object.values({...st.members}))for(const a of (Array.isArray(m.alias)?m.alias:[]))if(a!==this.uid&&st.members[a])delete st.members[a]; /* v24: other devices of the same player are one member */emit();});}
  async bankMulti(uid,name,obj,kind){const fs=this.fs,ref=fs.doc(this.db,...this.base,'meta','alliance');let tot=0;
    await fs.runTransaction(this.db,async tx=>{const d=await tx.get(ref);const bank={...((d.exists()&&d.data().bank)||{})};
      for(const [res,amt] of Object.entries(obj)){if(!amt)continue;bank[res]=(bank[res]||0)+amt;tot+=amt;tx.set(fs.doc(this.col('bankLog')),{uid,member:name,res,amt,bal:bank[res],kind,t:fs.serverTimestamp()});}
      tx.set(ref,{bank},{merge:true});});
    this.activity(`🌅 Daily reset: ${poss(name)} 25% auto-share sent ${tot} resources to the bank`);}
  async bankTx(uid,name,res,amt){const fs=this.fs,ref=fs.doc(this.db,...this.base,'meta','alliance'),logRef=fs.doc(this.col('bankLog'));let bal;
    await fs.runTransaction(this.db,async tx=>{const d=await tx.get(ref);const bank=(d.exists()&&d.data().bank)||{};bal=(bank[res]||0)+amt;
      if(bal<0)throw new Error('Bank only has '+(bank[res]||0));
      tx.set(ref,{bank:{...bank,[res]:bal}},{merge:true});
      tx.set(logRef,{uid,member:name,res,amt,bal,kind:amt>0?'deposit':'withdraw',t:fs.serverTimestamp()});});
    this.activity(`${name} ${amt>0?'deposited':'withdrew'} ${Math.abs(amt)} ${res}`);return bal;}
  // ----- Stage 2: research (atomic bank spend), operations counters, cloud saves -----
  async research(uid,name,id,cost){const fs=this.fs,ref=fs.doc(this.db,...this.base,'meta','alliance');let lvl;
    await fs.runTransaction(this.db,async tx=>{const d=await tx.get(ref),x=d.exists()?d.data():{},bank={...(x.bank||{})},rs={...(x.research||{})};
      for(const [k,v] of Object.entries(cost))if((bank[k]||0)<v)throw new Error('Bank needs '+v+' '+k);
      for(const [k,v] of Object.entries(cost)){if(!v)continue;bank[k]-=v;tx.set(fs.doc(this.col('bankLog')),{uid,member:name,res:k,amt:-v,bal:bank[k],kind:'research',t:fs.serverTimestamp()});}
      lvl=rs[id]=(rs[id]||0)+1;tx.set(ref,{bank,research:rs},{merge:true});});
    this.activity(`🔬 ${name} funded research: ${id} → Lv${lvl}`);return lvl;}
  async opsAdd(week,inc){const fs=this.fs,o={};for(const k in inc)o[k]=fs.increment(inc[k]);
    return fs.setDoc(fs.doc(this.db,...this.base,'meta','alliance'),{ops:{[week]:o}},{merge:true}).catch(()=>{});}
  async saveProfile(uid,doc){const fs=this.fs;return fs.setDoc(fs.doc(this.col('saves'),uid),{...doc,serverT:fs.serverTimestamp()});}
  async loadProfile(uid){
    const fs=this.fs,note=window.__dddLoad||(window.__dddLoad={});
    const t=v=>{const k=typeof v;return (k==='function'||k==='undefined'||k==='object'||k==='string'||k==='number'||k==='boolean'||k==='symbol'||k==='bigint')?k:'other';};
    note.collection=fs?t(fs.collection):'undefined';note.doc=fs?t(fs.doc):'undefined';note.getDoc=fs?t(fs.getDoc):'undefined';
    note.base=Array.isArray(this.base)?'array':(this.base==null?'missing':t(this.base));
    note.step='before-getDoc';
    const d=await fs.getDoc(fs.doc(this.col('saves'),uid));
    note.step='before-exists';
    const ok=d.exists();
    if(!ok)return null;
    note.step='before-data';
    return d.data();
  }
  claimHex(id,data){return this.fs.setDoc(this.fs.doc(this.col('territory'),id),data);}
  createRaid(r){const {id,...rest}=r;return this.fs.setDoc(this.fs.doc(this.col('raids'),id),rest);}
  async hitRaid(id,uid,name,dmg,hp,max,taken,heal,fightId){
    const ref=this.fs.doc(this.col('raids'),id);
    const fid=fightId||(uid+':'+Date.now());
    const extra={name:name,hp:hp,max:max,taken:taken,heal:heal,now:Date.now()};
    const fs=this.fs,db=this.db;
    return runRaidSteps(async function(fn){
      return fs.runTransaction(db,async function(tx){const s=await tx.get(ref);if(!s.exists())return {write:false,complete:false,alreadyDead:false,applied:0};
        const got=fn(s.data());if(got.write)tx.update(ref,got.patch);return got;});
    },uid,name,fid,dmg,extra,1500);
  }
  spawnTestBoss(){if(typeof spawnTestBossNear==='function')return spawnTestBossNear();}
}

function makeNet(){
  const c=window.FIREBASE_CONFIG||{};
  const forceLocal=new URLSearchParams(location.search).has('local');
  return (c.apiKey&&!forceLocal)?new FirebaseNet(c,localStorage.getItem('wl_team')||window.DEFAULT_TEAM):new LocalNet();
}
