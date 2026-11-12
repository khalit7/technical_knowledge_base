// ---- Scene, Fig. 5 (2026-11-12): the shape of every shard_map. x [32, 128] on a mesh of 8 devices over one axis 'data', in_specs=P('data'):
// each call of f sees [4, 128] (the shard shape the multi-host run recorded, SS.multi addressable_shards); the body is illustrative and ends in
// psum(g, 'data'), so out_specs=P(). Sizes on the stage are not to scale. ----
(function(){
  if(!document.getElementById('stg-smap')||!window.S3||!window.SS)return;const {at,off,mix}=S3;
  const sh=SS.multi.normal.processes[0].addressable_shards[0][1];                  // [4, 128]
  const N=8,DX=i=>(i-3.5)*1.0,DZ=.7,CW=.78,CH=.2,CD=.66,FOC=3;
  const GX=-3.6,GW=7.2,GY=1.15,GH=.5,GZ=-1.0;                                      // the global array, rows across
  const bc=(P,i)=>[P.c1,P.c2,P.c3,P.c4,P.c5,P.c6,mix(P.c1,P.c3,.5),mix(P.c2,P.c4,.5)][i];
  function draw(R,k,e){const P=R.P;R.grid(-4.4,4.4,-1.6,1.6,.5);
    const others=k===2?1-.72*e:k>2?.28+.72*(k===3?e:1):1;                         // step 3 is about one device: the rest recede
    // the 8 devices of the 1-D mesh
    for(let i=0;i<N;i++){const a=i===FOC?1:others;R.box([DX(i),0,DZ],[CW,CH,CD],{fill:i===FOC&&k===2?mix(P.paper,P.acc,.25*e):P.paper,a});
      R.label([DX(i),0,DZ+CD/2],'device '+i,{fs:12,dy:14,c:P.mute,a:a*(k===2&&i!==FOC?0:1),wide:1})}
    if(k!==2)R.label([DX(0)-CW/2,0,DZ],"mesh: data · 8",{fs:13,b:1,al:'right',dx:-10,c:P.c1});
    // 1. the global array; 2. cut by in_specs and sent down, one block per device
    const ga=k<=1?1:k===2?1-.75*e:k===3?.25:.25-.17*e,cut=k===0?0:k===1?e:1,g=.06*cut,bw=GW/N;
    for(let i=0;i<N;i++){R.glass([GX+i*bw+g/2,GY,GZ],[bw-g,0,0],[0,GH,0],{c:cut>0?mix(P.c1,bc(P,i),cut):P.c1,a:ga,nu:2,nv:3,th:.04});
      if(k===1)R.flowArc([GX+(i+.5)*bw,GY,GZ],[DX(i),CH+.05,DZ],.3,{c:bc(P,i),a:e,r:.06,n:5,speed:1.2});
      if(k===1)R.label([GX+(i+.5)*bw,GY+GH,GZ],(i?'':'rows ')+(4*i)+'-'+(4*i+3),{fs:12,dy:-9,c:P.mute,a:cut,wide:1})}
    if(k!==2)R.label([0,GY+GH,GZ],"x [32, 128] · in_specs=P('data')",{mono:true,fs:12.5,b:1,dy:k===1?-28:-12,c:P.ink,a:k>=3?.35*ga:ga});
    // the local block on each device
    if(k>=1)for(let i=0;i<N;i++){const a=(k===1?e:1)*(i===FOC?1:others);R.glass([DX(i)-.28,CH+.04,DZ-.1],[.56,0,0],[0,.32,0],{c:bc(P,i),a,nu:2,nv:2,th:.03})}
    // 3. inside one device: f on [4, 128], axis_index gives its coordinate, a partial g
    if(k>=2){const x=DX(FOC),a=k===2?e:k===3?1-e:0;
      R.box([x+.02,CH+.42,DZ-.1],[.5,.26,.32],{fill:mix(P.paper,P.c3,.25),a,shadow:false});
      if(k===2){R.flow([[x-.12,CH+.36,DZ-.1],[x-.12,CH+.55,DZ-.1]],{c:bc(P,FOC),a:e,r:.045,n:3,speed:.8});
        R.label([x,CH+.55,DZ-.1],'f',{mono:true,fs:14,b:1,c:P.ink,a:e});
        R.label([x+CW/2,CH,DZ],'f sees ['+sh.join(', ')+']',{mono:true,fs:12.5,b:1,al:'left',dx:16,dy:-26,c:P.ink,a:e});
        R.label([x+CW/2,CH,DZ],"axis_index('data') = "+FOC,{mono:true,fs:12.5,al:'left',dx:16,dy:-8,c:P.c1,a:e})}}
    // g: a partial result on top of every device (every device ran the same f)
    if(k>=2)for(let i=0;i<N;i++){const a=(i===FOC?(k===2?e:1):(k===2?0:k===3?e:1))*(k===2&&i!==FOC?0:1),fill=k>=4?mix(P.paper,P.c2,.5+.0*e):mix(P.paper,P.c3,.55);
      R.box([DX(i)+.02,CH+.72,DZ-.1],[.42,.14,.28],{fill:k===4?mix(mix(P.paper,P.c3,.55),mix(P.paper,P.c2,.55),e):fill,a,shadow:false})}
    // 4. psum(g, 'data'): an all-reduce over the 8 devices, drawn as a ring of neighbours passing partial sums
    if(k===3)for(let i=0;i<N;i++){const j=(i+1)%N;if(j===0)R.flowArc([DX(i),CH+.82,DZ-.1],[DX(0),CH+.82,DZ-.1],.9,{c:P.c2,a:e*.8,r:.05,n:14,speed:1.6});
      else R.flowArc([DX(i),CH+.82,DZ-.1],[DX(j),CH+.82,DZ-.1],.18,{c:P.c2,a:e,r:.055,n:3,speed:.9})}
    if(k===3)R.label([0,CH+1.1,DZ],"psum(g, 'data'): all-reduce over 8 devices",{fs:12.5,b:1,dy:-34,c:P.c2,a:e});
    // 5. out_specs=P(): the same summed g on every device, one replicated result
    if(k===4){R.glass([-1.0,1.5,DZ+.3],[2.0,0,0],[0,.36,0],{c:P.c2,a:e,nu:4,nv:2,th:.04});
      for(let i=0;i<N;i++)R.flowArc([DX(i),CH+.86,DZ-.1],[DX(i)*.25,1.5,DZ+.3],.12,{c:P.c2,a:e*.7,r:.045,n:3,speed:.9});
      R.label([0,1.86,DZ+.3],'out_specs=P(): the same g on all 8',{fs:12.5,b:1,dy:-10,c:P.c2,a:e})}
  }
  const full={cam:[.12,.42],bounds:[[-4.2,0,-1.2],[4.2,2.0,1.2]]};
  S3.stage({id:'stg-smap',list:'sx-smap',fig:'Fig. 5 · shard_map: split, run per device, psum, reassemble',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,
    margin:w=>w<520?[22,10,24,10]:[26,24,30,110],
    view:k=>k===2?{cam:[.35,.36],bounds:[[DX(FOC)-1.6,0,-.2],[DX(FOC)+2.6,1.4,1.2]]}:full});
})();
