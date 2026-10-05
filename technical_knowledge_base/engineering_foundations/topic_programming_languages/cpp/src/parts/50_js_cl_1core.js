// ---- Part 3 (Reading llama.cpp): shared helpers. Every number, log and excerpt on the part's tabs comes from window.CL ----
window.CLX=(function(){
  const CL=window.CL||{};
  const TABS=['t-cl-read','t-cl-tour','t-cl-quant','t-cl-run'];
  const get=p=>p.split('.').reduce((o,k)=>o==null?undefined:(Array.isArray(o)&&/^\d+$/.test(k)?o[+k]:o[k]),CL);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function fmt(v,d){if(typeof v!=='number'||!isFinite(v))return '?';if(d==null||d==='')d=Math.abs(v)>=100?0:Math.abs(v)>=10?1:Math.abs(v)>=1?2:3;
    return (+v).toLocaleString('en-US',{minimumFractionDigits:+d,maximumFractionDigits:+d})}
  // C/C++ with // comments dimmed; preprocessor lines tinted
  function code(txt,lang){return String(txt).split('\n').map(l=>{
      if(lang==='sh'){const m=l.match(/^(\s*|.*\s)(#.*)$/);return m?esc(m[1])+'<span class="cl-cm">'+esc(m[2])+'</span>':esc(l)}
      if(lang==='py'){const m=l.match(/^([^"']*?)(#.*)$/);return m?esc(m[1])+'<span class="cl-cm">'+esc(m[2])+'</span>':esc(l)}
      if(/^\s*#\s*(if|elif|else|endif|define|include|pragma)/.test(l))return '<span class="cl-pp">'+esc(l)+'</span>';
      const m=l.match(/^(.*?)(\/\/.*)$/);
      return m&&!/"[^"]*\/\/[^"]*"/.test(l)?esc(m[1])+'<span class="cl-cm">'+esc(m[2])+'</span>':esc(l)}).join('\n')}
  const GH='https://github.com/ggml-org/llama.cpp/blob/';
  // link to the excerpt's lines at the pinned commit
  function srcLink(k){const e=(CL.src||{})[k];if(!e)return 'missing';
    const u=GH+CL.commit+'/'+e.file+'#L'+e.start+(e.end>e.start?'-L'+e.end:'');
    return '<a href="'+u+'" target="_blank" rel="noopener noreferrer"><code>'+esc(e.file)+'</code> lines '+e.start+(e.end>e.start?' to '+e.end:'')+'</a>'}
  // an excerpt block: <div class="cl-ex" data-ex="key"></div>
  function exBlock(el){const k=el.dataset.ex,e=(CL.src||{})[k];if(!e){el.textContent='missing excerpt '+k;return}
    el.innerHTML='<div class="cl-exh">'+srcLink(k)+' <span class="cl-commit">at '+esc(CL.commit.slice(0,7))+'</span></div><pre class="cl-code">'+code(e.text)+'</pre>'}
  function fill(root){
    root.querySelectorAll('[data-clv]').forEach(el=>{const v=get(el.dataset.clv);el.textContent=typeof v==='number'?fmt(v,el.dataset.d):(v==null?'?':String(v))});
    root.querySelectorAll('pre[data-out]').forEach(el=>{const t=get(el.dataset.out);el.innerHTML=t==null?'missing':(el.dataset.lang?code(String(t),el.dataset.lang):esc(t))});
    root.querySelectorAll('.cl-ex[data-ex]').forEach(exBlock);
    root.querySelectorAll('[data-srclink]').forEach(el=>{el.innerHTML=srcLink(el.dataset.srclink)});
  }
  // predict-then-reveal: <button class="cl-rv" data-for="id">
  document.addEventListener('click',e=>{const b=e.target.closest('.cl-rv');if(!b)return;const t=document.getElementById(b.dataset.for);if(!t)return;
    t.hidden=!t.hidden;b.setAttribute('aria-expanded',String(!t.hidden));b.textContent=t.hidden?(b.dataset.l0||'Reveal the real answer'):(b.dataset.l1||'Hide')});
  // links into a section of another tab: <a href="#" class="cl-x" data-xt="t-ca-read" data-xs="ca-tmpl">
  document.addEventListener('click',e=>{const a=e.target.closest('a.cl-x');if(!a)return;e.preventDefault();e.stopImmediatePropagation();
    if(window.SHOW_TAB)window.SHOW_TAB(a.dataset.xt,true);
    const s=a.dataset.xs&&document.getElementById(a.dataset.xs);
    if(s)setTimeout(()=>s.scrollIntoView({block:'start'}),30);else{const p=document.getElementById('parts');if(p)p.scrollIntoView({block:'start'})}},true);
  // switches: <div class="seg cl-sw" data-pre="id"><button data-m="out.simple_cpu">..</button></div>
  function switches(root){root.querySelectorAll('.cl-sw').forEach(sw=>{const pre=document.getElementById(sw.dataset.pre);
    const set=b=>{sw.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));const t=get(b.dataset.m);pre.innerHTML=t==null?'missing':(b.dataset.lang?code(String(t),b.dataset.lang):esc(t));
      const cap=sw.dataset.cap&&document.getElementById(sw.dataset.cap);if(cap)cap.innerHTML=b.dataset.c||''};
    sw.addEventListener('click',e=>{const b=e.target.closest('button');if(b)set(b)});const first=sw.querySelector('button.on')||sw.querySelector('button');if(first)set(first)})}
  function nav(){const n=document.getElementById('cl-nav');if(!n||!('IntersectionObserver' in window))return;
    const links=[...n.querySelectorAll('a')];const map={};links.forEach(a=>map[a.getAttribute('href').slice(1)]=a);
    const io=new IntersectionObserver(es=>{es.forEach(en=>{if(en.isIntersecting){links.forEach(a=>a.classList.remove('cur'));const a=map[en.target.id];if(a){a.classList.add('cur');n.scrollLeft=Math.max(0,a.offsetLeft-40)}}})},{rootMargin:'-45% 0px -50% 0px'});
    Object.keys(map).forEach(id=>{const s=document.getElementById(id);if(s)io.observe(s)})}
  const onRender=(tab,f)=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[tab]=window.TAB_RENDER[tab]||[]).push(f)};
  function onResize(tab,f){let t=0;addEventListener('resize',()=>{const r=document.getElementById(tab);if(!r||r.hidden)return;clearTimeout(t);t=setTimeout(f,80)})}
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  TABS.forEach(id=>{const el=document.getElementById(id);if(el){fill(el);switches(el)}});
  nav();
  return {CL,get,fmt,esc,code,srcLink,fill,onRender,onResize,css,width};
})();
