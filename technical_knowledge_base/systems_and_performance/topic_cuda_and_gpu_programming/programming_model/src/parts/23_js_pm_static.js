// ---- Reading tab: text filled from window.PM (real compiler output, runs, measurements) ----
(function(){
  const P=window.PM,E=RD.esc,$=id=>document.getElementById(id);
  const fmt=(x,d)=>Number(x).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  // SASS listings
  const sassBlock=(id,lines)=>{const el=$(id);if(el)el.textContent=lines.join('\n')};
  sassBlock('pm-sass-scale',P.sass.scale_1d);
  sassBlock('pm-sass-agg',P.sass.count_naive);
  sassBlock('pm-sass-grid',P.grid_sync_ops);
  // error program output
  const eo=$('pm-err-out');if(eo)eo.textContent=P.errors.calls.join('\n');
  const et=$('pm-err-tab');
  if(et){const want={'700':1,'701':1,'710':1};
    let h='<table><thead><tr><th class="num">Code</th><th>Name and runtime message (printed by the program)</th><th>Header comment (<code>driver_types.h</code>), where quoted</th></tr></thead><tbody>';
    P.errors.codes.forEach(c=>{const cm=P.driver_comments[c[1]];h+='<tr><td class="num">'+E(c[0])+'</td><td><code>'+E(c[1])+'</code><br>'+E(c[2])+'</td><td class="small">'+(cm?E(cm):'')+'</td></tr>'});
    et.innerHTML=h+'</tbody></table>'}
  const pm=$('pm-param-msg');if(pm)pm.textContent=P.params['32760'].msg;
  // launch bounds table
  const lt=$('pm-lb-tab');
  if(lt){const ks=[['heavy_plain','no bounds'],['heavy_lb1024','__launch_bounds__(1024)'],['heavy_lb256x8','__launch_bounds__(256, 8)']];
    const G=P.gpus;
    let h='<table><thead><tr><th>Kernel</th>'+G.map(g=>'<th class="num">'+E(g.name)+' <small class="mute">'+g.arch+'</small></th>').join('')+'</tr></thead><tbody>';
    ks.forEach(([k,lab])=>{h+='<tr><td><code>'+E(lab)+'</code></td>'+G.map(g=>{const r=P.occ[g.arch][k];
      const sp=r.spill_st?'<br><span style="color:var(--bad)">'+fmt(r.spill_st)+' B spilled</span>':'<br><span class="mute">no spills</span>';
      return '<td class="num">'+r.regs+' regs'+sp+'<br><b>'+P.occ_heavy[g.arch][k]+'%</b> occupancy</td>'}).join('')+'</tr>'});
    lt.innerHTML=h+'</tbody></table>'}
  // Python routes
  const py=P.py;
  const ns=py.numba_sim,np_=py.numba_ptx;
  if($('pm-numba-res'))$('pm-numba-res').innerHTML='<span class="rd-pub">run here</span> With <code>NUMBA_ENABLE_CUDASIM=1</code> (numba '+E(py.versions.numba)+', numba-cuda '+E(py.versions.numba_cuda)+') both kernels really ran on the CPU: <code>scale</code> on '+fmt(ns.scale.n)+' elements as '+ns.scale.grid+' blocks of '+ns.scale.block+' threads, correct: <b>'+ns.scale.ok+'</b>; <code>block_sum</code> on 4 blocks of 256 gave '+ns.block_sum.got.join(', ')+', equal to NumPy: <b>'+ns.block_sum.ok+'</b>. Without the simulator, <code>cuda.compile_ptx</code> compiled <code>scale</code> to PTX for sm_90 with NVIDIA\'s NVVM, no GPU needed: '+np_.lines+' lines, <code>'+E(np_.target[0])+'</code>, '+np_.n_params+' kernel parameters for three Python arguments (each array arrives as a data pointer plus its size, shape and strides), and 64-bit index arithmetic (<code>mul.wide.s32</code>, <code>add.s64</code>), where the C++ kernel used 32-bit <code>int</code>. The body: <code>'+E(np_.body.filter(l=>/tid|ntid|ctaid|mul.wide|ld.f32|st.f32|setp/.test(l)).join('  |  '))+'</code>.';
  const cr=py.cupy_raw;
  if($('pm-cupy-res'))$('pm-cupy-res').innerHTML='<span class="rd-pub">run here</span> CuPy '+E(cr.cupy)+' created the <code>RawKernel</code> object, but compiling stopped at <code>'+E(cr.compile_error)+'</code>: the error comes from a CUDA runtime call made before compiling (CuPy compiles for the GPU it finds), so unlike nvcc it needs a driver even to compile. Its docs: code is compiled with NVRTC "at the point of first invocation" and cached ({{CuPy user guide|https://docs.cupy.dev/en/stable/user_guide/kernel.html}}). The launch takes the grid, the block and a tuple of arguments; pass scalars as NumPy or CuPy scalars of the C type in the kernel (<code>cp.float32</code>, <code>cp.int32</code>), as the examples in the docs do.'.replace(/\{\{([^|{}]+)\|([^{}]+)\}\}/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  const te=py.torch_ext;
  if($('pm-torch-res'))$('pm-torch-res').innerHTML='<span class="rd-pub">run here</span> With PyTorch '+E(te.torch)+' (a CPU-only build) the call failed with <code>'+E(te.build_error)+'</code>, even with <code>CUDA_HOME</code> set and nvcc installed: PyTorch disables CUDA extensions on a build without CUDA, by this line of <code>cpp_extension.py</code>: <code>'+E(py.torch_cuda_home.replace(/^\d+:/,''))+'</code>. So the PyTorch you build against must itself be a CUDA build.';
  // predict-then-reveal
  document.querySelectorAll('#t-read .rd-pr').forEach(card=>{const ans=card.querySelector('.ans');
    card.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      card.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.ok)x.classList.add('right')});
      if(!b.dataset.ok)b.classList.add('wrong');ans.hidden=false}))});
  RD.tabLinks(document.getElementById('t-read'));
})();
