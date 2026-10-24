// ---- Reading: predict-then-reveal questions (if any) and the three-specs switcher ----
(function(){
  document.querySelectorAll('#t-read .pr').forEach(pr=>{
    const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a==='1')x.classList.add('right')});
      if(b.dataset.a!=='1')b.classList.add('wrong');ans.hidden=false;}));
  });
  const sm=document.getElementById('rd-spec-mode');
  if(sm)RD.seg(sm,m=>{document.querySelectorAll('#rd-spec-card [data-spec]').forEach(d=>{d.hidden=d.dataset.spec!==m})});
})();
