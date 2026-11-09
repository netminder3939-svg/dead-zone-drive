// Left march list tuck. Presentation only. Local page, no account.
const { chromium, devices } = require('playwright');
require('./bindlog').bind('march-panel');
let failed = 0;
const ok = (n, c, e) => { if (!c) failed++; console.log((c ? 'PASS ' : 'FAIL ') + n + (e != null ? ' ' + JSON.stringify(e) : '')); };

async function boot(browser, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:8767/?local', { waitUntil: 'load' });
  await page.fill('#obName', 'Ada');
  await page.fill('#obTeam', 'qacrew');
  await page.click('#obGo');
  await page.waitForFunction(() => typeof P !== 'undefined' && P && P.world, null, { timeout: 20000 });
  await page.evaluate(() => {
    const gate = document.getElementById('auth12'); if (gate) gate.remove();
    G.playLocked = false;
    G.marches = {};
    const t = TP();
    t.away = {}; t.returning = []; t.queue = []; t.esc25 = {}; t.stationed = {};
    try { localStorage.removeItem('wl_mcOpen'); } catch (e) {}
    mcardsDraw();
  });
  return { ctx, page, errs };
}

(async () => {
  const browser = await chromium.launch();
  const desk = await boot(browser, {
    viewport: { width: 1280, height: 800 },
    geolocation: { latitude: 47.8135, longitude: -116.8968, accuracy: 8 },
    permissions: ['geolocation']
  });
  const p = desk.page;
  const empty = await p.evaluate(() => {
    const box = document.getElementById('mcards');
    const btn = document.getElementById('mcToggle');
    return {
      text: box.innerText,
      open: btn.getAttribute('aria-expanded'),
      label: btn.getAttribute('aria-label'),
      controls: btn.getAttribute('aria-controls'),
      shut: box.classList.contains('mc-shut')
    };
  });
  ok('zero marches shows the empty slots and an expanded arrow', /regular slot/.test(empty.text) && /SUPPORT/.test(empty.text) && empty.open === 'true' && empty.label === 'Hide marches' && empty.controls === 'mcards' && !empty.shut, empty);

  await p.evaluate(() => {
    window.__spy = { map: 0, recall: 0, send: 0 };
    map.on('click', () => { window.__spy.map++; });
    const rec = window.recallStation, send = window.sendMarch;
    window.recallStation = function () { window.__spy.recall++; return rec && rec.apply(this, arguments); };
    window.sendMarch = function () { window.__spy.send++; return send && send.apply(this, arguments); };
  });
  const center = await p.evaluate(() => map.getCenter());
  const marchesBefore = await p.evaluate(() => Object.keys(G.marches).length);
  await p.click('#mcToggle');
  const shut = await p.evaluate(c => {
    const box = document.getElementById('mcards');
    const btn = document.getElementById('mcToggle');
    const here = map.getCenter();
    return {
      shut: box.classList.contains('mc-shut'),
      open: btn.getAttribute('aria-expanded'),
      label: btn.getAttribute('aria-label'),
      pref: localStorage.getItem('wl_mcOpen'),
      pe: getComputedStyle(box).pointerEvents,
      map: window.__spy.map,
      recall: window.__spy.recall,
      send: window.__spy.send,
      marches: Object.keys(G.marches).length,
      centerSame: Math.abs(here.lat - c.lat) < 1e-8 && Math.abs(here.lng - c.lng) < 1e-8,
      saved: !/save\(/.test(mcToggle26.toString())
    };
  }, center);
  ok('the arrow tucks the list without a recall, dispatch, or map click', shut.shut && shut.open === 'false' && shut.label === 'Show marches' && shut.pref === '0' && shut.pe === 'none' && shut.map === 0 && shut.recall === 0 && shut.send === 0 && shut.marches === marchesBefore && shut.centerSame && shut.saved, shut);

  await p.waitForTimeout(1200);
  const held = await p.evaluate(() => document.getElementById('mcards').classList.contains('mc-shut') && localStorage.getItem('wl_mcOpen') === '0');
  ok('a redraw keeps the list tucked', held, held);

  const ticking = await p.evaluate(() => {
    const home = (G.pos && hexAt(...G.pos).id) || hexAt(47.8135, -116.8968).id;
    const [q, r] = idQR(home);
    const to = hexRing(q, r, 2).find(x => hexDist(x.id, home) === 2).id;
    const dur = 120000;
    G.marches = { m1: { uid: P.uid, from: home, to, startT: Date.now() - 5000, dur, state: 'out', kind: 'claim', troops: 1000 } };
    TP().away = { m1: 1000 };
    mcardsDraw();
    const text = document.getElementById('mcards').innerText;
    const first = (document.querySelector('#mcards .l3') || {}).textContent || '';
    G.marches.m1.startT -= 45000;
    mcardsDraw();
    const second = (document.querySelector('#mcards .l3') || {}).textContent || '';
    return { text, first, second, still: document.getElementById('mcards').classList.contains('mc-shut') };
  });
  ok('an outbound march keeps its timer while the list is tucked', /Claim|MARCHING|arrives/.test(ticking.text + ticking.first) && ticking.first !== ticking.second && /arrives/.test(ticking.second) && ticking.still, ticking);

  await p.click('#mcToggle');
  const back = await p.evaluate(() => {
    const home = (G.pos && hexAt(...G.pos).id) || hexAt(47.8135, -116.8968).id;
    const [q, r] = idQR(home);
    const to = hexRing(q, r, 2).find(x => hexDist(x.id, home) === 2).id;
    const dur = 120000;
    const now = Date.now();
    G.marches = {
      m1: { uid: P.uid, from: home, to, startT: now - dur - 20000, dur, state: 'out', kind: 'claim', troops: 800 },
      m2: { uid: P.uid, from: home, to, startT: now - 5000, dur, state: 'out', kind: 'patrol', troops: 200 }
    };
    TP().away = { m1: 800, m2: 200 };
    mcardsDraw();
    const btn = document.getElementById('mcToggle');
    return { text: document.getElementById('mcards').innerText, open: btn.getAttribute('aria-expanded'), label: btn.getAttribute('aria-label') };
  });
  ok('expanding shows a returning march and a support march', back.open === 'true' && back.label === 'Hide marches' && /RETURNING/.test(back.text) && /SUPPORT/.test(back.text) && /Patrol|DEFENDING/.test(back.text), back);

  const phone = await boot(browser, {
    ...devices['iPhone 13'],
    geolocation: { latitude: 47.8135, longitude: -116.8968, accuracy: 8 },
    permissions: ['geolocation']
  });
  const reach = await phone.page.evaluate(() => {
    mcardsDraw();
    const btn = document.getElementById('mcToggle');
    const tabs = document.getElementById('tabs').getBoundingClientRect();
    const a = btn.getBoundingClientRect();
    return {
      open: btn.getAttribute('aria-expanded'),
      label: btn.getAttribute('aria-label'),
      top: a.top, bottom: a.bottom, left: a.left, width: a.width, height: a.height,
      nav: tabs.top, vw: innerWidth
    };
  });
  ok('on a phone the arrow starts visible and stays above the bottom nav', reach.vw < 1100 && reach.open === 'false' && reach.label === 'Show marches' && reach.width >= 44 && reach.height >= 44 && reach.left >= 0 && reach.top >= 0 && reach.bottom <= reach.nav - 4, reach);
  await phone.page.click('#mcToggle');
  const phoneOpen = await phone.page.evaluate(() => {
    const btn = document.getElementById('mcToggle').getBoundingClientRect();
    const nav = document.getElementById('tabs').getBoundingClientRect().top;
    const text = document.getElementById('mcards').innerText;
    const spy = { map: 0 };
    map.on('click', () => { spy.map++; });
    document.getElementById('mcToggle').click();
    document.getElementById('mcToggle').click();
    return { text, bottom: btn.bottom, nav, map: spy.map, open: document.getElementById('mcToggle').getAttribute('aria-expanded') };
  });
  ok('the phone arrow still clears the nav when the empty list is open, and does not tap the map', /regular slot/.test(phoneOpen.text) && phoneOpen.bottom <= phoneOpen.nav - 4 && phoneOpen.map === 0, phoneOpen);

  ok('no page errors on the march list', desk.errs.length === 0 && phone.errs.length === 0, desk.errs.concat(phone.errs).slice(0, 3));
  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
