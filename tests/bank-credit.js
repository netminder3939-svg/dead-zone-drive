// Cut the collector after the bank transaction commits and before the local apply.
// The character save itself must already hold the credit. Fake Firebase only.
const { chromium } = require('playwright');
const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');
const H = require('./two-device/two.js');
const path = require('path');
let commit = '';
try { commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch (e) {}
function sha(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
const manifest = walk('public').sort().map(p => sha(p) + '  ' + p.replace(/\\/g, '/'));
const publicDigest = crypto.createHash('sha256').update(manifest.join('\n') + '\n').digest('hex');
console.log('BIND ' + JSON.stringify({
  test: 'bank-credit',
  commit,
  publicDigest,
  publicFiles: manifest.length,
  rulesHash: { rules12g: sha('rules/preview-auth-rules-12g.rules'), rules12i: sha('rules/preview-auth-rules-12i.rules') },
  emulatorInputDigest: sha('tests/two-device/server.js'),
  command: 'node tests/bank-credit.js',
  page: 'http://127.0.0.1:' + (process.env.PORT || 8767) + '/',
}));
let failed = 0;
const ok = (n, c, e) => { if (!c) failed++; console.log((c ? 'PASS ' : 'FAIL ') + n + (e != null ? ' ' + JSON.stringify(e) : '')); };
const GAME = 'http://127.0.0.1:' + (process.env.PORT || 8767) + '/';
function scrapOf(doc) { try { return JSON.parse(doc.data.data).res.scrap; } catch (e) { return null; } }
function foodOf(doc) { try { return JSON.parse(doc.data.data).res.food; } catch (e) { return null; } }
(async () => {
  await fetch(H.FB + '/reset', { method: 'POST' });
  const b = await chromium.launch();
  const a = await H.device(b, 'phone', GAME);
  await H.onboard(a, 'Pope');
  await H.signIn(a, 'pope-credit@example.test', 'secret123', 'up');
  await H.choose(a, 'fresh');
  await H.ready(a);
  const k = await H.device(b, 'pc', GAME);
  await H.onboard(k, 'Kay');
  await H.signIn(k, 'kay-credit@example.test', 'secret123', 'up');
  await H.choose(k, 'fresh');
  await H.ready(k);
  await a.evaluate(async () => { await claimLeader15(); });
  await k.waitForTimeout(1200);
  await a.evaluate(async () => { P.res.scrap = 1000; G.bankMode = 'deposit'; await bankTx('scrap', 500); });
  await k.waitForTimeout(1200);
  const member = await k.evaluate(async () => {
    G.bankMode = 'withdraw';
    await bankTx('scrap', 40);
    return myRank15();
  });
  await a.waitForTimeout(1200);
  const pend = await a.evaluate(() => Object.values(G.bankReq15).filter(r => r.status === 'pending').map(r => r.id));
  const denied = await k.evaluate(async (id) => { await decideReq15(id, true); return (G.bankReq15[id] || {}).status; }, pend[0]);
  ok('a member still cannot approve', member === 'member' && denied === 'pending', { member, denied });
  await k.evaluate(() => { P.res.scrap = 3; P.res.food = 7; save(); });
  await k.evaluate(() => {
    const orig = NET.fs.runTransaction.bind(NET.fs);
    NET.fs.runTransaction = async (db, fn) => {
      let paid = false;
      const wrapped = async (tx) => {
        const update = tx.update.bind(tx);
        tx.update = (ref, data) => { if (data && data.status === 'paid') paid = true; return update(ref, data); };
        return fn(tx);
      };
      const out = await orig(db, wrapped);
      if (paid) { if (window.SYNC13) SYNC13.on = false; throw new Error('cut after commit'); }
      return out;
    };
  });
  await a.evaluate(async (id) => { await decideReq15(id, true); }, pend[0]);
  await k.waitForFunction(() => Object.values(G.bankReq15).some(r => r.status === 'paid' || r.status === 'approved'), null, { timeout: 8000 }).catch(() => {});
  await k.waitForTimeout(1500);
  const uid = await k.evaluate(() => NET.uid);
  const mid = await (await fetch(H.FB + '/dump')).json();
  const saveMid = mid.docs['teams/testcrew/saves/' + uid];
  const bankMid = (mid.docs['teams/testcrew/meta/alliance'] || {}).data;
  const reqMid = Object.values(mid.docs).filter(v => v.data && v.data.status && v.data.amt === 40).map(v => v.data.status);
  ok('the cut leaves the credit in the acknowledged save, not only in memory', scrapOf(saveMid) === 43 && foodOf(saveMid) === 7 && bankMid.bank.scrap === 460 && reqMid.includes('paid'), { scrap: scrapOf(saveMid), food: foodOf(saveMid), bank: bankMid && bankMid.bank, req: reqMid });
  const back = await H.device(b, 'phone', GAME);
  await H.onboard(back, 'Kay');
  await H.signIn(back, 'kay-credit@example.test', 'secret123', 'in');
  await H.ready(back);
  await back.waitForTimeout(1500);
  const loaded = await back.evaluate(() => ({ scrap: P.res.scrap || 0, food: P.res.food || 0 }));
  ok('reload recovers that same credit once', loaded.scrap === 43 && loaded.food === 7, loaded);
  const again = await back.evaluate(async () => {
    const r = Object.values(G.bankReq15).find(x => x.amt === 40);
    if (r) r.status = 'approved';
    const s = P.res.scrap || 0;
    await collect15(r.id);
    return { scrap: P.res.scrap || 0, started: s };
  });
  await back.waitForTimeout(800);
  const end = await (await fetch(H.FB + '/dump')).json();
  const saveEnd = end.docs['teams/testcrew/saves/' + uid];
  const bankEnd = end.docs['teams/testcrew/meta/alliance'].data.bank.scrap;
  ok('a retry does not pay or credit a second time', again.scrap === 43 && scrapOf(saveEnd) === 43 && bankEnd === 460, { again, saved: scrapOf(saveEnd), bankEnd });
  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  await b.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
