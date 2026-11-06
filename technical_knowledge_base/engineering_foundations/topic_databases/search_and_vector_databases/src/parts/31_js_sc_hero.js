// ---- Scene, the top figure: one question searched by words and by meaning inside one Postgres, then fused (renderer v2) ----
// The running question against the six stored questions of section 3 (SV.tiny: lexemes from Postgres to_tsvector('english'), cosines measured with all-MiniLM-L6-v2).
// BM25 (k1 1.2, b 0.75) and RRF (k 60) are computed here with the page's own SV.bm25 and SV.rrf; timings and nDCG are the measured facts (SV.facts).
// Words lane on the left (blue), meaning lane on the right (orange), each: transform, index, ranking; the fused ranking at the back.
(function(){
  if(!document.getElementById('stg-hero')||!window.SV||!SV.tiny)return;const {at,off,lerp,mix}=S3;
  const D=SV.tiny,F=SV.facts,ql=D.query_lexemes.map(x=>x[0]),n=D.docs.length;
  const B=SV.bm25(D.docs.map(d=>d.lexemes),ql,1.2,.75),cos=D.docs.map(d=>d.cos);
  const lex=B.scores.map((s,i)=>[s,i]).filter(x=>x[0]>0).sort((a,b)=>b[0]-a[0]).map(x=>x[1]);
  const vec=cos.map((s,i)=>[s,i]).sort((a,b)=>b[0]-a[0]).map(x=>x[1]);
  const fused=SV.rrf([lex,vec],60),rrf=new Array(n).fill(0);fused.forEach(([d,s])=>rrf[d]=s);
  const maxB=Math.max(...B.scores),maxR=Math.max(...rrf);
  window.CHK=Object.assign(window.CHK||{},{hero:{bm25:B.scores.map(v=>+v.toFixed(2)),lex:lex.map(i=>i+1),vec:vec.map(i=>i+1),rrf:rrf.map(v=>+v.toFixed(4)),order:fused.map(x=>x[0]+1)}});
  const LX=-2.6,RX=2.6,ZT=1.25,ZI=-.05,ZR=-1.5,ZF=-3.05,qx=i=>(i-(n-1)/2)*.56;
  // the semantic lane's points: each stored question placed at its measured cosine distance from the question (angle arbitrary), plus faint other questions (illustrative)
  const ang=[.4,2.2,3.4,4.6,1.3,5.6],SC=2.1,pt=i=>{const r=(1-cos[i])*SC*.55+.12;return [RX+Math.cos(ang[i])*r*1.15,.32,ZI+Math.sin(ang[i])*r*.7]};
  let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;const cloud=[];for(let i=0;i<34;i++){const a=rnd()*6.283,r=.45+rnd()*.85;cloud.push([RX+Math.cos(a)*r*1.15,.32,ZI+Math.sin(a)*r*.7])}
  const QP=[RX,.32,ZI];
  function bars(R,x0,vals,mx,col,a,e,lab){const nl=lab.nolab;vals.forEach((v,i)=>{const h=Math.max(.02,v/mx*.85*e);R.box([x0+qx(i),0,0+lab.z],[.36,h,.36],{fill:v>0?col:R.P.paper,a,shadow:false});
      if(!nl)R.label([x0+qx(i),0,lab.z+.3],'Q'+(i+1),{fs:12,mono:true,c:R.P.mute,a,dy:8});if(!nl&&e>.5&&lab.fmt)R.label([x0+qx(i),h,lab.z],lab.fmt(v),{fs:12,mono:true,b:1,c:col,a:a*Math.min(1,(e-.5)*2),dy:-9})})}
  function draw(R,k,e){const P=R.P;R.grid(-5.5,5.5,-3.9,3.2,.5);
    const L1=k===1||k===2,R1=k===3||k===4,fa=.22,hideL=R1,hideR=L1; // the camera is on one lane: the other lane's labels are not drawn
    const la=k===0?.5:L1?1:k===5?.35:fa,ra=k===0?.5:R1?1:k===5?.35:fa;
    // the question
    R.box([0,0,2.55],[3.6,.22,.5],{fill:mix(P.paper,P.acc,.12),a:1});
    R.label([0,.22,2.55],'"How do I start investing in shares?"',{serif:true,fs:14,b:1,dy:-10});
    if(!hideL)R.label([LX-1.7,0,ZT],'by words',{fs:13,b:1,c:P.c1,al:'right',a:Math.max(.5,la)});if(!hideR)R.label([RX+1.15,0,ZT],'by meaning',{fs:13,b:1,c:P.c2,al:'left',a:Math.max(.5,ra)});
    // words: three lexemes, then their postings lists in the GIN index
    const lA=k===1?at(k,e,1):la;
    ql.forEach((w,j)=>{const x=LX+(j-1)*1.05;R.box([x,0,ZT],[.92,.2,.42],{fill:mix(P.paper,P.c1,.3),a:lA});if(!hideL)R.label([x,.2,ZT],w,{mono:true,fs:12.5,b:1,a:Math.max(.25,lA),dy:-8})});
    if(k===1)R.flowArc([0,.22,2.3],[LX,.2,ZT+.2],.35,{c:P.c1,a:e,r:.06,n:7});
    const post=ql.map(w=>D.docs.map((d,i)=>d.lexemes.some(l=>l[0]===w)?i:-1).filter(i=>i>=0));
    ql.forEach((w,j)=>{const z=ZI+.38-j*.38;R.box([LX-1.55,0,z],[.62,.16,.26],{fill:mix(P.paper,P.c1,.45),a:la,shadow:false});
      post[j].forEach((d,m)=>R.box([LX-1.0+m*.42,0,z],[.32,.16,.26],{fill:P.paper,a:la,shadow:false}));
      if(k===1)R.flow([[LX-1.55,.17,z],[LX-1.0+(post[j].length-1)*.42,.17,z]],{c:P.c1,a:e,r:.05,n:4,speed:1})});
    if(!hideL)R.label([LX-1.55,0,ZI+.38],'GIN',{mono:true,fs:12,c:P.c1,al:'right',dx:-26,a:Math.max(.4,la),wide:1});
    if(k===1){R.label([LX+.8,.2,ZI],F.fts_ms+' ms',{mono:true,fs:13,b:1,c:P.c1,a:e,al:'left'});R.label([LX+.8,.2,ZI],'LIKE scan: '+F.like_ms+' ms',{mono:true,fs:12,c:P.bad,a:e,al:'left',dy:17})}
    if(k===1)ql.forEach((w,j)=>R.flowArc([LX+(j-1)*1.05,.2,ZT-.2],[LX-1.55,.17,ZI+.38-j*.38],.25,{c:P.c1,a:e*.8,r:.05,n:4}));
    // words ranked by BM25 over the six stored questions
    const bA=k<2?0:k===2?1:la;bars(R,LX,B.scores,maxB,P.c1,bA,k===2?e:1,{z:ZR,fmt:v=>v.toFixed(2),nolab:hideL||k===5});
    if(k===2)lex.forEach(i=>R.flowArc([LX-.8,.17,ZI-.4],[LX+qx(i),.1,ZR+.2],.3,{c:P.c1,a:e*.7,r:.045,n:3}));
    if(bA>0&&!hideL)R.label([LX-1.75,0,ZR],'BM25',{mono:true,fs:12,b:1,c:P.c1,al:'right',a:Math.max(.4,bA),wide:1});
    // meaning: 384 numbers, then the nearest points in the vector index
    const eA=k<3?(k===0?.5:fa):k===3?at(k,e,3):ra;
    {const v=D.first_dims,m=Math.max(...v.map(Math.abs)),wd=1.9,bw=wd/v.length,c=[RX,.3,ZT];
      R.box([c[0],c[1]-.04,c[2]],[wd+.12,.04,.3],{a:eA,shadow:false});[-1,1].forEach(sx=>R.box([c[0]+sx*wd/2,0,c[2]],[.03,c[1]-.04,.03],{a:eA*.9}));
      v.forEach((x,i)=>{const h=Math.max(.012,Math.abs(x)/m*.45),bx=c[0]-wd/2+bw*(i+.5);R.box([bx,x>=0?c[1]:c[1]-.04-h,c[2]],[bw*.7,h,.12],{fill:mix(P.paper,P.c2,.55),a:eA,shadow:false,lw:.7})});
      if(k===3)R.label([RX+1.1,.6,ZT],'first 8 of 384 numbers',{mono:true,fs:12,c:P.mute,al:'left',a:e,wide:1});
      if(k===3)R.flowArc([0,.22,2.3],[RX,.3,ZT+.2],.35,{c:P.c2,a:e,r:.06,n:7})}
    cloud.forEach(p=>R.ball(p,.045,{c:P.mute,a:ra*.5}));
    D.docs.forEach((d,i)=>{const p=pt(i),near=k>=3&&i!==5;R.ball(p,.07,{c:near?P.c2:P.mute,a:ra});if(k===3&&near)R.line([QP,p],{c:P.c2,w:1.2,a:e*.7});
      if(k===3||k===4)R.label(p,'Q'+(i+1),{fs:12,mono:true,c:P.ink,a:ra*(k===3?e:1),dy:-11})});
    R.glow(QP,.32,{c:P.c2,a:k>=3?ra:ra*.5});R.ball(QP,.09,{c:P.c2,a:Math.max(.3,ra)});
    if(k===3){R.flowArc([RX,.3,ZT-.2],QP,.2,{c:P.c2,a:e,r:.06,n:5});R.label([RX+1.4,.2,ZI],F.hnsw40_p50+' ms, recall '+F.hnsw40_rec,{mono:true,fs:13,b:1,c:P.c2,a:e,al:'left',dx:6});R.label([RX+1.4,.2,ZI],'exact scan: '+F.exact_p50+' ms',{mono:true,fs:12,c:P.bad,a:e,al:'left',dx:6,dy:17})}
    if(!hideR)R.label([RX-1.4,0,ZI+.5],'HNSW',{mono:true,fs:12,c:P.c2,al:'right',a:Math.max(.4,ra),wide:1});
    // meaning ranked by cosine
    const cA=k<4?0:k===4?1:ra;bars(R,RX,cos,1,P.c2,cA,k===4?e:1,{z:ZR,fmt:v=>v.toFixed(2),nolab:hideR||k===5});
    if(k===4)vec.slice(0,5).forEach(i=>R.flowArc(pt(i),[RX+qx(i),.1,ZR+.2],.3,{c:P.c2,a:e*.7,r:.045,n:3}));
    if(cA>0)R.label([RX+1.75,0,ZR],'cosine',{mono:true,fs:12,b:1,c:P.c2,al:'left',a:Math.max(.4,cA),wide:1});
    // fused with RRF: every question collects 1 / (60 + rank) from each list it is in
    if(k===5){D.docs.forEach((_,i)=>{const w=rrf[i]/maxR;if(lex.includes(i))R.flowArc([LX+qx(i),.6,ZR],[qx(i),.4,ZF],.4,{c:P.c1,a:e*.8,r:.04+.03*w,n:3});R.flowArc([RX+qx(i),.6,ZR],[qx(i),.4,ZF],.4,{c:P.c2,a:e*.8,r:.04+.03*w,n:3})});
      bars(R,0,rrf,maxR,P.c4,1,e,{z:ZF,fmt:v=>'#'+(fused.findIndex(f=>f[1]===v)+1)});R.label([-1.8,0,ZF],'fused rank',{mono:true,fs:12,b:1,c:P.c4,al:'right',a:e,wide:1});
      R.label([0,1.25,ZF-.3],'measured: Quora '+F.hyb_q+' (vectors '+F.vec_q+') · SciFact '+F.s_hyb+' (BM25 '+F.s_bm25+')',{fs:12.5,b:1,c:P.c4,a:e,dy:-14,wide:1})}
  }
  const full={cam:[0,.92],bounds:[[-5,0,-3.4],[5,1,2.85]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'One question, two shortcuts, one SQL statement',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1400,hold:5200,draw,
    margin:w=>w<520?[18,8,14,8]:[24,20,18,20],
    view:k=>k===0?{cam:[0,.85],bounds:[[-5,0,-1.9],[5,1,2.85]]}:k===1||k===2?{cam:[.16,.8],bounds:[[-5,0,-1.9],[.3,1.1,2.2]]}:k===3||k===4?{cam:[-.16,.8],bounds:[[-.3,0,-1.9],[5,1.1,2.2]]}:full});
})();
