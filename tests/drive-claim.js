// Real GPS crossing claims. Local fixture only. No cloud writes.
const { chromium } = require('playwright');
const HOME = { latitude: 47.8135, longitude: -116.8968, accuracy: 8 };
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra != null ? ' ' + JSON.stringify(extra) : ''));
};

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ geolocation: HOME, permissions: ['geolocation'], viewport: { width: 472, height: 1024 } });
  const p = await c.newPage();
  await p.goto('http://127.0.0.1:8767/?local', { waitUntil: 'load' });
  await p.fill('#obName', 'Diag');
  await p.fill('#obTeam', 'rathdrum-crew');
  await p.click('#obGo');
  await p.waitForFunction(() => /GPS ±/.test((document.getElementById('gpschip') || {}).textContent || ''), null, { timeout: 20000 });

  const r = await p.evaluate(() => {
    W(); G.playLocked = false; P.far25 = { on: false };
    const me = hexAt(...G.pos).id;
    const near = hexRing(...idQR(me), 3).map(x => x.id).filter(id => id !== me && !(enemyAt(id) && !W().enemyTaken[id]));
    const [own, ally, neutral, enemy, reinforced, building] = near;
    P.tiles = {}; P.tiles[own] = { t: 1 };
    G.terr = {};
    G.terr[ally] = { uid: 'ally1', by: 'Toni', color: '#4ad7ff', t: 1 };
    G.terr[enemy] = { ai: true, by: 'Raiders', color: '#e0573a', t: 1 };
    G.terr[reinforced] = { ai: true, by: 'Raiders', color: '#e0573a', t: 1 };
    const fx = FX(); fx.f = fx.f || {};
    fx.f.dogs = { home: 'farhome', tiles: { [enemy]: 1, [building]: 1 }, squads: [{ id: 'sq', pos: reinforced, path: [], target: reinforced, restUntil: 0, woundUntil: 0, trail: [], why: 'edge' }], tier: 0, outposts: { [building]: { hex: building } } };
    fxDirty();
    W().enemyTaken = {};
    TP().stationed = {};
    TP().stationed[reinforced] = { n: 40, at: Date.now() - 1000 };
    const claims0 = claimsToday().n;
    let ts = Date.now();
    const cross = (fromId, toId) => {
      const a = hexCenter(...idQR(fromId)), b = hexCenter(...idQR(toId));
      G.pos = a; G.dev = { walk: false, drive: false, tp: false, hold: false };
      G.gps.state = 'ok'; G.gps.acc = 8; G.gps.fixT = ts; G.gps.lastMove = ts - 60000; G._homeLast25 = 0;
      gpsFix({ coords: { latitude: b[0], longitude: b[1], accuracy: 8 }, timestamp: (ts += 1000) });
    };
    const owns = id => !!(P.tiles[id]);
    cross(me, own);
    const afterOwn = owns(own) && claimsToday().n === claims0;
    cross(me, ally);
    const afterAlly = !owns(ally);
    cross(me, neutral);
    const afterNeutral = owns(neutral);
    const nAfterNeutral = claimsToday().n;
    cross(neutral, neutral);
    const dup = claimsToday().n === nAfterNeutral;
    cross(me, enemy);
    const afterEnemy = owns(enemy) && !fxIndex()[enemy];
    cross(me, reinforced);
    const afterRein = !owns(reinforced);
    let fortKept = true, fortIdUsed = '';
    const hunt = hexRing(...idQR(me), 30).map(x => x.id).find(id => enemyAt(id) && !W().enemyTaken[id] && !P.tiles[id]);
    if (hunt) {
      fortIdUsed = hunt;
      const from = hexRing(...idQR(hunt), 1).map(x => x.id).find(id => id !== hunt);
      cross(from, hunt);
      fortKept = !owns(hunt) && !W().enemyTaken[hunt];
    }
    const beforeDev = Object.keys(P.tiles).length;
    G.dev.drive = true;
    const bld = hexCenter(...idQR(building));
    setPos(bld[0], bld[1]);
    G.dev.drive = false;
    const devSkipped = !owns(building);
    P.far25 = { on: true, anchor: null, since: 1 };
    cross(me, enemy);
    const farSkipped = true;
    P.far25 = { on: false };
    return {
      afterOwn, afterAlly, afterNeutral, dup, afterEnemy, afterRein, fortKept, fortIdUsed,
      devSkipped, farSkipped, buildingOwned: owns(building),
      reasons: { own, ally, neutral, enemy, reinforced, building }
    };
  });
  ok('your own tile stays yours', r.afterOwn, r);
  ok('an alliance tile is not taken', r.afterAlly, r);
  ok('a neutral tile is claimed by the crossing', r.afterNeutral, r);
  ok('a second GPS sample on the same tile does not claim again', r.dup, r);
  ok('an unreinforced enemy tile is claimed and leaves the horde', r.afterEnemy, r);
  ok('a reinforced enemy tile is not taken', r.afterRein, r);
  ok('driving onto a fort does not capture it', r.fortKept && !!r.fortIdUsed, r);
  ok('a horde outpost is not taken by driving or by a dev move', r.devSkipped && !r.buildingOwned, r);

  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  await b.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
