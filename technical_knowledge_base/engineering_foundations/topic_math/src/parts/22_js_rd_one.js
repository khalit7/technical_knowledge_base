// ---- Reading tab: the tiny model, computed once (the hero stage, 26_js_sc_one.js, draws it; src/read/recompute.py checks the same numbers) ----
window.RDM=(function(){
  const V=['cat','dog','sat'],x=[2,1],W=[[1,0],[0,1],[1,-2]],Y=2;
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const mv=(M,v)=>M.map(r=>dot(r,v));
  const softmax=(z,T)=>{T=T||1;const m=Math.max(...z),e=z.map(v=>Math.exp((v-m)/T)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)};
  const loss=z=>-Math.log(softmax(z)[Y]);
  function step(Wm,eta){const z=mv(Wm,x),p=softmax(z),g=p.map((v,i)=>v-(i===Y?1:0));
    const gW=g.map(gi=>x.map(xj=>gi*xj));const W2=Wm.map((r,i)=>r.map((v,j)=>v-eta*gW[i][j]));
    return {z,p,g,gW,W2,L:-Math.log(p[Y])}}
  // the largest curvature of the loss along W: the top eigenvalue of diag(p) - p p^T (power iteration), times |x|^2
  function lmax(p){const H=p.map((pi,i)=>p.map((pj,j)=>(i===j?pi:0)-pi*pj));let v=[1,.3,-.7],l=0;
    for(let it=0;it<200;it++){const w=H.map(r=>dot(r,v)),n=Math.hypot(...w);l=n;v=w.map(t=>t/n)}return l*dot(x,x)}
  const f=(v,d)=>{d=d==null?3:d;const s=(Math.abs(v)<0.5*Math.pow(10,-d)?0:v).toFixed(d);return s.replace('-','−')};
  const vec=(a,d)=>'('+a.map(v=>f(v,d)).join(', ')+')';
  return {V,x,W,Y,dot,mv,softmax,loss,step,lmax,f,vec};
})();
