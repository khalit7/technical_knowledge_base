// ---- Scene: retrieval (RQ4, §5.5) with renderer v2. A pool of candidate skill cards around one SkillsBench task: its one gold skill and k − 1
// real distractors. Precision and success are the paper's (Table 4 averages over the three pools, via recompute.py; per agent from Table 15);
// how many skills each agent touches in Arm 3 is derived (recall ÷ precision at k = 100, recompute.py implied_skills_touched, mean of the
// three pools). The cards' positions, which near-duplicates are tinted and which cards an agent opens are illustrative.
(function(){
  if(!document.getElementById('stg-ret'))return;const {at,off,lerp,mix}=S3;
  const RC=PAPER.rc,IT=RC.implied_skills_touched,mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
  const touched=ag=>Math.round(mean(['random','similar','dissimilar'].map(p=>IT[ag][p][4])));
  const NC=touched('codex'),NG=touched('gemini');window.RET_TOUCHED={codex:NC,gemini:NG};
  const CX=c=>(c-4.5)*.64,CZ=r=>(r-4.5)*.62-.7,G=[5,8],gx=CX(G[0]),gz=CZ(G[1]),TASK=[0,0,3.35];
  // cards ordered by distance from the gold one: the first 5 are the k = 5 pool
  const cards=[];for(let r=0;r<10;r++)for(let c=0;c<10;c++){const d=Math.hypot(c-G[0],(r-G[1])*1.6);cards.push({c,r,x:CX(c),z:CZ(r),d})}
  cards.sort((a,b)=>a.d-b.d);cards.forEach((q,i)=>q.i=i);
  const rnd=mulberry32(7),order=cards.map(q=>[rnd(),q]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  const codexSet=new Set(cards.slice(0,NC)),gemSet=new Set(order.filter(q=>q.i!==0).slice(0,NG-1).concat([cards[0]]));
  const near=new Set(cards.slice(1,9)); // tinted near-duplicates (illustrative)
  const p1=RC.avg_arm1_p,s3=RC.avg_arm3_succ;
  function draw(R,k,e){const P=R.P,GOLD=P.c5;R.grid(-4,4,-4.2,4.2,.5);
    const n=k<=1?5:k===2?Math.round(lerp(5,100,e)):100,rec=k===6?.22:1;
    // the task (the query) in front
    R.box(TASK,[1.0,.32,.6],{fill:mix(P.paper,P.ink,.12),a:k===6?.3:1});R.label([TASK[0],.32,TASK[2]],'task',{fs:12.5,b:1,dy:-11,a:k===6?.4:1});
    // the cards
    cards.forEach(q=>{if(q.i>=n)return;const gold=q.i===0,nd=near.has(q)&&k>=2,open=(k===4&&codexSet.has(q))||(k===5&&gemSet.has(q));
      let fill=gold?mix(P.paper,GOLD,.75):nd?mix(P.paper,GOLD,.3):P.paper,a=rec*(q.i<5||k!==2?1:Math.min(1,e*1.4));
      if((k===4||k===5)&&!open)a*=.35;
      const h=open?.14:.05;R.box([q.x,0,q.z],[.48,h,.48],{fill:open&&!gold?mix(P.paper,k===4?P.c2:P.c4,.55):fill,a,shadow:false,lw:.6})});
    R.label([gx,.05,gz],'gold skill',{fs:12,b:1,c:GOLD,dy:-12,a:rec*(k<=3?1:.8)});
    if(k===0)R.label([CX(3),.05,gz],'distractors',{fs:12,c:P.mute,dy:14,a:e});
    // arms
    const T=[TASK[0],.34,TASK[2]-.2];
    if(k===1)R.flowArc(T,[gx,.08,gz],.7,{c:GOLD,r:.08,n:9,a:Math.max(.4,e)});
    if(k===2){R.flowArc(T,[gx,.08,gz],.8,{c:GOLD,r:.065,n:7,a:.9});const w=cards[2];R.flowArc(T,[w.x,.08,w.z],.6,{c:P.mute,r:.05,n:4,a:.6*e})}
    if(k===3)[cards[0],cards[1],cards[3]].forEach((q,i)=>R.flowArc(T,[q.x,.08,q.z],.7+.1*i,{c:i?P.mute:GOLD,r:.06,n:6,a:i?.6:.9}));
    if(k===4)[...codexSet].forEach(q=>R.flowArc(T,[q.x,.16,q.z],.5+.06*q.d,{c:P.c2,r:.045,n:3,a:.75}));
    if(k===5)order.filter(q=>gemSet.has(q)).slice(0,24).forEach(q=>R.flowArc(T,[q.x,.16,q.z],.5+.05*q.d,{c:P.c4,r:.04,n:3,a:.6}));
    const head=['','Arm 1 · embedding top-1','Arm 1 · k = 100','Arm 2 · agent selection','Arm 3 · Codex opens about '+NC,'Arm 3 · Gemini opens about '+NG,'Arm 3 · task success'][k];
    if(head)R.label([0,.3,-3.95],head,{fs:13.5,b:1,c:k===4?P.c2:k===5?P.c4:P.ink});
    const mid=[(gx+TASK[0])/2,.95,(gz+TASK[2])/2];
    if(k===1)R.label(mid,'top-1 is gold '+p1[0].toFixed(1)+'% of the time',{fs:12.5,mono:true,dy:-14,c:GOLD,b:1,a:e});
    if(k===2)R.label(mid,'top-1 is gold '+p1[4].toFixed(1)+'% of the time',{fs:12.5,mono:true,dy:-14,c:GOLD,b:1,a:e});
    // success at k = 5 and k = 100, as bars on plinths, while the pool recedes
    if(k===6)[[0,'k = 5',-1.7],[4,'k = 100',1.7]].forEach(([j,t,x])=>{const h=s3[j]/50*1.6*e;R.box([x,0,TASK[2]],[1.1,.05,.5]);R.box([x,.05,TASK[2]],[.5,Math.max(.01,h),.3],{fill:P.c1,shadow:false});
      R.label([x,.05+h,TASK[2]],s3[j].toFixed(1)+'%',{mono:true,fs:13,b:1,c:P.c1,dy:-11,a:e});R.label([x,0,TASK[2]+.3],t,{mono:true,fs:12,c:P.mute,dy:14});
      R.flowArc([x,.3,TASK[2]-1.2],[x,.05+h,TASK[2]-.1],.3,{c:P.c1,r:.05,n:4,a:.6*e})});
  }
  const full={cam:[.25,.82],bounds:[[-3.6,0,-4.1],[3.6,.8,3.8]]};
  S3.stage({id:'stg-ret',list:'sx-ret',fig:'100 candidate skills, one gold',cam:full.cam,bounds:full.bounds,aspect:.8,dur:1400,hold:4800,draw,
    view:k=>k<=1?{cam:[.2,.62],bounds:[[-1.8,0,gz-.6],[2.4,.6,TASK[2]+.4]]}:k===6?{cam:[.2,.55],bounds:[[-3,0,1],[3,1.6,3.8]]}:full,
    margin:w=>w<520?[16,10,14,10]:[18,14,14,18]});
})();
