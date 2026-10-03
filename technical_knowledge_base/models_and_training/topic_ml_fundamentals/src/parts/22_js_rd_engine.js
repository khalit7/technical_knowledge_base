// ---- Reading tab: the computation engine behind every Reading visual (no DOM) ----
// Everything here is exact arithmetic on seeded inputs, recomputed independently in src/read/recompute.py
// (PyTorch float64 with autograd for the network, NumPy for the spectra) and compared by src/read/check_engine.mjs.
window.RDE=(function(){
  // mulberry32: a 32-bit seeded generator, reproduced bit for bit in recompute.py
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
  // Box-Muller, two uniforms per draw, no caching
  const gauss=r=>{const u1=1-r(),u2=r();return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2)};
  const fill=(r,n,s)=>{const a=new Float64Array(n);for(let i=0;i<n;i++)a[i]=gauss(r)*s;return a};
  // row-major matrices: {r,c,a}
  const M=(r,c,a)=>({r,c,a:a||new Float64Array(r*c)});
  function mm(A,B){const C=M(A.r,B.c),a=A.a,b=B.a,c=C.a,n=A.r,k=A.c,m=B.c;for(let i=0;i<n;i++)for(let p=0;p<k;p++){const v=a[i*k+p];if(v===0)continue;const bo=p*m,co=i*m;for(let j=0;j<m;j++)c[co+j]+=v*b[bo+j]}return C}
  function mmTA(A,B){const C=M(A.c,B.c),a=A.a,b=B.a,c=C.a,n=A.r,k=A.c,m=B.c;for(let i=0;i<n;i++)for(let p=0;p<k;p++){const v=a[i*k+p];if(v===0)continue;const bo=i*m,co=p*m;for(let j=0;j<m;j++)c[co+j]+=v*b[bo+j]}return C}
  function mmTB(A,B){const C=M(A.r,B.r),a=A.a,b=B.a,c=C.a,n=A.r,k=A.c,m=B.r;for(let i=0;i<n;i++)for(let j=0;j<m;j++){let s=0;const ao=i*k,bo=j*k;for(let p=0;p<k;p++)s+=a[ao+p]*b[bo+p];c[i*m+j]=s}return C}
  const fro=a=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*a[i];return Math.sqrt(s)};
  const std=a=>{let m=0;for(let i=0;i<a.length;i++)m+=a[i];m/=a.length;let v=0;for(let i=0;i<a.length;i++)v+=(a[i]-m)*(a[i]-m);return Math.sqrt(v/a.length)};
  const sig=x=>1/(1+Math.exp(-x));

  // ---- the toy network: one batch through 16 layers of width 64, 10 classes ----
  const B=32,D=64,K=10,L=16,F=176,HB=256,EPS_BN=1e-5,EPS_RMS=1e-6;
  const MODES=[
    {id:'sig',name:'Sigmoid, Xavier init',init:Math.sqrt(2/(D+D))},
    {id:'small',name:'ReLU, init too small (variance 1/n)',init:Math.sqrt(1/D)},
    {id:'he',name:'ReLU, He init (variance 2/n)',init:Math.sqrt(2/D)},
    {id:'bn',name:'ReLU + BatchNorm, residual',init:Math.sqrt(2/D)},
    {id:'pre',name:'Pre-RMSNorm residual + SwiGLU',init:Math.sqrt(1/D)}
  ];
  let DATA=null;
  function data(){if(DATA)return DATA;const r=rng(20261003);
    const X=M(B,D,fill(r,B*D,1)),XH=M(HB,D,fill(r,HB*D,1)),T=M(K,D,fill(r,K*D,1));
    const lab=X=>{const s=mmTB(X,T),y=new Int32Array(X.r);for(let i=0;i<X.r;i++){let b=0;for(let k=1;k<K;k++)if(s.a[i*K+k]>s.a[i*K+b])b=k;y[i]=b}return y};
    DATA={X,XH,y:lab(X),yh:lab(XH)};return DATA}
  function weights(mi){const md=MODES[mi],r=rng(1000+mi),W=[];
    for(let l=0;l<L;l++){
      if(md.id==='pre')W.push({W1:M(D,F,fill(r,D*F,Math.sqrt(1/D))),W3:M(D,F,fill(r,D*F,Math.sqrt(1/D))),W2:M(F,D,fill(r,F*D,Math.sqrt(1/F)/Math.sqrt(L)))});
      else W.push({W:M(D,D,fill(r,D*D,md.init))});
    }
    return {mode:mi,W,Wo:M(D,K,fill(r,D*K,Math.sqrt(1/D)))}}
  function rmsF(H){const n=H.r,d=H.c,U=M(n,d),rr=new Float64Array(n);for(let i=0;i<n;i++){let s=0;for(let j=0;j<d;j++)s+=H.a[i*d+j]**2;const q=Math.sqrt(s/d+EPS_RMS);rr[i]=q;for(let j=0;j<d;j++)U.a[i*d+j]=H.a[i*d+j]/q}return {U,rr}}
  function rmsB(dU,U,rr){const n=U.r,d=U.c,dH=M(n,d);for(let i=0;i<n;i++){let s=0;for(let j=0;j<d;j++)s+=dU.a[i*d+j]*U.a[i*d+j];s/=d;for(let j=0;j<d;j++)dH.a[i*d+j]=(dU.a[i*d+j]-U.a[i*d+j]*s)/rr[i]}return dH}
  function forward(net,X,y){const id=MODES[net.mode].id,C=[];let H=X;const acts=[];
    for(let l=0;l<L;l++){const w=net.W[l],c={Hin:H};
      if(id==='pre'){const {U,rr}=rmsF(H);const A=mm(U,w.W1),Bv=mm(U,w.W3),G=M(H.r,F);
        for(let i=0;i<A.a.length;i++){const s=sig(A.a[i]);G.a[i]=A.a[i]*s*Bv.a[i]}
        const O=mm(G,w.W2),Hn=M(H.r,D);for(let i=0;i<Hn.a.length;i++)Hn.a[i]=H.a[i]+O.a[i];
        Object.assign(c,{U,rr,A,Bv,G});H=Hn}
      else{const Z=mm(H,w.W);
        if(id==='sig'){const Hn=M(H.r,D);for(let i=0;i<Z.a.length;i++)Hn.a[i]=sig(Z.a[i]);c.Hout=Hn;H=Hn}
        else if(id==='bn'){const n=H.r,Xh=M(n,D),inv=new Float64Array(D),S=M(n,D),Hn=M(n,D);
          for(let j=0;j<D;j++){let m=0;for(let i=0;i<n;i++)m+=Z.a[i*D+j];m/=n;let v=0;for(let i=0;i<n;i++)v+=(Z.a[i*D+j]-m)**2;v/=n;inv[j]=1/Math.sqrt(v+EPS_BN);
            for(let i=0;i<n;i++){const xh=(Z.a[i*D+j]-m)*inv[j];Xh.a[i*D+j]=xh;const s=H.a[i*D+j]+xh;S.a[i*D+j]=s;Hn.a[i*D+j]=s>0?s:0}}
          Object.assign(c,{Xh,inv,S});H=Hn}
        else{const Hn=M(H.r,D);for(let i=0;i<Z.a.length;i++)Hn.a[i]=Z.a[i]>0?Z.a[i]:0;c.Z=Z;H=Hn}}
      C.push(c);acts.push(std(H.a))}
    let Hf=H,fin=null;if(id==='pre'){fin=rmsF(H);Hf=fin.U}
    const Lg=mm(Hf,net.Wo),n=X.r,P=M(n,K);let loss=0,correct=0;
    for(let i=0;i<n;i++){let mx=-Infinity,am=0;for(let k=0;k<K;k++){const v=Lg.a[i*K+k];if(v>mx){mx=v;am=k}}let s=0;for(let k=0;k<K;k++)s+=Math.exp(Lg.a[i*K+k]-mx);const lse=mx+Math.log(s);
      loss+=lse-Lg.a[i*K+y[i]];if(am===y[i])correct++;for(let k=0;k<K;k++)P.a[i*K+k]=Math.exp(Lg.a[i*K+k]-lse)}
    return {C,H,Hf,fin,P,loss:loss/n,acc:correct/n,acts}}
  function backward(net,f,y){const id=MODES[net.mode].id,n=f.P.r,dL=M(n,K);
    for(let i=0;i<n;i++)for(let k=0;k<K;k++)dL.a[i*K+k]=(f.P.a[i*K+k]-(k===y[i]?1:0))/n;
    const g={W:new Array(L),Wo:mmTA(f.Hf,dL)};let dH=mmTB(dL,net.Wo);
    if(id==='pre')dH=rmsB(dH,f.fin.U,f.fin.rr);
    for(let l=L-1;l>=0;l--){const w=net.W[l],c=f.C[l];
      if(id==='pre'){const dW2=mmTA(c.G,dH),dG=mmTB(dH,w.W2),dA=M(n,F),dB=M(n,F);
        for(let i=0;i<dG.a.length;i++){const a=c.A.a[i],s=sig(a);dB.a[i]=dG.a[i]*a*s;dA.a[i]=dG.a[i]*c.Bv.a[i]*s*(1+a*(1-s))}
        const dW1=mmTA(c.U,dA),dW3=mmTA(c.U,dB),dU=mmTB(dA,w.W1),dU3=mmTB(dB,w.W3);for(let i=0;i<dU.a.length;i++)dU.a[i]+=dU3.a[i];
        const dHn=rmsB(dU,c.U,c.rr);for(let i=0;i<dHn.a.length;i++)dHn.a[i]+=dH.a[i];
        g.W[l]={W1:dW1,W3:dW3,W2:dW2};dH=dHn}
      else{let dZ;
        if(id==='sig'){dZ=M(n,D);for(let i=0;i<dZ.a.length;i++){const h=c.Hout.a[i];dZ.a[i]=dH.a[i]*h*(1-h)}}
        else if(id==='bn'){const dS=M(n,D);for(let i=0;i<dS.a.length;i++)dS.a[i]=c.S.a[i]>0?dH.a[i]:0;
          dZ=M(n,D);for(let j=0;j<D;j++){let s1=0,s2=0;for(let i=0;i<n;i++){s1+=dS.a[i*D+j];s2+=dS.a[i*D+j]*c.Xh.a[i*D+j]}
            for(let i=0;i<n;i++)dZ.a[i*D+j]=c.inv[j]/n*(n*dS.a[i*D+j]-s1-c.Xh.a[i*D+j]*s2)}
          const dHp=mmTB(dZ,w.W);for(let i=0;i<dHp.a.length;i++)dHp.a[i]+=dS.a[i];g.W[l]={W:mmTA(c.Hin,dZ)};dH=dHp;continue}
        else{dZ=M(n,D);for(let i=0;i<dZ.a.length;i++)dZ.a[i]=c.Z.a[i]>0?dH.a[i]:0}
        g.W[l]={W:mmTA(c.Hin,dZ)};dH=mmTB(dZ,w.W)}}
    g.norms=g.W.map(o=>Math.sqrt(Object.values(o).reduce((s,m)=>s+fro(m.a)**2,0)));
    return g}
  // per-layer statistics of one batch through one network at initialisation
  const STATS={};
  function stats(mi){if(STATS[mi])return STATS[mi];const d=data(),net=weights(mi),f=forward(net,d.X,d.y),g=backward(net,f,d.y);
    return STATS[mi]={acts:f.acts,grads:g.norms,loss:f.loss,inStd:std(d.X.a),head:fro(g.Wo.a)}}

  // ---- one full training step under two recipes ----
  const RECIPES={
    classic:{mode:3,opt:'sgd',lr:0.1,mom:0.9,wd:1e-4,clip:0},
    modern:{mode:4,opt:'adamw',lr:3e-3,b1:0.9,b2:0.95,eps:1e-8,wd:0.1,clip:1.0}
  };
  const params=net=>{const p=[];net.W.forEach(o=>Object.keys(o).sort().forEach(k=>p.push(o[k])));p.push(net.Wo);return p};
  const grads=g=>{const p=[];g.W.forEach(o=>Object.keys(o).sort().forEach(k=>p.push(o[k])));p.push(g.Wo);return p};
  const STEP={};
  function step(name){if(STEP[name])return STEP[name];const R=RECIPES[name],d=data(),net=weights(R.mode);
    const f0=forward(net,d.X,d.y),h0=forward(net,d.XH,d.yh),g=backward(net,f0,d.y),P=params(net),G=grads(g);
    let gn=0;G.forEach(m=>gn+=fro(m.a)**2);gn=Math.sqrt(gn);
    let pn=0;P.forEach(m=>pn+=fro(m.a)**2);pn=Math.sqrt(pn);
    const sc=R.clip?Math.min(1,R.clip/(gn+1e-6)):1; let un=0,wn=0; // clip as torch.nn.utils.clip_grad_norm_
    for(let q=0;q<P.length;q++){const w=P[q].a,gr=G[q].a;
      for(let i=0;i<w.length;i++){let gi=gr[i]*sc,dw=0,dwd=0;
        if(R.opt==='sgd'){gi+=R.wd*w[i];dwd=-R.lr*R.wd*w[i];dw=-R.lr*gi}   // first step: momentum buffer = gradient (PyTorch); L2 folded into the gradient
        else{dwd=-R.lr*R.wd*w[i];const m=(1-R.b1)*gi/(1-R.b1),v=(1-R.b2)*gi*gi/(1-R.b2);dw=dwd-R.lr*m/(Math.sqrt(v)+R.eps)}
        un+=dw*dw;wn+=dwd*dwd;w[i]+=dw}}
    const f1=forward(net,d.X,d.y),h1=forward(net,d.XH,d.yh);
    return STEP[name]={loss0:f0.loss,loss1:f1.loss,acc0:f0.acc,acc1:f1.acc,hl0:h0.loss,hl1:h1.loss,ha0:h0.acc,ha1:h1.acc,gnorm:gn,clipped:sc<1,scale:sc,pnorm:pn,unorm:Math.sqrt(un),wdnorm:Math.sqrt(wn),
      act:f0.acts[L-1],first:g.norms[0],last:g.norms[L-1],nparams:P.reduce((s,m)=>s+m.a.length,0)}}

  // ---- update geometry: singular values of one layer's update under SGD, Adam's first step and Muon ----
  function symEig(S,n){const A=Float64Array.from(S);for(let sw=0;sw<100;sw++){let off=0;for(let p=0;p<n;p++)for(let q=p+1;q<n;q++)off+=A[p*n+q]**2;if(off<1e-30)break;
      for(let p=0;p<n;p++)for(let q=p+1;q<n;q++){const apq=A[p*n+q];if(Math.abs(apq)<1e-300)continue;const th=(A[q*n+q]-A[p*n+p])/(2*apq),t=Math.sign(th||1)/(Math.abs(th)+Math.sqrt(th*th+1)),c=1/Math.sqrt(t*t+1),s=t*c;
        for(let k=0;k<n;k++){const akp=A[k*n+p],akq=A[k*n+q];A[k*n+p]=c*akp-s*akq;A[k*n+q]=s*akp+c*akq}
        for(let k=0;k<n;k++){const apk=A[p*n+k],aqk=A[q*n+k];A[p*n+k]=c*apk-s*aqk;A[q*n+k]=s*apk+c*aqk}}}
    const e=[];for(let i=0;i<n;i++)e.push(A[i*n+i]);return e.sort((a,b)=>b-a)}
  // a batch of 32 gives a gradient of rank at most 32: values below 1e-7 of the largest are rounding noise and are set to 0
  const svals=X=>{const S=mmTB(X,X),s=symEig(S.a,X.r).map(v=>Math.sqrt(Math.max(0,v)));return s.map(v=>v<1e-7*s[0]?0:v)};
  const NS=[3.4445,-4.7750,2.0315];
  let GEO=null;
  function geometry(){if(GEO)return GEO;const d=data(),net=weights(4),f=forward(net,d.X,d.y),g=backward(net,f,d.y),G=g.W[7].W1; // 64 x 176
    const unit=X=>{const n=fro(X.a),Y=M(X.r,X.c);for(let i=0;i<X.a.length;i++)Y.a[i]=X.a[i]/n;return Y};
    const sgd=unit(G),adamRaw=M(G.r,G.c);for(let i=0;i<G.a.length;i++)adamRaw.a[i]=G.a[i]/(Math.abs(G.a[i])+1e-8);
    const iters=[];let X=M(G.r,G.c);const n0=fro(G.a)+1e-7;for(let i=0;i<G.a.length;i++)X.a[i]=G.a[i]/n0;iters.push(svals(X));
    for(let k=0;k<5;k++){const A=mmTB(X,X),AA=mm(A,A),Bm=M(A.r,A.c);for(let i=0;i<Bm.a.length;i++)Bm.a[i]=NS[1]*A.a[i]+NS[2]*AA.a[i];const BX=mm(Bm,X),Xn=M(X.r,X.c);for(let i=0;i<Xn.a.length;i++)Xn.a[i]=NS[0]*X.a[i]+BX.a[i];X=Xn;iters.push(svals(X))}
    const nrm=s=>{const q=Math.sqrt(s.reduce((a,b)=>a+b*b,0));return s.map(v=>v/q)};
    // share of Adam's first step that lies outside the span of the gradient's columns (Gram-Schmidt basis of that span)
    const Q=[];for(let j=0;j<G.c;j++){const v=new Float64Array(G.r);for(let i=0;i<G.r;i++)v[i]=G.a[i*G.c+j];
      for(let pass=0;pass<2;pass++)for(const q of Q){let d=0;for(let i=0;i<G.r;i++)d+=q[i]*v[i];for(let i=0;i<G.r;i++)v[i]-=d*q[i]}
      const n=Math.sqrt(v.reduce((a,b)=>a+b*b,0));if(n>1e-9*n0*Math.sqrt(G.c)&&n>1e-12){for(let i=0;i<G.r;i++)v[i]/=n;Q.push(v)}}
    let tot=0,inS=0;for(let j=0;j<G.c;j++){const v=new Float64Array(G.r);for(let i=0;i<G.r;i++){v[i]=adamRaw.a[i*G.c+j];tot+=v[i]*v[i]}for(const q of Q){let d=0;for(let i=0;i<G.r;i++)d+=q[i]*v[i];inS+=d*d}}
    GEO={sgd:svals(sgd),adam:nrm(svals(adamRaw)),muon:nrm(iters[5]),iters,shape:[G.r,G.c],rank:Q.length,adamOut:1-inS/tot};return GEO}
  const topShare=(s,k)=>{const t=s.reduce((a,b)=>a+b*b,0);let p=0;for(let i=0;i<k;i++)p+=s[i]*s[i];return p/t};

  // ---- learning-rate schedules (fraction of peak against fraction of the run) ----
  const SCHED={
    step:t=>t<1/3?1:t<2/3?0.1:0.01,
    isqrt:t=>{const w=0.04;return t<=0?0:Math.min(t/w,Math.sqrt(w/t))},
    cosine:t=>{const w=0.02;if(t<w)return t/w;const q=(t-w)/(1-w);return 0.1+0.9*0.5*(1+Math.cos(Math.PI*q))},
    wsd:(t,E)=>{E=E||1;const w=0.02,s=0.8*E;if(t<w)return t/w;if(t<s)return 1;return 1-Math.sqrt(Math.min(1,(t-s)/(E-s)))} // cooldown over the last 20% of a run ending at E
  };

  // ---- weight decay through Adam (L2 in the loss) against AdamW (decoupled) ----
  const SIG=[1e-4,1e-3,1e-2,1e-1,1,10];
  let WD=null;
  function wdSim(){if(WD)return WD;const N=3000,lr=1e-3,lam=0.1,b1=0.9,b2=0.999,eps=1e-8,r=rng(77);
    const st=k=>({w:SIG.map(()=>1),m:SIG.map(()=>0),v:SIG.map(()=>0)}),A=st(),W=st(),fr={l2:[SIG.map(()=>1)],adamw:[SIG.map(()=>1)]};
    for(let t=1;t<=N;t++){for(let i=0;i<SIG.length;i++){const xi=gauss(r)*SIG[i];
        let g=xi+lam*A.w[i];A.m[i]=b1*A.m[i]+(1-b1)*g;A.v[i]=b2*A.v[i]+(1-b2)*g*g;A.w[i]-=lr*(A.m[i]/(1-b1**t))/(Math.sqrt(A.v[i]/(1-b2**t))+eps);
        g=xi;W.w[i]*=1-lr*lam;W.m[i]=b1*W.m[i]+(1-b1)*g;W.v[i]=b2*W.v[i]+(1-b2)*g*g;W.w[i]-=lr*(W.m[i]/(1-b1**t))/(Math.sqrt(W.v[i]/(1-b2**t))+eps)}
      if(t%100===0){fr.l2.push(A.w.slice());fr.adamw.push(W.w.slice())}}
    return WD={sig:SIG,frames:fr,N,lr,lam}}

  // ---- vanishing gradients through time: a scalar tanh RNN against an LSTM cell path ----
  let XS=null;const T_BP=60;
  function bptt(w,bf){if(!XS){const r=rng(424242);XS=[];for(let t=0;t<T_BP;t++)XS.push(0.5*gauss(r))}
    let a=0;const fac=[],ff=[];for(let t=0;t<T_BP;t++){a=Math.tanh(w*a+XS[t]);fac.push(Math.log10(Math.abs(w*(1-a*a))));ff.push(Math.log10(sig(bf+XS[t])))}
    const rnn=[0],lstm=[0];for(let k=1;k<=T_BP;k++){rnn.push(rnn[k-1]+fac[T_BP-k]);lstm.push(lstm[k-1]+ff[T_BP-k])}
    return {rnn,lstm}} // log10 |dstate_T / dstate_{T-k}|, k = 0..60

  // ---- ROC against precision-recall under a binormal score model ----
  function erf(x){const s=Math.sign(x);x=Math.abs(x);if(x<2.5){let t=x,sum=x,x2=x*x,k=0;for(;k<120;k++){t*=-x2/(k+1);const d=t/(2*k+3);sum+=d;if(Math.abs(d)<1e-17)break}return s*2/Math.sqrt(Math.PI)*sum}
    // erfc by continued fraction (Lentz), accurate to about 1e-15 for x >= 2.5
    let f=x,C=x,Dd=0;for(let i=1;i<300;i++){const an=i/2;Dd=x+an*Dd;Dd=1/Dd;C=x+an/C;const dl=C*Dd;f*=dl;if(Math.abs(dl-1)<1e-16)break}
    return s*(1-Math.exp(-x*x)/Math.sqrt(Math.PI)/f)}
  const Phi=z=>0.5*(1+erf(z/Math.SQRT2));
  function roc(dp,prev,th){const tpr=1-Phi(th-dp),fpr=1-Phi(th),prec=tpr*prev/(tpr*prev+fpr*(1-prev));return {tpr,fpr,prec:isFinite(prec)?prec:1}}
  function curves(dp,prev){const R=[],P=[];let auprc=0,lastR=0;for(let i=0;i<=400;i++){const th=8-i*(16/400),o=roc(dp,prev,th);R.push([o.fpr,o.tpr]);P.push([o.tpr,o.prec]);auprc+=(o.tpr-lastR)*o.prec;lastR=o.tpr}
    return {R,P,auc:Phi(dp/Math.SQRT2),auprc}}

  // ---- one example, four losses (K classes, the wrong classes share 1 - p equally) ----
  function losses(p,K,eps,gam){const q=(1-p)/(K-1),ce=-Math.log(p),tl=1-eps+eps/K,ol=eps/K;
    return {ce,ls:-(tl*Math.log(p)+(K-1)*ol*Math.log(q)),focal:-Math.pow(1-p,gam)*Math.log(p),
      gce:p-1,gls:p-tl,gfocal:Math.pow(1-p,gam)*(gam*p*Math.log(p)-(1-p))}} // gradient with respect to the true class's logit
  // ---- entropy, cross entropy, KL ----
  function ckl(P,Q){let h=0,ce=0;for(let i=0;i<P.length;i++){if(P[i]>0){h-=P[i]*Math.log(P[i]);ce-=P[i]*Math.log(Q[i])}}return {h,ce,kl:ce-h}}

  return {rng,gauss,B,D,K,L,F,HB,MODES,RECIPES,data,stats,step,geometry,topShare,SCHED,wdSim,bptt,T_BP,erf,Phi,roc,curves,losses,ckl,sig};
})();
