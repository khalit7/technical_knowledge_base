// ---- predict-then-reveal: every .prd block; pick an option, the measured answer appears ----
(function(){
  document.querySelectorAll('.prd').forEach(pr=>{
    const ans=pr.querySelector('.ans'),right=pr.dataset.right;
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('on');x.style.borderColor=''});
      b.classList.add('on');const ok=b.dataset.k===right;
      pr.querySelector('.verdict').textContent=ok?'Right.':'Not quite.';
      ans.hidden=false}));
  });
})();
