// ---- Part 1 (C++, the language): shared helpers. Everything here is prefixed CA / ca- ----
window.CA=(function(){
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const KW=new Set(('alignas auto bool break case catch char class concept const consteval constexpr constinit continue co_await co_return co_yield decltype default delete do double else enum explicit export extern false float for friend if inline int long mutable namespace new noexcept nullptr operator override private protected public requires return short signed sizeof static static_assert static_cast struct switch template this throw true try typedef typename union unsigned using virtual void volatile while').split(' '));
  // syntax colouring for one line of C++ (same classes as the generated code panels)
  function hl(line){
    const re=/(\/\/.*$)|(^\s*#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([A-Za-z_]\w*)|([\s\S])/g;let m,o='';
    while((m=re.exec(line))){if(m[1])o+='<span class="ca-cm">'+esc(m[1])+'</span>';else if(m[2])o+='<span class="ca-pp">'+esc(m[2])+'</span>';
      else if(m[3])o+='<span class="ca-st">'+esc(m[3])+'</span>';else if(m[4])o+=KW.has(m[4])?'<span class="ca-kw">'+m[4]+'</span>':m[4];else o+=esc(m[5])}
    return o}
  function onTab(id,f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f)}
  // step-animation controller: reuse the page's RD.anim, but redraw when one of our tabs opens
  function anim(o,tab){const a=RD.anim(o);onTab(tab,()=>a.redraw());return a}
  return {esc,hl,onTab,anim};
})();
// reading time: prose words (code and outputs excluded) at 230 words per minute
(function(){const r=document.getElementById('t-ca-read'),el=document.getElementById('ca-rt');if(!r||!el)return;
  const c=r.cloneNode(true);c.querySelectorAll('pre,style,nav,details.ca-pr,details.ca-more').forEach(x=>x.remove());
  const words=(c.textContent.match(/\S+/g)||[]).length;el.textContent=Math.round(words/230);r.dataset.words=words})();
// section nav highlight for Part 1's Reading
(function(){const nav=document.getElementById('ca-nav');if(!nav||!('IntersectionObserver' in window))return;
  const links=[...nav.querySelectorAll('a')],map={};links.forEach(a=>map[a.getAttribute('href').slice(1)]=a);
  const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.remove('cur'));const a=map[en.target.id];if(a){a.classList.add('cur');nav.scrollLeft=Math.max(0,a.offsetLeft-40)}}})},{rootMargin:'-45% 0px -50% 0px'});
  Object.keys(map).forEach(id=>{const s=document.getElementById(id);if(s)io.observe(s)});
  nav.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;e.preventDefault();const s=document.getElementById(a.getAttribute('href').slice(1));if(s)s.scrollIntoView({block:'start'})});})();
