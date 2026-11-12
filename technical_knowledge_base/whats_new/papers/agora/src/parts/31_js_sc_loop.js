// ---- Scene (hero): thirteen worker accounts around one shared Git repository, and the loop every session runs (renderer v2: flows, camera per step) ----
// The accounts and hardware are the paper's (§4.2: worker1 to worker5 on A100 nodes, slurm_worker_1 to 8 sharing one eight-GPU H100 node).
// The graph on the repository is the ILLUSTRATIVE 16-node graph of the frontier calculator (12_js_frontier.js, window.FRG), with its evidence
// scores (Eq. 2, Table 2 weights) and ranking scores (Eq. 3 at D = 1.0, C = 15) computed by that calculator at its defaults.
(function(){
  if(!document.getElementById('stg-loop')||!window.FRG)return;const {at,off,mix}=S3;
  const N=FRG.nodes,by=Object.fromEntries(N.map(v=>[v.id,v])),EARLY=['s','a','b','c'];
  const X=i=>-2.9+5.8*i/(N.length-1),Z=a=>-1.15+2.3*a/240,Y0=.16,pos=v=>[X(N.indexOf(v)),Y0,Z(v.ang)];
  const isRes=v=>v.tag==='result'||v.tag==='setup';
  const FZ=2.45,BZ=-2.45,ax=j=>-2.4+1.2*j,hx=j=>-2.73+.78*j; // front row: the five A100 accounts; back row: the eight H100 accounts on one node
  const wk={w1:0,w2:1,w3:2,w4:3,w5:4};
  const acol=(P,a)=>a==='setup'?P.mute:[P.c1,P.c2,P.c3,P.c4,P.c6][wk[a]];
  const top3=FRG.rank.slice(0,3).map(id=>by[id]),uMax=Math.max(...N.filter(v=>v.U!=null).map(v=>v.U));
  function node(R,v,a,o){o=o||{};const P=R.P,p=pos(v),c=mix(P.paper,acol(P,v.acct),.55);
    if(isRes(v))R.box(p,[.34,.3,.34],{fill:c,a,shadow:false});else R.box(p,[.36,.07,.36],{fill:c,a,shadow:false});
    if(o.ring)R.glow([p[0],p[1]+.12,p[2]],.42,{c:o.ring,a:a*.9})}
  function edge(R,u,v,a,t){const p=pos(u),q=pos(v);R.arc([p[0],Y0+.1,p[2]],[q[0],Y0+.1,q[2]],.1,{c:R.P.mute,w:1.3,a:a*.75,t:t==null?1:t})}
  function workers(R,a,hi){const P=R.P;
    for(let j=0;j<5;j++){const on=hi==null||hi===j;R.box([ax(j),0,FZ],[.62,.5,.46],{fill:j===hi?mix(P.paper,P.c2,.25):P.paper,a:a*(on?1:.3)})}
    R.box([0,0,BZ],[6.7,.1,.82],{a:a*(hi==null?1:.3)});
    for(let j=0;j<8;j++)R.box([hx(j),.1,BZ],[.5,.42,.4],{a:a*(hi==null?1:.3),shadow:false});
    R.label([-3.3,.3,FZ],'5 × A100',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:a*(hi==null?1:.4),grp:'w'});
    R.label([-3.5,.3,BZ],'8 × H100, one node',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,a:a*(hi==null?1:.4),grp:'w'})}
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-4,4,.5);
    // the shared repository: one slab; nothing else coordinates the workers
    R.box([0,0,0],[6.6,Y0,2.9],{fill:mix(P.paper,P.ink,.04)});
    R.label([-3.3,Y0,0],'shared Git repo',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'w'});
    const focus=k>=2&&k<=4?1:null;workers(R,1,focus);
    const w2=[ax(1),.55,FZ],c=by.c,d=by.d;
    // the graph so far (steps 1 to 4), all of it from step 6
    const shown=v=>k>=5?1:EARLY.includes(v.id)?1:v.id==='d'?(k===4?e:k>4?1:0):0;
    N.forEach(v=>{const a=shown(v)*(k>=2&&k<=4&&!['c','d'].includes(v.id)?.35:1);if(a<=0)return;
      node(R,v,a,{ring:k===2&&v.id==='c'?P.c2:k===5&&v.id==='d'?P.c5:null});
      v.par.forEach(pid=>{const u=by[pid];const pa=shown(u);if(pa>0)edge(R,u,v,Math.min(a,pa),v.id==='d'&&k===4?e:1)})});
    if(k<=1)R.label([X(0),Y0+.3,Z(0)],'program.md (setup)',{mono:true,fs:12,dy:-10,c:P.ink});
    // 2. every session starts by reading the views: dots stream from the repository to all thirteen accounts
    if(k===1){const a=Math.min(1,e*1.6);for(let j=0;j<5;j++)R.flowArc([ax(j)*.55,Y0+.15,1.2],[ax(j),.55,FZ],.6,{c:P.c6,a,r:.06,n:6,speed:1.3});
      for(let j=0;j<8;j++)R.flowArc([hx(j)*.55,Y0+.15,-1.2],[hx(j),.55,BZ],.6,{c:P.c6,a,r:.06,n:6,speed:1.3});
      R.label([0,1.1,0],'agora analyze',{mono:true,fs:13,b:1,c:P.c6,a})}
    // 3. one worker checks out one commit: c flows to worker2
    if(k===2){const p=pos(c);R.flowArc([p[0],Y0+.25,p[2]],w2,.9,{c:P.c6,a:Math.min(1,e*1.5),r:.07,n:9,speed:1.4});
      R.label([p[0],Y0+.45,p[2]],'c · bigram + SVD',{mono:true,fs:12,dy:-10,c:P.ink});R.label([w2[0],.62,FZ],'worker2',{mono:true,fs:12,dy:16,c:P.c2,b:1})}
    // 4. it changes one thing and runs the evaluator on its own GPU
    if(k===3){R.glow([w2[0],.3,FZ],.9,{c:P.c2,a:.55+.35*e});R.label([w2[0],.62,FZ],'worker2',{mono:true,fs:12,dy:16,c:P.c2,b:1});
      R.label([w2[0],.9,FZ],'transfer() → 200 texts → 1.932 bpb',{mono:true,fs:12.5,b:1,c:P.ink,a:e,dy:-6})}
    // 5. it publishes: the new commit d flows back into the graph, with an edge to its parent c
    if(k===4){const p=pos(d);R.flowArc(w2,[p[0],Y0+.25,p[2]],1,{c:P.c2,a:Math.min(1,.3+e),r:.07,n:9,speed:1.4});
      R.label([p[0],Y0+.45,p[2]],'d · 24 prefixes · 1.932',{mono:true,fs:12,dy:-10,c:P.ink,a:e});R.label([w2[0],.62,FZ],'worker2',{mono:true,fs:12,dy:16,c:P.c2,b:1})}
    // 6. everyone at once; work by other accounts on a commit is its evidence score (gold columns, Eq. 2)
    if(k===5){N.slice(4).forEach(v=>{const j=wk[v.acct];if(j==null)return;const p=pos(v);R.flowArc([ax(j),.55,FZ],[p[0],Y0+.25,p[2]],.7,{c:acol(P,v.acct),a:.35,r:.05,n:4,speed:1.1})});
      N.forEach(v=>{if(!v.S)return;const p=pos(v),h=v.S*.045*e;R.box([p[0],Y0+(isRes(v)?.3:.07),p[2]],[.16,Math.max(.01,h),.16],{fill:P.c5,a:.95,shadow:false});
        if(v.id==='d')R.label([p[0],Y0+.36+h,p[2]],'d · S = '+v.S,{mono:true,fs:12.5,dy:-8,c:P.c5,b:1,a:e})})}
    // 7. the ranking (Eq. 3) steers the next picks: bars of U over every candidate, the first three flowing back to the workers
    if(k===6){N.forEach(v=>{if(v.U==null)return;const p=pos(v),h=v.U/uMax*1.1*e,t=v.id===FRG.rank[0];
        R.box([p[0],Y0+(isRes(v)?.3:.07),p[2]],[.17,Math.max(.01,h),.17],{fill:t?P.bad:mix(P.paper,P.acc,.7),a:.95,shadow:false});
        if(t){R.glow([p[0],Y0+.3+h,p[2]],.35,{c:P.bad,a:e});R.label([p[0],Y0+.3+h,p[2]],v.id+' ranked first · U = '+v.U.toFixed(0),{mono:true,fs:12,b:1,dy:-12,c:P.bad,a:e})}});
      top3.forEach((v,i)=>{const p=pos(v),j=[1,3,4][i];R.flowArc([p[0],Y0+.3,p[2]],[ax(j),.55,FZ],.8,{c:P.c6,a:.8*e,r:.06,n:6,speed:1.3})})}
  }
  const full={cam:[.22,.74],bounds:[[-3.45,0,-2.75],[3.45,.7,2.75]]};
  S3.stage({id:'stg-loop',list:'sx-loop',fig:'Fig. 1 · the loop, redrawn · graph illustrative',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4600,draw,
    margin:w=>w<520?[16,10,14,10]:[18,14,14,120],
    view:k=>k>=2&&k<=4?{cam:[.12,.66],bounds:[[-2.9,0,-1.5],[.1,1,2.8]]}:full});
})();
