// ---- Scene, Fig. 5 (section 8): a traversal from user 24204 on the measured 100,000-user graph, then the measured shortest path (inputs/graph.json; renderer v2) ----
// Within 1 and 2 hops the users are drawn as dots (hop 2: one dot per 10 users); within 3 and 4 hops as floor area to scale against the whole graph's disc.
// Positions are illustrative; the counts and the path are the measured ones.
(function(){
  if(!document.getElementById('stg-gr')||!window.NQ||!NQ.graph)return;const {at,off,lerp,mix}=S3;
  const G=NQ.graph,C=k=>G.neo4j.counts[k][0],U=G.graph.users,SP=G.neo4j.shortest,f0=n=>Math.round(n).toLocaleString('en-US');
  const RD=3.2,rOf=n=>RD*Math.sqrt(n/U),H=.32;
  // a fixed pseudo-random layout so the picture never changes between draws
  let sd=7;const rnd=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};
  const h1=[],h2=[];const n1=C('1'),n2=Math.round((C('2')-C('1'))/10);
  for(let i=0;i<n1;i++){const a=i/n1*Math.PI*2+rnd()*.15,r=.55+rnd()*.2;h1.push([r*Math.cos(a),H,r*Math.sin(a)])}
  for(let i=0;i<n2;i++){const p=Math.floor(rnd()*n1),a=Math.atan2(h1[p][2],h1[p][0])+(rnd()-.5)*.5,r=1.05+rnd()*.35;h2.push({p,q:[r*Math.cos(a),H*.7,r*Math.sin(a)]})}
  const PA=[[0,H,0],[.75*Math.cos(.15),H,.75*Math.sin(.15)],[1.25*Math.cos(.9),H,1.25*Math.sin(.9)],[2.0*Math.cos(1.25),H,2.0*Math.sin(1.25)],[2.75*Math.cos(1.6),H,2.75*Math.sin(1.6)]];
  function disc(R,r,o){const pts=[];for(let i=0;i<48;i++){const t=i/48*Math.PI*2;pts.push([r*Math.cos(t),.01+(o.y||0),r*Math.sin(t)])}R.quad(pts,o)}
  function draw(R,k,e){const P=R.P;R.grid(-4,4,-4,4,.5);const path=k===4;
    // the whole graph: 100,000 users, a disc on the floor
    disc(R,RD,{fill:P.soft,a:.8,ec:P.line,ea:.6});
    // within 3 and within 4 hops: floor area to scale
    if(k>=2){const t=k===2?e:1;disc(R,rOf(C('3'))*Math.sqrt(t),{fill:mix(P.paper,P.c1,.35),a:path?.35:.9,edge:false,y:.005})}
    if(k>=3){const t=k===3?e:1;disc(R,Math.max(rOf(C('3')),rOf(C('4'))*Math.sqrt(t)),{fill:mix(P.paper,P.c1,.2),a:path?.3:.7,edge:false,y:.002})}
    const da=path?.25:1;
    // hop 2: one dot per 10 users, each linked to the friend it was reached through
    if(k>=1){const t=k===1?e:1;h2.forEach((d,i)=>{if(i/n2>t)return;R.line([h1[d.p],d.q],{c:P.line,w:.8,a:da*.7});R.ball(d.q,.045,{c:mix(P.paper,P.c1,.6),a:da})})}
    // hop 1: the 27 friends, each relationship a pointer from the user
    h1.forEach(p=>{R.line([[0,H,0],p],{c:k===0?P.c2:P.line,w:k===0?1.6:1,a:da});R.ball(p,.07,{c:mix(P.paper,P.c1,.8),a:da})});
    R.box([0,0,0],[.05,H,.05],{shadow:false});R.ball([0,H,0],.13,{c:P.c2});
    // flows: the frontier moving outward one hop per step
    if(k===0)h1.forEach((p,i)=>{if(i%3===0)R.flow([[0,H,0],p],{c:P.c2,r:.04,n:2,speed:.8})});
    if(k===1)h2.forEach((d,i)=>{if(i%6===0)R.flow([h1[d.p],d.q],{c:P.c2,r:.035,n:2,speed:.8})});
    if(k===2||k===3){const r0=k===2?1.3:rOf(C('3')),r1=k===2?rOf(C('3')):rOf(C('4'))*.97;for(let i=0;i<12;i++){const a=i/12*Math.PI*2;R.flow([[r0*Math.cos(a),.15,r0*Math.sin(a)],[r1*Math.cos(a),.15,r1*Math.sin(a)]],{c:P.c2,r:.05,n:3,speed:.7})}}
    // the shortest path, hop by hop
    if(path){for(let h=0;h<4;h++){const t=Math.min(1,Math.max(0,e*4-h));if(t<=0)break;const a=PA[h],b=lerp3(PA[h],PA[h+1],t);R.line([a,b],{c:P.c2,w:3,top:1});R.flow([PA[h],PA[h+1]],{c:P.c2,r:.06,n:3,a:t})}
      PA.forEach((p,i)=>{if(i>0)R.ball(p,.11,{c:P.c2,a:Math.min(1,Math.max(0,e*4-i+1))});R.label(p,SP.path[i],{mono:true,fs:12.5,b:i===0||i===4,dy:-16,c:P.c2,a:i===0?1:Math.min(1,Math.max(0,e*4-i+1)),grp:'path'})})}
    // labels
    if(!path)R.label([0,H,0],'user '+SP.a,{mono:true,fs:12.5,b:1,dy:-16,c:P.c2});
    const lab=[[0,'within 1 hop: '+f0(C('1')),.85],[1,'within 2 hops: '+f0(C('2'))+' (1 dot = 10)',1.45],[2,'within 3 hops: '+f0(C('3'))+' ('+Math.round(C('3')/U*100)+'%)',rOf(C('3'))],[3,'within 4 hops: '+f0(C('4'))+' of '+f0(U),RD]];
    lab.forEach(([s,t,r])=>{if(k>=s&&!path)R.label([r*.72,0,r*.72],t,{mono:true,fs:12.5,b:k===s,al:'left',dx:6,c:k===s?P.c1:P.mute,grp:'hops',a:k===s?(s===0?1:e):1})});
    if(path)R.label([0,0,RD],SP.hops+' hops, '+SP.ms+' ms in Neo4j, one line of Cypher',{fs:13,b:1,dy:14,c:P.c2});
  }
  const lerp3=S3.lerp3;
  const full={cam:[.5,.72],bounds:[[-3.3,0,-3.3],[3.3,.5,3.3]]};
  S3.stage({id:'stg-gr',list:'sx-gr',fig:'Fig. 5 · friends of friends from one user, measured counts',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[16,190,14,14],
    // the first two hops are small: move in close on them
    view:k=>k<=1?{cam:[.5,.66],bounds:[[-1.6,0,-1.6],[1.6,.5,1.6]]}:full});
})();
