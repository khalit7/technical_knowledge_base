// ---- Reading tab: static figures drawn at the measured width (hero, SSI pivot, snapshot visibility, lock queue, deadlock, outbox, long transaction) ----
// Values are the recorded ones (src/inputs/*.json, via TXD) or labels; nothing moves until the reader acts.
window.TXF=(function(){
  const esc=RD.esc;
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11.5)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+(o.mono?' font-family="ui-monospace,Menlo,Consolas,monospace"':'')+'>'+esc(s)+'</text>'};
  const R=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="'+(o.rx===undefined?5:o.rx)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+'/>'};
  let mk=0;
  // an arrow from (x1,y1) to (x2,y2); optional curve offset c (perpendicular bulge)
  function A(x1,y1,x2,y2,o){o=o||{};const id='txm'+(++mk),col=o.col||'var(--mute)';
    let d;if(o.c){const mx=(x1+x2)/2,my=(y1+y2)/2,dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1;d='M'+x1+' '+y1+' Q'+(mx-dy/L*o.c).toFixed(1)+' '+(my+dx/L*o.c).toFixed(1)+' '+x2+' '+y2}
    else d='M'+x1+' '+y1+' L'+x2+' '+y2;
    return '<defs><marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="'+col+'"/></marker></defs>'+
      '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+(o.sw||1.5)+'"'+(o.dash?' stroke-dasharray="5 4"':'')+' marker-end="url(#'+id+')"/>'};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  // horizontal bars, label on its own line above each bar (wraps nothing, fits any width)
  // groups: [{title, rows:[{label, v, col, txt, hl}]}], opts {max}
  function hbars(el,groups,opts){opts=opts||{};const w=RD.width(el);const vw=58;
    const gmax=opts.max||Math.max(1e-9,...groups.flatMap(g=>g.rows.map(r=>r.v)));
    let y=4,b='';
    groups.forEach(g=>{const mx=opts.perGroup?Math.max(1e-9,...g.rows.map(r=>r.v)):gmax;if(g.title){b+=T(0,y+12,g.title,{w:600,fill:'var(--mute)',fs:11.5});y+=20}
      const wide=w>=640,lw=wide?Math.min(w*0.45,12+6.4*Math.max(...g.rows.map(r=>r.label.length))):0;
      g.rows.forEach(r=>{b+=T(0,y+12,r.label,{fs:11.5,w:r.hl?600:400});if(!wide)y+=16;else y+=2;
        const tw=w-vw-4-lw,bw=Math.max(2,tw*r.v/mx);b+=R(lw,y,tw,12,{fill:'var(--soft)',stroke:'none',rx:3})+R(lw,y,bw,12,{fill:r.col,stroke:'none',rx:3})+T(w,y+10.5,r.txt,{a:'end',fs:11.5,w:600});y+=wide?18:20});
      y+=4});
    el.innerHTML=svg(w,y,b,opts.label);
  }
  // a two-lane session diagram: spec {n, A:[[s,e,text,kind]], B:[...], res, good}; kind: '' normal, h highlight, w wait, e error
  function lanes(el,spec){const w=Math.max(260,RD.width(el)),lx=20,top=4,lh=26,gap=8,sw=(w-lx)/spec.n;let b='';
    ['A','B'].forEach((s,j)=>{const y=top+j*(lh+gap);b+=T(0,y+17,s,{w:600,fill:'var(--mute)'});
      b+='<line x1="'+lx+'" y1="'+(y+lh/2)+'" x2="'+w+'" y2="'+(y+lh/2)+'" stroke="var(--line)"/>';
      spec[s].forEach(([s0,e0,t,k])=>{const x=lx+s0*sw+2,bw=(e0-s0)*sw-4;
        const st=k==='h'?{fill:'var(--acc2)',stroke:'var(--acc)',sw:1.5}:k==='w'?{fill:'var(--bg)',stroke:'var(--bad)',dash:1}:k==='e'?{fill:'var(--bg)',stroke:'var(--bad)',sw:1.5}:{fill:'var(--soft)',stroke:'var(--line)'};
        b+=R(x,y,bw,lh,st)+T(x+bw/2,y+17,t,{a:'middle',fs:11.5,fill:k==='e'||k==='w'?'var(--bad)':undefined,w:k==='h'||k==='e'?600:400})})});
    const y2=top+2*(lh+gap);
    b+=A(lx,y2+4,Math.min(w-4,lx+90),y2+4,{sw:1})+T(lx+96,y2+8,'time',{fill:'var(--mute)',fs:11});
    b+=T(w,y2+8,spec.res,{a:'end',w:600,fill:spec.good?'var(--good)':'var(--bad)',fs:11.5});
    el.innerHTML=svg(w,y2+14,b,spec.label);
  }
  return {T,R,A,svg,hbars,lanes};
})();
// ---- the hero: the lost update and its three fixes, from the recorded runs ----
(function(){
  const box=document.getElementById('tx-hero');if(!box)return;
  const P=[
    {t:'The collision: read, compute in Python, write back',n:6,A:[[0,1,'read 30'],[2,3,'set 20'],[3,4,'commit']],B:[[1,2,'read 30'],[4,5,'set 25','h'],[5,6,'commit']],res:'25: A’s 10 lost',good:0},
    {t:'Fix 1: fold the check into one UPDATE (balance - 5)',n:6,A:[[0,2,'-10 → 20'],[2,3,'commit']],B:[[1,3,'-5 waits','w'],[3,5,'-5 → 15','h'],[5,6,'commit']],res:'15: B waited briefly',good:1},
    {t:'Fix 2: lock what you read (SELECT ... FOR UPDATE)',n:7,A:[[0,2,'lock, read 30'],[2,3,'set 20'],[3,4,'commit']],B:[[1,4,'waits for A','w'],[4,5,'read 20'],[5,6,'set 15','h'],[6,7,'commit']],res:'15: B waited for A',good:1},
    {t:'Fix 3: serializable refuses B, the app retries',n:7,A:[[0,1,'read 30'],[2,3,'set 20'],[3,4,'commit']],B:[[1,2,'read 30'],[4,5,'40001','e'],[5,6,'read 20'],[6,7,'set 15','h']],res:'15: B ran twice',good:1}];
  box.innerHTML=P.map((p,i)=>'<div><div class="pt">'+RD.esc(p.t)+'</div><div class="svgw" id="tx-hero-'+i+'"></div></div>').join('');
  const draw=()=>P.forEach((p,i)=>TXF.lanes(document.getElementById('tx-hero-'+i),Object.assign({label:p.t},p)));
  draw();RD.onRender(draw);RD.onResize(draw);
})();
// ---- section 4: SSI's dangerous structure on the read-only anomaly ----
(function(){
  const el=document.getElementById('tx-ssi');if(!el)return;
  function draw(){const w=Math.max(280,RD.width(el)),{T,R,A,svg}=TXF;
    const nw=Math.min(140,(w-80)/3),nh=44,y=18,gapx=(w-3*nw)/2;
    const xs=[0,nw+gapx,2*(nw+gapx)];
    const N=w<470?[['C report','read-only'],['A purchase','pivot'],['B close','batch 1']]:[['C','report (read-only)'],['A','purchase: pivot'],['B','close batch 1']];
    let b='';
    N.forEach(([k,s],i)=>{const pv=i===1;b+=R(xs[i],y,nw,nh,pv?{fill:'var(--acc2)',stroke:'var(--acc)',sw:2}:{})+T(xs[i]+nw/2,y+18,k,{a:'middle',w:600,fs:12.5})+T(xs[i]+nw/2,y+34,s,{a:'middle',fs:11.5,fill:pv?'var(--acc)':'var(--mute)',w:pv?600:400})});
    b+=A(xs[0]+nw,y+nh/2,xs[1]-2,y+nh/2,{col:'var(--bad)',sw:2})+T((xs[0]+nw+xs[1])/2,y+nh/2-6,'rw',{a:'middle',fill:'var(--bad)',w:600});
    b+=A(xs[1]+nw,y+nh/2,xs[2]-2,y+nh/2,{col:'var(--bad)',sw:2})+T((xs[1]+nw+xs[2])/2,y+nh/2-6,'rw',{a:'middle',fill:'var(--bad)',w:600});
    b+=A(xs[2]+nw/2,y+nh+2,xs[0]+nw/2,y+nh+2,{c:-34,col:'var(--mute)'})+T(w/2,y+nh+40,'wr: C saw B’s close',{a:'middle',fill:'var(--mute)'});
    b+=T(w/2,y+nh+58,'C before A before B before C: a cycle, so Postgres aborts the pivot A (40001)',{a:'middle',fs:11.5,w:600,fill:'var(--ink)'});
    el.innerHTML=svg(w,y+nh+66,b,'Dependency cycle C to A to B to C with A as the pivot');
    // the last line is too long at phone width: shorten it
    if(w<470){el.innerHTML=svg(w,y+nh+66,b.replace('C before A before B before C: a cycle, so Postgres aborts the pivot A (40001)','A cycle: Postgres aborts the pivot A (40001)'),'Dependency cycle C to A to B to C with A as the pivot')}
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
// ---- section 5: which versions B's snapshot sees (serializable run of TXD.mvcc) ----
(function(){
  const el=document.getElementById('tx-snap');if(!el)return;
  const run=TXD.mvcc.runs.serializable,st=run.steps;
  const snap=(st[3].f.find(z=>z.snap)||{}).snap||'744:744:';const sx=+snap.split(':')[0],sX=+snap.split(':')[1];
  const page=st[5].page;
  function draw(){const w=Math.max(280,RD.width(el)),{T,R,A,svg}=TXF;
    const lo=sx-3,hi=sx+3,ax0=10,ax1=w-10,X=v=>ax0+(v-lo+0.5)*(ax1-ax0)/(hi-lo+1);
    let b='';const ay=34;
    b+=R(ax0,ay-14,X(sX)-ax0-((ax1-ax0)/(hi-lo+1))/2,28,{fill:'var(--open2)',stroke:'none',rx:4});
    b+=R(X(sX)-((ax1-ax0)/(hi-lo+1))/2,ay-14,ax1-X(sX)+((ax1-ax0)/(hi-lo+1))/2,28,{fill:'var(--soft)',stroke:'var(--line)',dash:1,rx:4});
    for(let v=lo;v<=hi;v++)b+=T(X(v),ay+5,String(v),{a:'middle',fs:11.5,w:v===sX?600:400});
    const short=w<520;
    b+=T(ax0+2,ay-19,short?'finished before the snapshot':'finished before B’s snapshot (visible if committed)',{fs:11,fill:'var(--good)',w:600});
    b+=T(ax1-2,ay-19,short?'not started: invisible':'not started yet: invisible to B',{a:'end',fs:11,fill:'var(--mute)',w:600});
    // the two versions
    const vs=page.map(t=>({bal:t.balance,xmin:t.xmin,xmax:t.xmax}));
    const cols=short?1:2,bw=short?w-20:(w-30)/2,bh=62;let y0=ay+34;
    vs.forEach((v,i)=>{const cx=short?10:10+i*(bw+10),cy=short?y0+i*(bh+10):y0;
      const vis=v.xmin<sx&&!(v.xmax&&v.xmax<sx);
      b+=R(cx,cy,bw,bh,vis?{fill:'var(--bg)',stroke:'var(--good)',sw:2}:{fill:'var(--bg)',stroke:'var(--line)',dash:1});
      b+=T(cx+8,cy+16,'balance '+v.bal,{w:600,fs:12.5});
      b+=T(cx+bw-8,cy+16,vis?'B sees it':'hidden from B',{a:'end',w:600,fs:11.5,fill:vis?'var(--good)':'var(--mute)'});
      b+=T(cx+8,cy+34,'xmin '+v.xmin+(v.xmin<sx?': creator in the past, committed':': creator in B’s future'),{fs:11.5});
      b+=T(cx+8,cy+51,'xmax '+(v.xmax||0)+(v.xmax?(v.xmax<sx?': deleter in the past':': deleter in B’s future, still alive'):': never replaced'),{fs:11.5});
      if(!short)b+=A(cx+40,cy-2,X(v.xmin),ay+10,{sw:1,col:'var(--mute)',dash:1});
    });
    const h=short?y0+vs.length*(bh+10):y0+bh+6;
    el.innerHTML=svg(w,h,b,'Snapshot '+snap+' on the transaction id axis and the two row versions');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
// ---- section 6: the lock queue ----
(function(){
  const el=document.getElementById('tx-lq');if(!el)return;
  function draw(){const w=Math.max(280,RD.width(el)),{T,R,A,svg}=TXF;const bw=Math.min(w,560),x=0,bh=40,g=30;
    const rows=[['A: SELECT count(*), transaction left open','holds ACCESS SHARE','var(--good)',''],
      ['B: ALTER TABLE messages ADD COLUMN','wants ACCESS EXCLUSIVE: waits for A','var(--bad)','w'],
      ['C: SELECT ... WHERE user_id = 7','wants ACCESS SHARE: waits behind B','var(--bad)','w']];
    let b=T(0,13,'Lock on table messages',{w:600,fill:'var(--mute)'}),y=22;
    rows.forEach(([q,s,c,k],i)=>{b+=R(x,y,bw,bh,k?{fill:'var(--bg)',stroke:'var(--bad)',dash:1}:{fill:'var(--open2)',stroke:'var(--good)'})+
      T(x+8,y+16,q,{fs:11.5,mono:1})+T(x+8,y+32,(i?'queued: ':'granted: ')+s,{fs:11.5,fill:c,w:600});
      if(i)b+=A(x+bw-30,y-1,x+bw-30,y-g+1,{col:'var(--bad)'})+T(x+bw-38,y-g/2+4,'waits for',{a:'end',fs:11,fill:'var(--bad)'});
      y+=bh+g});
    el.innerHTML=svg(w,y-g+4,b,'Lock queue: A granted, B waiting for A, C waiting behind B');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
// ---- section 7: the wait-for graph, opposite order against the same order ----
(function(){
  const el=document.getElementById('tx-dl');if(!el)return;
  function panel(x,w,title,cyc,{T,R,A}){let b=T(x,13,title,{w:600,fill:cyc?'var(--bad)':'var(--good)'});
    const nw=Math.min(120,w*0.36),nh=40,y=40,xa=x,xb=x+w-nw;
    b+=R(xa,y,nw,nh,{})+T(xa+nw/2,y+16,'A',{a:'middle',w:600})+T(xa+nw/2,y+32,cyc?'holds row 7':'holds 7 and 12',{a:'middle',fs:11});
    b+=R(xb,y,nw,nh,{})+T(xb+nw/2,y+16,'B',{a:'middle',w:600})+T(xb+nw/2,y+32,cyc?'holds row 12':'holds nothing',{a:'middle',fs:11});
    if(cyc){b+=A(xa+nw,y+10,xb,y+10,{c:-14,col:'var(--bad)'})+T(x+w/2,y-8,'A waits for 12',{a:'middle',fs:11,fill:'var(--bad)'});
      b+=A(xb,y+nh-10,xa+nw,y+nh-10,{c:-14,col:'var(--bad)'})+T(x+w/2,y+nh+22,'B waits for 7',{a:'middle',fs:11,fill:'var(--bad)'});
      b+=T(x+w/2,y+nh+40,'cycle: B killed after 1 s (40P01)',{a:'middle',fs:11.5,w:600})}
    else{b+=A(xb,y+nh/2,xa+nw,y+nh/2,{col:'var(--mute)'})+T(x+w/2,y+nh/2-6,'B waits for 7',{a:'middle',fs:11,fill:'var(--mute)'});
      b+=T(x+w/2,y+nh+40,'no cycle: B runs after A commits',{a:'middle',fs:11.5,w:600})}
    return b}
  function draw(){const w=Math.max(280,RD.width(el)),F=TXF;
    if(w>=600){const pw=(w-30)/2;el.innerHTML=F.svg(w,130,panel(0,pw,'Opposite order',1,F)+panel(pw+30,pw,'Same order, lowest id first',0,F),'Deadlock wait-for graphs')}
    else{el.innerHTML=F.svg(w,265,panel(0,w,'Opposite order',1,F)+'<g transform="translate(0,135)">'+panel(0,w,'Same order, lowest id first',0,F)+'</g>','Deadlock wait-for graphs')}
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
// ---- section 11: the transactional outbox ----
(function(){
  const el=document.getElementById('tx-outbox');if(!el)return;
  function draw(){const w=Math.max(280,RD.width(el)),{T,R,A,svg}=TXF;let b='';
    const tx=['UPDATE credits ... - 10','INSERT INTO messages ...','INSERT INTO outbox (event)'];
    const relay=['SELECT ... FROM outbox','FOR UPDATE SKIP LOCKED','publish, then mark sent'];
    const q=['queue','consumers must be','idempotent (at least once)'];
    const boxes=[['One transaction: BEGIN ... COMMIT',tx,'var(--acc)'],['Relay process',relay,'var(--line)'],['Queue',q,'var(--line)']];
    if(w>=640){const bw=(w-60)/3,bh=86;boxes.forEach(([h,ls,c],i)=>{const x=i*(bw+30);b+=R(x,4,bw,bh,{fill:i?'var(--soft)':'var(--acc2)',stroke:c,sw:i?1:1.5})+T(x+8,20,h,{w:600,fs:11.5});
        ls.forEach((l,j)=>b+=T(x+8,40+j*16,l,{fs:11.5,mono:i<2}));if(i)b+=A(x-28,4+bh/2,x-2,4+bh/2,{col:'var(--mute)'})});
      el.innerHTML=svg(w,bh+10,b,'Outbox: one transaction, a relay, a queue')}
    else{const bh=80,g=26;let y=4;boxes.forEach(([h,ls,c],i)=>{b+=R(0,y,w,bh,{fill:i?'var(--soft)':'var(--acc2)',stroke:c,sw:i?1:1.5})+T(8,y+16,h,{w:600,fs:11.5});
        ls.forEach((l,j)=>b+=T(8,y+34+j*15,l,{fs:11.5,mono:i<2}));if(i)b+=A(w/2,y-g+1,w/2,y-1,{col:'var(--mute)'});y+=bh+g});
      el.innerHTML=svg(w,y-g+4,b,'Outbox: one transaction, a relay, a queue')}
  }
  draw();RD.onRender(draw);RD.onResize(draw);
})();
// ---- section 10: what one idle transaction did to the table (TXD.extras.long_tx) ----
(function(){
  const el=document.getElementById('tx-long');if(!el)return;const L=TXD.extras.long_tx,f=n=>Number(n).toLocaleString('en-US');
  const draw=()=>TXF.hbars(el,[
    {title:'Table size after 20,000 updates (8 KB pages)',rows:[{label:'nothing held open',v:L.control.size/8192,col:'var(--good)',txt:f(L.control.size/8192)},{label:'one idle transaction open',v:L.size_held/8192,col:'var(--bad)',txt:f(Math.round(L.size_held/8192)),hl:1}]},
    {title:'Reading Ines’s one row, median µs',rows:[{label:'nothing held open',v:L.control.lat_us,col:'var(--good)',txt:String(Math.round(L.control.lat_us))},{label:'one idle transaction open',v:L.lat_held_us,col:'var(--bad)',txt:String(Math.round(L.lat_held_us)),hl:1},{label:'after it ended and VACUUM ran',v:L.lat_after_us,col:'var(--c1)',txt:String(Math.round(L.lat_after_us))}]}],{perGroup:1,label:'Table pages and read latency with and without an idle transaction'});
  draw();RD.onRender(draw);RD.onResize(draw);
})();
