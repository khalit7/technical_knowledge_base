// ---- Reading tab: predict-then-reveal questions, comparison tables as cards on phones, lab numbers filled from RDG.lab ----
(function(){
  document.querySelectorAll('#t-read table.rd-cmp').forEach(t=>{const h=[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim());
    t.querySelectorAll('tbody tr').forEach(r=>{let i=0;[...r.children].forEach(td=>{td.setAttribute('data-h',h[i]||'');i+=(+td.getAttribute('colspan')||1)})})});
  document.querySelectorAll('#t-read .pr').forEach(pr=>{
    const bs=[...pr.querySelectorAll('.opts button')],ans=pr.querySelector('.ans');
    bs.forEach(b=>b.addEventListener('click',()=>{
      bs.forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.r==='1')x.classList.add('right')});
      if(b.dataset.r!=='1')b.classList.add('wrong');
      ans.hidden=false;
    }));
  });
  // <span data-rd="key"> shows RDG.lab[key] (HTML recorded from a lab's output) or keeps its TODO text until the lab has run
  const L=(window.RDG&&window.RDG.lab)||{};
  document.querySelectorAll('#t-read [data-rd],#t-more [data-rd]').forEach(el=>{const v=L[el.dataset.rd];
    if(v!=null&&v!==''){el.innerHTML=v;el.classList.remove('rd-todo')}});
})();
