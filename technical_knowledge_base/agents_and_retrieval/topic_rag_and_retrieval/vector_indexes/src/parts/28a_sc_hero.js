// ---- Scene: Fig. 1, four ways to read less on the same query (renderer v2). The points are illustrative (one seeded set, the same
// one the old flat hero drew); every number in the step list is measured on SciFact (results.json). Each step shows what one index reads:
// exact reads every point, IVF one cell, a graph walk the nodes it passes, codes read everything in a few bytes and rescore a shortlist.
// Distances here are on the floor (two dimensions); the measured runs are in 1,024. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,mix}=S3;
  function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const r=rng(5),W0=200,H0=150,P=[];
  const gauss=()=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  [[48,42,20],[140,40,22],[100,108,24],[165,115,14]].forEach(([cx,cy,s],k)=>{for(let i=0;i<(k===3?14:26);i++)P.push([Math.max(6,Math.min(W0-6,cx+gauss()*s)),Math.max(6,Math.min(H0-6,cy+gauss()*s*0.8))])});
  for(let i=0;i<10;i++)P.push([8+r()*(W0-16),8+r()*(H0-16)]);
  const Q=[120,60],d2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2,N=P.length;
  const truth=P.map((p,i)=>[d2(p,Q),i]).sort((a,b)=>a[0]-b[0]).slice(0,5).map(x=>x[1]);
  // IVF: k-means, 8 centroids; the query probes its nearest cell
  let C=[0,13,27,40,55,70,85,100].map(i=>P[i%N].slice());
  for(let it=0;it<8;it++){const s=C.map(()=>[0,0,0]);P.forEach(p=>{let b=0;C.forEach((c,j)=>{if(d2(p,c)<d2(p,C[b]))b=j});s[b][0]+=p[0];s[b][1]+=p[1];s[b][2]++});C=C.map((c,j)=>s[j][2]?[s[j][0]/s[j][2],s[j][1]/s[j][2]]:c)}
  const cellOf=p=>{let b=0;C.forEach((c,j)=>{if(d2(p,c)<d2(p,C[b]))b=j});return b};
  const probe=C.map((c,j)=>[d2(c,Q),j]).sort((a,b)=>a[0]-b[0])[0][1];
  // cell walls: tile edges where the nearest centroid changes, merged into floor segments
  const ST=5,walls=[],tiles=[];
  for(let x=0;x<W0;x+=ST)for(let y=0;y<H0;y+=ST){const c=cellOf([x+ST/2,y+ST/2]);if(c===probe)tiles.push([x,y]);
    if(x+ST<W0&&cellOf([x+ST*1.5,y+ST/2])!==c)walls.push([[x+ST,y],[x+ST,y+ST]]);if(y+ST<H0&&cellOf([x+ST/2,y+ST*1.5])!==c)walls.push([[x,y+ST],[x+ST,y+ST]])}
  // graph: 4 nearest neighbours each, made symmetric; best-first search keeping ef = 6 from a corner entry point
  const NB=P.map((p,i)=>P.map((q,j)=>[d2(p,q),j]).filter(x=>x[1]!==i).sort((a,b)=>a[0]-b[0]).slice(0,4).map(x=>x[1]));
  NB.forEach((l,i)=>l.forEach(j=>{if(!NB[j].includes(i))NB[j].push(i)}));
  const edges=[];NB.forEach((l,i)=>l.forEach(j=>{if(i<j)edges.push([i,j])}));
  const entry=P.map((p,i)=>[p[0]+p[1],i]).sort((a,b)=>a[0]-b[0])[0][1];
  const seen=new Set([entry]),parent={},expanded=[],EF=6;let cand=[[d2(P[entry],Q),entry]],res=[[d2(P[entry],Q),entry]];
  while(cand.length){cand.sort((a,b)=>a[0]-b[0]);const [dc,c]=cand.shift();if(res.length>=EF&&dc>res[res.length-1][0])break;expanded.push(c);
    NB[c].forEach(j=>{if(seen.has(j))return;seen.add(j);parent[j]=c;const dj=d2(P[j],Q);if(res.length<EF||dj<res[res.length-1][0]){cand.push([dj,j]);res.push([dj,j]);res.sort((a,b)=>a[0]-b[0]);if(res.length>EF)res.pop()}})}
  const kept=new Set(res.map(x=>x[1]));
  // codes: approximate distance = true distance plus seeded noise; shortlist 10, rescored exactly, keep 5
  const rn=rng(9),approx=P.map((p,i)=>[Math.sqrt(d2(p,Q))+(rn()-0.5)*26,i]).sort((a,b)=>a[0]-b[0]);
  const short=approx.slice(0,10).map(x=>x[1]),shortS=new Set(short);
  const X=p=>[(p[0]-100)/20,0,(p[1]-75)/20],QW=X(Q);
  const got=(k,i)=>k===0||(k===1&&cellOf(P[i])===probe)||(k===2&&kept.has(i))||(k===3&&shortS.has(i));
  function ring(R,c,rad,col,a,w){const pts=[];for(let i=0;i<=28;i++){const t=i/28*Math.PI*2;pts.push([c[0]+rad*Math.cos(t),.012,c[2]+rad*Math.sin(t)])}R.line(pts,{c:col,a,w:w||2})}
  function draw(R,k,e){const P3=R.P;R.grid(-5.4,5.4,-4,4,.5);
    const ink=P3.ink,acc=P3.acc;
    // IVF: the probed cell tinted, the walls, the centroids as small posts
    if(k===1){tiles.forEach(([x,y])=>{const a=X([x,y]),b=X([x+ST,y+ST]);R.quad([[a[0],.004,a[2]],[b[0],.004,a[2]],[b[0],.004,b[2]],[a[0],.004,b[2]]],{fill:mix(P3.paper,acc,.28),edge:false,a:e})});
      walls.forEach(([u,v])=>{const a=X(u),b=X(v);R.line([[a[0],.01,a[2]],[b[0],.01,b[2]]],{c:P3.mute,w:1.2,a:.8*e})});
      C.forEach((c,j)=>{const p=X(c);R.box([p[0],0,p[2]],[.16,.42,.16],{fill:j===probe?acc:P3.paper,a:e});
        R.flowArc([QW[0],.55,QW[2]],[p[0],.45,p[2]],.35,{c:P3.q,a:e*(j===probe?.9:.35),r:.045,n:4,speed:1.4})});
      R.label(X(C[probe]),'probed cell',{dy:-34,fs:12.5,b:1,c:acc,a:e})}
    // graph: the links, then the walk from the entry point, expansion by expansion
    if(k===2){edges.forEach(([i,j])=>{const a=X(P[i]),b=X(P[j]);R.line([[a[0],.02,a[2]],[b[0],.02,b[2]]],{c:P3.mute,w:.8,a:.45*e})});
      const nEx=Math.max(1,Math.round(expanded.length*e));
      for(let t=1;t<nEx;t++){const c=expanded[t],pa=parent[c];if(pa===undefined)continue;const a=X(P[pa]),b=X(P[c]);R.line([[a[0],.03,a[2]],[b[0],.03,b[2]]],{c:acc,w:2.6})}
      const path=[];let c=expanded[nEx-1];while(c!==undefined){path.unshift(X(P[c]).map((v,i)=>i===1?.12:v));c=parent[c]}
      if(path.length>1)R.flow(path,{c:P3.q,r:.06,speed:1.6});
      ring(R,X(P[entry]),.32,ink,1,1.6);R.label(X(P[entry]),'entry',{dy:16,fs:12,c:P3.mute})}
    // the points: what this index reads is lit, the rest recedes; codes are flat chips
    P.forEach((p,i)=>{const w=X(p);let on=k===0||(k===1&&cellOf(p)===probe)||(k===2&&seen.has(i))||k===3;const a=on?1:.22;
      if(k===3){const sh=shortS.has(i),h=sh?.06+.5*e*(1-(approx.findIndex(x=>x[1]===i))/12):.025;R.box([w[0],0,w[2]],[.12,h,.12],{fill:sh?acc:mix(P3.paper,acc,.35),shadow:false,lw:.6})}
      else R.ball([w[0],.08,w[2]],on?.085:.065,{c:on?acc:P3.mute,a})});
    // exact: the query is compared with every point
    if(k===0)P.forEach((p,i)=>{if(i%2)return;const w=X(p);R.flow([[QW[0],.4,QW[2]],[w[0],.1,w[2]]],{c:P3.q,a:.55*e,r:.035,n:2,speed:1.2})});
    if(k===3)short.forEach(i=>{const w=X(P[i]);R.flowArc([QW[0],.45,QW[2]],[w[0],.3,w[2]],.3,{c:P3.q,a:e*.7,r:.04,n:3,speed:1.3})});
    // the true five nearest: green ring when this index finds it, orange ring when it misses it
    truth.forEach(i=>{const w=X(P[i]),g=got(k,i);ring(R,w,g?.2:.27,g?P3.good:P3.bad,k===0?1:Math.max(.25,e),g?1.8:2.6)});
    // the query: a post with a cross on the floor
    R.line([[QW[0]-.22,.015,QW[2]],[QW[0]+.22,.015,QW[2]]],{c:ink,w:2.6});R.line([[QW[0],.015,QW[2]-.22],[QW[0],.015,QW[2]+.22]],{c:ink,w:2.6});
    R.line([[QW[0],0,QW[2]],[QW[0],.55,QW[2]]],{c:P3.q,w:2});R.ball([QW[0],.58,QW[2]],.1,{c:P3.q});
    R.label([QW[0],.62,QW[2]],'query',{dy:-14,fs:12.5,b:1,c:P3.q});
    const cap=['reads all '+N+' points','reads 1 of 8 cells','reads '+seen.size+' of '+N+' points','reads '+N+' small codes, rescores 10'][k];
    R.label([0,0,4.1],cap,{fs:13,b:1,c:ink,dy:18})}
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · four ways to read less (points illustrative)',cam:[.22,.92],bounds:[[-5.2,0,-3.9],[5.2,.7,4.4]],aspect:.72,dur:1300,hold:4800,draw,
    view:k=>k===1||k===2?{cam:[.3,.86],bounds:[[-3.2,0,-3.9],[5.2,.7,2.6]]}:null,
    margin:w=>w<520?[12,8,22,8]:[16,14,26,14]});
})();
