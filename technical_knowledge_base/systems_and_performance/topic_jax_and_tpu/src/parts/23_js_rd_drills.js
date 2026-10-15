// ---- Reading tab: predict-then-reveal questions, and the compiler strip of section 3 ----
(function(){
  // comparison tables turn into cards at phone width: each cell carries its column name
  document.querySelectorAll('#t-read table.rd-cmp').forEach(t=>{const h=[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim());
    t.querySelectorAll('tbody tr').forEach(r=>{let i=0;[...r.children].forEach(td=>{td.setAttribute('data-h',h[i]||'');i+=(+td.getAttribute('colspan')||1)})})});
  document.querySelectorAll('#t-read .pr').forEach(pr=>{
    const bs=[...pr.querySelectorAll('.opts button')],ans=pr.querySelector('.ans');
    bs.forEach(b=>b.addEventListener('click',()=>{
      bs.forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.r==='1')x.classList.add('right')});
      if(b.dataset.r!=='1')b.classList.add('wrong');
      ans.hidden=false;
    }));
  });
  // section 3: the running example's train step at each stage (filled from the Compiler lab)
  const el=document.getElementById('rd-xla-strip'),note=document.getElementById('rd-xla-note');
  if(!el)return;
  const X=window.RDJ.xla;
  if(!X){el.innerHTML='<span class="rd-todo">TODO (Compiler lab): the running example\'s train step at each stage: primitives in the jaxpr, operations in StableHLO, operations and fusions in the optimised HLO, compile time (cold and cached), and memory_analysis with and without donation.</span>';return}
  const mx=Math.max(...X.stages.map(s=>s.v));
  el.innerHTML='<div class="rd-bars">'+X.stages.map(s=>'<div><span class="nm">'+RD.esc(s.n)+'</span><span class="tr"><span style="width:'+(100*s.v/mx).toFixed(1)+'%;background:'+(s.c||'var(--acc)')+'"></span></span><span class="v">'+s.v.toLocaleString('en-US')+'</span></div>').join('')+'</div>';
  const mb=b=>(b/1e6).toFixed(1)+' MB';
  note.innerHTML='<span class="meas">measured</span> by the Compiler lab on the running example\'s train step (forward, backward, clipping and AdamW, four layers unrolled): counts are deterministic. '+
    'Compiling took '+X.compile_s.toFixed(1)+' s of wall time ('+X.compile_cpu_s.toFixed(1)+' s of CPU) cold, and '+X.compile_cached_s.toFixed(2)+' s ('+X.compile_cached_cpu_s.toFixed(2)+' s CPU) when loaded from the persistent cache; '+
    'wall times are rough (Apple M1 Pro CPU, shared machine under heavy load, 4 threads, low priority). memory_analysis: '+mb(X.mem_no.total_allocation_bytes)+' without donation, '+mb(X.mem_don.total_allocation_bytes)+' with it.';
})();
