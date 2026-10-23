// ---- Reading section 4: the two kinds of partial RoPE as wavelength ticks (Qwen3-Next against Gemma 4's global layers), from recompute.json ----
(function(){
  const $=id=>document.getElementById(id);if(!$('pe-ptSvg')||!window.PE_DATA)return;
  const RD=window.RD,T=window.PE_DATA.R.partial_two_ways,TAU=2*Math.PI;
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
  // default partial: the rotated pairs share the whole spectrum, exponent 2i/d_rot; proportional: exponent 2i/d_head, the rest zero frequency
  const qn=T.qwen3next,g4=T.gemma4;
  const wlQ=[],wlG=[];for(let i=0;i<qn.rotated;i++)wlQ.push(TAU*Math.pow(qn.theta,i/qn.rotated));
  for(let i=0;i<g4.rotated;i++)wlG.push(TAU*Math.pow(g4.theta,2*i/g4.head_dim));
  function draw(){const el=$('pe-ptSvg'),W=RD.width(el),narrow=W<520,ml=narrow?4:150,mr=narrow?70:96,pw=W-ml-mr,x0=0,x1=8;
    const X=w=>ml+(Math.log10(w)-x0)/(x1-x0)*pw;let g='',y=8;
    const ctx=131072;
    const row=(lab,sub,wls,col,rest)=>{let s='';const ty=narrow?y+11:y+16,by=narrow?y+16:y+4;
      s+=RD.t(narrow?ml:0,ty,lab,{fill:'var(--ink)',w:600});if(!narrow)s+=RD.t(0,ty+14,sub,{fill:'var(--mute)'});
      wls.forEach(w=>{s+='<line x1="'+X(w).toFixed(1)+'" x2="'+X(w).toFixed(1)+'" y1="'+by+'" y2="'+(by+26)+'" stroke="'+col+'" stroke-width="1.6"/>'});
      if(rest)s+='<rect x="'+(W-mr+6)+'" y="'+by+'" width="'+(mr-8)+'" height="26" rx="3" fill="var(--dim)" opacity=".6"/>'+RD.t(W-mr/2+2,by+17,rest,{a:'middle',fill:'var(--ink)'});
      y=by+26+(narrow?10:14);return s};
    g+=row('Qwen3-Next',qn.rotated+' of '+qn.pairs+' pairs rotate',wlQ,css('--c1'),null);
    if(narrow)y+=2;
    g+=row('Gemma 4, global',g4.rotated+' of '+g4.pairs+' pairs rotate',wlG,css('--c4'),(g4.pairs-g4.rotated)+(narrow?' off':' unrotated'));
    let grid='';[1,100,1e4,1e6,1e8].forEach(v=>{grid+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="4" y2="'+y+'" stroke="var(--line)"/>'});
    grid+='<line x1="'+X(ctx)+'" x2="'+X(ctx)+'" y1="4" y2="'+y+'" stroke="var(--bad)" stroke-dasharray="4 3"/>';g=grid+g;
    const ay=y+4;[[1,'1'],[100,'100'],[1e4,'10K'],[1e6,'1M'],[1e8,'100M']].forEach(([v,l])=>{g+=RD.t(X(v),ay+10,l,{a:'middle',fill:'var(--mute)'})});
    g+=RD.t(X(ctx)+3,ay+24,'128K window',{fill:'var(--bad)'});
    g+=RD.t(ml,ay+24,'wavelength, tokens (log)',{fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,ay+30,g,'Wavelengths of the rotated pairs under two kinds of partial RoPE')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
