// Fill every data-lc span on the page from window.LCF (written by src/make_page_data.py from the runs).
// A key missing from LCF is shown as a visible "pending" marker, so the data check catches it.
(function(){
  if(!window.LCF)return;
  const f=(v,k)=>typeof v==='number'?(Number.isInteger(v)?v.toLocaleString('en-GB'):/^(past_|ev_)/.test(k)?v.toFixed(2):String(v)):String(v);
  document.querySelectorAll('[data-lc]').forEach(el=>{const k=el.dataset.lc;if(k in LCF)el.textContent=f(LCF[k],k);else{el.textContent='pending';el.style.color='var(--bad)'}});
})();
