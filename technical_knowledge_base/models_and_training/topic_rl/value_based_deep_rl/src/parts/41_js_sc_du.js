// ---- Scene (section 5): the dueling head on one example, V = 5 and A = (1, -1, 3), recombined by subtracting the mean, then the max ----
// Numbers (window.VB3.du, recomputed by src/checks/check_stages.mjs): mean 1 gives A - mean = (0, -2, 2), Q = (5, 3, 7); max 3 gives (-2, -4, 0), Q = (3, 1, 5).
(function(){
  const V=5,A=[1,-1,3],mean=A.reduce((s,a)=>s+a,0)/A.length,max=Math.max(...A);
  const D={V,A,mean,max,cMean:A.map(a=>a-mean),qMean:A.map(a=>V+a-mean),cMax:A.map(a=>a-max),qMax:A.map(a=>V+a-max)};
  window.VB3=window.VB3||{};window.VB3.du=D;
  if(!document.getElementById('stg-du')||!window.S3)return;const {at,mix,lerp}=S3;
  const HS=.3,ZV=-1.1,ZA=1.1,XS=-1.6,XB=.3,XC=2.6,XQ=4.9,AX=[-.45,0,.45];   // world height per unit; stream depth; columns
  const sgn=v=>(v<0?'−':'')+Math.abs(v);
  function bar(R,x,z,v,o){const h=v*HS;R.box([x,Math.min(0,h),z],[.34,Math.max(.03,Math.abs(h)),.34],o)}
  function draw(R,k,e){const P=R.P,ph=R.W<520;R.grid(-5.6,5.8,-2.2,2.4,.5);
    // the shared convolutions
    [[.24,1.0],[.24,.82],[.24,.66]].forEach(([t,h],i)=>R.box([-5+i*.55,.6-h/2,0],[t,h,h],{fill:mix(P.paper,P.c1,.3),a:k>=3?.45:1}));
    if(!(ph&&k>=2))R.label([-4.45,0,.75],ph?'convolutions':'shared convolutions',{fs:12.5,b:1,dy:12,a:k>=3?.5:1});
    // step 1: one fully connected stream with one Q per action
    const s1=k===0?1:k===1?1-e:0;
    if(s1>0){R.box([XS,.35,0],[.3,.5,.5],{fill:mix(P.paper,P.c1,.45),a:s1});R.arc([-3.75,.6,0],[XS-.2,.6,0],.25,{c:P.mute,w:1.6,a:s1,head:5});
      AX.forEach((dz,i)=>{R.box([XB,0,dz*1.6],[.3,.55,.3],{fill:mix(P.paper,P.c1,.25),a:s1});R.label([XB,.55,dz*1.6],'Q(s, a'+(i+1)+')',{fs:12,mono:1,al:'left',dx:8,a:s1,grp:'q1'})});
      R.label([XS,.85,0],'one stream',{fs:12.5,b:1,dy:-12,a:s1})}
    // steps 2 onward: two streams
    const s2=k===0?0:k===1?e:1;
    if(s2>0){[[ZV,'value stream',P.c3],[ZA,'advantage stream',P.c4]].forEach(([z,lab,c])=>{R.box([XS,.35,z],[.3,.5,.5],{fill:mix(P.paper,c,.45),a:s2*(k>=4?.5:1)});
        R.arc([-3.75,.6,0],[XS-.2,.6,z],.3,{c:P.mute,w:1.6,a:s2*.8,head:5,t:k===1?e:1});R.label([XS,0,z+.3],ph?lab.split(' ')[0]:lab,{fs:12.5,b:1,dy:12,a:s2*(k>=4?.5:1)})})}
    // step 3: V = 5 and A = (1, -1, 3)
    const s3=at(k,e,2);
    if(s3>0){const fa=k>=4?.5:1;bar(R,XB,ZV,V*s3,{fill:mix(P.paper,P.c3,.7),a:fa});R.label([XB,V*HS*s3,ZV],'V = 5',{fs:12.5,b:1,mono:1,dy:-11,a:s3*fa});
      A.forEach((a,i)=>{bar(R,XB+AX[i],ZA,a*s3,{fill:mix(P.paper,P.c4,.6),a:fa});R.label([XB+AX[i],Math.max(0,a*HS*s3),ZA],sgn(a),{fs:12,mono:1,dy:-10,a:s3*fa})});
      if(!ph)R.label([XB,0,ZA+.35],'A(s, a1..a3)',{fs:12,mono:1,dy:14,a:s3*fa,c:P.mute})}
    // step 4 onward: centred advantages; step 6 morphs them from the mean to the max
    const s4=at(k,e,3);
    if(s4>0){const u=k===5?e:k>5?1:0,C=D.cMean.map((c,i)=>lerp(c,D.cMax[i],u));
      C.forEach((c,i)=>{bar(R,XC+AX[i],ZA,c*s4,{fill:mix(P.paper,P.c4,.75)});R.label([XC+AX[i],Math.max(0,c*HS*s4),ZA],sgn(Math.round(c)),{fs:12,mono:1,dy:-10,a:s4*(u>0&&u<1?.4:1)})});
      R.arc([XB+.6,.5,ZA],[XC-.6,.5,ZA],.5,{c:P.acc,w:2,head:6,t:k===3?e:1,top:1});
      R.label([(XB+XC)/2,1.15,ZA],k>=5?'− max A (3)':'− mean A (1)',{fs:12.5,b:1,c:P.acc,dy:-10,a:s4})}
    // step 5 onward: Q = V + centred A, the greedy action highlighted
    const s5=at(k,e,4);
    if(s5>0){const u=k===5?e:k>5?1:0,Q=D.qMean.map((q,i)=>lerp(q,D.qMax[i],u)),b=Q.indexOf(Math.max(...Q));
      Q.forEach((q,i)=>{bar(R,XQ+AX[i],0,q*s5,{fill:i===b?P.acc:mix(P.paper,P.c1,.6)});R.label([XQ+AX[i],q*HS*s5,0],String(Math.round(q)),{fs:12.5,b:i===b,mono:1,dy:-10,c:i===b?P.acc:P.ink,a:s5*(u>0&&u<1?.4:1)})});
      R.arc([XB,V*HS+.1,ZV],[XQ-.3,1.2,0],.5,{c:P.c3,w:1.8,head:6,t:k===4?e:1,top:1});R.arc([XC+.6,.3,ZA],[XQ-.3,.6,0],.35,{c:P.c4,w:1.8,head:6,t:k===4?e:1,top:1});
      R.label([XQ,0,.4],k>=5?'Q = (3, 1, 5)':'Q = (5, 3, 7)',{fs:12.5,b:1,mono:1,dy:14,a:s5});
      if(k>=5)R.label([XQ,1.25,0],'V = max Q = 5',{fs:12.5,b:1,c:P.c3,dy:-14,a:e})}
  }
  const st=S3.stage({id:'stg-du',list:'sx-du',fig:'§5 · one stream, then value plus advantage',cam:[-.18,.72],aspect:.5,
    // on a phone the camera drops the convolutions once the streams carry the numbers
    bounds:st=>{const h=document.getElementById('stg-du');return h&&h.clientWidth<520&&st.k>=2?[[-2.2,-.8,-1.5],[5.6,2.0,1.7]]:[[-5.4,-.8,-1.5],[5.6,2.0,1.7]]},draw,dur:1300,hold:4400});
  if(st)st.draw();
})();
