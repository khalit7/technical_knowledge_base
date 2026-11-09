// ---- Shared helpers for every tab: SVG text, stats, segmented buttons, ARC grids, the section nav ----
// Since the 2026-11-09 rollout the page has no 2D step animation: its three animated figures are 3D stages (25_js_s3.js, S3.stage), which
// play by themselves once in view and follow the 2026-11-06 motion rules, so the old KU.anim controller is gone.
window.KU=(function(){
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const onRender=(tab,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  const onResize=(tab,f)=>{let t=0;addEventListener('resize',()=>{const r=document.getElementById(tab);if(!r||r.hidden)return;clearTimeout(t);t=setTimeout(f,60)})};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  const L='target="_blank" rel="noopener noreferrer"';
  const a=(txt,u)=>'<a href="'+u+'" '+L+'>'+txt+'</a>';
  // tab links inside HTML written by a script
  function tabLinks(el){el.addEventListener('click',e=>{const x=e.target.closest('a[data-tab]');if(!x)return;e.preventDefault();
    const b=document.querySelector('#tabs button[data-t="'+x.dataset.tab+'"]');if(b){b.click();document.getElementById('tabs').scrollIntoView({block:'start'})}})}
  const pct=(v,d)=>(v==null||isNaN(v))?'n/a':(+v).toFixed(d==null?1:d)+'%';
  return {RM,esc,stat,onRender,width,onResize,svg,t,seg,a,tabLinks,pct};
})();
// ARC colour palette (the standard ARC-AGI display colours, 0 to 9)
KU.ARC=['#000000','#0074D9','#FF4136','#2ECC40','#FFDC00','#AAAAAA','#F012BE','#FF851B','#7FDBFF','#870C25'];
KU.ARCN=['black','blue','red','green','yellow','grey','magenta','orange','sky blue','maroon'];
// draw an ARC grid as an SVG string; cell size cs; optional per-cell highlight function hl(r,c) returning a stroke colour
KU.grid=function(g,cs,hl,label){const R=g.length,C=g[0].length,W=C*cs+1,H=R*cs+1;let b='';
  for(let r=0;r<R;r++)for(let c=0;c<C;c++){const v=g[r][c];b+='<rect x="'+(c*cs+.5)+'" y="'+(r*cs+.5)+'" width="'+cs+'" height="'+cs+'" fill="'+(v<0?'var(--soft)':KU.ARC[v])+'" stroke="#555" stroke-width=".5"/>'}
  if(hl)for(let r=0;r<R;r++)for(let c=0;c<C;c++){const s=hl(r,c);if(s)b+='<rect x="'+(c*cs+1.5)+'" y="'+(r*cs+1.5)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" fill="none" stroke="'+s+'" stroke-width="2"/>'}
  return '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="'+(label||'ARC grid '+R+' by '+C)+'">'+b+'</svg>'};
// section nav highlight (Reading)
(function(){const nav=document.getElementById('rd-nav');if(!nav||!('IntersectionObserver' in window))return;
  const links=[...nav.querySelectorAll('a')];const map={};links.forEach(a=>map[a.getAttribute('href').slice(1)]=a);
  const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.remove('cur'));const a=map[en.target.id];if(a){a.classList.add('cur');nav.scrollLeft=Math.max(0,a.offsetLeft-40)}}})},{rootMargin:'-45% 0px -50% 0px'});
  Object.keys(map).forEach(id=>{const s=document.getElementById(id);if(s)io.observe(s)});})();
