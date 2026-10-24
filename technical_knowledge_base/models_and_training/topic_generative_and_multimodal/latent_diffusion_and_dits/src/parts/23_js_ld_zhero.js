// ---- Hero (top of Reading): SD 1.5's three networks for one image, the denoiser's 50 passes, and where the time goes ----
// Parameters: counted (U-Net from out/arch.json; text encoder and VAE from the root's src/data/README.md).
// Times: the root page's Diffusion lab on Apple M1 Pro (0.610 s per guided step, 0.488 s per VAE decode); 25 steps is the topic's setting.
(function(){
  const el=document.getElementById('ld-hero');if(!el)return;
  const U=window.LDU,L=U.L;
  const unetP=U.byKey.sd15.params,g=U.grid('sd15',512),fl=g?g[2]:NaN;
  const steps=25,passes=2,stepS=0.610,decS=0.488,denS=steps*stepS;
  // text with its colour as an inline style (the page's .rd-svg CSS would override a fill attribute)
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' style="font-size:'+(o.fs||11)+'px;fill:'+(o.fill||'var(--ink)')+(o.w?';font-weight:'+o.w:'')+'">'+s+'</text>'};
  const boxes=[
    {t:'Prompt',l:['77 tokens (CLIP)'],w:0.13},
    {t:'Text encoder',l:['CLIP ViT-L, 123.1M','once per prompt'],w:0.18},
    {t:'Denoiser: U-Net',l:[U.M(unetP)+' parameters',U.fx(fl/1e12,2)+' TFLOP per pass','on a 64 × 64 × 4 latent'],w:0.30,hl:1},
    {t:'VAE decoder',l:['83.7M parameters','once, '+decS+' s'],w:0.18},
    {t:'Image',l:['512 × 512 × 3','786,432 numbers'],w:0.21}];
  function box(x,y,w,h,b){let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(b.hl?'var(--acc2)':'var(--soft)')+'" stroke="'+(b.hl?'var(--acc)':'var(--line)')+'" stroke-width="'+(b.hl?2:1)+'"/>';
    s+=T(x+8,y+17,b.t,{fs:12.5,w:600});b.l.forEach((ln,i)=>{s+=T(x+8,y+33+i*14,ln,{fs:11,fill:'var(--mute)'})});return s}
  const arr=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#ld-h-ar)"/>';
  const defs='<defs><marker id="ld-h-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mute)"/></marker></defs>';
  const loopLab='× '+(steps*passes)+' passes: '+steps+' steps × '+passes+' (guidance)';
  function timeBar(x,y,w){const tot=denS+decS,wd=w*denS/tot;let s='';
    s+=T(x,y-6,'Time for one image on the M1 Pro',{fs:11,fill:'var(--mute)'});
    s+='<rect x="'+x+'" y="'+y+'" width="'+wd.toFixed(1)+'" height="20" rx="3" fill="var(--acc)"/>';
    s+='<rect x="'+(x+wd+1).toFixed(1)+'" y="'+y+'" width="'+Math.max(3,w-wd-1).toFixed(1)+'" height="20" rx="2" fill="var(--c2)"/>';
    s+=T(x+6,y+14,'denoiser: '+steps+' × '+'0.610 s = '+U.fx(denS,1)+' s',{fs:11,fill:'var(--bg)',w:600});
    s+=T(x+w,y+34,'VAE decode '+decS+' s',{fs:11,a:'end',fill:'var(--c2)'});return s}
  function draw(){
    const W=Math.min(880,RD.width(el));let s=defs,H;
    if(W>=640){
      const gap=20,x0=4,usable=W-8-gap*4,bh=76,y0=34;let x=x0;const pos=[];
      boxes.forEach((b,i)=>{const w=usable*b.w;pos.push([x,w]);s+=box(x,y0,w,bh,b);if(i<boxes.length-1)s+=arr(x+w+2,y0+bh/2,x+w+gap-2,y0+bh/2);x+=w+gap});
      const [dx,dw]=pos[2];
      s+='<path d="M'+(dx+dw-14)+' '+y0+' C '+(dx+dw-14)+' '+(y0-22)+', '+(dx+14)+' '+(y0-22)+', '+(dx+14)+' '+(y0-2)+'" fill="none" stroke="var(--acc)" stroke-width="1.8" marker-end="url(#ld-h-ar)"/>';
      s+=T(dx+dw/2,y0-20,loopLab,{fs:11.5,a:'middle',fill:'var(--acc)',w:600});
      s+=timeBar(x0,y0+bh+30,W-8);H=y0+bh+30+40;
    }else{
      const x0=4,bw=W-46,gap=22;let y=4;const pos=[];
      boxes.forEach((b,i)=>{const h=24+b.l.length*14;pos.push([y,h]);s+=box(x0,y,bw,h,b);if(i<boxes.length-1)s+=arr(x0+30,y+h+1,x0+30,y+h+gap-1);y+=h+gap});
      const [dy,dh]=pos[2];
      s+='<path d="M'+(x0+bw)+' '+(dy+dh-10)+' C '+(x0+bw+30)+' '+(dy+dh-10)+', '+(x0+bw+30)+' '+(dy+10)+', '+(x0+bw+2)+' '+(dy+10)+'" fill="none" stroke="var(--acc)" stroke-width="1.8" marker-end="url(#ld-h-ar)"/>';
      s+=T(x0+bw-4,dy+dh+12,loopLab,{fs:11,a:'end',fill:'var(--acc)',w:600});
      y+=6;s+=timeBar(x0,y+14,W-12);H=y+14+40;
    }
    el.innerHTML=RD.svg(W,H,s,'Stable Diffusion 1.5 for one image: prompt, text encoder once, U-Net denoiser 50 passes on the latent, VAE decoder once, image; the denoiser takes '+U.fx(100*denS/(denS+decS),0)+'% of the time');
  }
  draw();RD.onResize(draw);RD.onRender(draw);
})();
