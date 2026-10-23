// ---- Kernel lab: setup (names table and ceilings). The softmax and matmul ladders moved to Writing kernels on 2026-10-23 (src/retired/parts) ----
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

})();
