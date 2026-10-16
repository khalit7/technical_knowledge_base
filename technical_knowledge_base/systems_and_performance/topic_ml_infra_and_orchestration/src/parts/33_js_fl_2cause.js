// ---- Failure lab: Llama 3 Table 5 bars, and the prose numbers filled from the recorded data ----
(function(){
  const H=window.FL_H,D=window.FL_DATA;if(!H||!D)return;const $=H.$,esc=H.esc;
  const CAT={'GPU':'var(--c1)','Dependency':'var(--c4)','Network':'var(--c6)','Unplanned Maintenance':'var(--c5)','Host':'var(--c2)','Unknown':'var(--mute)'};
  let mode='row';
  function draw(){
    const el=$('fl-l3-svg');if(!el)return;const rows=D.l3.rows,tot=D.l3.unexpected;
    let items;
    if(mode==='row'){items=rows.map(r=>({n:r[0],c:r[1],k:r[2],p:r[3]})).sort((a,b)=>b.k-a.k)}
    else{const m={};rows.forEach(r=>{m[r[1]]=m[r[1]]||{n:r[1],c:r[1],k:0,p:0};m[r[1]].k+=r[2];m[r[1]].p+=r[3]});items=Object.values(m).sort((a,b)=>b.k-a.k)}
    const mx=items[0].k;
    let h='<div class="bars">';
    items.forEach(it=>{
      const pct=100*it.k/tot,bad=mode==='row'&&Math.abs(Math.round(pct*10)/10-it.p)>0.05;
      const note=bad?' <span class="fl-der" title="printed in the paper">printed '+it.p.toFixed(1)+'%</span>':'';
      h+='<div class="row'+(bad?' hl':'')+'"><span class="nm" title="'+esc(it.n)+'">'+esc(it.n)+'</span><span class="track"><span class="fill" style="width:'+(100*it.k/mx).toFixed(1)+'%;background:'+CAT[it.c]+'"></span></span><span class="val">'+it.k+' ('+pct.toFixed(1)+'%)</span></div>'+(note?'<div class="small" style="margin:-2px 0 4px;text-align:right">'+note+' in Table 5</div>':'');
    });
    h+='</div>';
    if(mode==='row'){h+='<div class="fl-leg">'+Object.keys(CAT).map(k=>'<span><i style="background:'+CAT[k]+'"></i>'+esc(k)+'</span>').join('')+'</div>'}
    el.innerHTML=h;
  }
  H.seg($('fl-l3-mode'),m=>{mode=m;draw()});
  H.onRender(draw);draw();
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
