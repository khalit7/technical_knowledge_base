// ---- Scenes (sections 4 and 7): RL against a reward (renderer v2). Models are glass plates, samples are blocks, streams are what moves. ----
// stg-rl: one PPO step (policy, reference, reward model, critic) against one GRPO step (no critic, a group of six). The PPO heights are
// illustrative; the GRPO scores are illustrative and their advantages computed by recompute.py (window.AL_DATA.stage.grpo_rm).
// stg-rv: RLVR, a verifier scoring eight sampled answers 10 or 0 (Tulu 3's reward), advantages from window.AL_DATA.stage.grpo_ver.
(function(){
  if(!window.S3||!window.AL_DATA)return;const {at,off,lerp,mix,ease}=S3,ST=AL_DATA.stage;
  const sg=x=>(x<-.005?'−':x>.005?'+':'')+Math.abs(x).toFixed(2);
  const plate=(R,x,z,c,lab,sub,a,w)=>{w=w||1.2;R.glass([x-w/2,.05,z],[w,0,0],[0,w,0],{c,a,nu:5,nv:5});R.label([x,w+.05,z],lab,{fs:12.5,b:1,dy:-10,c,a});if(sub)R.label([x,0,z],sub,{fs:12,dy:13,c:P0(R).mute,a,wide:1})};
  const P0=R=>R.P;
  // ---------------- section 4
  if(document.getElementById('stg-rl')){
    let mode='ppo';const G=ST.grpo_rm,NT=6;
    const XP=-3.3,XT=i=>-1.75+i*.5,ZA=.4,ZB=-1.9,XS=[-.7,1.0,2.7],ZV=1.4;
    const V=[.2,.3,.36,.48,.6,.7],RW=.8;   // illustrative critic values and reward (PPO view)
    function drawPPO(R,k,e){const P=R.P;
      const crit=1;
      plate(R,XP,0,P.c1,'policy · trained',null,1);
      R.box([XP-1.4,0,0],[.5,.35,.5],{fill:P.paper,a:1});R.label([XP-1.4,.35,0],'prompt',{fs:12,dy:-10,c:P.mute});
      const sc=[['reward model · frozen',P.c4],['reference · frozen',P.mute],['critic · trained',P.c5]];
      sc.forEach(([l,c],j)=>plate(R,XS[j],ZB,c,l,null,k===0?Math.min(1,e*1.5):(k===1?.35:k===2&&j<2||k===3&&j===2||k===4&&j===2?1:.35),1.1));
      if(k===0)R.label([0,1.75,ZB],'four models in memory',{mono:true,fs:13,b:1,c:P.ink,a:e});
      // the sampled answer
      const na=k===0?0:k===1?e*NT:NT;
      if(k>=1)R.flow([[XP-1.15,.2,0],[XP,.6,0]],{c:P.c1,a:k===1?1:.3,r:.06,n:4});
      for(let i=0;i<NT;i++){const u=Math.max(0,Math.min(1,na-i));if(u<=0)continue;
        R.box([XT(i),0,ZA],[.32,.32,.32],{fill:mix(P.paper,P.c1,.35),a:u});
        if(k===1&&u>0&&u<1)R.flowArc([XP+.5,.7,0],[XT(i),.35,ZA],.5,{c:P.c1,r:.06,n:5})}
      if(k>=1)R.label([XT(0)-.2,0,ZA],'one answer',{al:'right',dx:-8,fs:12,c:P.c1,a:k===1?e:1,wide:1});
      // score: the reward at the end, the KL per token from the reference
      if(k===2){R.flowArc([XT(NT-1),.4,ZA],[XS[0],.7,ZB],.7,{c:P.c4,r:.065,n:6});R.flowArc([XT(2),.4,ZA],[XS[1],.7,ZB],.5,{c:P.mute,r:.055,n:5})}
      if(k>=2){const a=k===2?e:1;R.box([XT(NT-1)+.55,0,ZA],[.26,RW*1.2*a+.01,.26],{fill:mix(P.paper,P.good,.75),a,shadow:false});R.label([XT(NT-1)+.55,RW*1.2*a,ZA],'reward r',{fs:12.5,b:1,dy:-11,c:P.good,a});
        for(let i=0;i<NT;i++)R.box([XT(i),.33,ZA],[.32,.05+.02*i,.32],{fill:mix(P.paper,P.bad,.6),a:a*.9,shadow:false,lw:.5});
        R.label([XT(NT-1)+.2,.45,ZA],'− KL to the reference',{al:'left',dx:30,dy:16,fs:12,c:P.bad,a,wide:1})}
      // the critic's value for every partial answer, then the advantage
      if(k>=3){const a=k===3?e:1;if(k===3)R.flowArc([XS[2],.8,ZB],[XT(3),.6,ZV],.4,{c:P.c5,r:.06,n:6});
        for(let i=0;i<NT;i++){const v=V[i],ad=RW-v,h=k===3?v:lerp(v,ad,k===4?e:1);
          R.box([XT(i),0,ZV],[.3,h*1.1+.01,.2],{fill:mix(P.paper,k===3?P.c5:mix(P.c5,P.acc,k===4?e:1),.7),a,shadow:false})}
        R.label([XT(0)-.2,0,ZV],k===3?'critic V(sₜ)':'advantage r − V(sₜ)',{al:'right',dx:-8,fs:12.5,b:1,c:k===3?P.c5:P.acc,a})}
      // the update streams back into the two trained models
      if(k===4){R.flowArc([XT(2),.5,ZV],[XP,.9,0],.9,{c:P.acc,r:.07,n:9});R.flowArc([XT(4),.5,ZV],[XS[2],.9,ZB],.8,{c:P.c5,r:.06,n:7});
        R.glow([XP,.6,0],.9,{c:P.c1,a:.5*e});R.glow([XS[2],.6,ZB],.8,{c:P.c5,a:.5*e})}
    }
    const XG=g=>-1.75+g*.85,NG=G.r.length,mean=G.mean,B0=.6;
    function drawGRPO(R,k,e){const P=R.P;
      plate(R,XP,0,P.c1,'policy · trained',null,1);
      R.box([XP-1.4,0,0],[.5,.35,.5],{fill:P.paper,a:1});R.label([XP-1.4,.35,0],'prompt',{fs:12,dy:-10,c:P.mute});
      plate(R,XS[0],ZB,P.c4,'reward model · frozen',null,k===2?1:.4,1.1);plate(R,XS[1],ZB,P.mute,'reference · frozen',null,.4,1.1);
      const ca=k===0?1-e:0;if(ca>0){plate(R,XS[2],ZB,P.c5,'critic',null,ca,1.1);R.line([[XS[2]-.6,1.2,ZB],[XS[2]+.6,0,ZB]],{c:P.bad,w:3,a:ca*Math.min(1,e*3)})}
      if(k===0)R.label([XS[2],0,ZB],'no critic: three models',{fs:12.5,b:1,dy:14,c:P.bad,a:e});
      // the group: six answers to the same prompt
      if(k>=1){R.flow([[XP-1.15,.2,0],[XP,.6,0]],{c:P.c1,a:k===1?1:.3,r:.06,n:4});
        for(let g=0;g<NG;g++){const u=k===1?Math.max(0,Math.min(1,e*NG*1.2-g)):1;if(u<=0)continue;
          R.box([XG(g),0,ZA],[.46,.42,.46],{fill:mix(P.paper,P.c1,.32),a:u});if(k===1)R.label([XG(g),.42,ZA],String(g+1),{fs:12.5,b:1,dy:-10,c:P.c1,a:u});
          if(k===1&&u<1)R.flowArc([XP+.5,.7,0],[XG(g),.45,ZA],.6,{c:P.c1,r:.06,n:5})}
        if(k===1)R.label([XG(0)-.3,0,ZA],'G = 6 answers',{al:'right',dx:-8,fs:12.5,b:1,c:P.c1,a:e,wide:1})}
      const ZV=1.95;
      if(k===2)for(let g=0;g<NG;g++)R.flowArc([XG(g),.45,ZA],[XS[0],.7,ZB],.5,{c:P.c4,r:.05,n:4,a:.8});
      // scores on plinths in front, the group mean, then the advantages they become
      if(k>=2){for(let g=0;g<NG;g++){const r=G.r[g],ad=G.adv[g],t=k===4?1:k===3?0:0,a=k===2?e:1;
          const sv=lerp(r,ad*.6,k===4?ease(e)*0+1:0);
          const val=k>=4?ad:r,hh=k>=4?Math.abs(ad)*.42:Math.abs(r)*.62,h=hh*(k===2?e:1)+.012,up=val>=0;
          R.box([XG(g),B0-.03,ZV],[.56,.03,.34],{a,shadow:false});R.box([XG(g),0,ZV],[.03,B0-.03,.03],{a:a*.7,shadow:false});
          const c=k>=4?(up?P.good:P.bad):P.c4;
          R.box([XG(g),up?B0:B0-.03-h,ZV],[.34,h,.24],{fill:mix(P.paper,c,.72),a,shadow:false});
          R.label([XG(g),up?B0+h:B0-.03-h,ZV],k>=4?sg(ad):(r<0?'−':'')+Math.abs(r).toFixed(2),{mono:true,fs:12,b:1,dy:up?-10:12,c,a,wide:1})}
        R.label([XG(0)-.4,B0,ZV],k>=4?'advantage':'score r',{al:'right',dx:-6,fs:12.5,b:1,c:k>=4?P.good:P.c4});
        if(k===3){const ym=B0+mean*.62;R.glass([XG(0)-.35,ym,ZV-.2],[XG(NG-1)-XG(0)+.7,0,0],[0,0,.4],{c:P.acc,a:e,nu:6,nv:1});
          R.label([XG(NG-1)+.4,ym,ZV],'group mean '+mean.toFixed(2),{al:'left',dx:6,fs:12.5,b:1,c:P.acc,a:e,wide:1})}}
      if(k===4){for(let g=0;g<NG;g++){const ad=G.adv[g];R.flowArc([XG(g),B0+.3,ZV],[XP+.3,.8,0],1.1,{c:ad>=0?P.good:P.bad,r:.04+.03*Math.abs(ad),n:3+Math.round(3*Math.abs(ad)),a:e})}
        R.glow([XP,.6,0],.9,{c:P.c1,a:.5*e})}
    }
    const full={cam:[.1,.72],bounds:[[-4.9,0,-2.2],[3.4,1.2,2.3]]};
    const stg=S3.stage({id:'stg-rl',list:'sx-ppo',fig:'Fig. 4 · one RL step, model by model',cam:full.cam,bounds:full.bounds,aspect:.47,dur:1600,hold:4800,
      draw:(R,k,e)=>{R.grid(-5.5,4,-3,2.5,.5);(mode==='ppo'?drawPPO:drawGRPO)(R,k,e)},margin:w=>w<520?[16,10,14,10]:[22,16,14,16],
      view:k=>k>=2&&k<=3?{cam:[.1,.66],bounds:[[-2.6,0,-2.2],[3.4,1.3,2.3]]}:mode==='ppo'&&k<=1&&document.getElementById('stg-rl').clientWidth>=520?{cam:full.cam,bounds:[[-4.9,0,-2.2],[3.4,1.2,1.3]]}:full}); // steps 1 and 2: nothing stands in the front rows yet
    const chips=document.getElementById('rlM');
    if(chips)chips.addEventListener('click',ev=>{const b=ev.target.closest('button[data-m]');if(!b||b.dataset.m===mode)return;mode=b.dataset.m;
      chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
      document.getElementById('sx-ppo').hidden=mode!=='ppo';document.getElementById('sx-grpo').hidden=mode!=='grpo';stg.list(mode==='ppo'?'sx-ppo':'sx-grpo')});
    window.AL_STG=window.AL_STG||{};AL_STG.rl=stg;
  }
  // ---------------- section 7
  if(document.getElementById('stg-rv')){
    const Vr=ST.grpo_ver,N=Vr.r.length;
    const ANS=['$8','$24','$6','$8','$24','$16','$8','$24'],HARD=['$24','$6','$24','$16','$24','$12','$6','$24']; // illustrative answers
    const X=i=>-2.6+i*.82,ZA=.1,ZV=-1.8,XP=-4.4,B0=.6;
    function draw(R,k,e){const P=R.P;R.grid(-5.5,4,-2.8,2,.5);
      plate(R,XP,ZA,P.c1,'policy',null,1,1.1);
      const hard=k===4;
      // the group of eight sampled answers
      for(let i=0;i<N;i++){const u=k===0?Math.max(0,Math.min(1,e*N*1.15-i)):1;if(u<=0)continue;
        const ok=!hard&&Vr.r[i]>0,ch=k>=1,fill=ch?mix(P.paper,ok?P.good:P.bad,.55):mix(P.paper,P.c1,.3);
        R.box([X(i),0,ZA],[.5,.4,.5],{fill,a:u});R.label([X(i),.4,ZA],hard?HARD[i]:ANS[i],{mono:true,fs:12.5,b:1,dy:-11,c:ch?(ok?P.good:P.bad):P.ink,a:u});
        if(k===0&&u<1)R.flowArc([XP+.5,.8,ZA],[X(i),.45,ZA],.6,{c:P.c1,r:.06,n:5})}
      // the verifier: a program, drawn as a solid block; streams to it and back
      const va=k===0?.25:1;R.box([0,0,ZV],[2.0,.55,.7],{fill:mix(P.paper,P.ink,.12),a:va});
      R.label([0,.55,ZV],'verifier · final answer == 8',{mono:true,fs:12.5,b:1,dy:-11,c:P.ink,a:va});
      if(k===1||k===4)for(let i=0;i<N;i++)R.flowArc([X(i),.42,ZA],[X(i)*.3,.56,ZV],.35,{c:P.ink,r:.05,n:4,a:k===1?.8:.6});
      // 3: the reward model the verifier replaces
      const ra=k===2?1-.7*e:0;if(ra>0){R.glass([2.4,.05,ZV],[1.1,0,0],[0,1.1,0],{c:P.c4,a:ra});R.label([2.95,1.15,ZV],'reward model',{fs:12.5,b:1,dy:-10,c:P.c4,a:ra});
        R.line([[2.35,1.2,ZV],[3.55,0,ZV]],{c:P.bad,w:3,a:ra*Math.min(1,e*4+.3)})}
      if(k===2)R.label([2.95,0,ZV],'not needed: one model fewer',{fs:12.5,b:1,dy:14,c:P.bad,a:e,wide:1});
      // rewards 10 or 0, then advantages, on plinths in front
      if(k>=1){const ZR=2.0;for(let i=0;i<N;i++){const r=hard?0:Vr.r[i],ad=hard?0:Vr.adv[i];
        const t=k===3?e:k>3?1:0,a=k===1?e:1;
        const hr=r/10*.85,ha=Math.abs(ad)*.45,h=lerp(hr,ha,t)+.012,up=t<.5||ad>=0;
        R.box([X(i),B0-.03,ZR],[.55,.03,.34],{a,shadow:false});R.box([X(i),0,ZR],[.03,B0-.03,.03],{a:a*.7,shadow:false});
        const c=t<.5?(r>0?P.good:P.mute):(Math.abs(ad)<1e-9?P.mute:ad>=0?P.good:P.bad);
        R.box([X(i),up?B0:B0-.03-h,ZR],[.34,h,.24],{fill:mix(P.paper,c,.75),a,shadow:false});
        const lab=t<.5?String(r):sg(ad);R.label([X(i),up?B0+h:B0-.03-h,ZR],lab,{mono:true,fs:12,b:1,dy:up?-10:12,c,a,wide:hard?0:t>=.5?1:0})}
        R.label([X(0)-.4,B0,ZR],k>=3?'advantage':'reward',{al:'right',dx:-6,fs:12.5,b:1,c:k>=3?P.acc:P.good,a:1});
        if(k===3)R.label([X(N-1)+.45,B0+.7,ZR],'mean '+Vr.mean.toFixed(2)+' · std '+Vr.std.toFixed(2),{al:'right',mono:true,fs:12.5,b:1,dy:-16,c:P.acc,a:e,wide:1});
        if(k===4)R.label([0,0,ZR+.3],'all eight wrong: every advantage 0, no gradient',{fs:12.5,b:1,dy:16,c:P.bad,a:e})}
    }
    const full={cam:[.12,.75],bounds:[[-5.0,0,-2.2],[3.7,1.1,2.4]]};
    const stg=S3.stage({id:'stg-rv',list:'sx-rv',fig:'Fig. 7 · a verifier scores a group of eight',cam:full.cam,bounds:full.bounds,aspect:.54,dur:1600,hold:4800,draw,
      margin:w=>w<520?[16,10,14,10]:[22,16,14,16],view:()=>full});
    window.AL_STG=window.AL_STG||{};AL_STG.rv=stg;
  }
})();
