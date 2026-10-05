// ---- Memory instructions tab (t-sass): ptxas reports and memory instructions per kernel, from window.MHD ----
(function(){
  const D=window.MHD,esc=RD.esc,$=id=>document.getElementById(id),f=MC.fmtN;
  const NAMES={m1_widths:'Load widths and struct layouts',m2_cacheops:'Cache operators',m3_regcap:'Register pressure (128 accumulators)',m4_dynidx:'Run-time indexed array',m5_const:'Constant memory and parameters',m6_shared:'Shared memory declarations',m7_async:'Asynchronous copies'};
  $('sx-nvcc').textContent=(D.nvcc[0]||'').replace('Cuda compilation tools, ','CUDA ');
  $('sx-file').innerHTML=Object.keys(D.src).map(k=>'<option value="'+k+'">'+k+'.cu: '+(NAMES[k]||k)+'</option>').join('');
  const hl=s=>esc(s).replace(/^(@\S+ )?([A-Z][A-Z0-9_.]*)/,(m,a,b)=>(a||'')+'<b>'+b+'</b>');
  function draw(){
    const k=$('sx-file').value,a=$('sx-arch').value,P=(D.ptxas[k]||{})[a]||{};
    const ks=Object.keys(P).sort();
    $('sx-tbl').innerHTML='<table class="tbl-sm"><thead><tr><th>Kernel</th><th class="num">Registers</th><th class="num">Stack frame (B)</th><th class="num">Spill stores (B)</th><th class="num">Spill loads (B)</th><th class="num">Static shared (B)</th></tr></thead><tbody>'+
      ks.map(n=>{const x=P[n];return '<tr><td><code>'+esc(n)+'</code></td><td class="num">'+x.regs+'</td><td class="num">'+x.stack+'</td><td class="num">'+x.spill_st+'</td><td class="num">'+x.spill_ld+'</td><td class="num">'+f(x.smem,0)+'</td></tr>'}).join('')+'</tbody></table>'+
      (k==='m3_regcap'?'<p class="small">The same kernel under <code>-maxrregcount</code>: '+D.regcap.map(r=>r.cap+': '+r[a].regs+' regs, '+r[a].spill_st+' B spilled').join('; ')+'.</p>':'');
    $('sx-sass').innerHTML=ks.filter(n=>D.sass[n]).map(n=>'<h3><code>'+esc(n)+'</code>, memory instructions ('+a+')</h3><pre>'+D.sass[n][a].map(hl).join('\n')+'</pre>').join('')||'<p class="small mute">No instruction excerpt recorded for this file (its point is the ptxas report above).</p>';
    $('sx-src').textContent=D.src[k];
  }
  $('sx-file').addEventListener('change',draw);$('sx-arch').addEventListener('change',draw);
  draw();(window.TAB_RENDER=window.TAB_RENDER||{})['t-sass']=[draw];
})();
