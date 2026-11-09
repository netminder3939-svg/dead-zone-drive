// dev0 (R0) The 🧪 dev tools exist only on the TEST site (Firebase preview channel, "--" in the address) and on a local
//  test copy (localhost / 127.0.0.1). On the live site this file adds nothing, so there is no dev button, no dev bar and
//  no way to open them from the page. Loaded right before ui.js, which wires the buttons this file creates.
//  Opening the dev bar no longer switches off attack range; on TEST that is its own "Ignore range" button.
(function(){
  const h=location.hostname;
  const TEST=h.indexOf('--')>=0||h==='localhost'||h==='127.0.0.1';
  window.DEV_TOOLS=TEST;
  try{G.dev.any=false;}catch(e){}
  if(!TEST)return;
  const inbox=document.getElementById('btnInbox');
  if(inbox&&!document.getElementById('btnDev'))inbox.insertAdjacentHTML('afterend','<button id="btnDev" class="chip" title="Dev tools (TEST only)">🧪</button>');
  if(!document.getElementById('devbar')){
    const bar=`<div id="devbar" class="hidden">
  <button data-dev="walk">🚶 Walk</button><button data-dev="drive">🚗 Drive</button><button data-dev="tp">📍 Tap map = teleport</button>
  <button data-dev="boss">👹 Test boss</button><button data-dev="rath">🏠 Rathdrum</button><button data-dev="daily">🌅 Run reset</button><button data-dev="ai">⚔️ AI attack</button><button data-dev="finish">⏩ Finish builds</button><button data-dev="gear">🎒 2 test gear</button><button data-dev="reset">♻️ Wipe</button>
  <button id="devRange0">📏 Ignore range: off</button>
</div>`;
    const anchor=document.getElementById('btnCenter');
    if(anchor)anchor.insertAdjacentHTML('beforebegin',bar);else document.body.insertAdjacentHTML('beforeend',bar);
  }
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#devRange0');if(!b)return;e.stopPropagation();
    try{G.dev.any=!G.dev.any;b.classList.toggle('on',G.dev.any);b.textContent='📏 Ignore range: '+(G.dev.any?'ON':'off');}catch(err){}},true);
})();
