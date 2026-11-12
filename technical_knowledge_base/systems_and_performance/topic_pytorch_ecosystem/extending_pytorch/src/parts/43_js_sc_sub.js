// ---- Scene, Fig. 3 (2026-11-12, renderer v2): the Int8Weight tensor subclass of section 5.3, one weight through one training step.
// Shapes and byte counts are derived from block 0's fc.weight (1024 x 256): float32 1,048,576 B, qdata 262,144 B, scale 1,024 float32 = 4,096 B.
// The calls that reach __torch_dispatch__ are the recorded ones (window.EXT.int8: eager_forward_ops t and addmm, eager_backward_ops t and mm, 16 each),
// and the graph-input counts are recorded (dynamo_graph_inputs, aot_fw_inputs). Height is bytes per element, so volume is memory; the scale
// column is drawn thicker than to scale (the page says so). Steps: #sx-sub. ----
(function(){
  if(!document.getElementById('stg-sub')||!window.S3||!window.EXT)return;const {at,off,lerp,mix}=S3,Q=window.EXT.int8;
  const F=1.5,H4=1.0,H1=.25,ZD=2.05;   // footprint of a 1024 x 256 weight, height of 4 bytes and of 1 byte per element, height of the dispatch plate
  const XF=-3.1,XW=-.8,XT=1.45,XO=3.45,ZX=1.75,ZO=.9;
  const nOps=o=>Object.values(o||{}).reduce((s,v)=>s+v,0),calls=o=>Object.entries(o||{}).map(([a,b])=>b+' '+a).join(', ');
  function draw(R,k,e){const P=R.P,narrow=R.W<520,ein=Math.min(1,e*1.4);R.grid(-4.4,4.6,-1.6,2.8,.5);
    // 1. the float32 weight: the subject of step 1, gone once the subclass is
    const fa=k===0?1:k===1?1-.75*e:0;
    R.box([XF,0,0],[F,H4,F],{fill:mix(P.paper,P.c1,.45),a:fa});
    R.label([XF,0,F/2],'float32 weight',{mono:true,fs:12.5,b:k===0,dy:16,a:fa});R.label([XF,0,F/2],'1,048,576 B',{mono:true,fs:12,dy:31,a:fa});
    // 2. the wrapper: a shell with the outer shape and no storage, holding qdata (int8) and scale (one float32 per row)
    const inner=k===0?.14:k===1?Math.max(.14,ein):1,gone=k===6?e:0,qx=XW-gone*.6,sx=XW+gone*1.2;
    R.box([XW,0,0],[F+.12,H4+.06,F+.12],{fill:P.paper,fa:.05,a:k===0?.18:k===6?1-.9*e:inner,ec:P.c4,lw:1.5,shadow:false});
    R.box([qx,0,.05],[F-.05,H1,F-.14],{fill:mix(P.paper,P.c4,.55),a:inner});
    R.box([sx,0,-F/2+.06],[F-.05,H4,.08],{fill:mix(P.paper,P.c5,.6),a:inner});
    const wl=k===6?'Int8Weight · flattened away':'Int8Weight · (1024, 256)';
    if(k>=1)R.label([XW,0,F/2+.06],wl,{mono:true,fs:12.5,b:1,c:P.c4,dy:16,a:k===1?ein:1});
    if(k===1)R.label([XW,0,F/2+.06],'no storage of its own',{mono:true,fs:12,c:P.c4,dy:31,a:ein});
    if(k===2)R.label([XW,0,F/2+.06],'transposed = True · no data moved',{mono:true,fs:12.5,b:1,c:P.c2,dy:31,a:e});
    if(k===1||k===6){const la=k===1?ein:e;
      R.label([qx-F/2,H1,0],'qdata · int8 · 262,144 B',{mono:true,fs:12,al:'right',dx:-8,a:la,grp:'in'});
      R.label([sx-F/2,H4,-F/2],'scale · 1,024 float32 · 4,096 B',{mono:true,fs:12,al:'right',dx:-8,a:la,grp:'in'})}
    // the dispatch plate above the wrapper, where the ATen calls arrive
    const pa=k>=2&&k<=5?1:k===6?.25*(1-e):0;
    if(pa>0){R.glass([XW-1.05,ZD,-.8],[2.1,0,0],[0,0,1.6],{c:P.c4,a:pa*.85,nu:4,nv:3,th:.03});R.label([XW-1.05,ZD,0],'__torch_dispatch__',{mono:true,fs:12.5,b:1,c:P.c4,al:'right',dx:-8,a:pa,wide:1})}
    const op=k===2?'aten.t':k===3||k===4?'aten.addmm':k===5?'aten.mm':null;
    if(op){const y=k===4?ZD+.15:lerp(ZD+.95,ZD+.15,Math.min(1,e*1.5));R.ball([XW,y,0],.12,{c:P.c2,top:1});
      R.label([XW,y,0],op,{mono:true,fs:13,b:1,c:P.c2,al:'left',dx:14});
      R.flow([[XW,ZD+.95,0],[XW,ZD,0],[XW,H4+.1,0]],{c:P.c2,r:.055,speed:1.1,a:.6})}
    // 4. the float32 temporary the conversion makes: as large as the float weight
    const ta=k===3?ein:k===4?1:k===5?.35:0;
    if(ta>0){R.box([XT,0,0],[F,H4,F],{fill:mix(P.paper,P.c2,.4),a:ta});
      R.label([XT,H4,0],narrow?'float32 copy':'qdata.to(float32)',{mono:true,fs:12.5,b:1,c:P.c2,dy:-26,a:ta});if(k===3)R.label([XT,H4,0],'1,048,576 B, during the multiply',{mono:true,fs:12,c:P.c2,dy:-11,a:ta,wide:1});
      if(k===3)R.flowArc([XW+.5,H1+.05,.1],[XT-.5,H4*.6,.1],.55,{c:P.c4,r:.06,n:8,speed:1.3,a:ein})}
    // the activation x (512 x 256, float32, to scale) in front of the multiply
    const xa=k===3?ein:k===4?1:k===5?.7:0;
    if(xa>0){R.box([XT,0,ZX],[F,H4,.75],{fill:mix(P.paper,P.c3,.45),a:xa});R.label([XT,0,ZX+.38],'x · (512, 256)',{mono:true,fs:12,dy:14,a:xa,wide:1})}
    // 5. the plain output; 6. the gradient back to x
    if(k>=4&&k<=5){const oa=k===4?Math.max(0,e*1.5-.3):1;
      R.box([XO,0,ZO],[1.2,H4,1.2],{fill:P.paper,a:oa});R.label([XO,0,ZO+.6],narrow?'output':'output · (512, 1024)',{mono:true,fs:12,b:1,dy:14,a:oa});R.label([XO,0,ZO+.6],'plain tensor',{mono:true,fs:12,dy:29,a:oa,wide:1});
      if(k===4){R.flowArc([XT+.4,H4,0],[XO-.3,H4*.75,ZO],.35,{c:P.c2,r:.06,n:9,speed:1.3,a:ein});R.flowArc([XT+.5,H4*.7,ZX],[XO-.3,H4*.55,ZO],.25,{c:P.c3,r:.055,n:7,speed:1.3,a:ein});
        R.flowArc([sx+.5,H4,-F/2],[XO,H4,ZO-.4],.75,{c:P.c5,r:.05,n:7,speed:1.1,a:ein})}
      if(k===5){R.flowArc([XO-.3,H4*.6,ZO],[XT+.5,H4*.7,ZX],.35,{c:P.bad,r:.065,n:9,speed:1.3});R.label([XT+.75,H4,ZX],'grad x',{mono:true,fs:12.5,b:1,c:P.bad,al:'left',dx:8})}}
    // the recorded calls, on the step that is about them
    if(k===4||k===5)R.label([XW,0,F/2+.06],(k===4?'forward: '+nOps(Q.eager_forward_ops)+' calls ('+calls(Q.eager_forward_ops)+')':'backward: '+nOps(Q.eager_backward_ops)+' calls ('+calls(Q.eager_backward_ops)+') · weight frozen'),{mono:true,fs:12,c:P.mute,dy:31,wide:1});
    // 7. under compile: qdata and scale become two separate graph inputs
    if(k===6){R.label([qx,H1,0],'input',{mono:true,fs:12.5,b:1,c:P.acc,dy:-14,a:e});R.label([sx,H4,-F/2],'input',{mono:true,fs:12.5,b:1,c:P.acc,dy:-12,a:e});
      R.label([XW+.3,1.85,0],Q.dynamo_graph_inputs+' → '+Q.aot_fw_inputs+' graph inputs',{mono:true,fs:13.5,b:1,c:P.acc,a:e})}
  }
  const full={cam:[.16,.5],bounds:[[-1.9,0,-1.1],[4.2,2.9,2.3]]};
  S3.stage({id:'stg-sub',list:'sx-sub',fig:'Fig. 3 · Int8Weight, one weight',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4800,draw,
    margin:w=>w<520?[14,8,14,8]:[16,16,14,150],
    // steps 1 and 2 compare the float weight with the wrapper; 3 and 7 move in on the wrapper; the multiply and backward show the whole bench
    view:k=>k<=1?{cam:[.2,.5],bounds:[[-4.0,0,-1],[.2,1.4,1.6]]}:k===2||k===6?{cam:[.25,.52],bounds:[[-2.0,0,-1],[1.0,2.9,1.4]]}:full});
})();
