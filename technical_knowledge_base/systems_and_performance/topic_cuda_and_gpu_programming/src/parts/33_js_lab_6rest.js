// ---- Kernel lab: H100 table, the Triton side, method notes and interview questions ----
(function(){
  const X=window.LABX,D=X.D,$=X.$,C=X.calc,f=X.fmt,R=D.roof,M=D.meta;
  // H100 SXM, vendor (NVIDIA H100 page, fetched 2026-10-05; tensor figures halved from the sparse ones printed there)
  const H={bw:3.35,fp32:67,tf32:494.5,bf16:989.5,smem_block_kb:227,semi_bf16:720,fa3_fp16:740};
  const s6=X.find('softmax','S6'),m7=X.find('matmul','M7'),ml=X.find('matmul','L'),f1=X.find('fused','F1',4096),u=X.find('fused','U_lib',4096);
  const fl=X.find('attention','flash',8192),sd=X.find('attention','sdpa',8192),fl16=X.find('attention','flash',16384);
  const minB=C.smMinBytes(s6.R,s6.C),gfa=c=>C.gflops(c.flops,c.ms);
  const tc=k=>D.tcomp[k]||{};
  const rows=[
    ['Softmax, 16,384 x 4,096 fp32 (memory-bound)','S6: '+X.fms(s6.ms)+' ms, '+f(C.gbs(minB,s6.ms),0)+' GB/s ('+f(100*C.gbs(minB,s6.ms)/R.copy_gbs,0)+'% of the copy roof)',
      'HBM3 '+H.bw+' TB/s <span class="lab-tag p">published</span>','Floor: 512 MiB / '+H.bw+' TB/s = '+f(C.floorMs(minB,H.bw),2)+' ms <span class="lab-tag d">derived</span>, about '+f(H.bw*1e3/R.copy_gbs,0)+' times faster, if the kernel reaches peak bandwidth (none quite does). Same ladder, same lesson.'],
    ['Matmul, 2,048<sup>2</sup> fp32','M7: '+f(C.gflops(m7.flops,m7.ms),0)+' GFLOP/s; MLX '+f(C.gflops(ml.flops,ml.ms),0)+'; plain-FMA peak '+f(R.peak_fp32_gf,0),
      'FP32 (CUDA cores) '+H.fp32+' TFLOP/s; TF32 tensor '+H.tf32+', BF16 tensor '+H.bf16+' dense <span class="lab-tag p">published</span>. Independent: BF16 GEMM about '+H.semi_bf16+' TFLOP/s (SemiAnalysis)',
      'The matmul moves to <b>tensor cores</b>, '+f(H.bf16/H.fp32,0)+' times the FP32 rate in BF16. The rungs M5 to M7 become mma / wgmma tiles: Triton\'s <code>tl.dot</code> compiled to '+(tc('matmul_fp16.sm_80').sass||{}).HMMA+' HMMA instructions for sm_80 and '+(tc('matmul_fp16.sm_90a').sass||{}).HGMMA+' HGMMA for sm_90a <span class="lab-tag c">compiled</span>.'],
    ['Fused softmax + matmul, N = 4,096','online fused '+X.fms(f1.ms)+' ms against '+X.fms(u.ms)+' ms unfused',
      'Ridge point: '+H.bf16+' TFLOP/s / '+H.bw+' TB/s',
      f(H.bf16/H.bw,0)+' FLOP per byte against about '+f(R.peak_fp32_gf/R.copy_gbs,0)+' here <span class="lab-tag d">derived</span>: on an H100 a byte costs about 10 times more arithmetic than here, so every unfused trip to memory hurts more. Fusion matters more there, not less.'],
    ['Attention, flash-style','ours '+f(gfa(fl)/1e3,2)+' TFLOP/s, MLX '+f(gfa(sd)/1e3,2)+' (fp32, N = 8K)',
      'FlashAttention-2: 50 to 73% of A100 peak. FlashAttention-3: up to '+H.fa3_fp16+' TFLOP/s in FP16 on H100 (75%), close to 1.2 PFLOP/s in FP8 <span class="lab-tag p">published</span> (authors\' measurements)',
      'Our 16K case ('+X.fms(fl16.ms)+' ms here) at FlashAttention-3\'s FP16 rate: '+f(fl16.flops/(H.fa3_fp16*1e12)*1e3,2)+' ms <span class="lab-tag d">derived</span>, in fp16 rather than fp32. The extra speed comes from tensor cores (wgmma), TMA copies and overlapping softmax with matmuls across warpgroups, none of which this GPU has.'],
    ['On-chip memory for tiles','32 KB threadgroup memory per threadgroup; our tiles: 64 query rows x 32 keys',
      'Up to '+H.smem_block_kb+' KB shared memory per block, 64K 32-bit registers per SM <span class="lab-tag p">published</span>',
      'Bigger tiles, more reuse: Triton\'s fp16 flash kernel compiled for sm_90a asks for '+f((tc('flash_attn_fp16.sm_90a').shared_meta||0)/1024,0)+' KB of shared memory <span class="lab-tag c">compiled</span>, twice what the M1 allows a threadgroup.']];
  $('lab-h100').innerHTML='<tr><th>Step</th><th>Measured here (M1 Pro GPU) <span class="lab-tag m">measured</span></th><th>H100 SXM</th><th>What changes</th></tr>'+rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(i?' data-l="'+['','Measured here','H100 SXM','What changes'][i]+'"':'')+'>'+c+'</td>').join('')+'</tr>').join('');

  // ---- Triton side ----
  const TK=[['softmax_3pass','softmax 3 passes',null],['softmax_online','softmax online',null],['softmax_row','softmax row on chip',null],['matmul','matmul','matmul_fp16'],['softmax_matmul','softmax + matmul','softmax_matmul_fp32'],['flash_attn','flash attention','flash_attn_fp16']];
  const CNT=[['regs','registers per thread'],['shared_meta','shared memory (bytes)'],['num_warps','warps per program'],['sass_instructions','SASS instructions'],['HMMA','HMMA (Ampere tensor core)'],['HGMMA','HGMMA (Hopper wgmma)'],['LDGSTS','LDGSTS (async copy)'],['MUFU.EX2','MUFU.EX2 (exp)'],['SHFL','SHFL (warp shuffle)'],['BAR','BAR (barrier)']];
  function tri(k){
    const t=TK.find(x=>x[0]===k),ck=t[2]||k;
    $('lab-tr-src').textContent=D.tsrc[k];
    const ch=D.interp.filter(c=>c.kernel===k);
    const a=tc(ck+'.sm_80'),b=tc(ck+'.sm_90a');
    const val=(o,key)=>o[key]!=null?f(o[key]):(o.sass&&o.sass[key]!=null?f(o.sass[key]):'n/a');
    $('lab-tr-info').innerHTML='<p class="small" style="margin:0 0 6px"><b>Correct on the CPU</b> (TRITON_INTERPRET=1 against PyTorch, float64 reference): '+
      ch.map(c=>(c.dtype?c.dtype+', ':'')+'shape '+c.shape.join(' x ')+': max error '+c.max_abs_err.toExponential(1)).join('; ')+'.</p>'+
      '<div class="tw"><table class="lab-t"><tr><th>Compiled as '+X.esc(ck)+'</th><th class="num">sm_80 (A100)</th><th class="num">sm_90a (H100)</th></tr>'+
      CNT.map(([key,l])=>'<tr><td>'+l+'</td><td class="num">'+val(a,key)+'</td><td class="num">'+val(b,key)+'</td></tr>').join('')+'</table></div>'+
      '<p class="lab-note">Block sizes: '+Object.entries(a.constexprs||{}).map(([k2,v])=>k2+' = '+v).join(', ')+'. Triton '+M.triton+' in the '+M.image+' image (CUDA '+M.cuda_toolkit+'), resources from <code>cuobjdump -res-usage</code>.</p>';
  }
  X.seg($('lab-tr-k'),TK.map(t=>[t[0],t[1]]),'flash_attn',tri);tri('flash_attn');

  // ---- method ----
  const meth=[
    'Machine: '+M.device+' ('+M.arch+'), 16-core GPU, '+M.memory_gb+' GB unified memory; MLX '+M.mlx+', Python '+M.python+', NumPy '+M.numpy+'. Kernels are Metal source passed to <code>mx.fast.metal_kernel</code>, exactly as shown above.',
    'Timing: two warm-up calls, then '+M.trials+' timed trials of several calls each (each trial at least about 60 ms), ended by <code>mx.synchronize()</code>; the median trial per run, then the median of '+M.runs+' full runs ('+M.run_dates.join(', ')+'). Ranges shown are the fastest and slowest single trial across all runs.',
    'The laptop was shared with other jobs: 1-minute load average '+M.load_range[0]+' to '+M.load_range[1]+' during the runs. Single slow trials appear in some ranges; medians were stable across runs (each case\'s three run medians are in <code>src/lab/out/data.json</code>).',
    'Correctness: every kernel was checked against a float64 NumPy reference at the measured size before timing (attention above N = 4,096 against MLX\'s own fused kernel). Peak memory: <code>mx.reset_peak_memory()</code> then one call, read with <code>mx.get_peak_memory()</code>.',
    'Bugs kept as lessons: M7 without loop unrolling ran 34 times slower; and the first fused kernel synchronised with <code>simdgroup_barrier</code> and gave wrong rows (1 to 5 of 4,096, at random, only at full size): a threadgroup barrier fixed it. Small tests passed both times. Always test at full size, several times.'.replace('34',f(X.find('matmul','M7nu').ms/m7.ms,0)),
    'What does not transfer: absolute speeds, the cache behaviour that made S2 to S6 equal, and the M1\'s lack of faster matrix units. What does: coalescing, reuse through on-chip memory and registers, counting bytes, fusion and the online softmax.',
    'Triton: kernels in <code>src/lab/triton/lab_tl.py</code>, interpreted on the CPU with PyTorch '+M.torch+', compiled with Triton '+M.triton+' for sm_80 and sm_90a ('+X.esc(M.triton_ptxas)+'). No timing on an NVIDIA GPU anywhere on this page.',
    'Reproduce: <code>src/lab/run_all.sh</code>. Derived numbers are recomputed in <code>src/lab/code/recompute.py</code> and the page\'s JavaScript is checked against it.'];
  $('lab-method').innerHTML=meth.map(x=>'<li>'+x+'</li>').join('');
  const IQ=[['Why is softmax memory-bound and matmul compute-bound?','Softmax does about 5 operations per 8 bytes moved; a 2,048 matmul does about 340 per byte at best. Compare with the ridge point (peak FLOP/s over bandwidth): about 30 here, about 300 on an H100 in BF16.'],
    ['What is memory coalescing?','When the 32 threads of a warp access neighbouring addresses, the hardware serves them with a few wide transactions. Strided access needs one transaction per thread: S1 against S2 here, '+f(X.find('softmax','S1').ms/X.find('softmax','S2').ms,0)+' times.'],
    ['Why tile a matmul, and why is shared memory not enough?','Tiling lets each value loaded from DRAM be reused many times. But reading every operand from shared memory still costs a load per FMA; register blocking (each thread computing a small patch of outputs) is what makes it compute-bound.'],
    ['What is the online softmax and why does FlashAttention need it?','A running max and sum, rescaling the partial results by e<sup>old max &minus; new max</sup> when the max grows. It lets a kernel normalise a row it sees one tile at a time, so the N x N score matrix never has to be stored.'],
    ['What does fusion buy you?','Fewer trips to memory and fewer intermediate tensors: here eager softmax was '+f(X.find('softmax','E').ms/X.find('softmax','L').ms,1)+' times slower than one fused kernel, and fused attention kept memory flat while the naive version grew with N<sup>2</sup>.'],
    ['How would you check a custom kernel?','Against a higher-precision reference at the real size, several runs (races show up rarely), with timing that synchronises, warms up and reports a spread; then compare to the roofline to know how far from the limit you are.']];
  $('lab-iq').innerHTML=IQ.map(([q,a])=>'<p class="small" style="margin:6px 0"><b>'+q+'</b><br>'+a+'</p>').join('');
})();
