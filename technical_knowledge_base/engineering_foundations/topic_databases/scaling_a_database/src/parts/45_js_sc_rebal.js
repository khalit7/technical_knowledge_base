// ---- Scene, Fig. 5 (section 9): Citus adds a fourth worker and rebalances with writes running (renderer v2) ----
// Measured (SC.citus.rebalance): groups per worker before and after, seconds, MB moved, inserts and errors during the move, insert latency.
// Box heights are the 32 shards' measured message counts (SC.citus.shards); which groups moved is illustrative (the counts per worker are measured).
(function(){
  if(!document.getElementById('stg-rebal')||!window.SC)return;const {at,off,lerp,mix,cl}=S3;const C=SC.citus,RB=C.rebalance;
  const ports=Object.keys(RB.per_node_before).sort(),before=ports.map(p=>RB.per_node_before[p]),after=Object.keys(RB.per_node_after).sort().map(p=>RB.per_node_after[p]);
  const mx=Math.max(...C.shards),WX=[-3.75,-1.25,1.25,3.75],WZ=-.55,WR=[0,0,2.5];
  // groups: worker w holds `before[w]` groups; the last (before[w] - after[w]) of each move to the new worker
  let n=0;const G=[];before.forEach((b,w)=>{for(let j=0;j<b;j++){G.push({w,j,si:n,mv:j>=after[w]});n++}});
  let m=0;G.forEach(g=>{if(g.mv)g.to=m++});
  const pos=(w,j)=>[WX[w]-.72+(j%4)*.48,.12,WZ-.55+Math.floor(j/4)*.55],hh=si=>.2+.7*C.shards[si%C.shards.length]/mx;
  const f=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-2.2,3.2,.5);
    R.box(WR,[1.4,.3,.6],{fill:mix(P.paper,P.ink,.06)});R.label([WR[0],.32,WR[2]],'writer',{fs:12.5,b:1,dy:-12});
    const w4=k===0?0:k===1?e:1,sw=k>3||(k===3&&e>.5);
    WX.forEach((x,w)=>{const a=w===3?w4:1;if(a<=0)return;R.box([x,0,WZ],[2.15,.12,1.95],{fill:mix(P.paper,P.ink,.05),a,dz:4});
      const cnt=w===3?(sw?after[3]:0):(sw?after[w]:before[w]);R.label([x,.9,WZ-.95],(R.W<520?'w':'worker ')+(w+1)+' · '+cnt,{fs:12,b:1,dy:-8,a})});
    // empty slots on the new worker
    if(w4>0&&k<=2)for(let j=0;j<after[3];j++){const p=pos(3,j);R.quad([[p[0]-.18,.125,p[2]-.17],[p[0]+.18,.125,p[2]-.17],[p[0]+.18,.125,p[2]+.17],[p[0]-.18,.125,p[2]+.17]],{a:w4*.7,dash:[3,3],ec:P.line})}
    G.forEach(g=>{const h=hh(g.si);let a=1,fill=mix(P.paper,P.c2,.22);
      if(g.mv){if(k===2)fill=mix(P.paper,P.c5,.6);if(k===3){a=1-e;fill=mix(P.paper,P.c5,.6)}if(k>3)a=0}
      R.box(pos(g.w,g.j),[.36,h,.34],{fill,a,lw:.7,shadow:false});
      // the copy on the new worker grows during the copy and becomes the live placement at the switch
      if(g.mv&&k>=2){const ca=k===2?.45+.25*e:k===3?.7+.3*e:1,ch=k===2?h*e:h;
        R.box(pos(3,g.to),[.36,Math.max(.01,ch),.34],{fill:k===2?mix(P.paper,P.c5,.45):mix(P.paper,P.c2,.22),a:ca,lw:.7,shadow:false})}});
    // writes keep arriving: one stream per worker; worker 4 takes its share once its groups are switched
    WX.forEach((x,w)=>{if(w===3&&!sw)return;const a=w===3?(k===3?cl(e*2-1,0,1):1):1;
      R.flowArc([WR[0]+(w-1.5)*.3,.3,WR[2]-.3],[x,.75,WZ+.6],.45,{c:P.c4,a:a*.85,r:.06,speed:1.2,n:7})});
    // the copy: logical replication from each source worker to the new one
    if(k===2)[0,1,2].forEach(w=>{const c=before[w]-after[w];R.flowArc([WX[w]+.6,.9,WZ-.1],[WX[3]-.5,.7,WZ-.1],.9-.12*w,{c:P.c5,a:e,r:.06+.008*c,speed:1.1,n:4+2*c})});
    if(k===2)R.label([WX[3],.7,WZ+.98],'copying 8 groups',{fs:12,b:1,c:P.c5,dy:14,a:e});
    if(k===3)R.label([WX[3],.7,WZ+.98],'p99 '+f(RB.write_p99,2)+' ms · worst '+f(RB.write_max,0)+' ms',{mono:true,fs:12,b:1,c:P.c4,dy:14,a:e,wide:1});
    if(k===4)R.label([WR[0],0,WR[2]+.3],f(RB.moved_mb_messages,0)+' of '+f(RB.total_mb_messages,0)+' MB moved in '+f(RB.seconds,1)+' s · '+f(RB.writes_ok,0)+' inserts, '+RB.writes_err+' errors',{mono:true,fs:12,b:1,c:P.good,dy:16,a:e,wide:1});
  }
  S3.stage({id:'stg-rebal',list:'sx-rebal',fig:'Fig. 5 · a live rebalance, measured',cam:[.12,.7],bounds:[[-5,0,-1.7],[5,1.1,2.9]],aspect:.56,dur:1500,hold:5200,draw,
    // the copy and the switch are about the new worker: the camera moves towards it
    view:k=>k===2||k===3?{cam:[.24,.68],bounds:[[-4.2,0,-1.7],[5,1.1,2.9]]}:null});
})();
