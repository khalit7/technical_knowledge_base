// ---- Scene, Fig. 4 (section 8): a joint distribution as a grid of bars, its marginals on the edges, independence as glass lids,
// and the mutual information as the per-cell gap between the joint and the product of the marginals (renderer v2) ----
// Steps 1 to 4: two fair binary signals that agree 80% of the time (p(0,0) = p(1,1) = 0.4). Step 5: X uniform on -1, 0, 1 and Y = X^2.
// Every marginal, product, term and total is computed here from the two joint tables.
(function(){
  if(!document.getElementById('stg-mi')||!window.ITS)return;const {mix,lerp}=S3;
  // joint tables: rows are x values, columns y values
  const A={xs:['0','1'],ys:['0','1'],J:[[.4,.1],[.1,.4]]},B={xs:['−1','0','1'],ys:['0','1'],J:[[0,1/3],[1/3,0],[0,1/3]]};
  function prep(T){const px=T.J.map(r=>r.reduce((a,b)=>a+b,0)),py=T.ys.map((_,j)=>T.J.reduce((s,r)=>s+r[j],0)),cells=[];
    T.J.forEach((r,i)=>r.forEach((v,j)=>cells.push({i,j,v,ind:px[i]*py[j],t:v>0?v*Math.log2(v/(px[i]*py[j])):0})));
    const I=cells.reduce((s,c)=>s+c.t,0),H=a=>IT.H(a,2);return Object.assign(T,{px,py,cells,I,Hx:H(px),Hy:H(py),Hxy:H(T.J.flat())})}
  prep(A);prep(B);window.IT_MISC={A:{I:A.I,Hxy:A.Hxy,terms:A.cells.map(c=>c.t)},B:{I:B.I,terms:B.cells.map(c=>c.t)}};
  const SY=4.2,CW=1.25,gx=(T,i)=>(i-(T.xs.length-1)/2)*1.45,gz=(T,j)=>(j-(T.ys.length-1)/2)*1.45-.2,ZM=1.75,XM=2.75,ZK=3.1,YK=.95;
  function grid(R,T,k,e,a){const P=R.P;if(a<=.01)return;const two=T===A;
    const ja=two?(k===0?Math.min(1,e*1.5):k===3?.18:1):1;
    // the joint: one bar per cell
    T.cells.forEach(c=>{const x=gx(T,c.i),z=gz(T,c.j);R.quad([[x-CW/2,0.004,z-CW/2],[x+CW/2,.004,z-CW/2],[x+CW/2,.004,z+CW/2],[x-CW/2,.004,z+CW/2]],{fill:R.P.soft,a:a*.8,ea:.5,dz:.4});
      if(c.v>0){R.box([x,0,z],[.62,c.v*SY*(two&&k===0?e:1),.62],{fill:mix(P.c1,P.paper,.3),a:a*ja});R.label([x,c.v*SY,z],c.v.toFixed(3),{mono:true,fs:12.5,b:1,dy:-10,c:P.c1,a:a*ja})}});
    if(k===0||!two){T.xs.forEach((s,i)=>R.label([gx(T,i),0,gz(T,T.ys.length-1)+CW/2],'x = '+s,{fs:12.5,dy:16,c:P.mute,a}));
      T.ys.forEach((s,j)=>R.label([gx(T,0)-CW/2-.5,0,gz(T,j)],'y = '+s,{al:'right',dx:-8,fs:12.5,c:P.mute,a}))}
    // the marginals on the edges: p(x) in front, p(y) on the right; dots flow from each cell into its row and column sums
    const ma=two?(k===1?e:k===2?.25:0):0,MS=SY*.4;
    if(ma>.01&&(k>=1||!two)){T.px.forEach((v,i)=>{R.box([gx(T,i),0,ZM+(T===B?.25:0)],[.5,v*MS,.3],{fill:mix(P.c3,P.paper,.25),a:a*ma});if(ma>.5)R.label([gx(T,i),v*MS,ZM+(T===B?.25:0)],'p(x = '+T.xs[i]+') '+v.toFixed(3),{mono:true,fs:12,dy:-10,c:P.c3,a:a*ma})});
      T.py.forEach((v,j)=>{const xm=XM+(T===B?.6:0);R.box([xm,0,gz(T,j)],[.3,v*MS,.5],{fill:mix(P.c6,P.paper,.25),a:a*ma});if(ma>.5)R.label([xm,v*MS,gz(T,j)],'p(y = '+T.ys[j]+') '+v.toFixed(3),{mono:true,fs:12,dy:-10,al:'left',dx:6,c:P.c6,a:a*ma})});
      if(two&&k===1)T.cells.forEach(c=>{const x=gx(T,c.i),z=gz(T,c.j),h=c.v*SY;R.flowArc([x,h,z],[x,T.px[c.i]*MS,ZM],.4,{c:P.c3,r:.05,n:Math.round(2+c.v*14),a:e});R.flowArc([x,h,z],[XM,T.py[c.j]*MS,z],.4,{c:P.c6,r:.05,n:Math.round(2+c.v*14),a:e})})}
    // independence: a glass lid in each cell at p(x) p(y)
    const ga=two?(k===2?e:k===3?.18:0):1;
    if(ga>.01)T.cells.forEach(c=>{const x=gx(T,c.i),z=gz(T,c.j),h=c.ind*SY;R.glass([x-.45,h,z+.45],[.9,0,0],[0,0,-.9],{c:P.c5,a:a*ga,nu:3,nv:3,th:.02});
      if(two&&k===2&&c.i===1&&c.j===0)R.label([x+.45,h,z+.45],'p(x) p(y) = '+c.ind.toFixed(3),{al:'left',dx:6,dy:12,mono:true,fs:12.5,b:1,c:P.c5,a:a*ga})})}
  function draw(R,k,e){const P=R.P;R.grid(-3.6,3.6,-3.6,3,.5);
    const aA=k<4?1:Math.max(0,1-2*e),aB=k===4?Math.max(0,2*e-1):0;
    grid(R,A,k,e,aA);grid(R,B,k,e,aB);
    // 4. the gap per cell, p(x,y) log2 p(x,y) / (p(x) p(y)), as signed bars; the four add up to I(X; Y)
    if(k===3){const xs=A.cells.map((_,i)=>(i-1.5)*1.25);
      A.cells.forEach((c,i)=>{const x=gx(A,c.i),z=gz(A,c.j);R.flowArc([x,c.v*SY,z],[xs[i],YK+.1,ZK],.6,{c:c.t>=0?P.c2:P.mute,r:.05,n:5,a:e})});
      ITS.signed(R,xs,A.cells.map(c=>c.t),{y:YK,z:ZK,s:2.2,a:e,bw:.75});
      A.cells.forEach((c,i)=>R.label([xs[i],0,ZK+.35],'('+A.xs[c.i]+','+A.ys[c.j]+')',{mono:true,fs:12,dy:14,c:P.mute,a:e}));
      R.label([xs[0]-.75,YK,ZK],'I(X; Y) = '+A.I.toFixed(3)+' bits',{al:'right',dx:-6,mono:true,fs:12.5,b:1,c:P.c2,grp:'row',a:e})}
    if(k===4&&aB>0){R.label([gx(B,1),1.75,gz(B,0)],'I(X; Y) = '+B.I.toFixed(3)+' bits · correlation 0',{fs:13,b:1,c:P.c2,a:aB,dy:-26})}
  }
  S3.stage({id:'stg-mi',list:'sx-mi',fig:'Fig. 4 · a joint against independence',cam:[.62,.6],bounds:[[-2.9,0,-2.2],[3.3,2,2.2]],aspect:.72,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,14,16],
    view:k=>k===3?{cam:[.35,.5],bounds:[[-2.9,0,-1.2],[2.9,1.9,3.6]]}:null});
})();
