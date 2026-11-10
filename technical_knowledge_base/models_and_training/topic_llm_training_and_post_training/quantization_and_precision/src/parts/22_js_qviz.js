// ---- Pure computations behind the Reading visuals added on 2026-10-23 (no DOM; src/check_visuals.mjs runs them against src/visuals_ref.py) ----
// QV.hero(): one ordinary block of 32 real weights, INT4 with the per-tensor scale against its own scale.
// QV.rot(): the outlier slice (16 tokens x 64 channels, 8 output rows) before and after a 64 x 64 Hadamard rotation.
// QV.gptq(): GPTQ's column-by-column compensation on an illustrative 1 x 4 weight row (inputs below, labelled illustrative on the page).
// QV.scope() (2026-11-10): the four shipped rows, input columns 0 to 63, under five scopes (Fig. 2's stage).
// QV.mig(mode, alpha) (2026-11-10): SmoothQuant and AWQ on the outlier slice, each against its plain method (Fig. 4's stage and the migration widget).
window.QV=(function(){
  const QF=window.QF,D=window.QD;
  const amax=a=>{let m=0;for(const x of a)m=Math.max(m,Math.abs(x));return m};
  // ---------- hero ----------
  function hero(){
    const R=QF.bf16(D.rows_bf16),K=D.K,ri=D.rows.indexOf(0),v=R.slice(ri*K,ri*K+32);
    const t=QF.qgroup(v,'int4',{amax:D.w_absmax}),b=QF.qgroup(v,'int4',{});
    const z=q=>q.filter((x,i)=>x===0&&v[i]!==0).length;
    return {v,row:0,tq:t.q,bq:b.q,tscale:t.info.scale,bscale:b.info.scale,tzero:z(t.q),bzero:z(b.q),terr:QF.relerr(t.q,v),berr:QF.relerr(b.q,v),bamax:amax(v)};
  }
  // ---------- rotation ----------
  function slice(){const S=D.slice,xf=QF.f32(S.x_f32),wf=QF.bf16(S.w_bf16),X=[],W=[];
    for(let t=0;t<16;t++)X.push(xf.slice(t*64,(t+1)*64));for(let o=0;o<8;o++)W.push(wf.slice(o*64,(o+1)*64));return {X,W}}
  function hadamard(n){let H=[[1]];while(H.length<n){const m=H.length,N=[];for(let i=0;i<2*m;i++){N.push([]);for(let j=0;j<2*m;j++)N[i].push(H[i%m][j%m]*((i>=m&&j>=m)?-1:1))}H=N}
    const s=1/Math.sqrt(n);return H.map(r=>r.map(x=>x*s))}
  const mul=(A,B)=>A.map(r=>B[0].map((_,j)=>{let s=0;for(let k=0;k<r.length;k++)s+=r[k]*B[k][j];return s}));
  const tr=A=>A[0].map((_,j)=>A.map(r=>r[j]));
  const rel=(A,B)=>{let n=0,d=0;for(let i=0;i<A.length;i++)for(let j=0;j<A[i].length;j++){n+=(A[i][j]-B[i][j])**2;d+=B[i][j]**2}return Math.sqrt(n/d)};
  // symmetric absmax per row (per token for X): 2^(b-1)-1 levels each side
  const qrow=(A,bits)=>A.map(r=>{const qm=Math.pow(2,bits-1)-1;let s=amax(r)/qm;if(s===0)s=1;return r.map(x=>Math.max(-qm,Math.min(qm,QF.rne(x/s)))*s)});
  function rot(){
    const {X,W}=slice(),Y=mul(X,tr(W)),H=hadamard(64),out={};
    for(const k of ['plain','hadamard']){
      const Xr=k==='plain'?X:mul(X,H),Wr=k==='plain'?W:mul(W,H);
      const chmax=Xr[0].map((_,c)=>amax(Xr.map(r=>r[c]))),srt=chmax.slice().sort((a,b)=>a-b),med=(srt[31]+srt[32])/2;
      let pd=0;const Yr=mul(Xr,tr(Wr));for(let i=0;i<16;i++)for(let j=0;j<8;j++)pd=Math.max(pd,Math.abs(Yr[i][j]-Y[i][j]));
      const X4=qrow(Xr,4),W4=qrow(Wr,4),X8=qrow(Xr,8);
      out[k]={X:Xr,xmax:amax(Xr.flat()),med,ratio:amax(Xr.flat())/med,prodDiff:pd,
        a4:rel(mul(X4,tr(Wr)),Y),w4a4:rel(mul(X4,tr(W4)),Y),a8:rel(mul(X8,tr(Wr)),Y),x4err:rel(X4,Xr),X4}}
    return out}
  // ---------- GPTQ on one illustrative row ----------
  const G={w:[0.60,-0.88,-0.76,0.20],step:0.25,
    X:[[1.0,0.9,0.2,-0.3],[0.8,1.0,-0.1,0.4],[-0.6,-0.7,0.5,0.1],[0.3,0.2,0.9,-0.8],[-1.0,-0.8,-0.3,0.2],[0.5,0.6,0.7,0.6]],damp:0.01};
  function inv(A){const n=A.length,M=A.map((r,i)=>r.concat(r.map((_,j)=>i===j?1:0)));
    for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;[M[c],M[p]]=[M[p],M[c]];
      const d=M[c][c];for(let j=0;j<2*n;j++)M[c][j]/=d;for(let r=0;r<n;r++)if(r!==c){const f=M[r][c];for(let j=0;j<2*n;j++)M[r][j]-=f*M[c][j]}}
    return M.map(r=>r.slice(n))}
  function cholUpper(A){const n=A.length,L=A.map(r=>r.map(()=>0));
    for(let i=0;i<n;i++)for(let j=0;j<=i;j++){let s=A[i][j];for(let k=0;k<j;k++)s-=L[i][k]*L[j][k];L[i][j]=i===j?Math.sqrt(s):s/L[j][j]}
    return tr(L)}
  function gptq(){
    const X=G.X,n=4,q=x=>QF.rne(x/G.step)*G.step;
    const H=mul(tr(X),X).map(r=>r.map(x=>2*x));let md=0;for(let i=0;i<n;i++)md+=H[i][i]/n;for(let i=0;i<n;i++)H[i][i]+=G.damp*md;
    const U=cholUpper(inv(H));
    const w=G.w.slice(),Q=[0,0,0,0],states=[{cur:w.slice(),q:[],moved:[0,0,0,0]}];
    for(let j=0;j<n;j++){Q[j]=q(w[j]);const e=(w[j]-Q[j])/U[j][j];const before=w.slice();for(let k=j+1;k<n;k++)w[k]-=e*U[j][k];
      states.push({cur:w.slice(),q:Q.slice(0,j+1),moved:w.map((x,k)=>x-before[k]),err:before[j]-Q[j]})}
    const rtn=G.w.map(q);
    const oerr=qq=>{let n2=0,d2=0;for(const x of X){let a=0,b=0;for(let k=0;k<n;k++){a+=x[k]*(qq[k]-G.w[k]);b+=x[k]*G.w[k]}n2+=a*a;d2+=b*b}return Math.sqrt(n2/d2)};
    const werr=qq=>Math.sqrt(qq.reduce((s,x,k)=>s+(x-G.w[k])**2,0)/G.w.reduce((s,x)=>s+x*x,0));
    return {G,U,states,Q,rtn,outRTN:oerr(rtn),outGPTQ:oerr(Q),wRTN:werr(rtn),wGPTQ:werr(Q)};
  }

  // ---------- Fig. 2: four real rows x 64 input columns under five scopes ----------
  // display order front to back: the two rows holding the layer's largest weights (input column 5), then two ordinary rows
  const SCOPES=[{k:'tensor',n:'INT4, one scale per tensor',kind:'int4',g:0,bpw:4},{k:'row',n:'INT4, one scale per row',kind:'int4',g:0,bpw:4+16/896},
    {k:'b32',n:'INT4, one scale per 32',kind:'int4',g:32,bpw:4.5},{k:'mx',n:'MXFP4, a power-of-two scale per 32',kind:'mxfp4',g:32,bpw:4.25},
    {k:'nv',n:'NVFP4, an FP8 scale per 16',kind:'nvfp4',g:16,bpw:4.5}];
  function scope(){
    const R=QF.bf16(D.rows_bf16),K=D.K,C=64,order=[223,222,448,0];
    const rows=order.map(r=>{const i=D.rows.indexOf(r),w=R.slice(i*K,(i+1)*K);return {r,w:w.slice(0,C),rowAmax:amax(w)}});
    const sc=SCOPES.map(m=>({...m,rows:rows.map(row=>{const v=row.w,q=[],groups=[];let clipped=0;
      const gs=m.g||C;for(let c0=0;c0<C;c0+=gs){const seg=v.slice(c0,c0+gs);
        const ctx={tensorAmax:D.w_absmax};if(m.k==='tensor')ctx.amax=D.w_absmax;else if(m.k==='row')ctx.amax=row.rowAmax;
        const r=QF.qgroup(seg,m.kind,ctx);q.push(...r.q);clipped+=r.info.clipped||0;
        let mi=0;seg.forEach((x,i)=>{if(Math.abs(x)>Math.abs(seg[mi]))mi=i});
        groups.push({c0,c1:c0+gs-1,amax:m.k==='tensor'?D.w_absmax:m.k==='row'?row.rowAmax:amax(seg),at:m.g?c0+mi:-1,scale:r.info.scale,clipped:r.info.clipped||0,err:QF.relerr(r.q,seg)})}
      return {q,groups,clipped,err:QF.relerr(q,v),zeros:q.filter((x,i)=>x===0&&v[i]!==0).length}})}));
    return {rows,C,scopes:sc,wmax:D.w_absmax};
  }
  // ---------- Fig. 4 and the migration widget: SmoothQuant (W8A8) and AWQ (INT4 weights) on the outlier slice ----------
  // w8: activations INT8 per tensor with a static scale from the calibration maximum, weights INT8 per output channel; sq: the same after smoothing
  // w4: weights INT4 asymmetric, one group per row of the slice; awq: the same after AWQ's scaling. The product of the smoothed X and W equals XW^T before rounding.
  function mig(mode,alpha){
    const S=D.slice,{X,W}=slice(),C=64,isTop=S.chans.map(c=>S.top.indexOf(c)>=0),sm=mode==='sq'||mode==='awq',pair=mode==='w8'||mode==='sq'?'sq':'awq';
    let s=new Array(C).fill(1);
    if(sm&&pair==='sq')s=S.xc_max.map((x,c)=>Math.pow(x,alpha)/Math.pow(S.w_colmax[c],1-alpha));
    if(sm&&pair==='awq'){s=S.xc_mean.map(x=>Math.pow(x,alpha));const mx=Math.max(...s),mn=Math.min(...s),k=Math.sqrt(mx*mn);s=s.map(x=>x/k)}
    const Xs=X.map(r=>r.map((x,c)=>x/s[c])),Ws=W.map(r=>r.map((w,c)=>w*s[c])),Y=mul(X,tr(W));
    let Xq=Xs,Wq,dx=0;
    if(pair==='sq'){dx=Math.max(...S.xc_max.map((x,c)=>x/s[c]))/127;Xq=Xs.map(r=>r.map(x=>Math.max(-127,Math.min(127,QF.rne(x/dx)))*dx));Wq=Ws.map(r=>QF.qint(r,8,true))}
    else Wq=Ws.map(r=>QF.qint(r,4,false));
    const Wd=Wq.map(r=>r.map((w,c)=>w/s[c])),Xd=Xq.map(r=>r.map((x,c)=>x*s[c]));
    let coarse=0,n=0;if(pair==='sq')for(const r of Xs)for(const x of r){n++;if(Math.abs(x)<4*dx)coarse++}
    let eT=0,dT=0,eR=0,dR=0;for(let o=0;o<W.length;o++)for(let c=0;c<C;c++){const e=(Wd[o][c]-W[o][c])**2*(S.xc_mean[c]**2),d=(W[o][c]**2)*(S.xc_mean[c]**2);if(isTop[c]){eT+=e;dT+=d}else{eR+=e;dR+=d}}
    let pd=0;const Ys=mul(Xs,tr(Ws));for(let i=0;i<Y.length;i++)for(let j=0;j<Y[0].length;j++)pd=Math.max(pd,Math.abs(Ys[i][j]-Y[i][j]));
    const colmax=A=>A[0].map((_,c)=>amax(A.map(r=>r[c])));
    return {mode,alpha,s,X,W,Xs,Ws,Xq,Wq,isTop,err:rel(mul(Xd,tr(Wd)),Y),dx,coarse:n?coarse/n:0,eTop:Math.sqrt(eT/dT),eRest:Math.sqrt(eR/dR),
      xmax:amax(Xs.flat()),wmax:amax(Ws.flat()),xcol:colmax(Xs),wcol:colmax(Ws),prodDiff:pd};
  }
  return {hero,rot,gptq,hadamard,scope,mig,SCOPES};
})();
