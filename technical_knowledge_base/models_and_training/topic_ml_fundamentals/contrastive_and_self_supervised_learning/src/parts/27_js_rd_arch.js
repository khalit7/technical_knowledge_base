// ---- Reading: one two-branch diagram, six designs (static, a toggle redraws it) ----
(function(){
  const el=document.getElementById('ar-svg');if(!el)return;
  const $=id=>document.getElementById(id);
  // box kinds: a = augmentation or fixed operation, t = trained by the gradient, e = moving-average copy (no gradient)
  const M={
    simclr:{L:['view 1','gradient'],R:['view 2','gradient'],l:[['crop + colour jitter','a'],['encoder f (shared)','t'],['head g (MLP)','t']],r:[['crop + colour jitter','a'],['encoder f (shared)','t'],['head g (MLP)','t']],sg:false,loss:'NT-Xent: positive vs 2(N − 1) negatives',
      cap:'Both branches are the same network and both get gradients. Nothing is asymmetric, so the negatives (every other view in the batch) are the only thing stopping collapse; hence batch 4,096.'},
    moco:{L:['query','gradient'],R:['key','EMA, no gradient'],l:[['augment','a'],['query encoder','t']],r:[['augment','a'],['key encoder (EMA)','e'],['queue: 65,536 keys','a']],sg:true,loss:'InfoNCE: query vs its key + queue',
      cap:'Still contrastive, but the negatives are past keys in a queue. The key encoder is a slow moving average (m = 0.999), so keys computed many steps apart stay comparable.'},
    byol:{L:['online','gradient'],R:['target','EMA, 0.996 → 1'],l:[['augment','a'],['encoder','t'],['projector','t'],['predictor','t']],r:[['augment','a'],['encoder (EMA)','e'],['projector (EMA)','e']],sg:true,loss:'MSE of l2-normalised outputs',
      cap:'No negatives. The online side has an extra predictor and chases a slowly moving target; the target gets no gradient. The asymmetry, not the loss, is what keeps the constant solution out of reach.'},
    simsiam:{L:['view 1','gradient'],R:['view 2','stop-gradient'],l:[['augment','a'],['encoder (shared)','t'],['predictor','t']],r:[['augment','a'],['encoder (shared)','t']],sg:true,loss:'negative cosine, symmetrised',
      cap:'BYOL without the moving average: one shared encoder, a predictor on one side, a stop-gradient on the other. Remove the stop-gradient and ImageNet accuracy falls to 0.1%.'},
    dino:{L:['student','gradient'],R:['teacher','EMA, 0.996 → 1'],l:[['global + local crops','a'],['student ViT','t'],['softmax, τ 0.1','a']],r:[['global crops','a'],['teacher ViT (EMA)','e'],['centre, softmax τ 0.04','a']],sg:true,loss:'cross entropy, teacher → student',
      cap:'Self-distillation: the student matches the teacher\'s softmax over prototypes. Centering stops one prototype winning; the low teacher temperature (sharpening) stops the uniform answer.'},
    vicreg:{L:['view 1','gradient'],R:['view 2','gradient'],l:[['augment','a'],['encoder (shared)','t'],['expander','t']],r:[['augment','a'],['encoder (shared)','t'],['expander','t']],sg:false,loss:'invariance + variance + covariance',
      cap:'Symmetric again, with no negatives: the variance hinge keeps every output dimension varying across the batch, and the covariance term decorrelates the dimensions.'}};
  let m='simclr';
  function box(x,y,w,h,lab,k){
    const st=k==='t'?'fill="var(--acc2)" stroke="var(--acc)"':k==='e'?'fill="var(--soft)" stroke="var(--mute)" stroke-dasharray="4 3"':'fill="var(--bg)" stroke="var(--line)"';
    return '<rect x="'+(x-w/2)+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" '+st+' stroke-width="1.4"/><text x="'+x+'" y="'+(y+h/2+4)+'" text-anchor="middle" font-size="11.5" fill="var(--ink)">'+lab+'</text>'}
  const arrow=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+(y2-4)+'" stroke="var(--mute)" stroke-width="1.3"/><path d="M'+(x2-4)+','+(y2-7)+' L'+x2+','+y2+' L'+(x2+4)+','+(y2-7)+'" fill="none" stroke="var(--mute)" stroke-width="1.3"/>';
  function draw(){
    const C=M[m],W=Math.min(RD.width(el),640),cL=W*0.26,cR=W*0.74,bw=Math.min(180,W*0.46),bh=30,gap=14,top=6;
    let h=box(W/2,top,Math.min(220,W*0.6),bh,'x: one input','a');
    const y0=top+bh+46,n=Math.max(C.l.length,C.r.length),yl=y0+n*(bh+gap)+16;
    [[cL,C.L,C.l],[cR,C.R,C.r]].forEach(([cx,role,bs])=>{
      h+=arrow(W/2,top+bh,cx,y0-22);
      h+='<text x="'+cx+'" y="'+(y0-6)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+role[0]+': '+role[1]+'</text>';
      bs.forEach((b,k)=>{const y=y0+4+k*(bh+gap);h+=box(cx,y,bw,bh,b[0],b[1]);if(k)h+=arrow(cx,y-gap,cx,y)});
      const yb=y0+4+(bs.length-1)*(bh+gap)+bh;h+=arrow(cx,yb,cx,yl);
    });
    if(C.sg){const yb=y0+4+(C.r.length-1)*(bh+gap)+bh,ym=(yb+yl)/2;
      h+='<line x1="'+(cR-7)+'" y1="'+(ym+4)+'" x2="'+(cR+5)+'" y2="'+(ym-4)+'" stroke="var(--bad)" stroke-width="2.4"/><line x1="'+(cR-3)+'" y1="'+(ym+6)+'" x2="'+(cR+9)+'" y2="'+(ym-2)+'" stroke="var(--bad)" stroke-width="2.4"/>'+
        '<text x="'+(cR+13)+'" y="'+(ym+4)+'" font-size="11" fill="var(--bad)">stop-grad</text>'}
    h+=box(W/2,yl,Math.min(W-8,360),bh+4,'loss: '+C.loss,'a');
    el.innerHTML='<div style="max-width:'+W+'px;margin:0 auto">'+PF.svg(W,yl+bh+10,'Two-branch diagram of '+m,h)+'</div>';
    $('ar-cap').textContent=C.cap;
  }
  PF.seg($('ar-seg'),'m',v=>{m=v;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
