// ---- Reading tab: the hero (four ways to read less, on one illustrative point set, with measured SciFact numbers)
// and the DiskANN node-layout diagram (section 7). Static drawings: nothing moves. ----
(function(){
  const V=window.VIX;if(!V)return;const R=V.r,$=id=>document.getElementById(id);
  const fmtI=x=>Math.round(x).toLocaleString('en-US');
  // ---------- hero
  function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  // one illustrative point set (seeded); search parameters chosen so the panels show both a hit and a miss
  const r=rng(5),W0=200,H0=150,P=[];
  const gauss=()=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  [[48,42,20],[140,40,22],[100,108,24],[165,115,14]].forEach(([cx,cy,s],k)=>{for(let i=0;i<(k===3?14:26);i++)P.push([Math.max(6,Math.min(W0-6,cx+gauss()*s)),Math.max(6,Math.min(H0-6,cy+gauss()*s*0.8))])});
  for(let i=0;i<10;i++)P.push([8+r()*(W0-16),8+r()*(H0-16)]);
  const Q=[120,60];const d2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;
  const truth=P.map((p,i)=>[d2(p,Q),i]).sort((a,b)=>a[0]-b[0]).slice(0,5).map(x=>x[1]);
  // IVF: k-means with 8 centroids, a few iterations from seeded points; probe the nearest cell
  let C=[0,13,27,40,55,70,85,100].map(i=>P[i%P.length].slice());
  for(let it=0;it<8;it++){const s=C.map(()=>[0,0,0]);P.forEach(p=>{let b=0;C.forEach((c,j)=>{if(d2(p,c)<d2(p,C[b]))b=j});s[b][0]+=p[0];s[b][1]+=p[1];s[b][2]++});C=C.map((c,j)=>s[j][2]?[s[j][0]/s[j][2],s[j][1]/s[j][2]]:c)}
  const cellOf=p=>{let b=0;C.forEach((c,j)=>{if(d2(p,c)<d2(p,C[b]))b=j});return b};
  const probed=new Set(C.map((c,j)=>[d2(c,Q),j]).sort((a,b)=>a[0]-b[0]).slice(0,1).map(x=>x[1]));
  // graph: 4 nearest neighbours each, made symmetric; best-first search keeping ef = 6 from a corner entry point
  const NB=P.map((p,i)=>P.map((q,j)=>[d2(p,q),j]).filter(x=>x[1]!==i).sort((a,b)=>a[0]-b[0]).slice(0,4).map(x=>x[1]));
  NB.forEach((l,i)=>l.forEach(j=>{if(!NB[j].includes(i))NB[j].push(i)}));
  const entry=P.map((p,i)=>[p[0]+p[1],i]).sort((a,b)=>a[0]-b[0])[0][1];
  const seen=new Set([entry]),parent={},expanded=[],EF=6;let cand=[[d2(P[entry],Q),entry]],res=[[d2(P[entry],Q),entry]];
  while(cand.length){cand.sort((a,b)=>a[0]-b[0]);const [dc,c]=cand.shift();if(res.length>=EF&&dc>res[res.length-1][0])break;expanded.push(c);
    NB[c].forEach(j=>{if(seen.has(j))return;seen.add(j);parent[j]=c;const dj=d2(P[j],Q);if(res.length<EF||dj<res[res.length-1][0]){cand.push([dj,j]);res.push([dj,j]);res.sort((a,b)=>a[0]-b[0]);if(res.length>EF)res.pop()}})}
  const kept=new Set(res.map(x=>x[1]));
  // compressed: approximate distance = true distance plus seeded noise; shortlist 10, rescore, keep 5
  const rn=rng(9);const approx=P.map((p,i)=>[Math.sqrt(d2(p,Q))+(rn()-0.5)*26,i]).sort((a,b)=>a[0]-b[0]);
  const short=new Set(approx.slice(0,10).map(x=>x[1]));
  function panel(kind){let s='';
    if(kind==='ivf'){const st=5;for(let x=0;x<W0;x+=st)for(let y=0;y<H0;y+=st){const c=cellOf([x+st/2,y+st/2]);if(probed.has(c))s+='<rect x="'+x+'" y="'+y+'" width="'+st+'" height="'+st+'" fill="var(--acc2)"/>'}
      // cell walls: draw a tile edge where the nearest centroid changes
      for(let x=0;x<W0;x+=st)for(let y=0;y<H0;y+=st){const c=cellOf([x+st/2,y+st/2]);if(x+st<W0&&cellOf([x+st*1.5,y+st/2])!==c)s+='<line x1="'+(x+st)+'" y1="'+y+'" x2="'+(x+st)+'" y2="'+(y+st)+'" stroke="var(--line)" stroke-width="1"/>';if(y+st<H0&&cellOf([x+st/2,y+st*1.5])!==c)s+='<line x1="'+x+'" y1="'+(y+st)+'" x2="'+(x+st)+'" y2="'+(y+st)+'" stroke="var(--line)" stroke-width="1"/>'}}
    if(kind==='graph'){const done=new Set();NB.forEach((l,i)=>l.forEach(j=>{const k=i<j?i+'-'+j:j+'-'+i;if(done.has(k))return;done.add(k);s+='<line x1="'+P[i][0].toFixed(1)+'" y1="'+P[i][1].toFixed(1)+'" x2="'+P[j][0].toFixed(1)+'" y2="'+P[j][1].toFixed(1)+'" stroke="var(--dim)" stroke-width="0.6"/>'}));
      expanded.forEach(c=>{const pa=parent[c];if(pa===undefined)return;s+='<line x1="'+P[pa][0].toFixed(1)+'" y1="'+P[pa][1].toFixed(1)+'" x2="'+P[c][0].toFixed(1)+'" y2="'+P[c][1].toFixed(1)+'" stroke="var(--acc)" stroke-width="2"/>'})}
    P.forEach((p,i)=>{let on,sh='c';
      if(kind==='flat')on=true;else if(kind==='ivf')on=probed.has(cellOf(p));else if(kind==='graph')on=seen.has(i);else{on=true;sh='s'}
      const col=on?'var(--acc)':'var(--dim)';
      s+=sh==='s'?'<rect x="'+(p[0]-1.6).toFixed(1)+'" y="'+(p[1]-1.6).toFixed(1)+'" width="3.2" height="3.2" fill="'+col+'"/>':'<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+(on?2.8:2.2)+'" fill="'+col+'"/>'});
    if(kind==='ivf')C.forEach(c=>{s+='<rect x="'+(c[0]-3.5).toFixed(1)+'" y="'+(c[1]-3.5).toFixed(1)+'" width="7" height="7" fill="none" stroke="var(--ink)" stroke-width="1.4"/>'});
    if(kind==='pq')short.forEach(i=>{s+='<circle cx="'+P[i][0].toFixed(1)+'" cy="'+P[i][1].toFixed(1)+'" r="5" fill="none" stroke="var(--ink)" stroke-width="1"/>'});
    if(kind==='graph')s+='<circle cx="'+P[entry][0].toFixed(1)+'" cy="'+P[entry][1].toFixed(1)+'" r="5.5" fill="none" stroke="var(--ink)" stroke-width="1.6"/>';
    truth.forEach(i=>{const got=kind==='flat'||(kind==='ivf'&&probed.has(cellOf(P[i])))||(kind==='graph'&&kept.has(i))||(kind==='pq'&&short.has(i));
      s+='<circle cx="'+P[i][0].toFixed(1)+'" cy="'+P[i][1].toFixed(1)+'" r="'+(got?4.2:6)+'" fill="none" stroke="'+(got?'var(--good)':'var(--bad)')+'" stroke-width="'+(got?1.4:2)+'"/>'});
    s+='<path d="M'+(Q[0]-6)+' '+Q[1]+'h12M'+Q[0]+' '+(Q[1]-6)+'v12" stroke="var(--ink)" stroke-width="2.2"/>';
    return '<svg viewBox="0 0 '+W0+' '+H0+'" role="img" aria-label="'+kind+' search on an illustrative point set">'+s+'</svg>'}
  function hero(){const el=$('vix-hero');if(!el)return;
    const iv=R.ivf.scifact_qwen3.find(g=>g.nlist===72).rows.find(x=>x.nprobe===8);
    const hn=R.hnsw.scifact_qwen3.grid.find(g=>g.M===16&&g.efc===200).rows.find(x=>x.ef===40);
    const pq=R.quant.scifact.rows.find(x=>x.name==='PQ m=16 + rescore x10');
    const cards=[['flat','Exact: read everything','5,183 distances over 21 MB; recall <b>1.000</b>'],
      ['ivf','IVF: read the nearest cells','72 cells, 8 probed: '+fmtI(iv.ndis)+' distances; recall <b>'+iv.recall10.toFixed(3)+'</b>'],
      ['graph','Graph: read what the walk passes','HNSW M 16, ef 40: '+fmtI(hn.ndis)+' distances in '+Math.round(hn.nhops)+' hops; recall <b>'+hn.recall10.toFixed(3)+'</b>'],
      ['pq','Codes: read everything, small','5,183 codes of 16 B (83 KB), best 100 rescored; recall <b>'+pq.recall10.toFixed(3)+'</b>']];
    el.innerHTML=cards.map(c=>'<div><h4>'+c[1]+'</h4>'+panel(c[0])+'<div class="n">'+c[2]+'</div></div>').join('')}
  RD.onRender(hero);hero();
  // ---------- DiskANN node layout on SSD, drawn to scale (one 4,096-byte sector = a fixed width)
  let dk='128';
  function disk(){const el=$('vix-dk');if(!el)return;const W=Math.max(280,Math.min(RD.width(el),760));const small=W<480;
    const d=+dk,Rn=d===128?64:32,vec=d*4,ids=Rn*4,node=vec+ids,SEC=4096,nsec=4;
    const L=8,top=8,secW=(W-2*L)/nsec,bx=b=>L+b/SEC*secW;let s='';
    // RAM row
    s+='<rect x="'+L+'" y="'+top+'" width="'+(W-2*L)+'" height="34" rx="6" fill="var(--soft)" stroke="var(--line)"/>';
    s+=RD.t(L+8,top+14,'RAM',{fs:11,w:600,fill:'var(--ink)'})+RD.t(L+8,top+28,small?'PQ codes of every node: steer the walk':'PQ codes of every node (a few dozen bytes each): score neighbours, steer the walk',{fs:11,fill:'var(--mute)'});
    // SSD row
    const y0=top+62,hh=58;s+=RD.t(L,y0-6,'SSD: four 4,096-byte sectors',{fs:11,w:600,fill:'var(--ink)'});
    for(let k=0;k<nsec;k++)s+='<rect x="'+(L+k*secW).toFixed(1)+'" y="'+y0+'" width="'+secW.toFixed(1)+'" height="'+hh+'" fill="var(--bg)" stroke="var(--mute)" stroke-width="1"/>';
    // nodes: pack whole nodes per sector; a node larger than a sector takes ceil(node/SEC) sectors
    let off=0,n=0;const per=Math.floor(SEC/node);
    while(off<nsec*SEC-1){let start=off;if(per===0){const span=Math.ceil(node/SEC)*SEC;if(start+span>nsec*SEC)break;
        s+='<rect x="'+bx(start).toFixed(1)+'" y="'+(y0+6)+'" width="'+(bx(start+vec)-bx(start)).toFixed(1)+'" height="'+(hh-12)+'" fill="var(--c1)" opacity="0.85"/><rect x="'+bx(start+vec).toFixed(1)+'" y="'+(y0+6)+'" width="'+Math.max(1.5,bx(start+node)-bx(start+vec)).toFixed(1)+'" height="'+(hh-12)+'" fill="var(--c3)"/>';
        s+='<rect x="'+bx(start+node).toFixed(1)+'" y="'+(y0+6)+'" width="'+(bx(start+span)-bx(start+node)).toFixed(1)+'" height="'+(hh-12)+'" fill="var(--soft)"/>';
        s+=RD.t(bx(start)+4,y0+hh/2+4,'node '+(n+1),{fs:11,fill:'var(--bg)',w:600});off+=span;n++;continue}
      for(let j=0;j<per;j++){const a=start+j*node;s+='<rect x="'+(bx(a)+0.5).toFixed(1)+'" y="'+(y0+6)+'" width="'+(bx(a+vec)-bx(a)-0.5).toFixed(1)+'" height="'+(hh-12)+'" fill="var(--c1)" opacity="0.85"/><rect x="'+bx(a+vec).toFixed(1)+'" y="'+(y0+6)+'" width="'+(bx(a+node)-bx(a+vec)-0.5).toFixed(1)+'" height="'+(hh-12)+'" fill="var(--c3)"/>';n++}
      s+='<rect x="'+bx(start+per*node).toFixed(1)+'" y="'+(y0+6)+'" width="'+(bx(start+SEC)-bx(start+per*node)).toFixed(1)+'" height="'+(hh-12)+'" fill="var(--soft)"/>';off+=SEC}
    // the hop: one read
    const hy=y0+hh+20;const span=per?SEC:Math.ceil(node/SEC)*SEC;
    s+='<path d="M'+bx(0).toFixed(1)+' '+(y0+hh+4)+'v6h'+(bx(span)-bx(0)).toFixed(1)+'v-6" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    s+=RD.t(bx(0),hy+6,'one hop reads '+(span/SEC)+' sector'+(span>SEC?'s':'')+(per?' ('+per+' nodes inside)':''),{fs:11,fill:'var(--acc)',w:600});
    // legend
    const ly=hy+24;s+='<rect x="'+L+'" y="'+(ly-9)+'" width="10" height="10" fill="var(--c1)"/>'+RD.t(L+14,ly,'full vector '+vec.toLocaleString('en-US')+' B',{fs:11,fill:'var(--ink)'});
    const lx=L+(small?120:150);s+='<rect x="'+lx+'" y="'+(ly-9)+'" width="10" height="10" fill="var(--c3)"/>'+RD.t(lx+14,ly,Rn+' neighbour ids '+ids+' B',{fs:11,fill:'var(--ink)'});
    const lx2=lx+(small?126:150);if(!small)s+='<rect x="'+lx2+'" y="'+(ly-9)+'" width="10" height="10" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(lx2+14,ly,'padding',{fs:11,fill:'var(--ink)'});
    el.innerHTML=RD.svg(W,ly+8,s,'DiskANN node layout on SSD');
    $('vix-dk-cap').innerHTML=d===128?'A node is d &times; 4 + R &times; 4 = 128 &times; 4 + 64 &times; 4 = <b>768 bytes</b>: '+per+' whole nodes fit in one 4,096-byte sector, so one hop is one random read, and the full vector that arrives re-scores the candidate while its neighbour ids feed the next step (their PQ codes, in RAM, rank them). <span class="mute">drawn to scale; whole nodes per sector, padded so a node&rsquo;s position is computed (Section 3.2)</span>':'A node is 1,024 &times; 4 + 32 &times; 4 = <b>4,224 bytes</b>, just over one sector: two reads per hop. Stored in float16 it is 2,048 + 128 = 2,176 bytes and fits one sector again; lowering R saves only 4 bytes per edge. <span class="mute">drawn to scale, assuming each node starts on a sector boundary</span>'}
  RD.seg($('vix-dk-d'),v=>{dk=v;disk()});RD.onRender(disk);RD.onResize(disk);disk();
})();
