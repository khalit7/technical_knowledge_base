// ---- Scene (top of the paper tab, Fig. 1): one 8-dimensional query and key as a tower of 4 rotation pairs, theta_i = 10000^(-2i/8) = 1, 0.1, 0.01, 0.001,
// fastest at the top. Steps: the two vectors as signed bars; each pair onto its dial; rotate to positions (5, 2); slide to (43, 40); key at 33 instead.
// The vectors are illustrative (fixed angles and lengths, the light pass's hero); every share and sum is exact arithmetic (Eqs. 14 to 16). ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {lerp,mix,at}=S3;
  const TH=[0,1,2,3].map(i=>Math.pow(10000,-2*i/8));
  // unrotated pairs as [angle, length]: q and k
  const Q=[[0.3,1],[1.2,1],[2.0,1],[-0.5,1]],K=[[1.4,1],[0.2,.85],[-1.0,1],[2.4,.9]];
  const QV=Q.flatMap(([a,l])=>[l*Math.cos(a),l*Math.sin(a)]),KV=K.flatMap(([a,l])=>[l*Math.cos(a),l*Math.sin(a)]);
  const POS=[[0,0],[0,0],[5,2],[43,40],[43,33]];
  const share=(i,m,n)=>Q[i][1]*K[i][1]*Math.cos(Q[i][0]+m*TH[i]-K[i][0]-n*TH[i]);
  const total=(m,n)=>[0,1,2,3].reduce((s,i)=>s+share(i,m,n),0);
  window.__hero={share,total,POS,QV,KV};
  const DY=[4.2,3.0,1.8,.6],RD=.8,XB=1.55,XS=2.8,YS=2.4,ZS=.9,ZC=1.95,HS=.5;
  const tw=(st,e,f)=>{const a=f(st.pk),b=f(st.k);return e>=1||a===b?b:lerp(a,b,e)};
  const f3=v=>(v<0?'−':'')+Math.abs(v).toFixed(3),f2=v=>(v<0?'−':'')+Math.abs(v).toFixed(2);
  const ring=(c,r,a0,a1,n)=>{const p=[];for(let j=0;j<=n;j++){const a=a0+(a1-a0)*j/n;p.push([c[0]+r*Math.cos(a),c[1],c[2]-r*Math.sin(a)])}return p};
  // a vector as signed bars on a white plinth, a small gap between pairs
  function comb(R,c,vals,col,a,lab){if(a<=.01)return;const bw=.2,gap=.12,wd=8*bw+3*gap;
    R.box([c[0],c[1]-.045,c[2]],[wd+.16,.045,.36],{a,shadow:false});[-1,1].forEach(sx=>R.box([c[0]+sx*wd/2,0,c[2]],[.03,c[1]-.05,.03],{a:a*.9}));
    vals.forEach((v,j)=>{const x=c[0]-wd/2+j*bw+Math.floor(j/2)*gap+bw/2,h=Math.max(.014,Math.abs(v)*.5);R.box([x,v>=0?c[1]:c[1]-.045-h,c[2]],[bw*.72,h,.13],{fill:col,a,shadow:false,lw:.7})});
    R.label([c[0],c[1]+.58,c[2]],lab,{mono:true,fs:12.5,b:1,c:col,a})}
  const pairX=(c,i)=>{const bw=.2,gap=.12,wd=8*bw+3*gap;return c[0]-wd/2+2*i*bw+i*gap+bw}
  function draw(R,k,e,st){const P=R.P;R.grid(-3,4,-1.6,2.8,.5);
    const m=tw(st,e,s=>POS[s][0]),n=tw(st,e,s=>POS[s][1]);
    // 1. the two vectors
    const ca=k===0?1:k===1?1-.6*e:k===2?.4*(1-e):0,CQ=[-1.05,.3,ZC],CK=[1.05,.3,ZC];
    comb(R,CQ,QV,P.q,ca,'q');comb(R,CK,KV,P.k,ca,'k');
    // 2. the tower: a pole, four horizontal dials; faint until the pairs arrive
    const ta=k===0?.16:k===1?.16+.84*e:1;
    R.box([0,0,0],[1.1,.06,1.1],{a:ta});R.box([0,.06,0],[.05,DY[0]-.06,.05],{a:ta*.9,shadow:false});
    let tot=0;
    for(let i=0;i<4;i++){const c=[0,DY[i],0],aq=Q[i][0]+m*TH[i],ak=K[i][0]+n*TH[i];
      R.quad(ring(c,RD,0,2*Math.PI,48),{fill:P.paper,a:ta,ea:.9,lw:1.1});
      if(k>=1){const ha=k===1?e:1,lq=RD*.92*Q[i][1],lk=RD*.92*K[i][1];
        // the wedge between query and key: the only thing the score sees
        let g=aq-ak;g=Math.atan2(Math.sin(g),Math.cos(g));R.quad([c].concat(ring(c,RD*.5,ak,ak+g,16)),{fill:P.c5,a:ha*.45,edge:false,dz:-.3});
        R.line([c,[c[0]+lq*Math.cos(aq),c[1],c[2]-lq*Math.sin(aq)]],{c:P.q,w:3,a:ha,top:1});R.ball([c[0]+lq*Math.cos(aq),c[1],c[2]-lq*Math.sin(aq)],.06,{c:P.q,a:ha,top:1});
        R.line([c,[c[0]+lk*Math.cos(ak),c[1],c[2]-lk*Math.sin(ak)]],{c:P.k,w:3,a:ha,dash:[6,4],top:1});R.ball([c[0]+lk*Math.cos(ak),c[1],c[2]-lk*Math.sin(ak)],.06,{c:P.k,a:ha,top:1});
        if(k===1)[[CQ,P.q],[CK,P.k]].forEach(([C,col])=>R.flowArc([pairX(C,i),C[1]+.35,C[2]],[0,DY[i]+.05,.2],.5,{c:col,a:Math.min(1,e*1.6)*.9,r:.06,speed:1.4,n:7}))}
      R.label([-RD-.12,DY[i],0],'pair '+i+' · θ = '+(TH[i]>=.01?String(+TH[i].toPrecision(2)):TH[i].toPrecision(1)),{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:k===0?0:ta,grp:'side'});
      // 3. this pair's share of q.k: a signed bar on a white plinth beside its dial, streaming into the sum
      if(k>=2){const sa=k===2?e:1,sh=share(i,m,n);tot+=sh;const h=Math.max(.012,Math.abs(sh)*HS);
        R.box([XB,DY[i]-.04,0],[.46,.04,.3],{a:sa,shadow:false});R.box([XB,sh>=0?DY[i]:DY[i]-.04-h,0],[.26,h,.16],{fill:mix(P.paper,P.c5,.85),a:sa,shadow:false,lw:.7});
        R.label([XB+.25,DY[i],0],f3(sh),{al:'left',dx:6,mono:true,fs:12.5,b:1,a:sa});
        R.flowArc([XB,DY[i]+.1,0],[XS,YS+.1,ZS],.15,{c:P.c5,a:sa*.7,r:.045,n:5,speed:.9})}}
    if(k>=2){const sa=k===2?e:1,h=Math.max(.012,Math.abs(tot)*.32);R.box([XS,YS-.045,ZS],[.6,.045,.4],{a:sa,shadow:false});R.box([XS,0,ZS],[.04,YS-.05,.04],{a:sa*.9});
      R.box([XS,tot>=0?YS:YS-.045-h,ZS],[.36,h,.24],{fill:P.c5,a:sa,shadow:false,lw:.7});R.label([XS+.3,YS-.1,ZS],'q⊤k = '+f3(tot),{al:'left',dx:30,mono:true,fs:13.5,b:1,c:P.c5,a:sa})}
    if(k>=1)R.label([0,DY[0]+.25,0],k===1?'unrotated (position 0)':'query at '+Math.round(m)+' · key at '+Math.round(n)+' · offset '+Math.round(m-n),{fs:13,b:1,dy:-18,a:k===1?e:1})
  }
  const full={cam:[.55,.6],bounds:[[-1,0,-.9],[3.6,5.0,1.15]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · a query and a key as four rotating pairs',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1700,hold:5200,draw,
    view:k=>k===0?{cam:[.35,.5],bounds:[[-2.3,0,1.35],[2.3,1.05,2.55]]}:k===1?{cam:[.5,.55],bounds:[[-2.3,0,-.9],[3.6,5.0,2.5]]}:full,
    margin:w=>w<520?[16,8,12,8]:[16,8,10,128]});
})();
