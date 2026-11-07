// v20 hooks: ONE wrapper each for the hot functions, and modules register into it instead of wrapping again.
// Before this, UI.render was wrapped 29 times and memberSummary 13 times (see tools/check.js). New code should use:
//   HOOK.render(fn)   fn.call(UI) after every sheet render (check this.tab / this.sub yourself)
//   HOOK.tile(fn)     fn.call(UI,id) after a hex card opens (skipped while placing marks)
//   HOOK.member(fn)   fn(o) adds fields to your member doc; return o
//   HOOK.draw(fn)     fn() after the map world redraws
// Each hook runs in registration order (= script load order), inside its own try/catch, so one broken module can't break the rest.
const HOOK={_r:[],_t:[],_m:[],_d:[],render(f){this._r.push(f);},tile(f){this._t.push(f);},member(f){this._m.push(f);},draw(f){this._d.push(f);}};
(function(){const run=(list,self,args,tag)=>{for(const f of list){try{f.apply(self,args);}catch(e){console.warn('hook '+tag,e);}}};
  const r0=UI.render;UI.render=function(){const out=r0.apply(this,arguments);run(HOOK._r,this,[],'render');return out;};
  const t0=UI.infoTile;UI.infoTile=function(id){const out=t0.apply(this,arguments);if(!G.markMode)run(HOOK._t,this,[id],'tile');return out;};
  const m0=memberSummary;memberSummary=function(){let o=m0.apply(this,arguments);for(const f of HOOK._m){try{o=f(o)||o;}catch(e){console.warn('hook member',e);}}return o;};
  const d0=drawWorld;drawWorld=function(){const out=d0.apply(this,arguments);run(HOOK._d,this,[],'draw');return out;};})();
