// ---- Numbers in the prose that came with the root Failure lab's sections (2026-10-19), filled from window.FL_DATA ----
(function(){
  const D=window.FL_DATA;if(!D)return;const $=id=>document.getElementById(id);
  // prose numbers from the data
  const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
  const r=D.calc&&D.calc.rates;
  if(r){set('fl-l3-yr',r.l3_gpu_years.toFixed(1));set('fl-l3-rate',r.l3_per_gpu_day.toExponential(1));set('fl-opt-rate',r.opt_per_gpu_day.toExponential(1));set('fl-opt-x',r.ratio.toFixed(1))}
  const S={};D.scen.forEach(s=>S[s.id]=s);
  set('fl-k2r',S['k-crash2'].resume_s.toFixed(1));set('fl-r2r',S['r-crash2'].resume_s.toFixed(1));set('fl-m2r',S['s-maxr2'].resume_s.toFixed(1));
  set('fl-snd',S['s-node'].detect_s.toFixed(1));set('fl-snr',Math.round(S['s-node'].resume_s));set('fl-hg-s',S['s-hang'].detect_s.toFixed(1));
  set('fl-st-v',D.strag.step_ms.map(x=>x[0].toFixed(1)).join(', ').replace(/, ([^,]*)$/,' and $1'));
  const hc=D.hc.drain_s;set('fl-hc-v',Math.min(...hc).toFixed(1)+' to '+Math.max(...hc).toFixed(1));
  const w2=D.elastic.cmp.filter(c=>c[1]===2);const nd=w2.filter(c=>c[2]!==c[3]);
  set('fl-el-nd',nd.length);set('fl-el-nt',w2.length);set('fl-el-mx',Math.max(...w2.map(c=>Math.abs(c[2]-c[3]))).toExponential(1));
  const hl=D.calc&&D.calc.headline_16k;if(hl){set('fl-gp-h1',Math.round(hl.opt_min));set('fl-gp-h2',Math.round(100*hl.goodput_opt));set('fl-gp-h3',Math.round(100*hl.goodput_opt_R60))}
})();
