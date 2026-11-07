// Pointy-top hex grid on a local flat projection. HEX_R = center-to-corner (m); width ≈ 170 m.
const HEX_R_BY_ENV={live:98,test:147}; // one hex size per environment (test = 1.5x, Jacob 10/31)
const HEX_R=HEX_R_BY_ENV[location.hostname.includes("--")?"test":"live"], O_LAT=47, O_LNG=-117, MLAT=110540, MLNG=111320*Math.cos(47*Math.PI/180);
const toXY=(lat,lng)=>[(lng-O_LNG)*MLNG,(lat-O_LAT)*MLAT];
const toLL=(x,y)=>[y/MLAT+O_LAT,x/MLNG+O_LNG];
function hexAt(lat,lng){
  const [x,y]=toXY(lat,lng); let q=(Math.sqrt(3)/3*x-y/3)/HEX_R, r=(2/3*y)/HEX_R;
  let s=-q-r,rq=Math.round(q),rr=Math.round(r),rs=Math.round(s);
  const dq=Math.abs(rq-q),dr=Math.abs(rr-r),ds=Math.abs(rs-s);
  if(dq>dr&&dq>ds)rq=-rr-rs;else if(dr>ds)rr=-rq-rs;
  return {q:rq,r:rr,id:rq+'_'+rr};
}
function hexCenter(q,r){return toLL(HEX_R*Math.sqrt(3)*(q+r/2),HEX_R*1.5*r);}
function hexPoly(q,r){const [cx,cy]=[HEX_R*Math.sqrt(3)*(q+r/2),HEX_R*1.5*r];const p=[];
  for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30);p.push(toLL(cx+HEX_R*Math.cos(a),cy+HEX_R*Math.sin(a)));}return p;}
function hexRing(q,r,n){const out=[];for(let dq=-n;dq<=n;dq++)for(let dr=Math.max(-n,-dq-n);dr<=Math.min(n,-dq+n);dr++)out.push({q:q+dq,r:r+dr,id:(q+dq)+'_'+(r+dr)});return out;}
function distM(a,b,c,d){const R=6371e3,t=Math.PI/180,x=Math.sin((c-a)*t/2)**2+Math.cos(a*t)*Math.cos(c*t)*Math.sin((d-b)*t/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function seedRand(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
  return ()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return((h^=h>>>16)>>>0)/4294967296;};}
const today=()=>new Date().toLocaleDateString('en-CA');

// v16 (D12): plain-words hex label instead of raw ids like -260_612: "your hex" or "3 hexes NE of you".
function hexName(id){try{if(typeof G==='undefined'||!G.pos)return'a nearby hex';const me=hexAt(...G.pos),d=hexDist(me.id,id);if(!d)return'your current hex';
  const [la,ln]=hexCenter(...idQR(id)),a=Math.atan2((la-G.pos[0])*111e3,(ln-G.pos[1])*111e3*Math.cos(G.pos[0]*Math.PI/180))*180/Math.PI,
  dir=['E','NE','N','NW','W','SW','S','SE'][((Math.round(a/45)%8)+8)%8];return`the hex ${d} ${d===1?'hex':'hexes'} ${dir} of you`;}catch(e){return'a nearby hex';}}
