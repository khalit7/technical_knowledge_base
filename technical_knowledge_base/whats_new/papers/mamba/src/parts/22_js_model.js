// ---- The toy models' forward pass in plain JavaScript (checked against PyTorch by check_forward.py) ----
// Mamba runs in recurrent mode, one token at a time, keeping only its fixed state (the SSM state h, D_inner x N per
// layer, and the last K-1 conv inputs): memory does not grow with the sequence, which is the paper's point.
(function(g){
  const W=g.MBW,C=W.cfg,D=C.D,DI=C.E*C.D,N=C.N,KC=C.KC,R=C.R,NL=C.LAYERS;
  const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',IDX={};for(let i=0;i<64;i++)IDX[B64[i]]=i;
  function half(u){const s=u>>15?-1:1,e=(u>>10)&31,f=u&1023;return e===0?s*f*2**-24:e===31?(f?NaN:s*Infinity):s*(1+f/1024)*2**(e-15)}
  function f16(b64){const bin=atob(b64),n=bin.length>>1,o=new Float64Array(n);for(let i=0;i<n;i++)o[i]=half(bin.charCodeAt(2*i)|bin.charCodeAt(2*i+1)<<8);return o}
  const cache={};
  function load(name){if(cache[name])return cache[name];const v=W.variants[name],P={};let mi=0,ri=0,vi=0,ti=0;const vec=f16(v.v);
    v.names.forEach(n=>{const sh=v.shapes[n],sz=sh.reduce((a,b)=>a*b,1);
      if(sh.length===2){const tm=v.tmax[ti++],rows=sh[0],cols=sh[1],a=new Float64Array(sz);
        for(let r=0;r<rows;r++){const s=tm*2**(-IDX[v.s[ri++]]/8)/31;for(let c=0;c<cols;c++)a[r*cols+c]=(IDX[v.m[mi++]]-32)*s}P[n]=a}
      else{P[n]=vec.subarray(vi,vi+sz);vi+=sz}});
    const M={name,P,kind:name.split('_')[1],task:name.split('_')[0],V:W.task[name.split('_')[0]].V};
    if(M.kind!=='attn'){M.A=[];for(let l=0;l<NL;l++){const al=P['blocks.'+l+'.A_log'],a=new Float64Array(DI*N);for(let i=0;i<DI*N;i++)a[i]=-Math.exp(al[i]);M.A.push(a)}}
    return cache[name]=M}
  const softplus=x=>x>20?x:Math.log1p(Math.exp(x)),silu=x=>x/(1+Math.exp(-x));
  function rms(x,w){let q=0;for(const v of x)q+=v*v;const r=1/Math.sqrt(q/x.length+1e-5),y=new Float64Array(x.length);for(let i=0;i<x.length;i++)y[i]=x[i]*r*w[i];return y}
  function mv(Wm,x,rows,cols,off){const y=new Float64Array(rows);for(let i=0;i<rows;i++){let s=0;const o=(i+(off||0))*cols;for(let j=0;j<cols;j++)s+=Wm[o+j]*x[j];y[i]=s}return y}
  function logits(M,h){const P=M.P,hf=rms(h,P['nf.weight']);return mv(P['emb.weight'],hf,M.V,D)}
  // A recurrent Mamba state: per layer the SSM state and the conv buffer.
  function mstate(){const S=[];for(let l=0;l<NL;l++)S.push({h:new Float64Array(DI*N),buf:new Float64Array((KC-1)*DI)});return S}
  // One token through the model; returns the residual stream, and per layer the mean Delta and (if want) the state.
  function mstep(M,S,tok,want){const P=M.P,sel=M.kind==='s6';let h=P['emb.weight'].slice(tok*D,tok*D+D);const info=[];
    for(let l=0;l<NL;l++){const p='blocks.'+l+'.',st=S[l],u=rms(h,P['norms.'+l+'.weight']);
      const xz=mv(P[p+'in_proj.weight'],u,2*DI,D),cw=P[p+'conv.weight'],cb=P[p+'conv.bias'],x=new Float64Array(DI);
      for(let c=0;c<DI;c++){let s=cb[c];for(let k=0;k<KC-1;k++)s+=cw[c*KC+k]*st.buf[k*DI+c];s+=cw[c*KC+KC-1]*xz[c];x[c]=silu(s)}
      for(let k=0;k<KC-2;k++)for(let c=0;c<DI;c++)st.buf[k*DI+c]=st.buf[(k+1)*DI+c];for(let c=0;c<DI;c++)st.buf[(KC-2)*DI+c]=xz[c];
      let dl,Bv,Cv;
      if(sel){const dbc=mv(P[p+'x_proj.weight'],x,R+2*N,DI),dt=dbc.subarray(0,R);Bv=dbc.subarray(R,R+N);Cv=dbc.subarray(R+N,R+2*N);
        const dw=P[p+'dt_proj.weight'],db=P[p+'dt_proj.bias'];dl=new Float64Array(DI);for(let c=0;c<DI;c++){let s=db[c];for(let r=0;r<R;r++)s+=dw[c*R+r]*dt[r];dl[c]=softplus(s)}}
      else{const b=P[p+'dt_bias'];dl=new Float64Array(DI);for(let c=0;c<DI;c++)dl[c]=softplus(b[c])}
      const A=M.A[l],Ds=P[p+'Dskip'],y=new Float64Array(DI),Bp=P[p+'Bp'],Cp=P[p+'Cp'];
      for(let c=0;c<DI;c++){let s=0;const o=c*N;for(let n=0;n<N;n++){const bb=sel?Bv[n]:Bp[o+n],cc=sel?Cv[n]:Cp[o+n];
          const hv=Math.exp(dl[c]*A[o+n])*st.h[o+n]+dl[c]*bb*x[c];st.h[o+n]=hv;s+=hv*cc}
        y[c]=(s+Ds[c]*x[c])*silu(xz[DI+c])}
      const o=mv(P[p+'out_proj.weight'],y,D,DI);for(let i=0;i<D;i++)h[i]+=o[i];
      if(want){let m=0;for(const v of dl)m+=v;info.push({delta:dl,mean:m/DI,h:st.h.slice()})}}
    return {h,info}}
  // Whole sequence. opt.at: positions whose logits are wanted (default all); opt.want: per-step Delta and states.
  function runMamba(M,ids,opt){opt=opt||{};const S=mstate(),out={logits:[],steps:[]},at=opt.at?new Set(opt.at):null;
    for(let t=0;t<ids.length;t++){const r=mstep(M,S,ids[t],opt.want);if(!at||at.has(t))out.logits[t]=logits(M,r.h);if(opt.want)out.steps.push(r.info)}
    return out}
  function rope(v,pos,dh){const y=v.slice();for(let i=0;i<dh/2;i++){const a=pos*Math.pow(10000,-2*i/dh),c=Math.cos(a),s=Math.sin(a),x1=v[2*i],x2=v[2*i+1];y[2*i]=x1*c-x2*s;y[2*i+1]=x2*c+x1*s}return y}
  function runAttn(M,ids,opt){opt=opt||{};const P=M.P,T=ids.length,H=C.H,dh=D/H,FF=C.FF,at=opt.at?new Set(opt.at):null;
    let hs=[];for(let t=0;t<T;t++)hs.push(P['emb.weight'].slice(ids[t]*D,ids[t]*D+D));const atts=[];
    for(let l=0;l<NL;l++){const Q=[],K=[],Vv=[];
      for(let t=0;t<T;t++){const qkv=mv(P['qkv.'+l+'.weight'],rms(hs[t],P['n1.'+l+'.weight']),3*D,D);Q.push([]);K.push([]);Vv.push([]);
        for(let a=0;a<H;a++){Q[t].push(rope(qkv.subarray(a*dh,a*dh+dh),t,dh));K[t].push(rope(qkv.subarray(D+a*dh,D+a*dh+dh),t,dh));Vv[t].push(qkv.subarray(2*D+a*dh,2*D+a*dh+dh))}}
      const A=opt.want?[]:null,sc=1/Math.sqrt(dh),nh=[];
      for(let t=0;t<T;t++){const o=new Float64Array(D),lastLayer=l===NL-1;
        if(lastLayer&&at&&!at.has(t)){nh.push(hs[t]);continue}
        const row=opt.want?[]:null;
        for(let a=0;a<H;a++){const q=Q[t][a],s=new Float64Array(t+1);let m=-1e300;for(let u=0;u<=t;u++){let d=0;const k=K[u][a];for(let i=0;i<dh;i++)d+=q[i]*k[i];s[u]=d*sc;if(s[u]>m)m=s[u]}
          let z=0;for(let u=0;u<=t;u++){s[u]=Math.exp(s[u]-m);z+=s[u]}for(let u=0;u<=t;u++){s[u]/=z;const v=Vv[u][a];for(let i=0;i<dh;i++)o[a*dh+i]+=s[u]*v[i]}
          if(row)row.push(s)}
        if(A)A.push(row);
        const pr=mv(P['o.'+l+'.weight'],o,D,D),x=hs[t].slice();for(let i=0;i<D;i++)x[i]+=pr[i];
        const g12=mv(P['w12.'+l+'.weight'],rms(x,P['n2.'+l+'.weight']),2*FF,D),hid=new Float64Array(FF);for(let i=0;i<FF;i++)hid[i]=silu(g12[i])*g12[FF+i];
        const f3=mv(P['w3.'+l+'.weight'],hid,D,FF);for(let i=0;i<D;i++)x[i]+=f3[i];nh.push(x)}
      hs=nh;if(A)atts.push(A)}
    const out={logits:[],att:atts};for(let t=0;t<T;t++)if(!at||at.has(t))out.logits[t]=logits(M,hs[t]);return out}
  function run(M,ids,opt){return M.kind==='attn'?runAttn(M,ids,opt):runMamba(M,ids,opt)}
  const argmax=a=>{let b=0;for(let i=1;i<a.length;i++)if(a[i]>a[b])b=i;return b};
  // Task generators (as train.py), seeded so the page and the checks draw the same sequences.
  function makeSC(rnd,ctx){const t=W.task.sc,K=t.K;ctx=ctx||t.CTX;const pos=[...Array(ctx).keys()];for(let i=ctx-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[pos[i],pos[j]]=[pos[j],pos[i]]}
    const P=pos.slice(0,K).sort((a,b)=>a-b),x=new Array(ctx+K).fill(t.NOISE),tok=[];P.forEach(p=>{const v=1+Math.floor(rnd()*8);x[p]=v;tok.push(v)});for(let i=0;i<K;i++)x[ctx+i]=t.MARK;return {x,y:tok,pos:P}}
  function makeIH(rnd,L){const t=W.task.ih;L=L||t.L;const x=new Array(L);for(let i=0;i<L;i++)x[i]=Math.floor(rnd()*15);const p=Math.floor(rnd()*(L-2)),a=Math.floor(rnd()*15);x[p]=t.TRIG;x[p+1]=a;x[L-1]=t.TRIG;return {x,y:a,p}}
  g.MB={load,run,runMamba,runAttn,mstate,mstep,argmax,makeSC,makeIH,cfg:C}})(typeof window!=='undefined'?window:globalThis);
