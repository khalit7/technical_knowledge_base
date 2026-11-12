// ---- Scene, Fig. 2 (section 3): the same 120 kW rack cooled by air and by water. Numbers from the page's data, at the cooling calculator's
// defaults (120 kW, air rising 15 C, water 10 C): air flow = Q / (rho_air cp_air dT) m3/s, water = Q / (cp_water dT) kg/s, from PW.air and PW.water.
// The glass cubes are one second of each coolant, to scale with each other (side = cube root of the volume); the rack, CDU and tower are drawn
// for position. Steps: #sx-cool. ----
(function(){
  if(!document.getElementById('stg-cool')||!window.PWG||!window.PW)return;const {mix,lerp}=S3,G=PWG;
  const Q=PW.systems.find(s=>s[0]==='nvl72')[2]*1000,DTA=15,DTW=10;
  const C={Q,air:Q/(PW.air.rho*PW.air.cp*DTA)};C.cfm=C.air/PW.cfm;C.kgs=Q/(PW.water.cp*DTW);C.ls=C.kgs/PW.water.rho*1000;C.lpm=C.ls*60;
  C.sa=Math.cbrt(C.air);C.sw=Math.cbrt(C.ls/1000);C.ratio=C.air/(C.ls/1000);
  window.PW_COOL=C; // checked by check/check_stages.mjs
  const RK=[0,0],CA=[2.9,-.2],CW=[2.9,1.6],CDU=[-2.2,.9],TW=[-4.8,-.6];
  const A=[{rack:1,air:0,cw:0,cdu:0,tw:0},{rack:1,air:1,cw:0,cdu:0,tw:0},{rack:1,air:.3,cw:1,cdu:.5,tw:0},{rack:.6,air:0,cw:0,cdu:1,tw:1}];
  function cube(R,c,s,col,a){R.box([c[0],0,c[1]],[s,s,s],{fill:mix(R.P.paper,col,.55),a,fa:.22,ea:.9,shadow:false})}
  function draw(R,k,e,st){const P=R.P,pk=st.pk==null?k:st.pk,a=n=>lerp(A[pk][n],A[k][n],e),lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-5.6,5,-3.6,3,.5);
    const ra=a('rack'),aa=a('air'),wa=a('cw'),da=a('cdu'),ta=a('tw');
    G.rack(R,RK,{frame:ra,psu:ra*.6,cpt:ra,sw:ra*.7,bus:ra*.4,man:ra*(k>=2?1:.3),heat:k===0?e:k===1?1:k===2?1-e:0});
    // 1. the heat inside
    if(k===0)lab([RK[0],G.H,RK[1]],'Q ≈ '+Math.round(C.Q/1000)+' kW of heat',{dy:-14,b:1,c:P.bad,a:e});
    // 2. air: streams through the rack front to back, and the second's worth of air as a cube
    if(aa>.01){for(let i=0;i<6;i++){const y=.4+i*.55,z0=RK[1]+G.D/2+1.4,z1=RK[1]-G.D/2-1.4;
        R.flow([[RK[0]-.25,y,z0],[RK[0]-.25,y,RK[1]+G.D/2]],{c:P.c6,a:aa,r:.07,n:4,speed:1.6});R.flow([[RK[0]+.25,y,RK[1]-G.D/2],[RK[0]+.25,y,z1]],{c:P.bad,a:aa,r:.07,n:4,speed:1.6})}
      cube(R,CA,C.sa,P.c6,aa)}
    if(k===1){lab([CA[0],C.sa,CA[1]],C.air.toFixed(1)+' m³ of air every second',{dy:-14,b:1,c:P.c6,a:e});lab([CA[0],0,CA[1]+C.sa/2],'a cube '+C.sa.toFixed(2)+' m on a side',{dy:18,fs:12,a:e});
      lab([RK[0],.4,RK[1]+G.D/2+1.4],'cool air in',{dy:18,fs:12,c:P.c6,a:e});lab([RK[0],2.6,RK[1]-G.D/2-1.4],'+'+DTA+' °C out',{dy:-12,fs:12,c:P.bad,a:e,wide:1})}
    // 3. water: cold plates, manifolds, a small loop to the CDU, the second's worth of water as a cube
    if(wa>.01){const mx=RK[0]+G.W/2+.06,hot=RK[1]-G.D/2+.5,cold=RK[1]-G.D/2+.66;
      for(let i=4;i<31;i+=3){if(G.KIND[i]!=='cpt')continue;const y=G.ySlab(i)+G.PITCH*.4;R.flow([[RK[0],y,RK[1]],[mx,y,hot]],{c:P.bad,a:wa*.8,r:.04,n:3,speed:.6})}
      const zb=RK[1]-G.D/2-.25;R.flow([[mx,G.H-.3,hot],[mx,G.H-.3,zb],[CDU[0],G.H-.3,zb],[CDU[0],1.0,CDU[1]]],{c:P.bad,a:wa,r:.06,n:12,speed:1});R.flow([[CDU[0]+.35,.25,CDU[1]],[mx+.15,.25,CDU[1]],[mx+.15,.25,cold],[mx,.25,cold]],{c:P.c1,a:wa,r:.06,n:9,speed:1});
      cube(R,CW,C.sw,P.c1,wa)}
    if(k===2){lab([CW[0],C.sw,CW[1]],C.lpm.toFixed(0)+' L of water a minute',{dy:-16,b:1,c:P.c1,a:e});lab([CW[0],0,CW[1]+.1],'one second: a '+Math.round(C.sw*100)+' cm cube',{dy:20,fs:12,a:e});
      lab([CA[0],C.sa,CA[1]],'the same second of air',{dy:-14,fs:12,c:P.c6,a:e*.8});lab([RK[0]+G.W/2+.06,G.H*.7,RK[1]-G.D/2+.5],'manifolds',{al:'left',dx:12,fs:12,a:e,wide:1})}
    // 4. CDU, facility water, tower
    if(da>.01)R.box([CDU[0],0,CDU[1]],[.7,1.0,.7],{fill:mix(P.paper,P.c6,.55),a:da});
    if(ta>.01){R.box([TW[0],0,TW[1]],[1.3,1.1,1.3],{fill:mix(P.paper,P.mute,.3),a:ta});R.box([TW[0],1.1,TW[1]],[.9,.35,.9],{fill:mix(P.paper,P.mute,.15),a:ta,shadow:false})}
    if(k===3){R.flow([[CDU[0]-.35,.8,CDU[1]],[TW[0]+.65,.8,TW[1]]],{c:P.bad,a:e,r:.07,n:7,speed:1});R.flow([[TW[0]+.65,.3,TW[1]+.2],[CDU[0]-.35,.3,CDU[1]+.2]],{c:P.c1,a:e,r:.07,n:7,speed:1});
      [-.25,.25].forEach(dx=>R.flow([[TW[0]+dx,1.5,TW[1]],[TW[0]+dx*1.6,3.1,TW[1]]],{c:P.c6,a:e*.7,r:.08,n:4,speed:.45}));
      lab([CDU[0],1.0,CDU[1]],'CDU',{dy:-14,b:1,c:P.c6,a:e});lab([TW[0],3.1,TW[1]],'cooling tower · water evaporates',{dy:-10,b:1,c:P.bad,a:e});lab([(CDU[0]+TW[0])/2,.3,(CDU[1]+TW[1])/2],'facility water',{dy:18,fs:12,a:e,wide:1})}
  }
  const full={cam:[.62,.4],bounds:[[-1.6,0,-2.4],[4.4,3.8,3.0]]};
  const st=S3.stage({id:'stg-cool',list:'sx-cool',fig:'Fig. 2 · one second of coolant for a 120 kW rack',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    view:k=>k===2?{cam:[.62,.45],bounds:[[-2.4,0,-2.4],[4.0,3.8,3.0]]}:k===3?{cam:[.55,.45],bounds:[[-5.8,0,-1.8],[1.4,3.8,2.0]]}:full,
    margin:w=>w<520?[18,10,14,10]:[24,20,20,20]});
  (window.PWSTG=window.PWSTG||{})['stg-cool']=st;
})();
