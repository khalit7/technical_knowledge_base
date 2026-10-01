// ---- KV cache: M_KV = 2 * L * n_kv * d_head * T * b/8, Mixtral 8x7B layout (L=32, n_kv=8, d=128, 16-bit) ----
(function(){
  const $=id=>document.getElementById(id);
  const ctxSteps=[4096,8192,16384,32768,65536,131072,262144,524288,1048576];
  const GiB=1024**3,L=32,n=8,d=128,bits=16,card=80e9;
  const fmtTok=t=>t>=1048576?(t/1048576)+'M':(t/1024)+'K';
  function fmtB(b){const g=b/GiB;if(g>=1)return (g>=10?g.toFixed(g%1<0.05?0:1):g.toFixed(2))+' GiB';return (b/1024**2).toFixed(0)+' MiB'}
  function kv(){
    const T=ctxSteps[+$('kvT').value];
    const perTokLayer=2*n*d*bits/8, perTok=perTokLayer*L;
    $('kvTv').textContent=fmtTok(T)+' tokens';
    const att=(T/131072)**2;
    $('kvAtt').textContent=att>=1?att.toFixed(att<10?1:0)+'×':'1/'+(1/att).toFixed(0);
    const rows=[
      ['Full attention',perTok*T,'2 × 32 × 8 × 128 × T × 2 bytes: 128 KiB per token'],
      ['3:1 linear hybrid',perTok*T/4,'a growing cache in a quarter of the layers (the ratio of Kimi Linear, Qwen3-Next and GLM-5.3-Flash)'],
      ['5:1 windowed',perTokLayer*((L/6)*T+(L-L/6)*Math.min(T,1024)),'one layer in six keeps everything, five keep the last 1,024 tokens (Gemma\'s layout)'],
      ['All linear',0,'a fixed-size state: nothing grows, but exact recall is lost']
    ];
    const max=Math.max(perTok*T,card*1.05);
    $('kvBars').innerHTML=rows.map(r=>'<div class="row"><span class="nm" title="'+r[2]+'">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+(100*r[1]/max).toFixed(2)+'%;background:var(--acc)"></span><span style="position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--bad);left:'+(100*card/max).toFixed(2)+'%"></span></span><span class="val">'+(r[1]===0?'fixed':fmtB(r[1]))+'</span></div>').join('')+
      '<p class="small mute" style="margin:6px 0 0">Cache for one sequence at '+fmtTok(T)+' tokens. Red line: one 80GB accelerator. Hover a row for its arithmetic.</p>';
  }
  $('kvT').addEventListener('input',kv);
  kv();
})();
