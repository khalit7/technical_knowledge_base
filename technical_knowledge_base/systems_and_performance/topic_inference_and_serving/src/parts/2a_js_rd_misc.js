// ---- Reading tab: predict-then-reveal questions ----
(function(){
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ok=+pr.dataset.ok,ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===ok)x.classList.add('right')});
      if(+b.dataset.a!==ok)b.classList.add('wrong');ans.hidden=false}))});
})();
