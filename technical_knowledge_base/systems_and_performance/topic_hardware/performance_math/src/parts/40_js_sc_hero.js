// ---- Scene, Fig. 1 (the hero): the running example as three counts over one H100's three numbers (renderer v2: a few large objects per step,
// the camera moving to what each step is about, flowing dots wherever data or work moves). Every number comes from window.PMD (out/recompute.json):
// step_tf_8k and anim_time_s.flash (one 8,192-token training step at 40% MFU), states_fsdp8_GB, act_layers_flash_GB, act_post_GB and
// anim_peaks_GB.flash (what the step holds), l8_P, kv_seq_4k_GB, tpot_b1_ms and tps_b1 (one decoded token at batch 1), c8_15t, gpuh_h100,
// usd_h100 and gpus_30d_h100 (the whole run). Chip numbers: H100 SXM, 989.5 TFLOP/s dense BF16, 3.35 TB/s, 80 GB (vendor).
// Heights in the memory tray are drawn to scale (80 GB = 2 units); the work block's size, positions and the tile field's layout are illustrative.
(function(){
  if(!document.getElementById('stg-hero')||!window.PMD)return;const {at,off,mix,lerp}=S3;
  const D=window.PMD,G=1e9,WB=2*D.l8_P/G,KV=D.kv_seq_4k_GB,ST=D.states_fsdp8_GB,AL=D.act_layers_flash_GB,LG=D.act_post_GB;
  const n=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const NG=Math.round(D.gpus_30d_h100);
  window.PM_HERO={step_tf:D.step_tf_8k,step_s:D.anim_time_s.flash,peak:D.anim_peaks_GB.flash,state:ST,act:AL+LG,read:WB+KV,ms:D.tpot_b1_ms,tps:D.tps_b1,
    flops:D.c8_15t,gpuh:D.gpuh_h100,usd:D.usd_h100,gpus:NG}; // checked by check/check_stages.mjs
  const HU=2/80,DIE=[-.75,.06,0],TRAY=[1.25,.06,0],TW=1.3,TD=1.7,WORK=[-3.9,0,0],FIELD=[-.6,0,-5.4];
  function chip(R,a){const P=R.P;
    R.box([0,0,0],[4.1,.06,2.5],{fill:mix(P.paper,P.ink,.07),a,dz:100});
    R.box(DIE,[1.5,.16,1.5],{fill:mix(P.paper,P.ink,.18),a});
    // the HBM stacks along the die, under the capacity tray
    [-.55,0,.55].forEach(z=>R.box([TRAY[0]-.38,.06,z],[.42,.1,.42],{fill:mix(P.paper,P.c3,.4),a:a*.9,shadow:false}));}
  function tray(R,a,hl){const P=R.P,x0=TRAY[0]-TW/2,x1=TRAY[0]+TW/2,z0=-TD/2,z1=TD/2,y1=TRAY[1]+80*HU;
    R.quad([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],{fill:mix(P.card,P.bad,.08),ec:P.bad,dash:[5,4],a:a*(hl?.95:.5)});
    [[x0,z0],[x1,z0],[x1,z1],[x0,z1]].forEach(([x,z])=>R.line([[x,TRAY[1],z],[x,y1,z]],{c:P.bad,w:1,dash:[4,4],a:a*(hl?.8:.4)}));}
  function stack(R,parts,a){let y=TRAY[1];parts.forEach(([gb,c])=>{const h=gb*HU;if(h>.002)R.box([TRAY[0],y,0],[TW*.92,h,TD*.92],{fill:c,a,shadow:false,lw:.6});y+=h});return y}
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-5,4,-8.6,2.4,.5);
    const ca=k===3?.35:1;chip(R,ca);
    if(k<3)lab([DIE[0],.22,DIE[2]+.75],'H100 · 989.5 TFLOP/s',{dy:20,fs:12,b:1});
    lab([TRAY[0]+TW/2,TRAY[1]+80*HU,-TD/2],'80 GB',{al:'left',dx:8,fs:12,c:P.bad,a:k===1?1:k===3?0:.55,grp:'cap'});
    // 1. a training step: a block of work streams into the die
    const wa=k===0?1:k===1?1-e:0;
    if(wa>.01){const s=1.25;R.box(WORK,[s,s,s],{fill:mix(P.paper,P.c1,.5),a:wa});
      R.flowArc([WORK[0]+.5,s*.8,0],[DIE[0]-.3,.24,0],.9,{c:P.c1,a:wa*(k===0?e:1),r:.08,n:12,speed:1.4});
      lab([WORK[0],s,0],n(D.step_tf_8k,0)+' TFLOP · one step',{dy:-14,b:1,c:P.c1,a:wa});
      lab([DIE[0],.22,DIE[2]-.75],'÷ 989.5 TFLOP/s × 40% MFU = '+n(D.anim_time_s.flash,2)+' s',{dy:-22,b:1,a:wa*(k===0?e:1)})}
    // 2. what the step holds, against the 80 GB capacity
    tray(R,ca,k===1);
    const ma=k===1?e:k===2?Math.max(0,1-e*3):0;
    if(ma>.01){const top=stack(R,[[ST,mix(P.paper,P.ink,.25)],[AL*Math.min(1,k===1?e*1.3:1),mix(P.paper,P.c6,.55)],[k===1&&e<.8?0:LG,mix(P.paper,P.c2,.6)]],ma);
      lab([TRAY[0]+TW/2,TRAY[1]+ST*HU/2,TD/2],'model state '+n(ST,1)+' GB',{al:'left',dx:10,fs:12,a:ma,grp:'cap'});
      lab([TRAY[0]+TW/2,TRAY[1]+(ST+AL/2)*HU,TD/2],'activations '+n(AL+LG,1)+' GB',{al:'left',dx:10,fs:12,c:P.c6,b:1,a:ma,grp:'cap'});
      lab([TRAY[0],top,0],'about '+n(D.anim_peaks_GB.flash,0)+' GB held · fits, barely',{dy:-16,b:1,a:ma})}
    // 3. a decoded token: every weight and the conversation's cache stream from HBM to the die
    const da=k===2?e:k===3?Math.max(0,1-e*3):0;
    if(da>.01){stack(R,[[WB,mix(P.paper,P.c3,.5)],[KV,mix(P.paper,P.c4,.6)]],da);
      [-.45,0,.45].forEach(z=>R.flowArc([TRAY[0]-.2,WB*HU+.08,z],[DIE[0]+.4,.24,z*.7],.35,{c:P.c3,a:da,r:.065,n:6,speed:1.3}));
      lab([TRAY[0],TRAY[1]+WB*HU,0],n(WB,2)+' GB weights + '+n(KV,2)+' GB cache',{dy:-16,b:1,c:P.c3,a:da});
      lab([DIE[0],.22,DIE[2]-.75],'÷ 3.35 TB/s = '+n(D.tpot_b1_ms,2)+' ms · '+n(D.tps_b1)+' tokens/s',{dy:-22,b:1,a:da})}
    // 4. the whole run: the field of H100s that finishes it in 30 days
    if(k===3){const cols=28,sp=.22,x0=FIELD[0]-(cols-1)*sp/2,z0=FIELD[2]-(Math.ceil(NG/cols)-1)*sp/2,shown=Math.round(NG*Math.min(1,e*1.25));
      for(let i=0;i<shown;i++){const x=x0+(i%cols)*sp,z=z0+Math.floor(i/cols)*sp;R.quad([[x-.08,.01,z-.08],[x+.08,.01,z-.08],[x+.08,.01,z+.08],[x-.08,.01,z+.08]],{fill:mix(P.paper,P.c1,.55),a:.95})}
      R.box(WORK,[1.0,.5,1.0],{fill:mix(P.paper,P.c5,.5),a:e});lab([WORK[0],.5,0],'15T tokens',{dy:-14,b:1,c:P.c5,a:e});
      R.flowArc([WORK[0],.55,-.3],[FIELD[0]-1.4,.05,FIELD[2]+1.6],1.2,{c:P.c5,a:e,r:.09,n:14,speed:1.6});
      lab([FIELD[0],0,FIELD[2]-3.2],n(NG)+' H100s × 30 days (90% goodput)',{dy:-12,b:1,c:P.c1,a:e});
      lab([-.6,0,1.3],'7.2e23 FLOPs ÷ (989.5 TFLOP/s × 40%) = '+n(D.gpuh_h100/1e3)+'K H100-hours · $'+n(D.usd_h100/1e6,2)+'M',{dy:24,b:1,a:e})}
  }
  const views=[{cam:[.32,.5],bounds:[[-4.6,0,-1.4],[2.2,1.4,1.4]]},{cam:[.42,.42],bounds:[[-1.6,0,-1.3],[3.4,2.2,1.3]]},{cam:[.42,.52],bounds:[[-1.8,0,-1.4],[2.2,.8,1.4]]},
    {cam:[.38,.78],bounds:[[-4.6,0,-8.4],[2.2,1,2]]}];
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · three counts over one H100',cam:views[0].cam,bounds:views[0].bounds,aspect:.62,dur:1600,hold:5200,draw,
    view:k=>views[k]||views[0],margin:w=>w<520?[16,10,16,10]:[26,24,26,24]});
  (window.PMSTG=window.PMSTG||{})['stg-hero']=st;
})();
