// Preview hostname resolved only to this machine. Firebase calls are the local fake. No live project.
const { chromium } = require('playwright');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const H = require('./two-device/two.js');
require('./bindlog').bind('preview-runtime', { fake: H.FB, preview: 'dead-zone-drive--test-edax914d.web.app' });
const HOST = 'dead-zone-drive--test-edax914d.web.app';
const PORT = 8788;
const FB = H.FB;
let failed = 0;
const ok = (n, c, e) => { if (!c) failed++; console.log((c ? 'PASS ' : 'FAIL ') + n + (e != null ? ' ' + JSON.stringify(e) : '')); };
function server() {
  const dir = '/tmp/dzd-preview-cert';
  fs.mkdirSync(dir, { recursive: true });
  const key = path.join(dir, 'key.pem'), cert = path.join(dir, 'cert.pem');
  spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-keyout', key, '-out', cert, '-days', '1', '-nodes', '-subj', '/CN=' + HOST], { stdio: 'ignore' });
  const mime = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  const srv = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, (req, res) => {
    const u = new URL(req.url, 'https://localhost');
    let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    const root = path.join(process.cwd(), 'public');
    const file = path.join(root, rel);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(buf);
    });
  });
  srv.listen(PORT, '127.0.0.1');
  return srv;
}
async function dump() { return (await fetch(FB + '/dump')).json(); }
async function open(browser, team) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 430, height: 900 }, geolocation: { latitude: 47.81, longitude: -116.89 }, permissions: ['geolocation'] });
  const seen = [];
  await ctx.route('**/*', route => {
    const u = route.request().url();
    seen.push(u);
    if (/firebase-(app|auth|firestore)\.js/.test(u)) {
      const m = u.match(/firebase-(app|auth|firestore)\.js/)[1];
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: `export * from '${FB}/fake-${m}.js';` });
    }
    if (/googleapis|identitytoolkit|firebaseio|gstatic|tile\.openstreetmap|arcgis|carto/.test(u)) return route.abort();
    return route.continue();
  });
  const p = await ctx.newPage();
  await p.goto(`https://${HOST}:${PORT}/?team=${encodeURIComponent(team)}`, { waitUntil: 'load' });
  const named = await p.isVisible('#obName').catch(() => false);
  if (named) {
    await p.fill('#obName', 'PreviewFixture');
    await p.click('text=Enter the Wastes');
  }
  await H.signIn(p, 'preview-fixture@example.test', 'secret123', 'up');
  await H.choose(p, 'fresh');
  await H.ready(p);
  await p.evaluate(() => NET.claimHex('4_4', { by: P.name, uid: P.uid, t: 1, ai: false }));
  await p.waitForTimeout(500);
  const net = await p.evaluate(() => ({ team: NET.team, base: NET.base, stored: localStorage.getItem('wl_team'), mode: NET.mode }));
  await ctx.close();
  return { net, seen };
}
(async () => {
  await fetch(FB + '/reset', { method: 'POST' });
  const web = server();
  await new Promise(r => setTimeout(r, 400));
  const browser = await chromium.launch({ args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1`] });
  const cases = [
    ['rathdrum-crew', 'pv-rathdrum-crew'],
    ['Rathdrum-Crew', 'pv-rathdrum-crew'],
    ['pv-rathdrum-crew', 'pv-rathdrum-crew'],
    ['../rathdrum-crew', 'pv-rathdrum-crew'],
    ['rathdrum-crew/../../teams/other', 'pv-rathdrum-crewteamsother'],
    ['other-crew', 'pv-other-crew']
  ];
  const outside = [];
  for (const [input, expect] of cases) {
    await fetch(FB + '/reset', { method: 'POST' });
    const { net, seen } = await open(browser, input);
    const docs = (await dump()).docs || {};
    const paths = Object.keys(docs);
    const bad = paths.filter(p => !p.startsWith('teams/' + expect + '/'));
    const live = paths.filter(p => p.startsWith('teams/rathdrum-crew/'));
    const leaked = seen.filter(u => /firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|firebaseio\.com/.test(u));
    if (bad.length || live.length || leaked.length || net.team !== expect) outside.push({ input, expect, net, bad, live, leaked: leaked.slice(0, 3), paths: paths.slice(0, 8) });
    ok('preview team ' + JSON.stringify(input) + ' stays inside teams/' + expect, net.team === expect && net.base && net.base.join('/') === 'teams/' + expect && bad.length === 0 && live.length === 0 && leaked.length === 0 && paths.some(p => p.startsWith('teams/' + expect + '/territory/')), { net, paths: paths.length, bad, live, leaked: leaked.length });
  }
  await browser.close();
  web.close();
  console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
