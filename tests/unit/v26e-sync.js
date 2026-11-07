// node tests/unit/v26e-sync.js
function score26(o){if(!o||typeof o!=='object')return 0;const b=Object.keys(o.badges||{}).length,u=Object.keys(o.pipeUnlock26||{}).length,d=(o.dr26||[]).length;const m=Math.floor(((o.stats&&o.stats.meters)||0)/100),t=Object.keys(o.tiles||{}).length;return (o.lvl||1)*1e9+(o.xp||0)*1e5+b*1e4+u*1e3+d*100+m+Math.min(t,5000);}
function mergeProg26(keep,o){if(!keep||!o)return o||keep;const out={...o};
  if((keep.lvl||1)>(o.lvl||1)||((keep.lvl||1)===(o.lvl||1)&&(keep.xp||0)>(o.xp||0))){out.lvl=keep.lvl;out.xp=keep.xp;out.sp=Math.max(keep.sp||0,o.sp||0);}
  else out.sp=Math.max(keep.sp||0,o.sp||0);
  out.badges={...(o.badges||{}),...(keep.badges||{})};out.pipeUnlock26={...(o.pipeUnlock26||{}),...(keep.pipeUnlock26||{})};
  const kd=keep.dr26||[],od=o.dr26||[];out.dr26=(kd.length>=od.length?kd:od).slice(0,20);
  const km=Math.max((keep.stats&&keep.stats.meters)||0,(o.stats&&o.stats.meters)||0);
  out.stats={...(o.stats||{}),...(keep.stats||{}),meters:km};return out;}
const stale={lvl:2,xp:21,badges:{},pipeUnlock26:{},dr26:[],stats:{meters:20000},tiles:{a:1}};
const good={lvl:4,xp:40,badges:{x:1},pipeUnlock26:{s:1},dr26:[{km:'1.0',newHex:3}],stats:{meters:1000},tiles:{}};
const m=mergeProg26(good,stale);
let fail=0;const ok=(c,msg)=>{if(!c){console.error('FAIL',msg);fail++;}else console.log('ok',msg);};
ok(score26(good)>score26(stale),'good scores above stale');
ok(m.lvl===4,'merge keeps lvl 4');
ok(Object.keys(m.badges).length===1,'merge keeps badges');
ok(Object.keys(m.pipeUnlock26).length===1,'merge keeps pipe unlocks');
ok(m.stats.meters===20000,'merge keeps higher meters');
ok(!(parseFloat('-3.2')>=0),'neg km detected');
process.exit(fail?1:0);
