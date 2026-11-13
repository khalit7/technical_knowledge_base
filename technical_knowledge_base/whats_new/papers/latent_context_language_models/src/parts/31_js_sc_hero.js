// ---- Scene (top of the paper tab, 2026-11-13 layout rollout; it replaces the static hero 14_js_hero.js): one 65,536-token prompt at 4x
// through the three pipelines of the old hero, in three rows in depth (renderer v2: white token blocks, glass plates for the encoder,
// adapter and decoder, flowing dots wherever tokens or latents move, the camera moving in close per step).
// Everything is drawn to scale in positions: one token block is 4,096 tokens (four encoder windows of 1,024), a latent block the 1,024
// latents one token block becomes at 4x, a cache slab 4,096 decoder positions (the cache is a tower of slabs, so its height is the memory it holds). The numbers are the page's: Figure 4's measured time to
// first token and peak memory at 64K (window.PAPER.rc.fig4, read from the vector paths) and the KV bytes per position from the released
// config (rc.models.kv_bytes_per_token, bf16). Which cache entries the KV method keeps is illustrative (one slice in four per block,
// a different slice in each block, so no block can be freed); the share kept, 1/4, is the ratio. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const RC=window.PAPER.rc,F=RC.fig4,KVB=RC.models.kv_bytes_per_token,T=65536,N=4,BLK=4096,NB=T/BLK,L='64k';
  const LN=[{k:'NoCompression',z:-1.7,name:'No compression'},{k:'KVzipFast',z:0,name:'KV compression (FastKVzip 4x)'},{k:'LCLM 4x',z:1.7,name:'LCLM 4x'}];
  const gb=b=>(b/1e9).toFixed(2)+' GB',g=v=>v.toLocaleString('en-GB');
  // x layout: the prompt, the encoder and the latents (LCLM row only), the adapter, the decoder, the cache tower, the result bars
  const PIT=.3,BW=.26,TX0=-6.1,ENC=-.75,LX0=-.3,ADA=1.25,DEC=1.95,CX=3.05,SH=.1,BX=4.6;
  const tokX=i=>TX0+PIT/2+i*PIT,latX=i=>LX0+PIT/N/2+i*PIT/N;
  const ttft=i=>F.ttft[LN[i].k][L],mem=i=>F.mem[LN[i].k][L];
  const tmax=Math.max(ttft(0),ttft(1),ttft(2)),mmax=Math.max(mem(0),mem(1),mem(2));
  const keep=i=>(i*3+1)%4;   // the KV method keeps one segment in four of every slab, a different one slab to slab (illustrative)
  const cl=v=>v<0?0:v>1?1:v;
  function plate(R,x,z,w,h,c,a,name,sub,lab){if(a<=.01)return;R.glass([x-w/2,.06,z],[w,0,0],[0,h,0],{c,a,nu:5,nv:6});
    if(lab)R.label([x-w/2,h+.06,z],name+(sub?' · '+sub:''),{fs:12.5,b:1,c,al:'right',dx:-2,dy:-8,a,wide:x===DEC})}
  // the KV cache as a tower of slabs, one per 4,096 positions: n slabs, grown to g; ev the eviction progress (KV row)
  function tower(R,z,n,grow,a,P,ev){const fill=mix(P.paper,P.c1,.5),kc=mix(P.paper,P.c2,.6);
    for(let i=0;i<n;i++){const ai=a*cl(grow*n-i);if(ai<=0)break;const y=i*SH;
      if(ev==null){R.box([CX,y,z],[.9,SH*.86,.62],{fill,a:ai,lw:.6,shadow:i===0});continue}
      for(let s=0;s<4;s++){const kept=s===keep(i);R.box([CX-.3375+s*.225,y,z],[.2,SH*.86,.62],{fill:kept?kc:fill,a:ai,fa:kept?1:lerp(1,.12,ev),ea:kept?undefined:lerp(.78,.3,ev),lw:.55,shadow:false})}}}
  function draw(R,k,e){const P=R.P;R.grid(-6.6,6.2,-2.7,2.7,.5);
    const foc=[[1,1,1],[1,.2,.2],[.2,1,.2],[.2,.2,1],[.2,.2,1],[1,1,1]][k];
    const C=[P.mute,P.c2,P.good];
    LN.forEach((ln,li)=>{const z=ln.z,a=foc[li],grow=k===0?e:1;
      for(let i=0;i<NB;i++){const ai=a*cl(grow*NB-i);if(ai>0)R.box([tokX(i),0,z],[BW,.42,.62],{fill:P.paper,a:ai,lw:.7,shadow:a>.5})}
      R.label([TX0-.1,.2,z],ln.name,{al:'right',dx:-6,fs:12.5,b:a>.6,c:C[li],a:Math.max(.45,a),grp:'lane'})});
    if(k===0)R.label([tokX(NB-1)+.2,.42,LN[2].z],'16 blocks of 4,096 tokens',{mono:true,fs:12,al:'left',dx:4,dy:-6,c:P.mute,a:e});
    // the cache label and the measured result beside each row's tower, while that row is in focus
    const res=(li,n,a)=>{const z=LN[li].z;R.label([CX-.45,n*SH,z],'KV cache '+gb(n*BLK*KVB),{mono:true,fs:12,al:'left',dy:-10,c:P.c1,a});
      R.label([CX+.5,.05,z],ttft(li).toFixed(2)+' s · '+mem(li).toFixed(1)+' GB',{mono:true,fs:12.5,b:1,al:'left',dx:6,c:li?C[li]:P.ink,a})};
    // step 2: no compression, the decoder prefills all 65,536 positions
    {const li=0,z=LN[li].z,a=foc[li],ap=at(k,e,1)*a,fo=k===1;
      plate(R,DEC,z,.8,1.2,P.c1,ap,'4B decoder','36 layers',fo);
      tower(R,z,NB,k===1?e:1,ap,P);
      if(fo){[2,8,14].forEach(i=>R.flowArc([tokX(i),.44,z],[DEC-.3,.62,z],.45+.03*(15-i),{c:P.c5,a:e*.8,r:.055,n:10,speed:1.4}));R.flowArc([DEC+.3,.65,z],[CX-.3,NB*SH*.6,z],.25,{c:P.c1,a:e*.8,r:.06,n:6});res(li,NB,e)}}
    // step 3: KV compression, the same prefill, then three in four entries masked but still allocated
    {const li=1,z=LN[li].z,a=foc[li],ap=at(k,e,2)*a,fo=k===2,ev=k<2?0:k===2?cl((e-.5)/.35):1;
      plate(R,DEC,z,.8,1.2,P.c1,ap,'4B decoder','36 layers',fo);
      tower(R,z,NB,k===2?cl(e*2):1,ap,P,ev);
      if(fo){[2,8,14].forEach(i=>R.flowArc([tokX(i),.44,z],[DEC-.3,.62,z],.45+.03*(15-i),{c:P.c5,a:e*.8,r:.055,n:10,speed:1.4}));R.flowArc([DEC+.3,.65,z],[CX-.3,NB*SH*.6,z],.25,{c:P.c1,a:e*.8,r:.06,n:6});
        res(li,NB,e)}}
    // steps 4 and 5: the LCLM, encoder in windows and mean-pool every 4, then adapter and decoder over the 16,384 latents
    {const li=2,z=LN[li].z,a=foc[li],ae=at(k,e,3)*a,ad=at(k,e,4)*a;
      plate(R,ENC,z,.62,1.0,P.c4,ae,'0.6B encoder',null,k===3);
      for(let i=0;i<NB;i++){const ai=ae*cl((k===3?e:1)*NB-i);if(ai>0)R.box([latX(i),0,z],[PIT/N*.8,.42,.62],{fill:mix(P.paper,P.good,.5),a:ai,lw:.6,shadow:false})}
      if(k===3){[1,5,9,13].forEach(i=>R.flowArc([tokX(i),.44,z],[ENC-.2,.55,z],.4+.03*(15-i),{c:P.c5,a:e*.8,r:.055,n:9,speed:1.4}));R.flowArc([ENC+.2,.5,z],[LX0+.5,.45,z],.25,{c:P.c4,a:e*.85,r:.05,n:5});
        R.label([LX0+NB*PIT/N/2,.42,z],g(T/N)+' latents',{mono:true,fs:12,dy:-12,c:P.good,a:e})}
      plate(R,ADA,z,.34,.8,P.c6,ad,'adapter',null,k===4);
      plate(R,DEC,z,.8,1.2,P.c1,ad,'4B decoder',null,k===4);
      tower(R,z,NB/N,k===4?e:1,ad,P);
      if(k===4){R.flowArc([LX0+.9,.44,z],[ADA-.12,.45,z],.25,{c:P.good,a:e*.85,r:.05,n:4});R.flowArc([ADA+.12,.5,z],[DEC-.3,.6,z],.18,{c:P.c6,a:e*.85,r:.05,n:3});R.flowArc([DEC+.3,.65,z],[CX-.3,.3,z],.22,{c:P.c1,a:e*.8,r:.05,n:3});res(li,NB/N,e)}}
    // step 6: side by side, the measured time to first token and peak memory as bars on plinths at the end of each row
    if(k===5){LN.forEach((ln,li)=>{const z=ln.z,a=e;R.box([BX+.3,.16,z],[1.1,.04,.6],{a,shadow:false});[-1,1].forEach(s=>R.box([BX+.3+s*.5,0,z],[.03,.12,.03],{a:a*.9}));
        const ht=ttft(li)/tmax*1.05*e,hm=mem(li)/mmax*1.05*e;
        R.box([BX,.2,z],[.36,Math.max(.01,ht),.36],{fill:C[li],a,shadow:false});R.box([BX+.55,.2,z],[.36,Math.max(.01,hm),.36],{fill:mix(P.paper,C[li],.45),a,shadow:false});
        R.label([BX,.2+ht,z],ttft(li).toFixed(2)+' s',{mono:true,fs:12.5,b:1,dy:-11,c:li?C[li]:P.ink,a});R.label([BX+.73,.2+hm,z],mem(li).toFixed(1)+' GB',{mono:true,fs:12,al:'left',dx:4,dy:6,c:P.ink,a})});
    }
  }
  const full={cam:[.3,.78],bounds:[[-6.2,0,-2.1],[5.8,1.5,2.1]]};
  const lane=(z,x0,x1,y1)=>[[x0,0,z-.5],[x1,y1||1.7,z+.5]];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one 64K prompt at 4x, to scale',cam:full.cam,bounds:full.bounds,aspect:.42,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,10,14,10]:[22,16,14,150],
    view:k=>{const ph=innerWidth<600,v=k===1?{cam:[.3,.42],bounds:lane(LN[0].z,-6.2,4.6)}:k===2?{cam:[.3,.42],bounds:lane(LN[1].z,-6.2,4.6)}:k===3?{cam:[.35,.45],bounds:lane(LN[2].z,-6.2,1.2,1.3)}:k===4?{cam:[.25,.42],bounds:lane(LN[2].z,-.8,4.6,1.4)}:k===5?{cam:[.3,.9],bounds:[[1.3,0,-2.1],[6.0,1.4,2.3]]}:full;
      return ph?{cam:[v.cam[0],Math.max(.75,v.cam[1]+.3)],bounds:v.bounds}:v}});
})();
