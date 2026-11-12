// ---- Reading: static SVG figures drawn at the measured width (the hero is now the 3D Fig. 1, 41_js_sc_call.js): dynamic-shape grid (4), partitioner trade-off (5), compile-time phase bars (9, 10) ----
(function(){
  const {$,esc}=TU,D=TCP;if(!$('t-read'))return;
  const T=RD.t;
  // ---------- dynamic shapes grid ----------
  const DS=[['default','default (automatic dynamic)','default'],['static','dynamic=False','dynamic=False'],['dynamic_true','dynamic=True','dynamic=True'],['mark_dynamic','mark_dynamic(min=2, max=64)','mark_dynamic'],['mark_unbacked','mark_unbacked','mark_unbacked']];
  function dyn(){
    const el=$('tcp-dyn-grid');if(!el)return;const w=Math.min(RD.width(el),760),nar=w<520;
    const lw=nar?92:190,rw=nar?44:70,cols=6,cw=Math.min(54,(w-lw-rw)/cols),cs=Math.min(30,cw-8),rh=cs+12,top=30;let s='';
    const calls=D.dyn.strat.default.calls;
    calls.forEach((c,j)=>{const x=lw+j*cw+cw/2;s+=T(x,12,(nar?'':'call '+(j+1)+' ')+'',{a:'middle',fs:10.5,fill:'var(--mute)'});s+=T(x,top-6,'T='+c.T,{a:'middle',fs:11,w:600})});
    s+=T(lw+cols*cw+rw/2,top-6,nar?'total':'compiles',{a:'middle',fs:11,w:600});
    DS.forEach(([k,lab,sh],i)=>{const S=D.dyn.strat[k],y=top+i*rh;
      s+=T(0,y+cs/2+4,esc(nar?sh:lab),{fs:11.5,w:k==='default'?600:400});
      S.calls.forEach((c,j)=>{const x=lw+j*cw+(cw-cs)/2;
        if(c.error)s+='<rect x="'+x+'" y="'+y+'" width="'+cs+'" height="'+cs+'" rx="4" fill="var(--bad)"/>'+T(x+cs/2,y+cs/2+4,'err',{a:'middle',fs:10.5,fill:'var(--bg)',w:600});
        else if(c.compiled)s+='<rect x="'+x+'" y="'+y+'" width="'+cs+'" height="'+cs+'" rx="4" fill="var(--acc)"/>'+(c.compiled>1?T(x+cs/2,y+cs/2+4,'x'+c.compiled,{a:'middle',fs:11,fill:'var(--bg)',w:600}):'');
        else s+='<rect x="'+(x+0.7)+'" y="'+(y+0.7)+'" width="'+(cs-1.4)+'" height="'+(cs-1.4)+'" rx="4" fill="none" stroke="var(--mute)" stroke-width="1.2"/>'});
      s+=T(lw+cols*cw+rw/2,y+cs/2+5,String(S.calls[S.calls.length-1].total),{a:'middle',fs:14,w:600,fill:'var(--acc)'})});
    const y=top+DS.length*rh+6;
    s+='<rect x="0" y="'+y+'" width="11" height="11" rx="2" fill="var(--acc)"/>'+T(16,y+10,'compiled',{fs:11});
    s+='<rect x="82" y="'+y+'" width="11" height="11" rx="2" fill="none" stroke="var(--mute)"/>'+T(98,y+10,'reused',{fs:11});
    s+='<rect x="152" y="'+y+'" width="11" height="11" rx="2" fill="var(--bad)"/>'+T(168,y+10,'error',{fs:11});
    el.innerHTML=RD.svg(w,y+16,s,'Compiles per call for six sequence lengths under five dynamic-shape strategies');
  }
  // ---------- partitioner trade-off ----------
  const PK=[['default','default_partition'],['mincut_1.0','min-cut, budget 1.0'],['mincut_0.5','budget 0.5'],['mincut_0.2','budget 0.2'],['mincut_0.0','budget 0.0']];
  function part(){
    const el=$('tcp-part-svg');if(!el)return;const w=Math.min(RD.width(el),760),nar=w<520,B=D.aot.block;
    const L=46,R=nar?14:24,Tp=14,H=nar?220:240,Bt=40,pw=w-L-R,ph=H-Tp-Bt;
    const xmax=9,ymin=80,ymax=140,X=v=>L+pw*v/xmax,Y=v=>Tp+ph*(1-(v-ymin)/(ymax-ymin));let s='';
    for(let v=0;v<=xmax;v+=nar?3:1){s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+Tp+'" y2="'+(Tp+ph)+'" stroke="var(--line)"/>'+T(X(v),Tp+ph+14,String(v),{a:'middle',fs:11,fill:'var(--mute)'})}
    for(let v=ymin;v<=ymax;v+=20){s+='<line x1="'+L+'" x2="'+(L+pw)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(L-6,Y(v)+4,String(v),{a:'end',fs:11,fill:'var(--mute)'})}
    s+=T(L+pw/2,H-6,'activation bytes kept for backward (MB)',{a:'middle',fs:11,fill:'var(--mute)'});
    s+='<text x="12" y="'+(Tp+ph/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+(Tp+ph/2)+')">backward ops</text>';
    const pts=PK.map(([k])=>[X(B[k].saved_bytes_activations/1e6),Y(B[k].bw_ops)]);
    s+='<polyline points="'+pts.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' ')+'" fill="none" stroke="var(--acc)" stroke-width="1.5" stroke-dasharray="4 3"/>';
    PK.forEach(([k,n],i)=>{const [x,y]=pts[i],m=B[k].saved_bytes_activations/1e6;
      s+='<circle cx="'+x+'" cy="'+y+'" r="5.5" fill="'+(i?'var(--c3)':'var(--c2)')+'" stroke="var(--bg)" stroke-width="1.5"/>';
      const lab=esc(n)+': '+m.toFixed(2)+' MB, '+B[k].bw_ops+' ops';
      const right=x<L+pw*0.55, dy=k==='mincut_0.2'||k==='mincut_1.0'||k==='default'?16:-9;
      s+=T(right?x+9:x-9,y+dy,nar?esc(n.replace('min-cut, ','')):lab,{a:right?'start':'end',fs:11,fill:'var(--ink)'})});
    el.innerHTML=RD.svg(w,H,s,'Bytes saved for backward against backward ops for five partitioner settings on one block');
    $('tcp-part-note').textContent='One block, training, (8, 64, 256), CPU, torch 2.14.1 (exp/aot.py). Bytes of activations kept for backward; parameters and the block input are excluded (kept anyway). Recomputed ops per cut: '+PK.map(([k,n])=>n+' '+B[k].recomputed.length).join(', ')+'.';
  }
  // ---------- compile-time phase bars ----------
  const C=D.ct;
  const pickRun=k=>{const R=C[k].runs,m=C[k].med;return R.reduce((a,b)=>Math.abs(b.first-m)<Math.abs(a.first-m)?b:a)};
  const phases=r=>{const t=r.ts,efc=t.entire_frame_compile||0,bc=t.backend_compile||0,ebc=t.entire_backward_compile||0;
    return [[efc-bc,'var(--c1)'],[bc,'var(--c2)'],[ebc,'var(--c4)'],[Math.max(0,r.first-efc-ebc),'var(--dim)']]};
  function pbars(id,rows){
    const el=$(id);if(!el)return;const w=Math.min(RD.width(el),780),nar=w<520;
    const lw=nar?104:178,vw=48,bw=w-lw-vw,rh=nar?30:26,top=4,max=11;let s='';
    for(let v=0;v<=max;v+=nar?2:1){const x=lw+bw*v/max;s+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+(top+rows.length*rh)+'" stroke="var(--line)"/>'+T(x,top+rows.length*rh+13,v+' s',{a:'middle',fs:10.5,fill:'var(--mute)'})}
    rows.forEach(([k,n,ns],i)=>{const r=pickRun(k),y=top+i*rh;let x=lw;
      s+=T(0,y+rh/2+4,esc(nar?ns:n),{fs:11.5});
      phases(r).forEach(([d,c])=>{const ww=bw*d/max;if(ww>0.3)s+='<rect x="'+x.toFixed(1)+'" y="'+(y+5)+'" width="'+ww.toFixed(1)+'" height="'+(rh-10)+'" fill="'+c+'"/>';x+=ww});
      s+=T(lw+bw*r.first/max+5,y+rh/2+4,r.first.toFixed(2)+' s',{fs:11,w:600})});
    el.innerHTML=RD.svg(w,top+rows.length*rh+18,s,'First training step split into compile phases');
  }
  const loads=ks=>{const L=ks.flatMap(k=>C[k].runs.map(r=>r.load));return Math.min(...L).toFixed(1)+' to '+Math.max(...L).toFixed(1)};
  function reg(){const R=[['cold_whole_4','Whole model, 4 blocks','Whole, 4'],['cold_regional_4','Per block, 4 blocks','Per block, 4'],['cold_nested_4','Nested region, 4 blocks','Nested, 4'],['cold_whole_8','Whole model, 8 blocks','Whole, 8'],['cold_regional_8','Per block, 8 blocks','Per block, 8'],['cold_nested_8','Nested region, 8 blocks','Nested, 8']];
    pbars('tcp-reg-svg',R);
    if($('tcp-reg-note'))$('tcp-reg-note').textContent='The run closest to the median of 3 fresh processes, each with an empty cache directory; first step = compile + one training step. CPU, 4 threads, torch 2.14.1, bench lock, load average '+loads(R.map(r=>r[0]))+'.'}
  function cache(){const R=[['cold_whole_4_save','Cold (empty cache)','Cold'],['mega_whole_4','Mega-cache, empty dir','Mega-cache'],['warm_whole_4','Warm (same cache dir)','Warm']];
    pbars('tcp-cache-svg',R);
    if($('tcp-cache-note'))$('tcp-cache-note').textContent='Whole model, 4 blocks; colours as in section 9. Each of 3 rounds: a cold run that saved the mega-cache ('+TU.comma(C.cold_whole_4_save.runs[0].mega)+' bytes), a warm run in the same directory, a mega-cache load into a new empty directory. Cache hits (FX graph, AOTAutograd): '+R.map(([k,,ns])=>ns+' '+C[k].runs[0].hit[0]+', '+C[k].runs[0].hit[2]).join('; ')+'. CPU, bench lock.'}
  function all(){dyn();part();reg();cache()}
  RD.onRender(all);RD.onResize(all);all();
  // the per-run table (section 10, closed block)
  if($('tcpc-tbl')){const rows=[];Object.entries(C).forEach(([k,v])=>v.runs.forEach((r,j)=>{const p=phases(r);rows.push([esc(k),j+1,r.first.toFixed(2),p[0][0].toFixed(2),p[1][0].toFixed(2),p[2][0].toFixed(2),(r.ts['async_compile.wait']||0).toFixed(2),r.hit[0]+' / '+r.hit[1],r.hit[2]+' / '+r.hit[3],r.load.toFixed(1)])}));
    $('tcpc-tbl').innerHTML=TU.table(['Run','#','First step (s)','Dynamo','Forward','Backward','C++ wait','FX graph hit / miss','AOT hit / miss','Load'],rows)}
})();
