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

  const fortCard = await p.evaluate((id) => {
    const before = Object.keys(P.tiles).length;
    UI.closeModal(); UI.infoTile(id);
    const text = (document.getElementById('modalBody') || {}).innerText || '';
    const why = canMarch(id);
    let sent = 0;
    const add = NET.addMarch.bind(NET);
    NET.addMarch = async function (d) { sent++; return add(d); };
    return sendMarch(id).then(() => ({
      why, sent, tiles: Object.keys(P.tiles).length, before,
      title: text.slice(0, 700),
      attack: [...document.querySelectorAll('#modalBody button')].some(b => /Attack/.test(b.textContent)),
      ownerFree: /Nobody \(free\)/.test(text),
      invite: /send a 🚩 March, to claim/.test(text) || /Walk or drive in, or send/.test(text),
      predNoDef: /no defenders/.test(text)
    }));
  }, found.fort);
  ok('the fort hex itself is refused', fortCard.why === 'Enemy fort: attack it in person', fortCard);
  ok('opening that hex shows the stronghold, not a free claim', /Raider Stronghold/.test(fortCard.title) && fortCard.attack && !fortCard.invite && !fortCard.ownerFree && !fortCard.predNoDef, fortCard);
  await p.screenshot({ path: '/opt/cursor/artifacts/fort-hex-phone.png' });
  ok('sending a march does not capture the fort', fortCard.sent === 0 && fortCard.tiles === fortCard.before, fortCard);

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
