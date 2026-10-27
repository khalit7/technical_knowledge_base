// ---- Hero figure (light pass 2026-10-25): one 256-token block, the loop of Figure 4 (encode, denoise, append) and the time it takes
// against the same weights decoding autoregressively, to scale. Numbers: AR step 4.90 ms (1,000 / 204, Table 3); diffusion pass
// 13.56 ms end to end and 19.74 tokens per pass (Section 6, Eq. 12). Derived: 256 x 4.90 = 1,254 ms; 256 / 19.74 = 13.0 passes x 13.56 = 176 ms.
(function(){const el=$('heroSvg');if(!el)return;
  const AR_MS=4.90,DG_MS=13.56,TPF=19.74,C=256;
  const arT=C*AR_MS,dgN=C/TPF,dgT=dgN*DG_MS;
  const B=[
    {h:'1. Encode the context',l:['causal attention','fills the KV cache'],c:'var(--mute)'},
    {h:'2. Denoise a 256-token canvas',l:['bidirectional attention, same weights','about 12 passes; low-entropy tokens','accepted, the rest re-noised'],c:'var(--c1)'},
    {h:'3. Encode and append',l:['one causal pass adds the','finished block to the cache'],c:'var(--mute)'}];
  fit(el,w=>{const wide=w>=700,g=wide?18:0,pad=10,lh=16,bh=pad*2+18+lh*3,bw=wide?(w-2*g)/3:w;let s='';
    B.forEach((b,i)=>{const x=wide?i*(bw+g):0,y=wide?0:i*(bh+20);const hi=i===1;
      s+=rc(x+.5,y+.5,bw-1,bh-1,hi?'var(--acc2)':'var(--soft)',{s:b.c,sw:hi?2:1.2,r:8});
      s+=tx(x+pad,y+pad+13,b.h,{fs:13,w:600,c:hi?'var(--c1)':'var(--ink)'});
      b.l.forEach((t,j)=>{s+=tx(x+pad,y+pad+18+lh*(j+1),t,{fs:11.5,c:'var(--ink)'})});
      if(i<2){if(wide)s+='<path d="M'+(x+bw+2)+','+bh/2+' l'+(g-6)+',0" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#heroA)"/>';
        else s+='<path d="M'+w/2+','+(y+bh+3)+' l0,12" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#heroA)"/>'}});
    let y0=wide?bh:3*bh+40;
    // loop back from append to denoise: next block
    if(wide){const x2=2*(bw+g)+bw/2,x1=(bw+g)+bw/2;s+='<path d="M'+x2+','+(y0+2)+' v12 H'+x1+' v-8" fill="none" stroke="var(--mute)" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#heroA)"/>';
      s+=tx((x1+x2)/2,y0+28,'next block, until end of turn',{fs:11.5,a:'middle',c:'var(--mute)'});y0+=44}
    else{s+=tx(0,y0+16,'then the next block, until end of turn',{fs:11.5,c:'var(--mute)'});y0+=30}
    // time to write one block, to scale
    if(wide)s+=tx(0,y0+12,'Time to write one 256-token block, one request, one H100 (to scale)',{fs:12.5,w:600});
    else{s+=tx(0,y0+12,'Time to write one 256-token block,',{fs:12.5,w:600});s+=tx(0,y0+28,'one request, one H100 (to scale)',{fs:12.5,w:600});y0+=16}
    const lw=wide?150:0,bx=lw,bwid=w-lw-2,sc=bwid/arT,rh=18;let yy=y0+24;
    const row=(lab,sub,t,n,col,ms)=>{let r='';if(wide){r+=tx(0,yy+13,lab,{fs:12,w:600});}else{r+=tx(0,yy+11,lab,{fs:12,w:600});yy+=16}
      r+=rc(bx,yy,t*sc,rh,col,{r:3});
      const step=t*sc/n;if(step>=3)for(let i=1;i<n;i++)r+=ln2(bx+i*step,yy,bx+i*step,yy+rh,'var(--bg)',{sw:1});
      const lbl=ms+' ms, '+sub,lwid=lbl.length*6.4,inside=t*sc>lwid+16,fitsOut=bx+t*sc+6+lwid<w;
      if(inside||fitsOut)r+=tx(inside?bx+t*sc-6:bx+t*sc+6,yy+rh-5,lbl,{fs:11.5,a:inside?'end':null,c:inside?'#fff':'var(--ink)',w:600});
      else{r+=tx(bx,yy+rh+14,lbl,{fs:11.5,w:600});yy+=16}
      yy+=rh+10;return r};
    s+=row('Same weights, AR',C+' passes x '+AR_MS.toFixed(2)+' ms',arT,C,'var(--mute)','1,254');
    s+=row('DiffusionGemma',dgN.toFixed(1)+' passes x '+DG_MS.toFixed(2)+' ms',dgT,Math.round(dgN),'var(--c1)',Math.round(dgT));
    s+=tx(0,yy+10,(arT/dgT).toFixed(1)+'x faster: 1,456 against 204 tokens/s',{fs:12,w:600,c:'var(--c1)'});
    el.innerHTML=svgW(w,yy+18,'<defs><marker id="heroA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>'+s,'DiffusionGemma writes a 256-token block by encoding the context causally, denoising the block in about 12 bidirectional passes of the same weights, then appending it to the cache; one block takes about 176 ms against 1,254 ms for autoregressive decoding')});
  onTab('t-read',()=>refit(el));
})();
