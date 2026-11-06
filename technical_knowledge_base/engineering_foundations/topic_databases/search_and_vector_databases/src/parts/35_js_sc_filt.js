// ---- Scene, section 10: a filtered vector query in pgvector: post-filter, iterative scan, B-tree pre-filter, and the 10% case (renderer v2) ----
// The field is the 1,000 stored vectors nearest the query, in the order an HNSW scan returns them (nearest row in front, 40 per row = ef_search 40).
// Which of them belong to the tenant is illustrative (exactly 1% or 10% of the field); every number in the labels and the step list is measured (SV.ann.filter).
(function(){
  if(!document.getElementById('stg-filt')||!window.SV||!SV.ann||!SV.ann.filter)return;const {at,off,lerp,mix}=S3;
  const A=SV.ann.filter,T1=A.tenant,T10=A.tenant10,C=40,RW=25,N=C*RW,f1=(v,d)=>v.toFixed(d);
  window.CHK=Object.assign(window.CHK||{},{filt:{post1:T1.hnsw_post_filter.rows_mean,zero1:T1.hnsw_post_filter.zero_rows_share,strict1:T1.hnsw_strict.p50_ms,relaxed1:T1.hnsw_relaxed.p50_ms,relaxedRec1:T1.hnsw_relaxed.recall10,pre1:T1.btree_prefilter_exact.p50_ms,pre10:T10.btree_prefilter_exact.p50_ms,post10:T10.hnsw_post_filter.rows_mean,relaxed10:T10.hnsw_relaxed.p50_ms}});
  // tenant members: 10 of the 1,000 for the 1% filter (none in the front row, the most common case: 68% of queries), 100 for the 10% filter (4 in the front row)
  let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const m1=new Set();while(m1.size<10){const i=C+Math.floor(rnd()*(N-C));if(m1.size===9&&Math.floor(i/C)<RW-2)continue;m1.add(i)}
  const m10=new Set([3,14,22,35]);while(m10.size<100){const i=C+Math.floor(rnd()*(N-C));m10.add(i)}
  const tenth=(S,k)=>[...S].sort((a,b)=>a-b)[k-1],stop1=Math.floor(tenth(m1,10)/C),stop10=Math.floor(tenth(m10,10)/C);
  const X=c=>(c-(C-1)/2)*.17,Z=r=>2-r*.17,QP=[0,.25,2.75];
  function draw(R,k,e){const P=R.P;R.grid(-4.4,4.4,-2.9,3.4,.5);
    const ten=k===3,M=ten?m10:m1,T=ten?T10:T1;
    // how far the scan has read: the first row (ef_search 40) for a plain scan; on, row by row, for an iterative scan
    const rows=k===0?1:k===1?1+Math.floor(e*stop1):k===3?1+Math.floor(e*stop10):k===4?1:0;
    const fieldA=k===2?.25:1;
    for(let i=0;i<N;i++){const r=Math.floor(i/C),c=i%C,mem=M.has(i),read=r<rows;
      const fill=mem?(read?P.good:mix(P.paper,P.good,.5)):read?mix(P.paper,P.c2,.45):P.paper;
      R.quad([[X(c)-.07,.005,Z(r)-.07],[X(c)+.07,.005,Z(r)-.07],[X(c)+.07,.005,Z(r)+.07],[X(c)-.07,.005,Z(r)+.07]],{fill,a:fieldA*(read||mem?1:.55)})}
    R.ball(QP,.1,{c:P.c2});R.glow(QP,.3,{c:P.c2,a:.6});R.label(QP,'query',{fs:12.5,b:1,c:P.c2,dy:14});
    if(k<2||k===4){R.label([X(0),0,Z(0)],'nearest',{fs:12,c:P.mute,al:'right',dx:-8,wide:1});R.label([X(0),0,Z(RW-1)],'1,000th nearest',{fs:12,c:P.mute,al:'right',dx:-8,wide:1})}
    // 1. post-filter: one ef_search batch, then WHERE drops the rest
    if(k===0||k===4){R.flowArc(QP,[0,.05,Z(0)],.25,{c:P.c2,a:e,r:.06,n:6});
      R.label([0,.05,Z(RW-1)],'40 candidates · '+f1(T.hnsw_post_filter.rows_mean,2)+' rows pass on average',{fs:13,b:1,c:P.bad,dy:-16,a:e})}
    // 2. and 4. iterative scan: resume batch after batch until 10 rows pass
    if(k===1||k===3){const r=Math.max(0,rows-1);R.flow([[0,.05,Z(0)],[0,.05,Z(r)]],{c:P.c2,a:1,r:.06,n:8,speed:1.6});
      let found=0;M.forEach(i=>{if(Math.floor(i/C)<rows&&found<10){found++;R.glow([X(i%C),.02,Z(Math.floor(i/C))],.18,{c:P.good,a:.9})}});
      R.label([0,.05,Z(RW-1)],(rows*C).toLocaleString('en-GB')+' candidates read · '+found+' of 10 found',{fs:13,b:1,mono:true,c:P.good,dy:-16})}
    // 3. pre-filter: a B-tree on tenant hands over only the tenant's rows; exact distance to each
    if(k===2){const bt=[-2.1,0,3.35],bx=[2.1,0,3.35];R.box(bt,[1.3,.3,.6],{fill:mix(P.paper,P.c3,.35),a:e});R.label([bt[0],.3,bt[2]],'B-tree on tenant',{fs:12.5,b:1,mono:true,c:P.c3,a:e,dy:-10});
      R.box(bx,[1.6,.45,.7],{fill:mix(P.paper,P.good,.45),a:e});R.label([bx[0],.45,bx[2]],'5,230 rows, exact',{fs:12.5,b:1,mono:true,c:P.good,a:e,dy:-10});
      R.flow([[bt[0]+.65,.15,bt[2]],[bx[0]-.8,.15,bx[2]]],{c:P.c3,a:e,r:.07,n:10,speed:1.4});R.flowArc(QP,[bx[0],.45,bx[2]],.4,{c:P.c2,a:e,r:.06,n:6});
      R.label([0,0,Z(12)],'the HNSW index is not used',{fs:13,b:1,c:P.mute,a:e})}
    if(k===4)R.label([0,.05,Z(RW-1)],'the planner chose this: rows=0, Rows Removed by Filter: 41',{fs:12.5,b:1,mono:true,c:P.bad,dy:-38,a:e});
    if(k===3)R.label([0,.05,Z(RW-1)],'10% filter: '+f1(T.hnsw_post_filter.rows_mean,2)+' pass in the first 40',{fs:12.5,b:1,c:P.good,dy:-38});
  }
  const full={cam:[.25,.8],bounds:[[-3.6,0,-2.2],[3.6,.4,3.5]]};
  S3.stage({id:'stg-filt',list:'sx-filt',fig:'A filtered vector query in pgvector',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1600,hold:5200,draw,
    margin:w=>w<520?[40,8,14,8]:[56,24,18,90],
    view:k=>k===0?{cam:[.2,.62],bounds:[[-3.6,0,.4],[3.6,.3,3]]}:full});
})();
