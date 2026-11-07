// ---- Scene: Fig. 11, Eckart-Young on a real matrix: GPT-2's 9 x 9 embedding-cosine matrix rebuilt from rank-one layers (renderer v2) ----
// C = LA_DATA.emb_cos (section 1's table). It is symmetric positive definite, so its SVD is its eigendecomposition: C = sum_i sigma_i u_i u_i^T.
// The eigenvectors and errors are computed here by Jacobi (LA.symEig) and in recompute.py (lr_sv, lr_err_fro, lr_err_rel, lr_u).
(function(){
  if(!document.getElementById('stg-lr')||!window.LA_DATA)return;const {at,off,lerp,mix}=S3;
  const D=LA_DATA,C=D.emb_cos,w=D.emb_words,n=w.length,E=LA.symEig(C),sv=E.vals,U=E.vecs.map(u=>{const s=Math.sign(u.reduce((a,b)=>a+b,0))||1;return u.map(v=>v*s)});
  const Ck=k=>C.map((r,i)=>r.map((_,j)=>{let s=0;for(let l=0;l<k;l++)s+=sv[l]*U[l][i]*U[l][j];return s}));
  const fro=M=>Math.sqrt(M.flat().reduce((a,v)=>a+v*v,0)),nC=fro(C);
  const err=k=>{const M=Ck(k);return fro(C.map((r,i)=>r.map((v,j)=>v-M[i][j])))};
  const CS=.52,HB=1.05,px=j=>(j-(n-1)/2)*CS,pz=i=>(i-(n-1)/2)*CS,UX=px(n-1)+1.05;
  window.LA_LR={sv,err:[1,2,3,4,5,6,7,8,9].map(err),nC}; // read by check_page.mjs
  function field(R,M,a,col,o){o=o||{};for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=M[i][j],h=Math.max(.012,Math.abs(v)*HB);
    R.box([px(j),v>=0?0:-h,pz(i)],[CS*.74,h,CS*.74],{fill:i===j?mix(P0(R),col,.25):col,a,shadow:false,lw:.6,fa:o.fa})}}
  const P0=R=>R.P.paper;
  function draw(R,k,e){const P=R.P;R.grid(-4,4,-3.4,3.6,.5);
    const target=k===0?1:.13,colC=mix(P.paper,P.c1,.35),colK=mix(P.paper,P.c3,.55);
    // the real matrix: full at step 1, then a faint ghost the layers are rebuilding
    if(k===0)field(R,C,1,colC);else if(k===1)field(R,C,lerp(1,target,Math.min(1,e*1.5)),colC,{fa:.6});else field(R,C,target,colC,{fa:.6});
    // the rebuild C_k: grows from zero at step 2, then each step adds a layer
    if(k>=1){const kk=Math.min(k,3),M0=k===1?C.map(r=>r.map(()=>0)):Ck(kk-1),M1=Ck(kk),t=k>=4?1:(k===1?Math.max(0,e*1.4-.4):e),M=M0.map((r,i)=>r.map((v,j)=>lerp(v,M1[i][j],t)));field(R,M,1,colK)}
    // the layer's vector u_k as signed bars on a white plinth beside the rows, and flows into the cells it changes most
    if(k>=1&&k<=3){const u=U[k-1],a=Math.min(1,e*2);R.box([UX,.5,0],[.34,.04,n*CS+.1],{a,shadow:false});
      u.forEach((v,i)=>{const h=Math.max(.012,Math.abs(v)*1.1);R.box([UX,v>=0?.54:.5-h,pz(i)],[.2,h,CS*.6],{fill:v>=0?P.c3:mix(P.paper,P.c2,.6),a,shadow:false,lw:.6})});
      R.label([UX,.5+1.1*Math.max(...u.map(Math.abs))+.1,pz(0)],'u'+['₁','₂','₃'][k-1]+' · σ'+['₁','₂','₃'][k-1]+' = '+sv[k-1].toFixed(3),{mono:true,fs:12.5,b:1,c:P.c3,dy:-10,a,wide:1});
      u.forEach((v,i)=>{if(Math.abs(v)<.3)return;R.flowArc([UX,.6,pz(i)],[px(i),Math.abs(Ck(k)[i][i])*HB+.05,pz(i)],.6,{c:v>=0?P.c3:P.c2,a:a*.85,r:.05,n:5,speed:1.3})})}
    // labels: words along the rows and the columns
    w.forEach((x,i)=>{R.label([px(0)-CS*.6,0,pz(i)],x,{al:'right',dx:-4,mono:true,fs:12,c:P.mute,grp:'rows'});
      R.label([px(i),0,pz(n-1)+CS*.6],x,{mono:true,fs:12,c:P.mute,dy:10+(i%2)*13,wide:1})});
    // the readout
    if(k>=1&&k<=3){const ek=err(k);R.label([px(n-1),HB*1.1,pz(0)-.3],'‖C − C'+['₁','₂','₃'][k-1]+'‖F = '+ek.toFixed(3)+' ('+Math.round(100*ek/nC)+'% of ‖C‖F)',{mono:true,fs:12.5,b:1,c:P.ink,a:e,al:'right'})}
    // 5. the spectrum: what is left out is the error
    if(k===4){sv.forEach((s,i)=>{const h=s*.45;R.box([UX,0,pz(i)],[.32,h,CS*.6],{fill:i<3?P.c3:mix(P.paper,P.mute,.35),a:e,lw:.7});R.label([UX,h,pz(i)],'σ'+'₁₂₃₄₅₆₇₈₉'[i]+' '+s.toFixed(i?3:2).replace(/0$/,''),{mono:true,fs:12,dx:12,al:'left',a:e,c:i<3?P.c3:P.mute,grp:'sv'})});
      R.label([px(n-1),HB*1.1,pz(0)-.3],'‖C − C₃‖F = √(σ₄² + … + σ₉²) = '+err(3).toFixed(3),{mono:true,fs:12.5,b:1,a:e,al:'right'})}
  }
  const full={cam:[.42,.82],bounds:[[-2.9,0,-2.6],[3.6,1.3,2.6]]};
  S3.stage({id:'stg-lr',list:'sx-lr',fig:'Fig. 11 · a real 9 × 9 matrix, layer by layer',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[22,14,30,70]});
})();
