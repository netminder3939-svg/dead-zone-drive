// Fake Firebase backend for two-device tests. In-memory documents with versions, optimistic commits,
// long-poll change feed, email/anonymous auth. Not Firestore: no rules, no indexes. Good enough to run the game.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=+process.argv[2]||8790;
let ver=0;const db=new Map();const log=[];const users={};let waiters=[];
const stats={commits:0,conflicts:0,writesByPath:{}};
function now(){return Date.now();}
function resolveTransforms(cur,val){
  if(val&&typeof val==='object'&&!Array.isArray(val)){
    if(val.__st)return{__ts:now()};
    if('__inc' in val)return (typeof cur==='number'?cur:0)+val.__inc;
    if(val.__au)return [...new Set([...(Array.isArray(cur)?cur:[]),...val.__au.map(x=>JSON.stringify(x))])].map(x=>JSON.parse(x));
    if(val.__ts)return val;
    const out={};for(const k of Object.keys(val)){const r=resolveTransforms(cur&&typeof cur==='object'?cur[k]:undefined,val[k]);if(!(r&&r.__del))out[k]=r;}return out;}
  return val;}
function deepMerge(a,b){if(!a||typeof a!=='object'||Array.isArray(a))a={};const o={...a};
  for(const [k,v] of Object.entries(b)){if(v&&v.__del){delete o[k];continue;}
    if(v&&typeof v==='object'&&!Array.isArray(v)&&!v.__ts&&!v.__st&&!('__inc' in v)&&!v.__au)o[k]=deepMerge(o[k],v);else o[k]=resolveTransforms(o[k],v);}return o;}
function setPath(obj,dotted,val){const ks=dotted.split('.');let o=obj;for(let i=0;i<ks.length-1;i++){if(!o[ks[i]]||typeof o[ks[i]]!=='object')o[ks[i]]={};o=o[ks[i]];}
  const last=ks[ks.length-1];if(val&&val.__del)delete o[last];else o[last]=resolveTransforms(o[last],val);}
function apply(w){const cur=db.get(w.path);
  if(w.op==='delete'){db.delete(w.path);}
  else if(w.op==='set'){const data=w.merge&&cur?deepMerge(cur.data,w.data):resolveTransforms(undefined,w.data);db.set(w.path,{data,v:0});}
  else if(w.op==='update'){if(!cur)throw Object.assign(new Error('not-found'),{code:'not-found'});const data=JSON.parse(JSON.stringify(cur.data));for(const [k,v] of Object.entries(w.data))setPath(data,k,v);db.set(w.path,{data,v:0});}
  ver++;const d=db.get(w.path);if(d)d.v=ver;log.push([ver,w.path]);if(log.length>20000)log.splice(0,5000);
  stats.writesByPath[w.path]=(stats.writesByPath[w.path]||0)+1;}
function changesSince(since){const paths=new Set();for(const [v,p] of log)if(v>since)paths.add(p);const docs={};for(const p of paths){const d=db.get(p);docs[p]=d?{data:d.data,v:d.v}:null;}return{ver,docs};}
function flush(){const w=waiters;waiters=[];for(const x of w){clearTimeout(x.t);x.res(changesSince(x.since));}}
function send(res,code,obj){res.writeHead(code,{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'*','cache-control':'no-store'});res.end(JSON.stringify(obj));}
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://x');
  if(req.method==='OPTIONS')return send(res,204,{});
  if(req.method==='GET'&&u.pathname.endsWith('.js')){const f=path.join(__dirname,path.basename(u.pathname));if(fs.existsSync(f)){res.writeHead(200,{'content-type':'text/javascript','access-control-allow-origin':'*','cache-control':'no-store'});return res.end(fs.readFileSync(f));}}
  let body='';for await(const c of req)body+=c;const j=body?JSON.parse(body):{};
  try{
    if(u.pathname==='/get'){const d=db.get(u.searchParams.get('p'));return send(res,200,d?{exists:true,data:d.data,v:d.v}:{exists:false,v:0});}
    if(u.pathname==='/dump'){const docs={};for(const [p,d] of db)docs[p]={data:d.data,v:d.v};return send(res,200,{ver,docs});}
    if(u.pathname==='/poll'){const since=+u.searchParams.get('since')||0;if(ver>since)return send(res,200,changesSince(since));
      return new Promise(r=>{const x={since,res:v=>{send(res,200,v);r();}};x.t=setTimeout(()=>{waiters=waiters.filter(y=>y!==x);x.res({ver,docs:{}});},15000);waiters.push(x);});}
    if(u.pathname==='/commit'){stats.commits++;
      for(const [p,v] of Object.entries(j.reads||{})){const d=db.get(p);if((d?d.v:0)!==v){stats.conflicts++;return send(res,409,{error:'aborted',path:p});}}
      for(const w of j.writes||[])apply(w);flush();return send(res,200,{ok:true,ver});}
    if(u.pathname==='/auth'){const {mode,email,pass}=j;
      if(mode==='anon')return send(res,200,{uid:'anon'+crypto.randomBytes(6).toString('hex'),isAnonymous:true});
      const e=String(email||'').toLowerCase();
      if(mode==='signup'){if(users[e])return send(res,400,{code:'auth/email-already-in-use'});if(String(pass).length<6)return send(res,400,{code:'auth/weak-password'});users[e]={pass,uid:'u'+crypto.createHash('sha1').update(e).digest('hex').slice(0,20)};return send(res,200,{uid:users[e].uid,email:e,isAnonymous:false});}
      if(mode==='signin'){const x=users[e];if(!x||x.pass!==pass)return send(res,400,{code:'auth/invalid-credential'});return send(res,200,{uid:x.uid,email:e,isAnonymous:false});}}
    if(u.pathname==='/stats')return send(res,200,{...stats,ver,docs:db.size});
    if(u.pathname==='/reset'){db.clear();log.length=0;ver=0;for(const k in users)delete users[k];stats.commits=0;stats.conflicts=0;stats.writesByPath={};return send(res,200,{ok:true});}
    send(res,404,{error:'no'});
  }catch(e){send(res,500,{error:String(e.message||e),code:e.code||'internal'});}
});
server.listen(PORT,'0.0.0.0',()=>console.log('fake firebase on',PORT));
