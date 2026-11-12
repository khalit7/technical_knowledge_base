// ---- Scene, Fig. 4 (2026-11-12, renderer v2): DTensor placements on a 1-D mesh of 2 ranks, and the product rule.
// Shapes are those of src/exp/dtensor_prop.py as run (A 4 x 6, B 6 x 8); the local shapes and output placements are the recorded cases in
// window.DPT.dprop (mm S0 x R -> S(0) local (2, 8) ... mm S1 x S0 -> P(sum) local (4, 8); relu(P) -> R with one all-reduce, recorded on a
// Partial A). Matrices are glass plates with one cell per element; values are not drawn. Steps are #sx-dt on the left. ----
(function(){
  if(!document.getElementById('stg-dt')||!window.S3||!window.DPT)return;const {mix,lerp}=S3,D=window.DPT;
  const cases=D.dprop.cases,find=(op,a)=>cases.find(c=>c[0]===op&&JSON.stringify(c[1])===JSON.stringify(a));
  const mmP=find('mm',['S1','S0']),reluP=find('relu',['P']);
  const outLoc=mmP?mmP[4]:[4,8],nAR=reluP&&reluP[3]?reluP[3].all_reduce||0:1;
  const XR=[-1.6,1.6],CS=.2,cs=.14;
  // a matrix of rows x cols cells standing upright, bottom centre c
  function mat(R,c,rows,cols,col,a,s){s=s||CS;R.glass([c[0]-cols*s/2,c[1],c[2]],[cols*s,0,0],[0,rows*s,0],{c:col,a,nu:cols,nv:rows,th:.03})}
  function draw(R,k,e,st){const P=R.P;R.grid(-3,3,-1.2,1.2,.5);const ein=Math.min(1,e*1.3);
    XR.forEach((x,r)=>{R.box([x,0,0],[1.9,.1,1.5],{fill:P.paper});R.label([x,0,.76],'rank '+r,{mono:true,fs:12,c:P.mute,dy:14})});
    const LY=1.25,lc=[0,LY,0];
    if(k===0){mat(R,lc,4,6,P.ink,.55);R.label([0,LY+.8,0],'A · 4 × 6 · one logical tensor',{fs:13,b:1,dy:-10});
      R.label([0,.1,0],'a mesh of 2 ranks',{fs:12.5,c:P.mute,dy:-4})}
    if(k===1){mat(R,lc,4,6,P.ink,.25*(1-e));
      XR.forEach((x,r)=>{const from=[0,LY+(r?0:.4),0],to=[x,.12,0],c=[lerp(from[0],to[0],e),lerp(from[1],to[1],e),0];mat(R,c,2,6,P.c3,.95);
        R.flowArc([0,LY+(r?.2:.6),0],[x,.55,0],.3,{c:P.c3,a:1-e*.6,r:.05,n:6,speed:1.2});
        R.label([x,.12+.4,0],'rows '+(2*r)+' and '+(2*r+1)+' · (2, 6)',{fs:12.5,mono:true,dy:-12,a:e})});
      R.label([0,1.85,0],'Shard(0)',{fs:15,b:1,c:P.c3,mono:true})}
    if(k===2){XR.forEach((x,r)=>{mat(R,[x,.12,0],4,6,P.c1,ein);R.label([x,.92,0],'all of A · (4, 6)',{fs:12.5,mono:true,dy:-10,a:ein})});
      R.label([0,1.85,0],'Replicate()',{fs:15,b:1,c:P.c1,mono:true})}
    if(k===3){XR.forEach((x,r)=>{mat(R,[x,.12,0],4,6,P.c5,ein);R.label([x,.92,0],'part of A · (4, 6)',{fs:12.5,mono:true,dy:-10,a:ein})});
      R.label([0,.52,0],'+',{fs:26,b:1,c:P.c5});R.label([0,.52,0],'values sum to A',{fs:12.5,c:P.c5,dy:24});R.label([0,1.85,0],'Partial()',{fs:15,b:1,c:P.c5,mono:true})}
    if(k>=4){const zA=.5,zB=0,zO=-.55,rel=k===5;
      XR.forEach((x,r)=>{const fa=rel?.25:1;
        mat(R,[x-.5,.12,zA],4,3,P.c3,fa*(k===4?ein:1),cs);mat(R,[x+.25,.12,zB],3,8,P.c6,fa*(k===4?ein:1),cs);
        const oc=rel?mix(P.c5,P.c1,e):P.c5;mat(R,[x,.12,zO],outLoc[0],outLoc[1],oc,k===4?Math.max(0,e*1.6-.6):1,cs);
        if(!rel){R.flowArc([x-.5,.4,zA],[x,.45,zO],.25,{c:P.c3,r:.045,n:5,speed:1.1,a:ein});R.flowArc([x+.25,.35,zB],[x,.45,zO],.2,{c:P.c6,r:.045,n:5,speed:1.1,a:ein})}
        R.label([x-.5,.12,zA],'A[:, '+(3*r)+':'+(3*r+3)+'] · 4 × 3',{fs:12,mono:true,c:P.c3,dy:14,a:fa,wide:1});
        R.label([x+.81,.12+.21,zB],'B['+(3*r)+':'+(3*r+3)+', :] · 3 × 8',{fs:12,mono:true,c:P.c6,al:'left',dx:8,a:fa,wide:1});
        R.label([x,.12+.56,zO],rel?'relu(sum) · (4, 8) · R':'partial · ('+outLoc.join(', ')+') · P',{fs:12.5,mono:true,b:1,c:rel?P.c1:P.c5,dy:-8})});
      if(rel){const y=.12+.3;R.flowArc([XR[0]+.6,y,zO],[XR[1]-.6,y,zO],.45,{c:P.c1,r:.06,n:9,speed:1.4});R.flowArc([XR[1]-.6,y-.05,zO+.05],[XR[0]+.6,y-.05,zO+.05],.3,{c:P.c1,r:.05,n:7,speed:1.4,a:.8})}
      R.label([0,1.5,0],R.W<520?(rel?nAR+' all-reduce, then relu':'S(1) @ S(0) → P'):rel?nAR+' all-reduce, then relu on each rank':'S(1) @ S(0) → P · no communication',{fs:14,b:1,c:rel?P.c1:P.c5,mono:true})}}
  const full={cam:[.3,.36],bounds:[[-2.6,0,-.8],[2.6,2.0,.8]]};
  S3.stage({id:'stg-dt',list:'sx-dt',fig:'Fig. 4 · placements on 2 ranks',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4800,draw,
    margin:w=>w<520?[14,8,14,8]:[16,16,18,16],
    view:k=>k>=4?{cam:[.42,.5],bounds:[[-2.6,0,-.9],[2.6,1.5,.9]]}:full});
})();
