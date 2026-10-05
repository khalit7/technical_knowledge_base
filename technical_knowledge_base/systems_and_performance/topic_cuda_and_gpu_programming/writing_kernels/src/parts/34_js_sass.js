// ---- Compiled for NVIDIA (t-sass) ----
(function(){
  const D=window.WKD,C=D.cuda;
  const GROUPS=[['Reductions',['r1_interleaved','r2_strided','r3_sequential','r4_firstadd','r5_warptail','r6_gridstride','cub_block_sum']],
    ['Scan',['cub_block_scan']],['Matmul ladder',['k1_naive','k2_coalesced','k3_smem','k4_tile1d','k5_tile2d','k6_vectorized']],['Decode GEMV',['dequant_gemv']]];
  const THREADS={r1_interleaved:256,r2_strided:256,r3_sequential:256,r4_firstadd:256,r5_warptail:256,r6_gridstride:256,k1_naive:1024,k2_coalesced:1024,k3_smem:1024,k4_tile1d:512,k5_tile2d:256,k6_vectorized:256,dequant_gemv:256,cub_block_sum:256,cub_block_scan:256};
  // blocks per SM from registers only (cuda_occupancy.h rules as in the root's simulator)
  function blocks(regs,threads,arch){const maxw=arch==='sm_120'?48:64,wpb=Math.ceil(threads/32);
    const rpw=Math.ceil(regs*32/256)*256,w=Math.floor(16384/rpw)*4;return Math.floor(Math.min(w,maxw)/wpb)}
  let arch='sm_90a';
  function render(){
    const g=(c,k)=>c.counts[k]||0;
    let h='<tr><th>kernel</th><th class="num">regs</th><th class="num">smem B</th><th class="num">spill B</th><th class="num">instr.</th><th class="num">FFMA</th><th class="num">LDS</th><th class="num">LDS.128</th><th class="num">LDG</th><th class="num">STS</th><th class="num">BAR</th><th class="num">SHFL</th><th class="num">I2F</th><th class="num">FFMA per LDS</th><th class="num">blocks/SM (regs)</th></tr>';
    GROUPS.forEach(([nm,ks])=>{h+='<tr><td class="grp" colspan="15">'+nm+'</td></tr>';
      ks.forEach(k=>{const c=C[k]&&C[k][arch];if(!c)return;const lds=g(c,'LDS')+g(c,'LDS.128');
        h+='<tr><td><code>'+k+'</code></td><td class="num">'+c.regs+'</td><td class="num">'+c.smem+'</td><td class="num">'+(c.spill_st||0)+'</td><td class="num">'+c.instructions+'</td><td class="num">'+g(c,'FFMA')+'</td><td class="num">'+g(c,'LDS')+'</td><td class="num">'+g(c,'LDS.128')+'</td><td class="num">'+(g(c,'LDG'))+'</td><td class="num">'+g(c,'STS')+'</td><td class="num">'+g(c,'BAR')+'</td><td class="num">'+g(c,'SHFL')+'</td><td class="num">'+g(c,'I2F')+'</td><td class="num">'+(lds&&g(c,'FFMA')?(g(c,'FFMA')/lds).toFixed(1):'')+'</td><td class="num">'+(THREADS[k]?blocks(c.regs,THREADS[k],arch):'')+'</td></tr>'})});
    document.getElementById('sx-tab').innerHTML=h}
  RD.seg(document.getElementById('sx-arch'),a=>{arch=a;render()});
  const code=document.getElementById('sx-code');
  RD.seg(document.getElementById('sx-src'),k=>{code.textContent=D.code[k]});
  code.textContent=D.code.cuda_reduce;
  document.getElementById('sx-nvcc').textContent=D.meta.nvcc;
  render();
  window.WK_blocks=blocks;
})();
