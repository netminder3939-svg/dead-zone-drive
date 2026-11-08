// Local emulator runner for the 12i rules. No cloud project is contacted.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { serverTimestamp, Timestamp } from 'firebase/firestore';

const root = { before: [], after: [], beforeEach: [] };
const suites = [];
let suite = null;
globalThis.describe = (name, fn) => {
  const s = { name, tests: [] };
  suites.push(s);
  const prev = suite;
  suite = s;
  fn();
  suite = prev;
};
globalThis.it = (name, fn) => suite.tests.push({ name, fn });
globalThis.before = fn => root.before.push(fn);
globalThis.after = fn => root.after.push(fn);
globalThis.beforeEach = fn => root.beforeEach.push(fn);

await import('./rules-12i.test.mjs');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra != null ? ' ' + JSON.stringify(extra) : ''));
};

for (const fn of root.before) await fn();
try {
  for (const s of suites) {
    for (const t of s.tests) {
      for (const fn of root.beforeEach) await fn();
      try {
        await t.fn();
        ok(s.name + ': ' + t.name, true);
      } catch (e) {
        ok(s.name + ': ' + t.name, false, String(e && e.message || e).slice(0, 300));
      }
    }
  }
} finally {
  for (const fn of root.after) await fn();
}

const rules12i = readFileSync('rules/preview-auth-rules-12i.rules', 'utf8');
const rules12g = readFileSync('rules/preview-auth-rules-12g.rules', 'utf8');
const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8098';
const [h, p] = host.split(':');
const firestore = { host: h, port: Number(p), rules: rules12i };

const extra = await initializeTestEnvironment({ projectId: 'demo-dzd-12i-extra', firestore });
const pw = uid => extra.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore();
const anon = () => extra.unauthenticatedContext().firestore();
try {
  await assertFails(anon().doc('teams/crew12i/players/lead').get());
  ok('no-auth cannot read a player doc', true);
} catch (e) { ok('no-auth cannot read a player doc', false, String(e.message || e).slice(0, 200)); }
try {
  await assertSucceeds(pw('lead').doc('teams/crew12i/players/lead').set({ name: 'Pope', g26: { t: 1.4 }, p14: 1400, lastActive: Timestamp.now() }));
  ok('owner can store decimal g26.t and integer p14', true);
} catch (e) { ok('owner can store decimal g26.t and integer p14', false, String(e.message || e).slice(0, 200)); }
try {
  await assertFails(pw('lead').doc('teams/crew12i/players/lead').update({ lat: 47.8, lng: -116.8 }));
  ok('owner cannot add top-level lat/lng', true);
} catch (e) { ok('owner cannot add top-level lat/lng', false, String(e.message || e).slice(0, 200)); }
try {
  await assertFails(pw('other').doc('teams/crew12i/players/lead').update({ p14: 1 }));
  ok('another account cannot write this player doc', true);
} catch (e) { ok('another account cannot write this player doc', false, String(e.message || e).slice(0, 200)); }
try {
  await assertFails(pw('mem').doc('teams/crew12i/meta/terrv').set({ v: 3, t: serverTimestamp(), by: 'mem' }));
  ok('terrv cannot be created at any version other than 2', true);
} catch (e) { ok('terrv cannot be created at any version other than 2', false, String(e.message || e).slice(0, 200)); }
await extra.cleanup();

const old = await initializeTestEnvironment({ projectId: 'demo-dzd-12g-rules', firestore: { host: h, port: Number(p), rules: rules12g } });
const oldPw = uid => old.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore();
try {
  await old.withSecurityRulesDisabled(async c => { await c.firestore().doc('teams/rathdrum-crew/meta/alliance').set({ bank: { scrap: 500, food: 100 } }); });
  await assertSucceeds(oldPw('mem').doc('teams/rathdrum-crew/meta/alliance').set({ bank: { scrap: 400, food: 100 } }, { merge: true }));
  ok('published 12g rules still let any member withdraw from the bank', true);
} catch (e) { ok('published 12g rules still let any member withdraw from the bank', false, String(e.message || e).slice(0, 240)); }
try {
  await assertFails(oldPw('mem').doc('teams/rathdrum-crew/meta/terrv').set({ v: 2, t: serverTimestamp(), by: 'mem' }));
  ok('published 12g rules deny creating meta/terrv', true);
} catch (e) { ok('published 12g rules deny creating meta/terrv', false, String(e.message || e).slice(0, 240)); }
try {
  await assertFails(oldPw('mem').doc('teams/rathdrum-crew/meta/hq').set({ leader: 'mem', roles: { mem: 'leader' }, titles: {}, hq: null }));
  ok('published 12g rules deny creating meta/hq', true);
} catch (e) { ok('published 12g rules deny creating meta/hq', false, String(e.message || e).slice(0, 240)); }
await old.cleanup();

console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
process.exit(failed ? 1 : 0);
