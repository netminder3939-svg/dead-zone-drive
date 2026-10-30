// Pointy-top hex grid on a local flat projection. HEX_R = center-to-corner (m); width ≈ 170 m.
const HEX_R=98, O_LAT=47, O_LNG=-117, MLAT=110540, MLNG=111320*Math.cos(47*Math.PI/180);
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
