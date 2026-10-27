// ---- The toy decoder's forward pass in plain JavaScript (mirrors train.py; checked by check_forward.py) ----
// Reads window.BTW (20_model_data.js). BT.run(variant, prompt ids) -> both prompt passes, the mixed K/V, the answer.
(function(g){
  const W=g.BTW;if(!W)return;
  const {d,h,L,dff}=W.cfg,dk=d/h,V=W.vocab.length,IDX={};W.vocab.forEach((w,i)=>IDX[w]=i);
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',CI={};for(let i=0;i<64;i++)CI[B64[i]]=i;
  // 6-bit weights, one character each, with a per-row scale (also one character): value = (c - 32) * rowmax / 31
  function deq(o){const [R0,C0]=o.shape,[r,c]=o.t?[C0,R0]:[R0,C0],a=new Float64Array(R0*C0);let k=0;for(let i=0;i<r;i++){const s=o.mx*2**(-CI[o.s[i]]/8)/31;for(let j=0;j<c;j++){const v=(CI[o.q[k++]]-32)*s;if(o.t)a[j*C0+i]=v;else a[i*c+j]=v}}return a}
  const vec=o=>Float64Array.from(o.v);
  function tensors(src){const P={};for(const n in src){const o=src[n];P[n]=o.q?deq(o):vec(o)}return P}
  const BASE=tensors(W.base),cache={};
  function load(name){if(cache[name])return cache[name];const v=W.variants[name];if(!v)throw new Error('no variant '+name);
    const ad={};for(const a in v.adapters)ad[a]=tensors(v.adapters[a]);return cache[name]={name,meth:v.meth,ad,alpha:v.alpha}}
  const LINS=['q','k','v','o','f1','f2'],DIM={q:[d,d],k:[d,d],v:[d,d],o:[d,d],f1:[dff,d],f2:[d,dff]};
  // y = W x + b + B (A x): the base weight plus the active LoRA adapter (train.py's Lin, scale 1)
  function lin(x,l,n,A){const [out,inn]=DIM[n],Wm=BASE['b'+l+'.'+n+'.w'],b=BASE['b'+l+'.'+n+'.b'],y=new Float64Array(out);
    for(let i=0;i<out;i++){let s=b[i];const o=i*inn;for(let j=0;j<inn;j++)s+=Wm[o+j]*x[j];y[i]=s}
    if(A){const a=A['b'+l+'.'+n+'.A'],B=A['b'+l+'.'+n+'.B'],r=a.length/inn,t=new Float64Array(r);
      for(let k=0;k<r;k++){let s=0;for(let j=0;j<inn;j++)s+=a[k*inn+j]*x[j];t[k]=s}
      for(let i=0;i<out;i++){let s=0;for(let k=0;k<r;k++)s+=B[i*r+k]*t[k];y[i]+=s}}
    return y}
  function lnorm(x,gm,bt){let m=0;for(const v of x)m+=v;m/=x.length;let q=0;for(const v of x)q+=(v-m)*(v-m);q/=x.length;const r=1/Math.sqrt(q+1e-5),y=new Float64Array(x.length);for(let i=0;i<x.length;i++)y[i]=(x[i]-m)*r*gm[i]+bt[i];return y}
  // erf to about 1e-12 (series for small x, continued fraction otherwise) so GELU matches PyTorch's exact GELU
  function erf(x){const s=x<0?-1:1;x=Math.abs(x);if(x<2.5){let t=x,sum=x,n=0;while(Math.abs(t)>1e-17*Math.abs(sum)&&n<200){n++;t*=-x*x/n;sum+=t/(2*n+1)}return s*2/Math.sqrt(Math.PI)*sum}
    let f=0;for(let k=60;k>=1;k--)f=k/2/(x+f);return s*(1-Math.exp(-x*x)/Math.sqrt(Math.PI)/(x+f))}
  const gelu=v=>0.5*v*(1+erf(v/Math.SQRT2));
  function embed(ids,pos){const E=BASE.emb,Pp=BASE.pos;return ids.map((id,t)=>{const x=new Float64Array(d);for(let j=0;j<d;j++)x[j]=E[id*d+j]+Pp[pos[t]*d+j];return x})}
  // one pass: X tokens at positions pos; past = [{K,V} per block] seen first; allow(i, j) over past+current keys
  function pass(ids,pos,allow,A,past){let X=embed(ids,pos);const kv=[],att=[];
    for(let l=0;l<L;l++){const p='b'+l+'.',Z=X.map(x=>lnorm(x,BASE[p+'n1.w'],BASE[p+'n1.b']));
      const Q=Z.map(z=>lin(z,l,'q',A)),K=Z.map(z=>lin(z,l,'k',A)),Vv=Z.map(z=>lin(z,l,'v',A));kv.push({K,V:Vv});
      const KK=past?past[l].K.concat(K):K,VV=past?past[l].V.concat(Vv):Vv,heads=[];
      const cat=X.map(()=>new Float64Array(d));
      for(let hh=0;hh<h;hh++){const o=hh*dk,Am=[];
        for(let i=0;i<X.length;i++){const lg=new Float64Array(KK.length);let mx=-Infinity;
          for(let j=0;j<KK.length;j++){if(!allow(i,j)){lg[j]=-Infinity;continue}let s=0;for(let k=0;k<dk;k++)s+=Q[i][o+k]*KK[j][o+k];lg[j]=s/Math.sqrt(dk);if(lg[j]>mx)mx=lg[j]}
          let z=0;for(let j=0;j<KK.length;j++){lg[j]=lg[j]===-Infinity?0:Math.exp(lg[j]-mx);z+=lg[j]}
          for(let j=0;j<KK.length;j++){lg[j]/=z;const a=lg[j];if(a)for(let k=0;k<dk;k++)cat[i][o+k]+=a*VV[j][o+k]}Am.push(lg)}
        heads.push(Am)}
      att.push(heads);
      X=X.map((x,i)=>{const y=lin(cat[i],l,'o',A),r=new Float64Array(d);for(let j=0;j<d;j++)r[j]=x[j]+y[j];return r});
      X=X.map(x=>{const z=lnorm(x,BASE[p+'n2.w'],BASE[p+'n2.b']),hd=lin(z,l,'f1',A).map(gelu),y=lin(hd,l,'f2',A),r=new Float64Array(d);for(let j=0;j<d;j++)r[j]=x[j]+y[j];return r})}
    const E=BASE.emb,logits=X.map(x=>{const z=lnorm(x,BASE['nf.w'],BASE['nf.b']),o=new Float64Array(V);for(let v=0;v<V;v++){let s=0;for(let j=0;j<d;j++)s+=z[j]*E[v*d+j];o[v]=s}return o});
    return {kv,att,logits}}
  const MASK={causal:(i,j)=>j<=i,bidir:()=>true,anti:(i,j)=>j>=i};
  const softmax=l=>{let m=-Infinity;for(const v of l)if(v>m)m=v;const e=Array.from(l,v=>Math.exp(v-m)),z=e.reduce((a,b)=>a+b,0);return e.map(v=>v/z)};
  // the whole Bitune inference of Algorithm 1 for one prompt: passes, mixing (Eqs. 6 to 8), the answer token, then <eos>
  function run(name,prompt){const M=load(name),T=prompt.length,pos=prompt.map((_,i)=>i),passes=[];
    M.meth.passes.forEach(([mk,ad])=>passes.push({mask:mk,adapter:ad,...pass(prompt,pos,MASK[mk],M.ad[ad])}));
    let kv=passes[0].kv;
    if(passes.length===2){const [ak,av]=M.alpha;kv=passes[0].kv.map((c,l)=>{const b=passes[1].kv[l];
      return {K:c.K.map((r,i)=>r.map((x,j)=>x*(1-ak[l])+b.K[i][j]*ak[l])),V:c.V.map((r,i)=>r.map((x,j)=>x*(1-av[l])+b.V[i][j]*av[l]))}})}
    const ans=[IDX[':']],steps=[];
    for(let s=0;s<2;s++){const P=pass(ans,ans.map((_,i)=>T+i),(i,j)=>j<T+i+1,M.ad['default'],kv),lg=P.logits[P.logits.length-1];
      const pr=softmax(lg);let bi=0;
      if(s===0){for(let v=W.p0;v<W.c0;v++)if(bi<W.p0||lg[v]>lg[bi])bi=v}else{for(let v=0;v<V;v++)if(lg[v]>lg[bi])bi=v}
      steps.push({tok:bi,probs:pr,att:P.att,logits:lg});ans.push(bi)}
    return {prompt,passes,kv,steps,answer:steps[0].tok,alpha:M.alpha}}
  g.BT={run,load,vocab:W.vocab,IDX,cfg:W.cfg,variants:W.variants,p0:W.p0,c0:W.c0,member:(c,p)=>W.table[c][p]==='1',softmax};
})(typeof window!=='undefined'?window:globalThis);
