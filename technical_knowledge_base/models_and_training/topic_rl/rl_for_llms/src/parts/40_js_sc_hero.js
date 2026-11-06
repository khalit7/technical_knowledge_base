// ---- Scene: the hero (Fig. 1). One real group of 16 answers to GSM8K test problem 3 from this page's rollouts (LLD.groups[3]):
// sampled by the policy, scored by the strict verifier, baselined by the group mean, credited with GRPO's advantage, then answer 7 with
// PPO's per-token credit from the measured critic (LLD.feat, VinePPO-style values), and the update flowing back. Renderer v2. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const E=window.LLE,D=window.LLD;if(!E||!D)return;
  const f=D.feat.find(x=>!x.pass)||D.feat[0],g=D.groups[f.g],G=g.r.length,ad=E.groupAdv(g.r,'grpo');
  const T=f.L,vAt=t=>{const c=f.cuts,v=f.vpass;if(t<=c[0])return v[0];for(let j=1;j<c.length;j++)if(t<=c[j]){const a=(t-c[j-1])/(c[j]-c[j-1]);return v[j-1]*(1-a)+v[j]*a}return v[v.length-1]};
  // PPO's credit on answer 7: GAE with gamma = lambda = 1 and the KL left out, so A_t = R - V(s_t); binned 6 tokens to a bar
  const Vt=[];for(let t=0;t<T;t++)Vt.push(vAt(t));const Ap=E.gae(Vt.map((_,t)=>t===T-1?f.pass:0),Vt,1,1);
  const BIN=6,bins=[];for(let s=0;s<T;s+=BIN){const sl=Ap.slice(s,s+BIN);bins.push({s,n:sl.length,a:sl.reduce((x,y)=>x+y,0)/sl.length})}
  // the stretch where the critic's estimate fell most (tokens 48 to 73)
  let fb=1;for(let j=2;j<f.vpass.length;j++)if(f.vpass[j-1]-f.vpass[j]>f.vpass[fb-1]-f.vpass[fb])fb=j;
  const LMAX=Math.max(...g.L),X0=-3.6,LEN=5.0,ZS=.36,YB=.5,AS=.36,AS2=.85,SX=2.15,SH=.8;
  const z=k=>(k-(G-1)/2)*ZS,len=k=>LEN*g.L[k]/LMAX,xt=t=>X0+LEN*t/LMAX;
  function draw(R,k,e){const P=R.P,nar=R.W<520,fi=f.i;R.grid(-5.4,3,-3.2,3.2,.5);
    const pass=P.c3,fail=P.c2,col=i=>g.r[i]?pass:fail;
    // composition: in step 5 every row but answer 7 recedes; in step 6 the rows stay and the flows carry the update
    const rowA=i=>k===4?(i===fi?1:Math.max(0,1-e*1.6)):k===5&&i!==fi?Math.min(1,e*1.6):1;
    // the policy: one glass plate (its weights), on a plinth
    const pa=k===4?lerp(1,.15,e):k===5?lerp(.15,1,e):1;R.box([-4.55,0,0],[1.3,.09,.4],{a:pa});R.glass([-5.15,.12,0],[1.2,0,0],[0,1.35,0],{c:P.c1,a:pa,nu:6,nv:7});
    R.label([-4.55,1.5,0],'policy πθ',{fs:13.5,b:1,c:P.c1,dy:-8,a:pa});
    // 1. the group: one bar per answer, length in tokens; flows from the policy while they are being sampled
    const grow=k===0?e:1;
    for(let i=0;i<G;i++){const a=rowA(i);if(a<=.01)continue;const L=len(i)*grow,zz=z(i);
      if(k===0)R.flowArc([-4.55,1.0,.05],[X0,YB+.05,zz],.35,{c:P.c1,a:.7,r:.05,speed:1.6,n:5});
      const scored=k>=1,fill=scored?mix(P.paper,col(i),k===1?.25+.35*e:.6):P.paper;
      if(k<3||(k===4&&i===fi)){R.box([X0+L/2,YB,zz],[L,.07,.17],{fill,a,shadow:false,lw:.7})}
      else{// 4. the advantage: the bar rises or sinks by A, the same on every token
        const A=ad.A[i],h=Math.abs(A)*AS*(k===3?e:1),y0=A>=0?YB:YB-h;R.box([X0+L/2,y0,zz],[L,Math.max(.07,h),.17],{fill:mix(P.paper,col(i),.7),a,shadow:false,lw:.7})}}
    if(k<=1)R.label([X0+LEN*.45,YB,z(G-1)+.25],nar?'16 answers':'16 answers to GSM8K #3 · bar length = tokens',{fs:13,b:1,dy:16,a:k===0?Math.max(.3,e):1});
    // 2. the score: a peg per answer in one column, raised to 1 for a pass; dots carry each answer's last token to it
    const sa=k===0?0:k===1?e:k===2?1:k===3?lerp(1,.25,e):k===4?Math.max(0,.25-e):.25;
    if(sa>0){for(let i=0;i<G;i++){const zz=z(i),r=g.r[i],top=YB+(r?SH:.04);
        R.box([SX,YB-.04,zz],[.3,.04,.2],{a:sa,shadow:false});if(r)R.box([SX,YB,zz],[.06,SH,.06],{fill:mix(P.paper,pass,.5),a:sa,shadow:false,lw:.6});
        R.ball([SX,top+.06,zz],.07,{c:r?pass:P.mute,a:sa});
        if(k===1)R.flowArc([X0+len(i),YB+.08,zz],[SX-.18,YB+.1,zz],.12,{c:col(i),a:.8,r:.04,speed:1.2,n:3})}
      if(sa>.5)R.label([SX,YB+SH+.25,z(0)],'score: verifier 1 or 0',{fs:13,b:1,dy:-10,a:sa,wide:1});
      if(k===1)R.label([SX,YB+SH+.1,z(G-1)],'6 of 16 pass',{fs:13,b:1,c:pass,dy:16,a:e})}
    // 3. what was expected: the group mean as a glass sheet across the score column
    const ma=k<2?0:k===2?e*.75:k===3?lerp(.75,.3,e):k===4?Math.max(0,.3-e):.3;
    if(ma>0){const my=YB+ad.m*SH;R.glass([SX-.3,my,z(0)-.2],[.6,0,0],[0,0,(G-1)*ZS+.4],{c:P.c5,a:ma,nu:1,nv:4,th:.02});
      if(k===2)R.label([SX+.35,my,z(G-1)],'mean 0.375 · std 0.484',{al:'left',dx:6,mono:true,fs:12.5,b:1,c:P.c5,a:ma})}
    // 4. advantage labels
    if(k===3||k===5){const a=k===3?e:.8,ip=g.r.indexOf(1),iw=g.r.indexOf(0);
      R.label([X0+len(ip),YB+ad.A[ip]*AS,z(ip)],'Â = +1.291 on every token',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:pass,a,grp:'adv'});
      R.label([X0+len(iw),YB+ad.A[iw]*AS,z(iw)],'Â = −0.775 on every token',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:fail,a,grp:'adv'})}
    // 5. PPO's critic on answer 7: per-token credit from the measured chance of passing
    if(k===4){const zz=z(fi),c=e;
      // GRPO's flat credit, as a faint glass sheet hanging under the row
      R.glass([X0,YB,zz-.16],[len(fi),0,0],[0,ad.A[fi]*AS2,0],{c:fail,a:.55*c,nu:8,nv:1,th:.01});
      // the stretch where the critic's estimate fell
      R.quad([[xt(f.cuts[fb-1]),YB+.05,zz-.12],[xt(f.cuts[fb]),YB+.05,zz-.12],[xt(f.cuts[fb]),YB+1.1,zz-.12],[xt(f.cuts[fb-1]),YB+1.1,zz-.12]],{fill:P.c4,fa:.12*c,edge:false});
      bins.forEach(b=>{const h=Math.abs(b.a)*AS2*c;if(h<.004)return;const x0=xt(b.s),w=xt(b.s+b.n)-x0;R.box([x0+w/2,b.a>=0?YB:YB-h,zz],[w*.82,h,.17],{fill:mix(P.paper,fail,.75),a:1,shadow:false,lw:.6})});
      // the critic: V(prefix) as a line above the row, the measured points as balls
      const pts=[];for(let t=0;t<=T;t+=4)pts.push([xt(t),YB+.15+vAt(t)*1.3,zz]);R.line(pts.slice(0,Math.max(2,Math.round(pts.length*c))),{c:P.c4,w:2.4});
      f.cuts.forEach((t,j)=>{if(t/T<=c)R.ball([xt(t),YB+.15+f.vpass[j]*1.3,zz],.055,{c:P.c4})});
      R.label([xt(0),YB+.15+f.vpass[0]*1.3,zz],'critic: chance of passing from this prefix',{al:'left',dx:-4,dy:-20,fs:12.5,b:1,c:P.c4,a:c});
      R.label([(xt(f.cuts[fb-1])+xt(f.cuts[fb]))/2,YB+1.1,zz-.12],'tokens 48 to 73',{fs:12.5,b:1,c:P.c4,dy:-10,a:c,wide:1});
      R.label([xt(T*.62),YB+.1,zz],'0 from token 97: no more blame',{fs:12.5,mono:true,c:P.mute,dy:-14,a:c,wide:1});
      R.label([xt(T*.2),YB-.55,zz+.1],'PPO: Â = 0 − V(prefix)',{dy:12,mono:true,fs:12.5,b:1,c:fail,a:c});
      R.label([X0+len(fi),YB+ad.A[fi]*AS2,zz-.16],'GRPO: −0.775 flat',{al:'left',dx:8,mono:true,fs:12.5,c:fail,a:.8*c,wide:1})}
    // 6. the update: every answer's advantage flows back into the policy, denser for a larger |A|
    if(k===5){for(let i=0;i<G;i++){const A=ad.A[i];R.flowArc([X0+.05,YB+A*AS*.5,z(i)],[-4.3,.7,0],.4,{c:col(i),a:.85,r:.035+.025*Math.abs(A),n:Math.max(2,Math.round(2+3*Math.abs(A))),speed:1.3})}
      R.label([-4.55,.25,.7],'∇ log π × Â',{mono:true,fs:13,b:1,dy:18,c:P.c1,a:e})}
  }
  const full={cam:[.28,.72],bounds:[[-5.3,0,-3.1],[3.0,1.6,3.1]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one group of real answers, scored and credited',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:5200,draw,
    // step 5 moves in close on answer 7 and lowers the camera, so the per-token bars read against the flat sheet
    view:k=>k===4?{cam:[.12,.3],bounds:[[-3.9,-.35,z(f.i)-.4],[1.3,1.5,z(f.i)+.4]]}:k===1||k===2?{cam:[.45,.7],bounds:[[-3.9,0,-3.1],[3.0,1.6,3.1]]}:full});
  window.RL3=Object.assign(window.RL3||{},{hero:{pid:g.pid,pass:g.r.reduce((a,b)=>a+b,0),mean:ad.m,sd:ad.sd,Apos:(1-ad.m)/ad.sd,Aneg:ad.A[f.i],L:T,minL:Math.min(...g.L),maxL:LMAX,vmin:Math.min(...Ap)}});
})();
