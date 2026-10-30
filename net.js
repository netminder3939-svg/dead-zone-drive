// Shared-state layer. LocalNet = offline demo (localStorage + fake teammates).
// FirebaseNet = live crew sync via Firestore. Same interface for both.
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
    a.act.unshift({text:`🌅 Daily reset: ${name}'s 25% auto-share sent ${tot} resources to the bank`,t:Date.now()});this._alSave();}
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
  async hitRaid(id,uid,name,dmg,hp,max){const r=this.raids[id];if(!r||r.done)return;
    const p=r.participants[uid]||{name,dmg:0};p.dmg+=dmg;if(hp!=null){p.hp=hp;p.max=max;}r.participants[uid]=p;r.hp=Math.max(0,r.hp-dmg);
    if(r.hp<=0){r.done=true;r.won=true;} this._save();this._emit('raids',this.raids);}
  // dev helper: a teammate "finds" a boss near you
  spawnTestBoss(lat,lng){
    const ids=['boss_tank','boss_queen','boss_warden'];const b=ids[Math.floor(Math.random()*3)];
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
    this.fs=fs; const a=app.initializeApp(this.cfg); this.db=fs.getFirestore(a);
    const cred=await auth.signInAnonymously(auth.getAuth(a)); this.uid=cred.user.uid; this.me=profile;
    this.base=['teams',this.team]; return this.uid;
  }
  col(n){return this.fs.collection(this.db,...this.base,n);}
  setCenter(){}
  onPlayers(f){this.fs.onSnapshot(this.col('players'),s=>{const a=[];s.forEach(d=>{const v=d.data();if(d.id!==this.uid&&Date.now()-v.t<15*60e3)a.push({uid:d.id,...v});});f(a);});}
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
    fs.onSnapshot(fs.doc(this.db,...this.base,'meta','alliance'),d=>{const x=d.exists()?d.data():{};st.bank=x.bank||{};st.research=x.research||{};st.ops=x.ops||{};emit();});
    fs.onSnapshot(fs.query(this.col('bankLog'),fs.orderBy('t','desc'),fs.limit(60)),s=>{st.log=s.docs.map(d=>({...d.data(),t:ms(d.data().t)}));emit();});
    fs.onSnapshot(fs.query(this.col('activity'),fs.orderBy('t','desc'),fs.limit(60)),s=>{st.act=s.docs.map(d=>({...d.data(),t:ms(d.data().t)}));emit();});
    fs.onSnapshot(this.col('players'),s=>{st.members={};s.forEach(d=>st.members[d.id]={...d.data(),lastActive:ms(d.data().lastActive),me:d.id===this.uid});emit();});}
  async bankMulti(uid,name,obj,kind){const fs=this.fs,ref=fs.doc(this.db,...this.base,'meta','alliance');let tot=0;
    await fs.runTransaction(this.db,async tx=>{const d=await tx.get(ref);const bank={...((d.exists()&&d.data().bank)||{})};
      for(const [res,amt] of Object.entries(obj)){if(!amt)continue;bank[res]=(bank[res]||0)+amt;tot+=amt;tx.set(fs.doc(this.col('bankLog')),{uid,member:name,res,amt,bal:bank[res],kind,t:fs.serverTimestamp()});}
      tx.set(ref,{bank},{merge:true});});
    this.activity(`🌅 Daily reset: ${name}'s 25% auto-share sent ${tot} resources to the bank`);}
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
  async loadProfile(uid){const fs=this.fs,d=await fs.getDoc(fs.doc(this.col('saves'),uid));return d.exists()?d.data():null;}
  claimHex(id,data){return this.fs.setDoc(this.fs.doc(this.col('territory'),id),data);}
  createRaid(r){const {id,...rest}=r;return this.fs.setDoc(this.fs.doc(this.col('raids'),id),rest);}
  async hitRaid(id,uid,name,dmg,hp,max){
    const ref=this.fs.doc(this.col('raids'),id);
    await this.fs.runTransaction(this.db,async tx=>{const s=await tx.get(ref);if(!s.exists())return;const r=s.data();if(r.done||Date.now()>r.endsAt)return;
      const p=(r.participants||{})[uid]||{name,dmg:0};p.dmg+=dmg;if(hp!=null){p.hp=hp;p.max=max;}const left=Math.max(0,r.hp-dmg);
      tx.update(ref,{hp:left,['participants.'+uid]:p,done:left<=0,won:left<=0});});
  }
  spawnTestBoss(){alert('Test boss is only for local demo mode.');}
}

function makeNet(){
  const c=window.FIREBASE_CONFIG||{};
  const forceLocal=new URLSearchParams(location.search).has('local');
  return (c.apiKey&&!forceLocal)?new FirebaseNet(c,localStorage.getItem('wl_team')||window.DEFAULT_TEAM):new LocalNet();
}
