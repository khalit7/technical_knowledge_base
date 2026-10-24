// ---- Reading, section 2: shrink per step of one weight under L2-in-Adam against AdamW, by gradient noise (static, derived) ----
(function(){
  const host=document.getElementById('wd-svg');if(!host)return;
  const eta=1e-3,lam=0.1,lo=-3,hi=1;// sigma from 1e-3 to 10
  const l2=s=>eta*lam/Math.sqrt(s*s+lam*lam),aw=eta*lam;
  function draw(){const W=RD.width(host),H=210,ml=48,mr=12,mt=12,mb=34,ylo=-5.3,yhi=-2.7;
    const x=e=>ml+(e-lo)/(hi-lo)*(W-ml-mr),y=v=>mt+(yhi-Math.log10(v))/(yhi-ylo)*(H-mt-mb);let s='';
    [-5,-4,-3].forEach(e=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(Math.pow(10,e))+'" y2="'+y(Math.pow(10,e))+'" stroke="var(--line)"/>'+RD.t(ml-4,y(Math.pow(10,e))+4,'1e'+e,{a:'end',fs:11,fill:'var(--mute)'})});
    for(let e=lo;e<=hi;e++)s+=RD.t(x(e),H-18,e===0?'1':e<0?'1e'+e:'10',{a:'middle',fs:11,fill:'var(--mute)'});
    s+=RD.t(W-mr,H-4,'gradient noise RMS σ of this weight',{a:'end',fs:11,fill:'var(--mute)'});
    s+=RD.t(ml+2,mt+2,'shrink per step',{fs:11,fill:'var(--mute)'});
    let d='';for(let k=0;k<=80;k++){const e=lo+(hi-lo)*k/80;d+=(k?'L':'M')+x(e).toFixed(1)+','+y(l2(Math.pow(10,e))).toFixed(1)}
    s+='<path d="'+d+'" fill="none" stroke="var(--bad)" stroke-width="2.2"/>';
    s+='<line x1="'+x(lo)+'" x2="'+x(hi)+'" y1="'+y(aw)+'" y2="'+y(aw)+'" stroke="var(--acc)" stroke-width="2.2"/>';
    const narrow=W<520;
    s+=RD.t(x(lo)+4,y(l2(1e-3))+14,narrow?'L2 in Adam':'L2 in Adam: ηλθ/√(σ² + λ²θ²)',{fs:11,fill:'var(--bad)',w:600});
    s+=RD.t(x(lo)+4,y(aw)-6,narrow?'AdamW: 1e-4':'AdamW: ηλθ = 1e-4 for every weight',{fs:11,fill:'var(--acc)',w:600});
    [[1e-3,'10×'],[10,'0.1×']].forEach(([sg,lab])=>{const px=x(Math.log10(sg)),py=y(l2(sg));s+='<circle cx="'+px+'" cy="'+py+'" r="3.5" fill="var(--bad)"/>'+RD.t(px+(sg>1?-6:6),py+(sg>1?-8:-8),lab,{fs:11,a:sg>1?'end':'start',fill:'var(--bad)'})});
    host.innerHTML=RD.svg(W,H,s,'Shrink per step against gradient noise under L2 in Adam and under AdamW')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
