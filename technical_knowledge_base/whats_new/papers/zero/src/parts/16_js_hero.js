// ---- Hero: data parallelism against ZeRO-3 on 4 GPUs, model states to scale (7.5B, Figure 1's model), static, drawn at the measured width ----
(function(){const host=$('heroSvg');if(!host)return;const ND=4,PSI=7.5e9;
  fit(host,w=>{const side=w>=620,pw=side?(w-24)/2:w,fs=w<520?11:12,rh=18,gap=7,lw=44;let q='';
    function panel(x0,y0,title,zero,foot1,foot2){let s=tx(x0,y0+13,title,{fs:fs+1,w:600});const y1=y0+24,u=(pw-lw-4)/16;
      for(let i=0;i<ND;i++){const y=y1+i*(rh+gap);s+=tx(x0+lw-6,y+rh/2+4,'GPU '+i,{fs:fs,a:'end',c:'var(--mute)'});
        let x=x0+lw;[[2,COL.p],[2,COL.g],[12,COL.o]].forEach(([b,c])=>{const full=b*u;s+=rc(x,y,full-1,rh,'none',{r:2,s:'var(--line)'});
          if(zero)s+=rc(x+full*i/ND,y,full/ND-1,rh,c,{r:2});else s+=rc(x,y,full-1,rh,c,{r:2,op:.9});x+=full})}
      const yf=y1+ND*(rh+gap)+4;s+=tx(x0,yf+12,foot1,{fs:fs,w:600})+tx(x0,yf+12+fs+5,foot2,{fs:fs,c:'var(--c2)',w:600});return [s,yf+12+fs+9-y0]}
    const a=panel(0,0,'Data parallelism (DDP)',false,gb(16*PSI)+' GB of model states per GPU','sends 2Ψ per step: one all-reduce');
    const b=panel(side?pw+24:0,side?0:a[1]+14,'ZeRO-3: everything partitioned',true,gb(16*PSI/ND)+' GB per GPU: 16Ψ / 4',
      w<520?'sends 3Ψ: 2 all-gathers, 1 reduce-scatter':'sends 3Ψ: all-gather before forward and backward, reduce-scatter');
    q=a[0]+b[0];const H=side?Math.max(a[1],b[1]):a[1]+14+b[1];
    host.innerHTML=svgW(w,H,q,'Data parallelism keeps 120 GB of model states on each of 4 GPUs; ZeRO-3 keeps a quarter, 30 GB, and sends 3 Psi instead of 2 Psi per step')});
})();
