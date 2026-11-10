// ---- Scene (Fig. 3, stg-cx): each Colossus build as a block whose length along the floor is its days to bring online and whose height is its megawatts,
// against the S-1's greenfield yardstick (100 MW in about two years). The slope of each block's ramp is its build rate, MW per day; dots climb each ramp
// at a speed set by that rate. Then the rates themselves as columns. All numbers from window.XCX (the S-1 figures quoted on the page). ----
(function(){
  if(!document.getElementById('stg-cx')||!window.S3||!window.XCX)return;const {lerp,mix}=S3,B=XCX.B;
  const DX=.01,HY=.011,X0=-3.65,DP=.7,Z=[1.7,.55,-.6,-1.75],RX=[.75,1.65,2.55,3.45],RH=.62,RZ=-1.2;
  const COL=P=>[P.mute,P.c1,P.c4,P.c2];
  function draw(R,k,e,st){const P=R.P,C=COL(P),pk=st.pk,t=pk===k?1:e;R.grid(-4.6,4.6,-2.5,2.6,.5);
    const at=f=>lerp(f(pk),f(k),t);
    // alpha of build i: in full at its own step, receding after, faint before; in step 5 everything recedes for the rate columns
    const al=i=>at(s=>s===4?.3:1),tint=i=>at(s=>s===i?.7:.28),grow=i=>k===i&&pk!==k?e:k>=i?1:0;
    // the floor axis: days to bring online, along the front
    const ZA=2.25;R.line([[X0,0,ZA],[X0+730*DX,0,ZA]],{c:P.mute,w:1.2});
    [0,100,200,300,400,500,600,730].forEach(d=>{R.line([[X0+d*DX,0,ZA-.08],[X0+d*DX,0,ZA+.08]],{c:P.mute,w:1.2});if(d%200===0&&d!==400||d===730)R.label([X0+d*DX,0,ZA+.1],(d===730?'730 days':d),{mono:true,fs:12,dy:13,c:P.mute})});
    R.label([X0+400*DX,0,ZA+.1],'days to bring online →',{fs:12,dy:13,c:P.mute,wide:1});
    // the blocks: length = days, height = MW
    B.forEach((b,i)=>{const a=al(i),g=grow(i),L=b.d*DX,H=Math.max(.01,b.mw*HY*(i===k?Math.max(.02,g):1)),cx=X0+L/2,z=Z[i];
      if(i>k&&k<4){R.box([cx,0,z],[L,b.mw*HY,DP],{fill:P.paper,fa:.15,ea:.35,a:.6,shadow:false,lw:.6});return}
      R.box([cx,0,z],[L,H,DP],{fill:mix(P.paper,C[i],i===0?.3:tint(i)),a,lw:.8});
      // the ramp on the front face: from day 0 to the day it came online, rising by its megawatts; its slope is MW per day
      const ra=k===4?.95:a,p0=[X0,0,z+DP/2+.01],p1=[X0+L,b.mw*HY,z+DP/2+.01];
      R.line([p0,p1],{c:C[i],w:2,a:ra*(k>=i?1:0)});
      if(k===i||k===4)R.flow([p0,p1],{c:C[i],a:ra,r:.06,n:Math.max(3,Math.round(Math.hypot(L,b.mw*HY)*3)),speed:.25+.45*b.rate});
      const lab=k===4?(b.rate.toFixed(2)+' MW/day'):(i===0?'100 MW · ~2 years':(b.g/1000).toFixed(0)+'k '+b.chip+' · '+b.mw+' MW · '+b.d+' days');
      if(k>=i||k===4)R.label([X0+L,b.mw*HY,z+DP/2],lab,{al:'left',dx:10,dy:-2,fs:12.5,b:i===k||k===4,mono:k===4,c:i===0?P.ink:C[i],a:Math.max(.6,ra),wide:k===4||i===0?1:0})});
    // step 5: the rates themselves as columns, 25 times apart
    const ca=at(s=>s===4?1:0);
    if(ca>.01){B.forEach((b,i)=>{const h=Math.max(.03,b.rate*RH*(k===4&&pk!==4?e:1));R.box([RX[i],0,RZ],[.55,h,.55],{fill:mix(P.paper,C[i],i?.7:.35),a:ca,lw:.8});
        R.label([RX[i],h,RZ],b.rate.toFixed(2),{mono:true,fs:12.5,b:1,dy:-12,c:i?C[i]:P.ink,a:ca})});
      R.label([RX[0]-.4,0,RZ],'MW per day',{al:'right',dx:-6,fs:12.5,b:1,c:P.ink,a:ca,wide:1})}
  }
  S3.stage({id:'stg-cx',list:'sx-cx',fig:'Fig. 3 · Colossus builds: days long, megawatts high',cam:[.16,.5],bounds:[[-3.9,0,-2.1],[3.9,2.5,2.6]],aspect:.56,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,16,10]:[20,130,16,20]});
})();
