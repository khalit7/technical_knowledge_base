// ---- Scene (top of the paper tab): the paper's Figure 2 at its own scale (renderer v2: glass plates for the models, the three training sets
// as stacks of prompt slabs to scale, flowing dots wherever prompts, answers, scores, the KL pull or pretraining text move, the camera moving
// in close per step). Every number is the page's: Table 6's training-set sizes and labeler shares (window.PAPER.rc.sizes,
// sft_labeler_share, rm_labeler_share), the KL and pretraining coefficients and example count of §C.4 (kl_default, gamma_default,
// ptx_examples) and Figure 1's decoded win rates (rc.fig1). The answer blocks of step 2 show K = 4 to 9 schematically. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3)return;const {at,off,lerp,mix}=S3;
  const RC=window.PAPER.rc,SZ=RC.sizes,F1=RC.fig1,PER=2000,SH=.085;   // one slab = 2,000 prompts
  const X=[-4.3,0,4.3],DS=-1.0,DP=.8,ZS=0,ZP=-.35,ZA=1.15,PW=1.3,PH=1.1;   // per column: the stack on the left, the model plate on the right, answers in front of the plate
  const g=v=>Math.round(v).toLocaleString('en-GB');
  const cl=v=>v<0?0:v>1?1:v;
  // a stack of prompt slabs: n total slabs (fractional top), the first lab of them labeler-written
  function stack(R,x,z,n,lab,a,grow,tl,t2){const P=R.P,m=Math.ceil(n);if(a<=.01)return;
    for(let i=0;i<m;i++){const h=SH*Math.min(1,n-i),ai=cl(grow*m-i);if(ai<=0)break;const f=i+.5<lab?mix(P.paper,P.c3,.5):mix(P.paper,P.c1,.38);
      R.box([x+(i%2?.03:-.03),i*SH,z],[1.3,h*.86,.95],{fill:f,a:a*ai,lw:.6,shadow:i===0})}
    if(a>.5)R.label([x,0,z+.5],tl,{fs:12.5,b:1,mono:true,dy:13,a:a*grow});if(t2&&a>.6)R.label([x,0,z+.5],t2,{fs:12,mono:true,c:P.mute,dy:30,a:a*grow,wide:1})}
  function plate(R,x,c,a,name,sub){if(a<=.01)return;R.glass([x-PW/2,.06,ZP],[PW,0,0],[0,PH,0],{c,a,nu:6,nv:5});R.label([x,PH+.06,ZP],name,{fs:12.5,b:a>.6,c,dy:-10,a:Math.max(.35,a),wide:a<.6});
    if(sub)R.label([x,.06,ZP],sub,{fs:12,mono:true,c:R.P.mute,dy:13,a:Math.max(.35,a)*.9,wide:1})}
  // step 2: the SFT model's answers to one prompt, K = 4 to 9 (four drawn, five dashed), in a 3 x 3 block in front of the reward model
  const AP=i=>[X[1]+DP-1.15+i*.3,ZA];
  function answers(R,a,e){const P=R.P;for(let i=0;i<9;i++){const [x,z]=AP(i),h=.42-.025*i;
      if(i<4)R.box([x,0,z],[.22,h,.26],{fill:mix(P.paper,P.c3,.22),a:a*cl(e*4-i*.6),lw:.7});
      else R.line([[x-.11,0,z],[x-.11,h,z],[x+.11,h,z],[x+.11,0,z]],{c:P.mute,w:1,dash:[3,3],a:a*.7*cl(e*3-1)})}
    if(a>.5)R.label([X[1]+DP,0,ZA+.2],'K = 4 to 9 answers, ranked',{fs:12,mono:true,dy:13,a:a*e})}
  function draw(R,k,e){const P=R.P;R.grid(-6.2,7.4,-2.4,2.9,.5);
    const foc=[[1,1,1],[1,.25,.25],[.4,1,.25],[.4,.5,1],[.3,.4,1],[.25,.25,.25]][k],fa=i=>foc[i];
    // the three training sets (Table 6), labeler-written slabs green, customer slabs blue
    const n=[SZ.SFT.train/PER,SZ.RM.train/PER,SZ.PPO.train/PER],lab=[n[0]*RC.sft_labeler_share,n[1]*RC.rm_labeler_share,0];
    const grow=k===0?e:1;
    stack(R,X[0]+DS,ZS,n[0],lab[0],fa(0),grow,g(SZ.SFT.train)+' prompts','each with a written answer');
    stack(R,X[1]+DS,ZS,n[1],lab[1],fa(1),grow,g(SZ.RM.train)+' prompts','4 to 9 answers ranked');
    stack(R,X[2]+DS,ZS,n[2],lab[2],fa(2),grow,g(SZ.PPO.train)+' prompts','no labels at all');
    // the models: GPT-3 becomes the SFT model; the reward model; the policy, a copy of SFT
    const sftC=k>=1?mix(P.c6,P.c3,k===1?e:1):P.c6;
    plate(R,X[0]+DP,sftC,k===0?.3:k===1?1:k===2?.85:k===3||k===4?.75:.25,k>=1&&(k>1||e>.5)?'SFT model':'GPT-3, pretrained',k===1?'16 epochs':k>=3&&k<=4?'the KL reference':null);
    plate(R,X[1]+DP,P.c4,k<2?.12:k===2?at(k,e,2):k<5?.75:.25,'6B reward model',k===2?'one score per answer':null);
    plate(R,X[2]+DP,P.c2,k<3?.12:k===3?e:k===4?1:.25,k===4?'InstructGPT (PPO-ptx)':'policy (PPO)',k===3?'starts as a copy of SFT':null);
    // step 1: demonstrations into GPT-3
    if(k===1)for(let i=0;i<3;i++)R.flowArc([X[0]+DS+.4,.25+i*.15,ZS],[X[0]+DP-.4,.3+i*.25,ZP+.05],.35,{c:P.c3,a:e*.9,r:.06,n:6});
    // step 2: prompts to the SFT model, which answers K times; labelers rank; the ranked answers train the reward model
    if(k===2){answers(R,1,e);R.flowArc([X[1]+DS+.3,1.2,ZS],[X[0]+DP+.3,.9,ZP+.05],.7,{c:P.c1,a:e*.7,r:.05,n:8});
      for(let i=0;i<4;i++){const [x,z]=AP(i);R.flowArc([X[0]+DP+.5,.6,ZP+.05],[x,.4,z],.9,{c:P.c3,a:e*.8,r:.05,n:7});R.flowArc([x,.4,z],[X[1]+DP-.3+i*.2,.5,ZP+.05],.35,{c:P.c4,a:e*.9,r:.055,n:5})}}
    if(k>=3&&k<=4)answers(R,.2,1);
    // step 3: PPO. Prompts in, one answer out, the RM scores it, the SFT model pulls back through the KL penalty
    if(k>=3&&k<=4){const a=k===3?e:1,sx=X[2]+DP,sz=ZA;R.box([sx,0,sz],[.38,.38,.32],{fill:mix(P.paper,P.c2,.35),a});
      R.flowArc([X[2]+DS+.4,1.2,ZS],[X[2]+DP-.4,.7,ZP+.05],.4,{c:P.c1,a:a*.85,r:.055,n:7});
      R.flowArc([X[2]+DP,.3,ZP+.05],[sx,.4,sz],.3,{c:P.c2,a:a*.9,r:.055,n:5});
      R.flowArc([sx-.2,.35,sz],[X[1]+DP+.4,.5,ZP+.05],.9,{c:P.c2,a:a*.85,r:.05,n:9});
      R.flowArc([X[1]+DP+.5,.95,ZP+.05],[X[2]+DP-.5,.95,ZP+.05],.7,{c:P.c4,a:a*.9,r:.06,n:9});
      R.arc([X[0]+DP+.6,1.1,ZP],[X[2]+DP-.6,1.1,ZP],1.0,{c:P.c3,w:1.6,dash:[6,5],a:a*.8});R.flowArc([X[0]+DP+.6,1.1,ZP],[X[2]+DP-.6,1.1,ZP],1.0,{c:P.c3,a:a*.6,r:.045,n:12,speed:.8});
      R.label([X[1]+DP-1,2.1,ZP],'KL penalty to SFT, β = '+RC.kl_default,{fs:12.5,mono:true,b:1,c:P.c3,a,wide:k===4});
      R.label([sx,.38,sz],'one sampled answer',{fs:12,mono:true,dy:-12,c:P.mute,a,wide:1})}
    // step 4: PPO-ptx, pretraining text mixed into every update (the stack is schematic, not to scale)
    if(k>=4){const a=k===4?1:.25,xp=X[2]+DP+1.9,zp=ZP-.2;for(let i=0;i<16;i++)R.box([xp+(i%2?.03:-.03),i*SH,zp],[.9,SH*.86,.8],{fill:mix(P.paper,P.c6,.35),a:a*(k===4?cl(e*16-i):1),lw:.5,shadow:i===0});
      if(k===4){R.flowArc([xp-.3,1.2,zp],[X[2]+DP+.4,.8,ZP+.05],.4,{c:P.c6,a:e*.9,r:.06,n:9});
        R.label([xp,16*SH,zp],'pretraining text',{fs:12.5,b:1,mono:true,c:P.c6,dy:-12,a:e});
        R.label([xp,0,zp+.45],'8 per episode, γ = '+RC.gamma_default,{fs:12,mono:true,c:P.mute,dy:14,a:e,wide:1})}}
    // step 5: the result, Figure 1 at 1.3B against 175B GPT-3, both measured against 175B SFT
    if(k===5){const bx=X[1]+.2,bz=2.1,Y0=.25,HS=2.2,w=2.6,a=e;R.box([bx,Y0-.045,bz],[w,.045,.6],{a,shadow:false});[-1,1].forEach(s=>R.box([bx+s*w/2,0,bz],[.04,Y0-.05,.04],{a:a*.9}));
      [[F1['PPO-ptx']['1.3B'],P.c2,'InstructGPT 1.3B',-.6],[F1['GPT']['175B'],P.c6,'GPT-3 175B',.6]].forEach(([v,c,nm,dx])=>{const h=v*HS*e;R.box([bx+dx,Y0,bz],[.75,Math.max(.01,h),.4],{fill:c,a,shadow:false});
        R.label([bx+dx,Y0+h,bz],(100*v).toFixed(1)+'%',{mono:true,fs:13,b:1,c,dy:-11,a});R.label([bx+dx,Y0,bz+.2],nm,{fs:12.5,b:1,dy:15,a})});
      R.line([[bx-w/2,Y0+.5*HS,bz],[bx+w/2,Y0+.5*HS,bz]],{c:P.mute,w:1.3,dash:[5,4],a});R.label([bx+w/2,Y0+.5*HS,bz],'175B SFT = 50%',{mono:true,fs:12,al:'left',dx:8,c:P.mute,a})}
  }
  const full={cam:[.12,.72],bounds:[[-5.8,0,-1.2],[7.4,1.5,1.8]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the three steps at the paper\'s scale',cam:full.cam,bounds:full.bounds,aspect:.45,dur:1400,hold:5200,draw,
    // on a phone the wide scene would be a thin band: look down more steeply and frame each step's column
    view:k=>{const ph=innerWidth<600,v=k===1?{cam:[.25,.5],bounds:[[-6,0,-1],[-2.4,1.3,1.2]]}:k===2?{cam:[.15,.55],bounds:[[-5,0,-1.2],[2.2,1.5,1.9]]}:k===3?{cam:[0,.55],bounds:[[-3.6,0,-1.2],[6,1.9,1.9]]}:k===4?{cam:[-.15,.55],bounds:[[-1,0,-1.6],[7.4,1.9,1.9]]}:k===5?{cam:[.1,.45],bounds:[[-2.2,0,.9],[3,1.6,2.8]]}:full;
      return ph?{cam:[v.cam[0]+.35,Math.max(.95,v.cam[1]+.35)],bounds:v.bounds}:v}});
})();
