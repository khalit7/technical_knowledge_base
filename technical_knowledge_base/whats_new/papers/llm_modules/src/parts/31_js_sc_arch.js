// ---- Scene: Fig. 1, the CombinedModel as the released model.py builds it (renderer v2: towers of blocks, glass plates for the projections, flowing dots where data moves) ----
// Sizes from the Hugging Face configs (Qwen2-1.5B: 28 blocks of width 1536; GPT-Neo-125M: 12 blocks of width 768; a slab's side is proportional to the width);
// parameter counts from recompute.py (window.PAPER.rc, inputs/recompute.json). Seven steps in the order a token passes the parts; the step list is #sx-arch.
(function(){
  if(!document.getElementById('stg-arch')||!window.PAPER)return;const {at,mix}=S3;const RC=PAPER.rc,BR=RC.bridge;
  const M=v=>(v/1e6).toLocaleString('en-GB',{minimumFractionDigits:1,maximumFractionDigits:1})+'M',B=v=>(v/1e9).toFixed(2)+'B';
  const QX=-4.3,NX=3.5,ZH=-.7,ZG=.7,ZP=-1.8,PITCH=.095,TH=.06,QS=1.8,NS=QS*768/1536,XL=[-.55,.95],XJ=2.35;
  const QTOP=27*PITCH+TH,NTOP=11*PITCH+TH;
  // which parts a step is about (full strength); the rest recede once they exist
  const APPEAR={tok:0,qwen:0,pre:1,mlp:2,proj:2,xa:3,join:4,neo:4,head:5},FOCUS=[['tok','qwen'],['qwen','pre'],['pre','mlp','proj'],['xa'],['join','neo','proj'],['neo','head'],null];
  function A(k,e,id){const s=APPEAR[id];if(k<s)return 0;const f=FOCUS[k];const base=!f||f.includes(id)?1:.2;return k===s?e*base:base}
  // a part's labels show only while a step is about it (and in the last, whole view)
  const LFOCUS=[['tok','qwen'],['qwen','pre'],['pre','mlp','proj'],['xa'],['join','neo'],['neo','head'],['qwen','xa','neo','head']];
  function LA(k,e,id){return LFOCUS[k].includes(id)?A(k,e,id):0}
  function draw(R,k,e){const P=R.P;R.grid(-5.6,4.8,-2.6,2.6,.5);
    const frozen=mix(P.paper,P.mute,.28),rnd=mix(P.paper,P.c3,.35);
    // 1. the frozen large model: 28 slabs, grey
    const aq=A(k,e,'qwen'),at0=A(k,e,'tok');
    for(let l=0;l<28;l++)R.box([QX,l*PITCH,0],[QS,TH,QS],{fill:frozen,a:aq,shadow:l===0,lw:.6});
    R.label([QX,QTOP+.05,0],'Qwen2-1.5B · frozen · 28 × 1536',{fs:12.5,b:1,dy:-10,a:LA(k,e,'qwen'),c:P.ink});
    R.label([QX-QS/2,1.2,QS/2],M(RC.qwen_params)+' · no gradients',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:k<=1?LA(k,e,'qwen'):0,grp:'side'});
    for(let i=0;i<5;i++)R.box([QX-.6+.3*i,0,2.05],[.2,.2,.2],{fill:P.paper,a:at0});
    R.label([QX,0,2.3],'query tokens (Qwen2 tokenizer)',{fs:12,dy:14,a:LA(k,e,'tok'),c:P.mute,wide:1});
    if(k===0)for(let i=0;i<5;i++)R.flow([[QX-.6+.3*i,.2,2.05],[QX-.6+.3*i,.2,QS/2-.1],[QX-.6+.3*i,QTOP-.05,QS/2-.1]],{c:P.mute,a:e,r:.05,n:7,speed:1.4});
    // 2. the last hidden state through pre_proj (a 1536 x 1536 glass plate on the h lane)
    const ap=A(k,e,'pre'),PX=-2.75;
    if(ap>0){R.glass([PX,.35,ZH-.6],[0,0,1.2],[0,1.2,0],{c:P.k,a:ap,nu:6,nv:6});R.label([PX,1.6,ZH],'pre_proj · 1536 × 1536',{mono:true,fs:12,dy:-8,c:P.k,a:LA(k,e,'pre'),wide:1})}
    if(k===1)R.flowArc([QX+.3,QTOP,0],[PX,1.0,ZH],.5,{c:P.k,a:e,r:.07,n:12,speed:1.3});
    // 3. g (an MLP of the same state, the query side) and proj (kept for later)
    const am=A(k,e,'mlp'),apj=A(k,e,'proj'),MX=-1.65;
    if(am>0){R.box([MX,0,ZG],[.55,.7,.55],{fill:mix(P.paper,P.q,.35),a:am});R.label([MX,.7,ZG],'MLP → g · 1536 → 1152 → 768',{mono:true,fs:12,dy:-9,c:P.q,a:LA(k,e,'mlp'),wide:1})}
    if(apj>0){R.glass([MX-.4,.3,ZP],[.8,0,0],[0,.8,0],{c:P.c5,a:apj,nu:4,nv:6});R.label([MX,1.1,ZP],'proj · 1536 → 768',{mono:true,fs:12,dy:-8,c:P.c5,a:LA(k,e,'proj'),wide:1})}
    if(k===2){R.flowArc([PX,.7,ZH],[MX,.45,ZG],.35,{c:P.q,a:e,r:.06,n:9});R.flowArc([PX,.7,ZH],[MX,.6,ZP],.3,{c:P.c5,a:e,r:.06,n:7})}
    // 4. two Enhanced Cross-Attention layers: queries from g (orange), keys and values from the pre_proj states (teal, purple); then adapter and gate
    const ax=A(k,e,'xa');
    if(ax>0)XL.forEach((x,l)=>{const a=ax*(l===0||k!==3?1:.55);
      R.glass([x-.05,.3,ZG-.35],[0,0,.7],[0,.7,0],{c:P.q,a,nu:4,nv:4});
      R.glass([x-.05,.3,ZH-.55],[0,0,.45],[0,.6,0],{c:P.k,a,nu:3,nv:4});R.glass([x+.2,.3,ZH-.2],[0,0,.45],[0,.6,0],{c:P.v,a,nu:3,nv:4});
      R.glow([x+.45,.65,ZG],.13,{c:P.q,a});
      R.box([x+.75,0,ZG],[.2,.55,.42],{fill:P.paper,a});R.ball([x+1.0,.55,ZG],.09,{c:P.c1,a});
      if(l===0){R.label([x,1.0,ZG],'Wq',{serif:true,fs:13,b:1,dy:-6,c:P.q,a:k===3?a:0,wide:1});R.label([x-.05,.9,ZH-.4],'Wk',{serif:true,fs:13,b:1,dy:-6,c:P.k,a:k===3?a:0,wide:1});R.label([x+.2,.9,ZH],'Wv',{serif:true,fs:13,b:1,dy:-6,c:P.v,a:k===3?a:0,wide:1});
        R.label([x+.75,.55,ZG+.2],'adapter 768 → 256 → 768',{mono:true,fs:12,dx:6,dy:16,al:'left',c:P.mute,a:k===3?a:0,wide:1});
        R.label([x+1.0,.65,ZG],'gate σ',{mono:true,fs:12,dy:-10,c:P.c1,a:k===3?a:0,wide:1})}
      if(k===3){const ee=l===0?e:Math.max(0,e*1.6-.6);
        R.flowArc([x-.05,.65,ZH-.3],[x+.45,.65,ZG],.25,{c:P.k,a:ee,r:.05,n:6,speed:1.2});R.flowArc([x+.2,.65,ZH],[x+.45,.65,ZG],.2,{c:P.v,a:ee,r:.05,n:6,speed:1.2});
        R.flow([[x-.6,.65,ZG],[x+.45,.65,ZG],[x+1.0,.6,ZG],[x+1.45,.6,ZG]],{c:P.q,a:ee,r:.06,n:8})}});
    if(ax>0)R.label([XL[0]+.7,0,ZG+.5],'2 × Enhanced Cross-Attention · '+M(BR.per_enhanced_layer)+' each',{mono:true,fs:12,dy:18,c:P.ink,a:LA(k,e,'xa'),wide:1});
    if(k===3)R.flow([[PX,.95,ZH],[XL[1]+.3,.95,ZH]],{c:P.k,a:e*.6,r:.045,n:10});
    // 5. g + proj enters the decoder as its input embeddings; the decoder is GPT-Neo's architecture with random weights
    const aj=A(k,e,'join'),an=A(k,e,'neo');
    if(aj>0){R.glow([XJ,.6,ZG],.15,{c:P.c5,a:aj});R.label([XJ,.6,ZG],'g + proj',{mono:true,fs:12,dy:-14,c:P.c5,a:LA(k,e,'join'),wide:1})}
    for(let l=0;l<12;l++)R.box([NX,l*PITCH,0],[NS,TH,NS],{fill:rnd,a:an,shadow:l===0,lw:.6});
    R.label([NX-NS/2,NTOP,0],'GPT-Neo-sized decoder · random weights · 12 × 768',{al:'right',dx:-6,fs:12.5,b:1,c:P.ink,a:LA(k,e,'neo'),grp:'side'});
    if(k===4){R.flow([[MX-.5+2.6,.6,ZP],[XJ,.6,ZP],[XJ,.6,ZG]],{c:P.c5,a:e,r:.06,n:9});R.flow([[XL[1]+1.45,.6,ZG],[XJ,.6,ZG]],{c:P.q,a:e,r:.06,n:4});
      R.flow([[XJ,.6,ZG],[NX-NS/2-.1,.1,ZG-.3],[NX-NS/2-.1,NTOP,0]],{c:P.c5,a:e,r:.06,n:10})}
    // 6. the new output layer: 768 to Qwen2's 151,646 tokens, a long glass plate above the decoder (not to scale: it would be 197 times longer than wide)
    const ah=A(k,e,'head'),HY=NTOP+.45;
    if(ah>0){R.glass([NX-NS/2,HY,-2.1],[NS,0,0],[0,0,4.2],{c:P.c1,a:ah,nu:4,nv:16});R.label([NX,HY,2.1],'new output layer · 768 → 151,646 · '+M(RC.new_lm_head),{mono:true,fs:12,dy:16,c:P.c1,a:LA(k,e,'head'),grp:'side'})}
    if(k===5){R.flow([[NX,NTOP,0],[NX,HY,0]],{c:P.c1,a:e,r:.07,n:4,speed:.8});for(let i=-3;i<=3;i++)R.flow([[NX,HY+.05,0],[NX,HY+.05,i*.6]],{c:P.c1,a:e*.8,r:.045,n:3})}
    // 7. the whole thing runs for every token
    if(k===6){R.label([-.2,0,2.3],B(RC.inference_params)+' parameters run per token · '+M(RC.trained_params)+' train',{fs:14,b:1,dy:22,c:P.ink,a:e,wide:1});
      R.flow([[QX,.2,2.05],[QX,QTOP,0]],{c:P.mute,a:e*.7,r:.05,n:8});R.flowArc([QX+.3,QTOP,0],[PX,1.0,ZH],.5,{c:P.k,a:e*.7,r:.05,n:8});
      R.flow([[PX,.65,ZG],[XJ,.6,ZG],[NX-NS/2-.1,.1,ZG-.3],[NX,NTOP,0],[NX,HY,0]],{c:P.q,a:e*.7,r:.05,n:16})}
  }
  const full={cam:[.42,.62],bounds:[[-5.4,0,-2.2],[4.4,2.8,2.4]]};
  const VIEWS=[{cam:[.5,.5],bounds:[[-5.5,0,-1.2],[-3.1,2.8,2.4]]},{cam:[.48,.55],bounds:[[-5.4,0,-1.4],[-2.1,2.8,1.2]]},{cam:[.45,.6],bounds:[[-3.3,0,-2.3],[-1.0,1.7,1.3]]},
    {cam:[.4,.62],bounds:[[-1.0,0,-1.4],[2.4,1.2,1.3]]},{cam:[.42,.6],bounds:[[1.0,0,-2.0],[4.3,1.6,1.4]]},{cam:[.5,.55],bounds:[[2.4,0,-2.3],[4.6,1.9,2.3]]},full];
  window.ARCH={rc:RC,steps:7};
  S3.stage({id:'stg-arch',list:'sx-arch',fig:'Fig. 1 · the CombinedModel as model.py builds it',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,16],view:k=>VIEWS[k]});
})();
