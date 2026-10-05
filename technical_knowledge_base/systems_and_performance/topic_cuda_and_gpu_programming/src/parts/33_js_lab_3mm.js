// ---- Kernel lab: the matmul ladder ----
(function(){
  const X=window.LABX,D=X.D,$=X.$,C=X.calc,f=X.fmt,R=D.roof;
  const ORDER=['M1','M2','M3','M4','M5','M6','M7a','M7','M7nu','L'];
  const LAB={M1:'naive, uncoalesced',M2:'naive, coalesced',M3:'tiles 16x16',M4:'tiles 32x32',M5:'4x4 per thread',M6:'8x8 per thread, float4',M7a:'matrix instr., device mem',M7:'matrix instr. + tiles',M7nu:'M7, not unrolled',L:'MLX library'};
  const SRC={M4:'M3',M7nu:'M7'};
  const CAP={
    M1:'One thread per output element, but the thread index <i>x</i> picks the <b>row</b>: the 32 threads of a SIMD-group read 32 different rows of A and write 32 rows of C, addresses 8 KB apart. The classic first mistake.',
    M2:'Swap one line so <i>x</i> picks the <b>column</b>: neighbouring threads now read neighbouring elements of B and C and the same element of A (a broadcast). Each fused multiply-add (FMA) still loads 2 values, but they mostly come from cache. The Roofline lab measured this kernel at '+f(R.naive_gf,0)+' GFLOP/s.',
    M3:'A 16 x 16 threadgroup copies a tile of A and a tile of B into threadgroup memory, waits at a barrier, and computes from there: every value fetched from device memory is used 16 times. The inner loop still does 2 loads per FMA, now from threadgroup memory. (The Roofline lab\'s "tiled" kernel, '+f(R.tiled_gf,0)+' GFLOP/s there.)',
    M4:'The same kernel with 32 x 32 tiles: twice the reuse, 1,024 threads per threadgroup (the M1\'s maximum). It got <b>slower</b>. We did not profile why; the likely reason is that fewer threadgroups fit on a GPU core at once, leaving fewer warps to hide latency.',
    M5:'<b>Register blocking</b>: 256 threads compute a 64 x 64 block, each thread a 4 x 4 patch kept in 16 registers. Per step a thread loads 4 values of A and 4 of B from threadgroup memory and does 16 FMAs: 0.5 loads per FMA instead of 2. This is the rung that matters on any GPU.',
    M6:'Push further: 8 x 8 outputs per thread (64 registers of accumulators) and 16-byte loads, 0.25 loads per FMA. Also <b>slower</b> here, most likely because the extra registers per thread let fewer threads run per core. On Boehm\'s A6000 the same step gained (table below): the right size is a property of the machine.',
    M7a:'Use Apple\'s 8 x 8 matrix instructions (<code>simdgroup_multiply_accumulate</code>): a whole SIMD-group cooperates on one 8 x 8 x 8 product, the role <code>mma.sync</code> plays on NVIDIA tensor cores. Here operands come straight from device memory.',
    M7:'The same instructions fed from threadgroup tiles (64 x 16 of A, 16 x 64 of B, loaded with <code>float4</code>), each SIMD-group owning a 32 x 32 block of C as 16 accumulators of 8 x 8: the structure MLX, CUTLASS and Triton all use.',
    M7nu:'M7 with one change: the fixed-count loops are not marked for unrolling. Same source, same answer, '+'<b>__R__ times slower</b>'+'.',
    L:'MLX\'s library matmul (<code>A @ B</code>) on the same matrices, the target to chase.'};
  const mm=k=>X.find('matmul',k),gf=c=>C.gflops(c.flops,c.ms);
  CAP.M7nu=CAP.M7nu.replace('__R__',f(mm('M7nu').ms/mm('M7').ms,0));
  let cur='M2';
  function render(){
    const c=mm(cur);
    $('lab-mm-stats').innerHTML=X.stat('Time (median of 3 runs)',X.fms(c.ms)+' ms','range '+X.fms(c.ms_min)+' to '+X.fms(c.ms_max)+' ms')+
      X.stat('Throughput',f(gf(c),0)+' GFLOP/s','2 x 2,048<sup>3</sup> FLOP / time')+
      X.stat('Share of measured peak',f(100*gf(c)/R.peak_fp32_gf,0)+'%','of '+f(R.peak_fp32_gf,0)+' GFLOP/s (FMA kernel)')+
      X.stat('Faster than M1',f(mm('M1').ms/c.ms,1)+'x','same arithmetic, same answer');
    $('lab-mm-cap').innerHTML='<b>'+cur+'.</b> '+CAP[cur];
    $('lab-mm-metal').textContent=cur==='L'?'C = A @ B   # MLX library\n':(cur==='M4'?'// M4 = M3 launched with TS = 32 (32 x 32 threads)\n':cur==='M7nu'?'// M7nu = M7 compiled with UNROLL defined as nothing:\n// #define UNROLL            (instead of)\n// #define UNROLL _Pragma("clang loop unroll(full)")\n':'')+D.metal[SRC[cur]||cur];
    $('lab-mm-th').textContent=cur==='M7'||cur==='L'?'Triton: matmul':'Triton';
    $('lab-mm-triton').textContent=cur==='M7'||cur==='L'?D.tsrc.matmul:'# No separate Triton rung. In Triton the program owns a\n# BM x BN tile of C and tl.dot does the rest: the compiler\n# stages tiles in shared memory, blocks registers, and\n# emits tensor-core instructions (HMMA on sm_80, HGMMA on\n# sm_90a: section 6). BM, BN, BK and num_warps are the\n# knobs this ladder turns by hand.\n';
    $('lab-mm-rungs').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===cur));
    plot();
  }
  function plot(){
    const rows=ORDER.map(k=>{const c=mm(k);return {label:k+' '+LAB[k],v:gf(c),vt:f(gf(c),0),on:k===cur,col:k==='M1'||k==='M7nu'?'var(--c2)':k==='L'?'var(--c4)':k.startsWith('M7')?'var(--c3)':'var(--c1)'}});
    X.hbars($('lab-mm-plot'),rows,{max:R.peak_fp32_gf*1.12,ref:{v:R.peak_fp32_gf,label:'measured FMA peak '+f(R.peak_fp32_gf,0)},lw:200,aria:'GFLOP/s of each matmul rung'});
  }
  $('lab-mm-rungs').innerHTML=ORDER.map(k=>'<button data-k="'+k+'"><span class="k">'+k+'</span>'+LAB[k]+'</button>').join('');
  $('lab-mm-rungs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.k;render()});
  const B=[['1: Naive',309.0,1.3,'M1'],['2: GMEM coalescing',1986.5,8.5,'M2'],['3: SMEM caching',2980.3,12.8,'M3'],['4: 1D blocktiling',8474.7,36.5,''],['5: 2D blocktiling',15971.7,68.7,'M5'],['6: Vectorized mem access',18237.3,78.4,'M6'],['9: Autotuning',19721.0,84.8,''],['10: Warptiling',21779.3,93.7,'M7 (loosely)'],['0: cuBLAS',23249.6,100.0,'L']];
  $('lab-boehm').innerHTML='<tr><th>Boehm kernel</th><th class="num">GFLOP/s</th><th class="num">of cuBLAS</th><th>Closest rung here</th><th class="num">Ours, share of MLX</th></tr>'+
    B.map(r=>{const o=r[3]&&r[3]!=='M7 (loosely)'?mm(r[3]):r[3]?mm('M7'):null;return '<tr><td>'+r[0]+'</td><td class="num">'+f(r[1],1)+'</td><td class="num">'+f(r[2],1)+'%</td><td>'+(r[3]||'none')+'</td><td class="num">'+(o?f(100*mm('L').ms/o.ms,1)+'%':'')+'</td></tr>'}).join('');
  const M2=mm('M2'),M3=mm('M3'),M4=mm('M4'),M5=mm('M5'),M6=mm('M6'),M7=mm('M7'),M7nu=mm('M7nu');
  $('lab-mm-find').innerHTML='<b>Unrolling is not optional.</b> M7 with its fixed-count loops unrolled runs in '+X.fms(M7.ms)+' ms; the identical source without the unroll pragma takes '+X.fms(M7nu.ms)+' ms, '+f(M7nu.ms/M7.ms,0)+' times slower. With the loops rolled, the compiler apparently could not keep the arrays of 8 x 8 matrices in registers (we read the symptom, not the compiled code). The Roofline lab hit the same wall with its peak FMA kernel. On NVIDIA, check the same thing with <code>ptxas -v</code>: spills and local-memory loads show up there ({{Compiler explorer|#t-compile}}). <b>Bigger is not always better.</b> 32 x 32 tiles ('+X.fms(M4.ms)+' ms) lost to 16 x 16 ('+X.fms(M3.ms)+' ms), and 8 x 8 patches per thread ('+X.fms(M6.ms)+' ms) lost to 4 x 4 ('+X.fms(M5.ms)+' ms). Tile sizes trade reuse against how many threads fit on a core; that is why libraries autotune them. And note that M1\'s matrix instructions did not lift the ceiling: everything stays under the '+f(R.peak_fp32_gf/1e3,1)+' TFLOP/s of plain FMAs, whereas NVIDIA\'s tensor cores run about 15 times faster than its FP32 units (section 5).';
  X.quiz($('lab-q2'),'M3 stages 16 x 16 tiles in threadgroup memory, so each value fetched from device memory is used 16 times instead of once. How much faster than M2 do you expect it to be?',['about 16 times','about 4 times','under 2 times'],2,
    'M2 '+X.fms(M2.ms)+' ms, M3 '+X.fms(M3.ms)+' ms: '+f(M2.ms/M3.ms,1)+' times. M2 already got much of that reuse from the caches for free, and M3\'s inner loop still does two loads per FMA, just from threadgroup memory. The big jump comes at M5, where values are reused from <b>registers</b>.');
  render();
  X.onRender(plot);X.onResize(plot);
})();
