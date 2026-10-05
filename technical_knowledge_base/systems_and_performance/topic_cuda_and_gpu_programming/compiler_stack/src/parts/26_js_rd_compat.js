// ---- Reading: targets, fat binaries, feature matrix, the sm_90a trap, wheel contents ----
(function(){
  const D=window.CSD,E=RD.esc;
  document.getElementById('cs-codes').textContent=D.gpu_codes.join(', ');
  document.getElementById('cs-defarch').textContent=D.default_arch.map(l=>l.replace(/^(ELF|PTX) file\s+\d+:\s+/,'$1 ').replace(/^\S+\s\S*?\.(sm_\w+)\.(cubin|ptx)/,'$1')).join(' ');
  const fd={arch_sm90a:'-arch=sm_90a',arch_sm90:'-arch=sm_90',arch_compute90:'-arch=compute_90',code_sm90_only:'-gencode arch=compute_90,code=sm_90',two_plus_ptx:'two -gencode: sm_80, and sm_90 + compute_90',family_100f:'-arch=sm_100f',all_major:'-arch=all-major',torch_like:'five SASS targets + PTX 12.0 (like a PyTorch build)'};
  document.getElementById('cs-fatT').innerHTML='<tr><th>Flags</th><th>SASS images</th><th>PTX images</th><th class="num">object bytes</th></tr>'+Object.keys(fd).map(k=>{const f=D.fat[k];
    const s=f.images.filter(x=>x[0]==='SASS').map(x=>x[1]),p=f.images.filter(x=>x[0]==='PTX').map(x=>x[1].replace('sm_','compute_'));
    return '<tr><td><code>'+E(fd[k])+'</code></td><td>'+(s.join(', ')||'<span class="ann">none</span>')+(k==='family_100f'?' <span class="mute">(listed as sm_100; the fat binary records it as 100f: '+E(D.f100_images.join('; '))+')</span>':'')+'</td><td>'+(p.join(', ')||'<span class="ann">none</span>')+'</td><td class="num">'+f.bytes.toLocaleString('en-US')+'</td></tr>'}).join('');
  const K=[['k1_vadd','vector add (plain CUDA)'],['k7_mma_fp8','FP8 mma.sync'],['k11_tma','TMA copy + thread-block cluster'],['k8_wgmma','Hopper wgmma'],['k9_tcgen05','Blackwell tcgen05 (TMEM)']];
  const A=Object.keys(D.feature.k1_vadd);
  document.getElementById('cs-featT').innerHTML='<tr><th>Kernel</th>'+A.map(a=>'<th style="writing-mode:vertical-rl;transform:rotate(180deg);font-weight:600;padding:4px 2px">'+a+'</th>').join('')+'</tr>'+K.map(k=>'<tr><td>'+k[1]+'</td>'+A.map(a=>{const c=D.feature[k[0]][a];return c[0]===0?'<td style="color:var(--good);text-align:center">✓</td>':'<td style="color:var(--bad);text-align:center;cursor:help" title="'+E(c[1])+'">✗</td>'}).join('')+'</tr>').join('');
  const okIn=k=>A.filter(a=>D.feature[k][a][0]===0);
  document.getElementById('cs-featTxt').innerHTML='Read across: wgmma assembles only for <b>'+okIn('k8_wgmma').join(', ')+'</b> (the B200 cannot run it at all); tcgen05 only for <b>'+okIn('k9_tcgen05').join(', ')+'</b>, so ptxas refuses tcgen05 for the 12.x family (RTX 5090, DGX Spark) even with an <code>a</code> or <code>f</code> target, and accepts it for Jetson Thor\u2019s sm_110a; TMA and clusters work from sm_90 on, including plain sm_90 and every Blackwell; FP8 <code>mma.sync</code> needs sm_89 (the error on sm_80: “'+E(D.feature.k7_mma_fp8.sm_80[1].replace(/^ptxas\s+line \d+; error\s+:\s*/,''))+'”). Accepted by ptxas is not the same as fast: on sm_90a and sm_100a that FP8 mma.sync is emulated with FP16 instructions, as the parent page’s Compiler explorer shows.';
  document.getElementById('cs-gotcha').textContent=D.gotcha.join('\n');
  const W=D.torch_wheels['13.4'];
  const cc=v=>(v/10|0)+'.'+v%10;
  document.getElementById('cs-whl').textContent=W.x86_64.map(cc).join(', ');
  document.getElementById('cs-whlA').textContent=W.aarch64.map(cc).join(', ');
  const pr=document.getElementById('cs-pr1');
  pr.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    pr.querySelectorAll('button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a==='1')x.classList.add('right')});if(b.dataset.a!=='1')b.classList.add('wrong');
    const a=pr.querySelector('.ans');a.hidden=false;a.innerHTML='It runs the <b>sm_100</b> machine code: a cubin runs on the same major version at an equal or higher minor, and 10.3 is 10.x with minor 3 ≥ 0. No JIT, no error. The same wheel on a GPU of a new major version (a CC 13.0 part, say) would fail with "no kernel image", because release wheels carry no PTX; the nightly, with PTX for 12.0, would JIT-compile at first use. Try both in the {{Will it run?|#t-run}} tab.';});
  RD.tabLinks(pr);
})();
