// ---- Scene (hero): the two choices that define every target, on the worked random-walk episode and the cliff transition of section 4 ----
// Data: the page's engine (MFE.lamReturn on rewards 0, 0, 1 with V(D) = V(E) = 0.5; MFE.twoTargets on the transition of section 4 with its default sliders).
// Steps 1 to 6: states A to E across, time towards the viewer, value bars at the visited states; each target is a bar on a shelf behind V(C).
// Steps 7 and 8: the picture is replaced by one cliff transition and the three targets SARSA, Expected SARSA and Q-learning build from it.
(function(){
  const M=window.MFE;if(!M||!window.S3||!document.getElementById('stg-hero'))return;const {at,mix}=S3;
  const X=i=>(i-3)*1.05,Z=t=>-1.2+t*1.05,H=2.2,ZS=-2.35,NM=['end','A','B','C','D','E','end'];   // x: left end, A..E, right end; z: time steps 0..3; ZS: the target shelf
  const path=[[3,0],[4,1],[5,2],[6,3]],rew=[0,0,1];                                              // C, D, E, off the right end
  const LR=M.lamReturn([0,0,1],[0.5,0.5],1,0.5);                                                 // G(1) = 0.5, G(2) = 0.5, G(3) = 1; weights 0.5, 0.25, 0.25; 0.625
  const TT=M.twoTargets({R:-1,q:-5,qBest:-4,qDown:-100,qO1:-5,qO2:-6,qAp:-100,a:0.5,g:1,eps:0.1});
  const f2=v=>(v<0?'−':'')+(+Math.abs(v).toFixed(3)),f3=v=>String(+v.toFixed(3));
  const CQ=v=>.22*Math.sqrt(Math.abs(v));                                                        // cost bar height for steps 7 and 8
  const sq=(c,h,f,a,R)=>R.quad([[c[0]-h,0,c[1]-h],[c[0]+h,0,c[1]-h],[c[0]+h,0,c[1]+h],[c[0]-h,0,c[1]+h]],{fill:f,a,ea:.5});
  function draw(R,k,e){const P=R.P,old=k<6?1:k===6?Math.max(0,1-2*e):0,neu=k<6?0:k===6?Math.max(0,2*e-1):1;
    R.grid(-4.2,3.6,-2.7,2.4,.6);
    if(old>0){
      const base=k===0?1:k===1?.25:.55;                                                           // the episode fades while a target is read
      for(let t=0;t<4;t++)for(let i=0;i<7;i++)sq([X(i),Z(t)],.42,i===0||i===6?mix(P.paper,i===6?P.good:P.mute,.35):mix(P.paper,P.soft,.5),old*.9,R);
      for(let t=0;t<4;t++)R.label([X(0)-.55,0,Z(t)],'t = '+t,{al:'right',mono:true,fs:12,c:P.mute,a:old});
      for(let i=1;i<6;i++)R.label([X(i),0,Z(3)+.5],NM[i],{fs:13.5,b:1,dy:12,a:old});
      R.label([X(6),0,Z(3)+.5],'+1',{fs:13.5,b:1,c:P.good,dy:12,a:old});
      // the episode: C, D, E, then off the right end, rewards 0, 0, 1
      const grow=k===0?e:1;for(let j=0;j<3;j++){const u=Math.max(0,Math.min(1,grow*3-j));if(u<=0)continue;const [i0,t0]=path[j],[i1,t1]=path[j+1];
        R.arc([X(i0),.05,Z(t0)],[X(i1),.05,Z(t1)],.35,{c:P.acc,w:2.4,t:u,a:old*base});
        if(u>=1&&k===0)R.label(R.arcPt([X(i0),.05,Z(t0)],[X(i1),.05,Z(t1)],.35,.5),'r = '+rew[j],{mono:true,fs:12,c:P.acc,a:old,dx:14})}
      for(let j=0;j<3;j++){const [i,t]=path[j];if(k===0&&grow*3<j)continue;
        const hl=(k===3&&j===1)||(k===4&&j===2),v=k===2?.5+.05*e:.5;                              // Monte Carlo moves C, D and E to 0.55; the other targets start from 0.5 too
        R.box([X(i),0,Z(t)],[.42,v*H,.42],{fill:hl?mix(P.paper,P.acc,.7):mix(P.paper,P.c1,.45),a:old*(k===1?.35:hl||k===0||k===2||j===0?1:.5)});
        if(k===0||k===2||hl)R.label([X(i)+.22,v*H,Z(t)],'V('+NM[i]+') '+(k===2?String(+v.toFixed(2)):'0.5'),{al:'left',dx:6,mono:true,fs:12,a:old})}
      // a target for V(C): a bar on the shelf behind it, linked to it by a dashed line
      const tgt=(x,v,c,lab,a)=>{R.box([x,0,ZS],[.36,Math.max(.02,v*H),.36],{fill:mix(P.paper,P[c],.62),a:old*a,ea:.5});if(lab)R.label([x,v*H,ZS],lab,{fs:12.5,b:1,mono:true,c:P[c],dy:-12,a:old*a,grp:'tg'})};
      if(k>=1)R.line([[X(3),.02,Z(0)-.25],[X(3),.02,ZS+.25]],{c:P.mute,w:1.2,dash:[3,4],a:old*.8});
      if(k===1){const u=at(k,e,1);[2,4].forEach(i=>{R.arc([X(3),.1,Z(0)],[X(i),.1,Z(1)],.55,{c:P.c3,w:2.2,t:u,a:old});R.box([X(i),0,Z(1)],[.42,.5*H,.42],{fill:mix(P.paper,P.c3,.5),a:old*u});
          R.label([X(i),.5*H,Z(1)],'p 0.5 · V('+NM[i]+') 0.5',{fs:12,mono:true,c:P.c3,dy:-12,a:old*u,grp:'dp'})});
        tgt(X(3),.5,'c3','DP target 0.5',u)}
      if(k===2){R.arc([X(3),.12,Z(0)],[X(6),.12,Z(3)],1.05,{c:P.c2,w:2.6,t:at(k,e,2),a:old});tgt(X(3),1,'c2','G = 1',at(k,e,2))}
      if(k===3){R.arc([X(3),.12,Z(0)],[X(4),.5*H+.05,Z(1)],.5,{c:P.c1,w:2.6,t:at(k,e,3),a:old});R.glow([X(4),.5*H,Z(1)],.45,{c:P.acc,a:at(k,e,3)});tgt(X(3),.5,'c1','0 + V(D) = 0.5',at(k,e,3))}
      if(k===4){R.arc([X(3),.12,Z(0)],[X(5),.5*H+.05,Z(2)],.8,{c:P.c4,w:2.6,t:at(k,e,4),a:old});R.glow([X(5),.5*H,Z(2)],.45,{c:P.acc,a:at(k,e,4)});tgt(X(3),.5,'c4','0 + 0 + V(E) = 0.5',at(k,e,4))}
      if(k===5||k===6){const u=k===5?at(k,e,5):1;
        [['c1',0,'G(1)'],['c4',1,'G(2)'],['c2',2,'G']].forEach(([c,j,n],q)=>tgt(X(3)-1.3+q*.5,LR.G[j],c,n+' '+f3(LR.G[j])+' × '+f3(LR.w[j]),u));
        tgt(X(3)+.75,LR.v,'acc','Gλ = '+f3(LR.v),u)}
    }
    if(neu>0){
      // one transition beside a cliff: S, then S' whose four action values are drawn as cost bars (height grows with the square root of -Q)
      const S=[-1.9,-.3],SP=[1.7,-.3];
      sq(S,.95,mix(P.paper,P.soft,.5),neu,R);sq(SP,.95,mix(P.paper,P.soft,.5),neu,R);sq([S[0],1.65],.95,mix(P.paper,P.bad,.35),neu,R);sq([SP[0],1.65],.95,mix(P.paper,P.bad,.35),neu,R);
      R.label([S[0],0,2.6],'cliff',{fs:12.5,b:1,c:P.bad,a:neu,dy:4});R.label([SP[0],0,2.6],'cliff',{fs:12.5,b:1,c:P.bad,a:neu,dy:4});
      R.label([S[0]+.95,0,S[1]+.95],'S',{fs:15,b:1,dx:-12,dy:-4,a:neu});R.label([SP[0]+.95,0,SP[1]+.95],'S′',{fs:15,b:1,dx:-12,dy:-4,a:neu});
      const a0=[S[0]+.75,.1,S[1]],a1=[SP[0]-.85,.1,SP[1]];R.arc(a0,a1,1.1,{c:P.ink,w:2,a:neu});R.label(R.arcPt(a0,a1,1.1,.5),'right, R = −1',{fs:12.5,mono:true,dy:-12,a:neu,wide:1});
      const acts=[['right',-4,[.5,0],'left',8],['down',-100,[0,.5],'left',8],['up',-5,[0,-.5],'center',0],['left',-6,[-.5,0],'right',-8,14]];
      acts.forEach(([n,q,d,al,dx,dy])=>{const hl=k===6?n==='down':n==='down'||n==='right',col=n==='down'?P.bad:n==='right'?P.good:P.c1;
        R.box([SP[0]+d[0],0,SP[1]+d[1]],[.4,CQ(q),.4],{fill:mix(P.paper,col,.55),a:neu*(hl?1:.55)});
        R.label([SP[0]+d[0],CQ(q),SP[1]+d[1]],n+' '+f2(q),{al,dx,dy:dy||(al==='center'?-12:-2),mono:true,fs:12,a:neu*(hl?1:.6),c:n==='down'?P.bad:P.ink,wide:n==='up'||n==='left'?1:0})});
      if(k===6)R.glow([SP[0],CQ(-100)+.1,SP[1]+.5],.55,{c:P.bad,a:neu});
      // step 8: the three targets for Q(S, right) as cost bars on a shelf behind S, beside Q(S, right) itself
      if(k===7){const u=at(k,e,7);R.box([S[0]+.3,0,S[1]+.3],[.4,CQ(-5),.4],{fill:mix(P.paper,P.c1,.45),a:neu});
        R.label([S[0]+.3,0,S[1]+.3],'Q(S, right) −5',{fs:12,mono:true,al:'left',dx:14,dy:12,a:neu});
        [['c1','SARSA',TT.sarsa.tg],['c3','Expected SARSA',TT.es.tg],['c2','Q-learning',TT.q.tg]].forEach(([c,n,v],j)=>{const z=S[1]-.75+j*.75,x=S[0]-1.45;
          R.box([x,0,z],[.4,CQ(v)*u,.4],{fill:mix(P.paper,P[c],.65),a:neu,ea:.5});
          R.label([x-.2,CQ(v)*u*.5,z],n+' '+f2(v),{fs:12.5,b:1,c:P[c],al:'right',dx:-6,a:u})})}
    }
  }
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'how far the target looks, which next action it trusts',cam:[-.38,.78],bounds:[[-4.3,0,-2.7],[3.7,2.2,2.6]],aspect:.62,draw,dur:1300,hold:5200});
  window.RD_TEST=Object.assign(window.RD_TEST||{},{hero:{LR,TT}});
})();
