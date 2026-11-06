// ---- Scene, Fig. 3 (section 6): one Cassandra write at QUORUM with one replica down, on a ring of six nodes (renderer v2) ----
// Layout illustrative (RF = 3, six nodes); the rules are Cassandra's documented ones and the defaults measured in cassandra.yaml (inputs/wide.json).
(function(){
  if(!document.getElementById('stg-wp'))return;const {at,off,lerp,mix}=S3;
  const D=(window.NQ&&NQ.wide&&NQ.wide.cass_defaults)||{};
  const RR=2.3,np=j=>{const a=j*Math.PI/3;return [RR*Math.sin(a),0,RR*Math.cos(a)]};
  const CO=0,A=2,B=3,C=4,CL=[-3.5,0,1.9],NM={2:'A',3:'B',4:'C'};
  function draw(R,k,e){const P=R.P;R.grid(-5,4,-3.4,3.6,.5);
    // the ring
    const ring=[];for(let i=0;i<=60;i++){const t=i/60*Math.PI*2;ring.push([RR*Math.sin(t),.02,RR*Math.cos(t)])}R.line(ring,{c:P.line,w:2.2});
    const tokA=Math.PI*(2.5/3),tok=[RR*Math.sin(tokA),.25,RR*Math.cos(tokA)];
    // the client
    R.box(CL,[.8,.5,.6],{fill:mix(P.paper,P.c2,.2)});R.label([CL[0],.5,CL[2]],'client',{fs:12.5,b:1,dy:-12});
    for(let j=0;j<6;j++){const p=np(j),rep=j>=A&&j<=C,down=j===C,co=j===CO,dim=k>=1&&!rep&&!co?.45:1;
      R.box(p,[1.25,.16,1.25],{fill:down&&k>=1?mix(P.paper,P.bad,.25):co?mix(P.paper,P.c2,.3):rep&&k>=1?mix(P.paper,P.c1,.25):P.paper,a:dim,ec:down&&k>=1?P.bad:null});
      if(rep&&!down){
        // the commit log: a strip of entries; the memtable: a sorted buffer in memory
        const lg=[p[0]-.25,.16,p[2]];for(let s=0;s<4;s++){const nw=s===3;R.box([lg[0],.16,lg[2]-.3+s*.2],[.3,.12,.16],{fill:nw?mix(P.paper,P.c2,at(k,e,2)):mix(P.paper,P.c5,.35),a:nw?at(k,e,2):1,shadow:false,lw:.6})}
        const flushed=k>=5?e:0;R.box([p[0]+.22,.16,p[2]],[.38,.34*(1-.7*flushed),.6],{fill:mix(P.paper,P.c1,k>=2?.55:.25),shadow:false,a:1});
        if(k>=2&&k<5)R.ball([p[0]+.22,.6,p[2]],.07,{c:P.c2,a:at(k,e,2)});
        // SSTables on disk beside the node: flush adds one, compaction merges the two oldest
        const sx=p[0]+.75;for(let s=0;s<3;s++){const isNew=s===2,merged=s<2;R.box([sx,s*.13,p[2]],[.32,.11,.5],{fill:isNew?mix(P.paper,P.c1,.55):P.paper,a:isNew?(k>=5?e:0):merged&&k>=5?1-.5*e:1,lw:.6,shadow:s===0})}}
      if(down&&k>=1)R.label([p[0],.16,p[2]],'C: down',{fs:12.5,b:1,c:P.bad,dy:-12});
      else if(NM[j]&&k>=1)R.label([p[0],0,p[2]],'replica '+NM[j],{fs:12.5,b:1,dy:-34,c:P.c1});
      if(co)R.label([p[0],0,p[2]+.5],'coordinator',{fs:12.5,b:1,dy:14,c:P.c2})}
    // 1. the client to any node
    const cp=np(CO);if(k===0||k===3){const back=k===3;R.flowArc(back?[cp[0]-.3,.25,cp[2]]:[CL[0]+.4,.45,CL[2]],back?[CL[0]+.4,.45,CL[2]]:[cp[0]-.3,.25,cp[2]],.5,{c:back?P.good:P.c2,a:back?at(k,e,3):1,r:.07,n:6})}
    // 2. the token on the ring and the three replicas that own it
    if(k>=1){R.glow(tok,.35,{c:P.c1,a:k===1?e:.6});R.ball(tok,.08,{c:P.c1});
      if(k===1)[A,B,C].forEach(j=>R.arc(tok,[np(j)[0],.2,np(j)[2]],.25,{c:j===C?P.bad:P.c1,w:2,t:e,dash:j===C?[4,4]:null}));
      R.label(tok,'token(7, 3)',{mono:true,fs:12.5,b:1,dy:-14,c:P.c1,a:k===1?e:.8})}
    // 3. the write streams to the live replicas; C gets nothing
    if(k===2)[A,B].forEach(j=>R.flowArc([cp[0],.3,cp[2]],[np(j)[0],.45,np(j)[2]],.9,{c:P.c2,r:.07,n:9}));
    if(k===2){const p=np(A);R.label([p[0]-.25,.3,p[2]+.3],'commit log',{fs:12,dy:14,c:P.c5,grp:'wp'});R.label([p[0]+.22,.5,p[2]],'memtable',{fs:12,dy:-14,c:P.c1,grp:'wp'})}
    // 4. two acknowledgements make a quorum
    if(k===3){[A,B].forEach(j=>R.flowArc([np(j)[0],.45,np(j)[2]],[cp[0],.3,cp[2]],.9,{c:P.good,r:.06,n:6}));
      R.label([cp[0],.2,cp[2]],'QUORUM = 2 of 3: OK',{fs:13,b:1,dy:-18,c:P.good})}
    // 5. a hint for C, kept by the coordinator
    if(k>=4){const ha=k===4?e:.6;R.box([cp[0]+.3,.16,cp[2]],[.35,.25,.35],{fill:mix(P.paper,P.bad,.35),a:ha,shadow:false});
      R.arc([cp[0]+.3,.45,cp[2]],[np(C)[0],.3,np(C)[2]],1.1,{c:P.bad,w:1.6,dash:[5,4],a:ha});
      if(k===4)R.label([cp[0]+.3,.45,cp[2]],'hint for C: replayed if C returns within 3 h',{fs:12.5,b:1,dy:-14,c:P.bad,a:e})}
    // 6. flush and compaction
    if(k===5){const p=np(A);R.flowArc([p[0]+.22,.3,p[2]],[p[0]+.75,.35,p[2]],.3,{c:P.c1,r:.05,n:4});
      R.label([p[0]+.75,0,p[2]+.3],'flushed to an SSTable',{fs:12.5,b:1,dy:18,c:P.c1});
      R.label([1.2,0,-.3],'commitlog_sync: '+(D.commitlog_sync||'periodic')+', every '+(D.commitlog_sync_period||'10000ms'),{mono:true,fs:12,dy:16,c:P.mute,wide:1})}
  }
  const full={cam:[.45,.66],bounds:[[-4,0,-2.9],[3,.8,2.9]]};
  S3.stage({id:'stg-wp',list:'sx-wp',fig:'Fig. 3 · one write at QUORUM, RF 3, one replica down',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4800,draw,
    // the log-and-memtable step and the flush step move in towards the replicas
    view:k=>k===5?{cam:[.55,.55],bounds:[[-.9,0,-3],[3.2,1,0]]}:k===2?{cam:[.5,.6],bounds:[[-1.2,0,-3],[3,.8,2.9]]}:full});
})();
