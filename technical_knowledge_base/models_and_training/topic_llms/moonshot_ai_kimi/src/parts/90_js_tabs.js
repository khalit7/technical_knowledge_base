// ---- Tabs (Reading opens by default) ----
(function(){
  const bar=document.getElementById('tabs');const btns=[...bar.querySelectorAll('button')];
  function show(id){
    btns.forEach(b=>b.setAttribute('aria-selected',b.dataset.t===id?'true':'false'));
    document.querySelectorAll('.tab').forEach(t=>{t.hidden=t.id!==id});
    (window.TAB_RENDER&&window.TAB_RENDER[id]||[]).forEach(f=>{try{f()}catch(e){window.__jsErr&&window.__jsErr('tab '+id+': '+e.message)}});
    dispatchEvent(new Event('resize'));
  }
  btns.forEach(b=>b.addEventListener('click',()=>show(b.dataset.t)));
  bar.addEventListener('keydown',e=>{const i=btns.findIndex(b=>b.getAttribute('aria-selected')==='true');
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const n=btns[(i+(e.key==='ArrowRight'?1:btns.length-1))%btns.length];n.focus();show(n.dataset.t)}});
  document.querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();show(a.dataset.tab);const g=a.dataset.go&&document.getElementById(a.dataset.go);(g||bar).scrollIntoView({block:'start'})}));
  show('t-read');
})();
