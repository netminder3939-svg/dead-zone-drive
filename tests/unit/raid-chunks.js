// One boss fight, one reward. HP writes stay inside the published 1500 cap.
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../../js/net.js'),'utf8');
function grab(name){
  const i=src.indexOf('function '+name);
  if(i<0)throw new Error('missing '+name);
  let depth=0,seen=false,j=src.indexOf('{',i);
  for(;j<src.length;j++){if(src[j]==='{'){depth++;seen=true;}else if(src[j]==='}'){depth--;if(seen&&depth===0)return src.slice(i,j+1);}}
  throw new Error('unclosed '+name);
}
const raidChunks=eval('('+grab('raidChunks')+')');
const foldRaidHit=eval('('+grab('foldRaidHit')+')');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
for(const hp of [4000,6000,7200,9000]){
  const parts=raidChunks(hp,1500);
  ok(parts.every(n=>n<=1500)&&parts.reduce((a,b)=>a+b,0)===hp,'a '+hp+' HP boss splits into legal writes');
  let boss=hp,p=null,writes=0;
  parts.forEach((chunk,i)=>{
    ok(boss-chunk>=boss-1500,'write '+(i+1)+' for '+hp+' drops at most 1500');
    p=foldRaidHit(p,chunk,i===0,{name:'QA',hp:40,max:100,taken:3,heal:1});
    boss-=chunk;writes++;
  });
  ok(boss===0&&p.dmg===hp&&p.fights===1&&p.taken===3&&p.heal===1&&writes===parts.length,hp+' HP is one fight: damage once, fights once, wounds once');
}
ok(raidChunks(0,1500).length===0,'a zero-damage tick writes nothing');
ok(raidChunks(1500,1500).join()==='1500','a 1500 hit is one write');
console.log(fail?fail+' failed':'all passed');
process.exit(fail?1:0);
