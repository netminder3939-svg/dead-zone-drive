// Firestore rules tests for R6 = every 12i test (unchanged) + the HQ building, the Vault lock and the 3-role cap. Run against the emulator:
//   npm i -D @firebase/rules-unit-testing@3 firebase@10 mocha
//   firebase emulators:exec --only firestore "npx mocha tests/rules-r6.test.mjs"
// Rules file: rules/preview-auth-rules-r6.rules. Team is a live-style id (not pv-) so preview wipe rules don't interfere.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { serverTimestamp, Timestamp } from 'firebase/firestore';

const T = 'teams/crew12i';
let env;
const pw = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore();
const seed = async fn => env.withSecurityRulesDisabled(async c => fn(c.firestore()));

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'dzd-rules-r6', firestore: { rules: readFileSync('rules/preview-auth-rules-r6.rules', 'utf8') } });
});
after(async () => env && env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await seed(async db => {
    await db.doc(`${T}/meta/alliance`).set({ bank: { scrap: 500, food: 100 } });
    await db.doc(`${T}/players/lead`).set({ name: 'Pope', lastActive: Timestamp.now() });
  });
});
const withHq = (extra = {}) => seed(db => db.doc(`${T}/meta/hq`).set({ leader: 'lead', roles: { lead: 'leader', off: 'officer' }, titles: {}, hq: null, ...extra }));

describe('meta/hq ranks', () => {
  it('first member can claim leadership', () => assertSucceeds(pw('lead').doc(`${T}/meta/hq`).set({ leader: 'lead', roles: { lead: 'leader' }, titles: {}, hq: null })));
  it('cannot create with someone else as leader', () => assertFails(pw('mem').doc(`${T}/meta/hq`).set({ leader: 'lead', roles: { lead: 'leader' } })));
  it('cannot create with extra officers', () => assertFails(pw('lead').doc(`${T}/meta/hq`).set({ leader: 'lead', roles: { lead: 'leader', x: 'officer' } })));
  it('member cannot change anything', async () => { await withHq(); await assertFails(pw('mem').doc(`${T}/meta/hq`).update({ hq: { hex: '1_1', name: 'X' } })); });
  it('officer can move the HQ and set titles', async () => { await withHq(); await assertSucceeds(pw('off').doc(`${T}/meta/hq`).update({ hq: { hex: '1_1', name: 'X' }, titles: { mem: 'Road Captain' } })); });
  it('officer cannot change ranks', async () => { await withHq(); await assertFails(pw('off').doc(`${T}/meta/hq`).update({ roles: { lead: 'leader', off: 'officer', mem: 'officer' } })); });
  it('leader can promote', async () => { await withHq(); await assertSucceeds(pw('lead').doc(`${T}/meta/hq`).update({ roles: { lead: 'leader', off: 'officer', mem: 'officer' } })); });
  it('leader can hand over leadership', async () => { await withHq(); await assertSucceeds(pw('lead').doc(`${T}/meta/hq`).update({ leader: 'off', roles: { lead: 'officer', off: 'leader' } })); });
  it('the doc must always name a real leader', async () => { await withHq(); await assertFails(pw('lead').doc(`${T}/meta/hq`).update({ roles: { lead: 'officer', off: 'officer' } })); });
  it('officer cannot take over an active leader', async () => { await withHq(); await assertFails(pw('off').doc(`${T}/meta/hq`).update({ leader: 'off', roles: { lead: 'officer', off: 'leader' }, takeover: 'lead' })); });
  it('officer can take over a leader inactive 14+ days', async () => {
    await withHq(); await seed(db => db.doc(`${T}/players/lead`).set({ name: 'Pope', lastActive: Timestamp.fromMillis(Date.now() - 15 * 864e5) }));
    await assertSucceeds(pw('off').doc(`${T}/meta/hq`).update({ leader: 'off', roles: { lead: 'officer', off: 'leader' }, takeover: 'lead' }));
  });
});

describe('alliance bank', () => {
  it('before a leader exists, anyone can withdraw (old behaviour)', () => assertSucceeds(pw('mem').doc(`${T}/meta/alliance`).set({ bank: { scrap: 460, food: 100 } }, { merge: true })));
  it('anyone can deposit', async () => { await withHq(); await assertSucceeds(pw('mem').doc(`${T}/meta/alliance`).set({ bank: { scrap: 600, food: 100 } }, { merge: true })); });
  it('a member cannot withdraw directly', async () => { await withHq(); await assertFails(pw('mem').doc(`${T}/meta/alliance`).set({ bank: { scrap: 460, food: 100 } }, { merge: true })); });
  it('an officer can withdraw directly', async () => { await withHq(); await assertSucceeds(pw('off').doc(`${T}/meta/alliance`).set({ bank: { scrap: 460, food: 100 } }, { merge: true })); });
  it('the bank can never go negative', async () => { await withHq(); await assertFails(pw('off').doc(`${T}/meta/alliance`).set({ bank: { scrap: -1, food: 100 } }, { merge: true })); });
  const approved = (amt = 40, status = 'approved', uid = 'mem') => seed(db => db.doc(`${T}/bankReq/r1`).set({ uid, name: 'Kay', res: 'scrap', amt, why: '', status, t: Timestamp.now(), by: 'off' }));
  const collect = (db, scrap, food = 100, reqStatus = 'paid') => { const b = db.batch();
    b.set(db.doc(`${T}/meta/alliance`), { bank: { scrap, food }, payReq: 'r1' }, { merge: true });
    b.update(db.doc(`${T}/bankReq/r1`), { status: reqStatus, paidT: serverTimestamp() }); return b.commit(); };
  it('a member collects an approved request (exact amount, request becomes paid)', async () => { await withHq(); await approved(); await assertSucceeds(collect(pw('mem'), 460)); });
  it('cannot take more than approved', async () => { await withHq(); await approved(); await assertFails(collect(pw('mem'), 400)); });
  it('cannot take another resource too', async () => { await withHq(); await approved(); await assertFails(collect(pw('mem'), 460, 50)); });
  it('cannot collect a pending request', async () => { await withHq(); await approved(40, 'pending'); await assertFails(collect(pw('mem'), 460)); });
  it('cannot collect someone else\'s request', async () => { await withHq(); await approved(40, 'approved', 'other'); await assertFails(collect(pw('mem'), 460)); });
  it('cannot collect a request twice', async () => { await withHq(); await approved(40, 'paid'); await assertFails(collect(pw('mem'), 420)); });
});

describe('bank requests', () => {
  const req = (over = {}) => ({ uid: 'mem', name: 'Kay', res: 'scrap', amt: 40, why: 'gear', status: 'pending', t: serverTimestamp(), ...over });
  it('a member can ask', () => assertSucceeds(pw('mem').collection(`${T}/bankReq`).add(req())));
  it('cannot ask as someone else', () => assertFails(pw('mem').collection(`${T}/bankReq`).add(req({ uid: 'other' }))));
  it('cannot create an already-approved request', () => assertFails(pw('mem').collection(`${T}/bankReq`).add(req({ status: 'approved' }))));
  it('amount must be a positive whole number', () => assertFails(pw('mem').collection(`${T}/bankReq`).add(req({ amt: -5 }))));
  const pending = () => seed(db => db.doc(`${T}/bankReq/r2`).set({ uid: 'mem', name: 'Kay', res: 'scrap', amt: 40, why: '', status: 'pending', t: Timestamp.now() }));
  it('a member cannot approve', async () => { await withHq(); await pending(); await assertFails(pw('mem').doc(`${T}/bankReq/r2`).update({ status: 'approved', by: 'mem', byName: 'Kay', decT: serverTimestamp() })); });
  it('an officer can approve', async () => { await withHq(); await pending(); await assertSucceeds(pw('off').doc(`${T}/bankReq/r2`).update({ status: 'approved', by: 'off', byName: 'Off', decT: serverTimestamp() })); });
  it('an officer cannot change the amount while approving', async () => { await withHq(); await pending(); await assertFails(pw('off').doc(`${T}/bankReq/r2`).update({ status: 'approved', by: 'off', amt: 4000 })); });
  it('the requester can cancel', async () => { await withHq(); await pending(); await assertSucceeds(pw('mem').doc(`${T}/bankReq/r2`).update({ status: 'cancelled' })); });
  it('cannot mark paid without paying', async () => { await withHq(); await seed(db => db.doc(`${T}/bankReq/r2`).set({ uid: 'mem', name: 'Kay', res: 'scrap', amt: 40, why: '', status: 'approved', t: Timestamp.now() }));
    await assertFails(pw('mem').doc(`${T}/bankReq/r2`).update({ status: 'paid', paidT: serverTimestamp() })); });
});

describe('territory region stamps + version flag', () => {
  const hex = () => seed(db => db.doc(`${T}/territory/5_5`).set({ by: 'Pope', uid: 'lead', t: 1, ai: false }));
  it('anyone can add only rg + al to a hex', async () => { await hex(); await assertSucceeds(pw('mem').doc(`${T}/territory/5_5`).set({ rg: '190_-334', al: 'crew12i' }, { merge: true })); });
  it('cannot take a teammate\'s hex while stamping', async () => { await hex(); await assertFails(pw('mem').doc(`${T}/territory/5_5`).set({ rg: '190_-334', al: 'crew12i', uid: 'mem' }, { merge: true })); });
  it('own claims may carry rg + al', () => assertSucceeds(pw('mem').doc(`${T}/territory/6_6`).set({ by: 'Kay', uid: 'mem', t: 2, ai: false, rg: '190_-334', al: 'crew12i' })));
  it('terrv can be set to 2 once', async () => { await assertSucceeds(pw('mem').doc(`${T}/meta/terrv`).set({ v: 2, t: serverTimestamp(), by: 'mem' }));
    await assertFails(pw('mem').doc(`${T}/meta/terrv`).set({ v: 1 })); });
});

// ---------------- R6 ----------------
describe('R6 HQ building, Vault lock, officer cap', () => {
  const bld = (x = {}) => ({ built: true, lvl: 1, t: Date.now(), by: 'lead', ...x });
  it('an officer can build the HQ (bld)', async () => { await withHq(); await assertSucceeds(pw('off').doc(`${T}/meta/hq`).update({ bld: bld() })); });
  it('a member cannot build the HQ', async () => { await withHq(); await assertFails(pw('mem').doc(`${T}/meta/hq`).update({ bld: bld() })); });
  it('an officer still cannot change ranks along with bld', async () => { await withHq(); await assertFails(pw('off').doc(`${T}/meta/hq`).update({ bld: bld(), roles: { lead: 'leader', off: 'officer', mem: 'officer' } })); });
  it('the leader can name a 2nd officer (3 roles)', async () => { await withHq(); await assertSucceeds(pw('lead').doc(`${T}/meta/hq`).update({ roles: { lead: 'leader', off: 'officer', mem: 'officer' } })); });
  it('a 3rd officer is refused (4 roles)', async () => { await withHq({ roles: { lead: 'leader', off: 'officer', o2: 'officer' } }); await assertFails(pw('lead').doc(`${T}/meta/hq`).update({ roles: { lead: 'leader', off: 'officer', o2: 'officer', mem: 'officer' } })); });
  it('builds and upgrades pay from the Vault with bld in one transaction', async () => { await withHq();
    const db = pw('off'); await assertSucceeds(db.runTransaction(async tx => { tx.set(db.doc(`${T}/meta/alliance`), { bank: { scrap: 400, food: 100 } }, { merge: true }); tx.update(db.doc(`${T}/meta/hq`), { bld: bld() }); })); });
  const locked = (ms = 3600e3) => withHq({ bld: bld({ lockUntil: Date.now() + ms }) });
  it('a locked Vault: an officer cannot take anything out', async () => { await locked(); await assertFails(pw('off').doc(`${T}/meta/alliance`).set({ bank: { scrap: 460, food: 100 } }, { merge: true })); });
  it('a locked Vault: deposits still work', async () => { await locked(); await assertSucceeds(pw('mem').doc(`${T}/meta/alliance`).set({ bank: { scrap: 600, food: 100 } }, { merge: true })); });
  it('a locked Vault: a member cannot collect an approved request', async () => { await locked();
    await seed(db => db.doc(`${T}/bankReq/r1`).set({ uid: 'mem', name: 'Kay', res: 'scrap', amt: 40, why: '', status: 'approved', t: Timestamp.now(), by: 'off' }));
    const db = pw('mem'); const b = db.batch(); b.set(db.doc(`${T}/meta/alliance`), { bank: { scrap: 460, food: 100 }, payReq: 'r1' }, { merge: true });
    b.update(db.doc(`${T}/bankReq/r1`), { status: 'paid', paidT: serverTimestamp() }); await assertFails(b.commit()); });
  it('an expired lock no longer blocks', async () => { await withHq({ bld: bld({ lockUntil: Date.now() - 1000 }) }); await assertSucceeds(pw('off').doc(`${T}/meta/alliance`).set({ bank: { scrap: 460, food: 100 } }, { merge: true })); });
  it('the fall: 10% out of the Vault and the lock in one transaction', async () => { await withHq({ bld: bld() });
    const db = pw('off'); await assertSucceeds(db.runTransaction(async tx => { tx.set(db.doc(`${T}/meta/alliance`), { bank: { scrap: 450, food: 90 }, fall5: 'h:1' }, { merge: true });
      tx.update(db.doc(`${T}/meta/hq`), { bld: bld({ lockUntil: Date.now() + 24 * 3600e3, fallT: Date.now() }) }); })); });
  it('nobody can shorten a running lock (officer)', async () => { await locked(); await assertFails(pw('off').doc(`${T}/meta/hq`).update({ bld: bld({ lockUntil: 0 }) })); });
  it('nobody can shorten a running lock (leader)', async () => { await locked(); await assertFails(pw('lead').doc(`${T}/meta/hq`).update({ bld: bld({ lockUntil: 0 }) })); });
  it('titles still work while locked', async () => { await locked(); await assertSucceeds(pw('off').doc(`${T}/meta/hq`).update({ titles: { mem: 'Scout' } })); });
});
