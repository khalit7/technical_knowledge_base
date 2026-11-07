// ---- Scene, Fig. 6 (section 6): diffusion as a latent-variable model, its noise levels as a stack of plates (renderer v2, 2026-11-07) ----
// 200 of D3's 400 two-moons points (VI.moons(400, 3), noise from VI.rng(4): the same draws as D3's schedule widget) pushed to
// t = 100, 200, 500 and 1000 on the linear schedule by the closed form x_t = sqrt(abar_t) x_0 + sqrt(1 - abar_t) eps (VI.abar).
// The highlighted point is the root's worked example, x_0 = (0.5, -0.2), eps = (1, -0.5) (D3). The weights are VIN.w12 (D4, Ho et al. eq. 12).
(function(){
  if(!document.getElementById('stg-diff'))return;const {at,off,lerp,mix}=S3,N=window.VIN;
  const TS=[0,100,200,500,1000],NP=200,D=VI.moons(400,3),rg=VI.rng(4),EPS=new Float64Array(800);for(let i=0;i<800;i++)EPS[i]=rg.g();
  const ab=t=>t===0?1:VI.abar('linear',t),X0=[.5,-.2],E0=[1,-.5];
  const PX=i=>-3.7+i*1.85,PZ=i=>.8-i*.5,Y0=.88,HW=.78,S=HW/3.3;           // plate centres; half size; data units to world
  const pos=(i,x,y)=>[PX(i)+x*S,Y0+y*S,PZ(i)+.03];
  const PTS=TS.map(t=>{const a=Math.sqrt(ab(t)),b=Math.sqrt(1-ab(t)),o=[];for(let p=0;p<NP;p++)o.push([a*D.X[2*p]+b*EPS[2*p],a*D.X[2*p+1]+b*EPS[2*p+1],D.Y[p]]);return o});
  const HL=TS.map(t=>{const a=Math.sqrt(ab(t)),b=Math.sqrt(1-ab(t));return [a*X0[0]+b*E0[0],a*X0[1]+b*E0[1]]});
  const WT={0:N.w12['1'],100:N.w12['100'],200:N.w12['200'],500:N.w12['500'],1000:N.w12['1000']};
  window.VI_DIFF={abar:TS.map(ab),x200:HL[2],w:TS.map(t=>WT[t])};
  // many small dots in one draw call (faster than a ball each)
  function dots(R,i,a){if(a<=.01)return;const P=R.P,pp=PTS[i].map(([x,y,m])=>{const q=R.p(pos(i,x,y));return [q[0],q[1],m]}),z=R.p([PX(i),Y0,PZ(i)])[2]-.02;
    const r=Math.max(1.6,R.px([PX(i),Y0,PZ(i)],.028)),col=m=>'rgb('+(m?P.c2:P.c1).map(Math.round).join(',')+')';
    R.q.push({z,f:cx=>{cx.globalAlpha=a*.85;[0,1].forEach(m=>{cx.fillStyle=col(m);cx.beginPath();pp.forEach(p=>{if(p[2]===m){cx.moveTo(p[0]+r,p[1]);cx.arc(p[0],p[1],r,0,7)}});cx.fill()})}})}
  function plate(R,i,a,lab,la){const P=R.P;R.glass([PX(i)-HW,Y0-HW,PZ(i)],[2*HW,0,0],[0,2*HW,0],{c:i===0?P.c4:P.c6,nu:4,nv:4,a,th:.03});
    R.box([PX(i),0,PZ(i)],[.04,Y0-HW,.04],{a:a*.8});if(lab)R.label([PX(i),Y0+HW,PZ(i)],lab,{dy:-12,fs:12.5,b:1,a:la==null?Math.max(a,.35):la,c:i===0?P.c4:P.ink})}
  const labs=TS.map((t,i)=>i===0?'t = 0 · data':'t = '+t+' · ᾱ '+(ab(t)<1e-3?ab(t).toExponential(0).replace('e-','e−'):ab(t).toFixed(t===500?4:3)));
  function draw(R,k,e){const P=R.P;R.grid(-5,5.2,-2.4,2.2,.5);
    for(let i=0;i<TS.length;i++){
      // plates appear one after another in step 2; in step 3 only the two ends of the jump stay strong
      let a=i===0?1:k===0?.14:k===1?Math.min(1,Math.max(.14,(e*4-(i-1))*1.2)):1;if(k===2&&i!==0&&i!==2)a=.25;
      plate(R,i,a,R.W<520?(i===0?'data':'t = '+TS[i]):labs[i],k===2&&i!==0&&i!==2?0:null);dots(R,i,i===0?1:k===0?0:k===1?Math.max(0,Math.min(1,(e*4-(i-1))*1.2)):a)}
    const hp=i=>pos(i,HL[i][0],HL[i][1]).map((v,j)=>j===2?v+.02:v);
    // the worked point, on every plate where it exists
    for(let i=0;i<TS.length;i++){const a=i===0?1:k===0?0:k===1?Math.max(0,Math.min(1,(e*4-(i-1))*1.2)):k===2&&i!==2?.3:1;if(a<=0)continue;
      R.ball(hp(i),.07,{c:P.ink,a,top:1});R.glow(hp(i),.22,{c:P.c5,a:a*.7,top:1})}
    // 2. forward: fixed noise, step by step
    if(k===1)for(let i=0;i<4;i++){const a=Math.max(0,Math.min(1,(e*4-i)*1.2));if(a>0)R.flowArc(hp(i),hp(i+1),.35,{c:P.mute,r:.06,n:6,a,top:1})}
    if(k===1)R.label([PX(2),0,PZ(2)+.4],'q(xₜ | xₜ₋₁): fixed, no parameters',{dy:14,fs:12.5,b:1,c:P.mute,a:e,wide:1});
    // 3. any noise level in one jump
    if(k===2){R.flowArc(hp(0),hp(2),.9,{c:P.c5,r:.075,n:10,a:e,top:1});
      R.label([PX(2),Y0-HW,PZ(2)],'x₂₀₀ = 0.8118 x₀ + 0.5839 ε = ('+HL[2][0].toFixed(4)+', '+HL[2][1].toFixed(4).replace('-','−')+')',{dy:18,wide:1,fs:12.5,b:1,c:P.c5,a:e})}
    // 4. reverse: learned Gaussian steps, each matched to the true reverse step given x0
    if(k===3){for(let i=4;i>0;i--)R.flowArc(hp(i),hp(i-1),.35,{c:P.c3,r:.065,n:6,a:e,top:1});
      R.label([PX(2),0,PZ(2)+.4],'p_θ(xₜ₋₁ | xₜ): learned, one KL per step',{dy:14,fs:12.5,b:1,c:P.c3,a:e,wide:1})}
    // 5 and 6. the weight each step gets: the bound's, then L_simple's (all equal)
    if(k>=4){const eq=k===5?e:0;TS.forEach((t,i)=>{const w=WT[t],h=lerp(Math.max(.012,w*2.6),.32,eq)*(k===4?e:1),c=[PX(i)+HW+.25,0,PZ(i)+.25];
        R.box(c,[.26,h,.26],{fill:k===5?mix(P.c2,P.c3,eq):P.c2});R.label([c[0],h,c[2]],k===5&&eq>.5?'1':(i===0?'t = 1 · ':'')+(w<.1?w.toFixed(4):w.toFixed(2)),{dy:-11,mono:true,fs:12,b:1,c:k===5&&eq>.5?P.c3:P.c2})})}
  }
  S3.stage({id:'stg-diff',list:'sx-diff',fig:'Fig. 6 · diffusion, noise level by noise level',cam:[.22,.34],bounds:[[-4.6,0,-1.4],[4.6,1.75,1.2]],aspect:.46,dur:1700,hold:5000,draw,
    margin:w=>w<520?[16,8,12,8]:[20,16,14,16],
    view:k=>k===2?{cam:[.3,.3],bounds:[[-4.6,0,-.4],[.6,1.75,1.2]]}:null});
})();
