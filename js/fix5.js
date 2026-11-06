// Playtest fixes on top of Stage 5 (preview).
// 1) Max zoom: stop at 18, the deepest zoom with real street detail here (19 was a flat beige close-up).
try{map.setMaxZoom(18);if(map.getZoom()>18)map.setZoom(18);}catch(e){}
// 2) Landmarks: near Rathdrum, start from a bundled OpenStreetMap set so a busy Overpass (504) never leaves the map empty.
const _loadLm5=loadLandmarks;loadLandmarks=function(lat,lng){try{const ck='wl_lm_'+lat.toFixed(2)+'_'+lng.toFixed(2);
  if(typeof LM_STATIC!=='undefined'&&!localStorage.getItem(ck)&&distM(lat,lng,...LM_STATIC.center)<LM_STATIC.km*1000){
    const list=LM_STATIC.list.filter(l=>LANDMARK_KINDS[l.kind]).map(l=>({...l,name:l.name||LANDMARK_KINDS[l.kind].label}));localStorage.setItem(ck,JSON.stringify(list));}}catch(e){}
  return _loadLm5.apply(this,arguments);};
// 4) Towers need a Stronghold LEVEL, not a placed Stronghold: every player starts at Lv1, so Lv1 allows 2 towers.
towerMax=function(){return BAL.tower.maxBase+strongholdLevel()*BAL.tower.maxPerStrongholdLevel;};
// 7) (removed in v26 cleanup) battle cards used to close themselves after 6 s. Jacob: popups stay until you close them.
// 8) Newbie protection: your first 3 marches can't be intercepted by raider squads (you can still choose to intercept one).
const NEWBIE_MARCHES=3;
function marchesDone(){return Object.keys(P.marchDone||{}).length;}
const _intc5=interceptor;interceptor=function(m){if(marchesDone()<NEWBIE_MARCHES&&!(m&&m.kind==='intercept'))return null;return _intc5.apply(this,arguments);};
