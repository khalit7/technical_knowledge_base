// ---- Measured numbers in the prose: <span class="nv" data-n="path.in.CA" data-f="format"> is filled from window.CA ----
// Formats: int (1,234), mb (bytes to MB, 1 decimal), kb (bytes to KB), x1 / x2 / x3 (decimals), pct (fraction to %), raw.
// A path may be "a/b" to show the ratio a / b (formatted with x1 unless a format is given).
(function(){
  const get=p=>p.split('.').reduce((o,k)=>o==null?undefined:o[k],window.CA);
  const F={int:v=>Math.round(v).toLocaleString('en-US'),mb:v=>(v/1048576).toFixed(1),gb:v=>(v/1073741824).toFixed(2),kb:v=>Math.round(v/1024).toLocaleString('en-US'),
    x1:v=>(+v).toFixed(1),x2:v=>(+v).toFixed(2),x3:v=>(+v).toFixed(3),pct:v=>Math.round(v*100)+'%',raw:v=>String(v)};
  document.querySelectorAll('.nv[data-n]').forEach(e=>{
    const p=e.dataset.n; let v;
    if(p.indexOf('/')>0){const [a,b]=p.split('/');v=get(a)/get(b)}else v=get(p);
    const f=F[e.dataset.f||(p.indexOf('/')>0?'x1':'raw')]||F.raw;
    e.textContent=(v==null||Number.isNaN(v))?'(missing)':f(v);
    if(v==null||Number.isNaN(v))window.__jsErr&&window.__jsErr('missing number '+p);
  });
})();
