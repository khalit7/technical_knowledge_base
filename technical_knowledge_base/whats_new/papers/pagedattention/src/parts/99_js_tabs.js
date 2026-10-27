// ---- Tabs ---- (the skill template, storage key pagedattention-tab; links may carry data-to to scroll to an element)
(function(){
  const bar=document.getElementById('tabs');const btns=[...bar.querySelectorAll('button')];
  function show(id,save){
    btns.forEach(b=>b.setAttribute('aria-selected',b.dataset.t===id?'true':'false'));
    document.querySelectorAll('.tab').forEach(t=>{t.hidden=t.id!==id});
    // charts in a newly shown tab measure their width now
    (window.TAB_RENDER&&window.TAB_RENDER[id]||[]).forEach(f=>{try{f()}catch(e){console.error(e)}});
    dispatchEvent(new Event('resize'));
    if(save){try{localStorage.setItem('pagedattention-tab',id)}catch(e){}}
  }
  btns.forEach(b=>b.addEventListener('click',()=>show(b.dataset.t,true)));
  bar.addEventListener('keydown',e=>{const i=btns.findIndex(b=>b.getAttribute('aria-selected')==='true');
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const n=btns[(i+(e.key==='ArrowRight'?1:btns.length-1))%btns.length];n.focus();show(n.dataset.t,true)}});
  // links that point at other tabs (optionally at an element inside them)
  document.querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();show(a.dataset.tab,true);const to=a.dataset.to&&document.getElementById(a.dataset.to);if(to){let n=to.nextElementSibling;for(let i=0;i<3&&n;i++,n=n.nextElementSibling)if(n.tagName==='DETAILS'){n.open=true;break}}(to||bar).scrollIntoView({block:'start'})}));
  let start='t-read',scrollTo=null;try{const v=localStorage.getItem('pagedattention-tab');if(v&&document.getElementById(v))start=v}catch(e){}
  // a link may name a tab in the URL (page/#t-tables)
  try{const h=decodeURIComponent(location.hash.slice(1));if(h.startsWith('t-')&&document.getElementById(h))start=h}catch(e){}
  show(start,false);
  if(scrollTo){const el=document.getElementById(scrollTo);if(el)el.scrollIntoView({block:'start'})}
})();
