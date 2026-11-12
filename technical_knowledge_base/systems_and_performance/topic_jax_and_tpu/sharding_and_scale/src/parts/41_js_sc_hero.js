// ---- Scene, Fig. 1 (2026-11-12): three annotations in, one program per device out. The running example's fc1 weight w [128, 512] as
// P('data', 'model') and a batch x [32, 128] as P('data', None) on a (data 2, model 4) mesh of 8 devices. Shapes and specs are this page's
// (the (64, 128) shard is what visualize_array_sharding printed, SS.debug.shard_shapes); the all-gather over 'data' in step 4 is what the
// compiled FSDP x tensor step of section 6 shows (SS.scale: forward all-gathers in groups of 2). Sizes on the stage are not to scale. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.SS)return;const {at,off,mix}=S3;
  const SH=(SS.debug.shard_shapes[0]||'(64, 128)');                        // measured shard of w
  const ag=SS.scale.configs.small.layouts.find(l=>l.id==='fsdp_tp').collectives.filter(c=>c[0]==='all-gather'&&c[1]==='forward'&&c[2]===2).reduce((s,c)=>s+c[3],0);
  const CX=[-1.65,-.55,.55,1.65],CZ=[.35,1.3],CW=.86,CH=.2,CD=.72;      // chips: column m (model) across, row d (data) in depth
  const PX0=-1.7,PW=3.4,PY=.55,PH=1.25,PZ=-1.05;                          // w [128, 512] stands at the back
  const XX=-2.95,XW=.7,XY=.45,XH=1.0,XZ=.82;                               // x [32, 128] stands at the left
  const bc=(P,d,m)=>[P.c1,P.c2,P.c3,P.c4,P.c5,P.c6,mix(P.c1,P.c3,.5),mix(P.c2,P.c4,.5)][d*4+m];
  function draw(R,k,e){const P=R.P;R.grid(-3.9,2.6,-1.5,2.1,.5);
    const back=k===4?1-.75*e:1;                                            // step 5: the inputs recede, the result is the point
    // 1. the mesh: 8 chips with named axes
    for(let d=0;d<2;d++)for(let m=0;m<4;m++){const p=[CX[m],0,CZ[d]];let fill=P.paper;
      if(k>=1)fill=mix(P.paper,bc(P,d,m),(k===1?.45*e:.45)*(k===4?1-.6*e:1));
      R.box(p,[CW,CH,CD],{fill});if(k===0)R.label([p[0],CH,p[2]],'device '+(d*4+m),{fs:12,c:P.mute,a:e,wide:1})}
    R.label([0,0,CZ[1]+CD/2],'model · 4',{fs:13,b:1,dy:18,c:P.c2});
    R.label([CX[0]-CW/2,0,(CZ[0]+CZ[1])/2],'data · 2',{fs:13,b:1,al:'right',dx:-10,c:P.c1});
    if(k===0){[0,1].forEach(d=>R.label([CX[3]+CW/2,0,CZ[d]],'data '+d,{fs:12,al:'left',dx:8,c:P.c1,a:e,wide:1}))}
    // 2. w as one glass plate, cut into 2 x 4 blocks, each flowing to the device that holds it
    if(k>=1){const a=(k===1?Math.min(1,e*1.4):1)*back,g=.05,bw=PW/4,bh=PH/2;
      for(let d=0;d<2;d++)for(let m=0;m<4;m++){R.glass([PX0+m*bw+g/2,PY+PH-(d+1)*bh+g/2,PZ],[bw-g,0,0],[0,bh-g,0],{c:bc(P,d,m),a,nu:3,nv:2,th:.04});
        if(k===1)R.flowArc([PX0+(m+.5)*bw,PY+PH-(d+.5)*bh,PZ],[CX[m],CH+.03,CZ[d]],.35,{c:bc(P,d,m),a:e,r:.06,n:6,speed:1.2})}
      R.label([0,PY+PH,PZ],"w [128, 512] · P('data', 'model')",{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a});
      R.label([PX0,PY+PH*.75,PZ],'data 0',{fs:12,al:'right',dx:-8,c:P.c1,a:a*(k===1?1:.7),grp:'wr'});R.label([PX0,PY+PH*.25,PZ],'data 1',{fs:12,al:'right',dx:-8,c:P.c1,a:a*(k===1?1:.7),grp:'wr'});
      if(k===1)R.label([CX[3]+CW/2,CH,CZ[0]],'each device: '+SH+', 32,768 bytes',{fs:12.5,b:1,al:'left',dx:10,c:P.ink,a:e,grp:'out'})}
    // 3. x split by rows over data: each row block goes to the 4 devices of its data row (copies over model)
    if(k>=2){const a=(k===2?Math.min(1,e*1.4):1)*back,g=.05,bh=XH/2;
      for(let d=0;d<2;d++){const c=mix(P.paper,P.c1,d?.75:.45);R.glass([XX-XW/2,XY+XH-(d+1)*bh+g/2,XZ],[XW,0,0],[0,bh-g,0],{c,a,nu:2,nv:2,th:.04});
        if(k===2)CX.forEach(x=>R.flowArc([XX,XY+XH-(d+.5)*bh,XZ],[x,CH+.05,CZ[d]],.28+.04*Math.abs(x),{c:P.c1,a:e*.9,r:.05,n:5,speed:1.3}))}
      R.label([XX,XY+XH,XZ],"x [32, 128]",{mono:true,fs:12.5,b:1,dy:-24,c:P.ink,a});R.label([XX,XY+XH,XZ],"P('data', None)",{mono:true,fs:12,dy:-9,c:P.c1,a});
      if(k===2)R.label([CX[3]+CW/2,CH,CZ[1]],'16 rows each, on 4 devices',{fs:12.5,b:1,al:'left',dx:10,c:P.ink,a:e,grp:'out'})}
    // 4. the partitioner gathers w's rows over data: the two devices of each column swap their blocks
    if(k>=3){const a=k===3?Math.min(1,e*1.5):1-.75*e;
      for(let m=0;m<4;m++){const top=[CX[m],.62,CZ[0]],bot=[CX[m],.62,CZ[1]];
        for(let d=0;d<2;d++){const z=CZ[d],h=.42*(k===3?e:1);
          [0,1].forEach(j=>R.glass([CX[m]-.3,CH+.04+(1-j)*h/2,z],[.6,0,0],[0,h/2-.02,0],{c:bc(P,j,m),a:a*.95,nu:2,nv:1,th:.03}))}
        if(k===3){R.flowArc([CX[m]-.12,CH+.3,CZ[0]],[CX[m]-.12,CH+.3,CZ[1]],.35,{c:bc(P,0,m),a:e,r:.055,n:5,speed:1});R.flowArc([CX[m]+.12,CH+.3,CZ[1]],[CX[m]+.12,CH+.3,CZ[0]],.35,{c:bc(P,1,m),a:e,r:.055,n:5,speed:1})}}
      if(k===3){R.label([CX[3]+CW/2,CH,CZ[0]],'all-gather over data: pairs',{fs:12.5,b:1,al:'left',dx:10,c:P.c1,a:e,grp:'out'});
        R.label([CX[3]+CW/2,CH,CZ[1]],'w now (128, 128) per device',{fs:12.5,al:'left',dx:10,c:P.ink,a:e,grp:'out'});
        if(ag)R.label([0,0,CZ[1]+CD/2],'section 6 FSDP x tensor step: '+ag+' forward all-gathers in groups of 2',{fs:12,dy:40,c:P.mute,a:e,wide:1})}}
    // 5. one program per device: each computes its (16, 128) block of y
    if(k>=4){for(let d=0;d<2;d++)for(let m=0;m<4;m++){const c=mix(P.paper,P.acc,.55);R.box([CX[m],CH,CZ[d]],[.56,.16*e+.01,.48],{fill:c,a:e,shadow:false})}
      R.label([CX[3]+CW/2,CH,CZ[0]],"y = x @ w: (16, 128) per device",{fs:12.5,b:1,al:'left',dx:10,c:P.acc,a:e,grp:'out'});
      R.label([CX[3]+CW/2,CH,CZ[1]],"y comes out P('data', 'model')",{fs:12.5,al:'left',dx:10,c:P.ink,a:e,grp:'out'})}
  }
  const full={cam:[.32,.5],bounds:[[-3.35,0,-1.15],[2.25,1.85,1.45]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · two annotations, 8 devices, one collective',cam:full.cam,bounds:full.bounds,aspect:.54,dur:1400,hold:4800,draw,
    margin:w=>w<520?[16,10,26,10]:[18,180,34,40],
    view:k=>k===0?{cam:[.3,.62],bounds:[[-2.3,0,-.2],[2.3,.5,1.75]]}:full});
})();
