// Stage 2 (preview): light dark-fantasy flavor. Wording only: adds short flavor lines, never renames game terms or changes numbers.
const FLAVOR={
  fort:'🕯️ Every wall you raise pushes the dark back a little further.',
  terr:'🗺️ Held ground stays lit. Lost ground goes back to the Blight.',
  gear:'⚒️ Salvaged steel, stitched leather, and the odd charm that hums at night.',
  stats:'🩸 Scarred, tired, still standing.',
  research:'📜 Old knowledge, paid in scrap and stubbornness.',
  ops:'🎖️ The crew works as one or not at all.',
  outposts:'⛺ A fire on the edge of the dark. Keep it fed.',
  factions:'☠️ Warbands with stolen banners. They answer to something.',
  over:'🔥 One fire, many hands. Nobody walks the dark alone.',
  members:'🫂 Every name here has bled for this ground.',
  board:'🏆 Scratched on the wall so nobody forgets who carried the crew.',
  bank:'🏦 The crew\'s hoard. Take what you need, and leave a mark when you do.',
  act:'📯 Word travels fast around the fire.',
  res:'🎒 What you dragged back from the ruins, and what it cost you.',
  items:'🧪 Odd things that still work, mostly.',
  dex:'📖 Every horror you\'ve faced, written down so the next survivor knows.',
  quests:'📜 Small errands for a broken world. Each one keeps the lights on a little longer.',
  skills:'🌳 Scars teach. Spend what they taught you.',
  reports:'⚔️ The ledger of blood: every fight for your ground.',
  plans:'🗺️ Charcoal on a torn map: where we go next.',
};
const _renderTheme=UI.render;UI.render=function(){const r=_renderTheme.apply(this,arguments);try{const t=this.tab,sub=t&&(this.sub[t]||(this.SUBS[t]||[[]])[0][0]);const key=FLAVOR[sub]?sub:null;
  const b=$('#sheetBody');if(key&&b&&!b.querySelector('.flavor')){const p=document.createElement('p');p.className='flavor';p.textContent=FLAVOR[key];const seg=b.querySelector('.seg');if(seg)seg.after(p);else b.prepend(p);}}catch(e){}return r;};
