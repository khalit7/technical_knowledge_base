// ---- Scene: Fig. 2, who decides what to read, in seven steps (renderer v2). The same three things on every step (the question, a corpus,
// the model with its prompt in front of it); what changes is who chooses what goes into the prompt. The bars are measured F1 on the topic's
// 200 two-hop HotpotQA questions (Qwen3-1.7B and Qwen3-4B; Agentic retrieval, long context and memory), shown only for the four strategies run
// on that set; the outlines are the fixed pipeline (steps 2 and 3) and the question's own 10 paragraphs (step 4). The step list is sx-who (20_read_d.html). ----
(function(){
  if(!document.getElementById('stg-who'))return;const {at,mix,lerp}=S3;
  const QU=[-3.9,0,.95],CO=[-1.25,0,-1.05],PR=[1.0,0,1.05],MO=[2.75,0,-.25],GATE=[-2.45,0,.95];
  const BX=[3.75,4.6],BZ=1.55,BH=2.4;                       // the two F1 bars: x positions, depth, height of F1 = 1
  // [Qwen3-1.7B, Qwen3-4B] F1 per step; null: not on this set. Ghost outlines: what the step is compared with.
  const F1=[[.402,.490],[.411,.574],[.444,null],[.320,.475],null,null,null];
  const GHOST=[null,[.402,.490],[.402,null],[.456,.576],null,null,null];
  const top=(p,h)=>[p[0],p[1]+h,p[2]];
  function draw(R,k,e){const P=R.P,fa=Math.min(1,e*1.6),cq=P.acc,cm=P.c2;R.grid(-4.6,5.2,-2.3,2.5,.5);
    // the question
    R.ball(top(QU,.3),.17,{c:cq});R.label(top(QU,.5),'question',{fs:12.5,b:1,c:cq,dy:-10});
    // the model, which writes the answer from its prompt
    R.box(MO,[1.0,.6,.9],{fill:mix(P.paper,cm,.42)});R.label(top(MO,.6),'model',{fs:12.5,b:1,c:cm,dy:-10});
    // the corpus: a stack of passages; it moves into the window at step 4, becomes a graph's source at 5, a table at 6, the agent's own past at 7
    const slide=k===3?e:0,ca=k===4?.3:k===5?0:1,cc=k===6?P.c4:P.c3;
    for(let i=0;i<8;i++){const p=[lerp(CO[0],PR[0],slide),i*.075,lerp(CO[2],PR[2]-.05,slide)];if(k===3&&e>=1)p[1]=i*.075+.4;
      R.box(p,[1.45,.06,1.0],{fill:mix(P.paper,cc,.25+.04*i),a:k===5?(1-fa)*.6:ca,shadow:i===0,lw:.6})}
    const clab=k===6?"the agent's own past":k===5?'':k===3?'':'corpus · 9,760 paragraphs';
    if(clab&&k!==4)R.label(top(CO,.62),clab,{fs:12.5,b:1,c:cc,dy:-10});
    // the prompt in front of the model: how many passages it reads
    const np=k===1?Math.round(5+10*e):k===3?0:5,pa=k===3?0:k===5?.35:1;
    for(let i=0;i<np;i++)R.box([PR[0],i*.05,PR[2]],[.9,.04,.6],{fill:mix(P.paper,cq,.35),a:pa,shadow:i===0,lw:.5});
    R.label(top(PR,Math.max(.2,(k===3?8*.075+.4:np*.05))+.05),k===1?'prompt grows: about 3× the tokens':k===3?'everything in the window':'prompt',{fs:12.5,b:k===1||k===3,c:cq,dy:-10});
    R.flowArc(top(PR,.3),top(MO,.35),.3,{c:cq,a:.55,r:.055,n:5,speed:1.1});
    // step-specific paths
    if(k===0){R.flowArc(top(QU,.3),top(CO,.6),.4,{c:cq,a:fa,r:.07,n:8,speed:1.2});R.flowArc(top(CO,.6),top(PR,.3),.45,{c:P.c3,a:fa,r:.07,n:9,speed:1.2});
      R.label([(QU[0]+CO[0])/2,.95,(QU[2]+CO[2])/2],'one search, top 5',{fs:12.5,b:1,c:P.ink,a:fa})}
    if(k===1){R.flowArc(top(QU,.3),top(MO,.6),.9,{c:cq,a:fa*.6,r:.06,n:10,speed:1.2});
      [.5,.85,1.2].forEach((h,i)=>{const a=fa*Math.min(1,Math.max(0,e*3-i*.6));R.flowArc(top(MO,.6),top(CO,.6),h,{c:cm,a,r:.06,n:9,speed:1.3});R.flowArc(top(CO,.6),top(PR,.3),h*.6,{c:P.c3,a,r:.06,n:7,speed:1.2})});
      R.label([(MO[0]+CO[0])/2,1.75,(MO[2]+CO[2])/2],'the model writes each search',{fs:12.5,b:1,c:cm,a:fa})}
    if(k===2){R.glass([GATE[0],0,GATE[2]-.6],[0,0,1.2],[0,.9,0],{c:P.c5,a:fa,nu:3,nv:3});R.label([GATE[0],.9,GATE[2]],'router',{fs:12.5,b:1,c:P.c5,dy:-10,a:fa});
      R.flowArc(top(QU,.3),[GATE[0],.4,GATE[2]],.2,{c:cq,a:fa,r:.06,n:5,speed:1.1});
      R.flowArc([GATE[0],.45,GATE[2]],top(CO,.6),.4,{c:cq,a:fa,r:.06,n:8,speed:1.2});R.flowArc(top(CO,.6),top(PR,.3),.45,{c:P.c3,a:fa,r:.06,n:8,speed:1.2});
      R.flowArc([GATE[0],.45,GATE[2]],top(MO,.6),1.0,{c:cm,a:fa*.7,r:.06,n:12,speed:1.2});
      R.label([GATE[0]+.2,1.45,GATE[2]],'comparison word → agent loop',{al:'left',fs:12.5,c:cm,a:fa,wide:1})}
    if(k===4){const nodes=[[-.55,.15],[.05,-.3],[.5,.2],[-.15,.5],[.6,-.35],[-.7,-.3],[.15,.05]].map(([x,z])=>[CO[0]+x,1.15,CO[2]+z]);
      [[0,1],[1,2],[0,3],[2,3],[1,4],[0,5],[6,1],[6,2],[6,3]].forEach(([i,j])=>R.line([nodes[i],nodes[j]],{c:P.c4,w:1.6,a:fa}));
      nodes.forEach(p=>R.ball(p,.08,{c:P.c4,a:fa}));
      R.flow([top(CO,.62),[CO[0],1.05,CO[2]]],{c:P.c4,a:fa,r:.055,n:4,speed:.8});
      R.label([CO[0],1.15,CO[2]],'graph and summaries, built before any question',{fs:12.5,b:1,c:P.c4,dy:-26,a:fa});
      R.flowArc([CO[0]+.4,1.15,CO[2]],top(PR,.3),.4,{c:P.c4,a:fa,r:.06,n:8,speed:1.1})}
    if(k===5){for(let r=0;r<3;r++)for(let c=0;c<4;c++)R.box([CO[0]-.6+c*.4,0,CO[2]-.35+r*.35],[.36,.12+(r===0?.06:0),.3],{fill:r===0?mix(P.paper,P.c5,.5):mix(P.paper,P.c5,.18),a:fa,shadow:false,lw:.6});
      R.label(top(CO,.3),'tables',{fs:12.5,b:1,c:P.c5,dy:-12,a:fa});
      R.flowArc(top(MO,.6),top(CO,.25),.7,{c:cm,a:fa,r:.06,n:10,speed:1.2});R.label([(MO[0]+CO[0])/2,1.1,(MO[2]+CO[2])/2],'SQL',{mono:true,fs:13,b:1,c:cm,a:fa});
      R.flowArc(top(CO,.25),top(MO,.5),.35,{c:P.c5,a:fa*.8,r:.06,n:7,speed:1.2})}
    if(k===6){R.flowArc(top(MO,.6),top(CO,.62),.75,{c:cm,a:fa,r:.06,n:10,speed:1.2});R.flowArc(top(CO,.62),top(PR,.3),.45,{c:P.c4,a:fa,r:.06,n:8,speed:1.2});
      R.label([(MO[0]+CO[0])/2,1.25,(MO[2]+CO[2])/2],'write, update, expire',{fs:12.5,b:1,c:cm,a:fa})}
    // the measured F1 bars, for the four strategies run on the same 200 questions
    const f=F1[k],g=GHOST[k],ba=f?(k===0?Math.max(.3,fa):1):0;
    if(f||k===4&&e<1){const ff=f||F1[3],aa=f?ba:1-fa;
      R.label([BX[1]+.3,0,BZ],'F1 · 200 two-hop questions',{al:'right',fs:12,c:P.mute,dy:30,a:aa,wide:1});
      [0,1].forEach(i=>{const v=ff[i];if(v==null)return;const c=i?P.c6:P.c1;
        R.box([BX[i],0,BZ],[.5,v*BH,.5],{fill:mix(P.paper,c,.55),a:aa});R.label([BX[i],v*BH,BZ],v.toFixed(3),{mono:true,fs:12.5,b:1,c,dy:-11,a:aa});
        R.label([BX[i],0,BZ],i?'4B':'1.7B',{mono:true,fs:12,c:P.mute,dy:13,a:aa})});
      if(g&&f)[0,1].forEach(i=>{if(g[i]==null)return;R.box([BX[i],0,BZ],[.58,g[i]*BH,.58],{fill:P.paper,a:1,fa:.05,shadow:false,ec:P.ink,lw:1.2,ea:.9})})}
  }
  const full={cam:[.12,.85],bounds:[[-4.2,0,-1.8],[4.95,.8,2.1]]};
  S3.stage({id:'stg-who',list:'sx-who',fig:'Fig. 2 · who decides what goes into the prompt',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1400,hold:5200,draw,
    margin:w=>w<520?[16,10,14,10]:[22,14,18,14]});
})();
