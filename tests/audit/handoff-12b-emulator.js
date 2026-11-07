// Firestore emulator only. Project id is demo-. No production host and no shared rules publish.
const {initializeTestEnvironment, assertFails, assertSucceeds} = require('@firebase/rules-unit-testing');
const {doc, setDoc, getDoc} = require('firebase/firestore');
const fs = require('fs');
const path = require('path');
const S = require('../../js/sync26.js');
let fail = 0;
function ok(c, m){ if(!c){ console.error('FAIL', m); fail++; } else console.log('ok', m); }
function body(profile, rev, extra){
  return Object.assign({
    data: JSON.stringify(profile), rev: rev, savedAt: Date.now(),
    name: profile.name || 'pope', lvl: profile.lvl || 1, fe: 0
  }, extra || {});
}
function prof(extra){
  return Object.assign({
    name:'pope', lvl:6, xp:10, hp:100, _rev:1,
    res:{scrap:400, food:300, water:200, fuel:90, parts:70},
    tiles:{a:{t:1}}, troops:{home:1000, queue:[], away:{}, wounded:0, healing:[]},
    world:{sh:{hex:'1_1', state:'up'}, barracks:{level:1}, outposts:{}, towers:{}},
    pipeUnlock26:{}, stats:{meters:1, kills:0}, stronghold:{level:6},
    sync26:{clock:{}, ops:[], legacyAt:{}}
  }, extra || {});
}
(async () => {
  const rules = fs.readFileSync(path.join(__dirname, '../fixtures/preview-save-rules.rules'), 'utf8');
  const env = await initializeTestEnvironment({
    projectId: 'demo-handoff-12b',
    firestore: {rules, host: '127.0.0.1', port: 8080}
  });
  const pv = 'teams/pv-handoff-12b';
  const live = 'teams/rathdrum-crew';
  const alice = env.authenticatedContext('alice').firestore();
  const bob = env.authenticatedContext('bob').firestore();
  const anon = env.unauthenticatedContext().firestore();

  const seed = prof({_rev:2, _handoff:1, _ackedRev:2, _userEdit:1, _userBase:1, _tab:'phone'});
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `${pv}/saves/alice`), body(seed, 2, {v:3, baseRev:1}));
    await setDoc(doc(db, `${live}/saves/alice`), body(seed, 2, {v:2}));
  });

  try {
    await assertFails(setDoc(doc(alice, `${pv}/saves/alice`), body(seed, 3, {v:2})));
    ok(true, 'a legacy v2 update is denied on a preview team');
  } catch(e){ ok(false, 'a legacy v2 update is denied on a preview team '+e.message); }
  const afterLegacy = await getDoc(doc(alice, `${pv}/saves/alice`));
  ok(afterLegacy.data().rev === 2 && afterLegacy.data().v === 3, 'the denied legacy write left revision 2 in place');

  try {
    await assertSucceeds(setDoc(doc(alice, `${live}/saves/alice`), body(seed, 3, {v:2})));
    ok(true, 'the same legacy update is still allowed on a live team name');
  } catch(e){ ok(false, 'the same legacy update is still allowed on a live team name '+e.message); }

  try {
    await assertFails(setDoc(doc(alice, `${pv}/saves/alice`), body(seed, 4, {v:3, baseRev:1})));
    ok(true, 'an update that names an old base revision is denied');
  } catch(e){ ok(false, 'an update that names an old base revision is denied '+e.message); }
  try {
    await assertFails(setDoc(doc(bob, `${pv}/saves/alice`), body(seed, 3, {v:3, baseRev:2})));
    ok(true, 'another player cannot write this save');
  } catch(e){ ok(false, 'another player cannot write this save '+e.message); }
  try {
    await assertFails(getDoc(doc(anon, `${pv}/saves/alice`)));
    ok(true, 'a signed-out read is denied');
  } catch(e){ ok(false, 'a signed-out read is denied '+e.message); }
  try {
    await assertSucceeds(setDoc(doc(alice, `${pv}/saves/bob2`), body(prof(), 1, {v:2})));
    ok(false, 'creating someone else\'s save must be denied');
  } catch(e){ ok(true, 'creating someone else\'s save is denied'); }
  try {
    await assertSucceeds(setDoc(doc(alice, 'teams/pv-handoff-create/saves/alice'), body(prof(), 1, {v:2})));
    ok(true, 'the owner can still create a save without a base revision');
  } catch(e){ ok(false, 'the owner can still create a save without a base revision '+e.message); }

  const phonePath = `${pv}/saves/alice`;
  function bridge(tab){
    return {
      arm:true, tab,
      load: async () => {
        const s = await getDoc(doc(alice, phonePath));
        if(!s.exists()) return null;
        const d = s.data();
        return {rev:d.rev || 0, profile:JSON.parse(d.data)};
      },
      write: async (docu) => {
        await setDoc(doc(alice, phonePath), body(docu.profile, docu.rev, {v:docu.v || 3, baseRev:docu.baseRev || 0, savedAt:docu.savedAt}));
      }
    };
  }
  async function stored(){
    const s = await getDoc(doc(alice, phonePath));
    const d = s.data();
    return {rev:d.rev, v:d.v, baseRev:d.baseRev, profile:JSON.parse(d.data)};
  }

  let phone = JSON.parse(JSON.stringify(seed));
  S.notePlay(phone);
  phone.world.outposts = {H:{state:'up', hpPct:1}};
  let r = await S.runCloudHandoff(phone, bridge('phone'));
  let row = await stored();
  ok(r.wrote && row.rev === 3 && row.v === 3 && row.baseRev === 2 && row.profile.world.outposts.H.state === 'up', 'emulator accepts the phone outpost as revision 3 based on 2');

  let desk = JSON.parse(JSON.stringify(seed));
  desk._ackedRev = 2; desk._tab = 'phone'; desk._handoff = 1; desk._userEdit = 1; desk._userBase = 1;
  r = await S.runCloudHandoff(desk, bridge('desk'));
  ok(r.adopt && r.wrote === false && r.local.world.outposts.H && r.local.res.scrap === 400, 'the computer adopts the outpost from the emulator and does not write');
  desk = r.local;
  S.notePlay(desk);
  desk.res.scrap -= 50;
  desk.world.outposts.Yard = {state:'up', hpPct:1};
  r = await S.runCloudHandoff(desk, bridge('desk'));
  row = await stored();
  ok(r.wrote && row.rev === 4 && row.profile._tab === 'desk' && row.profile.res.scrap === 350 && row.profile.world.outposts.H && row.profile.world.outposts.Yard, 'the computer then spends, builds, and becomes the saved device');

  phone = JSON.parse(JSON.stringify(row.profile));
  phone._ackedRev = 3; phone._tab = 'phone';
  r = await S.runCloudHandoff(phone, bridge('phone'));
  ok(r.adopt && r.local.res.scrap === 350 && r.local.world.outposts.Yard && r.local.troops.home === 1000, 'the phone receives the computer spend and both outposts');
  phone = r.local;
  S.notePlay(phone);
  phone.troops = {home:600, queue:[], away:{}, wounded:80, healing:[{n:40, end:3}]};
  r = await S.runCloudHandoff(phone, bridge('phone'));
  row = await stored();
  ok(r.wrote && row.profile.troops.home === 600 && row.profile.troops.wounded === 80 && row.profile.res.scrap === 350 && row.profile.world.outposts.Yard, 'the phone saves a troop loss without restoring resources or dropping the outpost');
  desk = JSON.parse(JSON.stringify(row.profile));
  desk._ackedRev = row.rev - 1; desk._tab = 'desk';
  r = await S.runCloudHandoff(desk, bridge('desk'));
  ok(r.adopt && r.local.troops.home === 600 && r.local.troops.healing.length === 1, 'the computer receives the troop loss and the healing queue');

  let owner = r.local;
  owner._tab = 'desk'; owner._ackedRev = row.rev; owner._userBase = owner._userEdit;
  owner.res.food += 5;
  r = await S.runCloudHandoff(owner, bridge('desk'));
  row = await stored();
  ok(r.wrote && row.profile.res.food === 305, 'idle income on the device that last saved is stored');
  let stale = JSON.parse(JSON.stringify(row.profile));
  stale.res.food += 9; stale._tab = 'desk';
  const before = row.rev;
  r = await S.runCloudHandoff(stale, bridge('phone'));
  row = await stored();
  ok(r.adopt && row.rev === before && r.local.res.food === 305, 'idle income on the other device is discarded and the stored food stays');

  const baseRev = row.rev, next = baseRev + 1;
  const raced = prof({world:{sh:{hex:'1_1', state:'up'}, barracks:{level:1}, outposts:{H:{state:'up'}}, towers:{}}});
  const other = prof({res:{scrap:10, food:300, water:200, fuel:90, parts:70}, world:{sh:{hex:'1_1', state:'up'}, barracks:{level:1}, outposts:{}, towers:{}}});
  const both = await Promise.allSettled([
    setDoc(doc(alice, `${pv}/saves/alice`), body(raced, next, {v:3, baseRev:baseRev})),
    setDoc(doc(alice, `${pv}/saves/alice`), body(other, next, {v:3, baseRev:baseRev}))
  ]);
  const wins = both.filter(x => x.status === 'fulfilled').length;
  row = await stored();
  const blended = row.profile.res.scrap === 10 && row.profile.world.outposts && row.profile.world.outposts.H;
  ok(wins === 1 && row.rev === next && row.baseRev === baseRev && !blended, 'two updates from the same base revision cannot both land');

  let caught = null;
  r = await S.runCloudHandoff(prof({_handoff:1, _ackedRev:2, _rev:2, _tab:'phone', world:{sh:{hex:'1_1', state:'up'}, outposts:{H:{state:'up'}}, towers:{}, barracks:{level:1}}}), {
    arm:true, tab:'phone',
    load: async () => { throw {code:'unavailable', message:'offline'}; },
    write: async () => { throw new Error('wrote while offline'); }
  });
  ok(r.wrote === false && r.why === 'load-error' && !/Safe to switch/.test(r.report || '') && r.local.world.outposts.H, 'an offline read does not say Safe and keeps the local outpost');

  const deniedLocal = JSON.parse(JSON.stringify(row.profile));
  S.notePlay(deniedLocal);
  deniedLocal.res.scrap -= 5;
  deniedLocal._ackedRev = row.rev;
  r = await S.runCloudHandoff(deniedLocal, {
    arm:true, tab:'phone',
    load: async () => ({rev:row.rev, profile:JSON.parse(JSON.stringify(row.profile))}),
    write: async () => { const err = new Error('Missing or insufficient permissions.'); err.code = 'permission-denied'; throw err; }
  });
  ok(r.wrote === false && r.rev === deniedLocal._rev && !/Safe to switch/.test(r.report || ''), 'a denied write is not reported as saved');

  await env.cleanup();
  console.log(fail ? fail + ' failed' : 'all passed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS', e); process.exit(1); });
