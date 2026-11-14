// ---- Scene, Fig. 1 (the core idea): one training step of the root's twins, following the state. Left, PyTorch: six layer plates inside
// an nn.Module, a .grad slot beside each, Adam's moments inside the optimiser object, a global generator; backward and opt.step() write
// into them in place. Right, JAX: params, opt_state and the batch flow into jax.jit(train_step); gradients appear only inside it; new
// params and opt_state flow out and back to the next call. Structure from the root's model (six plates: embeddings, 4 blocks,
// LayerNorm + head; 826,368 parameters in 69 tensors, PJ.root.n_params and PJ.convert.n_tensors); no other numbers are drawn.
// Steps are explained by #sx-hero on the left. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.PJS||!window.PJ)return;const {at,off,mix}=S3,{lab,plate,slot,tint,LAYERS,ly,legs}=PJS;
  const PX=-2.7,IX=1.0,BX=3.15,OX=5.3,PW=1.4,PD=.9,TOP=ly(5);
  function stack(R,x,z,c,a,w,d,names){LAYERS.forEach((n,i)=>{plate(R,[x,ly(i),z],w||PW,d||PD,{c,a});
    if(names)lab(R,[x-(w||PW)/2,ly(i),z],n,{al:'right',dx:-8,fs:12,c:R.P.mute,a:Math.max(.4,a),grp:names})})}
  function draw(R,k,e){const P=R.P,ph=R.W<520,W2=k===0||k===5?1:0;R.grid(-4.6,6.6,-2.2,2.6,.5);
    // ---------- PyTorch: everything lives inside objects
    const pA=k<=2?1:k===5?.85:.35;                       // the left side recedes while the steps are about JAX
    const mod=k===0?.5:pA;
    R.box([PX+.2,.12,0],[2.3,TOP+.25,1.3],{fill:tint(P,P.c1,.06),fa:.07,a:mod,shadow:false,lw:.8});
    lab(R,[PX-.95,.12,.65],'model: nn.Module',{wide:W2,mono:true,fs:12.5,b:1,al:'left',dy:14,a:mod});
    const flash=k===2?Math.sin(Math.PI*e):0;
    LAYERS.forEach((n,i)=>{plate(R,[PX,ly(i),0],PW,PD,{c:flash>0?mix(P.c1,P.c3,flash*.7):P.c1,a:pA});
      lab(R,[PX-PW/2,ly(i),0],n,{al:'right',dx:-8,fs:12,c:P.mute,a:Math.max(.35,pA),grp:'pt'});
      // the .grad slot beside each weight: empty until backward writes into it, and it stays filled (stored state)
      const gx=PX+PW/2+.32,ga=k===1?Math.min(1,e*1.4):k>=2?1:0;
      slot(R,[gx,ly(i)+.02,0],.3,.55,pA*.7);
      if(ga>0)R.box([gx,ly(i)-.02,0],[.3,.08,.55],{fill:tint(P,P.c2,.7),a:ga*pA,shadow:false})});
    lab(R,[PX+PW/2+.32,TOP+.12,0],'.grad',{wide:W2,mono:true,fs:12.5,b:1,dy:-10,c:P.c2,a:pA*(k>=1?1:.6)});
    // the batch, the loss
    const bA=k===1||k===2?1:.3*pA;
    R.box([PX-1.4,0,.1],[.6,.22,.45],{fill:tint(P,P.ink,.08),a:bA});lab(R,[PX-1.4,.22,.1],'x, y',{wide:W2,mono:true,fs:12,dy:-10,a:bA});
    R.ball([PX,TOP+.7,0],.11,{c:P.c5,a:k===1||k===2?1:.35*pA});
    lab(R,[PX+.15,TOP+.7,0],k===2?'loss.item()':'loss',{mono:true,fs:12.5,al:'left',dx:10,c:P.c5,a:k===1||k===2?1:.4*pA});
    if(k===1){R.flow(legs([[PX-1.4,.22,.1],[PX-.45,ly(0),.2],[PX-.45,TOP,.2],[PX,TOP+.7,0]]),{c:P.mute,r:.06,speed:1.3});
      R.flow(legs([[PX,TOP+.7,0],[PX+PW/2+.32,TOP+.1,0],[PX+PW/2+.32,ly(0),0]]),{c:P.c2,r:.07,speed:1.2,a:e})}
    // the optimiser object holds Adam's moments; opt.step() reads .grad and writes the weights
    const oA=k===2?1:k===0?.35:pA*.8,OPZ=1.45,OPX=PX+1.45;
    R.box([OPX,0,OPZ],[1.25,.5,.7],{fill:tint(P,P.c3,.1),fa:.25,a:oA});
    R.box([OPX-.28,0,OPZ],[.4,.3,.4],{fill:tint(P,P.c3,k===2?.45+.4*flash:.45),a:oA,shadow:false});R.box([OPX+.28,0,OPZ],[.4,.3,.4],{fill:tint(P,P.c3,k===2?.45+.4*flash:.45),a:oA,shadow:false});
    lab(R,[OPX-.28,.3,OPZ],'m',{mono:true,fs:12,dy:-9,a:oA});lab(R,[OPX+.28,.3,OPZ],'v',{mono:true,fs:12,dy:-9,a:oA});
    lab(R,[OPX,0,OPZ+.35],'opt (AdamW), sched',{wide:W2,mono:true,fs:12.5,b:1,dy:14,c:P.c3,a:oA});
    if(k===2){R.flow(legs([[PX+PW/2+.32,ly(3),0],[OPX+.1,.5,OPZ-.2]]),{c:P.c2,r:.065,speed:1.1});
      R.flow(legs([[OPX-.1,.5,OPZ-.2],[PX+.1,ly(2),.3],[PX+.1,TOP,.3]]),{c:P.c3,r:.07,speed:1.2})}
    // the global generator: one hidden stream every draw advances
    const gA=k===2?1:k===0?.35:pA*.7;
    R.ball([PX-1.3,.18,1.35],.17,{c:P.c4,a:gA});lab(R,[PX-1.3,.18,1.35],'global generator',{wide:W2,mono:true,fs:12,dy:22,c:P.c4,a:gA});
    // ---------- JAX: state goes in as arguments and comes out as return values
    const jA=k===0?1:k>=3?1:.35;
    const inA=k===5?1-.7*e:jA;                             // donated: the old buffers fade once the new ones exist
    stack(R,IX,0,P.c1,inA,1.15,.75,null);
    lab(R,[IX,TOP+.1,0],'params',{mono:true,fs:12.5,b:1,dy:-12,c:P.c1,a:Math.max(.45,inA)});
    plate(R,[IX-.35,.28,1.5],1.0,.55,{c:P.c3,a:inA*(k===0?.5:1)});plate(R,[IX-.35,.48,1.5],1.0,.55,{c:P.c3,a:inA*(k===0?.5:1)});
    lab(R,[IX-.35,.1,1.78],'opt_state',{wide:W2,mono:true,fs:12.5,b:1,dy:14,c:P.c3,a:Math.max(.4,inA*(k===0?.5:1))});
    R.box([IX+.8,0,1.5],[.6,.22,.45],{fill:tint(P,P.ink,.08),a:k===0?.4:inA});lab(R,[IX+.8,.22,1.5],'x, y',{wide:W2,mono:true,fs:12,dy:-10,a:k===0?.4:inA});
    R.ball([IX+.8,.13,2.1],.11,{c:P.c4,a:.45*jA});lab(R,[IX+.8,.13,2.1],'key (dropout only)',{mono:true,fs:12,al:'left',dx:12,c:P.c4,a:.6*jA,wide:1});
    // the compiled function: a box with nothing stored in it
    const fA=k>=3?1:k===0?.35:.25;
    R.box([BX,.05,.15],[1.7,TOP+.35,2.0],{fill:tint(P,P.acc,.06),fa:.12,a:fA,shadow:false,lw:1.1});
    lab(R,[BX,TOP+.4,1.15],'jax.jit(train_step)',{wide:W2,mono:true,fs:13,b:1,dy:-10,c:P.acc,a:fA});
    if(k===3){[[IX+.6,ly(2),0],[IX+.15,.5,1.5],[IX+1.1,.15,1.5]].forEach((p,i)=>R.flowArc(p,[BX-.6,.9+.25*i,.15],.35,{c:[P.c1,P.c3,P.mute][i],r:.07,speed:1.2,a:Math.min(1,e*1.6)}))}
    // gradients: a value inside the step, shaped like params, gone when it returns
    const gr=k===4?Math.min(1,e*1.5):k===5?off(k,e,5):0;
    if(gr>0){LAYERS.forEach((n,i)=>plate(R,[BX-.2,ly(i)+.02,.15],.8,.5,{c:P.c2,a:gr}));
      lab(R,[BX-.2,TOP+.05,.15],'grads',{mono:true,fs:12.5,b:1,dy:-12,c:P.c2,a:gr});
      if(k===4){R.flow(legs([[IX+.6,ly(4),0],[BX-.6,ly(4),.15]]),{c:P.c1,r:.06,speed:1});
        R.flow(legs([[BX+.2,ly(1),.15],[BX+.45,.55,.7]]),{c:P.c2,r:.065,speed:1})}}
    if(k===4){R.box([BX+.45,.2,.75],[.55,.3,.4],{fill:tint(P,P.c3,.4),a:e,shadow:false});lab(R,[BX+.45,.5,.75],'tx.update',{mono:true,fs:12,al:'left',dx:14,c:P.c3,a:e})}
    // outputs: new params and a new opt_state, and the caller hands them to the next call
    const nA=k===5?Math.min(1,e*1.5):k===0?0:0;
    if(nA>0){stack(R,OX,0,P.c1,nA,1.15,.75,null);lab(R,[OX,TOP+.1,0],'new params',{mono:true,fs:12.5,b:1,dy:-12,c:P.c1,a:nA});
      plate(R,[OX,.28,1.5],1.0,.55,{c:P.c3,a:nA});plate(R,[OX,.48,1.5],1.0,.55,{c:P.c3,a:nA});
      lab(R,[OX,.1,1.78],'new opt_state',{wide:W2,mono:true,fs:12.5,b:1,dy:14,c:P.c3,a:nA});
      R.flow(legs([[BX+.85,ly(3),0],[OX-.6,ly(3),0]]),{c:P.c1,r:.07,speed:1.1,a:nA});R.flow(legs([[BX+.85,.45,1.2],[OX-.5,.45,1.5]]),{c:P.c3,r:.07,speed:1.1,a:nA});
      R.flowArc([OX,TOP+.2,-.2],[IX,TOP+.2,-.2],1.0,{c:P.c1,r:.06,speed:1.4,a:nA*.8});
      lab(R,[(IX+OX)/2,TOP+1.5,0],ph?'JAX':'JAX: returned, passed to the next call',{fs:13.5,b:1,a:nA});
      lab(R,[IX,0,0],'old buffers donated',{fs:12,c:P.mute,dy:-4,a:nA*.9,wide:1})}
    if(k===0||k===2||k===5)lab(R,[PX,TOP+1.5,0],ph?'PyTorch':k===0?'PyTorch: state inside objects':'PyTorch: changed in place',{fs:13.5,b:1,a:k===2?e:1});if(k===0)lab(R,[(IX+OX)/2,TOP+1.5,0],ph?'JAX':'JAX: state passed in and out',{fs:13.5,b:1})
  }
  const full={cam:[.18,.62],bounds:[[-4.3,0,-1.0],[6.0,TOP+1.5,2.2]]};
  const left={cam:[.32,.5],bounds:[[-4.3,0,-1.0],[-.6,TOP+1.5,1.9]]};
  const right={cam:[.12,.5],bounds:[[-.2,0,-1.0],[4.3,TOP+.6,2.3]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one training step, two homes for its state',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[20,14,16,90],
    // steps 2 and 3 move in on PyTorch, 4 and 5 on JAX; the first and last steps show both
    // on a phone the first and last steps turn the two homes into depth so they draw larger
    view:k=>k===1||k===2?left:k===3||k===4?right:innerWidth<520?{cam:[.75,1.0],bounds:full.bounds}:full});
  (window.PJSTG=window.PJSTG||{})['stg-hero']=st;
})();
