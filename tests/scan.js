const fs=require('fs'),path=require('path'),espree=require('espree');const {ESLint}=require('eslint');
const dir=process.argv[2];const html=fs.readFileSync(dir+'/index.html','utf8');
const files=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(f=>f!=='leaflet.js');
const G=new Set(['L','firebase','DZD_PREVIEW','FIREBASE_CONFIG','DEFAULT_TEAM']);
for(const f of files){const src=fs.readFileSync(path.join(dir,f),'utf8');let ast;try{ast=espree.parse(src,{ecmaVersion:2022,sourceType:'script'});}catch(e){console.log('PARSE',f,e.message);continue;}
 for(const n of ast.body){if(n.type==='FunctionDeclaration'||n.type==='ClassDeclaration')G.add(n.id.name);if(n.type==='VariableDeclaration')n.declarations.forEach(d=>d.id.name&&G.add(d.id.name));}
 for(const m of src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=(?!=)/g))G.add(m[1]);}
// inline scripts in index.html
for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)){try{const ast=espree.parse(m[1],{ecmaVersion:2022});for(const n of ast.body){if(n.type==='FunctionDeclaration')G.add(n.id.name);if(n.type==='VariableDeclaration')n.declarations.forEach(d=>d.id.name&&G.add(d.id.name));}}catch(e){}}
(async()=>{const globals={};G.forEach(g=>globals[g]='writable');
const es=new ESLint({useEslintrc:false,overrideConfig:{env:{browser:true,es2022:true},parserOptions:{ecmaVersion:2022,sourceType:'script'},globals,rules:{'no-undef':'error','no-dupe-keys':'error','no-unreachable':'warn','no-self-assign':'warn','no-dupe-else-if':'error','no-cond-assign':'off','no-constant-condition':'off','valid-typeof':'error','no-unsafe-finally':'error','use-isnan':'error','no-compare-neg-zero':'error','no-sparse-arrays':'warn','no-func-assign':'off','no-import-assign':'error','no-setter-return':'error','getter-return':'error','no-redeclare':'off','no-unsafe-negation':'error','no-loss-of-precision':'warn','no-unused-private-class-members':'off','no-debugger':'error','no-empty-pattern':'warn'}}});
const res=await es.lintFiles(files.map(f=>path.join(dir,f)));const out={};
for(const r of res)for(const m of r.messages){const k=path.basename(r.filePath)+':'+m.line+' '+m.ruleId+' '+m.message;out[k]=1;}
console.log(Object.keys(out).join('\n'));console.log('files',files.length,'globals',G.size);})();
