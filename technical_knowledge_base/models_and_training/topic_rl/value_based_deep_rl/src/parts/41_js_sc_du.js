// ---- Scene (section 5): the dueling head on one example, V = 5 and A = (1, -1, 3), recombined by subtracting the mean, then the max (renderer v2: glass layers, flows, camera per step) ----
// Numbers (window.VB3.du, recomputed by src/checks/check_stages.mjs): mean 1 gives A - mean = (0, -2, 2), Q = (5, 3, 7); max 3 gives (-2, -4, 0), Q = (3, 1, 5).
(function(){
  const V=5,A=[1,-1,3],mean=A.reduce((s,a)=>s+a,0)/A.length,max=Math.max(...A);
  const D={V,A,mean,max,cMean:A.map(a=>a-mean),qMean:A.map(a=>V+a-mean),cMax:A.map(a=>a-max),qMax:A.map(a=>V+a-max)};
  window.VB3=window.VB3||{};window.VB3.du=D;
  if(!document.getElementById('stg-du')||!window.S3)return;const {at,mix,lerp}=S3;
  const HS=.3,ZV=-1.1,ZA=1.1,XS=-1.7,XB=.3,XC=2.6,XQ=4.9,AX=[-.45,0,.45],CV=[-5.1,-4.6,-4.1],CH=[1.0,.84,.68];   // world height per unit; stream depth; columns; convolution plates
  const sgn=v=>(v<0?'−':'')+Math.abs(v);
  function bar(R,x,z,v,o){const h=v*HS;R.box([x,Math.min(0,h),z],[.34,Math.max(.03,Math.abs(h)),.34],Object.assign({shadow:v>=0},o))}
  // a fully connected layer as one glass plate standing across the stream
  function fc(R,x,z,c,a){R.glass([x,.2,z-.3],[0,0,.6],[0,.6,0],{c,a,nu:3,nv:3,th:.06})}
  function draw(R,k,e){const P=R.P,ph=R.W<520,fa=Math.min(1,e*1.6);R.grid(-5.8,5.8,-2.2,2.4,.5);
    // the shared convolutions: three glass plates
    const ca=k<=1?1:.25;CV.forEach((x,i)=>{const h=CH[i];R.glass([x,.1+(1-h)/2,-h/2],[0,0,h],[0,h,0],{c:P.c1,a:ca,nu:4,nv:4,th:.06})});
    if(k<=1)R.label([-4.6,0,.65],ph?'convolutions':'shared convolutions',{fs:12.5,b:1,dy:12});
    // step 1: one fully connected stream with one Q per action
    const s1=k===0?1:k===1?1-e:0;
    if(s1>0){fc(R,XS,0,P.c1,s1);R.flow([[-4.0,.6,0],[XS-.05,.5,0]],{c:P.c1,a:s1,r:.07,speed:1.2,n:5});
      AX.forEach((dz,i)=>{R.flowArc([XS+.1,.5,0],[XB,.6,dz*1.6],.15,{c:P.c1,a:s1*.8,r:.055,speed:1.1,n:4});R.box([XB,0,dz*1.6],[.3,.55,.3],{fill:mix(P.paper,P.c1,.25),a:s1});
        R.label([XB,.55,dz*1.6],'Q(s, a'+(i+1)+')',{fs:12,mono:1,al:'left',dx:8,a:s1,grp:'q1'})});
      R.label([XS,.8,0],'one stream',{fs:12.5,b:1,dy:-12,a:s1})}
    // steps 2 onward: a value stream and an advantage stream, each its own glass layer
    const s2=k===0?0:k===1?e:1,sa=k>=3?.3:1;
    if(s2>0)[[ZV,'value stream',P.c3],[ZA,'advantage stream',P.c4]].forEach(([z,lab,c])=>{fc(R,XS,z,c,s2*sa);
      if(k===1)R.flowArc([-4.0,.6,0],[XS-.05,.5,z],.25,{c,a:fa,r:.07,speed:1.2,n:7});
      if(k<=2)R.label([XS,0,z+.3],ph?lab.split(' ')[0]:lab,{fs:12.5,b:1,dy:12,a:s2,c})});
    // step 3: V = 5 and A = (1, -1, 3), streaming out of their layers
    const s3=at(k,e,2);
    if(s3>0){const va=k===3?.3:1,aa=k===4||k===5?.3:1;
      if(k===2){R.flow([[XS+.1,.5,ZV],[XB-.1,.6,ZV]],{c:P.c3,a:fa,r:.07,speed:1.2,n:6});AX.forEach(dx=>R.flowArc([XS+.1,.5,ZA],[XB+dx,.4,ZA],.12,{c:P.c4,a:fa,r:.055,speed:1.2,n:4}))}
      bar(R,XB,ZV,V*s3,{fill:mix(P.paper,P.c3,.7),a:va});R.label([XB,V*HS*s3,ZV],'V = 5',{fs:12.5,b:1,mono:1,dy:-11,c:P.c3,a:s3*Math.max(va,.6)});
      A.forEach((a,i)=>{bar(R,XB+AX[i],ZA,a*s3,{fill:mix(P.paper,P.c4,.6),a:aa});R.label([XB+AX[i],a<0?a*HS*s3:a*HS*s3,ZA],sgn(a),{fs:12.5,mono:1,dy:a<0?12:-10,a:s3*Math.max(aa,.5)})});
      if(k===2)R.label([XB+.7,.15,ZA],'A(s, a1..a3)',{fs:12.5,mono:1,al:'left',dx:8,c:P.c4,a:s3})}
    // step 4 onward: the mean (then the max) as a glass level across the advantages; the centred advantages beside them
    const s4=at(k,e,3);
    if(s4>0){const u=k===5?e:0,lev=lerp(mean,max,u),C=D.cMean.map((c,i)=>lerp(c,D.cMax[i],u)),hot=k===3||k===5,ca2=k===4?.35:1;
      R.glass([XB-.7,lev*HS,ZA-.35],[1.4,0,0],[0,0,.7],{c:P.acc,a:hot?(k===3?fa:1):.3,nu:2,nv:2,th:.02});
      if(hot)R.label([XB-.7,lev*HS,ZA+.35],(k===5?'max A = ':'mean A = ')+Math.round(lev),{fs:12.5,b:1,mono:1,al:'right',dx:-6,dy:6,c:P.acc,a:k===3?fa:1});
      C.forEach((c,i)=>{if(hot)R.flowArc([XB+AX[i],Math.max(.1,A[i]*HS),ZA],[XC+AX[i],Math.max(.1,c*HS)+.05,ZA],.35,{c:P.acc,a:(k===3?fa:1)*.85,r:.055,speed:1.3,n:6});
        bar(R,XC+AX[i],ZA,c*s4,{fill:mix(P.paper,P.c4,.75),a:ca2});R.label([XC+AX[i],c<0?c*HS*s4:0,ZA],sgn(Math.round(c)),{fs:12.5,mono:1,dy:c<0?12:-10,b:hot,a:s4*(u>0&&u<1?.4:Math.max(ca2,.6))})});
      if(hot)R.label([(XB+XC)/2+.3,1.25,ZA],k===5?'A − max A':'A − mean A',{fs:12.5,b:1,c:P.acc,a:k===3?fa:1})}
    // step 5 onward: Q = V + centred A, flowing together; the greedy action highlighted
    const s5=at(k,e,4);
    if(s5>0){const u=k===5?e:0,Q=D.qMean.map((q,i)=>lerp(q,D.qMax[i],u)),b=Q.indexOf(Math.max(...Q));
      if(k===4||k===5){const f2=k===4?fa:1;AX.forEach((dz,i)=>{R.flowArc([XB,V*HS+.05,ZV],[XQ+AX[i],Math.max(.1,Q[i]*HS*.5),0],.5,{c:P.c3,a:f2*.85,r:.06,speed:1.3,n:7});
        R.flowArc([XC+AX[i],.15,ZA],[XQ+AX[i],Math.max(.1,Q[i]*HS*.4),0],.3,{c:P.c4,a:f2*.85,r:.06,speed:1.3,n:6})})}
      Q.forEach((q,i)=>{bar(R,XQ+AX[i],0,q*s5,{fill:i===b?P.acc:mix(P.paper,P.c1,.6)});R.label([XQ+AX[i],q*HS*s5,0],String(Math.round(q)),{fs:12.5,b:i===b,mono:1,dy:-10,c:i===b?P.acc:P.ink,a:s5*(u>0&&u<1?.4:1)})});
      R.label([XQ,0,.4],k>=5?'Q = (3, 1, 5)':'Q = (5, 3, 7)',{fs:12.5,b:1,mono:1,dy:14,a:s5});
      if(k>=5)R.label([XQ,Q[b]*HS,0],'V = max Q = 5',{fs:12.5,b:1,c:P.c3,dy:-30,a:e})}
  }
  const full={cam:[-.18,.66],bounds:[[-5.4,-.8,-1.5],[5.6,2.0,1.7]]};
  // the streams are seen up close while they split; the numbers' steps frame the bars; a phone drops the convolutions sooner
  const V0=[[[-5.4,0,-1.5],[1.3,1.0,1.7]],[[-5.4,0,-1.5],[1.0,1.0,1.7]],[[-2.4,-.4,-1.5],[3.4,1.8,1.7]],[[-1.7,-.8,-1.3],[3.4,1.6,1.7]],[[-.4,-.8,-1.5],[5.6,2.2,1.7]],[[-.4,-1.3,-1.5],[5.6,2.2,1.7]]];
  S3.stage({id:'stg-du',list:'sx-du',fig:'§5 · one stream, then value plus advantage',cam:full.cam,bounds:full.bounds,aspect:.56,draw,dur:1500,hold:4600,
    margin:w=>w<520?[16,10,14,10]:[20,16,16,16],
    view:k=>({cam:k<=1?[-.6,.55]:k===3?[-.1,.5]:[-.18,.6],bounds:V0[k]})});
})();
