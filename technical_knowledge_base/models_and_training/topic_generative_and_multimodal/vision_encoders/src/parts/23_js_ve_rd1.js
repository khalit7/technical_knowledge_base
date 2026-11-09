// ---- Reading, sections 1 and 2: predictions, FLOP table, errors, position resize animation, token norms, CLIP-score filter ----
(function(){
  const $=id=>document.getElementById(id),E=RD.esc,U=VEU;
  // predict-then-reveal: index of the right option per card
  const RIGHT={'ve-p1':1,'ve-p2':2,'ve-p3':1,'ve-p4':2,'ve-p5':0,'ve-p6':1,'ve-p7':0};
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ok=RIGHT[pr.id];const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===ok)x.classList.add('right')});
      if(+b.dataset.a!==ok)b.classList.add('wrong');ans.hidden=false}))});
  // numbers in the prose are written at build time by src/runs/fill_prose.py
  const R=VE.res;
  // FLOP accounting table
  (function(){const el=$('ve-flops');if(!el)return;const g=x=>x==null?'':x.toFixed(2);
    let h='<h4>One formula, a FLOP counter and two published numbers</h4><div class="tw"><table class="rd-narrow"><thead><tr><th>Model, input</th><th class="num">Formula</th><th class="num">Counter, eager attention</th><th class="num">Counter, fused attention</th><th class="num">Published (timm card)</th></tr></thead><tbody>';
    VE.flops.rows.forEach(r=>{h+='<tr><td>'+E(r.name)+'</td><td class="num">'+g(r.formula_gmacs)+'</td><td class="num">'+g(r.counted_gmacs_eager)+'</td><td class="num">'+g(r.counted_gmacs_sdpa)+'</td><td class="num">'+(r.published_gmacs==null?'<span class="mute">none</span>':g(r.published_gmacs))+'</td></tr>'});
    h+='</tbody></table></div><p class="small mute">GMACs per image. Formula from section 1 (for SigLIP 2 it leaves out the attention-pooling head, which the eager count includes: 0.24 GMACs more). Counter: <code>FlopCounterMode</code> on transformers models built from the configs with random weights, CPU, 2026-10-17 <span class="meas">measured</span>; the fused count equals the formula minus 2N&sup2;DL exactly. Published: timm model cards read 2026-10-17 <span class="indep">third-party</span>. Script: <code>src/runs/flops.py</code>.</p>';
    el.innerHTML=h})();
  // the real error messages are written into the HTML (section 2); check_data.py compares them with out/resolution.json

  // ---- CLIP-score filter on the 16 x 16 matrix ----
  (function(){const card=$('ve-laion');if(!card)return;const S=VE.lab.clip_sim16,keys=VE.lab.keys,t=$('ve-laion-t'),sv=$('ve-laion-svg'),out=$('ve-laion-out');
    const pos=[],neg=[];for(let i=0;i<16;i++)for(let j=0;j<16;j++)(i===j?pos:neg).push({v:S[i][j],i,j});
    function draw(){const th=+t.value;$('ve-laion-v').textContent=th.toFixed(3);
      const pp=pos.filter(p=>p.v>=th).length,np=neg.filter(p=>p.v>=th).length;
      out.innerHTML=RD.stat('True pairs kept',pp+' of 16','')+RD.stat('Wrong pairs kept',np+' of 240','')+RD.stat('Share of kept pairs that are wrong',pp+np?U.pct(np/(pp+np)):'n/a','');
      const W=RD.width(sv),x0=8,x1=W-8,lo=0.05,hi=0.42,X=v=>x0+(v-lo)/(hi-lo)*(x1-x0);let b='';
      [0.1,0.2,0.3,0.4].forEach(v=>{b+='<line x1="'+X(v)+'" y1="10" x2="'+X(v)+'" y2="96" stroke="var(--line)"/>'+RD.t(X(v),108,v.toFixed(1),{a:'middle',fill:'var(--mute)'})});
      b+=RD.t(x0,10,'true pairs',{fill:'var(--mute)'})+RD.t(x0,58,'wrong pairs',{fill:'var(--mute)'});
      pos.forEach((p,k)=>{b+='<circle cx="'+X(p.v)+'" cy="'+(22+(k%3)*7)+'" r="3.6" fill="'+(p.v>=th?'var(--good)':'var(--dim)')+'"><title>'+E(keys[p.i])+' '+p.v.toFixed(3)+'</title></circle>'});
      neg.forEach((p,k)=>{b+='<circle cx="'+X(p.v)+'" cy="'+(68+(k%5)*5.5)+'" r="2.6" fill="'+(p.v>=th?'var(--bad)':'var(--dim)')+'" fill-opacity=".85"><title>image '+E(keys[p.i])+', caption of '+E(keys[p.j])+' '+p.v.toFixed(3)+'</title></circle>'});
      b+='<line x1="'+X(th)+'" y1="4" x2="'+X(th)+'" y2="98" stroke="var(--acc)" stroke-width="2"/>';
      sv.innerHTML=RD.svg(W,114,b,'CLIP cosines of true and wrong pairs with the threshold')}
    t.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw()})();
})();
