// Enemy-fort march gate. A fort blocks only its own hex. A zone fort does not block the other hexes.
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
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8767/?local', { waitUntil: 'load' });
  await p.fill('#obName', 'Diag');
  await p.fill('#obTeam', 'rathdrum-crew');
  await p.click('#obGo');
  await p.waitForFunction(() => /GPS ±/.test((document.getElementById('gpschip') || {}).textContent || ''), null, { timeout: 20000 });

  const found = await p.evaluate(() => {
    G.playLocked = false;
    const gate = document.getElementById('auth12'); if (gate) gate.style.display = 'none';
    W();
    const me = hexAt(...G.pos);
    const open = id => !enemyAt(id) && !factionAt(id) && !P.tiles[id] && !(G.terr[id] && !G.terr[id].released);
    const S = ZONE.step, iq = Math.round(me.q / S), ir = Math.round(me.r / S);
    let fort = null, neutral = null, zoneForts = 0, zid = null;
    for (let di = -4; di <= 4 && !neutral; di++) for (let dj = -4; dj <= 4 && !neutral; dj++) {
      const idz = 'Z' + ((iq + di) * S) + '_' + ((ir + dj) * S);
      const hs = zoneHexes(idz);
      const f = hs.find(h => enemyAt(h) && !W().enemyTaken[h]);
      const n = hs.filter(h => h !== f && open(h)).sort((a, b) => hexDist(me.id, a) - hexDist(me.id, b))[0];
      if (f && n) { fort = f; neutral = n; zid = idz; zoneForts = zoneState(idz).forts; }
    }
    let ally = null;
    for (let ring = 1; ring <= 8 && !ally; ring++) {
      for (const x of hexRing(me.q, me.r, ring)) if (open(x.id)) { ally = x.id; break; }
    }
    return { fort, neutral, ally, zoneForts, zid, me: me.id };
  });
  ok('found an enemy fort and a neutral hex in that zone', !!found.fort && !!found.neutral && found.zoneForts >= 1, found);

  const neutral = await p.evaluate((id) => {
    W(); barracks().level = 2; TP().home = 3542; TP().stationed = {};
    UI.closeModal(); UI.infoTile(id);
    const text = (document.getElementById('modalBody') || {}).innerText || '';
    const why = canMarch(id);
    return { why, text: text.slice(0, 500), march: (document.getElementById('btnMarch') || {}).innerText || '', dis: !!(document.getElementById('btnMarch') || {}).disabled };
  }, found.neutral);
  ok('neutral hex in a zone with a fort is not an enemy fort', neutral.why !== 'Enemy fort: attack it in person', neutral);
  ok('neutral card offers a claim march and does not mention an enemy fort', /Claim this open ground/.test(neutral.march) && !/attack it in person|Enemy fort/.test(neutral.text + neutral.march), neutral);

  const fortCard = await p.evaluate(async (id) => {
    W(); P.lvl = 1; TP().home = 4000; G.troopSend = 0; G.marches = {};
    UI.ask = async () => true;
    UI.closeModal(); UI.infoTile(id);
    const text = (document.getElementById('modalBody') || {}).innerText || '';
    const why = canMarch(id);
    const setN = (n) => { const el = document.querySelector('#modalBody input.tnum'); if (!el) return ''; el.value = String(n); el.dispatchEvent(new Event('input', { bubbles: true })); return (document.querySelector('#modalBody .tpv') || {}).innerText || ''; };
    const low = setN(0), high = setN(3000);
    const you = s => { const m = /You ([\d,]+)/.exec(s || ''); return m ? +m[1].replace(/,/g, '') : null; };
    const them = s => { const m = /Them ([\d,]+)/.exec(s || ''); return m ? +m[1].replace(/,/g, '') : null; };
    const sent = [];
    const add = NET.addMarch.bind(NET);
    NET.addMarch = async function (d) { const mid = await add(d); sent.push({ id: mid, to: d.to, troops: d.troops }); return mid; };
    const btn = document.getElementById('btnMarch');
    if (btn && !btn.disabled) btn.click();
    await new Promise(r => setTimeout(r, 300));
    return {
      why, title: text.slice(0, 500),
      attack: [...document.querySelectorAll('#modalBody button')].some(b => /Attack/.test(b.textContent)),
      march: (btn || {}).innerText || '',
      dis: !!(btn && btn.disabled),
      lowYou: you(low), highYou: you(high), them: them(high),
      sent
    };
  }, found.fort);
  ok('a reachable fort can be marched', fortCard.why == null && !fortCard.dis && /March/.test(fortCard.march), fortCard);
  ok('the fort card shows the stronghold and real defenders for the selected troops', /Raider Stronghold/.test(fortCard.title) && fortCard.them > 0 && fortCard.highYou > fortCard.lowYou, fortCard);
  ok('the march button dispatches at the fort', fortCard.sent.length === 1 && fortCard.sent[0].to === found.fort && fortCard.sent[0].troops > 0, fortCard);
  await p.screenshot({ path: '/opt/cursor/artifacts/fort-hex-phone.png' });

  const fought = await p.evaluate(async (fort) => {
    const adj = hexRing(...idQR(fort), 1).map(x => x.id).find(id => id !== fort && !enemyAt(id));
    const beyond = hexRing(...idQR(fort), 2).map(x => x.id).find(id => {
      const line = claimRoute26(adj, id);
      const i = line.indexOf(fort);
      return i > 1 && i < line.length - 1;
    });
    const scrap0 = () => P.res.scrap | 0;
    const gear0 = () => (P.inv || []).length;
    const march = (from, to, troops) => ({ uid: P.uid, name: P.name, from, to, startT: Date.now() - 5000, dur: 1000, state: 'out', troops, unit: frozenMe(), power: 10, escorts: {} });
    async function arrive(id, m) { G._mBusy = {}; await resolveMarch(id, m); return m; }
    P.lvl = 1; TP().home = 0; W().enemyTaken = {}; P.tiles = {}; P.marchDone = {};
    const beforeLoss = { scrap: scrap0(), gear: gear0(), tiles: Object.keys(P.tiles).length };
    const loss = await arrive('loss1', march(adj, beyond || fort, 0));
    const afterLoss = { scrap: scrap0(), gear: gear0(), taken: !!(W().enemyTaken || {})[fort], tiles: Object.keys(P.tiles), claimedFort: !!(P.tiles || {})[fort], beyond: beyond && !!(P.tiles || {})[beyond], result: loss.result || '' };
    P.lvl = 1; TP().home = 8000; W().enemyTaken = {}; P.tiles = {}; P.marchDone = {};
    const beforeWin = { scrap: scrap0(), gear: gear0() };
    const win = await arrive('win1', march(adj, fort, 8000));
    const ring = hexRing(...idQR(fort), 1).map(x => x.id);
    const afterWin = { scrap: scrap0(), gear: gear0(), taken: !!W().enemyTaken[fort], ringHeld: ring.filter(id => P.tiles[id]).length, result: win.result || '' };
    const snap = { scrap: afterWin.scrap, gear: afterWin.gear, tiles: Object.keys(P.tiles).length };
    await arrive('win1', march(adj, fort, 8000));
    const dup = { scrap: scrap0(), gear: gear0(), tiles: Object.keys(P.tiles).length, taken: !!W().enemyTaken[fort] };
    W().enemyTaken[fort] = 1; const staleScrap = scrap0(); P.tiles = {}; P.marchDone = {};
    const stale = await arrive('stale1', march(adj, fort, 8000));
    return {
      beyond, adj,
      loss: { beforeLoss, afterLoss, win: loss.win },
      win: { beforeWin, afterWin, flag: win.win },
      dup: { snap, dup },
      stale: { scrap: scrap0(), staleScrap, takenAt: W().enemyTaken[fort], result: stale.result || '', tiles: Object.keys(P.tiles).length }
    };
  }, found.fort);
  ok('a lost fort fight does not capture it or the hexes beyond it', fought.loss.afterLoss.taken === false && fought.loss.afterLoss.claimedFort === false && fought.loss.afterLoss.beyond === false && fought.loss.afterLoss.scrap === fought.loss.beforeLoss.scrap, fought.loss);
  ok('a won march captures the fort once with the existing ring reward', fought.win.afterWin.taken === true && fought.win.afterWin.ringHeld === 7 && fought.win.afterWin.scrap > fought.win.beforeWin.scrap && fought.win.afterWin.gear === fought.win.beforeWin.gear + 1, fought.win);
  ok('resolving the same win again does not pay or claim twice', fought.dup.dup.scrap === fought.dup.snap.scrap && fought.dup.dup.gear === fought.dup.snap.gear && fought.dup.dup.tiles === fought.dup.snap.tiles, fought.dup);
  ok('a fort taken before arrival is not captured again', fought.stale.scrap === fought.stale.staleScrap && fought.stale.takenAt === 1 && fought.stale.tiles === 0, fought.stale);
  const overlap = await p.evaluate(async (fort) => {
    const adj = hexRing(...idQR(fort), 1).map(x => x.id).find(id => id !== fort && !enemyAt(id));
    const beyond = hexRing(...idQR(fort), 3).map(x => x.id).find(id => { const line = claimRoute26(adj, id); const i = line.indexOf(fort); return i > 0 && i < line.length - 1; });
    W().enemyTaken = {}; P.tiles = {}; P.marchDone = {}; G._fortQ = {}; TP().home = 8000;
    const line = (typeof claimRoute26 === 'function' ? claimRoute26(adj, beyond || fort) : [adj, fort]);
    for (const id of line) { delete P.tiles[id]; if (G.terr && G.terr[id] && !G.terr[id].ai) delete G.terr[id]; }
    delete W().enemyTaken[fort];
    const scrap = () => P.res.scrap | 0, gear = () => P.inv.length;
    const mk = (id, troops) => ({ uid: P.uid, name: P.name, from: adj, to: beyond || fort, startT: Date.now() - 5000, dur: 1000, state: 'out', troops, unit: frozenMe(), power: 10, escorts: {} });
    const a = mk('ovA', 0), b = mk('ovB', 8000);
    const s0 = scrap(), g0 = gear();
    const p1 = resolveMarch('ovA', a);
    const p2 = resolveMarch('ovB', b);
    await p1; await p2;
    const beyondOwned = beyond ? !!(P.tiles[beyond]) : false;
    return { scrap: scrap() - s0, gear: gear() - g0, taken: !!W().enemyTaken[fort], beyondOwned, aResult: a.result || '', bResult: b.result || '' };
  }, found.fort);
  ok('overlapping arrivals capture the fort once', overlap.taken && overlap.gear === 1 && overlap.scrap === 204, overlap);

  const friendly = await p.evaluate((id) => {
    W().enemyTaken[id] = Date.now();
    delete P.tiles[id];
    UI.closeModal(); UI.infoTile(id);
    const text = (document.getElementById('modalBody') || {}).innerText || '';
    const why = canMarch(id);
    return { why, stronghold: /Raider Stronghold/.test(text), invite: /Nobody holds it yet/.test(text) };
  }, found.fort);
  ok('a captured fort is not blocked as an enemy fort', friendly.why !== 'Enemy fort: attack it in person' && !friendly.stronghold, friendly);

  const ally = await p.evaluate((id) => {
    G.terr[id] = { uid: 'other', by: 'Toni', color: '#4ad7ff', t: Date.now() };
    UI.closeModal(); UI.infoTile(id);
    const text = (document.getElementById('modalBody') || {}).innerText || '';
    return { why: canMarch(id), text: text.slice(0, 300) };
  }, found.ally);
  ok('an ally hex is not called an enemy fort', ally.why !== 'Enemy fort: attack it in person' && /Toni|ally|Patrol|March/.test(ally.text), ally);

  const march = await p.evaluate((id) => {
    delete G.terr[id];
    W(); barracks().level = 2; TP().home = 3542; TP().stationed = {};
    G.marches = {}; G.troopSend = 400;
    const me = hexAt(...G.pos);
    let near = id;
    if (canMarch(near)) {
      outer: for (let ring = 1; ring <= 15; ring++) for (const x of hexRing(me.q, me.r, ring)) {
        if (!enemyAt(x.id) && !factionAt(x.id) && !P.tiles[x.id] && canMarch(x.id) == null) { near = x.id; break outer; }
      }
    }
    const sent = [];
    const add = NET.addMarch.bind(NET);
    NET.addMarch = async function (d) { const id = await add(d); sent.push(d.troops); return id; };
    UI.ask = async () => true;
    UI.closeModal(); UI.infoTile(near);
    const btn = document.getElementById('btnMarch');
    if (btn && !btn.disabled) btn.click();
    return new Promise(res => setTimeout(() => res({
      sent, near, dis: !!(btn && btn.disabled), why: canMarch(near), text: (btn || {}).innerText || ''
    }), 400));
  }, found.neutral);
  ok('a normal march on the neutral hex dispatches once', march.sent.length === 1 && march.sent[0] > 0 && march.why == null, march);

  console.log('pageerrors', errs.slice(0, 4));
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  await b.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
