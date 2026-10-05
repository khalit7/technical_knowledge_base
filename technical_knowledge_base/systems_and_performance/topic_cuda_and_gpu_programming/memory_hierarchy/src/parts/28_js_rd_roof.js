// ---- Reading section 8: the measured M1 roofline, real kernels placed on it, and a calculator ----
(function(){
  const D=window.MHD,f=MC.fmtN,$=id=>document.getElementById(id);
  const roof=D.m1.roof;
  const bw=(()=>{const v=roof.filter(r=>r.F<=16).map(r=>r.gbps).sort((a,b)=>a-b);return v[Math.floor(v.length/2)]})();
  const pk=Math.max(...roof.map(r=>r.rate));
  window.MHROOF={bw:bw,peak:pk,ridge:pk/bw};
  const LAB=[['softmax_fused','Softmax, one pass (fused)','var(--c3)'],['softmax_eager','Softmax, eager (5 kernels)','var(--c2)'],['mm_mlx','Matmul, MLX library','var(--c4)'],['mm_reg','Matmul, 4x4 per thread','var(--c5)'],['mm_naive','Matmul, naive coalesced','var(--bad)']];
  const pt=k=>{const x=D.lab[k];return {ai:x.flops/x.bytes,gf:x.flops/x.ms/1e6,gb:x.bytes/x.ms/1e6}};
  function chart(){
    const xs=[0.3,1000],ridge=pk/bw;
    const series=[{name:'roof (measured)',color:'var(--mute)',dash:'5 4',pts:[{x:xs[0],y:xs[0]*bw},{x:ridge,y:pk},{x:xs[1],y:pk}]},
      {name:'sweep',color:'var(--c1)',pts:roof.map(r=>({x:r.ai,y:r.rate,lo:r.rate_lo,hi:r.rate_hi}))}];
    LAB.forEach(l=>{const p=pt(l[0]);series.push({name:l[1],color:l[2],pts:[{x:p.ai,y:p.gf}]})});
    MC.line($('rd-roof'),series,{logx:true,logy:true,xl:'arithmetic intensity, FLOP per byte (log)',yl:'GFLOP/s (log)',xticks:[0.3,1,3,10,30,100,300,1000],
      xfmt:v=>f(v,v<1?1:0),yfmt:v=>f(v,v<1?1:0),label:'Measured roofline of the M1 Pro GPU',h:300});
  }
  chart();RD.onRender(chart);RD.onResize(chart);
  $('rd-rooftbl').innerHTML='<table class="tbl-sm"><thead><tr><th>Kernel (parent\'s Kernel lab)</th><th class="num">ms</th><th class="num">FLOP/byte</th><th class="num">GB/s (min bytes)</th><th class="num">GFLOP/s</th><th>Under which roof, how far</th></tr></thead><tbody>'+
    LAB.map(l=>{const x=D.lab[l[0]],p=pt(l[0]),lim=Math.min(pk,p.ai*bw);return '<tr><td>'+l[1]+'</td><td class="num">'+f(x.ms,2)+'</td><td class="num">'+f(p.ai,p.ai<1?3:0)+'</td><td class="num">'+f(p.gb,1)+'</td><td class="num">'+f(p.gf,0)+'</td><td>'+(p.ai<pk/bw?'bandwidth':'compute')+' roof, '+f(100*p.gf/lim,0)+'% of it</td></tr>'}).join('')+'</tbody></table>'+
    '<p class="small mute">Minimum bytes: softmax reads and writes 16,384 &times; 4,096 floats once (536.9 MB) and does about 5 FLOPs per element; a 2,048 matmul reads A and B and writes C once (50.3 MB) for 2N&sup3; = 17.2 GFLOP. <span class="der">derived</span> from the parent\'s <span class="meas">measured</span> times. The fused softmax slightly exceeds this sweep\'s bandwidth roof because its roof is the sweep\'s median; the parent measured a plain copy at 164.7 GB/s.</p>';
  // calculator
  const GPUS={h100:{n:'H100 SXM',bw:3350,pk:{bf16:989500,fp32:67000}},a100:{n:'A100 SXM 80GB',bw:2039,pk:{bf16:312000,fp32:19500}},
    r5090:{n:'RTX 5090',bw:1792,pk:{bf16:209500,fp32:104800}},m1:{n:'M1 Pro (measured here)',bw:Math.round(bw*10)/10,pk:{fp32:Math.round(pk)}}};
  const PRE=[['','Your own numbers'],['softmax_fused','Softmax, fused, on M1'],['softmax_eager','Softmax, eager, on M1'],['mm_mlx','Matmul MLX, on M1'],['mm_naive','Matmul naive, on M1']];
  const c=$('rd-calc');
  c.innerHTML='<label>Preset <select id="rd-cpre">'+PRE.map(p=>'<option value="'+p[0]+'">'+p[1]+'</option>').join('')+'</select></label>'+
    '<label>GPU <select id="rd-cgpu">'+Object.keys(GPUS).map(k=>'<option value="'+k+'">'+GPUS[k].n+'</option>').join('')+'</select></label>'+
    '<label>Math <select id="rd-cprec"><option value="bf16">BF16 tensor cores</option><option value="fp32">FP32 CUDA cores</option></select></label>'+
    '<label>Bytes moved (MB) <input id="rd-cmb" type="number" min="0.001" step="any" value="536.9"></label>'+
    '<label>Work (GFLOP) <input id="rd-cgf" type="number" min="0" step="any" value="0.336"></label>'+
    '<label>Time (ms) <input id="rd-cms" type="number" min="0.0001" step="any" value="0.2"></label>';
  function calc(){
    const g=GPUS[$('rd-cgpu').value];let prec=$('rd-cprec').value;if(!g.pk[prec])prec='fp32';
    const mb=Math.max(1e-6,+$('rd-cmb').value||0),gfl=Math.max(0,+$('rd-cgf').value||0),ms=Math.max(1e-6,+$('rd-cms').value||0);
    const gbs=mb/ms,gfs=gfl*1e3/ms,ai=gfl*1e3/mb,peak=g.pk[prec],lim=Math.min(peak,ai*g.bw),ridge=peak/g.bw;
    const frac=gfl>0?gfs/lim:gbs/g.bw;
    const verdict=frac>0.7?(ai<ridge?'memory-bound and near the roof: only fewer bytes help (fuse, smaller types)':'compute-bound and near the roof: use faster math (tensor cores, lower precision)'):
      frac>0.3?'within reach of the roof; profile before rewriting':'far below the roof: an access pattern, occupancy or launch problem (sections 1 to 6)';
    $('rd-calcout').innerHTML=RD.stat('Intensity',f(ai,ai<1?3:1)+' FLOP/B','ridge '+f(ridge,0)+' FLOP/B')+RD.stat('Achieved bandwidth',f(gbs,0)+' GB/s',f(100*gbs/g.bw,0)+'% of '+f(g.bw,0))+
      RD.stat('Achieved compute',f(gfs,0)+' GFLOP/s',f(100*gfs/peak,1)+'% of '+f(peak,0))+RD.stat('Roof at this intensity',f(lim,0)+' GFLOP/s',gfl>0?f(100*frac,0)+'% reached':'no FLOPs: bandwidth only');
    $('rd-calcnote').textContent=(prec!==$('rd-cprec').value?'This GPU has no separate tensor-core figure here; FP32 used. ':'')+'Verdict: '+verdict+'.';
  }
  $('rd-cpre').addEventListener('change',e=>{const k=e.target.value;if(k){const x=D.lab[k];$('rd-cmb').value=+(x.bytes/1e6).toFixed(1);$('rd-cgf').value=+(x.flops/1e9).toFixed(3);$('rd-cms').value=x.ms;$('rd-cgpu').value='m1';$('rd-cprec').value='fp32'}calc()});
  ['rd-cgpu','rd-cprec','rd-cmb','rd-cgf','rd-cms'].forEach(id=>$(id).addEventListener('input',calc));
  calc();
})();
