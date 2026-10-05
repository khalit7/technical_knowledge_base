// ---- Reading: predict-then-reveal questions ----
(function(){
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>x.classList.remove('right','wrong'));
      b.classList.add(b.dataset.a==='1'?'right':'wrong');pr.querySelectorAll('.opts button[data-a="1"]').forEach(x=>x.classList.add('right'));ans.hidden=false}))});
})();
