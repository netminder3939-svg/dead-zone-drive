// Preview team prefix. No Firebase. Proves the runtime guard, not a live write.
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('public/preview.js', 'utf8');
let failed = 0;
const ok = (n, c, e) => { if (!c) failed++; console.log((c ? 'PASS ' : 'FAIL ') + n + (e != null ? ' ' + JSON.stringify(e) : '')); };

function Storage() {}
Storage.prototype.getItem = function (k) { return Object.prototype.hasOwnProperty.call(this._s, k) ? this._s[k] : null; };
Storage.prototype.setItem = function (k, v) { this._s[k] = String(v); };
function run(host, team) {
  const ls = new Storage();
  ls._s = { wl_team: team };
  const document = { body: { appendChild: () => {} }, getElementById: () => null, addEventListener: () => {}, createElement: () => ({ style: {}, appendChild: () => {} }) };
  const ctx = { location: { hostname: host }, window: {}, localStorage: ls, document, Storage };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const boot = ls.getItem('wl_team');
  ls.setItem('wl_team', 'rathdrum-crew');
  return { boot, team: ls.getItem('wl_team'), preview: !!ctx.DZD_PREVIEW };
}

const pv = run('dead-zone-drive--test-abc.web.app', 'rathdrum-crew');
ok('a preview host prefixes the live team code', pv.preview === true && pv.boot === 'pv-rathdrum-crew' && pv.team === 'pv-rathdrum-crew', pv);
const again = run('dead-zone-drive--test-abc.web.app', 'pv-rathdrum-crew');
ok('an already prefixed team is not doubled', again.boot === 'pv-rathdrum-crew' && again.team === 'pv-rathdrum-crew', again);
const live = run('dead-zone-drive.web.app', 'rathdrum-crew');
ok('the live host does not rewrite the team code', live.preview !== true && live.team === 'rathdrum-crew', live);
const wipe = fs.readFileSync('public/wipe11.js', 'utf8');
ok('preview wipe requires a pv- team and a preview host before any delete', /if\(!\/\^pv-\/\.test\(NET\.team\|\|''\)\|\|!location\.hostname\.includes\('--'\)\)return/.test(wipe));
console.log(failed ? 'FAILED ' + failed : 'ALL PASS');
process.exit(failed ? 1 : 0);
