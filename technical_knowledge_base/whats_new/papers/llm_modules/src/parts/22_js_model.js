// ---- The toy LLM Modules forward pass in plain JavaScript (mirrors train.py; checked against PyTorch by check_forward.py) ----
// Reads window.LMW (20_model_data.js). LM.run(variant, ids) -> the frozen model's states and own logits, the bridge
// (cross-attention weights, gates), the small model's logits. LM.generate(variant, prompt) -> greedy free-running decoding.
(function(g){
  const W=g.LMW;if(!W)return;
  const V=W.vocab.length,IDX={};W.vocab.forEach((w,i)=>IDX[w]=i);
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',CI={};for(let i=0;i<64;i++)CI[B64[i]]=i;
  // 6-bit weights, one character each, with a per-row scale (also one character): value = (c - 32) * rowmax / 31
  function deq(o){const [R0,C0]=o.shape,[r,c]=o.t?[C0,R0]:[R0,C0],a=new Float64Array(R0*C0);let k=0;
    for(let i=0;i<r;i++){const s=o.mx*2**(-CI[o.s[i]]/8)/31;for(let j=0;j<c;j++){const v=(CI[o.q[k++]]-32)*s;if(o.t)a[j*C0+i]=v;else a[i*c+j]=v}}
    a.shape=o.shape;return a}
  // vectors at 12 bits: two characters per value, value = (code - 2048) * max / 2047
  const vec=o=>{const n=o.vq.length/2,a=new Float64Array(n);for(let i=0;i<n;i++)a[i]=((CI[o.vq[2*i]]<<6|CI[o.vq[2*i+1]])-2048)*o.vx/2047;return a};
  function tensors(src){const P={};for(const n in src){const o=src[n];P[n]=o.q?deq(o):vec(o)}return P}
  const BIG=tensors(W.bigw),cache={};
  // the 560 facts in train.py's order: a + b for a, b in 0..19, then a % b for a in 0..19, b in 2..9
  const FACTS=[];for(let a=0;a<20;a++)for(let b=0;b<20;b++)FACTS.push(['sum',a,b,a+b]);for(let a=0;a<20;a++)for(let b=2;b<10;b++)FACTS.push(['rem',a,b,a%b]);
  const load=name=>cache[name]||(cache[name]=tensors(W.variants[name]));
  // y = W x (+ b); W is [out, in] row-major (PyTorch's Linear layout)
  function lin(P,n,x,bias){const Wm=P[n+'.weight'],out=Wm.shape[0],inn=Wm.shape[1],b=bias===false?null:P[n+'.bias'],y=new Float64Array(out);
    for(let i=0;i<out;i++){let s=b?b[i]:0;const o=i*inn;for(let j=0;j<inn;j++)s+=Wm[o+j]*x[j];y[i]=s}return y}
  function ln(P,n,x){const gm=P[n+'.weight'],bt=P[n+'.bias'];let m=0;for(const v of x)m+=v;m/=x.length;let q=0;for(const v of x)q+=(v-m)*(v-m);q/=x.length;
    const r=1/Math.sqrt(q+1e-5),y=new Float64Array(x.length);for(let i=0;i<x.length;i++)y[i]=(x[i]-m)*r*gm[i]+bt[i];return y}
  // erf to about 1e-12 so GELU matches PyTorch's exact GELU
  function erf(x){const s=x<0?-1:1;x=Math.abs(x);if(x<2.5){let t=x,sum=x,n=0;while(Math.abs(t)>1e-17*Math.abs(sum)&&n<200){n++;t*=-x*x/n;sum+=t/(2*n+1)}return s*2/Math.sqrt(Math.PI)*sum}
    let f=0;for(let k=60;k>=1;k--)f=k/2/(x+f);return s*(1-Math.exp(-x*x)/Math.sqrt(Math.PI)/(x+f))}
  const gelu=v=>0.5*v*(1+erf(v/Math.SQRT2));
  const geluNew=v=>0.5*v*(1+Math.tanh(Math.sqrt(2/Math.PI)*(v+0.044715*v*v*v)));
  const add=(a,b)=>{const y=new Float64Array(a.length);for(let i=0;i<a.length;i++)y[i]=a[i]+b[i];return y};
  // multi-head attention of queries Q over keys K, values Vv; allow(i,j); scale or not (GPT-Neo does not scale)
  function attend(Q,K,Vv,h,allow,scale){const d=Q[0].length,dk=d/h,out=Q.map(()=>new Float64Array(d)),att=[];
    for(let hh=0;hh<h;hh++){const o=hh*dk,Am=[];
      for(let i=0;i<Q.length;i++){const lg=new Float64Array(K.length);let mx=-Infinity;
        for(let j=0;j<K.length;j++){if(!allow(i,j)){lg[j]=-Infinity;continue}let s=0;for(let k=0;k<dk;k++)s+=Q[i][o+k]*K[j][o+k];lg[j]=scale?s/Math.sqrt(dk):s;if(lg[j]>mx)mx=lg[j]}
        let z=0;for(let j=0;j<K.length;j++){lg[j]=lg[j]===-Infinity?0:Math.exp(lg[j]-mx);z+=lg[j]}
        for(let j=0;j<K.length;j++){lg[j]/=z;const a=lg[j];if(a)for(let k=0;k<dk;k++)out[i][o+k]+=a*Vv[j][o+k]}Am.push(lg)}
      att.push(Am)}
    return {out,att}}
  const causal=(i,j)=>j<=i,all=()=>true;
  function block(P,p,X,h,scale,act,bias){const Z=X.map(x=>ln(P,p+'n1',x));
    const Q=Z.map(z=>lin(P,p+'q',z,bias)),K=Z.map(z=>lin(P,p+'k',z,bias)),Vv=Z.map(z=>lin(P,p+'v',z,bias));
    const A=attend(Q,K,Vv,h,causal,scale);X=X.map((x,i)=>add(x,lin(P,p+'o',A.out[i])));
    X=X.map(x=>add(x,lin(P,p+'f2',lin(P,p+'f1',ln(P,p+'n2',x)).map(act))));return {X,att:A.att}}
  // the frozen "large" model: states = hidden_states[-1] (after the final norm); logits via the tied embedding
  function big(ids){const d=W.big.d,E=BIG['emb.weight'],Pp=BIG['pos.weight'];
    let X=ids.map((id,t)=>{const x=new Float64Array(d);for(let j=0;j<d;j++)x[j]=E[id*d+j]+Pp[t*d+j];return x});const att=[];
    for(let l=0;l<W.big.L;l++){const r=block(BIG,'blocks.'+l+'.',X,W.big.h,true,gelu,true);X=r.X;att.push(r.att)}
    const H=X.map(x=>ln(BIG,'nf',x));
    const logits=H.map(x=>{const o=new Float64Array(V);for(let v=0;v<V;v++){let s=0;for(let j=0;j<d;j++)s+=x[j]*E[v*d+j];o[v]=s}return o});
    return {H,logits,att}}
  // model.py ModifiedQwenWithCrossAttention.forward, then ModifiedGptNeo.forward
  function run(name,ids){const P=load(name),causalX=name!=='released',B=big(ids),T=ids.length;
    const pre=B.H.map(x=>lin(P,'pre_proj',x)),projected=pre.map(x=>lin(P,'proj',x));
    let gs=pre.map(x=>{let y=lin(P,'intermediate.0',x);y=ln(P,'intermediate.1',y).map(gelu);y=lin(P,'intermediate.3',y);return ln(P,'intermediate.4',y)});
    const xatt=[],gates=[],allow=causalX?causal:all;
    for(let l=0;l<2;l++){const p='xlayers.'+l+'.',ca=p+'cross_attn.';
      const bn=pre.map(x=>ln(P,ca+'norm1',x)),gn=gs.map(x=>ln(P,ca+'norm2',x));
      const Q=gn.map(x=>lin(P,ca+'q_proj',x)),K=bn.map(x=>lin(P,ca+'k_proj',x)),Vv=bn.map(x=>lin(P,ca+'v_proj',x));
      const A=attend(Q,K,Vv,W.xheads,allow,true);xatt.push(A.att);
      let o=A.out.map(x=>lin(P,ca+'out_proj',x));
      o=o.map(x=>{const y=ln(P,p+'adapter.norm',lin(P,p+'adapter.fc2',lin(P,p+'adapter.fc1',x).map(gelu)));return add(y,x)});
      const gt=o.map((x,i)=>{const c=new Float64Array(x.length*2);c.set(gs[i]);c.set(x,x.length);return lin(P,p+'gate',c).map(v=>1/(1+Math.exp(-v)))});gates.push(gt);
      const out=o.map((x,i)=>x.map((v,j)=>gt[i][j]*v+(1-gt[i][j])*gs[i][j]));
      gs=gs.map((x,i)=>add(x,out[i]))}
    const fin=gs.map((x,i)=>add(x,projected[i]));
    const d=W.small.d,wpe=P['small.wpe.weight'];
    let X=fin.map((x,t)=>{const y=new Float64Array(d);for(let j=0;j<d;j++)y[j]=x[j]+wpe[t*d+j];return y});const satt=[];
    for(let l=0;l<W.small.L;l++){const r=block(P,'small.blocks.'+l+'.',X,W.small.h,false,geluNew,false);X=r.X;satt.push(r.att)}
    const logits=X.map(x=>lin(P,'small.head',ln(P,'small.ln_f',x),false));
    return {big:B,xatt,gates,satt,logits,T}}
  const argmax=a=>{let b=0;for(let i=1;i<a.length;i++)if(a[i]>a[b])b=i;return b};
  // free-running greedy decoding, recomputing the whole prefix each step (as model.py's generate_response does)
  function generate(name,prompt,max){const s=prompt.slice(),steps=[];max=max||W.tlen-prompt.length;
    for(let k=0;k<max&&s.length<W.tlen;k++){const r=name==='big'?{logits:big(s).logits}:run(name,s),t=argmax(r.logits[r.logits.length-1]);steps.push(t);s.push(t);if(t===IDX['<eos>'])break}
    return {seq:s,steps}}
  const N0=IDX['0'];
  function trace(f){const [op,a,b,c]=f,n=x=>N0+x,pr=[IDX['<bos>'],IDX['Q'],IDX[op],n(a),n(b),IDX['T']];
    let body=[n(a),IDX[op==='sum'?'+':'%'],n(b),IDX['='],n(c),IDX[';']];
    body=body.concat(op==='sum'?[n(c),IDX['-'],n(b),IDX['='],n(a)]:[n(c),IDX['<'],n(b)]).concat([IDX['ok'],IDX['A'],n(c),IDX['<eos>']]);
    return {prompt:pr,body,full:pr.concat(body)}}
  function answerOf(seq){for(let i=W.prompt_len;i<seq.length-1;i++)if(seq[i]===IDX['A'])return seq[i+1]>=N0?seq[i+1]-N0:null;return null}
  g.LM={run,big,generate,trace,answerOf,argmax,vocab:W.vocab,IDX,N0,facts:FACTS,split:W.split,eqPos:W.eq_pos,promptLen:W.prompt_len,tlen:W.tlen,
    softmax:l=>{let m=-Infinity;for(const v of l)if(v>m)m=v;const e=Array.from(l,v=>Math.exp(v-m)),z=e.reduce((a,b)=>a+b,0);return e.map(v=>v/z)}};
})(typeof window!=='undefined'?window:globalThis);
