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
// ---- numbers quoted in the prose: <span data-lo="key"> filled from LO.facts (gen_data.py); a missing key shows a visible marker ----
(function(){
  const F=(window.LO&&LO.facts)||{};
  document.querySelectorAll('[data-lo]').forEach(el=>{const k=el.dataset.lo;el.innerHTML=(k in F)?F[k]:'[missing '+k+']'});
})();
