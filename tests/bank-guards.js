// Narrow save guards around one bank collect. Fake Firebase only.
const { chromium } = require('playwright');
const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const H = require('./two-device/two.js');
let commit = '';
try { commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch (e) {}
function sha(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
}
const manifest = walk('public').sort().map(p => sha(p) + '  ' + p.replace(/\\/g, '/'));
const publicDigest = crypto.createHash('sha256').update(manifest.join('\n') + '\n').digest('hex');
console.log('BIND ' + JSON.stringify({
  test: 'bank-guards', commit, publicDigest, publicFiles: manifest.length,
  rulesHash: { rules12g: sha('rules/preview-auth-rules-12g.rules'), rules12i: sha('rules/preview-auth-rules-12i.rules') },
  emulatorInputDigest: sha('tests/two-device/server.js'),
  command: 'node tests/bank-guards.js',
  page: 'http://127.0.0.1:' + (process.env.PORT || 8767) + '/',
}));
let failed = 0;
const ok = (n, c, e) => { if (!c) failed++; console.log((c ? 'PASS ' : 'FAIL ') + n + (e != null ? ' ' + JSON.stringify(e) : '')); };
const GAME = 'http://127.0.0.1:' + (process.env.PORT || 8767) + '/';
const prof = doc => { try { return JSON.parse(doc.data.data); } catch (e) { return {}; } };
async function putWrites(writes) {
  const r = await fetch(H.FB + '/commit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ writes }) });
  if (!r.ok) throw new Error('commit ' + r.status);
}
(async () => {
  await fetch(H.FB + '/reset', { method: 'POST' });
  const b = await chromium.launch();
  const a = await H.device(b, 'phone', GAME);
  await H.onboard(a, 'Pope');
  await H.signIn(a, 'pope-guard@example.test', 'secret123', 'up');
  await H.choose(a, 'fresh');
  await H.ready(a);
  const k = await H.device(b, 'pc', GAME);
  await H.onboard(k, 'Kay');
  await H.signIn(k, 'kay-guard@example.test', 'secret123', 'up');
  await H.choose(k, 'fresh');
  await H.ready(k);
  await a.evaluate(async () => { await claimLeader15(); });
  await k.waitForTimeout(1000);
  await a.evaluate(async () => { P.res.scrap = 1000; G.bankMode = 'deposit'; await bankTx('scrap', 500); });
  await k.waitForTimeout(1000);
  await k.evaluate(async () => { G.bankMode = 'withdraw'; await bankTx('scrap', 40); });
  await a.waitForTimeout(1000);
  const info = await k.evaluate(() => ({ uid: NET.uid, rev: SYNC13.rev | 0, dev: SYNC13.dev }));
  const pend = await a.evaluate(() => Object.values(G.bankReq15).filter(r => r.status === 'pending').map(r => r.id));
  const savePath = 'teams/testcrew/saves/' + info.uid;
  await putWrites([{ op: 'set', path: savePath, merge: true, data: { lease: { dev: 'other-tab', label: 'computer', t: Date.now() } } }]);
  await k.waitForTimeout(400);
  await a.evaluate(async (id) => { await decideReq15(id, true); }, pend[0]);
  await k.waitForTimeout(1500);
  let dump = await (await fetch(H.FB + '/dump')).json();
  let save = dump.docs[savePath];
  let bank = dump.docs['teams/testcrew/meta/alliance'].data.bank.scrap;
  let status = (dump.docs['teams/testcrew/bankReq/' + pend[0]] || {}).data;
  ok('an active lease on the other tab does not debit or mark paid', bank === 500 && status && status.status === 'approved' && save.data.lease.dev === 'other-tab', { bank, status: status && status.status, lease: save.data.lease.dev });

  await k.evaluate(() => { if (SYNC13.unsub) SYNC13.unsub(); SYNC13.on = false; });
  const newer = JSON.stringify({ name: 'Kay', res: { scrap: 99, food: 12 } });
  await putWrites([{ op: 'set', path: savePath, merge: true, data: { rev: info.rev + 1, baseRev: info.rev, data: newer, lease: { dev: info.dev, label: 'phone', t: Date.now() } } }]);
  await k.evaluate((id) => collect15(id), pend[0]);
  dump = await (await fetch(H.FB + '/dump')).json();
  save = dump.docs[savePath];
  bank = dump.docs['teams/testcrew/meta/alliance'].data.bank.scrap;
  status = dump.docs['teams/testcrew/bankReq/' + pend[0]].data;
  const body = prof(save);
  const staleRejected = bank === 500 && status.status === 'approved' && body.res.scrap === 99 && body.res.food === 12 && (save.data.rev | 0) === info.rev + 1;
  ok('a stale local profile does not debit when the durable save is newer', staleRejected, { bank, status: status.status, scrap: body.res && body.res.scrap, food: body.res && body.res.food, rev: save.data.rev, held: info.rev });

  await k.evaluate(() => { P.res.parts = 4; save(); });
  await k.evaluate((id) => collect15(id), pend[0]);
  await k.waitForTimeout(600);
  dump = await (await fetch(H.FB + '/dump')).json();
  save = dump.docs[savePath];
  bank = dump.docs['teams/testcrew/meta/alliance'].data.bank.scrap;
  status = dump.docs['teams/testcrew/bankReq/' + pend[0]].data;
  const paid = prof(save);
  ok('the retry commits the credit once and keeps the newer save plus unsent progress', bank === 460 && status.status === 'paid' && paid.res.scrap === 139 && paid.res.food === 12 && paid.res.parts === 4, { bank, status: status.status, res: paid.res, rev: save.data.rev });
  const twice = await k.evaluate(async (id) => { const s = P.res.scrap || 0; const r = G.bankReq15[id]; if (r) r.status = 'approved'; await collect15(id); return { scrap: P.res.scrap || 0, started: s }; }, pend[0]);
  dump = await (await fetch(H.FB + '/dump')).json();
  ok('a second retry does not debit or credit again', twice.scrap === 139 && dump.docs['teams/testcrew/meta/alliance'].data.bank.scrap === 460 && prof(dump.docs[savePath]).res.scrap === 139, twice);
  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  await b.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
