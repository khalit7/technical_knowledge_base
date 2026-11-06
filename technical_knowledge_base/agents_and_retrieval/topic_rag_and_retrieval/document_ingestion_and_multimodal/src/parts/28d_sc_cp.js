// ---- Scene: Fig. 7, a page image becomes patch vectors (renderer v2). The page is this page's small copy of ViDoRe InfoVQA page 55 (ING.mm.thumbs).
// Geometry and costs are the ColPali paper's (Faysse et al., 2024): 448 x 448 input, 32 x 32 patches of 14 pixels, 128 numbers per vector, 1,024 + 6 = 1,030 vectors per page,
// token pooling at factor 3 (66.7% fewer vectors, 97.8% of quality kept, section 5.2), storage 8.6 KB against 257.5 KB per page and offline indexing on an NVIDIA L4 (Tables 4 and 5).
// The query tokens and where each finds its best patch are illustrative (this page did not record MaxSim per patch); the step text says so. ----
(function(){
  if(!document.getElementById('stg-cp')||!window.ING3||!window.ING||!ING.mm)return;const {mix,lerp}=S3;
  const src=ING.mm.thumbs['InfoQ:55'];
  const SZ=3,X0=-3.2,Z0=-1.5,HB=1.1,PATCH=[5,9];
  const QT=['q1','q2','q3','q4','q5'],QWIN=[[5,9],[20,6],[11,22],[26,27],[8,15]]; // illustrative best patches
  const pz=(i,j)=>[X0+(i+.5)*SZ/32,0,Z0+(j+.5)*SZ/32];
  function cuboid(R,x0,z0,w,d,y0,h,c,a,n){if(a<=.01||h<=.005)return;
    R.glass([x0,y0+h,z0],[w,0,0],[0,0,d],{c,a,nu:n,nv:n,th:.02});
    R.glass([x0,y0,z0+d],[w,0,0],[0,h,0],{c,a:a*.7,nu:n,nv:6,th:.02});R.glass([x0+w,y0,z0],[0,0,d],[0,h,0],{c,a:a*.7,nu:n,nv:6,th:.02})}
  function draw(R,k,e){const P=R.P,im=ING3.img(src);R.grid(-4.6,5.6,-2.6,2.8,.5);
    // 1-2. the page, first at its own shape, then squeezed to the 448 x 448 square input
    const sq=k===0?0:k===1?e:1,ph=SZ*156/110,d=lerp(ph,SZ,sq),z0=Z0+(SZ-d)/2;
    ING3.pic(R,im,[X0,0,z0],[SZ,0,0],[0,0,d],{under:true,a:k>=5?.5:1});
    if(k===0)R.label([X0+SZ/2,0,z0+d],'an infographic page (ViDoRe, InfoVQA)',{fs:12.5,dy:14,a:e});
    // the 32 x 32 patch grid, one patch filled
    const ga=k===0?0:k===1?e:k>=5?.4:1;
    if(ga>0){R.glass([X0,.02,Z0],[SZ,0,0],[0,0,SZ],{c:P.c4,a:ga*.75,nu:32,nv:32,th:.01});
      const c=pz(...PATCH);R.box([c[0],.02,c[2]],[SZ/32,.03,SZ/32],{fill:P.c4,a:ga,shadow:false});
      if(k===1)R.label([X0+SZ/2,0,Z0+SZ],'448 × 448 pixels · 32 × 32 patches of 14 px',{fs:12.5,dy:14,a:e})}
    // 3. one patch becomes one vector of 128 numbers; then every patch: a block of 1,024 vectors, plus 6 for the prompt
    if(k===2){const c=pz(...PATCH),h=1.3*e;for(let b=0;b<16;b++)R.box([c[0],.05+b*h/16,c[2]],[.08,h/16*.8,.08],{fill:mix(P.paper,P.c4,.25+.5*(b%2)),a:e,shadow:false,lw:.5});
      R.flow([[c[0],.05,c[2]],[c[0],.05+h,c[2]]],{c:P.c4,a:e,n:5,speed:.8,r:.04});
      R.label([c[0]+.1,.05+h,c[2]],'1 patch → 128 numbers',{al:'left',dx:8,fs:12.5,b:1,c:P.c4,a:e})}
    const hb=k<3?0:k===3?HB*e:k===5?lerp(HB,HB/3,e):k>5?HB/3:HB;
    if(k>=3){cuboid(R,X0,Z0,SZ,SZ,.05,hb,P.c4,1,8);
      for(let t=0;t<6;t++)R.box([X0+SZ+.25,.02,Z0+.3+t*.3],[.12,hb,.12],{fill:mix(P.paper,P.c5,.5),a:k===3?e:1,shadow:false});
      if(k===3){R.label([X0+SZ/2,hb+.05,Z0+SZ/2],'1,024 patch vectors',{fs:12.5,b:1,c:P.c4,dy:-10,a:e});R.label([X0+SZ+.25,hb,Z0+1.1],'+ 6 prompt',{al:'left',dx:10,fs:12.5,c:P.c5,a:e,wide:1});
        R.label([X0+SZ/2,0,Z0+SZ],'1,030 vectors × 128 numbers per page',{fs:12.5,mono:true,dy:14,a:e})}}
    // 4. MaxSim: each query token compares itself with every patch vector, keeps its best match, and the five maxima are summed
    if(k===4){const qz=Z0+SZ+.9,qx=i=>X0+.4+i*.55;
      QT.forEach((q,i)=>{const p=[qx(i),0,qz];R.box(p,[.24,.24,.24],{fill:mix(P.paper,P.q,.55),a:e});R.label([p[0],0,p[2]+.12],q,{fs:12,mono:true,dy:12,a:e,wide:1});
        const w=pz(...QWIN[i]);R.flowArc([p[0],.26,p[2]],[w[0],hb+.05,w[2]],.35,{c:P.q,a:e,n:4,speed:1.5,r:.045});R.glow([w[0],hb+.06,w[2]],.2,{c:P.q,a:e});R.ball([w[0],hb+.06,w[2]],.05,{c:P.q,a:e})});
      const sp=[X0+SZ+.9,0,qz];R.box(sp,[.4,.8*e,.4],{fill:P.q,a:e});
      QT.forEach((q,i)=>{const w=pz(...QWIN[i]);R.flowArc([w[0],hb+.06,w[2]],[sp[0],.8*e,sp[2]],.3,{c:P.q,a:e*.6,n:3,speed:1.3,r:.04})});
      R.label([sp[0],.8*e,sp[2]],'score = Σ max',{fs:12.5,b:1,mono:true,dy:-16,c:P.q,a:e});
      R.label([X0+SZ/2,hb,Z0],'each token: its best patch (positions illustrative)',{fs:12,dy:-12,a:e,wide:1})}
    // 5. token pooling, factor 3
    if(k===5)R.label([X0+SZ/2,hb+.05,Z0+SZ/2],'pool factor 3: 66.7% fewer vectors',{fs:12.5,b:1,c:P.c4,dy:-10,a:e});
    // 6. what it costs against a text pipeline, to scale: storage per page and offline indexing time per page on an NVIDIA L4
    if(k===6){const XB=2.4,sH=2.6/257.5,tH=2.6/7.22;
      R.box([XB,0,-.6],[.5,8.6*sH,.5],{fill:mix(P.paper,P.c1,.5),a:e});R.box([XB+.8,0,-.6],[.5,257.5*sH*e,.5],{fill:mix(P.paper,P.c4,.55),a:e});
      R.label([XB,8.6*sH,-.6],'8.6 KB',{fs:12.5,mono:true,dy:-18,a:e});R.label([XB+.8,257.5*sH*e,-.6],'257.5 KB',{fs:12.5,mono:true,b:1,dy:-18,c:P.c4,a:e});
      R.label([XB+.4,0,-.2],'storage per page',{fs:12.5,dy:14,a:e});
      let y=0;[['layout',.81],['OCR',2.67],['captions',3.71],['encode',.03]].forEach(([n,v],i)=>{R.box([XB+2,y,-.6],[.5,v*tH*e,.5],{fill:mix(P.paper,P.c1,.3+.15*i),a:e,shadow:i===0});
        if(v>.5)R.label([XB+1.75,y+v*tH*e/2,-.6],n,{al:'right',dx:-6,fs:12,c:P.mute,a:e,wide:1});y+=v*tH*e});
      R.box([XB+2.8,0,-.6],[.5,.39*tH*e,.5],{fill:mix(P.paper,P.c4,.55),a:e});
      R.label([XB+2,y,-.6],'7.22 s',{fs:12.5,mono:true,dy:-18,a:e});R.label([XB+2.8,.39*tH*e,-.6],'0.39 s',{fs:12.5,mono:true,b:1,dy:-18,c:P.c4,a:e});
      R.label([XB+2.4,0,-.2],'indexing time per page',{fs:12.5,dy:14,a:e});
      R.label([XB+.4,0,.25],'text  ·  ColPali',{fs:12,c:P.mute,dy:14,a:e,wide:1});R.label([XB+2.4,0,.25],'text  ·  ColPali',{fs:12,c:P.mute,dy:14,a:e,wide:1})}
  }
  const full={cam:[.28,.78],bounds:[[-3.4,0,-1.7],[-.1,1.3,2.5]]};
  const st=S3.stage({id:'stg-cp',list:'sx-cp',fig:'Fig. 7 · a page image as patch vectors (ColPali)',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1600,hold:4800,draw,
    margin:w=>w<520?[12,8,12,8]:[18,16,16,16],
    // step 3 moves in close on the one patch; MaxSim adds the query in front; the last step turns to the cost towers on the right
    view:k=>k===0?{cam:[.28,.82],bounds:[[-3.4,0,-2.4],[-.1,.4,2.4]]}:k===2?{cam:[.6,.6],bounds:[[-3.2,0,-1.4],[-1.4,1.5,0]]}:k===4?{cam:[.25,.72],bounds:[[-3.4,0,-1.7],[1.4,1.4,2.7]]}:k===6?{cam:[.15,.42],bounds:[[1.9,0,-1],[5.5,2.8,.6]]}:full});
  if(st)ING3.stages.push(st);
})();
