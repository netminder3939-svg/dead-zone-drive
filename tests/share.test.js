const fs=require('fs');const src=fs.readFileSync('/home/claude/work12e/net.js','utf8');
const a=src.indexOf('  share(key,mk,f,err)');const b=src.indexOf('  setCenter(){}');const body=src.slice(a,b);
const Cls=eval('(class{'+body+' col(n){return {col:n};}})');
// fake firestore: counts listeners, lets us push snapshots
let listeners=[];const fsMock={onSnapshot(q,cb,err){listeners.push({q,cb,err});},query:(c,...r)=>({c,r}),orderBy:(f,d)=>['o',f,d],limit:n=>['l',n],doc:(...x)=>({doc:x.slice(1).join('/')})};
const net=new Cls();net.fs=fsMock;net.db='db';net.base=['teams','t'];
const mkSnap=n=>{const docs=[...Array(n)].map((_,i)=>({id:'d'+i,data:()=>({i,kind:i%3?'x':'chat'})}));return{docs,size:n,forEach(c){docs.forEach(c);}};};
const got={};const rec=k=>s=>{got[k]=got[k]||[];const ids=[];s.forEach(d=>ids.push(d.data().i));got[k].push(ids.length+':'+ids[0]+'..'+ids[ids.length-1]);};
net.actFeed(60,rec('alliance'));net.actFeed(80,rec('gl25'));net.actFeed(150,rec('chat'));
console.log('activity listeners after 3 subscribers:',listeners.length,JSON.stringify(listeners[0].q.r));
listeners[0].cb(mkSnap(150));
net.actFeed(60,rec('cap26')); // late subscriber
listeners[0].cb(mkSnap(151>150?150:0));
let errs=0;net.actFeed(5,()=>{},()=>errs++);listeners[0].err(new Error('quota'));
net.playersFeed(rec('players1'));net.playersFeed(rec('players2'));net.allianceDocFeed(()=>{});net.allianceDocFeed(()=>{});
console.log('total listeners (activity+players+meta):',listeners.length);
console.log(JSON.stringify(got));console.log('error delivered:',errs);
// a throwing subscriber must not starve the others
net.actFeed(10,()=>{throw new Error('boom')});let ok=0;net.actFeed(10,()=>ok++);listeners[0].cb(mkSnap(20));console.log('after a throwing subscriber, others still called:',ok>=2);
