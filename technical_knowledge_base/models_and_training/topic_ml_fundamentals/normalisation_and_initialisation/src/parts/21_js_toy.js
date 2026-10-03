// ---- Shared maths: seeded random numbers and the norm-placement toy (Xiong et al. 2020's simplified Transformer) ----
// Also loaded by checks/run_toy.mjs under node, so it only touches globalThis.
(function(G){
  // mulberry32 uniform in [0,1) and Box-Muller normals; checks/toy_ref.py re-implements both bit for bit
  function rng(seed){let a=seed>>>0;
    const u=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
    const nrm=()=>{const u1=1-u(),u2=u();return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2)};
    return {u,nrm};}
  function fill(r,len,std){const a=new Float64Array(len);for(let i=0;i<len;i++)a[i]=r.nrm()*std;return a}
  // C(n x m) = A(n x k) B(k x m)
  function mm(A,B,n,k,m){const C=new Float64Array(n*m);for(let i=0;i<n;i++){const ci=i*m;for(let p=0;p<k;p++){const a=A[i*k+p];if(a===0)continue;const bp=p*m;for(let j=0;j<m;j++)C[ci+j]+=a*B[bp+j]}}return C}
  // C(k x m) = A(n x k)^T B(n x m)
  function mtm(A,B,n,k,m){const C=new Float64Array(k*m);for(let i=0;i<n;i++){const bi=i*m;for(let p=0;p<k;p++){const a=A[i*k+p];if(a===0)continue;const cp=p*m;for(let j=0;j<m;j++)C[cp+j]+=a*B[bi+j]}}return C}
  // C(n x k) = A(n x m) B(k x m)^T
  function mmt(A,B,n,m,k){const C=new Float64Array(n*k);for(let i=0;i<n;i++)for(let p=0;p<k;p++){let s=0;for(let j=0;j<m;j++)s+=A[i*m+j]*B[p*m+j];C[i*k+p]=s}return C}
  const EPS=1e-5;
  function ln(x,n,d){const y=new Float64Array(n*d),inv=new Float64Array(n);
    for(let i=0;i<n;i++){let mu=0;for(let j=0;j<d;j++)mu+=x[i*d+j];mu/=d;let v=0;for(let j=0;j<d;j++){const t=x[i*d+j]-mu;v+=t*t}v/=d;const s=1/Math.sqrt(v+EPS);inv[i]=s;for(let j=0;j<d;j++)y[i*d+j]=(x[i*d+j]-mu)*s}
    return {y,inv}}
  function lnBack(c,dy,n,d){const dx=new Float64Array(n*d);
    for(let i=0;i<n;i++){let m1=0,m2=0;for(let j=0;j<d;j++){m1+=dy[i*d+j];m2+=dy[i*d+j]*c.y[i*d+j]}m1/=d;m2/=d;
      for(let j=0;j<d;j++)dx[i*d+j]=c.inv[i]*(dy[i*d+j]-m1-c.y[i*d+j]*m2)}return dx}
  const add=(a,b,s)=>{const o=new Float64Array(a.length);for(let i=0;i<a.length;i++)o[i]=(s===undefined?a[i]:s*a[i])+b[i];return o};
  const rms=x=>{let s=0;for(let i=0;i<x.length;i++)s+=x[i]*x[i];return Math.sqrt(s/x.length)};
  const fro=x=>{let s=0;for(let i=0;i<x.length;i++)s+=x[i]*x[i];return Math.sqrt(s)};
  // attention with W_Q = W_K = 0: uniform weights, every position gets mean(h) W_V
  function attF(h,WV,n,d){const m=new Float64Array(d);for(let i=0;i<n;i++)for(let j=0;j<d;j++)m[j]+=h[i*d+j]/n;
    const o1=mm(m,WV,1,d,d),out=new Float64Array(n*d);for(let i=0;i<n;i++)out.set(o1,i*d);return {out,m}}
  function attB(c,WV,dout,n,d){const g=new Float64Array(d);for(let i=0;i<n;i++)for(let j=0;j<d;j++)g[j]+=dout[i*d+j];
    const dW=mtm(c.m,g,1,d,d),dm=mmt(g,WV,1,d,d),dh=new Float64Array(n*d);for(let i=0;i<n;i++)for(let j=0;j<d;j++)dh[i*d+j]=dm[j]/n;return {dh,dW}}
  function ffnF(h,W1,W2,n,d){const z=mm(h,W1,n,d,d),a=new Float64Array(z.length);for(let i=0;i<z.length;i++)a[i]=z[i]>0?z[i]:0;return {out:mm(a,W2,n,d,d),z,a,h}}
  function ffnB(c,W1,W2,dout,n,d){const dW2=mtm(c.a,dout,n,d,d),da=mmt(dout,W2,n,d,d);for(let i=0;i<da.length;i++)if(c.z[i]<=0)da[i]=0;
    const dW1=mtm(c.h,da,n,d,d),dh=mmt(da,W1,n,d,d);return {dh,dW1,dW2}}
  // placements: post LN(a*x + B(x)); pre x + B(LN x); peri x + LN(B(LN x)); out x + LN(B(x)); none x + B(x); deep = post with DeepNorm's alpha, beta
  function toy(o){
    const P=o.place,L=o.L,d=o.d||64,n=o.n||16,K=o.K||10,r=rng(o.seed||1);
    const deep=P==='deep',post=P==='post'||deep;
    const alpha=deep?Math.pow(2*L,0.25):1;
    let beta=1;if(deep)beta=Math.pow(8*L,-0.25);else if(o.init==='gpt2')beta=1/Math.sqrt(2*L);
    const sd=Math.sqrt(2/(d+d));
    const X0=fill(r,n*d,1);const Ws=[];
    for(let l=0;l<L;l++)Ws.push({V:fill(r,d*d,sd*beta),W1:fill(r,d*d,sd),W2:fill(r,d*d,sd*beta)});
    const Wo=fill(r,d*K,Math.sqrt(2/(d+K)));const lab=[];for(let i=0;i<n;i++)lab.push(Math.min(K-1,Math.floor(r.u()*K)));
    // forward
    let x=X0;const tape=[],st=[rms(x)],sum=[];
    function sub(x,kind,W){const c={};
      if(post){const b=kind==='a'?attF(x,W.V,n,d):ffnF(x,W.W1,W.W2,n,d);c.b=b;const s=add(x,b.out,alpha);c.sumRms=rms(s);c.ln=ln(s,n,d);return {x:c.ln.y,c}}
      let h=x;if(P==='pre'||P==='peri'){c.lnIn=ln(x,n,d);h=c.lnIn.y}
      const b=kind==='a'?attF(h,W.V,n,d):ffnF(h,W.W1,W.W2,n,d);c.b=b;let o2=b.out;
      if(P==='peri'||P==='out'){c.lnOut=ln(o2,n,d);o2=c.lnOut.y}
      return {x:add(x,o2),c}}
    for(let l=0;l<L;l++){const A=sub(x,'a',Ws[l]);const F=sub(A.x,'f',Ws[l]);x=F.x;tape.push({a:A.c,f:F.c});st.push(rms(x));sum.push(post?F.c.sumRms:null)}
    let y=x,fin=null;if(P==='pre'||P==='peri'||P==='out'){fin=ln(x,n,d);y=fin.y}
    const lg=mm(y,Wo,n,d,K);let loss=0;const dl=new Float64Array(n*K);
    for(let i=0;i<n;i++){let mx=-1e300;for(let k=0;k<K;k++)mx=Math.max(mx,lg[i*K+k]);let se=0;for(let k=0;k<K;k++)se+=Math.exp(lg[i*K+k]-mx);
      for(let k=0;k<K;k++){const p=Math.exp(lg[i*K+k]-mx)/se;dl[i*K+k]=(p-(k===lab[i]?1:0))/n}loss+=(Math.log(se)+mx-lg[i*K+lab[i]])/n}
    // backward
    let dx=mmt(dl,Wo,n,K,d);if(fin)dx=lnBack(fin,dx,n,d);
    const g2=new Array(L),gV=new Array(L),g1=new Array(L);
    function subB(c,kind,W,dout){let dxo;let dbo;
      if(post){const ds=lnBack(c.ln,dout,n,d);dbo=ds;dxo=new Float64Array(ds.length);for(let i=0;i<ds.length;i++)dxo[i]=alpha*ds[i]}
      else{dxo=dout;dbo=dout;if(c.lnOut)dbo=lnBack(c.lnOut,dout,n,d)}
      let dh,gr;
      if(kind==='a'){const r2=attB(c.b,W.V,dbo,n,d);dh=r2.dh;gr={V:r2.dW}}else{const r2=ffnB(c.b,W.W1,W.W2,dbo,n,d);dh=r2.dh;gr={W1:r2.dW1,W2:r2.dW2}}
      if(c.lnIn)dh=lnBack(c.lnIn,dh,n,d);
      return {dx:add(dxo,dh),gr}}
    for(let l=L-1;l>=0;l--){const F=subB(tape[l].f,'f',Ws[l],dx);g2[l]=fro(F.gr.W2);g1[l]=fro(F.gr.W1);const A=subB(tape[l].a,'a',Ws[l],F.dx);gV[l]=fro(A.gr.V);dx=A.dx}
    return {stream:st,sum,g2,g1,gV,loss,alpha,beta}}
  G.NI=G.NI||{};Object.assign(G.NI,{rng,toy,ln,rms});
})(typeof window!=='undefined'?window:globalThis);
