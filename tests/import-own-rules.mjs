// Owner import of a new preview save. Emulator only. Rules file is not modified.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

const rulesPath = 'rules/preview-auth-rules-12i.rules';
const rules = readFileSync(rulesPath);
const rulesHash = createHash('sha256').update(rules).digest('hex');
const host = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8128').split(':');
let commit = '';
try { commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch (e) {}
console.log('BIND ' + JSON.stringify({
  test: 'import-own-rules', commit, rulesPath, rulesHash, emulatorInputDigest: rulesHash,
  emulator: process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8128',
  command: 'node tests/import-own-rules.mjs',
  note: 'exact createIfAbsent shape from released 363: rev 1, baseRev 0, v 3, fe 0'
}));
const env = await initializeTestEnvironment({
  projectId: 'demo-dzd-import',
  firestore: { host: host[0], port: Number(host[1]), rules: rules.toString('utf8') },
});
const T = 'teams/pv-rathdrum-crew';
const pass = { firebase: { sign_in_provider: 'password' } };
const body = (fe) => ({
  data: JSON.stringify({ name: 'Grok Test1108', res: { scrap: 0, food: 0, water: 0, fuel: 0, parts: 0 }, fullEpoch: fe }),
  rev: 1, savedAt: Date.now(), baseRev: 0, name: 'Grok Test1108', lvl: 1, v: 3, fe, me: fe ? 3 : 0
});
let failed = 0;
const ok = (name, cond) => { if (!cond) failed++; console.log((cond ? 'PASS ' : 'FAIL ') + name); };
await env.withSecurityRulesDisabled(async c => {
  await c.firestore().doc(`${T}/meta/map`).set({ epoch: 3, fullEpoch: 50 });
});
const owner = env.authenticatedContext('owner1108', pass).firestore();
const save = owner.doc(`${T}/saves/owner1108`);
await ok('the released import payload is rejected when the team map epoch is ahead', await (async () => {
  try { await assertFails(save.set(body(0))); return true; } catch (e) { console.log(String(e).slice(0, 200)); return false; }
})());
await ok('the same owner create is accepted when fe matches the map epoch', await (async () => {
  try { await assertSucceeds(save.set(body(50))); return true; } catch (e) { console.log(String(e).slice(0, 200)); return false; }
})());
const back = await save.get();
const stored = back.exists ? JSON.parse(back.data().data) : {};
ok('the owner can read the new save back', back.exists && stored.name === 'Grok Test1108' && back.data().rev === 1 && back.data().fe === 50);
const other = env.authenticatedContext('intruder1108', pass).firestore();
await ok('another account cannot write that save', await (async () => {
  try { await assertFails(other.doc(`${T}/saves/owner1108`).set(body(50))); return true; } catch (e) { return false; }
})());
const anon = env.authenticatedContext('owner1108', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
await ok('an anonymous session cannot create a preview save', await (async () => {
  try { await assertFails(anon.doc(`${T}/saves/anon1`).set(body(50))); return true; } catch (e) { return false; }
})());
await ok('a later owner update still has to move the revision by one', await (async () => {
  const bad = save.set({ ...body(50), rev: 2, baseRev: 0 });
  const good = save.set({ ...body(50), rev: 2, baseRev: 1 });
  try { await assertFails(bad); await assertSucceeds(good); return true; } catch (e) { console.log(String(e).slice(0, 200)); return false; }
})());
await env.cleanup();
console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
process.exit(failed ? 1 : 0);
