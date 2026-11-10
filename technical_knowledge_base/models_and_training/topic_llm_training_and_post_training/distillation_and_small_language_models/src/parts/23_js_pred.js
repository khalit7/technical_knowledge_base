// ---- Reading, predict then reveal ----
(function(){
  document.querySelectorAll('.pred').forEach(pr=>{
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      if(pr.classList.contains('done'))return;pr.classList.add('done');
      pr.querySelectorAll('.opts button').forEach(x=>{if(x.dataset.right)x.classList.add('right');else if(x===b)x.classList.add('wrong')});
    }));
  });
})();
