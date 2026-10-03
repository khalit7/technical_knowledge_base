// ---- Shared maths: the five normalisations on one tensor, and BatchNorm's running statistics ----
// Also loaded by checks/run_norms.mjs under node (after 21_js_toy.js), so it only touches globalThis.
// Every function here is checked against torch.nn (BatchNorm1d/2d, LayerNorm, RMSNorm, GroupNorm, InstanceNorm2d) by checks/norms_ref.py.
(function(G){
  const NI=G.NI;const EPS=1e-5;
  // Example tensors. Image: N x C x H x W = 4 x 6 x 2 x 2. Tokens: B x T x D = 3 x 4 x 6.
  // Each channel (feature) gets its own offset and scale, each example its own scale, so every norm has something to remove.
  const IMG={N:4,C:6,H:2,W:2},TOK={B:3,T:4,D:6};
  const chOff=[2,-1,0,4,-3,1],chSc=[1,0.5,2,1.5,0.8,3],exSc=[1,2.5,0.6,1.6];
  function makeImage(seed){const r=NI.rng(seed||3),{N,C,H,W}=IMG,x=new Float64Array(N*C*H*W);
    for(let n=0;n<N;n++)for(let c=0;c<C;c++)for(let k=0;k<H*W;k++)x[(n*C+c)*H*W+k]=exSc[n]*(chOff[c]+chSc[c]*r.nrm());return x}
  function makeTokens(seed){const r=NI.rng(seed||5),{B,T,D}=TOK,x=new Float64Array(B*T*D);
    for(let b=0;b<B;b++)for(let t=0;t<T;t++)for(let d=0;d<D;d++)x[(b*T+t)*D+d]=exSc[b]*(chOff[d]+chSc[d]*r.nrm());return x}
  // group id of every element: the set it shares one mean and one variance with
  function groupOf(layout,kind,G2){
    if(layout==='img'){const {N,C,H,W}=IMG,g=G2||3,per=C/g;
      return i=>{const n=Math.floor(i/(C*H*W)),c=Math.floor(i/(H*W))%C;
        if(kind==='bn')return c;if(kind==='ln'||kind==='rms')return n;if(kind==='in')return n*C+c;if(kind==='gn')return n*g+Math.floor(c/per);throw new Error(kind)}}
    const {B,T,D}=TOK;
    return i=>{const d=i%D,bt=Math.floor(i/D);
      if(kind==='bn')return d;if(kind==='ln'||kind==='rms')return bt;throw new Error(kind)}}
  // normalise x; returns {y, gid (per element), mu, v (biased variance, or mean square for RMSNorm) per group, count per group}
  function normalise(x,layout,kind,G2){
    const gf=groupOf(layout,kind,G2),gid=new Int32Array(x.length);let ng=0;
    for(let i=0;i<x.length;i++){gid[i]=gf(i);ng=Math.max(ng,gid[i]+1)}
    const s=new Float64Array(ng),cnt=new Float64Array(ng),mu=new Float64Array(ng),v=new Float64Array(ng);
    for(let i=0;i<x.length;i++){s[gid[i]]+=x[i];cnt[gid[i]]++}
    const centre=kind!=='rms';
    for(let g=0;g<ng;g++)mu[g]=centre?s[g]/cnt[g]:0;
    for(let i=0;i<x.length;i++){const t=x[i]-mu[gid[i]];v[gid[i]]+=t*t}
    for(let g=0;g<ng;g++)v[g]/=cnt[g];
    const y=new Float64Array(x.length);for(let i=0;i<x.length;i++)y[i]=(x[i]-mu[gid[i]])/Math.sqrt(v[gid[i]]+EPS);
    return {y,gid,mu,v,cnt,ng}}
  // BatchNorm on a batch of B examples x D features (row-major), PyTorch conventions:
  // normalise with the biased batch variance; update running stats with the unbiased one; momentum m: run = (1 - m) run + m batch
  function bnTrain(x,B,D,run,m){const mu=new Float64Array(D),v=new Float64Array(D),y=new Float64Array(B*D);
    for(let b=0;b<B;b++)for(let d=0;d<D;d++)mu[d]+=x[b*D+d]/B;
    for(let b=0;b<B;b++)for(let d=0;d<D;d++){const t=x[b*D+d]-mu[d];v[d]+=t*t/B}
    for(let b=0;b<B;b++)for(let d=0;d<D;d++)y[b*D+d]=(x[b*D+d]-mu[d])/Math.sqrt(v[d]+EPS);
    const nr={m:new Float64Array(D),v:new Float64Array(D)};
    for(let d=0;d<D;d++){nr.m[d]=(1-m)*run.m[d]+m*mu[d];nr.v[d]=(1-m)*run.v[d]+m*v[d]*B/(B-1)}
    return {y,mu,v,run:nr}}
  function bnEval(x,B,D,run){const y=new Float64Array(B*D);for(let b=0;b<B;b++)for(let d=0;d<D;d++)y[b*D+d]=(x[b*D+d]-run.m[d])/Math.sqrt(run.v[d]+EPS);return y}
  function lnRows(x,B,D){const y=new Float64Array(B*D),mu=new Float64Array(B),v=new Float64Array(B);
    for(let b=0;b<B;b++){let s=0;for(let d=0;d<D;d++)s+=x[b*D+d];mu[b]=s/D;let q=0;for(let d=0;d<D;d++){const t=x[b*D+d]-mu[b];q+=t*t}v[b]=q/D;
      for(let d=0;d<D;d++)y[b*D+d]=(x[b*D+d]-mu[b])/Math.sqrt(v[b]+EPS)}return {y,mu,v}}
  // The BatchNorm stream: features with their own true means and spreads; batches drawn from one seeded generator.
  const BNF={D:4,mean:[5,-1,0,2],sd:[2,0.5,3,1]};
  function bnStream(seed,B,nb,shift){const r=NI.rng(seed),out=[];
    for(let k=0;k<nb;k++){const x=new Float64Array(B*BNF.D);for(let b=0;b<B;b++)for(let d=0;d<BNF.D;d++)x[b*BNF.D+d]=BNF.mean[d]+BNF.sd[d]*r.nrm()+(shift||0);out.push(x)}
    return out}
  NI.IMG=IMG;NI.TOK=TOK;NI.BNF=BNF;NI.EPS=EPS;
  Object.assign(NI,{makeImage,makeTokens,normalise,bnTrain,bnEval,lnRows,bnStream});
})(typeof window!=='undefined'?window:globalThis);
