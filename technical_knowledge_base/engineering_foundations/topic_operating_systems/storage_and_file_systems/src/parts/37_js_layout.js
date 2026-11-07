// ---- Split layout helper (from Containers and isolation via Scheduling and CPU time, 2026-11-07): a right-column card taller than the window is not sticky (a sticky card taller than the window hides its own bottom) ----
(function(){
  function fit(){const ss=document.querySelectorAll('.tab .s3side');if(innerWidth<1100){ss.forEach(s=>s.style.position='');return}
    ss.forEach(s=>{s.style.position='';if(s.offsetHeight>innerHeight-70)s.style.position='static'})}
  RD.onRender(()=>setTimeout(fit,0));addEventListener('resize',()=>setTimeout(fit,60));addEventListener('load',fit);
  // the cards change height when a mode, protocol or step changes; re-check on clicks inside them
  document.querySelectorAll('.tab .s3side').forEach(s=>s.addEventListener('click',()=>setTimeout(fit,0)));
})();
// ---- Section nav: a split section's continuation (rd-s4b, rd-s5c, rd-oneb, ...) marks its section's link too ----
(function(){const nav=document.getElementById('rd-nav');if(!nav||!('IntersectionObserver' in window))return;const links=[...nav.querySelectorAll('a')];
  const io=new IntersectionObserver(es=>es.forEach(en=>{if(!en.isIntersecting)return;const a=nav.querySelector('a[href="#'+en.target.id.replace(/[bcd]$/,'')+'"]');if(!a)return;
    links.forEach(x=>x.classList.remove('cur'));a.classList.add('cur');nav.scrollLeft=Math.max(0,a.offsetLeft-40)}),{rootMargin:'-45% 0px -50% 0px'});
  document.querySelectorAll('#t-read section[id]').forEach(s=>{if(/^rd-(s\d+|one)[bcd]$/.test(s.id))io.observe(s)})})();
