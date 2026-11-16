// ---- In-page jumps (a[data-jump]): open the tab holding the target, scroll to it and flash it ----
function bindJumps(root){
  (root||document).querySelectorAll('a[data-jump]').forEach(a=>{if(a._j)return;a._j=1;a.addEventListener('click',e=>{
    e.preventDefault();const t=document.getElementById(a.dataset.jump);if(!t)return;
    const tab=t.closest('.tab');const tb=tab&&document.querySelector('#tabs button[data-t="'+tab.id+'"]');
    if(tb&&tb.getAttribute('aria-selected')!=='true')tb.click();
    setTimeout(()=>{t.scrollIntoView({block:'start',behavior:'smooth'});t.classList.add('flash');setTimeout(()=>t.classList.remove('flash'),1800)},30)})});
}
bindJumps(document);
