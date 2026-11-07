// ---- Scene, Fig. 5 (section 6): one image through a VAE, with the reparameterisation noise entering from the side (renderer v2, 2026-11-07) ----
// The encoder and decoder are drawn as glass plates (no weights: structure only). The latent is two-dimensional and the encoder's output is
// the worked example of D1, mu = (1, -0.5), sigma = (0.5, 2) (VIN.kl.ex), whose KL to N(0, I) is 0.818 + 0.932 = 1.750 nats (VI.klStd).
// The sample dots are 40 seeded draws z = mu + sigma * eps (VI.rng, seed 11): illustrative.
(function(){
  if(!document.getElementById('stg-vae'))return;const {at,off,lerp,mix}=S3,K=window.VIN.kl,mu=K.ex.mu,sg=K.ex.sig;
  const kl1=VI.klStd([mu[0]],[sg[0]]),kl2=VI.klStd([mu[1]],[sg[1]]),klT=VI.klStd(mu,sg);
  window.VI_VAE={kl1,kl2,klT};
  const XI=-4.7,XE=-3.25,XM=-1.55,XL=1.05,XD=3.55,XO=4.8,HL=1.5,SL=HL/4.5; // x positions; the latent plane's half size and its scale (4.5 latent units to the edge)
  const LZ=(a,b)=>[XL+a*SL,.02,-b*SL];                                   // latent (z1, z2) to the floor
  const r=VI.rng(11),SAM=[];for(let i=0;i<40;i++){const e1=r.g(),e2=r.g();SAM.push([mu[0]+sg[0]*e1,mu[1]+sg[1]*e2])}
  const PM=[XM,.7,.5],PS=[XM,.7,-.5];                                // plinths for mu and sigma
  function bars(R,c,vals,col,a,lab){const P=R.P;if(a<=.01)return;R.box([c[0],c[1]-.045,c[2]],[1.1,.045,.42],{a,shadow:false});
    [-1,1].forEach(sx=>R.box([c[0]+sx*.5,0,c[2]],[.03,c[1]-.05,.03],{a:a*.9}));
    vals.forEach((v,i)=>{const h=Math.abs(v)*.4,bx=c[0]+(i-.5)*.5;R.box([bx,v>=0?c[1]:c[1]-.045-h,c[2]],[.32,h,.2],{fill:col,a,shadow:false});
      R.label([bx,v>=0?c[1]+h:c[1]-.045-h,c[2]],(v<0?'−':'')+Math.abs(v),{dy:v>=0?-10:12,mono:true,fs:12,b:1,c:col,a,wide:1})});
    R.label([c[0]-.58,c[1],c[2]],lab,{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:col,a,wide:1})}
  function ring(R,rx,rz,o){const pts=[];for(let i=0;i<=48;i++){const t=i/48*2*Math.PI;pts.push(LZ(o.cx+rx*Math.cos(t),o.cz+rz*Math.sin(t)))}R.line(pts,o)}
  function tile(R,x,c,lab,a){const P=R.P,S=1.45,h=S/2;R.box([x,0,0],[.12,S,S],{fill:mix(P.paper,c,.18),a});
    for(let i=1;i<4;i++){R.line([[x+.07,i*S/4,-h],[x+.07,i*S/4,h]],{c:P.line,w:.8,a});R.line([[x+.07,0,-h+i*S/4],[x+.07,S,-h+i*S/4]],{c:P.line,w:.8,a})}
    R.label([x,S,0],lab,{dy:-12,fs:13,b:1,a,wide:1})}
  function draw(R,k,e){const P=R.P;R.grid(-5,5.2,-2.4,2.6,.5);
    const back=k===4;                                   // step 5: gradients flow backwards
    const dim=k===3?.25:1;                              // step 4 is about the latent plane: the pipeline recedes
    tile(R,XI,P.c1,'x · one image',dim);
    R.glass([XE,.15,-.72],[0,0,1.44],[0,1.3,0],{c:P.c1,nu:6,nv:6,a:dim});R.label([XE,1.45,0],'encoder',{dy:-10,fs:12.5,b:1,c:P.c1,a:dim,wide:1});
    const ma=k===0?e:1;bars(R,PM,mu,P.c1,ma*dim,'μ');bars(R,PS,sg,P.c5,ma*dim,'σ');
    if(k===0){R.flow([[XI+.1,.6,0],[XE,.6,0]],{c:P.c1,r:.07,n:5,a:e});R.flowArc([XE+.05,.6,0],[XM-.3,.62,PM[2]],.25,{c:P.c1,r:.06,n:5,a:e});R.flowArc([XE+.05,.6,0],[XM-.3,.62,PS[2]],.25,{c:P.c1,r:.06,n:5,a:e})}
    // the latent plane: prior rings, then q's samples
    R.quad([LZ(-4.5,-4.5),LZ(4.5,-4.5),LZ(4.5,4.5),LZ(-4.5,4.5)],{fill:P.soft,fa:.7,ec:P.line,ea:.9,dz:2});
    ring(R,1,1,{cx:0,cz:0,c:P.mute,w:1.3,dash:[4,4]});ring(R,2,2,{cx:0,cz:0,c:P.mute,w:1,dash:[4,4],a:.7});
    R.label(LZ(-1.5,2.3),'prior N(0, I)',{dy:-12,fs:12,wide:1,c:P.mute,a:k===3?1:.85});
    if(k>=1){const sa=k===1?e:1,ns=Math.round(SAM.length*(k===1?e:1));
      // noise from the side: eps ~ N(0, I) does not depend on the encoder
      const EP=[XL-.9,1.05,1.95];R.ball(EP,.14,{c:P.c6,a:sa*dim});R.glow(EP,.4,{c:P.c6,a:.5*sa*dim});R.label(EP,'ε ~ N(0, I)',{al:'left',dx:14,fs:12.5,b:1,c:P.c6,a:sa*dim});
      if(!back)R.flowArc(EP,LZ(mu[0],mu[1]),.35,{c:P.c6,r:.065,n:7,a:sa*dim});
      if(!back&&k<3){R.flowArc([XM+.35,.65,PM[2]],LZ(mu[0],mu[1]),.4,{c:P.c1,r:.06,n:6,a:sa});R.flowArc([XM+.35,.65,PS[2]],LZ(mu[0],mu[1]),.4,{c:P.c5,r:.06,n:6,a:sa})}
      SAM.slice(0,ns).forEach(s=>R.ball(LZ(s[0],s[1]),.045,{c:P.c1,a:k===3?.9:.8}));
      R.label(LZ(mu[0]+.5,-4.4),'z = μ + σ ⊙ ε',{al:'left',dy:14,mono:true,fs:12.5,b:1,c:P.c1,a:sa*(k===3?.4:1)})}
    // the decoder and the reconstruction
    R.glass([XD,.15,-.72],[0,0,1.44],[0,1.3,0],{c:P.c3,nu:6,nv:6,a:dim});R.label([XD,1.45,0],'decoder',{dy:-10,fs:12.5,b:1,c:P.c3,a:dim,wide:1});
    const oa=k<2?.18:k===2?Math.max(.18,e):1;tile(R,XO,P.c3,'x̂ · reconstruction',oa*dim);
    if(k===2){R.flowArc(LZ(mu[0],mu[1]),[XD,.6,0],.45,{c:P.c3,r:.07,n:7,a:e});R.flow([[XD+.05,.6,0],[XO-.1,.6,0]],{c:P.c3,r:.07,n:4,a:e})}
    if(k===2)R.label([XO,0,.6],'reconstruction: log p(x | z)',{dy:16,fs:12.5,b:1,c:P.c3,a:e,wide:1});
    // step 4: the KL term, on the plane: q's ellipses against the prior's rings, one bar per latent dimension
    if(k===3){ring(R,sg[0],sg[1],{cx:mu[0],cz:mu[1],c:P.c1,w:2.4,a:e});ring(R,2*sg[0],2*sg[1],{cx:mu[0],cz:mu[1],c:P.c1,w:1.3,dash:[5,3],a:e});
      const bx=XL+HL+.5,z0=.95;[[kl1,'dim 1'],[kl2,'dim 2']].forEach(([v,n],i)=>{const h=v*.9*e;R.box([bx+i*.5,0,z0],[.34,Math.max(.01,h),.34],{fill:P.c2});R.label([bx+i*.5,h,z0],v.toFixed(3),{dy:-11,mono:true,fs:12.5,b:1,c:P.c2});R.label([bx+i*.5,0,z0],n,{dy:14,fs:12,c:P.mute})});
      R.label([bx+.25,1.5,z0],'KL to the prior · '+klT.toFixed(3)+' nats',{fs:12.5,b:1,c:P.c2,a:e})}
    // step 5: gradients come back through the decoder, the sample and the encoder, but not into the noise
    if(back){const a=e;R.flow([[XO-.1,.75,0],[XD+.05,.75,0]],{c:P.c2,r:.07,n:4,a});R.flowArc([XD,.75,0],LZ(mu[0],mu[1]),.45,{c:P.c2,r:.07,n:7,a});
      R.flowArc(LZ(mu[0],mu[1]),[XM+.35,.7,PM[2]],.4,{c:P.c2,r:.065,n:6,a});R.flowArc(LZ(mu[0],mu[1]),[XM+.35,.7,PS[2]],.4,{c:P.c2,r:.065,n:6,a});
      R.flowArc([XM-.3,.7,0],[XE+.05,.7,0],.25,{c:P.c2,r:.065,n:4,a});
      R.label([XM,1.75,0],'∂z/∂μ = 1 · ∂z/∂σ = ε',{mono:true,fs:12.5,b:1,c:P.c2,a});
      R.label([XL-.9,1.05,1.95],'no gradient into ε',{al:'right',dx:-14,fs:12.5,c:P.c6,a})}
  }
  S3.stage({id:'stg-vae',list:'sx-vae',fig:'Fig. 5 · a VAE, one image',cam:[.55,.42],bounds:[[-5.1,0,-1.7],[5.2,1.9,2]],aspect:.62,dur:1600,hold:5000,draw,
    margin:w=>w<520?[14,8,12,8]:[18,16,14,40],
    view:k=>k===3?{cam:[.3,.85],bounds:[[XL-HL-.2,0,-HL-.2],[XL+HL+1.3,1.3,HL+.3]]}:null});
})();
