// ---- Scene: Dreamer's two loops (section 10): the world model learns on real frames; actor and critic learn only on latent steps imagined from a real state ----
// A diagram, not data: the structure and the settings (horizon 15, γ = 0.99, λ = 0.95) are the paper's (Hafner et al. 2019, Appendix A); the boxes are not activations.
(function(){
  if(!document.getElementById('stg-dr'))return;const {at,off,lerp,mix}=S3;
  const NR=5,XS=1.6,ZR=1.0,ZF=2.35,B=1,NI=6;                         // five real steps; imagination branches from the second
  const rx=i=>(i-(NR-1)/2)*XS,ip=j=>[rx(B)+j*.78,0,ZR-.35-j*.62];     // imagined step j goes right and back into depth
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-4,3.2,.5);
    const realA=k===2||k===3||k===4?.35:1;
    // real frames from the replay buffer, encoded into latent states
    for(let i=0;i<NR;i++){const x=rx(i);
      R.glass([x-.34,.12,ZF],[.68,0,0],[0,.56,0],{c:P.q,nu:4,nv:3,a:realA*.9});R.label([x,.68,ZF],'o'+(i+1),{mono:true,fs:12.5,dy:-10,a:realA,wide:k>=2?1:0});
      R.box([x,0,ZR],[.5,.42,.5],{fill:mix(P.paper,P.ink,.06),a:realA});R.label([x,.42,ZR],'s'+(i+1),{mono:true,fs:12.5,b:1,dy:-10,a:realA,wide:k>=2&&i!==B?1:0});
      if(k===0)R.flow([[x,.2,ZF-.05],[x,.3,ZR+.3]],{c:P.q,r:.06,speed:.9,n:4,a:e});
      if(i<NR-1){R.line([[x+.26,.21,ZR],[rx(i+1)-.27,.21,ZR]],{c:P.ink,w:1.4,a:.6*realA,head:7});if(k===1)R.flow([[x+.26,.24,ZR],[rx(i+1)-.27,.24,ZR]],{c:P.ink,r:.06,speed:1,n:4,a:e})}}
    R.label([rx(0)-.5,.2,ZF],'real frames',{al:'right',fs:12.5,c:P.q,dx:-6,grp:'row',a:realA});R.label([rx(0)-.5,.2,ZR],'latent states',{al:'right',fs:12.5,dx:-6,grp:'row',a:realA});
    if(k===1)R.label([0,.7,ZR],'the RSSM learns to predict each latent state from the last',{fs:12.5,b:1,a:e,dy:-18,wide:1});
    // the imagined branch: actor picks a, the model predicts the next latent state and reward; no image is decoded
    if(k>=2){const shown=k===2?e*NI:NI,pts=[[rx(B),.2,ZR]];
      for(let j=1;j<=NI;j++){const a=Math.max(0,Math.min(1,shown-j+1));if(a<=0)break;const p=ip(j);pts.push([p[0],.2,p[2]]);
        R.box(p,[.42,.36,.42],{fill:mix(P.paper,P.acc,.22),fa:.75,a});R.label([p[0],.36,p[2]],'ŝ'+j,{mono:true,fs:12.5,b:1,c:P.acc,dy:-10,a:a*(k===2||j%2===1?1:.6)});
        const q=j===1?[rx(B),0,ZR]:ip(j-1);R.line([[q[0]+.1,.18,q[2]-.12],[p[0]-.1,.18,p[2]+.12]],{c:P.acc,w:1.6,dash:[5,3],a:a*.8,head:7})}
      if(k===2)R.flow(pts,{c:P.acc,r:.065,speed:1.2,n:10});
      const end=ip(NI);R.label([end[0]+.3,.1,end[2]],'… 15 imagined steps',{al:'left',fs:12.5,c:P.acc,dx:8,wide:1});
      // the actor, choosing each imagined action
      const AC=[rx(B)-1.1,0,-1.6];R.box(AC,[.7,.5,.5],{fill:mix(P.paper,P.c3,.3),a:k===3?.4:1});R.label([AC[0],.5,AC[2]],'actor',{fs:13,b:1,c:P.c3,dy:-10,a:k===3?.5:1});
      if(k===2)for(let j=1;j<=3;j++){const p=ip(j);R.flowArc([AC[0]+.3,.45,AC[2]],[p[0]-.25,.3,p[2]],.25,{c:P.c3,r:.05,n:4,speed:1,a:.8*e})}
      // the critic: λ-returns over the imagined steps, flowing back from the end of the branch
      const CR=[rx(B)+2.6,0,-3.2];if(k>=3){const ca=k===3?e:.4;R.box(CR,[.7,.5,.5],{fill:mix(P.paper,P.v,.3),a:ca});R.label([CR[0],.5,CR[2]],'critic',{fs:13,b:1,c:P.v,dy:-10,a:ca});
        if(k===3){R.flow(pts.slice().reverse(),{c:P.v,r:.065,speed:1.1,n:10,a:e});R.label([ip(3)[0],.6,ip(3)[2]],'λ-returns: γ = 0.99, λ = 0.95',{fs:12.5,b:1,c:P.v,dy:-12,a:e,wide:1})}}
      // the actor's update: value gradients back through every imagined step
      if(k===4){R.flow(pts.slice().reverse().concat([[AC[0]+.2,.4,AC[2]]]),{c:P.c3,r:.07,speed:1.5,n:12});R.label([ip(2)[0],.6,ip(2)[2]],'gradients through the model to the actor',{fs:12.5,b:1,c:P.c3,dy:-12,wide:1})}}
  }
  const full={cam:[.4,.66],bounds:[[-4.0,0,-3.4],[4.4,1.0,2.7]]};
  S3.stage({id:'stg-dr',list:'sx-dr',fig:'Fig. 5 · Dreamer: learn the model, then dream',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4400,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,110],
    view:k=>k<=1?{cam:[.25,.6],bounds:[[-4.2,0,.4],[4.2,1.1,2.8]]}:full});
})();
