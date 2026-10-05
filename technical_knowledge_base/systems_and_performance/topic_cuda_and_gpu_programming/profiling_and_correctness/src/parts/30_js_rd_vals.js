// ---- Fill the numbers in the Reading prose from the data (window.RDV). The HTML carries the same literal as a
// fallback; check/check_page.mjs fails if any literal differs from the value computed here. ----
(function(){
  const V=window.RDV||{},miss=[];
  document.querySelectorAll('[data-v]').forEach(el=>{const k=el.dataset.v;if(!(k in V)){miss.push(k);return}
    if(el.textContent.trim()!==String(V[k]))el.setAttribute('data-was',el.textContent.trim());el.textContent=V[k]});
  window.RDV_MISSING=miss;
})();
