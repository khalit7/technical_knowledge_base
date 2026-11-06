// ---- Scene: Fig. 4, a row-level-security policy applied after an HNSW scan (renderer v2), for the hr user, who may read 110 of the
// 5,183 SciFact abstracts (PRD.aclpg: group sizes, rows returned, empty claims and recall, all measured). The table's bands are to scale.
// The candidates' groups are illustrative: groups were assigned by a hash of the id, so they are independent of the claim, and the
// drawing places one hr row in every 47 candidates (1 ÷ 2.1%), which is what the measured 0.96 rows per 40 candidates averages to. ----
(function(){
  if(!document.getElementById('stg-rls')||!window.PRD||!PRD.aclpg)return;const {at,off,lerp,mix}=S3;
  const G=PRD.aclpg,GS=G.info.group_share,U=G.users.hr.modes,N=G.info.n_docs;
  const GR=['public','eng','sales','legal','hr'];
  // candidates in distance order: hr every 47th (from 23), the others drawn at their measured shares with a fixed seed
  const NC=480,HR=new Set([...Array(10).keys()].map(i=>23+47*i)),seq=[];let s=11;const rest=GR.slice(0,4),tot=rest.reduce((a,g)=>a+GS[g],0);
  for(let i=0;i<NC;i++){if(HR.has(i)){seq.push('hr');continue}s=(s*1103515245+12345)%2147483648;let u=s/2147483648*tot,g=0;while(u>GS[rest[g]]&&g<3){u-=GS[rest[g]];g++}seq.push(rest[g])}
  const ZT=-2.9,ZC=-.2,ZO=1.6,CW=.2,X0=-4.0,RS=.17;
  const cx=i=>X0+(i%40)*CW,cz=i=>ZC-Math.floor(i/40)*RS;
  const f3=x=>x.toFixed(3);
  function draw(R,k,e){const P=R.P,COL={public:P.c1,eng:P.c3,sales:P.c5,legal:P.c4,hr:P.acc};R.grid(-5.2,5.0,-3.6,2.3,.5);
    // the table: one band per group, widths to scale (5,183 rows over 8 units)
    let x=X0;const W=8.0;GR.forEach(g=>{const w=W*GS[g]/N,hl=g==='hr';R.box([x+w/2,0,ZT],[w-.02,hl?.45:.3,.7],{fill:mix(P.paper,COL[g],hl?.7:.3),a:k===0||hl?1:.5});
      if(k===0)R.label([x+w/2,g==='legal'||g==='sales'?0:hl?.45:.3,ZT+(g==='legal'||g==='sales'?.35:0)],g+' '+GS[g].toLocaleString('en-US'),{fs:12,mono:true,dy:g==='legal'?30:g==='sales'?14:-12,c:hl?P.acc:P.ink,b:hl});x+=w});
    const xh=X0+W*(N-GS.hr/2)/N;
    // the ten result slots in front
    const filled=k===0?10*e:k===1?0:k===2?U.rls_prepared.rows_mean*e:k===3?10*e:0;
    for(let i=0;i<10;i++){const xs=-1.35+i*.3,f=i<Math.floor(filled+1e-6)||(i===Math.floor(filled)&&filled%1>.5);
      R.box([xs,0,ZO],[.24,f?.3:.05,.3],{fill:f?mix(P.paper,P.acc,.6):P.paper,a:f?1:.6,shadow:false})}
    R.label([0,0,ZO+.3],'10 rows asked for',{fs:12,mono:true,dy:16,c:P.mute});
    // step 1: a fresh plan reads the B-tree on the group column, takes the 110 hr rows and sorts them exactly
    if(k===0){R.flowArc([xh,.45,ZT],[0,.3,ZO-.2],.7,{c:P.acc,a:e,n:12,speed:1.3});
      R.label([0,0,ZO+.3],'fresh plan · recall@10 '+f3(U.rls_planner.recall10),{fs:12.5,b:1,dy:36,c:P.acc,a:e})}
    // steps 2 to 4: the HNSW scan hands over candidates in distance order, any group
    const nshow=k===1?40*e:k===2?40:k===3?40+(NC-40)*e:0;
    if(k>=1){for(let i=0;i<Math.min(NC,Math.ceil(nshow));i++){const g=seq[i],hr=g==='hr',kept=k===1||hr,a=(k===1?1:hr?1:.12)*(i<40?1:.75);
        if(hr)R.box([cx(i),0,cz(i)],[CW*.8,kept&&k>=2?.28:.14,RS*.8],{fill:COL.hr,a,shadow:false,lw:.6});
        else R.quad([[cx(i)-CW*.4,0.005,cz(i)-RS*.4],[cx(i)+CW*.4,0.005,cz(i)-RS*.4],[cx(i)+CW*.4,0.005,cz(i)+RS*.4],[cx(i)-CW*.4,0.005,cz(i)+RS*.4]],{fill:mix(P.paper,COL[g],.6),a,ea:.4,lw:.5})}
      if(k===1){R.flowArc([0,.35,ZT+.35],[cx(20),.1,ZC],.5,{c:P.mute,a:e,n:12,speed:1.4});R.label([cx(20),.1,ZC],'HNSW · ef_search 40 nearest, any group',{fs:12.5,b:1,dy:-18,a:e})}}
    // the policy as a filter after the scan: a glass plate between the candidates and the result
    if(k>=2){const ga=k===2?e:1;R.glass([X0-.2,0,ZC+.45],[8.2,0,0],[0,.5,0],{c:P.acc,a:ga*.8,nu:20,nv:2});
      R.label([X0-.2,.5,ZC+.45],'policy: grp = hr',{al:'left',fs:12.5,b:1,dy:-12,c:P.acc,a:ga});
      if(k===2){R.flowArc([cx(23),.3,ZC],[-1.35,.3,ZO],.45,{c:P.acc,a:e,n:6,speed:1.2});
        R.label([0,0,ZO+.3],R.W<520?U.rls_prepared.rows_mean.toFixed(2)+' rows · '+U.rls_prepared.queries_empty+' of 300 empty':U.rls_prepared.rows_mean.toFixed(2)+' rows on average · '+U.rls_prepared.queries_empty+' of 300 claims got none',{fs:12.5,mono:true,c:P.bad,dy:36,a:e});
        R.label([0,0,ZO+.3],'recall@10 '+f3(U.rls_prepared.recall10),{fs:12.5,mono:true,c:P.bad,dy:54,a:e})}
      if(k===3){[...HR].forEach(i=>R.flowArc([cx(i),.3,cz(i)],[-1.35+[...HR].indexOf(i)*.3,.3,ZO],.4,{c:P.acc,a:e*.8,n:3,speed:1.3,r:.05}));
        R.label([X0-.2,0,cz(NC-1)],'about 470 candidates walked (10 ÷ 2.1%)',{al:'left',fs:12.5,mono:true,dy:16,c:P.mute,a:e,wide:1});
        R.label([0,0,ZO+.3],(R.W<520?'recall ':'iterative scan · recall ')+'relaxed '+f3(U.rls_hnsw_relaxed.recall10)+' · strict '+f3(U.rls_hnsw_strict.recall10),{fs:12.5,mono:true,c:P.good,dy:36,a:e})}}
  }
  const full={cam:[.15,.85],bounds:[[-4.3,0,-3.3],[4.3,.6,1.9]]};
  S3.stage({id:'stg-rls',list:'sx-rls',fig:'Fig. 4 · the hr user through an HNSW scan',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,60,8]:[26,18,70,18],
    view:k=>k===1||k===2?{cam:[.15,.8],bounds:[[-4.3,0,-.6],[4.3,.6,1.9]]}:k===3?{cam:[.15,1.0],bounds:[[-4.3,0,-2.3],[4.3,.6,1.9]]}:null});
})();
