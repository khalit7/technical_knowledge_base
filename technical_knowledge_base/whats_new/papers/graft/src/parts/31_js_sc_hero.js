// ---- Scene: Fig. 1, one RL step under GRAFT (renderer v2: glass plates for the frozen MLP and the two adapters, flowing dots for the forward pass and the gradients) ----
// Schematic of the paper's Figure 1 (one block, one sample at a time). The only numbers are the two hack rates at the last step, read from the page's data:
// the pre-ablation peak of Figure 2 (right, decoded from the vector figure) and deployed GRAFT's mean hack rate over its eight released Countdown seeds.
(function(){
  if(!document.getElementById('stg-hero')||!window.GD)return;const {at,off,mix}=S3;
  const pre=GD.figs.fig2_right.hack_rate['pre-ablation (both adapters)'],peak=pre.reduce((m,p)=>p[1]>m[1]?p:m,pre[0]);
  const gs=GD.cd.arms.find(a=>a.label==='GRAFT (ours)').seeds,dep=100*gs.reduce((s,p)=>s+p.hack,0)/gs.length;
  window.GF_HERO={peak:peak[1],peakStep:peak[0],dep};
  const XB=-2.2,XR=.35,XF=1.95,WB=1.7,WA=.95,HP=1.35,Y0=.18,ZS=2.35,ZO=-3.1,XO=-.9,XL=1.6;
  const top=x=>[x,Y0+HP+.02,0],mid=x=>[x,Y0+HP*.5,0];
  function plate(R,cx,w,c,a,name,sub,dash){const P=R.P;if(a<=.01)return;
    R.box([cx,0,0],[w+.2,Y0,.42],{a,fill:P.paper});
    R.glass([cx-w/2,Y0,-.02],[w,0,0],[0,HP,0],{c,a,nu:Math.round(w*6),nv:8});
    if(dash)R.line([[cx-w/2,Y0,0],[cx+w/2,Y0,0],[cx+w/2,Y0+HP,0],[cx-w/2,Y0+HP,0],[cx-w/2,Y0,0]],{c,w:1.4,dash:[5,4],a:Math.min(1,a*2.5)});
    R.label([cx,Y0+HP,0],name,{fs:13,b:1,c,dy:-12,a:Math.max(a,.35)});if(sub)R.label([cx,0,.3],sub,{fs:12,c:P.mute,dy:13,a:Math.max(a,.35),wide:1})}
  function draw(R,k,e){const P=R.P;R.grid(-4,5.2,-3.8,3,.5);
    const fOn=k<=2?1:k===3?(1-.75*e):.25*(1-e),fDel=k===4,rA=1,bA=k>=2&&k<=3?.55:1;
    plate(R,XB,WB,P.mute,bA,'Frozen base MLP','unchanged');
    plate(R,XR,WA,P.c1,rA,'θR retain','new neurons, kept');
    plate(R,XF,WA,P.c4,k<3?1:k===3?Math.max(.22,1-.78*e):.22*(1-e)+.06,'θF forget',k===3?'switched off':k===4?'deleted':'new neurons',k>=3);
    if(fDel)R.label([XF,Y0+HP*.5,0],'✕',{fs:30,c:P.c4,a:e,b:1});
    // the sample in front, with what the monitor says
    const tag=['one sample, forward pass','unflagged: M(τ) = 0','flagged: M(τ) = 1','anchor task, run as π_R','deployed: base + retain only'][k],tc=k===2?P.c5:k===3?P.c3:P.ink;
    R.box([0,0,ZS],[2.6,.2,.62],{fill:k===2?mix(P.paper,P.c5,.35):k===3?mix(P.paper,P.c3,.3):P.paper});
    R.label([0,.2,ZS],tag,{fs:13,b:1,c:tc,dy:-12});
    // forward pass: the sample through every branch that is on, then into the summed output
    const fw=[[XB,1],[XR,1],[XF,k<=2?1:0]];
    fw.forEach(([x,on])=>{if(!on)return;R.flowArc([0,.22,ZS-.3],mid(x),.25,{c:P.mute,r:.06,n:6,speed:1.2,a:.85});R.flowArc(mid(x),[XO,.24,ZO+.25],.2,{c:P.mute,r:.06,n:6,speed:1.2,a:.85})});
    R.box([XO,0,ZO],[2.5,.22,.55],{fill:P.paper});
    R.label([XO,.22,ZO],k>=3?'MLP(x) + g_R(x)':'MLP(x) + g_R(x) + g_F(x)',{mono:true,fs:12,dy:-12,c:P.ink,wide:1});
    // the loss of this sample times its advantage (training steps only), and the gradient back into the adapters
    const lA=k===0?0:k===4?off(k,e,4):1;
    if(lA>0){R.box([XL+1.4,0,ZO],[1.9,.22,.55],{fill:mix(P.paper,P.acc,.18),a:lA});R.label([XL+1.4,.22,ZO],'loss × advantage',{mono:true,fs:12,dy:-12,a:lA});
      R.flow([[XO+1.25,.12,ZO],[XL+.45,.12,ZO]],{c:P.mute,r:.06,n:4,a:lA*.8});
      const src=[XL+1.4,.3,ZO-.05],gR=[0,1,0,1][k],gF=[0,1,2,0][k];
      if(gR)R.flowArc(src,top(XR),.9,{c:P.c1,r:.075,n:9,speed:1.1,a:lA});
      if(gF)R.flowArc(src,top(XF),.7,{c:P.c4,r:gF>1?.1:.075,n:gF>1?18:9,speed:1.1,a:lA});
      if(k>=1&&k<=3){R.label(gR?R.arcPt(src,top(XR),.9,.62):[XR-WA/2,Y0+HP+.3,0],gR?'∇ ×1':'∇ ×0 (masked)',{fs:13,b:1,c:gR?P.c1:P.bad,al:gR?'center':'right',dx:gR?0:-6,a:lA});if(k<3)R.label(R.arcPt(src,top(XF),.7,.55),'∇ ×'+gF,{fs:13,b:1,c:P.c4,a:lA,dx:14})}
      if(k===2){const b0=top(XR);R.box([b0[0],b0[1]+.3,0],[WA*.9,.07,.3],{fill:P.bad,a:e,shadow:false})}}
    // deploy: the hack rate before and after deleting the forget adapter (Figure 2's numbers)
    if(k===4){const s=.036,bars=[[3.65,peak[1],'hack rate, both adapters on'],[4.55,dep,'hack rate, deployed']];
      bars.forEach(([x,v,n],i)=>{R.box([x,0,0],[.62,.08,.62],{fill:P.paper,a:e});const h=Math.max(.02,v*s)*e;R.box([x,.08,0],[.44,h,.44],{fill:P.c5,a:e,shadow:false});
        R.label([x,.08+h,0],v.toFixed(1)+'%',{mono:true,fs:13,b:1,dy:-11,a:e});R.label([x,0,.35],n,{fs:12,c:P.mute,dy:13+i*15,a:e,wide:1})})}
  }
  const full={cam:[.42,.62],bounds:[[-3.3,0,-3.4],[3.4,1.75,2.7]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one RL step under GRAFT',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:5200,draw,
    view:k=>k===2?{cam:[.55,.55],bounds:[[-.4,0,-3.4],[3.6,1.9,1.2]]}:k===4?{cam:[.42,.6],bounds:[[-3.3,0,-3.4],[5,1.9,2.7]]}:full});
})();
