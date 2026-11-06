// ---- Scene: the agent-environment loop and the discounted return (renderer v2) ----
// Steps 1 to 3: the agent and the environment as two blocks; the state (teal), the action (orange) and the reward (green) stream between them.
// Steps 4 to 6: the loop unrolled into 30 time steps in front; each bar is the weight gamma^k a reward k steps away gets in the return
// (gamma 0.9, then 0.99, then 1 with one reward at the end), and streams carry rewards back to step t, sized by their weight. Numbers derived from the formula.
(function(){
  if(!document.getElementById('stg-loop'))return;const {at,off,lerp,mix}=S3;
  const AG=[-2.2,0,0],EN=[2.2,0,0],N=30,ZT=2.4,DX=.27,X0=-(N-1)*DX/2,HB=1.5;
  const GAM=[.9,.9,.9,.9,.99,1];
  const w=(g,i)=>Math.pow(g,i);
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-5,5,-2.2,3.6,.5);
    const la=k<=2?1:k===3?1-.88*e:.12;                              // the loop recedes once the return is unrolled
    R.box(AG,[1.3,.95,1.1],{fill:mix(P.paper,P.acc,.25),a:la});R.label([AG[0],1.05,AG[2]],'agent',{fs:14,b:1,dy:-12,a:la>.3?la:0});
    R.box(EN,[1.5,.95,1.2],{fill:mix(P.paper,P.c3,.18),a:la});R.label([EN[0],1.05,EN[2]],'environment',{fs:14,b:1,dy:-12,a:la>.3?la:0});
    const fa=k<=2?(k===0||k===1||k===2?Math.min(1,e*1.4):1):la*.6;
    // the state goes to the agent (step 1, and again with the reward at step 3)
    if(k===0||k>=2)R.flowArc([EN[0]-.8,.3,.75],[AG[0]+.7,.3,.75],.15,{c:P.c6,a:k===0?fa:la*.9,r:.07,n:9,speed:1.2});
    if(k===0||k===2)R.label([0,.3,.75],k===0?'Sₜ':'Sₜ₊₁',{mono:true,fs:13,b:1,c:P.c6,dy:14,a:fa});
    if(k>=1)R.flowArc([AG[0]+.7,.95,0],[EN[0]-.8,.95,0],.75,{c:P.c2,a:k===1?fa:la*.9,r:.07,n:9,speed:1.2});
    if(k===1||k===2)R.label([0,1.7,0],'Aₜ',{mono:true,fs:13,b:1,c:P.c2,dy:-4,a:k===1?fa:1});
    if(k>=2)R.flowArc([EN[0]-.8,.6,-.75],[AG[0]+.7,.6,-.75],.45,{c:P.c3,a:k===2?fa:la*.9,r:.08,n:7,speed:1});
    if(k===2)R.label([1.25,.85,-.75],'Rₜ₊₁',{mono:true,fs:13,b:1,c:P.c3,dy:-12,a:fa});
    // the return unrolled: bar heights are the weights gamma^k
    if(k>=3){const ta=k===3?e:1,g0=GAM[k-1]||.9,g1=GAM[k],ww=i=>lerp(w(g0,i),w(g1,i),k===3?1:e);
      R.box([0,0,ZT],[N*DX+.3,.05,.62],{a:ta,shadow:false});
      for(let i=0;i<N;i++){const x=X0+i*DX,v=ww(i),last=i===N-1;
        R.box([x,.05,ZT],[DX*.7,Math.max(.01,v*HB),.32],{fill:k===5?mix(P.paper,P.c1,.3):mix(P.paper,P.c1,.35+.5*v),a:ta,shadow:false,lw:.6});
        if(k===5&&last){R.box([x,.05+v*HB,ZT],[DX*.7,.45,.32],{fill:P.c3,a:e,shadow:false});}}
      R.label([X0,0,ZT+.45],'t',{mono:true,fs:12,dy:12,a:ta});R.label([X0+(N-1)*DX,0,ZT+.45],'t + 29',{mono:true,fs:12,dy:12,a:ta});
      const g=k===3?.9:k===4?.99:1,lab=k===3?'γ = 0.9 · weights sum to 10':k===4?'γ = 0.99 · sum 100':'γ = 1 · one reward, at the end';
      R.label([0,HB+.55,ZT],lab,{mono:true,fs:13,b:1,c:k===5?P.c3:P.c1,dy:-6,a:ta});
      // rewards flow back to step t, sized by their weight
      const t0=[X0,.08+HB,ZT];
      if(k<5){for(let i=3;i<N;i+=3){const v=w(g,i);R.flowArc([X0+i*DX,.08+v*HB,ZT],t0,.25+i*.012,{c:P.c3,a:ta*(.25+.75*v),r:.03+.04*v,n:Math.max(2,Math.round(2+v*5)),speed:1.2})}}
      else R.flowArc([X0+(N-1)*DX,.55+HB,ZT],t0,.8,{c:P.c3,a:e,r:.08,n:14,speed:1.5})}
  }
  const loop={cam:[.25,.55],bounds:[[-3.2,0,-1],[3.2,1.9,1]]},ret={cam:[.06,.32],bounds:[[-4.3,0,ZT-.6],[4.3,2.2,ZT+.6]]};
  S3.stage({id:'stg-loop',list:'sx-loop',fig:'Fig. 2 · the loop, and the return it adds up',cam:loop.cam,bounds:loop.bounds,aspect:.52,dur:1300,hold:4400,draw,
    view:k=>k<=2?loop:ret});
})();
