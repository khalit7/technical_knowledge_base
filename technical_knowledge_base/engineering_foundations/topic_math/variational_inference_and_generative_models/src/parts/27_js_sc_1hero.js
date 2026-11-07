// ---- Scene, Fig. 1 (the idea in one screen): log p(x) = ELBO + gap, with q moving onto the posterior (renderer v2, 2026-11-07) ----
// Model A (prior N(0,1), x | z ~ N(z, 0.25), observed x = 1.5) and model B (x | z ~ N(z^2, 0.25), observed x = 2), every number from
// VI.modelA and VI.modelB (22_js_core.js, checked against recompute.py by check_js.mjs). Densities stand as curtains over the z axis;
// the column on the right is -ELBO, split into -log p(x) (teal) and the gap KL(q || posterior) (orange). Samples of q stream into it.
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,lerp,mix}=S3,N=window.VIN;
  const pdf=(z,m,v)=>Math.exp(-0.5*(z-m)*(z-m)/v)/Math.sqrt(2*Math.PI*v);
  const Z0=-3.2,Z1=3.2,NZ=161,ZS=[];for(let i=0;i<NZ;i++)ZS.push(Z0+(Z1-Z0)*i/(NZ-1));
  const XC=4.4,SC=.6,ZP=0,ZB=-1.1;               // the column's x, nats to world height, the posterior's and the prior's depth
  const A=N.A,pm=A.post_m,pv=A.post_v,psd=Math.sqrt(pv);
  const qA=k=>k<=1?[A.q.m,.5]:k===2?[pm,.5]:[pm,psd]; // q's mean and sd at the end of step k
  const B=N.B,rb=VI.modelB(B.x,B.s2,B.best_m,B.best_sd*B.best_sd);
  const postB=ZS.map(z=>{const i=Math.round((z+6)/12*(rb.z.length-1));return rb.post[i]});
  const gapMid=VI.modelA(A.x,A.s2,pm,.25).gap;
  window.VI_HERO={logpx:VI.modelA(A.x,A.s2,.5,.25).logpx,gap0:VI.modelA(A.x,A.s2,.5,.25).gap,elbo0:VI.modelA(A.x,A.s2,.5,.25).elbo,gapMid,gapEnd:VI.modelA(A.x,A.s2,pm,pv).gap,logpxB:rb.logpx,gapB:rb.gap};
  function curtain(R,ys,zw,o){const P=R.P,top=ZS.map((z,i)=>[z,ys[i],zw]);
    if(o.fill)R.quad([[Z0,0,zw]].concat(top,[[Z1,0,zw]]),{fill:o.fill,a:o.a,fa:o.fa==null?.3:o.fa,edge:false,dz:o.dz||0});
    R.line(top,{c:o.c,w:o.w||2.2,a:o.a,dash:o.dash,dz:(o.dz||0)-.01})}
  function column(R,lp,gap,a,lab){const P=R.P,h1=lp*SC,h2=gap*SC;if(a<=.01)return;
    R.box([XC,0,ZP],[.62,h1,.62],{fill:P.c3,a});if(h2>.004)R.box([XC,h1,ZP],[.62,h2,.62],{fill:P.c2,a,shadow:false});
    if(!lab)return;R.label([XC+.36,h1*.5,ZP],'−log p(x) · '+lp.toFixed(4),{al:'left',dx:8,fs:12.5,b:1,c:P.c3,a});
    if(gap>.06)R.label([XC+.36,h1+h2*.5,ZP],'gap · '+gap.toFixed(4),{al:'left',dx:8,fs:12.5,b:1,c:P.c2,a});
    R.label([XC,h1+h2,ZP],(gap>.06?'−ELBO · ':'gap '+gap.toFixed(4)+' · −ELBO · ')+(lp+gap).toFixed(4),{dy:-14,fs:12.5,b:1,a})}
  function axis(R,a){const P=R.P;R.line([[Z0,0,.45],[Z1,0,.45]],{c:P.mute,w:1.2,a});
    for(let z=-3;z<=3;z++)R.label([z,0,.45],String(z).replace('-','−'),{dy:14,fs:12,c:P.mute,a});R.label([Z1,0,.45],'z',{al:'left',dx:8,dy:2,fs:13,b:1,c:P.mute,a})}
  function draw(R,k,e){const P=R.P;R.grid(-3.5,5.6,-1.8,1.2,.5);
    // model A fades out fully in step 5 before model B fades in
    const aA=k<4?1:Math.max(0,1-2*e),aB=k<4?0:Math.max(0,2*e-1);
    if(aA>0){axis(R,aA);
      const HY=2;curtain(R,ZS.map(z=>pdf(z,0,1)*HY),ZB,{c:P.mute,w:1.6,dash:[5,4],a:aA});
      R.label([-2.1,pdf(-2.1,0,1)*HY,ZB],'prior N(0, 1)',{al:'right',dx:-6,dy:-8,fs:12.5,wide:1,c:P.mute,a:aA});
      const g0=k===0?e:1;curtain(R,ZS.map(z=>pdf(z,pm,pv)*HY*g0),ZP,{c:P.c4,fill:P.c4,fa:.28,w:1.8,a:aA});
      R.label([pm+.55,pdf(pm+.55,pm,pv)*HY*g0,ZP],'posterior N(1.2, 0.2)',{al:'left',dx:10,dy:-4,fs:12.5,wide:1,b:1,c:P.c4,a:aA});
      // q: in from step 2, its mean then its width moving onto the posterior's
      let m=A.q.m,sd=.5,qa=0;if(k>=1){qa=k===1?e:1;const a0=qA(k-1),a1=qA(k),t=k===1?1:e;m=lerp(a0[0],a1[0],t);sd=lerp(a0[1],a1[1],t)}
      if(k>=4){const q=qA(3);m=q[0];sd=q[1]}
      const r=VI.modelA(A.x,A.s2,m,sd*sd);
      if(qa>0){curtain(R,ZS.map(z=>pdf(z,m,sd*sd)*HY),ZP,{c:P.c1,fill:P.c1,fa:.18,w:2.6,a:qa*aA,dz:-.05});
        R.label([m,pdf(m,m,sd*sd)*HY,ZP],'q = N('+m.toFixed(2)+', '+sd.toFixed(2)+'²)',{dy:-14,fs:12.5,b:1,c:P.c1,a:qa*aA});
        // the ELBO is an average over samples of q: they stream into the column
        [-1.28,-.52,0,.52,1.28].forEach(u=>R.flowArc([m+u*sd,.03,ZP+.25],[XC,(r.logpx*-1+r.gap)*SC,ZP],.75,{c:P.c1,a:qa*aA*.85,r:.06,n:5,speed:1.5}))}
      column(R,-r.logpx,k===0?0:r.gap*(k===1?e:1),aA*(k===0?e:1),true)}
    if(aB>0){const HY=1;axis(R,aB);
      curtain(R,postB.map(v=>v*HY),ZP,{c:P.c4,fill:P.c4,fa:.28,w:1.8,a:aB});
      R.label([B.mode,postB[Math.round((B.mode-Z0)/(Z1-Z0)*(NZ-1))]*HY,ZP],'hump at '+B.mode.toFixed(2).replace('-','−')+', missed',{al:'right',dx:-8,dy:-6,fs:12.5,wide:1,c:P.c4,a:aB});
      const v=B.best_sd*B.best_sd;curtain(R,ZS.map(z=>pdf(z,B.best_m,v)*HY),ZP,{c:P.c1,fill:P.c1,fa:.18,w:2.6,a:aB,dz:-.05});
      R.label([B.best_m+.2,pdf(B.best_m,B.best_m,v)*HY,ZP],'best Gaussian q = N('+B.best_m.toFixed(2)+', '+B.best_sd.toFixed(2)+'²)',{al:'left',dx:6,dy:-6,fs:12.5,b:1,c:P.c1,a:aB});
      [-1.28,0,1.28].forEach(u=>R.flowArc([B.best_m+u*B.best_sd,.03,ZP+.25],[XC,(-rb.logpx+rb.gap)*SC,ZP],.75,{c:P.c1,a:aB*.85,r:.06,n:5,speed:1.5}));
      column(R,-rb.logpx,rb.gap,aB,true)}
  }
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · log p(x) = ELBO + gap',cam:[.2,.34],bounds:[[-3.4,0,-1.3],[5.9,2.1,.7]],aspect:.5,dur:1700,hold:5200,draw,
    margin:w=>w<520?[14,8,10,8]:[18,16,12,16],
    view:k=>k===2||k===3?{cam:[.12,.3],bounds:[[-2.6,0,-1.2],[5.9,2,.7]]}:null});
})();
