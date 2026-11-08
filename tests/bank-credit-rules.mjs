// The collect transaction also writes the owner's save. Current 12i rules already allow that.
// Emulator only. No publish.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { serverTimestamp } from 'firebase/firestore';

const rulesPath = 'rules/preview-auth-rules-12i.rules';
const rules = readFileSync(rulesPath);
const rulesHash = createHash('sha256').update(rules).digest('hex');
const host = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8118').split(':');
let commit = '';
try { commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch (e) {}
console.log('BIND ' + JSON.stringify({
  test: 'bank-credit-rules',
  commit,
  rulesPath,
  rulesHash,
  emulatorInputDigest: rulesHash,
  emulator: process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8118',
  command: 'node tests/bank-credit-rules.mjs',
}));
const env = await initializeTestEnvironment({
  projectId: 'demo-dzd-12i-bank',
  firestore: { host: host[0], port: Number(host[1]), rules: rules.toString('utf8') },
});
const pw = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore();
let failed = 0;
const ok = async (name, fn) => {
  try { await fn(); console.log('PASS ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + ' ' + String(e && e.message || e).slice(0, 280)); }
};
const T = 'teams/crew12i';
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await db.doc(`${T}/meta/hq`).set({ leader: 'lead', roles: { lead: 'leader' }, titles: {}, hq: null });
  await db.doc(`${T}/meta/alliance`).set({ bank: { scrap: 500, food: 0, water: 0, fuel: 0, parts: 0 } });
  await db.doc(`${T}/bankReq/r1`).set({ uid: 'mem', name: 'Kay', res: 'scrap', amt: 40, why: '', status: 'approved', t: serverTimestamp(), by: 'lead' });
  await db.doc(`${T}/saves/mem`).set({ data: JSON.stringify({ name: 'Kay', res: { scrap: 3, food: 7 } }), rev: 4, baseRev: 3, v: 3, fe: 0, me: 0, name: 'Kay', lvl: 1 });
});
await ok('the paid request, bank drop, and owner save commit together', async () => {
  const db = pw('mem');
  const b = db.batch();
  b.set(db.doc(`${T}/meta/alliance`), { bank: { scrap: 460, food: 0, water: 0, fuel: 0, parts: 0 }, payReq: 'r1' }, { merge: true });
  b.update(db.doc(`${T}/bankReq/r1`), { status: 'paid', paidT: serverTimestamp() });
  b.set(db.doc(`${T}/bankLog/l1`), { uid: 'mem', member: 'Kay', res: 'scrap', amt: -40, bal: 460, kind: 'withdraw', t: serverTimestamp() });
  b.set(db.doc(`${T}/saves/mem`), { data: JSON.stringify({ name: 'Kay', res: { scrap: 43, food: 7 } }), rev: 5, baseRev: 4, v: 3, fe: 0, me: 0, name: 'Kay', lvl: 1, savedAt: Date.now() });
  await assertSucceeds(b.commit());
});
await ok('a second collect of the same request is rejected', async () => {
  const db = pw('mem');
  const b = db.batch();
  b.set(db.doc(`${T}/meta/alliance`), { bank: { scrap: 420, food: 0, water: 0, fuel: 0, parts: 0 }, payReq: 'r1' }, { merge: true });
  b.update(db.doc(`${T}/bankReq/r1`), { status: 'paid', paidT: serverTimestamp() });
  await assertFails(b.commit());
});
await env.cleanup();
console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
process.exit(failed ? 1 : 0);
