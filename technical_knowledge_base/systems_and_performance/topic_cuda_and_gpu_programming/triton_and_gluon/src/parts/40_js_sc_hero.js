// ---- Scene, Fig. 1 (the idea): one Triton matmul program and what the compiler decides for it (renderer v2: glass plates, flows, camera per step).
// C lies on the floor as 9 x 9 tiles of 128 x 128 (an illustrative 1,152 x 1,152 x 1,152 FP16 matmul, labelled so on the page), one program per tile;
// A stands on the left wall (rows along z, K up), B on the back wall (columns along x, K up). Program 40 owns tile (4, 4) and walks K in 36 slices
// of BK = 32. Step 4 is the sm_90a build of the page's matmul (window.TGD: 4 stages, 64 KB of shared memory, 200 registers, wgmma m64n128k16,
// 4 per K step); step 5 the tensor-core instructions per K step on six targets (TGD.exp.mma_per_kstep, compiled here). Explained by #sx-hero. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.TGD)return;const {at,off,mix}=S3,D=window.TGD;
  const NT=9,S=.5,H=NT*S/2,M0=4,N0=4,PID=M0*NT+N0,KS=36,KH=NT*S,DK=KH/KS;          // 9 x 9 tiles; K = 36 slices of 32
  const mm=D.main.find(r=>r.key==='matmul'&&r.target==='sm_90a'),E=D.exp.mma_per_kstep;
  const TG=['sm_80','sm_90a','sm_100a','sm_120','gfx942','gfx950'],INS={sm_80:'mma.sync',sm_90a:'wgmma',sm_100a:'tcgen05.mma',sm_120:'mma.sync',gfx942:'MFMA',gfx950:'MFMA'};
  const ns=mm.num_stages,smemKB=mm.shared/1024,wg=E.sm_90a;
  window.TG_HERO={programs:NT*NT,pid:PID,ksteps:KS,stages:ns,smemKB,regs:mm.regs,per_k:Object.fromEntries(TG.map(t=>[t,E[t].per_cta_per_kstep])),wgmma:wg.instr_shape};
  const cx=n=>-H+(n+.5)*S,cz=m=>-H+(m+.5)*S,XA=-H-.5,ZB=-H-.5;
  function draw(R,k,e){const P=R.P,HL=P.acc,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));R.grid(-4.2,4.2,-4,4.6,.5);
    // what the step is about at full strength, the rest receding
    const fC=k===0?1:k===3?.14:k===4?.12:.3,fW=k===2?at(k,e,2):k===3?.18*(1-e):0,rise=k>=1?1:0;
    // 1. C on the floor: one box per program; at step 1 they appear in launch order
    R.glass([-H,.002,-H],[2*H,0,0],[0,0,2*H],{c:P.c3,a:Math.max(.2,fC)*.8,nu:NT,nv:NT,th:.02,dz:60});
    const shown=k===0?Math.ceil(NT*NT*Math.max(.02,e)):NT*NT;
    for(let p=0;p<shown;p++){const m=Math.floor(p/NT),n=p%NT,me=p===PID&&k>=1;if(me)continue;
      R.box([cx(n),0,cz(m)],[S*.82,.07,S*.82],{fill:mix(P.paper,P.c3,.35),a:k===0?1:fC,shadow:false,lw:.6})}
    if(k===0){lab([0,0,H],'C · 9 × 9 tiles of 128 × 128',{dy:26,b:1});lab([0,0,H],'one program per tile: '+shown+' of 81',{dy:44,fs:12,c:P.mute})}
    // 2. program 40: its tile, the FP32 accumulator (grows during the K loop)
    if(k>=1){const g=k===1?e:1,ah=k===1?.12:k===2?.12+.5*e:.62,a=k===4?.35:1;
      if(k!==3)R.box([cx(N0),0,cz(M0)],[S*.9,ah*g+.02,S*.9],{fill:mix(P.paper,HL,.7),a});
      else for(let s=0;s<8;s++){const w=s%4,c=[P.c1,P.c2,P.c4,P.c6][w];R.box([cx(N0),0,cz(M0)-S*.45+S*.9*(s+.5)/8],[S*.9,ah,S*.9/8],{fill:mix(P.paper,c,.75),a,shadow:s===0,lw:.5})}
      if(k===1){lab([cx(N0),.14,cz(M0)],'program 40 · tile (4, 4)',{dy:-18,b:1,c:HL,a:e});lab([cx(N0),0,cz(M0)],'128 × 128 outputs, FP32 in registers',{dy:22,fs:12,c:P.mute,a:e})}}
    // 3. A on the left wall, B on the back wall; the K loop walks up both
    if(fW>0){R.glass([XA,0,-H],[0,KH,0],[0,0,2*H],{c:P.c1,a:fW*.75,nu:NT,nv:NT});R.glass([-H,0,ZB],[2*H,0,0],[0,KH,0],{c:P.c6,a:fW*.75,nu:NT,nv:NT});
      R.box([XA,0,cz(M0)],[.06,KH,S*.9],{fill:mix(P.paper,P.c1,.35),a:fW*.6,shadow:false});R.box([cx(N0),0,ZB],[S*.9,KH,.06],{fill:mix(P.paper,P.c6,.35),a:fW*.6,shadow:false})}
    if(k===2){const kk=Math.min(KS-1,Math.floor(e*KS)),y=kk*DK,acc=[cx(N0),.4+.3*e,cz(M0)];
      R.box([XA+.04,y,cz(M0)],[.12,DK,S*.95],{fill:mix(P.paper,P.c1,.85),a:fW,shadow:false});R.box([cx(N0),y,ZB+.04],[S*.95,DK,.12],{fill:mix(P.paper,P.c6,.85),a:fW,shadow:false});
      R.flowArc([XA+.1,y+DK/2,cz(M0)],acc,.5,{c:P.c1,a:fW,r:.07,n:9,speed:1.6});R.flowArc([cx(N0),y+DK/2,ZB+.1],acc,.5,{c:P.c6,a:fW,r:.07,n:9,speed:1.6});
      lab([XA,0,H],'A · row 4, 128 × 32 a step',{dy:18,c:P.c1,a:fW,wide:1});lab([H,KH,ZB],'B · column 4, 32 × 128 a step',{al:'left',dx:6,dy:-10,c:P.c6,a:fW,wide:1});
      lab(acc,'acc += tl.dot(a, b)',{dx:12,al:'left',b:1,c:HL,a:fW});lab([cx(N0),0,cz(M0)],'K step '+(kk+1)+' of '+KS,{dy:24,c:P.mute,fs:12,a:fW})}
    // 4. inside the program on sm_90a: num_stages shared buffers for A and for B, the accumulator in 16-row strips by warp, wgmma
    if(k===3){const a=e,y0=.95,bw=S*.9;
      for(let i=0;i<ns;i++){R.glass([cx(N0)-bw/2-.62,y0+i*.15,cz(M0)-bw/2],[.5,0,0],[0,0,bw],{c:P.c1,a,nu:1,nv:4,th:.025});
        R.glass([cx(N0)+bw/2+.12,y0+i*.15,cz(M0)-bw/2],[.5,0,0],[0,0,bw],{c:P.c6,a,nu:4,nv:1,th:.025})}
      R.flowArc([cx(N0)-bw/2-.37,y0,cz(M0)],[cx(N0)-.08,.66,cz(M0)],.25,{c:P.c1,a,r:.06,n:7,speed:1.2});R.flowArc([cx(N0)+bw/2+.37,y0,cz(M0)],[cx(N0)+.08,.66,cz(M0)],.25,{c:P.c6,a,r:.06,n:7,speed:1.2});
      lab([cx(N0),y0+ns*.15+.05,cz(M0)],'shared · '+ns+' stages × (A + B) = '+smemKB+' KB',{dy:-14,b:1,a});
      lab([cx(N0),0,cz(M0)+S*.45],'warps 0 to 3 · 16-row strips (#mma)',{dy:20,fs:12,c:P.mute,a});
      lab([cx(N0),0,cz(M0)+S*.45],'wgmma m'+wg.instr_shape.join('n').replace(/n(\d+)$/,'k$1')+' · '+wg.per_issuer+' per K step',{dy:38,fs:12,c:HL,a})}
    // 5. the same tl.dot on six targets: instructions per K step for the whole program (log height)
    if(k===4){TG.forEach((t,i)=>{const v=E[t].per_cta_per_kstep,h=.25+.3*Math.log2(v),x=(i-2.5)*1.25,z=H+1.3;
        R.box([x,0,z],[.62,h*e+.02,.62],{fill:mix(P.paper,t.startsWith('gfx')?P.c5:HL,.6),a:1});
        lab([x,h*e,z],String(v),{dy:-12,b:1,a:e});lab([x,0,z],t,{dy:20,fs:12,a:e});lab([x,0,z],INS[t],{dy:36,fs:12,c:P.mute,a:Math.max(0,(e-.85)/.15),wide:1})});
}
  }
  const full={cam:[.55,.5],bounds:[[-3.4,0,-3.4],[3.2,4.6,3.6]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one program, one tile',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1700,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[20,16,20,16],
    view:k=>k===0?{cam:[.45,.85],bounds:[[-2.5,0,-2.5],[2.5,.2,3.2]]}:k===1?{cam:[.5,.72],bounds:[[-1.5,0,-1.4],[1.5,.4,1.7]]}:k===2?{cam:[.55,.5],bounds:[[-3.2,0,-3.2],[2.6,4.6,2.6]]}:
      k===3?{cam:[.45,.5],bounds:[[-1.9,0,-1.3],[1.9,1.7,1.5]]}:{cam:[.06,.32],bounds:[[-3.6,0,2.2],[3.6,2.8,3.4]]}});
  (window.TGSTG=window.TGSTG||{})['stg-hero']=st;
})();
