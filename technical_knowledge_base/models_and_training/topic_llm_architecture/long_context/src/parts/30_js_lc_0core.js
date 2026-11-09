// Long context page: shared helpers for the Reading figures and the calculator tab (window.LC). The step controllers are
// RD.anim (21_js_rd_common.js, the design stepper) and S3.stage (25_js_s3.js, the 3D figures); this file has none since 2026-11-09.
window.LC=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const onTab=(tab,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const visible=el=>el&&el.offsetParent!==null;
  const onResize=(el,f)=>{let t=0;addEventListener('resize',()=>{if(!visible(el))return;clearTimeout(t);t=setTimeout(f,80)})};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt=(x,d)=>{if(!isFinite(x))return '-';d=d===undefined?1:d;return x.toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d})};
  const int=x=>Math.round(x).toLocaleString('en-GB');
  const bytes=b=>{const u=['B','KiB','MiB','GiB','TiB'];let i=0;while(b>=1024&&i<4){b/=1024;i++}return fmt(b,b<10&&i?2:1)+' '+u[i]};
  const gb=b=>b>=1e9?fmt(b/1e9,b<1e10?2:1)+' GB':b>=1e6?fmt(b/1e6,b<1e7?2:1)+' MB':fmt(b/1e3,1)+' kB';
  const cnt=n=>n>=1e6?fmt(n/1e6,0)+'M':n>=1e3?fmt(n/1e3,0)+'K':String(Math.round(n));
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':' fill="var(--ink)"')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  return {RM,$,onTab,width,visible,onResize,esc,fmt,int,bytes,gb,cnt,svg,t,seg};
})();
