// ---- Top: the hero. One small drawing per family of what is stored together; the highlighted part is what one planned question reads (static) ----
(function(){
  const host=document.getElementById('rd-hero');if(!host)return;
  const T=RD.t,A='var(--acc)',L='var(--line)',M='var(--mute)',S='var(--soft)',H='var(--hl)';
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+h+'" rx="'+(o.rx==null?3:o.rx)+'" fill="'+(o.on?H:(o.fill||S))+'" stroke="'+(o.on?A:L)+'" stroke-width="'+(o.on?1.6:1)+'"/>'};
  const D={
    kv(w){let s='';const kw=Math.min(118,w*0.42);
      [['user:7:bucket','{tokens 14, ts}',1],['lb (sorted set)','85068 ... 4242',0],['jobs (stream)','1-0, 1-1, 1-2',0]].forEach((r,i)=>{const y=4+i*26;
        s+=box(4,y,kw,20,{on:r[2]})+T(10,y+14,r[0],{fs:11})+'<line x1="'+(kw+6)+'" y1="'+(y+10)+'" x2="'+(kw+18)+'" y2="'+(y+10)+'" stroke="'+M+'"/>'+box(kw+20,y,w-kw-26,20,{on:r[2]})+T(kw+26,y+14,r[1],{fs:11,fill:M})});
      return [s,82,'In memory: a key points at a data structure; one atomic command reads or changes it']},
    ddb(w){let s=T(4,12,'PK = CHAT#7 (one partition, sorted by SK)',{fs:11,fill:M});
      const n=6,bw=(w-8)/n;for(let i=0;i<n;i++){const on=i>=n-3;s+=box(4+i*bw,18,bw-3,22,{on})+T(4+i*bw+3,33,'MSG#'+(i+1),{fs:10.5})}
      s+=T(w-4,56,'Query: newest first, Limit 50',{fs:11,a:'end',fill:A});s+=T(4,74,'PK = CHAT#8, CHAT#9 ... on other partitions',{fs:10.5,fill:M});
      return [s,80,'DynamoDB item collection: the items of one partition key stored together in sort-key order; a Query reads the newest ones']},
    doc(w){let s=box(4,4,w-8,74,{});s+=T(10,18,'{ _id: 7, title: "Chat 7",',{fs:11});s+=box(10,24,w-20,18,{on:1})+T(16,37,'last_3: [ ... ]  (read with the chat)',{fs:10.5});
      s+=T(10,58,'messages: referenced, one document each',{fs:10.5,fill:M});s+=T(10,72,'}',{fs:11});
      return [s,82,'A document read whole: the chat with a bounded subset embedded, the unbounded messages referenced']},
    wide(w){let s='';const cx=34,cy=40,r=26;s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+L+'" stroke-width="2"/>';
      for(let k=0;k<6;k++){const a=-Math.PI/2+k*Math.PI/3;s+='<circle cx="'+(cx+r*Math.cos(a)).toFixed(1)+'" cy="'+(cy+r*Math.sin(a)).toFixed(1)+'" r="6" fill="'+(k>=1&&k<=3?'var(--c4)':S)+'" stroke="'+M+'"/>'}
      const x0=74,pw=w-x0-4;s+=T(x0,12,'partition (chat 7, bucket 3)',{fs:11,fill:M});
      for(let i=0;i<4;i++)s+=box(x0,18+i*15,pw,12,{on:i<3,rx:2});s+=T(x0+4,28,'newest',{fs:10});s+=T(x0+pw-4,73,'3 replicas',{fs:10.5,a:'end',fill:M});
      return [s,82,'Cassandra: a partition key hashed onto a ring of nodes, copied to three replicas, rows sorted newest first inside it']},
    ts(w){let s=T(4,12,'one chunk per day, newest right',{fs:11,fill:M});const n=12,bw=(w-8)/n;
      for(let i=0;i<n;i++)s+=box(4+i*bw,18,bw-2,30,{on:i===n-1,fill:i<3?'var(--bg)':S});
      s+='<line x1="4" y1="56" x2="'+(4+3*bw-2).toFixed(1)+'" y2="56" stroke="var(--bad)" stroke-width="2"/>'+T(4,72,'DROP old chunks',{fs:10.5,fill:'var(--bad)'})+T(w-4,72,'last hour: one chunk',{fs:10.5,a:'end',fill:A});
      return [s,80,'Time series: data cut into time chunks; a recent range reads one chunk and retention drops whole chunks']},
    graph(w){const P=[[0.08,0.5],[0.3,0.2],[0.3,0.8],[0.55,0.45],[0.78,0.2],[0.92,0.62],[0.62,0.9]],E=[[0,1],[0,2],[1,3],[2,3],[3,4],[4,5],[3,6],[2,6]],on=new Set(['0-1','1-3','3-4','4-5']);
      let s='';const X=p=>6+p[0]*(w-12),Y=p=>6+p[1]*64;
      E.forEach(e=>{const k=e[0]+'-'+e[1],o=on.has(k);s+='<line x1="'+X(P[e[0]]).toFixed(1)+'" y1="'+Y(P[e[0]]).toFixed(1)+'" x2="'+X(P[e[1]]).toFixed(1)+'" y2="'+Y(P[e[1]]).toFixed(1)+'" stroke="'+(o?A:L)+'" stroke-width="'+(o?2.4:1.2)+'"/>'});
      P.forEach((p,i)=>{s+='<circle cx="'+X(p).toFixed(1)+'" cy="'+Y(p).toFixed(1)+'" r="7" fill="'+([0,1,3,4,5].includes(i)?H:S)+'" stroke="'+M+'"/>'});
      s+=T(4,80,'a path follows pointers, hop by hop',{fs:10.5,fill:M});
      return [s,84,'A property graph: users joined by FRIEND relationships; a path query follows pointers from node to node']}
  };
  function draw(){host.querySelectorAll('.hs').forEach(el=>{const w=Math.max(200,RD.width(el)),r=D[el.dataset.h](w);el.innerHTML=RD.svg(w,r[1],r[0],r[2])})}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
