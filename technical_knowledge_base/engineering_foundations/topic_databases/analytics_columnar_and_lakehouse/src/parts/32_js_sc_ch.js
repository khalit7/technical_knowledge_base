// ---- Scene, Fig. 3 (section 7): ClickHouse MergeTree run through chDB (D.ch): ten inserts make ten parts, a merge makes one,
// the sparse primary index points at 1,221 granules, and the two filters of EXPLAIN indexes = 1 read 1 granule or all of them (renderer v2) ----
(function(){
  if(!document.getElementById('stg-ch'))return;const {at,off,lerp,mix}=S3;
  const C=D.ch,PA=C.parts_after_inserts.slice().sort((a,b)=>{const n=s=>+s.split('_')[1];return n(a[0])-n(b[0])}),M=C.parts_after_merge[0];
  const G=1221,TG=Math.round(424242/1e6*G); // chat_id leads the sort key and chats are numbered up to 1,000,000, so chat 424242 sits near 42% of the part
  const PX=i=>-3.24+i*.72,ZP=-.6,ZM=1.5,L=6.9,XM0=-L/2,gx=g=>XM0+(g+.5)/G*L,RD3=[4.35,0,ZM],YI=1.05;
  function draw(R,k,e){const P=R.P;R.grid(-4.5,5,-2,2.8,.5);
    // 1. ten inserts, ten immutable parts of 1,000,000 rows each
    const pa=k===0?1:k===1?1-e:0;
    PA.forEach((p,i)=>{const ai=k===0?Math.max(0,Math.min(1,e*10-i)):pa;
      R.box([PX(i),0,ZP],[.58,.62,1.2],{fill:mix(P.paper,P.c1,.3),a:ai});
      if(i===0||i===9)R.label([PX(i),.62,ZP],p[0],{mono:true,fs:12,dy:-11,c:P.mute,a:ai,wide:1})});
    if(k===0){const i=Math.min(9,Math.floor(e*10));R.flowArc([PX(0)-1,1.5,ZP],[PX(i),.65,ZP],.3,{c:P.c1,a:.8,r:.06,n:6,speed:1.4})}
    R.label([PX(0)-.4,.3,ZP],'10 parts · 47.6 MiB each',{al:'right',dx:-6,mono:true,fs:12,c:P.c1,a:pa,grp:'rows'});
    // 2. the background merge: every part streams into one sorted part
    const ma=at(k,e,1);
    if(k===1)PA.forEach((p,i)=>R.flowArc([PX(i),.62,ZP],[lerp(XM0,-XM0,(i+.5)/10),.5,ZM],.35,{c:P.c1,a:e*.8,r:.05,n:4,speed:1.2}));
    const lit=k===4?e:0;
    R.box([0,0,ZM],[L,.5,1],{fill:mix(mix(P.paper,P.c1,.22),P.c2,lit*.7),a:ma*(k===3?.55:1)});
    R.label([XM0-.1,.25,ZM],M[0]+' · 10,000,000 rows · '+M[2],{al:'right',dx:-6,mono:true,fs:12,b:k===1,c:P.ink,a:ma,grp:'rows'});
    // 3. granules of 8,192 rows; the sparse index keeps the first key of each one (a seam every 32 granules here)
    const ga=at(k,e,2);
    if(ga>0){for(let g=0;g<=G;g+=32)R.line([[XM0+g/G*L,.505,ZM-.5],[XM0+g/G*L,.505,ZM+.5]],{c:P.edge,w:.6,a:ga*.5,dz:-.3});
      R.glass([XM0,.08,ZM-.62],[L,0,0],[0,.62,0],{c:P.c5,a:ga*(k>=3?.7:1),nu:38,nv:1});
      R.label([XM0-.1,.5,ZM-.62],'primary.idx · 1,221 keys',{al:'right',dx:-6,mono:true,fs:12,c:P.c5,a:ga,grp:'rows'})}
    // the query engine that reads the granules
    const qa=at(k,e,3);R.box(RD3,[.75,.6,.75],{fill:mix(P.paper,P.c2,.2),a:qa});R.label([RD3[0],.6,RD3[2]],'query',{b:1,fs:13,dy:-11,a:qa,c:P.c2});
    // 4. WHERE chat_id = 424242: binary search halves the range until one granule is left
    if(k===3){let lo=0,hi=G;for(let s=0;s<5;s++){const m=(lo+hi)>>1,ys=.78+s*.1,sa=Math.max(0,Math.min(1,e*5-s));
        R.line([[XM0+lo/G*L,ys,ZM-.62],[XM0+hi/G*L,ys,ZM-.62]],{c:P.c2,w:2,a:sa*(.45+s*.12),top:1});if(TG<m)hi=m;else lo=m}
      const ga1=Math.max(0,e*2-1);R.box([gx(TG),.5*ga1,ZM],[.14,.5,1],{fill:P.c2,a:ga1,shadow:false});
      if(ga1>0)R.flowArc([gx(TG),1,ZM],[RD3[0]-.3,.5,RD3[2]],.6,{c:P.c2,a:ga1,r:.06,n:6,speed:1.3});
      R.label([gx(TG),1,ZM+.5],'Granules: 1/1221',{mono:true,fs:13,b:1,dy:28,c:P.c2,a:ga1})}
    // 5. WHERE created_at on one day: created_at is second in the key, so no granule can be ruled out
    if(k===4){for(let j=0;j<6;j++)R.flowArc([lerp(XM0+.4,-XM0-.4,j/5),.55,ZM],[RD3[0]-.3,.5,RD3[2]],.45+.08*(5-j),{c:P.c2,a:e*.8,r:.05,n:5,speed:1.3});
      R.label([0,.5,ZM+.5],'Granules: 1221/1221',{mono:true,fs:13,b:1,dy:28,c:P.c2,a:e})}
  }
  const full={cam:[.3,.6],bounds:[[-4,0,-1.3],[4.8,1.4,2.1]]};
  S3.stage({id:'stg-ch',list:'sx-ch',fig:'Fig. 3 · MergeTree in chDB: parts, merge, granules',cam:full.cam,bounds:full.bounds,aspect:.42,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,16,10]:[18,14,18,190],
    // the index steps move in close on the merged part
    view:k=>k>=2?{cam:[.22,.5],bounds:[[-3.6,0,.7],[5,1.1,2.1]]}:full});
})();
