// ---- Scene: Fig. 1, the pipeline (renderer v2). Index time behind, query time in front; every number on a label is the page's own data:
// chunking from the root's runs (RPD.root_chunking, bge-small, found within 1,024 tokens), the chat rewrite (RPD.root_qtrans conv, rank 1 of 8 chats),
// the post-filter (RPD.root_filter, 10% visible, K 10), fusion (RPD.fu.agg, Qwen3-Embedding alone against RRF k 60), and the evidence of
// 188 SciFact claims through the root's end-to-end run (RPE.conds rr30@3). The reranker's 0.778 is the root's run, quoted in the step text. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.RPD||!window.RPE)return;const {at,off,lerp,mix}=S3;
  const D=RPD,C=RPE.conds['rr30@3'],RC=D.root_chunking,Q=D.fu.agg.scifact.models['qwen3-emb-0.6b'];
  const pc=v=>(100*v).toFixed(1)+'%',f3=v=>v.toFixed(3);
  const conv=D.root_qtrans['bge-small'].conv,r1a=conv.filter(c=>c.alone===1).length,r1r=conv.filter(c=>c.rewrite===1).length;
  const post=D.root_filter.groups['10'].post['10'].returned_mean;
  const NUM={chunk:pc(RC['fixed-256-32']['bge-small'].budget['1024'])+' → '+pc(RC['structure-256']['bge-small'].budget['1024']),
    chat:'chat follow-ups at rank 1: '+r1a+' → '+r1r+' of '+conv.length,filt:'post-filter: '+post+' of 10',fuse:f3(Q.single)+' → '+f3(Q.methods.rrf.curve['60'])};
  const ZI=-1.5,ZQ=1.1,BW=1.2,BH=.28,BD=.7;
  const IX=[-4.4,-2.3,-.2],QX=[-4.4,-2.6,-.8,1.0,2.8,4.6];
  const IN=['documents','chunks + metadata','two indexes'],QN=['question','rewrite','search both','fuse','rerank top 30','prompt + answer'];
  function station(R,x,z,o){const P=R.P;R.box([x,0,z],[BW,BH,BD],{fill:o.fill||P.paper,a:o.a});if(o.lab)R.label([x,BH,z-BD/2],o.lab,{fs:12.5,b:1,dy:-12,a:o.a,c:o.c||P.ink,wide:o.wide})}
  function draw(R,k,e){const P=R.P;R.grid(-5.6,5.6,-2.6,2.3,.5);
    // index time, the back lane
    const ia=k===0?1:k===2?.45:.28;
    station(R,IX[0],ZI,{a:ia,lab:k===0?IN[0]:null});
    // the document as a tall slab, cut into chunks at step 1
    const ca=k===0?1:ia;
    for(let j=0;j<5;j++)R.box([IX[1]-.45+j*.225,BH,ZI],[.18,.22+.09*((j*37)%5)/4,.42],{fill:mix(P.paper,P.c1,.3),a:ca*(k===0?e:1),shadow:false});
    station(R,IX[1],ZI,{a:ia,lab:k===0?IN[1]:null,fill:mix(P.paper,P.c1,.15)});
    // two indexes: an inverted index (BM25) and a vector index, as two glass plates
    const ga=k===0?e:k===2?.9:.4;
    R.glass([IX[2]-.7,.04,ZI-.45],[.6,0,0],[0,.9,0],{c:P.c5,a:ga,nu:4,nv:6});R.glass([IX[2]+.1,.04,ZI-.45],[.6,0,0],[0,.9,0],{c:P.c1,a:ga,nu:4,nv:6});
    if(k===0||k===2){R.label([IX[2]-.4,.95,ZI-.45],'BM25',{fs:12.5,b:1,dy:-8,c:P.c5,a:ga});R.label([IX[2]+.4,.95,ZI-.45],'vectors',{fs:12.5,b:1,dy:-8,c:P.c1,a:ga})}
    if(k===0){R.flowArc([IX[0]+.5,BH,ZI],[IX[1]-.5,BH+.3,ZI],.35,{c:P.c1,a:e,n:6,speed:1.3});R.flowArc([IX[1]+.5,BH+.3,ZI],[IX[2]-.4,.5,ZI-.45],.4,{c:P.c5,a:e,n:6,speed:1.3});
      R.flowArc([IX[1]+.5,BH+.3,ZI],[IX[2]+.4,.5,ZI-.45],.5,{c:P.c1,a:e,n:6,speed:1.3});
      R.label([IX[1],0,ZI+BD/2],'cut where the author did · found '+NUM.chunk,{fs:12.5,mono:true,dy:16,c:P.c1,a:e,b:1,wide:1})}
    // query time, the front lane
    QX.forEach((x,i)=>{let a=k===0?.14:k===1?(i<=2?1:.3):k===2?(i>=2&&i<=4?1:.3):k===3?(i>=4?1:.3):(i===0||i===2||i===4||i===5?1:.3);
      station(R,x,ZQ,{a,lab:(k===1&&i===0)||(k===2&&i>=2&&i<=4)||(k===3&&i===4)?QN[i]:null,fill:i===2&&k>=1?mix(P.paper,P.acc,.2):i===3?mix(P.paper,P.c4,.2):i===4?mix(P.paper,P.c2,.2):P.paper})});
    if(k===1){R.flowArc([QX[0]+.5,BH,ZQ],[QX[1]-.5,BH,ZQ],.3,{c:P.acc,a:e,n:5,speed:1.4});R.flowArc([QX[1]+.5,BH,ZQ],[QX[2]-.5,BH,ZQ],.3,{c:P.acc,a:e,n:5,speed:1.4});
      // the filter inside the search: a glass lid on the search station
      R.glass([QX[2]-.65,BH+.06,ZQ-.4],[1.3,0,0],[0,0,.8],{c:P.acc,a:e,nu:5,nv:3});
      R.label([QX[1],BH,ZQ-BD/2],'rewrite · '+NUM.chat,{fs:12.5,mono:true,dy:-12,c:P.acc,a:e,b:1,wide:1});
      R.label([QX[2],0,ZQ+BD/2],'search, filter inside · '+NUM.filt+' if after',{fs:12.5,mono:true,dy:16,c:P.acc,a:e,b:1,wide:1})}
    // both indexes answer the search: two lists stream into the fuser, which streams into the reranker
    if(k===2){R.flowArc([IX[2]-.4,.6,ZI-.4],[QX[2]-.2,BH+.05,ZQ-.2],.5,{c:P.c5,a:e,n:8,speed:1.3});R.flowArc([IX[2]+.4,.6,ZI-.4],[QX[2]+.2,BH+.05,ZQ-.2],.5,{c:P.c1,a:e,n:8,speed:1.3});
      R.flowArc([QX[2]+.5,BH,ZQ-.12],[QX[3]-.5,BH,ZQ-.12],.35,{c:P.c5,a:e,n:5,speed:1.3});R.flowArc([QX[2]+.5,BH,ZQ+.12],[QX[3]-.5,BH,ZQ+.12],.35,{c:P.c1,a:e,n:5,speed:1.3});
      R.flowArc([QX[3]+.5,BH,ZQ],[QX[4]-.5,BH,ZQ],.35,{c:P.c4,a:e,n:6,speed:1.3});
      R.label([QX[3],0,ZQ+BD/2],'RRF · nDCG@10 '+NUM.fuse,{fs:12.5,mono:true,dy:16,c:P.c4,a:e,b:1,wide:1});
      R.label([QX[4],0,ZQ+BD/2],'cross-encoder · → 0.778',{fs:12.5,mono:true,dy:16,c:P.c2,a:e,b:1,wide:1})}
    // the prompt: three chunks with ids, then the answer
    if(k===3){for(let j=0;j<3;j++)R.box([QX[5]-.3+j*.3,BH,ZQ],[.22,.34-.06*j,.5],{fill:mix(P.paper,P.c2,.35),a:e,shadow:false});
      R.flowArc([QX[4]+.5,BH,ZQ],[QX[5]-.5,BH+.2,ZQ],.35,{c:P.c2,a:e,n:6,speed:1.3});
      R.label([QX[5],BH+.4,ZQ],'prompt: [1] [2] [3]',{fs:12.5,mono:true,dy:-14,c:P.c2,a:e,b:1});
      R.label([QX[5],0,ZQ+BD/2],'top 3 with ids · answer cites one',{fs:12.5,mono:true,dy:16,al:'right',dx:40,c:P.ink,a:e,wide:1})}
    // the evidence of 188 claims, as towers: asked, in the fused top 30, in the top 3, answered right and cited
    if(k===4){const H=2.2/C.n,T=[[0,C.n,'asked'],[2,C.in_K,'in top '+C.K],[4,C.in_k,'in top '+C.k],[5,C.correct_strict,'right, cited']];
      const lost=[[2,C.n-C.in_K,P.bad],[4,C.in_K-C.in_k,P.c2],[5,C.in_k-C.correct_strict,P.c5]];
      T.forEach(([i,v,l],j)=>{const h=v*H*e;R.box([QX[i],BH,ZQ],[.62,Math.max(.012,h),.5],{fill:P.acc,a:.95,shadow:false});
        R.label([QX[i],BH+h,ZQ],v+' '+l,{mono:true,fs:12.5,dy:-12,b:1,c:P.acc,a:e})});
      lost.forEach(([i,v,c])=>{const h=v*H*e;R.box([QX[i]+.5,BH,ZQ+.1],[.28,Math.max(.012,h),.3],{fill:c,a:.9,shadow:false});
        R.label([QX[i]+.5,0,ZQ+.25],'−'+v,{mono:true,fs:12.5,dy:16,b:1,c,a:e})});
      for(let i=0;i<5;i++)if(i!==1&&i!==3)R.flowArc([QX[i]+.4,BH+.05,ZQ-.2],[QX[i+1+(i===2||i===0?1:0)]-.4,BH+.05,ZQ-.2],.2,{c:P.acc,a:e*.6,n:4,speed:1.2})}
  }
  const full={cam:[.28,.6],bounds:[[-5.2,0,-2.0],[5.3,1.2,1.6]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the pipeline, measured',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[28,18,28,18],
    view:k=>k===0?{cam:[.3,.62],bounds:[[-5.2,0,-2.0],[.8,1.1,.2]]}:k===1?{cam:[.3,.6],bounds:[[-5.2,0,-.2],[.6,.9,1.7]]}:k===2?{cam:[.3,.62],bounds:[[-1.6,0,-2.0],[3.6,1.1,1.7]]}:k===3?{cam:[.3,.6],bounds:[[1.8,0,.2],[5.4,1.0,1.7]]}:{cam:[.25,.42],bounds:[[-5.2,0,.2],[5.4,2.6,1.7]]}});
})();
