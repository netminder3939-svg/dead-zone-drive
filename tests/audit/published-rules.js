// Compares the committed rules file with the published snapshot the coordinator
// retrieved read-only. Does not load the Firebase emulator and does not publish rules.
const fs=require('fs'),path=require('path');
let fail=0;
function ok(c,m){if(!c){console.error('FAIL',m);fail++;}else console.log('ok',m);}
const root=path.join(__dirname,'../..');
const committed=fs.readFileSync(path.join(root,'firestore.rules'),'utf8');
const published=fs.readFileSync(path.join(root,'tests/fixtures/published-firestore-rules.rules'),'utf8');
const march=fs.readFileSync(path.join(root,'js/march.js'),'utf8');
const v26i=fs.readFileSync(path.join(root,'js/v26i.js'),'utf8');
const net=fs.readFileSync(path.join(root,'js/net.js'),'utf8');

function has(src,s){return src.includes(s);}
for(const p of ['match /clock/{uid}','match /marches/{id}','match /meta/map','match /meta/horde']){
  ok(has(published,p)&&has(committed,p),'both published and canonical rules allow '+p);
}
ok(has(published,"team.matches('pv-.*')")&&!has(committed,'pv-.*'),'canonical rules drop the pv- delete-everything rule');
ok(has(committed,'match /meta/admins')&&has(committed,'allow create, update, delete: if false'),'clients cannot write the admin list');
ok(has(committed,'isAdmin()')&&has(committed,'fullEpoch'),'map epoch moves only for an admin, and a save still checks fullEpoch');
ok(has(published,'resource.data.hp - 1500')&&has(committed,'hp - 1500'),'the 1500 HP raid cap stays; the client chunks under it');

ok(has(march,'minSec:120')&&has(march,'return Math.round(Math.max(M.minSec,hexDist(from,to)*M.secPerHex))*1000'),'a march duration is at least 120000 ms, above the 60000 ms create rule');
ok(has(march,"setDoc(ref,{t:fs.serverTimestamp()})"),'the clock probe writes only {t: server timestamp} on the signed-in uid');
ok(has(v26i,"updMarch(id,{result:m.result})"),'the skip line writes result alone');
ok(!/state == 'arrived'[\s\S]{0,80}result/.test(published),'a result-only patch is not one of the three allowed march updates');
ok(has(net,'hp:left')&&has(published,'hp - 1500'),'one raid update sends the whole fight damage, and the published rule rejects a drop over 1500');
ok(has(published,"allow delete: if signedIn() && team.matches('pv-.*')"),'any signed-in player can delete documents on a pv- team');
const mapRule=published.slice(published.indexOf('match /meta/map'),published.indexOf('match /meta/horde'));
ok(mapRule.includes('epoch > resource.data.epoch')&&!mapRule.includes('fullEpoch'),'a map update must raise epoch and does not limit fullEpoch');

console.log(fail?fail+' failed':'all passed');
process.exit(fail?1:0);
