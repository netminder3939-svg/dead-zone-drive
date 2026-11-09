// TEST-host Stronghold choice. Local page only. No real account, no Firebase.
const { chromium } = require('playwright');
require('./bindlog').bind('sh-pick');
let failed = 0;
const ok = (n, c, e) => { if (!c) failed++; console.log((c ? 'PASS ' : 'FAIL ') + n + (e != null ? ' ' + JSON.stringify(e) : '')); };

async function boot(browser, flag) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    geolocation: { latitude: 47.8135, longitude: -116.8968, accuracy: 8 },
    permissions: ['geolocation']
  });
  if (flag) await ctx.addInitScript(() => { window.__shPickHost26 = true; });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:8767/?local', { waitUntil: 'load' });
  await page.fill('#obName', 'Ada');
  await page.fill('#obTeam', 'qacrew');
  await page.click('#obGo');
  await page.waitForFunction(() => typeof P !== 'undefined' && P && P.name, null, { timeout: 20000 });
  await page.evaluate(() => {
    const gate = document.getElementById('auth12'); if (gate) gate.remove();
    G.playLocked = false;
  });
  return { ctx, page, errs };
}

(async () => {
  const browser = await chromium.launch();
  const fresh = await boot(browser, true);
  const p = fresh.page;
  await p.evaluate(() => ensureStartSh26());
  await p.waitForSelector('#pick15', { timeout: 6000 });
  const opened = await p.evaluate(() => ({
    host: shPickHost26(),
    pick: G.pick15,
    sh: !!(W().sh && W().sh.state !== 'down'),
    bar: (document.getElementById('pick15') || {}).innerText || ''
  }));
  ok('a fresh test player is offered a site and is not given a Stronghold', opened.host === true && opened.pick === 'sh' && !opened.sh && /Tap a free hex/.test(opened.bar), opened);

  const sites = await p.evaluate(() => {
    const home = (G.pos && hexAt(...G.pos).id) || hexAt(47.8135, -116.8968).id;
    G.hq15 = { exists: true, leader: P.uid, roles: {}, titles: {}, hq: { hex: home, name: 'HQ', by: P.uid, byName: P.name, t: Date.now() } };
    G.al = G.al || { name: 'qacrew', members: {} };
    G.al.members[P.uid] = Object.assign({ name: P.name, me: true, defs: [] }, G.al.members[P.uid] || {});
    const [q, r] = idQR(home);
    let owned = null, building = null, neutral = null, other = null, far = null;
    for (let ring = 1; ring <= 80; ring++) {
      for (const x of hexRing(q, r, ring)) {
        if (hexDist(x.id, home) !== ring) continue;
        if (!owned && ring === 2) owned = x.id;
        else if (!building && ring === 2 && x.id !== owned) building = x.id;
        else if (!far && ring >= 8) { const why = startOk15(x.id); if (why && /mi/.test(why)) far = x.id; }
      }
    }
    G.terr[owned] = { uid: 'ally-pope', by: 'Pope', ai: false, t: 1 };
    G.al.members['ally-pope'] = { name: 'Pope', me: false, defs: [{ k: 'sh', hex: owned, r: 2, p: 50 }, { k: 'tower', hex: building, r: 1, p: 40 }] };
    for (let ring = 2; ring <= 20 && (!neutral || !other); ring++) {
      for (const x of hexRing(q, r, ring)) {
        if (hexDist(x.id, home) !== ring) continue;
        if (hexDist(x.id, owned) < 3 || hexDist(x.id, building) < 3) continue;
        if (startOk15(x.id)) continue;
        if (!neutral) neutral = x.id;
        else if (!other && x.id !== neutral) other = x.id;
      }
    }
    const snap = () => ({
      sh: (W().sh && W().sh.state !== 'down') ? W().sh.hex : null,
      owned: !!P.tiles[owned],
      building: !!P.tiles[building],
      neutral: !!P.tiles[neutral],
      claims: claimsToday().n,
      res: JSON.stringify(P.res)
    });
    const before = snap();
    const ownedWhy = startOk15(owned);
    const buildingWhy = startOk15(building);
    const neutralWhy = startOk15(neutral);
    const farWhy = startOk15(far);
    UI.infoTile(owned);
    UI.infoTile(building);
    confirmShPick26(owned);
    confirmShPick26(building);
    const afterInvalid = snap();
    const modal = (document.getElementById('modalBody') || {}).innerText || '';
    return { home, owned, building, neutral, other, far, before, afterInvalid, ownedWhy, buildingWhy, neutralWhy, farWhy, modal, pick: G.pick15 };
  });
  ok('an ally-owned site with no free confirmation is rejected', /teammate/.test(sites.ownedWhy) && sites.afterInvalid.sh == null && !sites.afterInvalid.owned, sites);
  ok('a teammate building on a hex is rejected too', /building/.test(sites.buildingWhy) && !sites.afterInvalid.building && !/Build here/.test(sites.modal), sites);
  ok('a neutral hex inside the HQ circle is acceptable', sites.neutralWhy == null && sites.neutral && sites.other, sites);
  ok('a hex outside the HQ circle is rejected and nothing was claimed or spent', /5 mi/.test(sites.farWhy) && sites.afterInvalid.claims === sites.before.claims && sites.afterInvalid.res === sites.before.res && sites.afterInvalid.sh == null, sites);

  const late = await p.evaluate(s => {
    G.dev.hold = true;
    G.gps.fallback = false;
    G.gps.state = 'ok';
    const [la, ln] = hexCenter(...idQR(s.owned));
    G.pos = [la, ln];
    ensureStartSh26();
    return { sh: (W().sh && W().sh.state !== 'down') ? W().sh.hex : null };
  }, sites);
  ok('a late GPS fix on the occupied hex still does not place a Stronghold', late.sh == null, late);

  const jumped = await p.evaluate(s => {
    pick15('sh');
    G.dev.tp = true;
    G.jump = false;
    const pos = G.pos.slice();
    const had = !!P.tiles[s.neutral];
    const [la, ln] = hexCenter(...idQR(s.neutral));
    map.fire('click', { latlng: L.latLng(la, ln) });
    return {
      posSame: pos[0] === G.pos[0] && pos[1] === G.pos[1],
      jump: !!G.jump,
      claimed: !!P.tiles[s.neutral] && !had,
      modal: (document.getElementById('modalBody') || {}).innerText || '',
      sh: (W().sh && W().sh.state !== 'down') ? W().sh.hex : null
    };
  }, sites);
  ok('choosing a neutral hex consumes the map click and does not teleport or claim', jumped.posSame && !jumped.jump && !jumped.claimed && /Stronghold here/.test(jumped.modal) && jumped.sh == null, jumped);

  await p.locator('#modalBody button', { hasText: 'Cancel' }).click();
  const cancelled = await p.evaluate(() => ({
    pick: G.pick15,
    hidden: document.getElementById('modal').classList.contains('hidden'),
    build: /Build here/.test((document.getElementById('modalBody') || {}).innerText || '') || !!document.querySelector('#modal:not(.hidden) button'),
    sh: !!(W().sh && W().sh.state !== 'down'),
    chip: !!document.getElementById('shPick26')
  }));
  ok('cancel closes the choice and does not place a Stronghold', cancelled.pick == null && cancelled.hidden && !cancelled.build && !cancelled.sh && cancelled.chip, cancelled);

  await p.evaluate(() => pick15('sh'));
  await p.evaluate(() => UI.open('base'));
  const left = await p.evaluate(() => ({ pick: G.pick15, sh: !!(W().sh && W().sh.state !== 'down') }));
  ok('leaving the map clears the pending site and does not place it', left.pick == null && !left.sh, left);

  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => typeof P !== 'undefined' && P && P.name, null, { timeout: 20000 });
  await p.evaluate(() => { const g = document.getElementById('auth12'); if (g) g.remove(); G.playLocked = false; });
  await p.waitForTimeout(1800);
  const reloaded = await p.evaluate(() => ({ sh: !!(W().sh && W().sh.state !== 'down'), host: shPickHost26() }));
  ok('reload after cancel still has no Stronghold', reloaded.host === true && !reloaded.sh, reloaded);

  const placed = await p.evaluate(s => {
    G.hq15 = { exists: true, leader: P.uid, roles: {}, titles: {}, hq: { hex: s.home, name: 'HQ', by: P.uid, byName: P.name, t: Date.now() } };
    G.al = G.al || { name: 'qacrew', members: {} };
    G.al.members['ally-pope'] = { name: 'Pope', me: false, defs: [{ k: 'sh', hex: s.owned, r: 2, p: 50 }, { k: 'tower', hex: s.building, r: 1, p: 40 }] };
    G.terr[s.owned] = { uid: 'ally-pope', by: 'Pope', ai: false, t: 1 };
    const before = { sh: (W().sh && W().sh.hex) || null, claims: claimsToday().n, res: JSON.stringify(P.res) };
    confirmShPick26(s.owned);
    confirmShPick26(s.building);
    const blocked = { sh: (W().sh && W().sh.state !== 'down') ? W().sh.hex : null, claims: claimsToday().n, res: JSON.stringify(P.res) };
    confirmShPick26(s.neutral);
    const hex = (W().sh && W().sh.hex) || null;
    const tiles = Object.keys(P.tiles).length;
    const claims = claimsToday().n;
    confirmShPick26(s.neutral);
    const copy = JSON.parse(JSON.stringify(W().sh));
    delete W().sh;
    G._shCommit26 = copy.hex;
    confirmShPick26(s.other);
    const locked = !W().sh;
    W().sh = copy;
    return { before, blocked, hex, owned: !!P.tiles[s.owned], building: !!P.tiles[s.building], neutral: !!P.tiles[s.neutral], tiles, claims, again: Object.keys(P.tiles).length, againClaims: claimsToday().n, locked, restored: W().sh.hex };
  }, sites);
  ok('occupied and built hexes still cannot be confirmed after reload', placed.blocked.sh == null && placed.blocked.claims === placed.before.claims && placed.blocked.res === placed.before.res, placed);
  ok('one confirm places the neutral site and a second confirm does not claim it again', placed.hex === sites.neutral && placed.neutral && placed.again === placed.tiles && placed.againClaims === placed.claims && placed.locked && placed.restored === sites.neutral, placed);

  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => typeof P !== 'undefined' && P && P.name && P.world && P.world.sh, null, { timeout: 20000 });
  const kept = await p.evaluate(s => ({ hex: W().sh && W().sh.hex, same: W().sh && W().sh.hex === s.neutral }), sites);
  ok('reload keeps the confirmed site', kept.same, kept);

  const parked = await boot(browser, true);
  const stay = await parked.page.evaluate(() => {
    const home = hexAt(47.8135, -116.8968).id;
    W().sh = { hex: home, hpPct: 1, state: 'up', buildEnd: 0, everBuilt: true };
    P.stronghold = { level: 1 };
    P.startSh26 = 0;
    P.startShMoved26 = 0;
    G.al = { name: 'qacrew', members: { 'ally-pope': { name: 'Pope', me: false, defs: [{ k: 'sh', hex: home, r: 2, p: 50 }] } } };
    G.dev.hold = true;
    G.gps.state = 'ok';
    G.gps.fallback = false;
    G.pos = [48.6917, -116.3165];
    ensureStartSh26();
    return { hex: W().sh.hex, moved: P.startShMoved26 || 0, chip: !!document.getElementById('shPick26'), pick: G.pick15 };
  });
  await parked.page.waitForTimeout(1800);
  const stay2 = await parked.page.evaluate(() => ({ hex: W().sh && W().sh.hex, moved: P.startShMoved26 || 0 }));
  ok('an already placed Stronghold is not moved off an overlap', stay.hex === stay2.hex && stay.moved === 0 && stay2.moved === 0 && !stay.chip && stay.pick !== 'sh', { stay, stay2 });

  const imported = await parked.page.evaluate(() => {
    delete W().sh;
    P.startSh26 = 1;
    P.startShMoved26 = 0;
    G.pick15 = null;
    G._shOffer26 = 1;
    try { pickBar15(); } catch (e) {}
    try { shPickChip26(); } catch (e) {}
    ensureStartSh26();
    return { sh: !!(W().sh && W().sh.state !== 'down'), pick: G.pick15 };
  });
  await parked.page.waitForTimeout(1800);
  const imported2 = await parked.page.evaluate(() => ({ sh: !!(W().sh && W().sh.state !== 'down'), pick: G.pick15 }));
  ok('an imported placement flag does not start a second Stronghold', !imported.sh && !imported2.sh && imported2.pick == null, { imported, imported2 });

  const live = await boot(browser, false);
  const auto = await live.page.evaluate(() => {
    G.playLocked = false;
    G.dev.hold = true;
    if (!G.pos) G.pos = [47.8135, -116.8968];
    G.gps.state = 'ok';
    G.gps.fallback = false;
    const host = shPickHost26();
    ensureStartSh26();
    return { host, sh: !!(W().sh && W().sh.state !== 'down'), hex: W().sh && W().sh.hex };
  });
  ok('the local demo still places a Stronghold by itself', auto.host === false && auto.sh, auto);

  ok('no page errors on the fresh choice', fresh.errs.length === 0, fresh.errs.slice(0, 3));
  ok('no page errors on the already placed character', parked.errs.length === 0, parked.errs.slice(0, 3));
  ok('no page errors on the local demo', live.errs.length === 0, live.errs.slice(0, 3));
  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
