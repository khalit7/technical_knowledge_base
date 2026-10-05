// ---- Instruction atlas tab (t-atlas): the compile matrix from cuda/out/matrix.json ----
(function(){
  const L=window.LT,M=L.matrix,esc=RD.esc,$=id=>document.getElementById(id);
  const NAMES={i01_mma_f16:'mma.sync FP16',i02_mma_bf16:'mma.sync BF16',i03_mma_tf32:'mma.sync TF32',i04_mma_s8:'mma.sync INT8',i05_mma_e4m3:'mma.sync FP8 E4M3',i06_mma_f8f6f4_e2m1:'mma.sync FP4 (kind::f8f6f4)',i07_mma_mxf4_blockscale:'mma.sync MXFP4 block-scaled',i08_ldmatrix:'ldmatrix / stmatrix',i10_wgmma_f16_ss:'wgmma m64n128k16 SS',i11_wgmma_f16_rs:'wgmma m64n128k16 RS',i12_wgmma_e4m3:'wgmma FP8 m64n128k32',i13_wgmma_f16_n256:'wgmma m64n256k16',i14_tcgen05_f16:'tcgen05 kind::f16',i15_tcgen05_tf32:'tcgen05 kind::tf32',i16_tcgen05_f8f6f4:'tcgen05 kind::f8f6f4',i17_tcgen05_mxf8f6f4:'tcgen05 MX block-scaled',i18_tcgen05_nvf4:'tcgen05 NVFP4 (4X)',i19_tcgen05_pair:'tcgen05 cta_group::2',i20_tma:'TMA load, multicast, store',i21_setmaxnreg:'setmaxnreg'};
  const main=o=>{const k=Object.keys(o||{});const pri=['UTCHMMA.2CTA','UTCOMMA','UTCQMMA','UTCHMMA','QGMMA','HGMMA','OMMA','QMMA','IMMA','HMMA','UTMALDG.2D.MULTICAST','UTMALDG','LDSM','USETMAXREG'];
    const emu=k.some(x=>x.startsWith('F2FP'))&&k.some(x=>x.startsWith('HMMA'));if(emu)return 'F2FP + HMMA (emulated)';
    for(const p of pri){const f=k.find(x=>x.startsWith(p));if(f)return f.length>22?f.slice(0,22)+'...':f}return k[0]||'ok'};
  const T=M.targets;let cur=['i13_wgmma_f16_n256','sm_90a'];
  function table(){
    let h='<thead><tr><th class="k">Kernel</th>'+T.map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>';
    Object.keys(M.kernels).forEach(k=>{h+='<tr><th class="k">'+esc(NAMES[k]||k)+'</th>';
      T.forEach(t=>{const e=M.kernels[k].t[t];const on=cur[0]===k&&cur[1]===t;
        h+='<td class="c '+(e.ok?'ok':'no')+(on?' on':'')+'" data-k="'+k+'" data-t="'+t+'" tabindex="0" title="'+esc(k+' on '+t)+'">'+(e.ok?esc(main(e.ops)):'&#10007;')+'</td>'});
      h+='</tr>'});
    $('at-tab').innerHTML=h+'</tbody>';
  }
  function detail(){const [k,t]=cur,r=M.kernels[k],e=r.t[t];
    let h='<b>'+esc(NAMES[k]||k)+'</b> on <b>'+t+'</b>: '+(e.ok?'<span style="color:var(--good);font-weight:600">assembled</span>':'<span style="color:var(--bad);font-weight:600">refused by the compiler</span>');
    h+='<p class="small">'+esc(r.comment)+'</p>';
    if(r.ptx.length)h+='<div class="small mute">Key PTX lines (src/cuda/out/'+k+'.ptx)</div><pre>'+esc(r.ptx.join('\n'))+'</pre>';
    if(e.msg&&e.msg.length)h+='<div class="small mute">ptxas / nvcc said</div><pre>'+esc(e.msg.join('\n'))+'</pre>';
    if(e.ok){h+='<div class="small">Registers per thread: <b>'+e.regs+'</b>; static shared memory: <b>'+(e.smem||0).toLocaleString('en-US')+'</b> bytes. Opcodes: <code>'+Object.entries(e.ops).map(([o,n])=>esc(o)+(n>1?' x'+n:'')).join(', ')+'</code></div>';
      if(e.key&&e.key.length)h+='<pre>'+esc(e.key.join('\n'))+'</pre>'}
    $('at-d').innerHTML=h}
  $('at-tab').addEventListener('click',e=>{const c=e.target.closest('td.c');if(!c)return;cur=[c.dataset.k,c.dataset.t];table();detail()});
  $('at-tab').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const c=e.target.closest('td.c');if(!c)return;e.preventDefault();cur=[c.dataset.k,c.dataset.t];table();detail()});
  // extra targets
  const X=L.extra,xt=['sm_107a','sm_110a','sm_121a'];
  $('at-extra').innerHTML='<thead><tr><th class="k">Kernel</th>'+xt.map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>'+Object.keys(X).map(k=>'<tr><th class="k">'+esc(NAMES[k]||k)+'</th>'+xt.map(t=>{const e=X[k][t];return e.ok?'<td class="c ok">'+esc(Object.keys(e.ops).join(' '))+'</td>':'<td class="c no" title="'+esc(e.msg[0]||'')+'">&#10007; '+esc(((e.msg[0]||'').match(/'([^']+)'/)||['',''])[1])+' refused</td>'}).join('')+'</tr>').join('')+'</tbody>';
  // cuBLAS opcode scan
  const O=L.cublas.opcodes,arch=Object.keys(O).filter(a=>O[a].kernels);const ops=['HMMA','IMMA','QMMA','HGMMA','QGMMA','IGMMA','UTCHMMA','UTCQMMA','UTCOMMA','LDGSTS','LDSM','UTMALDG','USETMAXREG','DMMA'];
  const showOps=ops.filter(o=>arch.some(a=>O[a].with[o]));
  $('at-blas').innerHTML='<thead><tr><th class="k">Build</th><th>kernels</th>'+showOps.map(o=>'<th>'+o+'</th>').join('')+'</tr></thead><tbody>'+arch.map(a=>'<tr><th class="k">'+a+(a==='sm_90a'?' (with sm_90)':'')+'</th><td>'+O[a].kernels.toLocaleString('en-US')+'</td>'+showOps.map(o=>'<td>'+(O[a].with[o]?O[a].with[o].toLocaleString('en-US'):'')+'</td>').join('')+'</tr>').join('')+'</tbody>';
  $('at-blasn').textContent='Counts are kernels whose SASS contains the opcode at least once. "-arch sm_90a" in cuobjdump also selects the sm_90 build, so that row covers both; the hidden-name Blackwell kernels are counted like any other.';
  const render=()=>{table();detail()};
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-atlas']=[render];render();
})();
