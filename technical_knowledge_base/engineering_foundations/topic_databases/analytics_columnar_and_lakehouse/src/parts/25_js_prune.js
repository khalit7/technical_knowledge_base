// ---- Reading section 3: one query over the real 82-row-group file, without and with min/max pruning (before/after animation) ----
(function(){
  const $=id=>document.getElementById(id),R=D.full.rgs,N=R.length,FOOT=262144; // DuckDB's first read: the last 256 KiB (footer inside), measured
  const st={mode:'on',q:'day'};
  const Q={day:{label:"created_at on 2026-03-01",col:'created_at',lo:'2026-03-01 00:00:00',hi:'2026-03-02 00:00:00',
               match:r=>!(r.ca1<'2026-03-01 00:00:00'||r.ca0>='2026-03-02 00:00:00'),fb:r=>r.cab,fn:'created_at',meas:D.full.counted.day},
          chat:{label:'chat_id = 424242',col:'chat_id',match:r=>!(r.c1<424242||r.c0>424242),fb:r=>r.cb,fn:'chat_id',meas:D.full.counted.chat}};
  const BATCH=10,NB=Math.ceil(N/BATCH),NSTEPS=NB+3;
  const fmt=FMT.mb;
  function compute(i){ // state after step i
    const q=Q[st.q];let done=i<=1?0:Math.min(N,(i-1)*BATCH);if(i>=NSTEPS-1)done=N;
    let rd=0,sk=0,rows=0,by=i>=1?FOOT:0;
    for(let g=0;g<done;g++){const r=R[g];const hit=st.mode==='off'||q.match(r);if(hit){rd++;rows+=r.n;by+=q.fb(r)+r.tb}else sk++}
    return {done,rd,sk,by,rows};
  }
  function draw(i){
    const q=Q[st.q],c=compute(i),el=$('prSvg'),W=RD.width(el),H=150,m={l:6,r:6,t:18,b:30};
    m.t=6;const bw=(W-m.l-m.r)/N,mx=Math.max(...R.map(r=>Math.max(r.cab,r.cb)+r.tb));
    let b='';
    R.forEach((r,g)=>{const hgt=(q.fb(r)+r.tb)/mx*(H-m.t-m.b),x=m.l+g*bw,y=H-m.b-hgt;
      let fill='var(--acc)',op=0.3;
      if(g<c.done){const hit=st.mode==='off'||q.match(r);fill=hit?(q.match(r)?'var(--c3)':'var(--c2)'):'var(--mute)';op=hit?0.95:0.18}
      b+='<rect x="'+(x+0.5).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,bw-1).toFixed(1)+'" height="'+hgt.toFixed(1)+'" fill="'+fill+'" fill-opacity="'+op+'"><title>Row group '+g+': '+(st.q==='day'?r.ca0+' to '+r.ca1:'chat_id '+r.c0+' to '+r.c1)+'</title></rect>'});
    if(c.done>0&&c.done<N){const x=m.l+c.done*bw;b+='<line x1="'+x+'" x2="'+x+'" y1="'+m.t+'" y2="'+(H-m.b)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'}
    b+=RD.t(m.l,H-12,'row group 0 (2025-09-01)',{fs:10,fill:'var(--mute)'})+RD.t(W-m.r,H-12,'row group 81 (2026-08-14)',{a:'end',fs:10,fill:'var(--mute)'});
    b+=RD.t(W-m.r,H-1,'footer at the end of the file',{a:'end',fs:10,fill:i>=1?'var(--c2)':'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Row groups read and skipped');
    let cap;
    if(i===0)cap='<b>The query:</b> <code>SELECT count(*), sum(tokens) WHERE '+q.label+'</code> on 10,000,000 messages in one 534 MB Parquet file. Nothing read yet.';
    else if(i===1)cap='<b>Read the footer.</b> The reader fetches the end of the file (DuckDB asked for the last 256 KiB; the footer is 76,648 bytes). It now knows where every column chunk is'+(st.mode==='on'?' and each row group\'s min and max of '+q.fn+'.':'; this reader ignores the statistics.');
    else if(i<NSTEPS-1){const a=(i-2)*BATCH,z=Math.min(N,a+BATCH)-1;
      cap='<b>Row groups '+a+' to '+z+'.</b> '+(st.mode==='off'?'Without statistics every row group might hold a match, so the '+q.fn+' and tokens chunks of each are read and every value is checked.':'Each row group\'s ['+'min, max] of '+q.fn+' is compared with the filter. Grey: the range excludes the filter, skipped without reading a byte. Green: the range overlaps, so its two chunks are read.')}
    else cap='<b>Done.</b> '+(st.mode==='off'?'All 82 row groups read to find '+(st.q==='day'?'28,800':'7')+' matching rows: '+fmt(c.by)+' (computed from the footer).':'Read '+c.rd+' row group'+(c.rd===1?'':'s')+', skipped '+c.sk+': '+fmt(c.by)+' (computed). Measured with DuckDB 1.5.6 on this file: '+fmt(q.meas.bytes_read)+' in '+q.meas.reads+' reads, answer '+q.meas.rows[0].join(', ')+'.');
    $('prCap').innerHTML=cap;$('prLeg').textContent='82 row groups of the time-sorted file; bar height: compressed bytes of '+q.fn+' plus tokens. Green: read and holds matches; orange: read, no match; grey: skipped without reading; pale blue: not reached yet.';
    $('prStats').innerHTML=RD.stat('Row groups read',c.rd+' / '+N,c.sk+' skipped')+RD.stat('Bytes read',fmt(c.by),'footer + needed chunks')+RD.stat('Rows decoded',c.rows.toLocaleString(),'every row of every row group read');
  }
  window.CHK=window.CHK||{};CHK.prune=(mode,q)=>{const o={mode:st.mode,q:st.q};st.mode=mode;st.q=q;const c=compute(NSTEPS-1);st.mode=o.mode;st.q=o.q;return c};
  const A=RD.anim({card:'prCard',ctl:'prCtl',n:NSTEPS,ms:1100,draw,label:'Pruning step'});
  RD.seg($('prMode'),v=>{st.mode=v;A.reset(NSTEPS);A.play()});
  RD.seg($('prQ'),v=>{st.q=v;A.reset(NSTEPS);A.play()});
  RD.onResize(()=>A.redraw());
})();
