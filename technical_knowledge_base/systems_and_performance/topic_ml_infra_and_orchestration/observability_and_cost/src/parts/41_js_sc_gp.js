// ---- Scene, Fig. 2 (section 5): where a run's allocated seconds went, as slabs along the clock (renderer v2) ----
// Steps 1 to 4: the two recorded kind runs (window.OC.gp, from Kueue's Admitted and Finished conditions and rank 0's log; checkpoint
// times in ckpt_s), one second = one length unit times SC. Step 5: the Capacity planner's default run, split by the planner's own model
// (window.OCP, the same formulas as src/scripts/recompute.py): checkpoint stalls, work redone after failures, restarts, kept progress.
(function(){
  if(!document.getElementById('stg-gp')||!window.OC||!window.OC.gp||!window.OCP)return;const {at,off,lerp,mix}=S3;
  const G=window.OC.gp,H=G.find(g=>g.run==='oc-base'),U=G.find(g=>g.run==='oc-hang');
  // the planner's default run (as in section 10 and the Capacity planner tab)
  const O=window.OCP,m=O.MODELS.l405,pr=window.OC.prices.find(x=>x.provider==='AWS'&&x.gpu==='H100'&&x.kind.indexOf('reserved')===0);
  const kk={params:m[1],tokens_t:15.6,gpu:'h100',mfu:.4,price:pr.usd,rate_k:+O.LLAMA_RATE.toFixed(3),stall_s:60,restart_min:10,idle:0};
  const n=O.gpusFor(90,kk),r0=O.run(kk,n,60),tau=Math.max(1,Math.round(r0.yd_min)),run=O.run(kk,n,tau);
  const ck=kk.stall_s/60/tau,rw=(tau/2/60)/run.mtbf_h,rs=kk.restart_min/60/run.mtbf_h;
  window.OC_GP={gpus:n,tau,mtbf_h:run.mtbf_h,goodput:run.goodput,ck,rw,rs};
  const pct=v=>(v*100).toFixed(1)+'%';
  [['oc-gp-use',run.goodput],['oc-gp-ck',ck],['oc-gp-rw',rw],['oc-gp-rs',rs]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=pct(v)});
  const SC=.105,X0=-5.6,ZH=.9,ZU=-.9,ZS=-3.3,TH=.45,D=1,STO=[2.6,0,ZS];
  const xs=s=>X0+s*SC;
  function slab(R,z,s0,s1,fill,a,lift){if(a<=.01||s1<=s0)return;R.box([xs((s0+s1)/2),lift||0,z],[(s1-s0)*SC,TH,D],{fill,a,lw:.8})}
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));
    R.grid(-6.6,6.6,-4.2,2.2,.5);
    const C={start:mix(P.paper,P.mute,.45),kept:P.good,lost:P.bad,hang:P.c5,after:mix(P.paper,P.mute,.2),stall:P.c6,redo:P.bad,rest:P.c4};
    // checkpoint storage
    const sa=k===4?lerp(1,.9,e):1;
    for(let i=0;i<2;i++)R.box([STO[0],i*.36,STO[2]],[2.4,.32,1],{fill:mix(P.paper,P.c1,.3),a:sa,shadow:i===0});
    lab([STO[0],.72,ZS],'checkpoint storage',{dy:-12,b:1,a:sa});
    const scaleOut=k===4?1-e:k>4?0:1;
    // the healthy run
    const hA=(k===2?lerp(1,.3,e):k===3?lerp(.3,1,e):1)*scaleOut,split=k===0?0:k===1?e:1,liftK=k===3?.55*e:0;
    if(hA>.01){const a=H.alloc_s,s1=H.startup_s,s2=s1+H.saved_s;
      if(split<1)slab(R,ZH,0,a,P.paper,hA*(1-split));
      if(split>0){slab(R,ZH,0,s1,C.start,hA*split*(k===3?lerp(1,.25,e):1));slab(R,ZH,s1,s2,C.kept,hA*split,liftK);slab(R,ZH,s2,a,C.after,hA*split*(k===3?lerp(1,.25,e):1))}
      lab([xs(0),TH/2,ZH],'healthy',{al:'right',dx:-10,b:1,a:Math.max(.35,hA),grp:'row'});
      if(k===0)lab([xs(a/2),TH,ZH],'allocated '+Math.round(a)+' s: the bill',{dy:-20,b:1,a:e});
      if(k===1){lab([xs(0),TH,ZH-D/2],'start-up '+s1.toFixed(1)+' s',{al:'left',dy:-26,c:P.mute,b:1,a:e});lab([xs((s1+s2)/2),TH,ZH],'kept '+H.saved_s.toFixed(1)+' s',{dy:-20,b:1,c:P.good,a:e});
        if(R.W<520)lab([xs(a),0,ZH+D/2],'after '+H.after_s.toFixed(1)+' s',{al:'right',dy:14,c:P.mute,b:1,a:e});else lab([xs(a),TH/2,ZH],'after the last step '+H.after_s.toFixed(1)+' s',{al:'left',dx:10,c:P.mute,b:1,a:e})}
      if(k===3){if(R.W<520)lab([xs((s1+s2)/2),0,ZH+D/2],'84% kept',{dy:16,b:1,c:P.good,fs:14,a:e});else lab([xs((s1+s2)/2),TH+liftK,ZH],'84% kept',{dy:-18,b:1,c:P.good,fs:14,a:e})}
      // checkpoint saves stream to storage while this run is the subject
      if(k===1)(H.ckpt_s||[]).forEach(([step,t])=>R.flowArc([xs(t),TH,ZH],[STO[0]+(t/a-.5)*1.6,.7,ZS+.3],1.3,{c:P.c1,a:e,r:.07,n:7,speed:1.6}))}
    // the hung run
    const uA=(k<2?0:k===2?e:1)*scaleOut;
    if(uA>.01){const s1=U.startup_s,s2=s1+U.saved_s,s3=s2+U.wasted_s,a=U.alloc_s,dim=k===3?lerp(1,.25,e):1;
      slab(R,ZU,0,s1,C.start,uA*dim);slab(R,ZU,s1,s2,C.kept,uA,liftK);slab(R,ZU,s2,s3,C.lost,uA*dim);slab(R,ZU,s3,a,C.hang,uA*dim);
      lab([xs(0),TH/2,ZU],'hung',{al:'right',dx:-10,b:1,a:Math.max(.35,uA),grp:'row'});
      if(k===2){lab([xs(s1),TH,ZU-D/2],'kept '+U.saved_s.toFixed(1)+' s',{al:'left',dy:-34,b:1,c:P.good,a:e});lab([xs(s2),TH,ZU-D/2],'lost '+U.wasted_s.toFixed(1)+' s',{al:'left',dy:-16,b:1,c:P.bad,a:e});
        if(R.W<520)lab([xs((s3+a)/2),0,ZU+D/2],'the hang: '+U.after_s.toFixed(1)+' s, billed',{dy:16,b:1,c:P.c5,a:e});else lab([xs((s3+a)/2),TH,ZU],'the hang: '+U.after_s.toFixed(1)+' s, billed',{dy:-20,b:1,c:P.c5,a:e}); // a phone puts it under the bar, clear of the lost seconds
        (U.ckpt_s||[]).forEach(([step,t])=>R.flowArc([xs(t),TH,ZU],[STO[0]-.3,.7,ZS+.3],1,{c:P.c1,a:e,r:.07,n:7,speed:1.6}))}
      if(k===3)lab([xs(s1),TH+liftK,ZU],'12% kept',{al:'left',dy:-18,b:1,c:P.good,fs:14,a:e})}
    // the planner's run: one paid GPU-hour, split by the planner's model
    if(k===4){const parts=[['kept progress',run.goodput,C.kept],['checkpoint stalls',ck,C.stall],['redone after failures',rw,C.redo],['restarts',rs,C.rest]];
      let x=-6;parts.forEach(([nm,v,c],j)=>{const w=12*v;R.box([x+w/2,0,0],[w,TH,D],{fill:c,a:e,lw:.8});
        if(!j)lab([x+w/2,TH,0],'kept progress '+pct(v),{dy:-20,b:1,fs:14,c,a:e});else if(R.W<520)lab([6,0,D/2],nm+' '+pct(v),{al:'right',dy:4+j*16,b:1,c,a:e});else lab([6,TH/2,0],nm+' '+pct(v),{al:'left',dx:12,dy:(j-2)*17,b:1,c,a:e});x+=w});
      // checkpoint saves along the kept slab (one every 21 minutes; the spacing is schematic)
      for(let j=1;j<=5;j++){const x2=-6+j*2*run.goodput;R.flowArc([x2,TH,0],[STO[0]+(j-3)*.4,.7,ZS+.3],1.4,{c:P.c1,a:e*.7,r:.06,n:5,speed:1.3})}}
  }
  const full={cam:[.16,.86],bounds:[[-6.2,0,-3.9],[6.2,1.2,1.5]]};
  const st=S3.stage({id:'stg-gp',list:'sx-gp',fig:'Fig. 2 · where the allocated seconds went',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:5200,draw,
    view:k=>k===3?{cam:[.12,.7],bounds:[[-6.2,0,-1.6],[6.2,1.2,1.5]]}:full,
    margin:w=>w<520?[16,10,16,10]:[24,170,20,70]});
  (window.OCSTG=window.OCSTG||{})['stg-gp']=st;
})();
