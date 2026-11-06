// Real Firestore rules emulator. Project id is demo- only. No production host.
const {initializeTestEnvironment, assertFails, assertSucceeds} = require('@firebase/rules-unit-testing');
const {doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, collection, getDocs} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');
const TEAM = 'pv-rathdrum-crew';
const base = `teams/${TEAM}`;

let fail = 0;
function ok(c, m){ if(!c){ console.error('FAIL', m); fail++; } else console.log('ok', m); }

async function seed(env, writes){
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for(const [p, data] of writes) await setDoc(doc(db, p), data);
  });
}

(async () => {
  const rules = fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8');
  const env = await initializeTestEnvironment({
    projectId: 'demo-dead-zone-drive',
    firestore: {rules, host: '127.0.0.1', port: 8080}
  });
  const alice = env.authenticatedContext('alice').firestore();
  const bob = env.authenticatedContext('bob').firestore();
  const carol = env.authenticatedContext('carol').firestore();
  const admin = env.authenticatedContext('admin').firestore();

  await seed(env, [
    [`${base}/meta/admins`, {uids: ['admin']}],
    [`${base}/meta/map`, {epoch: 1, fullEpoch: 0}],
    [`${base}/meta/alliance`, {bank: {scrap: 100, food: 0, water: 0, fuel: 0, parts: 0}, acct24: {qatest: {name: 'QA-Test', uids: ['alice', 'bob'], h: 'hash', s: 'salt'}}}]
  ]);

  try {
    await assertSucceeds(setDoc(doc(alice, `${base}/clock/alice`), {t: serverTimestamp()}));
    ok(true, 'owner clock probe is allowed');
  } catch(e){ ok(false, 'owner clock probe is allowed '+e.message); }
  try {
    await assertFails(setDoc(doc(alice, `${base}/clock/bob`), {t: serverTimestamp()}));
    ok(true, 'writing someone else\'s clock is denied');
  } catch(e){ ok(false, 'writing someone else\'s clock is denied '+e.message); }

  try {
    await assertSucceeds(setDoc(doc(alice, `${base}/marches/short`), {uid: 'alice', state: 'out', dur: 1000, startT: serverTimestamp()}));
    ok(false, 'a 1s march must be denied');
  } catch(e){ ok(true, 'a 1s march is denied'); }
  try {
    await assertSucceeds(setDoc(doc(alice, `${base}/marches/ok`), {uid: 'alice', state: 'out', dur: 120000, startT: serverTimestamp(), from: '0_0', to: '3_0'}));
    ok(true, 'a 120s march create is allowed');
  } catch(e){ ok(false, 'a 120s march create is allowed '+e.message); }

  const old = Timestamp.fromMillis(Date.now() - 400000);
  await seed(env, [[`${base}/marches/due`, {uid: 'alice', state: 'out', dur: 120000, startT: old, from: '0_0', to: '3_0'}]]);
  try {
    await assertSucceeds(updateDoc(doc(alice, `${base}/marches/due`), {state: 'arrived', result: 'Claimed 3 hexes.'}));
    ok(true, 'owner may mark a due march arrived');
  } catch(e){ ok(false, 'owner may mark a due march arrived '+e.message); }
  try {
    await assertSucceeds(updateDoc(doc(alice, `${base}/marches/due`), {result: 'Skipped 1 (an ally holds it).'}));
    ok(true, 'owner may add the skip line without a second resolve');
  } catch(e){ ok(false, 'owner may add the skip line without a second resolve '+e.message); }
  try {
    await assertSucceeds(updateDoc(doc(alice, `${base}/marches/due`), {state: 'done', paid: true, paidBy: 'alice'}));
    ok(true, 'owner may finish the return after both legs');
  } catch(e){ ok(false, 'owner may finish the return after both legs '+e.message); }

  try {
    await assertFails(updateDoc(doc(bob, `${base}/meta/map`), {epoch: 2, fullEpoch: Date.now()}));
    ok(true, 'a normal member cannot raise the reset');
  } catch(e){ ok(false, 'a normal member cannot raise the reset '+e.message); }
  try {
    await assertSucceeds(updateDoc(doc(admin, `${base}/meta/map`), {epoch: 2}));
    ok(true, 'the console-listed admin can raise epoch');
  } catch(e){ ok(false, 'the console-listed admin can raise epoch '+e.message); }
  try {
    await assertFails(setDoc(doc(bob, `${base}/meta/admins`), {uids: ['bob']}));
    ok(true, 'a player cannot grant themselves admin');
  } catch(e){ ok(false, 'a player cannot grant themselves admin '+e.message); }

  try {
    await assertFails(deleteDoc(doc(bob, `${base}/saves/alice`)));
    ok(true, 'a pv- teammate cannot delete another save');
  } catch(e){ ok(false, 'a pv- teammate cannot delete another save '+e.message); }

  try {
    await assertSucceeds(setDoc(doc(alice, `${base}/meta/alliance`), {bank: {scrap: 40, food: 0, water: 0, fuel: 0, parts: 0}}, {merge: true}));
    ok(true, 'a member may withdraw from the shared bank');
  } catch(e){ ok(false, 'a member may withdraw from the shared bank '+e.message); }
  try {
    await assertFails(setDoc(doc(alice, `${base}/meta/alliance`), {bank: {scrap: -1, food: 0, water: 0, fuel: 0, parts: 0}}, {merge: true}));
    ok(true, 'a negative bank is denied');
  } catch(e){ ok(false, 'a negative bank is denied '+e.message); }
  try {
    await assertFails(setDoc(doc(alice, `${base}/meta/alliance`), {fullEpoch: 9}, {merge: true}));
    ok(true, 'the bank doc cannot carry a reset field');
  } catch(e){ ok(false, 'the bank doc cannot carry a reset field '+e.message); }

  await seed(env, [[`${base}/saves/alice`, {data: '{"name":"QA-Test","lvl":1,"res":{"scrap":1}}', rev: 2, savedAt: 1, name: 'QA-Test', lvl: 1, fe: 0, acct: 'qatest'}]]);
  try {
    await assertSucceeds(getDoc(doc(alice, `${base}/saves/alice`)));
    ok(true, 'a player can read their own save');
  } catch(e){ ok(false, 'a player can read their own save '+e.message); }
  try {
    await assertSucceeds(getDoc(doc(bob, `${base}/saves/alice`)));
    ok(true, 'a linked device can read that save');
  } catch(e){ ok(false, 'a linked device can read that save '+e.message); }
  try {
    await assertFails(getDoc(doc(carol, `${base}/saves/alice`)));
    ok(true, 'an unlinked teammate cannot read the save');
  } catch(e){ ok(false, 'an unlinked teammate cannot read the save '+e.message); }
  try {
    await assertFails(getDocs(collection(alice, `${base}/saves`)));
    ok(true, 'nobody can list every save');
  } catch(e){ ok(false, 'nobody can list every save '+e.message); }

  const ends = Date.now() + 3600000;
  await seed(env, [[`${base}/raids/boss`, {hp: 4000, maxHp: 4000, endsAt: ends, bossId: 'boss_crystal'}]]);
  try {
    await assertFails(updateDoc(doc(alice, `${base}/raids/boss`), {hp: 0, done: true, won: true}));
    ok(true, 'one 4000 HP drop is denied');
  } catch(e){ ok(false, 'one 4000 HP drop is denied '+e.message); }
  try {
    await assertSucceeds(updateDoc(doc(alice, `${base}/raids/boss`), {hp: 2500}));
    await assertSucceeds(updateDoc(doc(alice, `${base}/raids/boss`), {hp: 1000}));
    await assertSucceeds(updateDoc(doc(alice, `${base}/raids/boss`), {hp: 0, done: true, won: true}));
    ok(true, 'the same 4000 HP boss falls in 1500 HP steps');
  } catch(e){ ok(false, 'the same 4000 HP boss falls in 1500 HP steps '+e.message); }

  try {
    await assertSucceeds(setDoc(doc(alice, `${base}/meta/horde`), {last: 1, fx: '{}'}));
    await assertFails(updateDoc(doc(bob, `${base}/meta/horde`), {last: 1, fx: '{}'}));
    await assertSucceeds(updateDoc(doc(bob, `${base}/meta/horde`), {last: 2, fx: '{"v":2}'}));
    ok(true, 'horde accepts a newer tick and rejects a repeat');
  } catch(e){ ok(false, 'horde accepts a newer tick and rejects a repeat '+e.message); }

  try {
    await assertSucceeds(setDoc(doc(alice, `${base}/territory/1_0`), {by: 'QA', uid: 'alice', color: '#fff', t: Date.now()}));
    await assertFails(setDoc(doc(bob, `${base}/territory/1_0`), {by: 'Bob', uid: 'bob', color: '#000', t: Date.now()}));
    ok(true, 'a player can claim their hex and cannot take an ally hex');
  } catch(e){ ok(false, 'a player can claim their hex and cannot take an ally hex '+e.message); }

  await env.cleanup();
  console.log(fail ? fail+' failed' : 'all passed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
