// ---- Scene, Fig. 1 (2026-11-12, renderer v2): one training step of the larger variant as its time and its memory, with each lever on the part it shrinks.
// Time: window.FST.hunt_phases_mps, stage s0 (as first written) and the last s6 run (the hunt's kept fixes), each phase followed by a synchronize.
// Memory: window.FST.mem, the peak of the plain run and of the run with every block checkpointed (float32, CPU memory profiler), by category.
// Time is a row of slabs whose lengths are the phase times; memory is a tower whose layers are the bytes alive at the peak. Steps are #sx-hero. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.FST)return;const {mix,lerp}=S3,D=window.FST;
  const PH=D.hunt_phases_mps.runs,T0=PH.find(r=>r.stage==='s0').median_ms,T1=PH.filter(r=>r.stage==='s6').pop().median_ms;
  const run=h=>D.mem.runs.find(r=>r.config==='big'&&r.how===h),R0=run('plain'),R1=run('ckpt');
  const PHS=[['data','c5'],['forward','c1'],['backward','c4'],['optimizer','c3']];
  const CATS=[['PARAMETER','parameters','c1'],['OPTIMIZER_STATE','AdamW state','c5'],['GRADIENT','gradients','c3'],['ACTIVATION','activations','c2'],['AUTOGRAD_DETAIL','backward temporaries','c4']];
  const sumT=T=>PHS.reduce((a,p)=>a+T[p[0]],0),XU=6/sumT(T0),X0=-4.7,ZR=1.05,ZG=.15;   // the time row: 6 world units for the first step
  const MB=b=>b/1e6,MU=2.45/MB(R0.peak),TX=3.35,TZ=-.35,TW=1.15;                            // the memory tower: 2.45 units for 867 MB
  const f1=v=>v.toFixed(1);
  function row(R,T,z,a,lab,e,grow){const P=R.P;let x=X0;const out=[];
    PHS.forEach(([n,c],i)=>{const l=T[n]*XU,g=grow?Math.min(1,Math.max(0,e*4-i)):1;
      if(g>0)R.box([x+l*g/2,0,z],[Math.max(.02,l*g-.04),.3,.72],{fill:mix(R.P.paper,P[c],.8),a});
      out.push([x,x+l]);
      if(lab&&g>=1&&l>.12){const short=R.W<520;R.label([x+l/2,.3,z-.36],(short?'':n+' ')+f1(T[n])+' ms',{mono:true,fs:12,b:1,c:P[c],dy:i%3===0?-34:-14,a})}
      x+=l});return out}
  function tower(R,pb,a,labs,e,grow){const P=R.P;let y=0;const out={};
    CATS.forEach(([k,n,c],i)=>{const h=MB(pb[k])*MU,g=grow?Math.min(1,Math.max(0,e*5-i)):1;
      if(h*g>.002)R.box([TX,y,TZ],[TW,h*g,TW],{fill:mix(R.P.paper,P[c],.8),a,shadow:i===0});
      out[k]=[y,y+h];if(labs&&g>=1)R.label([TX+TW/2,y+h/2,TZ+TW/2],n+' '+f1(MB(pb[k]))+' MB',{al:'left',dx:8,mono:true,fs:12,c:P[c],grp:'mem',a});
      y+=h*g});return out}
  function draw(R,k,e){const P=R.P;R.grid(-5.2,5.2,-1.6,2,.5);
    const after=k===4,T=after?Object.fromEntries(PHS.map(([n])=>[n,lerp(T0[n],T1[n],e)])):T0;
    const ra=k===1||k===3?.3:1;
    // time: as first written in front; after the levers, the first version stays as a faint row behind
    if(after)row(R,T0,ZR-.95,.25,false,1,false);
    const xs=row(R,T,ZR,ra,k!==2,e,k===0);   // at step 3 the lever tags take the space above the row
    const tot=sumT(T),tl=after?f1(tot)+' ms phased · '+f1(D.hunt_time_mps.runs.filter(r=>r.stage==='s6').pop().median_ms)+' ms timed':f1(sumT(T0))+' ms phased · '+f1(D.hunt_time_mps.runs.find(r=>r.stage==='s0').median_ms)+' ms timed';
    R.label([X0+tot*XU/2,0,ZR+.4],(R.W<520?'':'one step on MPS: ')+tl,{fs:12.5,b:1,mono:true,dy:14,a:ra});
    if(after)R.label([X0+sumT(T0)*XU,0,ZR-.95],'as first written',{al:'left',dx:16,fs:12,mono:true,c:P.mute,wide:1});
    // the step moves left to right: a stream along the row
    if(k===0||after){const p=[];for(let i=0;i<=20;i++)p.push([X0+(tot*XU)*i/20,.34,ZR]);R.flow(p,{c:P.acc,r:.05,speed:1.6,n:14,a:k===0?Math.min(1,e*1.5):1})}
    // memory at the peak: a tower of what is alive at once (a faint outline of it from the first step, so the frame is whole)
    if(k===0)tower(R,R0.peak_by,.12,false,1,false);
    if(k>=1){const pb=after?Object.fromEntries(CATS.map(([c])=>[c,lerp(R0.peak_by[c],R1.peak_by[c],e)])):R0.peak_by;
      const lay=tower(R,pb,k===2?.3:1,k!==2,e,k===1);
      const top=CATS.reduce((s,[c])=>s+MB(pb[c]),0)*MU;
      R.label([TX,top,TZ],(after?f1(MB(R1.peak)):f1(MB(R0.peak)))+' MB at the peak',{fs:12.5,b:1,mono:true,dy:-14,a:k===2?0:1});
      if(after){const h0=MB(R0.peak)*MU;R.glass([TX-TW/2-.15,h0,TZ-TW/2-.15],[TW+.3,0,0],[0,0,TW+.3],{c:P.mute,a:.5,nu:4,nv:4});R.label([TX-TW/2-.15,h0,TZ+TW/2],'was '+f1(MB(R0.peak))+' MB',{al:'right',dx:-6,fs:12,mono:true,c:P.mute})}
      // levers on the memory: each tag streams into the layer it shrinks
      if(k===3){const L=R.W<520?[['ACTIVATION','checkpointing (9)'],['OPTIMIZER_STATE','fewer bits, FSDP2']]:[['ACTIVATION','checkpointing, SAC (9) · micro-batches (7)'],['ACTIVATION','big vocab: fused loss (10) · attention (11)',1],['OPTIMIZER_STATE','torchao, 8-bit AdamW (12) · FSDP2'],['PARAMETER','fewer bits (12) · FSDP2']];
        L.forEach(([c,t,hi],i)=>{const [y0,y1]=lay[c],y=hi?y1-.12:(y0+y1)/2,src=[TX-TW/2-1.25,y+.12,TZ-TW/2];
          R.label(src,t,{al:'right',dx:-4,fs:12,b:1,c:P.acc,a:Math.min(1,e*1.5)});R.flowArc(src,[TX-TW/2,y,TZ],.15,{c:P.acc,r:.05,n:6,speed:1.2,a:Math.min(1,e*1.5)})})}}
    // levers on the time: each tag streams down into the phase it shrinks
    if(k===2){const n=R.W<520;const L=[[0,0,n?'workers (4)':'DataLoader workers (4)'],[1,2,n?'SDPA, compile, autocast':'SDPA (11) · torch.compile (2) · autocast (6)'],[3,3,n?'fused (5)':'fused AdamW (5)']];
      L.forEach(([i,j,t],m)=>{const x=(xs[i][0]+xs[j][1])/2,y=.95+(m===1?.3:0);R.label([x,y,ZR],t,{fs:12,b:1,c:P.acc,dy:-8,a:Math.min(1,e*1.5)});
        R.flow([[x,y,ZR],[x,.32,ZR]],{c:P.acc,r:.05,n:5,speed:.9,a:Math.min(1,e*1.5)})})}
  }
  const full={cam:[-.32,.5],bounds:[[-4.9,0,-1.2],[5.6,2.7,1.6]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one step: its time and its memory',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,10,12,10]:[20,16,14,16],
    // the camera moves in on the part a step is about: the time row, the memory tower, or both at the end
    view:k=>k===0||k===2?{cam:[-.25,.62],bounds:[[-4.9,0,.4],[1.6,1.4,1.6]]}:k===1||k===3?{cam:[-.45,.42],bounds:[[-.4,0,-1.2],[6.2,2.7,.6]]}:full});
})();
