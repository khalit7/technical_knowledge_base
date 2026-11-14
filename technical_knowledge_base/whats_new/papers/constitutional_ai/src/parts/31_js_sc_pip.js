// ---- Scene: the two stages of Constitutional AI against HH RLHF, as one pipeline in 3D (renderer v2: a few large objects per step,
// the camera moving in close per step, flowing dots wherever samples or labels move, the constitution as two stacks of principle cards).
// Back lane (z < 0): stage 1, left to right. Front lane (z > 0): stage 2, right to left. Between them the two stacks of 16 cards.
// Every count is the page's (PAPER.rc from recompute.py, from §3.2 and §4.2); the principles drawn in stage 1 are the released
// grocery-store chain's (CAI.x.chains[57]: 1, 4, 8, 7); flow densities follow the counts. The soft label's 0.7 / 0.3 is illustrative. ----
(function(){
  if(!document.getElementById('stg-pip'))return;const {at,lerp,mix}=S3;
  const RC=PAPER.rc,CH=CAI.x.chains[57].steps.map(s=>s.p);
  let M='cai';
  const ZB=-1.5,ZF=1.5;                                      // the two lanes
  const XRT=-5.5,XHM=-3.8,XAN=-2.4,XRV=-1.2,XSL=2.6,XSS=-.9,XRS=1.3,XPR=3.7,XFB=1.6,XLB=-.1,XPM=-1.9,XPOL=-4.3;
  const CW=.8,CD=.55,CG=.062;                                 // principle cards: width, depth, spacing
  const dens=v=>Math.max(3,Math.round(v/RC.pm_ai*12));        // dots in proportion to how much moves (182,831 = 12 dots)
  function model(R,x,z,name,sub,a,o){o=o||{};if(a<=.01)return;const P=R.P,c=o.c||P.c1;
    R.box([x,0,z],[1.05,.72,.78],{fill:o.ghost?P.paper:mix(P.paper,c,o.t==null?.3:o.t),a,fa:o.ghost?.12:1,ea:o.ghost?.35:undefined});
    if(a>.95||o.ghost){R.label([x,.72,z],name,{fs:12.5,b:1,dy:-12,a:o.ghost?Math.max(.6,a):1,c:o.ghost?P.mute:P.ink});
    if(sub)R.label([x,.72,z],sub,{fs:12,dy:5,c:P.mute,wide:1})}}
  function people(R,x,z,a,n){if(a<=.01)return;const P=R.P;n=n||3;
    for(let i=0;i<n;i++){const px=x+(i-(n-1)/2)*.3,pz=z+(i%2)*.12;R.box([px,0,pz],[.17,.34,.13],{fill:mix(P.paper,P.c2,.55),a});R.ball([px,.46,pz],.1,{c:P.c2,a})}}
  function stack(R,x,z,a,hi,name){if(a<=.01)return;const P=R.P;
    for(let i=0;i<16;i++)R.box([x,i*CG,z],[CW,.034,CD],{fill:mix(P.paper,P.c4,i===hi?.75:.16),a,shadow:i===0,lw:.6});
    if(name&&a>.95)R.label([x,16*CG,z],name,{fs:12,dy:-12,c:P.c4,b:1})}
  const cardAt=(x,z,i)=>[x,i*CG,z];
  function flyCard(R,from,to,u,a,lbl){if(a<=.01)return;const P=R.P,p=R.arcPt(from,to,.7,u);
    R.box(p,[CW*.8,.034,CD*.8],{fill:mix(P.paper,P.c4,.55),a,shadow:false});R.glow([p[0],p[1]+.05,p[2]],.3,{c:P.c4,a:a*.6});if(lbl)R.label(p,lbl,{fs:12,c:P.c4,b:1,dy:-14,a})}
  function sheet(R,x,z,c,a,t){if(a<=.01)return;const P=R.P;R.box([x,0,z],[.44,.58,.06],{fill:mix(P.paper,c,t==null?.35:t),a});}
  function bars(R,x,z,vals,names,a,c,lab){if(a<=.01)return;const P=R.P;R.box([x,-.04,z],[1.1,.04,.42],{a,shadow:false});
    vals.forEach((v,i)=>{const bx=x+(i-.5)*.48,h=Math.max(.02,v*1.1);R.box([bx,0,z],[.3,h,.26],{fill:mix(P.paper,c,.6),a,shadow:false});if(lab)R.label([bx,h,z],names[i],{mono:true,fs:12,dy:-10,c})})}
  function draw(R,k,e){const P=R.P,cai=M==='cai';R.grid(-6.6,4.8,-3.4,3.4,.5);
    // composition: what a step is about at full strength, what came before receding, what comes later not there yet
    const A=s=>k===s?1:k>s?.28:0;
    const human=P.c2,ai=P.c1;
    // ---- stage 1 (back lane) ----
    // 1. the starting model, with the helpfulness labels people gave it
    model(R,XHM,ZB,cai?'helpful-only RLHF':'pretrained LM',cai?'human helpfulness labels only':'no human labels yet',(cai?k<=2:k<=1)?1:A(0),{c:cai?ai:P.mute,t:cai?.3:.12});
    if(cai){people(R,XHM,ZB-1.35,k===0?1:A(0)*.8);if(k===0)R.flowArc([XHM,.5,ZB-1.35],[XHM,.72,ZB-.2],.35,{c:human,a:e,r:.06,n:5})
      if(k===0)R.label([XHM,.6,ZB-1.35],'people: helpfulness labels',{fs:12,c:human,al:'right',dx:-40,a:e,wide:1})}
    // 2. red-team prompts in, a harmful answer out
    const a1=A(1);
    if(cai){for(let i=0;i<7;i++)R.box([XRT,i*.07,ZB],[.62,.04,.5],{fill:mix(P.paper,P.bad,.12),a:a1,shadow:i===0,lw:.6});
      if(k===1){R.label([XRT,.5,ZB],'red-team prompts',{fs:12,b:1,dy:-14});R.label([XRT,0,ZB+.25],'182,831',{mono:true,fs:12,dy:14,c:P.mute,wide:1})}}
    else{people(R,XRT,ZB,a1);if(k===1)R.label([XRT,.6,ZB],'crowdworkers red-team',{fs:12,b:1,dy:-12,c:human})}
    if(k===1){R.flow([[XRT+.3,.3,ZB],[XHM-.5,.35,ZB]],{c:cai?P.ink:human,a:e*.8,r:.06,n:4});R.flow([[XHM+.5,.35,ZB],[XAN-.2,.3,ZB]],{c:P.bad,a:e*.9,r:.06,n:3})}
    sheet(R,XAN,ZB,P.bad,cai&&k===2?.8:a1,.4);if(k===1||(cai&&k===2))R.label([XAN,.58,ZB],'harmful answer',{fs:12,dy:-11,c:P.bad,wide:1});
    // 3. critique and revise against principles drawn from the first stack (CAI), or nothing at all (HH RLHF)
    const a2=A(2);
    if(cai){const sa=k<2?0:k===2?1:.3;stack(R,XSS,0,sa,k===2?CH[Math.min(3,Math.floor(e*4))]:-1,'16 critique and revision principles');
      const r=k===2?Math.min(3,Math.floor(e*4)):3,u=k===2?Math.min(1,e*4-r):1;
      for(let j=0;j<4;j++){const aj=k===2?(j<r?1:j===r?u:0):a2;R.box([XRV+j*.42,0,ZB+.18-.12*j],[.3,.5,.05],{fill:mix(P.paper,P.c3,.25+.12*j),a:aj})}
      if(k===2){flyCard(R,cardAt(XSS,0,CH[r]),[XRV+r*.42,.62,ZB],u,1,'principle '+CH[r]);
        if(e>=1){R.flowArc([XSS,1,0],[XRV+1.3*.42,.62,ZB],.4,{c:P.c4,a:.8,r:.055,n:6});R.flow([[XAN+.25,.3,ZB],[XRV+3*.42+.3,.3,ZB]],{c:P.c3,a:.9,r:.06,n:5})}
        R.label([XRV+.63,0,ZB+.3],'4 revisions',{fs:12,b:1,dy:14,a:e,c:P.c3})}
      }
    else if(k>=2){const g=k===2?e:.5;R.quad([[XRV-.35,0,ZB-.45],[XRV+1.6,0,ZB-.45],[XRV+1.6,0,ZB+.45],[XRV-.35,0,ZB+.45]],{a:g,dash:[5,4],ec:P.mute,lw:1.2});
      R.label([XRV+.63,0,ZB],'no critique step',{fs:12.5,c:P.mute,b:k===2,a:Math.max(.5,g)})}
    // 4. fine-tune a pretrained model on the revisions plus helpfulness samples: SL-CAI (no such stage in HH RLHF)
    const a3=A(3);
    if(cai){model(R,XSL,ZB,'SL-CAI','fine-tuned, 1 epoch',k===4?1:a3,{c:P.c3,t:.3});
      if(k===3){R.flow([[XRV+1.5,.32,ZB],[XSL-.55,.36,ZB]],{c:P.c3,a:e,r:.06,n:dens(RC.sl_revisions)});
        R.flowArc([XHM+.3,.72,ZB-.1],[XSL-.3,.72,ZB-.1],.55,{c:P.c1,a:e*.85,r:.05,n:dens(RC.sl_help_samples)});
        R.label([XRV+.63,.5,ZB],'731,324 revisions',{fs:12,c:P.c3,dy:-14,a:e,b:1});R.label([XHM+2.3,1.1,ZB],'270,592 helpfulness samples',{fs:12,c:P.c1,dy:-6,a:e})}}
    else if(k>=3)model(R,XSL,ZB,'no SL stage','',k===3?Math.max(.4,e):.45,{ghost:1});
    // ---- stage 2 (front lane) ----
    // 5. two answers per prompt
    const a4=k===5?1:A(4),src=cai?[XSL,.6,ZB]:[XHM,.6,ZB];
    sheet(R,XPR-.3,ZF,P.ink,a4,.06);sheet(R,XPR+.3,ZF,P.ink,a4,.06);if(k===4||k===5){R.label([XPR-.3,.58,ZF],'A',{fs:13,b:1,dy:-10});R.label([XPR+.3,.58,ZF],'B',{fs:13,b:1,dy:-10})}
    if(k===4){[-.3,.3].forEach(dx=>R.flowArc(src,[XPR+dx,.6,ZF],cai?.6:1.1,{c:P.ink,a:e*.7,r:.055,n:6}));R.label([XPR,.6,ZF],cai?'two answers from SL-CAI':'two answers per turn',{fs:12,dy:-28,a:e,b:1})}
    // 6. the judge: a feedback model reading a principle from the second stack (CAI), or a person (HH RLHF)
    const a5=A(5);
    if(cai){const sa=k<5?0:k===5?1:.3,hi=k===5?15:-1;stack(R,XRS,0,sa,hi,'16 labelling principles');
      model(R,XFB,ZF,'feedback model','pretrained LM, multiple choice',a5,{c:ai});
      if(k===5)flyCard(R,cardAt(XRS,0,15),[XFB-.2,.78,ZF-.25],e,1,e>=1?null:'1 of 16, at random')}
    else{people(R,XFB,ZF,a5);if(k===5)R.label([XFB,.62,ZF],'crowdworker picks',{fs:12,b:1,dy:-12,c:human})}
    if(k===5){[-.3,.3].forEach(dx=>R.flow([[XPR+dx,.3,ZF],[XFB+.55,.35,ZF]],{c:P.ink,a:e*.7,r:.05,n:4}));R.flow([[XFB-.55,.35,ZF],[XLB+.6,.3,ZF]],{c:cai?ai:human,a:e,r:.06,n:4})}
    bars(R,XLB,ZF,cai?[.7,.3]:[1,0],cai?['P(A) .7','P(B) .3']:['A: 1','B: 0'],k===6?1:a5,cai?ai:human,k===5);
    if(k===5)R.label([XLB,0,ZF+.3],cai?'soft label (illustrative)':'hard label: one is picked',{fs:12,dy:14,a:a5,c:P.mute,wide:1});
    // 7. the preference model on both kinds of label, then RL against it
    const a6=A(6);
    model(R,XPM,ZF,'preference model',cai?'57% of its labels from a model':'all labels from people',a6,{c:P.c5,t:.35});
    people(R,XPM,ZF+1.4,a6*.95);
    model(R,XPOL,ZF,cai?'RL-CAI':'HH RLHF',cai?'RL starts from SL-CAI':'RL starts from the pretrained LM',a6,{c:cai?P.c3:P.c2,t:.3});
    if(k===6){const nh=cai?dens(RC.pm_ai):dens(44849);R.flow([[XLB-.4,.35,ZF],[XPM+.55,.35,ZF]],{c:cai?ai:human,a:e,r:.065,n:nh});
      R.flowArc([XPM,.5,ZF+1.4],[XPM,.72,ZF+.3],.3,{c:human,a:e,r:.06,n:dens(RC.pm_human)});
      R.flowArc([XPM-.5,.6,ZF],[XPOL+.5,.6,ZF],.45,{c:P.c5,a:e,r:.06,n:5});R.flowArc([XPOL+.5,.3,ZF+.1],[XPM-.5,.3,ZF+.1],.0,{c:P.ink,a:e*.5,r:.045,n:4});
      R.label([XPM+1.1,0,ZF+.5],cai?'182,831 AI harmlessness':'44,849 human harmlessness',{fs:12,c:cai?ai:human,dy:14,a:e,grp:'pm'});
      R.label([XPM,.5,ZF+1.4],'135,296 human helpfulness',{fs:12,c:human,al:'left',dx:30,a:e,grp:'pm'});
      R.label([lerp(XPM,XPOL,.5),1.2,ZF],'reward',{fs:12,c:P.c5,dy:-10,a:e,wide:1});
}
  }
  // (lane names are drawn by drawLanes on the last step)
  // counters: which labels each pipeline consumes (the page's numbers; HH RLHF's from the released harmless-base split)
  const box=(l,v,d)=>'<div class="stat"><div class="k">'+l+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  function counters(k){const f=(v,s)=>k>=s?fmt(v):'0',el=document.getElementById('pipCnt');if(!el)return;
    el.innerHTML='<div class="grid">'+(M==='cai'?box('Human harmlessness labels','0','none at any step')+box('AI harmlessness labels',f(RC.pm_ai,5),'one per red-team prompt')+box('Human helpfulness labels',f(RC.pm_human,6),'in the PM')+box('Principles written',fmt((k>=2?16:0)+(k>=5?16:0)),'16 for critiques, 16 for labels')
      :box('Human harmlessness labels',f(44849,5),'released harmless-base split')+box('AI harmlessness labels','0','')+box('Human helpfulness labels',k>=6?'yes':'0','count not given for this PM')+box('Principles written','0','the objective lives in the labels'))+'</div>'}
  const full={cam:[.22,.72],bounds:[[-6.4,0,-3.2],[4.5,1.3,3.2]]};
  const V=[{cam:[.35,.62],bounds:[[-6.2,0,-3.2],[-1.4,1.1,-.4]]},{cam:[.3,.62],bounds:[[-6.1,0,-2.4],[-1.7,1.1,-.6]]},{cam:[.25,.6],bounds:[[-4.4,0,-2.4],[1,1.3,.6]]},
    {cam:[.22,.62],bounds:[[-4.3,0,-2.4],[3.4,1.3,-.5]]},{cam:[-.15,.66],bounds:[[1.6,0,-2.1],[4.3,1.2,2.1]]},{cam:[-.05,.62],bounds:[[-.8,0,-.6],[4.3,1.3,2.2]]},{cam:[.3,.62],bounds:[[-5.1,0,.5],[.7,1.2,3.3]]}];
  const PH=[.6,.2];                                           // phones: turn the lanes into depth so the objects are larger in the tall card
  const stg=S3.stage({id:'stg-pip',list:'sx-pip-cai',fig:'Fig. 1 · two stages, one constitution',cam:full.cam,bounds:full.bounds,aspect:.6,dur:2000,hold:5200,draw,
    view:k=>innerWidth<520?{cam:[V[k].cam[0]+PH[0],V[k].cam[1]+PH[1]],bounds:V[k].bounds}:V[k],margin:w=>w<520?[14,8,14,8]:[18,14,16,14],onStep:k=>counters(k)});
  // the mode toggle swaps the step list and replays the same scene the other way
  const seg=document.getElementById('pipM');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    M=b.dataset.m;['cai','rlhf'].forEach(m=>{const l=document.getElementById('sx-pip-'+m);if(l)l.hidden=m!==M});stg.list('sx-pip-'+M)}));
})();
