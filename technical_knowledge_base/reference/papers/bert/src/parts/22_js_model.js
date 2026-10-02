// ---- The toy BERT's forward pass in plain JavaScript (mirrors train.py; checked against PyTorch by check_forward.py) ----
// Reads window.BW (20_model_data.js). BM.load(name) -> model; BM.run(model, words, wordsB) -> states, attention, heads.
(function(g){
  const W=g.BW;if(!W)return;
  const V=W.vocab.length,{H,A,L,ff,maxpos}=W.cfg,IDX={};W.vocab.forEach((w,i)=>IDX[w]=i);
  const CLS=1,SEP=2,MASK=3;
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',CI={};for(let i=0;i<64;i++)CI[B64[i]]=i;
  function half(u){const s=u>>15?-1:1,e=(u>>10)&31,f=u&1023;return e===0?s*f*2**-24:e===31?(f?NaN:s*Infinity):s*(1+f/1024)*2**(e-15)}
  function f16(b64){const bin=atob(b64),n=bin.length>>1,o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=half(bin.charCodeAt(2*i)|bin.charCodeAt(2*i+1)<<8);return o}
  // tensor names and shapes in train.py's tensor_order
  function order(kind){const t=[['tok',V,H],['pos',maxpos,H],['seg',2,H],['eln.g',H],['eln.b',H]];
    for(let i=0;i<L;i++){const p='l'+i+'.';'qkvo'.split('').forEach(x=>t.push([p+x+'.w',H,H],[p+x+'.b',H]));
      t.push([p+'n1.g',H],[p+'n1.b',H],[p+'f1.w',ff,H],[p+'f1.b',ff],[p+'f2.w',H,ff],[p+'f2.b',H],[p+'n2.g',H],[p+'n2.b',H])}
    if(kind==='pre')t.push(['mt.w',H,H],['mt.b',H],['mln.g',H],['mln.b',H],['mb',V],['pool.w',H,H],['pool.b',H],['nsp.w',2,H],['nsp.b',2]);
    else t.push(['head.w',3,H],['head.b',3]);
    return t}
  const cache={};
  function load(name){if(cache[name])return cache[name];const v=W.models[name];if(!v)throw new Error('no model '+name);const P={};let mi=0,ri=0,vi=0,ti=0;const vec=f16(v.v);
    order(v.kind).forEach(([n,r,c])=>{if(c){const a=new Float32Array(r*c),tm=v.tmax[ti++];for(let i=0;i<r;i++){const s=tm*2**(-CI[v.s[ri++]]/8)/31;for(let j=0;j<c;j++)a[i*c+j]=(CI[v.m[mi++]]-32)*s}P[n]=a}
      else{P[n]=vec.subarray(vi,vi+r);vi+=r}});
    if(mi!==v.m.length||vi!==vec.length)throw new Error('weights for '+name+' do not match the configuration');
    return cache[name]={name,kind:v.kind,causal:v.causal,P}}
  function lin(x,Wm,b,out,inn){const y=new Float64Array(out);for(let i=0;i<out;i++){let s=b[i];const o=i*inn;for(let j=0;j<inn;j++)s+=x[j]*Wm[o+j];y[i]=s}return y}
  function ln(x,gm,bt){let m=0;for(const v of x)m+=v;m/=x.length;let q=0;for(const v of x)q+=(v-m)*(v-m);q/=x.length;const r=1/Math.sqrt(q+1e-12),y=new Float64Array(x.length);for(let i=0;i<x.length;i++)y[i]=(x[i]-m)*r*gm[i]+bt[i];return y}
  const gelu=x=>0.5*x*(1+Math.tanh(Math.sqrt(2/Math.PI)*(x+0.044715*x*x*x)));   // the released BERT code's gelu
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const softmax=l=>{let m=-Infinity;for(const v of l)if(v>m)m=v;const e=Array.from(l,v=>Math.exp(v-m)),z=e.reduce((a,b)=>a+b,0);return e.map(v=>v/z)};
  // ids and segments for [CLS] A [SEP] (B [SEP]); a word may be '[MASK]'
  function pack(a,b){const ids=[CLS,...a.map(w=>{if(!(w in IDX))throw new Error('unknown word '+w);return IDX[w]}),SEP],seg=ids.map(()=>0);
    if(b&&b.length){b.forEach(w=>{ids.push(IDX[w]);seg.push(1)});ids.push(SEP);seg.push(1)}return {ids,seg}}
  // the encoder: embeddings (token + position + segment, LayerNorm), then L post-LN layers; causal for the left-to-right model
  function encode(M,ids,seg){const P=M.P;let X=ids.map((id,t)=>{const x=new Float64Array(H);for(let j=0;j<H;j++)x[j]=P.tok[id*H+j]+P.pos[t*H+j]+P.seg[seg[t]*H+j];return ln(x,P['eln.g'],P['eln.b'])});
    const att=[],dk=H/A,T=ids.length;
    for(let l=0;l<L;l++){const p='l'+l+'.';
      const Q=X.map(x=>lin(x,P[p+'q.w'],P[p+'q.b'],H,H)),K=X.map(x=>lin(x,P[p+'k.w'],P[p+'k.b'],H,H)),Vv=X.map(x=>lin(x,P[p+'v.w'],P[p+'v.b'],H,H));
      const cat=X.map(()=>new Float64Array(H)),AL=[];
      for(let h=0;h<A;h++){const o=h*dk,Ah=[];
        for(let i=0;i<T;i++){const lg=new Float64Array(T);let mx=-Infinity;
          for(let j=0;j<T;j++){if(M.causal&&j>i){lg[j]=-Infinity;continue}let s=0;for(let k=0;k<dk;k++)s+=Q[i][o+k]*K[j][o+k];lg[j]=s/Math.sqrt(dk);if(lg[j]>mx)mx=lg[j]}
          let z=0;for(let j=0;j<T;j++){lg[j]=lg[j]===-Infinity?0:Math.exp(lg[j]-mx);z+=lg[j]}
          for(let j=0;j<T;j++)lg[j]/=z;Ah.push(lg);
          for(let j=0;j<T;j++){const a=lg[j];if(a)for(let k=0;k<dk;k++)cat[i][o+k]+=a*Vv[j][o+k]}}
        AL.push(Ah)}
      att.push(AL);
      const O=cat.map(c=>lin(c,P[p+'o.w'],P[p+'o.b'],H,H));
      X=X.map((x,i)=>ln(add(x,O[i]),P[p+'n1.g'],P[p+'n1.b']));
      X=X.map(x=>ln(add(x,lin(lin(x,P[p+'f1.w'],P[p+'f1.b'],ff,H).map(gelu),P[p+'f2.w'],P[p+'f2.b'],H,ff)),P[p+'n2.g'],P[p+'n2.b']))}
    return {X,att}}
  // masked-LM (or next-word) logits at one position: dense + GELU + LayerNorm, then the tied token embeddings plus a bias
  function lmLogits(M,h){const P=M.P,t=ln(lin(h,P['mt.w'],P['mt.b'],H,H).map(gelu),P['mln.g'],P['mln.b']),o=new Float64Array(V);
    for(let v=0;v<V;v++){let s=P.mb[v];for(let j=0;j<H;j++)s+=t[j]*P.tok[v*H+j];o[v]=s}return o}
  function nsp(M,h0){const P=M.P,p=lin(h0,P['pool.w'],P['pool.b'],H,H).map(Math.tanh);return softmax(lin(p,P['nsp.w'],P['nsp.b'],2,H))}
  function run(M,a,b){const pk=pack(a,b),E=encode(M,pk.ids,pk.seg),out={ids:pk.ids,seg:pk.seg,words:pk.ids.map(i=>W.vocab[i]),X:E.X,att:E.att};
    if(M.kind==='pre'){out.lm=E.X.map(h=>lmLogits(M,h));if(!M.causal)out.nsp=nsp(M,E.X[0])}
    else out.tag=E.X.map(h=>lin(h,M.P['head.w'],M.P['head.b'],3,H));
    return out}
  // fill in: predictions for the word at position t (1-based in [CLS]...): bidirectional reads the [MASK] there,
  // left-to-right reads the state one position earlier (it has seen only the words to the left)
  function fill(M,R,t){const l=M.causal?R.lm[t-1]:R.lm[t];return softmax(Array.from(l).map((v,i)=>i<4?-1e9:v))}
  g.BM={load,run,fill,pack,softmax,vocab:W.vocab,tags:W.tags,cfg:W.cfg,models:W.models,IDX};
})(typeof window!=='undefined'?window:globalThis);
