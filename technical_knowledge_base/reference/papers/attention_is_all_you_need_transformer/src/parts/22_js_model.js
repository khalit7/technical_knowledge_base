// ---- The toy Transformer's forward pass in plain JavaScript (mirrors train.py; checked by check_forward.py) ----
// Reads window.TMW (20_model_data.js). Exposes TM.load(variant) and TM.translate(model, sourceWords).
(function(g){
  const W=g.TMW;if(!W)return;
  const V=W.vocab.length,{d,N,dff}=W.cfg,IDX={};W.vocab.forEach((w,i)=>IDX[w]=i);
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',CI={};for(let i=0;i<64;i++)CI[B64[i]]=i;
  function half(u){const s=u>>15?-1:1,e=(u>>10)&31,f=u&1023;return e===0?s*f*2**-24:e===31?(f?NaN:s*Infinity):s*(1+f/1024)*2**(e-15)}
  function f16(b64){const bin=atob(b64),n=bin.length>>1,o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=half(bin.charCodeAt(2*i)|bin.charCodeAt(2*i+1)<<8);return o}
  // tensor names and shapes in train.py's tensor_order
  function order(){const t=[['emb',V,d]];const att=(p)=>{'qkvo'.split('').forEach(x=>{t.push([p+x+'.w',d,d]);t.push([p+x+'.b',d])})};
    const ffn=p=>{t.push([p+'w1.w',dff,d],[p+'w1.b',dff],[p+'w2.w',d,dff],[p+'w2.b',d])};
    for(let i=0;i<N;i++){att('e'+i+'.att.');ffn('e'+i+'.ffn.');['n1','n2'].forEach(n=>t.push(['e'+i+'.'+n+'.g',d],['e'+i+'.'+n+'.b',d]))}
    for(let i=0;i<N;i++){att('d'+i+'.att.');att('d'+i+'.crs.');ffn('d'+i+'.ffn.');['n1','n2','n3'].forEach(n=>t.push(['d'+i+'.'+n+'.g',d],['d'+i+'.'+n+'.b',d]))}
    return t}
  const cache={};
  function load(name){if(cache[name])return cache[name];const v=W.variants[name],P={};let mi=0,ri=0,vi=0,ti=0;const vec=f16(v.v);
    order().forEach(([n,r,c])=>{if(c){const a=new Float32Array(r*c),tm=v.tmax[ti++];for(let i=0;i<r;i++){const s=tm*2**(-CI[v.s[ri++]]/8)/31;for(let j=0;j<c;j++)a[i*c+j]=(CI[v.m[mi++]]-32)*s}P[n]=a}
      else{P[n]=vec.subarray(vi,vi+r);vi+=r}});
    if(mi!==v.m.length||vi!==vec.length)throw new Error('weights for '+name+' do not match the configuration');
    return cache[name]={name,h:v.h,pe:v.pe,P}}
  // y = x W^T + b for one row x (W stored out x in)
  function lin(x,Wm,b,out,inn){const y=new Float64Array(out);for(let i=0;i<out;i++){let s=b[i];const o=i*inn;for(let j=0;j<inn;j++)s+=x[j]*Wm[o+j];y[i]=s}return y}
  function ln(x,gm,bt){let m=0;for(const v of x)m+=v;m/=x.length;let q=0;for(const v of x)q+=(v-m)*(v-m);q/=x.length;const r=1/Math.sqrt(q+1e-5),y=new Float64Array(x.length);for(let i=0;i<x.length;i++)y[i]=(x[i]-m)*r*gm[i]+bt[i];return y}
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  function pe(pos,j){const div=Math.pow(10000,(j-(j%2))/d);return j%2?Math.cos(pos/div):Math.sin(pos/div)}
  function embed(M,ids){const E=M.P.emb,s=Math.sqrt(d);return ids.map((id,t)=>{const x=new Float64Array(d);for(let j=0;j<d;j++)x[j]=E[id*d+j]*s+(M.pe?pe(t,j):0);return x})}
  // multi-head scaled dot-product attention (equation 1); allow(i,j) says whether query i may see key j
  function mha(M,p,X,Mem,allow){const h=M.h,dk=d/h,P=M.P;
    const Q=X.map(x=>lin(x,P[p+'q.w'],P[p+'q.b'],d,d)),K=Mem.map(x=>lin(x,P[p+'k.w'],P[p+'k.b'],d,d)),Vv=Mem.map(x=>lin(x,P[p+'v.w'],P[p+'v.b'],d,d));
    const att=[],cat=X.map(()=>new Float64Array(d));
    for(let hh=0;hh<h;hh++){const o=hh*dk,A=[];
      for(let i=0;i<X.length;i++){const lg=new Float64Array(Mem.length);let mx=-Infinity;
        for(let j=0;j<Mem.length;j++){if(!allow(i,j)){lg[j]=-Infinity;continue}let s=0;for(let k=0;k<dk;k++)s+=Q[i][o+k]*K[j][o+k];lg[j]=s/Math.sqrt(dk);if(lg[j]>mx)mx=lg[j]}
        let z=0;for(let j=0;j<Mem.length;j++){lg[j]=lg[j]===-Infinity?0:Math.exp(lg[j]-mx);z+=lg[j]}
        for(let j=0;j<Mem.length;j++)lg[j]/=z;A.push(lg);
        for(let j=0;j<Mem.length;j++){const a=lg[j];if(a)for(let k=0;k<dk;k++)cat[i][o+k]+=a*Vv[j][o+k]}}
      att.push(A)}
    return {out:cat.map(c=>lin(c,P[p+'o.w'],P[p+'o.b'],d,d)),att}}
  function ffn(M,p,x){const P=M.P,hdn=lin(x,P[p+'w1.w'],P[p+'w1.b'],dff,d).map(v=>v>0?v:0);return lin(hdn,P[p+'w2.w'],P[p+'w2.b'],d,dff)}
  function encode(M,src){let X=embed(M,src);const att=[];
    for(let l=0;l<N;l++){const p='e'+l+'.',P=M.P,a=mha(M,p+'att.',X,X,()=>true);att.push(a.att);
      X=X.map((x,i)=>ln(add(x,a.out[i]),P[p+'n1.g'],P[p+'n1.b']));X=X.map(x=>ln(add(x,ffn(M,p+'ffn.',x)),P[p+'n2.g'],P[p+'n2.b']))}
    return {mem:X,att}}
  function decode(M,mem,tin){let Y=embed(M,tin);const self=[],crs=[],P=M.P;
    for(let l=0;l<N;l++){const p='d'+l+'.';const a=mha(M,p+'att.',Y,Y,(i,j)=>j<=i);self.push(a.att);   // masked: position i sees positions up to i
      Y=Y.map((y,i)=>ln(add(y,a.out[i]),P[p+'n1.g'],P[p+'n1.b']));
      const c=mha(M,p+'crs.',Y,mem,()=>true);crs.push(c.att);                                            // queries from the decoder, keys and values from the encoder
      Y=Y.map((y,i)=>ln(add(y,c.out[i]),P[p+'n2.g'],P[p+'n2.b']));Y=Y.map(y=>ln(add(y,ffn(M,p+'ffn.',y)),P[p+'n3.g'],P[p+'n3.b']))}
    const E=P.emb,logits=Y.map(y=>{const o=new Float64Array(V);for(let v=0;v<V;v++){let s=0;for(let j=0;j<d;j++)s+=y[j]*E[v*d+j];o[v]=s}return o}); // shared pre-softmax projection
    return {logits,self,crs}}
  const softmax=l=>{const m=Math.max(...l),e=l.map(v=>Math.exp(v-m)),z=e.reduce((a,b)=>a+b,0);return e.map(v=>v/z)};
  // greedy translation: one full decoder pass per new word (the paper uses beam 4; greedy is enough here)
  function translate(M,words){const src=words.map(w=>{if(!(w in IDX))throw new Error('unknown word '+w);return IDX[w]});const E=encode(M,src);
    const tin=[1];let D;for(let s=0;s<W.maxlen;s++){D=decode(M,E.mem,tin);const l=D.logits[D.logits.length-1];let bi=0;for(let v=1;v<V;v++)if(l[v]>l[bi])bi=v;tin.push(bi);if(bi===2)break}
    D=decode(M,E.mem,tin.slice(0,-1)); // one pass over the decoder inputs: row t is the distribution that chose word t+1
    const out=tin.slice(1).map(i=>W.vocab[i]);
    return {src:words,out,dec_in:tin.slice(0,-1).map(i=>W.vocab[i]),probs:D.logits.map(softmax),enc:E.att,self:D.self,crs:D.crs,logits:D.logits}}
  g.TM={load,translate,vocab:W.vocab,cfg:W.cfg,variants:W.variants};
})(typeof window!=='undefined'?window:globalThis);
