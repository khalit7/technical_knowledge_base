// ---- Static figures drawn at the measured width: Flash-Next parameters to scale, the Qwen3 post-training recipe ----
(function(){
  const W0=el=>Math.max(300,Math.min(860,RD.width(el)));
  const T=(x,y,s,o)=>RD.t(x,y,s,o);
  function fnp(){
    const el=$('fnpSvg');if(!el)return;const W=W0(el),nar=W<480;
    const seg=[['experts','121.0B',121.0,'var(--acc)',1],['rest of backbone','≈4B',4.0,'var(--c5)',0],['MTP','4B',4.0,'var(--c4)',0],['n-gram table','51.2B',51.2,'var(--c6)',1]];
    const tot=seg.reduce((a,s)=>a+s[2],0),pad=2,sc=(W-2*pad)/tot,y=40,h=34;let x=pad,s='';const xs=[];
    seg.forEach((g,i)=>{const w=g[2]*sc;xs.push([x,w]);s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(1,w-1).toFixed(1)+'" height="'+h+'" rx="2" fill="'+g[3]+'" fill-opacity="'+(i===3?.35:.85)+'"'+(i===3?' stroke="var(--c6)" stroke-dasharray="4 3"':'')+'/>';
      if(g[4])s+=T(x+w/2,y+h/2+4,g[0]+' '+g[1],{fs:nar?11:12,a:'middle',fill:i===3?'var(--ink)':'var(--bg)',w:600});x+=w});
    // brackets
    const hb=xs[0][0]+xs[0][1]+xs[1][1];
    s+='<path d="M'+pad+' '+(y-6)+' v-8 h'+(hb-pad-1).toFixed(1)+' v8" fill="none" stroke="var(--mute)"/>'+T((pad+hb)/2,y-18,'the "125B" headline, on the accelerator',{fs:11,a:'middle',fill:'var(--mute)'});
    const nx=xs[3][0];s+='<path d="M'+(nx+1).toFixed(1)+' '+(y-6)+' v-8 h'+(xs[3][1]-3).toFixed(1)+' v8" fill="none" stroke="var(--c6)"/>'+T(nx+xs[3][1]/2,y-18,'host memory',{fs:11,a:'middle',fill:'var(--c6)'});
    // small segments labelled below with leaders
    const r1=xs[1][0]+xs[1][1]/2,r2=xs[2][0]+xs[2][1]/2,ly=y+h+18;
    s+='<line x1="'+r1.toFixed(1)+'" x2="'+r1.toFixed(1)+'" y1="'+(y+h)+'" y2="'+(ly-10)+'" stroke="var(--c5)"/>'+T(r1-4,ly,'rest ≈4B',{fs:11,a:'end',fill:'var(--c5)'});
    s+='<line x1="'+r2.toFixed(1)+'" x2="'+r2.toFixed(1)+'" y1="'+(y+h)+'" y2="'+(ly+6)+'" stroke="var(--c4)"/>'+T(r2+4,ly+14,'MTP 4B',{fs:11,fill:'var(--c4)'});
    // active per token
    const ay=ly+30;s+='<rect x="'+pad+'" y="'+ay+'" width="'+(6*sc).toFixed(1)+'" height="14" rx="2" fill="var(--good)"/>'+T(pad+6*sc+6,ay+11,'6B activated per token, same scale',{fs:11,fill:'var(--good)'});
    el.innerHTML=svgEl(W,ay+20,s,'Flash-Next parameters to scale: 121.0B experts, about 4B rest of backbone, 4B MTP, 51.2B n-gram table in host memory; 6B active per token');
  }
  // The Qwen3 post-training recipe: four stages for the large models, two distillation phases for the small ones
  function rcp(){
    const el=$('rcpSvg');if(!el)return;const W=W0(el),nar=W<520;
    const cg=nar?18:60,cw=Math.min(300,(W-cg)/2),xl=Math.max(0,(W-2*cw-cg)/2),xr=xl+cw+cg,bh=40,bg=14,fs=nar?11:12;
    let s='';
    s+=T(xl,14,'Large models',{fs:12,w:600})+T(xl,29,'Qwen3-235B-A22B, 32B',{fs:11,fill:'var(--mute)'});
    s+=T(xr,14,'Small models',{fs:12,w:600})+T(xr,29,'0.6B to 14B, 30B-A3B',{fs:11,fill:'var(--mute)'});
    const L=[['1 Long-CoT cold start','SFT on reasoning traces','box'],['2 Reasoning RL','GRPO, verified queries','box'],['3 Thinking mode fusion','SFT: think + no-think','boxa'],['4 General RL','all tasks and formats','box']];
    const y0=40;L.forEach((b,i)=>{const y=y0+i*(bh+bg);s+=bx(xl,y,cw,bh,b[2],[b[0],b[1]],fs);if(i<3)s+=ar(xl+cw/2,y+bh+1,xl+cw/2,y+bh+bg-1)});
    const R=[['a Off-policy',nar?'teacher outputs':'on teacher outputs, both modes'],['b On-policy',nar?'KL on own samples':'KL to teacher on own samples']];
    const yr0=y0+(bh+bg);R.forEach((b,i)=>{const y=yr0+i*(bh+bg)*1.5;s+=bx(xr,y,cw,bh,'boxc',[b[0],b[1]],fs);if(i<1)s+=ar(xr+cw/2,y+bh+1,xr+cw/2,y+(bh+bg)*1.5-1)});
    // teacher signal: from the end of the large-model pipeline to both distillation phases
    const ty=y0+3*(bh+bg)+bh/2,tx=xl+cw;
    s+=ar(tx+2,ty,xr-2,yr0+(bh+bg)*1.5+bh/2,1)+ar(tx+2,ty-6,xr-2,yr0+bh/2,1);
    const yb=y0+4*(bh+bg)+6;
    s+=T(xr,yb-4,'Qwen3-8B: 1,800 GPU h',{fs:11,fill:'var(--good)'})+T(xr,yb+10,'against 17,920 for RL',{fs:11,fill:'var(--good)'});
    el.innerHTML=svgEl(W,yb+16,s,'Qwen3 post-training: four stages for the large models; the small models are distilled from them off-policy, then on-policy');
  }
  function all(){fnp();rcp()}
  RD.onRender(all);RD.onResize(all);all();
})();
