// ---- Shared maths and drawing helpers (Reading tab and Optimisation lab) ----
window.CO=(function(){
  const fmt=(v,d)=>{if(!isFinite(v))return String(v);const a=Math.abs(v);if(a!==0&&(a<1e-3||a>=1e5))return v.toExponential(Math.max(1,(d||3)-1)).replace('e','e');return (+v.toFixed(d==null?3:d)).toString()};
  const fx=(v,d)=>{if(!isFinite(v))return String(v);return v.toFixed(d==null?3:d).replace(/^-(0\.0*)$/,'$1')};
  const minus=s=>String(s).replace(/^-/,'−');
  const sig=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
  const softplus=z=>Math.max(z,0)+Math.log1p(Math.exp(-Math.abs(z)));
  // 1D logistic regression slice (breast-cancer feature, +1 malignant)
  const D=window.CO_DATA||{};
  const lr1={
    f(w){const x=D.x1,s=D.s,n=x.length;let t=0;for(let i=0;i<n;i++)t+=softplus(-s[i]*w*x[i]);return t/n+0.5*D.lam*w*w},
    g(w){const x=D.x1,s=D.s,n=x.length;let t=0;for(let i=0;i<n;i++)t+=-s[i]*x[i]*sig(-s[i]*w*x[i]);return t/n+D.lam*w},
    h(w){const x=D.x1,s=D.s,n=x.length;let t=0;for(let i=0;i<n;i++){const p=sig(s[i]*w*x[i]);t+=x[i]*x[i]*p*(1-p)}return t/n+D.lam},
  };
  lr1.L=(()=>{const x=D.x1||[];let t=0;for(const v of x)t+=v*v;return x.length?t/x.length/4+D.lam:1})();
  // marching squares: returns an SVG path string per level, in pixel coordinates via map(x,y)->[px,py]
  function contours(f,x0,x1,y0,y1,nx,ny,levels,map){
    const V=new Float64Array((nx+1)*(ny+1));
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)V[j*(nx+1)+i]=f(x0+(x1-x0)*i/nx,y0+(y1-y0)*j/ny);
    const out=[];
    for(const lv of levels){let d='';
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
        const a=V[j*(nx+1)+i],b=V[j*(nx+1)+i+1],c=V[(j+1)*(nx+1)+i+1],e=V[(j+1)*(nx+1)+i];
        const pts=[];const X=k=>x0+(x1-x0)*k/nx,Y=k=>y0+(y1-y0)*k/ny;
        const edge=(va,vb,xa,ya,xb,yb)=>{if((va<lv)!==(vb<lv)){const t=(lv-va)/(vb-va);pts.push([xa+(xb-xa)*t,ya+(yb-ya)*t])}};
        edge(a,b,X(i),Y(j),X(i+1),Y(j));edge(b,c,X(i+1),Y(j),X(i+1),Y(j+1));edge(c,e,X(i+1),Y(j+1),X(i),Y(j+1));edge(e,a,X(i),Y(j+1),X(i),Y(j));
        for(let k=0;k+1<pts.length;k+=2){const p=map(pts[k][0],pts[k][1]),q=map(pts[k+1][0],pts[k+1][1]);d+='M'+p[0].toFixed(1)+' '+p[1].toFixed(1)+'L'+q[0].toFixed(1)+' '+q[1].toFixed(1)}
      }
      out.push(d)}
    return out;
  }
  // text with a CSS-variable colour (presentation attributes do not resolve var())
  const T=(x,y,t,a,fs,col,w)=>'<text x="'+(+x).toFixed(1)+'" y="'+(+y).toFixed(1)+'" font-size="'+(fs||11)+'"'+(a?' text-anchor="'+a+'"':'')+(w?' font-weight="'+w+'"':'')+' style="fill:'+(col||'var(--ink)')+'">'+t+'</text>';
  // simple chart: o={w,h,x:[min,max],y:[min,max],logy,ml,mb,xt:[ticks],yt:[ticks],xl,yl,series:[{pts:[[x,y]],col,dash,w,dots}],extra(sx,sy)}
  function chart(o){
    const ml=o.ml||44,mr=o.mr||18,mt=o.mt||8,mb=o.mb||32,W=o.w,H=o.h;
    const ly=v=>o.logy?Math.log10(Math.max(v,1e-300)):v;
    const lx=v=>o.logx?Math.log10(v):v;
    const X0=lx(o.x[0]),X1=lx(o.x[1]),Y0=ly(o.y[0]),Y1=ly(o.y[1]);
    const sx=v=>ml+(lx(v)-X0)/(X1-X0)*(W-ml-mr);
    const sy=v=>{const t=(ly(v)-Y0)/(Y1-Y0);return mt+(1-Math.max(-0.02,Math.min(1.02,t)))*(H-mt-mb)};
    let s='<rect x="'+ml+'" y="'+mt+'" width="'+(W-ml-mr)+'" height="'+(H-mt-mb)+'" style="fill:none;stroke:var(--line)"/>';
    (o.yt||[]).forEach(v=>{const y=sy(v);s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y+'" y2="'+y+'" style="stroke:var(--line)"/>'+T(ml-4,y+3.5,o.ytf?o.ytf(v):v,'end',10,'var(--mute)')});
    (o.xt||[]).forEach(v=>{const x=sx(v);s+='<line y1="'+mt+'" y2="'+(H-mb)+'" x1="'+x+'" x2="'+x+'" style="stroke:var(--line)"/>'+T(x,H-mb+13,o.xtf?o.xtf(v):v,'middle',10,'var(--mute)')});
    if(o.xl)s+=T((ml+W-mr)/2,H-4,o.xl,'middle',11);
    if(o.yl)s+='<text x="10" y="'+((mt+H-mb)/2)+'" font-size="11" text-anchor="middle" transform="rotate(-90 10 '+((mt+H-mb)/2)+')">'+o.yl+'</text>';
    s+='<clipPath id="'+(o.id||'c')+'-clip"><rect x="'+ml+'" y="'+(mt-2)+'" width="'+(W-ml-mr)+'" height="'+(H-mt-mb+4)+'"/></clipPath><g clip-path="url(#'+(o.id||'c')+'-clip)">';
    if(o.under)s+=o.under(sx,sy);
    (o.series||[]).forEach(se=>{const p=se.pts.filter(q=>isFinite(q[1])&&(!o.logy||q[1]>0));if(!p.length)return;
      if(!se.dotsOnly)s+='<path d="'+p.map((q,i)=>(i?'L':'M')+sx(q[0]).toFixed(1)+' '+sy(q[1]).toFixed(1)).join('')+'" style="fill:none;stroke:'+se.col+';stroke-width:'+(se.w||1.8)+(se.dash?';stroke-dasharray:'+se.dash:'')+'"/>';
      if(se.dots)p.forEach(q=>s+='<circle cx="'+sx(q[0]).toFixed(1)+'" cy="'+sy(q[1]).toFixed(1)+'" r="'+(se.r||2.6)+'" style="fill:'+se.col+'"/>')});
    if(o.extra)s+=o.extra(sx,sy);
    s+='</g>';
    return {svg:RD.svg(W,H,s,o.label||''),sx,sy};
  }
  const pow10=v=>v===1?'1':'10<tspan dy="-4" font-size="8">'+Math.round(Math.log10(v))+'</tspan>';
  return {fmt,fx,minus,sig,softplus,lr1,contours,chart,pow10,D,T};
})();
