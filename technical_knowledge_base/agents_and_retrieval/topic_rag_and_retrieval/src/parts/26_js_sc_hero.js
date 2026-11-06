// ---- Scene: Fig. 1, one question's path through a RAG system in eight steps (renderer v2). A map, not a measurement: the shapes stand for
// the stages; only the towers are measured (the 188 SciFact claims with annotated evidence: 186 with their evidence in the fused top 30,
// 178 kept by the reranker in the top 3, 96 answered right and cited; the retrieval pipeline's end-to-end run, quoted in section 4).
// Index time runs along the back row, query time along the front row; the step list sx-hero (20_read_a.html) names the child page that owns each step. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,mix}=S3;
  const ZI=-1.55,ZQ=1.25,ZT=2.65;                                   // back row (index time), front row (query time), towers in front
  const DOC=[-4.3,0,ZI],PAR=[-2.85,0,ZI],CH=-1.45,VEC=[.15,0,ZI],BM=[1.75,0,ZI],GR=[3.6,0,ZI];
  const QU=[-4.3,0,ZQ],RW=[-2.75,0,ZQ],FS=[.95,0,ZQ],RR=[2.55,0,ZQ],GEN=[4.1,0,ZQ];
  const N={all:188,top30:186,top3:178,right:96};                    // measured counts (section 4: A = 186/188 x 178/186 x 96/178)
  const top=(p,h)=>[p[0],p[1]+h,p[2]];
  // how strongly each object shows: absent before its step, fading in during it, at full strength while a step is about it, receding after
  const FOCUS=[['doc','par'],['par','ch'],['ch','vec','bm'],['qu','rw'],['rw','vec','bm','fs'],['fs','rr'],['rr','gen'],[]];
  const BORN={doc:0,par:0,ch:1,vec:2,bm:2,qu:3,rw:3,fs:4,rr:5,gen:6};
  function A(k,e,id){const b=BORN[id];if(k<b)return 0;const f=k===b?Math.min(1,e*1.5):1;return f*(k===7?.62:FOCUS[k].includes(id)?1:.26)}
  function tower(R,x,n,a,lab,c,k,e,s){const P=R.P,h=n/N.all*.75*(k===s?e:1);if(a<=.01)return;
    R.box([x,0,ZT],[.4,Math.max(.01,h),.4],{fill:mix(P.paper,c,.55),a});R.label([x,h,ZT],lab,{mono:true,fs:12.5,b:1,c,dy:-11,a:Math.max(.5,a)})}
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-5,5,-2.6,3.2,.5);
    const ci=P.c3,cq=P.acc;
    // 1. documents and the parser
    const ad=A(k,e,'doc');for(let i=0;i<5;i++)R.box([DOC[0]+i*.05,i*.08,DOC[2]-i*.05],[.85,.06,1.05],{fill:i===4?P.paper:mix(P.paper,P.c4,.12),a:ad,shadow:i===0,lw:.7});
    R.label(top(DOC,.42),'documents',{fs:12.5,b:1,c:P.c4,dy:-10,a:ad>0?Math.max(.35,ad):0});
    const ap=A(k,e,'par');R.box(PAR,[.85,.5,.85],{fill:mix(P.paper,P.c4,.4),a:ap});R.label(top(PAR,.5),'parse',{fs:12.5,b:1,c:P.c4,dy:-10,a:ap>0?Math.max(.35,ap):0});
    if(k===0)R.flowArc(top(DOC,.35),top(PAR,.35),.35,{c:P.c4,a:fa,r:.07,n:9,speed:1.2});
    // 2. chunks: the parsed text cut into pieces, each indexed on its own
    const ac=A(k,e,'ch');for(let i=0;i<5;i++){const x=CH-.55+i*.28,d=k===1?Math.min(1,Math.max(0,e*1.6-i*.12)):1;R.box([x,0,ZI],[.22,.16,.7],{fill:mix(P.paper,ci,.3),a:ac*d,shadow:false})}
    R.label([CH,.16,ZI],'chunks',{fs:12.5,b:1,c:ci,dy:-12,a:ac>0?Math.max(.35,ac):0});
    if(k===1)R.flowArc(top(PAR,.35),[CH-.4,.2,ZI],.3,{c:P.c4,a:fa,r:.07,n:8,speed:1.2});
    // 3. two indexes: vectors in an ANN index (a glass plate with points), term counts in postings lists
    const av=A(k,e,'vec');R.glass([VEC[0]-.6,.02,ZI-.55],[1.2,0,0],[0,0,1.1],{c:P.c1,a:av,nu:6,nv:6});
    for(let i=0;i<14;i++){const u=((i*37)%13)/13,v=((i*53)%11)/11;R.ball([VEC[0]-.5+u*1.0,.06,ZI-.45+v*.9],.045,{c:P.c1,a:av})}
    R.label([VEC[0],.1,ZI-.55],'vector index',{fs:12.5,b:1,c:P.c1,dy:-14,a:av>0?Math.max(.35,av):0});
    const ab=A(k,e,'bm');[.9,.55,1.1,.4,.75].forEach((w,i)=>R.box([BM[0]-.55+w/2,0,ZI-.4+i*.2],[w,.09,.12],{fill:mix(P.paper,P.c5,.5),a:ab,shadow:false}));
    R.label([BM[0],.1,ZI-.5],'BM25 postings',{fs:12.5,b:1,c:P.c5,dy:-14,a:ab>0?Math.max(.35,ab):0});
    if(k===2){R.flowArc([CH+.2,.18,ZI],[VEC[0]-.2,.1,ZI],.35,{c:ci,a:fa,r:.065,n:7,speed:1.2});R.flowArc([CH+.2,.18,ZI],[BM[0]-.3,.12,ZI],.6,{c:ci,a:fa,r:.065,n:9,speed:1.2})}
    // 4. the question, and the rewrite
    const aq=A(k,e,'qu');R.ball(top(QU,.32),.17,{c:cq,a:aq});R.label(top(QU,.5),'question',{fs:12.5,b:1,c:cq,dy:-10,a:aq>0?Math.max(.35,aq):0});
    const ar=A(k,e,'rw');R.box(RW,[.75,.36,.65],{fill:mix(P.paper,cq,.3),a:ar});R.label(top(RW,.36),'rewrite',{fs:12.5,b:1,c:cq,dy:-10,a:ar>0?Math.max(.35,ar):0});
    if(k===3)R.flowArc(top(QU,.32),top(RW,.3),.3,{c:cq,a:fa,r:.07,n:8,speed:1.2});
    // 5. the first stage: the query goes to both indexes, candidates come back and are fused into a shortlist of 30
    const af=A(k,e,'fs');for(let i=0;i<30;i++){const d=k===4?Math.min(1,Math.max(0,e*1.8-i*.025)):1;R.box([FS[0],i*.026,FS[2]],[.7,.02,.55],{fill:mix(P.paper,cq,.18+.5*(i>=27)),a:af*d,shadow:i===0,lw:.5})}
    R.label(top(FS,.8),'top 30, fused',{fs:12.5,b:1,c:cq,dy:-10,a:af>0?Math.max(.35,af):0});
    if(k===4){R.flowArc(top(RW,.3),[VEC[0],.12,ZI+.3],.6,{c:cq,a:fa,r:.06,n:9,speed:1.3});R.flowArc(top(RW,.3),[BM[0]-.2,.12,ZI+.3],.75,{c:cq,a:fa,r:.06,n:10,speed:1.3});
      R.flowArc([VEC[0]+.2,.12,ZI+.4],top(FS,.5),.4,{c:P.c1,a:fa,r:.06,n:7,speed:1.2});R.flowArc([BM[0],.12,ZI+.4],top(FS,.5),.4,{c:P.c5,a:fa,r:.06,n:7,speed:1.2})}
    // 6. the reranker: a model that reads question and candidate together (a glass plate the shortlist passes through), 30 in, 3 out
    const arr=A(k,e,'rr');R.glass([RR[0]-.5,0,RR[2]],[1.0,0,0],[0,.95,0],{c:P.c2,a:arr,nu:5,nv:5});
    R.label([RR[0],.95,RR[2]],'rerank',{fs:12.5,b:1,c:P.c2,dy:-10,a:arr>0?Math.max(.35,arr):0});
    if(k===5)R.flowArc(top(FS,.6),[RR[0],.5,RR[2]],.25,{c:cq,a:fa,r:.06,n:12,speed:1.2});
    // 7. the prompt (top 3, with ids) and the generator, which answers and cites
    const ag=A(k,e,'gen');R.box(GEN,[.85,.55,.8],{fill:mix(P.paper,P.c2,.42),a:ag});
    for(let i=0;i<3;i++)R.box([GEN[0],.55+i*.07,GEN[2]],[.6,.05,.5],{fill:mix(P.paper,cq,.45),a:ag*(k===6?Math.min(1,Math.max(0,e*2-i*.25)):1),shadow:false,lw:.5});
    R.label(top(GEN,.8),'top 3 → generate, cite',{fs:12.5,b:1,c:P.c2,dy:-10,a:ag>0?Math.max(.35,ag):0});
    if(k===6)R.flowArc([RR[0],.5,RR[2]],top(GEN,.65),.3,{c:cq,a:fa,r:.07,n:4,speed:1.1});
    // the towers: how many of the 188 claims still have their evidence (then their right answer) after each stage
    if(k>=3)tower(R,RW[0]-.6,N.all,k===3?fa:k===7?.75:.55,'188',P.ink,k,e,3);
    if(k>=4)tower(R,FS[0],N.top30,k===4?1:k===7?.75:.55,R.W<520?'186':'186 in top 30',cq,k,e,4);
    if(k>=5)tower(R,RR[0],N.top3,k===5?1:k===7?.75:.55,R.W<520?'178':'178 in top 3',P.c2,k,e,5);
    if(k>=6)tower(R,GEN[0],N.right,k===6?1:.75,R.W<520?'96':'96 right',P.good,k,e,6);
    // 8. around the path: the model deciding to search again (agentic), structure built before the question (GraphRAG), and production around it all
    if(k===7){R.flowArc(top(GEN,.9),top(FS,.85),1.0,{c:P.c2,a:fa,r:.06,n:12,speed:1.1});
      R.label([(GEN[0]+FS[0])/2,1.75,ZQ],'who decides: search again?',{fs:12.5,b:1,c:P.c2,a:fa,wide:1});
      const nodes=[[-.5,.2],[.1,-.25],[.5,.25],[-.2,.55],[.75,-.3],[-.75,-.35]].map(([x,z])=>[GR[0]+x,.55,ZI+z]);
      [[0,1],[1,2],[0,3],[2,3],[1,4],[0,5],[2,4]].forEach(([i,j])=>R.line([nodes[i],nodes[j]],{c:P.c4,w:1.6,a:fa}));
      nodes.forEach(p=>{R.ball(p,.08,{c:P.c4,a:fa});R.line([p,[p[0],0,p[2]]],{c:P.c4,w:.6,a:fa*.35})});
      R.flowArc([BM[0]+.6,.15,ZI],[GR[0]-.6,.5,ZI],.4,{c:P.c4,a:fa*.8,r:.05,n:6,speed:1});
      R.label([GR[0],.6,ZI],'structure before the question',{fs:12.5,b:1,c:P.c4,dy:-26,a:fa,wide:1});
      R.line([[-4.95,0,-2.45],[4.85,0,-2.45],[4.85,0,3.05],[-4.95,0,3.05],[-4.95,0,-2.45]],{c:P.c6,w:2,a:fa*.8});
      R.label([-2.6,0,3.05],'after launch: freshness, access, latency, cost',{fs:12.5,b:1,c:P.c6,dy:12,a:fa,wide:1})}
    // the two halves, named on wide screens
    if(!nar){R.label([-4.95,0,ZI],'index time',{al:'right',dx:-4,mono:true,fs:12,c:ci,a:k<=2||k===7?1:.5,wide:1});R.label([-4.95,0,ZQ],'query time',{al:'right',dx:-4,mono:true,fs:12,c:cq,a:k>=3?1:.4,wide:1})}
  }
  const full={cam:[.22,.9],bounds:[[-5,0,-2.2],[4.9,.5,3.0]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one question, from documents to a cited answer',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:5200,draw,
    margin:w=>w<520?[16,10,14,10]:[22,14,16,90],
    // index-time steps glide in close on the back row; query-time steps show the whole floor
    view:k=>k<=2?{cam:[.3,.8],bounds:[[-4.9,0,-2.3],[2.6,.4,-.3]]}:full});
})();
