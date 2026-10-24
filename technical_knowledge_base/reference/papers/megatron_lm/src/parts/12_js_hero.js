// ---- Hero: one transformer layer split across 2 GPUs (redrawn from Figures 3 and 4), static, drawn at the measured width ----
(function(){const host=$('heroSvg');if(!host)return;
  // rows: [kind, title, [lane 1 label, lane 2 label]]; kind full | f | g | split | part
  const R=[['full','Input X: H = 3,072 values per token, on both GPUs'],['f'],
    ['split','Attention: Q, K, V split by columns, whole heads per GPU',['heads 1–16, all local','heads 17–32, all local']],
    ['part','Output projection split by rows',['partial sum','partial sum']],['g'],
    ['full','Dropout, residual, LayerNorm: duplicated'],['f'],
    ['split','MLP: A (3,072 × 12,288) split by columns',['cols 1–6,144, GeLU','cols 6,145–12,288, GeLU']],
    ['part','B split by rows',['Y₁B₁, partial','Y₂B₂, partial']],['g'],
    ['full','Layer output, the same on both GPUs']];
  const BAND={f:'f: copy forward, all-reduce of the gradient backward',g:'g: all-reduce forward, copy backward'};
  const BANDS={f:'f: copy fwd, all-reduce bwd',g:'g: all-reduce fwd, copy bwd'};
  fit(host,w=>{const nar=w<560,fs=nar?11:12.5,pad=2,gap=10,lw=(w-2*pad-gap)/2,bh=26,th=nar?16:18,fh=24;let q='',y=2;
    const X=[pad,pad+lw+gap];
    q+=tx(X[0]+lw/2,y+12,'GPU 1',{fs:fs,a:'middle',w:600})+tx(X[1]+lw/2,y+12,'GPU 2',{fs:fs,a:'middle',w:600});y+=20;
    let nf=0,ng=0;
    R.forEach(([k,t,L],i)=>{
      if(k==='f'||k==='g'){const isg=k==='g';if(isg)ng++;else nf++;
        q+=rc(pad,y,w-2*pad,fh,isg?'var(--c2)':'none',{r:5,op:isg?.4:1,s:'var(--c2)',sw:1.8,da:isg?null:'5 3'});
        q+=tx(w/2,y+fh/2+4,(nar?BANDS:BAND)[k],{fs:fs,a:'middle',c:'var(--ink)',w:600});y+=fh+8;return}
      q+=tx(pad,y+th-5,t,{fs:fs,c:'var(--mute)'});y+=th;
      if(k==='full'){q+=rc(pad,y,w-2*pad,bh,'var(--mute)',{r:4,op:.25})+tx(w/2,y+bh/2+4,'same values on both GPUs',{fs:fs,a:'middle',c:'var(--ink)'});y+=bh+8;return}
      [0,1].forEach(j=>{const c=k==='split'?'var(--c1)':'var(--c2)';
        q+=rc(X[j],y,lw,bh,c,{r:4,op:k==='part'?.22:.85,s:k==='part'?'var(--c2)':null,da:k==='part'?'4 3':null,sw:1.6});
        const lab=L[j];
        if(lab)q+=tx(X[j]+lw/2,y+bh/2+4,lab,{fs:fs,a:'middle',c:k==='split'?'var(--bg)':'var(--ink)',w:k==='split'?600:400})});
      y+=bh+8});
    host.innerHTML=svgW(w,y,q,'One transformer layer on two GPUs: attention heads and MLP columns are split, two g all-reduces forward and two f all-reduces backward per layer');
  });
})();
