// ---- Reading, top: the hero figure. One insert through a B-tree engine and an LSM engine (static, labels on the figure) ----
(function(){
  const el=document.getElementById('rd-hero');if(!el)return;
  const T=RD.t,A='var(--acc)',L='var(--line)',M='var(--mute)',S='var(--soft)';
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+h+'" rx="'+(o.rx==null?5:o.rx)+'" fill="'+(o.fill||S)+'" stroke="'+(o.stroke||L)+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,hot,d)=>{const c=hot?A:M;return (d?'<path d="'+d+'"':'<line x1="'+x1.toFixed(1)+'" y1="'+y1+'" x2="'+x2.toFixed(1)+'" y2="'+y2+'"')+' fill="none" stroke="'+c+'" stroke-width="'+(hot?2.6:1.6)+'" marker-end="url(#rd-hero-'+(hot?'ah':'am')+')"/>'};
  function panel(x0,y0,pw,kind){
    const g=34,gx=x0+g,iw=pw-g-4;let b='';
    b+=T(x0,y0+14,kind==='bt'?'B-tree engine (Postgres, InnoDB)':'LSM engine (RocksDB, Cassandra)',{fs:12.5,w:700});
    b+=T(x0,y0+56,'RAM',{fs:11,fill:M,w:600});b+=T(x0,y0+150,'disk',{fs:11,fill:M,w:600});
    b+='<line x1="'+x0+'" y1="'+(y0+92)+'" x2="'+(x0+pw-4)+'" y2="'+(y0+92)+'" stroke="'+L+'" stroke-dasharray="2 3"/>';
    // RAM box
    const rw=iw*0.62;b+=rect(gx,y0+30,rw,44,{dash:kind==='lsm'});
    if(kind==='bt'){b+=T(gx+6,y0+46,'buffer pool: 8 KB pages',{fs:11.5,w:600});
      for(let i=0;i<6;i++){const px=gx+8+i*16;if(px+12>gx+rw-4)break;b+=rect(px,y0+54,12,14,{rx:2,fill:i===2?A:'var(--bg)',stroke:i===2?A:L})}
      if(gx+8+6*16+4<gx+rw-60)b+=T(gx+8+6*16+4,y0+66,'2 page changed',{fs:11,fill:A})}
    else{b+=T(gx+6,y0+46,'memtable (sorted)',{fs:11.5,w:600});b+=T(gx+6,y0+66,'2 key inserted, nothing on disk read',{fs:11,fill:M})}
    // lane 1: log + flush
    const l1=gx+iw*0.84;b+=arrow(l1,y0+24,l1,y0+108,false);
    b+=T(l1,y0+22,'1 append to log',{a:'middle',fs:11,w:600});
    b+=T(l1-6,y0+104,'flush = commit',{a:'end',fs:11,fill:M});
    // WAL strip
    const wx=gx+iw*0.45,ww=iw*0.55;b+=rect(wx,y0+112,ww,22,{rx:3,fill:'var(--bg)'});
    for(let x=wx+6;x<wx+ww-4;x+=9)b+='<line x1="'+x.toFixed(1)+'" y1="'+(y0+116)+'" x2="'+x.toFixed(1)+'" y2="'+(y0+130)+'" stroke="var(--c1)" stroke-width="2"/>';
    b+=T(wx-6,y0+127,'WAL',{a:'end',fs:11,w:600});
    // lane 3: page or flush to data
    const l3=gx+rw*0.35;b+=arrow(l3,y0+76,l3,y0+158,kind==='bt');
    b+=T(l3+10,y0+148,kind==='bt'?'3 checkpoint: random page writes':'3 flush: one sequential file',{fs:11,w:600,fill:kind==='bt'?A:'var(--ink)'});
    if(kind==='bt'){b+=rect(gx,y0+160,iw,48);b+=T(gx+6,y0+180,'table and index pages,',{fs:11.5});b+=T(gx+6,y0+196,'rewritten in place',{fs:11.5});
      const tx=gx+iw*0.78,tw=iw*0.2;b+=rect(tx+tw/2-8,y0+166,16,10,{rx:2,fill:'var(--bg)'});
      for(let i=0;i<3;i++){const lx=tx+i*(tw/3);b+='<line x1="'+(tx+tw/2)+'" y1="'+(y0+176)+'" x2="'+(lx+tw/6)+'" y2="'+(y0+188)+'" stroke="'+L+'"/>';b+=rect(lx+tw/6-7,y0+188,14,10,{rx:2,fill:i===1?A:'var(--bg)',stroke:i===1?A:L})}}
    else{const F=[0.22,0.42,0.72];F.forEach((f,i)=>{const y=y0+164+i*24;b+=rect(gx,y,iw*f,13,{rx:2,fill:'var(--c2)',stroke:'none'});b+=T(gx+4,y+10.5,'L'+i,{fs:10.5,fill:'var(--bg)',w:700})});
      for(let i=0;i<2;i++){const x=gx+iw*F[i]-10,y=y0+177+i*24;b+=arrow(x,y,x,y+10,true)}
      b+=T(gx+iw*0.46,y0+186,'4 compaction merges',{fs:11,w:600,fill:A});b+=T(gx+iw*0.46,y0+200,'down, rewriting keys',{fs:11,fill:A})}
    return b}
  function draw(){const W=RD.width(el),stack=W<600,ph=232,pw=stack?W:(W-24)/2,H=stack?2*ph+14:ph;
    let b='<defs><marker id="rd-hero-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="'+A+'"/></marker><marker id="rd-hero-am" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="'+M+'"/></marker></defs>';
    b+=panel(0,0,pw,'bt');b+=stack?panel(0,ph+14,pw,'lsm'):panel(pw+24,0,pw,'lsm');
    el.innerHTML=RD.svg(W,H,b,'One insert through a B-tree engine and an LSM engine: both append to the log and flush it to commit; the B-tree later writes changed pages in place at checkpoints, the LSM flushes a sorted file and compacts it later')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
