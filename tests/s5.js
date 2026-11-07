require('./h.js')(process.argv[2],async(p)=>{
 const r=await p.evaluate(async()=>{const out=[];const L=x=>out.push(x);G.pos=G.pos||[47.7796,-116.8923];
  let dead=0;const _ws=woundSplit;woundSplit=function(l,w){const s=_ws(l,w);dead+=s.dead;return s;};
  const h0=hexAt(47.7796,-116.8923);const [q,r0]=idQR(h0.id);const H=[];for(let i=0;i<8;i++){const id=hexAt(...hexCenter(q+i,r0)).id;H.push(id);P.tiles[id]={t:Date.now()};}
  P.pipes=[{id:'p1',name:'Line',route:H.slice(2,7),st:'on'}];
  const t=TP();t.home=20000;t.stationed={};t.returning=[];t.wounded=0;t.healing=[];t.away={};
  const rn=Date.now;let off=0;Date.now=()=>rn()+off;const _md=marchDur;marchDur=()=>1000;
  const total=()=>troopTotal()+dead;const T0=total();L('start total '+T0);let bad=0;
  const chk=(what)=>{const v=total();if(v!==T0){bad++;L('MISMATCH after '+what+': '+v+' (diff '+(v-T0)+')');}};
  stationTroops(H[0],3000);stationTroops(H[1],2000);guardLine('p1',2500);off+=5000;chk('stationing');
  const hexes=[H[0],H[1],P.pipes[0].guard25.hex,H[5]];
  for(let k=0;k<40;k++){
    const h=hexes[k%hexes.length];const defs=activeDefs(h);const sp=Math.round((500+((k*7919)%6000))*TROOP.powerPer);
    G._f25hex=h;try{squadReplay(defs,defPower(defs),sp,'Test Gang');}catch(e){L('fight err '+e.message);}G._f25hex=null;chk('fight '+k+' at '+h);
    if(k%5==4){for(const s of Object.keys(stationed()))if(TP().home>500)stationTroops(s,500);chk('top-up');}
    if(k%7==6&&TP().home>1000){guardLine('p1',800);chk('guard top-up');}
    off+=30*60e3;try{troopTick();hospitalTick();}catch(e){}chk('tick '+k);}
  for(const h of Object.keys(stationed()))recallStation(h);off+=3*3600e3;troopTick();hospitalTick();chk('recall all');
  L('end: home '+t.home+' wounded '+t.wounded+' healing '+troopsHealing()+' dead '+dead+' stationed '+Object.keys(stationed()).length+' returning '+t.returning.length+' mismatches '+bad);
  L('fight reports: '+(P.fr25||[]).slice(0,40).map(x=>x.win?'W':'L').join(''));
  Date.now=rn;marchDur=_md;woundSplit=_ws;return out;});
 console.log(r.join('\n'));});
