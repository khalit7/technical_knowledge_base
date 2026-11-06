// ---- Scene (hero): DQN's training loop in 3D, one update with section 3's numbers, then where each later fix acts ----
// Numbers (window.VB3.hero, recomputed by src/checks/check_stages.mjs): Q(s', .; theta-) = (2.0, 3.5, 3.0), r = 1, gamma = 0.99,
// so y = 1 + 0.99 x 3.5 = 4.465; Q(s, a; theta) = 4.0, TD error 0.465; replay 1M, minibatch 32, C = 10,000 (Mnih et al. 2015).
(function(){
  const H={qt:[2.0,3.5,3.0],r:1,g:.99,q:4.0};H.y=H.r+H.g*Math.max(...H.qt);H.td=H.y-H.q;
  window.VB3=window.VB3||{};window.VB3.hero=H;
  if(!document.getElementById('stg-hero')||!window.S3)return;const {at,mix,lerp}=S3;
  const VS=.3;                                              // world height per unit of Q
  const ENV=[-5.5,0,-.5],MB=[5.0,0,-.9],ON=-2.35,TG=2.35,NZ=1.45,BZ=-1.7,LS=[0,0,2.75];
  const LAY=[[.3,1.0],[.3,.82],[.3,.66],[.3,.46]];      // conv1, conv2, conv3, fc: thickness, height and depth
  const SLAB=i=>-2.6+i*.2,NS=27,PICK=[4,9,13,18,24];         // the buffer's slabs (newest at the left); the minibatch's draws
  const PH=[[[-6.1,0,-1.2],[-1,1,2.3]],[[-6.1,0,-2.2],[2.8,1,.3]],[[-2.8,0,-2.2],[5.6,1,0]],[[-.4,0,-1.4],[5.6,1.2,3.3]],[[-3.4,0,-1.4],[5.6,1.2,3.3]],[[-3.4,0,.6],[4.3,1.6,2.3]],[[-6.1,0,-2.2],[5.6,1,3.3]]];
  function net(R,x0,fill,a,lab,P){LAY.forEach(([t,h],i)=>R.box([x0-.75+i*.5,.62-h/2,NZ],[t,h,h],{fill,a}));
    R.label([x0,.02,NZ+.62],lab,{fs:12.5,b:1,dy:12,a:Math.max(a,.35),c:P.ink})}
  function draw(R,k,e){const P=R.P,ph=R.W<520;R.grid(-6.2,5.6,-2.1,3.3,.5);
    const act={0:['env','on'],1:['env','rep'],2:['rep','mb'],3:['mb','tg','ls'],4:['mb','on','ls'],5:['on','tg'],6:['env','on','rep','mb','tg','ls']}[k];
    const A=p=>act.includes(p)?1:.22;
    // the emulator: four stacked greyscale frames
    for(let f=0;f<4;f++)R.box([ENV[0]-.24+f*.16,.05,ENV[2]],[.05,1.0,1.0],{fill:mix(P.paper,P.mute,.18+.08*f),a:A('env')});
    R.label([ENV[0],0,ENV[2]+.6],ph?'emulator':'emulator: 4 frames',{fs:12.5,b:1,dy:12,a:Math.max(A('env'),.35)});
    // the replay buffer: a row of transitions, newest entering at the left
    for(let i=0;i<NS;i++){const pk=k===2&&PICK.includes(i),nw=k===1&&i===0;
      R.box([SLAB(i),0,BZ],[.11,.7,.9],{fill:pk||nw?mix(P.paper,P.acc,.75):mix(P.paper,P.c3,.35),a:A('rep')*(nw?at(k,e,1):1)})}
    R.label([0,.7,BZ],ph?'replay buffer':'replay buffer: last 1M (s, a, r, s′)',{fs:12.5,b:1,dy:-12,a:Math.max(A('rep'),.35)});
    // the minibatch: a short stack
    for(let i=0;i<6;i++)R.box([MB[0],i*.11,MB[2]],[.9,.07,.62],{fill:mix(P.paper,P.c3,.45),a:A('mb')*(k===2?Math.min(1,e*6-i*.6+.4):1)});
    R.label([MB[0],0,MB[2]+.42],'minibatch of 32',{fs:12.5,b:1,dy:12,a:Math.max(A('mb'),.35)});
    // the two networks
    net(R,ON,mix(P.paper,P.c1,.35),A('on'),'online θ',P);
    net(R,TG,mix(P.paper,P.c4,.3),A('tg'),'target θ⁻',P);
    // target outputs: three Q-values for s', the max highlighted
    if(k===3||k===6){const g=k===3?at(k,e,3):1;H.qt.forEach((v,i)=>{const mx=v===Math.max(...H.qt);
      R.box([TG+1.15+i*.42,0,NZ],[.3,v*VS*g,.3],{fill:mx?P.acc:mix(P.paper,P.c4,.5),a:k===6?.25:1});
      if(k===3)R.label([TG+1.15+i*.42,v*VS*g,NZ],v.toFixed(1),{fs:12,mono:1,dy:-10,wide:1,c:mx?P.acc:P.ink,a:g})})}
    // the loss: target y against the online estimate
    const yb=k>=3&&k!==5?1:0,qb=k===4||k===6?1:0;
    if(yb||qb){R.box([LS[0]-.25,0,LS[2]],[.36,H.y*VS*(k===3?at(k,e,3):1),.36],{fill:P.acc,a:(k===6?.25:1)*yb});
      if(qb)R.box([LS[0]+.25,0,LS[2]],[.36,H.q*VS*(k===4?at(k,e,4):1),.36],{fill:mix(P.paper,P.c1,.7),a:k===6?.25:1});
      if(k===3)R.label([LS[0]-.25,H.y*VS,LS[2]],ph?'y = 4.465':'y = 1 + 0.99 × 3.5 = 4.465',{fs:12.5,b:1,mono:1,dy:-11,c:P.acc,a:at(k,e,3)});
      if(k===4){R.label([LS[0]-.25,H.y*VS,LS[2]],'y 4.465',{fs:12,mono:1,dy:-11,al:'right',dx:-4,c:P.acc});
        R.label([LS[0]+.25,H.q*VS,LS[2]],'Q 4.0',{fs:12,mono:1,dy:-11,al:'left',dx:4,c:P.c1,a:at(k,e,4)});
        R.label([LS[0],0,LS[2]+.3],'TD error 0.465',{fs:12.5,b:1,dy:14,a:at(k,e,4)})}
      R.label([LS[0],0,LS[2]+.3],'loss (y − Q)²',{fs:12.5,b:1,dy:k===4?32:14,a:k===4||k===3?1:.35})}
    // the flows of the current step, drawn as arcs
    const C1=P.acc;
    if(k===0){R.arc([ENV[0]+.3,1.05,ENV[2]],[ON-.75,1.15,NZ],.6,{c:C1,w:2.2,t:e,head:6,top:1});
      R.arc([ON+.75,.9,NZ],[ENV[0]+.2,1.1,ENV[2]+.3],1.3,{c:P.c1,w:2,t:e,head:6,top:1,dash:[5,4]});
      R.label(R.arcPt([ENV[0]+.3,1.05,ENV[2]],[ON-.75,1.15,NZ],.6,.5),'s',{fs:13,b:1,c:C1,dy:-12,a:e});
      R.label(R.arcPt([ON+.75,.9,NZ],[ENV[0]+.2,1.1,ENV[2]+.3],1.3,.5),ph?'action':'argmax Q, or random with prob. ε',{fs:12.5,c:P.c1,dy:-12,a:e})}
    if(k===1){const a=[ENV[0]+.2,1.05,ENV[2]],b=[SLAB(0),.75,BZ];R.arc(a,b,.8,{c:C1,w:2.2,t:e,head:6,top:1});
      R.ball(R.arcPt(a,b,.8,e),.12,{c:P.acc,top:1});R.label(R.arcPt(a,b,.8,.5),'(s, a, r, s′)',{fs:12.5,mono:1,c:C1,dy:-14,a:e})}
    if(k===2)PICK.forEach((i,j)=>R.arc([SLAB(i),.72,BZ],[MB[0]-.2+j*.1,.66,MB[2]],.7+.12*j,{c:C1,w:1.6,t:Math.min(1,e*1.4),a:.85,top:1}));
    if(k===2)R.label([2.2,1.6,-1],'uniformly at random',{fs:12.5,c:C1,a:e});
    if(k===3){R.arc([MB[0],.7,MB[2]],[TG-.8,1.0,NZ],.6,{c:C1,w:2,t:e,head:6,top:1});R.label(R.arcPt([MB[0],.7,MB[2]],[TG-.8,1.0,NZ],.6,.4),'r, s′',{fs:12.5,b:1,c:C1,dx:10,al:'left',a:e,wide:1});
      R.arc([TG+1.55,1.15,NZ],[LS[0]-.25,H.y*VS+.1,LS[2]],.5,{c:C1,w:1.8,t:e,head:6,top:1,a:.8})}
    if(k===4){R.arc([MB[0]-.3,.7,MB[2]],[ON+.8,.9,NZ],1.2,{c:P.c1,w:2,t:e,head:6,top:1});R.label(R.arcPt([MB[0]-.3,.7,MB[2]],[ON+.8,.9,NZ],1.2,.5),'s, a',{fs:12.5,b:1,c:P.c1,dy:-12,a:e});
      R.arc([LS[0]-.1,.3,LS[2]-.2],[ON+.6,.3,NZ+.3],.35,{c:P.bad,w:2,t:e,head:6,top:1,dash:[5,4]});R.label([(ON+.6)/2,.15,(LS[2]+NZ)/2+.2],'gradient step on θ',{fs:12.5,c:P.bad,dy:16,a:e})}
    if(k===5){R.arc([ON,1.2,NZ],[TG,1.2,NZ],1.1,{c:C1,w:2.4,t:e,head:7,top:1});R.glow([TG,.7,NZ],1.1,{c:P.acc,a:e*.6});
      R.label([0,2.25,NZ],ph?'copy every C':'copy θ into θ⁻ every C = 10,000 updates',{fs:12.5,b:1,c:C1,a:e})}
    // where each later fix acts
    if(k===6){const u=e,T=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5,b:1,c:P.acc,a:u},o||{}));
      [[ON,1.25,NZ],[0,.9,BZ],[MB[0],.75,MB[2]],[TG,1.15,NZ]].forEach(p=>R.glow(p,.75,{c:P.acc,a:u*.55}));
      T([ON,1.2,NZ],ph?'§5 §8 §9':'dueling §5 · distributional §8',{dy:-16});if(!ph)T([ON,1.2,NZ],'NoisyNet §9 (acting)',{dy:-34});
      T([0,.7,BZ],ph?'§7':'multi-step §7: n rewards',{dy:-30});T([MB[0],.7,MB[2]],ph?'§6':'prioritised §6',{dy:-16});T([TG,1.2,NZ],ph?'§4':'Double §4: θ picks, θ⁻ values',{dy:-16})}
  }
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · DQN’s loop, one update, then where each fix acts',cam:[-.1,.86],aspect:.5,
    // on a phone the camera frames the parts the current step uses
    bounds:st=>{const h=document.getElementById('stg-hero');return h&&h.clientWidth<520?PH[st.k]:[[-6.1,0,-2.2],[5.6,1.0,3.3]]},draw,dur:1300,hold:4600});
  if(st)st.draw();
})();
