// ---- The toy Qwen3 in plain JavaScript: weights from window.TQW (train.py export), forward pass, decoding with a budget ----
// Mirrors train.py exactly: pre-norm RMSNorm (eps 1e-6), grouped-query attention with QK-Norm and rotary embeddings
// (rotate_half pairing), SwiGLU, tied embeddings. check_forward.py compares it with PyTorch on the same 6-bit weights.
const TQ=(function(){
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';const DEC={};for(let i=0;i<64;i++)DEC[B64[i]]=i;
  function f16(h){const s=h&0x8000?-1:1,e=(h>>10)&31,f=h&1023;if(e===0)return s*f*Math.pow(2,-24);if(e===31)return f?NaN:s*Infinity;return s*(1+f/1024)*Math.pow(2,e-15)}
  const cache={};
  function load(name){if(cache[name])return cache[name];const W=window.TQW,c=W.cfg,v=W.variants[name],V=W.vocab.length;
    const bin=atob(v.v),vb=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)vb[i]=bin.charCodeAt(i);
    let mi=0,si=0,vi=0,ti=0;
    const mat=(rows,cols)=>{const tm=v.tmax[ti++],M=new Float64Array(rows*cols);for(let r=0;r<rows;r++){const s=tm*Math.pow(2,-DEC[v.s[si++]]/8)/31;for(let k=0;k<cols;k++)M[r*cols+k]=(DEC[v.m[mi++]]-32)*s}return M};
    const vec=n=>{const a=new Float64Array(n);for(let k=0;k<n;k++){a[k]=f16(vb[vi]|(vb[vi+1]<<8));vi+=2}return a};
    const d=c.d,hq=c.hq,hkv=c.hkv,hd=c.hd,ff=c.ff;
    const M={c,V,emb:mat(V,d),L:[]};
    for(let l=0;l<c.L;l++){M.L.push({n1:vec(d),q:mat(hq*hd,d),k:mat(hkv*hd,d),v:mat(hkv*hd,d),qn:vec(hd),kn:vec(hd),o:mat(d,hq*hd),n2:vec(d),g:mat(ff,d),up:mat(ff,d),dn:mat(d,ff)})}
    M.nf=vec(d);
    if(mi!==v.m.length||vi!==vb.length)throw new Error('toy weights: unread data');
    return cache[name]=M}
  const rms=(x,w)=>{let s=0;for(let i=0;i<x.length;i++)s+=x[i]*x[i];const r=1/Math.sqrt(s/x.length+1e-6);const o=new Float64Array(x.length);for(let i=0;i<x.length;i++)o[i]=x[i]*r*w[i];return o};
  const mv=(M,x,rows)=>{const cols=x.length,o=new Float64Array(rows);for(let r=0;r<rows;r++){let s=0;const b=r*cols;for(let k=0;k<cols;k++)s+=M[b+k]*x[k];o[r]=s}return o};
  function rope(x,pos,hd,base){const h=hd/2,o=new Float64Array(hd);for(let i=0;i<h;i++){const a=pos/Math.pow(base,2*i/hd),cs=Math.cos(a),sn=Math.sin(a);o[i]=x[i]*cs-x[i+h]*sn;o[i+h]=x[i+h]*cs+x[i]*sn}return o}
  // forward(M, ids, keep): logits at every position (array of Float64Array(V)); keep.att[l][h][t] = attention row
  function forward(M,ids,keep){const c=M.c,d=c.d,hq=c.hq,hkv=c.hkv,hd=c.hd,T=ids.length,rep=hq/hkv;
    let X=ids.map(t=>M.emb.slice(t*d,(t+1)*d));
    if(keep)keep.att=[];
    for(let l=0;l<c.L;l++){const P=M.L[l];const Q=[],K=[],Vv=[];
      for(let t=0;t<T;t++){const h=rms(X[t],P.n1),q=mv(P.q,h,hq*hd),k=mv(P.k,h,hkv*hd),v=mv(P.v,h,hkv*hd);const qs=[],ks=[],vs=[];
        for(let a=0;a<hq;a++)qs.push(rope(rms(q.subarray(a*hd,(a+1)*hd),P.qn),t,hd,c.rope));
        for(let a=0;a<hkv;a++){ks.push(rope(rms(k.subarray(a*hd,(a+1)*hd),P.kn),t,hd,c.rope));vs.push(v.subarray(a*hd,(a+1)*hd))}
        Q.push(qs);K.push(ks);Vv.push(vs)}
      const LA=[];for(let a=0;a<hq;a++)LA.push([]);
      const Y=[];
      for(let t=0;t<T;t++){const cat=new Float64Array(hq*hd);
        for(let a=0;a<hq;a++){const g=Math.floor(a/rep),sc=new Float64Array(t+1);let mx=-Infinity;
          for(let s=0;s<=t;s++){let z=0;for(let i=0;i<hd;i++)z+=Q[t][a][i]*K[s][g][i];z/=Math.sqrt(hd);sc[s]=z;if(z>mx)mx=z}
          let sum=0;for(let s=0;s<=t;s++){sc[s]=Math.exp(sc[s]-mx);sum+=sc[s]}for(let s=0;s<=t;s++)sc[s]/=sum;
          LA[a].push(sc);
          for(let s=0;s<=t;s++){const w=sc[s],vv=Vv[s][g];for(let i=0;i<hd;i++)cat[a*hd+i]+=w*vv[i]}}
        const o=mv(P.o,cat,d),x=new Float64Array(d);for(let i=0;i<d;i++)x[i]=X[t][i]+o[i];Y.push(x)}
      if(keep)keep.att.push(LA);
      X=Y.map(x=>{const h=rms(x,P.n2),g=mv(P.g,h,c.ff),u=mv(P.up,h,c.ff),m=new Float64Array(c.ff);for(let i=0;i<c.ff;i++)m[i]=g[i]/(1+Math.exp(-g[i]))*u[i];const dn=mv(P.dn,m,d),o=new Float64Array(d);for(let i=0;i<d;i++)o[i]=x[i]+dn[i];return o})}
    return X.map(x=>{const h=rms(x,M.nf),o=new Float64Array(M.V);for(let r=0;r<M.V;r++){let s=0;for(let k=0;k<d;k++)s+=M.emb[r*d+k]*h[k];o[r]=s}return o})}
  const softmax=z=>{let m=-Infinity;for(const v of z)if(v>m)m=v;const e=Array.from(z,v=>Math.exp(v-m));const s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)};
  const argmax=z=>{let b=0;for(let i=1;i<z.length;i++)if(z[i]>z[b])b=i;return b};
  const IDX={};
  // decode(name, digits, mode 'think'|'default'|'nothink', budget (null = none), opts {rand}) -> trace
  // Same rules as train.batched_decode: the model writes <think>, thinking digits, </think>, then the answer;
  // when the thinking reaches the budget the page inserts </think> itself.
  function decode(name,q,mode,budget,opt){const M=load(name),W=window.TQW,V=W.vocab;if(!('<u>' in IDX))V.forEach((w,i)=>IDX[w]=i);
    const flag=mode==='think'?[IDX['/think']]:mode==='nothink'?[IDX['/no_think']]:[];
    const seq=[IDX['<u>'],...q,...flag,IDX['<a>']],start=seq.length;
    const out={prompt:seq.slice(),steps:[],think:[],cut:false,ans:null,bad:null,closed:false};let stage='open';
    for(let it=0;it<W.nmax+6;it++){
      if(stage==='thinking'&&budget!=null&&out.think.length>=budget){seq.push(IDX['</think>']);out.cut=true;out.steps.push({tok:IDX['</think>'],forced:true});stage='answer';continue}
      const lg=forward(M,seq),z=lg[lg.length-1],p=softmax(z);
      let t;if(opt&&opt.rand){const r=opt.rand();let a=0;t=p.length-1;for(let i=0;i<p.length;i++){a+=p[i];if(r<a){t=i;break}}}else t=argmax(z);
      seq.push(t);out.steps.push({tok:t,p:p[t],top:p});
      if(stage==='open'){if(t!==IDX['<think>']){out.bad='no <think>';break}stage='thinking'}
      else if(stage==='thinking'){if(t===IDX['</think>']){stage='answer';out.closed=true}else if(t<10)out.think.push(t);else{out.bad='bad token in thinking';break}}
      else if(stage==='answer'){out.ans=t<10?t:null;break}}
    out.seq=seq;out.start=start;return out}
  const psums=ds=>{const o=[];let s=0;for(const d of ds){s=(s+d)%10;o.push(s)}return o};
  return {load,forward,decode,softmax,psums,IDX}})();
if(typeof module!=='undefined')module.exports=TQ;
