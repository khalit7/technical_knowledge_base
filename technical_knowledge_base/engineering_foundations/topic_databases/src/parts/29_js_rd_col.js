// ---- Reading tab, section 5: SUM(tokens) GROUP BY model read row by row and column by column; bytes read counted (measured, RDD.M) ----
(function(){
  const card=document.getElementById('rd-col-card');if(!card)return;
  const svgEl=document.getElementById('rd-col-svg'),cap=document.getElementById('rd-col-cap'),cnt=document.getElementById('rd-col-cnt'),note=document.getElementById('rd-col-note');
  const M=RDD.M,cols=['id','chat_id','role','model','tokens','content','created_at'],need={model:1,tokens:1};
  const colour={id:'var(--c5)',chat_id:'var(--c4)',role:'var(--c6)',model:'var(--c1)',tokens:'var(--c2)',content:'var(--dim)',created_at:'var(--c3)'};
  const mb=b=>b>0&&b<1e5?(b/1e3).toFixed(1)+' KB':(b/1e6).toFixed(b<1e7?2:1)+' MB';
  const colBytes=M.pq.model+M.pq.tokens,ROWN=7,COLN=6,PAGES=8;
  let mode='row';
  function draw(i){
    const W=RD.width(svgEl);let b='',H;
    if(mode==='row'){
      // PAGES page boxes, each with 5 row stripes split into the 7 columns by their average (uncompressed) width
      const tot=cols.reduce((a,c)=>a+M.pqU[c],0);
      const per=W>560?4:2,pw=(W-8)/per-8,ph=62,rowsN=Math.ceil(PAGES/per);H=rowsN*(ph+22)+6;
      const scanned=Math.round(PAGES*Math.min(1,i/(ROWN-2)));
      for(let k=0;k<PAGES;k++){const x=4+(k%per)*(pw+8),y=4+Math.floor(k/per)*(ph+22);const on=k<scanned;
        b+='<rect x="'+x+'" y="'+y+'" width="'+pw+'" height="'+ph+'" rx="4" fill="none" stroke="'+(on?'var(--c2)':'var(--line)')+'" stroke-width="'+(on?2:1)+'"/>';
        for(let r=0;r<5;r++){let xx=x+4;const yy=y+5+r*11;cols.forEach(c=>{const w=(pw-8)*M.pqU[c]/tot;b+='<rect x="'+xx+'" y="'+yy+'" width="'+Math.max(0.6,w-0.6)+'" height="8" fill="'+colour[c]+'" opacity="'+(on?(need[c]?1:0.75):0.25)+'"/>';xx+=w})}
        b+=RD.t(x+2,y+ph+14,k===PAGES-1?'... page 19,235':'page '+(k+1),{fs:10.5,fill:'var(--mute)'});}
    }else{
      // one bar per column chunk, length proportional to its compressed size
      const mx=Math.max(...cols.map(c=>M.pq[c])),lw=W>480?92:70,bw=W-lw-90;H=cols.length*26+8;
      cols.forEach((c,k)=>{const y=6+k*26,w=Math.max(2,bw*M.pq[c]/mx);
        const rd=need[c]&&((c==='model'&&i>=2)||(c==='tokens'&&i>=3));
        b+=RD.t(lw-6,y+13,c,{a:'end',fs:11.5,w:need[c]?600:400})+
          '<rect x="'+lw+'" y="'+y+'" width="'+w+'" height="16" rx="2" fill="'+colour[c]+'" opacity="'+(rd?1:(need[c]?0.55:0.22))+'"'+(rd?' stroke="var(--ink)" stroke-width="1.2"':'')+'/>'+
          RD.t(lw+w+5,y+13,mb(M.pq[c]),{fs:10.5,fill:rd?'var(--ink)':'var(--mute)'});});
    }
    svgEl.innerHTML=RD.svg(W,H,b,mode==='row'?'Row store pages, each holding whole rows':'Column chunks of a Parquet file, sized by compressed bytes');
    let bytes,ms,t,p;const last=(mode==='row'?ROWN:COLN)-1;
    if(mode==='row'){
      const f=Math.min(1,i/(ROWN-2));bytes=M.aggRowBytes*f;ms=i===last?M.aggRowMs:null;
      if(i===0){t='Start';p='SELECT model, sum(tokens) FROM messages GROUP BY model. The query needs two columns, but a row store keeps whole rows on each page.'}
      else if(i<last){t='Every page, every column';p='Each 8 KB page holds about 52 complete messages: id, chat, role, model, tokens, the text and the timestamp. To get the two coloured columns the engine must read all of it; the grey band is message text, most of every page.'}
      else{t='Done: the whole table read';p='Measured: '+mb(M.aggRowBytes)+' read ('+Math.round(M.aggRowBytes/8192).toLocaleString('en-US')+' pages) and '+M.aggRowMs.toFixed(0)+' ms in PostgreSQL '+M.pg+' (parallel scan). The two columns it needed are under a tenth of those bytes (a short model name and a 4-byte integer in rows of about 158 bytes).'}
    }else{
      bytes=[0,0,M.pq.model,colBytes,colBytes,colBytes][i];ms=i===last?M.aggColMs:null;
      const T=[['Start','The same query on the same million messages, stored as one Parquet file of '+mb(M.pqFile)+' (seven columns, compressed with zstd).'],
        ['Read the file footer','The footer lists where each column chunk starts and how big it is, so the engine can jump straight to the columns it needs. (A few kilobytes; not counted.)'],
        ['Read the model column',''+mb(M.pq.model)+': a million short words compress well because only four distinct values occur.'],
        ['Read the tokens column',mb(M.pq.tokens)+' of integers. The message text ('+mb(M.pq.content)+') is never touched.'],
        ['Group and sum','DuckDB adds up tokens per model, working on batches of values from each column at once.'],
        ['Done: two columns read','Measured: '+mb(colBytes)+' of column data read, '+(M.aggRowBytes/colBytes).toFixed(0)+' times fewer bytes than the row store, and '+M.aggColMs+' ms in DuckDB '+M.duck+' (median of 5 runs). Same four totals.']];
      t=T[i][0];p=T[i][1];
    }
    cnt.innerHTML=RD.stat('Bytes read',mb(bytes))+RD.stat('Columns used / read',mode==='row'?'2 / 7':(i>=3?'2 / 2':(i>=2?'1 / 1':'0')))+RD.stat('Time',ms==null?'':(ms>10?ms.toFixed(0):ms)+' ms',ms==null?'':'measured');
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
  }
  const a=RD.anim({card:'rd-col-card',ctl:'rd-col-ctl',n:ROWN,ms:1500,label:'Scan step',draw});
  RD.seg(document.getElementById('rd-col-mode'),m=>{mode=m;a.reset(m==='row'?ROWN:COLN);a.play()});
  RD.onResize(()=>a.redraw());
  note.innerHTML='<span class="meas">measured</span> on '+M.date+', Apple M1 Pro laptop: the Postgres figure is pages touched times 8 KB from EXPLAIN (ANALYZE, BUFFERS), warm; the Parquet figure is the compressed size of the two column chunks from the file\'s own metadata (uncompressed: '+mb(M.pqU.model+M.pqU.tokens)+'). The row stripes are drawn in proportion to each column\'s average uncompressed size; 8 of the 19,235 pages are drawn. Script: src/read/measure_read.py.';
})();
