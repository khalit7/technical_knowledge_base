// ---- Scene (top, Fig. 1): two ways off the data (renderer v2: a few large objects per step, flows, glass, camera per step).
// Floor: action across (left to right), state in depth (front to back). The data band, a cloned policy drifting off it in state, DAgger's labels,
// then one state's action slice: section 6's toy computed by OF.runX (the first fit of naive fitted Q iteration and of CQL, seed 1), against the true reward.
// The state axis and the band's shape are a sketch (illustrative); every number on the action slice is the page's engine. ----
(function(){
  const E=window.OF;if(!E||!document.getElementById('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const nv=E.runX('naive',1,{beta:3}),cq=E.runX('cql',1,{beta:3,alpha:0.1}),G=E.GRID;
  const QN=nv.hist[1].qg,QC=cq.hist[1].qg,arg=q=>{let m=0;q.forEach((v,i)=>{if(v>q[m])m=i});return m},iN=arg(QN),iC=arg(QC);
  const A=nv.A,mu=nv.mu,sd=nv.sd;
  // the numbers the step list quotes (checked by src/check_page.mjs)
  window.OF3=Object.assign(window.OF3||{},{hero:{aN:G[iN],qN:QN[iN],rN:E.rtrue(G[iN]),aC:G[iC],qC:QC[iC],lo:mu-2*sd,hi:mu+2*sd}});
  const X=a=>a*2.4,Z=s=>2.6-s*.85,S0=.3,S1=3.6,SS=1.1;
  // the band's centre in action at each state (a sketch that passes through the toy's data at the sliced state SS)
  const ac=s=>mu+.16*Math.sin((s-SS)*1.25),HW=2*sd;
  // the drift: a cloned policy follows the band, then its states run past it while its actions wander
  const drift=u=>{const s=2.2+u*3.6,o=s<S1?0:Math.pow((s-S1)/2.2,1.6)*.95;return [X(Math.min(.95,ac(Math.min(s,S1))+o)),.03,Z(s)]};
  let seed=11;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  const pairs=[];for(let i=0;i<26;i++){const s=S0+.15+(S1-S0-.3)*rnd();pairs.push([s,ac(s)+(rnd()-.5)*1.6*HW])}
  const dag=[];for(let i=0;i<9;i++){const p=drift(.36+.62*i/8);dag.push([p[0]+(i%2?.12:-.1),p[2]])}
  const YB=1.25,SY=.3,yq=q=>YB+q*SY,ZS=Z(SS);
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-3.2,3.2,-2.9,3,.4);
    // 1. the band and the logged pairs; it recedes while the action slice is the subject
    const bandA=k>=3&&k<=4?.45:1,col=mix(P.paper,P.acc,.55);
    for(let s=S0;s<S1-1e-9;s+=.15){const s2=Math.min(S1,s+.15);R.quad([[X(ac(s)-HW),0,Z(s)],[X(ac(s)+HW),0,Z(s)],[X(ac(s2)+HW),0,Z(s2)],[X(ac(s2)-HW),0,Z(s2)]],{fill:P.acc,fa:.16*bandA,edge:false,dz:5})}
    [-1,1].forEach(sg=>{const pts=[];for(let s=S0;s<=S1+1e-9;s+=.1)pts.push([X(ac(s)+sg*HW),.005,Z(s)]);R.line(pts,{c:P.acc,w:1.4,a:.8*bandA})});
    pairs.forEach(([s,a])=>R.box([X(a),0,Z(s)],[.13,.13,.13],{fill:col,a:bandA,shadow:false,lw:.7}));
    R.label([X(ac(S0)-HW),0,Z(S0)],'the data',{al:'right',dx:-8,dy:4,fs:13,b:1,c:P.acc,a:bandA});
    if(k<=2){R.label([X(-1),0,Z(.1)],'action →',{al:'left',dy:16,mono:true,fs:12,c:P.mute,wide:1});R.label([X(-1),0,Z(5)],'state ↑',{al:'right',dx:-8,mono:true,fs:12,c:P.mute,wide:1})}
    // 2. imitation: the cloned policy's states drift past the band (a stream of red dots along its path)
    const dA=k===1?Math.min(1,e*1.4):k===2?1:k===5?.5:k>=3?.25:0;
    if(dA>0){const pts=[];for(let i=0;i<=40;i++)pts.push(drift(i/40));const n=k===1?Math.max(2,Math.round(40*e)):40;
      R.line(pts.slice(0,n+1),{c:P.bad,w:2.4,a:dA,head:k<=2?7:0});if(k<=2)R.flow(pts.slice(0,n+1),{c:P.bad,r:.07,speed:1.2,a:dA});
      if(k<=2)R.label(drift(1),nar?'① drift':'① states drift off the data',{al:'left',dx:10,dy:-6,fs:13,b:1,c:P.bad,a:dA})}
    // 3. DAgger: the expert labels the states the learner reached (a stream from the expert to each new label)
    const gA=k===2?e:k>=3?(k===5?.5:.25):0;
    if(gA>0){const ex=[X(.2),1.7,Z(4.4)];if(k===2){R.ball(ex,.16,{c:P.c3,a:gA});R.label(ex,'expert',{dy:-18,fs:12.5,b:1,c:P.c3,a:gA})}
      dag.forEach(([x,z],i)=>{const t=k===2?Math.max(0,Math.min(1,e*1.6-i*.07)):1;R.box([x,0,z],[.13,.13,.13],{fill:mix(P.paper,P.c3,.6),a:gA*t,shadow:false,lw:.7});
        if(k===2&&t>0)R.flowArc(ex,[x,.15,z],.25,{c:P.c3,a:.8*t,r:.05,n:4,speed:1.4})});
      if(k===2)R.label([dag[4][0],0,dag[4][1]],nar?'DAgger':'DAgger: labels there',{al:'left',dx:14,dy:10,fs:12.5,b:1,c:P.c3,a:gA})}
    // 4 to 6. one state's action slice: a glass plate standing across the action axis, the toy's first fit on it, the true reward dashed
    const pA=k===3?e:k>=4?1:0;
    if(pA>0){R.glass([X(-1),.02,ZS],[X(1)-X(-1),0,0],[0,2.55,0],{c:P.c1,a:pA*.8,nu:8,nv:5});
      R.line([[X(-1),YB,ZS],[X(1),YB,ZS]],{c:P.mute,w:1,a:pA*.8,dash:[3,3]});R.label([X(-1),YB,ZS],'0',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:pA});
      const pts=q=>G.filter((_,i)=>i%4===0).map((a,j)=>[X(a),yq(q[j*4]),ZS+.01]);
      R.line(G.filter((_,i)=>i%4===0).map(a=>[X(a),yq(E.rtrue(a)),ZS+.01]),{c:P.ink,w:1.6,a:pA,dash:[6,4]});
      const t=k===4?e:k>4?1:0,qm=QN.map((v,i)=>lerp(v,QC[i],t)),cur=pts(qm);
      R.line(cur,{c:t>.5?P.c1:P.c4,w:3,a:pA});
      // the data's actions in this state, on the curve
      A.forEach(a=>{const i=Math.round((a+1)/2*(G.length-1));R.ball([X(a),yq(qm[i]),ZS+.02],.05,{c:k===5?P.acc:P.paper,a:pA})});
      // the max: a glow where it lands, and the query streaming from the data to it
      const im=t<.5?iN:iC,pm=[X(G[im]),yq(qm[im]),ZS+.03];
      if(k>=3){R.glow(pm,.45,{c:t<.5?P.bad:P.c1,a:pA*.9});R.ball(pm,.09,{c:t<.5?P.bad:P.c1,a:pA});
        if(k<=4)R.flowArc([X(mu),yq(qm[69])+.1,ZS+.03],pm,.35,{c:t<.5?P.bad:P.c1,a:pA*.9,r:.06,speed:1.2});
        R.label(pm,(t<.5?'max Q = ':'max = ')+RD.n(qm[im],2)+' at a = '+RD.n(G[im],2),{al:t<.5?'right':'left',dx:t<.5?-10:10,dy:-14,mono:true,fs:12.5,b:1,c:t<.5?P.bad:P.c1,a:pA})}
      if(k===3)R.label([X(1),yq(E.rtrue(1)),ZS],'true reward '+RD.n(E.rtrue(1),2),{al:'right',dx:-6,dy:14,mono:true,fs:12,c:P.ink,a:e});
      R.label([X(-1),2.5,ZS],k>=4?'Q with CQL\'s penalty':'Q, first fit',{al:'left',dx:4,dy:-10,fs:12.5,b:1,c:k>=4?P.c1:P.c4,a:pA})}
    // 6. the constraint: two glass walls at the band's edges in this state
    if(k===5){[mu-2*sd,mu+2*sd].forEach(a=>R.glass([X(a),.02,ZS-.45],[0,0,.9],[0,2.3,0],{c:P.acc,a:e*.9,nu:2,nv:4}));
      R.label([X(mu+2*sd),.3,ZS+.45],nar?'stay inside':'BCQ, TD3+BC: choose inside',{al:'left',dx:8,fs:12.5,b:1,c:P.acc,a:e})}
  }
  const full={cam:[-.18,.62],bounds:[[-3,0,-2.6],[3,2.2,2.9]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · two ways off the data',cam:full.cam,bounds:full.bounds,aspect:.7,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[18,16,14,90],
    // steps 2 and 3 frame the drift; steps 4 to 6 move in close on the action slice
    view:k=>k===0?{cam:[-.18,.62],bounds:[[-2.3,0,-.8],[1.1,.5,2.7]]}:k===1||k===2?{cam:[-.3,.62],bounds:[[-2,0,-2.6],[2.8,1.8,2.6]]}:k>=3?{cam:[-.08,.32],bounds:[[-2.8,0,ZS-.6],[2.8,2.6,ZS+.6]]}:full});
})();
