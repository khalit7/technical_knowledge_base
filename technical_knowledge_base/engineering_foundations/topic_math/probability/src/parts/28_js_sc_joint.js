// ---- Scene, Fig. 3 (section 5): the umbrella joint distribution as a grid of bars; marginals on the edges; conditioning on
// the umbrella as keeping one column and renormalising; independence as glass lids at P(x) P(y) (renderer v2) ----
// Rows X: rain (0.3), dry; columns Y: umbrella, none; P(umbrella | rain) = 0.8, P(umbrella | dry) = 0.2. Every sum, product and ratio is computed here.
(function(){
  if(!document.getElementById('stg-joint')||!window.PMS)return;const {mix,lerp}=S3;
  const XS=['rain','dry'],YS=['umbrella','none'],J=[[.24,.06],[.14,.56]];
  const px=J.map(r=>r[0]+r[1]),py=[0,1].map(j=>J[0][j]+J[1][j]),cond=[J[0][0]/py[0],J[1][0]/py[0]];
  window.PM_JOINT={px,py,prod:[0,1].map(i=>[0,1].map(j=>px[i]*py[j])),cond};
  const SY=3,CW=1.3,gx=j=>(j-.5)*1.5,gz=i=>(i-.5)*1.5,ZM=2.05,XM=2.45,MS=SY*.6;
  function draw(R,k,e){const P=R.P;R.grid(-3.4,3.4,-3,3,.5);
    // the four cells: rows (rain, dry) run front to back, columns (umbrella, none) left to right
    for(let i=0;i<2;i++)for(let j=0;j<2;j++){const x=gx(j),z=gz(i);
      R.quad([[x-CW/2,.004,z-CW/2],[x+CW/2,.004,z-CW/2],[x+CW/2,.004,z+CW/2],[x-CW/2,.004,z+CW/2]],{fill:P.soft,a:.8,ea:.5,dz:.4});
      let h=J[i][j],a=k===0?1:k===1?.4:k===2?(j===0?1:1-.8*e):k===3?.85:1,lab=J[i][j].toFixed(2),c=P.c1;
      if(k===0)h*=e;
      if(k===2&&j===0){h=lerp(J[i][j],cond[i],e);lab=(e<1?h.toFixed(3):cond[i].toFixed(3));c=mix(P.c1,P.acc,e)}
      R.box([x,0,z],[.66,h*SY,.66],{fill:mix(c,P.paper,.3),a});R.label([x,h*SY,z],lab,{mono:true,fs:12.5,b:1,dy:-10,c:k===2&&j===0?P.acc:P.c1,a:k===3&&R.W<520?.35:Math.max(a,.3)})}
    XS.forEach((s,i)=>R.label([gx(0)-CW/2-.25,0,gz(i)],s,{al:'right',dx:-6,fs:12.5,b:1,c:P.mute,grp:'rows'}));
    YS.forEach((s,j)=>R.label([gx(j),0,gz(1)+CW/2+.1],s,{fs:12.5,b:1,c:P.mute,dy:15}));
    // 2. the marginals: sum each row (P(X), on the left) and each column (P(Y), in front); dots stream from the cells into the sums
    const ma=k===1?e:0;
    if(ma>.01){px.forEach((v,i)=>{R.box([XM,0,gz(i)],[.4,v*MS,.5],{fill:mix(P.c3,P.paper,.25),a:ma});R.label([XM,v*MS,gz(i)],'P('+XS[i]+') '+v.toFixed(2),{mono:true,fs:12,b:1,dy:-10,al:'left',dx:4,c:P.c3,a:ma,grp:'px'})});
      py.forEach((v,j)=>{R.box([gx(j),0,ZM+.4],[.5,v*MS,.4],{fill:mix(P.c6,P.paper,.25),a:ma});R.label([gx(j),v*MS,ZM+.4],'P('+YS[j]+') '+v.toFixed(2),{mono:true,fs:12,b:1,dy:-10,c:P.c6,a:ma,grp:'py'})});
      for(let i=0;i<2;i++)for(let j=0;j<2;j++){const x=gx(j),z=gz(i),h=J[i][j]*SY,n=Math.round(2+J[i][j]*12);
        R.flowArc([x,h,z],[XM,px[i]*MS,gz(i)],.35,{c:P.c3,r:.05,n,a:ma});R.flowArc([x,h,z],[gx(j),py[j]*MS,ZM+.4],.35,{c:P.c6,r:.05,n,a:ma})}}
    // 3. condition on the umbrella: keep that column and divide by its sum, 0.38
    if(k===2)R.label([gx(0),cond[0]*SY+.25,gz(0)],'÷ 0.38',{mono:true,fs:13,b:1,c:P.acc,al:'left',dx:30,a:e});
    // 4. independence would put each cell at P(x) P(y): glass lids; the bars miss them, so rain and umbrellas are dependent
    if(k===3)for(let i=0;i<2;i++)for(let j=0;j<2;j++){const x=gx(j),z=gz(i),h=px[i]*py[j]*SY;
      R.glass([x-.5,h,z+.5],[1,0,0],[0,0,-1],{c:P.c5,a:e,nu:3,nv:3,th:.02});
      R.label([x+.5,h,z+.5],(px[i]*py[j]).toFixed(3),{mono:true,fs:12.5,b:1,c:P.c5,al:'left',dx:6,dy:12,a:e})}
  }
  S3.stage({id:'stg-joint',list:'sx-joint',fig:'Fig. 3 · one table, three readings',cam:[.42,.62],bounds:[[-2.6,0,-1.7],[3.2,1.9,2.7]],aspect:.74,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,14,16]});
})();
