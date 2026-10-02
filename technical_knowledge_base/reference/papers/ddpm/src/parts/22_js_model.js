// ---- The toy DDPM in plain JS: schedule (§4), network (toy.py), Eq. 4, 7, 11, Algorithm 2, Eq. 15 ----
// Checked against PyTorch and a float64 NumPy reference by check_forward.py / check_forward.mjs.
const DM=(function(){
  const WD=window.DDPM_W,T=WD.T,H=WD.W,TE=WD.TE;
  // schedule, index t = 1..T (index 0 unused): beta linear from 1e-4 to 0.02
  const beta=new Float64Array(T+1),alpha=new Float64Array(T+1),abar=new Float64Array(T+1),btil=new Float64Array(T+1);
  abar[0]=1;for(let t=1;t<=T;t++){beta[t]=WD.beta[0]+(WD.beta[1]-WD.beta[0])*(t-1)/(T-1);alpha[t]=1-beta[t];abar[t]=abar[t-1]*alpha[t];btil[t]=(1-abar[t-1])/(1-abar[t])*beta[t]}
  const b64=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
  function tensor(e,bits){const q=2**(bits-1)-1,raw=b64(e.q),sc=new Float32Array(b64(e.scale).buffer),rows=e.shape.length>1?e.shape[0]:1,cols=e.shape.length>1?e.shape[1]:e.shape[0];
    const o=new Float64Array(rows*cols);for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)o[r*cols+c]=(raw[r*cols+c]-q)*sc[r];return o}
  const nets={};
  function net(kind){if(nets[kind])return nets[kind];const V=WD.variants[kind],g=n=>tensor(V[n],WD.bits);
    const N={kind,l1:g('l1.weight'),b1:g('l1.bias'),p1:g('p1.weight'),l2:g('l2.weight'),b2:g('l2.bias'),p2:g('p2.weight'),l3:g('l3.weight'),b3:g('l3.bias'),p3:g('p3.weight'),lo:g('lo.weight'),bo:g('lo.bias'),P:[]};
    return nets[kind]=N}
  // Transformer sinusoidal embedding of t (toy.temb), projected into each hidden layer; cached per t
  const freq=new Float64Array(TE/2);for(let k=0;k<TE/2;k++)freq[k]=Math.exp(-Math.log(10000)*k/(TE/2-1));
  function proj(N,t){if(N.P[t])return N.P[t];const e=new Float64Array(TE);for(let k=0;k<TE/2;k++){e[k]=Math.sin(t*freq[k]);e[k+TE/2]=Math.cos(t*freq[k])}
    const out=[N.p1,N.p2,N.p3].map((P,i)=>{const b=[N.b1,N.b2,N.b3][i],o=new Float64Array(H);for(let j=0;j<H;j++){let s=b[j];for(let k=0;k<TE;k++)s+=P[j*TE+k]*e[k];o[j]=s}return o});
    return N.P[t]=out}
  const silu=v=>v/(1+Math.exp(-v));
  const h1=new Float64Array(H),h2=new Float64Array(H),h3=new Float64Array(H);
  // raw network output for one point: eps_theta for the eps variants, mu_theta for the mu variants
  function fwd(N,x0,x1,t,out){const P=proj(N,t),l1=N.l1,l2=N.l2,l3=N.l3,lo=N.lo;
    for(let j=0;j<H;j++)h1[j]=silu(l1[2*j]*x0+l1[2*j+1]*x1+P[0][j]);
    for(let j=0;j<H;j++){let s=P[1][j];const r=j*H;for(let k=0;k<H;k++)s+=l2[r+k]*h1[k];h2[j]=silu(s)}
    for(let j=0;j<H;j++){let s=P[2][j];const r=j*H;for(let k=0;k<H;k++)s+=l3[r+k]*h2[k];h3[j]=silu(s)}
    let a=N.bo[0],b=N.bo[1];for(let k=0;k<H;k++){a+=lo[k]*h3[k];b+=lo[H+k]*h3[k]}out[0]=a;out[1]=b;return out}
  const tmp=[0,0];
  // mu_theta (Eq. 11 for eps variants) and the implied eps (for the score field and Eq. 15)
  function meanEps(N,x0,x1,t,res){fwd(N,x0,x1,t,tmp);const isE=N.kind.startsWith('eps'),c=beta[t]/Math.sqrt(1-abar[t]),ra=Math.sqrt(alpha[t]);
    if(isE){res[2]=tmp[0];res[3]=tmp[1];res[0]=(x0-c*tmp[0])/ra;res[1]=(x1-c*tmp[1])/ra}
    else{res[0]=tmp[0];res[1]=tmp[1];res[2]=(x0-ra*tmp[0])/c;res[3]=(x1-ra*tmp[1])/c}return res}
  // Box-Muller on mulberry32, the same stream as toy.gauss_stream
  function gauss(seed){const u=mulberry32(seed);let sp=null;return()=>{if(sp!==null){const v=sp;sp=null;return v}const a=Math.max(u(),1e-12),b=u(),r=Math.sqrt(-2*Math.log(a));sp=r*Math.sin(2*Math.PI*b);return r*Math.cos(2*Math.PI*b)}}
  // Algorithm 2, resumable: s=sampler(kind,n,seed,sig); s.run(k) does k reverse steps; s.x holds x_t, s.xh the Eq. 15 prediction of x_0
  function sampler(kind,n,seed,sig){const N=net(kind),g=gauss(seed),x=new Float64Array(2*n),xh=new Float64Array(2*n),r=[0,0,0,0];
    for(let i=0;i<2*n;i++)x[i]=g();const S={kind,n,seed,sig,t:T,x,xh,nfe:0};
    S.run=k=>{for(let s=0;s<k&&S.t>=1;s++){const t=S.t,sd=t>1?Math.sqrt(sig==='btilde'?btil[t]:beta[t]):0,sa=Math.sqrt(abar[t]),sb=Math.sqrt(1-abar[t]);
      for(let i=0;i<n;i++){const a=x[2*i],b=x[2*i+1];meanEps(N,a,b,t,r);xh[2*i]=(a-sb*r[2])/sa;xh[2*i+1]=(b-sb*r[3])/sa;
        if(t>1){x[2*i]=r[0]+sd*g();x[2*i+1]=r[1]+sd*g()}else{x[2*i]=r[0];x[2*i+1]=r[1]}}
      S.t--;S.nfe+=n}return S};
    return S}
  // Eq. 4: x_t = sqrt(abar) x0 + sqrt(1 - abar) eps
  function qsample(X,t,seed){const g=gauss(seed),o=new Float64Array(X.length),sa=Math.sqrt(abar[t]),sb=Math.sqrt(1-abar[t]);for(let i=0;i<X.length;i++)o[i]=sa*X[i]+sb*g();return o}
  // the data: toy.swiss_roll's shape (fresh draws here, seeded), quantised to the 8-bit grid and scaled to [-1, 1]
  function roll(n,seed){const u=mulberry32(seed),g=gauss(seed+7),o=new Float64Array(2*n);for(let i=0;i<n;i++){const th=1.5*Math.PI*(1+2*u());
    for(let d=0;d<2;d++){let p=(d?th*Math.sin(th):th*Math.cos(th))+0.25*g();p*=0.9/14.2;o[2*i+d]=Math.min(255,Math.max(0,Math.round((p+1)*127.5)))/127.5-1}}return o}
  const CURVE=(()=>{const m=1500,c=new Float64Array(2*m);for(let i=0;i<m;i++){const th=1.5*Math.PI+3*Math.PI*i/(m-1);c[2*i]=th*Math.cos(th)*0.9/14.2;c[2*i+1]=th*Math.sin(th)*0.9/14.2}return c})();
  // share of points within r of the noiseless roll curve (train.pr_metrics' on_roll)
  function onRoll(X,r){r=r||0.04;const n=X.length/2,m=CURVE.length/2;let k=0,sd=0;for(let i=0;i<n;i++){let best=1e9;for(let j=0;j<m;j++){const dx=X[2*i]-CURVE[2*j],dy=X[2*i+1]-CURVE[2*j+1],d=dx*dx+dy*dy;if(d<best)best=d}best=Math.sqrt(best);sd+=best;if(best<r)k++}return {share:k/n,mean:sd/n}}
  return {T,beta,alpha,abar,btil,net,fwd,meanEps,gauss,sampler,qsample,roll,CURVE,onRoll,H}
})();
