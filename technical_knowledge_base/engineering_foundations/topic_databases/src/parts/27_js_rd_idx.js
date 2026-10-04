// ---- Reading tab, section 4: the same lookup by sequential scan and through a B-tree index; pages read counted (measured, RDD.M) ----
(function(){
  const card=document.getElementById('rd-idx-card');if(!card)return;
  const svgEl=document.getElementById('rd-idx-svg'),cap=document.getElementById('rd-idx-cap'),cnt=document.getElementById('rd-idx-cnt'),note=document.getElementById('rd-idx-note');
  const M=RDD.M,Q=200,per=M.heapPages/Q;
  // where chat 42000's rows sit: messages are appended in time order and the chat was active around message 420,000 of 1,000,000
  const hot=[82,83,84,85,86,87];
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  let mode='seq';
  const SEQ=9,IDX=6;
  function geo(W){const s=Math.max(7,Math.min(16,Math.floor((W-10)/40)));const cols=Math.floor((W-10)/s);return {s,cols,rows:Math.ceil(Q/cols)}}
  function draw(i){
    const W=RD.width(svgEl),g=geo(W),top=mode==='idx'?136:24,H=top+g.rows*g.s+8;
    let b='';
    const seqFrac=mode==='seq'?i/(SEQ-1):0;
    // heap pages
    b+=RD.t(4,top-8,'Table: '+fmt(M.heapPages)+' pages'+(W>480?' of 8 KB (one square is about '+Math.round(per)+' pages)':', 1 square = '+Math.round(per)),{fs:11,fill:'var(--mute)'});
    for(let q=0;q<Q;q++){const x=4+(q%g.cols)*g.s,y=top+Math.floor(q/g.cols)*g.s;
      let fill='var(--soft)';
      if(mode==='seq'&&q<Math.round(seqFrac*Q))fill='var(--c2)';
      const isHot=hot.indexOf(q)>=0;
      if(isHot&&((mode==='seq'&&q<Math.round(seqFrac*Q))||(mode==='idx'&&i>=4)))fill='var(--c3)';
      b+='<rect x="'+x+'" y="'+y+'" width="'+(g.s-1.5)+'" height="'+(g.s-1.5)+'" rx="1.5" fill="'+fill+'" stroke="'+(isHot?'var(--c3)':'var(--line)')+'" stroke-width="'+(isHot?1.2:0.6)+'"/>';}
    if(mode==='idx'){
      // a three-level B-tree: shape only
      const cx=W/2,bw=Math.min(54,W/9),bh=16;
      const L2=5,L3=Math.min(14,Math.floor((W-10)/(bw*0.62)));
      const x2=k=>W*(k+0.5)/L2-bw/2,x3=k=>(W-8)*(k+0.5)/L3-bw*0.28+4;
      const pathL2=2,pathL3=Math.round(L3*0.43);
      const on=(lvl)=>i>=lvl;
      const col=(lvl)=>on(lvl)?'var(--c2)':'var(--soft)';
      for(let k=0;k<L2;k++)b+='<line x1="'+cx+'" y1="'+(10+bh)+'" x2="'+(x2(k)+bw/2)+'" y2="44" stroke="'+(k===pathL2&&on(2)?'var(--c2)':'var(--line)')+'" stroke-width="'+(k===pathL2&&on(2)?2:1)+'"/>';
      for(let k=0;k<L3;k++)b+='<line x1="'+(x2(pathL2)+bw/2)+'" y1="'+(44+bh)+'" x2="'+(x3(k)+bw*0.28)+'" y2="80" stroke="'+(k===pathL3&&on(3)?'var(--c2)':'var(--line)')+'" stroke-width="'+(k===pathL3&&on(3)?2:0.7)+'"/>';
      b+='<rect x="'+(cx-bw/2)+'" y="10" width="'+bw+'" height="'+bh+'" rx="3" fill="'+col(1)+'" stroke="var(--mute)"/>'+RD.t(cx,22,'root',{a:'middle',fs:10});
      for(let k=0;k<L2;k++)b+='<rect x="'+x2(k)+'" y="44" width="'+bw+'" height="'+bh+'" rx="3" fill="'+(k===pathL2?col(2):'var(--soft)')+'" stroke="var(--mute)"/>';
      for(let k=0;k<L3;k++)b+='<rect x="'+x3(k)+'" y="80" width="'+(bw*0.56)+'" height="'+bh+'" rx="2" fill="'+(k===pathL3?col(3):'var(--soft)')+'" stroke="var(--mute)"/>';
      if(W>560)b+=RD.t(4,22,'B-tree on chat_id: '+(M.indexBytes/1048576).toFixed(1)+' MB',{fs:10.5,fill:'var(--mute)'})+RD.t(4,36,'(shape drawn, not measured)',{fs:10.5,fill:'var(--mute)'});
      if(i>=4){const lx=x3(pathL3)+bw*0.28;hot.forEach(q=>{const x=4+(q%g.cols)*g.s+g.s/2,y=top+Math.floor(q/g.cols)*g.s;b+='<line x1="'+lx+'" y1="96" x2="'+x+'" y2="'+y+'" stroke="var(--c3)" stroke-width="1" stroke-dasharray="3 2"/>'})}
    }
    svgEl.innerHTML=RD.svg(W,H,b,mode==='seq'?'Sequential scan reading every page of the messages table':'B-tree index lookup reading a few pages');
    // counters and caption
    let pages,rows,ms,t,p;
    if(mode==='seq'){
      pages=M.seqPages*i/(SEQ-1);rows=hot.filter(q=>q<Math.round(seqFrac*Q)).length;
      ms=M.seqMs*i/(SEQ-1);
      if(i===0){t='Start';p='Find the messages of chat 42000. With no index, the only way is to read every page and check every row.'}
      else if(i<SEQ-1){t='Reading page after page';p='Each page is read and each of its ~52 rows checked against chat_id = 42000. '+(rows?'The chat\'s rows are found about 42% of the way in, but the scan cannot stop: a matching row could be on any later page.':'Nothing matches yet.')}
      else{t='Done: every page read for 6 rows';p='Measured: '+fmt(M.seqPages)+' page reads ('+fmt(M.seqHit)+' from the buffer pool, '+fmt(M.seqRead)+' from the operating system) and '+M.seqMs.toFixed(0)+' ms, using three CPU cores in parallel. The cost grows with the table, not with the answer.'}
    }else{
      const pg=[0,1,2,3,3+M.chatHeapPages,M.idxPages];pages=pg[i];rows=i>=4?M.chatRows:0;ms=i===IDX-1?M.idxMs:null;
      const T=[['Start','The same question, with an index on chat_id. The search starts at the root page of the B-tree.'],
        ['Root page','The root holds a few hundred sorted keys, each pointing to a page one level down. One comparison pass picks the branch that covers 42000.'],
        ['Inner page','One level down, the same again: the range narrows to one leaf page.'],
        ['Leaf page','The leaf lists every chat_id in its range with the exact location of each row: 6 entries for chat 42000.'],
        ['Table pages','Fetch the 6 table pages holding those rows (measured: the chat\'s 6 rows sit on 6 different pages). Nothing else in the table is touched.'],
        ['Done: a few pages for 6 rows','Measured: '+M.idxPages+' page reads in total and '+M.idxMs+' ms, against '+fmt(M.seqPages)+' pages and '+M.seqMs.toFixed(0)+' ms. Postgres counts '+M.idxPages+' rather than the 9 drawn because it also counts its bookkeeping pages and a page each time it revisits one. The cost now grows with the answer, not with the table.']];
      t=T[i][0];p=T[i][1];
    }
    cnt.innerHTML=RD.stat('Pages read',fmt(pages))+RD.stat('Rows found',rows)+RD.stat('Time',ms==null?'':(ms<1?ms.toFixed(3):ms.toFixed(0))+' ms',mode==='seq'&&i<SEQ-1?'pro rata':(ms!=null?'measured':''));
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
  }
  const a=RD.anim({card:'rd-idx-card',ctl:'rd-idx-ctl',n:SEQ,ms:1300,label:'Lookup step',draw});
  RD.seg(document.getElementById('rd-idx-mode'),m=>{mode=m;a.reset(m==='seq'?SEQ:IDX);a.play()});
  RD.onResize(()=>a.redraw());
  note.innerHTML='<span class="meas">measured</span> on '+M.date+': PostgreSQL '+M.pg+', '+fmt(M.rows)+' messages over 100,000 chats, Apple M1 Pro laptop, default settings, each query run warm (third run) with EXPLAIN (ANALYZE, BUFFERS); script src/read/measure_read.py. The tree\'s shape and the square positions are drawn, not measured.';
})();
