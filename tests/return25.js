// Return-to-home on the 12g crew map. Local page only. No Firebase, no account.
const { chromium } = require('playwright');
const HOME = { latitude: 47.8135, longitude: -116.8968, accuracy: 8 };
const BONNERS = { latitude: 48.6917, longitude: -116.3165, accuracy: 8 };
const CLOSE = { latitude: 47.82, longitude: -116.8968, accuracy: 8 }; // ~0.72 km north, inside 40 km
let failed = 0;
const ok = (name, cond, extra) => {
  const pass = !!cond;
  if (!pass) failed++;
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (extra != null ? ' ' + JSON.stringify(extra) : ''));
};

async function boot(context, page, seed) {
  if (seed) await context.addInitScript(s => { if (!sessionStorage.getItem('dzdSeed')) { localStorage.setItem('wl_p', s); sessionStorage.setItem('dzdSeed', '1'); } }, seed);
  await context.addInitScript(() => localStorage.setItem('wl_team', 'rathdrum-crew'));
  await page.goto('http://127.0.0.1:8767/?local', { waitUntil: 'load' });
  const named = seed && seed.includes('"name"');
  if (!named) {
    await page.fill('#obName', 'Diag');
    await page.fill('#obTeam', 'rathdrum-crew');
    await page.click('#obGo');
  }
  await page.waitForFunction(() => { const t = (document.getElementById('gpschip') || {}).textContent || ''; return /GPS ±|Weak GPS|Dev position|Location blocked/.test(t); }, null, { timeout: 20000 });
  await page.evaluate(() => {
    window.__cloud = 0; window.__notes = 0;
    const cs = cloudSave; cloudSave = function () { window.__cloud++; return cs.apply(this, arguments); };
    if (typeof SYNC26 !== 'undefined' && SYNC26.notePlay) { const n = SYNC26.notePlay; SYNC26.notePlay = function () { window.__notes++; return n.apply(this, arguments); }; }
  });
}

async function snap(page) {
  return page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('wl_p') || '{}');
    let pipe = '';
    try { pipe = String(canBuildPipe({ id: 'diag', res: 'fuel', hex: '1_1', lat: 48.69, lng: -116.32, name: 'Diag' }) || ''); } catch (e) { pipe = e.message; }
    return {
      chip: (document.getElementById('gpschip') || {}).textContent || '',
      banner: (document.getElementById('far25') || {}).innerText || '',
      far: !!(P.far25 && P.far25.on),
      saved: !!(saved.far25 && saved.far25.on),
      armed: !!G._near25,
      meters: +((P.stats && P.stats.meters) || 0).toFixed(1),
      scrap: P.res.scrap | 0,
      tiles: Object.keys(P.tiles || {}).length,
      pos: G.pos,
      cloud: window.__cloud | 0,
      notes: window.__notes | 0,
      pipe
    };
  });
}

async function fix(context, page, g, wait) {
  await context.setGeolocation(g);
  await page.waitForTimeout(wait || 1200);
}

(async () => {
  const b = await chromium.launch();
  // --- saved flag, already home, before any new drive ---
  const c1 = await b.newContext({ geolocation: HOME, permissions: ['geolocation'], viewport: { width: 430, height: 900 } });
  const p1 = await c1.newPage();
  const seed = JSON.stringify({ name: 'Diag', lvl: 1, far25: { on: true, anchor: null, since: 1 }, stats: { kills: 0, meters: 50 }, res: { scrap: 3, food: 0, water: 0, fuel: 0, parts: 0 } });
  await boot(c1, p1, seed);
  let   s = await snap(p1);
  const clearedAlready = !s.far && !s.banner && s.meters === 50;
  ok('boot with a saved flag is remote until a second accurate fix, or already cleared with no extra distance', (s.banner.includes('Rathdrum') && s.far && s.meters === 50) || clearedAlready, s);
  if (!clearedAlready) {
    await c1.setGeolocation(CLOSE);
    await p1.evaluate(() => gpsRestart());
    await p1.waitForFunction(() => !(P.far25 && P.far25.on), null, { timeout: 8000 }).catch(() => {});
    s = await snap(p1);
  }
  ok('two accurate home fixes clear the saved flag', !s.far && !s.saved && !s.banner, s);
  ok('boot return adds no walked distance', s.meters === 50, s);
  ok('boot return does not call cloudSave or notePlay', s.cloud === 0 && s.notes === 0, s);
  await p1.reload({ waitUntil: 'load' });
  await p1.waitForFunction(() => /GPS ±|Weak GPS|Finding|Dev position|Location blocked/.test((document.getElementById('gpschip') || {}).textContent || ''), null, { timeout: 20000 });
  await p1.waitForTimeout(1500);
  s = await snap(p1);
  ok('reload at home stays off the crew map', !s.far && !s.banner, s);
  await c1.close();

  const c = await b.newContext({ geolocation: HOME, permissions: ['geolocation'], viewport: { width: 430, height: 900 } });
  const p = await c.newPage();
  await boot(c, p, null);
  s = await snap(p);
  ok('fresh home is not remote', !s.far && !s.banner && /GPS ±8m/.test(s.chip), s);
  const homeTiles = s.tiles, homeMeters = s.meters, homeScrap = s.scrap;
  await fix(c, p, BONNERS);
  s = await snap(p);
  ok('Bonners Ferry turns the crew map on', s.far && s.banner.includes('Rathdrum') && s.saved, s);
  ok('107 km jump adds no meters, scrap, or tiles', s.meters === homeMeters && s.scrap === homeScrap && s.tiles === homeTiles, s);
  ok('game dot stays on the home map', s.pos && Math.abs(s.pos[0] - HOME.latitude) < 0.01, s.pos);
  const claims = await p.evaluate(() => { try { return claimPath(G.pos, [G.pos[0] + 0.002, G.pos[1]]); } catch (e) { return 'err'; } });
  ok('walk claims stay off while remote', claims === 0, claims);

  await p.evaluate(() => { UI.open('base'); UI.sub.base = 'pipes'; UI.render(); });
  const noteFar = await p.evaluate(() => (document.querySelector('.farnote25') || {}).textContent || '');
  ok('Base warning shows while remote', noteFar.includes("can't build pipelines") && noteFar.includes('Rathdrum'), noteFar);

  // far-drive credit unchanged: short steps pay, a jump over 3 km does not
  await p.evaluate(() => { G.drive.on = true; });
  await fix(c, p, { latitude: BONNERS.latitude + 800 / 111320, longitude: BONNERS.longitude, accuracy: 8 });
  await fix(c, p, { latitude: BONNERS.latitude + 1600 / 111320, longitude: BONNERS.longitude, accuracy: 8 });
  s = await snap(p);
  ok('short far drive still pays the existing per-km rate', s.far && s.scrap === homeScrap + 20, s);
  const paid = s.scrap;
  await fix(c, p, { latitude: BONNERS.latitude + (1600 + 8000) / 111320, longitude: BONNERS.longitude, accuracy: 8 });
  s = await snap(p);
  ok('an 8 km far step pays nothing more', s.scrap === paid && s.far, s);
  await p.evaluate(() => { G.drive.on = false; });

  const watch0 = await p.evaluate(() => G.gps.watch);
  await p.evaluate(() => {
    const proto = Document.prototype;
    Object.defineProperty(proto, 'visibilityState', { configurable: true, get: () => 'hidden' });
    Object.defineProperty(proto, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(proto, 'visibilityState', { configurable: true, get: () => 'visible' });
    Object.defineProperty(proto, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await p.waitForTimeout(400);
  const watch1 = await p.evaluate(() => G.gps.watch);
  s = await snap(p);
  ok('resume restarts GPS and does not clear remote mode', watch1 !== watch0 && s.far, { watch0, watch1, far: s.far });

  // poor accuracy at the home town must not exit
  await fix(c, p, { latitude: CLOSE.latitude, longitude: CLOSE.longitude, accuracy: 250 });
  s = await snap(p);
  ok('a ±250 m fix does not leave remote mode', s.far && s.saved, s);

  // dev coordinates must not leave remote mode
  await p.evaluate(() => { G.dev.hold = true; G.gps.state = 'dev'; setPos(47.82, -116.8968); });
  s = await snap(p);
  ok('dev position does not leave remote mode', s.far, s);
  await p.evaluate(() => { G.dev.hold = false; G.gps.state = 'ok'; G.gps.acc = 8; });

  // boundary: 42 km, 39 km, 42 km, 39 km must stay remote; the next inside fix confirms
  const atKm = km => ({ latitude: HOME.latitude + km / 111.32, longitude: HOME.longitude, accuracy: 8 });
  for (const km of [42, 39, 42, 39]) {
    await fix(c, p, atKm(km));
    s = await snap(p);
    ok('still remote after a ' + km + ' km fix in the wobble', s.far, { km, armed: s.armed, meters: s.meters });
  }
  ok('the last inside fix is only waiting, not confirmed', s.armed === true && s.far, s);
  const before = await snap(p);
  const cloudBefore = before.cloud;
  await fix(c, p, atKm(38));
  s = await snap(p);
  ok('second inside fix leaves remote mode', !s.far && !s.saved && !s.banner, s);
  ok('exit does not add the gap from the crew dot', s.meters === before.meters, { before: before.meters, after: s.meters });
  ok('exit does not grant resources', s.scrap === before.scrap, s);
  ok('exit claims at most the hex underfoot', s.tiles - before.tiles <= 1, { before: before.tiles, after: s.tiles });
  ok('exit still did not call cloudSave or notePlay', s.cloud === cloudBefore && s.notes === 0, s);

  await p.evaluate(() => { UI.open('base'); UI.sub.base = 'pipes'; UI.render(); });
  const noteHome = await p.evaluate(() => (document.querySelector('.farnote25') || {}).textContent || '');
  s = await snap(p);
  ok('Base warning is gone and the far pipeline block is gone', !noteHome && !s.pipe.includes('Far-away'), { noteHome, pipe: s.pipe });

  // a real step after the return can claim again
  const tiles0 = s.tiles;
  const claimed = await p.evaluate(() => { G.playLocked = false; W(); const n = claimPath(G.pos, [G.pos[0] + 0.003, G.pos[1]]); return { n, tiles: Object.keys(P.tiles).length }; });
  ok('a later real step can claim again', !s.far && claimed.n > 0 && claimed.tiles > tiles0, claimed);

  // stale cloud flag applied locally is not cleared until two new accurate fixes, and is not force-uploaded by the apply
  await p.evaluate(() => { P.far25 = { on: true, anchor: null, since: 1 }; save(); banner25(); });
  s = await snap(p);
  ok('a reapplied flag stays until GPS confirms', s.far && s.banner.includes('Rathdrum'), s);
  await p.evaluate(() => { W(); const id = hexAt(...G.pos).id; P.tiles[id] = P.tiles[id] || { t: 1 }; P.startSh26 = 1; P.startShMoved26 = 1; });
  const cloudAt = s.cloud;
  await fix(c, p, CLOSE);
  s = await snap(p);
  ok('one accurate fix only arms', s.far && s.armed, s);
  const tilesAt = s.tiles;
  await fix(c, p, { latitude: CLOSE.latitude + 30 / 111320, longitude: CLOSE.longitude, accuracy: 8 });
  s = await snap(p);
  ok('the reapplied flag clears on the second fix', !s.far && !s.saved, s);
  ok('clearing it does not call cloudSave', s.cloud === cloudAt, s);
  ok('the return claims at most the hex underfoot', s.tiles - tilesAt <= 1, { tilesAt, tiles: s.tiles });

  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  await b.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
