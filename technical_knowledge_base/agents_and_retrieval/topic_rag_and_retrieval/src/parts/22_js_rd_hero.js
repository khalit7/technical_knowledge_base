// ---- Reading tab hero: one question's path through a RAG system, each stage a link to the child page that owns it ----
// Static annotated diagram (no motion), drawn at the measured width so labels never shrink or clip.
(function(){
  const host=document.getElementById('rd-hero-svg');if(!host||!window.RD)return;
  const N='https://app.notion.com/p/';
  const P={ing:'3f85c17b0d0d81279079f614f382f2e7',rp:'3c65c17b0d0d819899fde889e1e8b782',emb:'3c65c17b0d0d81508f99e1fa78c2bb41',
    vix:'3f85c17b0d0d81f29707c130b2ebcfb1',rr:'3f85c17b0d0d813fba53fc883f8a2c8f',ar:'3c65c17b0d0d8105a68cfb504ed4b0e8',
    gr:'3f85c17b0d0d81e2bb4cdbb749e48a5a',prd:'3f85c17b0d0d81aa9ba9c0ceac9e28c1'};
  const NAME={ing:'Document ingestion',rp:'Retrieval pipeline',emb:'Embedding models',vix:'Vector indexes',rr:'Rerankers',
    ar:'Agentic retrieval',gr:'GraphRAG',prd:'RAG in production'};
  const t=RD.t;
  const IDX=[['Parse','ing','MinerU keeps 94 of 107'],['Chunk','rp','whole: 607 to 838 of 892'],['Embed, count terms','emb','vectors and BM25 terms'],['Index','vix','HNSW: 0.991 of top 10']];
  const QRY=[['Rewrite, route','rp','HyDE 0.700 to 0.718'],['First stage','rp','186 of 188 in top 30'],['Rerank top 30','rr','178 kept in top 3'],['Prompt, top 3','rp','with ids to cite'],['Generate, cite','rp','96 of 188 right']];
  const BANDS=[['Who decides what to read','ar'],['Structure before the question','gr'],['After launch','prd']];
  const link=(k,body)=>'<a href="'+N+P[k]+'" target="_blank" rel="noopener noreferrer" aria-label="'+NAME[k]+'"><title>'+NAME[k]+'</title>'+body+'</a>';
  function box(x,y,w,h,c,s,narrow){
    let g='<rect class="bx" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--bg)" stroke="var(--line)"/>'+
      '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="4" rx="2" fill="var('+c+')"/>';
    if(narrow){
      g+=t(x+10,y+20,s[0],{fs:12.5,w:600})+t(x+w-8,y+20,NAME[s[1]]+' ↗',{fs:11,a:'end',fill:'var(--acc)'});
      g+=t(x+10,y+37,s[2],{fs:11.5,fill:'var(--mute)'});
    }else{
      g+=t(x+8,y+20,s[0],{fs:12.5,w:600})+t(x+8,y+36,NAME[s[1]]+' ↗',{fs:11,fill:'var(--acc)'})+t(x+8,y+52,s[2],{fs:11,fill:'var(--mute)'});
    }
    return link(s[1],g);
  }
  const arrowR=(x1,x2,y)=>'<line x1="'+x1+'" y1="'+y+'" x2="'+(x2-5)+'" y2="'+y+'" stroke="var(--mute)" stroke-width="1.5"/><path d="M'+(x2-7)+' '+(y-4)+' L'+x2+' '+y+' L'+(x2-7)+' '+(y+4)+'" fill="var(--mute)"/>';
  const arrowD=(x,y1,y2)=>'<line x1="'+x+'" y1="'+y1+'" x2="'+x+'" y2="'+(y2-5)+'" stroke="var(--mute)" stroke-width="1.5"/><path d="M'+(x-4)+' '+(y2-7)+' L'+x+' '+y2+' L'+(x+4)+' '+(y2-7)+'" fill="var(--mute)"/>';
  function band(x,y,w,s,narrow){
    const h=narrow?30:42;
    return link(s[1],'<rect class="bx" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="var(--line)"/>'+
      t(x+10,y+19,s[0],{fs:12,w:600})+(narrow?t(x+w-8,y+19,NAME[s[1]]+' \u2197',{fs:11,a:'end',fill:'var(--acc)'}):t(x+10,y+34,NAME[s[1]]+' \u2197',{fs:11,fill:'var(--acc)'})));
  }
  function draw(){
    const W=Math.min(RD.width(host),820),narrow=W<760;
    let g='',y=4;
    if(!narrow){
      const gap=16;
      const lane=(label,arr,c)=>{g+=t(0,y+11,label,{fs:11.5,w:600,fill:'var(--mute)'});y+=18;
        const n=arr.length,bw=(W-gap*(n-1))/n,xs=[];
        arr.forEach((s,i)=>{const x=i*(bw+gap);xs.push(x);g+=box(x,y,bw,62,c,s,false);if(i)g+=arrowR(x-gap+1,x-1,y+31)});
        const r={y,bw,xs};y+=62;return r};
      const a=lane('Index time, once per document',IDX,'--c3');
      y+=22;
      const yq=y;
      const b=lane('Query time, once per question',QRY,'--acc');
      // the index feeds the first stage
      const xi=a.xs[3]+a.bw/2,xf=b.xs[1]+b.bw/2,ym=a.y+62+10;
      g+='<path d="M'+xi+' '+(a.y+62)+' L'+xi+' '+ym+' L'+xf+' '+ym+' L'+xf+' '+(b.y-5)+'" fill="none" stroke="var(--mute)" stroke-width="1.5" stroke-dasharray="4 3"/>'+
        '<path d="M'+(xf-4)+' '+(b.y-7)+' L'+xf+' '+b.y+' L'+(xf+4)+' '+(b.y-7)+'" fill="var(--mute)"/>';
      y+=14;
      const bw=(W-2*10)/3;
      BANDS.forEach((s,i)=>{g+=band(i*(bw+10),y,bw,s,false)});
      y+=44;
    }else{
      const bw=W-2;
      const lane=(label,arr,c)=>{g+=t(0,y+11,label,{fs:11.5,w:600,fill:'var(--mute)'});y+=18;const ys=[];
        arr.forEach((s,i)=>{if(i){g+=arrowD(22,y,y+14);y+=14}ys.push(y);g+=box(1,y,bw,46,c,s,true);y+=46});return ys};
      lane('Index time, once per document',IDX,'--c3');
      y+=8;g+=t(0,y+11,'the index feeds the first stage ↓',{fs:11,fill:'var(--mute)'});y+=20;
      lane('Query time, once per question',QRY,'--acc');
      y+=14;
      BANDS.forEach(s=>{g+=band(1,y,bw,s,true);y+=36});
    }
    host.innerHTML=RD.svg(W,y+2,g,'A RAG system in two halves. Index time: parse, chunk, embed and count terms, index. Query time: rewrite, first stage, rerank the top 30, prompt with the top 3, generate and cite. Each stage links to the child page that owns it.');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
