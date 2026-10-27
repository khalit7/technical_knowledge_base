// ---- The toy ViT's forward pass in plain JavaScript (mirrors train.py; check_forward.py checks it against PyTorch) ----
// Reads window.VITW (20_model_data.js). VIT.load(key) -> model; VIT.forward(model, img) -> {logits, probs, atts, tokens}.
(function(g){
  const W=g.VITW;if(!W)return;
  const {D,L,H,M,S,P,K}=W.cfg,GR=S/P,N=GR*GR,T=N+1,DH=D/H;
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',CI={};for(let i=0;i<64;i++)CI[B64[i]]=i;
  function half(u){const s=u>>15?-1:1,e=(u>>10)&31,f=u&1023;return e===0?s*f*2**-24:e===31?(f?NaN:s*Infinity):s*(1+f/1024)*2**(e-15)}
  function f16(b64){const bin=atob(b64),n=bin.length>>1,o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=half(bin.charCodeAt(2*i)|bin.charCodeAt(2*i+1)<<8);return o}
  function order(pe){const t=[['patch.weight',D,P*P],['patch.bias',D],['cls',D]];if(pe)t.push(['pos',T,D]);
    for(let i=0;i<L;i++){const p='blocks.'+i+'.';t.push([p+'n1.weight',D],[p+'n1.bias',D],[p+'qkv.weight',3*D,D],[p+'qkv.bias',3*D],[p+'o.weight',D,D],[p+'o.bias',D],
      [p+'n2.weight',D],[p+'n2.bias',D],[p+'m1.weight',M,D],[p+'m1.bias',M],[p+'m2.weight',D,M],[p+'m2.bias',D])}
    t.push(['nf.weight',D],['nf.bias',D],['head.weight',K,D],['head.bias',K]);return t}
  const cache={};
  function load(key){if(cache[key])return cache[key];const v=W.models[key],Pm={};let mi=0,ri=0,vi=0,ti=0;const vec=f16(v.v);
    order(v.pe).forEach(([n,r,c])=>{if(c){const a=new Float32Array(r*c),tm=v.tmax[ti++];for(let i=0;i<r;i++){const s=tm*2**(-CI[v.s[ri++]]/8)/31;for(let j=0;j<c;j++)a[i*c+j]=(CI[v.m[mi++]]-32)*s}Pm[n]=a}
      else{Pm[n]=vec.subarray(vi,vi+r);vi+=r}});
    if(mi!==v.m.length||vi!==vec.length)throw new Error('weights for '+key+' do not match the configuration');
    return cache[key]={key,pe:v.pe,n:v.n,P:Pm}}
  // y = x W^T + b for a (rows x cin) input
  function lin(x,rows,cin,w,b,cout){const y=new Float32Array(rows*cout);for(let r=0;r<rows;r++)for(let o=0;o<cout;o++){let s=b[o];const wo=o*cin,xr=r*cin;for(let i=0;i<cin;i++)s+=x[xr+i]*w[wo+i];y[r*cout+o]=s}return y}
  function ln(x,rows,gm,bt){const y=new Float32Array(rows*D);for(let r=0;r<rows;r++){let m=0,v=0;for(let i=0;i<D;i++)m+=x[r*D+i];m/=D;for(let i=0;i<D;i++){const d=x[r*D+i]-m;v+=d*d}v/=D;const s=1/Math.sqrt(v+1e-5);for(let i=0;i<D;i++)y[r*D+i]=(x[r*D+i]-m)*s*gm[i]+bt[i]}return y}
  const gelu=x=>.5*x*(1+Math.tanh(Math.sqrt(2/Math.PI)*(x+.044715*x*x*x)));
  // patches in raster order, each flattened row by row: patch (pr,pc) pixel (i,j) = img[(pr*P+i)*S + pc*P+j]
  function patches(img){const x=new Float32Array(N*P*P);for(let pr=0;pr<GR;pr++)for(let pc=0;pc<GR;pc++){const n=pr*GR+pc;for(let i=0;i<P;i++)for(let j=0;j<P;j++)x[n*P*P+i*P+j]=img[(pr*P+i)*S+pc*P+j]}return x}
  function forward(m,img){const Pm=m.P,e=lin(patches(img),N,P*P,Pm['patch.weight'],Pm['patch.bias'],D);
    let z=new Float32Array(T*D);z.set(Pm.cls,0);z.set(e,D);
    if(m.pe){const pos=Pm.pos;for(let i=0;i<T*D;i++)z[i]+=pos[i]}
    const z0=z.slice(),atts=[];
    for(let l=0;l<L;l++){const p='blocks.'+l+'.',h=ln(z,T,Pm[p+'n1.weight'],Pm[p+'n1.bias']),qkv=lin(h,T,D,Pm[p+'qkv.weight'],Pm[p+'qkv.bias'],3*D);
      const o=new Float32Array(T*D),al=[];
      for(let hd=0;hd<H;hd++){const A=new Float32Array(T*T);
        for(let i=0;i<T;i++){let mx=-1e30;for(let j=0;j<T;j++){let s=0;for(let d=0;d<DH;d++)s+=qkv[i*3*D+hd*DH+d]*qkv[j*3*D+D+hd*DH+d];s/=Math.sqrt(DH);A[i*T+j]=s;if(s>mx)mx=s}
          let su=0;for(let j=0;j<T;j++){const v=Math.exp(A[i*T+j]-mx);A[i*T+j]=v;su+=v}for(let j=0;j<T;j++)A[i*T+j]/=su;
          for(let d=0;d<DH;d++){let s=0;for(let j=0;j<T;j++)s+=A[i*T+j]*qkv[j*3*D+2*D+hd*DH+d];o[i*D+hd*DH+d]=s}}
        al.push(A)}
      atts.push(al);
      const ao=lin(o,T,D,Pm[p+'o.weight'],Pm[p+'o.bias'],D);for(let i=0;i<T*D;i++)z[i]+=ao[i];
      const h2=ln(z,T,Pm[p+'n2.weight'],Pm[p+'n2.bias']),m1=lin(h2,T,D,Pm[p+'m1.weight'],Pm[p+'m1.bias'],M);for(let i=0;i<m1.length;i++)m1[i]=gelu(m1[i]);
      const m2=lin(m1,T,M,Pm[p+'m2.weight'],Pm[p+'m2.bias'],D);for(let i=0;i<T*D;i++)z[i]+=m2[i]}
    const y=ln(z.subarray(0,D),1,Pm['nf.weight'],Pm['nf.bias']),logits=lin(y,1,D,Pm['head.weight'],Pm['head.bias'],K);
    const mx=Math.max(...logits),ex=[...logits].map(v=>Math.exp(v-mx)),su=ex.reduce((a,b)=>a+b,0);
    return {logits:[...logits],probs:ex.map(v=>v/su),atts,tokens:z0}}
  // attention rollout (Abnar and Zuidema 2020, as the paper's Appendix D.8): average heads, add the residual, renormalise, multiply through the layers
  function rollout(atts){let R=null;for(const al of atts){const A=new Float32Array(T*T);for(const a of al)for(let i=0;i<T*T;i++)A[i]+=a[i]/H;
      for(let i=0;i<T;i++){A[i*T+i]+=1;let s=0;for(let j=0;j<T;j++)s+=A[i*T+j];for(let j=0;j<T;j++)A[i*T+j]/=s}
      if(!R)R=A;else{const X=new Float32Array(T*T);for(let i=0;i<T;i++)for(let k=0;k<T;k++){const a=A[i*T+k];if(a)for(let j=0;j<T;j++)X[i*T+j]+=a*R[k*T+j]}R=X}}
    return R}
  // mean attention distance in pixels (paper Figure 7 right, Appendix D.7): patch-centre distance weighted by attention, over patch queries
  function attnDist(al){const out=[];for(const A of al){let s=0;for(let i=1;i<T;i++){const ri=Math.floor((i-1)/GR),ci=(i-1)%GR;let d=0,w=0;
        for(let j=1;j<T;j++){const rj=Math.floor((j-1)/GR),cj=(j-1)%GR;d+=A[i*T+j]*Math.hypot(ri-rj,ci-cj)*P;w+=A[i*T+j]}s+=d/w}out.push(s/N)}return out}
  // cosine similarity of the learned position embeddings (paper Figure 7 centre): patch q against every patch
  function posSim(m,q){const pos=m.P.pos;if(!pos)return null;const nrm=i=>{let s=0;for(let d=0;d<D;d++)s+=pos[i*D+d]**2;return Math.sqrt(s)};
    const a=q+1,na=nrm(a),out=[];for(let j=1;j<T;j++){let s=0;for(let d=0;d<D;d++)s+=pos[a*D+d]*pos[j*D+d];out.push(s/(na*nrm(j)))}return out}
  g.VIT={load,forward,rollout,attnDist,posSim,patches,cfg:{D,L,H,M,S,P,K,GR,N,T,DH},models:Object.keys(W.models)};
})(typeof window!=='undefined'?window:globalThis);
