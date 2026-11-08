// Local fake Firebase only. No live project. Seeds hex docs, then runs the real terr15 client.
const { chromium } = require('playwright');
const H = require('./two-device/two.js');
require('./bindlog').bind('stamp15', { fake: H.FB, port: process.env.PORT || '8767' });
let failed = 0;
const ok = (n, c, e) => { if (!c) failed++; console.log((c ? 'PASS ' : 'FAIL ') + n + (e != null ? ' ' + JSON.stringify(e) : '')); };
const GAME = 'http://127.0.0.1:' + (process.env.PORT || 8767) + '/';
const FB = H.FB;
async function dump() { return (await fetch(FB + '/dump')).json(); }
function terrOf(docs) { return Object.entries(docs).filter(([p]) => p.startsWith('teams/testcrew/territory/')); }
async function seed(n) {
  await fetch(FB + '/reset', { method: 'POST' });
  const writes = [];
  for (let i = 0; i < n; i++) {
    const q = (i % 31) - 15, r = Math.floor(i / 31) - 15;
    writes.push({ op: 'set', path: 'teams/testcrew/territory/' + q + '_' + r, data: { by: 'Keeper', uid: 'owner-keep', t: 5000 + i, color: '#123456', marker: i } });
  }
  const r = await fetch(FB + '/commit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ writes }) });
  if (!r.ok) throw new Error('seed ' + r.status);
  return writes.map(w => w.path);
}
async function open(browser, name, failStamp) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, geolocation: { latitude: 47.7796, longitude: -116.8923 }, permissions: ['geolocation'] });
  await ctx.route(/gstatic\.com\/firebasejs\/[^/]+\/firebase-(app|auth|firestore)\.js/, route => {
    const m = route.request().url().match(/firebase-(app|auth|firestore)\.js/)[1];
    route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: `export * from '${FB}/fake-${m}.js';` });
  });
  await ctx.route(/googleapis|identitytoolkit|tile|openstreetmap|overpass|arcgis|carto/, route => route.abort());
  if (failStamp) {
    await ctx.route(FB + '/commit', async route => {
      const body = JSON.parse(route.request().postData() || '{}');
      const hit = (body.writes || []).some(w => failStamp(w));
      if (hit) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'injected' }) });
      return route.continue();
    });
  }
  const p = await ctx.newPage();
  await p.goto(GAME, { waitUntil: 'load' });
  await H.onboard(p, name);
  await H.signIn(p, name.toLowerCase() + '@fixture.test', 'secret123', 'up');
  await H.choose(p, 'fresh');
  await H.ready(p);
  return p;
}
function seededRows(docs, paths) {
  const want = new Set(paths);
  return terrOf(docs).filter(([p]) => want.has(p));
}
(async () => {
  const b = await chromium.launch();
  const paths = await seed(450);
  const page = await open(b, 'Stamp');
  let premature = false;
  const deadline = Date.now() + 90000;
  let seen = {};
  while (Date.now() < deadline) {
    const d = await dump();
    const rows = seededRows(d.docs, paths);
    const missing = rows.filter(([, v]) => !v.data.rg);
    const tv = d.docs['teams/testcrew/meta/terrv'];
    seen = { stamped: rows.length - missing.length, missing: missing.length, terrv: !!(tv && tv.data.v === 2), rows: rows.length };
    if (seen.terrv && missing.length) premature = true;
    if (seen.terrv && rows.length >= 450 && !missing.length) break;
    await page.waitForTimeout(300);
  }
  const finalRows = seededRows((await dump()).docs, paths);
  const bad = finalRows.filter(([, v]) => v.data.uid !== 'owner-keep' || v.data.by !== 'Keeper' || v.data.color !== '#123456' || typeof v.data.marker !== 'number' || !v.data.rg || v.data.al !== 'testcrew');
  ok('more than 400 docs finish stamped without a premature terrv', !premature && seen.terrv && seen.missing === 0 && seen.rows >= 450, seen);
  ok('stamp keeps owner, progress, and the other fields', bad.length === 0, { bad: bad.slice(0, 2).map(([, v]) => v.data) });
  await page.context().close();

  let holdFail = true;
  const paths2 = await seed(12);
  const failPaths = new Set(paths2.slice(0, 3));
  const p2 = await open(b, 'Retry', w => holdFail && !!(w && w.data && w.data.rg && failPaths.has(w.path || '')));
  await p2.waitForTimeout(3000);
  const mid = await dump();
  const rows2 = seededRows(mid.docs, paths2);
  const failedIds = rows2.filter(([, v]) => !v.data.rg);
  ok('a partial stamp failure does not publish terrv', !mid.docs['teams/testcrew/meta/terrv'] && failedIds.length === 3 && rows2.some(([, v]) => v.data.rg), { failed: failedIds.length, stamped: rows2.filter(([, v]) => v.data.rg).length });
  ok('failed docs keep their original owner fields', failedIds.every(([, v]) => v.data.uid === 'owner-keep' && v.data.by === 'Keeper' && v.data.color === '#123456'));
  holdFail = false;
  await p2.reload({ waitUntil: 'load' });
  await H.onboard(p2, 'Retry');
  await H.ready(p2);
  let retried = false;
  for (let t = 0; t < 40 && !retried; t++) {
    const d = await dump();
    const left = seededRows(d.docs, paths2).filter(([, v]) => !v.data.rg);
    const tv = d.docs['teams/testcrew/meta/terrv'];
    if (tv && tv.data.v === 2 && !left.length) retried = true;
    else await p2.waitForTimeout(300);
  }
  ok('clearing the fault lets the same client finish and publish terrv', retried);
  await p2.context().close();

  let dropHold = true;
  const paths3 = await seed(20);
  const p3 = await open(b, 'Drop', w => dropHold && !!(w && w.data && w.data.rg && String(w.path || '').includes('/territory/')));
  await p3.waitForTimeout(2500);
  const dropped = await dump();
  ok('an interrupted stamp does not publish terrv', !dropped.docs['teams/testcrew/meta/terrv'] && seededRows(dropped.docs, paths3).some(([, v]) => !v.data.rg), { stamped: seededRows(dropped.docs, paths3).filter(([, v]) => v.data.rg).length });
  dropHold = false;
  await p3.reload({ waitUntil: 'load' });
  await H.onboard(p3, 'Drop');
  await H.ready(p3);
  let resumed = false;
  for (let t = 0; t < 40 && !resumed; t++) {
    const d = await dump();
    const left = seededRows(d.docs, paths3).filter(([, v]) => !v.data.rg);
    const tv = d.docs['teams/testcrew/meta/terrv'];
    if (tv && tv.data.v === 2 && !left.length) resumed = true;
    else await p3.waitForTimeout(300);
  }
  ok('reconnect finishes the remaining stamps before terrv', resumed);
  await p3.context().close();

  const paths4 = await seed(30);
  const a = await open(b, 'TabA');
  const c = await open(b, 'TabB');
  await a.waitForTimeout(5000);
  const both = await dump();
  const rowsB = seededRows(both.docs, paths4);
  const clobber = rowsB.filter(([, v]) => v.data.uid !== 'owner-keep' || v.data.by !== 'Keeper' || typeof v.data.marker !== 'number' || !v.data.rg || v.data.al !== 'testcrew');
  ok('two tabs stamp the same docs without changing ownership', clobber.length === 0 && both.docs['teams/testcrew/meta/terrv'] && both.docs['teams/testcrew/meta/terrv'].data.v === 2 && rowsB.length === 30, { n: rowsB.length, clobber: clobber.length });
  const uid = await a.evaluate(() => P.uid);
  const claimed = await a.evaluate(async () => {
    const id = (G.pos ? hexAt(...G.pos).id : '8_8');
    try { refresh15(); } catch (e) {}
    await NET.claimHex(id, { by: P.name, uid: P.uid, t: Date.now(), ai: false });
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const row = (TERR15.merged && TERR15.merged[id]) || (G.terr && G.terr[id]);
      if (row && row.rg) return { mode: TERR15.mode, rg: row.rg, al: row.al, uid: row.uid };
      await new Promise(r => setTimeout(r, 200));
    }
    return { mode: TERR15 && TERR15.mode, id, rg: (typeof cellOfHex15==='function'?cellOfHex15(id):''), cells: Object.keys(TERR15.cells||{}), merged: Object.keys(TERR15.merged||{}).slice(0,8) };
  });
  ok('a new claim after the listener switch stays visible', claimed.mode === 'region' && claimed.uid === uid && !!claimed.rg && claimed.al === 'testcrew', claimed);
  await b.close();
  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
