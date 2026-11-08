// Import screen: a rejected create leaves the local character and returns to the choice.
const { chromium } = require('playwright');
require('./bindlog').bind('import-own');
let failed = 0;
const ok = (n, c, e) => { if (!c) failed++; console.log((c ? 'PASS ' : 'FAIL ') + n + (e != null ? ' ' + JSON.stringify(e) : '')); };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  await p.goto('http://127.0.0.1:8767/?local', { waitUntil: 'load' });
  await p.waitForFunction(() => typeof auth12Canonical === 'function' && typeof P !== 'undefined');
  await p.evaluate(() => {
    window.__impFail = true;
    window.__impNet = {
      uid: 'owner1108',
      team: (typeof NET !== 'undefined' && NET.team) || 'local',
      base: ['teams', 'pv-rathdrum-crew'],
      db: {},
      col(n) { return n; },
      async loadProfile() { return null; },
      fs: {
        doc(...a) { return { path: a.map(x => (x && x.path) || x).join('/') }; },
        async getDoc(ref) {
          if (String(ref.path || '').indexOf('meta/map') >= 0) return { exists: () => true, data: () => ({ fullEpoch: 50, epoch: 3 }) };
          return { exists: () => false, data: () => null };
        },
        async runTransaction(db, fn) {
          const tx = {
            async get() { return { exists: () => false, data: () => null }; },
            set(ref, data) {
              window.__impWrote = data;
              if (window.__impFail) { const e = new Error('Missing or insufficient permissions'); e.code = 'permission-denied'; throw e; }
            }
          };
          await fn(tx);
        }
      }
    };
  });
  const pending = p.evaluate(() => auth12Canonical(window.__impNet));
  await p.waitForSelector('#a12import', { state: 'visible' });
  await p.evaluate(() => { P.name = 'Grok Test1108'; P.res.scrap = 7; P.troops = P.troops || {}; P.troops.home = 0; save(); });
  await p.click('#a12import');
  await p.waitForSelector('#a12err', { state: 'visible' });
  const mid = await p.evaluate(() => ({
    scrap: P.res.scrap | 0,
    saved: JSON.parse(localStorage.getItem('wl_p') || '{}').res.scrap | 0,
    spin: document.getElementById('a12spin').hidden,
    choose: !document.getElementById('a12choose').hidden,
    err: document.getElementById('a12err').textContent,
    gate: !!document.getElementById('auth12'),
    wrote: window.__impWrote && window.__impWrote.fe
  }));
  ok('a rejected import shows the error and keeps the local character', mid.scrap === 7 && mid.saved === 7 && mid.spin && mid.choose && mid.gate && /not created/.test(mid.err) && mid.wrote === 50, mid);
  await p.evaluate(() => { window.__impFail = false; });
  await p.click('#a12import');
  await pending;
  const done = await p.evaluate(() => ({
    scrap: P.res.scrap | 0,
    fe: P.fullEpoch,
    gate: !!document.getElementById('auth12'),
    locked: !!G.playLocked,
    docFe: window.__impWrote && window.__impWrote.fe,
    name: JSON.parse(window.__impWrote.data).name
  }));
  ok('the next chosen import writes the map epoch and loads', done.scrap === 7 && done.fe === 50 && done.docFe === 50 && done.name === 'Grok Test1108' && !done.gate && !done.locked, done);
  await b.close();
  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
