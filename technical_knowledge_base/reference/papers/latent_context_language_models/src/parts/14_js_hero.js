// ---- Hero figure (light pass 2026-10-25): one 64K-token prompt through the three pipelines at 4x, static.
// The bar under each pipeline is the number of positions the 4B decoder prefills (65,536 or 16,384); the step boxes say
// what happens in order; the result line is the paper's measured time to first token and peak memory (Figure 4, read from
// its vector paths; one H200, one sample, mean of 30 runs). Nothing moves.
(function(){const el=$('heroSvg');if(!el)return;
  const F=window.PAPER.rc.fig4,T=65536,N=4,L='64k';
  const R=[
    {h:'No compression',c:'var(--mute)',steps:['65,536 tokens','decoder prefill','KV cache: 65,536 positions'],pos:T,k:'NoCompression'},
    {h:'KV cache compression (FastKVzip, 4x)',c:'var(--c2)',steps:['65,536 tokens','decoder prefill','score every entry','evict to 1/4'],pos:T,k:'KVzipFast'},
    {h:'LCLM (4x)',c:'var(--good)',steps:['65,536 tokens','encoder: 64 windows of 1,024','mean-pool every 4','adapter','decoder prefill','KV cache: 16,384 positions'],pos:T/N,k:'LCLM 4x'}];
  fit(el,w=>{let s='',y=4;const pad=1,fs=11.5,bh=22,gapX=16;
    R.forEach((r,ri)=>{
      s+=tx(pad,y+13,r.h,{fs:13,w:600,c:'var(--ink)'});y+=20;
      // the steps as boxes in a row that wraps at the measured width
      let x=pad;
      r.steps.forEach((t,i)=>{const bw=Math.ceil(t.length*fs*.58)+14;
        if(x+bw>w-pad&&x>pad){x=pad;y+=bh+8}
        const dec=/decoder prefill/.test(t);
        s+=rc(x,y,bw,bh,dec?r.c:'var(--soft)',{r:5,s:dec?null:'var(--line)',op:dec?.9:1});
        s+=tx(x+bw/2,y+15,t,{fs,a:'middle',c:dec?'var(--bg)':'var(--ink)',w:dec?600:null});
        x+=bw;
        if(i<r.steps.length-1){const nb=Math.ceil(r.steps[i+1].length*fs*.58)+14;
          if(x+gapX+nb<=w-pad){s+=ln2(x+2,y+bh/2,x+gapX-3,y+bh/2,'var(--mute)',{sw:1.4});s+='<path d="M'+(x+gapX-3)+','+(y+bh/2-3.5)+'L'+(x+gapX+1)+','+(y+bh/2)+'L'+(x+gapX-3)+','+(y+bh/2+3.5)+'z" fill="var(--mute)"/>';x+=gapX}
          else x+=gapX}});
      y+=bh+10;
      // decoder work: positions prefilled, to scale
      const full=w-2*pad,bw=full*r.pos/T;
      s+=rc(pad,y,full,9,'var(--soft)',{r:3,s:'var(--line)'});s+=rc(pad,y,bw,9,r.c,{r:3});y+=9;
      const t=F.ttft[r.k][L],m=F.mem[r.k][L];
      s+=tx(pad,y+15,'decoder prefills '+fmt(r.pos)+' positions',{fs:11.5,c:'var(--mute)'});y+=20;
      s+=tx(pad,y+14,'first token '+t.toFixed(2)+' s · peak memory '+m.toFixed(1)+' GB',{fs:12.5,w:600,c:r.c==='var(--mute)'?'var(--ink)':r.c});y+=ri<R.length-1?30:20});
    el.innerHTML=svgW(w,y+4,s,'A 64K-token prompt at 4x: KV cache compression prefills all 65,536 positions and then evicts, first token after 5.19 s; the LCLM pools before the decoder, which prefills 16,384 latents, first token after 1.00 s; no compression takes 4.47 s')});
  onTab('t-read',()=>refit(el));
})();
