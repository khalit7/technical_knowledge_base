// ---- Reading: drills (predict, then reveal) ----
(function(){
  document.querySelectorAll('.drill').forEach(d=>{
    const rev=d.querySelector('.rev');
    d.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      d.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.o===d.dataset.ans)x.classList.add('right')});
      if(b.dataset.o!==d.dataset.ans)b.classList.add('wrong');rev.hidden=false}));
  });
})();
