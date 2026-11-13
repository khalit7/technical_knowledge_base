// ---- Scene: Branching on competition math (renderer v2). Five matched trees of Figure 5a (tables.json, printed bar labels):
// the teacher's tree of calls (d children per node, depth L; leaves answer, inner nodes aggregate, dots flow up), the same calls
// flattened into the student's single rollout (the row in front), and teacher and student pass@1 as bars on white plinths beside
// the base model's 28.0. The (4,3) tree is left out: it has no student. window.__tree carries the numbers for the checks.
(function(){
  if(!document.getElementById('stg-tree')||!window.PAPER)return;const {at,off,lerp,mix}=S3;
  const F=PAPER.tables.fig5a,SH=['(2,1)','(2,2)','(3,2)','(4,2)','(3,3)'];
  const D=SH.map(sh=>{const i=F.shapes.indexOf(sh),m=sh.match(/\((\d),(\d)\)/),d=+m[1],L=+m[2];return {sh,d,L,calls:F.calls[i],te:F.teacher[i],st:F.student[i]}});
  window.__tree={rows:D,base:F.base};
  const HY=.85,TX=-.7,BX=3.7,ZR=2.5,RX0=-3.4,RX1=2.4,HS=2.6/50;
  // the tree's nodes: level 1 spreads along x, level 2 along z (depth), level 3 along x again
  function build(T){const nodes=[],edges=[],s1=4.4/T.d,s2=2.6/T.d,s3=s1/T.d*.85;
    function rec(path,p,lev,par){const id=nodes.length;nodes.push({p,lev,par});if(par>=0)edges.push([id,par]);if(lev===T.L)return;
      for(let i=0;i<T.d;i++){const o=i-(T.d-1)/2,q=lev===0?[p[0]+o*s1,0,p[2]]:lev===1?[p[0],0,p[2]+o*s2]:[p[0]+o*s3,0,p[2]];rec(path.concat(i),q,lev+1,id)}}
    rec([],[TX,0,-.3],0,-1);nodes.forEach(n=>n.p[1]=(T.L-n.lev)*HY);return {nodes,edges}}
  const TR=D.map(build);
  function tree(R,j,a){const P=R.P,T=D[j],{nodes,edges}=TR[j];if(a<=.01)return;const sz=T.calls>20?.2:.26;
    edges.forEach(([c,p])=>{const A=nodes[c].p,B=nodes[p].p,a0=[A[0],A[1]+.2,A[2]],b0=[B[0],B[1],B[2]];
      R.line([a0,b0],{c:P.c2,w:1.2,a:a*.55});R.flow([a0,b0],{c:P.c2,a:a*.8,r:.045,n:3,speed:.9})});
    nodes.forEach(n=>{const leaf=n.lev===T.L,root=n.lev===0,s=root?.42:leaf?sz:.32;
      R.box(n.p,[s,root?.3:.22,s],{a,fill:mix(P.paper,P.c2,root?.75:leaf?.25:.5),shadow:n.p[1]<.05})});
    R.label([TX,T.L*HY+.3,-.3],T.sh+' · '+T.calls+' calls',{fs:13,b:1,dy:-12,c:P.c2,a});
    // the student's rollout: every call of the tree written one after another (attempts first, the final solution last)
    const n=T.calls,sp=(RX1-RX0)/n,ord=nodes.map((x,i)=>i).sort((u,v)=>nodes[v].lev-nodes[u].lev);
    ord.forEach((id,i)=>{const lev=nodes[id].lev;R.box([RX0+sp*(i+.5),0,ZR],[sp*.7,lev===T.L?.16:lev===0?.34:.24,.3],{a,fill:mix(P.paper,P.c1,lev===0?.75:lev===T.L?.25:.5),shadow:false,lw:.6})});
    R.flow([[RX0,.42,ZR],[RX1,.42,ZR]],{c:P.c1,a:a*.8,r:.05,speed:1.2});
    R.label([RX0-.1,.1,ZR],'student: one rollout',{al:'right',dx:-6,mono:true,fs:12,c:P.c1,a,grp:'l'})}
  function bars(R,te,st,a,lt,ls){const P=R.P,hb=F.base*HS;
    [[BX,te,P.c2,'teacher',lt],[BX+.85,st,P.c1,'student',ls]].forEach(([x,v,c,nm,lv])=>{R.box([x,0,0],[.7,.06,.7],{shadow:true});
      R.box([x,.06,0],[.46,v*HS,.46],{fill:mix(P.paper,c,.8)});R.label([x,.06+v*HS,0],lv.toFixed(1)+'%',{mono:true,fs:12.5,b:1,dy:-11,c});
      R.label([x,0,.35],nm,{fs:12,dy:12,c})});
    R.line([[BX-.5,hb+.06,.45],[BX+1.45,hb+.06,.45]],{c:P.mute,w:1.8,dash:[5,4]});R.label([BX+1.45,hb+.06,.45],'base '+F.base.toFixed(1),{al:'left',dx:6,dy:10,mono:true,fs:12,c:P.mute})}
  function draw(R,k,e){R.grid(-5,5.5,-3,3.4,.5);
    const ch=k>0,ao=ch?Math.max(0,1-e*2):0,an=ch?Math.max(0,e*2-1):1;
    if(ch)tree(R,k-1,ao);tree(R,k,an);
    const p=D[Math.max(0,k-1)],c=D[k],t=ch?e:1;const q=t<.5?p:c;bars(R,lerp(p.te,c.te,t),lerp(p.st,c.st,t),1,q.te,q.st)}
  S3.stage({id:'stg-tree',list:'sx-tree',fig:'Fig. 3 · Branching trees, teacher against one-pass student (Figure 5a)',cam:[.42,.6],bounds:[[-3.6,0,-2],[5,2.9,2.9]],aspect:.62,
    margin:w=>w<520?[14,10,14,10]:[16,70,14,150],dur:1800,hold:4800,draw,
    view:k=>k===4?{cam:[.42,.56],bounds:[[-3.6,0,-2.2],[5,3,2.9]]}:k<=1?{cam:[.42,.6],bounds:[[-3.6,0,-1.6],[5,2,2.9]]}:null});
})();
