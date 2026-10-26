// ---- Hero figure (light pass, 2026-10-26): where in one training step each of the four live sets peaks, the
// operator that caps it, and the paper's own before/after measurement for each (Tables 2, 3, 4 and 6), then the
// composed result (Figure 7b). Static: nothing moves. Numbers are the printed ones; sources are in the caption.
(function(){const el=$('heroSvg');if(!el)return;const AC='var(--acc)',DIM='var(--dim)';
  const R=[
    {n:'Expert dispatch',g:'grows with routes received per GPU',when:'inside every MoE layer, forward and backward',op:'PipelinedLLEP',how:'token chunks with a per-source budget',
     a:52.988,b:22.855,u:'GiB',la:'LLEP',lb:'chunked',src:'Table 6, 95%/16, 65,536 tokens per rank'},
    {n:'Vocabulary projection',g:'grows with tokens × vocabulary',when:'at the head, once per step',op:'Ring-DTP',how:'ring over vocabulary shards, three numbers per token',
     a:79.521,b:10.622,u:'GiB',la:'full logits',lb:'strips',src:'Table 2, N = 32,768, V = 200,000'},
    {n:'Checkpoint boundaries',g:'grows with depth × sequence',when:'held from forward until each layer recomputes',op:'SCO',how:'budgeted copy to host, two restored at a time',
     a:139.790,b:123.728,u:'GiB',la:'whole-step peak',lb:'all 47 offloaded',src:'Table 3, gpt-oss-20b on 8 H200s'},
    {n:'Optimizer state',g:'grows with parameters (already offloaded)',when:'at the update',op:'OffloadStreamAdamW',how:'the idle GPU updates streamed buckets',
     a:3.95,b:1.93,u:'s',la:'CPU Adam',lb:'streamed',src:'Table 4, step time, gpt-oss-20b'}];
  const f=(v,u)=>(u==='s'?v.toFixed(2):v.toFixed(v>=100?1:v>=10?1:2))+' '+u;
  fit(el,w=>{const wide=w>=680;let s='',y=4;
    R.forEach((r,i)=>{
      if(wide){const lw=Math.min(300,w*0.36),bx0=lw+16,bw=w-bx0-150,bh=14;
        s+=tx(2,y+12,r.n,{fs:12,w:600})+tx(2,y+27,r.g,{fs:11,c:'var(--mute)'})+tx(2,y+41,r.when,{fs:11,c:'var(--mute)'});
        s+=tx(bx0,y+12,r.op+': '+r.how,{fs:11,c:AC,w:600});
        const mx=r.a;[[r.a,DIM,r.la],[r.b,AC,r.lb]].forEach(([v,c,lab],j)=>{const yy=y+18+j*(bh+3);s+=rc(bx0,yy,bw*v/mx,bh,c,{r:2})+tx(bx0+bw*v/mx+6,yy+11,f(v,r.u)+' ('+lab+')',{fs:11})});
        s+=tx(bx0,y+18+2*(bh+3)+11,r.src,{fs:11,c:'var(--mute)'});y+=82}
      else{const bw=w-4-120,bh=13;
        s+=tx(2,y+12,r.n,{fs:12,w:600})+tx(2,y+27,r.g,{fs:11,c:'var(--mute)'});
        s+=tx(2,y+43,r.op,{fs:11,c:AC,w:600});y+=50;
        [[r.a,DIM,r.la],[r.b,AC,r.lb]].forEach(([v,c,lab],j)=>{const yy=y+j*(bh+3);s+=rc(2,yy,bw*v/r.a,bh,c,{r:2})+tx(2+bw*v/r.a+5,yy+10,f(v,r.u),{fs:11})});
        y+=2*(bh+3)+4;s+=tx(2,y+10,r.src,{fs:11,c:'var(--mute)'});y+=26}
      if(i<R.length-1)s+=ln2(2,y-6,w-2,y-6,'var(--line)');});
    // composed: the context each scale reaches
    y+=6;s+=tx(2,y+12,wide?'All four inside the MoP layout: longest context that trains (Figure 7b)':'All four inside MoP: longest context',{fs:12,w:600});y+=22;
    const C=[['120B, 16 GPUs',128],['241B, 32 GPUs',32],['667B, 64 GPUs',64]],pl=wide?120:2,cw=w-pl-(wide?150:70),lg=v=>Math.log2(v/16)/Math.log2(1024/16),bh=12;
    C.forEach(([n,k])=>{if(wide)s+=tx(pl-8,y+16,n,{fs:11,a:'end',w:600});else{s+=tx(2,y+10,n,{fs:11,w:600});y+=14}
      s+=rc(pl,y+2,cw*lg(k),bh,DIM,{r:2})+tx(pl+cw*lg(k)+5,y+12,k+'K (FSDP2-best)',{fs:11});
      s+=rc(pl,y+2+bh+3,cw,bh,AC,{r:2})+tx(pl+cw+5,y+bh+15,'1M',{fs:11});y+=2*bh+14});
    s+=tx(pl,y+8,'bar length on a log scale from 16K to 1M tokens',{fs:11,c:'var(--mute)'});y+=14;
    el.innerHTML=svgW(w,y+4,s,'The four live sets of one training step, the operator that caps each, and the measured peak or time before and after')});
})();
