// ---- Section 7: what each time-series question touches, one big table against 30 daily partitions (toggle; numbers from inputs/ts.json) ----
(function(){
  const svgEl=document.getElementById('rd-tsd-svg');if(!svgEl||!window.NQ||!NQ.ts)return;
  const g=NQ.ts.pg,T=RD.t,f0=n=>Math.round(n).toLocaleString('en-US'),mb=b=>(b/1048576).toFixed(0)+' MB';
  let mode='hour';
  const CAP={
    hour:'Last hour, per minute and model: the partitioned table reads only today\'s partition ('+f0(g.last_hour.part.buffers)+' page reads, '+g.last_hour.part.ms+' ms); the big table\'s B-tree on ts is just as quick here ('+f0(g.last_hour.plain.buffers)+' pages, '+g.last_hour.plain.ms+' ms). Partitions pay off for retention and for scans of a few days.',
    chart:'30-day hourly chart: from raw rows every page is read ('+f0(g.chart_raw.buffers)+' page reads, '+f0(g.chart_raw.ms)+' ms); from the one-minute rollup table, '+f0(g.chart_rollup.buffers)+' page reads, '+g.chart_rollup.ms+' ms.',
    ret:'Delete the 7 oldest days: DROP TABLE on 7 partitions is a metadata change ('+g.retention_drop.s+' s, '+f0(g.retention_drop.wal_bytes)+' bytes of log); DELETE in the big table rewrites pages and logs every row ('+g.retention_delete.s+' s, '+mb(g.retention_delete.wal_bytes)+' of log) and the file keeps its size.'};
  function draw(){const w=RD.width(svgEl),n=30,x0=8,cw=(w-16)/n;let s='';const y1=26,y2=92,rh=26;
    s+=T(x0,16,'one big table (pages in arrival order)',{fs:11,fill:'var(--mute)'});
    s+=T(x0,y2-10,'30 daily partitions',{fs:11,fill:'var(--mute)'});
    for(let i=0;i<n;i++){const x=x0+i*cw;
      let a='var(--soft)',b='var(--soft)';
      if(mode==='hour'){if(i===n-1){a='var(--c2)';b='var(--c2)'}}
      if(mode==='chart'){a='var(--c2)';b='var(--c2)'}
      if(mode==='ret'&&i<7){a='var(--bad)';b='var(--bad)'}
      s+='<rect x="'+x.toFixed(1)+'" y="'+y1+'" width="'+Math.max(1,cw).toFixed(1)+'" height="'+rh+'" fill="'+a+'"/>';
      s+='<rect x="'+(x+1).toFixed(1)+'" y="'+y2+'" width="'+Math.max(1,cw-2).toFixed(1)+'" height="'+rh+'" rx="2" fill="'+b+'" stroke="var(--line)"/>'}
    s+='<rect x="'+x0+'" y="'+y1+'" width="'+(w-16).toFixed(1)+'" height="'+rh+'" fill="none" stroke="var(--line)"/>';
    let y=y2+rh+18;
    if(mode==='chart'){s+=T(x0,y,'rollup table: '+f0(g.rollup_rows)+' rows, one per minute and model',{fs:11,fill:'var(--c4)',w:600});
      s+='<rect x="'+x0+'" y="'+(y+6)+'" width="'+((w-16)*g.size.rollup/g.size.plain_heap).toFixed(1)+'" height="14" fill="var(--c4)"/>'+T(x0+(w-16)*g.size.rollup/g.size.plain_heap+6,y+18,mb(g.size.rollup)+' against '+mb(g.size.plain_heap)+' raw, to scale',{fs:10.5,fill:'var(--mute)'});y+=26}
    else s+=T(x0,y,mode==='hour'?'lit: what the last hour reads (today only)':'marked: the 7 oldest days removed',{fs:11,fill:'var(--mute)'});
    svgEl.innerHTML=RD.svg(w,y+8,s,'Pages and partitions each time-series question touches');
    document.getElementById('rd-tsd-cap').textContent=CAP[mode]}
  RD.seg(document.getElementById('rd-tsd-mode'),m=>{mode=m;draw()});
  draw();RD.onRender(draw);RD.onResize(draw);
})();
