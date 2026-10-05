// ---- Two-level tabs: a part bar (#parts) and the tab bar (#tabs); each tab button carries data-part ----
(function(){
  const bar=document.getElementById('tabs'),pbar=document.getElementById('parts');
  const btns=[...bar.querySelectorAll('button[data-t]')],pbtns=[...pbar.querySelectorAll('button[data-p]')];
  const KEY='tab-'+(document.querySelector('h1')||{}).textContent;const last={};
  function partOf(id){const b=btns.find(x=>x.dataset.t===id);return b?b.dataset.part:'p0'}
  function show(id,save){
    if(!document.getElementById(id))return;const p=partOf(id);last[p]=id;
    pbtns.forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===p?'true':'false'));
    btns.forEach(b=>{b.hidden=b.dataset.part!==p;b.setAttribute('aria-selected',b.dataset.t===id?'true':'false')});
    bar.hidden=btns.filter(b=>b.dataset.part===p).length<2;
    document.querySelectorAll('.tab').forEach(t=>{t.hidden=t.id!==id});
    (window.TAB_RENDER&&window.TAB_RENDER[id]||[]).forEach(f=>{try{f()}catch(e){window.__jsErr&&window.__jsErr(String(e))}});
    dispatchEvent(new Event('resize'));
    if(save){try{localStorage.setItem(KEY,id)}catch(e){}}
  }
  window.SHOW_TAB=show;
  btns.forEach(b=>b.addEventListener('click',()=>show(b.dataset.t,true)));
  pbtns.forEach(b=>b.addEventListener('click',()=>{const p=b.dataset.p;const first=btns.find(x=>x.dataset.part===p);show(last[p]||(first&&first.dataset.t),true)}));
  bar.addEventListener('keydown',e=>{const vis=btns.filter(b=>!b.hidden);const i=vis.findIndex(b=>b.getAttribute('aria-selected')==='true');
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const n=vis[(i+(e.key==='ArrowRight'?1:vis.length-1))%vis.length];n.focus();show(n.dataset.t,true)}});
  document.addEventListener('click',e=>{const a=e.target.closest('a[data-tab]');if(!a)return;e.preventDefault();show(a.dataset.tab,true);pbar.scrollIntoView({block:'start'})});
  let start='t-start';try{const v=localStorage.getItem(KEY);if(v&&document.getElementById(v))start=v}catch(e){}
  show(start,false);
})();
