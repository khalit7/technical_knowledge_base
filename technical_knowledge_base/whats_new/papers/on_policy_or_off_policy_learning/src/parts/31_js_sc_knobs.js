// ---- Scene (Fig. 1 in Two knobs): both knobs on one prompt of this page's toy (renderer v2: bar fields, flowing rollouts, signed pushes on plinths) ----
// Everything drawn is computed here by the toy engine (window.OPD, parts/22_js_toy.js) on the world the page uses (TOYD.world_seed):
// prompt 11 (the prompt whose teacher splits most evenly between its two routes), the shared-network student, and four training runs
// (forward or reverse KL, teacher-written lambda = -1 or student-written lambda = +1 rollouts; lr 0.1, seed 42, 150 steps of 32 rollouts),
// the setting of the Move the rollout policy tab. A field is the joint probability of a two-token answer: route along x, answer along z.
(function(){
  if(!document.getElementById('stg-kn')||!window.S3||!window.OPD||!window.TOYD)return;const {at,off,lerp,mix}=S3;
  const W=OPD.world(TOYD.world_seed),M='mlp',K=OPD.K,A=OPD.A;
  // the prompt: the one whose teacher splits its route mass most evenly between its two preferred routes (a rule, so the choice is reproducible)
  const lT1=p=>OPD.logT1(W,p).map(Math.exp);
  let PR=0,best=-1;for(let p=0;p<W.P;p++){const t=lT1(p),m=Math.min(t[W.troutes[p][0]],t[W.troutes[p][1]]);if(m>best){best=m;PR=p}}
  const MODES=[['f',-1],['f',1],['r',-1],['r',1]];
  function field(lr,la){const out=[];for(let k=0;k<K;k++){const a=la(k);for(let j=0;j<A;j++)out.push(lr[k]*a[j])}return out}
  const sField=th=>{const r=OPD.logS1(W,M,th,PR).map(Math.exp);return field(r,k=>OPD.logS2(W,M,th,PR,k).map(Math.exp))};
  const passP=(fl)=>{let s=0;for(let k=0;k<K;k++)s+=fl[k*A+W.correct[PR][k]];return s};
  let D=null;
  function data(){if(D)return D;const th0=OPD.initTheta(W,M),lS=OPD.logS1(W,M,th0,PR),lT=OPD.logT1(W,PR);
    const T=field(lT1(PR),k=>OPD.logT2(W,PR,k).map(Math.exp)),S0=sField(th0);
    const runs=MODES.map(([kind,lam])=>{const snaps=[S0],routes=[lS.map(Math.exp)];let thF=null;
      OPD.train(W,{model:M,kind,lam,lr:0.1,seed:42,onStep:(s,th)=>{if(s%10===0){snaps.push(sField(th));routes.push(OPD.logS1(W,M,th,PR).map(Math.exp))}if(s===150)thF=th.slice()}});
      const ev=OPD.evaluate(W,M,thF,1);return {kind,lam,snaps,routes,all:ev.pass1,distinct:ev.distinct10}});
    const te=OPD.teacherEval(W,1);
    D={T,S0,pT:lT.map(Math.exp),pS:lS.map(Math.exp),off:OPD.lambdaProbs(lS,lT,-1),on:OPD.lambdaProbs(lS,lT,1),
      push:{f:OPD.gradLogits('f',lS,lT).map(v=>-v),r:OPD.gradLogits('r',lS,lT).map(v=>-v)},runs,teacherAll:te.pass1,pT0:passP(T),pS0:passP(S0)};
    D.mx=Math.max(...T,...S0,...runs.flatMap(r=>r.snaps.flat()));window.OPD_KN={prompt:PR,routes:W.troutes[PR],habit:W.habit[PR],D,passP};return D}
  // geometry
  const SP=.44,BW=.31,HS=2.8,TX=-2.6,SX=1.4,GX=[.45,3.25],GZ=[-1.45,1.45],TRZ=2.35,TSP=.58,PZ=1.75,PY=.5;
  const cx=(x0,k)=>x0+(k-2)*SP,cz=(z0,j)=>z0+(j-2)*SP;
  function drawField(R,x0,z0,fl,col,a,o){o=o||{};if(a<=.01)return;const P=R.P,lit=o.lit;
    R.box([x0,-.02,z0],[K*SP+.12,.02,A*SP+.12],{fill:P.paper,a:a*.9,shadow:false});
    for(let k=0;k<K;k++)for(let j=0;j<A;j++){const v=fl[k*A+j],ok=W.correct[PR][k]===j,h=Math.max(.012,v*HS);
      const la=lit?(.25+.75*lit[k]):1;R.box([cx(x0,k),0,cz(z0,j)],[BW,h,BW],{fill:ok?col:mix(P.paper,col,.22),a:a*la,shadow:false,lw:.7})}}
  function routeLabels(R,x0,z,a,o){o=o||{};for(let k=0;k<K;k++){const tr=W.troutes[PR].includes(k),hb=W.habit[PR]===k;
    R.label([cx(x0,k),0,z],String(k+1),{mono:true,fs:12,dy:12,a,b:tr||hb,c:tr?R.P.c3:hb?R.P.c1:R.P.mute})}
    if(o.name)R.label([cx(x0,0)-.25,0,z],'route',{mono:true,fs:12,al:'right',dx:-4,dy:12,a,c:R.P.mute,grp:'rt'})}
  // a signed vector on a white plinth: positive bars stand on it, negative ones hang below
  function pushBars(R,x0,vals,col,a){if(a<=.01)return;const P=R.P;R.box([x0,PY-.045,PZ],[K*SP+.1,.045,.3],{a,shadow:false});
    [-1,1].forEach(s=>R.box([x0+s*(K*SP/2),0,PZ],[.03,PY-.05,.03],{a:a*.9}));
    vals.forEach((v,k)=>{const h=Math.max(.014,Math.abs(v)*.75);R.box([cx(x0,k),v>=0?PY:PY-.045-h,PZ],[BW,h,.12],{fill:col,a,shadow:false,lw:.7});
      R.label([cx(x0,k),v>=0?PY+h:PY-.045-h,PZ],(v>=0?'+':'−')+Math.abs(v).toFixed(2),{mono:true,fs:12,dy:v>=0?-9:13,a,c:col})})}
  function interp(run,u){const n=run.snaps.length-1,x=Math.max(0,Math.min(n,u)),i=Math.min(n-1,Math.floor(x)),t=x-i;return run.snaps[i].map((v,j)=>lerp(v,run.snaps[i+1][j],t))}
  function draw(R,k,e){const P=R.P,T=data();R.grid(-4.4,4.6,-2.4,3,.5);
    const one=k<=4?1:k===5?1-e:0,four=k<5?0:k===5?e:1;
    // the teacher's field, always on the left
    const ta=k>=3&&k<=4?0:1;drawField(R,TX,0,T.T,P.c3,ta);R.label([TX,1.25,-1.1],'teacher',{fs:13.5,b:1,c:P.c3,a:ta});routeLabels(R,TX,1.25,ta,{name:1});
    // the student's field before training
    const lit=k===1?T.off:k===2?T.on:null,lw=lit?lit.map(v=>Math.min(1,v*2.2)):null;
    drawField(R,SX,0,T.S0,P.c1,one,{lit:lw});const pk=k===3||k===4;if(one>.01){if(!pk)R.label([SX,1.25,-1.1],'student, before training',{fs:13.5,b:1,c:P.c1,a:one});routeLabels(R,SX,pk?PZ+.3:1.25,one,{name:pk})}
    // steps 2 and 3: 32 rollouts per step; the writer's route mass flows into a tray, then into the student's rows it grades
    if(k===1||k===2){const sh=k===1?T.off:T.on,src=k===1?TX:SX,col=k===1?P.c3:P.c1,a=Math.min(1,e*1.6),tx0=(TX+SX)/2;
      R.label([tx0,0,TRZ+.35],k===1?'rollouts the teacher writes':'rollouts the student writes',{fs:13,b:1,c:col,a,dy:14});
      for(let r=0;r<K;r++){const h=Math.max(.012,sh[r]*1.3),bx=tx0+(r-2)*TSP;R.box([bx,0,TRZ],[BW,h,BW],{fill:col,a});R.label([bx,h,TRZ],(100*sh[r]).toFixed(1)+'%',{mono:true,fs:12,dy:-9,a:sh[r]>.03?a:a*.55});
        if(sh[r]>.02){R.flowArc([cx(src,r),.25,.75],[bx,h+.05,TRZ-.1],.35,{c:col,a:a*(.35+.65*sh[r]),n:Math.max(2,Math.round(3+sh[r]*14)),r:.04+.04*sh[r],speed:1.2});
          R.flowArc([bx,h+.05,TRZ-.1],[cx(SX,r),.3,cz(0,4)],.4,{c:col,a:a*(.35+.65*sh[r]),n:Math.max(2,Math.round(3+sh[r]*14)),r:.04+.04*sh[r],speed:1.2})}}}
    // steps 4 and 5: the push each divergence gives the student's five route logits (minus the gradient), from the same starting student
    if(k===3||k===4){const v=k===3?T.push.f:T.push.r,col=k===3?P.c4:P.c2;pushBars(R,SX,v,col,Math.min(1,e*1.5));
      R.label([SX,1.25,-1.1],k===3?'forward KL: push = p(teacher) − p(student)':'reverse KL: push = p(student) × (D − log ratio)',{mono:true,fs:12.5,b:1,c:col,a:e,wide:1})}
    // steps 6 to 8: four students, one per pairing, trained 150 steps; snapshots every 10 steps play within steps 6 and 7
    if(four>.01){T.runs.forEach((run,i)=>{const x0=GX[run.kind==='f'?0:1],z0=GZ[run.lam<0?0:1],col=run.kind==='f'?P.c4:P.c2;
        const u=k<5?0:k===5?5*e:k===6?5+10*e:15,fl=interp(run,u);drawField(R,x0,z0,fl,col,four);
        // the rollouts keep flowing from their writer: the teacher for the top row, the student itself for the bottom row
        if(k>=5&&k<=6){if(run.lam<0)R.flowArc([TX+.9,.4,0],[x0-.5,.35,z0],.5,{c:P.c3,a:four*.7,n:8,r:.05,speed:1.1});
          else R.flowArc([x0-.6,.15,z0+.75],[x0-.1,.35,z0+.1],.35,{c:P.c1,a:four*.7,n:6,r:.05,speed:1.1})}
        if(k===7)R.label([x0,Math.max(...fl)*HS+.05,z0],(100*passP(fl)).toFixed(1)+'%',{mono:true,fs:12.5,b:1,dy:-10,c:col,a:e})});
      [['forward KL',GX[0],P.c4],['reverse KL',GX[1],P.c2]].forEach(([t,x,c])=>R.label([x,0,GZ[1]+1.25],t,{fs:13.5,b:1,dy:14,c,a:four}));
      [['teacher writes',GZ[0],P.c3],['student writes',GZ[1],P.c1]].forEach(([t,z,c])=>R.label([GX[1]+1.75,0,z],t,{fs:12.5,b:1,al:'left',dx:4,c,a:four,wide:1}))}
  }
  const NEAR=[[-.2,0,-1.2],[3,1.3,2.1]];// the student field (x = 1.4) with its push bars in front and their side label
  const full={cam:[.3,.72],bounds:[[-3.9,0,-1.5],[3.2,1,2.7]]};
  S3.stage({id:'stg-kn',list:'sx-kn',fig:'Fig. 1 · both knobs on one prompt of the toy (illustrative)',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,14,40],
    // the pushes are about the student's five routes: move in close; every other step shows the whole scene
    view:k=>k===3||k===4?{cam:[.12,.88],bounds:NEAR}:k>=5?{cam:[.3,.8],bounds:[[-3.9,0,-2.6],[5.3,1,2.9]]}:full});
})();
