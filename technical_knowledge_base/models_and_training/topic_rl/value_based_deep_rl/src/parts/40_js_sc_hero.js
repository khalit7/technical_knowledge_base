// ---- Scene (hero): DQN's training loop in 3D, one update with section 3's numbers, then where each later fix acts (renderer v2: glass networks, flows, camera per step) ----
// Numbers (window.VB3.hero, recomputed by src/checks/check_stages.mjs): Q(s', .; theta-) = (2.0, 3.5, 3.0), r = 1, gamma = 0.99,
// so y = 1 + 0.99 x 3.5 = 4.465; Q(s, a; theta) = 4.0, TD error 0.465; replay 1M, minibatch 32, C = 10,000 (Mnih et al. 2015).
(function(){
  const H={qt:[2.0,3.5,3.0],r:1,g:.99,q:4.0};H.y=H.r+H.g*Math.max(...H.qt);H.td=H.y-H.q;
  window.VB3=window.VB3||{};window.VB3.hero=H;
  if(!document.getElementById('stg-hero')||!window.S3)return;const {at,off,mix,lerp}=S3;
  const VS=.3;                                               // world height per unit of Q
  const ENV=[-5.0,0,.7],ON=-2.2,TG=2.9,NZ=.7,BZ=-1.9,MB=[4.3,0,-1.9],LS=[.35,0,2.1];
  const LAY=[1.0,.84,.68,.5];                                // conv1, conv2, conv3, fc: plate height (and depth)
  const LX=(x0,i)=>x0-.6+i*.4,SLAB=i=>-4.7+i*.2,NS=27,PICK=[4,9,13,18,24],QX=i=>TG+1.0+i*.42;
  const phone=()=>{const h=document.getElementById('stg-hero');return !!h&&h.clientWidth<520};
  // a network: four glass plates (one per layer) on a white plinth
  function net(R,x0,c,a,lab,P){if(a<=.01)return;R.box([x0,0,NZ],[1.75,.06,1.25],{a,shadow:false});
    LAY.forEach((h,i)=>R.glass([LX(x0,i),.12+(1-h)/2,NZ-h/2],[0,0,h],[0,h,0],{c,a,nu:4,nv:4,th:.06}));
    if(lab)R.label([x0,0,NZ+.7],lab,{fs:12.5,b:1,dy:12,c:P.ink,a:a*(R.k6?.6:1)})}
  function draw(R,k,e){const P=R.P,ph=R.W<520;R.k6=k===6;R.grid(-6,5.4,-2.6,2.8,.5);
    const act={0:['env','on'],1:['env','rep'],2:['rep','mb'],3:['mb','tg','ls'],4:['mb','on','ls'],5:['on','tg'],6:['env','on','rep','mb','tg','ls']}[k];
    const A=p=>act.includes(p)?1:.13,L=p=>act.includes(p)&&k!==6,LA=1;
    // the emulator: the last four greyscale frames
    for(let f=0;f<4;f++)R.box([ENV[0]-.27+f*.18,.05,ENV[2]],[.05,.95,.95],{fill:mix(P.paper,P.mute,.15+.1*f),a:A('env')});
    if(L('env'))R.label([ENV[0],0,ENV[2]+.55],ph?'emulator':'emulator: last 4 frames',{fs:12.5,b:1,dy:12,a:LA});
    // the replay buffer: a row of transitions along the back, newest at the left
    for(let i=0;i<NS;i++){const pk=(k===2)&&PICK.includes(i),nw=k===1&&i===0;
      R.box([SLAB(i),0,BZ],[.12,.68,.9],{fill:pk||nw?mix(P.paper,P.acc,.7):mix(P.paper,P.c3,.3),a:A('rep')*(nw?at(k,e,1):1),shadow:false})}
    if(L('rep'))R.label([SLAB(13),0,BZ+.45],ph?'replay buffer · last 1M':'replay buffer: the last 1M (s, a, r, s′)',{fs:12.5,b:1,dy:12,a:LA});
    // the minibatch: a short stack at the end of the buffer
    for(let i=0;i<6;i++)R.box([MB[0],i*.11,MB[2]],[.85,.07,.62],{fill:mix(P.paper,P.c3,.5),a:A('mb')*(k===2?Math.max(0,Math.min(1,e*3-i*.35)):1),shadow:i===0});
    if(L('mb'))R.label([MB[0],.66,MB[2]],'minibatch of 32',{fs:12.5,b:1,dy:-14,a:LA});
    // the two networks as glass
    net(R,ON,P.c1,A('on'),L('on')?'online θ':'',P);
    net(R,TG,P.c4,A('tg'),L('tg')?'target θ⁻':'',P);
    // the target network's three Q-values for s′, the max highlighted
    if(k===3||k===6){const g=k===3?at(k,e,3):1,mx=Math.max(...H.qt);H.qt.forEach((v,i)=>{const m=v===mx;
      R.box([QX(i),0,NZ],[.3,v*VS*g,.3],{fill:m?P.acc:mix(P.paper,P.c4,.5),a:k===6?.25:1});
      if(k===3)R.label([QX(i),v*VS*g,NZ],v.toFixed(1),{fs:12.5,mono:1,b:m,dy:-11,c:m?P.acc:P.ink,a:g})})}
    // the loss: the target y against the online estimate Q
    const yb=k===3||k===4||k===6,qb=k===4||k===6,la=k===6?.25:1;
    if(yb){R.box([LS[0]-.25,0,LS[2]],[.36,H.y*VS*(k===3?Math.min(1,e*1.4):1),.36],{fill:P.acc,a:la});
      if(qb)R.box([LS[0]+.25,0,LS[2]],[.36,H.q*VS*(k===4?Math.min(1,e*1.4):1),.36],{fill:mix(P.paper,P.c1,.75),a:la});
      if(k===3)R.label([LS[0]-.25,H.y*VS,LS[2]],ph?'y = 4.465':'y = 1 + 0.99 × 3.5 = 4.465',{fs:12.5,b:1,mono:1,dy:-12,c:P.acc,a:Math.min(1,e*1.4)});
      if(k===4){R.label([LS[0]-.25,H.y*VS,LS[2]],'y 4.465',{fs:12.5,mono:1,dy:-12,al:'right',dx:-2,c:P.acc});
        R.label([LS[0]+.25,H.q*VS,LS[2]],'Q 4.0',{fs:12.5,mono:1,dy:-12,al:'left',dx:2,c:P.c1,a:e});
        R.label([LS[0],0,LS[2]+.3],'TD error 0.465',{fs:12.5,b:1,dy:32,a:e})}
      if(k!==6)R.label([LS[0],0,LS[2]+.3],'loss (y − Q)²',{fs:12.5,b:1,dy:14})}
    // what moves in this step
    const fa=Math.min(1,e*1.6);
    if(k===0){const a0=[ENV[0]+.1,1.0,ENV[2]],b0=[LX(ON,0),.95,NZ];R.flowArc(a0,b0,.45,{c:P.acc,a:fa,r:.08,speed:1.3});
      R.label(R.arcPt(a0,b0,.45,.5),'state s',{fs:12.5,b:1,c:P.acc,dy:-14,a:fa});
      const a1=[LX(ON,3),.6,NZ+.3],b1=[ENV[0]+.3,.35,ENV[2]+.5];R.flowArc(a1,b1,.15,{c:P.c2,a:fa,r:.07,speed:1.1,n:5});
      R.label(R.arcPt(a1,b1,.15,.5),ph?'action':'action: argmax Q, or random with prob. ε',{fs:12.5,b:1,c:P.c2,dy:18,a:fa})}
    if(k===1){const a0=[ENV[0],1.05,ENV[2]-.3],b0=[SLAB(0),.75,BZ];R.flowArc(a0,b0,.6,{c:P.acc,a:fa,r:.09,speed:1.2});
      R.label(R.arcPt(a0,b0,.6,.3),'(s, a, r, s′)',{fs:12.5,mono:1,b:1,c:P.acc,al:'right',dx:-16,a:fa})}
    if(k===2){PICK.forEach((i,j)=>R.flowArc([SLAB(i),.72,BZ],[MB[0]-.1,.72,MB[2]],.5+.1*j,{c:P.acc,a:fa*.9,r:.06,speed:1.5,n:7}));
      R.label([SLAB(18),1.5,BZ],'uniformly at random',{fs:12.5,b:1,c:P.acc,a:fa})}
    if(k===3){const a0=[MB[0],.7,MB[2]],b0=[LX(TG,0),.95,NZ];R.flowArc(a0,b0,.3,{c:P.acc,a:fa,r:.08,speed:1.2});
      R.label(R.arcPt(a0,b0,.3,.6),'r, s′',{fs:12.5,b:1,mono:1,c:P.acc,al:'right',dx:-14,a:fa});
      const g=at(k,e,3),a1=[QX(1),H.qt[1]*VS+.05,NZ],b1=[LS[0]-.25,H.y*VS+.05,LS[2]];R.flowArc(a1,b1,.45,{c:P.acc,a:g,r:.08,speed:1.2})}
    if(k===4){const a0=[MB[0]-.3,.7,MB[2]],b0=[LX(ON,0),.95,NZ];R.flowArc(a0,b0,.7,{c:P.c1,a:fa,r:.08,speed:1.4});
      R.label(R.arcPt(a0,b0,.7,.45),'s, a',{fs:12.5,b:1,mono:1,c:P.c1,dy:-13,a:fa});
      R.flowArc([LX(ON,3),.7,NZ+.3],[LS[0]+.25,H.q*VS+.05,LS[2]],.3,{c:P.c1,a:fa,r:.07,speed:1.1,n:6});
      R.flowArc([LS[0],.15,LS[2]-.25],[LX(ON,1),.15,NZ+.4],.08,{c:P.bad,a:e,r:.07,speed:1,n:6});
      R.label([LS[0],0,LS[2]+.3],'gradient step on θ only',{fs:12.5,b:1,c:P.bad,dy:50,a:e})}
    if(k===5){LAY.forEach((h,i)=>R.flowArc([LX(ON,i),.12+(1+h)/2,NZ],[LX(TG,i),.12+(1+h)/2,NZ],.7+.08*i,{c:P.acc,a:fa,r:.065,speed:1.6,n:10}));
      R.glow([TG,.6,NZ],1.1,{c:P.acc,a:e*.45});
      R.label([(ON+TG)/2,2.3,NZ],ph?'copy θ into θ⁻ every C':'copy θ into θ⁻ every C = 10,000 updates',{fs:12.5,b:1,c:P.acc,a:fa})}
    // where each later fix acts
    if(k===6){const u=e,T=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5,b:1,c:P.acc,a:u},o||{}));
      [[ON,.7,NZ],[SLAB(13),.4,BZ],[MB[0],.4,MB[2]],[TG,.7,NZ],[ENV[0],.5,ENV[2]]].forEach(p=>R.glow(p,.8,{c:P.acc,a:u*.5}));
      T([ON,1.15,NZ],ph?'head §5 §8':'online head: dueling §5 · distributional §8',{dy:-14});T([ENV[0],1.0,ENV[2]],ph?'acting §9':'acting: NoisyNet §9',{dy:-14});
      T([SLAB(13),.68,BZ],ph?'stored §7':'stored: multi-step §7, n rewards',{dy:-14});T([MB[0],.7,MB[2]],ph?'sampled §6':'sampled: prioritised §6',{dy:-14});T([TG,1.15,NZ],ph?'target §4':'target: Double §4, θ picks, θ⁻ values',{dy:-14})}
  }
  const full={cam:[-.12,.72],bounds:[[-5.7,0,-2.4],[5.0,1.3,2.5]]};
  // each step but the last moves in close on the parts it uses; on a phone the frames are tighter still
  const V=[[[-5.6,0,0],[-1.2,1.5,1.5]],[[-5.6,0,-2.4],[1.0,1.3,1.4]],[[-4.9,0,-2.4],[4.9,1.4,-1.3]],[[-.3,0,-2.4],[5.0,1.4,2.5]],[[-2.9,0,-2.4],[4.8,1.4,2.5]],[[-3.0,0,0],[3.7,2.4,1.5]]];
  const VP=[[[-5.6,0,0],[-1.4,1.5,1.4]],[[-5.6,0,-2.3],[-.6,1.2,1.3]],[[-3.6,0,-2.4],[4.8,1.3,-1.4]],[[-.2,0,-2.3],[4.9,1.4,2.4]],[[-2.8,0,-2.3],[4.7,1.3,2.4]],[[-2.9,0,.1],[3.6,2.4,1.3]]];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · DQN’s loop, one update, then where each fix acts',cam:full.cam,bounds:full.bounds,aspect:.56,draw,dur:1500,hold:4800,
    margin:w=>w<520?[16,10,14,10]:[22,16,16,16],
    view:k=>k===6?full:{cam:[-.12,.6],bounds:(phone()?VP:V)[k]}});
})();
