// ---- The toy model and LoRA, in plain JS (also run by node in check_engine.mjs against PyTorch) ----
// One Transformer block read out at position 0. Weights are out x in, h = W x (the paper's convention).
// Training: cross-entropy, Adam, linear warmup then linear decay, exactly as train.py.
(function(root){
const V=16,L=10,D=32,NH=2,DH=16,DFF=128,NC=11,BOS=16,NT=12;
const SHAPES={E:[17,D],P:[NT,D],Wq:[D,D],Wk:[D,D],Wv:[D,D],Wo:[D,D],W1:[DFF,D],b1:[DFF],W2:[D,DFF],b2:[D],Wh:[NC,D],bh:[NC]};
const NAMES=['E','P','Wq','Wk','Wv','Wo','W1','b1','W2','b2','Wh','bh'];
const TARGETS=['Wq','Wk','Wv','Wo','W1','W2'];
const size=s=>s.reduce((a,b)=>a*b,1);
function rng(seed){let a=seed>>>0;const f=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
  f.int=n=>Math.floor(f()*n);let sp=null;f.gauss=()=>{if(sp!==null){const s=sp;sp=null;return s}let u=0,v=0;while(u<1e-12)u=f();v=f();const m=Math.sqrt(-2*Math.log(u));sp=m*Math.sin(2*Math.PI*v);return m*Math.cos(2*Math.PI*v)};return f}
// n pretraining sequences: [x0, BOS, x1..x10], query x0 uniform, its count c uniform over 0..10 (label = c)
function genPre(n,R){const X=new Int32Array(n*NT),y=new Int32Array(n);
  for(let i=0;i<n;i++){const x0=R.int(V),c=R.int(L+1);const pos=[...Array(L).keys()];for(let j=L-1;j>0;j--){const k=R.int(j+1);[pos[j],pos[k]]=[pos[k],pos[j]]}
    const seq=new Array(L);for(let j=0;j<L;j++){if(j<c)seq[pos[j]]=x0;else{let s=R.int(V-1);if(s>=x0)s++;seq[pos[j]]=s}}
    X[i*NT]=x0;X[i*NT+1]=BOS;for(let j=0;j<L;j++)X[i*NT+2+j]=seq[j];y[i]=c}
  return {X,y,n}}
function softmax(lg){let mx=-1e300;for(const x of lg)if(x>mx)mx=x;let Z=0;const p=new Float64Array(lg.length);for(let j=0;j<lg.length;j++){p[j]=Math.exp(lg[j]-mx);Z+=p[j]}for(let j=0;j<p.length;j++)p[j]/=Z;return p}
const argmax=a=>{let b=0;for(let j=1;j<a.length;j++)if(a[j]>a[b])b=j;return b};
// label a batch with a teacher (the base model plus a known edit {k, A, B, r, s:1}); changed: teacher differs from the base
function label(base,teach,data,withChanged){if(!teach)return data;const lo={};lo[teach.k]=teach;const Wt=weights(base,lo),Wb=withChanged?weights(base,null):null;
  data.p=new Float64Array(data.n*NC);data.changed=new Uint8Array(data.n);
  for(let i=0;i<data.n;i++){const lg=fwd(base,Wt,data.X,i).lg;const p=softmax(lg);data.p.set(p,i*NC);data.y[i]=argmax(lg);
    if(Wb)data.changed[i]=argmax(fwd(base,Wb,data.X,i).lg)!==data.y[i]?1:0}return data}
function gen(base,teach,n,R,withChanged){return label(base,teach,genPre(n,R),withChanged)}
function decode(str,scale,n){const A='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';const o=new Float64Array(n);
  for(let i=0;i<n;i++){const b=(A.indexOf(str[2*i])<<6)|A.indexOf(str[2*i+1]);o[i]=(b-2048)*scale}return o}
function decode24(str,scale,n){const A='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';const o=new Float64Array(n);
  for(let i=0;i<n;i++){let b=0;for(let j=0;j<4;j++)b=(b<<6)|A.indexOf(str[4*i+j]);o[i]=(b-8388608)*scale}return o}
function loadTeacher(T){const [o,i]=SHAPES[T.k];return {k:T.k,r:T.r,s:1,A:decode24(T.A,T.sA,T.r*i),B:decode24(T.B,T.sB,o*T.r)}}
function loadBase(M){const P={};NAMES.forEach(k=>{P[k]=decode(M.w[k],M.s[k],size(SHAPES[k]))});return P}
function cloneP(P){const o={};for(const k in P)o[k]=new Float64Array(P[k]);return o}
// effective weight W0 + s B A (B: out x r, A: r x in)
function eff(P,lora,k){const W=P[k];if(!lora||!lora[k])return W;const {A,B,r,s}=lora[k];const [o,i]=SHAPES[k];const out=new Float64Array(W);
  for(let a=0;a<o;a++)for(let q=0;q<r;q++){const b=s*B[a*r+q];if(b===0)continue;const ar=q*i;for(let c=0;c<i;c++)out[a*i+c]+=b*A[ar+c]}return out}
function mv_(W,x,o,i,out,off){if(W.W0){mv0(W.W0,x,o,i,out,off);const {A,B,r,s}=W;const ax=new Float64Array(r);for(let q=0;q<r;q++){let z=0;for(let c=0;c<i;c++)z+=A[q*i+c]*x[off+c];ax[q]=z}
  for(let a=0;a<o;a++){let z=0;for(let q=0;q<r;q++)z+=B[a*r+q]*ax[q];out[a]+=s*z}return out}return mv0(W,x,o,i,out,off)}
// unmerged: each adapted projection computed as W0 x + s B (A x), the two paths of Figure 1
function weightsSplit(P,lora){const W={};['Wq','Wk','Wv','Wo','W1','W2'].forEach(k=>W[k]=lora&&lora[k]?Object.assign({W0:P[k]},lora[k]):P[k]);return W}
function mv0(W,x,o,i,out,off){for(let a=0;a<o;a++){let s=0;const r=a*i;for(let c=0;c<i;c++)s+=W[r+c]*x[off+c];out[a]=s}return out}
// forward for one example; returns everything backward needs
function fwd(P,W,X,i){const H=new Float64Array(NT*D);for(let t=0;t<NT;t++){const tk=X[i*NT+t];for(let c=0;c<D;c++)H[t*D+c]=P.E[tk*D+c]+P.P[t*D+c]}
  const q=mv_(W.Wq,H,D,D,new Float64Array(D),0);const K=new Float64Array((NT-1)*D),Vv=new Float64Array((NT-1)*D);
  const tmp=new Float64Array(D);for(let t=1;t<NT;t++){mv_(W.Wk,H,D,D,tmp,t*D);K.set(tmp,(t-1)*D);mv_(W.Wv,H,D,D,tmp,t*D);Vv.set(tmp,(t-1)*D)}
  const a=new Float64Array(NH*(NT-1)),o=new Float64Array(D);const sc=1/Math.sqrt(DH);
  for(let h=0;h<NH;h++){let mx=-1e300;const s=new Float64Array(NT-1);for(let t=0;t<NT-1;t++){let z=0;for(let c=0;c<DH;c++)z+=q[h*DH+c]*K[t*D+h*DH+c];s[t]=z*sc;if(s[t]>mx)mx=s[t]}
    let Z=0;for(let t=0;t<NT-1;t++){s[t]=Math.exp(s[t]-mx);Z+=s[t]}for(let t=0;t<NT-1;t++){a[h*(NT-1)+t]=s[t]/Z;for(let c=0;c<DH;c++)o[h*DH+c]+=a[h*(NT-1)+t]*Vv[t*D+h*DH+c]}}
  const h1=new Float64Array(D);mv_(W.Wo,o,D,D,h1,0);for(let c=0;c<D;c++)h1[c]+=H[c];
  const u=mv_(W.W1,h1,DFF,D,new Float64Array(DFF),0);const z=new Float64Array(DFF);for(let j=0;j<DFF;j++){u[j]+=P.b1[j];z[j]=u[j]>0?u[j]:0}
  const h2=mv_(W.W2,z,D,DFF,new Float64Array(D),0);for(let c=0;c<D;c++)h2[c]+=h1[c]+P.b2[c];
  const lg=mv_(P.Wh,h2,NC,D,new Float64Array(NC),0);for(let j=0;j<NC;j++)lg[j]+=P.bh[j];
  return {H,q,K,Vv,a,o,h1,u,z,h2,lg}}
function weights(P,lora){const W={};['Wq','Wk','Wv','Wo','W1','W2'].forEach(k=>W[k]=eff(P,lora,k));return W}
function predict(P,lora,data){const W=weights(P,lora);const pr=new Int32Array(data.n);for(let i=0;i<data.n;i++){const f=fwd(P,W,data.X,i);let b=0;for(let j=1;j<NC;j++)if(f.lg[j]>f.lg[b])b=j;pr[i]=b}return pr}
function accuracy(P,lora,data){const pr=predict(P,lora,data);let ok=0,okm=0,nm=0,okk=0,nk=0;for(let i=0;i<data.n;i++){const g=pr[i]===data.y[i];ok+=g;if(data.changed&&data.changed[i]){nm++;okm+=g}else{nk++;okk+=g}}
  return {acc:ok/data.n,changed:nm?okm/nm:null,kept:nk?okk/nk:null}}
// gradients of the mean loss with respect to the effective weights (and, for full fine-tuning, everything)
function grads(P,lora,data,full){const W=weights(P,lora);const G={};const need=full?NAMES:Object.keys(lora);need.forEach(k=>G[k]=new Float64Array(size(SHAPES[k])));
  const g=k=>G[k];let loss=0;const n=data.n,sc=1/Math.sqrt(DH);
  for(let i=0;i<n;i++){const f=fwd(P,W,data.X,i);let mx=-1e300;for(let j=0;j<NC;j++)if(f.lg[j]>mx)mx=f.lg[j];let Z=0;const p=new Float64Array(NC);for(let j=0;j<NC;j++){p[j]=Math.exp(f.lg[j]-mx);Z+=p[j]}
    const dl=new Float64Array(NC);if(data.p){for(let j=0;j<NC;j++){const pt=data.p[i*NC+j];if(pt>0)loss-=pt*(f.lg[j]-mx-Math.log(Z));dl[j]=(p[j]/Z-pt)/n}}
    else{const yi=data.y[i];loss+=-(f.lg[yi]-mx-Math.log(Z));for(let j=0;j<NC;j++)dl[j]=(p[j]/Z-(j===yi?1:0))/n}
    if(g('Wh'))for(let j=0;j<NC;j++){for(let c=0;c<D;c++)G.Wh[j*D+c]+=dl[j]*f.h2[c];G.bh[j]+=dl[j]}
    const dh2=new Float64Array(D);for(let j=0;j<NC;j++)for(let c=0;c<D;c++)dh2[c]+=P.Wh[j*D+c]*dl[j];
    const dh1=new Float64Array(dh2);if(g('W2'))for(let c=0;c<D;c++)for(let j=0;j<DFF;j++)G.W2[c*DFF+j]+=dh2[c]*f.z[j];if(g('b2'))for(let c=0;c<D;c++)G.b2[c]+=dh2[c];
    const du=new Float64Array(DFF);for(let j=0;j<DFF;j++){if(f.u[j]<=0)continue;let s=0;for(let c=0;c<D;c++)s+=W.W2[c*DFF+j]*dh2[c];du[j]=s}
    if(g('W1'))for(let j=0;j<DFF;j++){if(du[j]===0)continue;for(let c=0;c<D;c++)G.W1[j*D+c]+=du[j]*f.h1[c]}if(g('b1'))for(let j=0;j<DFF;j++)G.b1[j]+=du[j];
    for(let j=0;j<DFF;j++){if(du[j]===0)continue;for(let c=0;c<D;c++)dh1[c]+=W.W1[j*D+c]*du[j]}
    const attn=g('Wq')||g('Wk')||g('Wv')||g('Wo')||full;if(!attn)continue;
    if(g('Wo'))for(let a=0;a<D;a++)for(let c=0;c<D;c++)G.Wo[a*D+c]+=dh1[a]*f.o[c];
    const dO=new Float64Array(D);for(let a=0;a<D;a++)for(let c=0;c<D;c++)dO[c]+=W.Wo[a*D+c]*dh1[a];
    const dq=new Float64Array(D),dK=new Float64Array((NT-1)*D),dV=new Float64Array((NT-1)*D);
    for(let h=0;h<NH;h++){const da=new Float64Array(NT-1);let sa=0;for(let t=0;t<NT-1;t++){let s=0;for(let c=0;c<DH;c++)s+=dO[h*DH+c]*f.Vv[t*D+h*DH+c];da[t]=s;sa+=s*f.a[h*(NT-1)+t]}
      for(let t=0;t<NT-1;t++){const at=f.a[h*(NT-1)+t];for(let c=0;c<DH;c++)dV[t*D+h*DH+c]=at*dO[h*DH+c];const ds=at*(da[t]-sa)*sc;
        for(let c=0;c<DH;c++){dq[h*DH+c]+=ds*f.K[t*D+h*DH+c];dK[t*D+h*DH+c]=ds*f.q[h*DH+c]}}}
    if(g('Wq'))for(let a=0;a<D;a++)for(let c=0;c<D;c++)G.Wq[a*D+c]+=dq[a]*f.H[c];
    if(g('Wk')||g('Wv'))for(let t=1;t<NT;t++)for(let a=0;a<D;a++){const k1=dK[(t-1)*D+a],v1=dV[(t-1)*D+a];for(let c=0;c<D;c++){const h=f.H[t*D+c];if(G.Wk)G.Wk[a*D+c]+=k1*h;if(G.Wv)G.Wv[a*D+c]+=v1*h}}
    if(full){const dH=new Float64Array(NT*D);for(let c=0;c<D;c++)dH[c]=dh1[c];
      for(let a=0;a<D;a++)for(let c=0;c<D;c++)dH[c]+=W.Wq[a*D+c]*dq[a];
      for(let t=1;t<NT;t++)for(let a=0;a<D;a++){const k1=dK[(t-1)*D+a],v1=dV[(t-1)*D+a];if(k1===0&&v1===0)continue;for(let c=0;c<D;c++)dH[t*D+c]+=W.Wk[a*D+c]*k1+W.Wv[a*D+c]*v1}
      for(let t=0;t<NT;t++){const tk=data.X[i*NT+t];for(let c=0;c<D;c++){G.E[tk*D+c]+=dH[t*D+c];G.P[t*D+c]+=dH[t*D+c]}}}}
  return {loss:loss/n,G}}
// a run: {P (base, frozen unless full), lora: {name:{A,B,r,s}}, state for Adam}; step() does one update
function makeRun(base,o){const R=rng(o.seed==null?1:o.seed);const run={full:o.method==='ft',step:0,steps:o.steps,lr:o.lr,batch:o.batch||64,teach:o.teach,base,R,dataR:rng(7919*(o.seed==null?1:o.seed)+13),curve:[]};
  if(run.full){run.P=cloneP(base);run.params=NAMES.map(k=>({k,w:run.P[k]}))}
  else{run.P=base;run.lora={};run.params=[];const s=o.scaling==='sqrt'?o.alpha/Math.sqrt(o.r):o.alpha/o.r;
    o.targets.forEach(k=>{const [out,inn]=SHAPES[k];const A=new Float64Array(o.r*inn),B=new Float64Array(out*o.r);for(let j=0;j<A.length;j++)A[j]=R.gauss()/Math.sqrt(inn);
      run.lora[k]={A,B,r:o.r,s};run.params.push({k,ab:'A',w:A},{k,ab:'B',w:B})})}
  run.params.forEach(p=>{p.m=new Float64Array(p.w.length);p.v=new Float64Array(p.w.length)});
  run.trainable=run.params.reduce((a,p)=>a+p.w.length,0);return run}
function lrAt(st,steps,lr,warm){return st<warm?lr*(st+1)/warm:lr*Math.max(0,(steps-st)/Math.max(1,steps-warm))}
function trainStep(run,batchData){const data=batchData||gen(run.base,run.teach,run.batch,run.dataR,false);const {loss,G}=grads(run.P,run.lora,data,run.full);
  const lr=lrAt(run.step,run.steps,run.lr,50),t=run.step+1,b1=0.9,b2=0.999,eps=1e-8,bc1=1-Math.pow(b1,t),bc2=1-Math.pow(b2,t);
  const gr={};if(!run.full)for(const k in run.lora){const {A,B,r,s}=run.lora[k];const [o,i]=SHAPES[k];const g=G[k];const dA=new Float64Array(r*i),dB=new Float64Array(o*r);
    for(let a=0;a<o;a++)for(let q=0;q<r;q++){let sb=0;for(let c=0;c<i;c++)sb+=g[a*i+c]*A[q*i+c];dB[a*r+q]=s*sb}
    for(let q=0;q<r;q++)for(let c=0;c<i;c++){let sa=0;for(let a=0;a<o;a++)sa+=B[a*r+q]*g[a*i+c];dA[q*i+c]=s*sa}gr[k+'A']=dA;gr[k+'B']=dB}
  run.params.forEach(p=>{const g=run.full?G[p.k]:gr[p.k+p.ab];for(let j=0;j<p.w.length;j++){p.m[j]=b1*p.m[j]+(1-b1)*g[j];p.v[j]=b2*p.v[j]+(1-b2)*g[j]*g[j];
    p.w[j]-=(lr/bc1)*p.m[j]/(Math.sqrt(p.v[j])/Math.sqrt(bc2)+eps)}});
  run.step++;run.curve.push([run.step-1,loss]);return loss}
function deltaW(run,k){const [o,i]=SHAPES[k];if(run.full){return null}const {A,B,r,s}=run.lora[k];const d=new Float64Array(o*i);
  for(let a=0;a<o;a++)for(let q=0;q<r;q++){const b=s*B[a*r+q];for(let c=0;c<i;c++)d[a*i+c]+=b*A[q*i+c]}return d}
// one-sided Jacobi SVD of an m x n row-major matrix: {U (m x k), S, V (n x k)}, k = min(m,n), sorted
function svd(M,m,n){const tr=m<n;if(tr){const T=new Float64Array(m*n);for(let a=0;a<m;a++)for(let c=0;c<n;c++)T[c*m+a]=M[a*n+c];const r=svd(T,n,m);return {U:r.V,S:r.S,V:r.U,k:r.k}}
  const A=new Float64Array(M),Vm=new Float64Array(n*n);for(let j=0;j<n;j++)Vm[j*n+j]=1;
  for(let sweep=0;sweep<60;sweep++){let off=0;for(let p=0;p<n-1;p++)for(let q=p+1;q<n;q++){let al=0,be=0,ga=0;for(let a=0;a<m;a++){const x=A[a*n+p],y=A[a*n+q];al+=x*x;be+=y*y;ga+=x*y}
      if(Math.abs(ga)<1e-15*Math.sqrt(al*be)||ga===0)continue;off=Math.max(off,Math.abs(ga)/Math.sqrt(al*be));const ze=(be-al)/(2*ga),t=Math.sign(ze||1)/(Math.abs(ze)+Math.sqrt(1+ze*ze)),c=1/Math.sqrt(1+t*t),s=c*t;
      for(let a=0;a<m;a++){const x=A[a*n+p],y=A[a*n+q];A[a*n+p]=c*x-s*y;A[a*n+q]=s*x+c*y}for(let a=0;a<n;a++){const x=Vm[a*n+p],y=Vm[a*n+q];Vm[a*n+p]=c*x-s*y;Vm[a*n+q]=s*x+c*y}}
    if(off<1e-13)break}
  const S=[];for(let j=0;j<n;j++){let s=0;for(let a=0;a<m;a++)s+=A[a*n+j]*A[a*n+j];S.push([Math.sqrt(s),j])}S.sort((x,y)=>y[0]-x[0]);
  const k=n,U=new Float64Array(m*k),Vo=new Float64Array(n*k),Sv=new Float64Array(k);
  S.forEach(([s,j],r)=>{Sv[r]=s;for(let a=0;a<m;a++)U[a*k+r]=s>1e-300?A[a*n+j]/s:0;for(let a=0;a<n;a++)Vo[a*k+r]=Vm[a*n+j]});return {U,S:Sv,V:Vo,k}}
// paper Eq. 4: phi(i,j) = ||U1_i^T U2_j||_F^2 / min(i,j), columns of the right-singular matrices of A1 and A2
function subspaceSim(U1,k1,U2,k2,n){const C=new Float64Array(k1*k2);for(let a=0;a<k1;a++)for(let b=0;b<k2;b++){let s=0;for(let c=0;c<n;c++)s+=U1[c*k1+a]*U2[c*k2+b];C[a*k2+b]=s*s}
  const out=[];for(let i=1;i<=k1;i++){const row=[];for(let j=1;j<=k2;j++){let s=0;for(let a=0;a<i;a++)for(let b=0;b<j;b++)s+=C[a*k2+b];row.push(s/Math.min(i,j))}out.push(row)}return out}
function rightSV(A,r,n){const s=svd(A,r,n);const k=Math.min(r,n);const U=new Float64Array(n*k);for(let c=0;c<n;c++)for(let j=0;j<k;j++)U[c*k+j]=s.V[c*s.k+j];return {U,k,S:s.S.slice(0,k)}}
const fro=M=>Math.sqrt(M.reduce((a,x)=>a+x*x,0));
// paper section 7.3 / Table 7: ||U^T W V||_F for U, V the top-r singular directions of dW, of W, or random
function projNorm(W,U,Vr,r,ku,kv){let s=0;for(let a=0;a<r;a++)for(let b=0;b<r;b++){let z=0;for(let i=0;i<D;i++){const ui=U[i*ku+a];if(ui===0)continue;for(let j=0;j<D;j++)z+=ui*W[i*D+j]*Vr[j*kv+b]}s+=z*z}return Math.sqrt(s)}
function randOrtho(n,k,R){const M=new Float64Array(n*k);for(let j=0;j<M.length;j++)M[j]=R.gauss();const s=svd(M,n,k);return {U:s.U,k:s.k}}
function amplify(W0,dW,r,R){const sd=svd(dW,D,D),sw=svd(W0,D,D);const ro=randOrtho(D,r,R),ro2=randOrtho(D,r,R);
  return {dWnorm:fro(dW),Wnorm:fro(W0),pd:projNorm(W0,sd.U,sd.V,r,sd.k,sd.k),pw:projNorm(W0,sw.U,sw.V,r,sw.k,sw.k),prand:projNorm(W0,ro.U,ro2.U,r,ro.k,ro2.k),sv:Array.from(sd.S)}}
const api={weightsSplit,V,L,D,NH,DH,DFF,NC,BOS,NT,SHAPES,NAMES,TARGETS,rng,gen,genPre,label,softmax,argmax,loadTeacher,decode24,decode,loadBase,cloneP,eff,fwd,weights,predict,accuracy,grads,makeRun,trainStep,lrAt,deltaW,svd,subspaceSim,rightSV,fro,amplify,size};
root.LORA=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
