// ---- Kernel lab: setup, the softmax ladder and its passes animation ----
(function(){
  const X=window.LABX,D=X.D,$=X.$,C=X.calc,f=X.fmt;
  // names table and ceilings
  const names=[['CUDA','Metal (this GPU)','What it is'],
    ['thread','thread','one lane of work with its own registers'],
    ['warp (32 threads)','SIMD-group (32 threads)','threads that issue one instruction together'],
    ['block','threadgroup','threads that share fast on-chip memory and can wait at a barrier'],
    ['grid','grid','all the threads of one kernel launch'],
    ['global memory','device memory','the big memory (HBM on an H100, the unified memory here)'],
    ['shared memory','threadgroup memory','software-managed on-chip memory per block'],
    ['__syncthreads()','threadgroup_barrier()','wait until every thread of the block arrives'],
    ['__shfl_xor_sync','simd_shuffle_xor, simd_sum','exchange registers inside a warp without memory'],
    ['mma.sync / wgmma','simdgroup_multiply_accumulate','a warp-wide small matrix multiply instruction']];
  $('lab-names').innerHTML=names.map((r,i)=>i===0?r.map(x=>'<div class="h">'+x+'</div>').join(''):
    '<div><code>'+X.esc(r[0])+'</code></div><div><code>'+X.esc(r[1])+'</code></div><div>'+X.esc(r[2])+'</div>').join('');
  const R=D.roof;
  $('lab-ceil').innerHTML='peak fp32 FMA <b>'+f(R.peak_fp32_gf/1e3,2)+' TFLOP/s</b>, stream-copy bandwidth <b>'+f(R.copy_gbs,0)+' GB/s</b>, so the ridge point is about <b>'+f(R.peak_fp32_gf/R.copy_gbs,0)+' FLOP per byte</b>';

  // ---- softmax ladder ----
  const RW={E:['E','Eager: 5 kernels'],EC:['EC','Eager, compiled'],S1:['S1','1 thread per row'],S2:['S2','coalesced'],S3:['S3','SIMD reductions'],S4:['S4','float4'],S5:['S5','online, 2 passes'],S6:['S6','row on chip, 1 pass'],L:['L','MLX library']};
  const ORDER=['E','EC','S1','S2','S3','S4','S5','S6','L'];
  const TRI={S4:'softmax_3pass',S5:'softmax_online',S6:'softmax_row'};
  const EAGER='# What PyTorch eager mode does: one kernel per operation.\n# Every line launches a kernel and writes a full-size\n# intermediate to device memory (except the two reductions,\n# which write one number per row).\nm = mx.max(x, axis=-1, keepdims=True)   # read x\nt = x - m                               # read x, write t\ne = mx.exp(t)                           # read t, write e\ns = mx.sum(e, axis=-1, keepdims=True)   # read e\ny = e / s                               # read e, write y\n';
  const CAP={
    E:'Five separate kernels, the way eager PyTorch runs <code>x.max</code>, <code>x - m</code>, <code>exp</code>, <code>sum</code> and the division: 5 full reads and 3 full writes of a 256 MiB tensor. Correct, simple, and the slowest sensible option.',
    EC:'The same Python under <code>mx.compile</code>, MLX\'s graph compiler, which fuses chains of elementwise operations into one kernel. It saves some trips but the reductions stay separate kernels, so it is still about 3 times off the library. (PyTorch\'s <code>torch.compile</code> plays this role and can fuse reductions too; not run here.)',
    S1:'One thread owns a whole row and walks it three times. Each thread\'s own accesses are sequential, which feels efficient, but the 32 threads of a SIMD-group read addresses 16 KB apart at the same moment, so every memory transaction serves one thread: <b>uncoalesced</b>. And only 16,384 threads exist, too few to hide memory latency.',
    S2:'One threadgroup of 256 threads per row. Thread <i>t</i> reads elements <i>t</i>, <i>t</i>+256, ...: at each step a SIMD-group reads 32 neighbouring floats, one 128-byte transaction: <b>coalesced</b>. Partial maxima and sums are combined with a tree in threadgroup memory: 8 halving steps, each followed by a barrier.',
    S3:'The tree is replaced by <code>simd_max</code> / <code>simd_sum</code>, which combine the 32 lanes of a SIMD-group in registers (CUDA: <code>__shfl_xor_sync</code>); only 8 partial results go through threadgroup memory. Fewer barriers, the same speed here: the kernel is waiting on memory, not on reductions.',
    S4:'Loads and stores move 16 bytes (<code>float4</code>) per instruction instead of 4: a quarter of the memory instructions for the same bytes. On NVIDIA this is the 128-bit <code>LDG.128</code>.',
    S5:'<b>Online softmax</b> (Milakov and Gimelshein, 2018): one pass computes the maximum and the sum together. When a larger value arrives, the running sum is multiplied by e<sup>old max &minus; new max</sup>. Two reads of x instead of three.',
    S6:'Each thread keeps its 16 values of the row in registers (4 <code>float4</code>), so x is read exactly once and y written once: the minimum possible traffic. This is what Triton\'s fused-softmax tutorial does when a whole row fits on chip.',
    L:'MLX\'s own <code>mx.softmax</code>, for reference: a hand-tuned library kernel.'};
  const sm=ORDER.map(k=>X.find('softmax',k)),R0=sm[0].R,C0=sm[0].C,minB=C.smMinBytes(R0,C0);
  const g=c=>C.gbs(minB,c.ms);
  let cur='S2';
  function smRender(){
    const c=X.find('softmax',cur);
    const req=c.passes_r!=null?C.smReqBytes(R0,C0,c.passes_r,c.passes_w):null;
    $('lab-sm-stats').innerHTML=X.stat('Time (median of 3 runs)',X.fms(c.ms)+' ms','range '+X.fms(c.ms_min)+' to '+X.fms(c.ms_max)+' ms')+
      X.stat('Effective bandwidth',f(g(c),0)+' GB/s','512 MiB (read once + write once) / time')+
      X.stat('Share of the copy roof',f(100*g(c)/R.copy_gbs,0)+'%','of '+f(R.copy_gbs,0)+' GB/s')+
      X.stat('Bytes the kernel asks for',req?X.fbytes(req):'not counted',req?(c.passes_r+' reads + '+c.passes_w+' writes of 256 MiB'):'library kernel');
    $('lab-sm-cap').innerHTML='<b>'+RW[cur][0]+'.</b> '+CAP[cur];
    $('lab-sm-mh').textContent=cur==='E'||cur==='EC'?'Python (MLX), timed':cur==='L'?'Library call':'Metal kernel (timed)';
    $('lab-sm-metal').textContent=cur==='E'||cur==='EC'?EAGER+(cur==='EC'?'\n# EC: the same function wrapped in mx.compile(...)\n':''):cur==='L'?'y = mx.softmax(x, axis=-1)\n':D.metal[cur];
    $('lab-sm-th').textContent=TRI[cur]?'Triton: '+TRI[cur]:'Triton';
    $('lab-sm-triton').textContent=TRI[cur]?D.tsrc[TRI[cur]]:(cur.startsWith('S')?'# No Triton version of this rung.\n# In Triton you cannot ask for "one thread per row",\n# a tree in shared memory or a vector width: you write\n# what one program does to a block, and the compiler\n# chooses the thread layout, coalesced loads and the\n# warp-shuffle reductions itself (see section 6).\n':'# Not a kernel you write: see the Metal pane.\n');
    $('lab-sm-rungs').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===cur));
    smPlot();
  }
  function smPlot(){
    const rows=ORDER.map(k=>{const c=X.find('softmax',k);return {label:k+' '+RW[k][1],v:g(c),vt:f(g(c),0)+' GB/s',on:k===cur,col:k==='S1'||k==='E'||k==='EC'?'var(--c2)':k==='L'?'var(--c4)':'var(--c1)'}});
    X.hbars($('lab-sm-plot'),rows,{max:Math.max(R.copy_gbs,...rows.map(r=>r.v))*1.12,ref:{v:R.copy_gbs,label:'copy roof '+f(R.copy_gbs,0)+' GB/s'},aria:'Effective bandwidth of each softmax rung'});
    const L=['S4','S5','L'].map(k=>X.find('softmax_long',k));
    $('lab-sm-plotnote').innerHTML='Effective bandwidth = 512 MiB / measured time, 16,384 x 4,096 fp32. <span class="lab-tag m">measured</span> Long rows (512 rows of 131,072 floats, 512 KB per row): S4 <b>'+X.fms(L[0].ms)+' ms</b>, S5 <b>'+X.fms(L[1].ms)+' ms</b>, MLX library <b>'+X.fms(L[2].ms)+' ms</b>.';
  }
  $('lab-sm-rungs').innerHTML=ORDER.map(k=>'<button data-k="'+k+'"><span class="k">'+k+'</span>'+RW[k][1]+'</button>').join('');
  $('lab-sm-rungs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.k;smRender()});
  const S1=X.find('softmax','S1'),S2=X.find('softmax','S2'),S6=X.find('softmax','S6'),E=X.find('softmax','E'),L=X.find('softmax','L');
  const LS4=X.find('softmax_long','S4'),LS5=X.find('softmax_long','S5');
  const mid=['S2','S3','S4','S5','S6'].map(k=>X.find('softmax',k).ms);
  $('lab-sm-find').innerHTML='Coalescing is the big step: S1 takes <b>'+X.fms(S1.ms)+' ms</b>, S2 <b>'+X.fms(S2.ms)+' ms</b>, <b>'+f(S1.ms/S2.ms,0)+' times</b> faster for the same arithmetic. After that, S2 to S6 all land between '+X.fms(Math.min(...mid))+' and '+X.fms(Math.max(...mid))+' ms ('+f(100*C.gbs(minB,Math.max(...mid))/R.copy_gbs,0)+' to '+f(100*C.gbs(minB,Math.min(...mid))/R.copy_gbs,0)+'% of the copy roof), even though S2 asks for twice the bytes of S6. The likely reason: a 16 KB row is still in the GPU\'s caches when the second and third passes re-read it, so only the first read reaches DRAM (an inference: no cache counters were read). With 512 KB rows the re-reads miss and the passes show: 3 passes take <b>'+X.fms(LS4.ms)+' ms</b>, online 2 passes <b>'+X.fms(LS5.ms)+' ms</b>. Eager mode costs <b>'+f(E.ms/L.ms,1)+' times</b> the library: that gap, not the clever rungs, is what fusion buys a PyTorch user. <b>Lesson: count bytes that reach DRAM, then check with a measurement.</b>';
  X.quiz($('lab-q1'),'S1 (one thread per row) and S2 (256 threads per row, neighbours read neighbours) do identical arithmetic on identical data. How much slower is S1?',['about 2 times','about 10 times','about 50 times'],2,
    'S1 takes '+X.fms(S1.ms)+' ms against '+X.fms(S2.ms)+' ms for S2: '+f(S1.ms/S2.ms,0)+' times. Both read the same bytes; S1 reads them in a pattern the memory system serves one thread at a time. The {{GPU simulator|#t-sim}} shows why, transaction by transaction.'.replace(/\{\{([^|]+)\|#(t-[\w-]+)\}\}/,'<a href="#" data-tab="$2">$1</a>'));

  // ---- passes animation: one row's trips between device memory and the chip ----
  const PM={E:{lab:'Eager (5 kernels)',trips:[['R','x','max'],['R','x','x - m'],['W','t','x - m'],['R','t','exp'],['W','e','exp'],['R','e','sum'],['R','e','e / s'],['W','y','e / s']]},
            S4:{lab:'S4 (3 passes, 1 kernel)',trips:[['R','x','pass 1: max'],['R','x','pass 2: sum'],['R','x','pass 3: write'],['W','y','pass 3: write']]},
            S6:{lab:'S6 (1 pass, 1 kernel)',trips:[['R','x','load row into registers'],['W','y','write result']]}};
  let pm='E';
  function passDraw(i){
    const el=$('lab-pass-svg'),W=X.width(el),H=150,M=PM[pm],tr=M.trips.slice(0,i+1),last=M.trips[i];
    const arrs=['x','t','e','y'].filter(a=>a==='x'||M.trips.some(t=>t[1]===a));
    const cw=Math.min(150,(W-20)/arrs.length-10);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Device memory and chip, with one row moving between them">'+
      '<rect x="2" y="4" width="'+(W-4)+'" height="44" rx="6" fill="none" stroke="var(--lab-dram)"></rect><text x="8" y="16" font-size="10.5" fill="var(--lab-dram)">device memory (DRAM)</text>'+
      '<rect x="2" y="104" width="'+(W-4)+'" height="40" rx="6" fill="none" stroke="var(--lab-chip)"></rect><text x="8" y="140" font-size="10.5" fill="var(--lab-chip)">on chip: registers, threadgroup memory</text>';
    arrs.forEach((a,j)=>{const x=10+j*(cw+10),born=a==='x'||tr.some(t=>t[0]==='W'&&t[1]===a),act=last[1]===a;
      s+='<rect x="'+x+'" y="20" width="'+cw+'" height="20" rx="3" fill="'+(born?(act?'var(--lab-dram)':'var(--soft)'):'none')+'" stroke="var(--lab-dram)" stroke-dasharray="'+(born?'':'3 3')+'" opacity="'+(born?1:0.5)+'"></rect>'+
        '<text x="'+(x+cw/2)+'" y="34" text-anchor="middle" font-weight="600" '+(act&&born?'fill="var(--bg)"':'')+'>'+a+'</text>';
      if(act){const up=last[0]==='W';s+='<line x1="'+(x+cw/2)+'" x2="'+(x+cw/2)+'" y1="'+(up?100:44)+'" y2="'+(up?46:100)+'" stroke="var(--ink)" stroke-width="2" marker-end="url(#lab-ah)"></line>'+
        '<text x="'+(x+cw/2+6)+'" y="78" font-size="11">'+(up?'write':'read')+' 16 KB</text>'}});
    s+='<defs><marker id="lab-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink)"></path></marker></defs></svg>';
    el.innerHTML=s;
    const rd=tr.filter(t=>t[0]==='R').length,wr=tr.filter(t=>t[0]==='W').length,c=X.find('softmax',pm);
    $('lab-pass-cap').innerHTML='<b>Trip '+(i+1)+' of '+M.trips.length+'</b> ('+M.lab+'): '+(last[0]==='R'?'read ':'write ')+'<code>'+last[1]+'</code> for <code>'+X.esc(last[2])+'</code>.'+(i===M.trips.length-1?' Done: '+M.trips.length+' trips of the whole tensor.':'');
    $('lab-pass-stats').innerHTML=X.stat('Trips so far',rd+' reads, '+wr+' writes','of the 256 MiB tensor')+X.stat('Bytes moved so far',X.fbytes((rd+wr)*4*R0*C0),'whole input: (reads + writes) x 256 MiB')+
      X.stat('Measured time, whole design',X.fms(c.ms)+' ms','<span class="lab-tag m">measured</span>');
  }
  X.seg($('lab-pass-mode'),Object.keys(PM).map(k=>[k,PM[k].lab]),pm,m=>{pm=m;pa.reset(PM[pm].trips.length)});
  const pa=X.anim({card:'lab-pass-card',ctl:'lab-pass-ctl',n:PM[pm].trips.length,draw:passDraw,ms:1100,label:'Trip'});
  smRender();pa.show();
  X.onRender(()=>{smPlot();pa.show()});X.onResize(()=>{smPlot();pa.show()});
})();
