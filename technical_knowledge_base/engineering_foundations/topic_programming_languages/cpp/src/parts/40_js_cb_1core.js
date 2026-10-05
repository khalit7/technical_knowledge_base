// ---- Part 2 (The machine underneath): shared helpers. Every number and output block on the part's tabs comes from window.CB ----
window.CBX=(function(){
  const CB=window.CB||{};
  const get=p=>p.split('.').reduce((o,k)=>o==null?undefined:(Array.isArray(o)&&/^\d+$/.test(k)?o[+k]:o[k]),CB);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // numbers: d decimals; "auto" gives 3 significant figures for small values
  function fmt(v,d){if(typeof v!=='number'||!isFinite(v))return '?';if(d==null||d==='')d=Math.abs(v)>=100?0:Math.abs(v)>=10?1:Math.abs(v)>=1?2:3;
    return (+v).toLocaleString('en-US',{minimumFractionDigits:+d,maximumFractionDigits:+d})}
  // code with comments dimmed (C++ // comments, # shell comments, assembly ; comments)
  function code(txt,lang){return txt.split('\n').map(l=>{
      const m=lang==='asm'?l.match(/^(.*?)(\s;.*)$/):lang==='sh'?l.match(/^(\s*|.*\s)(#.*)$/):l.match(/^(.*?)(\/\/.*)$/);
      return m&&!(lang!=='asm'&&/"[^"]*\/\/[^"]*"/.test(l))?esc(m[1])+'<span class="cb-cm">'+esc(m[2])+'</span>':esc(l)}).join('\n')}
  function lines(txt,spec){if(!spec)return txt;const [a,b]=spec.split('-').map(Number);return txt.split('\n').slice(a-1,b).join('\n')}
  function fill(root){
    root.querySelectorAll('[data-cbv]').forEach(el=>{el.textContent=fmt(get(el.dataset.cbv),el.dataset.d)});
    root.querySelectorAll('[data-cbratio]').forEach(el=>{const [a,b]=el.dataset.cbratio.split('|');el.textContent=fmt(get(a)/get(b),el.dataset.d==null?1:el.dataset.d)});
    root.querySelectorAll('[data-cbsp]').forEach(el=>{const s=get(el.dataset.cbsp);el.textContent=s?fmt(s.min,el.dataset.d)+' to '+fmt(s.max,el.dataset.d):'?'});
    root.querySelectorAll('pre[data-src]').forEach(el=>{const t=(CB.src||{})[el.dataset.src];el.innerHTML=t==null?'missing':code(lines(t,el.dataset.lines),/\.sh$/.test(el.dataset.src)?'sh':'cpp')});
    root.querySelectorAll('pre[data-out]').forEach(el=>{const t=get(el.dataset.out);el.innerHTML=t==null?'missing':(el.dataset.lang?code(String(t),el.dataset.lang):esc(t))});
  }
  // predict-then-reveal: <button class="cb-rv" data-for="id">
  document.addEventListener('click',e=>{const b=e.target.closest('.cb-rv');if(!b)return;const t=document.getElementById(b.dataset.for);if(!t)return;
    t.hidden=!t.hidden;b.setAttribute('aria-expanded',String(!t.hidden));b.textContent=t.hidden?(b.dataset.l0||'Reveal the real output'):(b.dataset.l1||'Hide')});
  // switches: <div class="seg cb-sw" data-pre="id"><button data-m="asm.sq_O0" data-lang="asm">..</button></div>
  function switches(root){root.querySelectorAll('.cb-sw').forEach(sw=>{const pre=document.getElementById(sw.dataset.pre);
    const set=b=>{sw.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));const t=get(b.dataset.m);pre.innerHTML=b.dataset.lang?code(String(t),b.dataset.lang):esc(t);
      const cap=sw.dataset.cap&&document.getElementById(sw.dataset.cap);if(cap)cap.innerHTML=b.dataset.c||''};
    sw.addEventListener('click',e=>{const b=e.target.closest('button');if(b)set(b)});const first=sw.querySelector('button.on')||sw.querySelector('button');if(first)set(first)})}
  // section nav highlight for #cb-nav
  function nav(){const n=document.getElementById('cb-nav');if(!n||!('IntersectionObserver' in window))return;
    const links=[...n.querySelectorAll('a')];const map={};links.forEach(a=>map[a.getAttribute('href').slice(1)]=a);
    const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.remove('cur'));const a=map[en.target.id];if(a){a.classList.add('cur');n.scrollLeft=Math.max(0,a.offsetLeft-40)}}})},{rootMargin:'-45% 0px -50% 0px'});
    Object.keys(map).forEach(id=>{const s=document.getElementById(id);if(s)io.observe(s)})}
  const onRender=(tab,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
  // resize: redraw only while the tab is visible
  function onResize(tab,f){let t=0;addEventListener('resize',()=>{const r=document.getElementById(tab);if(!r||r.hidden)return;clearTimeout(t);t=setTimeout(f,80)})}
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  ['t-cb-read','t-cb-ladder','t-cb-cache','t-cb-simd','t-cb-roof'].forEach(id=>{const el=document.getElementById(id);if(el){fill(el);switches(el);RD.tabLinks&&0}});
  nav();
  return {CB,get,fmt,esc,code,fill,onRender,onResize,css};
})();
