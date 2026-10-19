// ---- Predict-then-reveal drills (any tab): <div class="pr"> with .opts buttons (data-ok on the right one) and a hidden .ans ----
(function(){
  document.querySelectorAll('.pr').forEach(pr=>{
    const ans=pr.querySelector('.ans'),opts=pr.querySelector('.opts');if(!ans||!opts)return;
    const reveal=()=>{ans.hidden=false;opts.querySelectorAll('button').forEach(b=>{if(b.dataset.ok)b.classList.add('right')})};
    opts.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(!b.dataset.ok)b.classList.add('wrong');reveal()});
    const sk=pr.querySelector('.skip');if(sk)sk.addEventListener('click',e=>{e.preventDefault();reveal()});
  });
})();
