// ---- Scene: Fig. 4, a filter cutting the graph (renderer v2). Data: layer 0 of Fig. 3's recorded HNSW graph (VIX.hnsw, 240 real passages,
// M 5); the filter is either a random attribute (seeded, about 10% of nodes, like the page's random-attribute runs) or one collection
// (QASPER, 60 nodes, correlated with QASPER questions). Links, pieces (connected components) and two-hop links are computed here from the
// recorded links. Steps: the graph; the filter cuts it; hnswlib walks through failing nodes; two-hop neighbours reconnect the passing ones. ----
(function(){
  const H=window.VIX&&window.VIX.hnsw;if(!H||!document.getElementById('stg-fc'))return;const {at,off,mix}=S3;
  const $=id=>document.getElementById(id),N=H.n,L=H.modes.hnsw.links;
  const adj=[...Array(N)].map(()=>new Set());for(let a=0;a<N;a++)(L[a][0]||[]).forEach(b=>{adj[a].add(b);adj[b].add(a)});
  const edges=[];for(let a=0;a<N;a++)adj[a].forEach(b=>{if(a<b)edges.push([a,b])});
  function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const r=rng(11),RAND=new Set([...Array(N).keys()].filter(()=>r()<.1));
  const FIL={rand:RAND,qasper:new Set([...Array(N).keys()].filter(i=>H.src[i]==='qasper'))};
  // pieces of the passing nodes, stepping on passing nodes only (one hop, or up to two hops through any node)
  function pieces(P,two){const seen=new Set(),out=[];for(const s of P){if(seen.has(s))continue;const comp=[s];seen.add(s);
      for(let i=0;i<comp.length;i++){const x=comp[i],nb=new Set(adj[x]);if(two)adj[x].forEach(y=>adj[y].forEach(z=>nb.add(z)));nb.forEach(y=>{if(P.has(y)&&!seen.has(y)){seen.add(y);comp.push(y)}})}
      out.push(comp)}return out.sort((a,b)=>b.length-a.length)}
  // a shortest path between two passing nodes in different pieces, through any nodes (what hnswlib's filtered walk can do)
  function bridge(P,pc){if(pc.length<2)return [];const tgt=new Set(pc[1]),src=pc[0][0],prev=new Map([[src,-1]]),q=[src];
    while(q.length){const x=q.shift();if(tgt.has(x)){const p=[];let c=x;while(c!==-1){p.unshift(c);c=prev.get(c)}return p}adj[x].forEach(y=>{if(!prev.has(y)){prev.set(y,x);q.push(y)}})}return []}
  const memo={};function info(f){if(memo[f])return memo[f];const P=FIL[f],one=pieces(P,false),two=pieces(P,true),kept=edges.filter(([a,b])=>P.has(a)&&P.has(b));
    const hop2=[];P.forEach(a=>P.forEach(b=>{if(a<b&&!adj[a].has(b)&&[...adj[a]].some(y=>adj[y].has(b)))hop2.push([a,b])}));
    return memo[f]={P,one,two,kept,hop2,path:bridge(P,one)}}
  const st={f:'rand'};
  const pos=i=>[(H.xy[i][0]-.5)*8,.06,(H.xy[i][1]-.5)*6];
  function draw(R,k,e){const C=R.P,I=info(st.f),P=I.P;R.grid(-4.6,4.6,-3.6,3.6,.5);
    const cut=k===0?0:k===1?e:1;
    // every link; those touching a failing node fade out when the filter applies (step 3 brings them back faintly: the walk may use them)
    edges.forEach(([a,b])=>{const keep=P.has(a)&&P.has(b),aa=keep?(k>=1?.95:.35):k===2?.3:.35*(1-cut)+.05*cut;R.line([pos(a),pos(b)],{c:keep&&k>=1?C.acc:C.mute,w:keep&&k>=1?2.2:.8,a:aa})});
    for(let i=0;i<N;i++){const pass=P.has(i);R.ball(pos(i),pass?.085:.06,{c:pass?(k>=1?C.acc:C.ink):C.mute,a:pass?1:k===0?.8:k===2?.45:.8-.6*cut})}
    // hnswlib's filtered walk: it may step on failing nodes, so a path joins two pieces
    if(k===2&&I.path.length>1){const pts=I.path.map(i=>pos(i).map((v,j)=>j===1?.12:v));R.line(pts,{c:C.q,w:3,a:e});R.flow(pts,{c:C.q,r:.06,speed:1.4,a:e});
      I.path.forEach(i=>{if(!P.has(i))R.ball(pos(i),.09,{c:C.paper,a:e})})}
    // two-hop links among passing nodes
    if(k===3){I.hop2.forEach(([a,b])=>R.line([pos(a),pos(b)],{c:C.good,w:1.8,a:.85*e,dash:[5,3]}));I.hop2.slice(0,12).forEach(([a,b])=>R.flow([pos(a),pos(b)],{c:C.good,r:.04,n:3,speed:1,a:e}))}
    const lab=k===0?edges.length+' links':k===1?I.kept.length+' links survive · '+I.one.length+' pieces':k===2?(I.one.length>1?'walks through failing nodes':'already one piece: nothing to bridge'):I.two.length+' piece'+(I.two.length>1?'s':'')+' with two-hop links';
    R.label([0,0,3.4],lab,{dy:18,fs:13,b:1,c:k===3?C.good:k===2?C.q:C.acc})}
  function readout(){const I=info(st.f);$('vix-fc-out').innerHTML='Filter keeps <b>'+I.P.size+' of '+N+'</b> nodes. Links among them: <b>'+I.kept.length+'</b> of '+edges.length+'; pieces when stepping on passing nodes only: <b>'+I.one.length+'</b> (largest '+I.one[0].length+'); with two-hop links: <b>'+I.two.length+'</b>.'}
  const stg=S3.stage({id:'stg-fc',list:'sx-fc',fig:'Fig. 4 · a filter cuts Fig. 3’s graph',cam:[.3,.82],bounds:[[-4.4,0,-3.4],[4.4,.3,3.9]],aspect:.72,dur:1300,hold:5000,draw,
    margin:w=>w<520?[12,8,22,8]:[16,14,26,14],onStep:()=>{try{readout()}catch(e){}}});
  RD.seg($('vix-fc-f'),v=>{st.f=v;readout();stg.list('sx-fc')});
  readout();
})();
