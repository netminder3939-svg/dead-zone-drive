const fs=require('fs'),path=require('path');const dir=process.argv[2];
const files=[...fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(f=>f!=='leaflet.js');
const wrapped={};// name -> [files that wrapped]
const out=[];
for(const f of files){const s=fs.readFileSync(path.join(dir,f),'utf8');
  // wraps: const _x=NAME;  NAME=function... using _x
  const saves={};for(const m of s.matchAll(/(?:const|let|var)\s+([\w$]+)\s*=\s*([A-Za-z_$][\w$.]*?)(?:\.bind\([^)]*\))?\s*;/g))saves[m[1]]=m[2];
  for(const m of s.matchAll(/(?:^|[;{}\s])((?:UI\.|NET\.|window\.)?[A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\s*\(/g)){
    const name=m[1].replace(/^window\./,'');if(/^_/.test(name))continue;
    const start=m.index;const chunk=s.slice(start,start+4000);
    const usesSave=chunk.includes('.apply(this')&&false||Object.entries(saves).some(([k,v])=>v.replace(/^window\./,'')===name&&chunk.includes(k));
    if(usesSave){(wrapped[name]=wrapped[name]||[]).push(f);continue;}
    if(wrapped[name]&&wrapped[name].length)out.push(`${f}: REPLACES ${name} — drops wrappers from ${[...new Set(wrapped[name])].join(', ')}`);
    wrapped[name]=[];}}
console.log(out.join('\n'));
