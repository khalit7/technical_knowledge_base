// ---- Scene, Fig. 4 (section 8): four ways to write one checkpoint from four ranks, and why sharding pays only when each writer has its own
// link (renderer v2). Times and bytes are the root Storage lab's measured runs (window.IO_D.slow_bind and .slow_vol layouts: the 3.2M-parameter
// GPT, 38.6 MB of state, 4 ranks in one container, medians of 3); the last step's four nodes with their own links are illustrative.
// Colours as the layout chart: gathering purple, writing blue. Steps: #sx-burst.
(function(){
  if(!document.getElementById('stg-burst')||!window.IO_D||!IO_D.slow_bind)return;const {at,off,lerp,mix}=S3;
  const L=IO_D.slow_bind.layouts,V=IO_D.slow_vol.layouts;
  window.SD_BURST={r0:L.ddp_rank0.wall_s,every:L.ddp_every.wall_s,everyB:L.ddp_every.total_bytes,full:L.fsdp_full.wall_s,gather:L.fsdp_full.gather_s[0],dcp:L.fsdp_dcp.wall_s,
    r0vol:V.ddp_rank0.wall_s,gatherVol:V.fsdp_full.gather_s[0],state:L.ddp_rank0.total_bytes};
  const B=window.SD_BURST,s2=x=>x.toFixed(2)+' s',MB=x=>(x/1e6).toFixed(1)+' MB';
  const HL=[0,2.1,-4.6]; // the headline of each step sits high behind the file system
  const RX=[-3.3,-1.1,1.1,3.3],ZR=2,ST=[0,0,-3.3],CH=[0,0,-.7],HS=.64;
  function draw(R,k,e){const P=R.P,W=P.c1,G=P.c4,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-5.5,5.5,-4.4,3.6,.5);
    const ddp=k===1||k===2,sharded=!ddp,cl=k===5?e:0;
    // the file system, and the files each layout leaves on it
    R.box(ST,[5.4,.7,1.5],{fill:mix(P.paper,W,.3)});lab([ST[0]+2.7,.4,ST[2]],'file system',{al:'left',dx:10,b:1,c:W});
    const files=k===1?['rank0.pt']:k===2?['rank0.pt','rank1.pt','rank2.pt','rank3.pt']:k===3?['full.pt']:k>=4?['__0_0','__1_0','__2_0','__3_0']:[];
    const fa=k===3?Math.max(0,e*2-1):e;
    files.forEach((f,i)=>{const n=files.length,x=ST[0]+(i-(n-1)/2)*1.25;R.box([x,.7,ST[2]],[1.05,.16*(k===2||k===1||k===3?1:.5)+.06,.9],{fill:mix(P.paper,W,.75),a:fa,shadow:false,lw:.6});
      });
    if(files.length)lab([ST[0],.95,ST[2]+.4],k===2?'4 x rankN.pt':k>=4?'4 x .distcp + .metadata':files[0],{dy:16,fs:12,b:1,a:fa});
    // the one shared path every rank in the container goes through (faded away at the last step)
    const ca=1-cl;
    if(ca>0){R.box(CH,[.7,.9,.7],{fill:mix(P.paper,P.c5,.35),a:ca*(k===0||k>=1?1:.3)});lab([CH[0]+.4,.9,CH[2]],'one shared path',{al:'left',dx:10,c:P.c5,b:1,a:ca})}
    // the ranks and what each holds: a full copy (DDP) or a quarter (FSDP)
    RX.forEach((x,r)=>{R.box([x,0,ZR],[1.8,.22,1.3],{fill:mix(P.paper,P.ink,.06),dz:200});
      const h=ddp?HS:HS/4,c=ddp?P.mute:[P.c1,P.c2,P.c3,P.c4][r];
      if(k===3&&r>0){const left=1-Math.min(1,e*2);if(left>0)R.box([x,.22,ZR],[.8,h,.8],{fill:mix(P.paper,c,.7),a:left,shadow:false})}
      else R.box([x,.22,ZR],[.8,h,.8],{fill:mix(P.paper,c,.7),shadow:false});
      if(k===3&&r===0){const got=Math.min(1,e*2);for(let j=1;j<4;j++)R.box([x,.22+HS/4*j,ZR],[.8,HS/4,.8],{fill:mix(P.paper,[P.c1,P.c2,P.c3,P.c4][j],.7),a:got,shadow:false})}
      lab([x,0,ZR+.65],(cl>.5?'node ':'rank ')+r,{dy:14,b:1})});
    if(k===0)lab([RX[0]-.9,.3,ZR],'38.6 MB of state',{al:'right',dx:-8,c:P.ink,wide:1});
    const up=r=>[RX[r],.7,ZR-.2],chT=[CH[0],1,CH[2]],stT=i=>[ST[0]+i,.9,ST[2]+.5];
    const via=(r,a,c,o)=>{R.flowArc(up(r),chT,.8,Object.assign({c,a,r:.07,n:6,speed:1.3},o||{}));R.flowArc(chT,stT(0),.5,Object.assign({c,a,r:.07,n:4,speed:1.3},o||{}))};
    if(k===1){via(0,e,W);lab(HL,'rank 0 writes '+MB(B.state)+' · '+s2(B.r0),{b:1,c:W,a:e})}
    if(k===2){[0,1,2,3].forEach(r=>via(r,e,W,{n:4}));lab(HL,MB(B.everyB)+' through one path · '+s2(B.every),{b:1,c:W,a:e})}
    if(k===3){const g=Math.min(1,e*2),w=Math.max(0,e*2-1);[1,2,3].forEach(r=>R.flowArc(up(r),up(0),.6+.15*r,{c:G,a:g*(1-w*.7),r:.07,n:6,speed:1.6}));if(w>0)via(0,w,W);
      lab(HL,'gather '+s2(B.gather)+', then one writer · '+s2(B.full)+' in all',{b:1,c:w>0?W:G,a:e})}
    if(k===4){[0,1,2,3].forEach(r=>via(r,e,W,{n:4}));lab(HL,'4 shards + .metadata · '+s2(B.dcp)+': one shared path',{b:1,c:W,a:e})}
    if(k===5){[0,1,2,3].forEach(r=>R.flowArc(up(r),stT((r-1.5)*1.25),1.1,{c:W,a:e,r:.08,n:8,speed:1.6}));lab(HL,'each node its own link: 4 writes side by side',{b:1,c:P.good,a:e})}
  }
  const full={cam:[.3,.6],bounds:[[-4.6,0,-4.8],[4.6,2.3,2.9]]};
  const st=S3.stage({id:'stg-burst',list:'sx-burst',fig:'Fig. 4 · four ways to write one checkpoint',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw});
  (window.SDSTG=window.SDSTG||{})['stg-burst']=st;
})();
