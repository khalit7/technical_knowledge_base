// ---- The three write rules of the paper, run exactly as written (Eqs. 7, 16, 24 to 28) on a synthetic conversation ----
// Shared by the page (Simulate the bank tab, Reading tab demos) and by check_sim.py (through node), so the page's numbers
// are checked against an independent NumPy implementation of the same equations.
// Everything is float64. Weights are fixed random maps, as in the paper's training (Sec. 5: the write side gets no gradient).
// Illustrative sizes: d = 32 features, n = 8 tokens per turn; the counts n_P, S, top-k and gamma are the paper's.
(function(){
function rng(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(r){const u1=1-r(),u2=r();return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2)}
function mat(r,rows,cols,sc){const m=new Float64Array(rows*cols);for(let i=0;i<m.length;i++)m[i]=gauss(r)*sc;return m}
// C = A (ra x ca) * B (ca x cb)
function mm(A,B,ra,ca,cb){const C=new Float64Array(ra*cb);for(let i=0;i<ra;i++)for(let k=0;k<ca;k++){const a=A[i*ca+k];if(a===0)continue;const bo=k*cb,co=i*cb;for(let j=0;j<cb;j++)C[co+j]+=a*B[bo+j]}return C}
const fro=m=>{let s=0;for(let i=0;i<m.length;i++)s+=m[i]*m[i];return Math.sqrt(s)};
// rows of an r x c matrix that differ from each other (relative tolerance 1e-9 of the largest row norm)
function distinct(P,r,c){let mx=0;for(let i=0;i<r;i++){let s=0;for(let j=0;j<c;j++)s+=P[i*c+j]**2;mx=Math.max(mx,Math.sqrt(s))}
  const tol=1e-9*(mx||1),reps=[];for(let i=0;i<r;i++){let found=false;for(const q of reps){let s=0;for(let j=0;j<c;j++)s+=(P[i*c+j]-P[q*c+j])**2;if(Math.sqrt(s)<=tol){found=true;break}}if(!found)reps.push(i)}return reps.length}
// spread of the rows around their mean, relative to the bank's norm (0 means every row is the same vector)
function spread(P,r,c){const m=new Float64Array(c);for(let i=0;i<r;i++)for(let j=0;j<c;j++)m[j]+=P[i*c+j]/r;let s=0;for(let i=0;i<r;i++)for(let j=0;j<c;j++)s+=(P[i*c+j]-m[j])**2;const N=fro(P);return N?Math.sqrt(s)/N:0}
// o.snap (attention-coupled rule only): turns after which to keep a copy of the bank in out.snaps[turn]
// o: {rule:'ac'|'hebb'|'slot', scale:1|10, gamma, init:'zero'|'rand', T, d, n, seed, k, zs (scale of the token states)}
function simulate(o){const d=o.d||32,n=o.n||8,T=o.T||600,g=o.gamma==null?0.95:o.gamma,r=rng(o.seed==null?7:o.seed),sd=1/Math.sqrt(d),zs=o.zs==null?1:o.zs;
  const out={rule:o.rule,scale:o.scale,gamma:g,init:o.init,T,d,n};
  const share=new Float64Array(T+1); // share[lag], lag = T - tau for the turn tau (0-based) written lag turns before the end
  if(o.rule==='ac'){const nP=o.scale===10?640:64;out.rows=nP;
    const WQ=mat(r,d,d,sd),WK=mat(r,d,d,sd),WV=mat(r,d,d,sd);
    let P=o.init==='rand'?mat(r,nP,d,0.01):new Float64Array(nP*d);const P0=fro(P);
    const cn=new Float64Array(T);
    for(let t=0;t<T;t++){const Z=mat(r,n,d,zs);const Q=mm(Z,WQ,n,d,d),V=mm(Z,WV,n,d,d),K=mm(P,WK,nP,d,d);
      const A=new Float64Array(n*nP);
      for(let i=0;i<n;i++){let mx=-Infinity;for(let j=0;j<nP;j++){let s=0;for(let c=0;c<d;c++)s+=Q[i*d+c]*K[j*d+c];s*=sd;A[i*nP+j]=s;if(s>mx)mx=s}
        let z=0;for(let j=0;j<nP;j++){const e=Math.exp(A[i*nP+j]-mx);A[i*nP+j]=e;z+=e}for(let j=0;j<nP;j++)A[i*nP+j]/=z}
      // C = A^T V  (nP x d)
      const C=new Float64Array(nP*d);for(let i=0;i<n;i++)for(let j=0;j<nP;j++){const a=A[i*nP+j];for(let c=0;c<d;c++)C[j*d+c]+=a*V[i*d+c]}
      cn[t]=fro(C);for(let x=0;x<P.length;x++)P[x]=g*P[x]+C[x];if(o.snap&&o.snap.indexOf(t+1)>=0){(out.snaps=out.snaps||{})[t+1]={P:P.slice(),distinct:distinct(P,nP,d),spread:spread(P,nP,d)}}}
    const PN=fro(P);for(let t=0;t<T;t++)share[T-t]=Math.pow(g,T-1-t)*cn[t]/PN;
    out.distinct=distinct(P,nP,d);out.spread=spread(P,nP,d);out.bankNorm=PN;out.initNorm=P0;out.used=nP}
  else if(o.rule==='hebb'){const dh=o.scale===10?13:4;out.rows=dh;out.dh=dh; // the paper's d_h/d = 256/2048 and 810/2048, at d = 32
    const WK=mat(r,d,dh,sd),WV=mat(r,d,dh,sd);
    let M=o.init==='rand'?mat(r,dh,dh,0.01):new Float64Array(dh*dh);
    const un=new Float64Array(T),lc=new Float64Array(T);let L=0,clipN=0;
    for(let t=0;t<T;t++){const Z=mat(r,n,d,zs);const Kh=mm(Z,WK,n,d,dh),Vh=mm(Z,WV,n,d,dh);
      const U=new Float64Array(dh*dh);for(let i=0;i<n;i++)for(let a=0;a<dh;a++){const k=Kh[i*dh+a]/n;for(let b=0;b<dh;b++)U[a*dh+b]+=k*Vh[i*dh+b]}
      un[t]=fro(U);for(let x=0;x<M.length;x++)M[x]=g*M[x]+U[x];const c=Math.max(fro(M),1);if(c>1)clipN++;for(let x=0;x<M.length;x++)M[x]/=c;L+=Math.log(c);lc[t]=L}
    const MN=fro(M);for(let t=0;t<T;t++){const prev=t>0?lc[t-1]:0;share[T-t]=Math.pow(g,T-1-t)*un[t]*Math.exp(-(L-prev))/MN}
    out.distinct=distinct(M,dh,dh);out.spread=spread(M,dh,dh);out.clipped=clipN;out.bankNorm=MN;out.used=dh}
  else{const S=o.scale===10?640:64,k=o.k||8;out.rows=S;
    const Wa=mat(r,d,d,sd),Wu=mat(r,d,d,sd);
    let P=o.init==='rand'?mat(r,S,d,0.01):new Float64Array(S*d);
    const w=new Float64Array(S*T),unorm=new Float64Array(T),hit=new Uint8Array(S);
    for(let t=0;t<T;t++){const Z=mat(r,n,d,zs);const zb=new Float64Array(d);for(let i=0;i<n;i++)for(let c=0;c<d;c++)zb[c]+=Z[i*d+c]/n;
      const q=mm(zb,Wa,1,d,d),u=mm(zb,Wu,1,d,d);unorm[t]=fro(u);
      const sc=new Float64Array(S);let mx=-Infinity;for(let s=0;s<S;s++){let v=0;for(let c=0;c<d;c++)v+=q[c]*P[s*d+c];v*=sd;sc[s]=v;if(v>mx)mx=v}
      // softmax is monotone, so top-k of a_t is top-k of the scores; ties go to the lower slot index
      const idx=Array.from({length:S},(_,i)=>i).sort((x,y)=>sc[y]-sc[x]||x-y).slice(0,k);
      for(const s of idx){hit[s]=1;for(let c=0;c<d;c++)P[s*d+c]=g*P[s*d+c]+(1-g)*u[c];const o2=s*T;for(let tt=0;tt<t;tt++)w[o2+tt]*=g;w[o2+t]=1-g}}
    const PN=fro(P);for(let t=0;t<T;t++){let s2=0;for(let s=0;s<S;s++)s2+=w[s*T+t]**2;share[T-t]=unorm[t]*Math.sqrt(s2)/PN}
    out.distinct=distinct(P,S,d);out.spread=spread(P,S,d);out.bankNorm=PN;out.used=hit.reduce((a,b)=>a+b,0)}
  out.share=share;return out}
// mean share inside the paper's lag buckets [0,32) [32,64) [64,128) [128,256) [256,T]
const BUCKETS=[[1,31],[32,63],[64,127],[128,255],[256,1e9]];
function bucketMeans(sh){const T=sh.length-1;return BUCKETS.map(([a,b])=>{let s=0,c=0;for(let l=a;l<=Math.min(b,T);l++){s+=sh[l];c++}return c?s/c:0})}
const api={simulate,bucketMeans,BUCKETS,rng,gauss};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.SIM=api;
})();
