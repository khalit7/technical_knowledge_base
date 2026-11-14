// ---- Scene: Qwen3's post-training as a 3D flow (renderer v2: a few large objects per step, the camera moving in close per step,
// flowing dots wherever data, rewards or distributions move). Two routes, one step list each, as the report's Figure 1 draws them:
// the flagships' four stages (one station per stage along x: data behind, the checkpoint, one response in front showing the signal
// it gets, the stage's reported score beside it), and strong-to-weak distillation into the six smaller models.
// Numbers are the page's: §4.2 (3,995 problems, AIME'24 70.1 to 85.1 in 170 steps), Table 22 (Qwen3-32B by stage), Table 21
// (GPU hours and AIME'24), the parameter recount (window.PAPER.rc.arch). Responses are illustrative token rows, labelled so. ----
(function(){
  if(!document.getElementById('stg-post'))return;const {at,mix}=S3;
  const PA=window.PAPER,ARCH=PA.rc.arch,T22=PA.tables.T22.rows,T21=PA.tables.T21.rows;
  const par=n=>ARCH.find(r=>r.model===n).total,num=s=>parseFloat(String(s));
  const t22=(b,c)=>num(T22.find(r=>r.b.indexOf(b)===0).v[c]);
  const AIME=[t22('AIME',0),t22('AIME',1)],TF=[num(T22.find(r=>r.b.indexOf('ThinkFollow')===0).v[1]),num(T22.find(r=>r.b.indexOf('ThinkFollow')===0).v[2])],TOOL=t22('ToolUse',3)-t22('ToolUse',1);
  const RL=T21.find(r=>/Reinforcement/.test(r[0])),OD=T21.find(r=>/On-policy/.test(r[0]));
  const GH=[num(RL[7].replace(/,/g,'')),num(OD[7].replace(/,/g,''))],A21=[num(RL[1]),num(OD[1])];
  window.Q3_POST={AIME,TF,TOOL,GH,A21,flag:[par('Qwen3-235B-A22B'),par('Qwen3-32B')]};
  let M='flag';
  const X=[-5.4,-3.25,-1.1,1.05,3.2,5.4],ZD=-1.55,ZR=1.45;
  const hcb=b=>.3*Math.cbrt(b);                                   // box height by the cube root of total parameters
  function model(R,x,z,name,sub,a,c,s,lab){if(a<=.01)return;const P=R.P,w=s?s[0]:1,h=s?s[1]:.7,d=s?s[2]:.78;
    R.box([x,0,z],[w,h,d],{fill:mix(P.paper,c,.3),a});if(lab!==false&&a>=.5){R.label([x,h,z],name,{fs:12.5,b:1,dy:-11,a:Math.max(a,.5)});if(sub&&a>.6)R.label([x,0,z+d/2],sub,{fs:12,dy:14,c:P.mute,a,wide:1})}}
  // one response as a row of token blocks in front of a checkpoint
  const NT=8,PT=.25;const tokX=(x,j)=>x+(j-(NT-1)/2)*PT;
  function row(R,x,z,a,c){for(let j=0;j<NT;j++)R.box([tokX(x,j),0,z],[.2,.16,.26],{fill:mix(R.P.paper,c||R.P.ink,.12),a,shadow:j===0,lw:.6})}
  // fine-tuning's signal: a target token drops onto every position in turn
  function targets(R,x,z,e,c){for(let j=0;j<NT;j++){const u=Math.max(0,Math.min(1,(e*(NT+3)-j)/3));if(u<=0)continue;const y=.16+.06+.7*(1-u);R.ball([tokX(x,j),y,z],.06,{c});if(u<1)R.glow([tokX(x,j),y,z],.16,{c,a:.6})}}
  // a score as two bars on a white plinth: before (faint) and after, value out of 100
  function score(R,x,z,v0,v1,e,lab,c,a){if(a<=.01)return;const P=R.P,H=v=>v/100*1.25;R.box([x,-.04,z],[.82,.04,.36],{a,shadow:false});
    R.box([x-.19,0,z],[.26,H(v0),.22],{fill:mix(P.paper,P.ink,.14),a,shadow:false});const v=v0+(v1-v0)*e;
    R.box([x+.19,0,z],[.26,H(v),.22],{fill:mix(P.paper,c,.75),a,shadow:false});
    R.label([x-.19,H(v0),z],v0.toFixed(1),{fs:12,dy:-9,c:P.mute,a});R.label([x+.19,H(v),z],v.toFixed(1),{fs:12.5,b:1,dy:-9,c,a});R.label([x,0,z+.2],lab,{fs:12,dy:14,c,a,wide:1})}
  function flag(R,k,e){const P=R.P,A=i=>k===i?1:k===5?.55:k>i?.3:.14;
    // the pipe from checkpoint to checkpoint
    for(let i=1;i<6;i++){const a=k===i?1:k>i?.3:.12;R.box([(X[i-1]+X[i])/2,0,0],[X[i]-X[i-1]-1,.05,.1],{fill:mix(P.paper,P.ink,.2),a,shadow:false});
      if(k===i&&i<5)R.flow([[X[i-1]+.5,.25,0],[X[i]-.5,.25,0]],{c:P.ink,a:.55,r:.05,n:4})}
    // 0: the base model and its 36T tokens
    {const a=A(0),c=P.mute;model(R,X[0],0,'Qwen3 Base','36T tokens, §3',a,c);
      const L=[[30,'over 30T general',P.c1],[5,'about 5T reasoning',P.c3],[.9,'long context (not to scale)',P.c4]];let y=0;
      L.forEach(([t,n,cc])=>{const h=t/36*1.3;R.box([X[0],y,ZD],[.8,h,.5],{fill:mix(P.paper,cc,.45),a,shadow:y===0,lw:.6});if(k===0)R.label([X[0]+.42,y+h/2,ZD],n,{al:'left',dx:8,fs:12,c:cc,grp:'pre'});y+=h});
      if(k===0)R.flowArc([X[0],y,ZD+.1],[X[0],.72,-.2],.35,{c:P.c1,a:e,r:.06,n:6})}
    // 1: cold start
    {const a=A(1),c=P.c2;R.box([X[1],0,ZD],[.7,.16,.5],{fill:mix(P.paper,c,.6),a});model(R,X[1],0,'Stage 1','cold-start SFT',a,c);
      if(k===1){R.label([X[1],.16,ZD],'QwQ-32B traces, filtered (size not given)',{fs:12,dy:-11,c,b:1});R.flowArc([X[1],.2,ZD+.2],[X[1],.75,-.25],.3,{c,a:e,r:.055,n:5});
        row(R,X[1],ZR,e,P.ink);targets(R,X[1],ZR,e,c);R.label([X[1],0,ZR+.15],'a target token at every position',{fs:12,dy:16,c})}}
    // 2: reasoning RL with a verifier
    {const a=A(2),c=P.c5;R.box([X[2],0,ZD],[.9,.36,.48],{fill:mix(P.paper,c,.25),a});model(R,X[2],0,'Stage 2','reasoning RL, GRPO',a,P.c3);
      score(R,X[2]+1.05,.35,70.1,85.1,k===2?e:1,"AIME'24, 235B, 170 steps",P.c3,k===2?1:0);
      if(k===2){R.label([X[2],.36,ZD],'verifier · 3,995 problems',{fs:12,dy:-11,c,b:1});row(R,X[2],ZR,e,P.ink);
        const rb=[tokX(X[2],NT-1)+.38,.16,ZR];R.ball([rb[0],.12,rb[2]],.11,{c,a:e});R.glow([rb[0],.12,rb[2]],.3,{c,a:e*.7});
        R.flowArc([X[2]+.3,.5,.3],[X[2]+.3,.36,ZD+.2],.35,{c:P.ink,a:e*.7,r:.05,n:4});R.flowArc([X[2]-.3,.36,ZD+.2],[X[2]-.3,.5,.3],.35,{c,a:e,r:.06,n:4});
        R.flowArc([rb[0],.2,rb[2]],[X[2]+.45,.6,.3],.4,{c,a:e,r:.06,n:4});R.label([X[2],0,ZR+.15],'one reward per response',{fs:12,dy:16,c})}}
    // 3: thinking mode fusion: two streams into one checkpoint
    {const a=A(3),ct=P.c1,cn=P.c3;R.box([X[3]-.5,0,ZD],[.6,.5,.48],{fill:mix(P.paper,ct,.5),a});R.box([X[3]+.5,0,ZD],[.6,.3,.48],{fill:mix(P.paper,cn,.5),a});
      model(R,X[3],0,'Stage 3','thinking mode fusion',a,P.acc);score(R,X[3]+1.05,.35,AIME[0],AIME[1],k===3?e:1,"AIME'24, 32B",P.c2,k===3?1:0);
      if(k===3){R.label([X[3]-.5,.5,ZD],'/think',{fs:12.5,mono:true,dy:-11,c:ct,b:1});R.label([X[3]+.5,.3,ZD],'/no_think',{fs:12.5,mono:true,dy:-11,c:cn,b:1});
        R.flowArc([X[3]-.5,.5,ZD+.2],[X[3]-.15,.72,-.2],.3,{c:ct,a:e,r:.06,n:6});R.flowArc([X[3]+.5,.3,ZD+.2],[X[3]+.15,.72,-.2],.3,{c:cn,a:e,r:.06,n:4});
        for(let j=0;j<NT;j++)R.box([tokX(X[3],j),0,ZR-.18],[.2,.16,.2],{fill:mix(P.paper,j<1?P.mute:j<7?ct:P.c3,j<1?.3:.55),a:e,shadow:false,lw:.6});
        [0,1,2].forEach(j=>R.box([tokX(X[3],j),0,ZR+.22],[.2,.16,.2],{fill:mix(P.paper,j<1?P.mute:j<2?P.dim||P.line:P.c3,j===1?.1:.55),a:e,shadow:false,lw:.6,fa:j===1?.4:1}));
        R.label([X[3],0,ZR+.3],'long rows think; short rows keep an empty think block',{fs:12,dy:16,c:P.mute,wide:1})}}
    // 4: general RL with three kinds of reward
    {const a=A(4),c=P.c5,RW=[['rules',-.62],['judge + reference',0],['reward model',.62]];
      RW.forEach(([n,dx],i)=>{R.box([X[4]+dx,0,ZD],[.5,.3+.06*i,.42],{fill:mix(P.paper,c,.2+.15*i),a});if(k===4)R.label([X[4]+dx,.3+.06*i,ZD],n,{fs:12,dy:-10,c,grp:'rw'})});
      model(R,X[4],0,'Stage 4','general RL, 20+ tasks',a,P.c6);score(R,X[4]+1.05,.35,TF[0],TF[1],k===4?e:1,'ThinkFollow, 32B',P.c6,k===4?1:0);
      if(k===4){RW.forEach(([n,dx])=>R.flowArc([X[4]+dx,.38,ZD+.2],[X[4]+dx*.5,.72,-.2],.3,{c,a:e,r:.055,n:4}));row(R,X[4],ZR,e,P.ink);
        const rb=[tokX(X[4],NT-1)+.38,.12,ZR];R.ball(rb,.11,{c,a:e});R.glow(rb,.3,{c,a:e*.7});R.flowArc([rb[0],.2,rb[2]],[X[4]+.45,.6,.3],.4,{c,a:e,r:.06,n:4});R.label([X[4],0,ZR+.15],'one reward per response, from three kinds of grader',{fs:12,dy:16,c})}}
    // 5: released, sized by the cube root of total parameters
    {const a=k===5?1:.14,F=window.Q3_POST.flag;model(R,X[5]-.15,-.35,'Qwen3-235B-A22B',null,a,P.acc,[1.0,hcb(F[0]),.8]);model(R,X[5]+.6,.6,'Qwen3-32B',null,a,P.acc,[.8,hcb(F[1]),.6]);
      if(k===5){R.flowArc([X[4]+.5,.4,0],[X[5]-.6,.6,-.2],.3,{c:P.ink,a:e*.6,r:.05,n:4});R.label([X[5]+.2,0,1.25],'both modes, a budget dial, the teachers',{fs:12,dy:14,c:P.acc,b:1})}}
  }
  // ---- the six smaller models ----
  const STU=[['0.6B','Qwen3-0.6B'],['1.7B','Qwen3-1.7B'],['4B','Qwen3-4B'],['8B','Qwen3-8B'],['14B','Qwen3-14B'],['30B-A3B','Qwen3-30B-A3B']].map(([n,m],i)=>({n,b:par(m),x:-3.75+i*1.5}));
  const TX=[-1.3,1.4],TZ=-1.9,SZ=.5,S8=STU[3];
  function small(R,k,e){const P=R.P,F=window.Q3_POST.flag,ta=k===0||k===3?.3:1;
    model(R,TX[0],TZ,'Qwen3-235B-A22B','teacher',ta,P.acc,[1.0,hcb(F[0]),.8]);model(R,TX[1],TZ,'Qwen3-32B','teacher',ta,P.acc,[.8,hcb(F[1]),.6]);
    STU.forEach((s,i)=>{const cur=k===2||k===3?s===S8:true,a=cur?1:.25,h=hcb(s.b);R.box([s.x,0,SZ],[.8,h,.6],{fill:mix(P.paper,P.c3,.32),a});
      if(a>.5||k<2)R.label([s.x,h,SZ],s.n,{fs:12.5,b:1,dy:-11});
      if(k===1)TX.forEach((tx,t)=>R.flowArc([tx,t?hcb(F[1]):hcb(F[0]),TZ+.3],[s.x,h+.05,SZ-.1],.5,{c:P.c2,a:e*.75,r:.045,n:3}))});
    if(k===0)R.label([0,0,SZ+.35],'boxes sized by the cube root of total parameters',{fs:12,dy:16,c:P.mute,wide:1});
    if(k===1){R.label([0,1.6,TZ],"teachers' responses, /think and /no_think",{fs:12.5,b:1,c:P.c2});row(R,S8.x,1.55,e,P.c2);targets(R,S8.x,1.55,e,P.c2);R.label([S8.x,0,1.7],'a target token at every position, on text the student did not write',{fs:12,dy:16,c:P.c2,wide:1})}
    if(k===2){const zr=1.55,c=P.c4,sh=[1,.36,.2,.12,.06];row(R,S8.x,zr,e,P.c3);
      R.flowArc([S8.x,.2,zr-.2],[TX[1]-.2,hcb(F[1])*.6,TZ+.35],.7,{c:P.c3,a:e,r:.055,n:6});
      for(let j=0;j<NT;j++){const xj=tokX(S8.x,j),u=Math.max(0,Math.min(1,e*1.6-j*.08));if(u<=0)continue;
        for(let b=0;b<5;b++){const v=sh[(b+j)%5]*.5*u;R.box([xj-.08+b*.04,.18,zr],[.035,Math.max(.01,v),.12],{fill:mix(P.paper,c,.8),shadow:false,lw:.4})}}
      R.flowArc([TX[1]+.2,hcb(F[1])*.6,TZ+.35],[S8.x+.4,.6,zr-.1],.6,{c,a:e,r:.06,n:7});
      R.label([S8.x,.75,zr],"teacher's distribution at every position",{fs:12.5,b:1,dy:-8,c});R.label([S8.x,0,zr+.15],'student-written tokens · minimise KL(student ‖ teacher)',{fs:12,dy:16,c:P.c3,wide:1})}
    if(k===3){const z=1.5,gx=[-.85,-.35],H=v=>v/GH[0]*1.6;R.box([-.6,-.04,z],[1.05,.04,.4],{shadow:false});
      [[0,P.c5,'RL'],[1,P.c4,'on-policy']].forEach(([i,c,n])=>{const h=H(GH[i])*(i?1:1);R.box([gx[i],0,z],[.34,Math.max(.012,h*e),.26],{fill:mix(P.paper,c,.7),shadow:false});
        R.label([gx[i],h*e,z],GH[i].toLocaleString('en-GB'),{fs:12.5,b:1,dy:-9,c});R.label([gx[i],0,z+.2],n,{fs:12,dy:14,c})});
      R.label([gx[0]-.22,.8,z],'GPU hours, to scale',{al:'right',dx:-6,fs:12,c:P.mute});
      const sx=1.0,HA=v=>v/100*1.25;R.box([sx,-.04,z],[.82,.04,.36],{shadow:false});
      [[0,P.c5],[1,P.c4]].forEach(([i,c])=>{const bx=sx-.19+.38*i,h=HA(A21[i])*e;R.box([bx,0,z],[.26,Math.max(.012,h),.22],{fill:mix(P.paper,c,.75),shadow:false});R.label([bx,h,z],A21[i].toFixed(1),{fs:12.5,b:1,dy:-9,c})});
      R.label([sx,0,z+.2],"AIME'24, Qwen3-8B",{fs:12,dy:14,c:P.mute});
      R.flowArc([S8.x,.6,SZ],[gx[1],.3,z-.1],.4,{c:P.c4,a:e*.6,r:.045,n:3})}
  }
  function draw(R,k,e){R.grid(-6.6,6.6,-3,2.6,.5);if(M==='flag')flag(R,k,e);else small(R,k,e)}
  const FULL={flag:{cam:[.14,.92],bounds:[[-6.2,0,-2],[6.4,1.9,1.7]]},small:{cam:[.1,.68],bounds:[[-4.4,0,-2.5],[4.4,1.9,2]]}};
  const close=i=>({cam:[.32,.6],bounds:[[X[i]-1.4,0,-1.95],[X[i]+1.75,1.35,2.05]]});
  function view(k){if(M==='flag')return k>=1&&k<=4?close(k):k===0?{cam:[.22,.62],bounds:[[-6.4,0,-2],[-1.6,1.5,2]]}:innerWidth<520?{cam:[.95,.9],bounds:FULL.flag.bounds}:FULL.flag;
    return k===2?{cam:[.28,.55],bounds:[[-.4,0,-2.5],[2.6,1.4,2.1]]}:k===3?{cam:[.2,.55],bounds:[[-1.4,0,-.3],[2.6,1.9,2]]}:FULL.small}
  const stg=S3.stage({id:'stg-post',list:'sx-post-flag',fig:'Fig. 1 · post-training, the two routes',cam:FULL.flag.cam,bounds:st=>FULL[M].bounds,aspect:.6,dur:1500,hold:5200,draw,view,
    margin:w=>w<520?[14,10,14,10]:[18,16,16,16]});
  const seg=document.getElementById('postM');
  if(seg&&stg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(y=>{y.classList.toggle('on',y===b);y.setAttribute('aria-pressed',y===b?'true':'false')});
    M=b.dataset.m;['flag','small'].forEach(m=>{document.getElementById('sx-post-'+m).hidden=m!==M});stg.list('sx-post-'+M)}));
})();
