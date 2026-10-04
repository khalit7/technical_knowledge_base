// ---- Tabs ----
(function(){
  const bar=document.getElementById('tabs');const btns=[...bar.querySelectorAll('button')];
  const shown={};
  function show(id,save){
    btns.forEach(b=>b.setAttribute('aria-selected',b.dataset.t===id?'true':'false'));
    document.querySelectorAll('.tab').forEach(t=>{t.hidden=t.id!==id});
    // charts in a newly shown tab measure their width now
    (window.TAB_RENDER&&window.TAB_RENDER[id]||[]).forEach(f=>{try{f()}catch(e){}});
    shown[id]=1;dispatchEvent(new Event('resize'));
    if(save){try{localStorage.setItem('rlmb-tab',id)}catch(e){}}
  }
  btns.forEach(b=>b.addEventListener('click',()=>show(b.dataset.t,true)));
  bar.addEventListener('keydown',e=>{const i=btns.findIndex(b=>b.getAttribute('aria-selected')==='true');
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const n=btns[(i+(e.key==='ArrowRight'?1:btns.length-1))%btns.length];n.focus();show(n.dataset.t,true)}});
  // links inside the reading tab that point at other tabs
  document.querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();show(a.dataset.tab,true);bar.scrollIntoView({block:'start'})}));
  let start='t-read';try{const v=localStorage.getItem('rlmb-tab');if(v&&document.getElementById(v))start=v}catch(e){}
  show(start,false);
})();
