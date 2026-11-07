// Fake firebase-firestore for local two-device tests. Mirrors the whole fake DB through a long-poll feed.
const BASE=new URL('.',import.meta.url).href.replace(/\/$/,'');
const S=globalThis.__fakeFS||(globalThis.__fakeFS={mirror:new Map(),ver:0,listeners:new Set(),started:false,offline:false,queue:[],ready:null,stats:{reads:0,writes:0,tx:0,txFail:0}});
const err=(code,msg)=>Object.assign(new Error(msg||code),{code});
async function call(p,body){if(S.offline)throw err('unavailable','offline');
  const r=await fetch(BASE+p,{method:body?'POST':'GET',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  const j=await r.json();if(r.status===409)throw err('aborted','conflict');if(!r.ok)throw err(j.code||'internal',j.error);return j;}
function mergeIn(docs){let ch=false;for(const [p,d] of Object.entries(docs)){if(d===null){if(S.mirror.delete(p))ch=true;}else{const c=S.mirror.get(p);if(!c||c.v!==d.v){S.mirror.set(p,d);ch=true;}}}return ch;}
async function loop(){for(;;){if(S.offline){await new Promise(r=>setTimeout(r,300));continue;}
  try{const j=await call('/poll?since='+S.ver);if(j.ver<S.ver){S.mirror.clear();S.ver=0;continue;}S.ver=j.ver;if(mergeIn(j.docs))fire();}catch(e){await new Promise(r=>setTimeout(r,500));}}}
function start(){if(S.started)return S.ready;S.started=true;S.ready=(async()=>{for(;;){try{const j=await call('/dump');S.ver=j.ver;mergeIn(j.docs);break;}catch(e){await new Promise(r=>setTimeout(r,300));}}loop();})();return S.ready;}
function fire(){for(const l of [...S.listeners]){try{l.check();}catch(e){console.warn('fake listener',e);}}}
// ---- values
const TS=ms=>({seconds:Math.floor(ms/1000),nanoseconds:0,toMillis(){return ms;},toDate(){return new Date(ms);},valueOf(){return ms;}});
function revive(v){if(Array.isArray(v))return v.map(revive);if(v&&typeof v==='object'){if(v.__ts)return TS(v.__ts);const o={};for(const k in v)o[k]=revive(v[k]);return o;}return v;}
function enc(v){if(v===undefined)return null;if(v&&typeof v==='object'){if(v.__st||v.__inc!==undefined||v.__au||v.__del)return v;if(typeof v.toMillis==='function')return{__ts:v.toMillis()};if(v instanceof Date)return{__ts:v.getTime()};
  if(Array.isArray(v))return v.map(enc);const o={};for(const k in v){if(v[k]!==undefined)o[k]=enc(v[k]);}return o;}return v;}
export const serverTimestamp=()=>({__st:1});export const increment=n=>({__inc:n});export const arrayUnion=(...a)=>({__au:a});export const deleteField=()=>({__del:1});
export const Timestamp={now:()=>TS(Date.now()),fromMillis:TS};
// ---- refs
const segs=a=>a.flatMap(x=>String(x).split('/')).filter(Boolean);
const rid=()=>Math.random().toString(36).slice(2,12)+Math.random().toString(36).slice(2,8);
export function initializeFirestore(){start();return{fake:true};}export function getFirestore(){start();return{fake:true};}export function connectFirestoreEmulator(){}
export function collection(base,...rest){const p=base&&base.type?[base.path,...rest]:rest;return{type:'col',path:segs(p).join('/'),get id(){return this.path.split('/').pop();}};}
export function doc(base,...rest){let p;if(base&&base.type==='col'){p=[base.path,...(rest.length?rest:[rid()])];}else p=rest;const path=segs(p).join('/');return{type:'doc',path,id:path.split('/').pop(),parent:{path:path.split('/').slice(0,-1).join('/')}};}
export const where=(f,op,v)=>({k:'where',f,op,v});export const orderBy=(f,d)=>({k:'order',f,d:d||'asc'});export const limit=n=>({k:'limit',n});
export function query(col,...cons){return{type:'query',path:col.path,cons};}
// ---- snapshots
function dsnap(path,d){const data=d?revive(d.data):undefined;return{id:path.split('/').pop(),ref:{type:'doc',path,id:path.split('/').pop()},exists:()=>!!d,data:()=>data===undefined?undefined:JSON.parse(JSON.stringify(data),(k,v)=>v&&typeof v==='object'&&'seconds' in v&&'nanoseconds' in v?TS(v.seconds*1000):v),get:k=>data&&data[k],metadata:{hasPendingWrites:false,fromCache:S.offline}};}
function getf(o,f){return f.split('.').reduce((a,k)=>a==null?a:a[k],o);}
function cmpv(a,b){a=a&&a.__ts?a.__ts:a;b=b&&b.__ts?b.__ts:b;if(a==null&&b==null)return 0;if(a==null)return -1;if(b==null)return 1;return a<b?-1:a>b?1:0;}
function runQuery(q){const pre=q.path+'/';let rows=[];for(const [p,d] of S.mirror){if(p.startsWith(pre)&&!p.slice(pre.length).includes('/'))rows.push([p,d]);}
  const cons=q.cons||[];for(const c of cons.filter(c=>c.k==='where')){rows=rows.filter(([,d])=>{const v=getf(d.data,c.f);
    switch(c.op){case'==':return JSON.stringify(v)===JSON.stringify(c.v);case'!=':return JSON.stringify(v)!==JSON.stringify(c.v);case'in':return c.v.some(x=>JSON.stringify(x)===JSON.stringify(v));
      case'>':return cmpv(v,c.v)>0;case'>=':return cmpv(v,c.v)>=0;case'<':return cmpv(v,c.v)<0;case'<=':return cmpv(v,c.v)<=0;case'array-contains':return Array.isArray(v)&&v.includes(c.v);}return true;});}
  for(const o of cons.filter(c=>c.k==='order').reverse())rows.sort((a,b)=>{const r=cmpv(getf(a[1].data,o.f),getf(b[1].data,o.f));return o.d==='desc'?-r:r;});
  const lim=cons.find(c=>c.k==='limit');if(lim)rows=rows.slice(0,lim.n);return rows;}
function qsnap(rows){const docs=rows.map(([p,d])=>dsnap(p,d));return{docs,size:docs.length,empty:!docs.length,forEach(f){docs.forEach(f);},docChanges(){return docs.map(d=>({type:'added',doc:d}));},metadata:{hasPendingWrites:false,fromCache:S.offline}};}
export function onSnapshot(ref,next,error){if(typeof next==='object'&&next){error=next.error;next=next.next;}let last=null;
  const l={check(){let key,snap;if(ref.type==='doc'){const d=S.mirror.get(ref.path);key=d?d.v:-1;snap=()=>dsnap(ref.path,d);}else{const rows=runQuery(ref.type==='col'?{path:ref.path,cons:[]}:ref);key=rows.map(([p,d])=>p+':'+d.v).join(',');snap=()=>qsnap(rows);}
    if(key===last)return;last=key;S.stats.reads++;try{next(snap());}catch(e){console.error('onSnapshot cb',e);}}};
  start().then(()=>{S.listeners.add(l);l.check();});return()=>S.listeners.delete(l);}
export async function getDoc(ref){await start();S.stats.reads++;if(S.offline){const d=S.mirror.get(ref.path);if(!d)throw err('unavailable','offline');return dsnap(ref.path,d);}
  const j=await call('/get?p='+encodeURIComponent(ref.path));return dsnap(ref.path,j.exists?{data:j.data,v:j.v}:null);}
export async function getDocs(q){await start();if(!S.offline){try{const j=await call('/dump');S.ver=Math.max(S.ver,j.ver);mergeIn(j.docs);}catch(e){}}return qsnap(runQuery(q.type==='col'?{path:q.path,cons:[]}:q));}
async function commit(writes,reads){S.stats.writes+=writes.length;if(S.offline&&!reads){S.queue.push(...writes);return;}const j=await call('/commit',{writes,reads});return j;}
export function setDoc(ref,data,opt){return commit([{op:'set',path:ref.path,data:enc(data),merge:!!(opt&&opt.merge)}]);}
export async function addDoc(col,data){const r=doc(col);await commit([{op:'set',path:r.path,data:enc(data)}]);return r;}
export function updateDoc(ref,data){return commit([{op:'update',path:ref.path,data:enc(data)}]);}
export function deleteDoc(ref){return commit([{op:'delete',path:ref.path}]);}
export async function runTransaction(db,fn){S.stats.tx++;for(let i=0;i<5;i++){if(S.offline){S.stats.txFail++;throw err('unavailable','offline');}
    const reads={},writes=[];const tx={async get(ref){const j=await call('/get?p='+encodeURIComponent(ref.path));reads[ref.path]=j.v||0;return dsnap(ref.path,j.exists?{data:j.data,v:j.v}:null);},
      set(ref,data,opt){writes.push({op:'set',path:ref.path,data:enc(data),merge:!!(opt&&opt.merge)});return tx;},update(ref,data){writes.push({op:'update',path:ref.path,data:enc(data)});return tx;},delete(ref){writes.push({op:'delete',path:ref.path});return tx;}};
    const out=await fn(tx);try{await commit(writes,reads);return out;}catch(e){if(e.code!=='aborted')throw e;}}
  S.stats.txFail++;throw err('aborted','transaction retries exhausted');}
export async function disableNetwork(){S.offline=true;}
export async function enableNetwork(){S.offline=false;const q=S.queue.splice(0);if(q.length){try{await call('/commit',{writes:q});}catch(e){S.queue.unshift(...q);}}}
globalThis.__fakeNet={offline:v=>v?disableNetwork():enableNetwork(),stats:()=>S.stats};
