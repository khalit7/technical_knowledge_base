// ---- Pure computations behind the Reading visuals added on 2026-10-23 (no DOM; src/check_visuals.mjs runs them against src/visuals_ref.py) ----
// QV.hero(): one ordinary block of 32 real weights, INT4 with the per-tensor scale against its own scale.
// QV.rot(): the outlier slice (16 tokens x 64 channels, 8 output rows) before and after a 64 x 64 Hadamard rotation.
// QV.gptq(): GPTQ's column-by-column compensation on an illustrative 1 x 4 weight row (inputs below, labelled illustrative on the page).
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
  return {hero,rot,gptq,hadamard};
})();
