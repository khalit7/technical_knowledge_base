// ---- Gradient lab (t-grad): pure maths, no DOM. Loaded by the page and by src/grad/check_js.mjs (compared with src/grad/recompute.py). ----
(function(root){
  const sum=a=>a.reduce((s,v)=>s+v,0);
  const lse=z=>{const m=Math.max(...z);return m+Math.log(sum(z.map(v=>Math.exp(v-m))))};
  const softmax=z=>{const m=Math.max(...z);const e=z.map(v=>Math.exp(v-m));const s=sum(e);return e.map(v=>v/s)};
  // naive versions, written the way a bug writes them
  const softmaxNaive=z=>{const e=z.map(Math.exp);const s=sum(e);return e.map(v=>v/s)};
  const sig=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
  const onehot=(k,t)=>Array.from({length:k},(_,i)=>i===t?1:0);

  // ---------- losses on logits ----------
  // each: L(z) (z is an array; scalar losses use z[0]) and grad(z) analytic
  const LOSS={
    mse:{L:(z,o)=>{const d=z[0]-o.y;return o.half?0.5*d*d:d*d},
         g:(z,o)=>{const d=z[0]-o.y;return [o.half?d:2*d]},
         pred:(z)=>[z[0]], targ:(o)=>[o.y]},
    bce:{L:(z,o)=>{const v=z[0];return Math.max(v,0)-v*o.y+Math.log1p(Math.exp(-Math.abs(v)))},
         g:(z,o)=>[sig(z[0])-o.y],
         pred:(z)=>[sig(z[0])], targ:(o)=>[o.y]},
    ce:{L:(z,o)=>lse(z)-z[o.t],
        g:(z,o)=>{const p=softmax(z);return p.map((v,i)=>v-(i===o.t?1:0))},
        pred:(z)=>softmax(z), targ:(o)=>onehot(3,o.t)},
    ls:{L:(z,o)=>{const q=lsTarget(z.length,o.t,o.eps),l=lse(z);return sum(q.map((v,i)=>v*(l-z[i])))},
        g:(z,o)=>{const p=softmax(z),q=lsTarget(z.length,o.t,o.eps);return p.map((v,i)=>v-q[i])},
        pred:(z)=>softmax(z), targ:(o)=>lsTarget(3,o.t,o.eps)},
    focal:{L:(z,o)=>{const lp=z[o.t]-lse(z),pt=Math.exp(lp);return -Math.pow(1-pt,o.gamma)*lp},
           g:(z,o)=>{const p=softmax(z),pt=p[o.t],w=focalW(pt,o.gamma);return p.map((v,i)=>w*(v-(i===o.t?1:0)))},
           pred:(z)=>softmax(z), targ:(o)=>onehot(3,o.t)}
  };
  function lsTarget(k,t,eps){return Array.from({length:k},(_,i)=>(i===t?1-eps:0)+eps/k)}
  // focal loss gradient = w * (p - y), w = (1-pt)^g - g pt (1-pt)^(g-1) ln pt
  function focalW(pt,g){return Math.pow(1-pt,g)-(g>0?g*pt*Math.pow(1-pt,g-1)*Math.log(pt):0)}
  // central finite differences
  function numgrad(f,z,h){return z.map((_,i)=>{const a=z.slice(),b=z.slice();a[i]+=h;b[i]-=h;return (f(a)-f(b))/(2*h)})}

  // ---------- the two-layer model (numbers in src/grad/model.json; learning rate LR) ----------
  const LR=0.1;
  // M1: the Reading's one-matrix model (src/read/recompute.py); M0: the lab's two-layer extension. Both give z = (2, 1, 0), target sat.
  const M1={x:[2,1],W:[[1,0],[0,1],[1,-2]],t:2};
  const M0={x:[2,1],W1:[[0.5,0],[0,1],[1,-3]],W2:[[2,0,1],[0,1,0],[-1,1,0]],t:2};
  const clone=m=>JSON.parse(JSON.stringify(m));
  const mv=(W,v)=>W.map(r=>sum(r.map((w,j)=>w*v[j])));
  const mtv=(W,v)=>W[0].map((_,j)=>sum(W.map((r,i)=>r[j]*v[i])));
  const outer=(u,v)=>u.map(a=>v.map(b=>a*b));
  function forward(m){if(m.W){const z=mv(m.W,m.x),p=softmax(z);return {z,p,L:lse(z)-z[m.t]}}const a=mv(m.W1,m.x),h=a.map(v=>Math.max(0,v)),z=mv(m.W2,h),p=softmax(z),L=lse(z)-z[m.t];return {a,h,z,p,L}}
  // backward with optional bugs: transpose (W2 not transposed), detach (h detached), twice (softmax applied twice)
  function backward(m,bug){bug=bug||'';const f=forward(m);
    if(m.W){const dz=f.p.map((v,i)=>v-(i===m.t?1:0));return {f,dz,dW:outer(dz,m.x),dx:mtv(m.W,dz)}}
    let dz;
    if(bug==='twice'){ // model emits q=softmax(z), loss applies softmax again: L = lse(q) - q_t ; dL/dq = s - y, dq/dz = J_softmax
      const q=f.p,s=softmax(q),dq=s.map((v,i)=>v-(i===m.t?1:0));dz=q.map((qi,i)=>qi*(dq[i]-sum(q.map((qj,j)=>qj*dq[j]))));}
    else dz=f.p.map((v,i)=>v-(i===m.t?1:0));
    const dW2=outer(dz,f.h);
    let dh=bug==='transpose'?mv(m.W2,dz):mtv(m.W2,dz);
    if(bug==='detach')dh=dh.map(()=>0);
    const da=dh.map((v,i)=>f.a[i]>0?v:0);
    const dW1=outer(da,m.x),dx=mtv(m.W1,da);
    return {f,dz,dW2,dh,da,dW1,dx};
  }
  function lossTwice(m){const q=forward(m).p;return lse(q)-q[m.t]}
  // flat parameter list for gradient checks
  function params(m){const r=[];if(m.W){m.W.forEach((row,i)=>row.forEach((_,j)=>r.push(['W',i,j])));m.x.forEach((_,j)=>r.push(['x',j]));return r}m.W1.forEach((row,i)=>row.forEach((_,j)=>r.push(['W1',i,j])));m.W2.forEach((row,i)=>row.forEach((_,j)=>r.push(['W2',i,j])));m.x.forEach((_,j)=>r.push(['x',j]));return r}
  function getP(m,p){return p[0]==='x'?m.x[p[1]]:m[p[0]][p[1]][p[2]]}
  function setP(m,p,v){if(p[0]==='x')m.x[p[1]]=v;else m[p[0]][p[1]][p[2]]=v}
  function gradOf(b,p){return p[0]==='x'?b.dx[p[1]]:b['d'+p[0]][p[1]][p[2]]}
  function gradCheck(m,bug,h){h=h||1e-5;const b=backward(m,bug);const lf=bug==='twice'?lossTwice:(mm=>forward(mm).L);
    return params(m).map(p=>{const a=clone(m),c=clone(m);setP(a,p,getP(m,p)+h);setP(c,p,getP(m,p)-h);
      const num=(lf(a)-lf(c))/(2*h);const an=gradOf(b,p);return {p,an,num,diff:Math.abs(an-num)}})}
  function sgdStep(m,lr,bug,sign,fixX){const b=backward(m,bug);const n=clone(m);const s=sign||-1;
    if(m.W){n.W=m.W.map((r,i)=>r.map((w,j)=>w+s*lr*b.dW[i][j]));n.x=fixX?m.x.slice():m.x.map((v,j)=>v+s*lr*b.dx[j]);return n}
    n.W1=m.W1.map((r,i)=>r.map((w,j)=>w+s*lr*b.dW1[i][j]));n.W2=m.W2.map((r,i)=>r.map((w,j)=>w+s*lr*b.dW2[i][j]));n.x=fixX?m.x.slice():m.x.map((v,j)=>v+s*lr*b.dx[j]);return n}
  // multiply-adds: forward W1x (3x2) + W2h (3x3); backward dW2, dh, dW1, and dx if the input is trained
  function macs(m,trainX){if(m.W){const n=m.W.length*m.W[0].length;return {fwd:n,bwd:n+(trainX?n:0)}}const n1=m.W1.length*m.W1[0].length,n2=m.W2.length*m.W2[0].length;return {fwd:n1+n2,bwd:n2+n2+n1+(trainX?n1:0),parts:{fW1:n1,fW2:n2,dW2:n2,dh:n2,dW1:n1,dx:trainX?n1:0}}}

  // ---------- quadratic bowl ----------
  // L = 1/2 th^T H th, H = R diag(l1,l2) R^T, R rotation by ang (radians)
  function hess(l1,l2,ang){const c=Math.cos(ang),s=Math.sin(ang);return [[l1*c*c+l2*s*s,(l1-l2)*c*s],[(l1-l2)*c*s,l1*s*s+l2*c*c]]}
  function qLoss(H,t){return 0.5*(t[0]*(H[0][0]*t[0]+H[0][1]*t[1])+t[1]*(H[1][0]*t[0]+H[1][1]*t[1]))}
  function qGrad(H,t){return [H[0][0]*t[0]+H[0][1]*t[1],H[1][0]*t[0]+H[1][1]*t[1]]}
  function runOpt(o){const H=hess(o.l1,o.l2,o.ang);let t=o.start.slice(),v=[0,0],m=[0,0],s=[0,0];const path=[t.slice()],loss=[qLoss(H,t)];
    for(let k=1;k<=o.steps;k++){const g=qGrad(H,t);
      if(o.opt==='gd'){t=[t[0]-o.lr*g[0],t[1]-o.lr*g[1]]}
      else if(o.opt==='mom'){v=[o.beta*v[0]-o.lr*g[0],o.beta*v[1]-o.lr*g[1]];t=[t[0]+v[0],t[1]+v[1]]}
      else if(o.opt==='adam'){const b1=0.9,b2=0.999,eps=1e-8;m=m.map((mi,i)=>b1*mi+(1-b1)*g[i]);s=s.map((si,i)=>b2*si+(1-b2)*g[i]*g[i]);
        const mh=m.map(mi=>mi/(1-Math.pow(b1,k))),sh=s.map(si=>si/(1-Math.pow(b2,k)));t=t.map((ti,i)=>ti-o.lr*mh[i]/(Math.sqrt(sh[i])+eps))}
      else if(o.opt==='newton'){const d=H[0][0]*H[1][1]-H[0][1]*H[1][0];const st=[(H[1][1]*g[0]-H[0][1]*g[1])/d,(-H[1][0]*g[0]+H[0][0]*g[1])/d];t=[t[0]-st[0],t[1]-st[1]]}
      path.push(t.slice());loss.push(qLoss(H,t));if(!isFinite(loss[k])||Math.abs(t[0])>1e6)break}
    return {H,path,loss}}
  // verdict for plain GD and momentum from eigenvalues (stability theory, checked numerically in recompute.py)
  function verdict(o){const lm=Math.max(o.l1,o.l2),r=o.lr*lm;
    if(o.opt==='gd')return r<1?'smooth':r<2?'oscillates':r===2?'bounces forever':'diverges';
    if(o.opt==='mom')return r<2*(1+o.beta)?'converges':'diverges';return ''}

  // ---------- Bernoulli curvature, three independent computations ----------
  function bern(z,h){h=h||1e-4;const p=sig(z);
    const L=(zz,y)=>LOSS.bce.L([zz],{y});
    const H0=(L(z+h,0)-2*L(z,0)+L(z-h,0))/(h*h),H1=(L(z+h,1)-2*L(z,1)+L(z-h,1))/(h*h);
    const mean=p*1+(1-p)*0,vr=p*Math.pow(1-mean,2)+(1-p)*Math.pow(0-mean,2);
    const ll=(zz,y)=>-L(zz,y);const sc=y=>(ll(z+h,y)-ll(z-h,y))/(2*h);
    const fish=p*sc(1)*sc(1)+(1-p)*sc(0)*sc(0);
    return {p,H0,H1,vr,fish,exact:p*(1-p)}}

  const api={LR,M1,sum,lse,softmax,softmaxNaive,sig,onehot,LOSS,lsTarget,focalW,numgrad,M0,clone,forward,backward,lossTwice,params,gradCheck,sgdStep,macs,hess,qLoss,qGrad,runOpt,verdict,bern,mv,mtv};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GL=api;
})(typeof window!=='undefined'?window:globalThis);
