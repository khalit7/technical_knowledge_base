// ---- Scene: RLHF against DPO on the toy's preference data (renderer v2: the models as glass plates at the back, the camera moving in close per step,
// flowing dots wherever pairs, samples, scores or gradients move, signed bars on a white plinth). Before and after on the same data: switch the mode
// and the reward model's plate is an empty frame. Data: the page's toy, computed in the browser (13_js_read.js and 22_js_dpo.js): the 5,229 pairs,
// the RLHF reward model (RMFIT, centred by RMC), the sweep runs "PPO target KL 1" and "DPO beta = 1" (TOYRES), and pair 3 of the four example
// pairs through 600 steps of DPO at beta = 1 (ckRun). Nothing here is the paper's data. ----
(function(){
  if(!document.getElementById('stg-pipe'))return;const {lerp,mix,at}=S3;
  let MODE='rlhf';
  const ZB=-1.8,PW=1.4,PH=1.0,PX={pol:-2.7,val:-.9,ref:.9,rm:2.7};
  const DX=-2.5,DZ=1.15,SX=0,SZ=.8,BX=2.5,BZ=1.2,Y0=.8,HB=.32,PAIR=2; // data stack, samples, the plinth for pair 3; bar height per unit of reward
  const cl=v=>v<0?0:v>1?1:v,sg=v=>(v>=0?'+':'−')+Math.abs(v).toFixed(2);
  const fin=s=>s.trace[s.trace.length-1];
  function plate(R,key,c,a,name){const x=PX[key];R.glass([x-PW/2,.06,ZB],[PW,0,0],[0,PH,0],{c,a,nu:6,nv:4});R.label([x,PH+.06,ZB],name,{fs:12,b:a>.6,c,dy:-9,a:Math.max(.4,a),grp:'plates'})}
  function frame(R,key,a,name){const x=PX[key],y0=.06,y1=PH+.06,x0=x-PW/2,x1=x+PW/2,P=R.P;R.line([[x0,y0,ZB],[x1,y0,ZB],[x1,y1,ZB],[x0,y1,ZB],[x0,y0,ZB]],{c:P.mute,w:1.4,dash:[5,4],a});
    R.label([x,y1,ZB],name,{fs:12,c:P.mute,dy:-9,a,grp:'plates'})}
  function stack(R,a,g,lab){const P=R.P,n=6;for(let i=0;i<n;i++){const ai=cl(g*n-i);if(ai<=0)break;R.box([DX+(i%2?.05:-.05),i*.085,DZ],[1.2,.07,.8],{fill:mix(P.paper,P.c5,.18),a:a*ai,lw:.7,shadow:i===0})}
    R.label([DX,n*.085,DZ],lab,{fs:12,mono:true,dy:-10,a:a*g,c:P.ink,grp:'front'})}
  function samples(R,a,g,tint){const P=R.P;for(let i=0;i<8;i++){const ai=cl(g*8-i);if(ai<=0)break;const x=SX-.84+(i%4)*.56,z=SZ+(i<4?-.28:.28);
      R.box([x,0,z],[.36,.28,.36],{fill:tint?mix(P.paper,P.c5,.45*tint):P.paper,a:a*ai,lw:.7})}
    R.label([SX,.28,SZ-.28],'64 answers per step',{fs:12,mono:true,dy:-12,a:a*g,c:P.mute,grp:'front'})}
  function plinth(R,a,vals,lab,col){if(a<=.01)return;const P=R.P,w=1.5;R.box([BX,Y0-.045,BZ],[w,.045,.5],{a,shadow:false});[-1,1].forEach(s=>R.box([BX+s*w/2,0,BZ],[.04,Y0-.05,.04],{a:a*.9}));
    vals.forEach((v,i)=>{const x=BX+(i?.38:-.38),h=Math.max(.012,Math.abs(v)*HB),c=i?P.c2:P.c1;R.box([x,v>=0?Y0:Y0-.045-h,BZ],[.5,h,.32],{fill:c,a,shadow:false,lw:.7});
      R.label([x,v>=0?Y0+h:Y0-.05-h,BZ],(i?'rejected ':'chosen ')+sg(v),{mono:true,fs:12,b:1,c,dy:v>=0?-10:14,a,grp:'bars'})});
    R.label([BX,0,BZ+.3],lab,{mono:true,fs:12,c:col,dy:16,a,b:1,wide:1})}
  // the four plates in each mode
  function plates(R,k,act,lab){const P=R.P,show=s=>s===undefined?.12:s;
    plate(R,'ref',P.c4,act.ref?1:.3,'reference · frozen');
    if(MODE==='rlhf'){plate(R,'rm',P.c5,k<2?.12:act.rm?1:.3,k<2?'reward model · not yet':'reward model · fitted');plate(R,'pol',P.c3,k<3?.12:act.pol?1:.3,k<3?'policy · not yet':'policy · trained');
      if(k>=3)frame(R,'val',act.val?.95:.45,'value net · toy: batch mean')}
    else{frame(R,'rm',act.rm?.95:.45,'no reward model');plate(R,'pol',P.c3,k<3?.12:act.pol?1:.3,k<3?'policy · not yet':'policy · trained')}}
  function drawRLHF(R,k,e,D){const P=R.P,act={ref:k===0||k===1||k===5,rm:k===2||k===5,pol:k===3||k===4||k===6,val:k===3};plates(R,k,act);
    // pairs: sampled from the reference and labelled
    if(k>=1)stack(R,k===1||k===2?1:.4,k===1?e:1,'5,229 labelled pairs');
    if(k===1)for(let i=0;i<4;i++)R.flowArc([PX.ref-.3+i*.2,.6,ZB+.05],[DX,.5,DZ-.3],1.0,{c:P.c4,a:e*.85,r:.055,n:5});
    // the reward model learns from the pairs, then scores pair 3
    if(k===2)R.flowArc([DX+.4,.55,DZ-.3],[PX.rm,.6,ZB+.05],1.2,{c:P.c5,a:e*.85,r:.06,n:12});
    if(k>=2){const g=k===2?cl(e*1.6-.5):1;plinth(R,k===2?1:.35,D.rm.map(v=>v*g),'r_φ · reward model',P.c5)}
    // the policy is copied from the reference; the value net is an empty frame
    if(k===3)R.flowArc([PX.ref,.8,ZB+.05],[PX.pol,.8,ZB+.05],.9,{c:P.c4,a:e*.85,r:.06,n:10});
    // the RL loop: sample, score, update
    if(k>=4)samples(R,k===6?.6:1,k===4?e:1,k>=5?(k===5?e:1):0);
    if(k===4)for(let i=0;i<4;i++)R.flowArc([PX.pol+.3,.6,ZB+.05],[SX-.84+i*.56,.35,SZ-.3],.8,{c:P.c3,a:e*.85,r:.05,n:4});
    if(k===5){R.flowArc([PX.rm,.6,ZB+.05],[SX+.6,.35,SZ],.9,{c:P.c5,a:e*.85,r:.06,n:10});R.flowArc([PX.ref,.6,ZB+.05],[SX+.2,.35,SZ],.7,{c:P.c4,a:e*.8,r:.05,n:8})}
    if(k===6){for(let i=0;i<4;i++)R.flowArc([SX-.84+i*.56,.35,SZ],[PX.pol+.2,.7,ZB+.05],1.0,{c:P.c3,a:e*.85,r:.055,n:5});
      R.label([PX.pol,0,ZB+.25],'× 400 steps · '+D.ppoS.toLocaleString('en-GB')+' answers sampled',{mono:true,fs:12,b:1,c:P.c3,dy:16,a:e,wide:1})}
  }
  function drawDPO(R,k,e,D){const P=R.P,act={ref:k===0||k===2,rm:k===1,pol:k===3||k===4||k===5};plates(R,k,act);
    if(k>=1)stack(R,k===4?1:k>=1&&k<=2?1:.45,k===1?e:1,k>=2?'5,229 pairs · log π_ref cached':'5,229 labelled pairs');
    if(k===2)for(let i=0;i<4;i++)R.flowArc([PX.ref-.3+i*.2,.6,ZB+.05],[DX+.3,.6,DZ-.2],1.1,{c:P.c4,a:e*.85,r:.05,n:5});
    if(k===3)R.flowArc([PX.ref,.8,ZB+.05],[PX.pol,.8,ZB+.05],.9,{c:P.c4,a:e*.85,r:.06,n:10});
    if(k===4)R.flowArc([DX+.2,.55,DZ-.3],[PX.pol+.2,.6,ZB+.05],.7,{c:P.c5,a:e*.85,r:.06,n:12});
    // the implicit reward of pair 3, read from the policy and the reference: 0 while they are equal, then through 600 training steps
    if(k>=4){let v=[0,0];if(k===5){const S=D.dpo,u=cl(e)*(S.length-1),i=Math.min(S.length-2,Math.floor(u)),f=u-i;v=[lerp(S[i][0],S[i+1][0],f),lerp(S[i][1],S[i+1][1],f)]}
      plinth(R,k===4?cl(e*1.6):1,v,'β log π_θ/π_ref · implicit reward',P.c3);
      R.flowArc([PX.pol+.4,.7,ZB+.05],[BX,Y0+.2,BZ-.2],1.3,{c:P.c3,a:(k===4?e:1)*.8,r:.05,n:k===5?10:6});R.flowArc([PX.ref-.3,.7,ZB+.05],[BX+.2,Y0+.2,BZ-.2],.9,{c:P.c4,a:(k===4?e:1)*.6,r:.045,n:5})}
    if(k===5)R.label([PX.pol,0,ZB+.25],'× 600 steps · 0 answers sampled',{mono:true,fs:12,b:1,c:P.c3,dy:16,a:e,wide:1})
  }
  let D=null;
  function data(){if(D)return D;const sp=TOYRES.sweep.find(s=>s.m==='PPO'&&s.p==='target KL 1'),[cw,cl_]=EXIDS[PAIR],R1=ckRun('dpo',1);
    return D={rm:[RMC(cw),RMC(cl_)],dpo:R1.snaps.map(s=>[s.pairs[PAIR].lw,s.pairs[PAIR].ll]),ppoS:sp.samples,sp,sd:TOYRES.sweep.find(s=>s.m==='DPO'&&s.p==='β = 1')}}
  function draw(R,k,e){R.grid(-4.6,4.6,-3,2.6,.5);const d=data();if(MODE==='rlhf')drawRLHF(R,k,e,d);else drawDPO(R,k,e,d)}
  function counters(k){const el=document.getElementById('pipeCnt');if(!el)return;const d=data(),r=MODE==='rlhf';
    const mods=r?(k>=3?'4':k>=2?'2':'1'):(k>=3?'2':'1'),md=r?(k>=3?'policy, reference, reward, value':k>=2?'reference, reward model':'reference'):(k>=3?'policy, reference':'reference');
    const smp=r?(k<4?0:k===6?d.ppoS:64):0,tr=r?(k>=6?2:k>=2?1:0):(k>=5?1:0);
    el.innerHTML=stat('models in memory',mods,md)+stat('answers generated in training',smp.toLocaleString('en-GB'),r?'64 per step × 400 steps':'none: the pairs are all it sees')+stat('networks trained',String(tr),r?'reward model, then policy (PPO)':'the policy only')}
  const full={cam:[.3,.55],bounds:[[-3.5,0,-1.9],[3.5,1.6,1.7]]};
  const back={cam:[.3,.42],bounds:[[-3.5,0,-1.9],[3.5,1.3,-1.2]]},left={cam:[.4,.5],bounds:[[-3.3,0,-1.9],[1.7,1.2,1.6]]},right={cam:[.25,.5],bounds:[[-.2,0,-1.9],[3.5,1.6,1.7]]};
  const VR=[back,left,full,full,{cam:[.3,.5],bounds:[[-3.5,0,-1.9],[1.4,1.2,1.3]]},{cam:[.3,.5],bounds:[[-1.3,0,-1.9],[3.5,1.3,1.3]]},full];
  const VD=[back,full,left,full,full,full];
  const stg=S3.stage({id:'stg-pipe',list:'sx-rlhf',fig:'Fig. 1 · RLHF against DPO on the toy\'s 5,229 pairs',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5000,draw,
    view:k=>{const v=(MODE==='rlhf'?VR:VD)[k]||full,h=document.getElementById('stg-pipe');return h&&h.clientWidth<520?{cam:[.3,.75],bounds:full.bounds}:v},
    margin:w=>w<520?[16,8,14,8]:[22,30,16,30],onStep:k=>counters(k)});
  const seg=document.getElementById('pipeM');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(y=>{y.classList.toggle('on',y===b);y.setAttribute('aria-pressed',y===b?'true':'false')});
    MODE=b.dataset.m;['rlhf','dpo'].forEach(m=>{const L=document.getElementById('sx-'+m);if(L)L.hidden=m!==MODE});stg.list('sx-'+MODE)}));
  window.PIPE_DATA=data;
})();
