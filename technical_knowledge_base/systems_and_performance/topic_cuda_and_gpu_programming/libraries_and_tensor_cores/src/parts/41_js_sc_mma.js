// ---- Scene, Fig. 2 (section 5): one tensor-core instruction per generation, in the usual picture of a matrix multiply, to one scale
// (1 unit = 32 elements): A stands on the left (M x K), B at the back (K x N), C on the floor (M x N); colour says where each operand lives
// (registers blue, shared memory green, tensor memory purple). Shapes from the PTX ISA 9.4: mma.sync m16n8k16, the largest wgmma m64n256k16,
// the largest single-SM tcgen05.mma 128 x 256 x 16; cta_group::2 drawn as two of those (illustrative). Lane 0's fragment is computed by the
// page's CuTe algebra (window.CUTE) from CuTe's own thread-value layouts (window.LT.cute), the same that check/check_layouts.mjs checks.
// Steps are explained by #sx-mma on the left. ----
(function(){
  if(!document.getElementById('stg-mma'))return;const {at,off,lerp,mix}=S3,C=window.CUTE,L=window.LT;
  const s=1/32,g=.05,K=16;
  // lane 0's elements of A (m,k), B (k,n) and C (m,n), from the TV layouts (B is stored N x K in CuTe)
  function lane0(key,kind){const l=C.parse(L.cute[key].txt),T=C.size(l.s[0]),V=C.size(l.s[1]),out=[];
    for(let v=0;v<V;v++){const idx=C.at(l,0+T*v);if(kind==='B')out.push([Math.floor(idx/8),idx%8]);else out.push([idx%16,Math.floor(idx/16)])}return out}
  const LA=lane0('sm80_m16n8k16_A','A'),LB=lane0('sm80_m16n8k16_B','B'),LC=lane0('sm80_m16n8k16_C','C');
  window.LT_MMA={a0:LA.length,b0:LB.length,c0:LC.map(x=>'('+x[0]+','+x[1]+')').join(' '),mac:[16*8*16,64*256*16,128*256*16]};
  const SH=[{m:16,n:8},{m:16,n:8},{m:64,n:256},{m:128,n:256},{m:128,n:256}];
  function gemm(R,m,n,cA,cC,a,z0,o){o=o||{};const P=R.P,M=m*s,N=n*s,KK=K*s,cu=n>8?8:1,cv=m>16?16:1,y0=o.y0||0;
    if(!o.noA)R.glass([-g,y0,z0],[0,0,M],[0,KK,0],{c:cA,a,nu:m/cv,nv:Math.min(16,K),th:.02});
    if(!o.noB)R.glass([0,y0,-g],[N,0,0],[0,KK,0],{c:cA,a,nu:n/cu,nv:Math.min(16,K),th:.02});
    R.glass([0,y0+.012,z0],[N,0,0],[0,0,M],{c:cC,a,nu:n/cu,nv:m/cv,th:.02})}
  function draw(R,k,e){const P=R.P,W=R.W,H=R.H;
    const lab=(p,t,o)=>{const q=R.p(p);if(q[0]<4||q[0]>W-4||q[1]<4||q[1]>H-4)return;R.label(p,t,o)};
    const reg=P.c1,sm=P.c3,tm=P.c4,hl=P.c2;
    if(k<=1)R.grid(-.25,.95,-.25,.75,1/32*2);else R.grid(-2,11,-1,k===4?10:5.5,.5);
    // ---- mma.sync: one warp, registers ----
    const a0=k<=1?1:k===2?Math.max(0,1-2.5*e):0;
    if(a0>.01){gemm(R,16,8,reg,reg,a0,0);
      // the warp: 32 lanes as cubes, 4 rows of 8
      for(let i=0;i<32;i++){const x=.42+(i%8)*.05,z=.05+Math.floor(i/8)*.05,on=k===1&&i===0;R.box([x,0,z],[.034,.034,.034],{fill:on?mix(P.paper,hl,.8):mix(P.paper,reg,.6),a:a0*(k===1&&i?.35:1),shadow:false,lw:.5})}
      lab([.6,0,.24],R.W<520?'1 warp':'1 warp · 32 lanes',{mono:true,fs:12.5,b:1,dy:16,c:reg,a:k===2?0:a0});
      if(k===0){lab([-g,16*s,0],'A · 16 × 16',{mono:true,fs:12.5,b:1,al:'right',dx:-8,dy:-6,c:reg,a:a0});
        lab([.125,16*s,-g],'B · 16 × 8',{mono:true,fs:12.5,b:1,dy:-12,c:reg,a:a0});
        lab([.125,0,.5],'C · 16 × 8',{mono:true,fs:12.5,b:1,dy:15,c:reg,a:a0})}
      if(k===0)lab([.6,0,.24],(16*8*16).toLocaleString('en-US')+' multiply-adds',{mono:true,fs:12,dy:33,c:P.mute,a:a0,wide:1});
      // the product: A and B stream into C
      if(k===0){R.flow([[-g,.25,.25],[.12,.04,.25]],{c:reg,r:.012,n:5,speed:.25,a:e});R.flow([[.125,.25,-g],[.125,.04,.25]],{c:reg,r:.012,n:5,speed:.25,a:e})}
      // lane 0's fragment, lit on all three
      if(k===1){const t=e;LC.forEach(([m,n])=>R.box([(n+.5)*s,.03,(m+.5)*s],[.9*s,.006,.9*s],{fill:hl,a:t,shadow:false,lw:.5}));
        LA.forEach(([m,kk])=>R.box([-g+.006,(kk+.05)*s,(m+.5)*s],[.012,.9*s,.9*s],{fill:hl,a:t,shadow:false,lw:.5}));
        LB.forEach(([kk,n])=>R.box([(n+.5)*s,(kk+.05)*s,-g+.006],[.9*s,.9*s,.012],{fill:hl,a:t,shadow:false,lw:.5}));
        LC.forEach(([m,n])=>R.flowArc([.42,.04,.05],[(n+.5)*s,.04,(m+.5)*s],.06,{c:hl,r:.008,n:4,speed:.2,a:t}));
        lab([.42,.04,.05],'lane 0',{mono:true,fs:12.5,b:1,al:'left',dx:8,dy:-12,c:hl,a:t,wide:1});
        lab([.125,0,.5],'C: '+LC.map(x=>'('+x[0]+','+x[1]+')').join(' '),{mono:true,fs:12.5,b:1,dy:15,c:hl,a:t});
        lab([-g,16*s,0],'A: '+LA.length+' values',{mono:true,fs:12.5,b:1,al:'right',dx:-8,dy:-6,c:hl,a:t});
        lab([.125,16*s,-g],'B: '+LB.length+' values',{mono:true,fs:12.5,b:1,dy:-12,c:hl,a:t})}}
    // labels change late in a step and leave early, so the old and the new never overlap mid-glide
    const lin=k=>Math.max(0,Math.min(1,2.5*e-1.5)),lout=Math.max(0,1-2.5*e);
    // ---- wgmma: a warpgroup, A and B in shared memory, C in registers ----
    // the warpgroup's tile appears only once the camera has pulled back far enough to hold it
    const a1=k===2?Math.max(0,(e-.78)/.22):k===3?1-e:0,l1=k===2?Math.max(0,(e-.85)/.15):k===3?lout:0;
    if(a1>.01){gemm(R,64,256,sm,reg,a1,0);
      R.quad([[0,.03,0],[8*s,.03,0],[8*s,.03,16*s],[0,.03,16*s]],{fill:hl,a:a1,ec:hl});
      // the warpgroup beside the tile: 4 warps of 32 lanes
      for(let w=0;w<4;w++)for(let i=0;i<32;i++)R.box([8.7+w*.2,0,.1+i*.12],[.1,.1,.1],{fill:mix(P.paper,reg,.6),a:a1,shadow:false,lw:.5});
      lab([9,0,3.9],R.W<520?'128 threads':'1 warpgroup',{mono:true,fs:12.5,b:1,dy:16,c:reg,a:l1});lab([9,0,3.9],'128 threads',{mono:true,fs:12,dy:33,c:reg,a:l1,wide:1});
      lab([-g,.25,1],'A · 64 × 16',{mono:true,fs:12.5,b:1,al:'right',dx:-10,dy:-9,c:sm,a:l1});
      lab([-g,.25,1],'shared memory',{mono:true,fs:12,al:'right',dx:-10,dy:9,c:sm,a:l1,wide:1});
      lab([4,.5,-g],R.W<520?'B · smem':'B · 16 × 256 · shared memory',{mono:true,fs:12.5,b:1,dy:-20,c:sm,a:l1});
      lab([3,0,2],R.W<520?'C · registers':'C · 64 × 256 · registers',{mono:true,fs:12.5,b:1,dy:26,c:reg,a:l1});
      lab([3,0,2],(64*256*16).toLocaleString('en-US')+' multiply-adds',{mono:true,fs:12,dy:43,c:P.mute,a:l1,wide:1});
      if(k===2){R.flowArc([-g,.3,1],[3,.05,1],.4,{c:sm,r:.06,n:8,a:e});R.flowArc([4,.3,-g],[4,.05,1.2],.4,{c:sm,r:.06,n:8,a:e})}}
    // ---- tcgen05: one thread, accumulator in TMEM (128 lanes x 512 columns, drawn as two layers of 256 columns under the tile) ----
    const a2=k===3?e:k===4?1:0,l2=k===3?lin():k===4?1:0;
    if(a2>.01){const two=k===4,tt=two?Math.max(0,(e-.65)/.35):0,lt=two?Math.max(0,(e-.85)/.15):0,Y=.32;   // the second SM appears once the camera has pulled back to hold it
      [0,1].forEach(h=>{const z0=h*4.7,ah=h?tt:a2;if(ah<=.01)return;
        R.glass([0,0,z0],[8,0,0],[0,0,4],{c:tm,a:ah*.5,nu:32,nv:8,th:.03});            // TMEM columns 256 to 511
        R.box([4,0,z0+2],[8,Y,4],{fill:tm,a:ah*.12,fa:.25,ea:.4,shadow:false,lw:.6});   // the TMEM block
        gemm(R,128,256,sm,tm,ah,z0,{noB:h===1,y0:Y});                                    // the accumulator: columns 0 to 255
        if(two)lab([8.1,Y,z0+2],'SM '+h,{mono:true,fs:12.5,b:1,al:'left',dx:12,c:P.ink,a:lt})});
      if(!two)R.quad([[0,Y+.04,0],[8*s,Y+.04,0],[8*s,Y+.04,16*s],[0,Y+.04,16*s]],{fill:hl,a:a2,ec:hl});
      // the single issuing thread
      const tz=two?4.35:4.6,tx=-.9;R.box([tx,0,tz],[.3,.3,.3],{fill:mix(P.paper,hl,.75),a:a2,shadow:true,lw:.7});
      lab([tx,0,tz],R.W<520?'1 thread':'1 thread issues it',{mono:true,fs:12.5,b:1,al:'right',dx:-14,c:hl,a:two?lout:l2});
      lab([tx,0,tz],R.W<520?'1 thread':'1 thread issues for both',{mono:true,fs:12.5,b:1,al:'right',dx:-14,c:hl,a:lt});
      R.flowArc([tx,.3,tz],[2,Y+.05,2],.8,{c:hl,r:.06,n:6,a:a2*.9,speed:1.4});if(two)R.flowArc([tx,.3,tz],[2,Y+.05,6.7],.8,{c:hl,r:.06,n:6,a:tt*.9,speed:1.4});
      const l2o=two?lout:l2;
      lab([-g,Y+.25,2],'A · 128 × 16',{mono:true,fs:12.5,b:1,al:'right',dx:-10,dy:-9,c:sm,a:l2o});
      lab([-g,Y+.25,2],'shared memory',{mono:true,fs:12,al:'right',dx:-10,dy:9,c:sm,a:l2o,wide:1});
      lab([4,Y+.5,-g],R.W<520?'B · smem':'B · 16 × 256 · shared memory',{mono:true,fs:12.5,b:1,dy:-20,c:sm,a:l2});
      lab([3.5,0,4],R.W<520?'C · TMEM':'accumulator in TMEM: columns 0 to 255',{mono:true,fs:12.5,b:1,dy:26,c:tm,a:l2o});
      lab([3.5,0,4],'(columns 256 to 511 below it) · '+(128*256*16).toLocaleString('en-US')+' multiply-adds',{mono:true,fs:12,dy:43,c:P.mute,a:l2o,wide:1});
      lab([-g,Y+.25,6.7],R.W<520?'half of A':'each SM: half of A',{mono:true,fs:12.5,b:1,al:'right',dx:-10,dy:-9,c:sm,a:lt});
      lab([-g,Y+.25,6.7],'and of the accumulator',{mono:true,fs:12,al:'right',dx:-10,dy:9,c:tm,a:lt,wide:1});
      if(k===3){R.flowArc([-g,Y+.3,2],[3,Y+.06,2],.4,{c:sm,r:.06,n:8,a:e});R.flowArc([4,Y+.3,-g],[4,Y+.06,1.5],.4,{c:sm,r:.06,n:8,a:e})}
      if(two){R.flowArc([-g,Y+.3,2],[3,Y+.06,2],.4,{c:sm,r:.06,n:7,a:tt});R.flowArc([-g,Y+.3,6.7],[3,Y+.06,6.7],.4,{c:sm,r:.06,n:7,a:tt})}}
  }
  const VW=[{cam:[.62,.5],bounds:[[-.2,0,-.1],[.86,.55,.62]]},{cam:[.38,.78],bounds:[[-.2,0,-.1],[.86,.55,.62]]},
    {cam:[.14,.8],bounds:[[-3.4,0,-.6],[10,.6,4.6]]},{cam:[.14,.8],bounds:[[-3.6,0,-.6],[8.6,.9,5.6]]},{cam:[.12,.9],bounds:[[-3.6,0,-.6],[9.4,.9,9.2]]}];
  const st=S3.stage({id:'stg-mma',list:'sx-mma',fig:'Fig. 2 · one MMA instruction per generation, to scale',cam:VW[3].cam,bounds:VW[3].bounds,aspect:.58,dur:1700,hold:5400,draw,
    margin:w=>w<520?[16,10,16,10]:[28,20,28,20],
    // steps 1 and 2 look closely at the tiny mma.sync tile; each later step pulls back to fit the bigger instruction
    view:k=>VW[k]});
  (window.LTSTG=window.LTSTG||{})['stg-mma']=st;
})();
