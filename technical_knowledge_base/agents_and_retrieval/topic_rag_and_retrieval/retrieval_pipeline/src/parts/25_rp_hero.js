// ---- Reading, the hero: the pipeline as a static annotated diagram (index time row, query time row), with the
// largest measured effect of each stage's main knob and the evidence of 188 SciFact claims followed through it.
// Every number is quoted in the Reading text with its source; this figure only places them.
(function(){
  const el=document.getElementById('rp-hero');if(!el)return;
  const E=RD.esc;
  // [title, knob lines, measured line, section]
  const IDX=[
    ['Documents',['parsed to text','(ingestion page)'],'',''],
    ['Chunk + metadata',['cut where the','author did'],'found 56.8→70.0%','§1, §6'],
    ['Two indexes',['BM25 (words)','+ vectors'],'BM25 tuning: ±0','§2, §3']];
  const QRY=[
    ['Question',['+ chat history','+ user’s rights'],'',''],
    ['Rewrite, if needed',['chat follow-up','→ standalone'],'rank 1: 2→6 of 8','§5'],
    ['Search both',['filter inside','each search'],'post-filter: 1.73/10','§6'],
    ['Fuse the lists',['RRF, or tuned','score fusion'],'0.700→0.724','§4'],
    ['Rerank top K',['cross-encoder','(rerankers page)'],'0.724→0.778',''],
    ['Assemble + cite',['top k with ids,','merged spans'],'k 1→10: 97→101','§7, §8']];
  const SURV=[[2,'186 of 188 in the fused top 30'],[4,'178 in the top 3'],[5,'96 right, cited']];
  function box(x,y,w,h,b,hl){
    let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--soft)" stroke="'+(hl?'var(--acc)':'var(--line)')+'" stroke-width="'+(hl?1.6:1)+'"/>';
    let ty=y+17;s+=RD.t(x+8,ty,E(b[0]),{fs:12,w:600,fill:'var(--ink)'});
    b[1].forEach(l=>{ty+=14;s+=RD.t(x+8,ty,E(l),{fs:11,fill:'var(--mute)'})});
    if(b[2]){ty+=16;s+=RD.t(x+8,ty,E(b[2]),{fs:11,w:600,fill:'var(--acc)'})}
    if(b[3])s+=RD.t(x+w-6,y+h-6,E(b[3]),{fs:11,a:'end',fill:'var(--mute)'});
    return s}
  const arrow=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.3" marker-end="url(#rp-ah)"/>';
  const defs='<defs><marker id="rp-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
  function draw(){
    const W=Math.min(980,RD.width(el));let s=defs,H;
    if(W>=760){
      const g=12,cw=(W-5*g)/6,bh=86;
      s+=RD.t(0,12,'INDEX TIME, once per document',{fs:11,w:600,fill:'var(--mute)'});
      IDX.forEach((b,i)=>{const x=i*(cw+g);s+=box(x,20,cw,bh,b,false);if(i<2)s+=arrow(x+cw+1,20+bh/2,x+cw+g-1,20+bh/2)});
      const y2=20+bh+44;
      s+=RD.t(0,y2-8,'QUERY TIME, once per question',{fs:11,w:600,fill:'var(--mute)'});
      s+=arrow(2*(cw+g)+cw/2,20+bh+1,2*(cw+g)+cw/2,y2-1);
      QRY.forEach((b,i)=>{const x=i*(cw+g);s+=box(x,y2,cw,bh,b,i>=2);if(i<5)s+=arrow(x+cw+1,y2+bh/2,x+cw+g-1,y2+bh/2)});
      const y3=y2+bh+10;
      s+='<line x1="'+(2*(cw+g))+'" x2="'+(5*(cw+g)+cw)+'" y1="'+(y3+6)+'" y2="'+(y3+6)+'" stroke="var(--acc)" stroke-width="2"/>';
      SURV.forEach(([i,t])=>{const x=i*(cw+g);s+='<circle cx="'+(x+8)+'" cy="'+(y3+6)+'" r="4" fill="var(--acc)"/>'+RD.t(x+8,y3+22,E(t),{fs:11,fill:'var(--acc)',w:600})});
      s+=RD.t(2*(cw+g),y3+38,'evidence of 188 SciFact claims, followed through the pipeline (§9)',{fs:11,fill:'var(--mute)'});
      H=y3+44;
    }else{
      const bw=W-2,bh=80,gap=14;let y=0;
      const row=(label,list,hlFrom)=>{s+=RD.t(0,y+12,label,{fs:11,w:600,fill:'var(--mute)'});y+=20;
        list.forEach((b,i)=>{s+=box(1,y,bw,bh,b,i>=hlFrom);
          const sv=label.startsWith('QUERY')&&SURV.find(z=>z[0]===i);
          if(sv)s+=RD.t(bw-8,y+31,E(sv[1]),{fs:11,a:'end',w:600,fill:'var(--acc)'});
          y+=bh;if(i<list.length-1){s+=arrow(bw/2,y+1,bw/2,y+gap-1);y+=gap}})};
      row('INDEX TIME, once per document',IDX,99);y+=8;s+=arrow(bw/2,y-6,bw/2,y+8);y+=10;
      row('QUERY TIME, once per question',QRY,2);
      H=y+4;
    }
    el.innerHTML=RD.svg(W,H,s,'The retrieval pipeline: index time and query time stages with measured effects');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
