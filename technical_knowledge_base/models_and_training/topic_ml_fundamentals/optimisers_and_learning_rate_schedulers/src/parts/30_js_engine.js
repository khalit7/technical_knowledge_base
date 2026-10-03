// ---- Optimiser engine: exact update rules on 2-D surfaces (shared by the Reading tab and the Optimiser race) ----
// Every rule follows the implementation named beside it, line by line, in float64; checks/check_engine.mjs
// compares the trajectories with PyTorch (torch.optim, lion-pytorch, SOAP's soap.py, schedulefree) on every surface.
(function(G){
  const sq=Math.sqrt;
  // seeded noise: mulberry32 then Box-Muller
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
  function gauss(seed){const r=rng(seed);let spare=null;return function(){if(spare!==null){const s=spare;spare=null;return s}
    let u=0,v=0;while(u<=1e-12)u=r();v=r();const m=sq(-2*Math.log(u));spare=m*Math.sin(2*Math.PI*v);return m*Math.cos(2*Math.PI*v)}}
  const R2=Math.SQRT1_2;
  // ---- surfaces: f, gradient, start, view box, steps ----
  const K=100,CX=1,CY=0.6; // curvature ratio and minimum of the ravine
  const S={
    ravine:{name:'Ravine, axis-aligned',f:(x,y)=>0.5*((x-CX)*(x-CX)+K*(y-CY)*(y-CY)),g:(x,y)=>[x-CX,K*(y-CY)],start:[-4,1.2],box:[-4.6,2.6,-0.6,1.8],steps:150,log:true,min:0,
      note:'f = ((x \u2212 1)\u00b2 + 100(y \u2212 0.6)\u00b2)/2: the curvature across the valley is 100 times the curvature along it (condition number 100). The minimum is at (1, 0.6), deliberately not at zero, so weight decay cannot help by pulling towards the origin.'},
    rotated:{name:'Ravine, rotated 45\u00b0',f:(x,y)=>{const u=R2*((x-CX)+(y-CY)),v=R2*((y-CY)-(x-CX));return 0.5*(u*u+K*v*v)},
      g:(x,y)=>{const u=R2*((x-CX)+(y-CY)),v=R2*((y-CY)-(x-CX)),gu=u,gv=K*v;return[R2*(gu-gv),R2*(gu+gv)]},start:[CX+R2*(-5-0.6),CY+R2*(-5+0.6)],box:[-3.8,2.4,-3.8,2.4],steps:150,log:true,min:0,
      note:'The same valley turned 45\u00b0 about its minimum: the steep direction now mixes x and y, so no per-coordinate scale can fix it.'},
    rosen:{name:'Rosenbrock',f:(x,y)=>(1-x)*(1-x)+100*(y-x*x)*(y-x*x),g:(x,y)=>[-2*(1-x)-400*x*(y-x*x),200*(y-x*x)],start:[-1.2,1],box:[-2,2,-1,3],steps:1200,log:true,min:0,
      note:'f = (1 − x)² + 100(y − x²)²: a curved banana valley; the minimum is at (1, 1).'},
    saddle:{name:'Saddle',f:(x,y)=>0.5*x*x+0.25*y*y*y*y-0.5*y*y+0.25,g:(x,y)=>[x,y*y*y-y],start:[2.2,0.001],box:[-2.6,2.6,-1.6,1.6],steps:120,log:true,min:0,
      note:'f = x²/2 + y⁴/4 − y²/2 + 1/4: a saddle at the origin, minima at (0, ±1). The start sits 0.001 off the ridge.'},
    noisy:{name:'Noisy ravine',f:(x,y)=>0.5*((x-CX)*(x-CX)+K*(y-CY)*(y-CY)),g:(x,y)=>[x-CX,K*(y-CY)],start:[-4,1.2],box:[-4.6,2.6,-0.6,1.8],steps:300,log:true,min:0,noise:1.5,
      note:'The axis-aligned ravine with Gaussian noise (standard deviation 1.5) added to every gradient component, the same noise for every optimiser: a stand-in for mini-batch gradients.'}
  };
  // ---- learning-rate schedules: multiplier at step t (0-based) of T ----
  function sched(kind,t,T){
    if(kind==='cosine')return 0.5*(1+Math.cos(Math.PI*t/T));
    if(kind==='wsd'){const D=Math.round(0.2*T),s=T-D;return t<s?1:1-sq((t-s)/D)}
    return 1;
  }
  // ---- optimisers: init(p0) -> state; at(st) the point where the gradient is taken; step(st,g,lr); pos(st) the reported iterate ----
  const plain=p=>({p:p.slice()});
  const O={
    gd:{name:'SGD (plain)',src:'torch.optim.SGD',state:0,init:plain,step(s,g,lr){s.p[0]-=lr*g[0];s.p[1]-=lr*g[1]}},
    mom:{name:'Momentum 0.9',src:'torch.optim.SGD(momentum=0.9)',state:1,init:p=>({p:p.slice(),b:null}),
      step(s,g,lr){const mu=0.9;if(!s.b)s.b=g.slice();else for(let i=0;i<2;i++)s.b[i]=mu*s.b[i]+g[i];for(let i=0;i<2;i++)s.p[i]-=lr*s.b[i]}},
    nes:{name:'Nesterov 0.9',src:'torch.optim.SGD(momentum=0.9, nesterov=True)',state:1,init:p=>({p:p.slice(),b:null}),
      step(s,g,lr){const mu=0.9;if(!s.b)s.b=g.slice();else for(let i=0;i<2;i++)s.b[i]=mu*s.b[i]+g[i];for(let i=0;i<2;i++)s.p[i]-=lr*(g[i]+mu*s.b[i])}},
    adagrad:{name:'AdaGrad',src:'torch.optim.Adagrad',state:1,init:p=>({p:p.slice(),a:[0,0]}),
      step(s,g,lr){for(let i=0;i<2;i++){s.a[i]+=g[i]*g[i];s.p[i]-=lr*g[i]/(sq(s.a[i])+1e-10)}}},
    rmsprop:{name:'RMSProp',src:'torch.optim.RMSprop(alpha=0.99)',state:1,init:p=>({p:p.slice(),v:[0,0]}),
      step(s,g,lr){const al=0.99;for(let i=0;i<2;i++){s.v[i]=al*s.v[i]+(1-al)*g[i]*g[i];s.p[i]-=lr*g[i]/(sq(s.v[i])+1e-8)}}},
    adam:{name:'Adam',src:'torch.optim.Adam',state:2,init:p=>({p:p.slice(),m:[0,0],v:[0,0],t:0}),
      step(s,g,lr){const b1=0.9,b2=0.999;s.t++;const c1=1-Math.pow(b1,s.t),c2=1-Math.pow(b2,s.t);
        for(let i=0;i<2;i++){s.m[i]=b1*s.m[i]+(1-b1)*g[i];s.v[i]=b2*s.v[i]+(1-b2)*g[i]*g[i];s.p[i]-=(lr/c1)*s.m[i]/(sq(s.v[i])/sq(c2)+1e-8)}}},
    adamw:{name:'AdamW (decay 0.1)',src:'torch.optim.AdamW(weight_decay=0.1)',state:2,init:p=>({p:p.slice(),m:[0,0],v:[0,0],t:0}),
      step(s,g,lr){const b1=0.9,b2=0.999,wd=0.1;s.t++;const c1=1-Math.pow(b1,s.t),c2=1-Math.pow(b2,s.t);
        for(let i=0;i<2;i++){s.p[i]*=1-lr*wd;s.m[i]=b1*s.m[i]+(1-b1)*g[i];s.v[i]=b2*s.v[i]+(1-b2)*g[i]*g[i];s.p[i]-=(lr/c1)*s.m[i]/(sq(s.v[i])/sq(c2)+1e-8)}}},
    lion:{name:'Lion',src:'lion-pytorch (Chen et al. 2023, Algorithm 2)',state:1,init:p=>({p:p.slice(),m:[0,0]}),
      step(s,g,lr){const b1=0.9,b2=0.99;for(let i=0;i<2;i++){const c=b1*s.m[i]+(1-b1)*g[i];s.p[i]-=lr*Math.sign(c);s.m[i]=b2*s.m[i]+(1-b2)*g[i]}}},
    shampoo:{name:'Shampoo (full-matrix)',src:'Gupta et al. 2018, order-1 case: full-matrix AdaGrad, H^(-1/2)',state:'n²',init:p=>({p:p.slice(),H:[1e-4,0,1e-4]}),
      step(s,g,lr){const H=s.H;H[0]+=g[0]*g[0];H[1]+=g[0]*g[1];H[2]+=g[1]*g[1];const M=isqrt2(H);
        s.p[0]-=lr*(M[0]*g[0]+M[1]*g[1]);s.p[1]-=lr*(M[1]*g[0]+M[2]*g[1])}},
    soap:{name:'SOAP',src:'soap.py (Vyas et al. 2024), precondition_1d=True, frequency 10',state:'2 + n² × 2',init:p=>({p:p.slice(),GG:[0,0,0],Q:null,m:[0,0],v:[0,0],t:0}),
      step(s,g,lr){const b1=0.95,b2=0.95,sb=0.95,eps=1e-8,f=10;
        if(!s.Q){soapUpd(s,g,sb,f);return}
        const gp=proj(s.Q,g);s.t++;
        for(let i=0;i<2;i++){s.m[i]=b1*s.m[i]+(1-b1)*gp[i];s.v[i]=b2*s.v[i]+(1-b2)*gp[i]*gp[i]}
        const c1=1-Math.pow(b1,s.t),c2=1-Math.pow(b2,s.t),ss=lr*sq(c2)/c1;
        const nb=back(s.Q,[s.m[0]/(sq(s.v[0])+eps),s.m[1]/(sq(s.v[1])+eps)]);
        s.p[0]-=ss*nb[0];s.p[1]-=ss*nb[1];soapUpd(s,g,sb,f)}},
    muon:{name:'Muon (on a 1×2 matrix)',src:'torch.optim.Muon, Newton-Schulz in float64',state:1,init:p=>({p:p.slice(),b:[0,0]}),
      step(s,g,lr){const mu=0.95;for(let i=0;i<2;i++)s.b[i]+=(1-mu)*(g[i]-s.b[i]);
        const u=[g[0]+mu*(s.b[0]-g[0]),g[1]+mu*(s.b[1]-g[1])];const o=ns5(u);s.p[0]-=lr*o[0];s.p[1]-=lr*o[1]}},
    sfsgd:{name:'Schedule-free SGD',src:'schedulefree.SGDScheduleFree (momentum 0.9)',state:1,sf:true,init:p=>({p:p.slice(),x:p.slice(),z:p.slice(),k:0,ws:0,lm:-1}),
      at:s=>s.p,step(s,g,lr){const b=0.9;s.lm=Math.max(s.lm,lr);s.ws+=s.lm*s.lm;const c=s.lm*s.lm/s.ws;
        for(let i=0;i<2;i++){s.p[i]+=c*(s.z[i]-s.p[i]);s.p[i]+=lr*(b*(1-c)-1)*g[i];s.z[i]-=lr*g[i]}s.k++;
        for(let i=0;i<2;i++)s.x[i]=s.p[i]+(1-1/b)*(s.z[i]-s.p[i])},pos:s=>s.x},
    sfadamw:{name:'Schedule-free AdamW',src:'schedulefree.AdamWScheduleFree (beta1 0.9, beta2 0.999)',state:2,sf:true,init:p=>({p:p.slice(),x:p.slice(),z:p.slice(),v:[0,0],k:0,ws:0,lm:-1}),
      at:s=>s.p,step(s,g,lr){const b1=0.9,b2=0.999;const bc2=1-Math.pow(b2,s.k+1);s.lm=Math.max(s.lm,lr);s.ws+=s.lm*s.lm;const c=s.lm*s.lm/s.ws;
        for(let i=0;i<2;i++){s.v[i]=b2*s.v[i]+(1-b2)*g[i]*g[i];const gn=g[i]/(sq(s.v[i]/bc2)+1e-8);
          s.p[i]+=c*(s.z[i]-s.p[i]);s.p[i]+=lr*(b1*(1-c)-1)*gn;s.z[i]-=lr*gn}s.k++;
        for(let i=0;i<2;i++)s.x[i]=s.p[i]+(1-1/b1)*(s.z[i]-s.p[i])},pos:s=>s.x}
  };
  // symmetric 2x2 [a,b,c] = [[a,b],[b,c]]: inverse square root by eigendecomposition
  function eig2(a,b,c){const tr=(a+c)/2,d=sq(((a-c)/2)*((a-c)/2)+b*b);const l1=tr+d,l2=tr-d;let v1;
    if(Math.abs(b)>1e-300)v1=a>=c?[l1-c,b]:[b,l1-a];else v1=a>=c?[1,0]:[0,1];const n=Math.hypot(v1[0],v1[1]);v1=[v1[0]/n,v1[1]/n];return{l:[l1,l2],v1,v2:[-v1[1],v1[0]]}}
  function isqrt2(H){const e=eig2(H[0],H[1],H[2]);const s1=1/sq(e.l[0]),s2=1/sq(e.l[1]),u=e.v1,w=e.v2;
    return[s1*u[0]*u[0]+s2*w[0]*w[0],s1*u[0]*u[1]+s2*w[0]*w[1],s1*u[1]*u[1]+s2*w[1]*w[1]]}
  // SOAP helpers (vector case): Q is a 2x2 matrix [[q00,q01],[q10,q11]] whose columns are the eigenbasis
  const proj=(Q,g)=>[Q[0][0]*g[0]+Q[1][0]*g[1],Q[0][1]*g[0]+Q[1][1]*g[1]];
  const back=(Q,g)=>[Q[0][0]*g[0]+Q[0][1]*g[1],Q[1][0]*g[0]+Q[1][1]*g[1]];
  function soapUpd(s,g,sb,f){
    if(s.Q)s.m=back(s.Q,s.m);
    const GG=s.GG,w=1-sb;GG[0]+=w*(g[0]*g[0]-GG[0]);GG[1]+=w*(g[0]*g[1]-GG[1]);GG[2]+=w*(g[1]*g[1]-GG[2]);
    if(!s.Q){const e=eig2(GG[0],GG[1],GG[2]);s.Q=[[e.v1[0],e.v2[0]],[e.v1[1],e.v2[1]]]}
    if(s.t>0&&s.t%f===0){ // one power iteration and QR, columns sorted by estimated eigenvalue, v permuted alongside
      const Q=s.Q,m=[[GG[0],GG[1]],[GG[1],GG[2]]];const est=[0,1].map(j=>{const q=[Q[0][j],Q[1][j]];return q[0]*(m[0][0]*q[0]+m[0][1]*q[1])+q[1]*(m[1][0]*q[0]+m[1][1]*q[1])});
      let idx=[0,1];if(est[1]>est[0])idx=[1,0];s.v=[s.v[idx[0]],s.v[idx[1]]];const o=[[Q[0][idx[0]],Q[0][idx[1]]],[Q[1][idx[0]],Q[1][idx[1]]]];
      const P=[[m[0][0]*o[0][0]+m[0][1]*o[1][0],m[0][0]*o[0][1]+m[0][1]*o[1][1]],[m[1][0]*o[0][0]+m[1][1]*o[1][0],m[1][0]*o[0][1]+m[1][1]*o[1][1]]];
      // Gram-Schmidt QR (column signs do not change the update)
      let a=[P[0][0],P[1][0]],n=Math.hypot(a[0],a[1]);if(n<1e-300)a=[1,0];else a=[a[0]/n,a[1]/n];
      s.Q=[[a[0],-a[1]],[a[1],a[0]]]}
    if(s.t>0)s.m=proj(s.Q,s.m)}
  // Newton-Schulz quintic on a 1x2 matrix (Jordan's coefficients), as torch.optim.Muon but in float64
  function ns5(u){const a=3.4445,b=-4.775,c=2.0315;const n=Math.max(Math.hypot(u[0],u[1]),1e-7);let X=[u[0]/n,u[1]/n];
    for(let k=0;k<5;k++){const A=X[0]*X[0]+X[1]*X[1];const B=b*A+c*A*A;X=[a*X[0]+B*X[0],a*X[1]+B*X[1]]}return X}
  // ---- run one optimiser on one surface ----
  function run(sk,ok,lr,o){o=o||{};const sf=S[sk],op=O[ok],T=o.steps||sf.steps,sch=op.sf?'const':(o.sched||'const');
    const nz=sf.noise?gauss(o.seed||1):null;const st=op.init(o.start||sf.start);const pos=op.pos||(s=>s.p),at=op.at||(s=>s.p);
    const xs=new Float64Array(T+1),ys=new Float64Array(T+1),ls=new Float64Array(T+1);
    let p=pos(st);xs[0]=p[0];ys[0]=p[1];ls[0]=sf.f(p[0],p[1]);let bad=false;
    for(let t=0;t<T;t++){const q=at(st);let g=sf.g(q[0],q[1]);if(nz){g=[g[0]+sf.noise*nz(),g[1]+sf.noise*nz()]}
      op.step(st,g,lr*sched(sch,t,T));p=pos(st);
      if(!isFinite(p[0])||!isFinite(p[1])||Math.abs(p[0])>1e6||Math.abs(p[1])>1e6){bad=true;for(let u=t+1;u<=T;u++){xs[u]=NaN;ys[u]=NaN;ls[u]=NaN}break}
      xs[t+1]=p[0];ys[t+1]=p[1];ls[t+1]=sf.f(p[0],p[1])}
    return{xs,ys,ls,T,diverged:bad}}
  G.OPTE={S,O,run,sched,gauss,rng,ns5,isqrt2};
})(typeof window!=='undefined'?window:globalThis);
