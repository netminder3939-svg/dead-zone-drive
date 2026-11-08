const { execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
function sha(path) {
  try { return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'); }
  catch (e) { return 'missing'; }
}
function bind(name, extra) {
  let commit = process.env.GIT_COMMIT || '';
  try { commit = commit || execSync('git rev-parse HEAD', { cwd: process.cwd(), encoding: 'utf8' }).trim(); } catch (e) {}
  let cache = '';
  try { cache = (fs.readFileSync('public/sw.js', 'utf8').match(/const C='([^']+)'/) || [])[1] || ''; } catch (e) {}
  const row = {
    test: name,
    commit,
    cache,
    rules12g: sha('rules/preview-auth-rules-12g.rules'),
    rules12i: sha('rules/preview-auth-rules-12i.rules'),
    command: process.argv.join(' '),
    node: process.version,
    host: os.hostname(),
    time: new Date().toISOString(),
    ...extra
  };
  console.log('BIND ' + JSON.stringify(row));
  return row;
}
module.exports = { bind, sha };
