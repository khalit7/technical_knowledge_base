// ---- Reading section 10: denoiser passes per image, teacher sampling against the distilled student (toggle, no animation) ----
// Teachers: SD 1.5 at the topic's 25 guided steps; SDXL, SD3 and FLUX.1 [dev] at their diffusers 0.41.0 pipeline defaults (L.pipe).
// Students: LCM-LoRA 4 steps, guidance off (Diffusion from zero, section 7, measured); SDXL-Turbo 1 step, guidance 0 (model card);
// SD3-Turbo "four unguided sampling steps" (LADD, arXiv:2403.12015); FLUX.1 [schnell] 4 steps (model card).
(function(){
  const el=document.getElementById('ld-dist-svg');if(!el)return;
  const U=window.LDU,L=U.L,P=L.pipe;
  const rows=[
    {m:'SD 1.5',b:[25,2,'DPM-Solver++, 25 steps, guidance 7.5'],a:[4,1,'LCM-LoRA, 4 steps, guidance off']},
    {m:'SDXL',b:[P.sdxl.num_inference_steps,2,'pipeline default, guidance '+U.fx(P.sdxl.guidance_scale,1)],a:[1,1,'SDXL-Turbo (ADD), 1 step']},
    {m:'SD3',b:[P.sd3.num_inference_steps,2,'pipeline default, guidance '+U.fx(P.sd3.guidance_scale,1)],a:[4,1,'SD3-Turbo (LADD), 4 unguided steps']},
    {m:'FLUX.1',b:[P.flux1.num_inference_steps,1,'[dev], guidance-distilled'],a:[4,1,'[schnell] (LADD), 4 steps']}];
  let mode='before';
  // text with its colour as an inline style (the page's .rd-svg CSS would override a fill attribute)
  const T=(x,y,t,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' style="font-size:'+(o.fs||11)+'px;fill:'+(o.fill||'var(--ink)')+(o.w?';font-weight:'+o.w:'')+'">'+t+'</text>'};
  function draw(){
    const W=Math.min(880,RD.width(el)),cell=W<520?9:10,gp=2,cols=Math.max(10,Math.floor((W-8)/(cell+gp)));
    let s='',y=4;
    rows.forEach(r=>{const [st,ps,lab]=mode==='before'?r.b:r.a,n=st*ps;
      const cnt=n+' pass'+(n>1?'es':'');
      if(W<520){s+=T(4,y+12,r.m+': '+lab,{fs:11.5,w:600});s+=T(4,y+27,cnt,{fs:11.5,fill:'var(--acc)',w:600});y+=33}
      else{s+=T(4,y+12,r.m+': '+lab,{fs:11.5,w:600});s+=T(W-4,y+12,cnt,{fs:11.5,a:'end',fill:'var(--acc)',w:600});y+=18}
      for(let i=0;i<n;i++){const c=i%cols,rr=Math.floor(i/cols),unc=ps===2&&i%2===1;
        s+='<rect x="'+(4+c*(cell+gp))+'" y="'+(y+rr*(cell+gp))+'" width="'+cell+'" height="'+cell+'" rx="1.5" fill="'+(unc?'var(--c2)':'var(--c1)')+'"/>'}
      y+=Math.max(1,Math.ceil(n/cols))*(cell+gp)+12});
    el.innerHTML=RD.svg(W,y,s,'Denoiser passes per image, '+(mode==='before'?'teacher sampling':'distilled students'));
  }
  document.getElementById('ld-dist-cnt').innerHTML=rows.map(r=>{const b=r.b[0]*r.b[1],a=r.a[0]*r.a[1];return RD.stat(r.m,b+' → '+a+' passes',U.fx(b/a,1).replace(/\.0$/,'')+' times fewer')}).join('');
  RD.seg(document.getElementById('ld-dist-mode'),m=>{mode=m;draw()});
  draw();RD.onResize(draw);RD.onRender(draw);
})();
