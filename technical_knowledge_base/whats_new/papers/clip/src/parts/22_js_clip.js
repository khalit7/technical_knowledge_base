// ---- The toy CLIP's forward pass in plain JavaScript (mirrors train.py; check_forward.py checks it against PyTorch) ----
// Reads window.CLIPW (20_model_data.js). CLIP.image(img) -> {f, e, atts}; CLIP.text(str) -> {e, ids, atts}; CLIP.scale.
(function(g){
  const W=g.CLIPW;if(!W)return;
  const {D,L,H,M,E,S,P,LMAX}=W.cfg,GR=S/P,N=GR*GR,T=N+1,DH=D/H,G=g.TOYGEN;
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',CI={};for(let i=0;i<64;i++)CI[B64[i]]=i;
  function half(u){const s=u>>15?-1:1,e=(u>>10)&31,f=u&1023;return e===0?s*f*2**-24:e===31?(f?NaN:s*Infinity):s*(1+f/1024)*2**(e-15)}
  function f16(b64){const bin=atob(b64),n=bin.length>>1,o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=half(bin.charCodeAt(2*i)|bin.charCodeAt(2*i+1)<<8);return o}
  const Pm={};(function(){let mi=0,ri=0,vi=0,ti=0;const vec=f16(W.v);
    W.shapes.forEach(([n,r,c])=>{if(c!=null){const a=new Float32Array(r*c),tm=W.tmax[ti++];for(let i=0;i<r;i++){const s=tm*2**(-CI[W.s[ri++]]/8)/31;for(let j=0;j<c;j++)a[i*c+j]=(CI[W.m[mi++]]-32)*s}Pm[n]=a}
      else{const k=r==null?1:r;Pm[n]=vec.subarray(vi,vi+k);vi+=k}});
    if(mi!==W.m.length||vi!==vec.length)throw new Error('CLIP weights do not match the configuration')})();
  const scale=Math.min(100,Math.exp(Pm.t[0]));
  function lin(x,rows,cin,w,b,cout){const y=new Float32Array(rows*cout);for(let r=0;r<rows;r++)for(let o=0;o<cout;o++){let s=b?b[o]:0;const wo=o*cin,xr=r*cin;for(let i=0;i<cin;i++)s+=x[xr+i]*w[wo+i];y[r*cout+o]=s}return y}
  function ln(x,rows,gm,bt){const y=new Float32Array(rows*D);for(let r=0;r<rows;r++){let m=0,v=0;for(let i=0;i<D;i++)m+=x[r*D+i];m/=D;for(let i=0;i<D;i++){const d=x[r*D+i]-m;v+=d*d}v/=D;const s=1/Math.sqrt(v+1e-5);for(let i=0;i<D;i++)y[r*D+i]=(x[r*D+i]-m)*s*gm[i]+bt[i]}return y}
  const gelu=x=>.5*x*(1+Math.tanh(Math.sqrt(2/Math.PI)*(x+.044715*x*x*x)));
  // one pre-LN block on z (n x D), in place; causal masks future positions; returns the attention maps per head
  function block(z,n,p,causal){const h=ln(z,n,Pm[p+'n1.weight'],Pm[p+'n1.bias']),qkv=lin(h,n,D,Pm[p+'qkv.weight'],Pm[p+'qkv.bias'],3*D),o=new Float32Array(n*D),al=[];
    for(let hd=0;hd<H;hd++){const A=new Float32Array(n*n);
      for(let i=0;i<n;i++){let mx=-1e30;const jn=causal?i+1:n;for(let j=0;j<jn;j++){let s=0;for(let d=0;d<DH;d++)s+=qkv[i*3*D+hd*DH+d]*qkv[j*3*D+D+hd*DH+d];s/=Math.sqrt(DH);A[i*n+j]=s;if(s>mx)mx=s}
        let su=0;for(let j=0;j<jn;j++){const v=Math.exp(A[i*n+j]-mx);A[i*n+j]=v;su+=v}for(let j=0;j<jn;j++)A[i*n+j]/=su;
        for(let d=0;d<DH;d++){let s=0;for(let j=0;j<jn;j++)s+=A[i*n+j]*qkv[j*3*D+2*D+hd*DH+d];o[i*D+hd*DH+d]=s}}
      al.push(A)}
    const ao=lin(o,n,D,Pm[p+'o.weight'],Pm[p+'o.bias'],D);for(let i=0;i<n*D;i++)z[i]+=ao[i];
    const h2=ln(z,n,Pm[p+'n2.weight'],Pm[p+'n2.bias']),m1=lin(h2,n,D,Pm[p+'m1.weight'],Pm[p+'m1.bias'],M);for(let i=0;i<m1.length;i++)m1[i]=gelu(m1[i]);
    const m2=lin(m1,n,M,Pm[p+'m2.weight'],Pm[p+'m2.bias'],D);for(let i=0;i<n*D;i++)z[i]+=m2[i];
    return al}
  const norm=v=>{let s=0;for(const x of v)s+=x*x;s=Math.sqrt(s)||1;return v.map(x=>x/s)};
  // patches in raster order, each flattened row by row with RGB interleaved (as train.py ImageEnc.patches)
  function patches(img){const C=P*P*3,x=new Float32Array(N*C);for(let pr=0;pr<GR;pr++)for(let pc=0;pc<GR;pc++){const n=pr*GR+pc;
    for(let i=0;i<P;i++)for(let j=0;j<P;j++)for(let c=0;c<3;c++)x[n*C+(i*P+j)*3+c]=img[((pr*P+i)*S+pc*P+j)*3+c]}return x}
  const icache=new Map();
  function image(img,key){if(key!=null&&icache.has(key))return icache.get(key);
    const e0=lin(patches(img),N,P*P*3,Pm['img.patch.weight'],Pm['img.patch.bias'],D);let z=new Float32Array(T*D);z.set(Pm['img.cls'],0);z.set(e0,D);
    for(let i=0;i<T*D;i++)z[i]+=Pm['img.pos'][i];
    z=ln(z,T,Pm['img.lnpre.weight'],Pm['img.lnpre.bias']);const atts=[];
    for(let l=0;l<L;l++)atts.push(block(z,T,'img.blocks.'+l+'.',false));
    const f=ln(z.subarray(0,D),1,Pm['img.lnpost.weight'],Pm['img.lnpost.bias']),e=norm(lin(f,1,D,Pm['wi.weight'],null,E));
    const r={f,e,atts};if(key!=null){if(icache.size>400)icache.clear();icache.set(key,r)}return r}
  const tcache=new Map();
  function text(str){if(tcache.has(str))return tcache.get(str);const ids=G.tokens(str),n=ids.length;let z=new Float32Array(n*D);
    for(let t=0;t<n;t++)for(let i=0;i<D;i++)z[t*D+i]=Pm['txt.emb.weight'][ids[t]*D+i]+Pm['txt.pos'][t*D+i];
    const atts=[];for(let l=0;l<L;l++)atts.push(block(z,n,'txt.blocks.'+l+'.',true));
    z=ln(z,n,Pm['txt.lnf.weight'],Pm['txt.lnf.bias']);
    const e=norm(lin(z.subarray((n-1)*D,n*D),1,D,Pm['wt.weight'],null,E)),r={e,ids,atts,n};tcache.set(str,r);return r}
  const dot=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s};
  // a zero-shot classifier: one weight row per class, the mean of its prompts' text embeddings, renormalised (section 3.1.4)
  function classifier(classes,templates){return classes.map(c=>{const v=new Float32Array(E);templates.forEach(t=>{const e=text(t.replace('{}',c)).e;for(let i=0;i<E;i++)v[i]+=e[i]});return norm(v)})}
  function softmax(z){const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)}
  g.CLIP={image,text,classifier,dot,softmax,scale,E,D,P:Pm,cfg:W.cfg,templates:W.templates};
})(typeof window!=='undefined'?window:globalThis);
