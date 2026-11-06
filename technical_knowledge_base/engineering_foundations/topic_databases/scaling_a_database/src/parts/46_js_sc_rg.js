// ---- Scene, Fig. 6 (section 11): four CockroachDB ranges on three nodes through the measured kill sequence (renderer v2) ----
// From the run (SC.crdb): the ranges and their replicas (SHOW RANGES: every replica set {1,2,3}, every lease on node 1), the kill and restart times,
// and the inserts per second in each stretch (averages of the per-second counts, as in the tiles under the strip).
(function(){
  if(!document.getElementById('stg-rg')||!window.SC||!SC.crdb)return;const {at,off,lerp,mix,cl}=S3;const D=SC.crdb;
  const RG=D.ranges.split('\n').slice(1).map(l=>l.split('\t')).filter(r=>r.length>=3).map(r=>+r[0]).sort((a,b)=>a-b);
  const ev=D.events.map(x=>Math.round(x.t)),T=D.tl,seg=(a,b)=>{const x=T.slice(a,b);return x.reduce((s,t)=>s+t[0],0)/Math.max(1,x.length)};
  const rate=[seg(1,ev[0]),seg(ev[0]+1,ev[1]),seg(ev[1]+1,ev[2]),seg(ev[2]+1,ev[3]),seg(ev[3]+1,ev[4])].map(v=>Math.round(v));
  const NX=[-3,0,3],NZ=-.5,CL=[-3,0,2.45],rz=i=>NZ-1.05+i*.7;
  // alive per step: [node1,node2,node3]; d: how far a node is "dead" (0 alive, 1 dead) at step k, progress e
  const UP=[[1,1,1],[1,1,1],[1,1,0],[1,0,0],[1,1,0],[1,1,1]];
  const dead=(k,e,n)=>{const now=UP[k][n],prev=k?UP[k-1][n]:1;return now===prev?1-now:now?1-e:e};
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-2.4,3.2,.5);
    R.box(CL,[1.3,.3,.6],{fill:mix(P.paper,P.ink,.06)});R.label([CL[0],.32,CL[2]],'client',{fs:12.5,b:1,dy:-12});
    NX.forEach((x,n)=>{const d=dead(k,e,n),a=1-.7*d;
      R.box([x,0,NZ],[2.2,.12,2.95],{fill:mix(mix(P.paper,P.ink,.05),P.bad,.25*d),a:1,dz:4});
      R.label([x,0,NZ+1.48],'node '+(n+1)+(d>.5?' · killed':''),{fs:12.5,b:1,dy:15,c:d>.5?P.bad:P.ink});
      RG.forEach((r,i)=>{const lead=n===0;R.box([x,.12,rz(i)],[1.5,.3,.42],{fill:lead?mix(P.paper,P.c1,.5):mix(P.paper,P.c1,.16),a,lw:.7,shadow:false});
        if(n===0)R.label([x-.75,.28,rz(i)],'range '+r,{al:'right',dx:-8,mono:true,fs:12,grp:'rg'})});
      if(n===0)R.label([x,.45,rz(0)],'leaseholders',{fs:12,c:P.c1,b:1,dy:-14})});
    const alive=n=>UP[k][n]===1,maj=UP[k].reduce((s,v)=>s+v,0)>=2;
    const n1=[NX[0],.46,NZ+.6];
    // the client's inserts reach node 1, where every lease is
    const wa=k===0?0:k===1?e:1;
    if(wa>0)R.flowArc([CL[0]+.2,.3,CL[2]-.3],n1,.4,{c:maj?P.c4:P.bad,a:wa,r:.07,speed:maj?1.2:.35,n:maj?7:3});
    // Raft: the leaseholder sends each write to the other copies; a majority (two of three) commits it
    if(k>=1&&maj)[1,2].forEach(n=>{if(!alive(n))return;const a=k===1?e:(k===4&&n===1)||(k===5&&n===2)?e:1;
      RG.forEach((r,i)=>{if(i%2)return;R.flowArc([NX[0]+.75,.4,rz(i)],[NX[n]-.75,.4,rz(i)],.45+.15*(n-1),{c:P.c5,a:a*.8,r:.055,speed:1.4,n:k===5&&n===2?9:6})})});
    if(k===1)R.flowArc([NX[1]-.75,.35,rz(3)],[NX[0]+.75,.35,rz(3)],.3,{c:P.good,a:e,r:.05,speed:1.4,n:5});
    if(k===3)R.glow(n1,.7,{c:P.bad,a:.5*e});
    const L={1:'a majority commits · about '+rate[0]+' inserts/s',2:'2 of 3 alive · about '+rate[1]+' inserts/s',3:'1 of 3 alive · each insert times out after 3 s',4:'majority back · inserts resume, no failover',5:'node 3 catches up · three copies again'};
    if(L[k])R.label([CL[0]+.75,.15,CL[2]],L[k],{al:'left',dx:10,fs:12.5,b:1,c:k===3?P.bad:k===2||k===4?P.good:P.ink,a:e,wide:1});
  }
  S3.stage({id:'stg-rg',list:'sx-rg',fig:'Fig. 6 · ranges, Raft and a node failure',cam:[.16,.6],bounds:[[-4.4,0,-2.1],[4.4,.8,2.9]],aspect:.5,dur:1400,hold:5200,draw,
    margin:w=>w<520?[16,8,14,8]:[18,16,16,90]});
})();
