// ---- Reading section 3: one query over the real 82-row-group file, without and with min/max pruning (before/after animation; its steps are the ol.sx lists beside it) ----
(function(){
  const $=id=>document.getElementById(id),R=D.full.rgs,N=R.length,FOOT=262144; // DuckDB's first read: the last 256 KiB (footer inside), measured
  const st={mode:'on',q:'day'};
  const Q={day:{label:"created_at on 2026-03-01",col:'created_at',lo:'2026-03-01 00:00:00',hi:'2026-03-02 00:00:00',
               match:r=>!(r.ca1<'2026-03-01 00:00:00'||r.ca0>='2026-03-02 00:00:00'),fb:r=>r.cab,fn:'created_at',meas:D.full.counted.day},
          chat:{label:'chat_id = 424242',col:'chat_id',match:r=>!(r.c1<424242||r.c0>424242),fb:r=>r.cb,fn:'chat_id',meas:D.full.counted.chat}};
  const NSTEPS=5,HALF=41; // five explained steps (2026-11-06): the query, the footer, row groups 0 to 40, 41 to 81, done
  const fmt=FMT.mb;
  function compute(i){ // state after step i
    const q=Q[st.q];const done=i<=1?0:i===2?HALF:N;
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
    b+=RD.t(m.l,H-12,'row group 0 (2025-09-01)',{fs:11,fill:'var(--mute)'})+RD.t(W-m.r,H-12,'row group 81 (2026-08-14)',{a:'end',fs:11,fill:'var(--mute)'});
    b+=RD.t(W-m.r,H-1,'footer at the end of the file',{a:'end',fs:11,fill:i>=1?'var(--c2)':'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Row groups read and skipped');
    $('prLeg').textContent='82 row groups of the time-sorted file; bar height: compressed bytes of '+q.fn+' plus tokens. Green: read and holds matches; orange: read, no match; grey: skipped without reading; pale blue: not reached yet.';
    $('prStats').innerHTML=RD.stat('Row groups read',c.rd+' / '+N,c.sk+' skipped')+RD.stat('Bytes read',fmt(c.by),'footer + needed chunks')+RD.stat('Rows decoded',c.rows.toLocaleString(),'every row of every row group read');
  }
  window.CHK=window.CHK||{};CHK.prune=(mode,q)=>{const o={mode:st.mode,q:st.q};st.mode=mode;st.q=q;const c=compute(NSTEPS-1);st.mode=o.mode;st.q=o.q;return c};
  const A=RD.anim({card:'prCard',ctl:'prCtl',n:NSTEPS,ms:4200,draw,label:'Pruning step',list:'sx-pr-on'});
  // the mode switch swaps the step list and replays (the one exception to stopping for good on a reader control)
  RD.seg($('prMode'),v=>{st.mode=v;$('sx-pr-on').hidden=v!=='on';$('sx-pr-off').hidden=v==='on';A.reset(NSTEPS,v==='on'?'sx-pr-on':'sx-pr-off')});
  RD.seg($('prQ'),v=>{st.q=v;A.reset(NSTEPS)});
  RD.onResize(()=>A.redraw());
})();
