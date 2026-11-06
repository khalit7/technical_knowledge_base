// ---- Shared by the 3D scenes (renderer v2): the page's real two-weight logistic loss, 2x2 helpers, and a shaded surface drawn as a mesh of quads ----
// The loss is the Optimisation lab's "Logistic loss (real data)": two standardised breast-cancer features (mean radius, mean texture), 569 patients,
// label +1 malignant, no intercept, L2 penalty 1/569 (CO_DATA.X2, CO_DATA.s, CO_DATA.lam from inputs/lr_real.py). Every surface and path is computed here.
window.CSU=(function(){
  if(!window.S3||!window.CO)return null;
  const {mix,sub,lerp}=S3,D=CO.D,X=D.X2||[],Sg=D.s||[],lam=D.lam||0,n=X.length;
  const sig=CO.sig,sp=CO.softplus;
  const lg={
    f(p){let t=0;for(let i=0;i<n;i++)t+=sp(-Sg[i]*(p[0]*X[i][0]+p[1]*X[i][1]));return t/n+0.5*lam*(p[0]*p[0]+p[1]*p[1])},
    g(p){let a=0,b=0;for(let i=0;i<n;i++){const q=sig(-Sg[i]*(p[0]*X[i][0]+p[1]*X[i][1]));a+=-Sg[i]*X[i][0]*q;b+=-Sg[i]*X[i][1]*q}return [a/n+lam*p[0],b/n+lam*p[1]]},
    H(p){let a=0,b=0,c=0;for(let i=0;i<n;i++){const x=X[i],q=sig(p[0]*x[0]+p[1]*x[1]),w=q*(1-q);a+=w*x[0]*x[0];b+=w*x[0]*x[1];c+=w*x[1]*x[1]}return [a/n+lam,b/n,c/n+lam]}};
  // 2x2 symmetric [a,b,c] = [[a,b],[b,c]]: eigenvalues (ascending) with unit eigenvectors, and a solve
  const eig2=h=>{const tr=h[0]+h[2],dt=h[0]*h[2]-h[1]*h[1],d=Math.sqrt(Math.max(0,tr*tr/4-dt)),l=[tr/2-d,tr/2+d];
    const vec=v=>{let u=Math.abs(h[1])>1e-12?[v-h[2],h[1]]:(Math.abs(h[0]-v)<Math.abs(h[2]-v)?[1,0]:[0,1]);const m=Math.hypot(u[0],u[1]);return [u[0]/m,u[1]/m]};return {l,v:[vec(l[0]),vec(l[1])]}};
  const solve2=(h,v)=>{const dt=h[0]*h[2]-h[1]*h[1];return [(h[2]*v[0]-h[1]*v[1])/dt,(-h[1]*v[0]+h[0]*v[1])/dt]};
  // the global smoothness bound beta: the top eigenvalue of X'X/(4n) + lam (the Hessian can never curve more than this)
  const beta=(()=>{let a=0,b=0,c=0;for(const x of X){a+=x[0]*x[0];b+=x[0]*x[1];c+=x[1]*x[1]}return n?eig2([a/n/4+lam,b/n/4,c/n/4+lam]).l[1]:1})();
  const wstar=(()=>{let w=[0,0];for(let i=0;i<40;i++){const d=solve2(lg.H(w),lg.g(w));w=[w[0]-d[0],w[1]-d[1]]}return w})(),fstar=lg.f(wstar);
  // iterates from w = 0: gradient descent at eta = 1/beta until the loss gap is under 1e-6, Newton for six steps
  const gdPath=(()=>{let p=[0,0];const P=[p];for(let k=0;k<3000&&lg.f(p)-fstar>1e-6;k++){const q=lg.g(p);p=[p[0]-q[0]/beta,p[1]-q[1]/beta];P.push(p)}return P})();
  const ntPath=(()=>{let p=[0,0];const P=[p];for(let k=0;k<6;k++){const d=solve2(lg.H(p),lg.g(p));p=[p[0]-d[0],p[1]-d[1]];P.push(p)}return P})();
  // a height field on a parameter grid (u, v in [0, 1]) computed once; xy(u, v) -> weights. rect() is a box, ell() an ellipse (rings and spokes, so its rim is smooth)
  const rect=(x0,x1,y0,y1)=>(u,v)=>[x0+(x1-x0)*u,y0+(y1-y0)*v];
  const ell=(cx,cy,ax,ay)=>(u,v)=>[cx+ax*u*Math.cos(2*Math.PI*v),cy+ay*u*Math.sin(2*Math.PI*v)];
  function mesh(fn,xy,nx,ny){const V=new Float64Array((nx+1)*(ny+1)),XY=[];for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const p=xy(i/nx,j/ny);XY.push(p);V[j*(nx+1)+i]=fn(p[0],p[1])}
    let lo=Infinity,hi=-Infinity;for(const v of V){if(v<lo)lo=v;if(v>hi)hi=v}return {nx,ny,V,XY,xy,lo,hi}}
  const L=(()=>{const v=[-.45,1,.6],m=Math.hypot(...v);return v.map(x=>x/m)})();
  // a shaded surface: map(x,y,v) -> world point; o.c tint (lower is more tinted), o.a alpha, o.fa face opacity; o.M2 and o.t2 morph towards a second mesh of the same grid
  function surf(R,M,map,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;const c=o.c||P.c1,M2=o.M2,t2=o.t2||0,nx=M.nx,ny=M.ny;
    const val=k=>M2?lerp(M.V[k],M2.V[k],t2):M.V[k],lo=o.lo!=null?o.lo:M.lo,hi=o.hi!=null?o.hi:M.hi,ec=P.dark?mix(c,[255,255,255],.25):mix(c,[0,0,0],.25);
    const G=[];for(let j=0;j<=ny;j++){const r=[];for(let i=0;i<=nx;i++){const k=j*(nx+1)+i;r.push(map(M.XY[k][0],M.XY[k][1],val(k)))}G.push(r)}
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const q=[G[j][i],G[j][i+1],G[j+1][i+1],G[j+1][i]];
      const u=sub(q[2],q[0]),w=sub(q[3],q[1]);let nr=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];if(nr[1]<0)nr=nr.map(x=>-x);const m=Math.hypot(...nr)||1;
      const lm=Math.max(0,(nr[0]*L[0]+nr[1]*L[1]+nr[2]*L[2])/m),sh=P.dark?.62+.38*lm:.8+.2*lm;
      const v=(val(j*(nx+1)+i)+val(j*(nx+1)+i+1)+val((j+1)*(nx+1)+i)+val((j+1)*(nx+1)+i+1))/4,t=Math.max(0,Math.min(1,(v-lo)/((hi-lo)||1)));
      const base=mix(c,P.paper,P.dark?.25+.45*t:.35+.55*t);R.quad(q,{fill:base.map(x=>x*sh),a,fa:o.fa==null?.93:o.fa,ec,ea:o.ea==null?.22:o.ea,lw:.6})}}
  // contour segments of a mesh at the given levels (marching squares on the parameter grid), returned in weights
  function iso(M,levels){const out=[],nx=M.nx,ny=M.ny,V=(i,j)=>M.V[j*(nx+1)+i];
    levels.forEach((lv,li)=>{for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=V(i,j),b=V(i+1,j),c=V(i+1,j+1),d=V(i,j+1),pts=[];
      const ed=(va,vb,ua,wa,ub,wb)=>{if((va<lv)!==(vb<lv)){const t=(lv-va)/(vb-va);pts.push(M.xy((ua+(ub-ua)*t)/nx,(wa+(wb-wa)*t)/ny))}};
      ed(a,b,i,j,i+1,j);ed(b,c,i+1,j,i+1,j+1);ed(c,d,i+1,j+1,i,j+1);ed(d,a,i,j+1,i,j);
      for(let k=0;k+1<pts.length;k+=2)out.push([pts[k],pts[k+1],lv,li])}});return out}
  // draw contour segments on the surface (lifted a little, drawn in front of the cell they lie on) and, faintly, on the floor
  function isoDraw(R,segs,fn,map,o){o=o||{};const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;const c=o.c||P.c1,cc=P.dark?mix(c,[255,255,255],.35):mix(c,[0,0,0],.3);
    segs.forEach(([p,q])=>{const A=map(p[0],p[1],fn(p[0],p[1])),B=map(q[0],q[1],fn(q[0],q[1]));A[1]+=.012;B[1]+=.012;R.line([A,B],{c:cc,w:.9,a:a*.55,dz:-.06});
      if(o.floor!==false){const A0=map(p[0],p[1],0),B0=map(q[0],q[1],0);A0[1]=B0[1]=o.fy||0;R.line([A0,B0],{c,w:.8,a:a*.3})}})}
  // a polyline of (x,y) points lifted onto a height function, a little above the surface
  const lift=(pts,fn,map,dy)=>pts.map(p=>{const w=map(p[0],p[1],fn(p[0],p[1]));return [w[0],w[1]+(dy||.03),w[2]]});
  // a straight segment in weight space, sampled
  const seg=(a,b,k)=>{const o=[];for(let i=0;i<=k;i++){const t=i/k;o.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t)])}return o};
  return {lg,eig2,solve2,beta,wstar,fstar,gdPath,ntPath,rect,ell,mesh,surf,iso,isoDraw,lift,seg};
})();
