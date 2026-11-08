// A non-owner cannot debit the bank by attaching another player's save. Emulator only. No publish.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { serverTimestamp } from 'firebase/firestore';

const rulesPath = 'rules/preview-auth-rules-12i.rules';
const rules = readFileSync(rulesPath);
const rulesHash = createHash('sha256').update(rules).digest('hex');
const host = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8128').split(':');
let commit = '';
try { commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch (e) {}
console.log('BIND ' + JSON.stringify({
  test: 'bank-guard-rules', commit, rulesPath, rulesHash, emulatorInputDigest: rulesHash,
  emulator: process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8128',
  command: 'node tests/bank-guard-rules.mjs',
}));
const env = await initializeTestEnvironment({
  projectId: 'demo-dzd-12i-guard',
  firestore: { host: host[0], port: Number(host[1]), rules: rules.toString('utf8') },
});
let failed = 0;
const ok = async (name, fn) => {
  try { await fn(); console.log('PASS ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + ' ' + String(e && e.message || e).slice(0, 300)); }
};
const T = 'teams/crew12i';
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await db.doc(`${T}/meta/hq`).set({ leader: 'lead', roles: { lead: 'leader' }, titles: {}, hq: null });
  await db.doc(`${T}/meta/alliance`).set({ bank: { scrap: 500, food: 0, water: 0, fuel: 0, parts: 0 } });
  await db.doc(`${T}/bankReq/r1`).set({ uid: 'mem', name: 'Kay', res: 'scrap', amt: 40, why: '', status: 'approved', t: serverTimestamp(), by: 'lead' });
  await db.doc(`${T}/saves/mem`).set({ data: JSON.stringify({ name: 'Kay', res: { scrap: 99, food: 12 } }), rev: 5, baseRev: 4, v: 3, fe: 0, name: 'Kay', lvl: 1 });
});
await ok('a non-owner debit plus the owner save is rejected', async () => {
  const db = env.authenticatedContext('intruder', { firebase: { sign_in_provider: 'password' } }).firestore();
  const b = db.batch();
  b.set(db.doc(`${T}/meta/alliance`), { bank: { scrap: 460, food: 0, water: 0, fuel: 0, parts: 0 }, payReq: 'r1' }, { merge: true });
  b.update(db.doc(`${T}/bankReq/r1`), { status: 'paid', paidT: serverTimestamp() });
  b.set(db.doc(`${T}/saves/mem`), { data: JSON.stringify({ name: 'Kay', res: { scrap: 139 } }), rev: 6, baseRev: 5, v: 3, fe: 0, name: 'Kay', lvl: 1 });
  await assertFails(b.commit());
});
await ok('the rejected debit leaves the bank and the save unchanged', async () => {
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    const bank = (await db.doc(`${T}/meta/alliance`).get()).data();
    const save = (await db.doc(`${T}/saves/mem`).get()).data();
    const req = (await db.doc(`${T}/bankReq/r1`).get()).data();
    if (bank.bank.scrap !== 500 || req.status !== 'approved' || save.rev !== 5 || JSON.parse(save.data).res.scrap !== 99) {
      throw new Error(JSON.stringify({ bank: bank.bank.scrap, status: req.status, rev: save.rev, scrap: JSON.parse(save.data).res.scrap }));
    }
  });
});
await env.cleanup();
console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
process.exit(failed ? 1 : 0);
