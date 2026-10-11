// ---- Reading section 4: tokens per step against k, formula with the measured mean alpha against real runs ----
(function(){
  const D=SD.D,Y=D.yield,el=document.getElementById('sd-yield-svg');if(!el||!Y)return;
  const names=Object.keys(Y);let cur=names.includes('story')?'story':names[0],T='1';
  const label={code_edit:'Code edit',summarize:'Summary',story:'Story',list:'List',sea:'One sentence',animal:'Animal fact'};
  function draw(){const y=Y[cur][T];if(!y)return;const ks=[1,2,3,4,5,6,7,8];
    SD.chart(el,{series:[{pts:ks.map(k=>[k,SD.etok(y.alpha,k)]),color:'var(--c1)',dash:'5 4',label:'formula, mean α = '+SD.fmt(y.alpha,3)},
      {pts:y.ks.map(r=>[r.k,r.mean]),color:'var(--c2)',dots:true,label:'measured (mean of '+(T==='1'?'3 seeds':'1 run')+')',err:T==='1'?y.ks.map(r=>[r.k,r.lo,r.hi]):null},
      {pts:ks.map(k=>[k,k+1]).filter(p=>p[1]<=Math.max(4,...y.ks.map(r=>r.hi||r.mean))*1.1),color:'var(--dim)',w:1,label:'every guess accepted (k + 1)'}],
      xmin:1,xmax:8,ymin:1,ymax:Math.max(4,...y.ks.map(r=>r.hi||r.mean))*1.1,xticks:ks,xlab:'guesses per step (k)',ylab:'tokens per target pass',legend:true,aria:'tokens per step against k'});
    document.getElementById('sd-yield-note').innerHTML='<span class="meas">measured here</span> '+SD.esc(label[cur]||cur)+', '+(T==='1'?'temperature 1, top-k 50':'greedy')+': mean &alpha; is the average over every guess examined of '+(T==='1'?'&Sigma; min(p, q)':'1 when the draft\'s top token equals the target\'s, else 0')+'. Measured tokens per step at k = 4: '+SD.fmt(y.ks.find(r=>r.k===4).mean,2)+'; the formula gives '+SD.fmt(SD.etok(y.alpha,4),2)+'. '+(T==='1'?'Bars: lowest and highest of the 3 seeds. ':'')+'Up to 256 tokens per run; draft Qwen3-0.6B, target Qwen3-1.7B, both 4-bit MLX.';
  }
  SD.segs(document.getElementById('sd-yield-p'),names.map(n=>[n,label[n]||n]),cur,m=>{cur=m;draw()});
  SD.segs(document.getElementById('sd-yield-t'),[['1','Temperature 1'],['0','Temperature 0 (greedy)']],'1',m=>{T=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
