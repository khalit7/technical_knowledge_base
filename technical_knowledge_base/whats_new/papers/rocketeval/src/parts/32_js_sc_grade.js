// ---- Scene: one released WildBench grading through RocketEval and through the CoT judge (2026-11-13, renderer v2; replaces the 2D
// before/after animation of 13_js_anim.js). Data: REL.samples[1] (Llama 3 8B's answer to a poem request; GPT-4o's checklist of 7 items,
// the Qwen2.5-3B judge's P(Yes)/(P(Yes)+P(No)) per item, GPT-4o's grade 8), WildBench's mean prompt of 3,402 tokens (Table 5), the mean
// CoT output of 232 tokens (GPT-4o's released gradings), Figure 5's flip rates for Qwen2-1.5B (decoded from the vector PDF).
// RocketEval: seven lanes off one cached prefix, never crossing; CoT: one lane, a chain of judgments each reading all earlier ones.
(function(){
  if(!document.getElementById('stg-grade'))return;const {at,off,lerp,mix,cl}=S3;
  const S=REL.samples[1],P3=S.p3,K=P3.length,PROMPT=3402,GEN=232,F5=REL.fig.pos['Qwen2-1.5B'];
  const mean=P3.reduce((a,b)=>a+b,0)/K,score=9*mean+1;
  // one or two words per released item, for the labels under the bars (the full items are in the replay below the stage)
  const SH=['stanzas','tone','structure','grammar','progress','vocabulary','transition'];
  window.RKGRADE={p:P3,mean,score,g:S.g,prompt:PROMPT,gen:GEN,f5:F5,k:K};
  let mode='re';
  // items side by side along x; the pipeline runs towards the reader along z: prefix (to scale in depth), questions, answers, bars
  const x=i=>(i-3)*1.1,L=2.4,sc=L/PROMPT,Z0=-3.3,ZE=Z0+L,ZT=ZE+.45,ZA=ZT+.8,ZB=ZA+.95,XS=4.4,XG=5.6,XO=-4.5;
  function lab(R,i,a){R.label([x(i),0,ZB+.3],(i+1)+' '+SH[i],{fs:12,dy:i%2?30:14,c:R.P.ink,a,wide:1});R.label([x(i),0,ZB+.3],String(i+1),{fs:12,b:1,dy:14,c:R.P.mute,a:R.W<520?a:0})}
  function drawRE(R,k,e){const P=R.P;
    // 1. GPT-4o writes the checklist: seven glass tiles, once per query
    const ga=k===0?1:.25;
    R.box([XO,0,Z0+.3],[1.0,.8,.9],{fill:mix(P.paper,P.c2,.45),a:ga});R.label([XO,.8,Z0+.3],'GPT-4o',{fs:13,b:1,dy:-12,c:P.c2,a:ga});
    for(let i=0;i<K;i++){const ai=k===0?cl(e*1.7-i*.1,0,1):1,dim=k>=3?.3:1;
      R.glass([x(i)-.3,.2,ZT-.2],[.6,0,0],[0,0,.4],{c:P.c2,nu:1,nv:1,a:ai*dim});
      if(k===0)R.flow([[XO+.5,.6,Z0+.3],[x(i)*.5-1,.7,ZT-1],[x(i),.24,ZT]],{c:P.c2,a:ai*.9,r:.055,n:5,speed:1.4});
      lab(R,i,k===0?ai:k>=3?1:.8)}
    // 2. the prefix: query + response, 3,402 tokens deep, prefilled once and shared by every lane
    if(k>=1){const a=at(k,e,1),dim=k>=3?.3:1;
      R.box([0,0,Z0+L*a/2],[K*1.1-.2,.22,Math.max(.01,L*a)],{fill:mix(P.paper,P.acc,.18),a:dim});
      R.label([0,.22,Z0],'query + response · 3,402 tokens · prefilled once, cached',{mono:true,fs:12,dy:-12,c:P.mute,a:a*dim,wide:1});
      if(k===1)for(const xx of [-2.4,0,2.4])R.flow([[xx,.26,Z0+.05],[xx,.26,ZE]],{c:P.acc,a:.8,r:.07,speed:1.6})}
    // 3. seven separate calls: dots run down each lane from the shared prefix through its question to one answer token, never across
    if(k>=2){const a=at(k,e,2);
      for(let i=0;i<K;i++){const yes=P3[i]>.5,dim=k>=3?.3:1;
        R.box([x(i),0,ZA],[.42,.24,.34],{fill:mix(P.paper,yes?P.good:P.bad,.35),a:a*dim,shadow:false});
        R.label([x(i),.24,ZA],yes?'Yes':'No',{fs:12,b:1,dy:-9,c:yes?P.good:P.bad,a:k>=3?0:a});
        if(k===2)R.flow([[x(i),.27,ZE-.8],[x(i),.27,ZT],[x(i),.26,ZA]],{c:P.c1,a,r:.06,n:5,speed:1.2})}}
    // 4. the probabilities as bars on white plinths; the hard reading as outlines
    if(k>=3){const a=at(k,e,3),dim=k===4?.55:1;
      for(let i=0;i<K;i++){const h=Math.max(.02,P3[i]*1.3*a);R.box([x(i),0,ZB],[.7,.04,.5],{a:dim,shadow:false});
        R.box([x(i),.04,ZB],[.46,h,.32],{fill:mix(P.paper,P.c1,.7),a:dim,shadow:false});
        if(k===3)R.box([x(i),.04,ZB],[.54,P3[i]>.5?1.3:.02,.38],{fa:0,a:.6*e,shadow:false});
        R.label([x(i),.04+h,ZB],P3[i].toFixed(3),{mono:true,fs:12,dy:-10,c:P.c1,a:k===4?(R.W<520?0:.5):a})}}
    // 5. the mean, rescaled: every bar streams into one score, beside GPT-4o's grade of the same answer
    if(k>=4){const a=at(k,e,4),hs=score/10*2,hg=S.g/10*2;
      for(let i=0;i<K;i++)R.flowArc([x(i),.1+P3[i]*1.3,ZB],[XS,hs*a+.05,ZB],.35,{c:P.c1,a:a*(.35+.65*P3[i]),r:.04+.04*P3[i],n:5,speed:1.3});
      R.box([XS,0,ZB],[.6,Math.max(.01,hs*a),.6],{fill:mix(P.paper,P.c1,.75)});R.label([XS,hs*a,ZB],score.toFixed(1),{fs:16,b:1,dy:-13,c:P.c1,a});
      R.label([XS,0,ZB+.3],'RocketEval',{mono:true,fs:12,dy:14,c:P.mute,a,wide:1});
      R.box([XG,0,ZB],[.6,Math.max(.01,hg*a),.6],{fill:mix(P.paper,P.c2,.55),a});R.label([XG,hg*a,ZB],String(S.g),{fs:16,b:1,dy:-13,c:P.c2,a});
      R.label([XG,0,ZB+.3],'GPT-4o',{mono:true,fs:12,dy:30,c:P.mute,a,wide:1})}
  }
  // CoT: one lane with the same prefix; the analysis appended to it, zoomed into a chain of seven judgments in front
  const AL=GEN*sc,ZC=ZA,ZF=ZC+1.35,XD=i=>2.1+i*.85,ZD=ZE+AL/2;
  function drawCOT(R,k,e){const P=R.P;
    const d=k>=2?.4:1;
    R.box([0,0,Z0+L/2],[.9,.22,L],{fill:mix(P.paper,P.acc,.18),a:d});
    R.label([0,.22,Z0],'query + response + rubric · 3,402 tokens',{mono:true,fs:12,dy:-12,c:P.mute,a:d,wide:1});
    if(k===0)R.flow([[0,.26,Z0+.05],[0,.26,ZE]],{c:P.acc,a:.8,r:.07,speed:1.6});
    if(k>=1){const g=k===1?e:1;R.box([0,0,ZE+AL*g/2],[.9,.22,Math.max(.01,AL*g)],{fill:mix(P.paper,P.c2,.65),a:k>=4?.4:1});
      R.label([-.45,.22,ZE+AL/2],'analysis · 232 tokens',{mono:true,fs:12,al:'right',dx:-10,c:P.c2,a:k>=2?.5:1});
      // the zoom: seven judgments inside the analysis, in a row
      const za=k>=3?.12:1;
      R.line([[-.45,.02,ZE+AL],[x(0)-.3,.02,ZC-.3]],{c:P.c2,w:1,dash:[4,4],a:.5*za});R.line([[.45,.02,ZE+AL],[x(6)+.3,.02,ZC-.3]],{c:P.c2,w:1,dash:[4,4],a:.5*za});
      for(let i=0;i<7;i++){const ai=k===1?cl(e*8-i,0,1):1;R.box([x(i),0,ZC],[.56,.28,.46],{fill:mix(P.paper,P.c2,.3),a:ai*za});
        R.label([x(i),.28,ZC],'J'+(i+1),{fs:12,b:1,dy:-10,a:k>=3?0:ai});
        if(k===1&&i<6)R.flow([[x(i)+.28,.14,ZC],[x(i+1)-.28,.14,ZC]],{c:P.c2,a:ai*.8,r:.045,n:2,speed:.8})}}
    // every judgment reads all the earlier ones (arcs; dots stream into the 7th); Figure 5's flip rates as bars in front
    if(k>=2){const a=at(k,e,2),za=k>=3?.12:1,la=k>=3?0:a;
      for(let j=1;j<7;j++)for(let i=0;i<j;i++)R.arc([x(i),.28,ZC],[x(j),.28,ZC],.16+.08*(j-i),{c:P.c2,w:1,a:a*za*(j===6?.7:.2)});
      for(let i=0;i<6;i++)R.flowArc([x(i),.28,ZC],[x(6),.28,ZC],.16+.08*(6-i),{c:P.c2,a:a*za*.9,r:.04,n:4,speed:1.1});
      for(let i=0;i<7;i++){const h=Math.max(.02,F5[i]*1.0*a);R.box([x(i),0,ZF],[.7,.04,.5],{a:za,shadow:false});R.box([x(i),.04,ZF],[.46,h,.32],{fill:mix(P.paper,P.bad,.55),a:za,shadow:false});
        R.label([x(i),.04+h,ZF],Math.round(F5[i]*100)+'%',{mono:true,fs:12.5,b:1,dy:-17,c:mix(P.bad,P.ink,.4),a:la})}
      R.label([x(0)-.5,0,ZF+.2],'flips (Fig. 5)',{mono:true,fs:12,b:1,al:'right',dx:-6,dy:8,c:mix(P.bad,P.ink,.4),a:la,wide:1})}
    // one sampled score token: three samples of a small judge (illustrative digits), then the one integer kept
    const dg=['8','6','7'];
    if(k>=3){const a=at(k,e,3);
      dg.forEach((v,i)=>{const ai=k===3?cl(e*3-i,0,1):(i===0?1:off(k,e,4)*.8+.2);
        R.box([XD(i),0,ZD],[.56,.46,.5],{fill:mix(P.paper,P.c2,.25),a:ai});R.label([XD(i),.46,ZD],v,{fs:16,b:1,dy:-12,a:ai});
        if(k===3)R.flowArc([.45,.2,ZD],[XD(i),.4,ZD],.25,{c:P.c2,a:ai*.8,r:.05,n:3,speed:1})});
      R.label([XD(1),0,ZD+.3],k===3?'3 samples (illustrative)':'one integer kept',{mono:true,fs:12,dy:14,c:P.mute,a})}
  }
  function draw(R,k,e){R.grid(-5.5,6,-3.8,2.4,.5);if(mode==='re')drawRE(R,k,e);else drawCOT(R,k,e)}
  const B=[[-5.1,0,-3.6],[3.9,.9,2.3]];
  const st=S3.stage({id:'stg-grade',list:'sx-re',fig:'Fig. 2 · one released grading, two judges',cam:[.12,.7],bounds:B,aspect:.56,dur:1500,hold:5200,draw,
    view:k=>{if(mode==='re'){if(k===3)return {cam:[.1,.5],bounds:[[-3.9,0,-.4],[3.9,1.4,2.3]]};if(k===4)return {cam:innerWidth<520?[.75,.6]:[.06,.5],bounds:[[-3.9,0,-.2],[6.1,1.7,2.3]]};return {cam:[.12,.7],bounds:B}}
      if(k<=1)return {cam:[.12,.7],bounds:[[-4.0,0,-3.6],[4.0,.6,1.0]]};if(k===2)return {cam:[.08,.82],bounds:[[-4.0,0,-.2],[3.9,1.0,ZF+.4]]};return {cam:[.14,.7],bounds:[[-1.6,0,-3.6],[XD(2)+.6,.9,ZD+.8]]}},
    margin:w=>w<520?[14,10,26,10]:[16,14,26,14]});
  const seg=document.getElementById('gradeM');
  if(seg&&st)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    mode=b.dataset.m;['re','cot'].forEach(m=>{document.getElementById('sx-'+m).hidden=m!==mode});st.list('sx-'+mode)}));
})();
