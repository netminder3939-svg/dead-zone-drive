// Preview isolation: on Firebase preview-channel hosts (hostname has "--") every team code gets a "pv-" prefix,
// so previews can never read or write a live team (e.g. rathdrum-crew). No-op on the live site.
(function(){if(location.hostname.indexOf('--')<0)return;window.DZD_PREVIEW=true;const PX='pv-',fix=v=>{v=String(v||'').trim().toLowerCase();return v.startsWith(PX)?v:PX+v;};
  window.DEFAULT_TEAM=fix(window.DEFAULT_TEAM||'crew');
  const ls=window.localStorage,set=ls.setItem.bind(ls);try{const t=ls.getItem('wl_team');if(t&&!t.startsWith(PX))set('wl_team',fix(t));}catch(e){}
  Storage.prototype.setItem=new Proxy(Storage.prototype.setItem,{apply(f,self,args){if(self===ls&&args[0]==='wl_team')args=[args[0],fix(args[1])];return Reflect.apply(f,self,args);}});
  const badge=()=>{if(document.getElementById('pvbadge'))return;const b=document.createElement('div');b.id='pvbadge';b.textContent='PREVIEW · test data only';b.style.cssText='position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top) + 2px);z-index:2000;background:#b0302a;color:#fff;font:700 11px system-ui;padding:2px 10px;border-radius:9px;letter-spacing:.06em;pointer-events:none;opacity:.92';document.body.appendChild(b);};
  if(document.body)badge();else document.addEventListener('DOMContentLoaded',badge);})();
