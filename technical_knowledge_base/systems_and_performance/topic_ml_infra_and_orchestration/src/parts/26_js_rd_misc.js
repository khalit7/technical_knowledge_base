// ---- Reading: predict-then-reveal questions, the three-specs switcher, reading time ----
(function(){
  document.querySelectorAll('#t-read .pr').forEach(pr=>{
    const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a==='1')x.classList.add('right')});
      if(b.dataset.a!=='1')b.classList.add('wrong');ans.hidden=false;}));
  });
  const sm=document.getElementById('rd-spec-mode');
  if(sm)RD.seg(sm,m=>{document.querySelectorAll('#rd-spec-card [data-spec]').forEach(d=>{d.hidden=d.dataset.spec!==m})});
  // reading time: words outside widgets, folded answers and code, at 200 a minute
  const r=document.getElementById('t-read');if(r){const c=r.cloneNode(true);
    c.querySelectorAll('style,nav,.rd-card,details,pre,.pr,.rd-todo').forEach(x=>x.remove());
    const words=(c.textContent.match(/\S+/g)||[]).length;window.RD_WORDS=words;
    const e=document.getElementById('rd-time');if(e)e.textContent=Math.round(words/200);}

})();
