// Inside a real model: massive activations (largest and median |entry| of the residual stream by layer).
(function(){
  const I=window.IN;if(!I)return;const D=I.D,f=I.fmt,$=I.$,F=D.facts||{};
  const box=$('in-masvg');if(!box)return;let m='smol';
  if($('in-maqwen')&&D.qwen){const Q=D.qwen;
    $('in-maqwen').innerHTML='its largest entry is '+f(F.qwen_big_max,0)+' (layer '+F.qwen_big_layer+', dimension '+F.qwen_big_dim+' of '+f(Q.d,0)+', on token '+F.qwen_big_tok+' "'+I.esc(I.vis((D.qwen.tokens||[])[F.qwen_big_tok]||''))+'"), against a median |entry| of '+f(F.qwen_med,2)+' at that layer: a ratio of about '+f(F.qwen_ratio,-2)+'. It was run in float16, whose largest value is 65,504.'.replace(' ""','')}
  function draw(){const w=I.width(box);let series,leg,note,n;
    if(m==='tiny'){const T=D.tiny;if(!T)return;n=T.after.max_abs.length;
      series=[{y:T.before.max_abs,c:'var(--dim)',dots:1},{y:T.before.median_abs,c:'var(--dim)',dash:'4 3'},{y:T.after.max_abs,c:'var(--c2)',dots:1},{y:T.after.median_abs,c:'var(--c2)',dash:'4 3'}];
      leg='<span><i style="background:var(--dim)"></i>initialisation</span><span><i style="background:var(--c2)"></i>trained (1,500 steps)</span><span>solid: largest |entry|; dashed: median |entry|</span>';
      note='Tiny GPT on the running sequence; layer 0 is the embedding output (token plus learned position). Training grows the stream about '+f(T.after.median_abs[n-1]/T.before.median_abs[n-1],0)+'-fold, but the largest entry stays within about '+f(Math.max(...T.after.max_abs.map((v,i)=>v/T.after.median_abs[i])),0)+' times the median: no massive activation.'}
    else{const S=D[m];if(!S)return;const R=S.resid;n=R.max_abs.length;
      series=[{y:R.max_abs,c:'var(--c2)',dots:1},{y:R.median_abs,c:'var(--c1)',dash:'4 3'},{y:R.tok0_norm,c:'var(--c4)',sw:1.5},{y:R.median_norm,c:'var(--c3)',sw:1.5}];
      leg='<span><i style="background:var(--c2)"></i>largest |entry|</span><span><i style="background:var(--c1)"></i>median |entry|</span><span><i style="background:var(--c4)"></i>norm of token 0</span><span><i style="background:var(--c3)"></i>median norm of other tokens</span>';
      const big=R.big_dims.map(d=>'dim '+d.dim+': '+f(d.max,0)+' (token '+d.tok+')').join('; ');
      note=(m==='smol'?'SmolLM2-135M':'Qwen3-0.6B')+' on the running text, raw residual stream from forward hooks (layer 0 = embedding output; the last point is after the last block, before the final norm). Largest dimensions at layer '+R.big_layer+': '+big+'.'}
    box.innerHTML=I.line({w,h:230,series,log:1,ymin:m==='tiny'?0.01:0.01,ymax:m==='tiny'?200:1e5,xticks:Array.from({length:n},(_,i)=>i).filter(i=>i%(n>10?(w<480?6:3):1)===0).map(i=>({x:i,l:String(i)})),xlab:'layer',ylab:'size (log scale)',
      yf:v=>v>=1000?f(v/1000,0)+'k':f(v,v<1?2:0),label:'Residual stream size by layer'});
    $('in-maleg').innerHTML=leg;$('in-manote').innerHTML=note+' <span class="in-lbl m">measured here</span>'}
  I.seg($('in-mam'),v=>{m=v;draw()});I.onRender(draw);draw();
})();
