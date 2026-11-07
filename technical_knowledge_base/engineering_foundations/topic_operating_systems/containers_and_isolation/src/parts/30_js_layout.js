// ---- Split layout helper (2026-11-07): a side card taller than the window is not sticky (a sticky card taller than the window hides its own bottom) ----
(function(){
  function fit(){if(innerWidth<1100){document.querySelectorAll('#t-read .s3side').forEach(s=>s.style.position='');return}
    document.querySelectorAll('#t-read .s3side').forEach(s=>{s.style.position='';if(s.offsetHeight>innerHeight-70)s.style.position='static'})}
  RD.onRender(()=>setTimeout(fit,0));RD.onResize(fit);addEventListener('load',fit);
  // the cards change height when a mode or step changes; re-check on clicks inside them
  document.querySelectorAll('#t-read .s3side').forEach(s=>s.addEventListener('click',()=>setTimeout(fit,0)));
})();
