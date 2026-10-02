// ---- The toy RAG model in plain JavaScript (mirrors train.py; checked against PyTorch by check_forward.py) ----
// Reads window.RAGW (20_model_data.js). Exposes RAG.{load, makeIndex, retrieve, answer, closed, scoreSeq}.
(function(g){
  const W=g.RAGW;if(!W)return;
  const V=W.vocab.length,{d,N,dff,k:K,maxy:MAXY}=W.cfg,IDX={};W.vocab.forEach((w,i)=>IDX[w]=i);
  const PAD=0,BOS=1,EOS=2,SEP=IDX['//'];
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',CI={};for(let i=0;i<64;i++)CI[B64[i]]=i;
  function half(u){const s=u>>15?-1:1,e=(u>>10)&31,f=u&1023;return e===0?s*f*2**-24:e===31?(f?NaN:s*Infinity):s*(1+f/1024)*2**(e-15)}
  function f16(b64){const bin=atob(b64),n=bin.length>>1,o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=half(bin.charCodeAt(2*i)|bin.charCodeAt(2*i+1)<<8);return o}
  function order(){const t=[['emb',V,d]];const att=p=>{'qkvo'.split('').forEach(x=>{t.push([p+x+'.w',d,d]);t.push([p+x+'.b',d])})};
    const ffn=p=>{t.push([p+'w1.w',dff,d],[p+'w1.b',dff],[p+'w2.w',d,dff],[p+'w2.b',d])};
    for(let i=0;i<N;i++){att('e'+i+'.att.');ffn('e'+i+'.ffn.');['n1','n2'].forEach(n=>t.push(['e'+i+'.'+n+'.g',d],['e'+i+'.'+n+'.b',d]))}
    for(let i=0;i<N;i++){att('d'+i+'.att.');att('d'+i+'.crs.');ffn('d'+i+'.ffn.');['n1','n2','n3'].forEach(n=>t.push(['d'+i+'.'+n+'.g',d],['d'+i+'.'+n+'.b',d]))}
    return t}
  function unpack(q,ord){const P={};let mi=0,ri=0,vi=0,ti=0;const vec=f16(q.v);
    ord.forEach(([n,r,c])=>{if(c){const a=new Float32Array(r*c),tm=q.tmax[ti++];for(let i=0;i<r;i++){const s=tm*2**(-CI[q.s[ri++]]/8)/31;for(let j=0;j<c;j++)a[i*c+j]=(CI[q.m[mi++]]-32)*s}P[n]=a}
      else{P[n]=vec.subarray(vi,vi+r);vi+=r}});
    if(mi!==q.m.length||vi!==vec.length)throw new Error('RAG weights do not match the configuration');return P}
  const BAGO=[['w',V],['b',1]],DW=unpack(W.denc,BAGO),cache={};
  function load(name){if(cache[name])return cache[name];const v=W.variants[name];
    return cache[name]={name,mode:v.mode,P:unpack(v.g,order()),qw:v.q?unpack(v.q,BAGO):null,enc:new Map()}}
  // ---- generator: post-LN encoder-decoder Transformer ----
  function lin(x,Wm,b,out,inn){const y=new Float64Array(out);for(let i=0;i<out;i++){let s=b[i];const o=i*inn;for(let j=0;j<inn;j++)s+=x[j]*Wm[o+j];y[i]=s}return y}
  function ln(x,gm,bt){let m=0;for(const v of x)m+=v;m/=x.length;let q=0;for(const v of x)q+=(v-m)*(v-m);q/=x.length;const r=1/Math.sqrt(q+1e-5),y=new Float64Array(x.length);for(let i=0;i<x.length;i++)y[i]=(x[i]-m)*r*gm[i]+bt[i];return y}
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  function pe(pos,j){const div=Math.pow(10000,(j-(j%2))/d);return j%2?Math.cos(pos/div):Math.sin(pos/div)}
  function embed(M,ids){const E=M.P.emb,s=Math.sqrt(d);return ids.map((id,t)=>{const x=new Float64Array(d);for(let j=0;j<d;j++)x[j]=E[id*d+j]*s+pe(t,j);return x})}
  function mha(M,p,X,Mem,allow){const h=4,dk=d/h,P=M.P;
    const Q=X.map(x=>lin(x,P[p+'q.w'],P[p+'q.b'],d,d));let kv=Mem===X?null:(Mem.__kv||(Mem.__kv={}))[p];   // cross-attention keys and values are cached per encoder output
    if(!kv){kv=[Mem.map(x=>lin(x,P[p+'k.w'],P[p+'k.b'],d,d)),Mem.map(x=>lin(x,P[p+'v.w'],P[p+'v.b'],d,d))];if(Mem!==X)Mem.__kv[p]=kv}const Kk=kv[0],Vv=kv[1];
    const cat=X.map(()=>new Float64Array(d));
    for(let hh=0;hh<h;hh++){const o=hh*dk;
      for(let i=0;i<X.length;i++){const lg=new Float64Array(Mem.length);let mx=-Infinity;
        for(let j=0;j<Mem.length;j++){if(!allow(i,j)){lg[j]=-Infinity;continue}let s=0;for(let k=0;k<dk;k++)s+=Q[i][o+k]*Kk[j][o+k];lg[j]=s/Math.sqrt(dk);if(lg[j]>mx)mx=lg[j]}
        let z=0;for(let j=0;j<Mem.length;j++){lg[j]=lg[j]===-Infinity?0:Math.exp(lg[j]-mx);z+=lg[j]}
        for(let j=0;j<Mem.length;j++){const a=lg[j]/z;if(a)for(let k=0;k<dk;k++)cat[i][o+k]+=a*Vv[j][o+k]}}}
    return cat.map(c=>lin(c,P[p+'o.w'],P[p+'o.b'],d,d))}
  function ffn(M,p,x){const P=M.P,hd=lin(x,P[p+'w1.w'],P[p+'w1.b'],dff,d).map(v=>v>0?v:0);return lin(hd,P[p+'w2.w'],P[p+'w2.b'],d,dff)}
  function encode(M,src){const key=src.join(',');if(M.enc.has(key))return M.enc.get(key);let X=embed(M,src);const P=M.P;
    for(let l=0;l<N;l++){const p='e'+l+'.',a=mha(M,p+'att.',X,X,()=>true);
      X=X.map((x,i)=>ln(add(x,a[i]),P[p+'n1.g'],P[p+'n1.b']));X=X.map(x=>ln(add(x,ffn(M,p+'ffn.',x)),P[p+'n2.g'],P[p+'n2.b']))}
    if(M.enc.size>4000)M.enc.clear();M.enc.set(key,X);return X}
  // log-probabilities of the next token after every prefix position: rows = tin.length, each a Float64Array(V)
  function decode(M,mem,tin){let Y=embed(M,tin);const P=M.P;
    for(let l=0;l<N;l++){const p='d'+l+'.';const a=mha(M,p+'att.',Y,Y,(i,j)=>j<=i);
      Y=Y.map((y,i)=>ln(add(y,a[i]),P[p+'n1.g'],P[p+'n1.b']));const c=mha(M,p+'crs.',Y,mem,()=>true);
      Y=Y.map((y,i)=>ln(add(y,c[i]),P[p+'n2.g'],P[p+'n2.b']));Y=Y.map(y=>ln(add(y,ffn(M,p+'ffn.',y)),P[p+'n3.g'],P[p+'n3.b']))}
    const E=P.emb;return Y.map(y=>{const o=new Float64Array(V);let mx=-Infinity;for(let v=0;v<V;v++){let s=0;for(let j=0;j<d;j++)s+=y[j]*E[v*d+j];o[v]=s;if(s>mx)mx=s}
      let z=0;for(let v=0;v<V;v++)z+=Math.exp(o[v]-mx);const lz=mx+Math.log(z);for(let v=0;v<V;v++)o[v]-=lz;return o})}
  const lse=a=>{const m=Math.max(...a);return m===-Infinity?m:m+Math.log(a.reduce((s,v)=>s+Math.exp(v-m),0))};
  const toIds=ws=>ws.map(w=>{if(!(w in IDX))throw new Error('unknown token '+w);return IDX[w]});
  // ---- retriever: one learned weight per token, plus ordered syllable pairs with one shared weight; score = d(z)^T q(x) ----
  const S0=IDX[W.world.syl[0]],NS=W.world.syl.length;
  function bag(ids,P){const u=new Float64Array(V),bg=new Map();let n=0;ids.forEach(t=>{if(t!==PAD){u[t]+=1;n++}});const r=1/Math.sqrt(Math.max(1,n));
    for(let i=0;i<V;i++)u[i]*=P.w[i]*r;
    for(let i=0;i+1<ids.length;i++){const a=ids[i]-S0,c=ids[i+1]-S0;if(a>=0&&a<NS&&c>=0&&c<NS){const k=a*NS+c;bg.set(k,(bg.get(k)||0)+P.b[0]*r)}}
    return {u,bg}}
  function dot(a,b){let s=0;for(let j=0;j<V;j++)if(a.u[j])s+=a.u[j]*b.u[j];a.bg.forEach((v,k)=>{const o=b.bg.get(k);if(o)s+=v*o});return s}
  function makeIndex(docs){return docs.map(dc=>({toks:dc.toks,ids:toIds(dc.toks),vec:bag(toIds(dc.toks),DW),meta:dc}))}
  function retrieve(M,index,x,k){k=k||K;const qv=bag(toIds(x),M.qw);
    const sc=index.map((dc,i)=>[dot(qv,dc.vec),i]);
    sc.sort((a,b)=>b[0]-a[0]||a[1]-b[1]);const top=sc.slice(0,k),lz=lse(top.map(t=>t[0]));
    return {idx:top.map(t=>t[1]),score:top.map(t=>t[0]),lpz:top.map(t=>t[0]-lz)}}
  const srcOf=(dc,x)=>dc.ids.concat([SEP],toIds(x));
  // RAG-Token: greedy on the per-token marginal (§2.5); also returns the document posterior at each step (Figure 2)
  function answerTok(M,index,x,k){const R=retrieve(M,index,x,k),mems=R.idx.map(i=>encode(M,srcOf(index[i],x)));
    const out=[BOS],steps=[];
    for(let s=0;s<MAXY;s++){const per=mems.map(m=>{const L=decode(M,m,out);return L[L.length-1]});
      const mix=new Float64Array(V);for(let v=0;v<V;v++)mix[v]=lse(per.map((l,j)=>R.lpz[j]+l[v]));
      let bi=0;for(let v=1;v<V;v++)if(mix[v]>mix[bi])bi=v;
      const post=per.map((l,j)=>R.lpz[j]+l[bi]),pz=lse(post);
      steps.push({tok:W.vocab[bi],p:Math.exp(mix[bi]),post:post.map(v=>Math.exp(v-pz)),perDoc:per.map(l=>Math.exp(l[bi])),
        perDocTop:per.map(l=>{let b=0;for(let v=1;v<V;v++)if(l[v]>l[b])b=v;return [W.vocab[b],Math.exp(l[b])]})});
      out.push(bi);if(bi===EOS)break}
    const y=out.slice(1);const e=y.indexOf(EOS);return {mode:'tok',ret:R,y:(e<0?y:y.slice(0,e)).map(i=>W.vocab[i]),steps}}
  // log p(y|x,z) for one document, the sum over tokens of y then </s>
  function seqLp(M,mem,yIds){const tin=[BOS].concat(yIds),L=decode(M,mem,tin);let s=0;const tg=yIds.concat([EOS]);for(let i=0;i<tg.length;i++)s+=L[i][tg[i]];return s}
  // RAG-Sequence: greedy per document, then Thorough Decoding: every hypothesis rescored under every document
  function answerSeq(M,index,x,k){const R=retrieve(M,index,x,k),mems=R.idx.map(i=>encode(M,srcOf(index[i],x)));
    const hyps=[],perDoc=[];
    mems.forEach(m=>{const o=[BOS];for(let s=0;s<MAXY;s++){const L=decode(M,m,o),l=L[L.length-1];let b=0;for(let v=1;v<V;v++)if(l[v]>l[b])b=v;o.push(b);if(b===EOS)break}
      let y=o.slice(1);const e=y.indexOf(EOS);y=e<0?y:y.slice(0,e);perDoc.push(y.map(i=>W.vocab[i]));if(y.length&&!hyps.some(h=>h.join()===y.join()))hyps.push(y)});
    if(!hyps.length)hyps.push([]);
    const scored=hyps.map(h=>{const per=mems.map(m=>seqLp(M,m,h));const tot=lse(per.map((v,j)=>R.lpz[j]+v));return {y:h.map(i=>W.vocab[i]),lp:tot,per}});
    let best=scored[0];scored.forEach(s=>{if(s.lp>best.lp)best=s});
    return {mode:'seq',ret:R,y:best.y,hyps:scored,perDoc}}
  function closed(M,x){const mem=encode(M,toIds(x)),o=[BOS],steps=[];
    for(let s=0;s<MAXY;s++){const L=decode(M,mem,o),l=L[L.length-1];let b=0;for(let v=1;v<V;v++)if(l[v]>l[b])b=v;steps.push(Math.exp(l[b]));o.push(b);if(b===EOS)break}
    let y=o.slice(1);const e=y.indexOf(EOS);return {mode:'closed',y:(e<0?y:y.slice(0,e)).map(i=>W.vocab[i]),steps}}
  function answer(M,index,x,k){return M.mode==='seq'?answerSeq(M,index,x,k):M.mode==='closed'?closed(M,x):answerTok(M,index,x,k)}
  g.RAG={load,makeIndex,retrieve,answer,closed,vocab:W.vocab,cfg:W.cfg,variants:W.variants,K};
})(typeof window!=='undefined'?window:globalThis);
