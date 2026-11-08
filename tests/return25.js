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
  ok('Bonners Ferry does not force the crew-home map', !s.far && !s.banner, s);
  ok('107 km jump adds no meters, scrap, or tiles', s.meters === homeMeters && s.scrap === homeScrap && s.tiles === homeTiles, s);
  ok('the dot follows the real GPS fix', s.pos && Math.abs(s.pos[0] - BONNERS.latitude) < 0.05, s.pos);
  const base = await p.evaluate(() => {
    W(); const id = hexAt(47.8135, -116.8968).id;
    P.world.sh = { hex: id, state: 'up', hpPct: 1 };
    P.op15 = 'sh';
    const meters = P.stats.meters;
    const before = Object.keys(P.tiles).length;
    setOp15('sh');
    const claims = claimPath([47.82, -116.9], [47.83, -116.9]);
    return { op: P.op15, claims, tiles: Object.keys(P.tiles).length, before, meters, after: P.stats.meters, far: !!(P.far25 && P.far25.on) };
  });
  ok('operating from a base does not drive-claim and adds no distance', base.claims === 0 && base.tiles === base.before && base.after === base.meters && !base.far, base);

  await p.evaluate(() => { P.op15 = 'gps'; UI.open('base'); UI.sub.base = 'pipes'; UI.render(); });
  const noteHome = await p.evaluate(() => (document.querySelector('.farnote25') || {}).textContent || '');
  s = await snap(p);
  ok('Base warning is gone and the far pipeline block is gone', !noteHome && !s.pipe.includes('Far-away'), { noteHome, pipe: s.pipe });

  // a real step after the return can claim again
  const tiles0 = s.tiles;
  const claimed = await p.evaluate(() => { G.playLocked = false; W(); const n = claimPath(G.pos, [G.pos[0] + 0.003, G.pos[1]]); return { n, tiles: Object.keys(P.tiles).length }; });
  ok('a later real step can claim again', !s.far && claimed.n > 0 && claimed.tiles > tiles0, claimed);

  // The last real fix was Bonners, so there is no fresh home proof. A reapplied leftover flag can show. It must not upload or add distance, and two accurate home fixes clear it.
  const cloudAt = s.cloud;
  const metersAt = s.meters;
  await p.evaluate(() => { P.far25 = { on: true, anchor: null, since: 1 }; save(); banner25(); if (window.onProfile25) onProfile25(); });
  s = await snap(p);
  ok('without a fresh home proof a reapplied flag can show', s.far && !!s.banner, s);
  ok('showing that flag does not call cloudSave or add distance', s.cloud === cloudAt && s.meters === metersAt, s);
  await fix(c, p, HOME);
  await fix(c, p, { latitude: HOME.latitude + 0.0002, longitude: HOME.longitude, accuracy: 8 });
  s = await snap(p);
  ok('two accurate home fixes clear the reapplied flag', !s.far && !s.banner, s);
  ok('clearing it does not upload or add the long gap', s.meters < 1000 && s.cloud === cloudAt, s);

  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  await b.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
