// ---- Reading section 3.1: the graph-break fixer, a widget (2026-11-12: no stepping, no autoplay; the reader picks a line and broken or fixed,
// and the lane shows the whole forward at once). Fig. 2 (42_js_sc_brk.js) animates the print case. ----
(function(){
  const {$,esc}=TU,F=TCP.fix;if(!$('tcpb-card'))return;
  const T=RD.t;let k=0,mode='b';
  const ROWS=['embeddings','block 0','block 1','block 2','block 3','ln_f, head, loss'];
  function seq(r){ // the forward as a list of segments, each on a row
    if(r.graphs===1&&r.breaks===0)return [{c:true,row:-1,ops:r.piece_ops[0],t:'whole forward compiled ('+r.piece_ops[0]+' ops)'}];
    const s=[{c:false,row:0,t:'embeddings (eager)'}];
    const per=Math.max(1,Math.round(r.pieces_per_forward/4)),ops=r.piece_ops.slice(0,per);
    for(let b=0;b<4;b++){ops.forEach((n,j)=>{s.push({c:true,row:b+1,ops:n,t:'block '+b+' piece '+(j+1)+' ('+n+' ops)'});if(j<per-1)s.push({c:false,row:b+1,brk:true,t:'block '+b+': the break line (eager)'})})}
    s.push({c:false,row:5,t:'ln_f, head, loss (eager)'});return s;
  }
  function lane(S){
    const el=$('tcpb-lane'),w=Math.min(RD.width(el),760),lw=w<520?78:110,aw=w-lw-4,rh=26,h=ROWS.length*rh+4;let s='';
    ROWS.forEach((n,j)=>{s+=T(0,j*rh+rh/2+5,n,{fs:11,fill:'var(--mute)'})});
    const op=()=>'',hl=()=>'';
    if(S.length===1&&S[0].row===-1){
      s+='<rect x="'+lw+'" y="3" width="'+aw+'" height="'+(h-6)+'" rx="6" fill="var(--open2)" stroke="var(--good)" stroke-width="1.2"/>'+T(lw+aw/2,h/2+4,esc(S[0].t),{a:'middle',fs:12,w:600});
    }else{
      ROWS.forEach((_,row)=>{const segs=S.map((x,j)=>({...x,j})).filter(x=>x.row===row);if(!segs.length)return;
        const bw=28,tot=segs.reduce((a,x)=>a+(x.c?x.ops:0),0),free=aw-segs.filter(x=>!x.c).length*bw-(segs.length-1)*3;let x=lw;
        segs.forEach(sg=>{const ww=sg.c?free*sg.ops/tot:(segs.length===1?aw:bw),y=row*rh+3,hh=rh-6;
          if(sg.c)s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+ww.toFixed(1)+'" height="'+hh+'" rx="4" fill="var(--open2)" stroke="var(--good)"'+hl(sg.j)+op(sg.j)+'/>'+(ww>44?T(x+ww/2,y+hh/2+4,sg.ops+' ops',{a:'middle',fs:11}):'');
          else s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+ww.toFixed(1)+'" height="'+hh+'" rx="4" fill="var(--bg)" stroke="var(--mute)" stroke-dasharray="4 3"'+hl(sg.j)+op(sg.j)+'/>'+(segs.length===1?T(x+ww/2,y+hh/2+4,'Python, eager',{a:'middle',fs:11,fill:'var(--mute)'}):T(x+ww/2,y+hh/2+4,'py',{a:'middle',fs:10.5,fill:'var(--bad)'}));
          x+=ww+3})});
    }
    el.innerHTML=RD.svg(w,h,s,'One forward pass: compiled pieces and eager segments per block');
  }
  function draw(){const K=F[k],r=mode==='b'?K.b:K.f,S=seq(r);
    lane(S);
    $('tcpb-cnt').innerHTML=TU.stat('Compiled piece calls per forward',S.filter(x=>x.c).length)+TU.stat('Eager segments per forward',S.filter(x=>!x.c).length)+TU.stat('explain(): graphs / breaks',r.graphs+' / '+r.breaks)+TU.stat('Compiled pieces that exist',r.piece_ops.length,'ops: '+r.piece_ops.join(', '))+TU.stat('Max diff vs original',mode==='f'?r.max_diff_vs_original.toExponential(1):'(broken run)');
  }
  function pick(j){k=+j;const K=F[k];
    $('tcpb-src-b').textContent=K.src_b.replace(/^def \w+/,'def forward');$('tcpb-src-f').textContent=K.src_f.replace(/^def \w+/,'def forward').replace(/^@[\s\S]*?\ndef /,'def ');
    $('tcpb-how').textContent='('+K.how+')';$('tcpb-reason').textContent=K.b.reason;$('tcpb-full').textContent=K.b.fullgraph_error||'no error: one graph was captured';
    draw()}
  TU.seg($('tcpb-kind'),F.map((K,j)=>[String(j),esc(K.label)]),pick,'0');
  RD.onRender(draw);RD.onResize(draw);
  RD.seg($('tcpb-mode'),m=>{mode=m;draw()});
})();
