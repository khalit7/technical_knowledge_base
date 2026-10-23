// ---- Reading, prune then distil: Llama 3.1 8B against its width- and depth-pruned 4B students, drawn to scale ----
(function(){
  const $=id=>document.getElementById(id);if(!$('pr'))return;
  // shapes from arXiv 2408.11796 (Llama-3.1-Minitron-4B-Width and -Depth); vocabulary 128,256; 32 query heads, 8 KV groups, head size 128
  const V=128256,QD=32*128,KVD=8*128;
  const M={t:{name:'Llama 3.1 8B',L:32,h:4096,m:14336},w:{name:'Llama-3.1-Minitron-4B-Width',L:32,h:3072,m:9216},d:{name:'Llama-3.1-Minitron-4B-Depth',L:16,h:4096,m:14336}};
  const params=c=>{const layer=2*c.h*QD+2*c.h*KVD+3*c.h*c.m;return {layer,body:c.L*layer,emb:2*V*c.h,total:c.L*layer+2*V*c.h}};
  let mode='t';
  function draw(){
    const el=$('prSvg'),W=RD.width(el),c=M[mode],T=M.t,narrow=W<520;
    const l=8,r=8,top=14,H=narrow?170:200,base=H-22,ph=base-top,colW=(W-l-r)/T.L;
    const sc=ph/(T.h+T.m);
    let s='';
    for(let i=0;i<T.L;i++){const x=l+i*colW+1,w=Math.max(1,colW-2);
      // ghost of the teacher's layer
      s+='<rect x="'+x.toFixed(1)+'" y="'+(base-(T.h+T.m)*sc).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+((T.h+T.m)*sc).toFixed(1)+'" fill="none" stroke="var(--line)" stroke-dasharray="2 2"/>';
      if(i<c.L){s+='<rect x="'+x.toFixed(1)+'" y="'+(base-c.h*sc).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(c.h*sc).toFixed(1)+'" fill="var(--c1)"/>';
        s+='<rect x="'+x.toFixed(1)+'" y="'+(base-(c.h+c.m)*sc).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(c.m*sc).toFixed(1)+'" fill="var(--c6)"/>'}}
    s+='<text x="'+l+'" y="'+(H-6)+'" font-size="11" fill="var(--mute)">layer 1</text><text x="'+(W-r)+'" y="'+(H-6)+'" text-anchor="end" font-size="11" fill="var(--mute)">layer 32</text>';
    s+='<text x="'+(W/2)+'" y="'+(H-6)+'" text-anchor="middle" font-size="11">'+c.L+' layers · hidden '+PF.comma(c.h)+' · MLP '+PF.comma(c.m)+'</text>';
    el.innerHTML=PF.svg(W,H,c.name+': '+c.L+' layers, hidden size '+c.h+', MLP width '+c.m+'; dashed outlines show the 8B teacher',s);
    const p=params(c),pt=params(T);
    $('prN').innerHTML=RD.stat('Parameters',(p.total/1e9).toFixed(2)+'B',PF.pct(p.total/pt.total,0)+' of the teacher')+
      RD.stat('Per layer',(p.layer/1e6).toFixed(1)+'M',c.L+' layers')+
      RD.stat('Embeddings',(p.emb/1e9).toFixed(2)+'B','input and output, '+PF.comma(V)+' × '+PF.comma(c.h)+' each')+
      (mode==='t'?RD.stat('Pretraining tokens','15T','Llama 3.1 8B'):RD.stat('Distillation tokens','94B','plus about 100B to correct the teacher'));
    $('prCap').innerHTML=mode==='t'?'<b>The teacher.</b> Blue: the hidden size (residual width) per layer; teal: the MLP width. Every layer is a candidate for removal, and every head, channel and hidden dimension is ranked by its activations on 1,024 calibration samples.':
      mode==='w'?'<b>Width pruning</b> keeps every layer and trims each one: the least important hidden dimensions and MLP channels go, in every layer at once, and the embeddings shrink with the hidden size. <b>This one won</b>: "the width-pruned Llama variant outperforms the depth-pruned one" (Table 1), after the same 94B tokens of distillation.':
      '<b>Depth pruning</b> removes whole layers (16 of 32) and keeps every width. It recovered less quality than width pruning after the same distillation, which is why Minitron recommends width first.';
  }
  RD.seg($('prM'),m=>{mode=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
