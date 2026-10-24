// ---- Reading tab, section 5: FineWeb-Edu against DCLM bars. The n-gram decontamination demo was retired on 2026-10-24 (Decontamination, PII and data governance, section 2, owns the stepper) ----
(function(){
  const D=window.RDD,esc=RD.esc;
  const sb=document.getElementById('rd-smol-bars');
  if(sb){const rows=[];D.smol.forEach(r=>{rows.push([r[0]+': FineWeb-Edu',r[1],r[1]>r[2],'var(--c3)']);rows.push([r[0]+': DCLM',r[2],r[2]>r[1],'var(--c1)'])});RD.bars(sb,rows,80,v=>v.toFixed(1))}

})();
