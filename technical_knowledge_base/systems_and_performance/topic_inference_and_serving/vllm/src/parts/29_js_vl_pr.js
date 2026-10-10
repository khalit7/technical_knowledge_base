// ---- Reading tab: predict-then-reveal questions (the right option carries data-a="1") ----
(function(){
  document.querySelectorAll('.pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a==='1')x.classList.add('right')});
      if(b.dataset.a!=='1')b.classList.add('wrong');ans.hidden=false}))});
})();
