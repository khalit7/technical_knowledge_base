// ---- Flow matching page: the 2-D toy in the browser. The exact marginal field of the ring of 8 Gaussians (same formulas as
// src/runs/fm_toy.py), the trained networks (int8 weights, the root Flow lab's format), and the solvers. t = 0 noise, t = 1 data.
window.FMF=(function(){
  const X=window.FMX;const R=3,SD=0.25,K=8;
  const CEN=[];for(let k=0;k<K;k++)CEN.push([R*Math.cos(2*Math.PI*k/K),R*Math.sin(2*Math.PI*k/K)]);
  // a_t, b_t and derivatives of the Gaussian path x_t = a x1 + b x0
  function coef(kind,t){
    if(kind==='linear')return [t,1-t,1,-1];
    if(kind==='cos'){const h=Math.PI/2;return [Math.sin(h*t),Math.cos(h*t),h*Math.cos(h*t),-h*Math.sin(h*t)]}
    const s=1-t,ab=Math.exp(-(0.1*s+19.9*s*s/2)),beta=0.1+19.9*s,a=Math.sqrt(ab),b=Math.sqrt(Math.max(1e-12,1-ab));return [a,b,beta*a/2,-beta*ab/(2*b)]}
  // exact: velocity u, score, E[x1|x], E[x0|x], and posterior mode weights
  function exact(x,y,t,kind){const [a,b,da,db]=coef(kind||'linear',t);const S=a*a*SD*SD+b*b;const lw=new Array(K);let m=-1e300;
    for(let k=0;k<K;k++){const dx=x-a*CEN[k][0],dy=y-a*CEN[k][1];lw[k]=-(dx*dx+dy*dy)/(2*S);if(lw[k]>m)m=lw[k]}
    let z=0;for(let k=0;k<K;k++){lw[k]=Math.exp(lw[k]-m);z+=lw[k]}
    let e1x=0,e1y=0,e0x=0,e0y=0,sx=0,sy=0;
    for(let k=0;k<K;k++){const w=lw[k]/z,dx=x-a*CEN[k][0],dy=y-a*CEN[k][1];lw[k]=w;
      e1x+=w*(CEN[k][0]+a*SD*SD/S*dx);e1y+=w*(CEN[k][1]+a*SD*SD/S*dy);e0x+=w*b/S*dx;e0y+=w*b/S*dy;sx-=w*dx/S;sy-=w*dy/S}
    return {u:[da*e1x+db*e0x,da*e1y+db*e0y],s:[sx,sy],e1:[e1x,e1y],e0:[e0x,e0y],w:lw}}
  // trained MLP (3 -> 48 -> 48 -> 48 -> 2, SiLU), int8 rows with per-row scales
  function net(blob){const L=blob.map(l=>{const q=X.b64(l.q),W=new Float32Array(l.o*l.i);for(let r=0;r<l.o;r++)for(let c=0;c<l.i;c++){const v=q[r*l.i+c];W[r*l.i+c]=(v>127?v-256:v)*l.s[r]}return {o:l.o,i:l.i,W,b:Float32Array.from(l.b)}});
    return function(x,y,t){let h=[x,y,t];for(let li=0;li<L.length;li++){const l=L[li],o=new Array(l.o);for(let r=0;r<l.o;r++){let v=l.b[r];const off=r*l.i;for(let c=0;c<l.i;c++)v+=l.W[off+c]*h[c];o[r]=li<L.length-1?v/(1+Math.exp(-v)):v}h=o}return h}}
  const nets={};function getNet(k){if(!nets[k]){const b=(X.D.nets||{})[k];if(!b)return null;nets[k]=net(b)}return nets[k]}
  // one solve; model = {kind:'exact', path, eps} or {kind:'net', key} or {kind:'student', key}; returns the path (steps+1 points per particle)
  function solve(model,pts,n,solver,seed){const out=pts.map(p=>[[p[0],p[1]]]);const r=X.rng(seed||7);
    if(model.kind==='student'){const f=getNet(model.key);pts.forEach((p,i)=>{const v=f(p[0],p[1],0);out[i].push([p[0]+v[0],p[1]+v[1]])});return out}
    const V=model.kind==='net'?((f)=>(x,y,t)=>f(x,y,t))(getNet(model.key)):(x,y,t)=>exact(x,y,t,model.path).u;
    for(let i=0;i<pts.length;i++){let x=pts[i][0],y=pts[i][1];
      for(let k=0;k<n;k++){const t=k/n,h=1/n;
        if(model.kind==='exact'&&model.eps>0){const e=exact(x,y,t,model.path);const sq=Math.sqrt(model.eps*h);x+=h*(e.u[0]+.5*model.eps*e.s[0])+sq*r.n();y+=h*(e.u[1]+.5*model.eps*e.s[1])+sq*r.n()}
        else if(solver==='ddim'&&model.kind==='exact'){const e=exact(x,y,t,model.path);const c=coef(model.path,t+h);x=c[0]*e.e1[0]+c[1]*e.e0[0];y=c[0]*e.e1[1]+c[1]*e.e0[1]}
        else if(solver==='midpoint'){const v=V(x,y,t);const w=V(x+.5*h*v[0],y+.5*h*v[1],t+.5*h);x+=h*w[0];y+=h*w[1]}
        else {const v=V(x,y,t);x+=h*v[0];y+=h*v[1]}
        out[i].push([x,y])}}
    return out}
  function modeOf(x,y){let best=-1,bd=1e9;for(let k=0;k<K;k++){const d=Math.hypot(x-CEN[k][0],y-CEN[k][1]);if(d<bd){bd=d;best=k}}return bd<3*SD?best:-1}
  function noise(n,seed){const r=X.rng(seed);const p=[];for(let i=0;i<n;i++)p.push([r.n(),r.n()]);return p}
  function sampleData(n,seed){const r=X.rng(seed);const p=[];for(let i=0;i<n;i++){const k=Math.floor(r.u()*K)%K;p.push([CEN[k][0]+SD*r.n(),CEN[k][1]+SD*r.n()])}return p}
  const MODE_COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','#c2508a','#7a8a3a'];
  return {R,SD,K,CEN,coef,exact,getNet,solve,modeOf,noise,sampleData,MODE_COL};
})();
