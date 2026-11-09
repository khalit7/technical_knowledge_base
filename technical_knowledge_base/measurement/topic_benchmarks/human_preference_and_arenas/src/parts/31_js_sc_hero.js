// ---- Scene: Fig. 1, the hero (stg-hero, renderer v2): one battle, millions of votes, the Bradley-Terry fit, a score with its interval and a rank spread,
// then the four places where the number bends, one per step with the camera in close: (1) what voters reward (length: e^0.249 = odds 1.28, from the 2024
// style-control fit in HPD.fits), (2) which variants are kept (best of 50 equally good variants, sigma from the October 2026 board: E[max of 50] x sigma,
// drawn at the normal quantiles, illustrative), (3) which lens (Claude Opus 5 (max) without and with style control, HPD.board), (4) intervals cover sampling
// noise only (the leader's interval and the fourth model's rank spread, HPD.board; the 0.003% drop from arXiv 2508.11847). Published in window.HPN.hero. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.HPD)return;
  const {mix,lerp,cl}=S3,win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  const rows=HPD.board.cats.overall.rows,LD=rows[0],R4=rows[3],OP=rows.find(r=>r.m==='claude-opus-5-max');
  const g0=HPD.fits.boards.overall.coef[0],odds=Math.exp(g0),pw=1/(1+Math.exp(-g0));
  const sig=10.4/1.96*Math.sqrt(3145/3000),EM=HP.emax(50),infl=sig*EM;
  const qn=p=>{let lo=-6,hi=6;for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(HP.Phi(mid)<p)lo=mid;else hi=mid}return (lo+hi)/2};
  const VAR=[...Array(50).keys()].map(i=>qn((i+.5)/50)*sig);
  window.HPN=window.HPN||{};HPN.hero={odds,pw,infl,leader:[LD.m,LD.sc[0],LD.sc[1],LD.sc[2],LD.sp.sc],fourth:[R4.m,R4.sp.sc],opus:[OP.raw[0],OP.sc[0]]};
  const XB=-4.3,XV=-1.9,XF=.35,XS=2.45,XR=4.6,SC=.02,VS=.035; // positions along the pipeline; SC: world units per Arena point near the top
  function lab(R,p,t,o){if(o.a!=null&&o.a<.12)return;const q=R.p(p);if(q[2]<=0||q[0]<-2||q[0]>R.W+2||q[1]<-2||q[1]>R.H+2)return;R.label(p,t,o)} // labels of objects off the canvas are dropped, not clamped to its edge
  const la=x=>cl((x-.25)/.75,0,1); // a receded object's name fades out entirely, so faded labels never collide in a close-up
  function badge(R,P,p,n,a){if(a<.05)return;R.ball(p,.13,{c:P.bad,a});lab(R,p,String(n),{fs:12,b:1,c:P.card,a,halo:false})}
  // which object leads at each step: b battle, v votes, f fit, s score, r rank
  const VIS=[{b:1,v:1,f:1,s:1,r:1},{b:1,v:.2,f:.2,s:.2,r:.2},{b:.2,v:1,f:.2,s:.2,r:.2},{b:.2,v:.2,f:1,s:1,r:.2},{b:.2,v:1,f:.2,s:1,r:1},{b:1,v:1,f:1,s:1,r:1}];
  function draw(R,k,e,st){const P=R.P,pk=st&&st.pk!=null?st.pk:k,V=n=>lerp(VIS[pk][n],VIS[k][n],e),now=f=>(k===f?win(e,.15,.8):pk===f&&k!==f?1-win(e,0,.5):0);
    R.grid(-5.6,5.6,-2,2,.5);
    // the battle: two answers, B longer in step 2
    const aB=V('b'),g1=now(1),hB=lerp(.7,1.15,g1);
    R.box([XB-.45,0,0],[.7,.7,.1],{fill:P.paper,a:aB});R.box([XB+.45,0,0],[.7,hB,.1],{fill:mix(P.paper,P.acc,.12+.3*g1),a:aB});
    lab(R,[XB-.45,.7,0],'A',{fs:13,b:1,dy:-10,a:la(aB)});lab(R,[XB+.45,hB,0],'B',{fs:13,b:1,dy:-10,a:la(aB)});
    lab(R,[XB,0,.2],'one battle',{b:1,dy:14,a:la(aB)});
    if(g1>.05){lab(R,[XB+.45,hB,0],'1 SD longer: odds '+odds.toFixed(2)+', wins '+(pw*100).toFixed(1)+'%',{fs:12,b:1,c:P.acc,dy:-44,a:g1});
      R.flowArc([XB-.1,1.5,.5],[XB+.45,hB+.05,0],.3,{c:P.acc,a:g1*.8,n:5})}
    // the votes: a stack of vote slabs; in step 3, fifty equally good private variants with only the best kept
    const aV=V('v');for(let i=0;i<9;i++)R.box([XV,i*.11,0],[.95,.08,.7],{fill:i%2?P.paper:mix(P.paper,P.c1,.2),a:aV,shadow:i===0,lw:.6});
    lab(R,[XV,1.0,0],'8,626,731 votes',{b:1,dy:-10,a:la(aV)});lab(R,[XV,0,.4],'413 models',{fs:12,dy:14,c:P.mute,a:la(aV)});
    const g2=now(2);if(g2>.02){VAR.forEach((d,i)=>{const x=XV-.45+i*.05,h=1.0+d*VS,best=i===49;
        R.box([x,0,-1.25],[.035,Math.max(.05,h*win(g2,0,.6)),.035],{fill:best?P.bad:mix(P.paper,P.c4,.4),a:g2*(best?1:.85),shadow:false,lw:.4})});
      R.line([[XV-.5,1.0,-1.25],[XV+2.05,1.0,-1.25]],{c:P.c4,w:1.2,a:g2,dash:[4,3]});
      lab(R,[XV+2.07,1.0,-1.25],'true strength',{al:'left',dx:6,fs:12,c:P.c4,a:g2});
      lab(R,[XV+2.0,1.0+VAR[49]*VS,-1.25],'best of 50 kept: +'+infl.toFixed(1),{al:'left',dx:8,fs:12,b:1,c:P.bad,a:g2*win(g2,.5,1)})}
    // the fit: a glass plate; in step 4 the style columns join it
    const aF=V('f'),g3=now(3);R.glass([XF,.02,-.6],[0,0,1.2],[0,1.3,0],{c:P.c1,a:aF,nu:6,nv:6});
    lab(R,[XF,1.32,0],'Bradley-Terry fit',{b:1,dy:-10,a:la(aF)});
    if(g3>.02){['length','headers','lists','bold'].forEach((t,i)=>{const x=XF+.22+i*.16;R.glass([x,.02,-.6],[0,0,1.2],[0,1.3-.18*i,0],{c:P.c5,a:g3*win(g3,i*.12,i*.12+.4),nu:2,nv:4})});
      lab(R,[XF+.5,0,.7],'+ style columns',{fs:12,b:1,c:P.c5,dy:14,a:g3})}
    // the score: the leader's pillar with its 95% interval; in step 4 a second pair shows one model under two lenses
    const aS=V('s'),y=v=>.9+(v-1480)*SC,g4=now(4);
    R.box([XS,0,0],[.5,y(LD.sc[0]),.5],{fill:mix(P.paper,P.acc,.45),a:aS*(1-.88*g3)});
    lab(R,[XS,y(LD.sc[0]),0],LD.sc[0].toFixed(0),{b:1,mono:true,dy:-12,a:la(aS)*(1-g3),dx:g4>.1?-34:0});
    const ci=Math.max(g4,k===5?1:pk===5&&k!==5?1-e:0);if(ci>.02){R.glass([XS-.36,y(LD.sc[1]),.27],[.72,0,0],[0,y(LD.sc[2])-y(LD.sc[1]),0],{c:P.c4,a:ci,nu:1,nv:2});
      lab(R,[XS+.36,y(LD.sc[2]),.27],LD.sc[1].toFixed(0)+' to '+LD.sc[2].toFixed(0),{al:'left',dx:6,mono:true,fs:12,c:P.c4,a:ci})}
    if(g3>.02){R.box([XS-.3,0,.75],[.38,y(OP.raw[0]),.38],{fill:P.paper,fa:.5,a:g3,shadow:false});R.box([XS+.3,0,.75],[.38,y(OP.sc[0]),.38],{fill:mix(P.paper,P.c5,.55),a:g3,shadow:false});
      lab(R,[XS-.3,y(OP.raw[0]),.75],OP.raw[0].toFixed(1),{dy:-12,mono:true,fs:12,c:P.mute,a:g3});lab(R,[XS+.3,y(OP.sc[0]),.75],OP.sc[0].toFixed(1),{dy:-12,mono:true,fs:12,b:1,c:P.c5,a:g3});
      lab(R,[XS,0,1.0],'Claude Opus 5 (max): without, with style control',{fs:12,dy:14,a:g3})}
    lab(R,[XS,0,.3],'score',{b:1,dy:14,a:la(aS)*(1-g3)});
    // the rank spread: thirteen rank slots; the leader holds 1 to 1, the fourth by score could be 2nd to 13th
    const aR=V('r');for(let j=0;j<13;j++){const yy=1.55-j*.115,inL=j+1>=LD.sp.sc[0]&&j+1<=LD.sp.sc[1],in4=j+1>=R4.sp.sc[0]&&j+1<=R4.sp.sc[1];
      R.box([XR-.22,yy,0],[.3,.08,.3],{fill:inL&&ci>.1?mix(P.paper,P.acc,.6):P.paper,a:aR,shadow:false,lw:.5});
      R.box([XR+.22,yy,0],[.3,.08,.3],{fill:in4&&ci>.1?mix(P.paper,P.c2,.55):P.paper,a:aR,shadow:false,lw:.5})}
    lab(R,[XR+.4,1.55-12*.115,0],'4th: 2 to 13',{al:'left',dx:10,fs:12,b:1,c:P.c2,a:la(aR)*ci});
    lab(R,[XR,0,.3],'rank spread',{b:1,dy:14,a:la(aR)});
    if(ci>.02&&k===4){R.box([XV+.55,.88,.0],[.12,.08,.7],{fill:P.bad,a:g4});lab(R,[XV+.6,.96,.35],'drop 0.003%: a new top model',{al:'left',dx:8,fs:12,b:1,c:P.bad,a:g4})}
    // flows along the pipeline (steps 1 and 6)
    const fa=(k===0?Math.min(1,e*1.6):k===5?win(e,.3,1):0)+((pk===0||pk===5)&&k!==pk?1-win(e,0,.4):0);
    if(fa>.02){R.flowArc([XB+.85,.5,0],[XV-.55,.6,0],.3,{c:P.c1,a:fa,n:6});R.flowArc([XV+.55,.6,0],[XF-.05,.7,0],.3,{c:P.c1,a:fa,n:6});
      R.flowArc([XF+.1,.8,0],[XS-.3,y(LD.sc[0])-.1,0],.3,{c:P.acc,a:fa,n:6});R.flowArc([XS+.3,y(LD.sc[0])-.1,0],[XR-.4,1.3,0],.25,{c:P.acc,a:fa,n:5})}
    // the four numbered places where the number bends (last step)
    const bd=k===5?win(e,.4,1):pk===5&&k!==5?1-e:0;
    [[XB,1.45,0],[XV,1.35,-1],[XF+.3,1.75,0],[XS+.55,y(LD.sc[2])+.25,0]].forEach((p,i)=>badge(R,P,p,i+1,bd));
  }
  const full={cam:[.2,.55],bounds:[[-5.2,0,-1.2],[5.0,1.8,1.2]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one vote to a score, and where it bends',cam:full.cam,bounds:full.bounds,aspect:.44,dur:1500,hold:5000,draw,
    margin:w=>w<520?[16,8,14,8]:[26,16,20,16],
    view:k=>k===1?{cam:[.25,.42],bounds:[[-5.3,0,-.6],[-2.9,1.8,.8]]}:k===2?{cam:[.3,.45],bounds:[[-3.0,0,-1.5],[1.4,1.6,.9]]}:k===3?{cam:[.2,.42],bounds:[[-.3,0,-.8],[4.2,1.8,1.3]]}
      :k===4?{cam:[.15,.42],bounds:[[-2.6,0,-.8],[5.2,2.0,1.1]]}:null});
})();
