// ---- The toy DiffusionGemma in plain JavaScript: weights from window.TDG (train.py export), the shared-weights
// causal encoder with its KV cache, the bidirectional canvas decoder, self-conditioning, Algorithm 1 and AR mode.
// Mirrors train.py exactly (pre-norm RMSNorm eps 1e-6, rotary positions with base 100, tanh GELU, tied embeddings);
// check_forward.py compares it with PyTorch on the same 6-bit weights.
const TD=(function(){
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';const DEC={};for(let i=0;i<64;i++)DEC[B64[i]]=i;
  function f16(h){const s=h&0x8000?-1:1,e=(h>>10)&31,f=h&1023;if(e===0)return s*f*Math.pow(2,-24);if(e===31)return f?NaN:s*Infinity;return s*(1+f/1024)*Math.pow(2,e-15)}
  const W=window.TDG,V=W.vocab.length,P=W.P,C=W.C,K=W.K,NB=W.NB,VN=W.VN,IX={};W.vocab.forEach((w,i)=>IX[w]=i);
  const MASK=IX['[m]'],PAD=IX['<p>'];
  const cache={};
  function load(name){if(cache[name])return cache[name];const c=W.cfg,v=W.variants[name];
    const bin=atob(v.v),vb=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)vb[i]=bin.charCodeAt(i);
    let mi=0,si=0,vi=0,ti=0;
    const mat=(rows,cols)=>{const tm=v.tmax[ti++],M=new Float64Array(rows*cols);for(let r=0;r<rows;r++){const s=tm*Math.pow(2,-DEC[v.s[si++]]/8)/31;for(let k=0;k<cols;k++)M[r*cols+k]=(DEC[v.m[mi++]]-32)*s}return M};
    const vec=n=>{const a=new Float64Array(n);for(let k=0;k<n;k++){a[k]=f16(vb[vi]|(vb[vi+1]<<8));vi+=2}return a};
    const d=c.d,ff=c.ff;
    const M={c,name,emb:mat(V,d),L:[]};
    for(let l=0;l<c.L;l++)M.L.push({n1:vec(d),q:mat(d,d),k:mat(d,d),v:mat(d,d),o:mat(d,d),n2:vec(d),up:mat(ff,d),dn:mat(d,ff)});
    M.nf=vec(d);M.sc1=mat(2*d,d);M.sc2=mat(d,2*d);
    if(mi!==v.m.length||vi!==vb.length)throw new Error('toy weights: unread data');
    return cache[name]=M}
  const rms=(x,w)=>{let s=0;for(let i=0;i<x.length;i++)s+=x[i]*x[i];const r=1/Math.sqrt(s/x.length+1e-6);const o=new Float64Array(x.length);for(let i=0;i<x.length;i++)o[i]=x[i]*r*w[i];return o};
  const mv=(M,x,rows)=>{const cols=x.length,o=new Float64Array(rows);for(let r=0;r<rows;r++){let s=0;const b=r*cols;for(let k=0;k<cols;k++)s+=M[b+k]*x[k];o[r]=s}return o};
  const gelu=x=>0.5*x*(1+Math.tanh(0.7978845608028654*(x+0.044715*x*x*x)));
  const embed=(M,tok)=>M.emb.slice(tok*M.c.d,(tok+1)*M.c.d);
  // rotary embedding of every head of a projected vector at absolute position pos (rotate_half pairing, base 100)
  function rope(v,pos,H){const hd=v.length/H,h=hd/2,o=new Float64Array(v.length);for(let a=0;a<H;a++){const b=a*hd;for(let i=0;i<h;i++){const ang=pos/Math.pow(100,2*i/hd),cs=Math.cos(ang),sn=Math.sin(ang);o[b+i]=v[b+i]*cs-v[b+i+h]*sn;o[b+i+h]=v[b+i+h]*cs+v[b+i]*sn}}return o}
  function logits(M,x){const d=M.c.d,h=rms(x,M.nf),o=new Float64Array(V);for(let t=0;t<V;t++){let s=0;for(let i=0;i<d;i++)s+=M.emb[t*d+i]*h[i];o[t]=s}return o}
  // one transformer layer for a set of query rows Xs, attending to keys/values Ks/Vs (already including their own)
  function attnRows(M,P_,Q,Ks,Vs,Xs){const d=M.c.d,H=M.c.h,hd=d/H,sc=1/Math.sqrt(hd);return Xs.map((x,r)=>{const q=Q[r],ao=new Float64Array(d);
      for(let a=0;a<H;a++){const n=Ks[r].length;const w=new Float64Array(n);let mx=-1e30;for(let j=0;j<n;j++){let s=0;const kj=Ks[r][j];for(let i=0;i<hd;i++)s+=q[a*hd+i]*kj[a*hd+i];w[j]=s*sc;if(w[j]>mx)mx=w[j]}
        let z=0;for(let j=0;j<n;j++){w[j]=Math.exp(w[j]-mx);z+=w[j]}for(let j=0;j<n;j++){const vj=Vs[r][j],ww=w[j]/z;for(let i=0;i<hd;i++)ao[a*hd+i]+=ww*vj[a*hd+i]}}
      const o=mv(P_.o,ao,d),x2=new Float64Array(d);for(let i=0;i<d;i++)x2[i]=x[i]+o[i];
      const u=mv(P_.up,rms(x2,P_.n2),M.c.ff);for(let i=0;i<u.length;i++)u[i]=gelu(u[i]);const dn=mv(P_.dn,u,d);for(let i=0;i<d;i++)x2[i]+=dn[i];return x2})}
  // KV cache: per layer, arrays of key and value vectors for every encoded position, in order
  const newCache=M=>({K:M.L.map(()=>[]),V:M.L.map(()=>[]),n:0});
  // encode: append tokens causally (one at a time, each attending to the cache and itself); returns their logits
  function encode(M,cc,toks){const out=[],H=M.c.h;for(const t of toks){let x=embed(M,t);
      for(let l=0;l<M.c.L;l++){const P_=M.L[l],y=rms(x,P_.n1);cc.K[l].push(rope(mv(P_.k,y,M.c.d),cc.n,H));cc.V[l].push(mv(P_.v,y,M.c.d));
        x=attnRows(M,P_,[rope(mv(P_.q,y,M.c.d),cc.n,H)],[cc.K[l]],[cc.V[l]],[x])[0]}
      cc.n++;out.push(logits(M,x))}return out}
  // decode: the canvas (C tokens at positions cc.n ..) attends to the whole cache and bidirectionally to itself
  function decode(M,cc,canvas,z){const d=M.c.d,H=M.c.h;let X=canvas.map((t,i)=>{const e=embed(M,t);if(z)for(let j=0;j<d;j++)e[j]+=z[i][j];return e});
    for(let l=0;l<M.c.L;l++){const P_=M.L[l],Y=X.map(x=>rms(x,P_.n1)),Q=Y.map((y,i)=>rope(mv(P_.q,y,d),cc.n+i,H)),Kc=Y.map((y,i)=>rope(mv(P_.k,y,d),cc.n+i,H)),Vc=Y.map(y=>mv(P_.v,y,d));
      const Ks=cc.K[l].concat(Kc),Vs=cc.V[l].concat(Vc);X=attnRows(M,P_,Q,X.map(()=>Ks),X.map(()=>Vs),X)}
    return X.map(x=>logits(M,x))}
  function selfcond(M,p){const d=M.c.d;return p.map(pr=>{const e=new Float64Array(d);for(let t=0;t<pr.length;t++)if(pr[t])for(let i=0;i<d;i++)e[i]+=pr[t]*M.emb[t*d+i];
      const h=mv(M.sc1,e,2*d);for(let i=0;i<h.length;i++)h[i]=gelu(h[i]);return mv(M.sc2,h,d)})}
  const softT=(L,tau,n)=>{let mx=-1e30;for(let i=0;i<n;i++)if(L[i]/tau>mx)mx=L[i]/tau;const p=new Float64Array(V);let s=0;for(let i=0;i<n;i++){p[i]=Math.exp(L[i]/tau-mx);s+=p[i]}for(let i=0;i<n;i++)p[i]/=s;return p};
  const ent=p=>{let e=0;for(let i=0;i<p.length;i++)if(p[i]>0)e-=p[i]*Math.log(p[i]);return e};
  const argmax=(a,n)=>{let b=0;for(let i=1;i<n;i++)if(a[i]>a[b])b=i;return b};
  const draw=(p,r)=>{let u=r(),c=0;for(let i=0;i<p.length;i++){c+=p[i];if(u<c)return i}let b=0;for(let i=0;i<p.length;i++)if(p[i]>0)b=i;return b};
  // Algorithm 1, one answer of K canvases. o: {N,b,estop,tmax,tmin,sc,seed}; variant 'multinomial' or 'masked'.
  // Returns {ans, steps:[N_k], fwd, revisions, frames:[{k,n,x,xhat,conf,e,U,next,ebar,stop}]}
  function diffuse(M,prompt,o){const r=mulberry32(o.seed>>>0),cc=newCache(M);encode(M,cc,prompt);
    const vm=M.name==='multinomial',Vn=vm?VN:V;const frames=[],ans=[],steps=[];let rev=0;
    for(let k=0;k<K;k++){let x=vm?Array.from({length:C},()=>Math.floor(r()*VN)):Array(C).fill(MASK);let z=null,prev=null,out=null,accPrev=Array(C).fill(-1);const dt=1/o.N;let nk=0;
      for(let n=1;n<=o.N;n++){const t=1-(n-1)*dt;const L=decode(M,cc,x,o.sc?z:null);nk++;
        const xhat=L.map(l=>argmax(l,Vn)),tau=(o.tmax-o.tmin)*t+o.tmin,p=L.map(l=>softT(l,tau,Vn)),e=p.map(ent),ebar=e.reduce((a,b)=>a+b,0)/C;
        const conf=p.map((pp,i)=>pp[xhat[i]]);
        const fr={k,n,x:x.slice(),xhat,conf,e,ebar,U:null,next:null,stop:false};frames.push(fr);
        if(n>1&&ebar<=o.estop&&prev&&prev.every((v,i)=>v===xhat[i])){out=xhat;fr.stop=true;break}
        prev=xhat;if(n===o.N){out=xhat;break}
        z=selfcond(M,p);const xD=p.map(pp=>draw(pp,r));
        const order=[...Array(C).keys()].sort((a,b)=>e[a]-e[b]||a-b);let kk=0,cum=0;for(let m=0;m<C;m++){if(cum<=o.b){kk=m+1;cum+=e[order[m]]}else break}
        const U=Array(C).fill(false);for(let m=0;m<kk;m++)U[order[m]]=true;
        const nx=x.map((_,i)=>U[i]?xD[i]:(vm?Math.floor(r()*VN):MASK));
        for(let i=0;i<C;i++){if(U[i]&&accPrev[i]>=0&&accPrev[i]!==xD[i])rev++;accPrev[i]=U[i]?xD[i]:-1}
        fr.U=U;fr.next=nx;x=nx}
      steps.push(nk);ans.push(...out);if(k<K-1)encode(M,cc,out)}
    return {ans,steps,fwd:steps.reduce((a,b)=>a+b,0)+K-1,revisions:rev,frames}}
  // AR mode with the same weights: one token per forward pass through the causal encoder (restricted to the bits)
  function autoregress(M,prompt){const cc=newCache(M);let L=encode(M,cc,prompt).pop();const ans=[],frames=[];
    for(let i=0;i<NB;i++){const p=softT(L,1,2),t=argmax(L,2);ans.push(t);frames.push({i,t,conf:p[t]});if(i<NB-1)L=encode(M,cc,[t])[0]}
    return {ans,fwd:NB,frames}}
  // tasks (train.py make_problem / check_answer)
  const ruleBits=r=>[0,1,2,3,4,5,6,7].map(i=>(r>>i)&1);
  const WIN=['000','001','010','011','100','101','110','111'],ruleToks=rb=>rb.flatMap((b,i)=>[IX[WIN[i]],b]);
  function problem(task,rule,bits){const rb=ruleBits(rule);let pr,ans;
    if(task==='seq'){const x=bits.slice(0,3);for(let i=0;i<NB;i++)x.push(rb[4*x[x.length-3]+2*x[x.length-2]+x[x.length-1]]);ans=x.slice(3);pr=[IX['<b>'],IX.seq,IX.rule,...ruleToks(rb),IX.in,...bits.slice(0,3),IX['<a>']]}
    else{const zz=[0,0,...bits];ans=bits.map((_,n)=>rb[4*zz[n]+2*zz[n+1]+zz[n+2]]);pr=[IX['<b>'],IX.conv,IX.rule,...ruleToks(rb),IX.in,...bits,IX['<a>']]}
    while(pr.length<P)pr.unshift(PAD);return {task,rule,bits,prompt:pr,ref:ans}}
  return {load,newCache,encode,decode,selfcond,diffuse,autoregress,problem,ruleBits,V,P,C,K,NB,VN,MASK,vocab:W.vocab,testRules:W.test_rules}})();
