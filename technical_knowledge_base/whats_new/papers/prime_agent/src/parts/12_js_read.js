// ---- The paper tab, part 1: numbers from recompute.py written into the prose ----
const PT=window.PAPER.tables,RC=window.PAPER.rc;
const getp=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
document.querySelectorAll('[data-rc]').forEach(el=>{const v=getp(RC,el.dataset.rc);if(v==null){__jsErr('missing rc '+el.dataset.rc);return}
  el.textContent=el.dataset.f==='k'?Math.round(v/1000)+',000':typeof v==='number'?fmt(v,Number.isInteger(v)?0:2):String(v)});
// The state hierarchy and the orchestration example are drawn by the 3D stage in 31_js_sc_orc.js (2026-11-13; they were a clickable SVG and a 2D animation).
