// v25d (TEST) Crew chat: free, uses the existing append-only activity collection (server timestamps, <200 chars, no rules
// change). Messages carry kind:'chat'. Text is escaped before it is stored. Rate limit 1 message / 3 s and 15 / 10 min.
// Quick pings ("Need help at <building>") link to the map.
G.chat25=[];G.chatSeen25=+(localStorage.getItem('wl_chat25_seen')||0);
const esc25=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function chatListen(){if(G._chatL)return;if(NET.mode!=='firebase'){G._chatL=1;G.chat25=JSON.parse(localStorage.getItem('wl_chat25')||'[]');return;}if(!NET.fs||!NET.db||!NET.base)return;G._chatL=1;const fs=NET.fs;
  fs.onSnapshot(fs.query(fs.collection(NET.db,...NET.base,'activity'),fs.orderBy('t','desc'),fs.limit(150)),s=>{const a=[];s.forEach(d=>{const x=d.data();if(x.kind==='chat')a.push({id:d.id,...x,t:x.t&&x.t.toMillis?x.t.toMillis():Date.now()});});
    G.chat25=a.slice(0,60).reverse();chatBadge();if(UI.tab==='alliance'&&UI.sub.alliance==='chat')chatPaint();},e=>console.warn('chat',e));}
setInterval(()=>{try{chatListen();}catch(e){}},2000);
G._chatSent=[];
async function chatSend(text,hex){text=String(text||'').trim().slice(0,150);if(!text)return;const now=Date.now();G._chatSent=G._chatSent.filter(t=>now-t<600e3);
  if(G._chatSent.length&&now-G._chatSent[G._chatSent.length-1]<3000)return toast('⏳ One message every 3 seconds');if(G._chatSent.length>=15)return toast('⏳ Slow down: 15 messages per 10 minutes');
  G._chatSent.push(now);const doc={text:esc25(text),uid:NET.uid||P.uid,kind:'chat',name:esc25(P.name).slice(0,24),color:P.color||'',...(hex?{hex}:{})};
  if(NET.mode!=='firebase'){G.chat25.push({...doc,t:now});localStorage.setItem('wl_chat25',JSON.stringify(G.chat25.slice(-60)));chatPaint();return;}
  try{await NET.fs.addDoc(NET.fs.collection(NET.db,...NET.base,'activity'),{...doc,t:NET.fs.serverTimestamp()});}catch(e){toast('⚠️ Message not sent');}}
window.chatSend25=chatSend;
function pingHelp(hex){const b=typeof bldAt==='function'&&bldAt(hex);const nm=b?(b.own?'my ':esc25(b.owner)+"'s ")+({sh:'Stronghold',tower:'Watchtower',op:'Outpost'}[b.k]||'building'):hexName(hex);chatSend(`🆘 Need help at ${nm} (${hexName(hex)})`,hex);toast('🆘 Ping sent to the crew chat');UI.closeModal&&UI.closeModal();}
window.pingHelp25=pingHelp;
function chatGo(hex){UI.close();try{map.setView(hexCenter(...idQR(hex)),16);setTimeout(()=>UI.infoTile(hex),300);}catch(e){}}window.chatGo25=chatGo;
function chatHTML(){const L2=G.chat25||[];return`<h2>💬 Crew chat</h2><div id="chat25" class="chat25">${L2.map(m=>{const me=isMe(m.uid);return`<div class="cm25 ${me?'me':''}">${av24(m.uid,30)}<div><b style="color:${esc25(who24(m.uid).color||m.color)}">${me?'You':m.name||esc25(who24(m.uid).name)}</b> <small>${when(m.t)}</small><div class="cb25">${m.text}${m.hex?` <button class="ghost24 sm" onclick="chatGo25('${esc25(m.hex)}')">📍 Show</button>`:''}</div></div></div>`;}).join('')||'<p class="tiny">No messages yet. Say hi to the crew.</p>'}</div>
  <div class="ci25"><input id="chatIn25" maxlength="150" placeholder="Message the crew" onkeydown="if(event.key==='Enter'){chatSend25(this.value);this.value='';}"><button class="red24" onclick="const i=$('#chatIn25');chatSend25(i.value);i.value='';">Send</button></div>
  <div class="seg qp25">${['On my way 🚚','Reinforcing now 🛡','Horde incoming ☠️','Good fight ⚔️'].map(t=>`<button onclick="chatSend25('${t}')">${t}</button>`).join('')}</div><p class="tiny">Free crew chat · last 60 messages · links jump to the map.</p>`;}
function chatPaint(){const b=document.querySelector('#sheetBody');if(!b)return;const box=b.querySelector('.chatwrap25');if(!box)return;const keep=(document.activeElement&&document.activeElement.id==='chatIn25')?$('#chatIn25').value:null;box.innerHTML=chatHTML();
  const c=box.querySelector('#chat25');if(c)c.scrollTop=c.scrollHeight;if(keep!=null){const i=$('#chatIn25');i.value=keep;i.focus();}markSeen();}
function markSeen(){const last=(G.chat25[G.chat25.length-1]||{}).t||0;if(last>G.chatSeen25){G.chatSeen25=last;localStorage.setItem('wl_chat25_seen',String(last));}chatBadge();}
function chatBadge(){const n=(G.chat25||[]).filter(m=>m.t>G.chatSeen25&&!isMe(m.uid)).length;const t=document.querySelector('#tabs [data-tab=alliance]');if(!t)return;let b=t.querySelector('.cbadge25');if(!n){if(b)b.remove();return;}if(!b){b=document.createElement('i');b.className='cbadge25';t.appendChild(b);}b.textContent=n>9?'9+':n;}
try{if(!UI.SUBS.alliance.some(x=>x[0]==='chat'))UI.SUBS.alliance.splice(1,0,['chat','💬 Chat']);}catch(e){}
HOOK.render(function(){try{if(this.tab!=='alliance'||this.sub.alliance!=='chat')return;const b=document.querySelector('#sheetBody');if(!b||b.querySelector('.chatwrap25'))return;b.insertAdjacentHTML('beforeend','<div class="chatwrap25"></div>');chatPaint();}catch(e){console.warn('chat25',e);}});
// keep chat out of the activity feed
const _ad25d=actDedupe;actDedupe=function(list){return _ad25d((list||[]).filter(x=>x.kind!=='chat'&&x.kind!=='gl25'));};
// building cards get a help ping
const _bc25d=bldCard;bldCard=function(hex){const h=_bc25d.apply(this,arguments);if(!h)return h;return h.replace(/(<div class="btns24">)/,`$1<button class="ghost24" onclick="pingHelp25('${hex}')">🆘 Ask crew for help</button>`);};
