// ---- Reading tab, section 5: the output tile of one instruction per generation, drawn to one scale ----
// Shapes from the PTX ISA 9.4 (mma.sync m16n8k16, largest wgmma m64n256k16, largest single-SM tcgen05.mma 128x256x16).
(function(){
  const el=document.getElementById('lt-mma');if(!el)return;
  const I=[{m:16,n:8,a:'mma.sync m16n8k16 (Ampere on)',b:'1 warp; A, B and C in registers'},
           {m:64,n:256,a:'wgmma m64n256k16 (Hopper)',b:'4 warps; A, B in smem; C in registers'},
           {m:128,n:256,a:'tcgen05.mma 128 x 256 x 16 (B200)',b:'1 thread; A, B in smem; C in TMEM'}];
  function draw(){
    const w=RD.width(el),s=Math.min(1.6,(w-12)/256);let y=2,b='';
    I.forEach(t=>{b+=RD.t(2,y+13,t.a,{fs:12,w:600})+RD.t(2,y+28,t.b,{fs:11,fill:'var(--mute)'});y+=36;
      const W=t.n*s,H=t.m*s,x=2;
      // faint grid of mma.sync-sized 16 x 8 cells inside the bigger tiles
      let grid='';if(t.n>8){for(let c=8;c<t.n;c+=8)grid+='<line x1="'+(x+c*s).toFixed(1)+'" y1="'+y+'" x2="'+(x+c*s).toFixed(1)+'" y2="'+(y+H).toFixed(1)+'" stroke="var(--bg)" stroke-width="0.6"/>';
        for(let r=16;r<t.m;r+=16)grid+='<line x1="'+x+'" y1="'+(y+r*s).toFixed(1)+'" x2="'+(x+W).toFixed(1)+'" y2="'+(y+r*s).toFixed(1)+'" stroke="var(--bg)" stroke-width="0.6"/>'}
      b+='<rect x="'+x+'" y="'+y+'" width="'+W.toFixed(1)+'" height="'+H.toFixed(1)+'" fill="var(--acc)" opacity="0.55" rx="1"/>'+grid;
      const cells=t.m*t.n/128;
      if(t.n>8)b+=RD.t(x+W/2,y+H/2+4,t.m+' x '+t.n+' = '+cells+' mma.sync tiles',{a:'middle',fs:12,w:600});
      else b+=RD.t(x+W+8,y+H/2+4,'16 x 8 output tile',{fs:11});
      y+=H+14});
    el.innerHTML=RD.svg(w,y,b,'Output tile of one instruction per generation, to scale');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
