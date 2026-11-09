// ---- Scene: Fig. 3 (stg-ag, renderer v2): AgentHarm, what the agent says (the transcript plate, read by the refusal judge) against what it does
// (the environment plate, read by the task rubrics). Steps 1 and 2 are a schematic of the harness (no real transcript is drawn); steps 3 to 5 are the
// paper's numbers from window.SHD.ah (arXiv 2410.09024 v3, Tables 2 and 3, public test): a butterfly on the floor, refusal growing to the left of each model's name and harm score to the right. ----
(function(){
  if(!document.getElementById('stg-ag')||!window.S3||!window.SHD)return;
  const {mix,lerp,cl}=S3,A=window.SHD.ah;
  const XL=-2.6,XR=2.6,ZP=-2.1,ZJ=-1.05,RZ=[.05,.8,1.55,2.3];
  (window.SHN=window.SHN||{}).ag=A.map(r=>r.slice());
  function draw(R,k,e){const P=R.P,cS=P.c1,cD=P.bad,nar=R.W<520,la=k<=1?1:0; // la: the harness labels show only while the harness is the subjectR.grid(-5,5,-2.8,2.8,.5);
    const pa=k<=1?1:.28;
    // the agent and its two records
    R.box([0,0,ZP],[.8,.8,.6],{fill:mix(P.paper,P.acc,.25),a:pa});R.label([0,.8,ZP],'agent',{fs:12.5,b:1,dy:-10,a:la});
    R.glass([XL-1,.08,ZP],[2,0,0],[0,1.25,0],{c:cS,a:pa,nu:1,nv:5});
    R.glass([XR-1,.08,ZP],[2,0,0],[0,1.25,0],{c:P.c6,a:pa,nu:4,nv:3});
    R.label([XL,1.33,ZP],nar?'transcript':'transcript · what it says',{fs:12.5,b:1,c:cS,dy:-8,a:la});R.label([XR,1.33,ZP],nar?'environment':'environment · what it does',{fs:12.5,b:1,c:P.c6,dy:-8,a:la});
    const g0=k===0?e:1;
    // messages: bars filling the transcript plate one by one (schematic lengths)
    [1.6,1.1,1.45,.8].forEach((w,i)=>{const t=cl(g0*4-i,0,1);R.box([XL-1+.15+w*t/2,1.03-i*.25,ZP+.06],[w*t,.12,.04],{fill:mix(P.paper,cS,.55),a:pa*t,shadow:false,lw:.4})});
    // tool state: cells of the environment switching on as tool calls land (schematic)
    for(let r=0;r<3;r++)for(let c=0;c<4;c++){const j=r*4+c,on=[0,2,5,6,9,11].includes(j),t=cl(g0*6-j/2,0,1);
      R.box([XR-1+.25+c*.5,.2+r*.4,ZP+.06],[.3,.26,.04],{fill:on?mix(P.paper,P.c6,.4+.45*t):mix(P.paper,P.line,.3),a:pa,shadow:false,lw:.4})}
    if(k<=1){R.flowArc([-.4,.55,ZP],[XL+1,.7,ZP],.35,{c:cS,a:.85,r:.06,n:6});R.flowArc([.4,.55,ZP],[XR-1,.6,ZP],.35,{c:P.c6,a:.85,r:.06,n:6})}
    // the two graders
    const ja=k===1?e:k>1?.5:0;
    if(ja>0){[[XL,'refusal judge · all messages',cS],[XR,'rubric · did the tool calls do the task',P.c6]].forEach(([x,t,c])=>{R.box([x,0,ZJ],[.9,.36,.5],{fill:mix(P.paper,c,.3),a:ja});R.label([x,.36,ZJ],nar?t.split(' · ')[0]:t,{fs:12,dy:-10,c,a:ja*la});
      if(k===1)R.flow([[x,.9,ZP+.08],[x,.6,ZP+.5],[x,.4,ZJ-.1]],{c,a:ja*.9,r:.06,n:6})})}
    // the paper's numbers: one row per model, lying on the floor as a butterfly: refusal grows to the left of the name, harm score to the right
    if(k>=2){const t=k===2?e:1,X0=1.15,LEN=3/100,TH=.22;
      A.forEach((r,i)=>{const z=RZ[i],two=r[5]!=null,dim=k===4&&!two?.2:1;
        const ref=k===2?r[2]:k===3?lerp(r[2],r[4],e):r[4],harm=k===2?r[1]:k===3?lerp(r[1],r[3],e):lerp(r[3],two?r[5]:r[3],e);
        const lr=Math.max(.02,ref*LEN*t),lh=Math.max(.02,harm*LEN*t),ra=dim*(k===4?.35:1);
        R.box([-X0-lr/2,0,z],[lr,TH,.4],{fill:mix(P.paper,cS,.7),a:ra,shadow:false});R.label([-X0-lr,TH,z],ref.toFixed(1)+'%',{mono:true,fs:12.5,b:1,al:'right',dx:-6,c:cS,a:ra*t});
        R.box([X0+lh/2,0,z],[lh,TH,.4],{fill:mix(P.paper,cD,.75),a:dim,shadow:false});R.label([X0+lh,TH,z],harm.toFixed(1)+'%',{mono:true,fs:12.5,b:1,al:'left',dx:6,c:cD,a:dim*t});
        R.label([0,0,z],nar?r[0].replace('Claude 3.5 Sonnet','Claude 3.5').replace('Gemini 1.5 Pro','Gemini 1.5').replace('Mistral Large 2','Mistral L2'):r[0],{fs:12.5,b:k===4&&two,a:dim,c:P.ink});
        if(k===4&&two){const lb=r[6]*LEN*e;R.box([X0+lb/2,0,z+.3],[Math.max(.02,lb),TH*.6,.16],{fill:mix(P.paper,P.mute,.35),shadow:false,a:e});
          R.label([X0+lb,TH*.6,z+.3],'twin '+r[6]+'%',{fs:12,al:'left',dx:6,c:P.mute,a:e,wide:1})}
        if(k===2)[[-X0-.3,cS],[X0+.3,P.c6]].forEach(([x,c])=>R.flow([[x*1.9,.3,ZJ+.25],[x,.25,z]],{c,a:.5*e,r:.045,n:3}))});
      R.label([-X0-1.5,0,RZ[0]-.45],nar?'refusal':'refusal rate · what it says',{fs:12.5,c:cS,b:1,dy:-6,a:t});
      R.label([X0+1.5,0,RZ[0]-.45],nar?'harm score':k===4?'harm score, tasks not refused':'harm score · what it does',{fs:12.5,c:cD,b:1,dy:-6,a:t});
      if(k>=3)R.label([0,0,RZ[3]+.5],k===3?'with the jailbreak template':'with the template, tasks not refused',{fs:12.5,b:1,dy:14,c:P.ink,a:k===3?e:1})}
  }
  const full={cam:[0,.95],bounds:[[-4.6,0,-2.4],[4.6,1.2,2.9]]};
  S3.stage({id:'stg-ag',list:'sx-ag',fig:'Fig. 3 · AgentHarm, public test',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,24,8]:[18,14,28,14],
    view:k=>k<=1?{cam:[0,.5],bounds:[[-4.1,0,-2.5],[4.1,1.45,-.6]]}:full});
})();
