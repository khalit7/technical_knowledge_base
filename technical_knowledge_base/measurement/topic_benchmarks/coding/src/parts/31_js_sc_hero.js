// ---- Scene: Fig. 1, the hero (stg-hero, renderer v2): the pipeline a coding score comes from (task, model inside its harness, tests, score), then the
// same model with one lever changed at a time, each with its published pair: MBPP 95.5 against MBPP+ 80.2 (o1-preview, EvalPlus board), SWE-Bench Pro V2
// public 99.4 against private 81.6 (Claude Opus 5, Scale's V2 blog), Verified 46.8 against transformed 35.6 (GPT-5.4-mini, SchrodingerRepo Table I),
// Pro V1 public 23.3 at 200 turns against 41.8 at 250 turns uncapped (GPT-5, the Pro paper and Scale's V1 board). The values are the published ones
// cited in the caption beside the stage; the wall of tests (3 asserts, then 35 times as many) and the turn ticks (one per 10 turns) are drawn to scale. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3)return;
  const {mix,lerp,cl}=S3,win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  // [lever, model, as usually quoted, after the change, x of the pair]
  const PAIRS=[['tests','o1-preview',95.5,80.2,2.75],['split','Claude Opus 5',99.4,81.6,-3.0],['transform','GPT-5.4-mini',46.8,35.6,-3.0],['harness','GPT-5',23.3,41.8,-.1]];
  window.CBN=window.CBN||{};CBN.hero=PAIRS.map(p=>[p[1],p[2],p[3],+(p[3]-p[2]).toFixed(1)]);
  const XT=-4.5,XM=-1.55,XE=1.35,XS=4.55,BH=2.0,ZB=-.95;
  // which objects lead at each step (1) and which recede
  const VIS=[{t:1,m:1,e:1,s:1},{t:.22,m:.22,e:1,s:.22},{t:1,m:.22,e:.22,s:.22},{t:1,m:.22,e:.22,s:.22},{t:.22,m:1,e:.22,s:.22},{t:1,m:1,e:1,s:1}];
  function lab(R,p,t,o){const q=R.p(p);if((o.a!=null&&o.a<.15)||q[2]<=0||q[0]<-2||q[0]>R.W+2||q[1]<-2||q[1]>R.H+2)return;R.label(p,t,o)}
  // a stack of task cards
  function stack(R,x,n,a,o){o=o||{};const P=R.P;for(let i=0;i<n;i++){const sh=o.shift?(i%2?1:-1)*o.shift:0;
    R.box([x+sh,i*.13,0],[o.w||.8,.1,.62],{fill:o.fill||P.paper,a,shadow:i===0,lw:.7})}}
  // a pair of bars: pale as quoted, coloured after the change
  function pair(R,P,x,v0,v1,c,A,g,full,name){const h0=v0/100*BH*g,h1=v1/100*BH*g,dx=.2;
    R.box([x-dx,0,ZB],[.3,Math.max(.01,h0),.3],{fill:P.paper,fa:.55,a:A,shadow:false});
    R.box([x+dx,0,ZB],[.3,Math.max(.01,h1),.3],{fill:mix(P.paper,c,.6),a:A,shadow:false});
    const d=v1-v0,ds=(d>0?'+':'−')+Math.abs(d).toFixed(1);
    if(full){lab(R,[x-dx,h0,ZB],v0.toFixed(1),{mono:true,fs:12,dy:-10,c:P.mute,a:A*win(g,.6,1),al:'right',dx:4});
      lab(R,[x+dx,h1,ZB],v1.toFixed(1),{mono:true,fs:12,b:1,dy:-10,c,a:A*win(g,.6,1),al:'left',dx:-4});
      lab(R,[x,Math.max(h0,h1),ZB],ds+' points',{fs:12.5,b:1,dy:-30,c:P.acc,a:A*win(g,.7,1)});
      lab(R,[x,0,ZB+.15],name,{fs:12,b:1,dy:14,a:A*win(g,.4,1)})}
    else lab(R,[x,Math.max(h0,h1),ZB],ds,{mono:true,fs:12,b:1,dy:-10,c:P.acc,a:A*win(g,.5,1)})}
  function draw(R,k,e,st){const P=R.P;R.grid(-5.6,5.6,-2,1.6,.5);
    const pk=st&&st.pk!=null?st.pk:k,V=n=>lerp(VIS[pk][n],VIS[k][n],e);
    // the task: one stack, split in two at steps 3 and 4
    const aT=V('t'),sp=k===2||k===3?win(e,.1,.7):(pk===2||pk===3)&&k!==pk?1-win(e,0,.5):0,var2=k===3||(pk===3&&k!==3);
    stack(R,XT-.55*sp,5,aT);
    if(sp>.02){if(!var2){R.glass([XT+.55*sp-.48,.02,-.4],[.96,0,0],[0,.82,0],{c:P.c4,a:aT*sp,nu:4,nv:4});R.glass([XT+.55*sp-.48,.02,.4],[.96,0,0],[0,.82,0],{c:P.c4,a:aT*sp*.6,nu:4,nv:4});stack(R,XT+.55*sp,3,aT*sp,{w:.7})}
      else stack(R,XT+.55*sp,5,aT*sp,{shift:.09,fill:mix(P.paper,P.c3,.35)})}
    const tl=k===2?['public 642','private 272']:k===3?['500 as published','500 transformed']:null;
    if(tl&&sp>.5){lab(R,[XT-.55,.66,0],tl[0],{fs:12,b:1,dy:-10,a:aT*win(sp,.5,1)});lab(R,[XT+.55,var2?.66:.86,0],tl[1],{fs:12,b:1,dy:-10,c:var2?P.ink:P.c4,a:aT*win(sp,.5,1)})}
    else lab(R,[XT,.66,0],'the task',{b:1,dy:-10,a:aT});
    // the model inside its harness: a glass cage, wider when the harness allows more turns; one tick per 10 turns
    const aM=V('m'),gH=k===4?win(e,.15,.75):k===5?1:pk===4?1-win(e,0,.5):0,cw=lerp(1.3,1.3*250/200,gH),tk=Math.round(lerp(20,25,gH));
    R.box([XM,0,0],[.62,.72,.62],{fill:mix(P.paper,P.c1,.35),a:aM});lab(R,[XM,.72,0],'model',{b:1,dy:-10,a:aM});
    [[-1,0],[1,0]].forEach(([sx])=>R.glass([XM+sx*cw/2,.02,-cw/2],[0,0,cw],[0,.95,0],{c:P.c6,a:aM*.8,nu:3,nv:3}));
    R.glass([XM-cw/2,.02,-cw/2],[cw,0,0],[0,.95,0],{c:P.c6,a:aM*.55,nu:3,nv:3});
    for(let i=0;i<tk;i++){const x=XM-cw/2+.04+i*(cw-.08)/24;R.box([x,0,cw/2+.14],[.035,.12,.06],{fill:mix(P.paper,P.c6,.6),a:aM*(i<20?1:win(gH,.3,1)),shadow:false,lw:.5})}
    lab(R,[XM,0,cw/2+.2],gH>.5?'harness · 250 turns, no cost cap':'harness · 200 turns, cost cap',{fs:12,dy:14,c:k===4?P.c6:P.ink,b:k===4,a:aM});
    // the tests: three asserts a task, then MBPP+'s 35 times as many (a wall of 3 x 35 cubes)
    const aE=V('e'),gE=k===1?win(e,.1,.8):k>1?1:0,nE=Math.round(lerp(3,105,gE));
    for(let i=0;i<nE;i++){const c=i%15,r=Math.floor(i/15),isB=i<3;R.box([XE-.7+c*.1,r*.11,isB?.12:0],[.08,.09,.08],{fill:isB?mix(P.paper,P.good,.55):mix(P.paper,P.c2,.45),a:aE,shadow:false,lw:.45})}
    lab(R,[XE,.8,0],k===1&&gE>.5?'MBPP+ · 35x the tests':'the tests',{b:1,dy:-10,a:aE,c:k===1&&gE>.5?P.c2:P.ink});
    lab(R,[XE,0,.2],'3 asserts a task',{fs:12,dy:14,c:P.mute,a:aE*(k===1||k===0?1:.0),wide:1});
    // the score
    const aS=V('s');R.box([XS,0,0],[.5,BH*.5,.5],{fill:mix(P.paper,P.acc,.45),a:aS});lab(R,[XS,BH*.5,0],'the score',{b:1,dy:-10,a:aS});
    // flows along the pipeline (steps 1 and 6)
    const fa=(k===0?Math.min(1,e*1.6):k===5?win(e,.3,1):0)+((pk===0||pk===5)&&k!==pk?1-win(e,0,.4):0);
    if(fa>.02){R.flowArc([XT+.4,.45,0],[XM-.45,.5,0],.3,{c:P.c1,a:fa,n:6});R.flowArc([XM+.45,.55,0],[XE-.75,.4,.05],.3,{c:P.c2,a:fa,n:7});
      R.flowArc([XE+.8,.35,0],[XS-.3,.4,0],.3,{c:P.acc,a:fa,n:7});
      lab(R,[(XT+XM)/2,.9,0],'issue, prompt',{fs:12,c:P.c1,a:fa*(k===0?1:0),wide:1});lab(R,[(XM+XE)/2-.2,.95,0],'code',{fs:12,c:P.c2,a:fa*(k===0?1:0),wide:1});lab(R,[(XE+XS)/2+.3,.85,0],'pass or fail',{fs:12,c:P.acc,a:fa*(k===0?1:0),wide:1})}
    // the pairs: the step's own pair at full size; all four small at the last step
    const lv=[null,0,1,2,3,null];
    PAIRS.forEach((p,i)=>{let A=0,g=0,full=false,x=p[4];
      if(lv[k]===i){A=1;g=win(e,.2,.85);full=true}else if(lv[pk]===i&&k!==pk){A=1-win(e,0,.4);g=1;full=true}
      if(k===5){A=Math.max(A,win(e,.3,1));g=1;full=false;if(i===1)x=-3.85;if(i===2)x=-3.0}   // further apart and clear of the harness cage, so the two small pairs do not overlap
      if(A>.02){pair(R,P,x,p[2],p[3],i===3?P.c6:i===0?P.c2:P.c4,A,g,full,p[1]);
        if(full&&g>.2){const src=i===0?[XE,.6,-.3]:i===3?[XM+.3,.8,-.3]:[XT+.3,.6,-.2];R.flowArc(src,[x+.2,p[3]/100*BH*g+.05,ZB],.35,{c:i===3?P.c6:i===0?P.c2:P.c4,a:A*.7,n:6,r:.05})}}});
    if(k===5)lab(R,[XS,BH*.5,0],'same model, 11.2 to 18.5 points',{fs:12,c:P.acc,b:1,dy:-28,a:win(e,.4,1),wide:1});
  }
  const full={cam:[.24,.62],bounds:[[-5.3,0,-1.5],[5.1,2.0,1.4]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one model, one lever at a time',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[24,16,18,16],
    view:k=>k===0?{cam:[.24,.6],bounds:[[-5.3,0,-1.0],[5.1,1.1,1.3]]}:k===1?{cam:[.2,.5],bounds:[[.3,0,-1.4],[3.4,2.1,1]]}:k===2||k===3?{cam:[.24,.5],bounds:[[-5.4,0,-1.4],[-2.0,2.1,1]]}:k===4?{cam:[.24,.52],bounds:[[-2.9,0,-1.4],[.7,2.0,1.2]]}:null});
})();
