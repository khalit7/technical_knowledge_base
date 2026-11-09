// ---- Reading tab: predict-then-reveal (data: window.DG) ----
(function(){
  const E=RD.esc, $=id=>document.getElementById(id);
  // predict-then-reveal: <div class="pr" data-r="index of the right option">
  document.querySelectorAll('#t-read .pr').forEach(pr=>{
    const r=pr.dataset.r;pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.a===r);x.classList.toggle('wrong',x===b&&x.dataset.a!==r)});
      const a=pr.querySelector('.ans');a.hidden=false;RD.tabLinks(a)}))});

  // the n-gram rules are Fig. 1, the 3D stage in 26_js_sc_ng.js (2026-11-09; this file held the 2D stepper before)
})();
