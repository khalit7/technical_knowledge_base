// ---- The toy models' forward pass in plain JavaScript (mirrors train.py; checked against PyTorch by check_forward.py) ----
// Reads window.RFW (20_model_data.js). Exposes RF.load(variant) and RF.run(model, digits, {window, pi, offset}).
(function(g){
  const W=g.RFW;if(!W)return;
  const V=W.V,{d,h,dff}=W.cfg,dh=d/h,MAXLEN=W.maxlen,L1=W.lags[0],L2=W.lags[1],START=Math.max(L1,L2);
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',CI={};for(let i=0;i<64;i++)CI[B64[i]]=i;
  function half(u){const s=u>>15?-1:1,e=(u>>10)&31,f=u&1023;return e===0?s*f*2**-24:e===31?(f?NaN:s*Infinity):s*(1+f/1024)*2**(e-15)}
  function f16(b64){const bin=atob(b64),n=bin.length>>1,o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=half(bin.charCodeAt(2*i)|bin.charCodeAt(2*i+1)<<8);return o}
  // tensor names and shapes in train.py's tensor_order
  function order(kind){const t=[['emb',V,d]];if(kind==='learned')t.push(['pos',MAXLEN,d]);
    'qkvo'.split('').forEach(x=>{t.push([x+'.w',d,d],[x+'.b',d])});
    t.push(['w1.w',dff,d],['w1.b',dff],['w2.w',d,dff],['w2.b',d],['out.w',V,d],['out.b',V]);
    ['n1','n2','nf'].forEach(n=>t.push([n+'.g',d],[n+'.b',d]));return t}
  const cache={};
  function load(name){if(cache[name])return cache[name];const v=W.variants[name],P={};let mi=0,ri=0,vi=0,ti=0;const vec=f16(v.v);
    order(name).forEach(([n,r,c])=>{if(c){const a=new Float32Array(r*c),tm=v.tmax[ti++];for(let i=0;i<r;i++){const s=tm*2**(-CI[v.s[ri++]]/8)/31;for(let j=0;j<c;j++)a[i*c+j]=(CI[v.m[mi++]]-32)*s}P[n]=a}
      else{P[n]=vec.subarray(vi,vi+r);vi+=r}});
    if(mi!==v.m.length||vi!==vec.length)throw new Error('weights for '+name+' do not match the configuration');
    return cache[name]={name,P,lin:name.startsWith('lin'),rope:name==='rope'||name==='lin_rope'}}
  function lin(x,Wm,b,out,inn){const y=new Float64Array(out);for(let i=0;i<out;i++){let s=b[i];const o=i*inn;for(let j=0;j<inn;j++)s+=x[j]*Wm[o+j];y[i]=s}return y}
  function ln(x,gm,bt){let m=0;for(const v of x)m+=v;m/=x.length;let q=0;for(const v of x)q+=(v-m)*(v-m);q/=x.length;const r=1/Math.sqrt(q+1e-5),y=new Float64Array(x.length);for(let i=0;i<x.length;i++)y[i]=(x[i]-m)*r*gm[i]+bt[i];return y}
  // Vaswani et al.'s sinusoid (Equation 4 of RoFormer), over the model width
  function sinus(pos,j){const div=Math.pow(10000,(j-(j%2))/d);return j%2?Math.cos(pos/div):Math.sin(pos/div)}
  // Equation 34 on one head slice: pairs (x0,x1),(x2,x3)... rotated by pos*theta_i, theta_i = 10000^(-2i/dh)
  function rotate(x,o,pos){const y=x.slice(o,o+dh);for(let i=0;i<dh/2;i++){const a=pos*Math.pow(10000,-2*i/dh),c=Math.cos(a),s=Math.sin(a),x1=y[2*i],x2=y[2*i+1];y[2*i]=x1*c-x2*s;y[2*i+1]=x2*c+x1*s}return y}
  const elu1=v=>v>0?v+1:Math.exp(v);
  // opt.window: attend only to keys less than `window` positions back; opt.pi: multiply positions by pi (Position Interpolation)
  // opt.offset: place the sequence at absolute positions offset, offset+1, ... (the shift test)
  function run(M,ids,opt){opt=opt||{};const P=M.P,T=ids.length,off=opt.offset||0,pi=opt.pi||1,win=opt.window||0;
    if(M.name==='learned'&&off+T>MAXLEN)throw new Error('learned table has '+MAXLEN+' rows');
    const X=ids.map((id,t)=>{const x=new Float64Array(d),p=off+t;for(let j=0;j<d;j++)x[j]=P.emb[id*d+j]+(M.name==='sin'?sinus(p,j):M.name==='learned'?P.pos[p*d+j]:0);return x});
    const H=X.map(x=>ln(x,P['n1.g'],P['n1.b']));
    const Q=H.map(x=>lin(x,P['q.w'],P['q.b'],d,d)),K=H.map(x=>lin(x,P['k.w'],P['k.b'],d,d)),Vv=H.map(x=>lin(x,P['v.w'],P['v.b'],d,d));
    const att=[],raw=[],cat=X.map(()=>new Float64Array(d));
    for(let hh=0;hh<h;hh++){const o=hh*dk(),A=[],R=[];
      let q=Q.map(v=>v.slice(o,o+dh)),k=K.map(v=>v.slice(o,o+dh));
      if(M.lin){const fq=q.map(v=>v.map(elu1)),fk=k.map(v=>v.map(elu1));
        const rq=M.rope?fq.map((v,t)=>rotate(v,0,(off+t)*pi)):fq,rk=M.rope?fk.map((v,t)=>rotate(v,0,(off+t)*pi)):fk;
        for(let i=0;i<T;i++){const w=new Float64Array(T);let den=0;
          for(let j=0;j<=i;j++){if(win&&i-j>=win)continue;let s=0,n=0;for(let c=0;c<dh;c++){s+=fq[i][c]*fk[j][c];n+=rq[i][c]*rk[j][c]}den+=s;w[j]=n}
          for(let j=0;j<=i;j++)w[j]/=den;A.push(w);R.push(w)}}
      else{if(M.rope){q=q.map((v,t)=>rotate(v,0,(off+t)*pi));k=k.map((v,t)=>rotate(v,0,(off+t)*pi))}
        for(let i=0;i<T;i++){const lg=new Float64Array(T),sc=new Float64Array(T).fill(NaN);let mx=-Infinity;
          for(let j=0;j<T;j++){if(j>i||(win&&i-j>=win)){lg[j]=-Infinity;continue}let s=0;for(let c=0;c<dh;c++)s+=q[i][c]*k[j][c];s/=Math.sqrt(dh);sc[j]=s;lg[j]=s;if(s>mx)mx=s}
          let z=0;for(let j=0;j<T;j++){lg[j]=lg[j]===-Infinity?0:Math.exp(lg[j]-mx);z+=lg[j]}
          for(let j=0;j<T;j++)lg[j]/=z;A.push(lg);R.push(sc)}}
      for(let i=0;i<T;i++)for(let j=0;j<=i;j++){const a=A[i][j];if(a)for(let c=0;c<dh;c++)cat[i][o+c]+=a*Vv[j][o+c]}
      att.push(A);raw.push(R)}
    const logits=[],pred=[];
    for(let t=0;t<T;t++){const x=X[t].map((v,j)=>v+0);const ao=lin(cat[t],P['o.w'],P['o.b'],d,d);for(let j=0;j<d;j++)x[j]+=ao[j];
      const hd=lin(ln(x,P['n2.g'],P['n2.b']),P['w1.w'],P['w1.b'],dff,d).map(v=>v>0?v:0),f=lin(hd,P['w2.w'],P['w2.b'],d,dff);for(let j=0;j<d;j++)x[j]+=f[j];
      const lg=lin(ln(x,P['nf.g'],P['nf.b']),P['out.w'],P['out.b'],V,d);logits.push(lg);let b=0;for(let c=1;c<V;c++)if(lg[c]>lg[b])b=c;pred.push(b)}
    return {logits,pred,att,raw}}
  function dk(){return dh}
  const target=(ids,t)=>t<START?null:(ids[t-L1]+ids[t-L2])%V;
  g.RF={load,run,target,V,d,h,dh,START,L1,L2,MAXLEN,TRAIN:W.train_len,variants:Object.keys(W.variants),data:W};
})(typeof window!=='undefined'?window:globalThis);
