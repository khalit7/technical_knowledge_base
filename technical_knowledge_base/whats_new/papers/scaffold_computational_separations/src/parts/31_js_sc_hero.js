// ---- Scene: the idea in one screen (renderer v2). Theorem 1's own example run by the lab's engine (22_js_graph.js):
// the BFS harness on the 10-vertex "long paths" graph (seed 13), each vertex rising as a column as tall as the round that
// reached it (its distance in hops); the fixed-depth reader as a glass ceiling at 2^k hops; then a 16-vertex graph (seed 3)
// that pierces the 3-layer ceiling again. Every number is computed here from GR; window.HERO and window.__hero carry them for the checks.
(function(){
  if(!document.getElementById('stg-hero')||!window.GR)return;const {at,off,lerp,mix}=S3;
  const U=.3; // one hop of height
  function mk(N,seed,per,dx,dz){const g=GR.graph(N,'local',seed),b=GR.bfs(g),rows=Math.ceil(N/per),pos=[];
    for(let i=0;i<N;i++){const r=Math.floor(i/per),c=i%per,cc=r%2?per-1-c:c;pos.push([(cc-(per-1)/2)*dx,0,((rows-1)/2-r)*dz])}
    const round=new Array(N).fill(-1);round[g.s]=0;b.rounds.forEach((rd,i)=>rd.found.forEach(v=>round[v]=i+1));
    const E=[];for(let u=0;u<N;u++)for(let v=0;v<N;v++)if(g.A[u][v])E.push([u,v]);
    const zb=((rows-1)/2)*dz;return {g,b,pos,round,E,N,xb:((per-1)/2)*dx,zb,seen:k=>GR.reader(g,k).seen}}
  const A=mk(10,13,5,1.5,1.9);
  // the bigger graph: the first seed on 16 vertices whose target is reachable and more than 8 hops away
  let s16=1;while(!(()=>{const h=GR.graph(16,'local',s16),c=GR.bfs(h);return c.reach&&c.dist>8})())s16++;
  const B=mk(16,s16,6,1.25,1.6);
  window.HERO={dist:A.b.dist,calls:A.b.calls,rounds:A.b.rounds.length,reader2:GR.reader(A.g,2).yes,reader3:GR.reader(A.g,3).yes};
  // the numbers the step list states, for check_stages.mjs
  window.__hero={dist:A.b.dist,calls:A.b.calls,q:A.b.rounds.map(r=>r.queries),seed16:s16,dist16:B.b.dist,calls16:B.b.calls,r3_16:GR.reader(B.g,3).yes,r2:GR.reader(A.g,2).yes,r3:GR.reader(A.g,3).yes};
  // which rounds each step reveals: step 1 rounds 1-3, step 2 rounds 4 to the one that finds t (and the empty last round)
  const S1=3,ST=A.b.dist;
  function shown(k,e){if(k===0)return 0;if(k===1)return S1*e;if(k===2)return S1+(ST-S1)*e;return ST}
  function graph(R,G,a,rv,ceil,kc){const P=R.P,{pos,E,round,g,N}=G;if(a<=.01)return;
    const cur=Math.ceil(rv);
    // edges: arcs on the floor; backward edges arc higher; the edges that answered "yes" in the newest round carry dots
    E.forEach(([u,v])=>{const p=pos[u],q=pos[v],hop=Math.abs(u-v),h=v<u?.55:hop===1?.08:.22,used=cur>0&&round[u]===cur-1&&round[v]===cur&&rv>cur-1;
      const a0=[p[0],.1,p[2]],b0=[q[0],.1,q[2]],d=Math.hypot(q[0]-p[0],q[2]-p[2])||1,sh=.3/d,a1=[a0[0]+(q[0]-p[0])*sh,.1,a0[2]+(q[2]-p[2])*sh],b1=[b0[0]-(q[0]-p[0])*sh,.1,b0[2]-(q[2]-p[2])*sh];
      R.arc(a1,b1,h,{c:used?P.c1:P.mute,w:used?2.2:1.1,head:used?7:5,a:a*(used?1:.5)});
      if(used)R.flowArc(a1,b1,h,{c:P.c1,a,r:.06,speed:1.3,n:5})});
    for(let i=0;i<N;i++){const p=pos[i],r=round[i],isS=i===g.s,isT=i===g.t;
      R.box([p[0],0,p[2]],[.56,.1,.56],{a,fill:isS||isT?mix(P.paper,P.ink,.12):null});
      // the column: one block per hop, rising while its round is revealed
      if(r>0&&rv>r-1){const f=Math.min(1,rv-(r-1));for(let j=0;j<r;j++){const y=.1+j*U*f,over=ceil!=null&&(j+1)*U>ceil+1e-6;
        R.box([p[0],y,p[2]],[.34,U*f*.86,.34],{a,fill:over?mix(P.paper,P.bad,.6):mix(P.paper,P.c1,.55),shadow:false})}
        if(f>.6)R.label([p[0],.1+r*U*f,p[2]],String(r),{fs:12,b:1,c:P.c1,dy:-10,a:a*(f-.6)/.4,wide:isT?0:1})}
      // the reader's view: a ring on the floor under every vertex within its horizon
      if(kc!=null&&kc.seen[i])R.glow([p[0],.12,p[2]],.42,{c:P.c2,a:a*kc.a*.8});
      R.label([p[0],0,p[2]+.3],isS?'s':isT?'t':String(i),{fs:isS||isT?14:12,b:isS||isT,dy:12,c:isS||isT?P.ink:P.mute,a:Math.max(.4,a),wide:isS||isT?0:1})}}
  function strip(R,G,a,rv,z){const P=R.P,{N,round}=G,w=Math.min(.4,(2*G.xb+.6)/N),x0=-w*N/2;if(a<=.01)return;
    for(let i=0;i<N;i++){const on=round[i]>=0&&round[i]<=rv;R.box([x0+w*(i+.5),0,z],[w*.8,on?.22:.05,.3],{a:a*(on?1:.6),fill:on?mix(P.paper,P.c1,.65):null,shadow:false})}
    if(a>.5)R.label([x0-.15,.1,z],'visited bits, kept by the harness',{al:'right',dx:-6,mono:true,fs:12,c:P.c1,a,grp:'h'})}
  function model(R,G,a,rv,p){const P=R.P;if(a<=.01)return;R.box(p,[.9,.7,.9],{a,fill:mix(P.paper,P.c4,.25)});
    if(a>.5)R.label([p[0],.75,p[2]],'base model: edge u → v?',{mono:true,fs:12,c:P.c4,dy:-10,a,wide:1});
    const cur=Math.ceil(rv);if(cur<1||rv>=G.b.dist+.999)return;
    G.b.rounds[cur-1].frontier.forEach(u=>R.flowArc([G.pos[u][0],.25,G.pos[u][2]],[p[0]-.45,.4,p[2]],.7,{c:P.c4,a:a*.7,r:.05,n:6,speed:1.4}))}
  function ceilAt(R,G,y,a,txt){const P=R.P;if(a<=.01)return;const x0=-G.xb-.7,z0=-G.zb-.7;
    R.glass([x0,y,z0],[2*G.xb+1.4,0,0],[0,0,2*G.zb+1.4],{c:P.c2,a:a*.85,nu:8,nv:5});
    R.label([x0,y,G.zb+.7],txt,{al:'right',dx:-6,mono:true,fs:12,c:P.c2,a,grp:'h'})}
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-4,4,.5);
    const aA=k<5?1:off(k,e*2>1?1:e*2,5),aB=k<5?0:Math.max(0,e*2-1);
    const rv=shown(k,e),hz=k<3?null:k===3?4*U:k===4?lerp(4*U,8*U,e):8*U;
    // graph A
    if(aA>0){const ka=k===3?{seen:A.seen(2),a:e}:k===4?{seen:e<.5?A.seen(2):A.seen(3),a:1}:k>=5?{seen:A.seen(3),a:1}:null;
      graph(R,A,aA,rv,hz,ka);strip(R,A,aA*(k<3?1:.35),rv,-A.zb-1.3);model(R,A,aA*(k<3?1:.35),rv,[A.xb+1.3,0,-A.zb-1.3]);
      if(k>=3)ceilAt(R,A,hz,(k===3?e:1)*aA,k===3?'reader, 2 layers: sees 4 hops':'reader, 3 layers: sees 8 hops');
      if(k>=3){const p=A.pos[A.g.t],yes=k===4&&e>.5;R.label([p[0],.1+A.b.dist*U,p[2]],yes?'7 hops ≤ 8: reader says yes':'7 hops > 4: reader says no',{fs:12.5,b:1,c:yes?P.good:P.bad,dy:-28,a:aA*(k===3?e:1)})}}
    // graph B: the harness runs all its rounds, the 3-layer ceiling stays at 8 hops
    if(aB>0){const rb=B.b.dist*Math.min(1,aB*1.3);graph(R,B,aB,rb,8*U,{seen:B.seen(3),a:aB});strip(R,B,aB*.35,rb,-B.zb-1.2);
      ceilAt(R,B,8*U,aB,'reader, 3 layers: sees 8 hops');const p=B.pos[B.g.t];
      R.label([p[0],.1+B.b.dist*U,p[2]],B.b.dist+' hops > 8: reader says no',{fs:12.5,b:1,c:P.bad,dy:-12,a:aB})}
  }
  const vA={cam:[.42,.62],bounds:[[-3.8,0,-3],[5.9,2.6,1.6]]},vB={cam:[.42,.66],bounds:[[-3.9,0,-3.2],[3.9,3.4,2]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the BFS harness against a fixed-depth reader (the lab\'s engine)',cam:vA.cam,bounds:vA.bounds,aspect:.62,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,190],dur:2400,hold:4600,draw,view:k=>k>=5?vB:vA});
})();
