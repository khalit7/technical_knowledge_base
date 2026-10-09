// ---- Reading tab: predict-then-reveal buttons (every .pr block) ----
(function(){
  document.querySelectorAll('#t-read .pr').forEach(pr=>{
    const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.ok)x.classList.add('right')});
      if(!b.dataset.ok)b.classList.add('wrong');
      if(ans)ans.hidden=false;
    }));
  });
})();
