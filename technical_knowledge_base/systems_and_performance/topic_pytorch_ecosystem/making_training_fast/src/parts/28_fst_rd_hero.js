// ---- Reading top: the hero figure. One step of the larger variant as two bars (time on MPS by phase, memory at the
// peak by category), with each lever of the page written under the part it shrinks. Static: drawn at the measured width.
(function(){
  const D=window.FST,U=window.FU,$=U.$;const el=$('fst-hero');if(!el)return;
  const P=D.hunt_phases_mps.runs.filter(r=>r.stage==='s0').pop().median_ms;
  const big=D.mem.runs.find(r=>r.config==='big'&&r.how==='plain'),pb=big.peak_by;
  const TIME=[['data',P.data,'var(--c5)'],['forward',P.forward,'var(--c1)'],['backward',P.backward,'var(--c4)'],['optimizer',P.optimizer,'var(--c3)']];
  const MEM=[['parameters',pb.PARAMETER/1e6,'var(--c1)'],['AdamW state',pb.OPTIMIZER_STATE/1e6,'var(--c5)'],['gradients',pb.GRADIENT/1e6,'var(--c3)'],['activations',pb.ACTIVATION/1e6,'var(--c2)'],['backward temporaries',pb.AUTOGRAD_DETAIL/1e6,'var(--c4)']];
  // levers: [label, index range of segments it targets]
  const TL=w=>w<700?[[0,0,'data: DataLoader workers (4)'],[1,2,'fwd + bwd: SDPA (11), compile (2), autocast (6)'],[3,3,'optimizer: fused AdamW (5)'],[0,3,'whole step: no per-step .item() (3), MFU (3)']]
    :[[0,0,'data: DataLoader workers (4)'],[1,2,'forward and backward: SDPA kernel (11), torch.compile and CUDA graphs (2, 3), autocast (6)'],[3,3,'optimizer: fused AdamW (5)'],[0,3,'whole step: drop the per-step .item() sync (3); what is left is matmuls, measured by MFU (3)']];
  const ML=w=>w<700?[[0,1,'weights, AdamW: torchao, 8-bit AdamW (12)'],[3,3,'activations: checkpointing (9), micro-batches (7)'],[3,4,'big vocab: fused loss (10); attention (11)']]
    :[[0,1,'weights and AdamW state: fewer bits, torchao and 8-bit AdamW (12); sharding (FSDP2)'],[3,3,'activations: checkpointing and SAC (9), smaller micro-batches with accumulation (7)'],[3,4,'with a big vocabulary: fused linear cross-entropy (10); long context: a fused attention kernel (11)']];
  function bar(y,segs,x0,x1,unit,head,levers){
    const tot=segs.reduce((a,s)=>a+s[1],0),W=x1-x0;let s=RD.t(x0,y-6,head,{fs:12,w:600,fill:'var(--ink)'});
    let x=x0;const xs=[];segs.forEach(g=>{const ww=W*g[1]/tot;xs.push([x,x+ww]);
      s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,ww-1).toFixed(1)+'" height="24" fill="'+g[2]+'" opacity="0.88"/>';
      const lab=g[0]+' '+(g[1]>=10?g[1].toFixed(1):g[1].toFixed(1))+unit;
      if(ww>lab.length*6.3+8)s+=RD.t(x+5,y+16,lab,{fs:11,fill:'var(--bg)',w:600});
      else if(ww>(g[1].toFixed(0).length*6.5+8))s+=RD.t(x+3,y+16,g[1].toFixed(0),{fs:11,fill:'var(--bg)',w:600});
      x+=ww});
    let ly=y+24+8;
    levers.forEach(l=>{const a=xs[l[0]][0],b=xs[l[1]][1];
      // a bracket under the segments this lever shrinks, then its label just below, so no line crosses a label
      s+='<path d="M'+(a+1).toFixed(1)+','+ly+' L'+(a+1).toFixed(1)+','+(ly+4)+' L'+(b-2).toFixed(1)+','+(ly+4)+' L'+(b-2).toFixed(1)+','+ly+'" fill="none" stroke="var(--acc)" stroke-width="1.5"/>';
      const tw=l[2].length*5.9;let anchor='start',tx=a+1;if(tx+tw>x1){anchor='end';tx=Math.max(b-2,Math.min(x1,tx+tw))}
      if(anchor==='end'&&tx-tw<x0){anchor='start';tx=x0}
      s+=RD.t(tx.toFixed(1),ly+17,l[2],{a:anchor,fs:11,fill:'var(--ink)'});ly+=26});
    return [s,ly];
  }
  function draw(){
    const w=RD.width(el),x0=2,x1=w-4;
    const tsum=TIME.reduce((a,s)=>a+s[1],0),msum=MEM.reduce((a,s)=>a+s[1],0);
    let [s1,y1]=bar(18,TIME,x0,x1,' ms','Time on MPS: '+tsum.toFixed(0)+' ms (phases synchronised)',TL(w));
    let [s2,y2]=bar(y1+26,MEM,x0,x1,' MB','Memory at the peak: '+msum.toFixed(1)+' MB, early in backward',ML(w));
    el.innerHTML=RD.svg(w,y2+2,s1+s2,'One training step: time by phase and memory at the peak, with the lever for each part');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
