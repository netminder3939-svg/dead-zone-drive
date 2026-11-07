// Static checks that do not open Firebase. Counts client paths the committed rules do not mention.
const fs=require('fs'),path=require('path');
let fail=0;const checks=[];
function ok(c,m){checks.push({ok:!!c,m});if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const rules=fs.readFileSync(path.join(__dirname,'../../firestore.rules'),'utf8');
const jsDir=path.join(__dirname,'../../js');
const files=fs.readdirSync(jsDir).filter(f=>f.endsWith('.js'));
const src=files.map(f=>fs.readFileSync(path.join(jsDir,f),'utf8')).join('\n')+fs.readFileSync(path.join(__dirname,'../../net.js'),'utf8');
const cols=new Set();
for(const m of src.matchAll(/col\('([A-Za-z0-9_]+)'\)/g))cols.add(m[1]);
for(const m of src.matchAll(/'meta','([A-Za-z0-9_]+)'/g))cols.add('meta/'+m[1]);
const mentioned=new Set();
for(const m of rules.matchAll(/match \/([A-Za-z0-9_]+)/g))mentioned.add(m[1]);
if(rules.includes("match /meta/alliance"))mentioned.add('meta/alliance');
function covered(c){
  if(c.startsWith('meta/'))return rules.includes('match /'+c);
  return rules.includes('match /'+c+'/{')||rules.includes('match /'+c+'/{');
}
const missing=[...cols].filter(c=>!covered(c)).sort();
ok(rules.includes('signedIn()'),'rules require a signed-in user');
ok(rules.includes("!request.resource.data.keys().hasAny(['lat','lng','pos','location'])"),'player writes reject location fields');
ok(rules.includes('request.auth.uid == uid'),'a save write is limited to that user id');
ok(missing.includes('clock')&&missing.includes('marches'),'committed rules do not mention clock or marches');
console.log('CLIENT_PATHS',JSON.stringify([...cols].sort()));
console.log('RULES_OMIT',JSON.stringify(missing));
console.log('CHECKS',checks.length,'FAILED',fail);
process.exit(fail?1:0);
