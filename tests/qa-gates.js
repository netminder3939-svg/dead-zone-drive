// Final QA gates for 12h-integrated-2. Local fixture only. No cloud writes.
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

  const tier = await p.evaluate(() => {
    W(); P.uid = P.uid || 'me';
    const setLv = (L) => { barracks().level = L; };
    const unit = (L) => { setLv(L); return troopUnit(1000); };
    const t1 = unit(1), t2 = unit(4);
    const ratio = (a, b) => a / b;
    const rowHp = (tp) => fight26({ bld: { kind: 'tower', lvl: 1 }, players: [{ key: 'a', uid: 'me', n: 2000, type: 'raider', gear: { tp }, name: 'me' }] }, { n: 2000 }).players[0].hp;
    const f1 = rowHp(1), f14 = rowHp(1.4);
    setLv(4);
    TP().home = 1000; TP().stationed = {};
    const mine = memberSummary();
    const marched = marchUnits({ troops: 1000, unit: frozenMe(), escorts: {} }).find(u => u.troop);
    const whoMissing = who26('veteran-no-g26');
    G.al = G.al || { members: {} };
    G.al.members = {
      newbie: { name: 'New', p14: 0 },
      quiet: { name: 'No field' },
      offline: { name: 'Old', p14: 30000, lastActive: 1 },
      vet: { name: 'Vet', p14: 10000, g26: { t: 1.4 } },
      me: { name: 'Diag', p14: 1, g26: { t: 9 } }
    };
    const whoVet = who26('vet');
    const whoHuge = who26('huge');
    G.al.members.huge = { name: 'Huge', g26: { t: 9 } };
    const whoClamped = who26('huge');
    G.al.members.tiny = { name: 'Tiny', g26: { t: 0.2 } };
    const whoFloor = who26('tiny');
    G.al.members[P.uid] = { name: 'Diag', p14: 999999, g26: { t: 1.4 } };
    const scale = hordeScale14();
    const parts = [];
    const ms = G.al.members;
    if (P.uid) parts.push(['own', myArmy14()]);
    for (const k in ms) {
      if (typeof isMe === 'function' && isMe(k)) continue;
      const n = +ms[k].p14 || 0;
      if (n > 0) parts.push([k, n]);
    }
    return {
      tp: myTp26(), tier: troopTier(),
      hpRatio: +ratio(t2.hp, t1.hp).toFixed(2),
      atkRatio: +ratio(t2.atk, t1.atk).toFixed(2),
      fightHpRatio: +ratio(f14, f1).toFixed(2),
      g26: mine.g26, p14: mine.p14, marchHp: marched && marched.hp,
      whoMissing: whoMissing.gear.tp,
      whoVet: whoVet.gear.tp,
      whoClamped, whoFloor: whoFloor.gear.tp,
      scale, parts
    };
  });
  ok('the march arrival troop block uses decimal tier HP once', tier.tier === 2 && tier.tp === 1.4 && tier.marchHp === 350 && tier.hpRatio === 1.4 && tier.atkRatio > 1.2 && tier.atkRatio < 1.6, tier);
  ok('fight26 row HP uses gear.tp once', tier.fightHpRatio > 1.35 && tier.fightHpRatio < 1.45, tier);
  ok('the local member fixture publishes decimal g26.t and integer p14', tier.g26 && tier.g26.t === 1.4 && tier.p14 === 1400 && Number.isInteger(tier.p14), tier);
  ok('a teammate with no g26.t defaults to tier power 1', tier.whoMissing === 1, tier);
  ok('a published 1.4 is kept and an out-of-range tier is clamped', tier.whoVet === 1.4 && tier.whoFloor === 1 && tier.whoClamped.gear.tp === 3.2, tier);
  ok('the horde average counts your live army and every positive p14, including an offline record, and does not count you twice', tier.parts.some(x => x[0] === 'own' && x[1] === 1400) && tier.parts.some(x => x[0] === 'vet' && x[1] === 10000) && tier.parts.some(x => x[0] === 'offline' && x[1] === 30000) && !tier.parts.some(x => x[0] === 'newbie' || x[0] === 'quiet' || x[1] === 999999), tier);

  const gps = await p.evaluate(() => {
    const lat = 47.8135, lng = -116.8968;
    G.pos = [lat, lng];
    P.far25 = { on: true, anchor: null, since: 1 };
    G._near25 = null; G._homeProof25 = null; G._homeLast25 = 0;
    G.gps.state = 'ok'; G.gps.acc = 8; G.gps.forceNext = false;
    const meters = P.stats.meters;
    let sets = 0; const sp = setPos; setPos = function () { sets++; return sp.apply(this, arguments); };
    const now = Date.now();
    const fix = (t) => gpsFix({ coords: { latitude: lat, longitude: lng, accuracy: 8 }, timestamp: t });
    fix(now - 60000);
    fix(now - 50000);
    const stale = { far: !!(P.far25 && P.far25.on), sets };
    fix(now);
    const one = { far: !!(P.far25 && P.far25.on), armed: !!G._near25 };
    fix(now - 1000);
    const reorder = { far: !!(P.far25 && P.far25.on) };
    fix(now + 1000);
    const fresh = { far: !!(P.far25 && P.far25.on), sets, meters: P.stats.meters, meters0: meters };
    setPos = sp;
    return { stale, one, reorder, fresh };
  });
  ok('stale GPS samples do not clear the crew-home flag', gps.stale.far === true && gps.stale.sets === 0, gps.stale);
  ok('one fresh sample only arms', gps.one.far === true && gps.one.armed === true, gps.one);
  ok('an older sample after that does not clear it', gps.reorder.far === true, gps.reorder);
  ok('a newer stationary sample clears it without setPos or distance', gps.fresh.far === false && gps.fresh.sets === 0 && gps.fresh.meters === gps.fresh.meters0, gps.fresh);

  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  await b.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
