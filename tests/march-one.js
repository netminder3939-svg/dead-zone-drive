// One march control. Local page only. No Firebase, no account.
const { chromium } = require('playwright');
const HOME = { latitude: 47.8135, longitude: -116.8968, accuracy: 8 };
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra != null ? ' ' + JSON.stringify(extra) : ''));
};

async function boot(p) {
  await p.goto('http://127.0.0.1:8767/?local', { waitUntil: 'load' });
  await p.fill('#obName', 'Diag');
  await p.fill('#obTeam', 'rathdrum-crew');
  await p.click('#obGo');
  await p.waitForFunction(() => /GPS ±/.test((document.getElementById('gpschip') || {}).textContent || ''), null, { timeout: 20000 });
}

async function world(p) {
  return p.evaluate(() => {
    G.playLocked = false;
    const gate = document.getElementById('auth12'); if (gate) gate.style.display = 'none';
    W();
    barracks().level = 2;
    const t = TP();
    t.home = 3542; t.stationed = {}; t.away = {}; t.returning = [];
    G.marches = {};
    G.troopSend = 0;
    const me = hexAt(...G.pos).id;
    const near = hexRing(...idQR(me), 2);
    const own = near[1].id, horde = hexRing(...idQR(me), 5)[10].id, squadHex = hexRing(...idQR(me), 4)[3].id;
    P.tiles[own] = { t: Date.now() };
    const fx = FX();
    fx.f = { dogs: { home: horde, tiles: { [horde]: Date.now(), [squadHex]: Date.now() }, squads: [{ id: 'sq1', pos: squadHex, path: [], target: horde, restUntil: 0, woundUntil: 0, trail: [squadHex], why: 'edge' }], tier: 0, outposts: {} } };
    hexRing(...idQR(horde), 1).forEach(x => { fx.f.dogs.tiles[x.id] = Date.now(); });
    const taken = new Set(Object.keys(fx.f.dogs.tiles));
    const ally = hexRing(...idQR(me), 3).find(x => x.id !== own && x.id !== me && !taken.has(x.id)).id;
    G.terr[ally] = { uid: 'other', by: 'Toni', color: '#4ad7ff', t: Date.now() };
    P.explored = P.explored || {};
    [ally, own, horde, squadHex, me].forEach(id => { P.explored[id] = 1; });
    fxDirty();
    t.stationed[own] = { n: 100, at: Date.now() - 1000, from: me, st: Date.now() };
    return { me, ally, own, horde, squadHex };
  });
}

function counts() {
  return {
    march: document.querySelectorAll('#btnMarch').length,
    faceMarch: document.querySelectorAll('#modalBody .ccbtn26 #btnMarch, #modalBody .ccbtn26 button#btnMarch').length || document.querySelectorAll('#btnMarch').length,
    range: document.querySelectorAll('#modalBody input[type=range]').length,
    num: document.querySelectorAll('#modalBody input.tnum').length,
    sel: document.querySelectorAll('#modalBody .troopsel3').length,
    intercept: document.querySelectorAll('#btnIntercept').length,
    guard: document.querySelectorAll('#modalBody .stationrow').length,
    predicted: [...document.querySelectorAll('#modalBody .row')].filter(el => /Predicted:/.test(el.textContent || '') && !el.closest('.troopsel3')).length,
    send: G.troopSend | 0,
    cap: marchTroopCap(),
    dis: !!(document.getElementById('btnMarch') || {}).disabled,
    marchText: (document.getElementById('btnMarch') || {}).innerText || '',
    preview: (document.querySelector('#modalBody .tpv') || {}).innerText || '',
    now: (document.querySelector('#modalBody .tnow') || {}).textContent || '',
    overflow: (() => { const b = document.getElementById('modalBody'); return b ? b.scrollWidth > b.clientWidth + 2 : false; })(),
    far: !!(typeof P !== 'undefined' && P.far25 && P.far25.on)
  };
}

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ geolocation: HOME, permissions: ['geolocation'], viewport: { width: 472, height: 1024 } });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await boot(p);
  const ids = await world(p);

  const openHorde = async () => {
    await p.evaluate(id => { UI.closeModal(); UI.infoTile(id); }, ids.horde);
  };
  await openHorde();
  let s = await p.evaluate(counts);
  ok('horde hex has one slider, one count, one March', s.march === 1 && s.range === 1 && s.num === 1 && s.sel === 1 && s.intercept === 0, s);
  ok('stale hero prediction is not on the march card', s.predicted === 0, s);
  ok('phone card does not overflow', s.overflow === false, s);
  const face = await p.evaluate(() => document.querySelectorAll('#modalBody .ccbtn26 #btnMarch').length);
  ok('one March sits on the card face', face === 1, face);

  await p.screenshot({ path: '/opt/cursor/artifacts/march-one-phone.png' });

  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => { UI.open('base'); UI.close(); });
    await openHorde();
  }
  s = await p.evaluate(counts);
  ok('reopen and tab changes keep a single control', s.march === 1 && s.range === 1 && s.sel === 1, s);

  const setN = async (n) => p.evaluate(v => {
    const el = document.querySelector('#modalBody input.tnum');
    el.value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { send: G.troopSend, now: document.querySelector('.tnow').textContent, max: +document.querySelector('#trange').max, preview: document.querySelector('.tpv').innerText, btn: document.getElementById('btnMarch').innerText };
  }, n);
  const zero = await setN(0);
  ok('zero is an explicit count', zero.send === 0 && zero.now === '0', zero);
  const mid = await setN(1800);
  ok('mid count updates the one preview', mid.send === 1800 && /1,800/.test(mid.now) && /You /.test(mid.preview) && /each way/.test(mid.preview), mid);
  const max = await setN(3542);
  ok('max home count is selectable', max.send === 3542 && max.max === 3542, max);
  await p.evaluate(id => { TP().home = 5000; UI.closeModal(); UI.infoTile(id); }, ids.horde);
  const over = await setN(9000);
  ok('count above the march cap clamps', over.send === 4000 && over.max === 4000, over);
  const btnTimes = (max.btn.match(/\d+m \d+s/g) || []).length;
  ok('the March label has one duration, not two buttons', btnTimes === 2, max.btn);

  let calls = 0, got = null;
  await p.evaluate(() => {
    window.__sent = [];
    const cur = NET.addMarch.bind(NET);
    NET.addMarch = async function (d) { const id = await cur(d); window.__sent.push(d.troops); return id; };
    UI.ask = async () => true;
  });
  await p.evaluate(() => document.getElementById('btnMarch').click());
  await p.waitForTimeout(400);
  const sent = await p.evaluate(() => window.__sent);
  ok('one click dispatches the selected count once', sent.length === 1 && sent[0] === 4000, sent);
  calls = sent.length; got = sent[0];

  await p.setViewportSize({ width: 1280, height: 800 });
  Object.assign(ids, await world(p));
  await openHorde();
  s = await p.evaluate(counts);
  ok('desktop still has one control and no overflow', s.march === 1 && s.range === 1 && s.overflow === false, s);
  await p.screenshot({ path: '/opt/cursor/artifacts/march-one-desktop.png' });

  await p.evaluate(id => { UI.closeModal(); UI.infoSquad('dogs', 'sq1'); }, ids.squadHex);
  s = await p.evaluate(counts);
  ok('a moving squad has one Intercept and no second March', s.intercept === 1 && s.march === 0, s);

  await p.evaluate(id => { G.terr[id] = { uid: 'other', by: 'Toni', color: '#4ad7ff', t: Date.now() }; UI.closeModal(); UI.infoTile(id); }, ids.ally);
  s = await p.evaluate(counts);
  ok('a friendly hex has one March and the guard row', s.march === 1 && s.sel === 1 && /Patrol|no claim/.test(s.marchText) && s.guard === 1, s);

  await p.evaluate(id => { UI.closeModal(); UI.infoTile(id); }, ids.own);
  s = await p.evaluate(counts);
  ok('your own hex has one March', s.march === 1 && s.sel === 1 && s.guard >= 1, s);

  await p.evaluate(id => {
    TP().home = 0; UI.closeModal(); UI.infoTile(id);
  }, ids.horde);
  s = await p.evaluate(counts);
  ok('no troops at home keeps a visible disabled reason', s.march === 1 && s.dis && /No troops at home/.test(s.marchText), s);

  await p.evaluate(id => {
    TP().home = 3542;
    const me = hexAt(...G.pos).id;
    G.marches = {
      a: { uid: P.uid, state: 'out', kind: 'claim', from: me, to: id, startT: Date.now(), dur: 1e7 },
      b: { uid: P.uid, state: 'out', kind: 'claim', from: me, to: id, startT: Date.now(), dur: 1e7 }
    };
    UI.closeModal(); UI.infoTile(id);
  }, ids.horde);
  s = await p.evaluate(counts);
  ok('full march slots disable the one March with a reason', s.march === 1 && s.dis && /marches out|Max/.test(s.marchText), s);

  const noGps = await p.evaluate(id => {
    G.marches = {};
    G.pos = null;
    let threw = '';
    try { UI.closeModal(); UI.infoTile(id); } catch (e) { threw = e.message; }
    const tile = { threw, march: document.querySelectorAll('#btnMarch').length, text: (document.getElementById('btnMarch') || {}).innerText || '', dis: !!(document.getElementById('btnMarch') || {}).disabled };
    try { UI.closeModal(); UI.infoSquad('dogs', 'sq1'); } catch (e) { threw += e.message; }
    return { tile, squad: { threw, intercept: document.querySelectorAll('#btnIntercept').length, text: (document.getElementById('btnIntercept') || {}).innerText || '' } };
  }, ids.horde);
  ok('missing GPS does not throw and keeps a disabled March', !noGps.tile.threw && noGps.tile.march === 1 && noGps.tile.dis && /Waiting for GPS/.test(noGps.tile.text), noGps);
  ok('missing GPS keeps a disabled Intercept', noGps.squad.intercept === 1 && /Waiting for GPS/.test(noGps.squad.text), noGps.squad);

  await p.evaluate(() => { G.pos = [47.8135, -116.8968]; P.far25 = { on: true, anchor: null, since: 1 }; });
  await openHorde();
  s = await p.evaluate(counts);
  ok('remote-map flag still shows one March', s.march === 1 && s.range === 1 && s.far, s);

  console.log('pageerrors', errs.slice(0, 6));
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  console.log(failed ? 'FAILED ' + failed : 'ALL PASS', { calls, got });
  await b.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
