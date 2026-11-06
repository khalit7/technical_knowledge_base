// ---- Scene: Fig. 1, two routes from a file to an index (renderer v2). The page is the real page 1 of arXiv 1909.00175 v1 with its 90 text lines (ING.anat);
// every number on the labels is one this page measures or quotes in the section the step links to (the step list says which). Station sizes are layout only. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.ING3||!window.ING||!ING.anat)return;const {mix,at,off,lerp}=S3;
  const A=ING.anat,PG=A.page,S=ING3.sheet(PG.w,PG.h,-5.4,-1.56,2.2);
  const ZB=-.95,ZF=1.05,XS=[-1.9,-.4,1.1,2.6],XI=4.3,BW=1.0,BH=.28,BD=.8;
  const ST=[['Text layer or OCR','rules 0.01 s/page · OCR 2.2 s/page'],['Layout and order','evidence intact: 1 to 94 of 107'],['Tables, figures','1 of 6 table tools kept every header'],['Chunks and metadata','page, box, heading path, ACL']];
  // which stations each step lights (the rest stay faint, so the whole route is visible from the first step)
  const LIT=[[],[0,1],[2,3],[3],[]];
  function cuboid(R,x0,z0,w,d,y0,h,c,a,n){if(a<=.01)return;
    R.glass([x0,y0+h,z0],[w,0,0],[0,0,d],{c,a,nu:n,nv:n,th:.02});
    R.glass([x0,y0,z0+d],[w,0,0],[0,h,0],{c,a:a*.7,nu:n,nv:4,th:.02});R.glass([x0+w,y0,z0],[0,0,d],[0,h,0],{c,a:a*.7,nu:n,nv:4,th:.02})}
  function draw(R,k,e){const P=R.P,im=ING3.img(ING.anatImg),nar=R.W<520;R.grid(-6,5.4,-2.2,2.4,.5);
    const back=k===4?.3:1;
    // the page and its text layer
    ING3.pic(R,im,[S.x0,0,S.z0],[S.w,0,0],[0,0,S.d],{under:true});
    const lift=k===0?.22*e:.22,la=k===0?1:k===1?1-.6*e:.4;
    A.lines.forEach(l=>{const b=S.box(l.bbox,lift);R.box(b.c,b.s,{fill:mix(P.paper,P.c1,.35),a:la,shadow:false,lw:.5})});
    if(k<2||k===4)R.label([S.x0+S.w/2,.25,S.z0-.1],'PDF page',{fs:13,b:1,dy:-10});
    if(k===0){R.label([S.x0+S.w/2,0,S.z0+S.d+.1],'glyphs at x, y · no paragraphs',{fs:12.5,dy:12,a:e});R.label([S.x0+S.w+.15,.2,0],'0 of 38 files tagged',{al:'left',dx:6,fs:12.5,c:P.mute,a:e,wide:1})}
    // the parse route: four stations on the back lane, then the index of one vector per chunk
    XS.forEach((x,i)=>{const lit=LIT[k].includes(i),done=(k===1&&i<0)||(k===2&&i<2)||(k===3&&i<3)||k===4,
        a=lit?1:k===0?.14:done?.55*back:.14;
      R.box([x,0,ZB],[BW,BH,BD],{fill:lit?mix(P.paper,P.acc,.3):P.paper,a});
      // only the stations a step is about carry labels; neighbours alternate heights so their labels never collide
      if(lit){R.label([x,BH,ZB-BD/2],ST[i][0],{fs:12.5,b:1,dy:-12-(i%2)*18,wide:i!==LIT[k][LIT[k].length-1]?1:0});R.label([x,0,ZB+BD/2+.05],ST[i][1],{fs:12,mono:true,dy:14+(i%2)*18,c:P.acc,a:e,wide:1})}});
    const top=(x,z)=>[x,BH+.02,z];
    if(k===1){R.flowArc([S.x0+S.w*.75,.25,ZB],top(XS[0],ZB),.5,{c:P.acc,a:e,n:9,speed:1.4});R.flowArc(top(XS[0]+.3,ZB),top(XS[1]-.3,ZB),.35,{c:P.acc,a:e,n:6,speed:1.4})}
    if(k===2){R.flowArc(top(XS[1]+.3,ZB),top(XS[2]-.3,ZB),.35,{c:P.acc,a:e,n:6,speed:1.4});R.flowArc(top(XS[2]+.3,ZB),top(XS[3]-.3,ZB),.35,{c:P.acc,a:e,n:6,speed:1.4})}
    // chunks with their metadata: three slabs on station 4, each wearing three small tags (page, box, heading path)
    const ca=k<2?0:k===2?e:back;
    for(let j=0;j<3;j++){const y=BH+.02+j*.13;R.box([XS[3],y,ZB],[.7,.09,.5],{fill:mix(P.paper,P.c1,.4),a:ca,shadow:false});
      [P.c2,P.c3,P.c4].forEach((c,t)=>R.box([XS[3]-.24+t*.24,y+.09,ZB+.18],[.1,.04,.1],{fill:c,a:ca,shadow:false}))}
    // index: one vector per chunk
    R.glass([XI-.6,.02,ZB-.45],[1.2,0,0],[0,0,.9],{c:P.c1,a:k<3?.2:back,nu:6,nv:4});
    const va=k<3?0:k===3?e:back;for(let j=0;j<6;j++)R.box([XI-.45+j*.18,.03,ZB],[.07,.75,.07],{fill:P.c1,a:va,shadow:false});
    if(k===3)R.label([XI,.8,ZB],'index · 1 vector per chunk',{fs:12.5,b:1,dy:-10,c:P.c1});
    if(k===3){R.flowArc([XS[3]+.4,.4,ZB],[XI-.4,.8,ZB],.4,{c:P.c1,a:e,n:8,speed:1.3});R.label([XI,.8,ZB],'fixed windows re-embed 76% for 15% changed',{fs:12,mono:true,dy:-30,c:P.c1,a:e,wide:1})}
    // the page-image route on the front lane: the page as a picture, squeezed square, a block of patch vectors, a multi-vector index
    const ia=k<4?(k===0?0:.12):e,px=XS[0]-.7,pz=ZF-.7;
    if(ia>0){ING3.pic(R,im,[px,.01,pz],[1.4,0,0],[0,0,1.4],{a:ia,nu:4,nv:4});
      R.glass([px,.03,pz],[1.4,0,0],[0,0,1.4],{c:P.c4,a:ia*.8,nu:32,nv:32,th:.01});
      cuboid(R,px,pz,1.4,1.4,.05,.55*(k===4?e:1),P.c4,ia,8);
      cuboid(R,XI-.5,ZF-.5,1.0,1.0,.02,.85,P.c4,ia,6);
      if(k===4){R.flowArc([px+1.4,.45,ZF],[XI-.5,.7,ZF],.5,{c:P.c4,a:e,n:12,speed:1.4,r:.06});R.flowArc([S.x0+S.w*.8,.2,ZF-.3],[px,.3,ZF],.35,{c:P.c4,a:e,n:6,speed:1.4})}
      if(k===4){R.label([px+.7,.6,ZF],'page image · no parsing',{fs:12.5,b:1,dy:-12,c:P.c4,a:ia});
      R.label([px+.7,0,pz+1.45],'1,030 vectors per page',{fs:12,mono:true,dy:14,c:P.c4,a:ia,wide:1});
      R.label([XI,.9,ZF],'MaxSim over patches',{fs:12.5,b:1,dy:-10,c:P.c4,a:ia});
      R.label([XI,0,ZF+.55],'figures: 74.2 against 37.9',{fs:12,mono:true,dy:14,a:ia,wide:1});
      R.label([XI,0,ZF+.55],'text-heavy: a tie, 97.7 against 95.0',{fs:12,mono:true,dy:30,a:ia,wide:1})}}
  }
  const full={cam:[.2,.78],bounds:[[-5.6,0,-1.9],[5.0,1.2,2.2]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · two routes from a file to an index',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:4800,draw,
    margin:w=>w<520?[12,8,12,8]:[22,18,30,18],
    // the camera moves in on what each step is about: the page, then the stations two at a time, then the index; the last step shows both routes
    view:k=>k===0?{cam:[.35,.85],bounds:[[-5.7,0,-1.9],[-2.6,.6,1.8]]}:k===1?{cam:[.2,.75],bounds:[[-5.6,0,-1.7],[.4,.9,.6]]}:k===2?{cam:[.2,.72],bounds:[[-1.1,0,-1.7],[3.4,1.0,.4]]}:k===3?{cam:[.2,.72],bounds:[[1.6,0,-1.7],[5.2,1.0,.4]]}:full});
  if(st)ING3.stages.push(st);
})();
