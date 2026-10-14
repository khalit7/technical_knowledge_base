// ---- Pipeline lab: predict-then-reveal widgets and links into other tabs' sections ----
(function(){
  const t=document.getElementById('t-pipe');if(!t)return;
  t.querySelectorAll('.pip-pr[data-ans]').forEach(el=>window.PIP.predict(el));
  window.PIP.goLinks(t);
  // in-tab section links scroll inside the page (the nav sits at the top of the tab)
  t.querySelectorAll('.pip-nav a').forEach(a=>a.addEventListener('click',e=>{const s=document.getElementById(a.getAttribute('href').slice(1));if(s){e.preventDefault();s.scrollIntoView({block:'start'})}}));
})();
