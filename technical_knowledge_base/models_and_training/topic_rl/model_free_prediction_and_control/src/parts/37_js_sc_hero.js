// ---- Scene (hero): the two choices that define every target, on the worked random-walk episode and the cliff transition of section 4 ----
// Data: the page's engine (MFE.lamReturn on rewards 0, 0, 1 with V(D) = V(E) = 0.5; MFE.twoTargets on the transition of section 4 with its default sliders).
// Steps 1 to 6: states A to E across, time towards the viewer, value bars at the visited states; each target is a bar on a shelf behind V(C).
// Steps 7 and 8: the picture is replaced by one cliff transition and the three targets SARSA, Expected SARSA and Q-learning build from it.
// Renderer v2: value moves as streams of dots (the walk itself, the successors' values into DP's target, the return flowing back along
// the episode, V(D) and V(E) pulled back into TD's targets, the three n-step returns into the lambda-return, S′'s action values into the
// three control targets, Expected SARSA's in proportion to each action's chance); the camera moves in close when a step is about one target.
(function(){
  const M=window.MFE;if(!M||!window.S3||!document.getElementById('stg-hero'))return;const {at,mix}=S3;
  const X=i=>(i-3)*1.05,Z=t=>-1.2+t*1.05,H=2.2,ZS=-2.35,NM=['end','A','B','C','D','E','end'];   // x: left end, A..E, right end; z: time steps 0..3; ZS: the target shelf
  const path=[[3,0],[4,1],[5,2],[6,3]],rew=[0,0,1];                                              // C, D, E, off the right end
  const LR=M.lamReturn([0,0,1],[0.5,0.5],1,0.5);                                                 // G(1) = 0.5, G(2) = 0.5, G(3) = 1; weights 0.5, 0.25, 0.25; 0.625
  const TT=M.twoTargets({R:-1,q:-5,qBest:-4,qDown:-100,qO1:-5,qO2:-6,qAp:-100,a:0.5,g:1,eps:0.1});
  const f2=v=>(v<0?'−':'')+(+Math.abs(v).toFixed(3)),f3=v=>String(+v.toFixed(3));
  const CQ=v=>.22*Math.sqrt(Math.abs(v));                                                        // cost bar height for steps 7 and 8
  const sq=(c,h,f,a,R)=>R.quad([[c[0]-h,0,c[1]-h],[c[0]+h,0,c[1]-h],[c[0]+h,0,c[1]+h],[c[0]-h,0,c[1]+h]],{fill:f,a,ea:.5});
  // the episode as one path along its three arcs (reversed: the return flowing back from the end)
  const epPts=(R,rev)=>{const pts=[];for(let j=0;j<3;j++){const [i0,t0]=path[j],[i1,t1]=path[j+1];for(let u=j?1:0;u<=16;u++)pts.push(R.arcPt([X(i0),.06,Z(t0)],[X(i1),.06,Z(t1)],.35,u/16))}return rev?pts.reverse():pts};
  const LX=[X(3)-2.1,X(3)-1.1,X(3)-.1],LL=X(3)+1.1;                                         // step 6: the three n-step returns and the lambda-return on the shelf
  // step 7 and 8 geometry: S and S′ side by side, the cliff in front, the three targets on a shelf behind S
  const S=[-1.7,-.2],SP=[1.7,-.2],TZ=-2,TX=[-3.6,-1.95,-.3];
  const ACT=[['right',-4,[.5,0],'left',8],['down',-100,[0,.5],'left',8],['up',-5,[0,-.5],'center',0],['left',-6,[-.5,0],'right',-8,14]];
  const chance=n=>n==='right'?1-.1+.1/4:.1/4;
  function draw(R,k,e){const P=R.P,wide=k===0||k===2||k===6,old=k<6?1:k===6?Math.max(0,1-2*e):0,neu=k<6?0:k===6?Math.max(0,2*e-1):1,ph=R.W<520;
    R.grid(-4.2,3.6,-2.9,2.6,.6);
    if(old>0){
      const base=k===0?1:k===1?.25:k===5?.2:.45;                                                  // the episode recedes while a target is read
      for(let t=0;t<4;t++)for(let i=0;i<7;i++)sq([X(i),Z(t)],.42,i===0||i===6?mix(P.paper,i===6?P.good:P.mute,.35):mix(P.paper,P.soft,.5),old*(k===5?.3:.9),R);
      for(let t=0;t<4;t++)R.label([X(0)-.55,0,Z(t)],'t = '+t,{al:'right',mono:true,fs:12,c:P.mute,a:wide?old*(k===0?1:.6):0});   // labels only in the full views (a close view would push them to its edges)
      for(let i=1;i<6;i++)R.label([X(i),0,Z(3)+.5],NM[i],{fs:13.5,b:1,dy:12,a:wide?old:0});
      R.label([X(6),0,Z(3)+.5],'+1',{fs:13.5,b:1,c:P.good,dy:12,a:wide?old:0});
      // the episode: C, D, E, then off the right end, rewards 0, 0, 1; once drawn, the walk keeps moving along it
      const grow=k===0?e:1;for(let j=0;j<3;j++){const u=Math.max(0,Math.min(1,grow*3-j));if(u<=0)continue;const [i0,t0]=path[j],[i1,t1]=path[j+1];
        R.arc([X(i0),.06,Z(t0)],[X(i1),.06,Z(t1)],.35,{c:P.acc,w:2.2,t:u,a:old*base});
        if(u>=1&&k===0)R.label(R.arcPt([X(i0),.06,Z(t0)],[X(i1),.06,Z(t1)],.35,.5),'r = '+rew[j],{mono:true,fs:12,c:P.acc,a:old,dx:14,wide:1})}
      if(k===0&&grow>.95)R.flow(epPts(R),{c:P.acc,r:.07,speed:1.3,a:old});
      for(let j=0;j<3;j++){const [i,t]=path[j];if(k===0&&grow*3<j)continue;
        const hl=(k===3&&j===1)||(k===4&&j===2),v=k===2?.5+.05*Math.max(0,e*1.6-.6):.5;           // Monte Carlo moves C, D and E to 0.55 once the return has flowed back
        R.box([X(i),0,Z(t)],[.42,v*H,.42],{fill:hl?mix(P.paper,P.acc,.7):mix(P.paper,P.c1,.45),a:old*(k===5?.1:k===1?.3:hl||k===0||k===2||j===0?1:.4)});
        if(k===0||k===2||hl||(j===0&&k>=1&&k<=4))R.label([X(i)+.22,v*H,Z(t)],'V('+NM[i]+') '+(k===2?String(+v.toFixed(2)):'0.5'),{al:'left',dx:6,mono:true,fs:12,a:old,wide:(j===0&&!hl&&k!==0&&k!==2)||(j>0&&(k===0||k===2))?1:0})}   // on a phone only the value being read
      // a target for V(C): a bar on the shelf behind it, linked to it by a dashed line
      const top=(x,v)=>[x,Math.max(.02,v*H),ZS];
      const tgt=(x,v,c,lab,a,o)=>{R.box([x,0,ZS],[.4,Math.max(.02,v*H),.4],{fill:mix(P.paper,P[c],.62),a:old*a,ea:.5});if(lab)R.label(top(x,v),lab,Object.assign({fs:12.5,b:1,mono:true,c:P[c],dy:-12,a:old*a},o||{}))};
      if(k>=1&&k<=4)R.line([[X(3),.02,Z(0)-.25],[X(3),.02,ZS+.25]],{c:P.mute,w:1.2,dash:[3,4],a:old*.8});
      if(k===1){const u=at(k,e,1);[2,4].forEach(i=>{const tp=[X(i),.5*H,Z(1)];R.arc([X(3),.1,Z(0)],[X(i),.1,Z(1)],.45,{c:P.c3,w:1.6,t:u,a:old*.6});
          R.box([X(i),0,Z(1)],[.42,.5*H,.42],{fill:mix(P.paper,P.c3,.5),a:old*u});
          R.label(tp,ph?'V('+NM[i]+')':'p 0.5 · V('+NM[i]+') 0.5',{fs:12,mono:true,c:P.c3,dy:-12,a:old*u});
          R.flowArc([tp[0],tp[1]+.04,tp[2]],top(X(3),.5),.5,{c:P.c3,a:old*u,n:7,speed:1.2})});
        tgt(X(3),.5,'c3','DP target 0.5',u)}
      if(k===2){const u=at(k,e,2),pts=epPts(R,true);for(let i=1;i<=12;i++)pts.push(R.arcPt([X(3),.06,Z(0)],top(X(3),1),.25,i/12));
        R.flow(pts,{c:P.c2,a:old*Math.min(1,u*2),r:.09,speed:1.6,n:18});tgt(X(3),1,'c2','G = 1',u)}
      if(k===3){const u=at(k,e,3),tp=[X(4),.5*H+.04,Z(1)];R.arc([X(3),.12,Z(0)],[X(4),.12,Z(1)],.3,{c:P.c1,w:2,t:u,a:old*.7});R.glow([X(4),.5*H,Z(1)],.45,{c:P.acc,a:u});
        R.flowArc(tp,top(X(3),.5),.45,{c:P.c1,a:old*u,n:8,speed:1.2});tgt(X(3),.5,'c1','0 + V(D) = 0.5',u)}
      if(k===4){const u=at(k,e,4),tp=[X(5),.5*H+.04,Z(2)];R.arc([X(3),.12,Z(0)],[X(5),.12,Z(2)],.4,{c:P.c4,w:2,t:u,a:old*.7});R.glow([X(5),.5*H,Z(2)],.45,{c:P.acc,a:u});
        R.flowArc(tp,top(X(3),.5),.6,{c:P.c4,a:old*u,n:10,speed:1.3});tgt(X(3),.5,'c4','0 + 0 + V(E) = 0.5',u)}
      if(k===5||k===6){const u=k===5?at(k,e,5):1;
        [['c1',0,'G(1)'],['c4',1,'G(2)'],['c2',2,'G']].forEach(([c,j,n],q)=>{tgt(LX[q],LR.G[j],c,null,u);   // names and weights under the bars, so the streams leaving the tops stay clear
          R.label([LX[q],0,ZS+.2],n+' '+f3(LR.G[j]),{fs:12.5,b:1,mono:true,c:P[c],dy:14,a:old*u,wide:1});
          R.label([LX[q],0,ZS+.2],'× '+f3(LR.w[j]),{fs:12.5,b:1,mono:true,c:P[c],dy:ph?14:30,a:old*u});
          // each return streams into the blend in proportion to its weight
          R.flowArc(top(LX[q],LR.G[j]),top(LL,LR.v),.35+.12*(2-q),{c:P[c],a:old*u,n:Math.round(3+LR.w[j]*14),r:.05+.06*LR.w[j],speed:1.2})});
        tgt(LL,LR.v,'acc','Gλ = '+f3(LR.v),u,{al:'left',dx:12,dy:-2})}
    }
    if(neu>0){
      // one transition beside a cliff: S, then S′ whose four action values are drawn as cost bars (height grows with the square root of -Q)
      const dim=k===7?.55:1,cl=k===7?0:neu;
      sq(S,.95,mix(P.paper,P.soft,.5),neu,R);sq(SP,.95,mix(P.paper,P.soft,.5),neu,R);sq([S[0],1.65],.95,mix(P.paper,P.bad,.35),neu*dim,R);sq([SP[0],1.65],.95,mix(P.paper,P.bad,.35),neu*dim,R);
      R.label([S[0],0,2.6],'cliff',{fs:12.5,b:1,c:P.bad,a:cl,dy:4});R.label([SP[0],0,2.6],'cliff',{fs:12.5,b:1,c:P.bad,a:cl,dy:4});
      R.label([S[0]+.95,0,S[1]+.95],'S',{fs:15,b:1,dx:-12,dy:-4,a:neu});R.label([SP[0]+.95,0,SP[1]+.95],'S′',{fs:15,b:1,dx:-12,dy:-4,a:neu});
      const a0=[S[0]+.75,.1,S[1]],a1=[SP[0]-.85,.1,SP[1]];R.arc(a0,a1,1.1,{c:P.ink,w:1.8,a:neu*(k===7?.35:1)});
      if(k===6){R.label(R.arcPt(a0,a1,1.1,.5),'right, R = −1',{fs:12.5,mono:true,dy:-12,a:neu,wide:1});R.flowArc(a0,a1,1.1,{c:P.acc,a:neu,n:6,speed:1.4})}
      ACT.forEach(([n,q,d,al,dx,dy])=>{const hl=k===6?n==='down':n==='down'||n==='right',col=n==='down'?P.bad:n==='right'?P.good:P.c1;
        R.box([SP[0]+d[0],0,SP[1]+d[1]],[.42,CQ(q),.42],{fill:mix(P.paper,col,.55),a:neu*(hl?1:.55)});
        R.label([SP[0]+d[0],CQ(q),SP[1]+d[1]],n+' '+f2(q),{al,dx,dy:dy||(al==='center'?-12:-2),mono:true,fs:12,a:neu*(hl?1:.6),c:n==='down'?P.bad:P.ink,wide:n==='up'||n==='left'?1:0})});
      if(k===6)R.glow([SP[0],CQ(-100)+.1,SP[1]+.5],.55,{c:P.bad,a:neu});
      // step 8: the three targets for Q(S, right) on a shelf behind S; S′'s action values stream into each: SARSA from the action taken (down),
      // Expected SARSA from all four in proportion to their chance under epsilon-greedy, Q-learning from the best (right)
      if(k===7){const u=at(k,e,7);R.box([S[0],0,S[1]],[.42,CQ(-5),.42],{fill:mix(P.paper,P.c1,.45),a:neu});
        R.label([S[0],CQ(-5),S[1]],'Q(S, right) −5',{fs:12,mono:true,al:'left',dx:16,dy:-2,a:neu,wide:1});
        R.line([[S[0],.02,S[1]-.3],[S[0],.02,TZ+.3]],{c:P.mute,w:1.2,dash:[3,4],a:neu*.8});
        const src=n=>{const d=ACT.find(x=>x[0]===n);return [SP[0]+d[2][0],CQ(d[1])+.04,SP[1]+d[2][1]]};
        [['c1','SARSA',TT.sarsa.tg,[['down',1]]],['c3','Expected SARSA',TT.es.tg,ACT.map(x=>[x[0],chance(x[0])])],['c2','Q-learning',TT.q.tg,[['right',1]]]].forEach(([c,nm,v,from],j)=>{
          const tp=[TX[j],CQ(v)*u+.02,TZ];R.box([TX[j],0,TZ],[.46,Math.max(.02,CQ(v)*u),.46],{fill:mix(P.paper,P[c],.65),a:neu,ea:.5});
          if(j===1)R.label([TX[j],0,TZ+.25],ph?f2(v):nm+' '+f2(v),{fs:12.5,b:1,mono:true,c:P[c],dy:14,a:u});   // Expected SARSA's label under its bar: its top is level with Q-learning's
          else R.label(tp,ph?f2(v):nm+' '+f2(v),{fs:12.5,b:1,mono:true,c:P[c],dy:-12,a:u});
          from.forEach(([n,w])=>R.flowArc(src(n),[TX[j],Math.max(.3,CQ(v)*u),TZ],.6+.2*(2-j),{c:P[c],a:u*(w<.1?.7:1),n:Math.max(1,Math.round(w*11)),r:w<.1?.045:.06,speed:1.3}))})}
    }
  }
  const full={cam:[-.38,.78],bounds:[[-4.3,0,-2.8],[3.7,2.2,2.6]]};
  const VIEW=[full,
    {cam:[-.38,.68],bounds:[[X(1)-.9,0,ZS-.5],[X(5)+.9,1.6,Z(1)+.9]]},                         // DP: C, its two successors, the shelf
    full,                                                                                         // Monte Carlo: the whole episode
    {cam:[-.38,.7],bounds:[[X(2)-.8,0,ZS-.5],[X(4)+1.2,1.5,Z(1)+.9]]},                         // TD(0): C, D and the shelf
    {cam:[-.38,.72],bounds:[[X(2)-.7,0,ZS-.5],[X(5)+1.2,1.5,Z(2)+.9]]},                          // two steps: C to E and the shelf
    {cam:[-.25,.6],bounds:[[LX[0]-1.1,0,ZS-.6],[LL+1.5,2.4,ZS+1]]},                              // the lambda-return: the shelf up close
    {cam:[-.38,.78],bounds:[[-3.2,0,-2.4],[3.2,2.3,2.7]]},                                       // the cliff transition
    {cam:[-.12,.62],bounds:[[-4.2,0,-2.5],[2.7,2.4,1.2]]}];                                       // the three targets and S′
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'how far the target looks, which next action it trusts',cam:full.cam,bounds:full.bounds,aspect:.62,draw,dur:1300,hold:5200,view:k=>VIEW[k]});
  window.RD_TEST=Object.assign(window.RD_TEST||{},{hero:{LR,TT}});
})();
