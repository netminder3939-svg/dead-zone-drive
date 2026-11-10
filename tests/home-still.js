// Still GPS, startup, adoption, and a following device. Local page and an in-page fake Firestore only.
const { chromium } = require('playwright');
const HOME = { latitude: 47.8135, longitude: -116.8968, accuracy: 8 };
const BONNERS = { latitude: 48.6917, longitude: -116.3165, accuracy: 8 };
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra != null ? ' ' + JSON.stringify(extra) : ''));
};

function fixAt(lat, lng, acc) {
  return { coords: { latitude: lat, longitude: lng, accuracy: acc == null ? 8 : acc }, timestamp: Date.now() };
}

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ geolocation: HOME, permissions: ['geolocation'], viewport: { width: 472, height: 1024 } });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const seed = JSON.stringify({ name: 'Diag', lvl: 1, far25: { on: true, anchor: null, since: 1 }, stats: { kills: 0, meters: 50 }, res: { scrap: 3, food: 0, water: 0, fuel: 0, parts: 0 } });
  await c.addInitScript(s => { if (!sessionStorage.getItem('dzdSeed')) { localStorage.setItem('wl_p', s); sessionStorage.setItem('dzdSeed', '1'); } }, seed);
  await c.addInitScript(() => localStorage.setItem('wl_team', 'rathdrum-crew'));
  await p.goto((process.argv[2]||'http://127.0.0.1:8767/')+'?local', { waitUntil: 'load' });
  await p.waitForFunction(() => /GPS ±|Weak GPS|Dev position|Location blocked/.test((document.getElementById('gpschip') || {}).textContent || ''), null, { timeout: 20000 });
  await p.waitForFunction(() => !(P.far25 && P.far25.on), null, { timeout: 8000 }).catch(() => {});
  const boot = await p.evaluate(() => ({
    far: !!(P.far25 && P.far25.on),
    banner: (document.getElementById('far25') || {}).innerText || '',
    meters: +((P.stats && P.stats.meters) || 0).toFixed(1),
    scrap: P.res.scrap | 0,
    build: (document.getElementById('build14') || {}).textContent || '',
    cache: (typeof C === 'undefined' ? '' : '') 
  }));
  ok('a saved far25 flag does not leave a stuck banner', !boot.far && !boot.banner, boot);
  ok('retiring that flag adds no walked distance', boot.meters === 50, boot);
  ok('visible build label is 12i-integrated-6-r6-5', boot.build === '12i-integrated-6-r6-5', boot);

  const still = await p.evaluate(() => {
    const lat = 47.8135, lng = -116.8968;
    G.pos = [lat, lng];
    P.lastPos = [lat, lng];
    P.far25 = { on: true, anchor: null, since: 1 };
    G._near25 = null;
    G._homeProof25 = null;
    G.gps.state = 'ok';
    G.gps.acc = 8;
    G.gps.forceNext = false;
    const before = P.stats.meters;
    const scrap = P.res.scrap | 0;
    const tiles = Object.keys(P.tiles || {}).length;
    let sets = 0;
    const sp = setPos;
    setPos = function () { sets++; return sp.apply(this, arguments); };
    let ts = Date.now();
    const pulse = () => gpsFix({ coords: { latitude: lat, longitude: lng, accuracy: 8 }, timestamp: (ts += 1000) });
    pulse(1);
    const mid = { far: !!(P.far25 && P.far25.on), armed: !!G._near25, sets };
    pulse(2);
    const after = { far: !!(P.far25 && P.far25.on), saved: !!(JSON.parse(localStorage.getItem('wl_p') || '{}').far25 || {}).on, sets, meters: P.stats.meters, scrap: P.res.scrap | 0, tiles: Object.keys(P.tiles || {}).length, banner: !!(document.getElementById('far25')) };
    setPos = sp;
    return { mid, after, before, scrap, tiles };
  });
  ok('first still fix only arms and does not call setPos', still.mid.far && still.mid.armed && still.mid.sets === 0, still.mid);
  ok('second still fix clears the flag without setPos', !still.after.far && !still.after.saved && !still.after.banner && still.after.sets === 0, still.after);
  ok('still clear adds no meters, scrap, or tiles', still.after.meters === still.before && still.after.scrap === still.scrap && still.after.tiles === still.tiles, still.after);

  const guard = await p.evaluate(() => {
    const lat = 47.8135, lng = -116.8968;
    const arm = () => { P.far25 = { on: true, anchor: null, since: 1 }; G._near25 = null; G._homeProof25 = null; G.pos = [lat, lng]; };
    arm();
    let ts = Date.now();
    const mark = () => (ts += 1000);
    gpsFix({ coords: { latitude: lat, longitude: lng, accuracy: 250 }, timestamp: mark() });
    gpsFix({ coords: { latitude: lat, longitude: lng, accuracy: 250 }, timestamp: mark() });
    const weak = !!(P.far25 && P.far25.on);
    arm();
    G.dev.hold = true; G.gps.state = 'dev';
    gpsFix({ coords: { latitude: lat, longitude: lng, accuracy: 8 }, timestamp: mark() });
    gpsFix({ coords: { latitude: lat, longitude: lng, accuracy: 8 }, timestamp: mark() });
    const dev = !!(P.far25 && P.far25.on);
    G.dev.hold = false; G.gps.state = 'ok'; G.gps.acc = 8;
    arm();
    const at = km => ({ coords: { latitude: lat + km / 111.32, longitude: lng, accuracy: 8 }, timestamp: (ts += 1000) });
    gpsFix(at(42)); gpsFix(at(42));
    const band = !!(P.far25 && P.far25.on);
    gpsFix(at(39));
    const one = { far: !!(P.far25 && P.far25.on), armed: !!G._near25 };
    gpsFix(at(38));
    const two = !!(P.far25 && P.far25.on);
    return { weak, dev, band, one, two };
  });
  ok('a ±250 m still fix does not clear', guard.weak === true, guard);
  ok('a dev still fix does not clear', guard.dev === true, guard);
  ok('two fixes in the 40–50 km band stay remote', guard.band === true, guard);
  ok('one inside fix only arms after the band', guard.one.far && guard.one.armed, guard.one);
  ok('the next inside fix clears', guard.two === false, guard);

  const away = await p.evaluate(() => {
    P.far25 = { on: false };
    G._homeProof25 = null; G._homeLast25 = 0; G._near25 = null;
    G.pos = [47.8135, -116.8968];
    const meters = P.stats.meters;
    const tiles = Object.keys(P.tiles || {}).length;
    gpsFix({ coords: { latitude: 48.6917, longitude: -116.3165, accuracy: 8 }, timestamp: Date.now() });
    return { far: !!(P.far25 && P.far25.on), proof: G._homeProof25, meters: P.stats.meters, tiles: Object.keys(P.tiles || {}).length, meters0: meters, tiles0: tiles };
  });
  ok('a long GPS move does not force the crew-home map', !away.far, away);
  ok('that move adds no walked distance or tiles', away.meters === away.meters0 && away.tiles === away.tiles0, away);

  const back = await p.evaluate(() => {
    let sets = 0;
    const sp = setPos;
    setPos = function () { sets++; return sp.apply(this, arguments); };
    const meters = P.stats.meters;
    G._homeLast25 = 0; G._near25 = null;
    let backTs = Date.now();
    gpsFix({ coords: { latitude: 47.82, longitude: -116.8968, accuracy: 8 }, timestamp: (backTs += 1000) });
    const mid = { far: !!(P.far25 && P.far25.on), sets };
    gpsFix({ coords: { latitude: 47.821, longitude: -116.8968, accuracy: 8 }, timestamp: (backTs += 1000) });
    const after = { far: !!(P.far25 && P.far25.on), sets, meters: P.stats.meters, meters0: meters };
    setPos = sp;
    return { mid, after };
  });
  ok('later home fixes do not turn the crew-home map back on', !back.mid.far && !back.after.far, back);
  ok('those fixes do not add a distance gap', back.after.meters === back.after.meters0, back);

  const stale = await p.evaluate(() => {
    const clouds = window.__cloud || 0;
    let sets = 0;
    const sp = setPos;
    setPos = function () { sets++; return sp.apply(this, arguments); };
    P.far25 = { on: true, anchor: null, since: 1 };
    save();
    banner25();
    const stuck = !!(P.far25 && P.far25.on);
    onProfile25();
    const cleared = !!(P.far25 && P.far25.on);
    setPos = sp;
    return { stuck, cleared, sets, banner: !!(document.getElementById('far25')) };
  });
  ok('onProfile25 clears a stale flag from the current home fix', stale.stuck && !stale.cleared && !stale.banner && stale.sets === 0, stale);

  const follow = await p.evaluate(async () => {
    window.__tx = 0;
    const prof = JSON.parse(JSON.stringify(P));
    prof.far25 = { on: true, anchor: null, since: 9 };
    prof._rev = (P._rev | 0) + 4;
    const body = { data: JSON.stringify(prof), rev: prof._rev, lease: { dev: 'phone-other', label: 'phone', t: Date.now() }, savedAt: Date.now() };
    NET.mode = 'firebase';
    NET.uid = 'owner1';
    NET.team = 'rathdrum-crew';
    NET.base = ['teams', 'rathdrum-crew'];
    NET.db = {};
    NET.col = function () { return { path: 'saves' }; };
    let snap = null;
    NET.fs = {
      doc: function () { return { path: 'teams/rathdrum-crew/saves/owner1' }; },
      collection: function () { return {}; },
      serverTimestamp: function () { return { ts: 1 }; },
      setDoc: function () { window.__tx++; return Promise.resolve(); },
      getDoc: async function () { return { exists: function () { return true; }, data: function () { return body; } }; },
      onSnapshot: function (_ref, cb) { snap = cb; return function () {}; },
      runTransaction: async function (_db, fn) {
        window.__tx++;
        return fn({ get: async function () { return { exists: function () { return true; }, data: function () { return body; } }; }, set: function () { window.__tx++; } });
      }
    };
    window.__emailAuth = true;
    G.playLocked = false;
    const deadline = Date.now() + 2500;
    while (!(window.SYNC13 && SYNC13.on) && Date.now() < deadline) await new Promise(r => setTimeout(r, 100));
    await new Promise(r => setTimeout(r, 800));
    const afterStart = { on: !!(window.SYNC13 && SYNC13.on), far: !!(P.far25 && P.far25.on), tx: window.__tx, lease: window.SYNC13 && SYNC13.lease && SYNC13.lease.dev };
    body.rev += 1;
    const again = JSON.parse(body.data);
    again._rev = body.rev;
    again.far25 = { on: true, anchor: null, since: 11 };
    body.data = JSON.stringify(again);
    body.lease = { dev: 'phone-other', label: 'phone', t: Date.now() };
    if (snap) snap({ exists: function () { return true; }, data: function () { return body; }, metadata: { hasPendingWrites: false } });
    await new Promise(r => setTimeout(r, 2000));
    return { afterStart, afterSnap: { far: !!(P.far25 && P.far25.on), tx: window.__tx, state: window.SYNC13 && SYNC13.state, iOwn: window.SYNC13 && SYNC13.lease && SYNC13.lease.dev === SYNC13.dev } };
  });
  ok('startup adopt of a far profile while GPS is home ends cleared', follow.afterStart.on && !follow.afterStart.far, follow.afterStart);
  ok('a later snapshot from the other device does not turn the flag back on', !follow.afterSnap.far, follow.afterSnap);
  ok('the follower writes no save revision', follow.afterStart.tx === 0 && follow.afterSnap.tx === 0, follow);

  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => /GPS ±|Weak GPS|Finding|Dev position|Location blocked/.test((document.getElementById('gpschip') || {}).textContent || ''), null, { timeout: 20000 });
  await p.waitForTimeout(1500);
  const re = await p.evaluate(() => ({ far: !!(P.far25 && P.far25.on), banner: (document.getElementById('far25') || {}).innerText || '' }));
  ok('reload at home stays off the crew map', !re.far && !re.banner, re);

  await p.evaluate(() => { P.far25 = { on: true, anchor: null, since: 1 }; save(); });
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
  const fg = await p.evaluate(() => {
    const meters = P.stats.meters;
    const t = Math.max(Date.now(), (G._homeLast25 || 0) + 1000);
    gpsFix({ coords: { latitude: 47.8135, longitude: -116.8968, accuracy: 8 }, timestamp: t });
    gpsFix({ coords: { latitude: 47.8135, longitude: -116.8968, accuracy: 8 }, timestamp: t + 1000 });
    return { far: !!(P.far25 && P.far25.on), watch: G.gps.watch, meters, after: P.stats.meters };
  });
  ok('foreground stationary samples clear the flag without adding distance', !fg.far && fg.after === fg.meters, { far: fg.far, watch: fg.watch, prev: watch0, meters: fg.meters, after: fg.after });

  const plain = await p.evaluate(() => {
    G.pos = [47.8135, -116.8968];
    P.far25 = { on: false };
    let sets = 0;
    const sp = setPos;
    setPos = function () { sets++; return sp.apply(this, arguments); };
    gpsFix({ coords: { latitude: 47.8135 + 2 / 111320, longitude: -116.8968, accuracy: 8 }, timestamp: Date.now() });
    setPos = sp;
    return sets;
  });
  ok('ordinary 2 m jitter still does not call setPos', plain === 0, plain);

  const member = await p.evaluate(() => {
    W();
    P.world.barracks = P.world.barracks || {};
    P.world.barracks.level = 4;
    const t = TP();
    t.home = 3542;
    t.stationed = { a: { n: 1000 } };
    const m = memberSummary();
    return { t: m.g26 && m.g26.t, p14: m.p14, tType: m.g26 && typeof m.g26.t, pType: typeof m.p14, keys: Object.keys(m), tier: troopTier() };
  });
  ok('member payload publishes decimal g26.t and integer p14', member.tier === 2 && member.t === 1.4 && member.tType === 'number' && member.p14 === Math.round(4542 * 1.4) && member.pType === 'number' && Number.isInteger(member.p14), member);
  ok('member payload has no top-level location keys', !member.keys.some(k => k === 'lat' || k === 'lng' || k === 'pos' || k === 'location'), member.keys);

  console.log('pageerrors', errs.slice(0, 6));
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  await b.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
