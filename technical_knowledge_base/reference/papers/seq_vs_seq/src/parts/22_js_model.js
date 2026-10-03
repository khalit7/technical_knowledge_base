// ---- The toy Ettin models' forward pass in plain JavaScript (mirrors train.py; checked against PyTorch by check_forward.py) ----
// Reads window.EW (20_model_data.js). EM.load(name) -> model; EM.hidden(M, ids, causal) -> {X, att};
// EM.next(M, ids) -> next-token distribution read the way that kind of model is used; EM.generate(M, ids, n) -> steps.
(function(g){
  const W=g.EW;if(!W)return;
  const V=W.vocab.length,IDX={};W.vocab.forEach((w,i)=>IDX[w]=i);
  const PAD=0,BOS=1,EOS=2,MASK=3;
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',CI={};for(let i=0;i<64;i++)CI[B64[i]]=i;
  function half(u){const s=u>>15?-1:1,e=(u>>10)&31,f=u&1023;return e===0?s*f*2**-24:e===31?(f?NaN:s*Infinity):s*(1+f/1024)*2**(e-15)}
  function f16(b64){const bin=atob(b64),n=bin.length>>1,o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=half(bin.charCodeAt(2*i)|bin.charCodeAt(2*i+1)<<8);return o}
  // tensor names and shapes in train.py's tensor_order
  function order(c){const {d,L,I}=c,t=[['tok',V,d],['en',d]];
    for(let i=0;i<L;i++){const p='b'+i+'.';if(i>0)t.push([p+'n1',d]);t.push([p+'qkv',3*d,d],[p+'o',d,d],[p+'n2',d],[p+'wi',2*I,d],[p+'wo',d,I])}
    t.push(['fn',d],['hd',d,d],['hn',d],['hb',V]);return t}
  const cache={};
  function load(name){if(cache[name])return cache[name];const v=W.models[name];if(!v)throw new Error('no model '+name);const c=W.cfg[v.size],P={};let mi=0,ri=0,vi=0,ti=0;const vec=f16(v.v);
    order(c).forEach(([n,r,cc])=>{if(cc){const a=new Float32Array(r*cc),tm=v.tmax[ti++];for(let i=0;i<r;i++){const s=tm*2**(-CI[v.s[ri++]]/8)/31;for(let j=0;j<cc;j++)a[i*cc+j]=(CI[v.m[mi++]]-32)*s}P[n]=a}
      else{P[n]=vec.subarray(vi,vi+r);vi+=r}});
    if(mi!==v.m.length||vi!==vec.length)throw new Error('weights for '+name+' do not match the configuration');
    return cache[name]={name,kind:v.kind,size:v.size,c,P}}
  function lin(x,Wm,out,inn){const y=new Float64Array(out);for(let i=0;i<out;i++){let s=0;const o=i*inn;for(let j=0;j<inn;j++)s+=x[j]*Wm[o+j];y[i]=s}return y}
  function ln(x,gm){let m=0;for(const v of x)m+=v;m/=x.length;let q=0;for(const v of x)q+=(v-m)*(v-m);q/=x.length;const r=1/Math.sqrt(q+1e-5),y=new Float64Array(x.length);for(let i=0;i<x.length;i++)y[i]=(x[i]-m)*r*gm[i];return y}
  // erf to about 1e-7 (Numerical Recipes erfc, Chebyshev fit), for the exact GELU PyTorch uses by default
  function erf(x){const z=Math.abs(x),t=1/(1+0.5*z);const r=t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(0.37409196+t*(0.09678418+t*(-0.18628806+t*(0.27886807+t*(-1.13520398+t*(1.48851587+t*(-0.82215223+t*0.17087277)))))))));return x>=0?1-r:r-1}
  const gelu=x=>0.5*x*(1+erf(x/Math.SQRT2));
  function rope(v,t,h,dk){const half=dk/2,o=new Float64Array(v.length);for(let k=0;k<h;k++){const b=k*dk;for(let i=0;i<half;i++){const a=t/Math.pow(10000,i/half),c=Math.cos(a),s=Math.sin(a),x1=v[b+i],x2=v[b+half+i];o[b+i]=x1*c-x2*s;o[b+half+i]=x2*c+x1*s}}return o}
  const softmax=l=>{let m=-Infinity;for(const v of l)if(v>m)m=v;const e=Array.from(l,v=>Math.exp(v-m)),z=e.reduce((a,b)=>a+b,0);return e.map(v=>v/z)};
  // the backbone: token embeddings, embedding norm, L pre-norm blocks (no pre-norm on the first), final norm
  function hidden(M,ids,causal){const {d,L,h,I}=M.c,P=M.P,T=ids.length,dk=d/h;
    let X=ids.map(id=>ln(P.tok.subarray(id*d,(id+1)*d),P.en));const att=[];
    for(let l=0;l<L;l++){const p='b'+l+'.';
      const A=l===0?X:X.map(x=>ln(x,P[p+'n1']));
      const QKV=A.map(x=>lin(x,P[p+'qkv'],3*d,d));
      const Q=QKV.map((v,t)=>rope(v.subarray(0,d),t,h,dk)),K=QKV.map((v,t)=>rope(v.subarray(d,2*d),t,h,dk)),Vv=QKV.map(v=>v.subarray(2*d));
      const cat=X.map(()=>new Float64Array(d)),AL=[];
      for(let hh=0;hh<h;hh++){const o=hh*dk,Ah=[];
        for(let i=0;i<T;i++){const lg=new Float64Array(T);let mx=-Infinity;
          for(let j=0;j<T;j++){if(causal&&j>i){lg[j]=-Infinity;continue}let s=0;for(let k=0;k<dk;k++)s+=Q[i][o+k]*K[j][o+k];lg[j]=s/Math.sqrt(dk);if(lg[j]>mx)mx=lg[j]}
          let z=0;for(let j=0;j<T;j++){lg[j]=lg[j]===-Infinity?0:Math.exp(lg[j]-mx);z+=lg[j]}
          for(let j=0;j<T;j++)lg[j]/=z;Ah.push(lg);
          for(let j=0;j<T;j++){const a=lg[j];if(a)for(let k=0;k<dk;k++)cat[i][o+k]+=a*Vv[j][o+k]}}
        AL.push(Ah)}
      att.push(AL);
      X=X.map((x,i)=>{const y=lin(cat[i],P[p+'o'],d,d);for(let k=0;k<d;k++)y[k]+=x[k];return y});
      X=X.map(x=>{const u=lin(ln(x,P[p+'n2']),P[p+'wi'],2*I,d),gg=new Float64Array(I);for(let k=0;k<I;k++)gg[k]=gelu(u[k])*u[I+k];const y=lin(gg,P[p+'wo'],d,I);for(let k=0;k<d;k++)y[k]+=x[k];return y})}
    return {X:X.map(x=>ln(x,P.fn)),att}}
  // prediction head: dense, GELU, norm, then the tied token embeddings plus a bias
  function logits(M,hv){const {d}=M.c,P=M.P,t=ln(lin(hv,P.hd,d,d).map(gelu),P.hn),o=new Float64Array(V);
    for(let v=0;v<V;v++){let s=P.hb[v];for(let j=0;j<d;j++)s+=t[j]*P.tok[v*d+j];o[v]=s}return o}
  // how each kind is used (train.py mode_of): decoders read the last position causally; encoders append three
  // [MASK] and [EOS] (Samuel 2024) and read the first mask; encoders-from-decoders read one position before it (MNTP)
  const MODE={dec:['causal',0],dfe:['causal',0],enc:['mask',0],efd:['mask',1]};
  function next(M,ids){const [how,shift]=MODE[M.kind];
    if(how==='causal'){const H=hidden(M,ids,true);return {p:softmax(logits(M,H.X[ids.length-1])),input:ids,read:ids.length-1,att:H.att,causal:true}}
    const inp=ids.concat([MASK,MASK,MASK,EOS]),H=hidden(M,inp,false),read=ids.length-shift;
    return {p:softmax(logits(M,H.X[read])),input:inp,read,att:H.att,causal:false}}
  function generate(M,ids,n){const steps=[];let cur=ids.slice();for(let k=0;k<(n||3);k++){const r=next(M,cur);let best=0;for(let v=1;v<V;v++)if(r.p[v]>r.p[best])best=v;r.pick=best;steps.push(r);cur=cur.concat([best])}return steps}
  const enc=words=>[BOS].concat(words.map(w=>{if(!(w in IDX))throw new Error('unknown word '+w);return IDX[w]}));
  g.EM={load,hidden,logits,next,generate,enc,softmax,vocab:W.vocab,IDX,cfg:W.cfg,models:W.models,MASK,EOS,BOS,PAD};
})(typeof window!=='undefined'?window:globalThis);
