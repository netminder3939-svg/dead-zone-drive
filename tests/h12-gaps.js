// Narrow 12h gates. Point PORT at the tree under test. This file does not change that tree.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PORT = process.env.PORT || '8767';
const root = process.env.PUBLIC_ROOT || 'public';
function shaFile(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
let commit = process.env.GIT_COMMIT || '';
try { commit = commit || execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch (e) {}
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const cache = (sw.match(/const C='([^']+)'/) || [])[1] || '';
console.log('BIND ' + JSON.stringify({
  test: 'h12-gaps', port: PORT, publicRoot: root, commit, cache,
  publicSw: shaFile(path.join(root, 'sw.js')),
  rules12g: shaFile('rules/preview-auth-rules-12g.rules'),
  command: process.argv.join(' '), node: process.version, time: new Date().toISOString()
}));
let failed = 0;
const ok = (n, c, e) => { if (!c) failed++; console.log((c ? 'PASS ' : 'FAIL ') + n + (e != null ? ' ' + JSON.stringify(e) : '')); };
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 430, height: 900 }, geolocation: { latitude: 47.8135, longitude: -116.8968, accuracy: 8 }, permissions: ['geolocation'] });
  const p = await c.newPage();
  await p.goto('http://127.0.0.1:' + PORT + '/?local', { waitUntil: 'load' });
  await p.fill('#obName', 'Gap');
  await p.fill('#obTeam', 'rathdrum-crew');
  await p.click('#obGo');
  await p.waitForFunction(() => typeof G !== 'undefined' && P && P.name, null, { timeout: 20000 });
  const drive = await p.evaluate(() => {
    W(); const me = hexAt(47.8135, -116.8968).id;
    const ids = hexRing(...idQR(me), 4).map(x => x.id);
    const pending = ids[0], arrived = ids[1], plain = ids[2];
    P.tiles = {}; G.terr = {};
    const fx = FX();
    fx.f = { dogs: { home: 'far', tiles: { [pending]: 1, [arrived]: 1 }, squads: [], tier: 0, outposts: {} } };
    fxDirty();
    TP().stationed = {};
    TP().stationed[pending] = { n: 20, at: Date.now() + 60000 };
    TP().stationed[arrived] = { n: 20, at: Date.now() - 1000 };
    G.terr[pending] = { ai: true, by: 'Raiders', t: 1 };
    G.terr[arrived] = { ai: true, by: 'Raiders', t: 1 };
    let ts = Date.now();
    const cross = (to, stamp) => {
      const b = hexCenter(...idQR(to));
      G.pos = hexCenter(...idQR(me));
      G.dev = { walk: false, drive: false, tp: false, hold: false };
      G.gps.state = 'ok'; G.gps.acc = 8; G.gps.lastMove = (stamp || ts) - 60000; G._claimLast25 = 0;
      gpsFix({ coords: { latitude: b[0], longitude: b[1], accuracy: 8 }, timestamp: stamp || (ts += 1000) });
      return !!P.tiles[to];
    };
    const neutrals = ids.filter(id => !enemyAt(id) && !(typeof factionAt === 'function' && factionAt(id)));
    const pendingClaimed = cross(pending);
    const arrivedClaimed = cross(arrived);
    const staleHex = neutrals[0];
    const staleClaimed = cross(staleHex, Date.now() - 120000);
    const jumpHex = neutrals[1];
    G.pos = hexCenter(...idQR(me));
    G.gps.lastMove = Date.now();
    const center = hexCenter(...idQR(jumpHex));
    gpsFix({ coords: { latitude: center[0], longitude: center[1], accuracy: 8 }, timestamp: Date.now() + 1000 });
    return { pendingClaimed, arrivedClaimed, staleClaimed, teleportClaimed: !!P.tiles[jumpHex], plain };
  });
  console.log('DRIVE_SAMPLE ' + JSON.stringify(drive));

  const fort = await p.evaluate(async () => {
    const claims = [];
    const orig = claimTile;
    claimTile = function (id) { claims.push({ id, march: G._marchId || '' }); return orig.apply(this, arguments); };
    const me = hexAt(47.8135, -116.8968).id;
    let found = null;
    for (let ring = 1; ring <= 30 && !found; ring++) {
      for (const x of hexRing(...idQR(me), ring)) if (enemyAt(x.id) && !W().enemyTaken[x.id]) { found = x.id; break; }
    }
    const adj = hexRing(...idQR(found), 1).map(x => x.id).find(id => id !== found && !enemyAt(id));
    const beyond = hexRing(...idQR(found), 3).map(x => x.id).find(id => { const line = claimRoute26(adj, id); const i = line.indexOf(found); return i > 0 && i < line.length - 1; });
    const line = claimRoute26(adj, beyond || found);
    const at = line.indexOf(found);
    const after = new Set(line.slice(at + 1));
    P.tiles = {}; W().enemyTaken = {}; P.marchDone = {}; G._fortQ = {};
    for (const id of line) { delete P.tiles[id]; if (G.terr && G.terr[id] && !G.terr[id].ai) delete G.terr[id]; }
    TP().home = 8000;
    const mk = (id, troops) => ({ uid: P.uid, name: P.name, from: adj, to: beyond || found, startT: Date.now() - 5000, dur: 1000, state: 'out', troops, unit: frozenMe(), power: 10, escorts: {} });
    const scrap0 = P.res.scrap | 0, gear0 = P.inv.length;
    const zero = mk('z', 0), win = mk('w', 8000);
    await Promise.all([resolveMarch('z', zero), resolveMarch('w', win)]);
    const by = m => claims.filter(c => c.march === m).map(c => c.id);
    const zeroOnward = by('z').filter(id => id === found || after.has(id));
    const scrap1 = (P.res.scrap | 0) - scrap0, gear1 = P.inv.length - gear0;
    const beforeBlocked = new Set(Object.keys(P.tiles));
    const blocked = mk('b', 8000);
    claims.length = 0;
    await resolveMarch('b', blocked);
    const blockedOnward = Object.keys(P.tiles).filter(id => !beforeBlocked.has(id) && (id === found || after.has(id)));
    const taken = W().enemyTaken[found] || 0;
    G.terr[found] = { uid: 'other-player', by: 'Other', ai: false, t: 1 };
    W().enemyTaken[found] = 111;
    for (const id of line) delete P.tiles[id];
    claims.length = 0;
    const scrap2 = P.res.scrap | 0, gear2 = P.inv.length;
    const changed = mk('c', 8000);
    await resolveMarch('c', changed);
    const changedOnward = by('c').filter(id => after.has(id) || id === found);
    const owner = G.terr[found] && G.terr[found].uid;
    P.marchDone.c = 1;
    const scrap3 = P.res.scrap | 0;
    await resolveMarch('c', changed);
    claimTile = orig;
    return { zeroOnward, scrap1, gear1, taken: !!taken, blockedOnward, changedOnward, owner, scrapReload: (P.res.scrap | 0) - scrap3, gearReload: P.inv.length - gear2, zeroResult: zero.result || '', winResult: win.result || '', blockedResult: blocked.result || '' };
  });
  ok('the zero-troop march claims nothing on or past the fort', fort.zeroOnward.length === 0, fort);
  ok('overlapping arrivals pay the fort once', fort.taken && fort.gear1 === 1 && fort.scrap1 > 0, fort);
  ok('a later march does not claim onward after the capture', fort.blockedOnward.length === 0 && !/Claimed/.test(fort.blockedResult || ''), fort);
  ok('an ownership change does not pay or claim the fort or beyond it', fort.changedOnward.length === 0 && fort.owner === 'other-player', fort);
  ok('a repeated resolve adds no reward', fort.scrapReload === 0, fort);
  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  await b.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
