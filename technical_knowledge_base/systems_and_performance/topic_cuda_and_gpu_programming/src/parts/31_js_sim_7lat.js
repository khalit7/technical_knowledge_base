// ---- GPU simulator: 5 latency hiding ----
(function(){
  const U=SIMU,C=SIMC,D=window.SIMD,$=U.$;
  if(!$('sim-lat-card'))return;
  const S={mode:'2',w:4,c:4,l:40,k:1};
  function par(){return S.mode==='free'?{w:S.w,c:S.c,l:S.l,k:S.k}:{w:+S.mode,c:4,l:20,k:1}}
  let P,T,R,step,SW;
  function compute(){
    P=par();const body=P.k*(P.c+1);
    T=S.mode==='free'?Math.min(480,Math.max(60,2*(body+P.l)+body*Math.min(P.w,6))):60;
    R=C.latencySim(P.w,P.c,P.l,P.k,4000,T);
    step=Math.max(1,Math.ceil(T/80));
    SW=[];for(let w=1;w<=16;w++)SW.push(C.latencySim(w,P.c,P.l,P.k,2000).util);
  }
  const fig=$('sim-lat-fig');
  const COL={L:'var(--c6)',I:'var(--c1)',w:'var(--soft)',r:'var(--c5)'};
  function draw(i){
    const upto=Math.min(T,(i+1)*step);
    const W=U.width(fig),lw=54,cw=(W-lw-4)/T,rh=Math.max(9,Math.min(16,Math.floor(150/Math.max(P.w,1)))),tr=R.trace;
    let b='';
    const idle=[];for(let t=0;t<T;t++)idle.push(!tr.some(r=>r[t]==='L'||r[t]==='I'));
    const rowsAll=[...tr.map((r,w)=>({lab:'warp '+w,s:r})),{lab:'idle',s:idle.map(x=>x?'x':'.').join('')}];
    rowsAll.forEach((row,ri)=>{
      const y=4+ri*(rh+2)+(ri===tr.length?4:0);
      b+=U.t(lw-6,y+rh*0.75,row.lab,{fs:10,a:'end',fill:ri===tr.length?'var(--bad)':'var(--mute)'});
      b+=U.rect(lw,y,cw*T,rh,'none',{st:'var(--line)',sw:.6});
      let t=0;
      while(t<upto){const ch=row.s[t];let e=t;while(e<upto&&row.s[e]===ch)e++;
        const col=ri===tr.length?(ch==='x'?'var(--bad)':null):COL[ch];
        if(col)b+=U.rect(lw+t*cw,y,(e-t)*cw-(cw>3?.6:0),rh,col,{st:ch==='w'?'var(--line)':null,sw:.5});
        t=e}
    });
    const yA=4+rowsAll.length*(rh+2)+6;
    for(let t=0;t<=T;t+=T<=80?10:50)b+=U.t(lw+t*cw,yA+10,t,{fs:9.5,a:t+(T<=80?10:50)>T?'end':'middle',fill:'var(--mute)'});
    b+=U.rect(lw+upto*cw-1,2,2,yA-4,'var(--ink)',{op:.6});
    fig.innerHTML=U.svg(W,yA+24,b+U.t(lw+cw*T/2,yA+22,'cycle',{fs:10,a:'middle',fill:'var(--mute)'}),'Warp scheduler timeline');
    let iss=0;for(let t=0;t<upto;t++)if(!idle[t])iss++;
    const body=P.k*(P.c+1);
    $('sim-lat-code').innerHTML='<span class="cm">// each of the '+P.w+' warps runs:</span>\nfor (;;) {\n    <span style="color:var(--c6);font-weight:600">'+(P.k>1?P.k+' independent loads':'one load')+'</span>          <span class="cm">// then the data arrives '+P.l+' cycles later</span>\n    <span class="ca">'+(P.k*P.c)+' instruction'+(P.k*P.c>1?'s':'')+' using it</span>\n}';
    $('sim-lat-cap').textContent=upto>=T?'Window done: the scheduler issued in '+iss+' of '+T+' cycles. Over 4,000 cycles it is busy '+U.pct(R.util)+' of the time; Little\'s law gives '+U.pct(R.model)+'.':
      'Cycle '+upto+': '+(idle[upto-1]?'no warp is eligible, the issue slot is lost.':'one warp issues; '+tr.filter(r=>r[upto-1]==='w').length+' wait on memory, '+(n=>n+(n===1?' is ready but must wait its turn.':' are ready but must wait their turn.'))(tr.filter(r=>r[upto-1]==='r').length));
    $('sim-lat-out').innerHTML=U.stat('Cycles shown',upto,'of '+T)+U.stat('Issue slots used',iss,U.pct(upto?iss/upto:0)+' so far')+U.stat('Busy over 4,000 cycles',U.pct(R.util),'simulated')+U.stat('Little\'s law',U.pct(R.model),'min(1, W k(c+1) / (k(c+1) + L))')+U.stat('Warps to hide L',Math.ceil((body+P.l)/body),'(k(c+1) + L) / k(c+1)');
    sweep();
  }
  function sweep(){
    const el=$('sim-lat-sweep'),W=U.width(el),H=170,ml=40,mr=10,mt=16,mb=30,pw=W-ml-mr,ph=H-mt-mb;
    const ws=[];for(let w=1;w<=16;w++)ws.push(w);
    const X=w=>ml+pw*(w-1)/15,Y=v=>mt+ph*(1-v);
    let b=U.t(ml,11,W<480?'Busy against warps: dots simulated, line Little\'s law':'Scheduler busy against warps (same loop): simulated dots, Little\'s law line',{fs:10.5,fill:'var(--mute)'});
    [0,.5,1].forEach(v=>{b+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+U.t(ml-4,Y(v)+3.5,100*v+'%',{fs:10,a:'end',fill:'var(--mute)'})});
    let d='';ws.forEach((w,j)=>{const body=P.k*(P.c+1);d+=(j?'L':'M')+X(w).toFixed(1)+' '+Y(Math.min(1,w*body/(body+P.l))).toFixed(1)});
    b+='<path d="'+d+'" fill="none" stroke="var(--c4)" stroke-width="1.6" stroke-dasharray="4 3"/>';
    ws.forEach(w=>{const u=SW[w-1];b+='<circle cx="'+X(w)+'" cy="'+Y(u)+'" r="'+(w===P.w?5:3)+'" fill="'+(w===P.w?'var(--bad)':'var(--c1)')+'"/>';
      if(W>=420||w%3===1)b+=U.t(X(w),H-mb+14,w,{fs:9.5,a:'middle',fill:'var(--mute)'})});
    b+=U.t(ml+pw/2,H-3,W<480?'warps on one scheduler (max 16)':'warps on one scheduler (an SM with 64 warp slots has 16 per scheduler)',{fs:10,a:'middle',fill:'var(--mute)'});
    el.innerHTML=U.svg(W,H,b,'Utilisation against warps');
  }
  compute();
  const A=U.anim({card:'sim-lat-card',ctl:'sim-lat-ctl',n:Math.ceil(T/step),draw,ms:160,label:'Cycle'});
  function update(){compute();A.reset(Math.ceil(T/step))}
  function lbl(){$('sim-lat-wv').textContent=S.w;$('sim-lat-cv').textContent=S.c;$('sim-lat-lv').textContent=S.l;$('sim-lat-kv').textContent=S.k}
  U.seg($('sim-lat-mode'),m=>{S.mode=m;$('sim-lat-free').hidden=$('sim-lat-pre').hidden=m!=='free';update();A.play()});
  [['w','sim-lat-w'],['c','sim-lat-c'],['l','sim-lat-l'],['k','sim-lat-k']].forEach(([k,id])=>$(id).addEventListener('input',e=>{S[k]=+e.target.value;lbl();update()}));
  U.seg($('sim-lat-lp'),m=>{S.l=+m;$('sim-lat-l').value=S.l;lbl();update()});
  lbl();U.onResize(()=>A.redraw());
  if(D&&D.m&&D.m.latency){
    const cs=D.m.latency.slice().sort((a,b)=>a.threads-b.threads),mx=Math.max(...cs.map(c=>c.gbps));
    const rows=cs.map(c=>'<div class="row"><span class="nm">'+c.threads.toLocaleString('en-US')+' threads</span><span class="track"><span class="fill" style="width:'+(100*c.gbps/mx)+'%;background:var(--c3)"></span></span><span class="val">'+U.fmt(c.gbps,0)+' GB/s</span></div>').join('');
    const low=cs.filter(c=>c.threads<=1024),lat=low.map(c=>c.threads*16/(c.gbps*1e9)*1e9);
    const latAvg=lat.reduce((a,b)=>a+b,0)/lat.length;
    const sat=cs.filter(c=>c.threads>=16384),satBw=sat.reduce((a,c)=>a+c.gbps,0)/sat.length;
    const kb=satBw*1e9*latAvg*1e-9/1024;
    const first=cs.find(c=>c.gbps>=0.9*satBw);
    $('sim-lat-m1kb').textContent='about '+U.fmt(kb,0)+' KB';
    $('sim-lat-meas-body').innerHTML='<p class="small" style="margin:0 0 6px">One kernel reads a 256 MB buffer with a grid-stride loop of 16-byte (float4) loads; only the number of threads launched changes. With few threads, each has one load outstanding at a time and the memory system sits idle between them.</p><div class="sim-hb">'+rows+'</div>'+
      '<p class="small" style="margin:6px 0 0">Bandwidth doubles with the number of threads up to 1,024 threads, exactly what Little\'s law predicts when latency is fixed, and levels off around '+U.fmt(satBw,0)+' GB/s from about '+first.threads.toLocaleString('en-US')+' threads (90% of the plateau). <span class="sim-tag der">DERIVED</span>Assuming one 16-byte load in flight per thread, latency = bytes in flight / bandwidth: '+low.map((c,j)=>c.threads+' x 16 B / '+U.fmt(c.gbps,1)+' GB/s = '+U.fmt(lat[j],0)+' ns').join('; ')+'. The three agree, about '+U.fmt(latAvg,0)+' ns; the assumption makes it an upper bound if the compiler overlaps loads within a thread. Saturating '+U.fmt(satBw,0)+' GB/s then needs about '+U.fmt(kb,0)+' KB in flight. Median of 3 runs; Apple M1 Pro GPU, MLX '+D.meta.mlx+', '+D.meta.date+'.</p>';
  }
})();
