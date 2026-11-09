// ---- Scene: Fig. 1 (stg-hero, renderer v2): one recorded trajectory, three graders. GPT-5.2 on tau2-bench airline task 29, trial 1, from
// window.ATJ.cases (the released trajectory file; message verdicts as recorded; database diff from dbdiff.py; gold-action marks as in the trial stepper).
// The trajectory is a row of plates in time order (messages upright, tool calls as cubes); actions stream into the environment's database (its
// cells are schematic, the calls and the six differing fields are real); then the transcript judge, the outcome grader and the step grader each read
// their part and reach their own verdict. Every count is computed here and published in window.ATJN.hero for check_stages.mjs. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.ATJ)return;
  const {at,mix,cl}=S3,C=window.ATJ.cases['gpt52/29/1'];if(!C)return;
  const S=C.steps,n=S.length,XS=.56,x=i=>(i-(n-1)/2)*XS;
  const calls=S.map((s,i)=>s.k==='call'?i:-1).filter(i=>i>=0),msgs=S.map((s,i)=>s.k==='msg'?i:-1).filter(i=>i>=0);
  const writes=calls.filter(i=>S[i].w),lastA=Math.max(...msgs.filter(i=>S[i].r==='assistant'));
  const askI=msgs.find(i=>S[i].r==='user'&&/Insurance on the new booking/.test(S[i].t));
  // the step grader's marks: what the trial stepper (23_js_anim.js) computes, the gold actions met exactly, by name only, or not in the gold path
  const J=o=>JSON.stringify(o),so=x=>Array.isArray(x)?x.map(so):x&&typeof x==='object'?Object.keys(x).sort().reduce((o,k)=>(o[k]=so(x[k]),o),{}):x;
  const same=(a,b)=>a.n===b.n&&J(so(a.a))===J(so(b.a));
  const goldOk=C.gold.filter(g=>calls.some(i=>same(S[i],g))).length;
  const mark=i=>S[i].st==='gold'?'✓':S[i].st==='name'?'≈':'+';
  const extra=calls.filter(i=>S[i].st==='extra').length;
  const nlMet=C.nl.filter(a=>a.met).length;
  (window.ATJN=window.ATJN||{}).hero={n,msgs:msgs.length,calls:calls.length,writes:writes.length,writeNames:writes.map(i=>S[i].n),nl:[nlMet,C.nl.length],diff:C.diff.length,gold:[goldOk,C.gold.length],extra,reward:C.reward,lastA:S[lastA].t.slice(0,8),ask:askI+1};
  // three lanes in time order: what it said (messages, back), what it did (tool calls, middle), what changed (the database, front); each lane ends in its grader
  const ZM=-1.35,ZC=0,DZ=1.0,DD=1.2,X0=x(0)-.32,NC=16,CW=(x(n-1)+.32-X0)/NC,GX=x(n-1)+1.6;
  const col=xx=>Math.max(0,Math.min(NC-1,Math.floor((xx-X0)/CW))),cell=(c,r)=>[X0+CW*(c+.5),.02,DZ+DD/2*(r+.5)];
  const bI=writes.find(i=>S[i].n==='book_reservation'),cI=writes.find(i=>S[i].n==='cancel_reservation'),cb=col(x(bI));
  // the cells are schematic: the booking writes six (a new reservation row and the gift card's balance), all six differ from the gold; the cancellation writes one
  const WB=[[cb-3,1],[cb-2,1],[cb-1,1],[cb,1],[cb+1,1],[cb-4,0]].slice(0,6),WC=[[col(x(cI))+1,0]],DIFF=WB.slice(0,C.diff.length);
  const isD=(c,r)=>DIFF.some(d=>d[0]===c&&d[1]===r);
  const GT=[GX,0,ZM],GS=[GX,0,ZC],GO=[GX,0,DZ+DD/2];
  function grader(R,p,name,c,a,verdict,va,la){const P=R.P;R.box(p,[.95,.44,.62],{fill:mix(P.paper,c,.32),a});
    if(la>0)R.label([p[0],.44,p[2]],name,{fs:12.5,b:1,c,dy:-10,a:la,wide:1});
    if(va>0)R.label([p[0]+.5,.22,p[2]],verdict,{fs:16,b:1,al:'left',dx:8,c:verdict==='pass'?P.good:P.bad,a:va})}
  function draw(R,k,e){const P=R.P,cS=P.c1,cU=P.c5,cD=P.c2,cE=P.c6;R.grid(-5.4,7,-2.2,2.6,.5);
    const show=i=>k>0?1:cl(e*(n+2)-i,0,1);
    // the lanes: messages as upright plates, tool calls as cubes (writes darker and taller)
    const am=k===0||k===2?1:k===5?.6:.2,ac=k===0||k===1||k===4?1:k===5?.6:.2;
    S.forEach((s,i)=>{const a=show(i);if(a<=0)return;
      if(s.k==='msg'){const hi=k===5&&i===askI;R.box([x(i),0,ZM],[.5,.85,.08],{fill:mix(P.paper,s.r==='user'?cU:cS,s.r==='user'?.45:.38),a:a*(hi?1:am)})}
      else R.box([x(i),0,ZC],[.48,s.w?.56:.4,.48],{fill:mix(P.paper,cD,s.w?.8:.32),a:a*ac})});
    [['said · '+msgs.length+' messages',ZM,cS,am],['did · '+calls.length+' tool calls',ZC,cD,ac],['changed · the database',DZ+DD/2,cE,k===1||k===3||k===0?1:.4]].forEach(([t,z,c,a])=>{if(k===0||k===5)R.label([X0-.1,.1,z],t,{fs:12.5,b:1,al:'right',dx:-6,c,a:k===0?e:Math.max(.45,a),grp:'lane'})});
    if(k===0){R.flow([[x(0),.92,ZM],[x(n-1),.92,ZM]],{c:cS,a:.5*e,r:.045,n:14,speed:1.4});R.flow([[x(0),.62,ZC],[x(n-1),.62,ZC]],{c:cD,a:.5*e,r:.045,n:14,speed:1.4})}
    // the environment: the airline database, its cells schematic
    const da=k===0?.16+.6*e:k===1||k===3?1:k===5?.6:.3;
    R.glass([X0,.02,DZ],[CW*NC,0,0],[0,0,DD],{c:cE,a:da,nu:NC,nv:2,th:.04});
    const wr=k>=2?1:k===1?cl(e*1.6-.3,0,1):0;
    [...WB,...WC].forEach(([c,r])=>{const p=cell(c,r),d=isD(c,r),lift=d&&k===3?.4*e:d&&k>3?.4:0;
      R.box([p[0],p[1]+lift,p[2]],[CW*.8,.08,DD/2*.72],{fill:lift>0?mix(P.paper,P.bad,.7):mix(P.paper,cD,.6),a:wr*(k===2||k===4?.35:1),shadow:false})});
    if(k===1){calls.forEach(i=>{const top=[x(i),S[i].w?.5:.36,ZC];
      if(S[i].w)(i===bI?WB:WC).forEach(([c,r])=>R.flowArc(top,cell(c,r),.35,{c:cD,a:.9,r:.06,n:5,speed:1.2}));
      else R.flowArc(cell(col(x(i)),0),top,.4,{c:cE,a:.8,r:.05,n:5,speed:1.2})});
      R.label([x(bI),.5,ZC],'book_reservation',{mono:true,fs:12,b:1,c:cD,al:'right',dx:-4,dy:-14,a:e});
      R.label([x(cI),.5,ZC],'cancel_reservation',{mono:true,fs:12,b:1,c:cD,al:'left',dx:4,dy:-14,a:e})}
    // the graders, each at the end of the lane it reads
    const va=j=>k===j?cl(e*1.6-.5,0,1):k===5?1:0;
    const gl=j=>k===j||k===5?1:k===0?.45*e:0;
    grader(R,GT,'transcript judge',cS,k===2||k===5?1:.16,'pass',va(2),gl(2));
    grader(R,GS,'step grader',cD,k===4||k===5?1:.16,goldOk===C.gold.length?'pass':'fail',va(4),gl(4));
    grader(R,GO,'outcome grader',cE,k===3||k===5?1:.16,C.db?'pass':'fail',va(3),gl(3));
    if(k===2){R.flow([[x(0)-.2,.95,ZM],[GX-.55,.6,ZM]],{c:cS,a:.8,r:.055,n:22,speed:1.3});
      R.label([x(lastA),.85,ZM],'"'+S[lastA].t.split(/[.\n]/)[0]+'."',{fs:13,b:1,c:cS,dy:-14,a:e})}
    if(k===3){R.flow([[X0+.2,.2,DZ+DD/2],[GX-.55,.3,GO[2]]],{c:cE,a:.85,r:.055,n:20,speed:1.3});
      R.label([cell(cb-1,1)[0],.5,cell(cb-1,1)[2]],C.diff.length+' fields differ from the gold',{fs:12.5,c:P.bad,b:1,dy:-26,a:e})}
    if(k===4){calls.forEach(i=>{const m=mark(i);R.label([x(i),S[i].w?.5:.36,ZC],m,{fs:16,b:1,dy:-14,c:m==='✓'?P.good:m==='≈'?P.bad:P.mute,a:e})});
      R.flow([[x(calls[0])-.3,.75,ZC],[GX-.55,.5,ZC]],{c:cD,a:.75,r:.055,n:18,speed:1.3})}
    if(k===5&&askI!=null)R.label([x(askI),.85,ZM],'user: insurance yes, pay by gift card',{fs:12.5,b:1,c:P.ink,dy:-14,a:e})
  }
  const full={cam:[.18,.98],bounds:[[-4.9,0,-1.8],[6.6,.9,2.3]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one τ²-bench trial, three graders',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    margin:w=>w<520?[22,10,18,10]:[30,80,14,150],
    // on a phone the camera looks down more steeply, so the three lanes spread over the taller card
    view:k=>{const v=k===1?{cam:[.16,.9],bounds:[[-2.6,0,-.4],[4.4,.8,2.3]]}:k===2?{cam:[.2,.72],bounds:[[-1.4,0,-1.9],[6.7,1.1,-.6]]}:k===3?{cam:[.18,.95],bounds:[[-1.2,0,.9],[6.8,.8,2.3]]}:k===4?{cam:[.16,.8],bounds:[[-2.6,0,-.5],[6.8,.9,.45]]}:full;return innerWidth<520?{cam:[v.cam[0]*.5,Math.min(1.2,v.cam[1]+.22)],bounds:v.bounds}:v}});
})();
