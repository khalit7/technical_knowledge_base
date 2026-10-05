// ---- Part 3 (rs): small shared helpers. Redraws are registered on this part's own tab ids. ----
window.RS=(function(){
  const reg=(id,f)=>{window.TAB_RENDER=window.TAB_RENDER||{};(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f)};
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const med=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):NaN};
  const fmt=(v,d)=>Number.isFinite(v)?v.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}):'n/a';
  function onResize(id,f){let t=0;addEventListener('resize',()=>{const r=document.getElementById(id);if(!r||r.hidden)return;clearTimeout(t);t=setTimeout(f,80)})}
  // section nav highlight for the Reading tab
  (function(){const nav=document.getElementById('rs-nav');if(!nav||!('IntersectionObserver' in window))return;
    const links=[...nav.querySelectorAll('a')],map={};links.forEach(a=>map[a.getAttribute('href').slice(1)]=a);
    const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.remove('cur'));const a=map[en.target.id];if(a){a.classList.add('cur');nav.scrollLeft=Math.max(0,a.offsetLeft-40)}}})},{rootMargin:'-45% 0px -50% 0px'});
    Object.keys(map).forEach(id=>{const s=document.getElementById(id);if(s)io.observe(s)})})();
  return {reg,css,esc,med,fmt,onResize};
})();
