// ---- Latent lab: fill inline numbers and wire predict-then-reveal questions (last Latent lab part) ----
(function(){if(!window.LT)return;const L=window.LT;L.fillNums();L.predicts();
  // in-tab section links scroll inside the page
  document.querySelectorAll('#t-latent .lt-nav a').forEach(a=>a.addEventListener('click',e=>{const s=document.getElementById(a.getAttribute('href').slice(1));if(s){e.preventDefault();s.scrollIntoView({block:'start',behavior:L.RM?'auto':'smooth'})}}));
})();
