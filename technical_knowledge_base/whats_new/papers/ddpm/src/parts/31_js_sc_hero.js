// ---- Scene: Fig. 1, the paper's Figure 2 as two stacks of plates along t (renderer v2: glass plates, flowing dots, camera per step) ----
// Forward stack q: 300 points of the page's toy Swiss roll (DM.roll(300, 42)) noised by Eq. 4 with one fixed draw per point (DM.gauss(4242)): exact arithmetic.
// Reverse stack p_theta: the trained eps (L_simple) toy network's own Algorithm 2 chain, 300 points from seed 42 (the job the forward/reverse animation
// uses too), its states at t = 1000, 500, 250, 100 and 0. Arrows: minus the network's predicted noise at six tracked points of each reverse plate.
(function(){
  if(!document.getElementById('stg-hero')||typeof DM==='undefined'||!window.S3)return;const {at,mix}=S3;
  const N=300,TS=[0,100,250,500,1000],ZP=[4,2,0,-2,-4],XQ=-2.1,XP=2.1,HP=1,Y0=.14,YC=Y0+HP,TR=[3,40,77,121,188,260];
  const X0=DM.roll(N,42),g=DM.gauss(4242),E=new Float64Array(2*N);for(let i=0;i<2*N;i++)E[i]=g();
  const FW=TS.map(t=>{const ab=t?DM.abar[t]:1,a=Math.sqrt(ab),b=Math.sqrt(1-ab),o=new Float64Array(2*N);for(let i=0;i<2*N;i++)o[i]=a*X0[i]+b*E[i];return o});
  const zr=t=>1.1+1.7*Math.sqrt(1-(t>0?DM.abar[t]:1));  // the plate's half-width in data units: it zooms out with the noise (as the 2-D animation does)
  const css=c=>'rgb('+c.map(Math.round).join(',')+')';
  const CUR=[];for(let i=0;i<DM.CURVE.length/2;i+=12)CUR.push([DM.CURVE[2*i],DM.CURVE[2*i+1]]);
  let J=null,started=false,lastD=0,stg=null,EPS=null,ON=null;
  const job=()=>J||(J=window.DFX_JOB?window.DFX_JOB('eps'):SAMP.get('eps_simple',N,42,'beta',10));
  const done=()=>job().S.t<1;
  const W=(x,z,t,u,v)=>{const s=HP/zr(t);return [x+u*s,YC+v*s,z+.06]};
  function plate(R,x,z,t,pts,col,a,glow){if(a<=.01)return;const P=R.P,s=HP/zr(t);
    R.glass([x-HP,Y0,z],[2*HP,0,0],[0,2*HP,0],{c:col,a:a*.5,nu:2,nv:2,th:.03});
    R.quad([[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>[x+u*s,YC+v*s,z+.05]),{fa:0,ec:P.mute,dash:[4,3],lw:1,a:a*.7});
    R.line(CUR.map(([u,v])=>[x+u*s,YC+v*s,z+.045]),{c:P.line,w:3.5,a:a*.9});
    if(!pts)return;const r=zr(t),pp=[],c0=R.p([x,YC,z+.06]),rad=Math.max(1.2,R.px([x,YC,z],.022)),fill=css(mix(col,P.ink,P.dark?0:.15));
    for(let i=0;i<N;i++){const u=pts[2*i],v=pts[2*i+1];if(Math.abs(u)>r||Math.abs(v)>r)continue;pp.push(R.p([x+u*s,YC+v*s,z+.06]))}
    R.q.push({z:c0[2]-.08,f:cx=>{cx.globalAlpha=Math.min(1,a*(glow?1:.9));cx.fillStyle=fill;cx.beginPath();pp.forEach(q=>{cx.moveTo(q[0]+rad,q[1]);cx.arc(q[0],q[1],rad,0,6.283)});cx.fill()}})}
  function revPts(t){const j=job();return j.snaps[t]||null}
  function eps(){if(EPS||!done())return EPS;const Nn=DM.net('eps_simple'),r=[0,0,0,0];EPS={};
    [1000,500,250,100].forEach(t=>{const X=revPts(t);EPS[t]=TR.map(i=>{DM.meanEps(Nn,X[2*i],X[2*i+1],t,r);return [r[2],r[3]]})});return EPS}
  function onroll(){if(ON||!done())return ON;ON={s:DM.onRoll(revPts(0)).share,d:DM.onRoll(X0).share};
    const pc=v=>(100*v).toFixed(0)+'%',S=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};S('hr-on',pc(ON.s));S('hr-real',pc(ON.d));return ON}
  function draw(R,k,e){const P=R.P;R.grid(-3.4,3.4,-5.4,5.4,.5);
    if(!started){started=true;SAMP.run(job(),jj=>{const now=performance.now();if(jj.S.t<1){onroll();eps()}if(stg&&stg.st.vis&&stg.st.k>=3&&(jj.S.t<1||now-lastD>400)){lastD=now;stg.draw()}})}
    // the forward stack q: the data plate first, the noised plates from step 2; it recedes while the reverse stack is the subject
    const qa=k<=2?1:k===3?1-.88*e:k===4?.12:.12+.88*e;
    TS.forEach((t,i)=>{let a=i===0?1:at(k,e,1);if(k===2&&i!==0&&i!==3)a=1-.7*e;a*=qa;if(k===0&&i>0)a=0;
      plate(R,XQ,ZP[i],t,FW[i],P.c1,a,k===2&&(i===0||i===3));
      R.label([XQ,Y0,ZP[i]+.06],'t = '+(t?t.toLocaleString('en-GB'):0),{mono:true,fs:12,dy:11,c:P.mute,a:Math.max(a,0)})});
    R.label([XQ,YC+HP+.12,ZP[4]],'q · fixed, adds noise',{fs:13,b:1,c:P.c1,dy:-10,a:k===0?0:k===1?e*qa:qa});
    // the six tracked points of q, streaming from x0 into the noise (Eq. 4 with their own fixed draw)
    if(k>=1){const fa=(k===1?e:k===2?.35:k>=3&&k<5?.2:1)*(k===5?e:1);TR.forEach(i=>{R.flow(TS.map((t,j)=>W(XQ,ZP[j],t,FW[j][2*i],FW[j][2*i+1])),{c:P.c1,a:fa,r:.06,speed:1.2,n:9})})}
    // training: Eq. 4 jumps from x0 to any t in one step
    if(k===2){TR.slice(0,3).forEach(i=>R.flowArc(W(XQ,ZP[0],0,FW[0][2*i],FW[0][2*i+1]),W(XQ,ZP[3],500,FW[3][2*i],FW[3][2*i+1]),1.2,{c:P.c2,a:e,r:.08,speed:1.6,n:10}));
      R.label([XQ+1.2,YC+1.7,(ZP[0]+ZP[3])/2],'Eq. 4: x₀ to x₅₀₀ in one jump',{al:'left',fs:13,b:1,c:P.c2,a:e})}
    // the reverse stack p_theta: pure noise at t = 1000, then the network's chain
    if(k>=3){const ok=done();
      TS.forEach((t,i)=>{let a=i===4?(k===3?e:1):at(k,e,4);plate(R,XP,ZP[i],t,ok||i===4?revPts(t)||(i===4?job().snaps[1000]:null):null,P.c3,a,k===4);
        R.label([XP,Y0,ZP[i]+.06],'t = '+(t?t.toLocaleString('en-GB'):0),{mono:true,fs:12,dy:11,c:P.mute,a})});
      R.label([XP,YC+HP+.12,ZP[4]],'pθ · learned, removes it',{fs:13,b:1,c:P.c3,dy:-10,a:k===3?e:1});
      if(!ok&&k>=4)R.label([XP,YC+.2,ZP[2]],'the network is sampling: t = '+job().S.t,{fs:12.5,c:P.mute,a:at(k,e,4)});
      const ep=eps();
      if(ok&&k>=4){const fa=k===4?e:1;TR.forEach(i=>R.flow(TS.slice().reverse().map(t=>{const j=TS.indexOf(t),X=revPts(t);return W(XP,ZP[j],t,X[2*i],X[2*i+1])}),{c:P.c3,a:fa,r:.06,speed:1.2,n:9}));
        if(ep&&k===4)[1000,500,250,100].forEach(t=>{const j=TS.indexOf(t),X=revPts(t),s=HP/zr(t);TR.forEach((i,m)=>{const p=W(XP,ZP[j],t,X[2*i],X[2*i+1]),d=ep[t][m],L=.3;
          R.line([p,[p[0]-d[0]*L,p[1]-d[1]*L,p[2]+.01]],{c:P.c2,w:2.8,head:8,a:e,top:1})})});
        if(k===4)R.label([XP+1.15,YC+.9,ZP[3]],'−εθ: the predicted noise, removed',{al:'left',fs:12.5,b:1,c:P.c2,a:e,wide:1})}}
  }
  const full={cam:[.3,.32],bounds:[[-3.2,0,-4.4],[3.2,2.4,4.4]]};
  const qv={cam:[.7,.34],bounds:[[XQ-1.1,0,-4.4],[XQ+1.1,2.4,4.4]]},pv={cam:[.7,.34],bounds:[[XP-1.1,0,-4.4],[XP+1.1,2.4,4.4]]};
  stg=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · two chains over the same points',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:[.35,.22],bounds:[[XQ-1.2,0,ZP[0]-.6],[XQ+1.2,2.3,ZP[0]+.6]]}:k<=2?qv:k===3?{cam:[.45,.26],bounds:[[XP-1.2,0,ZP[4]-.6],[XP+1.2,2.3,ZP[4]+.6]]}:k===4?pv:full,
    margin:w=>w<520?[14,10,26,10]:[18,16,28,16]});
})();
